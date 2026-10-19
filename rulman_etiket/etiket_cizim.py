"""Rulman Etiket — etiket çizimi (Brother QL-550, 300 dpi, 62 mm).

Tasarımın ayrıntısı ve ölçüler: TASARIM.md. Bu modül arayüzden bağımsızdır;
veriyi alır, vektörel PDF (pymupdf.Document) ya da PNG önizleme üretir.

Barkod ve DataMatrix modülleri 300 dpi nokta ızgarasına oturtulur
(1 nokta = 72/300 pt), böylece yazıcıda çizgi kalınlıkları eşit çıkar.
"""
from __future__ import annotations

import secrets
import sys
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pymupdf
import zxingcpp
from barcode import Code128, EAN13

# ---------------------------------------------------------------- birimler
MM = 72 / 25.4            # 1 mm = 2.8346 pt
NOKTA = 72 / 300          # 1 yazıcı noktası (300 dpi) = 0.24 pt
SAYFA_GENISLIK = 62 * MM


def _nokta(mm: float) -> int:
    return round(mm * 300 / 25.4)


def _pt(nokta: float) -> float:
    return nokta * NOKTA


# --------------------------------------------------------------------- font
def _klasor() -> Path:
    return Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))


def _font_yolu(ad: str) -> Path:
    for aday in (_klasor() / "fonts" / ad, Path(__file__).resolve().parent / "fonts" / ad):
        if aday.exists():
            return aday
    raise FileNotFoundError(f"Yazı tipi bulunamadı: {ad}")


_FONTLAR: dict[str, pymupdf.Font] = {}


def _font(kalin: bool) -> pymupdf.Font:
    ad = "Hind-Bold.ttf" if kalin else "Hind-Medium.ttf"
    if ad not in _FONTLAR:
        _FONTLAR[ad] = pymupdf.Font(fontfile=str(_font_yolu(ad)))
    return _FONTLAR[ad]


BUYUK_HARF = 0.679        # Hind OS/2.sCapHeight (em)
ALT_TASMA = 0.268         # Hind Bold'da en derin glif (ç/ş) (em)
# Glif taşmaları Hind font konturlarından ölçülmüştür.
_UST_TASMALAR = {
    "Ğ": 0.219, "İ": 0.212, "Ö": 0.212, "ğ": 0.052, "i": 0.060, "j": 0.060,
    "f": 0.041, "b": 0.028, "d": 0.028, "h": 0.028, "l": 0.028, "ö": 0.047,
    "ü": 0.045, "$": 0.112, "`": 0.119, "%": 0.044, "(": 0.028, ")": 0.028,
    "/": 0.028, "[": 0.028, "\\": 0.028, "]": 0.028, "{": 0.037, "}": 0.037,
}
_ALT_TASMALAR = {
    "ç": 0.268, "ş": 0.268, "Ç": 0.268, "Ş": 0.268, "g": 0.196, "y": 0.198,
    "j": 0.198, "p": 0.194, "q": 0.194, "ğ": 0.196, "(": 0.196, ")": 0.196,
    "[": 0.196, "]": 0.196, "{": 0.206, "}": 0.206, "|": 0.194, "@": 0.216,
    ",": 0.127, ";": 0.127, "/": 0.103, "\\": 0.103, "_": 0.166, "$": 0.118,
    "Q": 0.151,
}


def _ust_tasma(metin: str) -> float:
    return max((_UST_TASMALAR.get(c, 0.0) for c in metin), default=0.0)


def _alt_tasma(metin: str) -> float:
    return max((_ALT_TASMALAR.get(c, 0.0) for c in metin), default=0.0)


def _gen(s: str, pt: float, kalin: bool) -> float:
    return _font(kalin).text_length(s, fontsize=pt)


# ------------------------------------------------------------------- veri
@dataclass
class EtiketVerisi:
    kod: str
    ek: str = ""
    adet: int = 1
    adet_yazisi: str = "Qty"
    bilgi1: str = ""
    bilgi2: str = ""
    alt_tekrar: bool = True
    barkod_no: str = ""


BOYUTLAR: dict[str, str] = {
    "62x100": "62 x 100 mm kesik etiket (DK-11202)",
    "62surekli": "62 mm sürekli rulo (DK-22205)",
}


class EtiketHatasi(ValueError):
    """str(e) kullanıcıya gösterilecek Türkçe metindir."""


@dataclass(frozen=True)
class _Logo:
    png: bytes
    width: int
    height: int


_LOGO_BUYUKLUK = 10 * 1024 * 1024
_LOGO_ACILAMADI = "Logo dosyası açılamadı. PNG veya JPG seçin."


