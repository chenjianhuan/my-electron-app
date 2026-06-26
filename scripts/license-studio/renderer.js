function $(id) {
  return document.getElementById(id);
}

function nowLabel() {
  return new Date().toLocaleTimeString();
}

function appendLog(text) {
  const box = $('logBox');
  if (!box) return;
  const line = `[${nowLabel()}] ${text}`;
  box.textContent = box.textContent ? `${box.textContent}\n${line}` : line;
  box.scrollTop = box.scrollHeight;
}

function requireValue(value, label) {
  const text = String(value || '').trim();
  if (!text) {
    throw new Error(`${label}不能为空`);
  }
  return text;
}

function parseDurationMonths(rawValue, fallback = NaN) {
  const value = Number.parseInt(rawValue, 10);
  if (value === 1 || value === 6 || value === 12) {
    return value;
  }
  return fallback;
}

function addMonthsKeepingLocalClock(baseDate, months) {
  const source = baseDate instanceof Date ? new Date(baseDate.getTime()) : new Date(baseDate);
  if (!Number.isFinite(source.getTime())) {
    throw new Error('当前时间无效');
  }

  const target = new Date(source.getTime());
  const originalDay = target.getDate();
  target.setDate(1);
  target.setMonth(target.getMonth() + months);
  const lastDayOfTargetMonth = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0
  ).getDate();
  target.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return target;
}

function formatDateTimeForPreview(date) {
  const target = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(target.getTime())) {
    return '-';
  }
  return target.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function computeExpireAtFromNow(months) {
  const durationMonths = parseDurationMonths(months);
  if (!Number.isInteger(durationMonths)) {
    throw new Error('续费时长不能为空');
  }
  const expireAt = addMonthsKeepingLocalClock(new Date(), durationMonths);
  return expireAt.toISOString();
}

function updateExpirePreview(prefix) {
  const select = $(`${prefix}DurationMonths`);
  const preview = $(`${prefix}ExpirePreview`);
  if (!select || !preview) return;
  const durationMonths = parseDurationMonths(select.value);
  if (!Number.isInteger(durationMonths)) {
    preview.textContent = '请先选择续费时长';
    return;
  }
  const expireAt = addMonthsKeepingLocalClock(new Date(), durationMonths);
  const durationText = durationMonths === 12 ? '1 年' : `${durationMonths} 个月`;
  preview.textContent = `${formatDateTimeForPreview(expireAt)}（从现在起 ${durationText}）`;
}

async function copyOfflineCode() {
  const code = String(($('offlineLicenseCode') && $('offlineLicenseCode').value) || '').trim();
  if (!code) {
    throw new Error('请先签发离线授权，再复制授权码');
  }
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(code);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = code;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!copied) {
      throw new Error('当前环境不支持自动复制，请手动复制授权码');
    }
  }
  appendLog('已复制授权码');
}

async function loadDefaults() {
  const defaults = await window.licenseStudio.getDefaults();
  $('privateKeyPath').value = defaults.privateKeyPath || '';
  $('offlineOutputPath').value = defaults.offlineOutputPath || '';
  updateExpirePreview('usb');
  updateExpirePreview('offline');
}

async function refreshUsbList() {
  const select = $('usbMountPath');
  select.innerHTML = '';

  const drives = await window.licenseStudio.listUsb();
  if (!Array.isArray(drives) || !drives.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '未检测到U盘';
    select.appendChild(option);
    appendLog('未检测到可用U盘');
    return;
  }

  drives.forEach(item => {
    const option = document.createElement('option');
    option.value = item.mountPath;
    const name = item.volumeName ? ` ${item.volumeName}` : '';
    option.textContent = `${item.mountPath}${name} [${item.fingerprint.slice(0, 8)}...]`;
    select.appendChild(option);
  });
  appendLog(`已加载 ${drives.length} 个U盘设备`);
}

async function pickPrivateKey() {
  const selected = await window.licenseStudio.pickPrivateKey();
  if (!selected) return;
  $('privateKeyPath').value = selected;
  appendLog(`已选择私钥: ${selected}`);
}

