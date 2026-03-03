const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');

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

      const strongOcrEnabled = payload.disableStrongOcr !== true;
      let strong = { success: false, message: '' };
      let strongCandidates = [];
      let bestStrong = null;
      if (strongOcrEnabled) {
        strong = await this.tryPaddleOcr(imagePath, payload);
        strongCandidates = this.selectTopCandidates(strong.candidates || [], 3);
        bestStrong = strongCandidates[0] || null;
      }

      const shouldSkipLocal =
        !!(bestStrong && bestStrong.score >= 92 && payload.forceLocalFallback !== true);

      let local = { success: false, message: '' };
      let localCandidates = [];
      if (!shouldSkipLocal) {
        local = await this.tryLocalTesseractSmart(preprocess.candidateImages, {
          ...(payload || {}),
          originalImageBuffer: imageBuffer,
        });
        localCandidates = this.selectTopCandidates(local.candidates || [], 3);
      }

      let mergedCandidates = this.selectTopCandidates([
        ...strongCandidates,
        ...localCandidates,
      ], 3);
      let bestMerged = mergedCandidates[0] || null;
      let mergedScore = bestMerged ? bestMerged.score : 0;

      const allowOnline = payload.preferOnline === true || payload.allowOnlineFallback === true;
      const shouldTryOnline = allowOnline && mergedScore < 38;

      if (shouldTryOnline) {
        const online = await this.tryOnlineOcr(imageBuffer);
        if (online.success && online.text) {
          const normalizedOnlineText = this.normalizeOcrText(online.text);
          const onlineScore = this.scoreNormalizedText(normalizedOnlineText);
          const onlineCandidates = this.selectTopCandidates([
            { text: normalizedOnlineText, score: onlineScore, source: 'online' },
            ...mergedCandidates,
          ], 3);
          const bestOnline = onlineCandidates[0] || null;
          if (bestOnline && bestOnline.source === 'online') {
            return {
              success: true,
              source: 'online',
              text: bestOnline.text,
              score: bestOnline.score,
              candidates: onlineCandidates,
              elapsedMs: Date.now() - startedAt,
            };
          }
        }
      }

      if (bestMerged && bestMerged.text) {
        return {
          success: true,
          source: bestMerged.source || 'offline',
          text: bestMerged.text,
          score: bestMerged.score,
          candidates: mergedCandidates,
          elapsedMs: Date.now() - startedAt,
        };
      }

      return {
        success: false,
        source: 'none',
        message: strong.message || local.message || '图片识别失败',
        candidates: mergedCandidates,
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
      working = await this.cropToInkRegion(working);
      working = await this.autoDeskew(working);

      const original = await working
        .clone()
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

      const grayEnhanced = await working
        .clone()
        .grayscale()
        .normalize()
        .sharpen({ sigma: 1.1, m1: 0.9, m2: 2.0, x1: 2.0, y2: 10.0, y3: 20.0 })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

      const highContrast = await working
        .clone()
        .grayscale()
        .normalize()
        .linear(1.6, -40)
        .threshold(155, { grayscale: true })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

      // Handwritten notes are usually thin strokes on noisy paper.
      const handwritingBoost = await working
        .clone()
        .grayscale()
        .normalize()
        .linear(2.0, -55)
        .sharpen({ sigma: 1.4, m1: 0.7, m2: 2.0, x1: 2.2, y2: 12.0, y3: 20.0 })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

      return {
        usedPreprocess: true,
        candidateImages: [handwritingBoost, grayEnhanced, highContrast, original],
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

  async cropToInkRegion(image) {
    try {
      const sampled = await image
        .clone()
        .grayscale()
        .normalize()
        .raw()
        .toBuffer({ resolveWithObject: true });
      if (!sampled || !sampled.info || !sampled.data) return image;

      const { data, info } = sampled;
      const width = Number(info.width) || 0;
      const height = Number(info.height) || 0;
      const channels = Number(info.channels) || 1;
      if (width <= 0 || height <= 0) return image;

      const rowHits = new Array(height).fill(0);
      const colHits = new Array(width).fill(0);
      const darkThreshold = 165;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const idx = (y * width + x) * channels;
          const value = data[idx];
          if (value < darkThreshold) {
            rowHits[y] += 1;
            colHits[x] += 1;
          }
        }
      }

      const rowMinHit = Math.max(3, Math.floor(width * 0.003));
      const colMinHit = Math.max(3, Math.floor(height * 0.002));

      let top = 0;
      while (top < height && rowHits[top] < rowMinHit) top += 1;
      let bottom = height - 1;
      while (bottom > top && rowHits[bottom] < rowMinHit) bottom -= 1;
      let left = 0;
      while (left < width && colHits[left] < colMinHit) left += 1;
      let right = width - 1;
      while (right > left && colHits[right] < colMinHit) right -= 1;

      if (top >= bottom || left >= right) return image;

      const boxWidth = right - left + 1;
      const boxHeight = bottom - top + 1;
      if (boxWidth < Math.floor(width * 0.12) || boxHeight < Math.floor(height * 0.12)) {
        return image;
      }

      const marginX = Math.max(12, Math.round(boxWidth * 0.08));
      const marginY = Math.max(12, Math.round(boxHeight * 0.08));
      const extractLeft = Math.max(0, left - marginX);
      const extractTop = Math.max(0, top - marginY);
      const extractRight = Math.min(width - 1, right + marginX);
      const extractBottom = Math.min(height - 1, bottom + marginY);
      const extractWidth = extractRight - extractLeft + 1;
      const extractHeight = extractBottom - extractTop + 1;

      if (extractWidth <= 0 || extractHeight <= 0) return image;
      return image.clone().extract({
        left: extractLeft,
        top: extractTop,
        width: extractWidth,
        height: extractHeight,
      });
    } catch (error) {
      return image;
    }
  }

  async autoDeskew(image) {
    try {
      const probe = image
        .clone()
        .resize({ width: 900, fit: 'inside', withoutEnlargement: true })
        .grayscale()
        .normalize();

      const angles = [-18, -14, -10, -7, -4, 0, 4, 7, 10, 14, 18];
      let bestAngle = 0;
      let bestScore = Number.NEGATIVE_INFINITY;

      for (const angle of angles) {
        const sampled = await probe
          .clone()
          .rotate(angle, { background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .raw()
          .toBuffer({ resolveWithObject: true });
        const score = this.scoreHorizontalTextConcentration(sampled);
        if (score > bestScore) {
          bestScore = score;
          bestAngle = angle;
        }
      }

      if (Math.abs(bestAngle) < 2) return image;
      return image.clone().rotate(bestAngle, { background: { r: 255, g: 255, b: 255, alpha: 1 } });
    } catch (error) {
      return image;
    }
  }

  scoreHorizontalTextConcentration(sampled) {
    if (!sampled || !sampled.data || !sampled.info) return 0;
    const data = sampled.data;
    const width = Number(sampled.info.width) || 0;
    const height = Number(sampled.info.height) || 0;
    const channels = Number(sampled.info.channels) || 1;
    if (width <= 0 || height <= 0) return 0;

    const threshold = 170;
    const rowHits = new Array(height).fill(0);
    for (let y = 0; y < height; y += 1) {
      let hit = 0;
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * channels;
        if (data[idx] < threshold) hit += 1;
      }
      rowHits[y] = hit;
    }

    const mean = rowHits.reduce((sum, v) => sum + v, 0) / rowHits.length;
    const variance = rowHits.reduce((sum, v) => {
      const d = v - mean;
      return sum + d * d;
    }, 0) / rowHits.length;

    const peak = rowHits.reduce((max, v) => (v > max ? v : max), 0);
    return variance + peak * 4;
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

  async tryLocalTesseractSmart(candidateImages, options = {}) {
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
        lang: 'eng',
        whitelist: '0123456789.:-=',
      },
      {
        psm: '4',
      },
      {
        psm: '6',
        whitelist: '0123456789各号.:：~～新老奥香港澳鼠牛虎兔龙蛇马羊猴鸡狗猪元米',
      },
    ];

    const attempts = [];
    for (const imageInput of candidateImages) {
      for (const config of configs) {
        const result = await this.runTesseractWithJs(tesseract, imageInput, config, langPath);
        if (result.success && result.text) {
          const normalized = this.normalizeOcrText(result.text);
          if (normalized) {
            const score = this.scoreNormalizedText(normalized);
            attempts.push({
              success: true,
              text: result.text,
              normalized,
              score,
              source: 'offline',
              config,
            });
          } else {
            attempts.push({
              success: false,
              message: '离线OCR噪声过高，未提取到结构化文本',
              source: 'offline',
              config,
            });
          }
        } else {
          attempts.push({ success: false, message: result.message, source: 'offline', config });
        }
      }
    }

    let best = attempts
      .filter(item => item.success)
      .sort((a, b) => b.score - a.score)[0];

    // Handwritten photos may need line-wise OCR when whole-image OCR collapses.
    if (!best || best.score < 45) {
      const lineWiseAttempts = await this.tryLineWiseOcrOnCandidates(
        tesseract,
        Array.isArray(candidateImages) ? candidateImages.slice(0, 2) : [],
        langPath
      );
      attempts.push(...lineWiseAttempts);
      best = attempts
        .filter(item => item.success)
        .sort((a, b) => b.score - a.score)[0];
    }

    // Structured handwriting fallback: tokenize handwritten chunks, then rebuild parser lines.
    const preferHandwritingFallback = options.handwriting === true || options.mode === 'structured';
    if (preferHandwritingFallback && (!best || best.score < 62)) {
      const fallbackInputs = [];
      if (options.originalImageBuffer) {
        fallbackInputs.push(options.originalImageBuffer);
      }
      fallbackInputs.push(...(Array.isArray(candidateImages) ? candidateImages : []));
      const handwrittenAttempts = await this.tryHandwritingStructuredFallbackOnCandidates(
        tesseract,
        fallbackInputs.slice(0, 4),
        langPath
      );
      attempts.push(...handwrittenAttempts);
      best = attempts
        .filter(item => item.success)
        .sort((a, b) => b.score - a.score)[0];
    }

    if (best) {
      return {
        success: true,
        text: best.normalized,
        score: best.score,
        candidates: attempts
          .filter(item => item.success && item.normalized)
          .map(item => ({
            text: item.normalized,
            score: item.score,
            source: item.source || 'offline',
            psm: item.config && item.config.psm ? item.config.psm : '',
          })),
      };
    }

    const hasTesseractMissing = attempts.some(item => String(item.message || '').includes('离线OCR不可用'));
    return {
      success: false,
      message: hasTesseractMissing
        ? '离线OCR不可用，请安装 tesseract 与中文语言包'
        : '离线OCR未识别到有效文字',
      candidates: attempts
        .filter(item => item.success && item.normalized)
        .map(item => ({
          text: item.normalized,
          score: item.score,
          source: item.source || 'offline',
          psm: item.config && item.config.psm ? item.config.psm : '',
        })),
    };
  }

  async tryLineWiseOcr(tesseract, imageInput, langPath) {
    const snippets = await this.splitImageIntoLineSnippets(imageInput);
    if (!snippets.length) return '';

    const lines = [];
    for (const snippet of snippets.slice(0, 8)) {
      const primary = await this.runTesseractWithJs(
        tesseract,
        snippet,
        {
          psm: '7',
          whitelist: '0123456789各号.:：~～新老奥香港澳鼠牛虎兔龙蛇马羊猴鸡狗猪元米',
        },
        langPath
      );
      let text = primary.success ? String(primary.text || '') : '';
      if (!text.trim()) {
        const digitOnly = await this.runTesseractWithJs(
          tesseract,
          snippet,
          {
            psm: '7',
            lang: 'eng',
            whitelist: '0123456789.:-=',
          },
          langPath
        );
        text = digitOnly.success ? String(digitOnly.text || '') : '';
      }
      text = text.replace(/\s+/g, ' ').trim();
      if (text) lines.push(text);
    }
    return lines.join('\n');
  }

  async splitImageIntoLineSnippets(imageInput) {
    const sharp = this.getSharp();
    if (!sharp) return [];

    try {
      const sampled = await sharp(imageInput)
        .grayscale()
        .normalize()
        .raw()
        .toBuffer({ resolveWithObject: true });
      if (!sampled || !sampled.info || !sampled.data) return [];

      const { data, info } = sampled;
      const width = Number(info.width) || 0;
      const height = Number(info.height) || 0;
      const channels = Number(info.channels) || 1;
      if (width <= 0 || height <= 0) return [];

      const rowHits = new Array(height).fill(0);
      const darkThreshold = 168;
      for (let y = 0; y < height; y += 1) {
        let hit = 0;
        for (let x = 0; x < width; x += 1) {
          const idx = (y * width + x) * channels;
          if (data[idx] < darkThreshold) hit += 1;
        }
        rowHits[y] = hit;
      }

      const rowMinHit = Math.max(4, Math.floor(width * 0.02));
      const spans = [];
      let start = -1;
      for (let y = 0; y < height; y += 1) {
        const active = rowHits[y] >= rowMinHit;
        if (active && start < 0) {
          start = y;
        } else if (!active && start >= 0) {
          spans.push([start, y - 1]);
          start = -1;
        }
      }
      if (start >= 0) spans.push([start, height - 1]);
      if (!spans.length) return [];

      const merged = [];
      for (const span of spans) {
        if (!merged.length) {
          merged.push(span);
          continue;
        }
        const last = merged[merged.length - 1];
        if (span[0] - last[1] <= 8) {
          last[1] = span[1];
        } else {
          merged.push(span);
        }
      }

      const output = [];
      for (const [y0, y1] of merged) {
        const h = y1 - y0 + 1;
        if (h < 12) continue;
        const top = Math.max(0, y0 - 6);
        const bottom = Math.min(height - 1, y1 + 6);
        const extractHeight = bottom - top + 1;
        if (extractHeight < 12) continue;

        const snippet = await sharp(imageInput)
          .extract({ left: 0, top, width, height: extractHeight })
          .resize({ height: Math.max(84, extractHeight * 2), fit: 'contain', withoutEnlargement: false })
          .png({ compressionLevel: 9, adaptiveFiltering: true })
          .toBuffer();
        output.push(snippet);
      }

      return output;
    } catch (error) {
      return [];
    }
  }

  selectTopCandidates(candidates, limit = 3) {
    const uniq = new Map();
    (candidates || []).forEach(item => {
      const text = String(item && item.text ? item.text : '').trim();
      if (!text) return;
      const score = Number.isFinite(item.score) ? item.score : 0;
      const existed = uniq.get(text);
      if (!existed || score > existed.score) {
        uniq.set(text, {
          text,
          score,
          source: item.source || 'offline',
          psm: item.psm || '',
        });
      }
    });
    return Array.from(uniq.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async runTesseractWithJs(tesseract, imageInput, config, langPath) {
    try {
      const options = {
        logger: () => {},
        preserve_interword_spaces: '1',
      };
      if (langPath) {
        options.langPath = langPath;
      }
      if (config && config.psm) {
        options.tessedit_pageseg_mode = String(config.psm);
      }
      if (config && config.whitelist) {
        options.tessedit_char_whitelist = String(config.whitelist);
      }
      const lang = config && config.lang ? String(config.lang) : 'chi_sim+eng';
      const result = await tesseract.recognize(imageInput, lang, options);
      const data = result && result.data ? result.data : {};
      let text = this.buildStructuredTextFromTesseractData(data);
      if (!text) {
        text = data.text || '';
      }
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

  async tryLineWiseOcrOnCandidates(tesseract, candidateImages, langPath) {
    const outputs = [];
    const inputs = Array.isArray(candidateImages) ? candidateImages.filter(Boolean) : [];
    for (let i = 0; i < inputs.length; i += 1) {
      const lineWiseText = await this.tryLineWiseOcr(tesseract, inputs[i], langPath);
      if (!lineWiseText) continue;
      const normalized = this.normalizeOcrText(lineWiseText);
      if (!normalized) continue;
      const score = this.scoreNormalizedText(normalized);
      outputs.push({
        success: true,
        text: lineWiseText,
        normalized,
        score,
        source: 'offline-linewise',
        config: { psm: `7-linewise-${i + 1}` },
      });
    }
    return outputs;
  }

  async tryHandwritingStructuredFallbackOnCandidates(tesseract, candidateImages, langPath) {
    const attempts = [];
    const inputs = Array.isArray(candidateImages) ? candidateImages.filter(Boolean) : [];
    for (let i = 0; i < inputs.length; i += 1) {
      const wholeLineCandidates = await this.tryWholeLineHandwritingCandidates(
        tesseract,
        inputs[i],
        langPath
      );
      wholeLineCandidates.forEach((text, idx) => {
        const normalized = this.normalizeOcrText(text);
        if (!normalized) return;
        const score = this.scoreNormalizedText(normalized) + 14;
        attempts.push({
          success: true,
          text,
          normalized,
          score,
          source: 'offline-handwriting-fallback',
          config: { psm: `line-fallback-${i + 1}-${idx + 1}` },
        });
      });

      const tokenSnippets = await this.splitImageIntoTokenSnippets(inputs[i]);
      if (!tokenSnippets || tokenSnippets.length < 2) continue;

      const tokenResults = [];
      for (const snippet of tokenSnippets.slice(0, 24)) {
        const token = await this.recognizeHandwrittenToken(tesseract, snippet, langPath);
        if (token) tokenResults.push(token);
      }

      const structuredCandidates = this.composeStructuredCandidatesFromTokenList(tokenResults);
      structuredCandidates.forEach((text, idx) => {
        const normalized = this.normalizeOcrText(text);
        if (!normalized) return;
        const score = this.scoreNormalizedText(normalized) + 10;
        attempts.push({
          success: true,
          text,
          normalized,
          score,
          source: 'offline-handwriting-fallback',
          config: { psm: `token-fallback-${i + 1}-${idx + 1}` },
        });
      });
    }
    return attempts;
  }

  async tryWholeLineHandwritingCandidates(tesseract, imageInput, langPath) {
    const configs = [
      {
        psm: '6',
        lang: 'eng',
        whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz各号澳奥新老香港',
      },
      {
        psm: '7',
        lang: 'eng',
        whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz各号澳奥新老香港',
      },
      {
        psm: '6',
        whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz各号澳奥新老香港',
      },
    ];

    const candidates = new Set();
    for (const config of configs) {
      const result = await this.runTesseractWithJs(tesseract, imageInput, config, langPath);
      if (!result || !result.success || !result.text) continue;
      const lines = String(result.text || '')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
      lines.forEach((line) => {
        const tokenized = this.tokenizeHandwrittenLine(line);
        const composed = this.composeStructuredCandidatesFromTokenList(tokenized);
        composed.forEach(item => candidates.add(item));
        const noisyDecoded = this.decodeNoisyStructuredCandidatesFromLine(line);
        noisyDecoded.forEach(item => candidates.add(item));
      });
    }
    return Array.from(candidates).slice(0, 10);
  }

  tokenizeHandwrittenLine(rawLine) {
    const line = String(rawLine || '')
      .replace(/[，、]/g, ' ')
      .replace(/[。｡]/g, '.')
      .replace(/[ ]{2,}/g, ' ')
      .trim();
    if (!line) return [];

    const pieces = line.split(/\s+/).filter(Boolean);
    if (pieces.length <= 1) {
      const compact = line.replace(/\s+/g, '');
      return [this.normalizeHandwrittenToken(compact)].filter(Boolean);
    }

    return pieces
      .map(piece => this.normalizeHandwrittenToken(piece))
      .filter(Boolean);
  }

  decodeNoisyHandwritingStructuredLine(rawLine) {
    const candidates = this.decodeNoisyStructuredCandidatesFromLine(rawLine);
    return candidates.length > 0 ? candidates[0] : '';
  }

  decodeNoisyStructuredCandidatesFromLine(rawLine) {
    const line = String(rawLine || '')
      .replace(/[，、]/g, ' ')
      .replace(/[。｡]/g, '.')
      .replace(/[ ]{2,}/g, ' ')
      .trim();
    if (!line) return [];

    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length < 3) return [];

    const tokenInfos = tokens.map((token) => ({
      token,
      numberCandidates: this.decodeNoisyTokenToNumberCandidates(token, 8),
      tailCandidates: this.decodeNoisyTailToken(token),
      amountCandidates: this.decodeNoisyAmountOnlyToken(token),
    }));

    const rawAmountMatch = line.match(/(?:各|各号|[=:：])\s*([A-Za-z0-9]+)\s*$/);
    let explicitAmountCandidates = [];
    if (rawAmountMatch) {
      explicitAmountCandidates = this.decodeNoisyAmountOnlyToken(rawAmountMatch[1]);
    }

    const output = [];
    const seen = new Set();
    const pushCandidate = (text, penalty = 0) => {
      const normalized = this.normalizeParserCompatibleLine(text);
      if (!normalized) return;
      if (seen.has(normalized)) return;
      seen.add(normalized);
      const score = this.scoreNormalizedText(normalized) - penalty;
      output.push({ text: normalized, score });
    };

    if (tokenInfos.length >= 3) {
      const prefixCombos = this.buildNoisyNumberSequences(
        tokenInfos.slice(0, -1).map(item => item.numberCandidates),
        18
      );
      const lastInfo = tokenInfos[tokenInfos.length - 1];
      for (const combo of prefixCombos) {
        for (const tail of lastInfo.tailCandidates.slice(0, 10)) {
          const numbers = combo.numbers.concat(tail.number);
          if (numbers.length < 3) continue;
          pushCandidate(`${numbers.join('.')}各${tail.amount}`, combo.penalty + (24 - tail.score));
        }
      }

      if (tokenInfos.length >= 4) {
        const amountOnly = lastInfo.amountCandidates.slice(0, 8);
        const prevNums = tokenInfos[tokenInfos.length - 2].numberCandidates.slice(0, 6);
        const prePrefixCombos = this.buildNoisyNumberSequences(
          tokenInfos.slice(0, -2).map(item => item.numberCandidates),
          14
        );
        for (const combo of prePrefixCombos) {
          for (const prev of prevNums) {
            for (const amount of amountOnly) {
              const numbers = combo.numbers.concat(prev.number);
              if (numbers.length < 3) continue;
              pushCandidate(
                `${numbers.join('.')}各${amount.amount}`,
                combo.penalty + prev.penalty + amount.penalty + 4
              );
            }
          }
        }
      }

      if (explicitAmountCandidates.length > 0) {
        const allCombos = this.buildNoisyNumberSequences(
          tokenInfos.map(item => item.numberCandidates),
          14
        );
        for (const combo of allCombos) {
          if (combo.numbers.length < 3) continue;
          for (const amount of explicitAmountCandidates.slice(0, 6)) {
            pushCandidate(`${combo.numbers.join('.')}各${amount.amount}`, combo.penalty + amount.penalty + 2);
          }
        }
      }
    }

    return output
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(item => item.text);
  }

  buildNoisyNumberSequences(candidateLists, maxSequences = 12) {
    let beams = [{ numbers: [], penalty: 0 }];
    const lists = Array.isArray(candidateLists) ? candidateLists : [];

    lists.forEach((list) => {
      const options = (Array.isArray(list) ? list : []).slice(0, 4);
      const next = [];
      for (const beam of beams) {
        if (options.length === 0) {
          next.push({
            numbers: beam.numbers.slice(),
            penalty: beam.penalty + 2.6,
          });
          continue;
        }
        for (const opt of options) {
          next.push({
            numbers: beam.numbers.concat(opt.number),
            penalty: beam.penalty + opt.penalty,
          });
        }
      }
      beams = next
        .sort((a, b) => a.penalty - b.penalty)
        .slice(0, Math.max(6, maxSequences * 2));
    });

    const uniq = new Map();
    beams.forEach((beam) => {
      if (beam.numbers.length < 2) return;
      const key = beam.numbers.join('.');
      const existed = uniq.get(key);
      if (!existed || beam.penalty < existed.penalty) {
        uniq.set(key, beam);
      }
    });
    return Array.from(uniq.values())
      .sort((a, b) => a.penalty - b.penalty)
      .slice(0, maxSequences);
  }

  decodeNoisyTokenToNumberCandidates(token, limit = 10) {
    const candidates = this.expandNoisyTokenDigits(token, 28);
    const output = [];
    for (const cand of candidates) {
      const digits = String(cand.digits || '');
      if (!digits) continue;
      const options = [];
      if (digits.length === 1) options.push({ value: `0${digits}`, extraPenalty: 1.0 });
      if (digits.length >= 2) {
        options.push({ value: digits.slice(0, 2), extraPenalty: 0 });
        options.push({ value: digits.slice(-2), extraPenalty: 0.4 });
      }
      for (const option of options) {
        if (!/^\d{2}$/.test(option.value)) continue;
        const value = parseInt(option.value, 10);
        if (!Number.isFinite(value) || value < 1 || value > 49) continue;
        output.push({
          number: option.value,
          penalty: cand.penalty + option.extraPenalty,
        });
      }
    }
    const uniq = new Map();
    output.forEach((item) => {
      const existed = uniq.get(item.number);
      if (!existed || item.penalty < existed.penalty) {
        uniq.set(item.number, item);
      }
    });
    return Array.from(uniq.values())
      .sort((a, b) => a.penalty - b.penalty)
      .slice(0, limit);
  }

  decodeNoisyAmountOnlyToken(token) {
    const candidates = this.expandNoisyTokenDigits(token, 32);
    const output = [];
    for (const cand of candidates) {
      const digits = String(cand.digits || '');
      if (!digits) continue;
      const plans = [];
      plans.push({ value: digits, extraPenalty: 0 });
      if (digits.length >= 2) {
        plans.push({ value: digits.slice(-2), extraPenalty: 0.5 });
      }
      if (digits.length >= 3) {
        plans.push({ value: digits.slice(-3), extraPenalty: 0.65 });
      }
      if (digits.length === 1) {
        plans.push({ value: `${digits}${digits}`, extraPenalty: 1.1 });
      }
      plans.forEach((plan) => {
        if (!/^\d+$/.test(plan.value)) return;
        const amountVal = parseInt(plan.value, 10);
        if (!Number.isFinite(amountVal) || amountVal <= 0) return;
        output.push({
          amount: String(amountVal),
          penalty: cand.penalty + plan.extraPenalty,
        });
      });
    }
    const uniq = new Map();
    output.forEach((item) => {
      const existed = uniq.get(item.amount);
      if (!existed || item.penalty < existed.penalty) {
        uniq.set(item.amount, item);
      }
    });
    return Array.from(uniq.values())
      .sort((a, b) => a.penalty - b.penalty)
      .slice(0, 12);
  }

  decodeNoisyTokenToNumber(token) {
    const candidates = this.decodeNoisyTokenToNumberCandidates(token, 1);
    if (!candidates.length) return null;
    return {
      number: candidates[0].number,
      score: 20 - candidates[0].penalty,
      penalty: candidates[0].penalty,
    };
  }

  decodeNoisyTailToken(token) {
    const rawToken = String(token || '').trim();
    const alphaOnlyToken = /^[A-Za-z]+$/.test(rawToken);
    const candidates = this.expandNoisyTokenDigits(token, 56);
    const output = [];
    for (const cand of candidates) {
      const digits = String(cand.digits || '');
      if (!/^\d{2,}$/.test(digits)) continue;

      const plans = [];
      if (digits.length >= 3) {
        plans.push({ num: digits.slice(0, 1), amount: digits.slice(1), numPenalty: 1.2 });
        plans.push({ num: digits.slice(0, 2), amount: digits.slice(2), numPenalty: 0 });
        plans.push({ num: digits.slice(0, 2), amount: digits.slice(-1), numPenalty: 0.35 });
      }
      if (digits.length >= 4) {
        plans.push({ num: digits.slice(0, 2), amount: digits.slice(-2), numPenalty: 0.25 });
      }
      if (digits.length >= 5) {
        plans.push({ num: digits.slice(0, 2), amount: digits.slice(-3), numPenalty: 0.45 });
      }

      plans.forEach((plan) => {
        if (!/^\d{1,2}$/.test(plan.num) || !/^\d+$/.test(plan.amount)) return;
        const numVal = parseInt(plan.num, 10);
        const amountVal = parseInt(plan.amount, 10);
        if (!Number.isFinite(numVal) || numVal < 1 || numVal > 49) return;
        if (!Number.isFinite(amountVal) || amountVal <= 0) return;

        const normalizedNum = numVal < 10 ? `0${numVal}` : String(numVal);
        let score = 24 - cand.penalty - plan.numPenalty;
        if (plan.amount.length >= 2 && plan.amount.length <= 3) score += 5;
        if (amountVal >= 10 && amountVal <= 500) score += 4;
        if (amountVal > 3000) score -= 7;
        if (alphaOnlyToken) {
          // Alpha-only tail tokens are usually OCR-garbled "各+金额".
          // Prefer 9-ending/repeated-style amounts over ambiguous "...1" tails.
          if (/9$/.test(String(amountVal))) score += 1.4;
          if (/^(\d)\1$/.test(String(amountVal))) score += 0.7;
          if (/1$/.test(String(amountVal))) score -= 2.0;
          if (amountVal >= 90 && amountVal <= 999) score += 0.8;
          if (/8$/.test(normalizedNum)) score += 0.6;
          if (/5$/.test(normalizedNum)) score -= 0.6;
        }
        output.push({
          number: normalizedNum,
          amount: String(amountVal),
          score,
        });

        if (plan.amount.length === 1) {
          const doubled = parseInt(`${plan.amount}${plan.amount}`, 10);
          if (Number.isFinite(doubled) && doubled > 0) {
            output.push({
              number: normalizedNum,
              amount: String(doubled),
              score: score - 0.9,
            });
          }
        }
      });
    }
    output.sort((a, b) => b.score - a.score);
    return output.slice(0, 12);
  }

  expandNoisyTokenDigits(token, limit = 24) {
    const src = String(token || '')
      .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
      .replace(/[，、。｡:：;；]/g, '')
      .trim();
    if (!src) return [];

    const states = [{ digits: '', penalty: 0 }];
    for (const ch of src) {
      const options = this.getNoisyDigitOptions(ch);
      const nextStates = [];
      if (options.length === 0) {
        for (const state of states) {
          nextStates.push({
            digits: state.digits,
            penalty: state.penalty + 2.2,
          });
        }
      } else {
        for (const state of states) {
          options.forEach((opt) => {
            nextStates.push({
              digits: state.digits + opt.digit,
              penalty: state.penalty + opt.penalty,
            });
          });
        }
      }

      nextStates.sort((a, b) => a.penalty - b.penalty);
      const dedup = new Map();
      for (const item of nextStates) {
        const key = item.digits;
        const existed = dedup.get(key);
        if (!existed || item.penalty < existed.penalty) {
          dedup.set(key, item);
        }
        if (dedup.size >= limit * 2) break;
      }
      const pruned = Array.from(dedup.values())
        .sort((a, b) => a.penalty - b.penalty)
        .slice(0, limit);
      states.length = 0;
      states.push(...pruned);
    }

    return states
      .filter(item => item.digits.length > 0)
      .sort((a, b) => a.penalty - b.penalty)
      .slice(0, limit);
  }

  getNoisyDigitOptions(ch) {
    const raw = String(ch || '');
    if (!raw) return [];
    if (/^\d$/.test(raw)) return [{ digit: raw, penalty: 0 }];

    const upper = raw.toUpperCase();
    const map = {
      O: [{ digit: '0', penalty: 0.35 }],
      Q: [{ digit: '0', penalty: 0.45 }],
      D: [{ digit: '0', penalty: 0.65 }],
      C: [{ digit: '0', penalty: 0.75 }],
      U: [{ digit: '0', penalty: 0.9 }],
      V: [{ digit: '0', penalty: 1.45 }],
      I: [{ digit: '1', penalty: 0.35 }],
      L: [{ digit: '1', penalty: 0.4 }, { digit: '9', penalty: 1.7 }],
      J: [{ digit: '1', penalty: 0.75 }],
      Z: [{ digit: '2', penalty: 0.45 }],
      E: [{ digit: '3', penalty: 0.9 }, { digit: '9', penalty: 1.1 }],
      A: [{ digit: '4', penalty: 0.9 }],
      F: [{ digit: '4', penalty: 0.85 }, { digit: '8', penalty: 1.15 }, { digit: '9', penalty: 1.65 }],
      H: [{ digit: '4', penalty: 1.05 }, { digit: '9', penalty: 1.2 }],
      S: [{ digit: '5', penalty: 0.6 }, { digit: '8', penalty: 0.95 }, { digit: '0', penalty: 1.85 }],
      G: [{ digit: '6', penalty: 1.1 }, { digit: '9', penalty: 0.95 }, { digit: '0', penalty: 1.25 }],
      T: [{ digit: '7', penalty: 1.0 }],
      B: [{ digit: '8', penalty: 0.55 }, { digit: '9', penalty: 1.0 }],
      P: [{ digit: '9', penalty: 0.85 }, { digit: '0', penalty: 1.25 }],
      R: [{ digit: '9', penalty: 0.95 }],
      K: [{ digit: '9', penalty: 1.15 }, { digit: '4', penalty: 1.25 }],
      Y: [{ digit: '9', penalty: 1.2 }],
    };
    return map[upper] ? map[upper].slice() : [];
  }

  async splitImageIntoTokenSnippets(imageInput) {
    const sharp = this.getSharp();
    if (!sharp) return [];
    try {
      const normalizedBuffer = await sharp(imageInput)
        .rotate()
        .resize({ width: 1800, fit: 'inside', withoutEnlargement: false })
        .grayscale()
        .normalize()
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

      const baseImage = sharp(normalizedBuffer);

      const sampled = await baseImage
        .clone()
        .raw()
        .toBuffer({ resolveWithObject: true });
      if (!sampled || !sampled.info || !sampled.data) return [];

      const { data, info } = sampled;
      const width = Number(info.width) || 0;
      const height = Number(info.height) || 0;
      const channels = Number(info.channels) || 1;
      if (width <= 0 || height <= 0) return [];

      const darkThreshold = 172;
      const rowHits = new Array(height).fill(0);
      for (let y = 0; y < height; y += 1) {
        let hit = 0;
        for (let x = 0; x < width; x += 1) {
          const idx = (y * width + x) * channels;
          if (data[idx] < darkThreshold) hit += 1;
        }
        rowHits[y] = hit;
      }

      const maxRowHit = rowHits.reduce((m, v) => (v > m ? v : m), 0);
      const rowMinHit = Math.max(
        3,
        Math.floor(width * 0.0042),
        Math.floor(maxRowHit * 0.16)
      );
      let top = 0;
      while (top < height && rowHits[top] < rowMinHit) top += 1;
      let bottom = height - 1;
      while (bottom > top && rowHits[bottom] < rowMinHit) bottom -= 1;
      if (top >= bottom) return [];

      const marginY = Math.max(6, Math.round((bottom - top + 1) * 0.08));
      top = Math.max(0, top - marginY);
      bottom = Math.min(height - 1, bottom + marginY);
      const lineHeight = bottom - top + 1;
      if (lineHeight < 24) return [];

      const colHits = new Array(width).fill(0);
      for (let x = 0; x < width; x += 1) {
        let hit = 0;
        for (let y = top; y <= bottom; y += 1) {
          const idx = (y * width + x) * channels;
          if (data[idx] < darkThreshold) hit += 1;
        }
        colHits[x] = hit;
      }

      const maxColHit = colHits.reduce((m, v) => (v > m ? v : m), 0);
      const colMinHit = Math.max(
        2,
        Math.floor(lineHeight * 0.055),
        Math.floor(maxColHit * 0.18)
      );
      const spans = [];
      let start = -1;
      for (let x = 0; x < width; x += 1) {
        const active = colHits[x] >= colMinHit;
        if (active && start < 0) {
          start = x;
        } else if (!active && start >= 0) {
          spans.push([start, x - 1]);
          start = -1;
        }
      }
      if (start >= 0) spans.push([start, width - 1]);
      if (!spans.length) return [];

      const merged = [];
      const mergeGap = Math.max(8, Math.round(width * 0.01));
      for (const span of spans) {
        if (!merged.length) {
          merged.push(span);
          continue;
        }
        const last = merged[merged.length - 1];
        if (span[0] - last[1] <= mergeGap) {
          last[1] = span[1];
        } else {
          merged.push(span);
        }
      }

      const snippets = [];
      for (const [x0, x1] of merged) {
        const spanWidth = x1 - x0 + 1;
        if (spanWidth < Math.max(8, Math.round(width * 0.008))) continue;

        let spanDark = 0;
        for (let x = x0; x <= x1; x += 1) {
          spanDark += colHits[x] || 0;
        }
        const spanDensity = spanDark / Math.max(1, spanWidth * lineHeight);
        if (spanWidth > Math.floor(width * 0.45) && spanDensity < 0.055) continue;

        const marginX = Math.max(5, Math.round(spanWidth * 0.16));
        const left = Math.max(0, x0 - marginX);
        const right = Math.min(width - 1, x1 + marginX);
        const extractWidth = right - left + 1;
        if (extractWidth < 10) continue;

        const snippet = await baseImage
          .clone()
          .extract({
            left,
            top,
            width: extractWidth,
            height: lineHeight,
          })
          .resize({ height: 140, fit: 'inside', withoutEnlargement: false })
          .png({ compressionLevel: 9, adaptiveFiltering: true })
          .toBuffer();
        snippets.push(snippet);
      }
      return snippets;
    } catch (error) {
      return [];
    }
  }

  async recognizeHandwrittenToken(tesseract, snippet, langPath) {
    const configs = [
      {
        psm: '8',
        lang: 'eng',
        whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      },
      {
        psm: '8',
        whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz各号澳奥新老香港',
      },
      {
        psm: '10',
        whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz各号澳奥新老香港',
      },
    ];

    for (const config of configs) {
      const result = await this.runTesseractWithJs(tesseract, snippet, config, langPath);
      if (!result || !result.success || !result.text) continue;
      const token = this.normalizeHandwrittenToken(result.text);
      if (token) return token;
    }
    return '';
  }

  normalizeHandwrittenToken(rawToken) {
    let token = String(rawToken || '')
      .replace(/\s+/g, '')
      .replace(/[，、。｡,:：;；]/g, '')
      .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248))
      .replace(/各号/g, '各');
    if (!token) return '';

    const map = {
      O: '0',
      Q: '0',
      D: '0',
      C: '0',
      I: '1',
      L: '1',
      J: '1',
      Z: '2',
      S: '5',
      B: '8',
    };

    let normalized = '';
    for (const ch of token) {
      if (/\d/.test(ch)) {
        normalized += ch;
        continue;
      }
      if (ch === '各' || ch === '号' || ch === '澳' || ch === '奥' || ch === '香' || ch === '港' || ch === '新' || ch === '老') {
        normalized += ch;
        continue;
      }
      const upper = ch.toUpperCase();
      if (map[upper]) {
        normalized += map[upper];
      }
    }

    normalized = normalized.replace(/号/g, '');
    if (!normalized) return '';

    if (normalized.includes('各')) {
      const rightDigits = normalized.split('各').pop().replace(/\D/g, '');
      return rightDigits ? `各${rightDigits}` : '各';
    }

    if (/^(澳|奥|香港|香|港|新奥|老奥)$/.test(normalized)) {
      return normalized;
    }

    const digits = normalized.replace(/\D/g, '');
    if (!digits) return '';
    return digits;
  }

  composeStructuredCandidatesFromTokenList(tokens) {
    const cleaned = (Array.isArray(tokens) ? tokens : [])
      .map(item => String(item || '').trim())
      .filter(Boolean);
    if (cleaned.length === 0) return [];

    let region = '';
    let amount = '';
    const numericRaw = [];
    cleaned.forEach((token) => {
      if (/^各\d{1,12}$/.test(token)) {
        amount = token.slice(1);
        return;
      }
      if (/^(澳|奥|香港|香|港|新奥|老奥)$/.test(token)) {
        region = this.normalizeRegionLine(token) || region;
        return;
      }
      if (/^\d+$/.test(token)) {
        numericRaw.push(token);
      }
    });

    const explode = (token) => {
      if (!/^\d+$/.test(token)) return [];
      if (token.length <= 2) return [token];
      if (token.length % 2 === 0) {
        const parts = [];
        for (let i = 0; i < token.length; i += 2) {
          parts.push(token.slice(i, i + 2));
        }
        return parts;
      }
      return [token];
    };

    const toValidNumbers = (rawList) => {
      const out = [];
      rawList.forEach((token) => {
        explode(token).forEach((part) => {
          const n = parseInt(part, 10);
          if (!Number.isFinite(n) || n < 1 || n > 49) return;
          out.push(n < 10 ? `0${n}` : String(n));
        });
      });
      return out;
    };

    const candidates = new Set();
    const allNumbers = toValidNumbers(numericRaw);
    if (allNumbers.length >= 2) {
      const numericLine = allNumbers.join(' ');
      candidates.add(region ? `${region}\n${numericLine}` : numericLine);
    }

    if (!amount && numericRaw.length >= 4) {
      const guessedAmountRaw = numericRaw[numericRaw.length - 1];
      if (!/^\d{2,}$/.test(guessedAmountRaw)) {
        // likely noise tail, skip amount guessing
      } else {
        const guessedAmount = guessedAmountRaw.replace(/^0+/, '') || '0';
        const frontNumbers = toValidNumbers(numericRaw.slice(0, -1));
        const amountValue = parseInt(guessedAmount, 10);
        if (frontNumbers.length >= 3 && Number.isFinite(amountValue) && amountValue > 0) {
          amount = guessedAmount;
          const structured = `${frontNumbers.join('.')}各${amount}`;
          candidates.add(region ? `${region}\n${structured}` : structured);
        }
      }
    }

    // Tail split recovery for noisy merged token, e.g. "08099" -> "08" + "99".
    if (!amount && numericRaw.length >= 3) {
      const lastRaw = numericRaw[numericRaw.length - 1];
      if (/^\d{4,}$/.test(lastRaw)) {
        const frontNumbersBase = toValidNumbers(numericRaw.slice(0, -1));
        const splitPlans = [];

        if (lastRaw.length >= 4) {
          splitPlans.push({
            numPart: lastRaw.slice(0, 2),
            amountPart: lastRaw.slice(2),
          });
        }
        if (lastRaw.length >= 5) {
          splitPlans.push({
            numPart: lastRaw.slice(0, 2),
            amountPart: lastRaw.slice(-2),
          });
          splitPlans.push({
            numPart: lastRaw.slice(0, 2),
            amountPart: lastRaw.slice(-3),
          });
        }

        for (const plan of splitPlans) {
          const numVal = parseInt(plan.numPart, 10);
          const amountVal = parseInt(plan.amountPart, 10);
          if (!Number.isFinite(numVal) || numVal < 1 || numVal > 49) continue;
          if (!Number.isFinite(amountVal) || amountVal <= 0) continue;
          const numToken = numVal < 10 ? `0${numVal}` : String(numVal);
          const frontNumbers = frontNumbersBase.concat(numToken);
          if (frontNumbers.length < 2) continue;
          const structured = `${frontNumbers.join('.')}各${String(amountVal)}`;
          candidates.add(region ? `${region}\n${structured}` : structured);
        }
      }
    }

    if (amount) {
      const frontNumbers = toValidNumbers(numericRaw);
      if (frontNumbers.length >= 2) {
        const structured = `${frontNumbers.join('.')}各${amount}`;
        candidates.add(region ? `${region}\n${structured}` : structured);
      }
    }

    return Array.from(candidates).slice(0, 4);
  }

  buildStructuredTextFromTesseractData(data) {
    if (!data || typeof data !== 'object') return '';

    const words = Array.isArray(data.words) ? data.words : [];
    if (words.length > 0) {
      const normalizedWords = words
        .map((word) => {
          const text = String(word && word.text ? word.text : '').trim();
          const bbox = word && word.bbox ? word.bbox : {};
          const x0 = Number.isFinite(bbox.x0) ? bbox.x0 : 0;
          const x1 = Number.isFinite(bbox.x1) ? bbox.x1 : x0;
          const y0 = Number.isFinite(bbox.y0) ? bbox.y0 : 0;
          const y1 = Number.isFinite(bbox.y1) ? bbox.y1 : y0;
          const h = Math.max(1, y1 - y0);
          const centerY = y0 + h / 2;
          return { text, x0, x1, y0, y1, h, centerY };
        })
        .filter(item => item.text.length > 0);

      if (normalizedWords.length > 0) {
        const lines = this.clusterWordsIntoLines(normalizedWords);
        const joined = lines.map(line => this.joinLineWordsWithGap(line)).filter(Boolean);
        if (joined.length > 0) {
          return joined.join('\n');
        }
      }
    }

    const lineItems = Array.isArray(data.lines) ? data.lines : [];
    if (lineItems.length > 0) {
      return lineItems
        .map(line => String(line && line.text ? line.text : '').trim())
        .filter(Boolean)
        .join('\n');
    }

    return String(data.text || '').trim();
  }

  clusterWordsIntoLines(words) {
    const sorted = words.slice().sort((a, b) => {
      if (Math.abs(a.centerY - b.centerY) <= 1) return a.x0 - b.x0;
      return a.centerY - b.centerY;
    });

    const heights = sorted.map(item => item.h).sort((a, b) => a - b);
    const medianHeight = heights.length > 0 ? heights[Math.floor(heights.length / 2)] : 16;
    const yThreshold = Math.max(4, Math.round(medianHeight * 0.38));

    const lines = [];
    sorted.forEach((word) => {
      let target = null;
      let targetDiff = Number.POSITIVE_INFINITY;
      for (const line of lines) {
        const diff = Math.abs(word.centerY - line.centerY);
        if (diff <= yThreshold && diff < targetDiff) {
          target = line;
          targetDiff = diff;
        }
      }
      if (!target) {
        lines.push({
          centerY: word.centerY,
          words: [word],
        });
        return;
      }
      target.words.push(word);
      target.centerY = target.words.reduce((sum, item) => sum + item.centerY, 0) / target.words.length;
    });

    return lines
      .sort((a, b) => a.centerY - b.centerY)
      .map(line => line.words.sort((a, b) => a.x0 - b.x0));
  }

  joinLineWordsWithGap(words) {
    if (!Array.isArray(words) || words.length === 0) return '';
    const charWidths = words
      .map(word => Math.max(2, (word.x1 - word.x0) / Math.max(1, String(word.text || '').length)))
      .sort((a, b) => a - b);
    const lineCharWidth = charWidths.length > 0 ? charWidths[Math.floor(charWidths.length / 2)] : 8;
    const baseThreshold = Math.max(2, Math.round(lineCharWidth * 0.45));
    const numericThreshold = Math.max(2, Math.round(lineCharWidth * 0.32));

    let out = '';
    for (let i = 0; i < words.length; i += 1) {
      const current = words[i];
      if (i === 0) {
        out += current.text;
        continue;
      }
      const prev = words[i - 1];
      const gap = Math.max(0, current.x0 - prev.x1);
      const prevEndsDigit = /\d$/.test(prev.text);
      const currentStartsDigit = /^\d/.test(current.text);
      const gapThreshold = (prevEndsDigit && currentStartsDigit) ? numericThreshold : baseThreshold;
      if (gap >= gapThreshold) {
        out += ' ';
      }
      out += current.text;
    }
    return out.trim();
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

  resolvePaddleScriptPath() {
    const candidates = [];
    if (this.app && this.app.isPackaged) {
      candidates.push(path.join(process.resourcesPath, 'ocr', 'paddle_ocr_bridge.py'));
    }
    if (this.app) {
      candidates.push(path.join(this.app.getAppPath(), 'assets', 'ocr', 'paddle_ocr_bridge.py'));
    }
    candidates.push(path.join(process.cwd(), 'assets', 'ocr', 'paddle_ocr_bridge.py'));

    for (const candidate of candidates) {
      try {
        if (candidate && fs.existsSync(candidate)) return candidate;
      } catch (error) {
        // ignore
      }
    }
    return '';
  }

  getPythonLaunchers() {
    const launchers = [];
    const configured = String(process.env.OCR_PYTHON_PATH || '').trim();
    if (configured) {
      launchers.push({ cmd: configured, args: [] });
    }
    if (process.platform === 'win32') {
      launchers.push({ cmd: 'py', args: ['-3'] });
      launchers.push({ cmd: 'python', args: [] });
      launchers.push({ cmd: 'python3', args: [] });
    } else {
      launchers.push({ cmd: 'python3', args: [] });
      launchers.push({ cmd: 'python', args: [] });
    }

    const uniq = new Map();
    launchers.forEach((item) => {
      const key = `${item.cmd}|${(item.args || []).join(' ')}`;
      if (!uniq.has(key)) {
        uniq.set(key, item);
      }
    });
    return Array.from(uniq.values());
  }

  runProcessCapture(command, args, timeoutMs = 20000) {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let settled = false;
      let timer = null;

      const finalize = (payload) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        resolve({
          ok: false,
          code: -1,
          stdout,
          stderr,
          message: '',
          ...(payload || {}),
        });
      };

      let child;
      try {
        child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (error) {
        finalize({
          ok: false,
          message: error && error.message ? error.message : '进程启动失败',
        });
        return;
      }

      timer = setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch (error) {
          // ignore
        }
        finalize({
          ok: false,
          message: `进程超时（${timeoutMs}ms）`,
        });
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        stdout += String(chunk || '');
      });
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk || '');
      });
      child.on('error', (error) => {
        finalize({
          ok: false,
          message: error && error.message ? error.message : '进程运行失败',
        });
      });
      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        resolve({
          ok: code === 0,
          code: Number.isFinite(code) ? code : -1,
          stdout,
          stderr,
          message: code === 0 ? '' : `进程退出码 ${code}`,
        });
      });
    });
  }

  parseJsonPayloadFromOutput(output) {
    const raw = String(output || '').trim();
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (error) {
      // ignore
    }

    const lines = raw
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i];
      if (!line.startsWith('{') || !line.endsWith('}')) continue;
      try {
        return JSON.parse(line);
      } catch (error) {
        // ignore
      }
    }

    const left = raw.lastIndexOf('{');
    const right = raw.lastIndexOf('}');
    if (left >= 0 && right > left) {
      try {
        return JSON.parse(raw.slice(left, right + 1));
      } catch (error) {
        // ignore
      }
    }
    return null;
  }

  pickBetterOcrError(existing, incoming) {
    const current = String(existing || '').trim();
    const next = String(incoming || '').trim();
    if (!next) return current;
    if (!current) return next;

    const rank = (message) => {
      const text = String(message || '');
      if (/缺少依赖|No module named|ImportError|ModuleNotFoundError/i.test(text)) return 5;
      if (/初始化 PaddleOCR 失败|PaddleOCR/i.test(text)) return 4;
      if (/超时|timeout/i.test(text)) return 3;
      if (/ENOENT|not found|退出码/i.test(text)) return 1;
      return 2;
    };
    return rank(next) >= rank(current) ? next : current;
  }

  async tryPaddleOcr(imagePath, payload = {}) {
    const scriptPath = this.resolvePaddleScriptPath();
    if (!scriptPath) {
      return {
        success: false,
        message: '强识别引擎未就绪（缺少 paddle_ocr_bridge.py）',
        candidates: [],
      };
    }

    const launchers = this.getPythonLaunchers();
    if (!launchers.length) {
      return {
        success: false,
        message: '强识别引擎不可用（未找到 Python 运行环境）',
        candidates: [],
      };
    }

    const mode = payload.mode === 'structured' ? 'structured' : 'general';
    const handwriting = payload.handwriting === true;
    const customTimeout = Number(payload && payload.paddleTimeoutMs);
    const timeoutMs = Number.isFinite(customTimeout) && customTimeout > 0
      ? Math.max(8000, Math.min(90000, customTimeout))
      : (handwriting ? 32000 : 22000);

    let lastError = '强识别引擎不可用';
    for (const launcher of launchers) {
      const args = [
        ...(launcher.args || []),
        scriptPath,
        '--image',
        imagePath,
        '--mode',
        mode,
      ];
      if (handwriting) {
        args.push('--handwriting');
      }

      const result = await this.runProcessCapture(launcher.cmd, args, timeoutMs);
      const parsed = this.parseJsonPayloadFromOutput(result.stdout);

      if (!result.ok && !parsed) {
        lastError = this.pickBetterOcrError(
          lastError,
          result.stderr || result.message || '强识别进程执行失败'
        );
        continue;
      }

      if (!parsed || typeof parsed !== 'object') {
        lastError = this.pickBetterOcrError(
          lastError,
          result.stderr || result.message || '强识别返回格式异常'
        );
        continue;
      }

      if (parsed.success !== true) {
        lastError = this.pickBetterOcrError(
          lastError,
          parsed.message
            ? `强识别失败：${parsed.message}`
            : (result.stderr || result.message || '强识别失败')
        );
        continue;
      }

      const candidateInputs = [];
      if (Array.isArray(parsed.candidates)) {
        parsed.candidates.forEach((item) => {
          candidateInputs.push({
            rawText: String(item && item.text ? item.text : ''),
            avgConfidence: Number(item && item.avgConfidence),
          });
        });
      }
      const rawLines = Array.isArray(parsed.lines) ? parsed.lines : [];
      const mergedLineText = rawLines
        .map(line => String(line && line.text ? line.text : '').trim())
        .filter(Boolean)
        .join('\n');
      candidateInputs.unshift({
        rawText: String(parsed.text || mergedLineText || ''),
        avgConfidence: Number(parsed.avgConfidence),
      });

      const paddleScored = [];
      candidateInputs.forEach((item, index) => {
        const normalized = this.normalizeOcrText(item.rawText);
        if (!normalized) return;

        const confidenceBoost = Number.isFinite(item.avgConfidence)
          ? Math.max(-8, Math.min(18, (item.avgConfidence - 0.5) * 24))
          : 0;
        const baseScore = this.scoreNormalizedText(normalized);
        const preferPrimary = index === 0 ? 1.5 : 0;
        const score = baseScore + 20 + confidenceBoost + preferPrimary;

        paddleScored.push({
          text: normalized,
          score,
          source: 'paddle-local',
          psm: 'paddle',
        });
      });

      const ranked = this.selectTopCandidates(paddleScored, 4);
      const best = ranked[0] || null;
      if (!best) {
        lastError = this.pickBetterOcrError(lastError, '强识别未提取到结构化文本');
        continue;
      }

      return {
        success: true,
        text: best.text,
        score: best.score,
        source: 'paddle-local',
        candidates: ranked,
      };
    }

    return {
      success: false,
      message: lastError,
      candidates: [],
    };
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
      .replace(/[Ｂb]/g, '8')
      .replace(/\t/g, ' ')
      .replace(/[ ]{2,}/g, ' ');

    const normalizedLines = this.extractStructuredLinesFromText(text);
    const fallbackLines = this.extractLooseFallbackLines(text);
    const repairedFallback = this.normalizeFallbackLinesForStructuredMode(fallbackLines);

    if (normalizedLines.length === 0) {
      if (repairedFallback.length > 0) {
        return repairedFallback.join('\n');
      }
      return '';
    }

    if (normalizedLines.length > 0 && normalizedLines.length <= 2 && repairedFallback.length > normalizedLines.length) {
      const merged = normalizedLines.slice();
      for (const line of repairedFallback) {
        if (!merged.includes(line)) {
          merged.push(line);
        }
      }
      return merged.join('\n');
    }

    return normalizedLines.join('\n');
  }

  normalizeFallbackLinesForStructuredMode(lines) {
    const output = [];
    const seen = new Set();
    for (const line of Array.isArray(lines) ? lines : []) {
      const repaired = this.repairNoisyHandwrittenLine(line);
      if (!repaired) continue;
      const structured = this.normalizeParserCompatibleLine(repaired);
      if (!structured) continue;
      if (/[A-Za-z]/.test(structured)) continue;
      if (!/[\d各号澳奥香港老新鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(structured)) continue;
      if (seen.has(structured)) continue;
      seen.add(structured);
      output.push(structured);
    }
    return output;
  }

  repairNoisyHandwrittenLine(line) {
    const mapped = String(line || '')
      .replace(/[ＯOo]/g, '0')
      .replace(/[Il｜丨]/g, '1')
      .replace(/[Zz]/g, '2')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8')
      .replace(/[GgqQ]/g, '9')
      .replace(/[^0-9０-９\u4e00-\u9fa5\s\.,，。:：~～\-—=各号]/g, ' ')
      .replace(/[，、]/g, ' ')
      .replace(/[。｡]/g, '.')
      .replace(/[ ]{2,}/g, ' ')
      .trim();
    if (!mapped) return '';
    const useful = /\d/.test(mapped) || /(澳|奥|香港|老奥|新奥|各|号|鼠|牛|虎|兔|龙|蛇|马|羊|猴|鸡|狗|猪)/.test(mapped);
    return useful ? mapped : '';
  }

  extractLooseFallbackLines(text) {
    const lines = String(text || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    const out = [];
    for (const line of lines) {
      const compact = line.replace(/\s+/g, '');
      if (!compact) continue;
      if (compact.length > 64) continue;

      const looksUseful = /\d/.test(compact) || /(澳|奥|香港|老奥|新奥|各|号)/.test(compact);
      if (!looksUseful) continue;

      const cleaned = line
        .replace(/[，、]/g, ' ')
        .replace(/[。｡]/g, '.')
        .replace(/[ ]{2,}/g, ' ')
        .trim();
      if (!cleaned) continue;
      out.push(cleaned);
    }
    return out;
  }

  extractStructuredLinesFromText(text) {
    const candidates = [];
    const rawLines = String(text || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    const expandedLines = this.expandMergedStructuredLines(rawLines);
    const stitchedLines = this.stitchBrokenAmountLines(expandedLines);
    candidates.push(...stitchedLines);

    // Global extraction: handle missing line breaks from OCR.
    if (stitchedLines.length <= 1) {
      const flattened = stitchedLines.join(' ');
      const globalMatches = flattened.match(/(?:[\u4e00-\u9fa5]{1,8}\s*)?(?:\d{1,2}[.,\s]){2,}\d{1,2}\s*(?:各(?:号)?|=|:)\s*\d{1,12}(?:[元米]|\b)/g) || [];
      candidates.push(...globalMatches);
    }

    const structured = [];
    for (const line of candidates) {
      const normalized = this.normalizeParserCompatibleLine(line);
      if (!normalized) continue;
      structured.push(normalized);
    }

    // De-duplicate while keeping order.
    const unique = [];
    const seen = new Set();
    for (const line of structured) {
      if (seen.has(line)) continue;
      seen.add(line);
      unique.push(line);
    }
    return unique;
  }

  stitchBrokenAmountLines(lines) {
    const out = [];
    for (let i = 0; i < lines.length; i += 1) {
      const current = String(lines[i] || '').trim();
      if (!current) continue;

      const currentCompact = current.replace(/\s+/g, '');
      const next = i + 1 < lines.length ? String(lines[i + 1] || '').trim() : '';
      const nextCompact = next.replace(/\s+/g, '');

      // Handle OCR line break like:
      // 09.43...23各
      // 100
      const needAmountNextLine = /(各|各号|[=:：])$/.test(currentCompact);
      const nextIsAmountOnly = /^\d{1,12}(?:[元米])?$/.test(nextCompact);
      if (needAmountNextLine && nextIsAmountOnly) {
        out.push(`${current}${nextCompact}`);
        i += 1;
        continue;
      }

      out.push(current);
    }
    return out;
  }

  expandMergedStructuredLines(lines) {
    const expanded = [];
    for (const line of lines || []) {
      const pieces = this.splitMergedChineseAmountAndNumberTail(line);
      if (pieces.length > 0) {
        expanded.push(...pieces);
      }
    }
    return expanded;
  }

  splitMergedChineseAmountAndNumberTail(line) {
    const raw = String(line || '').trim();
    if (!raw) return [];

    const compact = raw.replace(/\s+/g, '');
    const match = compact.match(/^([\u4e00-\u9fa5]+各号?)(\d{5,})$/);
    if (!match) return [raw];

    const prefix = match[1];
    const tailDigits = match[2];
    const split = this.findAmountTailSplit(tailDigits);
    if (!split) return [raw];

    return [
      `${prefix}${split.amount}`,
      split.restPairs.join(' '),
    ];
  }

  findAmountTailSplit(tailDigits) {
    const digits = String(tailDigits || '').replace(/\D/g, '');
    if (digits.length < 7) return null;

    const candidates = [];
    const maxAmountLen = Math.min(12, digits.length - 4);
    for (let amountLen = 1; amountLen <= maxAmountLen; amountLen += 1) {
      const amount = digits.slice(0, amountLen);
      const rest = digits.slice(amountLen);
      if (rest.length < 6 || rest.length % 2 !== 0) continue;

      const restPairs = [];
      let valid = true;
      for (let i = 0; i < rest.length; i += 2) {
        const pair = rest.slice(i, i + 2);
        const n = parseInt(pair, 10);
        if (!Number.isFinite(n) || n < 1 || n > 49) {
          valid = false;
          break;
        }
        restPairs.push(pair);
      }
      if (!valid || restPairs.length < 3) continue;

      candidates.push({
        amount: amount.replace(/^0+/, '') || '0',
        amountLen,
        restPairs,
      });
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      const aPenalty = a.amountLen <= 3 ? 0 : 1;
      const bPenalty = b.amountLen <= 3 ? 0 : 1;
      if (aPenalty !== bPenalty) return aPenalty - bPenalty;
      if (a.amountLen !== b.amountLen) return a.amountLen - b.amountLen;
      return b.restPairs.length - a.restPairs.length;
    });
    return candidates[0];
  }

  normalizeParserCompatibleLine(line) {
    const raw = String(line || '').trim();
    if (!raw) return '';

    const normalizedRegion = this.normalizeRegionLine(raw);
    if (normalizedRegion) {
      return normalizedRegion;
    }

    if (this.isSummaryNoiseLine(raw)) {
      return '';
    }

    const structuredAmount = this.normalizeStructuredLine(raw);
    if (structuredAmount) {
      return structuredAmount;
    }

    const numericOnly = this.normalizeNumericOnlyLine(raw);
    if (numericOnly) {
      return numericOnly;
    }

    return '';
  }

  isSummaryNoiseLine(line) {
    const compact = String(line || '')
      .replace(/\s+/g, '')
      .replace(/[，。；;,.]/g, '')
      .trim();
    if (!compact) return false;
    return /^(合计|总计|累计|共|总)[:：=]?[0-9０-９零〇一二两三四五六七八九十百千万]+(?:元|米|块|蚊)?$/.test(compact);
  }

  normalizeRegionLine(line) {
    const compact = String(line || '').replace(/\s+/g, '');
    if (!compact) return '';
    if (compact === '澳' || compact === '奥' || compact === '澳门' || compact === '新奥') return '澳';
    if (compact === '老奥') return '老奥';
    if (compact === '香港' || compact === '香' || compact === '港') return '香港';
    return '';
  }

  normalizeStructuredLine(line) {
    if (!line) return '';

    const raw = String(line);
    const compact = raw
      .replace(/\s+/g, '')
      .replace(/[,，]/g, '.')
      .replace(/[。｡]/g, '.')
      .replace(/各号/g, '各');

    const amountTokenCharset = '0-9０-９零〇一二两三四五六七八九十百千万';
    const explicitAmount = compact.match(new RegExp(`各[:：]?([${amountTokenCharset}]{1,12})(?:元|米)?`));
    let amount = '';
    let amountIndex = -1;
    if (explicitAmount) {
      amount = explicitAmount[1];
      amountIndex = explicitAmount.index;
    } else {
      // Fallback for cases like "17.19.10.15.27 25"
      const implicit = compact.match(new RegExp(`([${amountTokenCharset}]{1,12})(?:元|米)?$`));
      if (!implicit) return '';
      amount = implicit[1];
      amountIndex = compact.lastIndexOf(amount);
    }

    amount = this.sanitizeAmount(amount, raw);
    if (!amount) return '';

    const prefixRaw = compact.slice(0, amountIndex);
    const numberPartRaw = prefixRaw
      .replace(/[^\u4e00-\u9fa50-9.,]/g, '')
      .replace(/,+/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\./, '')
      .replace(/\.$/, '');

    if (!numberPartRaw) return '';

    const chinesePrefix = numberPartRaw.replace(/[0-9.,]/g, '');
    if (chinesePrefix) {
      // Keep textual tokens (生肖/属性) for parser's extractNumbers.
      return `${chinesePrefix}各号${amount}`;
    }

    let tokens = [];
    if (numberPartRaw.includes('.')) {
      tokens = numberPartRaw
        .split('.')
        .map(token => token.trim())
        .filter(Boolean);
    } else if (/^\d+$/.test(numberPartRaw) && numberPartRaw.length % 2 === 0) {
      for (let i = 0; i < numberPartRaw.length; i += 2) {
        tokens.push(numberPartRaw.slice(i, i + 2));
      }
    } else {
      return '';
    }

    const formatted = [];
    for (const rawToken of tokens) {
      const pure = rawToken.replace(/\D/g, '');
      if (!pure) continue;
      const token = pure.length === 1 ? `0${pure}` : pure.slice(0, 2);
      const value = parseInt(token, 10);
      if (!Number.isFinite(value) || value < 1 || value > 49) {
        return '';
      }
      formatted.push(token);
    }

    if (formatted.length < 2) return '';
    return `${formatted.join('.')}各${amount}`;
  }

  normalizeNumericOnlyLine(line) {
    const compact = String(line || '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[,，]/g, ' ')
      .replace(/[。｡]/g, ' ');
    if (!compact) return '';
    if (/[各:=]/.test(compact)) return '';
    if (/[\u4e00-\u9fa5]/.test(compact)) return '';

    const pureDigits = compact.replace(/[.\s]/g, '');
    if (/^\d+$/.test(pureDigits) && pureDigits.length >= 4 && pureDigits.length % 2 === 0) {
      const paired = [];
      for (let i = 0; i < pureDigits.length; i += 2) {
        const part = pureDigits.slice(i, i + 2);
        const n = parseInt(part, 10);
        if (!Number.isFinite(n) || n < 1 || n > 49) {
          return '';
        }
        paired.push(n < 10 ? `0${n}` : String(n));
      }
      if (paired.length >= 2) {
        return paired.join(' ');
      }
    }

    const parts = compact
      .split(/[\s.]+/)
      .map(token => token.trim())
      .filter(Boolean);
    if (parts.length < 2) return '';

    const normalized = [];
    for (const part of parts) {
      if (!/^\d{1,2}$/.test(part)) return '';
      const n = parseInt(part, 10);
      if (!Number.isFinite(n) || n < 1 || n > 49) return '';
      normalized.push(n < 10 ? `0${n}` : String(n));
    }
    return normalized.join(' ');
  }

  sanitizeAmount(amountRaw, lineRaw) {
    const value = this.parseAmountToken(amountRaw);
    if (!Number.isFinite(value) || value <= 0) return '';
    // 数值保持原样，不做位数限制或自动截断。
    return String(value);
  }

  parseAmountToken(tokenRaw) {
    const raw = String(tokenRaw || '').trim();
    if (!raw) return NaN;

    const normalizedDigits = raw.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248));
    if (/^\d+$/.test(normalizedDigits)) {
      return parseInt(normalizedDigits, 10);
    }

    const chineseNumber = normalizedDigits.replace(/[^零〇一二两三四五六七八九十百千万]/g, '');
    if (!chineseNumber) return NaN;
    return this.chineseToNumber(chineseNumber);
  }

  chineseToNumber(chinese) {
    if (!chinese) return NaN;
    const digitMap = {
      '零': 0,
      '〇': 0,
      '一': 1,
      '二': 2,
      '两': 2,
      '三': 3,
      '四': 4,
      '五': 5,
      '六': 6,
      '七': 7,
      '八': 8,
      '九': 9,
    };
    const unitMap = {
      '十': 10,
      '百': 100,
      '千': 1000,
      '万': 10000,
    };

    let total = 0;
    let section = 0;
    let number = 0;

    for (const ch of chinese) {
      if (Object.prototype.hasOwnProperty.call(digitMap, ch)) {
        number = digitMap[ch];
        continue;
      }
      const unit = unitMap[ch];
      if (!unit) continue;

      if (unit === 10000) {
        section = (section + (number || 0)) * unit;
        total += section;
        section = 0;
        number = 0;
        continue;
      }

      const base = number === 0 ? 1 : number;
      section += base * unit;
      number = 0;
    }

    return total + section + number;
  }

  scoreNormalizedText(text) {
    const normalized = String(text || '');
    if (!normalized) return 0;

    const digits = (normalized.match(/\d/g) || []).length;
    const twoDigitTokens = (normalized.match(/(?:^|[.\s])\d{2}(?=$|[.\s])/g) || []).length;
    const amountTokenPattern = '(?:\\d+|[零〇一二两三四五六七八九十百千万]+)';
    const structured = (normalized.match(new RegExp(`(?:\\d{2}[.\\s])+\\d{2}(?:\\s*各${amountTokenPattern})?`, 'g')) || []).length;
    const amountLineCount = (normalized.match(new RegExp(`各${amountTokenPattern}`, 'g')) || []).length;
    const numericOnlyLines = normalized
      .split('\n')
      .map(line => line.trim())
      .filter(line => /^[\d.\s]+$/.test(line) && /\d/.test(line))
      .length;
    const lineCount = normalized.split('\n').map(line => line.trim()).filter(Boolean).length;
    const regionHintCount = (normalized.match(/^(?:澳|老奥|香港)$/gm) || []).length;
    const textAmountLineCount = normalized
      .split('\n')
      .map(line => line.trim())
      .filter(line => /[\u4e00-\u9fa5]/.test(line) && new RegExp(`各${amountTokenPattern}`).test(line))
      .length;

    const invalidChars = (normalized.match(/[^\d\s\.～:各\u4e00-\u9fa5]/g) || []).length;

    let score = 0;
    score += Math.min(36, digits * 1.8);
    score += structured * 16;
    score += amountLineCount * 15;
    score += numericOnlyLines * 5;
    score += textAmountLineCount * 8;
    score += regionHintCount * 6;
    score += Math.min(16, lineCount * 3);
    score += Math.min(28, twoDigitTokens * 2.4);
    score -= Math.min(24, invalidChars * 3);
    if (lineCount === 1 && amountLineCount <= 1) {
      score -= 10;
    }
    if (digits <= 6) {
      score -= 18;
    }
    if (twoDigitTokens < 3) {
      score -= 12;
    }
    return Math.max(0, score);
  }
}

module.exports = OcrService;
