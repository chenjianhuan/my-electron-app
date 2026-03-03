# OCR Data Bundle

Place offline Tesseract language data files in this folder before packaging.

Required files for this project:
- tessdata/chi_sim.traineddata.gz
- tessdata/eng.traineddata.gz

At runtime the app will first try to load offline tessdata from packaged resources:
- resources/ocr/tessdata

If files are missing, OCR can still run via online fallback when configured.

## Strong OCR Backend (Recommended)

This project now supports a stronger offline engine via PaddleOCR:

- bridge script: `assets/ocr/paddle_ocr_bridge.py`
- runtime order: PaddleOCR -> local Tesseract -> online fallback

### Install (macOS)

```bash
python3 -m venv .venv-ocr
source .venv-ocr/bin/activate
pip install --upgrade pip
pip install paddlepaddle paddleocr opencv-python
```

Then start app with:

```bash
OCR_PYTHON_PATH=/Users/yourname/Downloads/my-electron-app/.venv-ocr/bin/python npm start
```

Notes:

- If `OCR_PYTHON_PATH` is not set, app will auto-try `python3` / `python`.
- If PaddleOCR is unavailable, app automatically falls back to existing OCR chain.
