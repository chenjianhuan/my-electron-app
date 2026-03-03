#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import sys
from typing import Any, Dict, List, Tuple


def emit(payload: Dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False))


def normalize_text(text: str) -> str:
    return (
        str(text or "")
        .replace("\r", "\n")
        .replace("，", ",")
        .replace("。", ".")
        .replace("：", ":")
        .strip()
    )


def quick_score(text: str, avg_conf: float, mode: str) -> float:
    value = normalize_text(text)
    if not value:
        return -9999.0
    digits = sum(1 for ch in value if ch.isdigit())
    anchors = 0
    for token in ("各", "各号", "澳", "奥", "香港", "老奥", "新奥"):
        if token in value:
            anchors += 1
    two_digit_tokens = 0
    parts = value.replace(",", " ").replace(".", " ").split()
    for part in parts:
        if part.isdigit() and len(part) == 2:
            two_digit_tokens += 1
    ascii_noise = sum(1 for ch in value if ("a" <= ch.lower() <= "z"))
    line_count = len([line for line in value.split("\n") if line.strip()])

    score = 0.0
    score += digits * 1.9
    score += anchors * 18
    score += two_digit_tokens * 3.0
    score += max(0.0, avg_conf) * 24
    score += min(12.0, line_count * 2.5)
    score -= ascii_noise * 2.8

    if mode == "structured":
        if digits < 4:
            score -= 16
        if anchors == 0 and two_digit_tokens < 3:
            score -= 12
    return score


def extract_lines(result: Any) -> Tuple[str, float, List[Dict[str, Any]]]:
    lines: List[Dict[str, Any]] = []
    blocks = result if isinstance(result, list) else []
    for block in blocks:
        if not isinstance(block, list):
            continue
        for item in block:
            if not isinstance(item, list) or len(item) < 2:
                continue
            box = item[0]
            rec = item[1]
            if not isinstance(rec, (list, tuple)) or len(rec) < 2:
                continue
            text = normalize_text(str(rec[0] if rec[0] is not None else ""))
            if not text:
                continue
            try:
                conf = float(rec[1])
            except Exception:
                conf = 0.0
            cx = 0.0
            cy = 0.0
            if isinstance(box, list) and box:
                xs = []
                ys = []
                for p in box:
                    if isinstance(p, (list, tuple)) and len(p) >= 2:
                        try:
                            xs.append(float(p[0]))
                            ys.append(float(p[1]))
                        except Exception:
                            pass
                if xs and ys:
                    cx = sum(xs) / len(xs)
                    cy = sum(ys) / len(ys)
            lines.append({
                "text": text,
                "confidence": conf,
                "cx": cx,
                "cy": cy,
            })

    if not lines:
        return "", 0.0, []

    lines.sort(key=lambda row: (round(row["cy"] / 6.0), row["cx"]))
    text = "\n".join([row["text"] for row in lines]).strip()
    avg_conf = sum(row["confidence"] for row in lines) / max(1, len(lines))
    for row in lines:
        row.pop("cx", None)
        row.pop("cy", None)
    return text, avg_conf, lines


def build_variants(image_path: str, handwriting: bool) -> List[Tuple[str, Any]]:
    import cv2  # type: ignore

    image = cv2.imread(image_path)
    if image is None:
        return []

    variants: List[Tuple[str, Any]] = [("origin", image)]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    normalized = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
    variants.append(("gray_norm", cv2.cvtColor(normalized, cv2.COLOR_GRAY2BGR)))

    if handwriting:
        blur = cv2.GaussianBlur(normalized, (3, 3), 0)
        adaptive = cv2.adaptiveThreshold(
            blur,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            35,
            11,
        )
        variants.append(("adaptive_bw", cv2.cvtColor(adaptive, cv2.COLOR_GRAY2BGR)))
        inv = 255 - adaptive
        variants.append(("adaptive_inv", cv2.cvtColor(inv, cv2.COLOR_GRAY2BGR)))

    return variants


def run() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True, help="image file path")
    parser.add_argument("--mode", default="structured", choices=["structured", "general"])
    parser.add_argument("--handwriting", action="store_true")
    args = parser.parse_args()

    image_path = os.path.abspath(args.image)
    if not os.path.exists(image_path):
        emit({
            "success": False,
            "message": f"图片不存在: {image_path}",
        })
        return 1

    try:
        from paddleocr import PaddleOCR  # type: ignore
        import cv2  # type: ignore  # noqa
    except Exception as error:
        emit({
            "success": False,
            "message": f"缺少依赖: {error}",
        })
        return 2

    try:
        ocr = PaddleOCR(
            use_angle_cls=True,
            lang="ch",
            use_gpu=False,
            show_log=False,
        )
    except Exception as error:
        emit({
            "success": False,
            "message": f"初始化 PaddleOCR 失败: {error}",
        })
        return 3

    variants = build_variants(image_path, args.handwriting)
    if not variants:
        emit({
            "success": False,
            "message": "图片读取失败",
        })
        return 4

    candidates: List[Dict[str, Any]] = []
    for variant_name, variant_img in variants:
        try:
            raw_result = ocr.ocr(variant_img, cls=True)
        except Exception:
            continue
        text, avg_conf, lines = extract_lines(raw_result)
        if not text:
            continue
        score = quick_score(text, avg_conf, args.mode)
        candidates.append({
            "variant": variant_name,
            "text": text,
            "avgConfidence": avg_conf,
            "lineCount": len(lines),
            "score": score,
            "lines": lines,
        })

    if not candidates:
        emit({
            "success": False,
            "message": "PaddleOCR 未识别到文本",
        })
        return 5

    candidates.sort(key=lambda item: item.get("score", -9999), reverse=True)
    best = candidates[0]
    emit({
        "success": True,
        "backend": "paddleocr",
        "text": best.get("text", ""),
        "avgConfidence": float(best.get("avgConfidence", 0.0)),
        "lineCount": int(best.get("lineCount", 0)),
        "lines": best.get("lines", []),
        "candidates": candidates[:4],
    })
    return 0


if __name__ == "__main__":
    sys.exit(run())
