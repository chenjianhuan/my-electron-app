// main.js
const { app, BrowserWindow, ipcMain, dialog, clipboard, screen, systemPreferences } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const MainController = require('./src/controllers/MainController');
const { LicenseGuard, LICENSE_FILE_NAME } = require('./src/services/LicenseGuard');
const { TrialGuard } = require('./src/services/TrialGuard');
const { normalizeLicenseInputToString } = require('./src/services/LicenseCodec');
const { buildPlanContext, getPublicPlanCatalog } = require('./src/services/PlanCatalog');
const {
  MODULE_IDS,
  MODULE_DEFINITIONS,
  ModulePasswordRouter,
  buildPasswordRoutesFromEnv,
  DEFAULT_PASSWORD_A,
  DEFAULT_PASSWORD_B,
} = require('./src/services/ModulePasswordRouter');
const { initAutoUpdater } = require('./src/updater/autoUpdater');

let win;
let mainController;
let licenseGuard;
let trialGuard;
let appAccessStatus = null;
let exitingForLicense = false;
let clipboardMonitorTimer = null;
let lastClipboardText = '';
let unlockedModuleId = null;
let unlockedModuleSecret = '';
let activeModuleId = MODULE_IDS.AUTH;
const MODULE_PASSWORD_OVERRIDE_FILE = 'module-password-overrides.json';
const TRIAL_PLAN_PREFERENCE_FILE = 'trial-plan-preference.json';
const TRIAL_DAYS = 7;
const basePasswordRoutes = buildPasswordRoutesFromEnv(process.env);

const modulePasswordRouter = new ModulePasswordRouter({
  passwordRoutes: basePasswordRoutes,
  maxAttempts: Number.parseInt(process.env.MC_PASSWORD_MAX_ATTEMPTS || '', 10),
  lockDurationMs: Number.parseInt(process.env.MC_PASSWORD_LOCK_MS || '', 10),
});

const WINDOW_SIZE_CONFIG = {
  baseWidth: 1280,
  baseHeight: 800,
  minWidth: 1024,
  minHeight: 600,
  preferredWidthRatio: 0.92,
  preferredHeightRatio: 0.9,
  maxAutoWidth: 1920,
  maxAutoHeight: 1200,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getLaunchDisplayWorkArea() {
  try {
    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint) || screen.getPrimaryDisplay();
    if (display && display.workArea) {
      return display.workArea;
    }
  } catch (error) {
    // ignore and fallback below
  }
  return {
    x: 0,
    y: 0,
    width: WINDOW_SIZE_CONFIG.baseWidth,
    height: WINDOW_SIZE_CONFIG.baseHeight,
  };
}

function computeAdaptiveWindowBounds() {
  const area = getLaunchDisplayWorkArea();
  const minWidth = Math.min(WINDOW_SIZE_CONFIG.minWidth, area.width);
  const minHeight = Math.min(WINDOW_SIZE_CONFIG.minHeight, area.height);
  const maxWidth = Math.min(area.width, WINDOW_SIZE_CONFIG.maxAutoWidth);
  const maxHeight = Math.min(area.height, WINDOW_SIZE_CONFIG.maxAutoHeight);

  const preferredWidth = Math.round(area.width * WINDOW_SIZE_CONFIG.preferredWidthRatio);
  const preferredHeight = Math.round(area.height * WINDOW_SIZE_CONFIG.preferredHeightRatio);

  const width = clamp(preferredWidth, minWidth, Math.max(minWidth, maxWidth));
  const height = clamp(preferredHeight, minHeight, Math.max(minHeight, maxHeight));
  const x = area.x + Math.floor((area.width - width) / 2);
  const y = area.y + Math.floor((area.height - height) / 2);

  return { x, y, width, height, minWidth, minHeight };
}

