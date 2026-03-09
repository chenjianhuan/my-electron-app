const fs = require('fs');
const path = require('path');

const MODEL_ID = 'Mozilla/Qwen2.5-0.5B-Instruct';
const MODEL_DISPLAY_NAME = 'Qwen2.5-0.5B-Instruct';
const MODEL_DTYPE = 'q4f16';
const MODEL_FILES = [
  'README.md',
  'added_tokens.json',
  'config.json',
  'generation_config.json',
  'merges.txt',
  'quantize_config.json',
  'special_tokens_map.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'vocab.json',
  'onnx/model_q4f16.onnx',
  'onnx/model_q4f16.onnx_data',
];

class AiSemanticService {
  constructor(app) {
    this.app = app;
    this.generator = null;
    this.generatorPromise = null;
    this.loadError = null;
  }

  getModelRootPath() {
    if (this.app && this.app.isPackaged) {
      return path.join(process.resourcesPath, 'ai', 'models');
    }
    return path.resolve(__dirname, '../../assets/ai/models');
  }

  getModelDirPath() {
    return path.join(this.getModelRootPath(), ...MODEL_ID.split('/'));
  }

  getMissingModelHint() {
    return this.app && this.app.isPackaged
      ? '内置模型文件缺失，请重新安装软件。'
      : '内置模型文件缺失，请确认 assets/ai/models 已完整存在。';
  }

  getMissingModelFiles() {
    const modelDir = this.getModelDirPath();
    return MODEL_FILES.filter((fileName) => !fs.existsSync(path.join(modelDir, fileName)));
  }

  buildStatusBase() {
    return {
      ok: true,
      model: MODEL_DISPLAY_NAME,
      modelId: MODEL_ID,
      dtype: MODEL_DTYPE,
      modelDir: this.getModelDirPath(),
      installHint: this.getMissingModelHint(),
    };
  }

  async getStatus() {
    const base = this.buildStatusBase();
    const missingFiles = this.getMissingModelFiles();
    if (missingFiles.length > 0) {
      return {
        ...base,
        available: false,
        reason: 'missing_files',
        message: `未找到内置中文模型文件。${this.getMissingModelHint()}`,
        missingFiles: missingFiles.slice(0, 5),
      };
    }

    if (this.loadError) {
      return {
        ...base,
        available: false,
        reason: 'load_failed',
        message: `内置模型初始化失败：${this.loadError.message || '未知错误'}`,
        detail: this.loadError.stack || this.loadError.message || '未知错误',
      };
    }

    if (this.generatorPromise && !this.generator) {
      return {
        ...base,
        available: true,
        reason: 'loading',
        message: `内置中文模型加载中（${MODEL_DISPLAY_NAME}）`,
      };
    }

    return {
      ...base,
      available: true,
      reason: 'ready',
      message: this.generator
        ? `内置中文模型已加载（${MODEL_DISPLAY_NAME}）`
        : `内置中文模型已就绪（首次调用时加载，模型约 482MB）`,
    };
  }

  async rewriteMessage(payload = {}) {
    const sourceText = this.sanitizeText(payload && payload.text ? payload.text : '');
    if (!sourceText) {
      return {
        ok: false,
        available: false,
        reason: 'empty_input',
        message: '未提供可修正的文本',
      };
    }

    const status = await this.getStatus();
    if (!status.available) {
      return {
        ...status,
        ok: false,
      };
    }

    const startedAt = Date.now();
    try {
      const generator = await this.loadGenerator();
      const output = await generator(
        [
          { role: 'system', content: this.buildSystemPrompt() },
          { role: 'user', content: this.buildUserPrompt(sourceText, payload) },
        ],
        {
          max_new_tokens: 180,
          do_sample: false,
          return_full_text: false,
          repetition_penalty: 1.02,
        }
      );

      const generatedText = this.extractGeneratedText(output);
      const normalized = this.normalizeStructuredResult(generatedText);
      if (!normalized.normalizedText) {
        return {
          ok: false,
          available: true,
          reason: 'empty_result',
          message: '内置模型未返回可用修正结果',
          model: MODEL_DISPLAY_NAME,
          elapsedMs: Date.now() - startedAt,
        };
      }

      return {
        ok: true,
        available: true,
        model: MODEL_DISPLAY_NAME,
        modelId: MODEL_ID,
        normalizedText: normalized.normalizedText,
        alternatives: normalized.alternatives,
        confidence: normalized.confidence,
        shouldApply: normalized.shouldApply,
        issues: normalized.issues,
        elapsedMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        ok: false,
        available: false,
        reason: 'rewrite_failed',
        message: error && error.message ? error.message : '内置模型推理失败',
        model: MODEL_DISPLAY_NAME,
        elapsedMs: Date.now() - startedAt,
      };
    }
  }

