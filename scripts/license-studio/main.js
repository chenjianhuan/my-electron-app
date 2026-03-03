const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const licenseTools = require('../license-tools');

let win = null;

function getDefaultExpireDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function getDefaultPrivateKeyPath() {
  const configuredPath = String(licenseTools.getPrivateKeyFromEnv() || '').trim();
  if (!configuredPath) return '';
  return path.resolve(configuredPath);
}

function getDefaultOutputPath() {
  return path.join(app.getPath('downloads'), 'license.dat');
}

function createWindow() {
  win = new BrowserWindow({
    width: 1080,
    height: 860,
    minWidth: 980,
    minHeight: 760,
    title: '授权签发工具',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

function registerIpc() {
  ipcMain.handle('studio:get-defaults', () => ({
    privateKeyPath: getDefaultPrivateKeyPath(),
    offlineOutputPath: getDefaultOutputPath(),
    defaultExpireAt: getDefaultExpireDate(),
  }));

  ipcMain.handle('studio:list-usb', () => licenseTools.listUsb());

  ipcMain.handle('studio:get-machine-fingerprint', () => licenseTools.getMachineFingerprintInfo());

  ipcMain.handle('studio:pick-private-key', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: '选择私钥文件',
      properties: ['openFile'],
      filters: [
        { name: 'PEM 私钥', extensions: ['pem'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      defaultPath: getDefaultPrivateKeyPath(),
    });
    if (result.canceled || !result.filePaths || !result.filePaths.length) return '';
    return result.filePaths[0];
  });

  ipcMain.handle('studio:pick-output-path', async () => {
    const result = await dialog.showSaveDialog(win, {
      title: '保存离线授权文件',
      defaultPath: getDefaultOutputPath(),
      filters: [
        { name: 'License File', extensions: ['dat'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) return '';
    return result.filePath;
  });

  ipcMain.handle('studio:issue-usb', (_event, payload) => {
    const result = licenseTools.issueUsbLicense({
      privateKeyPath: payload.privateKeyPath,
      customerId: payload.customerId,
      mountPath: payload.mountPath,
      expireAt: payload.expireAt,
      graceDays: payload.graceDays,
      tier: payload.tier,
      billingCycle: payload.billingCycle,
    });
    return {
      outputPath: result.outputPath,
      mountPath: result.drive.mountPath,
      usbFingerprint: result.drive.fingerprint,
      payload: result.payload,
    };
  });

  ipcMain.handle('studio:issue-offline', (_event, payload) => {
    if (payload.outputPath) {
      fs.mkdirSync(path.dirname(payload.outputPath), { recursive: true });
    }
    const result = licenseTools.issueOfflineLicense({
      privateKeyPath: payload.privateKeyPath,
      customerId: payload.customerId,
      machineFingerprint: payload.machineFingerprint,
      expireAt: payload.expireAt,
      outputPath: payload.outputPath,
      graceDays: payload.graceDays,
      tier: payload.tier,
      billingCycle: payload.billingCycle,
    });
    return {
      outputPath: result.outputPath,
      payload: result.payload,
    };
  });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

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
