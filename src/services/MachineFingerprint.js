const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const { execFile, execFileSync } = require('child_process');

const DEFAULT_COMMAND_TIMEOUT_MS = 5000;
const WINDOWS_WMI_TIMEOUT_MS = 3000;
const WINDOWS_DISK_TIMEOUT_MS = 3000;
const COMMAND_RETRIES = 2;
const COMMAND_RETRY_BACKOFF_MS = 250;

// 设备码来源元数据：priority 越小越优先作为对外展示的设备码。
// 所有来源都是“硬件实时读取”的稳定标识，绝不落盘。legacy 来源（电脑名称）
// 仅用于向后兼容旧授权的校验，永远不会被选为主设备码。
const SOURCE_META = {
  machine_guid: { label: 'Windows MachineGuid', priority: 10, legacy: false },
  wmi_uuid: { label: 'Windows 主板UUID', priority: 20, legacy: false },
  disk_serial: { label: '系统磁盘序列号', priority: 30, legacy: false },
  mac: { label: '网卡MAC地址', priority: 40, legacy: false },
  io_platform_uuid: { label: 'macOS IOPlatformUUID', priority: 10, legacy: false },
  machine_id: { label: 'Linux machine-id', priority: 10, legacy: false },
  legacy_hostname: { label: '电脑名称（兼容）', priority: 100, legacy: true },
};