function fitWindowToDisplay(winInstance) {
  if (!winInstance || winInstance.isDestroyed()) return;
  if (winInstance.isFullScreen() || winInstance.isMaximized()) return;

  const currentBounds = winInstance.getBounds();
  const display = screen.getDisplayMatching(currentBounds);
  const area = display && display.workArea ? display.workArea : getLaunchDisplayWorkArea();
  const minWidth = Math.min(WINDOW_SIZE_CONFIG.minWidth, area.width);
  const minHeight = Math.min(WINDOW_SIZE_CONFIG.minHeight, area.height);
  let width = clamp(currentBounds.width, minWidth, area.width);
  let height = clamp(currentBounds.height, minHeight, area.height);
  let x = currentBounds.x;
  let y = currentBounds.y;

  if (x < area.x) x = area.x;
  if (y < area.y) y = area.y;
  if (x + width > area.x + area.width) x = area.x + area.width - width;
  if (y + height > area.y + area.height) y = area.y + area.height - height;

  winInstance.setMinimumSize(minWidth, minHeight);
  if (
    x !== currentBounds.x ||
    y !== currentBounds.y ||
    width !== currentBounds.width ||
    height !== currentBounds.height
  ) {
    winInstance.setBounds({ x, y, width, height });
  }
}

function buildAccessPlanContext(options = {}) {
  return buildPlanContext({
    tier: options.tier || 'plus',
    billingCycle: options.billingCycle || 'lifetime',
    source: options.source || 'license',
  });
}

function normalizeRuntimePlanTier(value, fallback = 'plus') {
  const tier = String(value || '').trim().toLowerCase();
  if (tier === 'plus' || tier === 'pro') return tier;
  return fallback;
}

function getTrialPlanPreferencePath() {
  return path.join(app.getPath('userData'), TRIAL_PLAN_PREFERENCE_FILE);
}

function readTrialPlanTierPreference() {
  try {
    const filePath = getTrialPlanPreferencePath();
    if (!fs.existsSync(filePath)) {
      return 'plus';
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return normalizeRuntimePlanTier(parsed && parsed.tier, 'plus');
  } catch (error) {
    return 'plus';
  }
}

function saveTrialPlanTierPreference(tier) {
  try {
    const nextTier = normalizeRuntimePlanTier(tier, 'plus');
    const filePath = getTrialPlanPreferencePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({
      tier: nextTier,
      updatedAt: new Date().toISOString(),
    }, null, 2));
    return true;
  } catch (error) {
    console.warn('保存试用套餐偏好失败:', error && error.message ? error.message : error);
    return false;
  }
}

function copyDirectorySync(source, target) {
  fs.mkdirSync(target, { recursive: true });
  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const dstPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectorySync(srcPath, dstPath);
    } else if (entry.isSymbolicLink()) {
      const link = fs.readlinkSync(srcPath);
      fs.symlinkSync(link, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function relaunchFromTempOnWindows() {
  if (process.platform !== 'win32') return false;
  if (!app.isPackaged) return false;
  if (process.env.MC_TEMP_RUN === '1') return false;

  const sourceDir = path.dirname(process.execPath);
  const version = app.getVersion() || 'unknown';
  const targetDir = path.join(os.tmpdir(), 'messagecounter-runtime', version);
  const targetExePath = path.join(targetDir, path.basename(process.execPath));

  try {
    if (!fs.existsSync(targetExePath)) {
      copyDirectorySync(sourceDir, targetDir);
    }
    spawn(targetExePath, process.argv.slice(1), {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, MC_TEMP_RUN: '1' },
    }).unref();
    return true;
  } catch (error) {
    console.error('Failed to relaunch from temp:', error);
    return false;
  }
}

function enforceLicenseExit(reason) {
  if (exitingForLicense) return;
  exitingForLicense = true;
  const msg = reason || '授权已失效，软件将立即退出。';
  dialog.showErrorBox('授权已失效', msg);
  if (win && !win.isDestroyed()) {
    try {
      win.webContents.send('license-force-exit', { reason: msg });
    } catch (error) {
      // ignore
    }
  }
  setTimeout(() => app.exit(41), 50);
}

function startClipboardMonitor() {
  if (clipboardMonitorTimer) return;
  // 以“当前剪贴板”为基线，避免每次开启监听都把旧内容当新复制。
  try {
    lastClipboardText = String(clipboard.readText() || '');
  } catch (error) {
    lastClipboardText = '';
  }
  clipboardMonitorTimer = setInterval(() => {
    try {
      if (!win || win.isDestroyed()) return;
      const current = String(clipboard.readText() || '');
      if (!current || current.length > 12000) return;
      if (current === lastClipboardText) return;
      lastClipboardText = current;
      win.webContents.send('clipboard:text-changed', {
        text: current,
        capturedAt: Date.now(),
      });
    } catch (error) {
      // ignore clipboard read/send failures
    }
  }, 700);
}

function stopClipboardMonitor() {
  if (clipboardMonitorTimer) {
    clearInterval(clipboardMonitorTimer);
    clipboardMonitorTimer = null;
  }
}

function resolvePublicFilePath(fileName) {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'public', fileName)
    : path.join(__dirname, 'public', fileName);
}

