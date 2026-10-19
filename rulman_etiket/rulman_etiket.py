from __future__ import annotations

import argparse
import ctypes
import sys
import traceback
from pathlib import Path

if sys.platform == "win32":
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass

_UYGULAMA_KLASORU = Path(__file__).resolve().parent
if str(_UYGULAMA_KLASORU) not in sys.path:
    sys.path.insert(0, str(_UYGULAMA_KLASORU))

from etiket_cizim import BOYUTLAR, EtiketVerisi, ciz
from yazdirma import (
    YazdirmaHatasi,
    ayar_klasoru,
    kod_duzelt,
    pdf_kaydet,
    resource_path,
)

_RAPOR_YOLU: Path | None = None


def _yaz_hata(metin: str) -> None:
    _rapora_yaz(metin)
    if getattr(sys, "frozen", False):
        return
    if sys.stderr is not None:
        print(metin, file=sys.stderr)


def _kontrol() -> int:
    yazdirma_ok = True
    yazdirma_durumu = "Yalnız Windows'ta denetlenir"
    if sys.platform == "win32":
        try:
            import win32con
            import win32ui
        except Exception:
            yazdirma_ok = False
            yazdirma_durumu = "Başarısız"
        else:
            yazdirma_durumu = "Başarılı"
    _satir("Yazdırma (win32ui)", yazdirma_durumu)

    font_klasoru = resource_path("fonts")
    font_ok = font_klasoru.is_dir() and all(
        (font_klasoru / ad).is_file()
        for ad in ("Hind-SemiBold.ttf",)
    )
    _satir("Yazı tipleri", "Başarılı" if font_ok else "Başarısız")

    cizim_ok = False
    try:
        belge = ciz(EtiketVerisi(kod="6205-2RS", ek="C3"), "62x100", 1)
        try:
            cizim_ok = belge.page_count == 1 and bool(belge.tobytes())
        finally:
            belge.close()
    except Exception:
        cizim_ok = False
    _satir("Etiket oluşturma denemesi", "Başarılı" if cizim_ok else "Başarısız")
    yazici_modulu_ok = True
    if sys.platform == "win32":
        try:
            import win32print
        except Exception:
            yazici_modulu_ok = False
        _satir(
            "Yazıcı ayar modülü",
            "Başarılı" if yazici_modulu_ok else "Başarısız",
        )
    sonuc = 0 if yazdirma_ok and font_ok and cizim_ok and yazici_modulu_ok else 1
    _rapora_yaz(f"Sonuç: {'Başarılı' if sonuc == 0 else 'Başarısız'}")
    return sonuc


def _raporu_sifirla() -> None:
    if _RAPOR_YOLU is None:
        return
    try:
        _RAPOR_YOLU.parent.mkdir(parents=True, exist_ok=True)
        _RAPOR_YOLU.write_text("", encoding="utf-8")
    except OSError:
        pass


def _rapora_yaz(metin: str) -> None:
    if _RAPOR_YOLU is None:
        return
    try:
        _RAPOR_YOLU.parent.mkdir(parents=True, exist_ok=True)
        with _RAPOR_YOLU.open("a", encoding="utf-8") as dosya:
            dosya.write(f"{metin}\n")
    except OSError:
        pass


def _satir(kontrol: str, sonuc: str) -> None:
    satir = f"{kontrol}: {sonuc}"
    _rapora_yaz(satir)
    if getattr(sys, "frozen", False):
        return
    print(satir)


def _arayuzu_baslat() -> int:
    try:
        import arayuz

        arayuz.baslat()
        return 0
    except Exception:
        hata = traceback.format_exc()
        try:
            klasor = ayar_klasoru()
            klasor.mkdir(parents=True, exist_ok=True)
            (klasor / "hata.log").write_text(hata, encoding="utf-8")
        except OSError:
            pass
        try:
            from tkinter import messagebox

            messagebox.showerror(
                "Rulman Etiket",
                "Program açılamadı. Lütfen tekrar deneyin; sorun sürerse hata.log dosyasını iletin.",
            )
        except Exception:
            pass
        return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Rulman kutu etiketi oluşturur.")
    parser.add_argument("--kod")
    parser.add_argument("--ek", default="")
    parser.add_argument("--barkod", default="")
    parser.add_argument("--logo", type=Path)
    parser.add_argument("--adet", type=int, default=1)
    parser.add_argument("--bilgi1", default="")
    parser.add_argument("--bilgi2", default="")
    parser.add_argument("--boyut", choices=BOYUTLAR, default="62x100")
    parser.add_argument("--kopya", type=int, default=1)
    parser.add_argument("--alt-tekrar-yok", action="store_true")
    parser.add_argument("--pdf")
    parser.add_argument("--kontrol", action="store_true")
    parser.add_argument("--rapor")
    args = parser.parse_args()

    global _RAPOR_YOLU
    _RAPOR_YOLU = Path(args.rapor) if args.rapor else None
    _raporu_sifirla()

    if args.kontrol:
        return _kontrol()
    if args.kod is not None or args.pdf is not None:
        if args.kod is None:
            _yaz_hata("PDF oluşturmak için --kod seçeneği gereklidir.")
            return 2
        try:
            logo = args.logo.read_bytes() if args.logo else None
        except OSError:
            _yaz_hata("Logo dosyası açılamadı. PNG veya JPG seçin.")
            return 1
        veri = EtiketVerisi(
            kod=kod_duzelt(args.kod),
            ek=kod_duzelt(args.ek),
            barkod_no=args.barkod,
            adet=args.adet,
            bilgi1=args.bilgi1.strip(),
            bilgi2=args.bilgi2.strip(),
            alt_tekrar=not args.alt_tekrar_yok,
        )
        try:
            yol = pdf_kaydet(veri, args.boyut, args.kopya, yol=args.pdf, logo=logo)
        except YazdirmaHatasi as hata:
            _yaz_hata(str(hata))
            return 1
        if not getattr(sys, "frozen", False):
            print(yol)
        return 0
    return _arayuzu_baslat()


if __name__ == "__main__":
    sys.exit(main())
