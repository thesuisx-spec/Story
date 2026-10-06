#!/usr/bin/env python3
"""Готовит картинки для игры: assets/bg/*.jpg и assets/chars/*/*.png → web/img/… в WebP.

  python3 tools/build_web_assets.py
"""
import glob
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "web", "img")

BG_WIDTH = 1600
SPRITE_HEIGHT = 1000


def save(im, path, **kw):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "WEBP", method=6, **kw)
    print(os.path.relpath(path, ROOT), im.size, f"{os.path.getsize(path) // 1024} KB")


def main():
    for f in sorted(glob.glob(os.path.join(ROOT, "assets", "bg", "*.jpg"))):
        name = os.path.splitext(os.path.basename(f))[0]
        if name.endswith("-gemini"):
            continue
        im = Image.open(f).convert("RGB")
        if im.width > BG_WIDTH:
            im = im.resize((BG_WIDTH, round(im.height * BG_WIDTH / im.width)), Image.LANCZOS)
        save(im, os.path.join(OUT, "bg", name + ".webp"), quality=82)

    for f in sorted(glob.glob(os.path.join(ROOT, "assets", "chars", "*", "*.png"))):
        who = os.path.basename(os.path.dirname(f))
        emo = os.path.splitext(os.path.basename(f))[0]
        im = Image.open(f).convert("RGBA")
        if im.height > SPRITE_HEIGHT:
            im = im.resize((round(im.width * SPRITE_HEIGHT / im.height), SPRITE_HEIGHT), Image.LANCZOS)
        save(im, os.path.join(OUT, "chars", who, emo + ".webp"), quality=88, alpha_quality=90)


if __name__ == "__main__":
    main()