function resolveModulePasswordOverridePath() {
  return path.join(app.getPath('userData'), MODULE_PASSWORD_OVERRIDE_FILE);
}

function buildModulePasswordOverridesForPersist() {
  const baseMap = new Map(
    (basePasswordRoutes || []).map((item) => [String(item.moduleId || ''), String(item.password || '')])
  );
  return modulePasswordRouter
    .exportPasswordRoutes()
    .filter((item) => baseMap.get(String(item.moduleId || '')) !== String(item.password || ''))
    .map((item) => ({
      moduleId: String(item.moduleId || ''),
      password: String(item.password || ''),
    }));
}

function saveModulePasswordOverrides() {
  const filePath = resolveModulePasswordOverridePath();
  const routes = buildModulePasswordOverridesForPersist();
  if (!routes.length) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { ok: true, filePath, count: 0 };
  }

  const payload = {
    savedAt: new Date().toISOString(),
    routes,
  };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return { ok: true, filePath, count: routes.length };
}

function loadModulePasswordOverrides() {
  const filePath = resolveModulePasswordOverridePath();
  if (!fs.existsSync(filePath)) {
    return { ok: true, filePath, count: 0 };
  }

  const rawText = fs.readFileSync(filePath, 'utf8');
  const payload = JSON.parse(rawText || '{}');
  const routes = Array.isArray(payload && payload.routes) ? payload.routes : [];
  let count = 0;

  for (const route of routes) {
    const result = modulePasswordRouter.setModulePassword(
      route && route.moduleId,
      route && route.password,
      { allowCreate: true }
    );
    if (result && result.ok) {
      count += 1;
    }
  }

  return { ok: true, filePath, count };
}

async function loadModulePage(moduleId) {
  const target = MODULE_DEFINITIONS[moduleId];
  if (!target) {
    return { ok: false, reason: `未知模块: ${moduleId || '-'}` };
  }
  if (!win || win.isDestroyed()) {
    return { ok: false, reason: '窗口不可用' };
  }

  const pagePath = resolvePublicFilePath(target.file);
  console.log(`Loading module [${moduleId}] from:`, pagePath);

  const previousModuleId = activeModuleId;
  // 先更新当前模块，避免新页面初始化时读取到旧模块产生误判重定向。
  activeModuleId = moduleId;

  try {
    await win.loadFile(pagePath);
    if (!win.isVisible()) {
      win.show();
    }
    if (target.title) {
      win.setTitle(target.title);
    }
    fitWindowToDisplay(win);
    return { ok: true, moduleId, moduleName: target.name };
  } catch (error) {
    activeModuleId = previousModuleId;
    console.error(`Failed to load module [${moduleId}]:`, error);
    showErrorDialog('加载页面失败', error.message);
    return { ok: false, reason: error.message || '页面加载失败' };
  }
}

function isMicrophonePermissionRequest(permission, details = {}) {
  const safePermission = String(permission || '').trim().toLowerCase();
  if (safePermission === 'microphone') {
    return true;
  }
  if (safePermission !== 'media') {
    return false;
  }
  const mediaTypes = Array.isArray(details.mediaTypes)
    ? details.mediaTypes.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
    : [];
  if (mediaTypes.length === 0) {
    return true;
  }
  return mediaTypes.includes('audio') && !mediaTypes.includes('video');
}

async function ensureMicrophoneSystemAccess() {
  if (process.platform !== 'darwin') {
    return true;
  }
  try {
    return await systemPreferences.askForMediaAccess('microphone');
  } catch (error) {
    console.warn('Failed to request microphone access:', error);
    return false;
  }
}

