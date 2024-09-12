// src/controllers/MainController.js
const { ipcMain } = require('electron');
const UserModel = require('../models/UserModel');

class MainController {
  constructor(app) {
    this.userModel = new UserModel(app);

    // 监听从渲染进程发来的数据保存请求
    ipcMain.on('save-user-data', (event, userData) => {
      console.log('Saving user data...', userData);
      this.userModel.saveUserData(userData);
    });

    // 监听从渲染进程发来的数据加载请求
    ipcMain.on('load-user-data', (event) => {
      console.log('Loading user data...');
      const userData = this.userModel.loadUserData();
      event.reply('user-data-loaded', userData);
      console.log('User data loaded:', userData);
    });
  }
}

module.exports = MainController;
