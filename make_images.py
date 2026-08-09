#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Urun gorsellerini markaya gore sablona (ERIC / BOHRCRAFT) yerlestirir."""

import csv
import io
import re
import sys
import time
from pathlib import Path

import requests
from PIL import Image

HERE = Path(__file__).resolve().parent
TEMPLATES = {
    "BOHRCRAFT": HERE / "sablon_bohrcraft.png",
    "ERİC": HERE / "sablon_eric.png",
}
DEFAULT_TEMPLATE = HERE / "sablon_eric.png"
OUT_DIR = HERE / "gorseller"
CSV_FILE = HERE / "output" / "urunler.csv"

CANVAS = (500, 500)
# Urunun yerlesecegi alan (ust logo ile alt marka logosu arasi)
BOX = (35, 105, 465, 345)  # x1, y1, x2, y2


def load_template(path):
    """Sablonun ust ve alt bantlarini alip ortayi bos birakir."""
    src = Image.open(path).convert("RGBA")
    canvas = Image.new("RGBA", CANVAS, (255, 255, 255, 255))
    canvas.paste(src.crop((0, 0, 500, 100)), (0, 0))
    canvas.paste(src.crop((0, 350, 500, 500)), (0, 350))
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


def image_filename(name: str, sku: str) -> str:
    """Gorsel dosya adi: 'Urun Adi - StokKodu.jpg'"""
    clean = re.sub(r'[\\/:*?"<>|]+', "", (name or "").strip())
    clean = re.sub(r"\s+", " ", clean)
    if not clean:
        return safe_name(sku) + ".jpg"
    return f"{clean} - {sku}.jpg"


def _series_key(name: str) -> str:
    """Cap kismini atip seri adini dondurur (yedek gorsel eslestirme icin)."""
    return re.sub(r"^[\d,.\-xX/ ]+", "", name or "").strip().lower()


def main():
    OUT_DIR.mkdir(exist_ok=True)
    templates = {b: load_template(p) for b, p in TEMPLATES.items()}
    default_t = load_template(DEFAULT_TEMPLATE)
    rows = list(csv.reader(open(CSV_FILE, encoding="utf-8-sig"), delimiter=";"))
    header = rows[0]
    i_sku = header.index("Stok Kodu")
    i_src = header.index("Kaynak Gorsel")
    i_name = header.index("Urun Adi")
    i_brand = header.index("Marka")
    # Ayni serideki urunlerden yedek kaynak gorsel haritasi
    series_fallback = {}
    for r in rows[1:]:
        if r[i_src]:
            series_fallback.setdefault(_series_key(r[i_name]), r[i_src])
    s = requests.Session()
    s.headers["User-Agent"] = "Mozilla/5.0"
    done = fail = 0
    failures = []
    force = "--force" in sys.argv
    for r in rows[1:]:
        sku, url = r[i_sku], r[i_src]
        target = OUT_DIR / image_filename(r[i_name], sku)
        if target.exists() and not force:
            done += 1
            continue
        if not url:
            url = series_fallback.get(_series_key(r[i_name]), "")
        if not url:
            failures.append((sku, "kaynak gorsel yok"))
            fail += 1
            continue
        try:
            resp = s.get(url, timeout=60)
            resp.raise_for_status()
            product = Image.open(io.BytesIO(resp.content))
            template = templates.get(r[i_brand], default_t)
            compose(template, product).save(target, "JPEG", quality=92)
            done += 1
        except Exception as e:
            failures.append((sku, str(e)[:100]))
            fail += 1
        time.sleep(0.15)
    print(f"tamam: {done}, hata: {fail}")
    for sku, err in failures[:20]:
        print("HATA:", sku, err)


if __name__ == "__main__":
    main()
