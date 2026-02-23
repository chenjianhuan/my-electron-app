#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const readline = require('readline');

const LICENSE_NAME = 'license.dat';

function hashFingerprint(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function listWindowsUsb() {
  const ps = [
    '$drives = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 }',
    '$drives | Select-Object DeviceID,VolumeName,VolumeSerialNumber,Size | ConvertTo-Json -Compress',
  ].join('; ');

  const output = execFileSync('powershell', ['-NoProfile', '-Command', ps], {
    encoding: 'utf8',
    timeout: 5000,
  }).trim();

  if (!output) return [];
  const parsed = JSON.parse(output);
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows.filter(Boolean).map(row => {
    const mountPath = `${row.DeviceID}\\`;
    const seed = `${row.VolumeSerialNumber || ''}|${row.VolumeName || ''}|${row.Size || ''}`;
    return {
      mountPath,
      volumeName: row.VolumeName || '',
      serial: row.VolumeSerialNumber || '',
      size: row.Size || '',
      fingerprint: hashFingerprint(seed),
    };
  });
}

function extractPlistValue(plist, key) {
  const regex = new RegExp(`<key>${key}<\\/key>\\s*<string>([^<]+)<\\/string>`);
  const match = plist.match(regex);
  return match ? match[1] : '';
}

function listMacUsb() {
  const root = '/Volumes';
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => name !== 'Macintosh HD')
    .map(name => {
      const mountPath = path.join(root, name);
      let seed = name;
      try {
        const plist = execFileSync('diskutil', ['info', '-plist', mountPath], { encoding: 'utf8', timeout: 3000 });
        const volumeUUID = extractPlistValue(plist, 'VolumeUUID');
        const diskUUID = extractPlistValue(plist, 'DiskUUID');
        seed = `${volumeUUID || ''}|${diskUUID || ''}|${name}`;
      } catch (error) {
        const stat = fs.statSync(mountPath);
        seed = `${name}|${stat.dev}|${stat.ino}`;
      }
      return {
        mountPath,
        volumeName: name,
        fingerprint: hashFingerprint(seed),
      };
    });
}

function listUsb() {
  if (process.platform === 'win32') {
    return listWindowsUsb();
  }
  if (process.platform === 'darwin') {
    return listMacUsb();
  }
  throw new Error('当前脚本仅支持 Windows/macOS。');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    args[key] = argv[i + 1];
    i += 1;
  }
  return args;
}

function signLicense(payload, privateKeyPath) {
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const payloadBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = crypto.sign(null, payloadBuffer, privateKey).toString('base64');
  return {
    version: 1,
    algorithm: 'ed25519',
    payload: payloadBuffer.toString('base64'),
    signature,
  };
}

function cmdList() {
  const drives = listUsb();
  console.log(JSON.stringify(drives, null, 2));
}

function cmdIssue(args) {
  const required = ['private-key', 'customer-id', 'expire-at', 'usb-fingerprint', 'output'];
  for (const field of required) {
    if (!args[field]) {
      throw new Error(`缺少参数 --${field}`);
    }
  }

  const graceDays = Number.isFinite(Number(args['grace-days'])) ? Number(args['grace-days']) : 3;
  const payload = {
    customerId: args['customer-id'],
    usbFingerprint: args['usb-fingerprint'],
    expireAt: new Date(args['expire-at']).toISOString(),
    graceDays,
    plan: 'yearly',
    issuedAt: new Date().toISOString(),
  };

  const license = signLicense(payload, args['private-key']);
  fs.writeFileSync(args.output, JSON.stringify(license, null, 2), 'utf8');
  console.log(`license 已生成: ${args.output}`);
}

function cmdIssueToUsb(args) {
  const required = ['private-key', 'customer-id', 'expire-at', 'mount-path'];
  for (const field of required) {
    if (!args[field]) {
      throw new Error(`缺少参数 --${field}`);
    }
  }

  const mountPath = args['mount-path'];
  const drives = listUsb();
  const drive = drives.find(item => path.resolve(item.mountPath) === path.resolve(mountPath));
  if (!drive) {
    throw new Error(`找不到目标U盘: ${mountPath}`);
  }

  const graceDays = Number.isFinite(Number(args['grace-days'])) ? Number(args['grace-days']) : 3;
  const payload = {
    customerId: args['customer-id'],
    usbFingerprint: drive.fingerprint,
    expireAt: new Date(args['expire-at']).toISOString(),
    graceDays,
    plan: 'yearly',
    issuedAt: new Date().toISOString(),
  };

  const license = signLicense(payload, args['private-key']);
  const output = path.join(mountPath, LICENSE_NAME);
  fs.writeFileSync(output, JSON.stringify(license, null, 2), 'utf8');
  console.log(`license 已写入: ${output}`);
  console.log(`usbFingerprint: ${drive.fingerprint}`);
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve((answer || '').trim());
    });
  });
}

