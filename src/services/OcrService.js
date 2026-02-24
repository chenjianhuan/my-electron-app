const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');

class OcrService {
  constructor(app) {
    this.app = app;
    this.cachedSharp = undefined;
  }

  async recognizeImage(payload = {}) {
    const startedAt = Date.now();
    const filesToCleanup = [];
    try {
      const resolved = await this.resolveImagePath(payload);
      const imagePath = resolved.imagePath;
      if (resolved.tempFiles && resolved.tempFiles.length) {
        filesToCleanup.push(...resolved.tempFiles);
      }

      const imageBuffer = fs.readFileSync(imagePath);
      const preprocess = await this.preprocessImage(imageBuffer);
      if (preprocess && preprocess.tempFiles && preprocess.tempFiles.length) {
        filesToCleanup.push(...preprocess.tempFiles);
      }

      const local = await this.tryLocalTesseractSmart(preprocess.candidateImages);
      const normalizedLocalText = local.text ? this.normalizeOcrText(local.text) : '';
      const localScore = this.scoreNormalizedText(normalizedLocalText);

      const allowOnline = payload.preferOnline === true || payload.allowOnlineFallback === true;
      const shouldTryOnline = allowOnline && localScore < 38;

      if (shouldTryOnline) {
          const online = await this.tryOnlineOcr(imageBuffer);
          if (online.success && online.text) {
            const normalizedOnlineText = this.normalizeOcrText(online.text);
            const onlineScore = this.scoreNormalizedText(normalizedOnlineText);
          if (onlineScore >= localScore) {
            return {
              success: true,
              source: 'online',
              text: normalizedOnlineText,
              score: onlineScore,
              elapsedMs: Date.now() - startedAt,
            };
          }
        }
      }

      if (local.success && normalizedLocalText) {
        return {
          success: true,
          source: preprocess.usedPreprocess ? 'offline-preprocessed' : 'offline',
          text: normalizedLocalText,
          score: localScore,
          elapsedMs: Date.now() - startedAt,
        };
      }

      return {
        success: false,
        source: 'none',
        message: local.message || '图片识别失败',
        elapsedMs: Date.now() - startedAt,
      };
    } finally {
      filesToCleanup.forEach((filePath) => {
        try {
          if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          // ignore cleanup failure
        }
      });
    }
  }

  async resolveImagePath(payload) {
    if (payload.filePath && fs.existsSync(payload.filePath)) {
      return { imagePath: payload.filePath, tempFiles: [] };
    }

    if (payload.dataUrl && payload.dataUrl.startsWith('data:image/')) {
      const [header, body] = payload.dataUrl.split(',');
      const extMatch = header.match(/^data:image\/([a-zA-Z0-9+]+);base64$/);
      const ext = extMatch ? extMatch[1].replace('+xml', '').replace('+', '') : 'png';
      const buffer = Buffer.from(body || '', 'base64');
      const tempPath = path.join(os.tmpdir(), `messagecounter-ocr-${Date.now()}.${ext}`);
      fs.writeFileSync(tempPath, buffer);
      return { imagePath: tempPath, tempFiles: [tempPath] };
    }

    throw new Error('未提供可识别的图片');
  }

  async preprocessImage(imageBuffer) {
    const sharp = this.getSharp();
    if (!sharp) {
      return {
        usedPreprocess: false,
        candidateImages: [imageBuffer],
        tempFiles: [],
      };
    }

    try {
      const base = sharp(imageBuffer).rotate();
      const meta = await base.metadata();
      let working = base;
      if (meta && meta.width && meta.width > 1600) {
        working = working.resize({ width: 1600, fit: 'inside', withoutEnlargement: true });
      }

      const original = await working
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

      const grayEnhanced = await working
        .grayscale()
        .normalize()
        .sharpen({ sigma: 1.1, m1: 0.9, m2: 2.0, x1: 2.0, y2: 10.0, y3: 20.0 })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

      const highContrast = await working
        .grayscale()
        .normalize()
        .linear(1.6, -40)
        .threshold(155, { grayscale: true })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

      return {
        usedPreprocess: true,
        candidateImages: [highContrast, grayEnhanced, original],
        tempFiles: [],
      };
    } catch (error) {
      return {
        usedPreprocess: false,
        candidateImages: [imageBuffer],
        tempFiles: [],
      };
    }
  }

  getSharp() {
    if (this.cachedSharp !== undefined) return this.cachedSharp;
    try {
      this.cachedSharp = require('sharp');
    } catch (error) {
      this.cachedSharp = null;
    }
    return this.cachedSharp;
  }

