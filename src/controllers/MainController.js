// src/controllers/MainController.js
const { ipcMain } = require('electron');
const UserModel = require('../models/userModel');
const OcrService = require('../services/OcrService');

class MainController {
  constructor(app) {
    this.userModel = new UserModel(app);
    this.ocrService = new OcrService(app);

    // 监听从渲染进程发来的数据保存请求
    ipcMain.on('save-user-data', (event, userData) => {
      try {
        console.log('Saving user data...', userData);
        this.userModel.saveUserData(userData);
        event.reply('save-success');
      } catch (error) {
        console.error('Failed to save user data:', error);
        event.reply('save-error', { message: error.message });
      }
    });

    // 监听从渲染进程发来的数据加载请求
    ipcMain.on('load-user-data', (event) => {
      console.log('Loading user data...');
      const userData = this.userModel.loadUserData();
      event.reply('user-data-loaded', userData);
      console.log('User data loaded:', userData);
    });

    // 监听自定义属性保存
    ipcMain.on('save-custom-attributes', (event, customMap) => {
      try {
        this.userModel.saveCustomAttributes(customMap || {});
        event.reply('custom-attributes-save-success');
      } catch (error) {
        event.reply('custom-attributes-save-error', { message: error.message });
      }
    });

    // 监听自定义属性加载
    ipcMain.on('load-custom-attributes', (event) => {
      try {
        const customMap = this.userModel.loadCustomAttributes();
        event.reply('custom-attributes-loaded', customMap);
      } catch (error) {
        event.reply('custom-attributes-loaded', {});
      }
    });

    // 监听属性布局保存
    ipcMain.on('save-attribute-layout', (event, layout) => {
      try {
        this.userModel.saveAttributeLayout(layout || {});
        event.reply('attribute-layout-save-success');
      } catch (error) {
        event.reply('attribute-layout-save-error', { message: error.message });
      }
    });

    // 监听属性布局加载
    ipcMain.on('load-attribute-layout', (event) => {
      try {
        const layout = this.userModel.loadAttributeLayout();
        event.reply('attribute-layout-loaded', layout);
      } catch (error) {
        event.reply('attribute-layout-loaded', {});
      }
    });

    // 监听属性配置（覆盖/隐藏）保存
    ipcMain.on('save-attribute-config', (event, config) => {
      try {
        this.userModel.saveAttributeConfig(config || { overrides: {}, hidden: [] });
        event.reply('attribute-config-save-success');
      } catch (error) {
        event.reply('attribute-config-save-error', { message: error.message });
      }
    });

    // 监听属性配置加载
    ipcMain.on('load-attribute-config', (event) => {
      try {
        const config = this.userModel.loadAttributeConfig();
        event.reply('attribute-config-loaded', config);
      } catch (error) {
        event.reply('attribute-config-loaded', { overrides: {}, hidden: [] });
      }
    });

    ipcMain.handle('ocr:recognize-image', async (_event, payload) => {
      try {
        return await this.ocrService.recognizeImage(payload || {});
      } catch (error) {
        return {
          success: false,
          source: 'none',
          message: error.message || 'OCR识别失败',
        };
      }
    });
  }
}

module.exports = MainController;