function configureMediaPermissionHandlers(targetWindow) {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  const targetSession = targetWindow.webContents && targetWindow.webContents.session;
  if (!targetSession) {
    return;
  }

  targetSession.setPermissionCheckHandler((_webContents, permission, _requestingOrigin, details) => {
    if (isMicrophonePermissionRequest(permission, details)) {
      return true;
    }
    return false;
  });

  targetSession.setPermissionRequestHandler(async (_webContents, permission, callback, details) => {
    if (!isMicrophonePermissionRequest(permission, details)) {
      callback(false);
      return;
    }
    const granted = await ensureMicrophoneSystemAccess();
    callback(!!granted);
  });
}

function createWindow() {
  const adaptiveBounds = computeAdaptiveWindowBounds();
  win = new BrowserWindow({
    x: adaptiveBounds.x,
    y: adaptiveBounds.y,
    width: adaptiveBounds.width,
    height: adaptiveBounds.height,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    // 添加窗口图标
    icon: resolvePublicFilePath('icon.icns'),
    // 添加窗口标题
    title: MODULE_DEFINITIONS[MODULE_IDS.AUTH].title,
    // 添加窗口最小尺寸
    minWidth: adaptiveBounds.minWidth,
    minHeight: adaptiveBounds.minHeight,
    // 添加窗口显示状态
    show: false
  });

  configureMediaPermissionHandlers(win);

  loadModulePage(MODULE_IDS.AUTH);

  // 默认不自动打开开发者工具；需要时通过环境变量显式开启
  if (process.env.OPEN_DEVTOOLS === '1') {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  // 监听页面加载失败
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // -3 (ERR_ABORTED) 通常是导航切换导致的中断，不应弹错。
    if (errorCode === -3) {
      return;
    }
    // 仅处理主框架加载失败，忽略子资源失败避免误报。
    if (isMainFrame === false) {
      return;
    }
    console.error('Failed to load page:', { errorCode, errorDescription, validatedURL, isMainFrame });
    showErrorDialog('页面加载失败', `${errorDescription}${validatedURL ? `\n${validatedURL}` : ''}`);
  });

  // 监听渲染进程崩溃
  win.webContents.on('crashed', (event) => {
    console.error('Renderer process crashed');
    showErrorDialog('渲染进程崩溃', '应用遇到问题，请重启应用');
  });

  // 监听未响应的渲染进程
  win.webContents.on('unresponsive', () => {
    console.warn('Renderer process became unresponsive');
    showErrorDialog('应用无响应', '应用暂时无响应，请稍后重试');
  });

  const handleDisplayMetricsChange = () => fitWindowToDisplay(win);
  screen.on('display-added', handleDisplayMetricsChange);
  screen.on('display-removed', handleDisplayMetricsChange);
  screen.on('display-metrics-changed', handleDisplayMetricsChange);

  win.on('closed', () => {
    screen.removeListener('display-added', handleDisplayMetricsChange);
    screen.removeListener('display-removed', handleDisplayMetricsChange);
    screen.removeListener('display-metrics-changed', handleDisplayMetricsChange);
  });
}

// 显示错误对话框
function showErrorDialog(title, message) {
  const safeTitle = String(title || '错误');
  let safeMessage = '';
  if (message instanceof Error) {
    safeMessage = String(message.stack || message.message || message);
  } else if (typeof message === 'object' && message !== null) {
    try {
      safeMessage = JSON.stringify(message, null, 2);
    } catch (error) {
      safeMessage = String(message);
    }
  } else {
    safeMessage = String(message || '');
  }
  dialog.showErrorBox(safeTitle, safeMessage);
}

function buildLicenseGuard() {
  return new LicenseGuard({
    app,
    onRevoked: (status) => {
      console.error('License revoked:', status.reason);
      enforceLicenseExit(status.reason || '授权已失效');
    },
    onStatusChange: (status) => {
      if (status && status.authorized && appAccessStatus && appAccessStatus.mode === 'licensed') {
        appAccessStatus.plan = buildAccessPlanContext({
          tier: status.tier || (appAccessStatus.plan && appAccessStatus.plan.tier) || 'pro',
          billingCycle: status.billingCycle || (appAccessStatus.plan && appAccessStatus.plan.billingCycle) || 'lifetime',
          source: status.licenseSource || 'license',
        });
      }
      notifyAccessStatusChanged();
    },
  });
}

