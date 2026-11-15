"""Uygulama simgesi (yamansa.ico + simge.png) ve kurulum sihirbazı görsellerini (kurulum_*.bmp) üretir.

    python simge_uret.py

Simge: koyu lacivert yuvarlatılmış kare üzerinde turuncu dış bilezik, çelik bilyeler ve mavi iç bilezik
(rulman). 16 px'te bile okunacak şekilde az ayrıntı, yüksek kontrast.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

BURASI = Path(__file__).resolve().parent
KOK = BURASI.parent

ZEMIN1, ZEMIN2 = (9, 15, 41), (22, 34, 84)
TURUNCU1, TURUNCU2 = (255, 106, 0), (255, 150, 40)
MAVI1, MAVI2 = (61, 123, 255), (120, 170, 255)
CELIK1, CELIK2 = (236, 240, 250), (150, 160, 190)


def _dikey_gecis(boy, r1, r2, capraz=True):
    """Köşegen (veya dikey) iki renkli geçiş katmanı."""
    im = Image.new("RGB", (boy, boy), r1)
    px = im.load()
    for y in range(boy):
        for x in range(boy):
            t = (x + y) / (2 * boy - 2) if capraz else y / (boy - 1)
            px[x, y] = tuple(int(a + (b - a) * t) for a, b in zip(r1, r2))
    return im


def _halka(cizim, merkez, r_dis, r_ic, dolgu):
    cx, cy = merkez
    cizim.ellipse((cx - r_dis, cy - r_dis, cx + r_dis, cy + r_dis), fill=dolgu)
    cizim.ellipse((cx - r_ic, cy - r_ic, cx + r_ic, cy + r_ic), fill=(0, 0, 0, 0))


def simge(boy=1024):
    S = boy
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    # zemin: yuvarlatılmış kare + köşegen geçiş + üstten ışık
    maske = Image.new("L", (S, S), 0)
    ImageDraw.Draw(maske).rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.225), fill=255)
    zemin = _dikey_gecis(S, ZEMIN1, ZEMIN2).convert("RGBA")
    isik = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(isik).ellipse((-S * 0.2, -S * 0.55, S * 0.9, S * 0.35), fill=(255, 255, 255, 26))
    isik = isik.filter(ImageFilter.GaussianBlur(S * 0.08))
    zemin = Image.alpha_composite(zemin, isik)
    im.paste(zemin, (0, 0), maske)

    cx = cy = S / 2
    # gölge
    golge = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(golge).ellipse((cx - S * 0.36, cy - S * 0.33, cx + S * 0.36, cy + S * 0.41), fill=(0, 0, 0, 110))
    golge = golge.filter(ImageFilter.GaussianBlur(S * 0.05))
    im = Image.alpha_composite(im, Image.composite(golge, Image.new("RGBA", (S, S), (0, 0, 0, 0)), maske))

    # dış bilezik (turuncu, geçişli)
    r1, r2 = S * 0.355, S * 0.265
    katman = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    _halka(ImageDraw.Draw(katman), (cx, cy), r1, r2, (255, 255, 255, 255))
    turuncu = _dikey_gecis(S, TURUNCU2, TURUNCU1, capraz=False).convert("RGBA")
    im.paste(turuncu, (0, 0), katman.split()[3])
    # bilezik kenar parlaklığı
    ImageDraw.Draw(im).ellipse((cx - r1, cy - r1, cx + r1, cy + r1), outline=(255, 200, 150, 90), width=max(2, S // 170))

    # bilye yolu (koyu)
    r3, r4 = S * 0.265, S * 0.175
    _halka(ImageDraw.Draw(im), (cx, cy), r3, r4, (10, 16, 44, 255))
    # iç bilezik (mavi)
    r5, r6 = S * 0.175, S * 0.105
    katman = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    _halka(ImageDraw.Draw(katman), (cx, cy), r5, r6, (255, 255, 255, 255))
    mavi = _dikey_gecis(S, MAVI2, MAVI1, capraz=False).convert("RGBA")
    im.paste(mavi, (0, 0), katman.split()[3])
    # mil boşluğu zemin rengi
    ImageDraw.Draw(im).ellipse((cx - r6, cy - r6, cx + r6, cy + r6), fill=(*ZEMIN1, 255))

    # bilyeler (8 adet, çelik geçişli)
    rb = S * 0.038
    ry = (r3 + r4) / 2
    for i in range(8):
        a = math.radians(i * 45 + 22.5)
        bx, by = cx + ry * math.cos(a), cy + ry * math.sin(a)
        d = ImageDraw.Draw(im)
        d.ellipse((bx - rb, by - rb, bx + rb, by + rb), fill=CELIK2)
        d.ellipse((bx - rb * 0.78, by - rb * 0.85, bx + rb * 0.6, by + rb * 0.5), fill=CELIK1)

    # köşede küçük turuncu "aktif" noktası – sosyal medya/yayın vurgusu
    d = ImageDraw.Draw(im)
    nx, ny, nr = S * 0.80, S * 0.20, S * 0.055
    d.ellipse((nx - nr * 1.5, ny - nr * 1.5, nx + nr * 1.5, ny + nr * 1.5), fill=(*ZEMIN1, 255))
    d.ellipse((nx - nr, ny - nr, nx + nr, ny + nr), fill=TURUNCU1)
    return im


def kurulum_yan(ikon, w=164, h=314):
    """Inno Setup sihirbazının sol paneli (WizardImageFile)."""
    im = _dikey_gecis(max(w, h), (7, 11, 30), (16, 26, 66)).convert("RGBA").crop((0, 0, w, h))
    d = ImageDraw.Draw(im)
    d.rectangle((0, h - 5, w, h), fill=TURUNCU1)
    d.rectangle((0, h - 5, int(w * 0.62), h), fill=MAVI1)
    im.alpha_composite(ikon.resize((96, 96), Image.LANCZOS), ((w - 96) // 2, 46))
    try:
        fb = ImageFont.truetype("LiberationSans-Bold.ttf", 22)
        fn = ImageFont.truetype("LiberationSans-Regular.ttf", 12)
        fk = ImageFont.truetype("LiberationSans-Bold.ttf", 10)
    except OSError:
        fb = fn = fk = ImageFont.load_default()
    for y, metin, font, renk in ((160, "YAMANSA", fb, (243, 246, 252)), (190, "Sosyal Medya Paneli", fn, (151, 163, 196)),
                                 (214, "KOMUTA MERKEZİ", fk, TURUNCU1)):
        tw = d.textlength(metin, font=font)
        d.text(((w - tw) / 2, y), metin, font=font, fill=renk)
    return im.convert("RGB")


def kurulum_kucuk(ikon, w=55, h=58):
    """Inno Setup sağ üst küçük görsel (WizardSmallImageFile)."""
    im = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    im.alpha_composite(ikon.resize((52, 52), Image.LANCZOS), ((w - 52) // 2, (h - 52) // 2))
    return im.convert("RGB")


def main():
    ik = simge(1024)
    ik.save(BURASI / "simge.png")
    ik.save(BURASI / "yamansa.ico", sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (24, 24), (16, 16)])
    kurulum_yan(ik).save(BURASI / "kurulum_yan.bmp")
    kurulum_kucuk(ik).save(BURASI / "kurulum_kucuk.bmp")
    print("yazıldı:", BURASI / "yamansa.ico", BURASI / "simge.png", BURASI / "kurulum_yan.bmp", BURASI / "kurulum_kucuk.bmp")


if __name__ == "__main__":
    main()
