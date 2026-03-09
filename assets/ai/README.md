## Embedded AI Models

This directory stores the bundled offline models used by the Electron app.

- Semantic correction
  - Model ID: `Mozilla/Qwen2.5-0.5B-Instruct`
  - Runtime: `@huggingface/transformers`
  - Quantization: `q4f16`
- Voice transcription
  - Model ID: `Xenova/whisper-base`
  - Runtime: `@huggingface/transformers`
  - Quantization: `q4f16`

The packaged app copies this folder to `resources/ai/` via `electron-builder.extraResources`.
