const fs = require('fs');
const path = require('path');

class PerfLogger {
  constructor(app, options = {}) {
    this.app = app;
    this.logDir = path.join(app.getPath('userData'), 'perf-logs');
    this.flushDelayMs = Number.isFinite(options.flushDelayMs) ? options.flushDelayMs : 1200;
    this.maxBufferSize = Number.isFinite(options.maxBufferSize) ? options.maxBufferSize : 60;
    this.sessionId = `${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
    this.sequence = 0;
    this.buffer = [];
    this.flushTimer = null;
    this.flushInFlight = false;
    this.logDirReady = false;
  }

  ensureLogDir() {
    if (this.logDirReady) return;
    fs.mkdirSync(this.logDir, { recursive: true });
    this.logDirReady = true;
    this.pruneOldLogs();
  }

  getLogFilePath(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return path.join(this.logDir, `perf-${year}-${month}-${day}.jsonl`);
  }

  pruneOldLogs(date = new Date()) {
    let keepName = '';
    try {
      keepName = path.basename(this.getLogFilePath(date));
    } catch (error) {
      keepName = '';
    }

    try {
      const entries = fs.readdirSync(this.logDir);
      entries.forEach((name) => {
        if (!/^perf-\d{4}-\d{2}-\d{2}\.jsonl$/.test(name)) {
          return;
        }
        if (name === keepName) {
          return;
        }
        try {
          fs.unlinkSync(path.join(this.logDir, name));
        } catch (error) {
          // ignore individual file cleanup failures
        }
      });
    } catch (error) {
      // ignore cleanup failures
    }
  }

  summarize(value, depth = 0) {
    if (value == null) return null;
    if (depth >= 2) {
      if (Array.isArray(value)) return { type: 'array', length: value.length };
      if (typeof value === 'object') return { type: 'object', keys: Object.keys(value).slice(0, 12) };
      if (typeof value === 'string') return { type: 'string', length: value.length };
      return value;
    }

    const valueType = typeof value;
    if (valueType === 'string') {
      return { type: 'string', length: value.length };
    }
    if (valueType === 'number' || valueType === 'boolean') {
      return value;
    }
    if (value instanceof Error) {
      return {
        type: 'error',
        name: String(value.name || 'Error'),
        message: String(value.message || ''),
      };
    }
    if (Array.isArray(value)) {
      return {
        type: 'array',
        length: value.length,
        sample: value.slice(0, 6).map((item) => this.summarize(item, depth + 1)),
      };
    }
    if (valueType === 'object') {
      const keys = Object.keys(value);
      const summary = {};
      keys.slice(0, 16).forEach((key) => {
        const current = value[key];
        if (current == null) {
          summary[key] = current;
          return;
        }
        if (typeof current === 'number' || typeof current === 'boolean') {
          summary[key] = current;
          return;
        }
        if (typeof current === 'string') {
          summary[key] = {
            type: 'string',
            length: current.length,
          };
          return;
        }
        if (Array.isArray(current)) {
          summary[key] = {
            type: 'array',
            length: current.length,
          };
          return;
        }
        if (current instanceof Error) {
          summary[key] = {
            type: 'error',
            name: String(current.name || 'Error'),
            message: String(current.message || ''),
          };
          return;
        }
        summary[key] = {
          type: 'object',
          keys: Object.keys(current).slice(0, 12),
        };
      });
      if (keys.length > 16) {
        summary.__truncatedKeys = keys.length - 16;
      }
      return summary;
    }
    return String(value);
  }

  buildEntry(type, payload = {}) {
    const now = new Date();
    return {
      ts: now.toISOString(),
      pid: process.pid,
      processType: 'main',
      sessionId: this.sessionId,
      seq: ++this.sequence,
      type: String(type || 'perf'),
      payload: this.summarize(payload),
    };
  }

  log(type, payload = {}) {
    this.buffer.push(this.buildEntry(type, payload));
    if (this.buffer.length >= this.maxBufferSize) {
      this.scheduleFlush(true);
      return;
    }
    this.scheduleFlush(false);
  }

  scheduleFlush(force) {
    if (force) {
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
      void this.flush();
      return;
    }
    if (this.flushTimer || this.flushInFlight) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, this.flushDelayMs);
  }

  async flush() {
    if (this.flushInFlight) return;
    if (!this.buffer.length) return;

    this.flushInFlight = true;
    const entries = this.buffer.splice(0, this.buffer.length);
    const now = new Date();
    this.ensureLogDir();
    this.pruneOldLogs(now);
    const filePath = this.getLogFilePath(now);
    const text = `${entries.map((item) => JSON.stringify(item)).join('\n')}\n`;

    try {
      await fs.promises.appendFile(filePath, text, 'utf8');
    } catch (error) {
      console.error('写入性能日志失败:', error);
    } finally {
      this.flushInFlight = false;
      if (this.buffer.length) {
        this.scheduleFlush(false);
      }
    }
  }

  flushSync() {
    if (!this.buffer.length) return;
    const entries = this.buffer.splice(0, this.buffer.length);
    const now = new Date();
    this.ensureLogDir();
    this.pruneOldLogs(now);
    const filePath = this.getLogFilePath(now);
    const text = `${entries.map((item) => JSON.stringify(item)).join('\n')}\n`;

    try {
      fs.appendFileSync(filePath, text, 'utf8');
    } catch (error) {
      console.error('同步写入性能日志失败:', error);
    }
  }

  listLogFiles(limit = 7) {
    try {
      this.ensureLogDir();
      return fs.readdirSync(this.logDir)
        .filter((name) => /^perf-\d{4}-\d{2}-\d{2}\.jsonl$/.test(name))
        .sort()
        .slice(-Math.max(1, Number(limit) || 1))
        .map((name) => path.join(this.logDir, name));
    } catch (error) {
      return [];
    }
  }

  readEntriesFromFile(filePath) {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      return String(text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch (error) {
            return null;
          }
        })
        .filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  getRecentEntries(options = {}) {
    const sessionId = String(options.sessionId || this.sessionId || '');
    const maxEntries = Math.max(1, Number(options.maxEntries) || 2000);
    const files = this.listLogFiles(options.fileLimit || 7).reverse();
    const matched = [];

    files.forEach((filePath) => {
      if (matched.length >= maxEntries) return;
      const entries = this.readEntriesFromFile(filePath);
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        const entry = entries[index];
        if (sessionId && String(entry && entry.sessionId || '') !== sessionId) {
          continue;
        }
        matched.push(entry);
        if (matched.length >= maxEntries) {
          break;
        }
      }
    });

    return matched.reverse();
  }

  getInfo() {
    return {
      sessionId: this.sessionId,
      logDir: this.logDir,
      currentFile: this.getLogFilePath(),
    };
  }
}

module.exports = {
  PerfLogger,
};