function hashFingerprint(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function sanitizeIdentifier(raw) {
  return String(raw || '').trim();
}

function isUsableIdentifier(raw) {
  const value = sanitizeIdentifier(raw);
  if (!value) return false;

  const normalized = value.replace(/[{}\-\s:]/g, '').toLowerCase();
  if (!normalized) return false;
  if (/^0+$/.test(normalized)) return false;
  if (/^f+$/.test(normalized)) return false;
  if (normalized === 'tobefilledbyoem') return false;
  if (normalized === 'none') return false;
  if (normalized === 'default') return false;
  return true;
}

function buildCandidate({ source, identifier, platform, arch }) {
  const meta = SOURCE_META[source] || { label: source, priority: 90, legacy: false };
  const id = sanitizeIdentifier(identifier);
  if (!isUsableIdentifier(id)) return null;
  return {
    source,
    label: meta.label,
    priority: meta.priority,
    legacy: Boolean(meta.legacy),
    id,
    fingerprint: hashFingerprint([platform, arch, id].join('|')),
  };
}

function dedupeCandidates(candidates) {
  const result = [];
  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidate || !candidate.fingerprint) continue;
    const key = `${candidate.source}|${candidate.fingerprint}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }
  return result;
}

function selectPrimaryCandidate(candidates) {
  const usable = candidates.filter(item => item && !item.legacy);
  if (!usable.length) return null;
  // 固定优先级 + 指纹串兜底排序，保证同一台机器每次得到确定且稳定的主设备码。
  usable.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.fingerprint < b.fingerprint ? -1 : (a.fingerprint > b.fingerprint ? 1 : 0);
  });
  return usable[0];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 同步执行命令（用于即时、轻量的兜底计算）。
function runCommandSync(file, args, timeout) {
  try {
    return String(execFileSync(file, args, { encoding: 'utf8', timeout }) || '').trim();
  } catch (error) {
    return '';
  }
}

// 异步执行命令 + 重试（用于“等到拿到”的彻底读取，不阻塞主进程）。
function runCommandAsync(file, args, timeout) {
  return new Promise(resolve => {
    execFile(file, args, { encoding: 'utf8', timeout }, (error, stdout) => {
      if (error) {
        resolve('');
        return;
      }
      resolve(String(stdout || '').trim());
    });
  });
}

async function runCommandAsyncWithRetry(file, args, timeout) {
  for (let attempt = 0; attempt < COMMAND_RETRIES; attempt += 1) {
    const value = await runCommandAsync(file, args, timeout);
    if (isUsableIdentifier(value) || value) {
      return value;
    }
    if (attempt < COMMAND_RETRIES - 1) {
      await sleep(COMMAND_RETRY_BACKOFF_MS);
    }
  }
  return '';
}

// ---- 各来源原始读取 ----

function parseMachineGuid(output) {
  const match = String(output || '').match(/MachineGuid\s+REG_\w+\s+([^\r\n]+)/i);
  return match ? match[1].trim() : '';
}

const WINDOWS_MACHINE_GUID_ARGS = [
  'query',
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography',
  '/v',
  'MachineGuid',
];

const WINDOWS_WMI_UUID_ARGS = [
  '-NoProfile',
  '-Command',
  '(Get-CimInstance Win32_ComputerSystemProduct).UUID',
];

const WINDOWS_DISK_SERIAL_ARGS = [
  '-NoProfile',
  '-Command',
  '(Get-CimInstance Win32_DiskDrive | Sort-Object Index | Select-Object -First 1).SerialNumber',
];

function readMacAddresses() {
  const nets = os.networkInterfaces() || {};
  const macs = [];
  for (const name of Object.keys(nets)) {
    for (const ni of nets[name] || []) {
      if (!ni || ni.internal) continue;
      const mac = String(ni.mac || '').trim().toLowerCase();
      if (!mac || mac === '00:00:00:00:00:00') continue;
      macs.push(mac);
    }
  }
  return Array.from(new Set(macs)).sort();
}

function readDarwinMachineIdSync() {
  const text = runCommandSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], DEFAULT_COMMAND_TIMEOUT_MS);
  const match = text.match(/"IOPlatformUUID"\s=\s"([^"]+)"/);
  return match ? match[1] : '';
}

async function readDarwinMachineIdAsync() {
  const text = await runCommandAsyncWithRetry('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], DEFAULT_COMMAND_TIMEOUT_MS);
  const match = text.match(/"IOPlatformUUID"\s=\s"([^"]+)"/);
  return match ? match[1] : '';
}

function readLinuxMachineId() {
  try {
    const machineIdPath = '/etc/machine-id';
    if (!fs.existsSync(machineIdPath)) return '';
    return fs.readFileSync(machineIdPath, 'utf8').trim();
  } catch (error) {
    return '';
  }
}

function appendMacCandidates(candidates, platform, arch) {
  for (const mac of readMacAddresses()) {
    candidates.push(buildCandidate({ source: 'mac', identifier: mac, platform, arch }));
  }
}

function appendHostnameCandidate(candidates, platform, arch, options) {
  if (options.includeLegacyHostname === false) return;
  candidates.push(buildCandidate({ source: 'legacy_hostname', identifier: os.hostname(), platform, arch }));
}

function finalizeInfo(platform, arch, candidates) {
  const dedupedCandidates = dedupeCandidates(candidates);
  const primaryCandidate = selectPrimaryCandidate(dedupedCandidates);
  return {
    platform,
    arch,
    machineId: primaryCandidate ? primaryCandidate.id : '',
    machineFingerprint: primaryCandidate ? primaryCandidate.fingerprint : '',
    fingerprintSource: primaryCandidate ? primaryCandidate.source : '',
    fingerprintLabel: primaryCandidate ? primaryCandidate.label : '',
    candidates: dedupedCandidates,
    available: Boolean(primaryCandidate),
  };
}

// 同步、轻量：仅做即时可得的来源（注册表 MachineGuid / 系统UUID + 网卡MAC + 电脑名称）。
// 用于构造期与每次授权轮询的“即时兜底”，不做会长时间阻塞的多次重试。
function getMachineFingerprintInfo(options = {}) {
  const platform = process.platform;
  const arch = os.arch();
  const candidates = [];

  if (platform === 'win32') {
    candidates.push(buildCandidate({
      source: 'machine_guid',
      identifier: parseMachineGuid(runCommandSync('reg', WINDOWS_MACHINE_GUID_ARGS, DEFAULT_COMMAND_TIMEOUT_MS)),
      platform,
      arch,
    }));
  } else if (platform === 'darwin') {
    candidates.push(buildCandidate({
      source: 'io_platform_uuid',
      identifier: readDarwinMachineIdSync(),
      platform,
      arch,
    }));
  } else if (platform === 'linux') {
    candidates.push(buildCandidate({
      source: 'machine_id',
      identifier: readLinuxMachineId(),
      platform,
      arch,
    }));
  }

  appendMacCandidates(candidates, platform, arch);
  appendHostnameCandidate(candidates, platform, arch, options);

  return finalizeInfo(platform, arch, candidates);
}

// 异步、彻底：把所有硬件来源都跑一遍（并行 + 重试），尽量“等到拿到”更强的设备码。
// 不阻塞主进程；用于按需构造离线授权请求与后台预热。
async function getMachineFingerprintInfoAsync(options = {}) {
  const platform = process.platform;
  const arch = os.arch();
  const candidates = [];
  // 每个来源记录“读到没 / 可用否 / 耗时”，供诊断导出定位是哪一档兜底生效。不含原始硬件ID。
  const diagnostics = [];

  const timed = async (runner) => {
    const start = Date.now();
    let value = '';
    try {
      value = await runner();
    } catch (error) {
      value = '';
    }
    return { value, ms: Date.now() - start };
  };

  const record = (source, rawValue, ms) => {
    const candidate = buildCandidate({ source, identifier: rawValue, platform, arch });
    if (candidate) candidates.push(candidate);
    diagnostics.push({ source, read: Boolean(rawValue), ok: Boolean(candidate), ms });
  };

  if (platform === 'win32') {
    const [guid, wmi, disk] = await Promise.all([
      timed(() => runCommandAsyncWithRetry('reg', WINDOWS_MACHINE_GUID_ARGS, DEFAULT_COMMAND_TIMEOUT_MS).then(parseMachineGuid)),
      timed(() => runCommandAsyncWithRetry('powershell', WINDOWS_WMI_UUID_ARGS, WINDOWS_WMI_TIMEOUT_MS)),
      timed(() => runCommandAsyncWithRetry('powershell', WINDOWS_DISK_SERIAL_ARGS, WINDOWS_DISK_TIMEOUT_MS)),
    ]);
    record('machine_guid', guid.value, guid.ms);
    record('wmi_uuid', wmi.value, wmi.ms);
    record('disk_serial', disk.value, disk.ms);
  } else if (platform === 'darwin') {
    const r = await timed(() => readDarwinMachineIdAsync());
    record('io_platform_uuid', r.value, r.ms);
  } else if (platform === 'linux') {
    const r = await timed(() => Promise.resolve(readLinuxMachineId()));
    record('machine_id', r.value, r.ms);
  }

  const macStart = Date.now();
  const macs = readMacAddresses();
  for (const mac of macs) {
    const candidate = buildCandidate({ source: 'mac', identifier: mac, platform, arch });
    if (candidate) candidates.push(candidate);
  }
  diagnostics.push({ source: 'mac', read: macs.length > 0, ok: macs.length > 0, ms: Date.now() - macStart, count: macs.length });

  appendHostnameCandidate(candidates, platform, arch, options);

  const info = finalizeInfo(platform, arch, candidates);
  info.diagnostics = diagnostics;
  return info;
}

function buildMachineFingerprint(options = {}) {
  return getMachineFingerprintInfo(options).machineFingerprint;
}

// win32 同步兜底：当传入的候选集里没匹配上（通常发生在后台预热完成之前），
// 再补读一次主板UUID/磁盘序列号同步校验，避免已授权用户在慢机开机瞬间被误判。
function getWindowsExtraCandidatesSync(arch) {
  const platform = 'win32';
  return [
    // 再试一次 MachineGuid：保证授权绑定在 MachineGuid 的老用户，
    // 即使首轮 reg 失败、也能在校验兜底里重新读到，避免被误判为未授权。
    buildCandidate({
      source: 'machine_guid',
      identifier: parseMachineGuid(runCommandSync('reg', WINDOWS_MACHINE_GUID_ARGS, DEFAULT_COMMAND_TIMEOUT_MS)),
      platform,
      arch,
    }),
    buildCandidate({
      source: 'wmi_uuid',
      identifier: runCommandSync('powershell', WINDOWS_WMI_UUID_ARGS, WINDOWS_WMI_TIMEOUT_MS),
      platform,
      arch,
    }),
    buildCandidate({
      source: 'disk_serial',
      identifier: runCommandSync('powershell', WINDOWS_DISK_SERIAL_ARGS, WINDOWS_DISK_TIMEOUT_MS),
      platform,
      arch,
    }),
  ].filter(Boolean);
}

function matchMachineFingerprint(expectedFingerprint, machineFingerprintInfo) {
  const expected = String(expectedFingerprint || '').trim();
  if (!expected) return null;

  const info = machineFingerprintInfo || getMachineFingerprintInfo();
  const candidates = Array.isArray(info && info.candidates) ? info.candidates : [];
  const matched = candidates.find(item => item && item.fingerprint === expected);
  if (matched) return matched;

  if (process.platform === 'win32') {
    const extra = getWindowsExtraCandidatesSync(os.arch());
    return extra.find(item => item && item.fingerprint === expected) || null;
  }

  return null;
}

module.exports = {
  buildMachineFingerprint,
  getMachineFingerprintInfo,
  getMachineFingerprintInfoAsync,
  matchMachineFingerprint,
};
