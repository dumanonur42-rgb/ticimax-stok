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


def V(kod, ek="", adet=1, bilgi1="", bilgi2="", alt=True, yazi="Qty"):
    return dict(kod=kod, ek=ek, adet=adet, adet_yazisi=yazi, bilgi1=bilgi1, bilgi2=bilgi2,
                alt_tekrar=alt)


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
    out: dict[str, list[str]] = {"Code128": [], "DataMatrix": [], "diger": []}
    for r in zxingcpp.read_barcodes(img):
        ad = r.format.name if hasattr(r.format, "name") else str(r.format)
        if "Code128" in ad:
            out["Code128"].append(r.text)
        elif "DataMatrix" in ad:
            out["DataMatrix"].append(r.text)
        else:
            out["diger"].append(f"{ad}:{r.text}")
    return out


def _metin_kutulari(page: pymupdf.Page) -> list[tuple[str, pymupdf.Rect, float, str]]:
    """Her satır için (metin, sıkı glif kutusu, punto, font)."""
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
                inen = 0.21 * s if any(c in "gjpqyşçğ,;()/" for c in metin) else 0.0
                kutular.append((metin, pymupdf.Rect(x0, oy - 0.72 * s, x1, oy + inen), s,
                                span["font"]))
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
    """Sol üstteki Code128 çubukları (dar, uzun dolu dikdörtgenler)."""
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


def sayfa_kontrol(page: pymupdf.Page, v: dict, boyut: str, s: Sonuc, png_yol: Path | None):
    w_mm, h_mm = page.rect.width / MM, page.rect.height / MM
    s.olcum["sayfa_mm"] = f"{w_mm:.1f}x{h_mm:.1f}"
    if abs(w_mm - 62) > 0.3:
        s.hatalar.append(f"sayfa genişliği {w_mm:.2f} mm (62 olmalı)")
    if boyut == "62x100" and abs(h_mm - 100) > 0.3:
        s.hatalar.append(f"sayfa yüksekliği {h_mm:.2f} mm (100 olmalı)")
    if boyut == "62surekli" and not (SUREKLI_MIN_MM <= h_mm <= SUREKLI_MAX_MM):
        s.hatalar.append(f"sürekli rulo uzunluğu {h_mm:.1f} mm (QL-550: 25-1000 mm)")

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
    beklenen = beklenen_code128(v)
    if coz["Code128"] != [beklenen]:
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
        if c["Code128"] != [beklenen] or len(c["DataMatrix"]) != 1:
            s.uyarilar.append(f"±1 nokta ({ad}) baskıda okunmadı: {c['Code128']}/{len(c['DataMatrix'])}")

    # yasak marka metinleri / görseller
    tum = page.get_text().upper()
    for y in YASAK_METIN:
        if y in tum and y not in (v["kod"] + v["ek"] + v["bilgi1"] + v["bilgi2"]).upper():
            s.hatalar.append(f"yasak metin: {y}")
    if page.get_images():
        s.uyarilar.append(f"sayfada {len(page.get_images())} raster görsel var (logo olmamalı)")
    # fontlar gömülü mü
    for f in page.get_fonts():
        if f[1] in ("n/a", "") or (f[2] in ("Type1", "TrueType") and not f[0]):
            s.uyarilar.append(f"font gömülü değil olabilir: {f[3]}")

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
        if bx0 < 10 * en_ince - 0.01 or sag_bos < 10 * en_ince - 0.01:
            s.hatalar.append(f"Code128 sessiz bölge 10 modülden dar: sol {bx0 / en_ince:.1f}, "
                             f"sağ {sag_bos / en_ince:.1f} modül")
    else:
        s.uyarilar.append("Code128 çubukları vektör olarak bulunamadı (resim olabilir)")
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
        if v["alt_tekrar"] and max(sayac.values()) < 2:
            s.hatalar.append("alt tekrar açık ama kod bir kez yazılmış")
        if not v["alt_tekrar"] and max(sayac.values()) > 1:
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


def cli_kontrol(ad, boyut, v, cikti: Path) -> Sonuc:
    s = Sonuc(ad, "cli", boyut)
    pdf = cikti / f"{ad}_cli.pdf"
    arg = [sys.executable, str(KOK / "rulman_etiket.py"), "--kod", v["kod"], "--ek", v["ek"],
           "--adet", str(v["adet"]), "--bilgi1", v["bilgi1"], "--bilgi2", v["bilgi2"],
           "--boyut", boyut, "--kopya", "2", "--pdf", str(pdf)]
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
        if v["adet_yazisi"] == "Qty":
            sayfa_kontrol(doc[0], v, boyut, s, None)
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
    for isim in ("EtiketVerisi", "BOYUTLAR", "dogrula", "ciz", "onizleme_png"):
        if not hasattr(ec, isim):
            sz.hatalar.append(f"etiket_cizim.{isim} yok")
    if getattr(ec, "BOYUTLAR", None) is not None and set(ec.BOYUTLAR) != {"62x100", "62surekli"}:
        sz.hatalar.append(f"BOYUTLAR anahtarları {list(ec.BOYUTLAR)}")
    sonuclar.append(sz)
    if sz.hatalar:
        print(tablo(sonuclar))
        return 1

    for ad, boyut, v in ORNEKLER:
        sonuclar.append(ciz_kontrol(ec, ad, boyut, v, a.cikti))

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
            kk.uyarilar.append(f"çıkış {p.returncode} (Linux'ta SumatraPDF yok, bilgi amaçlı): "
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
