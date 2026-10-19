"""Rulman Etiket otomatik kalite kontrolü.

Kullanım (repo kökünden):
    python rulman_etiket/test/kalite_kontrol.py [--cikti KLASOR] [--cli-yok]

Her örnek etiketi etiket_cizim.ciz() ve (varsa) `rulman_etiket.py --pdf` ile
üretir, 300 dpi PNG'ye çevirir, Code128 + DataMatrix'i zxing-cpp ile çözer,
sayfa boyutunu, kenar boşluklarını, üst üste binmeyi ve barkod çizgi
kalınlığını ölçer. Hepsi geçerse çıkış kodu 0, aksi halde 1.
"""
from __future__ import annotations

import argparse
import io
import json
import subprocess
import sys
import tempfile
import traceback
from dataclasses import dataclass, field
from pathlib import Path
from types import SimpleNamespace

import pymupdf
import zxingcpp
import numpy as np
from PIL import Image

KOK = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOK))

MM = 72 / 25.4
DPI = 300
# Brother QL komut referansı (QL-500/550/560/570/580N/650TD/700/1050/1060N, v6.0):
# 62 mm rulo: 732 nokta sayfa, 696 nokta basılabilir, yan ofset 1.5 mm (18 nokta).
# Kesik etiket 62x100: basılabilir 58.9 x 93.9 mm, yan 1.5 mm, uç 3.0 mm.
# QL-550 sürekli rulo uzunluğu 25 mm .. 1000 mm.
YAN_MIN_MM = 1.5
UC_MIN_MM = 3.0
SUREKLI_MIN_MM, SUREKLI_MAX_MM = 25.0, 1000.0
YASAK_METIN = ["4047643", "0254X0511", "0074647607", "070684642", "FAG", "SCHAEFFLER",
               "SKF", "X-LIFE", "TIMKEN", "NSK", "NTN", "KOYO", "MADE IN PORTUGAL"]


def V(kod, ek="", adet=1, bilgi1="", bilgi2="", alt=True, yazi="Qty", barkod_no=""):
    return dict(kod=kod, ek=ek, adet=adet, adet_yazisi=yazi, bilgi1=bilgi1, bilgi2=bilgi2,
                alt_tekrar=alt, barkod_no=barkod_no)


ORNEKLER: list[tuple[str, str, dict]] = [
    ("01_kisa_608", "62x100", V("608")),
    ("02_kisa_51100_surekli", "62surekli", V("51100", adet=10)),
    ("03_referans_6308", "62x100", V("6308-C-2HRS", "C3")),
    ("04_referans_6308_surekli", "62surekli", V("6308-C-2HRS", "C3")),
    ("05_orta_6205_bilgi", "62x100", V("6205-2Z-C3", adet=10, bilgi1="Menşei: Türkiye")),
    ("06_uzun_22320", "62x100", V("22320-E1-XL-K-T41A", "C3")),
    ("07_uzun_NU2215_1000", "62surekli", V("NU2215-E-XL-TVP2", "C3", adet=1000)),
    ("08_uzun_24156_altsiz", "62x100", V("24156-B-K30-C3", alt=False)),
    ("09_uzun_7210_surekli_altsiz", "62surekli", V("7210-B-XL-TVP-UO", adet=2, alt=False)),
    ("10_turkce_iki_bilgi", "62x100", V("6004-2RSH", bilgi1="Raf: A-12 Çekmece 3",
                                         bilgi2="İthalatçı: Yamansa Rulman Şti.")),
    ("11_turkce_harfler", "62x100", V("32210-J2/Q", adet=5, bilgi1="ĞÜŞİÖÇ ğüşıöç",
                                       bilgi2="Kutu içi: 5 adet")),
    ("12_adet_99999", "62x100", V("HK2016", adet=99999)),
    ("13_adet_yazisi_Adet", "62x100", V("6308-C-2HRS", "C3", yazi="Adet")),
    ("14_kod_22_karakter", "62x100", V("NNU4930-S-K-M-SP-XL-C3", "P6")),
    ("15_uzun_bilgi", "62x100", V("NUP2315-E-XL-M1", "C4",
                                  bilgi1="Sipariş no: 2026/1458 - Müşteri: Örnek Makina Sanayi",
                                  bilgi2="Teslim: Ostim OSB 1234. Cadde No: 56 Yenimahalle")),
    ("16_surekli_altsiz_1000", "62surekli", V("6200", adet=1000, alt=False)),
    ("17_surekli_bilgili", "62surekli", V("23122-E1-K-TVPB", "C3", bilgi1="Menşei: Almanya",
                                          bilgi2="Raf B-04")),
    ("18_iki_kisa_ek", "62x100", V("6201", "2RS C3", adet=10)),
    ("19_ean13", "62x100", V("6205-2RS", "C3", barkod_no="8691234567890")),
    ("20_ean12_surekli", "62surekli", V("6308", barkod_no="869123456789")),
    ("21_uzun_kod_ean", "62x100", V("NNU4930-S-K-M-SP-XL-C3", "P6",
                                    barkod_no="8691234567890")),
    ("22_kucuk_ean", "62x25", V(
        "6318-2Z", "C3", bilgi1="0254X0511/0074647607/070684642-0030-10",
        bilgi2="MADE IN TURKEY", barkod_no="8691234567890")),
    ("23_kucuk_code128", "62x25", V(
        "6318-2Z", "C3", bilgi1="LOT-123", bilgi2="MADE IN TURKEY")),
    ("24_kucuk_uzun_kod", "62x25", V("NU2215-E-XL-TVP2-C3", "C3")),
    ("25_ufak_kutu_ean", "62x35", V(
        "6318-2Z", "C3", bilgi1="0254X0511/0074647607/070684642-0030-10",
        bilgi2="MADE IN TURKEY", barkod_no="8691234567890")),
    ("26_standart_kutu_tekrar", "62x62", V(
        "6308-C-2HRS", "C3", bilgi1="0254X0511/0074647607/070684642-0030-10",
        bilgi2="MADE IN TURKEY", barkod_no="8691234567890")),
    ("27_standart_kutu_altsiz", "62x62", V(
        "6308-C-2HRS", "C3", bilgi1="0254X0511/0074647607/070684642-0030-10",
        bilgi2="MADE IN TURKEY", alt=False, barkod_no="8691234567890")),
]

DOGRULA_HATALI = [
    ("bos_kod", V("")), ("bosluk_kod", V("   ")), ("41_karakter", V("A" * 41)),
    ("adet_0", V("6205", adet=0)), ("adet_eksi", V("6205", adet=-1)),
    ("adet_100000", V("6205", adet=100000)),
]
DOGRULA_GECERLI = [("adet_99999", V("6205", adet=99999)),
                   ("adet_1", V("6205"))]
TUHAF_GIRIS = [  # çökmemeli: ya dogrula hata dönmeli ya da çizim sorunsuz olmalı
    ("satir_sonu", V("6205\nC3")), ("sekme", V("6205\t2RS")), ("emoji", V("6205 \u2705")),
    ("turkce_kod", V("ŞĞÜ-İÖÇ")), ("cok_uzun_bilgi", V("6205", bilgi1="X" * 300)),
    ("cok_uzun_ek", V("6205", ek="C3" * 30)), ("tirnak", V('6205"; & | <>', ek="'C3'")),
]


def beklenen_code128(v: dict) -> str:
    return v["kod"] + (" " + v["ek"] if v["ek"] else "")


def datamatrix_kontrol(v: dict, metin: str) -> str:
    """Sözleşme: Code128 metni + adet + doluysa bilgi satırları, satır sonlarıyla."""
    satirlar = metin.replace("\r\n", "\n").split("\n")
    if not satirlar or satirlar[0] != beklenen_code128(v):
        return f"ilk satır {satirlar[:1]!r} != {beklenen_code128(v)!r}"
    if not any(str(v["adet"]) in s for s in satirlar[1:]):
        return f"adet {v['adet']} yok"
    for b in (v["bilgi1"], v["bilgi2"]):
        if b and b not in satirlar:
            return f"bilgi satırı yok: {b!r}"
    if not v["bilgi1"] and not v["bilgi2"] and len([s for s in satirlar if s]) > 2:
        return f"fazladan satır: {satirlar!r}"
    return ""


