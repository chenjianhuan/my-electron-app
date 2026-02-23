// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const MainController = require('./src/controllers/MainController');
const { LicenseGuard } = require('./src/services/LicenseGuard');
const { TrialGuard } = require('./src/services/TrialGuard');
const { initAutoUpdater } = require('./src/updater/autoUpdater');

let win;
let mainController;
let licenseGuard;
let trialGuard;
let appAccessStatus = null;
let exitingForLicense = false;

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
  const msg = reason || '授权U盘已移除，软件将立即退出。';
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

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    // 添加窗口图标
    icon: path.join(__dirname, 'public', 'icon.icns'),
    // 添加窗口标题
    title: 'MessageCounter - 网友消息统计',
    // 添加窗口最小尺寸
    minWidth: 1280,
    minHeight: 600,
    // 添加窗口居中显示
    center: true,
    // 添加窗口显示状态
    show: false
  });

  // 根据是否打包，选择正确的资源路径
  const indexPath = app.isPackaged
    ? path.join(process.resourcesPath, 'public', 'index.html')
    : path.join(__dirname, 'public', 'index.html');

  console.log("Loading index file from:", indexPath);

  win.loadFile(indexPath)
    .then(() => {
      console.log("Index file loaded successfully.");
      // 窗口加载完成后显示
      win.show();
    })
    .catch((error) => {
      console.error("Failed to load index file:", error);
      showErrorDialog('加载页面失败', error.message);
    });

  // 默认不自动打开开发者工具；需要时通过环境变量显式开启
  if (process.env.OPEN_DEVTOOLS === '1') {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  // 监听页面加载失败
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load page:', errorDescription);
    showErrorDialog('页面加载失败', errorDescription);
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
}

// 显示错误对话框
function showErrorDialog(title, message) {
  dialog.showErrorBox(title, message);
}

function registerLicenseIpc() {
  ipcMain.handle('license:get-status', () => {
    return licenseGuard ? licenseGuard.getStatus() : { authorized: false, reason: '授权未初始化' };
  });
  ipcMain.handle('app:get-access-status', () => {
    return appAccessStatus || { mode: 'blocked', authorized: false, reason: '访问状态未初始化' };
  });
}

function setupAccessControl() {
  if (process.env.SKIP_LICENSE_CHECK === '1') {
    console.warn('License check skipped by SKIP_LICENSE_CHECK=1');
    appAccessStatus = {
      mode: 'dev-bypass',
      authorized: true,
      reason: '开发模式已跳过授权检查',
    };
    return true;
  }

  let initialLicenseStatus = { authorized: false, mode: 'blocked', reason: '授权检查未执行' };
  try {
    licenseGuard = new LicenseGuard({
      app,
      onRevoked: (status) => {
        console.error('License revoked:', status.reason);
        enforceLicenseExit(status.reason || '授权已失效');
      },
      onStatusChange: (status) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('license-status-changed', status);
        }
      },
    });
    initialLicenseStatus = licenseGuard.checkAuthorization();
    licenseGuard.updateStatus(initialLicenseStatus);
  } catch (error) {
    initialLicenseStatus = { authorized: false, mode: 'blocked', reason: `授权检查失败: ${error.message}` };
  }

  if (initialLicenseStatus.authorized) {
    appAccessStatus = {
      mode: 'licensed',
      authorized: true,
      license: initialLicenseStatus,
    };
    licenseGuard.startMonitoring();
    return true;
  }

  trialGuard = new TrialGuard({ app, trialDays: 3 });
  const trialStatus = trialGuard.checkTrialAccess();
  if (trialStatus.allowed) {
    appAccessStatus = {
      mode: 'trial',
      authorized: true,
      trial: trialStatus,
      license: initialLicenseStatus,
    };
    return true;
  }

  appAccessStatus = {
    mode: 'blocked',
    authorized: false,
    trial: trialStatus,
    license: initialLicenseStatus,
  };
  const reason = trialStatus.reason || initialLicenseStatus.reason || '请插入授权U盘并重试。';
  dialog.showErrorBox('未检测到有效授权', reason);
  app.exit(40);
  return false;
}

if (relaunchFromTempOnWindows()) {
  process.exit(0);
}

// 应用准备就绪
app.whenReady().then(() => {
  try {
    registerLicenseIpc();
    if (!setupAccessControl()) {
      return;
    }

    // 创建主窗口
    createWindow();
    if (appAccessStatus && appAccessStatus.mode === 'licensed') {
      initAutoUpdater(win);
    }

    // 初始化主控制器
    mainController = new MainController(app);

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
  showErrorDialog('未处理的Promise拒绝', reason);
});

// 监听IPC通信错误
ipcMain.on('error', (event, error) => {
  console.error('IPC Error:', error);
  showErrorDialog('通信错误', error.message);
});
