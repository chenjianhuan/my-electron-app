const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE_VERSION = 1;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const SCRYPT_LENGTH = 32;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLEL = 1;

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value) {
  return String(value == null ? '' : value).trim();
}

function toIsoDateTime(value) {
  if (!value) return nowIso();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return nowIso();
  }
  return date.toISOString();
}

function toFilterIsoDateTime(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }
  return date.toISOString();
}

function clampInteger(raw, min, max, fallback) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function csvEscape(value) {
  const text = String(value == null ? '' : value);
  if (/["\n,]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function sanitizeFileName(rawName, fallbackName) {
  const text = normalizeText(rawName);
  const safe = text
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return safe || fallbackName;
}

const DEFAULT_UI_SETTINGS = Object.freeze({
  chatView: {
    mode: 'chat',
    left: {
      name: '对方',
      avatar: '',
    },
    right: {
      name: '我',
      avatar: '',
    },
  },
  clipboard: {
    enabled: true,
    autoCommit: false,
  },
});

function formatDateKey(isoDateTime) {
  return String(isoDateTime || '').slice(0, 10);
}

function cloneDefaultUiSettings() {
  return {
    chatView: {
      mode: DEFAULT_UI_SETTINGS.chatView.mode,
      left: { ...DEFAULT_UI_SETTINGS.chatView.left },
      right: { ...DEFAULT_UI_SETTINGS.chatView.right },
    },
    clipboard: { ...DEFAULT_UI_SETTINGS.clipboard },
  };
}

function normalizeAvatar(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^data:image\//i.test(text) && text.length <= 800_000) {
    return text;
  }
  if (/^https?:\/\//i.test(text) && text.length <= 1024) {
    return text;
  }
  return '';
}

function normalizeUiSettings(rawSettings) {
  const base = cloneDefaultUiSettings();
  if (!rawSettings || typeof rawSettings !== 'object') return base;

  const rawChat = rawSettings.chatView && typeof rawSettings.chatView === 'object'
    ? rawSettings.chatView
    : {};
  const rawLeft = rawChat.left && typeof rawChat.left === 'object' ? rawChat.left : {};
  const rawRight = rawChat.right && typeof rawChat.right === 'object' ? rawChat.right : {};
  const rawClipboard = rawSettings.clipboard && typeof rawSettings.clipboard === 'object'
    ? rawSettings.clipboard
    : {};

  const mode = normalizeText(rawChat.mode).toLowerCase() === 'table' ? 'table' : 'chat';

  return {
    chatView: {
      mode,
      left: {
        name: normalizeText(rawLeft.name).slice(0, 20) || base.chatView.left.name,
        avatar: normalizeAvatar(rawLeft.avatar),
      },
      right: {
        name: normalizeText(rawRight.name).slice(0, 20) || base.chatView.right.name,
        avatar: normalizeAvatar(rawRight.avatar),
      },
    },
    clipboard: {
      enabled: rawClipboard.enabled !== false,
      autoCommit: rawClipboard.autoCommit === true,
    },
  };
}

function mergeUiSettings(currentSettings, patchSettings) {
  const current = normalizeUiSettings(currentSettings);
  if (!patchSettings || typeof patchSettings !== 'object') {
    return current;
  }

  const patch = normalizeUiSettings({
    ...current,
    ...patchSettings,
    chatView: {
      ...current.chatView,
      ...(patchSettings.chatView || {}),
      left: {
        ...current.chatView.left,
        ...((patchSettings.chatView && patchSettings.chatView.left) || {}),
      },
      right: {
        ...current.chatView.right,
        ...((patchSettings.chatView && patchSettings.chatView.right) || {}),
      },
    },
    clipboard: {
      ...current.clipboard,
      ...(patchSettings.clipboard || {}),
    },
  });

  return patch;
}

function createEmptyStore() {
  return {
    version: STORE_VERSION,
    sessions: [],
    messages: [],
    settings: cloneDefaultUiSettings(),
    meta: {
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  };
}

class WechatModel {
  constructor(app, options = {}) {
    this.filePath = path.join(app.getPath('userData'), 'wechat-records.enc.json');
    this.backupPath = path.join(app.getPath('userData'), 'wechat-records.backup.enc.json');
    this.getSecret = typeof options.getSecret === 'function' ? options.getSecret : () => '';
    this.ensureDirectoryExists();
  }

  ensureDirectoryExists() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  requireSecret() {
    const secret = normalizeText(this.getSecret());
    if (!secret) {
      throw new Error('当前未解锁微信模块，请返回密码页重新进入。');
    }
    return secret;
  }

  deriveKey(secret, saltBuffer) {
    return crypto.scryptSync(secret, saltBuffer, SCRYPT_LENGTH, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLEL,
      maxmem: 64 * 1024 * 1024,
    });
  }

  encryptStore(store, secret) {
    const payload = Buffer.from(JSON.stringify(store), 'utf8');
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = this.deriveKey(secret, salt);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      version: STORE_VERSION,
      encrypted: true,
      algorithm: ENCRYPTION_ALGORITHM,
      kdf: {
        name: 'scrypt',
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLEL,
      },
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      updatedAt: nowIso(),
    };
  }

  decryptStore(envelope, secret) {
    if (!envelope || typeof envelope !== 'object' || envelope.encrypted !== true) {
      throw new Error('微信数据文件格式无效');
    }
    const salt = Buffer.from(String(envelope.salt || ''), 'base64');
    const iv = Buffer.from(String(envelope.iv || ''), 'base64');
    const tag = Buffer.from(String(envelope.tag || ''), 'base64');
    const ciphertext = Buffer.from(String(envelope.ciphertext || ''), 'base64');
    const key = this.deriveKey(secret, salt);
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const raw = plaintext.toString('utf8');
    const parsed = JSON.parse(raw);
    return this.normalizeStore(parsed);
  }

  normalizeSession(rawSession) {
    if (!rawSession || typeof rawSession !== 'object') return null;
    const id = normalizeText(rawSession.id);
    if (!id) return null;
    const name = normalizeText(rawSession.name) || `会话 ${id.slice(-4)}`;
    const createdAt = toIsoDateTime(rawSession.createdAt);
    const updatedAt = toIsoDateTime(rawSession.updatedAt || createdAt);
    return {
      id,
      name,
      createdAt,
      updatedAt,
      messageCount: clampInteger(rawSession.messageCount, 0, Number.MAX_SAFE_INTEGER, 0),
      lastMessageAt: rawSession.lastMessageAt ? toIsoDateTime(rawSession.lastMessageAt) : '',
    };
  }

  normalizeMessage(rawMessage) {
    if (!rawMessage || typeof rawMessage !== 'object') return null;
    const id = normalizeText(rawMessage.id);
    const sessionId = normalizeText(rawMessage.sessionId);
    const content = normalizeText(rawMessage.content);
    if (!id || !sessionId || !content) return null;
    const sender = normalizeText(rawMessage.sender) || '未知';
    return {
      id,
      sessionId,
      timestamp: toIsoDateTime(rawMessage.timestamp),
      sender,
      content,
      type: normalizeText(rawMessage.type) || 'text',
      source: normalizeText(rawMessage.source) || 'manual',
      raw: normalizeText(rawMessage.raw) || content,
      createdAt: toIsoDateTime(rawMessage.createdAt || rawMessage.timestamp),
    };
  }

  normalizeStore(rawStore) {
    const base = createEmptyStore();
    if (!rawStore || typeof rawStore !== 'object') return base;

    const sessions = Array.isArray(rawStore.sessions) ? rawStore.sessions : [];
    const messages = Array.isArray(rawStore.messages) ? rawStore.messages : [];

    const normalizedSessions = sessions
      .map((item) => this.normalizeSession(item))
      .filter(Boolean);

    const normalizedMessages = messages
      .map((item) => this.normalizeMessage(item))
      .filter(Boolean);

    const sessionMap = new Map();
    normalizedSessions.forEach((session) => {
      sessionMap.set(session.id, { ...session, messageCount: 0, lastMessageAt: '' });
    });

    for (const message of normalizedMessages) {
      if (!sessionMap.has(message.sessionId)) continue;
      const current = sessionMap.get(message.sessionId);
      current.messageCount += 1;
      if (!current.lastMessageAt || message.timestamp > current.lastMessageAt) {
        current.lastMessageAt = message.timestamp;
      }
      if (message.createdAt > current.updatedAt) {
        current.updatedAt = message.createdAt;
      }
    }

    const sessionList = Array.from(sessionMap.values()).sort((a, b) => {
      const left = b.updatedAt.localeCompare(a.updatedAt);
      if (left !== 0) return left;
      return a.name.localeCompare(b.name, 'zh-CN');
    });

    return {
      version: STORE_VERSION,
      sessions: sessionList,
      messages: normalizedMessages,
      settings: normalizeUiSettings(rawStore.settings),
      meta: {
        createdAt: toIsoDateTime(rawStore.meta && rawStore.meta.createdAt),
        updatedAt: nowIso(),
      },
    };
  }

  loadStore() {
    const secret = this.requireSecret();
    if (!fs.existsSync(this.filePath)) {
      return createEmptyStore();
    }

    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const envelope = JSON.parse(raw);
      return this.decryptStore(envelope, secret);
    } catch (error) {
      try {
        if (fs.existsSync(this.backupPath)) {
          const backupRaw = fs.readFileSync(this.backupPath, 'utf8');
          const backupEnvelope = JSON.parse(backupRaw);
          return this.decryptStore(backupEnvelope, secret);
        }
      } catch (backupError) {
        // ignore backup failure and throw primary error below
      }
      throw new Error(`微信数据读取失败：${error.message}`);
    }
  }

  saveStore(store) {
    const secret = this.requireSecret();
    const normalizedStore = this.normalizeStore(store);
    normalizedStore.meta.updatedAt = nowIso();
    const envelope = this.encryptStore(normalizedStore, secret);

    if (fs.existsSync(this.filePath)) {
      try {
        fs.copyFileSync(this.filePath, this.backupPath);
      } catch (error) {
        // ignore backup copy failures
      }
    }

    fs.writeFileSync(this.filePath, JSON.stringify(envelope, null, 2), 'utf8');
    return normalizedStore;
  }

  createSession(rawName) {
    const name = normalizeText(rawName);
    if (!name) {
      throw new Error('会话名称不能为空');
    }

    const store = this.loadStore();
    const duplicated = store.sessions.find((item) => item.name === name);
    if (duplicated) {
      return duplicated;
    }

    const createdAt = nowIso();
    const session = {
      id: `session_${crypto.randomUUID()}`,
      name,
      createdAt,
      updatedAt: createdAt,
      messageCount: 0,
      lastMessageAt: '',
    };

    store.sessions.push(session);
    this.saveStore(store);
    return session;
  }

  listSessions() {
    const store = this.loadStore();
    return store.sessions.slice();
  }

  getUiSettings() {
    const store = this.loadStore();
    return normalizeUiSettings(store.settings);
  }

  updateUiSettings(payload = {}) {
    const store = this.loadStore();
    store.settings = mergeUiSettings(store.settings, payload);
    const saved = this.saveStore(store);
    return normalizeUiSettings(saved.settings);
  }

  queryMessages(filters = {}) {
    const store = this.loadStore();
    let items = store.messages.slice();

    const sessionId = normalizeText(filters.sessionId);
    if (sessionId) {
      items = items.filter((item) => item.sessionId === sessionId);
    }

    const startAt = toFilterIsoDateTime(filters.startAt);
    if (startAt) {
      items = items.filter((item) => item.timestamp >= startAt);
    }

    const endAt = toFilterIsoDateTime(filters.endAt);
    if (endAt) {
      items = items.filter((item) => item.timestamp <= endAt);
    }

    items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return { store, items };
  }

  listMessages(filters = {}) {
    const { items } = this.queryMessages(filters);
    const offset = clampInteger(filters.offset, 0, Number.MAX_SAFE_INTEGER, 0);
    const limit = clampInteger(filters.limit, 1, 1000, 200);
    return {
      total: items.length,
      items: items.slice(offset, offset + limit),
    };
  }

  addMessages(payload = {}) {
    const sessionId = normalizeText(payload.sessionId);
    if (!sessionId) {
      throw new Error('请选择会话');
    }
    const rawMessages = Array.isArray(payload.messages) ? payload.messages : [];
    if (rawMessages.length === 0) {
      throw new Error('没有可保存的消息');
    }

    const store = this.loadStore();
    const session = store.sessions.find((item) => item.id === sessionId);
    if (!session) {
      throw new Error('会话不存在，请重新选择');
    }

    let insertedCount = 0;
    let lastTimestamp = session.lastMessageAt || '';
    const now = nowIso();

    for (const rawItem of rawMessages) {
      const content = normalizeText(rawItem && rawItem.content);
      if (!content) continue;
      const message = this.normalizeMessage({
        id: `msg_${crypto.randomUUID()}`,
        sessionId,
        timestamp: toIsoDateTime(rawItem && rawItem.timestamp),
        sender: normalizeText(rawItem && rawItem.sender) || '未知',
        content,
        type: normalizeText(rawItem && rawItem.type) || 'text',
        source: normalizeText(rawItem && rawItem.source) || 'manual',
        raw: normalizeText(rawItem && rawItem.raw) || content,
        createdAt: now,
      });
      if (!message) continue;
      store.messages.push(message);
      insertedCount += 1;
      if (!lastTimestamp || message.timestamp > lastTimestamp) {
        lastTimestamp = message.timestamp;
      }
    }

    if (insertedCount <= 0) {
      throw new Error('没有有效消息可入库');
    }

    session.messageCount += insertedCount;
    session.lastMessageAt = lastTimestamp;
    session.updatedAt = now;
    this.saveStore(store);

    return {
      insertedCount,
      session: { ...session },
    };
  }

  updateMessage(payload = {}) {
    const messageId = normalizeText(payload.messageId);
    if (!messageId) {
      throw new Error('消息ID不能为空');
    }

    const store = this.loadStore();
    const messageIndex = store.messages.findIndex((item) => item.id === messageId);
    if (messageIndex < 0) {
      throw new Error('消息不存在，可能已被删除');
    }

    const current = store.messages[messageIndex];
    const nextRaw = {
      ...current,
      sender: normalizeText(payload.sender) || current.sender,
      content: normalizeText(payload.content) || current.content,
      timestamp: payload.timestamp ? toIsoDateTime(payload.timestamp) : current.timestamp,
      raw: normalizeText(payload.raw) || normalizeText(payload.content) || current.raw,
      updatedAt: nowIso(),
    };

    const next = this.normalizeMessage(nextRaw);
    if (!next) {
      throw new Error('消息更新后格式无效');
    }

    store.messages[messageIndex] = next;
    this.saveStore(store);
    return next;
  }

  deleteMessage(payload = {}) {
    const messageId = normalizeText(payload.messageId);
    if (!messageId) {
      throw new Error('消息ID不能为空');
    }

    const store = this.loadStore();
    const messageIndex = store.messages.findIndex((item) => item.id === messageId);
    if (messageIndex < 0) {
      throw new Error('消息不存在，可能已被删除');
    }

    const removed = store.messages.splice(messageIndex, 1)[0];
    this.saveStore(store);
    return removed;
  }

  extractKeywords(text) {
    const normalized = normalizeText(text).toLowerCase();
    if (!normalized) return [];
    const zhChunks = normalized.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    const alphaChunks = normalized.match(/[a-z0-9_]{2,}/g) || [];
    return zhChunks.concat(alphaChunks);
  }

  buildStats(filters = {}) {
    const { items } = this.queryMessages(filters);
    const senderCountMap = new Map();
    const dateCountMap = new Map();
    const keywordMap = new Map();
    const daySet = new Set();
    const senderSet = new Set();
    const stopWords = new Set(['我们', '你们', '他们', '这个', '那个', '然后', '就是', '一下']);

    for (const item of items) {
      const sender = normalizeText(item.sender) || '未知';
      senderSet.add(sender);
      senderCountMap.set(sender, (senderCountMap.get(sender) || 0) + 1);

      const dateKey = formatDateKey(item.timestamp);
      if (dateKey) {
        daySet.add(dateKey);
        dateCountMap.set(dateKey, (dateCountMap.get(dateKey) || 0) + 1);
      }

      for (const token of this.extractKeywords(item.content)) {
        if (stopWords.has(token)) continue;
        keywordMap.set(token, (keywordMap.get(token) || 0) + 1);
      }
    }

    const totalMessages = items.length;
    const totalSenders = senderSet.size;
    const activeDays = daySet.size;
    const avgPerDay = activeDays > 0 ? Number((totalMessages / activeDays).toFixed(2)) : 0;

    const dailyTrend = Array.from(dateCountMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const senderTop = Array.from(senderCountMap.entries())
      .map(([sender, count]) => ({ sender, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const keywordTop = Array.from(keywordMap.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      totalMessages,
      totalSenders,
      activeDays,
      averageDailyMessages: avgPerDay,
      dailyTrend,
      senderTop,
      keywordTop,
    };
  }

  getSecurityStatus() {
    const hasSecret = Boolean(normalizeText(this.getSecret()));
    const storeExists = fs.existsSync(this.filePath);
    const backupExists = fs.existsSync(this.backupPath);
    let fileSizeBytes = 0;
    let fileUpdatedAt = '';
    let sessionCount = 0;
    let messageCount = 0;
    let canDecrypt = false;
    let decryptError = '';

    if (storeExists) {
      try {
        const stat = fs.statSync(this.filePath);
        fileSizeBytes = Number(stat.size) || 0;
        fileUpdatedAt = stat.mtime ? stat.mtime.toISOString() : '';
      } catch (error) {
        // ignore stat errors
      }
    }

    if (hasSecret && storeExists) {
      try {
        const store = this.loadStore();
        sessionCount = store.sessions.length;
        messageCount = store.messages.length;
        canDecrypt = true;
      } catch (error) {
        decryptError = error.message || '解密失败';
      }
    }

    return {
      encrypted: true,
      algorithm: ENCRYPTION_ALGORITHM,
      kdf: {
        name: 'scrypt',
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLEL,
      },
      hasSecret,
      canDecrypt,
      decryptError,
      storeExists,
      backupExists,
      filePath: this.filePath,
      backupPath: this.backupPath,
      fileSizeBytes,
      fileUpdatedAt,
      sessionCount,
      messageCount,
    };
  }

  clearAllData(payload = {}) {
    const confirmToken = normalizeText(payload.confirmToken);
    if (confirmToken !== 'DELETE_WECHAT_DATA') {
      throw new Error('确认口令不匹配，已取消清空操作');
    }

    this.requireSecret();

    if (fs.existsSync(this.filePath)) {
      fs.unlinkSync(this.filePath);
    }
    if (fs.existsSync(this.backupPath)) {
      fs.unlinkSync(this.backupPath);
    }

    const empty = createEmptyStore();
    this.saveStore(empty);
    return {
      cleared: true,
      sessionCount: 0,
      messageCount: 0,
      updatedAt: nowIso(),
    };
  }

  buildCsv(filters = {}) {
    const { store, items } = this.queryMessages(filters);
    const fields = Array.isArray(filters.fields) && filters.fields.length > 0
      ? filters.fields.filter((item) => typeof item === 'string')
      : ['timestamp', 'sender', 'content', 'sessionName', 'source'];

    const sessionMap = new Map(store.sessions.map((session) => [session.id, session]));
    const header = fields.join(',');
    const lines = [header];

    for (const item of items.slice().reverse()) {
      const session = sessionMap.get(item.sessionId);
      const row = fields.map((field) => {
        if (field === 'sessionName') {
          return csvEscape(session ? session.name : '');
        }
        if (field === 'keywordTags') {
          const tags = this.extractKeywords(item.content || '').slice(0, 20).join('|');
          return csvEscape(tags);
        }
        return csvEscape(item[field]);
      });
      lines.push(row.join(','));
    }

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
    const defaultFileName = `wechat_export_${timestamp}.csv`;
    const requestedFileName = sanitizeFileName(filters.fileName, defaultFileName.replace(/\.csv$/i, ''));
    const fileName = requestedFileName.toLowerCase().endsWith('.csv')
      ? requestedFileName
      : `${requestedFileName}.csv`;

    return {
      rowCount: items.length,
      fileName,
      csv: `${lines.join('\n')}\n`,
    };
  }
}

module.exports = WechatModel;
