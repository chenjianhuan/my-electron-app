const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, execFile } = require('child_process');
const { getMachineFingerprintInfo, getMachineFingerprintInfoAsync, matchMachineFingerprint } = require('./MachineFingerprint');
const { normalizeTier, normalizeBillingCycle, getPlanDefinition } = require('./PlanCatalog');

const LICENSE_FILE_NAME = 'license.dat';
const LOCAL_LICENSE_FILE_NAME = '.messagecounter-license.dat';
const DEFAULT_GRACE_DAYS = 3;
const ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 3000;
const REMOVABLE_DRIVES_REFRESH_MS = 15000;
const REMOVABLE_DRIVES_SCAN_TIMEOUT_MS = 4000;
const LICENSE_SOURCE_USB = 'usb';
const LICENSE_SOURCE_OFFLINE = 'offline';
const WINDOWS_REMOVABLE_DRIVES_PS = [
  '$drives = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 }',
  '$drives | Select-Object DeviceID,VolumeName,VolumeSerialNumber,Size | ConvertTo-Json -Compress',
].join('; ');

class LicenseGuard {
  constructor(options) {
    this.app = options.app;
    this.onRevoked = options.onRevoked;
    this.onStatusChange = options.onStatusChange;
    this.publicKey = this.loadPublicKey(options.publicKeyPath);
    this.machineFingerprintInfo = getMachineFingerprintInfo();
    this.machineFingerprint = this.machineFingerprintInfo.machineFingerprint;
    this._machineFingerprintInFlight = null;
    this.timer = null;
    this.lastStatus = null;
    this.lastUsbScanError = '';
    // Windows U盘扫描缓存：首次同步扫一次，之后 3 秒授权轮询只读缓存 + 后台异步刷新，
    // 杜绝每次轮询同步 spawn powershell 卡住主线程(表现为每隔几秒“无响应”)。
    this.cachedRemovableDrives = null;
    this.removableDrivesRefreshInFlight = false;
    this.lastRemovableDrivesScanAt = 0;
    this.lastTrustedTimePath = path.join(this.app.getPath('userData'), 'license-clock.json');
    // 后台预热：异步把所有硬件来源读一遍，升级到更稳的设备码候选集，不阻塞启动。
    this.ensureMachineFingerprintInfo().catch(() => {});
  }

  refreshMachineFingerprintInfo() {
    this.machineFingerprintInfo = getMachineFingerprintInfo();
    this.machineFingerprint = this.machineFingerprintInfo.machineFingerprint;
    return this.machineFingerprintInfo;
  }

  // 异步“等到拿到”：彻底读取所有硬件来源（并行 + 重试），拿到更优来源就升级内存缓存。
  // 并发调用共享同一个在途 Promise；全程实时计算、绝不落盘。
  ensureMachineFingerprintInfo(options = {}) {
    // 已经拿到可用设备码就直接复用（硬件标识本会话内不变），不再重复派生命令。
    if (!options.force && this.machineFingerprintInfo && this.machineFingerprintInfo.available) {
      return Promise.resolve(this.machineFingerprintInfo);
    }
    if (this._machineFingerprintInFlight) {
      return this._machineFingerprintInFlight;
    }
    this._machineFingerprintInFlight = Promise.resolve()
      .then(() => getMachineFingerprintInfoAsync(options))
      .then((info) => {
        if (info && (info.available || !this.machineFingerprintInfo)) {
          this.machineFingerprintInfo = info;
          this.machineFingerprint = info.machineFingerprint;
        }
        return this.machineFingerprintInfo;
      })
      .catch(() => this.machineFingerprintInfo)
      .finally(() => {
        this._machineFingerprintInFlight = null;
      });
    return this._machineFingerprintInFlight;
  }

  // 设备码实时快照（供离线授权请求、界面读取与诊断导出）。
  getMachineFingerprintSnapshot() {
    const info = this.machineFingerprintInfo || {};
    const candidates = Array.isArray(info.candidates) ? info.candidates : [];
    return {
      machineFingerprint: info.machineFingerprint || '',
      machineFingerprintSource: info.fingerprintSource || '',
      machineFingerprintLabel: info.fingerprintLabel || '',
      available: Boolean(info.available),
      diagnostics: Array.isArray(info.diagnostics) ? info.diagnostics : [],
      candidateSources: candidates.map(item => ({
        source: item.source,
        legacy: Boolean(item.legacy),
        fingerprintPrefix: String(item.fingerprint || '').slice(0, 12),
      })),
    };
  }