def _logo_hazirla(logo: bytes | None) -> _Logo | None:
    if logo is None:
        return None
    if not isinstance(logo, bytes):
        raise EtiketHatasi(_LOGO_ACILAMADI)
    if len(logo) > _LOGO_BUYUKLUK:
        raise EtiketHatasi("Logo dosyası çok büyük (en fazla 10 MB).")
    if not (
        logo.startswith(b"\x89PNG\r\n\x1a\n") or logo.startswith(b"\xff\xd8\xff")
    ):
        raise EtiketHatasi(_LOGO_ACILAMADI)
    try:
        source = pymupdf.Pixmap(logo)
        if source.width < 1 or source.height < 1 or source.colorspace is None:
            raise ValueError
        rgb = pymupdf.Pixmap(pymupdf.csRGB, source)
        samples = np.frombuffer(rgb.samples, dtype=np.uint8).reshape(
            rgb.height, rgb.width, rgb.n
        )
        gray = (
            (samples[:, :, 0].astype(np.uint32) * 299
             + samples[:, :, 1].astype(np.uint32) * 587
             + samples[:, :, 2].astype(np.uint32) * 114 + 500) // 1000
        ).astype(np.uint8)
        if rgb.alpha:
            alpha = samples[:, :, 3].astype(np.uint32)
            gray = (
                (gray.astype(np.uint32) * alpha + 255 * (255 - alpha) + 127) // 255
            ).astype(np.uint8)

        content = np.argwhere(gray < 250)
        if content.size:
            y0, x0 = content.min(axis=0)
            y1, x1 = content.max(axis=0) + 1
            gray = gray[y0:y1, x0:x1]
        gray = np.ascontiguousarray(gray)
        pixmap = pymupdf.Pixmap(
            pymupdf.csGRAY, gray.shape[1], gray.shape[0], gray.tobytes(), 0
        )
        return _Logo(pixmap.tobytes("png"), gray.shape[1], gray.shape[0])
    except Exception as error:  # noqa: BLE001 - image decoders expose varying errors
        raise EtiketHatasi(_LOGO_ACILAMADI) from error


def logo_normalize(logo: bytes) -> bytes:
    """Validate, flatten, trim, and normalize a PNG/JPG logo to grayscale PNG."""
    prepared = _logo_hazirla(logo)
    if prepared is None:
        raise EtiketHatasi(_LOGO_ACILAMADI)
    return prepared.png


# ------------------------------------------------------------ ölçü profili
@dataclass(frozen=True)
class _Profil:
    yukseklik_mm: float | None   # None = sürekli rulo (uzunluk hesaplanır)
    kod_pt: float                # rulman kodu / ek (kalın)
    adet_pt: float               # "1 Qty" (kalın)
    bilgi_pt: float              # bilgi satırları (normal)
    rakam_pt: float              # barkod altı yazı (normal)
    cubuk_mm: float              # Code128 çubuk yüksekliği
    dm_hedef: int                # DataMatrix hedef genişliği (nokta)
    min_uzunluk_mm: float = 0    # sürekli rulo: alt tekrar açıkken en kısa boy


PROFILLER = {
    "62x100": _Profil(100, kod_pt=20, adet_pt=10, bilgi_pt=8, rakam_pt=7,
                      cubuk_mm=10, dm_hedef=168),
    "62surekli": _Profil(None, kod_pt=18, adet_pt=9, bilgi_pt=7.5, rakam_pt=7,
                         cubuk_mm=9, dm_hedef=156, min_uzunluk_mm=80),
}

KENAR = 36                        # sol/sağ/üst/alt boşluk, nokta (3.05 mm)
SAG = round(SAYFA_GENISLIK / NOKTA) - KENAR   # içerik sağ sınırı (nokta)
ICERIK = SAG - KENAR              # 660 nokta = 55.9 mm
SESSIZ = 10                       # Code128 sessiz bölge (modül)
CUBUK_MODUL = (3, 2)              # denenen Code128 modül genişlikleri (nokta)
DM_MODUL_MAX, DM_MODUL_MIN = 8, 5  # DataMatrix modülü (nokta): 0.68 .. 0.42 mm
DM_EN_FAZLA = 260                 # DataMatrix en fazla 260 nokta (22 mm, 52x52 modül x 5 nokta)
KOD_MIN_TEK = 12                  # tek satır kod için en küçük punto
KOD_MIN_IKI = 9                   # iki satır kod için en küçük punto
BILGI_MIN = 6
RAKAM_MIN = 5