  async loadGenerator() {
    if (this.generator) {
      return this.generator;
    }
    if (this.generatorPromise) {
      return this.generatorPromise;
    }

    this.generatorPromise = this.createGenerator();
    try {
      this.generator = await this.generatorPromise;
      this.loadError = null;
      return this.generator;
    } catch (error) {
      this.loadError = error;
      this.generatorPromise = null;
      throw error;
    }
  }

  async createGenerator() {
    const missingFiles = this.getMissingModelFiles();
    if (missingFiles.length > 0) {
      throw new Error(`内置模型缺少文件：${missingFiles.slice(0, 3).join(', ')}`);
    }

    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowRemoteModels = false;
    env.localModelPath = this.getModelRootPath();

    return pipeline('text-generation', MODEL_ID, {
      dtype: MODEL_DTYPE,
      device: 'cpu',
      local_files_only: true,
    });
  }

  buildSystemPrompt() {
    return [
      '你是桌面应用里的中文录入条目语义纠错器，只负责把杂乱/OCR/口语化文本改写成系统可解析的标准文本。',
      '必须严格遵守：',
      '1. 绝不能杜撰原文没有的数字、金额、地区、生肖或玩法。',
      '2. 只能输出一个 JSON 对象，不要使用 ``` 代码块，不要解释。',
      '3. JSON 结构必须是：{"normalizedText":"","alternatives":[],"confidence":0.0,"shouldApply":true,"issues":[]}',
      '4. 若含义明确，normalizedText 输出标准格式；若含义不明确，shouldApply 设为 false。',
      '5. 数字列表统一用英文句点分隔，例如 12.18.23各20。',
      '6. 每个号码同金额时，把“每个/每号/每码/个号/个码”统一成“各”，例如“12 18 23 每个20” => “12.18.23各20”。',
      '7. 若是生肖同额，优先用“各肖”，例如“猴蛇狗每肖10” => “猴蛇狗各肖10”。',
      '8. 多条独立录入条目请用换行分隔。',
      '9. 若提供了“待修正行”，优先只修正这些行，其他原始行尽量保持不变。',
      '10. normalizedText 必须返回完整修正后的整段文本，不要只返回局部片段。',
      '示例一输入：12 18 23 每个20',
      '示例一输出：{"normalizedText":"12.18.23各20","alternatives":[],"confidence":0.98,"shouldApply":true,"issues":[]}',
      '示例二输入：12一18一23个20',
      '示例二输出：{"normalizedText":"12.18.23各20","alternatives":[],"confidence":0.9,"shouldApply":true,"issues":[]}',
      '示例三输入：内容不完整，不确定金额归属',
      '示例三输出：{"normalizedText":"","alternatives":[],"confidence":0.2,"shouldApply":false,"issues":["金额归属不明确"]}',
    ].join('\n');
  }

  buildUserPrompt(text, payload = {}) {
    const source = String(payload && payload.source ? payload.source : 'manual').trim() || 'manual';
    const parserError = String(payload && payload.parserError ? payload.parserError : '').trim();
    const clientId = String(payload && payload.clientId ? payload.clientId : '').trim();
    const rewriteMode = String(payload && payload.rewriteMode ? payload.rewriteMode : 'full_message').trim() || 'full_message';
    const unresolvedLines = Array.isArray(payload && payload.unresolvedLines)
      ? payload.unresolvedLines
          .map((item) => ({
            lineNo: Number.isFinite(Number(item && item.lineNo)) ? Number(item.lineNo) : null,
            rawText: String(item && item.rawText ? item.rawText : '').trim(),
            reason: String(item && item.reason ? item.reason : '').trim(),
          }))
          .filter((item) => item.rawText)
          .slice(0, 12)
      : [];
    const unresolvedBlock = unresolvedLines.length > 0
      ? [
          '待修正行（优先处理，其他行尽量保持原样）：',
          ...unresolvedLines.map((item) => `第${item.lineNo || '?'}行：${item.rawText}${item.reason ? ` | 原因：${item.reason}` : ''}`),
        ].join('\n')
      : '待修正行：无';
    return [
      `来源: ${source}`,
      `当前客户: ${clientId || '未指定'}`,
      `修正模式: ${rewriteMode === 'target_unresolved' ? '优先修正未识别行' : '整段修正'}`,
      `解析报错: ${parserError || '无'}`,
      unresolvedBlock,
      '请输出符合要求的 JSON：',
      '原始全文：',
      text,
    ].join('\n');
  }

