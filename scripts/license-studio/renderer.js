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

async function loadDefaults() {
  const defaults = await window.licenseStudio.getDefaults();
  $('privateKeyPath').value = defaults.privateKeyPath || '';
  $('offlineOutputPath').value = defaults.offlineOutputPath || '';
  $('usbExpireAt').value = defaults.defaultExpireAt || '';
  $('offlineExpireAt').value = defaults.defaultExpireAt || '';
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
  const payload = {
    privateKeyPath: requireValue($('privateKeyPath').value, '私钥路径'),
    customerId: requireValue($('usbCustomerId').value, '客户编号'),
    mountPath: requireValue($('usbMountPath').value, 'U盘路径'),
    expireAt: requireValue($('usbExpireAt').value, '到期日期'),
    graceDays: $('usbGraceDays').value,
    tier: $('usbTier').value,
    billingCycle: $('usbBillingCycle').value,
  };

  const result = await window.licenseStudio.issueUsb(payload);
  appendLog(`U盘签发成功 -> ${result.outputPath}`);
  appendLog(`客户编号: ${result.payload.customerId} | 套餐: ${result.payload.tier} | 指纹: ${result.usbFingerprint}`);
  alert(`U盘签发成功\n${result.outputPath}`);
}

async function issueOffline() {
  const payload = {
    privateKeyPath: requireValue($('privateKeyPath').value, '私钥路径'),
    customerId: requireValue($('offlineCustomerId').value, '客户编号'),
    machineFingerprint: requireValue($('machineFingerprint').value, '机器指纹'),
    expireAt: requireValue($('offlineExpireAt').value, '到期日期'),
    outputPath: requireValue($('offlineOutputPath').value, '输出路径'),
    graceDays: $('offlineGraceDays').value,
    tier: $('offlineTier').value,
    billingCycle: $('offlineBillingCycle').value,
  };

  const result = await window.licenseStudio.issueOffline(payload);
  appendLog(`离线签发成功 -> ${result.outputPath}`);
  appendLog(`客户编号: ${result.payload.customerId} | 套餐: ${result.payload.tier} | 机器指纹: ${result.payload.machineFingerprint}`);
  alert(`离线授权签发成功\n${result.outputPath}`);
}

function bindEvents() {
  $('refreshUsbBtn').addEventListener('click', () => withErrorGuard(refreshUsbList));
  $('pickPrivateKeyBtn').addEventListener('click', () => withErrorGuard(pickPrivateKey));
  $('pickOutputBtn').addEventListener('click', () => withErrorGuard(pickOutputPath));
  $('loadMachineFingerprintBtn').addEventListener('click', () => withErrorGuard(loadMachineFingerprint));
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