BOSLUK_UST_ADET = 2.4 * MM        # üst sıra -> "1 Qty"
BOSLUK_ADET_KOD = 1.6 * MM        # "1 Qty" -> kod
KOD_ARALIK = 0.95                 # kod/ek satır aralığı (em)
BOSLUK_KOD_BILGI = 3.5 * MM       # ek -> bilgi
BILGI_ARALIK = 1.3                # bilgi satır aralığı (em)
MIN_ESNEK = 6 * MM                # üst blok ile alt tekrar arası en az
MAX_KOD = 40
MAX_EK = 15
MAX_BILGI = 60
MAX_ADET_YAZISI = 12
MAX_KOPYA = 999


# ------------------------------------------------------------------ içerik
def barkod_metni(veri: EtiketVerisi) -> str:
    kod, ek = veri.kod.strip(), veri.ek.strip()
    return f"{kod} {ek}" if ek else kod


def _bilgiler(veri: EtiketVerisi) -> list[str]:
    return [b.strip() for b in (veri.bilgi1, veri.bilgi2) if b and b.strip()]


def datamatrix_metni(veri: EtiketVerisi, bilgili: bool = True) -> str:
    satirlar = [barkod_metni(veri), str(veri.adet)]
    if bilgili:
        satirlar += _bilgiler(veri)
    return "\n".join(satirlar)


def _adet_satiri(veri: EtiketVerisi) -> str:
    return f"{veri.adet} {veri.adet_yazisi.strip()}".strip()


def _code128(metin: str) -> str:
    return Code128(metin).build()[0]


def ean13(barkod_no: str) -> str:
    """12 haneyi tamamlar veya 13 haneli EAN-13 kontrol hanesini doğrular."""
    numara = (barkod_no or "").replace(" ", "")
    if len(numara) not in (12, 13) or any(c < "0" or c > "9" for c in numara):
        raise EtiketHatasi("Barkod numarası 12 veya 13 haneli olmalı, sadece rakam.")
    ilk_haneler = numara[:12]
    toplam = sum(int(hane) * (1 if i % 2 == 0 else 3)
                 for i, hane in enumerate(ilk_haneler))
    kontrol = str((-toplam) % 10)
    if len(numara) == 13 and numara[-1] != kontrol:
        raise EtiketHatasi(f"Barkod numarasının son hanesi hatalı (doğrusu {kontrol} olmalı).")
    return ilk_haneler + kontrol


def rastgele_ean13(kullanilan: set[str] | frozenset = frozenset()) -> str:
    while True:
        numara = "20" + "".join(str(secrets.randbelow(10)) for _ in range(10))
        tam_numara = ean13(numara)
        if tam_numara not in kullanilan:
            return tam_numara


def _datamatrix(metin: str) -> list[list[bool]]:
    """Kare DataMatrix (ECC200). Türkçe harfler UTF-8 ECI ile kodlanır."""
    b = zxingcpp.create_barcode(metin, zxingcpp.BarcodeFormat.DataMatrix, force_square=True)
    a = np.asarray(b.to_image(scale=1, add_quiet_zones=False))
    if a.shape[0] != a.shape[1]:
        raise EtiketHatasi("Kare kod üretilemedi.")
    return (a < 128).tolist()


# ------------------------------------------------------------------ doğrula
def dogrula(veri: EtiketVerisi) -> list[str]:
    hatalar: list[str] = []
    kod = (veri.kod or "").strip()
    ek = (veri.ek or "").strip()
    if not kod:
        hatalar.append("Rulman kodu boş olamaz.")
    elif len(kod) > MAX_KOD:
        hatalar.append(f"Rulman kodu en fazla {MAX_KOD} karakter olabilir (şu an {len(kod)}).")
    if len(ek) > MAX_EK:
        hatalar.append(f"Ek (ör. C3) en fazla {MAX_EK} karakter olabilir.")
    if (veri.barkod_no or "").replace(" ", ""):
        try:
            ean13(veri.barkod_no)
        except EtiketHatasi as e:
            hatalar.append(str(e))
    for ad, metin in (("Rulman kodu", kod), ("Ek", ek)):
        kotu = sorted({c for c in metin if not (32 <= ord(c) <= 126)})
        if kotu:
            hatalar.append(f"{ad} barkoda yazılamayan harf içeriyor: {' '.join(kotu)} "
                           "(Türkçe harf kullanmayın, ör. Ş yerine S).")
    if isinstance(veri.adet, bool) or not isinstance(veri.adet, int):
        hatalar.append("Adet tam sayı olmalı.")
    elif not 1 <= veri.adet <= 99999:
        hatalar.append("Adet 1 ile 99999 arasında olmalı.")
    if len((veri.adet_yazisi or "").strip()) > MAX_ADET_YAZISI:
        hatalar.append(f"Adet yazısı en fazla {MAX_ADET_YAZISI} karakter olabilir.")
    for i, b in enumerate((veri.bilgi1, veri.bilgi2), 1):
        b = b or ""
        if len(b.strip()) > MAX_BILGI:
            hatalar.append(f"Bilgi satırı {i} en fazla {MAX_BILGI} karakter olabilir.")
    for ad, metin in (("Rulman kodu", veri.kod), ("Ek", veri.ek), ("Adet yazısı", veri.adet_yazisi),
                      ("Bilgi satırı 1", veri.bilgi1), ("Bilgi satırı 2", veri.bilgi2)):
        if metin and ("\n" in metin or "\r" in metin or "\t" in metin):
            hatalar.append(f"{ad} tek satır olmalı.")
    if not hatalar:
        for boyut in BOYUTLAR:
            try:
                yerlesim(veri, boyut)
            except EtiketHatasi as e:
                if str(e) not in hatalar:
                    hatalar.append(str(e))
    return hatalar