@dataclass
class Sonuc:
    ad: str
    kaynak: str
    boyut: str
    hatalar: list[str] = field(default_factory=list)
    uyarilar: list[str] = field(default_factory=list)
    olcum: dict = field(default_factory=dict)

    @property
    def gecti(self) -> bool:
        return not self.hatalar


def _png(page: pymupdf.Page, dpi: int = DPI) -> Image.Image:
    pix = page.get_pixmap(dpi=dpi, colorspace=pymupdf.csGRAY, alpha=False)
    return Image.open(io.BytesIO(pix.tobytes("png"))).convert("L")


def _nokta_kaydir(img: Image.Image, kalin: bool) -> Image.Image:
    """Termal baskıyı taklit: siyah alanları sağa/aşağı 1 nokta büyüt (ya da küçült)."""
    a = np.asarray(img) < 128
    b = a.copy()
    if kalin:
        b[:, 1:] |= a[:, :-1]
        b[1:, :] |= a[:-1, :]
    else:
        b[:, 1:] &= a[:, :-1]
        b[1:, :] &= a[:-1, :]
    return Image.fromarray(np.where(b, 0, 255).astype(np.uint8))


def _coz(img: Image.Image) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {"Code128": [], "DataMatrix": [], "EAN13": [], "diger": []}
    for r in zxingcpp.read_barcodes(img):
        ad = r.format.name if hasattr(r.format, "name") else str(r.format)
        if "Code128" in ad:
            out["Code128"].append(r.text)
        elif "DataMatrix" in ad:
            out["DataMatrix"].append(r.text)
        elif "EAN13" in ad or "EAN-13" in ad:
            out["EAN13"].append(r.text)
        else:
            out["diger"].append(f"{ad}:{r.text}")
    return out


def _metin_kutulari(page: pymupdf.Page) -> list[tuple[str, pymupdf.Rect, float, str]]:
    """Her satır için (metin, sıkı glif kutusu, punto, font)."""
    import etiket_cizim as ec

    kutular = []
    for blok in page.get_text("rawdict")["blocks"]:
        for satir in blok.get("lines", []):
            for span in satir["spans"]:
                chars = [c for c in span["chars"] if c["c"].strip()]
                if not chars:
                    continue
                s = span["size"]
                oy = span["origin"][1]
                x0 = min(c["bbox"][0] for c in chars)
                x1 = max(c["bbox"][2] for c in chars)
                metin = "".join(c["c"] for c in span["chars"])
                ust = ec.BUYUK_HARF + ec._ust_tasma(metin)
                inen = ec._alt_tasma(metin)
                kutular.append((metin, pymupdf.Rect(x0, oy - ust * s, x1, oy + inen * s),
                                s, span["font"]))
    return kutular


def _dolu_dikdortgenler(page: pymupdf.Page) -> list[pymupdf.Rect]:
    out = [pymupdf.Rect(i["bbox"]) for i in page.get_image_info()]
    for d in page.get_drawings():
        if d.get("fill") is None:
            continue
        for it in d["items"]:
            if it[0] == "re":
                out.append(pymupdf.Rect(it[1]))
            elif it[0] == "qu":
                out.append(it[1].rect)
        if not any(it[0] in ("re", "qu") for it in d["items"]):
            out.append(pymupdf.Rect(d["rect"]))
    return out


def _barkod_cubuklari(page: pymupdf.Page) -> list[pymupdf.Rect]:
    """Sol üstteki barkod çizgileri (dar, uzun dolu dikdörtgenler)."""
    cub = []
    for d in page.get_drawings():
        if d.get("fill") is None:
            continue
        for it in d["items"]:
            if it[0] == "re":
                r = pymupdf.Rect(it[1])
            elif it[0] == "qu":
                r = it[1].rect
            else:
                continue
            if r.height > 3 * MM and r.width < 2 * MM and r.y0 < page.rect.height / 3:
                cub.append(r)
    return cub


def _nokta_kati(deger_pt: float, dpi: int) -> tuple[float, bool]:
    n = deger_pt / 72 * dpi
    return n, abs(n - round(n)) < 0.02