function ensureLicenseGuard() {
  if (!licenseGuard) {
    licenseGuard = buildLicenseGuard();
  }
  return licenseGuard;
}

function ensureTrialGuard() {
  if (!trialGuard) {
    trialGuard = new TrialGuard({ app, trialDays: TRIAL_DAYS });
  }
  return trialGuard;
}

function notifyAccessStatusChanged() {
  if (!win || win.isDestroyed()) {
    return;
  }
  win.webContents.send(
    'license-status-changed',
    licenseGuard ? licenseGuard.getStatus() : { authorized: false, reason: '授权未初始化' }
  );
  win.webContents.send(
    'app-access-status-changed',
    appAccessStatus || { mode: 'blocked', authorized: false, reason: '访问状态未初始化' }
  );
}

function refreshAccessControl(options = {}) {
  if (process.env.SKIP_LICENSE_CHECK === '1') {
    console.warn('License check skipped by SKIP_LICENSE_CHECK=1');
    appAccessStatus = {
      mode: 'dev-bypass',
      authorized: true,
      reason: '开发模式已跳过授权检查',
      plan: buildAccessPlanContext({ tier: 'pro', billingCycle: 'lifetime', source: 'dev-bypass' }),
    };
    if (options.notify !== false) {
      notifyAccessStatusChanged();
    }
    return {
      accessStatus: appAccessStatus,
      licenseStatus: licenseGuard ? licenseGuard.getStatus() : { authorized: false, reason: '开发模式跳过授权检查' },
    };
  }

  let currentLicenseStatus = { authorized: false, mode: 'blocked', reason: '授权检查未执行' };
  try {
    const guard = ensureLicenseGuard();
    currentLicenseStatus = guard.refreshStatus({ notify: false });
  } catch (error) {
    currentLicenseStatus = { authorized: false, mode: 'blocked', reason: `授权检查失败: ${error.message}` };
    if (licenseGuard) {
      licenseGuard.updateStatus(currentLicenseStatus, { notify: false });
      licenseGuard.stopMonitoring();
    }
  }

  if (currentLicenseStatus.authorized) {
    appAccessStatus = {
      mode: 'licensed',
      authorized: true,
      license: currentLicenseStatus,
      plan: buildAccessPlanContext({
        tier: currentLicenseStatus.tier || 'pro',
        billingCycle: currentLicenseStatus.billingCycle || 'lifetime',
        source: currentLicenseStatus.licenseSource || 'license',
      }),
    };
    if (licenseGuard) {
      licenseGuard.startMonitoring();
    }
  } else {
    if (licenseGuard) {
      licenseGuard.stopMonitoring();
    }
    const activeTrialGuard = ensureTrialGuard();
    const trialStatus = activeTrialGuard.checkTrialAccess();
    if (trialStatus.allowed) {
      const trialTier = readTrialPlanTierPreference();
      appAccessStatus = {
        mode: 'trial',
        authorized: true,
        trial: trialStatus,
        license: currentLicenseStatus,
        plan: buildAccessPlanContext({ tier: trialTier, billingCycle: 'lifetime', source: 'trial' }),
      };
    } else {
      appAccessStatus = {
        mode: 'blocked',
        authorized: false,
        trial: trialStatus,
        license: currentLicenseStatus,
        reason: trialStatus.reason || currentLicenseStatus.reason || '请插入授权U盘或导入离线授权文件后重试。',
        plan: buildAccessPlanContext({ tier: 'plus', billingCycle: 'lifetime', source: 'blocked' }),
      };
    }
  }

  if (options.notify !== false) {
    notifyAccessStatusChanged();
  }
  return {
    accessStatus: appAccessStatus,
    licenseStatus: currentLicenseStatus,
  };
}

function getManagedOfflineLicensePath() {
  return path.join(app.getPath('userData'), LICENSE_FILE_NAME);
}

