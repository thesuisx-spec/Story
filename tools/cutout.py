#!/usr/bin/env python3
"""Вырезает персонажа с фона в прозрачный PNG.

  python3 tools/cutout.py вход.jpg выход.png [--box x0 y0 x1 y1]

Использует нейросеть rembg с моделью isnet-anime (pip install "rembg[cpu]"):
она аккуратно обрабатывает тонкие пряди волос. При первом запуске модель (~176 МБ)
скачивается в ~/.rembg. Если на картинке несколько фигур (лист с позами),
нужную вырезают через --box; из маски берётся самая большая фигура,
так что подписи и соседи отсекаются.
"""
import argparse

import numpy as np
from PIL import Image
from rembg import new_session, remove

_session = None


def largest_component(mask):
    from collections import deque
    h, w = mask.shape
    label = np.zeros((h, w), np.int32)
    best, best_n, cur = 0, 0, 0
    q = deque()
    for y0, x0 in zip(*np.nonzero(mask)):
        if label[y0, x0]:
            continue
        cur += 1
        n = 0
        label[y0, x0] = cur
        q.append((y0, x0))
        while q:
            y, x = q.popleft()
            n += 1
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not label[ny, nx]:
                    label[ny, nx] = cur
                    q.append((ny, nx))
        if n > best_n:
            best, best_n = cur, n
    return label == best


def cutout(src, out, box=None):
    global _session
    if _session is None:
        _session = new_session("isnet-anime")
    im = Image.open(src).convert("RGB")
    if box:
        im = im.crop(box)
    res = np.array(remove(im, session=_session))
    alpha = res[:, :, 3]
    alpha[alpha < 10] = 0
    # маленькая копия маски — чтобы быстро найти главную фигуру
    small = Image.fromarray(alpha).resize((max(1, alpha.shape[1] // 4), max(1, alpha.shape[0] // 4)))
    keep = largest_component(np.array(small) > 40)
    keep = np.array(Image.fromarray(keep.astype(np.uint8) * 255).resize(alpha.shape[::-1])) > 0
    # чуть расширить, чтобы не срезать мягкие края
    keep = np.array(Image.fromarray(keep.astype(np.uint8) * 255).filter(__import__("PIL.ImageFilter").ImageFilter.MaxFilter(9))) > 0
    alpha[~keep] = 0
    res[:, :, 3] = alpha
    img = Image.fromarray(res)
    img = img.crop(img.getbbox())
    img.save(out)
    print(out, img.size)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("out")
    p.add_argument("--box", nargs=4, type=int)
    a = p.parse_args()
    cutout(a.src, a.out, a.box)


if __name__ == "__main__":
    main()