function getDefaultExpireAtIso() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}

async function cmdIssueWizard(args) {
  const defaultPrivateKey = path.resolve(args['private-key'] || path.join(__dirname, '..', 'keys', 'license-private.pem'));
  const privateKeyInput = await ask(`私钥路径 [${defaultPrivateKey}]: `);
  const privateKeyPath = privateKeyInput || defaultPrivateKey;
  if (!fs.existsSync(privateKeyPath)) {
    throw new Error(`私钥不存在: ${privateKeyPath}`);
  }

  const drives = listUsb();
  if (!drives.length) {
    throw new Error('未检测到可用U盘');
  }

  console.log('\n可用U盘:');
  drives.forEach((item, index) => {
    console.log(`[${index}] ${item.mountPath}  ${item.volumeName || ''}`);
  });
  const indexText = await ask('选择U盘序号: ');
  const driveIndex = Number(indexText);
  if (!Number.isInteger(driveIndex) || driveIndex < 0 || driveIndex >= drives.length) {
    throw new Error('U盘序号无效');
  }
  const drive = drives[driveIndex];

  const customerId = await ask('客户编号 (例如 C001): ');
  if (!customerId) {
    throw new Error('客户编号不能为空');
  }

  const defaultExpireIso = getDefaultExpireAtIso();
  const defaultExpireLabel = defaultExpireIso.slice(0, 10);
  const expireInput = await ask(`到期日期 YYYY-MM-DD（留空=自动+1年） [${defaultExpireLabel}]: `);
  const expireIso = expireInput ? new Date(expireInput).toISOString() : defaultExpireIso;
  if (!expireIso || Number.isNaN(Date.parse(expireIso))) {
    throw new Error('到期日期格式无效');
  }

  const graceInput = await ask('宽限天数 [3]: ');
  const graceDays = Number.isFinite(Number(graceInput)) ? Number(graceInput) : 3;

  const payload = {
    customerId,
    usbFingerprint: drive.fingerprint,
    expireAt: expireIso,
    graceDays,
    plan: 'yearly',
    issuedAt: new Date().toISOString(),
  };

  const license = signLicense(payload, privateKeyPath);
  const output = path.join(drive.mountPath, LICENSE_NAME);
  fs.writeFileSync(output, JSON.stringify(license, null, 2), 'utf8');

  console.log('\n签发完成:');
  console.log(`客户编号: ${customerId}`);
  console.log(`U盘路径: ${drive.mountPath}`);
  console.log(`U盘指纹: ${drive.fingerprint}`);
  console.log(`到期时间: ${expireIso}`);
  console.log(`宽限天数: ${graceDays}`);
  console.log(`授权文件: ${output}`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (command === 'list-usb') {
    cmdList();
    return;
  }
  if (command === 'issue-license') {
    cmdIssue(args);
    return;
  }
  if (command === 'issue-to-usb') {
    cmdIssueToUsb(args);
    return;
  }
  if (command === 'issue-wizard') {
    await cmdIssueWizard(args);
    return;
  }

  console.log('用法:');
  console.log('  node scripts/license-tools.js list-usb');
  console.log('  node scripts/license-tools.js issue-license --private-key /path/private.pem --customer-id C001 --usb-fingerprint <fingerprint> --expire-at 2027-12-31 --output /tmp/license.dat --grace-days 3');
  console.log('  node scripts/license-tools.js issue-to-usb --private-key /path/private.pem --customer-id C001 --mount-path E:\\ --expire-at 2027-12-31 --grace-days 3');
  console.log('  node scripts/license-tools.js issue-wizard [--private-key /path/private.pem]');
}

main().catch(error => {
  console.error(`执行失败: ${error.message}`);
  process.exit(1);
});
