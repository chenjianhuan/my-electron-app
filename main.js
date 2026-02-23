// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const MainController = require('./src/controllers/MainController');

let win;
let mainController;

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
  const { dialog } = require('electron');
  dialog.showErrorBox(title, message);
}

// 应用准备就绪
app.whenReady().then(() => {
  try {
    // 创建主窗口
    createWindow();

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
  // 在这里可以添加清理代码
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