  loadPublicKey(publicKeyPath) {
    const candidates = [];
    if (publicKeyPath) {
      candidates.push(publicKeyPath);
    }
    if (process.env.LICENSE_PUBLIC_KEY_PATH) {
      candidates.push(process.env.LICENSE_PUBLIC_KEY_PATH);
    }
    if (this.app.isPackaged) {
      candidates.push(path.join(process.resourcesPath, 'keys', 'license-public.pem'));
    } else {
      candidates.push(path.join(this.app.getAppPath(), 'keys', 'license-public.pem'));
    }

    for (const keyPath of candidates) {
      if (!keyPath) continue;
      try {
        if (fs.existsSync(keyPath)) {
          return fs.readFileSync(keyPath, 'utf8');
        }
      } catch (error) {
        // Skip unreadable candidate
      }
    }

    throw new Error('未找到授权公钥文件，请联系管理员配置 keys/license-public.pem');
  }

  getStatus() {
    return this.lastStatus;
  }

  startMonitoring() {
    this.stopMonitoring();
    this.timer = setInterval(() => {
      try {
        const status = this.checkAuthorization();
        this.updateStatus(status);
        if (!status.authorized) {
          this.stopMonitoring();
          this.onRevoked(status);
        }
      } catch (error) {
        const status = this.unauthorizedStatus(`授权检查失败: ${error.message}`);
        this.updateStatus(status);
        this.stopMonitoring();
        this.onRevoked(status);
      }
    }, POLL_INTERVAL_MS);
  }

  stopMonitoring() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  updateStatus(status, options = {}) {
    this.lastStatus = status;
    if (options.notify === false) {
      return;
    }
    if (typeof this.onStatusChange === 'function') {
      this.onStatusChange(status);
    }
  }

  refreshStatus(options = {}) {
    const status = this.checkAuthorization();
    this.updateStatus(status, options);
    return status;
  }

  checkAuthorization() {
    // 设备码一次算好后缓存复用：硬件标识本会话内不会变，无需每 3 秒重新派生 reg。
    // 仅当还没拿到可用设备码时，才做一次轻量同步兜底，并触发异步彻底读取。
    if (!this.machineFingerprintInfo || !this.machineFingerprintInfo.available) {
      this.refreshMachineFingerprintInfo();
      this.ensureMachineFingerprintInfo().catch(() => {});
    }
    const candidates = this.buildLicenseCandidates();
    let bestReason = '未检测到授权文件（U盘或离线）';
    let foundLicenseFile = false;
    for (const candidate of candidates) {
      if (!candidate || !candidate.licensePath) continue;
      if (!fs.existsSync(candidate.licensePath)) continue;
      foundLicenseFile = true;

      try {
        const fileContent = fs.readFileSync(candidate.licensePath, 'utf8');
        const verified = this.verifyLicenseFile(fileContent);
        const status = this.evaluatePayload(verified.payload, candidate);
        if (status.authorized) {
          return status;
        }
        bestReason = status.reason || bestReason;
      } catch (error) {
        bestReason = `授权文件无效: ${error.message}`;
      }
    }

    if (!foundLicenseFile) {
      return this.unauthorizedStatus('未检测到授权文件（U盘或离线）');
    }
    return this.unauthorizedStatus(bestReason);
  }

  buildLicenseCandidates() {
    return [
      ...this.buildUsbLicenseCandidates(),
      ...this.buildLocalLicenseCandidates(),
    ];
  }

  buildUsbLicenseCandidates() {
    let drives = [];
    try {
      drives = this.getRemovableDrivesCached();
      this.lastUsbScanError = '';
    } catch (error) {
      this.lastUsbScanError = error && error.message ? error.message : String(error);
      drives = [];
    }
    return drives.map(drive => ({
      source: LICENSE_SOURCE_USB,
      sourceLabel: this.getSourceLabel(LICENSE_SOURCE_USB),
      drive,
      licensePath: path.join(drive.mountPath, LICENSE_FILE_NAME),
    }));
  }

  buildLocalLicenseCandidates() {
    return this.resolveLocalLicensePaths().map(licensePath => ({
      source: LICENSE_SOURCE_OFFLINE,
      sourceLabel: this.getSourceLabel(LICENSE_SOURCE_OFFLINE),
      drive: null,
      licensePath,
    }));
  }

