## Embedded AI Model

This directory stores the bundled offline semantic-correction model used by the Electron app.

- Model ID: `Mozilla/Qwen2.5-0.5B-Instruct`
- Runtime: `@huggingface/transformers`
- Quantization: `q4f16`

The packaged app copies this folder to `resources/ai/` via `electron-builder.extraResources`.