async function pickOutputPath() {
  const selected = await window.licenseStudio.pickOutputPath();
  if (!selected) return;
  $('offlineOutputPath').value = selected;
  appendLog(`已选择输出路径: ${selected}`);
}

async function loadMachineFingerprint() {
  const info = await window.licenseStudio.getMachineFingerprint();
  $('machineFingerprint').value = info.machineFingerprint || '';
  appendLog(`本机指纹: ${info.machineFingerprint || '-'}`);
}

async function issueUsb() {
  const expireAt = computeExpireAtFromNow(requireValue($('usbDurationMonths').value, '续费时长'));
  const payload = {
    privateKeyPath: requireValue($('privateKeyPath').value, '私钥路径'),
    customerId: requireValue($('usbCustomerId').value, '客户编号'),
    mountPath: requireValue($('usbMountPath').value, 'U盘路径'),
    expireAt,
    graceDays: $('usbGraceDays').value,
    tier: requireValue($('usbTier').value, '套餐'),
    billingCycle: $('usbBillingCycle').value,
  };

  const result = await window.licenseStudio.issueUsb(payload);
  appendLog(`U盘签发成功 -> ${result.outputPath}`);
  appendLog(`客户编号: ${result.payload.customerId} | 套餐: ${result.payload.tier} | 指纹: ${result.usbFingerprint}`);
  appendLog(`到期时间: ${result.payload.expireAt}`);
  alert(`U盘签发成功\n${result.outputPath}`);
}

async function issueOffline() {
  const expireAt = computeExpireAtFromNow(requireValue($('offlineDurationMonths').value, '续费时长'));
  const payload = {
    privateKeyPath: requireValue($('privateKeyPath').value, '私钥路径'),
    customerId: requireValue($('offlineCustomerId').value, '客户编号'),
    machineFingerprint: requireValue($('machineFingerprint').value, '机器指纹'),
    expireAt,
    outputPath: requireValue($('offlineOutputPath').value, '输出路径'),
    graceDays: $('offlineGraceDays').value,
    tier: requireValue($('offlineTier').value, '套餐'),
    billingCycle: $('offlineBillingCycle').value,
  };

  const result = await window.licenseStudio.issueOffline(payload);
  $('offlineLicenseCode').value = result.licenseCode || '';
  appendLog(`离线签发成功 -> ${result.outputPath}`);
  appendLog(`客户编号: ${result.payload.customerId} | 套餐: ${result.payload.tier} | 机器指纹: ${result.payload.machineFingerprint}`);
  appendLog(`到期时间: ${result.payload.expireAt}`);
  if (result.licenseCode) {
    appendLog('已生成可直接发送给用户的授权码');
  }
  alert(`离线授权签发成功\n${result.outputPath}`);
}

function bindEvents() {
  $('refreshUsbBtn').addEventListener('click', () => withErrorGuard(refreshUsbList));
  $('pickPrivateKeyBtn').addEventListener('click', () => withErrorGuard(pickPrivateKey));
  $('pickOutputBtn').addEventListener('click', () => withErrorGuard(pickOutputPath));
  $('loadMachineFingerprintBtn').addEventListener('click', () => withErrorGuard(loadMachineFingerprint));
  $('usbDurationMonths').addEventListener('change', () => updateExpirePreview('usb'));
  $('offlineDurationMonths').addEventListener('change', () => updateExpirePreview('offline'));
  $('copyOfflineCodeBtn').addEventListener('click', () => withErrorGuard(copyOfflineCode));
  $('issueUsbBtn').addEventListener('click', () => withErrorGuard(issueUsb));
  $('issueOfflineBtn').addEventListener('click', () => withErrorGuard(issueOffline));
}

async function withErrorGuard(fn) {
  try {
    await fn();
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    appendLog(`失败: ${message}`);
    alert(message);
  }
}

async function init() {
  bindEvents();
  await withErrorGuard(loadDefaults);
  await withErrorGuard(refreshUsbList);
}

init();
