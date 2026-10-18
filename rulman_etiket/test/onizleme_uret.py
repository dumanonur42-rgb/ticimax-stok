"""Örnek etiketlerin 300 dpi PNG + PDF önizlemelerini üretir ve barkodları okuyup denetler.

Kullanım:  python test/onizleme_uret.py [--referans FOTO.jpg]   (rulman_etiket klasöründen)
Çıktı:     test/onizleme/*.png, *.pdf, dogrulama.md
           --referans verilirse fotoğraf ile yan yana karşılaştırma görüntüsü geçici klasöre
           yazılır (repoya girmez): <geçici klasör>/rulman_etiket_karsilastirma.png
Okuma için zxing-cpp gerekir (uygulama zaten kare kod üretmek için kullanıyor).
"""
from __future__ import annotations

import argparse
import io
import sys
import tempfile
from pathlib import Path

KLASOR = Path(__file__).resolve().parent
sys.path.insert(0, str(KLASOR.parent))

import zxingcpp  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

from etiket_cizim import (BOYUTLAR, EtiketVerisi, MM, barkod_metni, ciz, ean13,  # noqa: E402
                          datamatrix_metni, onizleme_png, yerlesim)

CIKTI = KLASOR / "onizleme"

ORNEKLER: list[tuple[str, EtiketVerisi]] = [
    ("01_6308_C3", EtiketVerisi("6308-C-2HRS", "C3", 1)),
    ("02_6308_C3_bilgili", EtiketVerisi("6308-C-2HRS", "C3", 1, bilgi1="RAF A-12", bilgi2="Yamansa Rulman")),
    ("03_6205_adet10", EtiketVerisi("6205-2RSR", "", 10)),
    ("04_uzun_kod", EtiketVerisi("22320-E1-XL-K-T41A", "C3", 1)),
    ("05_NU2215", EtiketVerisi("NU2215-E-XL-TVP2", "C3", 2)),
    ("06_turkce", EtiketVerisi("608-2Z", "", 100, bilgi1="ÇİFT TARAF KAPAKLI ŞIĞ İĞNE ÜÖ")),
    ("07_alt_tekrar_yok", EtiketVerisi("51100", "", 1, alt_tekrar=False)),
    ("08_ean13", EtiketVerisi("6205-2RS", "C3", barkod_no="8691234567890")),
    ("09_ean12_otomatik", EtiketVerisi("6308", barkod_no="869123456789")),
    ("10_uzun_kod_ean", EtiketVerisi("NNU4930-S-K-M-SP-XL-C3", "P6",
                                     barkod_no="8691234567890")),
]


def oku(png: bytes) -> dict[str, str]:
    img = Image.open(io.BytesIO(png)).convert("L")
    sonuc = {}
    for r in zxingcpp.read_barcodes(
        img, formats=(zxingcpp.BarcodeFormat.Code128, zxingcpp.BarcodeFormat.DataMatrix,
                      zxingcpp.BarcodeFormat.EAN13)
    ):
        sonuc[r.format.name] = r.text
    return sonuc


def karsilastirma(png: bytes, referans: Path) -> Path:
    ref = Image.open(referans).convert("RGB")
    biz = Image.open(io.BytesIO(png)).convert("RGB")
    h = 900
    ref = ref.resize((round(ref.width * h / ref.height), h), Image.LANCZOS)
    biz = biz.resize((round(biz.width * h / biz.height), h), Image.LANCZOS)
    bosluk, ust = 40, 70
    tuval = Image.new("RGB", (ref.width + biz.width + 3 * bosluk, h + ust + bosluk), "white")
    tuval.paste(ref, (bosluk, ust))
    tuval.paste(biz, (2 * bosluk + ref.width, ust))
    d = ImageDraw.Draw(tuval)
    try:
        f = ImageFont.truetype(str(KLASOR.parent / "fonts" / "LiberationSans-Bold.ttf"), 30)
    except OSError:
        f = ImageFont.load_default()
    d.text((bosluk, 20), "Referans (fotoğraf)", fill="black", font=f)
    d.text((2 * bosluk + ref.width, 20), "Bizim etiket (62 mm sürekli, 300 dpi)", fill="black", font=f)
    for x, w in ((bosluk, ref.width), (2 * bosluk + ref.width, biz.width)):
        d.rectangle((x - 1, ust - 1, x + w, ust + h), outline=(160, 160, 160))
    yol = Path(tempfile.gettempdir()) / "rulman_etiket_karsilastirma.png"
    tuval.save(yol)
    return yol


def main() -> int:
    ap = argparse.ArgumentParser(description="Örnek etiket önizlemeleri ve barkod denetimi")
    ap.add_argument("--referans", type=Path, help="karşılaştırma için referans fotoğraf (repoya eklenmez)")
    args = ap.parse_args()
    CIKTI.mkdir(exist_ok=True)
    satirlar = ["| Örnek | Boyut | Etiket (mm) | Barkod beklenen | Barkod okunan | DataMatrix beklenen | DataMatrix okunan | Sonuç |",
                "|---|---|---|---|---|---|---|---|"]
    hata = 0
    for ad, veri in ORNEKLER:
        for boyut in BOYUTLAR:
            png = onizleme_png(veri, boyut, dpi=300)
            dosya = f"{ad}_{boyut}"
            (CIKTI / f"{dosya}.png").write_bytes(png)
            doc = ciz(veri, boyut)
            doc.save(CIKTI / f"{dosya}.pdf", garbage=4, deflate=True)
            doc.close()
            y = yerlesim(veri, boyut)
            okunan = oku(png)
            barkod_turu = "EAN13" if veri.barkod_no else "Code128"
            b1 = ean13(veri.barkod_no) if veri.barkod_no else barkod_metni(veri)
            b2 = y.dm_metin
            o1, o2 = okunan.get(barkod_turu, "—"), okunan.get("DataMatrix", "—")
            tamam = o1 == b1 and o2 == b2
            hata += not tamam
            g = lambda s: s.replace("\n", "⏎").replace("|", "\\|")  # noqa: E731
            satirlar.append(f"| {ad} | {boyut} | 62 x {y.yukseklik / MM:.1f} | `{g(b1)}` | `{g(o1)}` | "
                            f"`{g(b2)}` | `{g(o2)}` | {'TAMAM' if tamam else 'HATA'} |")
            print(f"{dosya:32s} {'TAMAM' if tamam else 'HATA '}  {y.mod} cubuk={y.cubuk_modul} "
                  f"dm={len(y.dm)}x{y.dm_modul} kod={y.kod_pt}pt {y.uyarilar}")
            if args.referans and ad == "01_6308_C3" and boyut == "62surekli":
                print("karşılaştırma:", karsilastirma(png, args.referans))
    (CIKTI / "dogrulama.md").write_text("\n".join(satirlar) + "\n", encoding="utf-8")
    print("hata:", hata)
    return 1 if hata else 0


if __name__ == "__main__":
    sys.exit(main())