# ----------------------------------------------------------------- yerleşim
@dataclass
class Yerlesim:
    boyut: str
    genislik: float                  # pt
    yukseklik: float                 # pt
    mod: str                         # "yan" | "genis" (barkod tam genişlik) | "karekod" (yalnız DataMatrix)
    cubuk_modul: int                 # nokta
    cubuk_bitler: str
    cubuk_x: int                     # nokta
    cubuk_y: int
    cubuk_h: int
    rakam_pt: float
    rakam_taban: float               # pt
    dm: list[list[bool]]
    dm_modul: int
    dm_x: int                        # nokta
    dm_y: int
    dm_metin: str
    adet_taban: float
    kod_pt: float
    kod_satirlari: list[str]
    kod_tabanlari: list[float]
    ek_pt: float
    ek_taban: float | None
    bilgi_pt: float
    bilgi_satirlari: list[str]
    bilgi_tabanlari: list[float]
    alt_y0: float | None             # alt tekrar bloğu üst sınırı (pt)
    uyarilar: list[str] = field(default_factory=list)
    ean_kodu: str = ""
    ean_x: int = 0
    ean_guard_ek: int = 0
    ean_rakam_pt: float = 0
    ean_rakam_taban: float = 0
    kod_genislik: float = 0
    logo_rect: tuple[float, float, float, float] | None = None


def _kod_sigdir(kod: str, nominal: float, w: float) -> tuple[float, list[str]]:
    pt = nominal
    while pt >= KOD_MIN_TEK:
        if _gen(kod, pt, True) <= w:
            return pt, [kod]
        pt -= 0.5
    adaylar = [(kod[:i + 1], kod[i + 1:]) for i, c in enumerate(kod) if c == "-" and 0 < i < len(kod) - 1]
    if not adaylar:
        adaylar = [(kod[:i], kod[i:]) for i in range(1, len(kod))]
    a, b = min(adaylar, key=lambda p: max(_gen(p[0], 10, True), _gen(p[1], 10, True)))
    pt = nominal
    while pt >= KOD_MIN_IKI:
        if max(_gen(a, pt, True), _gen(b, pt, True)) <= w:
            return pt, [a, b]
        pt -= 0.5
    raise EtiketHatasi("Rulman kodu etikete sığmıyor; daha kısa yazın.")


def _tek_satir_sigdir(s: str, nominal: float, en_kucuk: float, w: float, kalin: bool) -> tuple[float, str]:
    pt = nominal
    while pt >= en_kucuk:
        if _gen(s, pt, kalin) <= w:
            return pt, s
        pt -= 0.25
    pt = en_kucuk
    while s and _gen(s + "…", pt, kalin) > w:
        s = s[:-1]
    return pt, s.rstrip() + "…"