def sayfa_kontrol(
    page: pymupdf.Page, v: dict, boyut: str, s: Sonuc,
    png_yol: Path | None, logo_sayisi: int = 0,
):
    w_mm, h_mm = page.rect.width / MM, page.rect.height / MM
    s.olcum["sayfa_mm"] = f"{w_mm:.1f}x{h_mm:.1f}"
    if abs(w_mm - 62) > 0.3:
        s.hatalar.append(f"sayfa genişliği {w_mm:.2f} mm (62 olmalı)")
    beklenen_yukseklik = {
        "62x25": 25, "62x35": 35, "62x62": 62, "62x100": 100,
    }.get(boyut)
    if beklenen_yukseklik and abs(h_mm - beklenen_yukseklik) > 0.05:
        s.hatalar.append(
            f"sayfa yüksekliği {h_mm:.2f} mm ({beklenen_yukseklik} olmalı)"
        )
    if boyut == "62surekli" and not (SUREKLI_MIN_MM <= h_mm <= SUREKLI_MAX_MM):
        s.hatalar.append(f"sürekli rulo uzunluğu {h_mm:.1f} mm (QL-550: 25-1000 mm)")

    girilen = "".join(str(v[k]) for k in ("kod", "ek", "bilgi1", "bilgi2", "adet_yazisi"))
    if "…" in page.get_text() and "…" not in girilen:
        kesik = [sat for sat in page.get_text().splitlines() if "…" in sat]
        s.uyarilar.append(f"yazı kullanılabilir alana sığmadığı için kısaltıldı: {kesik}")

    img = _png(page)
    if png_yol:
        img.save(png_yol)
    # kenar boşluğu (siyah piksel sınır kutusu)
    bw = img.point(lambda p: 255 if p < 160 else 0)
    bb = bw.getbbox()
    if not bb:
        s.hatalar.append("sayfa boş")
        return
    px = 25.4 / DPI
    sol, ust = bb[0] * px, bb[1] * px
    sag, alt = (img.width - bb[2]) * px, (img.height - bb[3]) * px
    s.olcum["kenar_mm(s/u/s/a)"] = f"{sol:.1f}/{ust:.1f}/{sag:.1f}/{alt:.1f}"
    for ad, d in (("sol", sol), ("sağ", sag)):
        if d < YAN_MIN_MM:
            s.hatalar.append(f"{ad} kenara {d:.2f} mm (en az {YAN_MIN_MM})")
    for ad, d in (("üst", ust), ("alt", alt)):
        if d < YAN_MIN_MM:
            s.hatalar.append(f"{ad} kenara {d:.2f} mm (en az {YAN_MIN_MM})")
        elif d < UC_MIN_MM:
            s.hatalar.append(f"{ad} kenara {d:.2f} mm: QL-550 uçta 3.0 mm basamaz")
    # barkodlar
    coz = _coz(img)
    s.olcum["code128"] = coz["Code128"]
    if v.get("barkod_no"):
        import etiket_cizim as ec
        beklenen_ean = ec.ean13(v["barkod_no"])
        s.olcum["ean13"] = coz["EAN13"]
        if coz["EAN13"] != [beklenen_ean]:
            s.hatalar.append(f"EAN-13 {coz['EAN13']!r} != [{beklenen_ean!r}]")
        if coz["Code128"]:
            s.hatalar.append(f"EAN kipinde Code128 bulunmamalı: {coz['Code128']!r}")
        if min(sol, sag, ust, alt) < 3.0:
            s.hatalar.append(f"EAN etiketinde kenar boşluğu 3 mm'den küçük: "
                             f"{sol:.2f}/{ust:.2f}/{sag:.2f}/{alt:.2f}")
        cub = _barkod_cubuklari(page)
        yukseklikler = [r.height for r in cub]
        normal = min(yukseklikler, default=0)
        koruyucular = [h for h in yukseklikler if h > normal + 0.1 * MM]
        if not koruyucular or max(koruyucular, default=0) <= normal:
            s.hatalar.append("EAN-13 koruyucu çizgileri normal çizgilerden uzun değil")
        s.olcum["ean_guard_cubuk"] = len(koruyucular)
    else:
        beklenen = beklenen_code128(v)
        import etiket_cizim as ec
        mod = ec.yerlesim(ec.EtiketVerisi(**v), boyut).mod
        if mod == "karekod":
            if coz["Code128"]:
                s.hatalar.append(f"uzun kodda Code128 olmamalı: {coz['Code128']!r}")
            if not any("çizgili barkod basılmadı" in u for u in ec.uyarilar(
                ec.EtiketVerisi(**v), boyut
            )):
                s.hatalar.append("uzun kod için Code128 düşürme uyarısı yok")
        elif coz["Code128"] != [beklenen]:
            s.hatalar.append(f"Code128 {coz['Code128']!r} != [{beklenen!r}]")
    if len(coz["DataMatrix"]) != 1:
        s.hatalar.append(f"DataMatrix sayısı {len(coz['DataMatrix'])}")
    else:
        s.olcum["datamatrix"] = coz["DataMatrix"][0]
        e = datamatrix_kontrol(v, coz["DataMatrix"][0])
        if e:
            s.hatalar.append("DataMatrix: " + e)
    if coz["diger"]:
        s.hatalar.append(f"beklenmeyen barkod: {coz['diger']}")
    # baskıdaki mürekkep yayılması / incelmesi (±1 nokta) sonrası okunabilirlik
    for ad, kalin in (("kalın", True), ("ince", False)):
        c = _coz(_nokta_kaydir(img, kalin))
        if v.get("barkod_no"):
            okunur = c["EAN13"] == [beklenen_ean]
        else:
            okunur = c["Code128"] == [beklenen]
        if not okunur or len(c["DataMatrix"]) != 1:
            s.uyarilar.append(f"±1 nokta ({ad}) baskıda okunmadı: "
                              f"{c['Code128']}/{c['EAN13']}/{len(c['DataMatrix'])}")

    # yasak marka metinleri / görseller
    tum = page.get_text().upper()
    for y in YASAK_METIN:
        if y in tum and y not in (v["kod"] + v["ek"] + v["bilgi1"] + v["bilgi2"]).upper():
            s.hatalar.append(f"yasak metin: {y}")
    if len(page.get_images()) != logo_sayisi:
        s.uyarilar.append(
            f"sayfada {len(page.get_images())} raster görsel var "
            f"({logo_sayisi} logo bekleniyordu)"
        )
    # fontlar gömülü mü
    for f in page.get_fonts():
        if f[1] in ("n/a", "") or (f[2] in ("Type1", "TrueType") and not f[0]):
            s.uyarilar.append(f"font gömülü değil olabilir: {f[3]}")
    fontlar = {
        span["font"]
        for blok in page.get_text("dict")["blocks"]
        for satir in blok.get("lines", [])
        for span in satir["spans"]
    }
    s.olcum["fontlar"] = ", ".join(sorted(fontlar))
    font_aileleri = {
        f.casefold().replace(" ", "").replace("-", "") for f in fontlar
    }
    if not any(f.startswith("hindsemibold") for f in font_aileleri):
        s.hatalar.append(f"PDF'de Hind SemiBold yazı tipi yok: {sorted(fontlar)!r}")
    if any(not f.startswith("hind") for f in font_aileleri):
        s.hatalar.append(f"PDF'de Hind dışında yazı tipi var: {sorted(fontlar)!r}")
    metin_pdf = page.get_text()
    turkce_harfler = set("ğşıİçöüĞŞİÖÇ")
    for alan in ("bilgi1", "bilgi2"):
        metin = v.get(alan, "")
        if (metin and any(harf in turkce_harfler for harf in metin)
                and metin not in metin_pdf and "…" not in metin_pdf):
            s.hatalar.append(f"PDF'den Türkçe {alan} metni çıkarılamadı: {metin!r}")

    # metin taşması / üst üste binme
    kutular = _metin_kutulari(page)
    bas = page.rect + (YAN_MIN_MM * MM, YAN_MIN_MM * MM, -YAN_MIN_MM * MM, -YAN_MIN_MM * MM)
    for metin, r, *_ in kutular:
        if not bas.contains(r):
            s.hatalar.append(f"metin basılabilir alan dışında: {metin!r}")
    cizim = _dolu_dikdortgenler(page)
    ogeler = [(m, r) for m, r, *_ in kutular] + [("barkod/karekod", r) for r in cizim]
    tol = 0.1 * MM
    for i in range(len(kutular)):
        for j in range(i + 1, len(ogeler)):
            a, b = ogeler[i][1], ogeler[j][1]
            ic = pymupdf.Rect(a) & b
            if not ic.is_empty and ic.width > tol and ic.height > tol:
                h = f"üst üste: {ogeler[i][0]!r} / {ogeler[j][0]!r}"
                if h not in s.hatalar:
                    s.hatalar.append(h)
    # en büyük punto (rulman kodu) ve hiza
    if kutular:
        buyuk = max(k[2] for k in kutular)
        s.olcum["kod_punto"] = round(buyuk, 1)
        kod_satir = [k for k in kutular if v["kod"] and k[0].startswith(v["kod"][:4])]
        if kod_satir:
            s.olcum["kod_yukseklik_mm"] = round(max(k[1].height for k in kod_satir) / MM, 1)
        x0lar = sorted({round(k[1].x0 / MM, 1) for k in kutular})
        s.olcum["sol_hizalar_mm"] = x0lar[:4]
    # barkod çizgi kalınlığı
    cub = _barkod_cubuklari(page)
    if cub:
        en_ince = min(r.width for r in cub)
        n300, tam300 = _nokta_kati(en_ince, 300)
        n600, tam600 = _nokta_kati(en_ince, 600)
        kenar_tam = all(_nokta_kati(r.x0, 300)[1] and _nokta_kati(r.x1, 300)[1] for r in cub)
        s.olcum["modul"] = f"{en_ince / MM:.3f}mm={n300:.2f}n@300"
        s.olcum["modul_600"] = round(n600, 2)
        if not tam300:
            s.uyarilar.append(f"en ince çubuk {n300:.2f} nokta (300 dpi'de tam sayı değil)")
        if not kenar_tam:
            s.uyarilar.append("çubuk kenarları 300 dpi nokta ızgarasına oturmuyor")
        if n300 < 1.98:
            s.uyarilar.append(f"en ince çubuk {n300:.2f} nokta (termalde en az 2 nokta önerilir)")
        genislik = max(r.x1 for r in cub) - min(r.x0 for r in cub)
        s.olcum["barkod_genislik_mm"] = round(genislik / MM, 1)
        bx0, bx1 = min(r.x0 for r in cub), max(r.x1 for r in cub)
        by0, by1 = min(r.y0 for r in cub), max(r.y1 for r in cub)
        sag_engel = [r.x0 for r in cizim if r.x0 >= bx1 + 0.01 and r.y0 < by1 and r.y1 > by0]
        sag_bos = (min(sag_engel) if sag_engel else page.rect.width) - bx1
        s.olcum["sessiz_modul(s/s)"] = f"{bx0 / en_ince:.0f}/{sag_bos / en_ince:.0f}"
        if v.get("barkod_no"):
            sol_sessiz = (bx0 - 36 * 72 / DPI) / en_ince
            s.olcum["ean_sessiz_modul(s/s)"] = f"{sol_sessiz:.0f}/{sag_bos / en_ince:.0f}"
            if sol_sessiz < 9 - 0.01 or sag_bos < 7 * en_ince - 0.01:
                s.hatalar.append(f"EAN-13 sessiz bölgesi dar: sol {sol_sessiz:.1f}, "
                                 f"sağ {sag_bos / en_ince:.1f} modül")
        elif bx0 < 10 * en_ince - 0.01 or sag_bos < 10 * en_ince - 0.01:
            s.hatalar.append(f"Code128 sessiz bölge 10 modülden dar: sol {bx0 / en_ince:.1f}, "
                             f"sağ {sag_bos / en_ince:.1f} modül")
    else:
        s.uyarilar.append("Barkod çizgileri vektör olarak bulunamadı (resim olabilir)")
    # gri piksel oranı barkod bölgesinde (ızgaraya oturmama göstergesi)
    if cub:
        x0 = int(min(r.x0 for r in cub) / 72 * DPI)
        x1 = int(max(r.x1 for r in cub) / 72 * DPI)
        y0 = int(min(r.y0 for r in cub) / 72 * DPI) + 2
        y1 = int(max(r.y1 for r in cub) / 72 * DPI) - 2
        bolge = img.crop((x0, y0, x1, y1))
        hist = bolge.histogram()
        gri = sum(hist[40:216]) / max(1, sum(hist))
        s.olcum["barkod_gri_%"] = round(100 * gri, 1)
        if gri > 0.02:
            s.uyarilar.append(f"barkod bölgesinde %{100 * gri:.0f} gri piksel (çizgiler nokta katı değil)")


