const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TRIAL_DAYS = 7;
const CLOCK_ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000;
const CHECKSUM_PEPPER = 'messagecounter-trial-anchor-v1';

class TrialGuard {
  constructor(options) {
    this.app = options.app;
    this.trialDays = Number.isFinite(Number(options.trialDays)) ? Number(options.trialDays) : TRIAL_DAYS;
    this.machineFingerprint = this.buildMachineFingerprint();
    this.anchorPaths = this.buildAnchorPaths();
    this.lastStatus = null;
  }

  getStatus() {
    return this.lastStatus;
  }

  checkTrialAccess() {
    const now = Date.now();
    const loaded = this.loadAnchors();
    if (loaded.tampered) {
      this.lastStatus = {
        allowed: false,
        reason: '检测到试用数据异常，请插入授权U盘或导入离线授权文件使用。',
      };
      return this.lastStatus;
    }

    const anchors = loaded.anchors;
    if (!anchors.length) {
      const fresh = this.createAnchor(now, now);
      this.persistAnchor(fresh);
      this.lastStatus = this.buildAllowedStatus(fresh.firstSeenAt, now);
      return this.lastStatus;
    }

    const firstSeenAt = Math.min(...anchors.map(item => item.firstSeenAt));
    const lastSeenAt = Math.max(...anchors.map(item => item.lastSeenAt));

    if (now + CLOCK_ROLLBACK_TOLERANCE_MS < lastSeenAt) {
      this.lastStatus = {
        allowed: false,
        reason: '检测到系统时间回拨，试用已锁定，请插入授权U盘或导入离线授权文件使用。',
      };
      return this.lastStatus;
    }

    const endTs = firstSeenAt + this.trialDays * 24 * 60 * 60 * 1000;
    if (now > endTs) {
      this.lastStatus = {
        allowed: false,
        firstSeenAt: new Date(firstSeenAt).toISOString(),
        endAt: new Date(endTs).toISOString(),
        reason: `试用期已结束（${this.trialDays}天），请插入授权U盘或导入离线授权文件继续使用。`,
      };
      return this.lastStatus;
    }

    const merged = this.createAnchor(firstSeenAt, now);
    this.persistAnchor(merged);
    this.lastStatus = this.buildAllowedStatus(firstSeenAt, now);
    return this.lastStatus;
  }

  buildAllowedStatus(firstSeenAt, nowTs) {
    const endTs = firstSeenAt + this.trialDays * 24 * 60 * 60 * 1000;
    const remainingDays = Math.max(0, Math.ceil((endTs - nowTs) / (24 * 60 * 60 * 1000)));
    return {
      allowed: true,
      trialDays: this.trialDays,
      firstSeenAt: new Date(firstSeenAt).toISOString(),
      endAt: new Date(endTs).toISOString(),
      remainingDays,
      reason: `试用中，剩余 ${remainingDays} 天`,
    };
  }

  createAnchor(firstSeenAt, lastSeenAt) {
    const payload = {
      version: 1,
      machineFingerprint: this.machineFingerprint,
      firstSeenAt,
      lastSeenAt,
    };
    payload.checksum = this.computeChecksum(payload);
    return payload;
  }

  buildAnchorPaths() {
    const appDataRoot = path.join(this.app.getPath('appData'), 'messagecounter');
    return [
      path.join(this.app.getPath('userData'), 'trial-anchor.json'),
      path.join(appDataRoot, '.trial-anchor.json'),
      path.join(this.app.getPath('home'), '.messagecounter-trial-anchor.json'),
    ];
  }

  persistAnchor(anchor) {
    const text = JSON.stringify(anchor, null, 2);
    for (const filePath of this.anchorPaths) {
      try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, text, 'utf8');
      } catch (error) {
        // Ignore single-path write errors; we use multi-path redundancy.
      }
    }
  }

  loadAnchors() {
    const anchors = [];
    let tampered = false;

    for (const filePath of this.anchorPaths) {
      if (!fs.existsSync(filePath)) continue;
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!this.validateAnchor(parsed)) {
          tampered = true;
          continue;
        }
        anchors.push(parsed);
      } catch (error) {
        tampered = true;
      }
    }

    return { anchors, tampered };
  }

  validateAnchor(anchor) {
    if (!anchor || typeof anchor !== 'object') return false;
    if (anchor.version !== 1) return false;
    if (anchor.machineFingerprint !== this.machineFingerprint) return false;
    if (!Number.isFinite(anchor.firstSeenAt) || !Number.isFinite(anchor.lastSeenAt)) return false;
    if (anchor.lastSeenAt < anchor.firstSeenAt) return false;
    return anchor.checksum === this.computeChecksum(anchor);
  }

  computeChecksum(anchor) {
    const plain = `${anchor.version}|${anchor.machineFingerprint}|${anchor.firstSeenAt}|${anchor.lastSeenAt}|${CHECKSUM_PEPPER}`;
    return crypto.createHash('sha256').update(plain).digest('hex');
  }

  buildMachineFingerprint() {
    const machineId = this.getPlatformMachineId();
    const parts = [
      process.platform,
      os.arch(),
      machineId || os.hostname(),
    ].filter(Boolean);
    return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
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
  TrialGuard,
  TRIAL_DAYS,
};
