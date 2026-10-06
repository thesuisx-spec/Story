#!/usr/bin/env python3
"""Генерация картинок через Gemini (Nano Banana) для новеллы 鈴の約束.

Ключ берётся из переменной окружения GEMINI_API_KEY.

Примеры:
  python3 tools/gen_image.py "аниме-фон: аэропорт на закате" -o assets/bg/airport.png --aspect 16:9
  python3 tools/gen_image.py "та же девушка, удивлённая" -r assets/chars/sakura/smile.png -o assets/chars/sakura/surprised.png --aspect 2:3
  python3 tools/gen_image.py --list          # какие модели с картинками доступны ключу
"""
import argparse
import base64
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request

API = "https://generativelanguage.googleapis.com/v1beta"
# Nano Banana — gemini-2.5-flash-image; Nano Banana Pro — gemini-3-pro-image-preview.
DEFAULT_MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")

# Общий стиль, чтобы все картинки игры выглядели одинаково.
STYLE = (
    "Modern anime visual novel art, clean lineart, soft cel shading, "
    "cinematic soft lighting, high detail. No text, no letters, no watermark."
)


def call(path, payload=None):
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        sys.exit("Нет GEMINI_API_KEY: добавьте ключ в переменные окружения среды.")
    req = urllib.request.Request(
        f"{API}/{path}",
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={"x-goog-api-key": key, "Content-Type": "application/json"},
        method="POST" if payload is not None else "GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"Ошибка API {e.code}: {e.read().decode(errors='replace')[:800]}")


def list_models():
    data = call("models?pageSize=1000")
    for m in data.get("models", []):
        name = m["name"].removeprefix("models/")
        if "image" in name:
            print(name, "—", m.get("displayName", ""))


def generate(prompt, out, refs, aspect, model, raw):
    parts = [{"text": prompt if raw else f"{prompt}\n\nStyle: {STYLE}"}]
    for ref in refs:
        mime = mimetypes.guess_type(ref)[0] or "image/png"
        with open(ref, "rb") as f:
            parts.append({"inline_data": {"mime_type": mime, "data": base64.b64encode(f.read()).decode()}})
    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    if aspect:
        payload["generationConfig"]["imageConfig"] = {"aspectRatio": aspect}
    data = call(f"models/{model}:generateContent", payload)
    for cand in data.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            blob = part.get("inlineData") or part.get("inline_data")
            if blob:
                os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
                with open(out, "wb") as f:
                    f.write(base64.b64decode(blob["data"]))
                print(out)
                return
    sys.exit("Картинка не пришла: " + json.dumps(data, ensure_ascii=False)[:800])


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("prompt", nargs="?")
    p.add_argument("-o", "--out", help="куда сохранить PNG")
    p.add_argument("-r", "--ref", action="append", default=[], help="картинка-образец (можно несколько)")
    p.add_argument("--aspect", help="соотношение сторон: 16:9, 2:3, 1:1 …")
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--raw", action="store_true", help="не добавлять общий стиль к промпту")
    p.add_argument("--list", action="store_true", help="показать модели с генерацией картинок")
    a = p.parse_args()
    if a.list:
        return list_models()
    if not a.prompt or not a.out:
        p.error("нужны prompt и -o")
    generate(a.prompt, a.out, a.ref, a.aspect, a.model, a.raw)


if __name__ == "__main__":
    main()
