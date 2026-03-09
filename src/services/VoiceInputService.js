const fs = require('fs');
const path = require('path');

const MODEL_ID = 'Xenova/whisper-base';
const MODEL_DISPLAY_NAME = 'Whisper Base';
const MODEL_DTYPE = 'q4f16';
const TARGET_SAMPLE_RATE = 16000;
const MIN_AUDIO_SECONDS = 0.35;
const MAX_AUDIO_SECONDS = 90;
const MODEL_FILES = [
  'README.md',
  'added_tokens.json',
  'config.json',
  'generation_config.json',
  'merges.txt',
  'normalizer.json',
  'preprocessor_config.json',
  'quant_config.json',
  'quantize_config.json',
  'special_tokens_map.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'vocab.json',
  'onnx/encoder_model_q4f16.onnx',
  'onnx/decoder_model_merged_q4f16.onnx',
];

class VoiceInputService {
  constructor(app) {
    this.app = app;
    this.transcriber = null;
    this.transcriberPromise = null;
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
      ? '内置语音模型缺失，请重新安装软件。'
      : '内置语音模型缺失，请确认 assets/ai/models 已完整存在。';
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
      sampleRate: TARGET_SAMPLE_RATE,
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
        message: `未找到内置语音模型文件。${this.getMissingModelHint()}`,
        missingFiles: missingFiles.slice(0, 5),
      };
    }

    if (this.loadError) {
      return {
        ...base,
        available: false,
        reason: 'load_failed',
        message: `内置语音模型初始化失败：${this.loadError.message || '未知错误'}`,
        detail: this.loadError.stack || this.loadError.message || '未知错误',
      };
    }

    if (this.transcriberPromise && !this.transcriber) {
      return {
        ...base,
        available: true,
        reason: 'loading',
        message: `内置语音模型加载中（${MODEL_DISPLAY_NAME}）`,
      };
    }

    return {
      ...base,
      available: true,
      reason: 'ready',
      message: this.transcriber
        ? `内置语音模型已加载（${MODEL_DISPLAY_NAME}）`
        : '内置语音模型已就绪（首次语音录入时加载）',
    };
  }

  async transcribeAudio(payload = {}) {
    const audio = this.extractAudio(payload);
    if (!audio || audio.length <= 0) {
      return {
        ok: false,
        available: false,
        reason: 'empty_audio',
        message: '未收到可转写的音频数据',
      };
    }

    const sampleRate = this.normalizeSampleRate(payload && payload.sampleRate);
    const normalizedAudio = sampleRate === TARGET_SAMPLE_RATE
      ? audio
      : this.resampleAudio(audio, sampleRate, TARGET_SAMPLE_RATE);
    const trimmedAudio = this.trimSilence(normalizedAudio);
    const durationSeconds = trimmedAudio.length / TARGET_SAMPLE_RATE;

    if (!Number.isFinite(durationSeconds) || durationSeconds < MIN_AUDIO_SECONDS) {
      return {
        ok: false,
        available: true,
        reason: 'audio_too_short',
        message: '录音太短，请稍微多说一点再停止。',
        durationMs: Math.round(Math.max(0, durationSeconds) * 1000),
      };
    }

    if (durationSeconds > MAX_AUDIO_SECONDS) {
      return {
        ok: false,
        available: true,
        reason: 'audio_too_long',
        message: `单次语音最长支持 ${MAX_AUDIO_SECONDS} 秒，请分段录入。`,
        durationMs: Math.round(durationSeconds * 1000),
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
      const transcriber = await this.loadTranscriber();
      const shouldChunk = durationSeconds > 24;
      const output = await transcriber(trimmedAudio, {
        language: 'zh',
        task: 'transcribe',
        return_timestamps: false,
        chunk_length_s: shouldChunk ? 20 : 0,
        stride_length_s: shouldChunk ? 4 : 0,
      });
      const text = this.normalizeTranscript(output && output.text ? output.text : '');

      if (!text) {
        return {
          ok: false,
          available: true,
          reason: 'empty_result',
          message: '未识别到清晰语音，请重试。',
          model: MODEL_DISPLAY_NAME,
          elapsedMs: Date.now() - startedAt,
          durationMs: Math.round(durationSeconds * 1000),
        };
      }

      return {
        ok: true,
        available: true,
        model: MODEL_DISPLAY_NAME,
        modelId: MODEL_ID,
        text,
        elapsedMs: Date.now() - startedAt,
        durationMs: Math.round(durationSeconds * 1000),
        sampleRate: TARGET_SAMPLE_RATE,
      };
    } catch (error) {
      return {
        ok: false,
        available: false,
        reason: 'transcribe_failed',
        message: error && error.message ? error.message : '内置语音转写失败',
        model: MODEL_DISPLAY_NAME,
        elapsedMs: Date.now() - startedAt,
        durationMs: Math.round(durationSeconds * 1000),
      };
    }
  }

  async loadTranscriber() {
    if (this.transcriber) {
      return this.transcriber;
    }
    if (this.transcriberPromise) {
      return this.transcriberPromise;
    }

    this.transcriberPromise = this.createTranscriber();
    try {
      this.transcriber = await this.transcriberPromise;
      this.loadError = null;
      return this.transcriber;
    } catch (error) {
      this.loadError = error;
      this.transcriberPromise = null;
      throw error;
    }
  }

  async createTranscriber() {
    const missingFiles = this.getMissingModelFiles();
    if (missingFiles.length > 0) {
      throw new Error(`内置语音模型缺少文件：${missingFiles.slice(0, 3).join(', ')}`);
    }

    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowRemoteModels = false;
    env.localModelPath = this.getModelRootPath();

    return pipeline('automatic-speech-recognition', MODEL_ID, {
      dtype: MODEL_DTYPE,
      device: 'cpu',
      local_files_only: true,
    });
  }

  extractAudio(payload = {}) {
    const raw = payload && Object.prototype.hasOwnProperty.call(payload, 'audioBuffer')
      ? payload.audioBuffer
      : (payload && Array.isArray(payload.samples) ? payload.samples : null);

    if (!raw) {
      return null;
    }

    if (raw instanceof Float32Array) {
      return raw;
    }

    if (ArrayBuffer.isView(raw)) {
      const buffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
      return new Float32Array(buffer);
    }

    if (raw instanceof ArrayBuffer) {
      return new Float32Array(raw.slice(0));
    }

    if (Array.isArray(raw)) {
      return Float32Array.from(raw.map((item) => Number(item) || 0));
    }

    return null;
  }

  normalizeSampleRate(rawValue) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return TARGET_SAMPLE_RATE;
    }
    return Math.round(parsed);
  }

  resampleAudio(input, inputRate, outputRate) {
    if (!(input instanceof Float32Array) || input.length <= 0) {
      return new Float32Array();
    }
    if (!Number.isFinite(inputRate) || inputRate <= 0 || inputRate === outputRate) {
      return input.slice();
    }

    const ratio = inputRate / outputRate;
    const newLength = Math.max(1, Math.round(input.length / ratio));
    const output = new Float32Array(newLength);

    for (let i = 0; i < newLength; i += 1) {
      const start = Math.floor(i * ratio);
      const end = Math.min(input.length, Math.floor((i + 1) * ratio));
      if (end <= start) {
        output[i] = input[Math.min(start, input.length - 1)] || 0;
        continue;
      }
      let sum = 0;
      for (let j = start; j < end; j += 1) {
        sum += input[j];
      }
      output[i] = sum / (end - start);
    }

    return output;
  }

  trimSilence(input) {
    if (!(input instanceof Float32Array) || input.length <= 0) {
      return new Float32Array();
    }

    const threshold = 0.008;
    const padding = Math.round(TARGET_SAMPLE_RATE * 0.12);
    let start = 0;
    let end = input.length - 1;

    while (start < input.length && Math.abs(input[start]) < threshold) {
      start += 1;
    }
    while (end > start && Math.abs(input[end]) < threshold) {
      end -= 1;
    }

    if (start >= end) {
      return input.slice();
    }

    const safeStart = Math.max(0, start - padding);
    const safeEnd = Math.min(input.length, end + padding + 1);
    return input.slice(safeStart, safeEnd);
  }

  normalizeTranscript(text) {
    const normalized = String(text || '')
      .replace(/\s+/g, ' ')
      .replace(/[，、]/g, ' ')
      .replace(/\s*([。！？；：,.!?;:])\s*/g, '$1')
      .trim();
    return this.rewriteCompactDigitRuns(normalized);
  }

  rewriteCompactDigitRuns(text) {
    const lines = String(text || '')
      .split(/\n+/)
      .map((line) => this.rewriteCompactDigitRunsInLine(line))
      .filter((line) => line.trim());
    return lines.join('\n');
  }

  rewriteCompactDigitRunsInLine(line) {
    const safeLine = String(line || '');
    return safeLine.replace(/\d{5,}/g, (digits) => {
      const segmented = this.segmentCompactDigitRun(digits);
      return segmented.length >= 2 ? segmented.join('.') : digits;
    });
  }

  segmentCompactDigitRun(digits) {
    const text = String(digits || '').trim();
    if (!/^\d{5,}$/.test(text)) {
      return [];
    }

    const memo = new Map();
    const search = (index) => {
      if (index >= text.length) {
        return { score: 0, values: [] };
      }
      if (memo.has(index)) {
        return memo.get(index);
      }

      let best = null;
      const options = [];

      if (index + 1 <= text.length) {
        const raw = text.slice(index, index + 1);
        const value = Number(raw);
        if (value >= 1 && value <= 9) {
          options.push({ length: 1, value, score: 0.6 });
        }
      }

      if (index + 2 <= text.length) {
        const raw = text.slice(index, index + 2);
        const value = Number(raw);
        const leadingZero = raw.startsWith('0');
        if (value >= 1 && value <= 49) {
          options.push({ length: 2, value, score: leadingZero ? 1.8 : 3.2 });
        }
      }

      if (index + 3 <= text.length) {
        const raw = text.slice(index, index + 3);
        if (/^[1-4]0[1-9]$/.test(raw)) {
          const value = Number(`${raw[0]}${raw[2]}`);
          if (value >= 11 && value <= 49) {
            options.push({ length: 3, value, score: 5.4 });
          }
        }
      }

      options.forEach((option) => {
        const next = search(index + option.length);
        if (!next) return;
        const candidate = {
          score: option.score + next.score,
          values: [option.value, ...next.values],
        };
        if (!best
          || candidate.score > best.score
          || (candidate.score === best.score && candidate.values.length < best.values.length)
        ) {
          best = candidate;
        }
      });

      memo.set(index, best);
      return best;
    };

    const best = search(0);
    if (!best || !Array.isArray(best.values) || best.values.length < 2) {
      return [];
    }
    return best.values;
  }
}

module.exports = VoiceInputService;