def ciz_kontrol(ec, ad, boyut, v, cikti: Path) -> Sonuc:
    s = Sonuc(ad, "ciz", boyut)
    try:
        veri = ec.EtiketVerisi(**v)
        hata = ec.dogrula(veri)
        if hata:
            s.hatalar.append(f"dogrula geçerli girişi reddetti: {hata}")
            return s
        doc = ec.ciz(veri, boyut)
        if doc.page_count != 1:
            s.hatalar.append(f"kopya=1 iken {doc.page_count} sayfa")
        sayfa_kontrol(doc[0], v, boyut, s, cikti / f"{ad}.png")
        doc.save(cikti / f"{ad}.pdf")
        kutu = _metin_kutulari(doc[0])
        buyuk = max(k[2] for k in kutu)
        sayac: dict[str, int] = {}
        for k in kutu:
            if k[2] >= 0.8 * buyuk:
                sayac[k[0]] = sayac.get(k[0], 0) + 1
        yer = ec.yerlesim(veri, boyut)
        if boyut in ("62x25", "62x35"):
            if max(sayac.values()) > 1:
                s.hatalar.append(f"alt tekrar yok ama kod tekrar yazılmış: {sayac}")
        elif v["alt_tekrar"]:
            if yer.alt_y0 is not None and max(sayac.values()) < 2:
                s.hatalar.append("alt tekrar açık ama kod bir kez yazılmış")
            if yer.alt_tekrar_uygulanamadi and max(sayac.values()) > 1:
                s.hatalar.append("62x62 tekrar sığmadı ama ikinci kod bloğu çizildi")
        elif max(sayac.values()) > 1:
            s.hatalar.append(f"alt tekrar kapalı ama kod tekrar yazılmış: {sayac}")
        if hasattr(ec, "uyarilar"):
            for u in ec.uyarilar(veri, boyut):
                s.uyarilar.append("uygulama uyarısı: " + u)
            if any("kare koda" in u for u in ec.uyarilar(veri, boyut)):
                s.hatalar = [h for h in s.hatalar if not h.startswith("DataMatrix: bilgi")]
    except Exception as e:  # noqa: BLE001
        s.hatalar.append(f"ÇÖKTÜ: {type(e).__name__}: {e}")
        traceback.print_exc()
    return s


def cli_kontrol(ad, boyut, v, cikti: Path, logo: Path | None = None) -> Sonuc:
    s = Sonuc(ad, "cli", boyut)
    pdf = cikti / f"{ad}_cli.pdf"
    arg = [sys.executable, str(KOK / "rulman_etiket.py"), "--kod", v["kod"], "--ek", v["ek"],
           "--adet", str(v["adet"]), "--bilgi1", v["bilgi1"], "--bilgi2", v["bilgi2"],
           "--boyut", boyut, "--kopya", "2", "--pdf", str(pdf)]
    if v.get("barkod_no"):
        arg.extend(["--barkod", v["barkod_no"]])
    if logo:
        arg.extend(["--logo", str(logo)])
    if not v["alt_tekrar"]:
        arg.append("--alt-tekrar-yok")
    try:
        p = subprocess.run(arg, capture_output=True, text=True, timeout=120)
        if p.returncode != 0 or not pdf.exists():
            s.hatalar.append(f"çıkış kodu {p.returncode}: {(p.stderr or p.stdout).strip()[-300:]}")
            return s
        doc = pymupdf.open(pdf)
        if doc.page_count != 2:
            s.hatalar.append(f"--kopya 2 ama {doc.page_count} sayfa")
        if logo and any(len(page.get_image_info()) != 2 for page in doc):
            s.hatalar.append("CLI logosu kopya sayfalarında iki kez yer almadı")
        if v["adet_yazisi"] == "Qty":
            logo_sayisi = (2 if v["alt_tekrar"] else 1) if logo else 0
            sayfa_kontrol(doc[0], v, boyut, s, None, logo_sayisi)
            import etiket_cizim as ec
            veri = ec.EtiketVerisi(**{k: v[k] for k in v})
            if hasattr(ec, "uyarilar") and any("kare koda" in u for u in ec.uyarilar(veri, boyut)):
                s.hatalar = [h for h in s.hatalar if not h.startswith("DataMatrix: bilgi")]
                s.uyarilar.append("uygulama uyarısı: bilgi kare koda eklenmedi")
        else:
            s.uyarilar.append("CLI'de adet yazısı argümanı yok; yalnız barkod kontrol edildi")
    except Exception as e:  # noqa: BLE001
        s.hatalar.append(f"ÇÖKTÜ: {type(e).__name__}: {e}")
    return s


def _sentetik_logolar() -> tuple[bytes, bytes, bytes]:
    doc = pymupdf.open()
    page = doc.new_page(width=240, height=100)
    page.draw_rect(pymupdf.Rect(28, 18, 78, 80), color=(0, 0, 0), fill=(0, 0, 0))
    page.insert_text((90, 68), "QC", fontsize=48, fontname="helv", color=(0, 0, 0))
    normal = page.get_pixmap(colorspace=pymupdf.csRGB, alpha=False).tobytes("png")
    doc.close()

    doc = pymupdf.open()
    page = doc.new_page(width=500, height=70)
    page.draw_rect(pymupdf.Rect(24, 22, 474, 48), color=(0, 0, 0), fill=(0, 0, 0))
    page.insert_text((40, 43), "WIDE", fontsize=18, fontname="helv", color=(1, 1, 1))
    wide = page.get_pixmap(colorspace=pymupdf.csRGB, alpha=False).tobytes("png")
    doc.close()

    rgba = np.full((100, 240, 4), 255, dtype=np.uint8)
    rgba[:, :, 3] = 0
    rgba[20:80, 30:200, :3] = 0
    rgba[20:80, 30:200, 3] = 255
    rgba[20:80, 29, :3] = 0
    rgba[20:80, 29, 3] = 128
    alpha = pymupdf.Pixmap(
        pymupdf.csRGB, 240, 100, rgba.tobytes(), 1
    ).tobytes("png")
    return normal, wide, alpha


