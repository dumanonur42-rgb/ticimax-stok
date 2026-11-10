"""Produce group masters only; source paths in JSON are relative to this file."""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]


def largest_component(mask):
    labels, count = ndimage.label(mask)
    if not count:
        raise ValueError("No product pixels found")
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    return labels == sizes.argmax()


def cutout(source, group):
    im = source.convert("RGBA")
    if group == "G4":
        im = im.crop((0, 0, 245, 276))
    rgb = np.asarray(im.convert("RGB"), dtype=np.int16)
    if group == "G7":
        mask = largest_component(rgb.max(axis=2) < 205)
        mask = ndimage.binary_fill_holes(mask)
    else:
        mask = largest_component(rgb.min(axis=2) < 242)
        if group != "G8":
            mask = ndimage.binary_fill_holes(mask)
    if group == "G3a":
        boundary = Image.new("L", im.size)
        ImageDraw.Draw(boundary).polygon(
            [(220, 170), (600, 170), (610, 500), (590, 600),
             (575, 650), (553, 690), (531, 720), (512, 733),
             (493, 741), (475, 741), (459, 738), (448, 737),
             (435, 750), (421, 759), (407, 760), (392, 753),
             (377, 741), (360, 722), (340, 693), (320, 659),
             (300, 641), (221, 624)], fill=255
        )
        mask &= np.asarray(boundary) > 0
    alpha = Image.fromarray((mask * 255).astype("uint8"))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.45))
    # Keep orange entirely outside even the feathered edge.
    if group == "G7":
        neutral = (rgb.max(axis=2) - rgb.min(axis=2) < 24)
        alpha = Image.fromarray(np.where(neutral, np.asarray(alpha), 0).astype("uint8"))
    im.putalpha(alpha)
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError("Empty cutout: " + group)
    return im.crop(bbox)


def compose(template, product):
    canvas = template.convert("RGB").copy()
    ImageDraw.Draw(canvas).rectangle((0, 100, 499, 349), fill="white")
    scale = min(440 / product.width, 240 / product.height)
    product = product.resize(
        (round(product.width * scale), round(product.height * scale)),
        Image.Resampling.LANCZOS,
    )
    x, y = (500 - product.width) // 2, 100 + (250 - product.height) // 2
    canvas.paste(product, (x, y), product)
    return canvas, (x, y, x + product.width, y + product.height)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=ROOT / "tmp_master")
    parser.add_argument("--sheet", type=Path, default=ROOT.parent / "tmp/masters.jpg")
    args = parser.parse_args()
    groups = json.loads(Path(__file__).with_name("gorsel_gruplar.json").read_text())
    template = Image.open(ROOT / "sablon.png")
    if template.size != (500, 500):
        raise ValueError("Template must be 500x500")
    args.out.mkdir(parents=True, exist_ok=True)
    args.sheet.parent.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGB", (1500, 2120), "white")
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
    for index, (group, data) in enumerate(groups.items()):
        source = (Path(__file__).parent / data["file"]).resolve()
        with Image.open(source) as photo:
            product = cutout(photo, group)
        canvas, bounds = compose(template, product)
        assert bounds[0] >= 30 and bounds[2] <= 470
        assert bounds[1] >= 105 and bounds[3] <= 345
        assert np.array_equal(np.asarray(canvas)[:100], np.asarray(template.convert("RGB"))[:100])
        assert np.array_equal(np.asarray(canvas)[350:], np.asarray(template.convert("RGB"))[350:])
        output = args.out / (group + ".jpg")
        canvas.save(output, quality=92, subsampling=0)
        with Image.open(output) as saved:
            assert saved.size == (500, 500) and saved.format == "JPEG"
            sheet.paste(saved, (index % 3 * 500, index // 3 * 530 + 30))
        ImageDraw.Draw(sheet).text((index % 3 * 500 + 15, index // 3 * 530 + 5), group, font=font, fill="black")
        print(f"{group}: {output} product_bounds={bounds}")
    sheet.save(args.sheet, quality=92, subsampling=0)
    print(f"PASS: {len(groups)} masters; 500x500 JPEG quality=92; product bounds and template bands checked")
    print("Contact sheet: " + str(args.sheet))


if __name__ == "__main__":
    main()