  resolveLocalLicensePaths() {
    const paths = [];
    const seen = new Set();
    const pushPath = candidatePath => {
      if (!candidatePath) return;
      const normalized = this.normalizeLicensePath(candidatePath);
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      paths.push(normalized);
    };

    if (process.env.LICENSE_FILE_PATH) {
      pushPath(process.env.LICENSE_FILE_PATH);
    }
    pushPath(path.join(this.app.getPath('userData'), LICENSE_FILE_NAME));
    pushPath(path.join(this.app.getPath('appData'), 'messagecounter', LICENSE_FILE_NAME));
    pushPath(path.join(this.app.getPath('home'), LOCAL_LICENSE_FILE_NAME));
    if (this.app.isPackaged) {
      pushPath(path.join(path.dirname(process.execPath), LICENSE_FILE_NAME));
    } else {
      pushPath(path.join(this.app.getAppPath(), LICENSE_FILE_NAME));
    }

    return paths;
  }

  normalizeLicensePath(candidatePath) {
    const resolved = path.resolve(candidatePath);
    try {
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        return path.join(resolved, LICENSE_FILE_NAME);
      }
    } catch (error) {
      // Fallback to the raw path when stat fails.
    }
    return resolved;
  }

  getSourceLabel(source) {
    if (source === LICENSE_SOURCE_USB) return 'U盘授权';
    if (source === LICENSE_SOURCE_OFFLINE) return '离线授权';
    return '未知来源';
  }

  verifyLicenseFile(content) {
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error('授权文件不是合法JSON');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('授权文件格式错误');
    }
    if (!parsed.payload || !parsed.signature) {
      throw new Error('授权文件缺少 payload 或 signature');
    }

    const payloadBuffer = Buffer.from(parsed.payload, 'base64');
    const signatureBuffer = Buffer.from(parsed.signature, 'base64');
    const ok = crypto.verify(null, payloadBuffer, this.publicKey, signatureBuffer);
    if (!ok) {
      throw new Error('授权签名验证失败');
    }

    let payload;
    try {
      payload = JSON.parse(payloadBuffer.toString('utf8'));
    } catch (error) {
      throw new Error('payload 解析失败');
    }

    return { payload };
  }

  evaluatePayload(payload, candidate) {
    if (!payload || typeof payload !== 'object') {
      return this.unauthorizedStatus('授权内容为空');
    }
    if (!payload.customerId || !payload.expireAt) {
      return this.unauthorizedStatus('授权内容字段缺失');
    }

    const bindingCheck = this.validateBinding(payload, candidate);
    if (!bindingCheck.ok) {
      return this.unauthorizedStatus(bindingCheck.reason);
    }

    // 兼容历史 license: 旧版本无 tier 字段，默认按 Pro 处理。
    const rawTier = payload.tier || payload.edition || 'pro';
    const tier = normalizeTier(rawTier, '');
    if (!tier) {
      return this.unauthorizedStatus(`授权套餐无效: ${rawTier || '-'}`);
    }
    const planDef = getPlanDefinition(tier);

    const rawBillingCycle = payload.billingCycle || payload.plan || 'lifetime';
    const billingCycle = normalizeBillingCycle(rawBillingCycle, '');
    if (!billingCycle) {
      return this.unauthorizedStatus(`计费周期无效: ${rawBillingCycle || '-'}`);
    }

    const now = Date.now();
    if (!this.validateClockRollback(now)) {
      return this.unauthorizedStatus('检测到系统时间回拨，已锁定授权');
    }

    const expireTs = Date.parse(payload.expireAt);
    if (Number.isNaN(expireTs)) {
      return this.unauthorizedStatus('授权到期时间格式错误');
    }

    const graceDays = Number.isInteger(payload.graceDays) ? payload.graceDays : DEFAULT_GRACE_DAYS;
    const graceMs = Math.max(0, graceDays) * 24 * 60 * 60 * 1000;
    const endTs = expireTs + graceMs;
    if (now > endTs) {
      return this.unauthorizedStatus('授权已过期（含宽限期）');
    }

    this.persistTrustedTime(now);

    const inGrace = now > expireTs;
    const remainingMs = endTs - now;
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));

    return {
      authorized: true,
      mode: inGrace ? 'grace' : 'normal',
      customerId: payload.customerId,
      expireAt: payload.expireAt,
      graceDays,
      remainingDays,
      tier,
      tierName: planDef.name,
      billingCycle,
      licensePath: candidate.licensePath,
      licenseSource: bindingCheck.source,
      licenseSourceLabel: bindingCheck.sourceLabel,
      bindType: bindingCheck.bindType,
      usbMountPath: candidate.drive ? candidate.drive.mountPath : '',
      machineFingerprint: this.machineFingerprint,
      machineFingerprintSource: this.machineFingerprintInfo ? this.machineFingerprintInfo.fingerprintSource : '',
      machineFingerprintLabel: this.machineFingerprintInfo ? this.machineFingerprintInfo.fingerprintLabel : '',
      reason: inGrace
        ? `${planDef.name} ${bindingCheck.sourceLabel}处于宽限期，剩余 ${remainingDays} 天`
        : `${planDef.name} ${bindingCheck.sourceLabel}有效`,
    };
  }

  validateBinding(payload, candidate) {
    const hasUsbFingerprint = Boolean(payload.usbFingerprint);
    const hasMachineFingerprint = Boolean(payload.machineFingerprint);
    if (!hasUsbFingerprint && !hasMachineFingerprint) {
      return { ok: false, reason: '授权内容缺少绑定指纹' };
    }

    if (hasUsbFingerprint) {
      const expectedFingerprint = String(payload.usbFingerprint);
      if (!candidate.drive || !candidate.drive.fingerprint) {
        return { ok: false, reason: '授权要求U盘绑定，请插入对应授权U盘' };
      }
      if (expectedFingerprint !== candidate.drive.fingerprint) {
        return { ok: false, reason: 'U盘不匹配' };
      }
    }

    if (hasMachineFingerprint) {
      const expectedMachineFingerprint = String(payload.machineFingerprint);
      const matchedFingerprint = matchMachineFingerprint(expectedMachineFingerprint, this.machineFingerprintInfo);
      if (!matchedFingerprint) {
        if (!this.machineFingerprint) {
          return { ok: false, reason: '未能获取稳定机器码，请稍后重试或联系管理员' };
        }
        return { ok: false, reason: '机器指纹不匹配' };
      }
    }

    const bindType = hasUsbFingerprint && hasMachineFingerprint
      ? 'usb+machine'
      : (hasUsbFingerprint ? 'usb' : 'machine');
    const source = candidate.source || (hasUsbFingerprint ? LICENSE_SOURCE_USB : LICENSE_SOURCE_OFFLINE);

    return {
      ok: true,
      source,
      sourceLabel: this.getSourceLabel(source),
      bindType,
    };
  }

  validateClockRollback(nowTs) {
    try {
      if (!fs.existsSync(this.lastTrustedTimePath)) {
        return true;
      }
      const content = fs.readFileSync(this.lastTrustedTimePath, 'utf8');
      const parsed = JSON.parse(content);
      if (!parsed || !Number.isFinite(parsed.lastTrustedTs)) {
        return true;
      }
      return nowTs + ROLLBACK_TOLERANCE_MS >= parsed.lastTrustedTs;
    } catch (error) {
      return true;
    }
  }

  persistTrustedTime(ts) {
    const payload = JSON.stringify({ lastTrustedTs: ts }, null, 2);
    try {
      fs.writeFileSync(this.lastTrustedTimePath, payload, 'utf8');
    } catch (error) {
      // Ignore persistence errors to avoid false negatives caused by file permissions.
    }
  }

  unauthorizedStatus(reason, extra = {}) {
    return {
      authorized: false,
      mode: 'blocked',
      reason,
      machineFingerprint: this.machineFingerprint,
      machineFingerprintSource: this.machineFingerprintInfo ? this.machineFingerprintInfo.fingerprintSource : '',
      machineFingerprintLabel: this.machineFingerprintInfo ? this.machineFingerprintInfo.fingerprintLabel : '',
      ...extra,
    };
  }

  listRemovableDrives() {
    if (process.platform === 'win32') {
      return this.listWindowsRemovableDrives();
    }
    if (process.platform === 'darwin') {
      return this.listMacRemovableDrives();
    }
    return this.listLinuxRemovableDrives();
  }

  // Windows：首次同步扫一次（保证开机即可识别 U盘授权），之后只读缓存 + 后台异步刷新（限频），
  // 绝不在 3 秒授权轮询里同步 spawn powershell（那会让主线程每隔几秒卡住报“无响应”）。
  // 非 Windows 平台扫描很轻，保持原同步行为不变。
  getRemovableDrivesCached() {
    if (process.platform !== 'win32') {
      return this.listRemovableDrives();
    }
    if (this.cachedRemovableDrives === null) {
      try {
        this.cachedRemovableDrives = this.listWindowsRemovableDrives();
      } catch (error) {
        this.lastUsbScanError = error && error.message ? error.message : String(error);
        this.cachedRemovableDrives = [];
      }
      this.lastRemovableDrivesScanAt = Date.now();
    } else {
      this.scheduleWindowsRemovableDrivesRefresh();
    }
    return this.cachedRemovableDrives || [];
  }

  scheduleWindowsRemovableDrivesRefresh() {
    if (this.removableDrivesRefreshInFlight) return;
    const now = Date.now();
    if (this.lastRemovableDrivesScanAt && (now - this.lastRemovableDrivesScanAt) < REMOVABLE_DRIVES_REFRESH_MS) {
      return;
    }
    this.removableDrivesRefreshInFlight = true;
    this.lastRemovableDrivesScanAt = now;
    this.listWindowsRemovableDrivesAsync()
      .then((drives) => {
        this.cachedRemovableDrives = Array.isArray(drives) ? drives : [];
        this.lastUsbScanError = '';
      })
      .catch((error) => {
        this.lastUsbScanError = error && error.message ? error.message : String(error);
      })
      .finally(() => {
        this.removableDrivesRefreshInFlight = false;
      });
  }

  listWindowsRemovableDrivesAsync() {
    return new Promise((resolve, reject) => {
      execFile(
        'powershell',
        ['-NoProfile', '-Command', WINDOWS_REMOVABLE_DRIVES_PS],
        { encoding: 'utf8', timeout: REMOVABLE_DRIVES_SCAN_TIMEOUT_MS },
        (error, stdout) => {
          if (error) {
            reject(error);
            return;
          }
          try {
            resolve(this.parseWindowsRemovableDrives(String(stdout || '').trim()));
          } catch (parseError) {
            reject(parseError);
          }
        }
      );
    });
  }

  listWindowsRemovableDrives() {
    const output = execFileSync('powershell', ['-NoProfile', '-Command', WINDOWS_REMOVABLE_DRIVES_PS], {
      encoding: 'utf8',
      timeout: REMOVABLE_DRIVES_SCAN_TIMEOUT_MS,
    }).trim();
    return this.parseWindowsRemovableDrives(output);
  }

  parseWindowsRemovableDrives(output) {
    if (!output) return [];
    const parsed = JSON.parse(output);
    const rows = Array.isArray(parsed) ? parsed : [parsed];

    return rows
      .filter(row => row && row.DeviceID)
      .map(row => {
        const mountPath = `${row.DeviceID}\\`;
        const fingerprintSeed = `${row.VolumeSerialNumber || ''}|${row.VolumeName || ''}|${row.Size || ''}`;
        return {
          mountPath,
          fingerprint: this.hashFingerprint(fingerprintSeed),
        };
      });
  }

  listMacRemovableDrives() {
    const volumesRoot = '/Volumes';
    if (!fs.existsSync(volumesRoot)) return [];

    const names = fs.readdirSync(volumesRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .filter(name => name !== 'Macintosh HD');

    const drives = [];
    for (const name of names) {
      const mountPath = path.join(volumesRoot, name);
      let seed = name;
      try {
        const plist = execFileSync('diskutil', ['info', '-plist', mountPath], {
          encoding: 'utf8',
          timeout: 3000,
        });
        const volumeUUID = this.extractPlistValue(plist, 'VolumeUUID');
        const diskUUID = this.extractPlistValue(plist, 'DiskUUID');
        seed = `${volumeUUID || ''}|${diskUUID || ''}|${name}`;
      } catch (error) {
        const stats = fs.statSync(mountPath);
        seed = `${name}|${stats.dev}|${stats.ino}`;
      }
      drives.push({
        mountPath,
        fingerprint: this.hashFingerprint(seed),
      });
    }
    return drives;
  }

  listLinuxRemovableDrives() {
    const candidates = ['/media', '/run/media'];
    const mounts = [];
    for (const root of candidates) {
      if (!fs.existsSync(root)) continue;
      const entries = fs.readdirSync(root, { withFileTypes: true }).filter(item => item.isDirectory());
      for (const entry of entries) {
        const first = path.join(root, entry.name);
        const nested = fs.readdirSync(first, { withFileTypes: true }).filter(item => item.isDirectory());
        if (!nested.length) {
          mounts.push(first);
          continue;
        }
        for (const second of nested) {
          mounts.push(path.join(first, second.name));
        }
      }
    }

    return mounts.map(mountPath => {
      const stats = fs.statSync(mountPath);
      const seed = `${mountPath}|${stats.dev}|${stats.ino}|${os.hostname()}`;
      return {
        mountPath,
        fingerprint: this.hashFingerprint(seed),
      };
    });
  }

  extractPlistValue(plist, key) {
    const regex = new RegExp(`<key>${key}<\\/key>\\s*<string>([^<]+)<\\/string>`);
    const match = plist.match(regex);
    return match ? match[1] : '';
  }

  hashFingerprint(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

}

module.exports = {
  LicenseGuard,
  LICENSE_FILE_NAME,
  DEFAULT_GRACE_DAYS,
};
