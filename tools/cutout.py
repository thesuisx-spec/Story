#!/usr/bin/env python3
"""Вырезает персонажа с однотонного фона (белого или серого) в прозрачный PNG.

  python3 tools/cutout.py вход.jpg выход.png [--box x0 y0 x1 y1] [--tol 18]

Фон определяется по цвету углов; прозрачным становится только фон, связанный с краем
картинки, а из оставшегося берётся самая большая фигура — так отсекаются подписи и мусор.
"""
import argparse
from collections import deque

import numpy as np
from PIL import Image, ImageFilter


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("out")
    p.add_argument("--box", nargs=4, type=int)
    p.add_argument("--tol", type=float, default=18)
    p.add_argument("--height", type=int, default=0, help="масштабировать до этой высоты")
    a = p.parse_args()

    im = Image.open(a.src).convert("RGB")
    if a.box:
        im = im.crop(a.box)
    px = np.asarray(im).astype(np.int16)
    h, w, _ = px.shape
    corners = np.array([px[2, 2], px[2, w - 3], px[h - 3, 2], px[h - 3, w - 3]])
    bg = np.median(corners, axis=0)
    # близко к цвету фона и почти без насыщенности
    dist = np.abs(px - bg).max(axis=2)
    sat = px.max(axis=2) - px.min(axis=2)
    bgish = (dist < a.tol) & (sat < 14)

    # фон, связанный с краем
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bgish[y, x]:
                q.append((y, x)); seen[y, x] = True
    for y in range(h):
        for x in (0, w - 1):
            if bgish[y, x] and not seen[y, x]:
                q.append((y, x)); seen[y, x] = True
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and bgish[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    fg = ~seen

    # оставить самую большую фигуру
    label = np.zeros((h, w), np.int32)
    best, best_n, cur = 0, 0, 0
    for y0 in range(h):
        for x0 in range(w):
            if fg[y0, x0] and not label[y0, x0]:
                cur += 1; n = 0
                label[y0, x0] = cur; q.append((y0, x0))
                while q:
                    y, x = q.popleft(); n += 1
                    for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                        if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and not label[ny, nx]:
                            label[ny, nx] = cur; q.append((ny, nx))
                if n > best_n:
                    best, best_n = cur, n
    mask = Image.fromarray(((label == best) * 255).astype(np.uint8))
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert("RGBA")
    out.putalpha(mask)
    out = out.crop(out.getbbox())
    if a.height:
        out = out.resize((round(out.width * a.height / out.height), a.height), Image.LANCZOS)
    out.save(a.out)
    print(a.out, out.size)


if __name__ == "__main__":
    main()
