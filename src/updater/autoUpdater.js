const { app, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

function initAutoUpdater(mainWindow) {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    if (!app.isPackaged) {
      console.log('[updater] skip: app is not packaged');
      return;
    }

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('checking-for-update', () => {
      console.log('[updater] checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('[updater] update available:', info && info.version);
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('[updater] no update:', info && info.version);
    });

    autoUpdater.on('error', (error) => {
      console.error('[updater] failed:', error && error.message ? error.message : error);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      if (!progressObj) return;
      console.log('[updater] download progress:', `${Math.round(progressObj.percent || 0)}%`);
    });

    autoUpdater.on('update-downloaded', async () => {
      try {
        const result = await dialog.showMessageBox(mainWindow, {
          type: 'info',
          buttons: ['立即安装重启', '稍后'],
          defaultId: 0,
          cancelId: 1,
          title: '更新已就绪',
          message: '更新已下载，是否立即安装重启？',
        });

        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      } catch (error) {
        console.error('[updater] prompt failed:', error && error.message ? error.message : error);
      }
    });

    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((error) => {
        console.error('[updater] check failed:', error && error.message ? error.message : error);
      });
    }, 3000);
  } catch (error) {
    console.error('[updater] init failed:', error && error.message ? error.message : error);
  }
}

module.exports = {
  initAutoUpdater,
};