  async tryLocalTesseractSmart(candidateImages) {
    let tesseract;
    try {
      tesseract = require('tesseract.js');
    } catch (error) {
      return {
        success: false,
        message: 'OCR核心未打包（缺少 tesseract.js）',
      };
    }

    const langPath = this.resolveTessDataPath();
    const configs = [
      {
        psm: '6',
        whitelist: '0123456789各.:：~～新老奥香港澳',
      },
      {
        psm: '11',
      },
      {
        psm: '12',
      },
    ];

    const attempts = [];
    for (const imageInput of candidateImages) {
      for (const config of configs) {
        const result = await this.runTesseractWithJs(tesseract, imageInput, config, langPath);
        if (result.success && result.text) {
          const normalized = this.normalizeOcrText(result.text);
          const score = this.scoreNormalizedText(normalized);
          attempts.push({
            success: true,
            text: result.text,
            normalized,
            score,
            imagePath: '[buffer]',
            config,
          });
          if (score >= 65) {
            return {
              success: true,
              text: normalized,
              score,
            };
          }
        } else {
          attempts.push({ success: false, message: result.message, imagePath: '[buffer]', config });
        }
      }
    }

    const best = attempts
      .filter(item => item.success)
      .sort((a, b) => b.score - a.score)[0];

    if (best) {
      return {
        success: true,
        text: best.normalized,
        score: best.score,
      };
    }

    const hasTesseractMissing = attempts.some(item => String(item.message || '').includes('离线OCR不可用'));
    return {
      success: false,
      message: hasTesseractMissing
        ? '离线OCR不可用，请安装 tesseract 与中文语言包'
        : '离线OCR未识别到有效文字',
    };
  }

  async runTesseractWithJs(tesseract, imageInput, config, langPath) {
    try {
      const options = {
        logger: () => {},
      };
      if (langPath) {
        options.langPath = langPath;
      }
      const result = await tesseract.recognize(imageInput, 'chi_sim+eng', options);
      let text = (result && result.data && result.data.text) ? result.data.text : '';
      text = String(text || '').trim();
      if (!text) {
        return {
          success: false,
          message: '离线OCR未识别到有效文字',
        };
      }
      if (config.whitelist) {
        const pattern = new RegExp(`[^${this.escapeRegexCharset(config.whitelist)}\\n\\r\\s]`, 'g');
        text = text.replace(pattern, '');
      }
      return { success: true, text };
    } catch (error) {
      return {
        success: false,
        message: error && error.message ? `离线OCR失败: ${error.message}` : '离线OCR失败',
      };
    }
  }

  resolveTessDataPath() {
    const candidates = [];
    if (process.env.TESSDATA_DIR) {
      candidates.push(process.env.TESSDATA_DIR);
    }
    if (this.app && this.app.isPackaged) {
      candidates.push(path.join(process.resourcesPath, 'ocr', 'tessdata'));
    }
    if (this.app) {
      candidates.push(path.join(this.app.getAppPath(), 'assets', 'ocr', 'tessdata'));
    }

    for (const candidate of candidates) {
      try {
        if (candidate && fs.existsSync(candidate)) {
          return candidate;
        }
      } catch (error) {
        // ignore
      }
    }
    return '';
  }

  tryOnlineOcr(imageBuffer) {
    const apiKey = process.env.OCR_SPACE_API_KEY || '';
    if (!apiKey) {
      return Promise.resolve({
        success: false,
        message: '在线OCR未配置（缺少 OCR_SPACE_API_KEY）',
      });
    }

    return new Promise((resolve) => {
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      const body = new URLSearchParams({
        apikey: apiKey,
        language: 'chs',
        isOverlayRequired: 'false',
        OCREngine: '2',
        base64Image: `data:image/png;base64,${imageBase64}`,
      }).toString();

      const req = https.request(
        'https://api.ocr.space/parse/image',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 8000,
        },
        (res) => {
          let chunks = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => { chunks += chunk; });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(chunks || '{}');
              const lines = (parsed.ParsedResults || [])
                .map(item => item.ParsedText || '')
                .filter(Boolean);
              const text = lines.join('\n').trim();
              if (!text) {
                resolve({ success: false, message: '在线OCR未识别到有效文字' });
                return;
              }
              resolve({ success: true, text });
            } catch (error) {
              resolve({ success: false, message: '在线OCR返回解析失败' });
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy(new Error('timeout'));
      });
      req.on('error', () => {
        resolve({ success: false, message: '在线OCR请求失败' });
      });
      req.write(body);
      req.end();
    });
  }

  escapeRegexCharset(text) {
    return String(text || '').replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
  }

  normalizeOcrText(rawText) {
    const text = String(rawText || '')
      .replace(/\r/g, '')
      .replace(/[，、]/g, '.')
      .replace(/[。｡]/g, '.')
      .replace(/[~﹏]/g, '～')
      .replace(/[：]/g, ':')
      .replace(/[ＯOo]/g, '0')
      .replace(/[Il｜丨]/g, '1')
      .replace(/[Ss]/g, '5')
      .replace(/[Ｂb]/g, '8');

    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.replace(/\s+/g, ' '))
      .map(line => line.replace(/各\s*[:：]?\s*(\d+)/g, '各$1'))
      .map(line => line.replace(/(\d)\s*[.。]\s*(\d)/g, '$1.$2'));

    return lines.join('\n');
  }

  scoreNormalizedText(text) {
    const normalized = String(text || '');
    if (!normalized) return 0;

    const digits = (normalized.match(/\d/g) || []).length;
    const structured = (normalized.match(/(?:\d{2}\.)+\d{2}(?:\s*各\d+)?/g) || []).length;
    const hasAmount = /各\d+/.test(normalized) ? 1 : 0;
    const lineCount = normalized.split('\n').filter(Boolean).length;

    const invalidChars = (normalized.match(/[^\d\s\.～:各新老奥香港澳]/g) || []).length;

    let score = 0;
    score += Math.min(40, digits * 2);
    score += structured * 22;
    score += hasAmount * 12;
    score += Math.min(8, lineCount * 2);
    score -= Math.min(24, invalidChars * 3);
    return Math.max(0, score);
  }
}

module.exports = OcrService;
