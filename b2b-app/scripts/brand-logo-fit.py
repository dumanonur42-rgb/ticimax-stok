#!/usr/bin/env python3
"""Writes src/renderer/src/lib/brandLogoFit.json: how large each brand logo is drawn inside a logo plate.

Logos come in every shape, so "fit inside the box" makes a wide wordmark look far bigger than a square emblem.
Each logo instead gets about the same drawn area (a little more for thin, light artwork, a little less for
solid blocks), capped by the box. Values are percentages of the plate's inner box, whose sides are 2.7 : 1.

Run after adding or replacing a file in src/renderer/src/assets/brands:  python3 scripts/brand-logo-fit.py
"""
import glob, json, math, os
from PIL import Image, ImageChops

ROOT = os.path.join(os.path.dirname(__file__), '..', 'src', 'renderer', 'src')
BOX_W, BOX_H = 54.0, 20.0
AREA = 0.72 * BOX_W * BOX_H


def ink(image):
    """Share of the picture that is not white paper."""
    rgb = image.convert('RGB')
    diff = ImageChops.difference(rgb, Image.new('RGB', rgb.size, (255, 255, 255))).convert('L')
    return sum(diff.point(lambda v: 1 if v > 40 else 0).histogram()[1:2]) / (rgb.width * rgb.height)


fit = {}
for path in sorted(glob.glob(os.path.join(ROOT, 'assets', 'brands', '*.webp'))):
    image = Image.open(path)
    aspect = image.width / image.height
    area = AREA * max(0.86, min(1.18, (0.42 / max(ink(image), 0.05)) ** 0.3))
    width, height = math.sqrt(area * aspect), math.sqrt(area / aspect)
    scale = min(1, BOX_W / width, BOX_H / height)
    fit[os.path.basename(path)[:-5]] = [round(width * scale / BOX_W * 100, 1), round(height * scale / BOX_H * 100, 1)]

with open(os.path.join(ROOT, 'lib', 'brandLogoFit.json'), 'w') as out:
    json.dump(fit, out, separators=(',', ':'), sort_keys=True)
    out.write('\n')
print(f'{len(fit)} logos')
