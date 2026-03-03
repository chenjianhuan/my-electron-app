const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { normalizeTier, normalizeBillingCycle, getPlanDefinition } = require('./PlanCatalog');

const LICENSE_FILE_NAME = 'license.dat';
const LOCAL_LICENSE_FILE_NAME = '.messagecounter-license.dat';
const DEFAULT_GRACE_DAYS = 3;
const ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 3000;
const LICENSE_SOURCE_USB = 'usb';
const LICENSE_SOURCE_OFFLINE = 'offline';

class LicenseGuard {
  constructor(options) {
    this.app = options.app;
    this.onRevoked = options.onRevoked;
    this.onStatusChange = options.onStatusChange;
    this.publicKey = this.loadPublicKey(options.publicKeyPath);
    this.machineFingerprint = this.buildMachineFingerprint();
    this.timer = null;
    this.lastStatus = null;
    this.lastTrustedTimePath = path.join(this.app.getPath('userData'), 'license-clock.json');
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

  updateStatus(status) {
    this.lastStatus = status;
    if (typeof this.onStatusChange === 'function') {
      this.onStatusChange(status);
    }
  }

  checkAuthorization() {
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
    const drives = this.listRemovableDrives();
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
      if (expectedMachineFingerprint !== this.machineFingerprint) {
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

  listWindowsRemovableDrives() {
    const ps = [
      '$drives = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 }',
      '$drives | Select-Object DeviceID,VolumeName,VolumeSerialNumber,Size | ConvertTo-Json -Compress',
    ].join('; ');

    const output = execFileSync('powershell', ['-NoProfile', '-Command', ps], {
      encoding: 'utf8',
      timeout: 4000,
    }).trim();

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

  buildMachineFingerprint() {
    const machineId = this.getPlatformMachineId();
    const parts = [
      process.platform,
      os.arch(),
      machineId || os.hostname(),
    ].filter(Boolean);
    return this.hashFingerprint(parts.join('|'));
  }

  getPlatformMachineId() {
    try {
      if (process.platform === 'darwin') {
        const text = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { encoding: 'utf8', timeout: 3000 });
        const match = text.match(/"IOPlatformUUID"\s=\s"([^"]+)"/);
        return match ? match[1] : '';
      }
      if (process.platform === 'win32') {
        const ps = '(Get-CimInstance Win32_ComputerSystemProduct).UUID';
        return execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8', timeout: 3000 }).trim();
      }
      if (process.platform === 'linux') {
        const machineIdPath = '/etc/machine-id';
        if (fs.existsSync(machineIdPath)) {
          return fs.readFileSync(machineIdPath, 'utf8').trim();
        }
      }
    } catch (error) {
      return '';
    }
    return '';
  }
}

module.exports = {
  LicenseGuard,
  LICENSE_FILE_NAME,
  DEFAULT_GRACE_DAYS,
};
