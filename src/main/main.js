const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,    // 启用 Node.js 模块的集成
      contextIsolation: false,  // 关闭上下文隔离，允许使用 require
      enableRemoteModule: true  // 如果需要使用 remote 模块，则启用它
    }
  });

  // 使用绝对路径加载 index.html
  win.loadFile(path.join(__dirname, '../../public/index.html'));
}

// 文件路径
const userDataPath = path.join(app.getPath('userData'), 'userData.json');

// 从文件加载用户数据
function loadUserData() {
  try {
    if (fs.existsSync(userDataPath)) {
      const data = fs.readFileSync(userDataPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
  return {};
}

// 保存用户数据到文件
function saveUserData(data) {
  try {
    fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

app.whenReady().then(() => {
  createWindow();

  // 在主进程中监听渲染进程发来的数据保存请求
  ipcMain.on('save-user-data', (event, userData) => {
    saveUserData(userData); // 保存数据到文件
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 当应用启动时，向渲染进程发送已保存的用户数据
ipcMain.on('load-user-data', (event) => {
  const userData = loadUserData();
  event.reply('user-data-loaded', userData);
});
