#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const readline = require('readline');
const { encodeLicenseCodeFromString } = require('../src/services/LicenseCodec');

const LICENSE_NAME = 'license.dat';
const PLAN_TIERS = ['plus', 'pro'];
const BILLING_CYCLES = ['lifetime'];
const PRIVATE_KEY_ENV_PRIMARY = 'MC_LICENSE_PRIVATE_KEY_PATH';
const PRIVATE_KEY_ENV_COMPAT = 'LICENSE_PRIVATE_KEY_PATH';

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

function parseTier(input, fallback = 'pro') {
  const value = String(input || fallback).trim().toLowerCase();
  if (!PLAN_TIERS.includes(value)) {
    throw new Error(`套餐档位无效: ${input || '-'}，可选值: ${PLAN_TIERS.join('/')}`);
  }
  return value;
}

function parseBillingCycle(input, fallback = 'lifetime') {
  const value = String(input || fallback).trim().toLowerCase();
  if (value === 'monthly' || value === 'yearly') {
    return 'lifetime';
  }
  if (!BILLING_CYCLES.includes(value)) {
    throw new Error(`计费周期无效: ${input || '-'}，可选值: ${BILLING_CYCLES.join('/')}`);
  }
  return value;
}

function parseExpireAtIso(input) {
  const ts = Date.parse(input);
  if (Number.isNaN(ts)) {
    throw new Error(`到期日期格式无效: ${input || '-'}`);
  }
  return new Date(ts).toISOString();
}

function getPrivateKeyFromEnv() {
  const primary = String(process.env[PRIVATE_KEY_ENV_PRIMARY] || '').trim();
  if (primary) return primary;
  return String(process.env[PRIVATE_KEY_ENV_COMPAT] || '').trim();
}

function resolvePrivateKeyPath(candidatePath) {
  const provided = String(candidatePath || '').trim();
  const rawPath = provided || getPrivateKeyFromEnv();
  if (!rawPath) {
    throw new Error(`缺少私钥路径，请传 --private-key 或设置环境变量 ${PRIVATE_KEY_ENV_PRIMARY}`);
  }
  const resolvedPath = path.resolve(rawPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`私钥不存在: ${resolvedPath}`);
  }
  const stat = fs.statSync(resolvedPath);
  if (!stat.isFile()) {
    throw new Error(`私钥路径不是文件: ${resolvedPath}`);
  }
  return resolvedPath;
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
  const required = ['customer-id', 'expire-at', 'usb-fingerprint', 'output'];
  for (const field of required) {
    if (!args[field]) {
      throw new Error(`缺少参数 --${field}`);
    }
  }

  const graceDays = Number.isFinite(Number(args['grace-days'])) ? Number(args['grace-days']) : 3;
  const tier = parseTier(args.tier, 'pro');
  const billingCycle = parseBillingCycle(args['billing-cycle'], 'lifetime');
  const payload = {
    customerId: args['customer-id'],
    usbFingerprint: args['usb-fingerprint'],
    expireAt: parseExpireAtIso(args['expire-at']),
    graceDays,
    tier,
    billingCycle,
    plan: billingCycle,
    issuedAt: new Date().toISOString(),
  };

  const privateKeyPath = resolvePrivateKeyPath(args['private-key']);
  const license = signLicense(payload, privateKeyPath);
  fs.writeFileSync(args.output, JSON.stringify(license, null, 2), 'utf8');
  console.log(`license 已生成: ${args.output}`);
  console.log(`套餐档位: ${tier}`);
  console.log(`计费周期: ${billingCycle}`);
}

function cmdIssueOffline(args) {
  const result = issueOfflineLicense({
    privateKeyPath: resolvePrivateKeyPath(args['private-key']),
    customerId: args['customer-id'],
    machineFingerprint: args['machine-fingerprint'],
    expireAt: args['expire-at'],
    outputPath: args.output,
    graceDays: args['grace-days'],
    tier: args.tier,
    billingCycle: args['billing-cycle'],
  });
  console.log(`离线 license 已生成: ${result.outputPath}`);
  console.log(`machineFingerprint: ${result.payload.machineFingerprint}`);
  console.log(`套餐档位: ${result.payload.tier}`);
  console.log(`计费周期: ${result.payload.billingCycle}`);
  console.log('授权码:');
  console.log(result.licenseCode);
}

