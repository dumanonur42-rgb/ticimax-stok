"""Uygulama simgesini (icon.ico + icon.png) üretir.  python make_icon.py

Konsept: koyu, yuvarlatılmış kare zemin üzerinde beyaz bir kargo etiketi;
etiketin üstünde siyah başlık şeridi, ortasında Code128 benzeri barkod.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
S = 1024  # çalışma çözünürlüğü; küçültme ile kenar yumuşatma elde edilir

BG_TOP = (38, 40, 48)
BG_BOT = (14, 15, 20)
WHITE = (255, 255, 255)
BLACK = (18, 18, 20)
ACCENT = (230, 57, 70)


def _gradient(size: int, top, bot) -> Image.Image:
    g = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / (size - 1)
        g.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(top, bot)))
    return g.resize((size, size))


def render() -> Image.Image:
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    # zemin: yuvarlatılmış kare + dikey gradyan
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), radius=230, fill=255)
    img.paste(_gradient(S, BG_TOP, BG_BOT), (0, 0), mask)

    # etiketin gölgesi
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((232, 190, 792, 870), radius=56,
                                             fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    img.alpha_composite(shadow)

    d = ImageDraw.Draw(img)
    # etiket gövdesi
    lx0, ly0, lx1, ly1 = 216, 160, 808, 856
    d.rounded_rectangle((lx0, ly0, lx1, ly1), radius=56, fill=WHITE)

    # üst siyah şerit (yalnızca üst köşeler yuvarlak)
    band_h = 118
    d.rounded_rectangle((lx0, ly0, lx1, ly0 + band_h + 56), radius=56, fill=BLACK)
    d.rectangle((lx0, ly0 + band_h, lx1, ly0 + band_h + 56), fill=WHITE)
    # şeritte beyaz "başlık" çizgisi ve kırmızı nokta (vurgu)
    d.rounded_rectangle((lx0 + 56, ly0 + 44, lx0 + 300, ly0 + 74), radius=15, fill=WHITE)
    d.ellipse((lx1 - 110, ly0 + 36, lx1 - 64, ly0 + 82), fill=ACCENT)

    # adres satırlarını temsil eden çizgiler
    y = ly0 + band_h + 70
    for w in (380, 300, 240):
        d.rounded_rectangle((lx0 + 56, y, lx0 + 56 + w, y + 26), radius=13, fill=BLACK)
        y += 56

    # barkod
    bars = "2112111222211121122211112212112212111121"
    bx, by0, by1 = lx0 + 56, ly0 + 420, ly1 - 130
    unit = (lx1 - lx0 - 112) / sum(int(c) for c in bars)
    for i, c in enumerate(bars):
        w = int(c) * unit
        if i % 2 == 0:
            d.rectangle((bx, by0, bx + w - 1, by1), fill=BLACK)
        bx += w
    # barkod altı kısa "değer" çizgisi
    d.rounded_rectangle((lx0 + 236, ly1 - 96, lx1 - 236, ly1 - 66), radius=15, fill=BLACK)
    return img


def main():
    img = render()
    img.save(HERE / "icon.png")
    sizes = [16, 24, 32, 48, 64, 128, 256]
    frames = [img.resize((s, s), Image.LANCZOS) for s in sizes]
    frames[-1].save(HERE / "icon.ico", format="ICO", sizes=[(s, s) for s in sizes],
                    append_images=frames[:-1])
    img.resize((256, 256), Image.LANCZOS).save(HERE / "icon_256.png")
    img.resize((48, 48), Image.LANCZOS).save(HERE / "icon_48.png")
    print("ok", HERE / "icon.ico")


if __name__ == "__main__":
    main()