def logo_kontrol(ec, cikti: Path, cli_yok: bool) -> Sonuc:
    s = Sonuc("logo", "api", "62x100/62surekli")
    try:
        import yazdirma as yz
        from unittest.mock import patch

        normal, wide, alpha = _sentetik_logolar()
        trimmed = ec.logo_normalize(normal)
        trimmed_alpha = ec.logo_normalize(alpha)
        trimmed_jpeg = ec.logo_normalize(pymupdf.Pixmap(normal).tobytes("jpeg"))
        normal_source = pymupdf.Pixmap(normal)
        trimmed_pix = pymupdf.Pixmap(trimmed)
        alpha_source = pymupdf.Pixmap(alpha)
        alpha_pix = pymupdf.Pixmap(trimmed_alpha)
        if (trimmed_pix.width >= normal_source.width
                or trimmed_pix.height >= normal_source.height):
            s.hatalar.append("beyaz kenarlar otomatik kırpılmadı")
        if not alpha_source.alpha or alpha_pix.alpha or alpha_pix.colorspace.n != 1:
            s.hatalar.append("RGBA logo beyaza düzleştirilip gri tona dönüştürülmedi")
        if alpha_pix.width >= alpha_source.width or alpha_pix.height >= alpha_source.height:
            s.hatalar.append("saydam kenarlar otomatik kırpılmadı")
        alpha_samples = np.frombuffer(alpha_pix.samples, dtype=np.uint8)
        if not np.any((alpha_samples > 0) & (alpha_samples < 255)):
            s.hatalar.append("yarı saydam logo pikselleri beyaz zemine düzleştirilmedi")
        if pymupdf.Pixmap(trimmed_jpeg).colorspace.n != 1:
            s.hatalar.append("JPEG logo gri PNG'ye normalize edilmedi")

        with tempfile.TemporaryDirectory() as td:
            with patch.object(yz, "_veri_klasoru", return_value=Path(td)):
                kaydedilen = yz.logo_kaydet(alpha)
                if kaydedilen != trimmed_alpha or yz.logo_oku() != trimmed_alpha:
                    s.hatalar.append("logo_kaydet/logo_oku normalize PNG'yi saklamadı")
                yz.ayar_kaydet({"logo_kilitli": True})
                if not yz.ayar_oku().get("logo_kilitli"):
                    s.hatalar.append("logo_kilitli ayarı saklanmadı")
                yz.logo_sil()
                if yz.logo_oku() is not None:
                    s.hatalar.append("logo_sil saklanan logoyu kaldırmadı")

        for bad, expected in (
            (b"bozuk", "Logo dosyası açılamadı. PNG veya JPG seçin."),
            (b"\x89PNG\r\n\x1a\nbozuk", "Logo dosyası açılamadı. PNG veya JPG seçin."),
            (b"x" * (10 * 1024 * 1024 + 1),
             "Logo dosyası çok büyük (en fazla 10 MB)."),
        ):
            try:
                ec.logo_normalize(bad)
            except ec.EtiketHatasi as error:
                if str(error) != expected:
                    s.hatalar.append(f"logo hatası {str(error)!r} != {expected!r}")
            else:
                s.hatalar.append(f"geçersiz logo kabul edildi: {expected}")

        ornekler = [
            ("logo_ean_tekrar", V("6205-2RS", "C3", barkod_no="8691234567890"),
             trimmed, "62x100"),
            ("logo_ean_surekli", V("6308", "C3", barkod_no="869123456789", alt=True),
             trimmed_alpha, "62surekli"),
            ("logo_kodsuz_tekrar", V("6308", "C3", alt=False), trimmed_alpha, "62x100"),
            ("logo_uzun_kod", V("NNU4930-S-K-M-SP-XL-C3", "P6",
                                barkod_no="8691234567890"), wide, "62surekli"),
            ("font_gap_62x100", V(
                "6308-C-2HRS", "C3", barkod_no="8691234567890",
                bilgi1="0254X0511/0074647607/070684642-0030-10",
                bilgi2="MADE IN TURKEY"), trimmed, "62x100"),
            ("font_gap_surekli", V(
                "6308-C-2HRS", "C3", barkod_no="8691234567890",
                bilgi1="0254X0511/0074647607/070684642-0030-10",
                bilgi2="MADE IN TURKEY"), trimmed, "62surekli"),
            ("font_gap_62x62", V(
                "6308-C-2HRS", "C3", barkod_no="8691234567890",
                bilgi1="0254X0511/0074647607/070684642-0030-10",
                bilgi2="MADE IN TURKEY"), trimmed, "62x62"),
            ("logo_ufak_kutu", V(
                "6308-C-2HRS", "C3", barkod_no="8691234567890",
                bilgi1="LOT-123", bilgi2="MADE IN TURKEY", alt=True),
                trimmed, "62x35"),
            ("logo_kucuk", V(
                "6318-2Z", "C3", barkod_no="8691234567890",
                bilgi1="0254X0511/0074647607/070684642-0030-10",
                bilgi2="MADE IN TURKEY", alt=True), trimmed, "62x25"),
        ]
        cli_logo = cikti / "sentetik_logo.png"
        cli_logo.write_bytes(trimmed)
        for ad, giris, logo, boyut in ornekler:
            veri = ec.EtiketVerisi(**giris)
            yer = ec.yerlesim(veri, boyut, logo=logo)
            if not yer.logo_rect:
                s.hatalar.append(f"{ad}: logo dikdörtgeni yok")
                continue
            rect = pymupdf.Rect(*yer.logo_rect)
            expected_h = 4.0 if boyut == "62x25" else 5.0
            if ad == "logo_uzun_kod":
                expected_h = rect.height / MM
                if abs(rect.width / MM - 20) > 0.05 or rect.height >= 5 * MM:
                    s.hatalar.append("20 mm genişlik sınırında yükseklik orantılı küçülmedi")
            elif abs(rect.height / MM - expected_h) > 0.05:
                s.hatalar.append(f"{ad}: logo yüksekliği {rect.height / MM:.2f} mm değil")
            beklenen_kod_genisligi = ec.ICERIK * ec.NOKTA - rect.width - 2 * MM
            kod_sag = ec.KENAR * ec.NOKTA + yer.kod_genislik
            if (yer.kod_genislik > beklenen_kod_genisligi + 0.05
                    or rect.x0 - kod_sag < 2 * MM - 0.05):
                s.hatalar.append(f"{ad}: kod/suffix genişliği logoya göre ayrılmadı")
            if boyut in ("62x25", "62x35", "62x62"):
                son_taban = (
                    yer.ek_taban if yer.ek_taban is not None
                    else yer.kod_tabanlari[-1]
                )
                if abs(rect.y1 - son_taban) > 0.05:
                    s.hatalar.append(f"{ad}: logo ek/son kod satırına hizalı değil")

            doc = ec.ciz(veri, boyut, logo=logo)
            page = doc[0]
            rects = [pymupdf.Rect(i["bbox"]) for i in page.get_image_info()]
            beklenen_sayi = (
                1 if boyut in ("62x25", "62x35")
                else 2 if giris["alt_tekrar"] and yer.alt_y0 is not None
                else 1
            )
            sayfa_kontrol(
                page, giris, boyut, s, cikti / f"{ad}.png", beklenen_sayi
            )
            if ad.startswith("font_gap") and yer.bilgi_tabanlari and yer.alt_y0 is not None:
                son_taban = yer.ek_taban if yer.ek_taban is not None else yer.kod_tabanlari[-1]
                son_satir = giris["ek"] or yer.kod_satirlari[-1]
                son_pt = max(yer.kod_pt, yer.ek_pt) if giris["ek"] else yer.kod_pt
                ust_alt = son_taban + ec._alt_tasma(son_satir) * son_pt
                if yer.logo_rect:
                    ust_alt = max(ust_alt, yer.logo_rect[3])
                alt_ust = yer.alt_y0 + ec.BOSLUK_UST_ADET
                bilgi_ust = yer.bilgi_tabanlari[0] - yer.bilgi_pt * (
                    ec.BUYUK_HARF + ec._ust_tasma(yer.bilgi_satirlari[0])
                )
                bilgi_alt = yer.bilgi_tabanlari[-1] + yer.bilgi_pt * (
                    ec._alt_tasma(yer.bilgi_satirlari[-1])
                )
                aralik = alt_ust - ust_alt
                oran = ((bilgi_ust + bilgi_alt) / 2 - ust_alt) / aralik if aralik else 0
                s.olcum[f"{ad}_bilgi_merkez_orani"] = round(oran, 3)
                if abs(oran - 0.45) > 0.001:
                    s.hatalar.append(
                        f"{ad}: bilgi merkezi boşluğun %{oran * 100:.1f}'inde, %45 olmalı"
                    )
            if len(rects) != beklenen_sayi:
                s.hatalar.append(f"{ad}: {len(rects)} logo görüntüsü, {beklenen_sayi} olmalı")
            for image_rect in rects:
                kenarlar = (
                    image_rect.x0 / MM,
                    image_rect.y0 / MM,
                    (page.rect.width - image_rect.x1) / MM,
                    (page.rect.height - image_rect.y1) / MM,
                )
                if min(kenarlar) < 3.0 - 0.05:
                    s.hatalar.append(
                        f"{ad}: logo kenar boşluğu 3 mm'den küçük: {kenarlar!r}"
                    )
                if abs(image_rect.x1 - ec.SAG * ec.NOKTA) > 0.05:
                    s.hatalar.append(f"{ad}: logo sağ kenara hizalı değil")
                for text, bbox, *_ in _metin_kutulari(page):
                    if text in yer.kod_satirlari or (
                        giris["ek"] and text.strip() == giris["ek"]
                    ):
                        if bbox.intersects(image_rect):
                            s.hatalar.append(f"{ad}: logo {text!r} kod/ek satırıyla çakışıyor")
            if len(rects) == 2 and abs(rects[1].y0 - rects[0].y0) < 10 * MM:
                s.hatalar.append(f"{ad}: alt tekrar logosu ayrı blokta değil")
            doc.close()

        if not cli_yok:
            s_cli = cli_kontrol(
                "logo_cli", "62x100",
                V("6205-2RS", "C3", barkod_no="8691234567890"),
                cikti, logo=cli_logo,
            )
            s.hatalar.extend(s_cli.hatalar)
            s.uyarilar.extend(s_cli.uyarilar)
            s_kucuk = cli_kontrol(
                "kucuk_cli", "62x25",
                V("6318-2Z", "C3", barkod_no="8691234567890"), cikti,
            )
            s.hatalar.extend(s_kucuk.hatalar)
            s.uyarilar.extend(s_kucuk.uyarilar)
    except Exception as error:  # noqa: BLE001
        s.hatalar.append(f"logo kontrolü çöktü: {type(error).__name__}: {error}")
        traceback.print_exc()
    return s