def _ust_sira(veri: EtiketVerisi, p: _Profil):
    """EAN-13/Code128 + DataMatrix yerleşimini seçer."""
    uyarilar: list[str] = []
    dm_metin = datamatrix_metni(veri)
    dm = _datamatrix(dm_metin)
    if len(dm) * DM_MODUL_MIN > DM_EN_FAZLA and _bilgiler(veri):
        dm_metin = datamatrix_metni(veri, bilgili=False)
        dm = _datamatrix(dm_metin)
        uyarilar.append("Bilgi satırları çok uzun olduğu için kare koda eklenmedi.")
    n = len(dm)
    en_iyi = max(DM_MODUL_MIN, min(DM_MODUL_MAX, p.dm_hedef // n))
    if (veri.barkod_no or "").replace(" ", ""):
        ean_kodu = ean13(veri.barkod_no)
        bitler = EAN13(ean_kodu[:12]).build()[0]
        for dm_modul in range(en_iyi, DM_MODUL_MIN - 1, -1):
            dm_x = SAG - n * dm_modul
            for m in (4, 3):
                ean_x = KENAR + 9 * m
                ean_sag = ean_x + len(bitler) * m
                if dm_x - ean_sag >= 7 * m:
                    return "ean", m, bitler, dm, dm_modul, dm_metin, uyarilar
        raise EtiketHatasi("EAN-13 ve kare kod etikete sığmıyor.")

    bitler = _code128(barkod_metni(veri))
    for dm_modul in range(en_iyi, DM_MODUL_MIN - 1, -1):
        dm_x = SAG - n * dm_modul
        for m in CUBUK_MODUL:
            if KENAR + len(bitler) * m + SESSIZ * m <= dm_x:
                return "yan", m, bitler, dm, dm_modul, dm_metin, uyarilar
    for m in CUBUK_MODUL:
        if len(bitler) * m <= ICERIK:
            uyarilar.append("Kod uzun olduğu için barkod tam genişlikte, kare kod aşağıda.")
            return "genis", m, bitler, dm, DM_MODUL_MIN, dm_metin, uyarilar
    uyarilar.append("Kod çok uzun olduğu için çizgili barkod basılmadı; kare kod var.")
    return "karekod", 0, "", dm, en_iyi, dm_metin, uyarilar


def yerlesim(
    veri: EtiketVerisi, boyut: str = "62x100", *, logo: bytes | None = None
) -> Yerlesim:
    if boyut not in PROFILLER:
        raise EtiketHatasi(f"Bilinmeyen etiket boyutu: {boyut}")
    p = PROFILLER[boyut]
    mod, m, bitler, dm, dm_modul, dm_metin, uyarilar = _ust_sira(veri, p)
    n = len(dm)
    dm_gen = n * dm_modul
    cubuk_h = _nokta(p.cubuk_mm)
    cubuk_gen = len(bitler) * m
    w = _pt(ICERIK)
    logo_bilgi = _logo_hazirla(logo)
    logo_w = logo_h = 0.0
    if logo_bilgi:
        logo_h = 5 * MM
        logo_w = logo_h * logo_bilgi.width / logo_bilgi.height
        if logo_w > 20 * MM:
            logo_w = 20 * MM
            logo_h = logo_w * logo_bilgi.height / logo_bilgi.width
    kod_genislik = w - logo_w - (2 * MM if logo_bilgi else 0)

    ean_kodu = ean13(veri.barkod_no) if mod == "ean" else ""
    ean_x = KENAR + 9 * m if mod == "ean" else 0
    ean_rakam_pt = p.rakam_pt if mod == "ean" else 0
    ean_guard_ek = round((0.3 * MM + ean_rakam_pt * BUYUK_HARF) / NOKTA) if mod == "ean" else 0
    rakam_bosluk = 0.7 * MM
    if mod == "ean":
        rakam_pt, rakam = 0, ""
        cubuk_blok = (_pt(cubuk_h) + 0.3 * MM
                      + ean_rakam_pt * (BUYUK_HARF + ALT_TASMA))
    else:
        rakam = barkod_metni(veri)
        rakam_pt, rakam = _tek_satir_sigdir(rakam, p.rakam_pt, RAKAM_MIN,
                                            _pt(cubuk_gen), False)
        cubuk_blok = _pt(cubuk_h) + rakam_bosluk + rakam_pt * BUYUK_HARF

    ek_ham = veri.ek.strip()
    bilgiler = _bilgiler(veri)
    for kod_nominal in [p.kod_pt - i for i in range(0, int(p.kod_pt - KOD_MIN_TEK) + 1)]:
        kod_pt, kod_satir = _kod_sigdir(veri.kod.strip(), kod_nominal, kod_genislik)
        ek, ek_pt = ek_ham, kod_pt
        if ek_ham:
            ek_pt, ek = _tek_satir_sigdir(ek_ham, kod_pt, KOD_MIN_IKI, kod_genislik, True)

        y = _pt(KENAR)
        if mod in ("yan", "ean"):
            dm_y = KENAR
            cubuk_y = KENAR
            ust_h = max(_pt(dm_gen), cubuk_blok)
        elif mod == "karekod":
            dm_y = KENAR
            cubuk_y = KENAR
            ust_h = _pt(dm_gen)
        else:
            cubuk_y = KENAR
            ust_h = cubuk_blok
            dm_y = 0  # aşağıda belirlenir
        rakam_taban = (_pt(cubuk_y + cubuk_h) + rakam_bosluk + rakam_pt * BUYUK_HARF
                       if mod != "ean" else 0)
        ean_rakam_taban = (_pt(cubuk_y + cubuk_h) + 0.3 * MM
                           + ean_rakam_pt * BUYUK_HARF if mod == "ean" else 0)
        y += ust_h

        def blok(y: float) -> tuple[float, list[float], float | None, float]:
            adet_taban = y + BOSLUK_UST_ADET + p.adet_pt * BUYUK_HARF
            y = adet_taban + BOSLUK_ADET_KOD + kod_pt * BUYUK_HARF
            tabanlar = [y]
            for _ in kod_satir[1:]:
                y += kod_pt * KOD_ARALIK
                tabanlar.append(y)
            ek_taban = None
            if ek:
                y += max(kod_pt, ek_pt) * KOD_ARALIK
                ek_taban = y
            return adet_taban, tabanlar, ek_taban, y

        adet_taban, kod_tabanlari, ek_taban, y = blok(y)
        son_satir = ek if ek else kod_satir[-1]
        son_pt = max(kod_pt, ek_pt) if ek else kod_pt
        alt_blok_h = blok(0)[3] - BOSLUK_UST_ADET + ALT_TASMA * kod_pt

        bilgi_w = w if mod in ("yan", "ean") else w - _pt(dm_gen) - 2 * MM
        bilgi_pt, bilgi_satir = p.bilgi_pt, []
        if bilgiler:
            sonuc = [_tek_satir_sigdir(b, p.bilgi_pt, BILGI_MIN, bilgi_w, False) for b in bilgiler]
            bilgi_pt = min(s[0] for s in sonuc)
            bilgi_satir = [_tek_satir_sigdir(b, bilgi_pt, BILGI_MIN, bilgi_w, False)[1] for b in bilgiler]
        bilgi_tabanlari = []
        orta_ust = y + BOSLUK_KOD_BILGI
        if bilgi_satir:
            by = orta_ust + bilgi_pt * (BUYUK_HARF + _ust_tasma(bilgi_satir[0]))
            for _ in bilgi_satir:
                bilgi_tabanlari.append(by)
                by += bilgi_pt * BILGI_ARALIK
            bilgi_alt = bilgi_tabanlari[-1] + bilgi_pt * ALT_TASMA
        else:
            bilgi_alt = None
        if mod == "genis":
            dm_y = round(orta_ust / NOKTA)
            orta_alt = max(bilgi_alt or 0, _pt(dm_y + dm_gen))
        else:
            orta_alt = bilgi_alt if bilgi_alt is not None else y + ALT_TASMA * max(kod_pt, ek_pt)

        icerik_alt = orta_alt
        if veri.alt_tekrar:
            gerekli = icerik_alt + MIN_ESNEK + alt_blok_h + _pt(KENAR)
        else:
            gerekli = icerik_alt + _pt(KENAR)

        if p.yukseklik_mm is not None:
            yukseklik = p.yukseklik_mm * MM
            if gerekli > yukseklik:
                continue
        else:
            yukseklik = gerekli
            if veri.alt_tekrar:
                yukseklik = max(yukseklik, p.min_uzunluk_mm * MM)
            yukseklik = round(yukseklik / NOKTA) * NOKTA

        alt_y0 = (yukseklik - _pt(KENAR) - alt_blok_h - BOSLUK_UST_ADET) if veri.alt_tekrar else None
        cubuk_x = KENAR
        dm_x = SAG - dm_gen
        uy = list(uyarilar)
        if ek != ek_ham:
            uy.append("Ek etikete sığmadığı için kısaltıldı.")
        if bilgi_satir != bilgiler:
            uy.append("Bilgi satırı etikete sığmadığı için kısaltıldı.")
        logo_rect = None
        if logo_bilgi:
            son_taban = ek_taban if ek_taban is not None else kod_tabanlari[-1]
            logo_rect = (_pt(SAG) - logo_w, son_taban - logo_h, _pt(SAG), son_taban)
        if alt_y0 is not None and bilgi_tabanlari:
            son_taban = ek_taban if ek_taban is not None else kod_tabanlari[-1]
            ust_alt = son_taban + _alt_tasma(son_satir) * son_pt
            if logo_rect:
                ust_alt = max(ust_alt, logo_rect[3])
            alt_ust = alt_y0 + BOSLUK_UST_ADET
            bilgi_ust = bilgi_tabanlari[0] - bilgi_pt * (
                BUYUK_HARF + _ust_tasma(bilgi_satir[0])
            )
            bilgi_alt = bilgi_tabanlari[-1] + bilgi_pt * _alt_tasma(bilgi_satir[-1])
            bosluk = alt_ust - ust_alt
            mevcut_aralik = max(0, y + BOSLUK_KOD_BILGI - ust_alt) + bilgi_alt - bilgi_ust
            if bosluk >= mevcut_aralik:
                hedef_orta = ust_alt + 0.45 * bosluk
                mevcut_orta = (bilgi_ust + bilgi_alt) / 2
                kayma = hedef_orta - mevcut_orta
                if bilgi_ust + kayma >= ust_alt and bilgi_alt + kayma <= alt_ust:
                    bilgi_tabanlari = [taban + kayma for taban in bilgi_tabanlari]
        return Yerlesim(
            boyut=boyut, genislik=SAYFA_GENISLIK, yukseklik=yukseklik, mod=mod,
            cubuk_modul=m, cubuk_bitler=bitler, cubuk_x=cubuk_x, cubuk_y=cubuk_y, cubuk_h=cubuk_h,
            rakam_pt=rakam_pt, rakam_taban=rakam_taban,
            dm=dm, dm_modul=dm_modul, dm_x=dm_x, dm_y=dm_y, dm_metin=dm_metin,
            adet_taban=adet_taban, kod_pt=kod_pt, kod_satirlari=kod_satir, kod_tabanlari=kod_tabanlari,
            ek_pt=ek_pt, ek_taban=ek_taban,
            bilgi_pt=bilgi_pt, bilgi_satirlari=bilgi_satir, bilgi_tabanlari=bilgi_tabanlari,
            alt_y0=alt_y0, uyarilar=uy,
            ean_kodu=ean_kodu, ean_x=ean_x, ean_guard_ek=ean_guard_ek,
            ean_rakam_pt=ean_rakam_pt, ean_rakam_taban=ean_rakam_taban,
            kod_genislik=kod_genislik, logo_rect=logo_rect,
        )
    raise EtiketHatasi("Yazılanlar 62 x 100 mm etikete sığmıyor; kodu veya bilgi satırlarını kısaltın.")


def uyarilar(
    veri: EtiketVerisi, boyut: str = "62x100", *, logo: bytes | None = None
) -> list[str]:
    """Basmaya engel olmayan notlar (ör. bilgi kare koda eklenmedi)."""
    return yerlesim(veri, boyut, logo=logo).uyarilar


# -------------------------------------------------------------------- çizim
def _sayfa_ciz(
    page: pymupdf.Page, veri: EtiketVerisi, y: Yerlesim, logo: bytes | None = None
) -> None:
    tw = pymupdf.TextWriter(page.rect)
    kalin, normal = _font(True), _font(False)

    def yaz(x: float, taban: float, s: str, pt: float, f: pymupdf.Font) -> None:
        tw.append((x, taban), s, font=f, fontsize=pt)

    sh = page.new_shape()
    if y.ean_kodu:
        m = y.cubuk_modul
        i, bit = 0, y.cubuk_bitler
        while i < len(bit):
            koruyucu = i < 3 or 45 <= i < 50 or i >= 92
            if bit[i] == "1":
                j = i
                while j < len(bit) and bit[j] == "1" and (
                    (j < 3 or 45 <= j < 50 or j >= 92) == koruyucu
                ):
                    j += 1
                x0 = y.ean_x + i * m
                yukseklik = y.cubuk_h + (y.ean_guard_ek if koruyucu else 0)
                sh.draw_rect(pymupdf.Rect(_pt(x0), _pt(y.cubuk_y),
                                          _pt(y.ean_x + j * m), _pt(y.cubuk_y + yukseklik)))
                i = j
            else:
                i += 1
    else:
        # Code128: modül ızgarası tam nokta
        m = y.cubuk_modul
        i, bit = 0, y.cubuk_bitler
        while i < len(bit):
            if bit[i] == "1":
                j = i
                while j < len(bit) and bit[j] == "1":
                    j += 1
                x0 = y.cubuk_x + i * m
                sh.draw_rect(pymupdf.Rect(_pt(x0), _pt(y.cubuk_y), _pt(y.cubuk_x + j * m), _pt(y.cubuk_y + y.cubuk_h)))
                i = j
            else:
                i += 1
    # DataMatrix: satır satır yatay şeritler
    d = y.dm_modul
    for r, satir in enumerate(y.dm):
        c = 0
        while c < len(satir):
            if satir[c]:
                k = c
                while k < len(satir) and satir[k]:
                    k += 1
                sh.draw_rect(pymupdf.Rect(_pt(y.dm_x + c * d), _pt(y.dm_y + r * d),
                                          _pt(y.dm_x + k * d), _pt(y.dm_y + (r + 1) * d)))
                c = k
            else:
                c += 1
    sh.finish(color=None, fill=(0, 0, 0), width=0)
    sh.commit(overlay=True)

    if y.ean_kodu:
        merkezler = [(y.ean_x - 4.5 * m, y.ean_kodu[0])]
        merkezler.extend((y.ean_x + (3 + 7 * i + 3.5) * m, h)
                         for i, h in enumerate(y.ean_kodu[1:7]))
        merkezler.extend((y.ean_x + (50 + 7 * i + 3.5) * m, h)
                         for i, h in enumerate(y.ean_kodu[7:]))
        for merkez, hane in merkezler:
            yaz(_pt(merkez) - _gen(hane, y.ean_rakam_pt, False) / 2,
                y.ean_rakam_taban, hane, y.ean_rakam_pt, normal)
    else:
        # barkod altı yazı: çubukların ortasına
        rakam = barkod_metni(veri) if bit else ""
        if rakam and _gen(rakam, y.rakam_pt, False) > _pt(len(bit) * m):
            rakam = _tek_satir_sigdir(rakam, y.rakam_pt, RAKAM_MIN, _pt(len(bit) * m), False)[1]
        cubuk_orta = _pt(y.cubuk_x + len(y.cubuk_bitler) * m / 2)
        rx = max(_pt(KENAR), cubuk_orta - _gen(rakam, y.rakam_pt, False) / 2)
        if rakam:
            yaz(rx, y.rakam_taban, rakam, y.rakam_pt, normal)

    x = _pt(KENAR)
    adet = _adet_satiri(veri)
    p = PROFILLER[y.boyut]
    ek = veri.ek.strip()

    logo_yerleri: list[pymupdf.Rect] = []

    def kod_blogu(
        adet_taban: float,
        kod_tabanlari: list[float],
        ek_taban: float | None,
        kayma: float = 0,
    ) -> None:
        yaz(x, adet_taban, adet, p.adet_pt, kalin)
        for s, t in zip(y.kod_satirlari, kod_tabanlari):
            yaz(x, t, s, y.kod_pt, kalin)
        if ek_taban is not None:
            ek_s = ek if _gen(ek, y.ek_pt, True) <= y.kod_genislik else _tek_satir_sigdir(
                ek, y.ek_pt, KOD_MIN_IKI, y.kod_genislik, True)[1]
            yaz(x, ek_taban, ek_s, y.ek_pt, kalin)
        if logo and y.logo_rect:
            rect = pymupdf.Rect(*y.logo_rect)
            rect.y0 += kayma
            rect.y1 += kayma
            logo_yerleri.append(rect)

    kod_blogu(y.adet_taban, y.kod_tabanlari, y.ek_taban)
    for s, t in zip(y.bilgi_satirlari, y.bilgi_tabanlari):
        yaz(x, t, s, y.bilgi_pt, normal)
    if y.alt_y0 is not None:
        kayma = y.alt_y0 + BOSLUK_UST_ADET + p.adet_pt * BUYUK_HARF - y.adet_taban
        kod_blogu(y.adet_taban + kayma, [t + kayma for t in y.kod_tabanlari],
                  None if y.ek_taban is None else y.ek_taban + kayma, kayma)
    tw.write_text(page, color=(0, 0, 0))
    for rect in logo_yerleri:
        page.insert_image(rect, stream=logo, keep_proportion=False, overlay=True)


def ciz(
    veri: EtiketVerisi,
    boyut: str = "62x100",
    kopya: int = 1,
    *,
    logo: bytes | None = None,
) -> pymupdf.Document:
    """Vektörel PDF. Her kopya ayrı sayfa (yazıcıda ayrı etiket)."""
    hatalar = dogrula(veri)
    if boyut not in BOYUTLAR:
        hatalar.append(f"Bilinmeyen etiket boyutu: {boyut}")
    if isinstance(kopya, bool) or not isinstance(kopya, int) or not 1 <= kopya <= MAX_KOPYA:
        hatalar.append(f"Kopya sayısı 1 ile {MAX_KOPYA} arasında olmalı.")
    if hatalar:
        raise EtiketHatasi("\n".join(hatalar))
    logo_bilgi = _logo_hazirla(logo)
    logo_png = logo_bilgi.png if logo_bilgi else None
    y = yerlesim(veri, boyut, logo=logo_png)
    doc = pymupdf.open()
    page = doc.new_page(width=y.genislik, height=y.yukseklik)
    _sayfa_ciz(page, veri, y, logo_png)
    doc.subset_fonts()
    for _ in range(kopya - 1):
        doc.fullcopy_page(0)
    doc.set_metadata({"title": f"Rulman Etiket - {barkod_metni(veri)}", "creator": "Rulman Etiket"})
    return doc


def onizleme_png(
    veri: EtiketVerisi, boyut: str = "62x100", dpi: int = 300, *, logo: bytes | None = None
) -> bytes:
    doc = ciz(veri, boyut, 1, logo=logo)
    try:
        return doc[0].get_pixmap(dpi=dpi, alpha=False).tobytes("png")
    finally:
        doc.close()
