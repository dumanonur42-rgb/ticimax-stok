from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent
CANVAS = 1024


def make_icon() -> Image.Image:
    base = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    background = Image.new("RGBA", base.size)
    pixels = background.load()
    for y in range(CANVAS):
        t = y / (CANVAS - 1)
        color = (
            round(35 - 12 * t),
            round(52 - 14 * t),
            round(73 - 16 * t),
            255,
        )
        for x in range(CANVAS):
            pixels[x, y] = color
    mask = Image.new("L", base.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (24, 24, CANVAS - 24, CANVAS - 24), radius=220, fill=255
    )
    background.putalpha(mask)
    base.alpha_composite(background)

    draw = ImageDraw.Draw(base)
    center = CANVAS / 2
    draw.ellipse((210, 210, 814, 814), fill=(193, 207, 218, 255))
    draw.ellipse((280, 280, 744, 744), fill=(31, 43, 57, 255))

    ball_radius = 64
    ball_center_radius = 212
    for index in range(8):
        angle = -math.pi / 2 + index * math.tau / 8
        x = center + math.cos(angle) * ball_center_radius
        y = center + math.sin(angle) * ball_center_radius
        draw.ellipse(
            (x - ball_radius, y - ball_radius, x + ball_radius, y + ball_radius),
            fill=(231, 237, 241, 255),
            outline=(137, 153, 167, 255),
            width=10,
        )
        draw.ellipse(
            (x - 28, y - 34, x + 4, y - 2),
            fill=(255, 255, 255, 145),
        )

    draw.ellipse((338, 338, 686, 686), fill=(202, 214, 223, 255))
    draw.ellipse((408, 408, 616, 616), fill=(28, 39, 52, 255))
    draw.ellipse((436, 436, 588, 588), outline=(49, 64, 80, 255), width=9)
    return base


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    image = make_icon()
    image.resize((256, 256), Image.Resampling.LANCZOS).save(ROOT / "icon_256.png")
    image.resize((48, 48), Image.Resampling.LANCZOS).save(ROOT / "icon_48.png")
    image.save(
        ROOT / "icon.ico",
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )


if __name__ == "__main__":
    main()
