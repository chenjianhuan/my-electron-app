// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const MainController = require('../controllers/MainController');

let win;
let mainController;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  win.loadFile(path.join(__dirname, '../../public/index.html'));
}

app.whenReady().then(() => {
  createWindow();

  // 初始化控制器
  mainController = new MainController(app);

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