function cmdIssueToUsb(args) {
  const result = issueUsbLicense({
    privateKeyPath: resolvePrivateKeyPath(args['private-key']),
    customerId: args['customer-id'],
    mountPath: args['mount-path'],
    expireAt: args['expire-at'],
    graceDays: args['grace-days'],
    tier: args.tier,
    billingCycle: args['billing-cycle'],
  });
  console.log(`license 已写入: ${result.outputPath}`);
  console.log(`usbFingerprint: ${result.drive.fingerprint}`);
  console.log(`套餐档位: ${result.payload.tier}`);
  console.log(`计费周期: ${result.payload.billingCycle}`);
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
  const configuredPrivateKey = String(args['private-key'] || getPrivateKeyFromEnv() || '').trim();
  const privateKeyHint = configuredPrivateKey || '必填，当前未设置';
  const privateKeyInput = await ask(`私钥路径 [${privateKeyHint}]: `);
  const privateKeyPath = resolvePrivateKeyPath(privateKeyInput || configuredPrivateKey);

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
  const expireIso = expireInput ? parseExpireAtIso(expireInput) : defaultExpireIso;

  const graceInput = await ask('宽限天数 [3]: ');
  const graceDays = Number.isFinite(Number(graceInput)) ? Number(graceInput) : 3;
  const tierInput = await ask('套餐档位 plus/pro [pro]: ');
  const billingInput = await ask('计费周期 lifetime [lifetime]: ');
  const tier = parseTier(tierInput || args.tier, 'pro');
  const billingCycle = parseBillingCycle(billingInput || args['billing-cycle'], 'lifetime');

  const payload = {
    customerId,
    usbFingerprint: drive.fingerprint,
    expireAt: expireIso,
    graceDays,
    tier,
    billingCycle,
    plan: billingCycle,
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
  console.log(`套餐档位: ${tier}`);
  console.log(`计费周期: ${billingCycle}`);
  console.log(`宽限天数: ${graceDays}`);
  console.log(`授权文件: ${output}`);
}

function getPlatformMachineId() {
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

function buildMachineFingerprint() {
  const machineId = getPlatformMachineId();
  const parts = [
    process.platform,
    os.arch(),
    machineId || os.hostname(),
  ].filter(Boolean);
  return hashFingerprint(parts.join('|'));
}

function cmdMachineFingerprint() {
  console.log(JSON.stringify(getMachineFingerprintInfo(), null, 2));
}

function ensureRequiredFields(fields, source) {
  for (const field of fields) {
    if (!source[field]) {
      throw new Error(`缺少参数 ${field}`);
    }
  }
}

function buildUsbPayload(options) {
  ensureRequiredFields(['customerId', 'expireAt', 'mountPath'], options);
  const drives = listUsb();
  const drive = drives.find(item => path.resolve(item.mountPath) === path.resolve(options.mountPath));
  if (!drive) {
    throw new Error(`找不到目标U盘: ${options.mountPath}`);
  }

  const graceDays = Number.isFinite(Number(options.graceDays)) ? Number(options.graceDays) : 3;
  const tier = parseTier(options.tier, 'pro');
  const billingCycle = parseBillingCycle(options.billingCycle, 'lifetime');
  return {
    drive,
    payload: {
      customerId: options.customerId,
      usbFingerprint: drive.fingerprint,
      expireAt: parseExpireAtIso(options.expireAt),
      graceDays,
      tier,
      billingCycle,
      plan: billingCycle,
      issuedAt: new Date().toISOString(),
    },
  };
}

function buildOfflinePayload(options) {
  ensureRequiredFields(['customerId', 'expireAt', 'machineFingerprint'], options);
  const machineFingerprint = String(options.machineFingerprint || '').trim();
  if (!machineFingerprint) {
    throw new Error('machineFingerprint 不能为空');
  }

  const graceDays = Number.isFinite(Number(options.graceDays)) ? Number(options.graceDays) : 3;
  const tier = parseTier(options.tier, 'pro');
  const billingCycle = parseBillingCycle(options.billingCycle, 'lifetime');
  return {
    payload: {
      customerId: options.customerId,
      machineFingerprint,
      expireAt: parseExpireAtIso(options.expireAt),
      graceDays,
      tier,
      billingCycle,
      plan: billingCycle,
      issuedAt: new Date().toISOString(),
    },
  };
}

function issueUsbLicense(options) {
  const privateKeyPath = resolvePrivateKeyPath(options.privateKeyPath);
  const { drive, payload } = buildUsbPayload(options);
  const outputPath = path.join(options.mountPath, LICENSE_NAME);
  const license = signLicense(payload, privateKeyPath);
  fs.writeFileSync(outputPath, JSON.stringify(license, null, 2), 'utf8');
  return {
    outputPath,
    drive,
    payload,
  };
}

function issueOfflineLicense(options) {
  ensureRequiredFields(['outputPath'], options);
  const privateKeyPath = resolvePrivateKeyPath(options.privateKeyPath);
  const { payload } = buildOfflinePayload(options);
  const license = signLicense(payload, privateKeyPath);
  const licenseText = JSON.stringify(license, null, 2);
  fs.writeFileSync(options.outputPath, licenseText, 'utf8');
  return {
    outputPath: options.outputPath,
    payload,
    licenseText,
    licenseCode: encodeLicenseCodeFromString(licenseText),
  };
}

function getMachineFingerprintInfo() {
  const machineId = getPlatformMachineId();
  return {
    platform: process.platform,
    arch: os.arch(),
    machineId: machineId || '(fallback-hostname)',
    machineFingerprint: buildMachineFingerprint(),
  };
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
  if (command === 'issue-offline') {
    cmdIssueOffline(args);
    return;
  }
  if (command === 'issue-to-usb') {
    cmdIssueToUsb(args);
    return;
  }
  if (command === 'machine-fingerprint') {
    cmdMachineFingerprint();
    return;
  }
  if (command === 'issue-wizard') {
    await cmdIssueWizard(args);
    return;
  }

  console.log('用法:');
  console.log('  node scripts/license-tools.js list-usb');
  console.log('  node scripts/license-tools.js machine-fingerprint');
  console.log(`  # 私钥可通过 --private-key 传入，或设置环境变量 ${PRIVATE_KEY_ENV_PRIMARY}`);
  console.log('  node scripts/license-tools.js issue-license --private-key /path/private.pem --customer-id C001 --usb-fingerprint <fingerprint> --expire-at 2027-12-31 --output /tmp/license.dat --grace-days 3 --tier plus --billing-cycle lifetime');
  console.log('  node scripts/license-tools.js issue-offline --private-key /path/private.pem --customer-id C001 --machine-fingerprint <fingerprint> --expire-at 2027-12-31 --output /tmp/license.dat --grace-days 3 --tier plus --billing-cycle lifetime  # 同时打印授权码');
  console.log('  node scripts/license-tools.js issue-to-usb --private-key /path/private.pem --customer-id C001 --mount-path E:\\ --expire-at 2027-12-31 --grace-days 3 --tier pro --billing-cycle lifetime');
  console.log('  node scripts/license-tools.js issue-wizard [--private-key /path/private.pem] [--tier plus|pro] [--billing-cycle lifetime]');
}

if (require.main === module) {
  main().catch(error => {
    console.error(`执行失败: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  listUsb,
  parseTier,
  parseBillingCycle,
  parseExpireAtIso,
  issueUsbLicense,
  issueOfflineLicense,
  getMachineFingerprintInfo,
  buildMachineFingerprint,
  getPrivateKeyFromEnv,
  resolvePrivateKeyPath,
};