function activateOfflineLicenseFromInput(rawInput) {
  const guard = ensureLicenseGuard();
  const normalizedLicenseText = normalizeLicenseInputToString(rawInput);
  const verified = guard.verifyLicenseFile(normalizedLicenseText);
  const targetPath = getManagedOfflineLicensePath();
  const previewStatus = guard.evaluatePayload(verified.payload, {
    source: 'offline',
    sourceLabel: '离线授权',
    drive: null,
    licensePath: targetPath,
  });

  if (!previewStatus.authorized) {
    throw new Error(previewStatus.reason || '授权不可用');
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${normalizedLicenseText.trim()}\n`, 'utf8');

  const refreshed = refreshAccessControl({ notify: true });
  if (!refreshed.licenseStatus || !refreshed.licenseStatus.authorized) {
    throw new Error(
      (refreshed.licenseStatus && refreshed.licenseStatus.reason)
      || '授权已写入，但未能生效'
    );
  }

  return {
    ok: true,
    savedPath: targetPath,
    licenseStatus: refreshed.licenseStatus,
    accessStatus: refreshed.accessStatus,
  };
}

function isSharpRuntimeLoadError(reason) {
  const text = String(
    reason instanceof Error
      ? (reason.stack || reason.message || reason)
      : (reason && reason.message ? reason.message : reason || '')
  );
  return /Could not load the "sharp" module/i.test(text)
    || /sharp\.pixelplumbing\.com\/install/i.test(text);
}

function registerLicenseIpc() {
  ipcMain.handle('license:get-status', () => {
    return licenseGuard ? licenseGuard.getStatus() : { authorized: false, reason: '授权未初始化' };
  });
  ipcMain.handle('license:refresh-status', () => {
    try {
      const refreshed = refreshAccessControl({ notify: true });
      return {
        ok: true,
        status: refreshed.licenseStatus,
        accessStatus: refreshed.accessStatus,
      };
    } catch (error) {
      return {
        ok: false,
        reason: error && error.message ? error.message : String(error),
        status: licenseGuard ? licenseGuard.getStatus() : { authorized: false, reason: '授权未初始化' },
        accessStatus: appAccessStatus || { mode: 'blocked', authorized: false, reason: '访问状态未初始化' },
      };
    }
  });
  ipcMain.handle('license:activate-from-input', (_event, payload) => {
    try {
      return activateOfflineLicenseFromInput(payload && payload.input);
    } catch (error) {
      return {
        ok: false,
        reason: error && error.message ? error.message : String(error),
      };
    }
  });
  ipcMain.handle('license:build-offline-request', () => {
    const status = licenseGuard ? (licenseGuard.getStatus() || {}) : {};
    const access = appAccessStatus || {};
    const plan = access.plan || {};
    const machineFingerprint = String(
      status.machineFingerprint
      || (access.license && access.license.machineFingerprint)
      || access.machineFingerprint
      || ''
    );
    const importPaths = licenseGuard && typeof licenseGuard.resolveLocalLicensePaths === 'function'
      ? licenseGuard.resolveLocalLicensePaths()
      : [];
    return {
      requestType: 'offline-license-request',
      productName: app.getName(),
      version: app.getVersion(),
      generatedAt: new Date().toISOString(),
      machineFingerprint,
      customerId: String(status.customerId || (access.license && access.license.customerId) || ''),
      tier: String(status.tier || plan.tier || 'plus'),
      tierName: String(status.tierName || plan.name || ''),
      billingCycle: String(status.billingCycle || plan.billingCycle || 'lifetime'),
      reason: String(
        access.reason
        || (access.license && access.license.reason)
        || status.reason
        || '未检测到有效授权'
      ),
      platform: process.platform,
      arch: os.arch(),
      importPaths,
      recommendedFileName: 'license.dat',
    };
  });
  ipcMain.handle('app:get-version', () => {
    return app.getVersion();
  });
  ipcMain.handle('app:get-access-status', () => {
    return appAccessStatus || { mode: 'blocked', authorized: false, reason: '访问状态未初始化' };
  });
  ipcMain.handle('plan:get-catalog', () => {
    return getPublicPlanCatalog();
  });
  ipcMain.handle('plan:switch-trial-tier', (_event, payload) => {
    const tier = normalizeRuntimePlanTier(payload && payload.tier, '');
    if (!tier) {
      return { ok: false, reason: '套餐参数无效' };
    }
    if (!appAccessStatus || appAccessStatus.mode !== 'trial') {
      return { ok: false, reason: '当前非试用模式，不能切换套餐' };
    }

    const currentTier = normalizeRuntimePlanTier(appAccessStatus.plan && appAccessStatus.plan.tier, 'plus');
    if (currentTier === tier) {
      return { ok: true, changed: false, status: appAccessStatus };
    }

    appAccessStatus.plan = buildAccessPlanContext({
      tier,
      billingCycle: 'lifetime',
      source: 'trial',
    });
    saveTrialPlanTierPreference(tier);

    if (win && !win.isDestroyed()) {
      win.webContents.send('app-access-status-changed', appAccessStatus);
    }
    return { ok: true, changed: true, status: appAccessStatus };
  });
  ipcMain.on('clipboard-monitor:start', () => {
    startClipboardMonitor();
  });
  ipcMain.on('clipboard-monitor:stop', () => {
    stopClipboardMonitor();
  });
  ipcMain.handle('clipboard:read-text', () => {
    try {
      return String(clipboard.readText() || '');
    } catch (error) {
      return '';
    }
  });
  ipcMain.handle('clipboard:write-text', (_event, payload) => {
    try {
      const text = String((payload && payload.text) || '');
      clipboard.writeText(text);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: error && error.message ? error.message : '写入剪贴板失败'
      };
    }
  });
  ipcMain.handle('reader:read-book-file', (_event, payload) => {
    const requestedPath = String((payload && payload.path) || '');
    const normalizedPath = requestedPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalizedPath.startsWith('books/') || normalizedPath.includes('..')) {
      return { ok: false, reason: '非法文件路径' };
    }
    try {
      const bookPath = resolvePublicFilePath(normalizedPath);
      const text = fs.readFileSync(bookPath, 'utf8');
      return { ok: true, text };
    } catch (error) {
      return { ok: false, reason: error && error.message ? error.message : '读取文件失败' };
    }
  });
}

function registerModuleRoutingIpc() {
  ipcMain.handle('module-auth:get-state', () => {
    const lockState = modulePasswordRouter.getLockState();
    const showPasswordHint = process.env.MC_SHOW_DEFAULT_PASSWORD_HINT === '1' || !app.isPackaged;
    const lotteryRoute = modulePasswordRouter.getPasswordRoute(MODULE_IDS.LOTTERY);
    const wechatRoute = modulePasswordRouter.getPasswordRoute(MODULE_IDS.WECHAT);
    return {
      ...lockState,
      showPasswordHint,
      defaultPasswords: showPasswordHint
        ? {
          lottery: (lotteryRoute && lotteryRoute.password) || DEFAULT_PASSWORD_A,
          wechat: (wechatRoute && wechatRoute.password) || DEFAULT_PASSWORD_B,
        }
        : null,
      routeHints: [
        { moduleId: MODULE_IDS.LOTTERY, moduleName: MODULE_DEFINITIONS[MODULE_IDS.LOTTERY].name },
        { moduleId: MODULE_IDS.WECHAT, moduleName: MODULE_DEFINITIONS[MODULE_IDS.WECHAT].name },
      ],
    };
  });

  ipcMain.handle('module-auth:unlock', (_event, payload) => {
    const result = modulePasswordRouter.verifyPassword(payload && payload.password);
    if (result.ok) {
      unlockedModuleId = result.moduleId;
      unlockedModuleSecret = String(result.secretKey || (payload && payload.password) || '');
    }
    return result;
  });

  ipcMain.handle('module-auth:update-password', (_event, payload) => {
    const moduleId = String((payload && payload.moduleId) || '');
    if (!MODULE_DEFINITIONS[moduleId] || moduleId === MODULE_IDS.AUTH) {
      return { ok: false, code: 'INVALID_MODULE', reason: '模块不支持修改密码' };
    }

    if (activeModuleId !== moduleId || unlockedModuleId !== moduleId) {
      return { ok: false, code: 'MODULE_NOT_UNLOCKED', reason: '请先使用当前密码进入该模块后再修改密码' };
    }

    const currentPassword = payload && payload.currentPassword ? String(payload.currentPassword) : '';
    const nextPassword = payload && payload.nextPassword ? String(payload.nextPassword) : '';
    const result = modulePasswordRouter.updateModulePassword(moduleId, currentPassword, nextPassword);
    if (!result || !result.ok) {
      return result || { ok: false, code: 'UNKNOWN', reason: '密码更新失败' };
    }

    try {
      saveModulePasswordOverrides();
    } catch (error) {
      modulePasswordRouter.setModulePassword(moduleId, result.previousPassword, { allowCreate: true });
      return {
        ok: false,
        code: 'SAVE_FAILED',
        reason: `保存失败，已回滚: ${error && error.message ? error.message : String(error)}`,
      };
    }

    unlockedModuleSecret = String(result.password || '');
    return { ok: true, moduleId, reason: '密码修改成功，下次请使用新密码登录。' };
  });

  ipcMain.handle('module-router:get-current', () => {
    const active = MODULE_DEFINITIONS[activeModuleId] || null;
    return {
      activeModuleId,
      activeModuleName: active ? active.name : '',
      unlockedModuleId,
    };
  });

  ipcMain.handle('module-router:open', async (_event, payload) => {
    const targetModuleId = String((payload && payload.moduleId) || '');
    if (!MODULE_DEFINITIONS[targetModuleId]) {
      return { ok: false, reason: '目标模块不存在' };
    }

    if (targetModuleId === MODULE_IDS.AUTH) {
      stopClipboardMonitor();
      unlockedModuleId = null;
      unlockedModuleSecret = '';
      return loadModulePage(MODULE_IDS.AUTH);
    }

    if (!unlockedModuleId) {
      return { ok: false, reason: '请先输入密码' };
    }
    if (targetModuleId !== unlockedModuleId) {
      return { ok: false, reason: '当前密码无权访问该模块' };
    }

    return loadModulePage(targetModuleId);
  });
}

function setupAccessControl() {
  refreshAccessControl({ notify: false });
  return true;
}

if (relaunchFromTempOnWindows()) {
  process.exit(0);
}

// 应用准备就绪
app.whenReady().then(() => {
  try {
    try {
      const loadResult = loadModulePasswordOverrides();
      if (loadResult.count > 0) {
        console.log(`Loaded ${loadResult.count} module password override(s)`);
      }
    } catch (error) {
      console.error('Failed to load module password overrides:', error);
    }

    registerLicenseIpc();
    registerModuleRoutingIpc();
    if (!setupAccessControl()) {
      return;
    }

    // 创建主窗口
    createWindow();
    if (
      appAccessStatus &&
      appAccessStatus.mode === 'licensed' &&
      appAccessStatus.plan &&
      appAccessStatus.plan.capabilities &&
      appAccessStatus.plan.capabilities.autoUpdate
    ) {
      initAutoUpdater(win);
    }

    // 初始化主控制器
    mainController = new MainController(app, {
      getWechatSecret: () => unlockedModuleSecret,
    });

    // 监听激活事件
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });

    console.log('Application started successfully');
  } catch (error) {
    console.error('Failed to start application:', error);
    showErrorDialog('启动失败', '应用启动失败，请检查系统环境');
  }
});

// 监听所有窗口关闭事件
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 监听应用即将退出
app.on('before-quit', () => {
  console.log('Application is about to quit');
  if (licenseGuard) {
    licenseGuard.stopMonitoring();
  }
  stopClipboardMonitor();
});

// 监听应用退出
app.on('quit', () => {
  console.log('Application quit');
});

// 捕获未处理的异常
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  showErrorDialog('未处理的异常', error.message);
});

// 捕获未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (isSharpRuntimeLoadError(reason)) {
    console.warn('Sharp runtime load failed; OCR image enhancement will be degraded until dependency/runtime is fixed.');
    return;
  }
  showErrorDialog('未处理的Promise拒绝', reason);
});

// 监听IPC通信错误
ipcMain.on('error', (event, error) => {
  console.error('IPC Error:', error);
  showErrorDialog('通信错误', error.message);
});
