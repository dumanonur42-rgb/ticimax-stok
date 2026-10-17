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


def _yaz_hata(metin: str) -> None:
    if sys.stderr is not None:
        print(metin, file=sys.stderr)


def _kontrol() -> int:
    sumatra_ok = resource_path("SumatraPDF.exe").is_file()
    _satir(
        "SumatraPDF dosyası",
        "Başarılı" if sumatra_ok else "Başarısız",
    )

    font_klasoru = resource_path("fonts")
    font_ok = font_klasoru.is_dir() and any(
        dosya.suffix.casefold() in {".ttf", ".otf"}
        for dosya in font_klasoru.rglob("*")
        if dosya.is_file()
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
    return 0 if sumatra_ok and font_ok and cizim_ok and yazici_modulu_ok else 1


def _satir(kontrol: str, sonuc: str) -> None:
    print(f"{kontrol}: {sonuc}")


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
    parser.add_argument("--adet", type=int, default=1)
    parser.add_argument("--bilgi1", default="")
    parser.add_argument("--bilgi2", default="")
    parser.add_argument("--boyut", choices=BOYUTLAR, default="62x100")
    parser.add_argument("--kopya", type=int, default=1)
    parser.add_argument("--alt-tekrar-yok", action="store_true")
    parser.add_argument("--pdf")
    parser.add_argument("--kontrol", action="store_true")
    args = parser.parse_args()

    if args.kontrol:
        return _kontrol()
    if args.kod is not None or args.pdf is not None:
        if args.kod is None:
            _yaz_hata("PDF oluşturmak için --kod seçeneği gereklidir.")
            return 2
        veri = EtiketVerisi(
            kod=kod_duzelt(args.kod),
            ek=kod_duzelt(args.ek),
            adet=args.adet,
            bilgi1=args.bilgi1.strip(),
            bilgi2=args.bilgi2.strip(),
            alt_tekrar=not args.alt_tekrar_yok,
        )
        try:
            yol = pdf_kaydet(veri, args.boyut, args.kopya, yol=args.pdf)
        except YazdirmaHatasi as hata:
            _yaz_hata(str(hata))
            return 1
        print(yol)
        return 0
    return _arayuzu_baslat()


if __name__ == "__main__":
    sys.exit(main())
