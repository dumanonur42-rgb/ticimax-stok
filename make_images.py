#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Urun gorsellerini YAMANSA sablonuna yerlestirir."""

import csv
import io
import os
import re
import sys
import time
from pathlib import Path

import requests
from PIL import Image

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE / "sablon.png"
OUT_DIR = HERE / "gorseller"
CSV_FILE = HERE / "output" / "urunler.csv"

CANVAS = (500, 500)
# Urunun yerlesecegi alan (sablonun ortasi, logonun altinda)
BOX = (30, 120, 470, 480)  # x1, y1, x2, y2


def load_template():
    src = Image.open(TEMPLATE).convert("RGBA")
    # Sablonun ust seridi (logo) + beyaz zemin
    canvas = Image.new("RGBA", CANVAS, (255, 255, 255, 255))
    header = src.crop((0, 0, 500, 105))
    canvas.paste(header, (0, 0))
    return canvas


def trim_white(im: Image.Image, tol=245):
    """Beyaz/bos kenarlari kirpar."""
    rgb = im.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    left, top, right, bottom = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if r < tol or g < tol or b < tol:
                left = min(left, x); right = max(right, x)
                top = min(top, y); bottom = max(bottom, y)
    if right <= left or bottom <= top:
        return im
    return im.crop((left, top, right + 1, bottom + 1))


def compose(template: Image.Image, product: Image.Image) -> Image.Image:
    out = template.copy()
    prod = trim_white(product.convert("RGBA"))
    bw, bh = BOX[2] - BOX[0], BOX[3] - BOX[1]
    pw, ph = prod.size
    scale = min(bw / pw, bh / ph)
    prod = prod.resize((max(1, int(pw * scale)), max(1, int(ph * scale))), Image.LANCZOS)
    px = BOX[0] + (bw - prod.width) // 2
    py = BOX[1] + (bh - prod.height) // 2
    out.paste(prod, (px, py), prod)
    return out.convert("RGB")


def safe_name(sku: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]+", "_", sku).strip("_") or "urun"


def main():
    OUT_DIR.mkdir(exist_ok=True)
    template = load_template()
    rows = list(csv.reader(open(CSV_FILE, encoding="utf-8-sig"), delimiter=";"))
    header = rows[0]
    i_sku, i_img = header.index("Stok Kodu"), header.index("Gorsel")
    s = requests.Session()
    s.headers["User-Agent"] = "Mozilla/5.0"
    done = fail = skip = 0
    failures = []
    for r in rows[1:]:
        sku, url = r[i_sku], r[i_img]
        target = OUT_DIR / (safe_name(sku) + ".jpg")
        if target.exists():
            skip += 1
            continue
        if not url:
            failures.append((sku, "gorsel yok"))
            fail += 1
            continue
        try:
            resp = s.get(url, timeout=60)
            resp.raise_for_status()
            product = Image.open(io.BytesIO(resp.content))
            compose(template, product).save(target, "JPEG", quality=92)
            done += 1
        except Exception as e:
            failures.append((sku, str(e)[:100]))
            fail += 1
        time.sleep(0.15)
    print(f"tamam: {done}, atlandi(zaten var): {skip}, hata: {fail}")
    for sku, err in failures[:20]:
        print("HATA:", sku, err)


if __name__ == "__main__":
    main()