def tablo(sonuclar: list[Sonuc]) -> str:
    satirlar = [f"{'örnek':34} {'kay':4} {'boyut':9} {'durum':6} {'sayfa':11} {'kenar s/u/s/a':18} "
                f"{'kod pt':6} {'modül':20} açıklama"]
    for s in sonuclar:
        o = s.olcum
        acik = "; ".join(s.hatalar + [f"(uyarı) {u}" for u in s.uyarilar])
        satirlar.append(
            f"{s.ad[:34]:34} {s.kaynak:4} {s.boyut:9} {'GEÇTİ' if s.gecti else 'HATA':6} "
            f"{o.get('sayfa_mm', '-'):11} {o.get('kenar_mm(s/u/s/a)', '-'):18} "
            f"{str(o.get('kod_punto', '-')):6} {o.get('modul', '-'):20} {acik}")
    return "\n".join(satirlar)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cikti", type=Path, default=Path(tempfile.gettempdir()) / "rulman_kk")
    ap.add_argument("--cli-yok", action="store_true", help="rulman_etiket.py --pdf testini atla")
    a = ap.parse_args()
    a.cikti.mkdir(parents=True, exist_ok=True)
    sonuclar: list[Sonuc] = []
    try:
        import etiket_cizim as ec
    except Exception as e:  # noqa: BLE001
        print(f"etiket_cizim yüklenemedi: {e}")
        return 1

    # sözleşme
    sz = Sonuc("sozlesme", "api", "-")
    for isim in (
        "EtiketVerisi", "BOYUTLAR", "dogrula", "yerlesim", "uyarilar",
        "logo_normalize", "ciz", "onizleme_png",
    ):
        if not hasattr(ec, isim):
            sz.hatalar.append(f"etiket_cizim.{isim} yok")
    if getattr(ec, "BOYUTLAR", None) is not None and list(ec.BOYUTLAR) != [
        "62x25", "62x35", "62x62", "62x100", "62surekli"
    ]:
        sz.hatalar.append(f"BOYUTLAR anahtarları {list(ec.BOYUTLAR)}")
    sonuclar.append(sz)
    if sz.hatalar:
        print(tablo(sonuclar))
        return 1

    for ad, boyut, v in ORNEKLER:
        sonuclar.append(ciz_kontrol(ec, ad, boyut, v, a.cikti))

    kucuk = Sonuc("sabit_yerlesim", "api", "62x25/35/62")
    try:
        tek = ec.yerlesim(
            ec.EtiketVerisi(**V("6318-2Z", "C3", bilgi1="LOT-123")), "62x25"
        )
        sample_info = "0254X0511/0074647607/070684642-0030-10"
        bolunmus = ec.yerlesim(
            ec.EtiketVerisi(**V(
                "6318-2Z", "C3", bilgi1=sample_info,
                barkod_no="8691234567890",
            )), "62x25"
        )
        uzun = ec.EtiketVerisi(**V("NU2215-E-XL-TVP2-C3", "C3"))
        uzun_yer = ec.yerlesim(uzun, "62x25")
        if len(tek.bilgi_satirlari) != 1 or tek.bilgi_pt != 5.5:
            kucuk.hatalar.append("kısa bilgi1 nominal boyutta tek satır değil")
        if (len(bolunmus.bilgi_satirlari) != 2
                or not bolunmus.bilgi_satirlari[0].endswith("/")):
            kucuk.hatalar.append("örnek bilgi1 eğik çizgiden bölünmedi")
        if "".join(bolunmus.bilgi_satirlari) != sample_info:
            kucuk.hatalar.append("örnek bilgi1 bölünürken karakter kayboldu veya eklendi")
        if uzun_yer.mod != "karekod" or uzun_yer.cubuk_bitler:
            kucuk.hatalar.append("uzun Code128 çizgili barkodu düşürmedi")
        if not any("Kod çok uzun olduğu için çizgili barkod basılmadı" in u
                   for u in ec.uyarilar(uzun, "62x25")):
            kucuk.hatalar.append("uzun Code128 Türkçe yedek uyarısı yok")
        for boyut in ("62x25", "62x35"):
            tekrar = ec.yerlesim(
                ec.EtiketVerisi(**V("6318-2Z", "C3", alt=True)), boyut
            )
            if tekrar.alt_y0 is not None:
                kucuk.hatalar.append(f"{boyut} alt_tekrar değerini yok saymadı")
        standart = ec.EtiketVerisi(**V(
            "6308-C-2HRS", "C3",
            bilgi1="0254X0511/0074647607/070684642-0030-10",
            bilgi2="MADE IN TURKEY", barkod_no="8691234567890",
        ))
        tekrar = ec.yerlesim(standart, "62x62")
        if tekrar.alt_y0 is not None:
            kucuk.olcum["62x62 tekrar"] = "uygulandı"
            if tekrar.alt_tekrar_uygulanamadi:
                kucuk.hatalar.append("62x62 tekrar hem çizildi hem sığmadı sayıldı")
        elif tekrar.alt_tekrar_uygulanamadi:
            kucuk.olcum["62x62 tekrar"] = "62x35 düzenine düşürüldü"
            if not any("alt tekrar sığmadığı" in u for u in tekrar.uyarilar):
                kucuk.hatalar.append("62x62 tekrar fallback uyarısı yok")
            kucuk.uyarilar.append("Standart 62x62 örneğinde alt tekrar sığmadı.")
        else:
            kucuk.hatalar.append("62x62 alt tekrar açıkken çizilmedi veya fallback olmadı")
        for boyut in ("62x35", "62x62"):
            ust = ec.yerlesim(standart, boyut)
            dm_h = ec._pt(len(ust.dm) * ust.dm_modul)
            barkod_h = (
                ec._pt(ust.cubuk_h) + 0.3 * ec.MM
                + ust.ean_rakam_pt * (ec.BUYUK_HARF + ec.ALT_TASMA)
                if ust.ean_kodu else
                ec._pt(ust.cubuk_h) + 0.7 * ec.MM
                + ust.rakam_pt * ec.BUYUK_HARF
            )
            if dm_h > barkod_h + 0.01:
                kucuk.hatalar.append(
                    f"{boyut} kare kod barkod satırından daha yüksek"
                )
        kompakt = ec.yerlesim(standart, "62x25")
        if kompakt.bilgi2_text:
            if kompakt.bilgi2_pt >= ec.PROFILLER["62x25"].adet_pt:
                kucuk.hatalar.append("62x25 bilgi2 Qty yazısından küçük değil")
            bilgi2_alt = (
                kompakt.bilgi2_taban
                + kompakt.bilgi2_pt * ec._alt_tasma(kompakt.bilgi2_text)
            )
            alt_kenar = kompakt.yukseklik - ec._pt(ec.KENAR)
            if abs(bilgi2_alt - alt_kenar) > 0.01:
                kucuk.hatalar.append("62x25 bilgi2 alt kenar boşluğunda değil")
            son_taban = kompakt.ek_taban or kompakt.kod_tabanlari[-1]
            son_metin = (
                standart.ek.strip()
                if kompakt.ek_taban is not None else kompakt.kod_satirlari[-1]
            )
            son_pt = kompakt.ek_pt if kompakt.ek_taban is not None else kompakt.kod_pt
            kod_alt = son_taban + son_pt * ec._alt_tasma(son_metin)
            bilgi2_ust = (
                kompakt.bilgi2_taban
                - kompakt.bilgi2_pt * (
                    ec.BUYUK_HARF + ec._ust_tasma(kompakt.bilgi2_text)
                )
            )
            if kod_alt + 0.25 * ec.MM > bilgi2_ust:
                kucuk.hatalar.append("62x25 C3 ile bilgi2 arasında boşluk yok")
        standart.alt_tekrar = False
        tekrar_kapali = ec.yerlesim(standart, "62x62")
        if tekrar_kapali.alt_y0 is not None or tekrar_kapali.alt_tekrar_uygulanamadi:
            kucuk.hatalar.append("62x62 alt_tekrar=False durumuna uymadı")
    except Exception as error:  # noqa: BLE001
        kucuk.hatalar.append(f"62x25 yerleşimi çöktü: {type(error).__name__}: {error}")
    sonuclar.append(kucuk)

    baski_kalite = Sonuc("baski_kalitesi", "api", "-")
    try:
        import yazdirma as yz

        class SahteWin32Print:
            DC_ENUMRESOLUTIONS = 13
            DM_PRINTQUALITY = 0x400
            DM_YRESOLUTION = 0x2000

            def __init__(self, cozumler):
                self.cozumler = cozumler
                self.cagri = 0

            def DeviceCapabilities(self, yazici, port, tur):
                self.cagri += 1
                if (yazici, port, tur) != ("Brother QL-550", "USB001", 13):
                    raise AssertionError("DeviceCapabilities argümanları yanlış")
                return self.cozumler

        kaliteli = SahteWin32Print([(300, 300), (300, 600)])
        dm = SimpleNamespace(Fields=1, PrintQuality=200, YResolution=300)
        if not yz._yuksek_baski_kalitesi("Brother QL-550", "USB001", dm, kaliteli):
            baski_kalite.hatalar.append("300x600 çözünürlük seçilmedi")
        if (dm.PrintQuality, dm.YResolution) != (300, 600):
            baski_kalite.hatalar.append("DEVMODE çözünürlüğü 300x600 olmadı")
        if dm.Fields != 1 | kaliteli.DM_PRINTQUALITY | kaliteli.DM_YRESOLUTION:
            baski_kalite.hatalar.append("DEVMODE çözünürlük alan bayrakları eksik")

        standart = SahteWin32Print([(300, 300)])
        dm = SimpleNamespace(Fields=7, PrintQuality=200, YResolution=300)
        if yz._yuksek_baski_kalitesi("Brother QL-550", "USB001", dm, standart):
            baski_kalite.hatalar.append("yalnız 300x300 varken çözünürlük değişti")
        if (dm.Fields, dm.PrintQuality, dm.YResolution) != (7, 200, 300):
            baski_kalite.hatalar.append("çözünürlük bulunmadığında DEVMODE değişti")

        diger = SahteWin32Print([(300, 600)])
        dm = SimpleNamespace(Fields=7, PrintQuality=200, YResolution=300)
        if yz._yuksek_baski_kalitesi("HP LaserJet", "USB001", dm, diger):
            baski_kalite.hatalar.append("Brother olmayan yazıcı ayarı değişti")
        if diger.cagri or (dm.Fields, dm.PrintQuality, dm.YResolution) != (7, 200, 300):
            baski_kalite.hatalar.append("Brother olmayan yazıcıya çözünürlük uygulandı")
    except Exception as error:  # noqa: BLE001
        baski_kalite.hatalar.append(
            f"yazdırma çözünürlüğü kontrolü çöktü: {type(error).__name__}: {error}"
        )
    sonuclar.append(baski_kalite)

    sonuclar.append(logo_kontrol(ec, a.cikti, a.cli_yok))

    # dogrula
    d = Sonuc("dogrula", "api", "-")
    for ad, v in DOGRULA_HATALI:
        try:
            if not ec.dogrula(ec.EtiketVerisi(**v)):
                d.hatalar.append(f"{ad} kabul edildi")
        except Exception as e:  # noqa: BLE001
            d.hatalar.append(f"{ad} çöktü: {e}")
    for ad, v in DOGRULA_GECERLI:
        try:
            h = ec.dogrula(ec.EtiketVerisi(**v))
            if h:
                d.hatalar.append(f"{ad} reddedildi: {h}")
        except Exception as e:  # noqa: BLE001
            d.hatalar.append(f"{ad} çöktü: {e}")
    sonuclar.append(d)

    ean_dogrula = Sonuc("ean13_dogrula", "api", "-")
    for numara, beklenen in (("869123456789", "8691234567890"),
                             ("869 123 456 789", "8691234567890"),
                             ("8691234567890", "8691234567890")):
        try:
            if ec.ean13(numara) != beklenen:
                ean_dogrula.hatalar.append(f"{numara!r}: ean13 sonucu {ec.ean13(numara)!r}")
        except Exception as e:  # noqa: BLE001
            ean_dogrula.hatalar.append(f"{numara!r} çöktü: {e}")
    for numara, beklenen in (
        ("8691234567892", "Barkod numarasının son hanesi hatalı (doğrusu 0 olmalı)."),
        ("86912345678A", "Barkod numarası 12 veya 13 haneli olmalı, sadece rakam."),
        ("86912345678", "Barkod numarası 12 veya 13 haneli olmalı, sadece rakam."),
    ):
        try:
            hata = ec.dogrula(ec.EtiketVerisi(kod="6205", barkod_no=numara))
            if beklenen not in hata:
                ean_dogrula.hatalar.append(f"{numara!r} için {beklenen!r} hatası yok: {hata!r}")
        except Exception as e:  # noqa: BLE001
            ean_dogrula.hatalar.append(f"{numara!r} doğrulama çöktü: {e}")
    sonuclar.append(ean_dogrula)

    rastgele = Sonuc("rastgele_ean13", "api", "-")
    try:
        for _ in range(200):
            numara = ec.rastgele_ean13()
            if len(numara) != 13 or not numara.startswith("20") or ec.ean13(numara) != numara:
                rastgele.hatalar.append(f"geçersiz rastgele EAN-13: {numara!r}")
                break
        from unittest.mock import patch
        kullanilan = {ec.ean13("20" + "0" * 10)}
        with patch.object(ec.secrets, "randbelow", side_effect=[0] * 10 + [1] + [0] * 9):
            yeni = ec.rastgele_ean13(kullanilan)
        if yeni in kullanilan:
            rastgele.hatalar.append("rastgele_ean13 kullanılmış numarayı yeniden üretti")
    except Exception as e:  # noqa: BLE001
        rastgele.hatalar.append(f"rastgele_ean13 denemesi çöktü: {e}")
    sonuclar.append(rastgele)

    recent = Sonuc("son_kod_barkod", "api", "-")
    try:
        import yazdirma as yz
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as td:
            with patch.object(yz, "_veri_klasoru", return_value=Path(td)):
                etiket = ec.EtiketVerisi(kod="6205", barkod_no="869123456789")
                yz.son_kod_ekle(etiket)
                json_kayit = json.loads((Path(td) / "son_kodlar.json").read_text(encoding="utf-8"))
                geri = yz.son_kodlar()
                if not json_kayit or json_kayit[0].get("barkod_no") != etiket.barkod_no:
                    recent.hatalar.append("son_kodlar.json barkod_no alanını saklamadı")
                if not geri or geri[0].get("barkod_no") != etiket.barkod_no:
                    recent.hatalar.append("son_kodlar() barkod_no alanını geri yüklemedi")
    except Exception as e:  # noqa: BLE001
        recent.hatalar.append(f"son_kod barkod_no denemesi çöktü: {e}")
    sonuclar.append(recent)

    # garip girişler: dogrula reddetmezse çizim temiz olmalı
    for ad, v in TUHAF_GIRIS:
        s = Sonuc("tuhaf_" + ad, "api", "62x100")
        try:
            veri = ec.EtiketVerisi(**v)
            h = ec.dogrula(veri)
            if h:
                s.olcum["dogrula"] = h
                s.uyarilar.append("reddedildi: " + "; ".join(h))
            else:
                doc = ec.ciz(veri, "62x100")
                sayfa_kontrol(doc[0], v, "62x100", s, a.cikti / f"tuhaf_{ad}.png")
        except Exception as e:  # noqa: BLE001
            s.hatalar.append(f"ÇÖKTÜ: {type(e).__name__}: {e}")
        sonuclar.append(s)

    # sınır: kaç karakterlik kod kabul ediliyor, reddedilirse mesaj
    sn = Sonuc("kod_uzunluk_siniri", "api", "-")
    for boyut in ("62x100", "62surekli"):
        en_uzun = 0
        mesaj = ""
        for n in range(10, 41):
            kod = ("NU2215-E-XL-TVP2-K-H315-C3-ABCDEFGHJKLMN" * 2)[:n].rstrip("-") or "X"
            try:
                h = ec.dogrula(ec.EtiketVerisi(kod=kod, ek="C3"))
            except Exception as e:  # noqa: BLE001
                sn.hatalar.append(f"{n} karakter çöktü: {e}")
                break
            if h:
                mesaj = mesaj or f"{n}: {h[0]}"
            else:
                en_uzun = n
                try:
                    ev = ec.EtiketVerisi(kod=kod, ek="C3")
                    doc = ec.ciz(ev, boyut)
                    c = _coz(_png(doc[0]))
                    yalniz_kare = any("çizgili barkod basılmadı" in u for u in ec.uyarilar(ev, boyut))
                    if yalniz_kare:
                        sn.olcum.setdefault(f"yalniz_karekod_{boyut}", n)
                        if c["Code128"] or c["DataMatrix"] != [kod + " C3\n1"]:
                            sn.hatalar.append(f"{boyut} {n} karakter: yalnız kare kod modunda okuma yanlış: {c}")
                    elif c["Code128"] != [kod + " C3"]:
                        sn.hatalar.append(f"{boyut} {n} karakter: Code128 okunmadı")
                except Exception as e:  # noqa: BLE001
                    sn.hatalar.append(f"{boyut} {n} karakter kabul edildi ama çizilemedi: {e}")
        sn.olcum[f"en_uzun_{boyut}"] = en_uzun
        yk = sn.olcum.get(f"yalniz_karekod_{boyut}")
        sn.uyarilar.append(f"{boyut}: ek=C3 ile en uzun kod {en_uzun} karakter; ilk ret -> {mesaj or 'yok'}"
                           + (f"; {yk}+ karakterde çizgili barkod basılmıyor" if yk else ""))
    sonuclar.append(sn)

    # kopya ve önizleme
    k = Sonuc("kopya_onizleme", "api", "-")
    try:
        veri = ec.EtiketVerisi(**ORNEKLER[2][2])
        for boyut in ("62x100", "62surekli"):
            doc = ec.ciz(veri, boyut, kopya=3)
            if doc.page_count != 3:
                k.hatalar.append(f"{boyut} kopya=3 -> {doc.page_count} sayfa")
            png = ec.onizleme_png(veri, boyut, dpi=150)
            if not png.startswith(b"\x89PNG"):
                k.hatalar.append(f"{boyut} onizleme_png PNG değil")
            else:
                img = Image.open(io.BytesIO(png))
                k.olcum[f"onizleme_{boyut}"] = img.size
                c = _coz(img.convert("L"))
                if c["Code128"] != [beklenen_code128(ORNEKLER[2][2])]:
                    k.uyarilar.append(f"{boyut} 150 dpi önizlemede Code128 okunmadı")
        sablon = KOK / "test" / "onizleme" / "01_6308_C3_62x100.png"
        ilk = ec.EtiketVerisi("6308-C-2HRS", "C3", 1)
        if not sablon.is_file() or ec.onizleme_png(ilk, "62x100", dpi=300) != sablon.read_bytes():
            k.hatalar.append("EAN boşken 62x100 çıktı değişti")
    except Exception as e:  # noqa: BLE001
        k.hatalar.append(f"ÇÖKTÜ: {type(e).__name__}: {e}")
    sonuclar.append(k)

    # komut satırı (--pdf)
    if not a.cli_yok:
        if (KOK / "rulman_etiket.py").exists():
            for ad, boyut, v in ORNEKLER:
                sonuclar.append(cli_kontrol(ad, boyut, v, a.cikti))
            p = subprocess.run([sys.executable, str(KOK / "rulman_etiket.py"), "--kontrol"],
                               capture_output=True, text=True, timeout=60)
            kk = Sonuc("--kontrol", "cli", "-")
            kk.olcum["cikis"] = p.returncode
            kk.uyarilar.append(f"çıkış {p.returncode}: "
                               f"{(p.stdout + p.stderr).strip()[-200:]}")
            sonuclar.append(kk)
        else:
            sonuclar.append(Sonuc("cli", "cli", "-", uyarilar=["rulman_etiket.py yok, atlandı"]))

    print(tablo(sonuclar))
    (a.cikti / "sonuc.json").write_text(json.dumps(
        [dict(ad=s.ad, kaynak=s.kaynak, boyut=s.boyut, gecti=s.gecti, hatalar=s.hatalar,
              uyarilar=s.uyarilar, olcum=s.olcum) for s in sonuclar],
        ensure_ascii=False, indent=1, default=str), encoding="utf-8")
    hata = sum(not s.gecti for s in sonuclar)
    print(f"\n{len(sonuclar)} kontrol, {hata} hatalı. Çıktılar: {a.cikti}")
    return 1 if hata else 0


if __name__ == "__main__":
    sys.exit(main())