  extractGeneratedText(output) {
    const first = Array.isArray(output) ? output[0] : output;
    if (!first) return '';

    const generated = first.generated_text;
    if (typeof generated === 'string') {
      return generated;
    }
    if (Array.isArray(generated)) {
      const assistant = [...generated].reverse().find((item) => item && item.role === 'assistant');
      if (assistant && typeof assistant.content === 'string') {
        return assistant.content;
      }
    }
    return '';
  }

  normalizeStructuredResult(rawText) {
    const parsed = this.parseStructuredContent(rawText);
    let normalizedText = this.sanitizeMessageText(
      (parsed && (parsed.normalizedText || parsed.text || parsed.output)) || ''
    );
    const alternatives = this.sanitizeAlternatives(parsed && parsed.alternatives, normalizedText);
    let confidence = this.normalizeConfidence(parsed && parsed.confidence);
    let shouldApply = parsed && parsed.shouldApply !== false;
    const issues = this.sanitizeStringList(parsed && parsed.issues, 3);

    if (!normalizedText) {
      const fallback = this.extractFallbackNormalizedText(rawText);
      if (fallback) {
        normalizedText = fallback;
        confidence = Math.min(confidence || 0.35, 0.45);
        shouldApply = false;
        if (!issues.includes('模型未按 JSON 返回，已尝试回收文本')) {
          issues.push('模型未按 JSON 返回，已尝试回收文本');
        }
      }
    }

    return {
      normalizedText,
      alternatives,
      confidence,
      shouldApply,
      issues,
    };
  }

  parseStructuredContent(content) {
    const raw = String(content || '').trim();
    if (!raw) return {};

    const withoutFence = raw
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    const candidates = [withoutFence];
    const jsonMatch = withoutFence.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      candidates.unshift(jsonMatch[0]);
    }

    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        return JSON.parse(candidate);
      } catch (error) {
        // try next candidate
      }
    }

    return {};
  }

  extractFallbackNormalizedText(content) {
    const raw = String(content || '')
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    if (!raw) return '';

    const lines = raw
      .split('\n')
      .map((line) => this.sanitizeMessageText(line))
      .filter(Boolean)
      .filter((line) => !/^[\{\}\[\]":,]+$/.test(line));
    const best = lines.find((line) => /[\d鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(line));
    return best || '';
  }

  sanitizeText(value) {
    return String(value || '').replace(/\r/g, '').trim();
  }

  sanitizeMessageText(value) {
    return String(value || '')
      .replace(/\r/g, '')
      .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 65248))
      .replace(/\u3000/g, ' ')
      .replace(/[，、,]+/g, '.')
      .replace(/[。｡]+/g, '.')
      .replace(/[：]/g, ':')
      .replace(/[﹣－]/g, '-')
      .replace(/[～〜]/g, '～')
      .replace(/([0-9]{1,2})\s+(?=[0-9]{1,2}\b)/g, '$1.')
      .replace(/(?:每个号码|每个号|每个码|每个数|每个|每号|每码|个号|个码|个号码|各号)\s*(\d+(?:\.\d+)?)/g, '各$1')
      .replace(/(?:每肖|每个肖|每个生肖)\s*(\d+(?:\.\d+)?)/g, '各肖$1')
      .replace(/\s*各\s*/g, '各')
      .replace(/\s*各肖\s*/g, '各肖')
      .replace(/[ \t]+\n/g, '\n')
      .split('\n')
      .map((line) => String(line || '').trim())
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  sanitizeAlternatives(rawList, normalizedText) {
    const list = this.sanitizeStringList(rawList, 2)
      .map((item) => this.sanitizeMessageText(item))
      .filter(Boolean);
    const seen = new Set();
    const result = [];
    [normalizedText, ...list].forEach((item) => {
      if (!item || seen.has(item)) return;
      seen.add(item);
      result.push(item);
    });
    return normalizedText
      ? result.filter((item) => item !== normalizedText)
      : result;
  }

  sanitizeStringList(rawList, maxSize = 3) {
    const list = Array.isArray(rawList) ? rawList : [];
    const result = [];
    for (const item of list) {
      const text = typeof item === 'string' ? item.trim() : '';
      if (!text) continue;
      result.push(text);
      if (result.length >= maxSize) break;
    }
    return result;
  }

  normalizeConfidence(rawValue) {
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric)) return 0;
    if (numeric < 0) return 0;
    if (numeric > 1) return 1;
    return numeric;
  }
}

module.exports = AiSemanticService;
