// src/controllers/MainController.js
const { ipcMain, dialog, app: electronApp } = require('electron');
const fs = require('fs');
const path = require('path');
const UserModel = require('../models/userModel');
const OcrService = require('../services/OcrService');
const AiSemanticService = require('../services/AiSemanticService');
const VoiceInputService = require('../services/VoiceInputService');
const WechatModel = require('../models/wechatModel');

function sanitizeExportBaseName(rawName, fallbackName) {
  const text = String(rawName || '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 80);
  return text || fallbackName;
}

class MainController {
  constructor(app, options = {}) {
    this.userModel = new UserModel(app);
    this.ocrService = new OcrService(app);
    this.aiSemanticService = new AiSemanticService(app);
    this.voiceInputService = new VoiceInputService(app);
    this.wechatModel = new WechatModel(app, {
      getSecret: typeof options.getWechatSecret === 'function' ? options.getWechatSecret : () => '',
    });

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
        this.userModel.saveAttributeConfig(config || {
          overrides: {},
          hidden: [],
          anchorAliases: {},
          globalRules: {},
          clientRules: {}
        });
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
        event.reply('attribute-config-loaded', {
          overrides: {},
          hidden: [],
          anchorAliases: {},
          globalRules: {},
          clientRules: {}
        });
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

    ipcMain.handle('ai:get-semantic-status', async (_event, payload) => {
      try {
        return await this.aiSemanticService.getStatus(payload || {});
      } catch (error) {
        return {
          ok: false,
          available: false,
          reason: 'status_failed',
          message: error.message || '读取本地 AI 状态失败',
        };
      }
    });

    ipcMain.handle('ai:rewrite-message', async (_event, payload) => {
      try {
        let safePayload = payload || {};
        if (typeof payload === 'string') {
          try {
            safePayload = JSON.parse(decodeURIComponent(payload));
          } catch (error) {
            safePayload = {};
          }
        }
        return await this.aiSemanticService.rewriteMessage(safePayload || {});
      } catch (error) {
        return {
          ok: false,
          available: false,
          reason: 'rewrite_failed',
          message: error.message || '本地 AI 语义修正失败',
        };
      }
    });

    ipcMain.handle('voice:get-status', async (_event, payload) => {
      try {
        return await this.voiceInputService.getStatus(payload || {});
      } catch (error) {
        return {
          ok: false,
          available: false,
          reason: 'status_failed',
          message: error.message || '读取本地语音状态失败',
        };
      }
    });

    ipcMain.handle('voice:transcribe-audio', async (_event, payload) => {
      try {
        return await this.voiceInputService.transcribeAudio(payload || {});
      } catch (error) {
        return {
          ok: false,
          available: false,
          reason: 'transcribe_failed',
          message: error.message || '本地语音转写失败',
        };
      }
    });

    ipcMain.handle('wechat:get-bootstrap', async () => {
      try {
        const sessions = this.wechatModel.listSessions();
        const currentSessionId = sessions[0] ? sessions[0].id : '';
        const stats = this.wechatModel.buildStats(currentSessionId ? { sessionId: currentSessionId } : {});
        const settings = this.wechatModel.getUiSettings();
        return { ok: true, sessions, currentSessionId, stats, settings };
      } catch (error) {
        return { ok: false, reason: error.message || '加载微信模块数据失败' };
      }
    });

    ipcMain.handle('wechat:list-sessions', async () => {
      try {
        const sessions = this.wechatModel.listSessions();
        return { ok: true, sessions };
      } catch (error) {
        return { ok: false, reason: error.message || '加载会话失败' };
      }
    });

    ipcMain.handle('wechat:create-session', async (_event, payload) => {
      try {
        const session = this.wechatModel.createSession(payload && payload.name);
        const sessions = this.wechatModel.listSessions();
        return { ok: true, session, sessions };
      } catch (error) {
        return { ok: false, reason: error.message || '创建会话失败' };
      }
    });

    ipcMain.handle('wechat:list-messages', async (_event, payload) => {
      try {
        const result = this.wechatModel.listMessages(payload || {});
        return { ok: true, ...result };
      } catch (error) {
        return { ok: false, reason: error.message || '加载消息失败' };
      }
    });

    ipcMain.handle('wechat:add-messages', async (_event, payload) => {
      try {
        const result = this.wechatModel.addMessages(payload || {});
        const sessions = this.wechatModel.listSessions();
        const stats = this.wechatModel.buildStats({ sessionId: payload && payload.sessionId });
        return { ok: true, ...result, sessions, stats };
      } catch (error) {
        return { ok: false, reason: error.message || '保存消息失败' };
      }
    });

    ipcMain.handle('wechat:update-message', async (_event, payload) => {
      try {
        const message = this.wechatModel.updateMessage(payload || {});
        const sessions = this.wechatModel.listSessions();
        const stats = this.wechatModel.buildStats({
          sessionId: message.sessionId,
          startAt: payload && payload.startAt,
          endAt: payload && payload.endAt,
        });
        return { ok: true, message, sessions, stats };
      } catch (error) {
        return { ok: false, reason: error.message || '更新消息失败' };
      }
    });

    ipcMain.handle('wechat:delete-message', async (_event, payload) => {
      try {
        const removed = this.wechatModel.deleteMessage(payload || {});
        const sessions = this.wechatModel.listSessions();
        const stats = this.wechatModel.buildStats({
          sessionId: removed.sessionId,
          startAt: payload && payload.startAt,
          endAt: payload && payload.endAt,
        });
        return { ok: true, removed, sessions, stats };
      } catch (error) {
        return { ok: false, reason: error.message || '删除消息失败' };
      }
    });

    ipcMain.handle('wechat:get-stats', async (_event, payload) => {
      try {
        const stats = this.wechatModel.buildStats(payload || {});
        return { ok: true, stats };
      } catch (error) {
        return { ok: false, reason: error.message || '获取统计失败' };
      }
    });

    ipcMain.handle('wechat:get-security-status', async () => {
      try {
        const security = this.wechatModel.getSecurityStatus();
        return { ok: true, security };
      } catch (error) {
        return { ok: false, reason: error.message || '读取安全状态失败' };
      }
    });

    ipcMain.handle('wechat:get-ui-settings', async () => {
      try {
        const settings = this.wechatModel.getUiSettings();
        return { ok: true, settings };
      } catch (error) {
        return { ok: false, reason: error.message || '读取界面设置失败' };
      }
    });

    ipcMain.handle('wechat:update-ui-settings', async (_event, payload) => {
      try {
        const settings = this.wechatModel.updateUiSettings(payload || {});
        return { ok: true, settings };
      } catch (error) {
        return { ok: false, reason: error.message || '保存界面设置失败' };
      }
    });

    ipcMain.handle('wechat:clear-all-data', async (_event, payload) => {
      try {
        const result = this.wechatModel.clearAllData(payload || {});
        const sessions = this.wechatModel.listSessions();
        const stats = this.wechatModel.buildStats({});
        const settings = this.wechatModel.getUiSettings();
        return { ok: true, result, sessions, stats, settings };
      } catch (error) {
        return { ok: false, reason: error.message || '清空数据失败' };
      }
    });

    ipcMain.handle('wechat:export-csv', async (_event, payload) => {
      try {
        const exportResult = this.wechatModel.buildCsv(payload || {});
        if (exportResult.rowCount <= 0) {
          return { ok: false, reason: '当前筛选条件下没有可导出的数据' };
        }

        const defaultName = exportResult.fileName || 'wechat_export.csv';
        const defaultDir = electronApp && typeof electronApp.getPath === 'function'
          ? electronApp.getPath('documents')
          : process.cwd();
        const saveResult = await dialog.showSaveDialog({
          title: '导出微信聊天记录 CSV',
          defaultPath: path.join(defaultDir, defaultName),
          filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
        });

        if (saveResult.canceled || !saveResult.filePath) {
          return { ok: false, canceled: true, reason: '已取消导出' };
        }

        fs.writeFileSync(saveResult.filePath, exportResult.csv, 'utf8');
        return {
          ok: true,
          filePath: saveResult.filePath,
          rowCount: exportResult.rowCount,
        };
      } catch (error) {
        return { ok: false, reason: error.message || '导出失败' };
      }
    });

    ipcMain.handle('lottery:export-document', async (_event, payload) => {
      try {
        const format = payload && payload.format === 'word' ? 'word' : 'excel';
        const extension = format === 'word' ? 'doc' : 'xls';
        const documentContent = payload && typeof payload.content === 'string'
          ? payload.content
          : '';
        if (!documentContent.trim()) {
          return { ok: false, reason: '导出内容为空' };
        }

        const contentBytes = Buffer.byteLength(documentContent, 'utf8');
        if (contentBytes > 20 * 1024 * 1024) {
          return { ok: false, reason: '导出内容过大，请缩小范围后重试' };
        }

        const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
        const fallbackBase = `lottery_export_${timestamp}`;
        const requestedName = payload && typeof payload.fileName === 'string' ? payload.fileName : '';
        const baseName = sanitizeExportBaseName(requestedName, fallbackBase);
        const fileName = baseName.toLowerCase().endsWith(`.${extension}`)
          ? baseName
          : `${baseName}.${extension}`;

        const defaultDir = electronApp && typeof electronApp.getPath === 'function'
          ? electronApp.getPath('documents')
          : process.cwd();
        const saveResult = await dialog.showSaveDialog({
          title: format === 'word' ? '导出统计 Word' : '导出统计 Excel',
          defaultPath: path.join(defaultDir, fileName),
          filters: [
            {
              name: format === 'word' ? 'Word 文档' : 'Excel 工作簿',
              extensions: [extension],
            },
          ],
        });

        if (saveResult.canceled || !saveResult.filePath) {
          return { ok: false, canceled: true, reason: '已取消导出' };
        }

        fs.writeFileSync(saveResult.filePath, documentContent, 'utf8');
        return {
          ok: true,
          filePath: saveResult.filePath,
          bytes: contentBytes,
        };
      } catch (error) {
        return { ok: false, reason: error.message || '导出失败' };
      }
    });

    ipcMain.handle('lottery:clear-all-users-by-password', async (_event, payload) => {
      try {
        const rawPassword = payload && payload.password ? String(payload.password) : '';
        const password = rawPassword.trim();
        if (password !== '110') {
          return { ok: false, reason: 'invalid' };
        }

        const cleared = this.userModel.clearAllData();
        return cleared
          ? { ok: true, reason: 'ok' }
          : { ok: false, reason: 'failed' };
      } catch (error) {
        return { ok: false, reason: 'failed' };
      }
    });
  }
}

module.exports = MainController;
