from __future__ import annotations

import ctypes
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
from contextlib import contextmanager
from dataclasses import asdict, fields, is_dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator

from etiket_cizim import (
    BOYUTLAR,
    EtiketHatasi,
    EtiketVerisi,
    ciz,
    dogrula,
    logo_normalize,
)


class YazdirmaHatasi(Exception):
    pass


def resource_path(ad: str) -> Path:
    klasor = getattr(sys, "_MEIPASS", None)
    if klasor is None:
        klasor = Path(__file__).resolve().parent
    return Path(klasor) / ad


def kod_duzelt(metin: str) -> str:
    return metin.strip().replace("İ", "I").replace("ı", "I").upper()


def yazicilari_listele() -> list[str]:
    if sys.platform != "win32":
        return []
    try:
        sonuc = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-Command",
                "Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name",
            ],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
            creationflags=0x08000000,
        )
        return [satir.strip() for satir in sonuc.stdout.splitlines() if satir.strip()]
    except Exception:
        return []


def varsayilan_yazici(yazicilar: list[str]) -> str | None:
    for yazici in yazicilar:
        if "brother" in yazici.casefold():
            return yazici
    for yazici in yazicilar:
        if "ql" in yazici.casefold():
            return yazici
    if sys.platform == "win32":
        try:
            sonuc = subprocess.run(
                [
                    "powershell",
                    "-NoProfile",
                    "-Command",
                    'Get-CimInstance Win32_Printer -Filter "Default=TRUE" | '
                    "Select-Object -ExpandProperty Name",
                ],
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
                creationflags=0x08000000,
            )
            varsayilan = next(
                (satir.strip() for satir in sonuc.stdout.splitlines() if satir.strip()),
                None,
            )
            if varsayilan in yazicilar:
                return varsayilan
        except Exception:
            pass
    return yazicilar[0] if yazicilar else None


def _belgeler_klasoru() -> Path:
    varsayilan = Path.home() / "Documents"
    if sys.platform != "win32":
        return varsayilan

    class GUID(ctypes.Structure):
        _fields_ = [
            ("Data1", ctypes.c_uint32),
            ("Data2", ctypes.c_uint16),
            ("Data3", ctypes.c_uint16),
            ("Data4", ctypes.c_ubyte * 8),
        ]

    klasor_yolu = ctypes.c_wchar_p()
    belgelere_ait_id = uuid.UUID("FDD39AD0-238F-46AF-ADB4-6C85480369C7")
    guid = GUID(
        belgelere_ait_id.time_low,
        belgelere_ait_id.time_mid,
        belgelere_ait_id.time_hi_version,
        (ctypes.c_ubyte * 8).from_buffer_copy(belgelere_ait_id.bytes[8:]),
    )
    try:
        shell32 = ctypes.windll.shell32
        shell32.SHGetKnownFolderPath.argtypes = [
            ctypes.POINTER(GUID),
            ctypes.c_uint32,
            ctypes.c_void_p,
            ctypes.POINTER(ctypes.c_wchar_p),
        ]
        shell32.SHGetKnownFolderPath.restype = ctypes.c_long
        sonuc = shell32.SHGetKnownFolderPath(
            ctypes.byref(guid), 0, None, ctypes.byref(klasor_yolu)
        )
        if sonuc == 0 and klasor_yolu.value:
            return Path(klasor_yolu.value)
    except Exception:
        pass
    finally:
        if klasor_yolu.value:
            try:
                ole32 = ctypes.windll.ole32
                ole32.CoTaskMemFree.argtypes = [ctypes.c_void_p]
                ole32.CoTaskMemFree.restype = None
                ole32.CoTaskMemFree(ctypes.cast(klasor_yolu, ctypes.c_void_p))
            except Exception:
                pass
    return varsayilan


def cikti_klasoru() -> Path:
    klasor = _belgeler_klasoru() / "Rulman Etiket"
    try:
        klasor.mkdir(parents=True, exist_ok=True)
    except OSError as hata:
        raise YazdirmaHatasi(
            "Belgeler içinde 'Rulman Etiket' klasörü oluşturulamadı. Klasöre yazma izniniz olduğunu kontrol edin."
        ) from hata
    return klasor


def _veri_klasoru() -> Path:
    appdata = os.environ.get("APPDATA")
    if appdata:
        temel = Path(appdata)
    elif sys.platform == "win32":
        temel = Path.home() / "AppData" / "Roaming"
    else:
        temel = Path.home() / ".config"
    return temel / "Rulman Etiket"


def ayar_klasoru() -> Path:
    return _veri_klasoru()


def _json_yaz(dosya: Path, veri: Any) -> None:
    dosya.parent.mkdir(parents=True, exist_ok=True)
    gecici_yol: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=dosya.parent,
            prefix=f".{dosya.name}.",
            suffix=".tmp",
            delete=False,
        ) as gecici:
            gecici_yol = Path(gecici.name)
            json.dump(veri, gecici, ensure_ascii=False, indent=2)
            gecici.write("\n")
        os.replace(gecici_yol, dosya)
    finally:
        if gecici_yol is not None and gecici_yol.exists():
            try:
                gecici_yol.unlink()
            except OSError:
                pass


def ayar_oku() -> dict:
    try:
        veri = json.loads((_veri_klasoru() / "ayarlar.json").read_text(encoding="utf-8"))
        return veri if isinstance(veri, dict) else {}
    except (OSError, ValueError, TypeError):
        return {}


def ayar_kaydet(ayarlar: dict) -> None:
    birlesik = ayar_oku()
    birlesik.update(ayarlar)
    try:
        _json_yaz(_veri_klasoru() / "ayarlar.json", birlesik)
    except OSError:
        pass


def _logo_yolu() -> Path:
    return _veri_klasoru() / "logo.png"


def logo_kaydet(logo: bytes) -> bytes:
    png = logo_normalize(logo)
    hedef = _logo_yolu()
    hedef.parent.mkdir(parents=True, exist_ok=True)
    gecici_yol: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            dir=hedef.parent,
            prefix=f".{hedef.name}.",
            suffix=".tmp",
            delete=False,
        ) as gecici:
            gecici_yol = Path(gecici.name)
            gecici.write(png)
        os.replace(gecici_yol, hedef)
    finally:
        if gecici_yol is not None and gecici_yol.exists():
            try:
                gecici_yol.unlink()
            except OSError:
                pass
    return png


def logo_oku() -> bytes | None:
    try:
        return logo_normalize(_logo_yolu().read_bytes())
    except (OSError, EtiketHatasi):
        return None


def logo_sil() -> None:
    _logo_yolu().unlink(missing_ok=True)


def _etiket_alanlari() -> set[str]:
    return {alan.name for alan in fields(EtiketVerisi)}


def son_kodlar() -> list[dict]:
    try:
        veri = json.loads((_veri_klasoru() / "son_kodlar.json").read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return []
    if not isinstance(veri, list):
        return []

    alanlar = _etiket_alanlari()
    sonuc = []
    for kayit in veri:
        if not isinstance(kayit, dict):
            continue
        kod = kayit.get("kod")
        if not isinstance(kod, str) or not kod.strip():
            continue
        sonuc.append({anahtar: deger for anahtar, deger in kayit.items() if anahtar in alanlar})
        if len(sonuc) == 20:
            break
    return sonuc


def son_kod_ekle(veri: EtiketVerisi | dict) -> None:
    if is_dataclass(veri) and not isinstance(veri, type):
        yeni = asdict(veri)
    elif isinstance(veri, dict):
        yeni = dict(veri)
    else:
        return

    alanlar = _etiket_alanlari()
    yeni = {anahtar: deger for anahtar, deger in yeni.items() if anahtar in alanlar}
    kod = yeni.get("kod")
    if not isinstance(kod, str) or not kod.strip():
        return

    gecmis = [
        kayit
        for kayit in son_kodlar()
        if (kayit.get("kod"), kayit.get("ek", ""), kayit.get("barkod_no", ""))
        != (kod, yeni.get("ek", ""), yeni.get("barkod_no", ""))
    ]
    try:
        _json_yaz(_veri_klasoru() / "son_kodlar.json", [yeni, *gecmis][:20])
    except OSError:
        pass


def pdf_kaydet(
    veri: EtiketVerisi,
    boyut: str,
    kopya: int,
    yol: str | Path | None = None,
    *,
    logo: bytes | None = None,
) -> Path:
    if boyut not in BOYUTLAR:
        raise YazdirmaHatasi("Etiket boyutu seçimi geçersiz.")
    if isinstance(kopya, bool) or not isinstance(kopya, int) or not 1 <= kopya <= 999:
        raise YazdirmaHatasi("Kopya sayısı 1 ile 999 arasında olmalıdır.")
    hatalar = dogrula(veri)
    if hatalar:
        raise YazdirmaHatasi("\n".join(hatalar))

    if yol is None:
        temiz_kod = re.sub(r"[^\w-]", "_", veri.kod, flags=re.UNICODE).strip("_")[:40]
        yol = cikti_klasoru() / f"{datetime.now():%Y%m%d_%H%M%S}_{temiz_kod or 'etiket'}.pdf"
    hedef = Path(yol)
    belge = None
    try:
        belge = ciz(veri, boyut, kopya, logo=logo)
        hedef.parent.mkdir(parents=True, exist_ok=True)
        belge.save(hedef)
    except EtiketHatasi as hata:
        raise YazdirmaHatasi(str(hata)) from hata
    except (PermissionError, OSError) as hata:
        raise YazdirmaHatasi(
            "PDF kaydedilemedi. Dosya başka bir programda açık olabilir, kapatıp tekrar deneyin."
        ) from hata
    except Exception as hata:
        raise YazdirmaHatasi(
            "PDF oluşturulamadı. Etiket bilgilerini kontrol edip tekrar deneyin."
        ) from hata
    finally:
        if belge is not None:
            try:
                belge.close()
            except Exception:
                pass
    return hedef


def _sumatra() -> str | None:
    adaylar = [
        str(resource_path("SumatraPDF.exe")),
        shutil.which("SumatraPDF"),
    ]
    for degisken in ("LOCALAPPDATA", "ProgramFiles", "ProgramFiles(x86)"):
        kok = os.environ.get(degisken)
        if kok:
            adaylar.append(str(Path(kok) / "SumatraPDF" / "SumatraPDF.exe"))
    return next((aday for aday in adaylar if aday and os.path.isfile(aday)), None)


def _yazdirma_pdf_yolu() -> Path:
    if sys.platform == "win32":
        temel = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local")
    else:
        temel = Path.home() / ".cache"
    klasor = temel / "Rulman Etiket" / "yazdirma"
    try:
        klasor.mkdir(parents=True, exist_ok=True)
    except OSError as hata:
        raise YazdirmaHatasi(
            "Yazdırma için geçici dosya oluşturulamadı. Bilgisayarda yer olduğunu kontrol edin."
        ) from hata
    return klasor / "son_etiket.pdf"


def _kullanici_ayarini_sil(yazici_kolu: Any) -> None:
    from ctypes import wintypes

    winspool = ctypes.WinDLL("winspool.drv")
    winspool.SetPrinterW.argtypes = [
        wintypes.HANDLE,
        wintypes.DWORD,
        ctypes.c_void_p,
        wintypes.DWORD,
    ]
    winspool.SetPrinterW.restype = wintypes.BOOL
    bos = ctypes.c_void_p(None)
    if not winspool.SetPrinterW(
        int(yazici_kolu), 9, ctypes.addressof(bos), 0
    ):
        winspool.SetPrinterW(int(yazici_kolu), 9, None, 0)


@contextmanager
def _kagit_ayari(yazici: str, boyut: str, pdf: Path) -> Iterator[None]:
    if "brother" not in yazici.casefold() and "ql" not in yazici.casefold():
        yield
        return
    try:
        import win32print
    except ImportError as hata:
        raise YazdirmaHatasi(
            "Yazıcının kağıt ayarı değiştirilemedi. Program dosyaları eksik olabilir."
        ) from hata

    yazici_kolu = None
    eski9 = None
    eski9_okundu = False
    try:
        try:
            yazici_kolu = win32print.OpenPrinter(
                yazici, {"DesiredAccess": win32print.PRINTER_ACCESS_USE}
            )
            eski9 = win32print.GetPrinter(yazici_kolu, 9)["pDevMode"]
            eski9_okundu = True
            if eski9 is None:
                yeni = win32print.GetPrinter(yazici_kolu, 2)["pDevMode"]
            else:
                yeni = win32print.GetPrinter(yazici_kolu, 9)["pDevMode"]
            if yeni is None:
                raise RuntimeError
            if boyut == "62x100":
                port = win32print.GetPrinter(yazici_kolu, 2)["pPortName"]
                kagit_boyutu = 256
                try:
                    kodlar = win32print.DeviceCapabilities(yazici, port, 2)
                    olculer = win32print.DeviceCapabilities(yazici, port, 3)
                    for kod, olcu in zip(kodlar or [], olculer or []):
                        if isinstance(olcu, dict):
                            x, y = olcu.get("x"), olcu.get("y")
                        elif isinstance(olcu, (tuple, list)) and len(olcu) >= 2:
                            x, y = olcu[:2]
                        else:
                            continue
                        try:
                            if (
                                kod != 256
                                and abs(float(x) - 620) <= 3
                                and abs(float(y) - 1000) <= 3
                            ):
                                kagit_boyutu = int(kod)
                                break
                        except (TypeError, ValueError):
                            continue
                except Exception:
                    kagit_boyutu = 256
                kagit_genisligi, kagit_uzunlugu = 620, 1000
            elif boyut == "62surekli":
                import pymupdf

                with pymupdf.open(pdf) as belge:
                    if not belge.page_count:
                        raise RuntimeError
                    kagit_uzunlugu = round(belge[0].rect.height / 72 * 254)
                kagit_boyutu, kagit_genisligi = 256, 620
            else:
                raise RuntimeError
            yeni.Fields |= 0x1 | 0x2 | 0x4 | 0x8
            yeni.PaperSize = kagit_boyutu
            yeni.PaperWidth = kagit_genisligi
            yeni.PaperLength = kagit_uzunlugu
            yeni.Orientation = 1
            sonuc = win32print.DocumentProperties(
                0, yazici_kolu, yazici, yeni, yeni, 8 | 2
            )
            if sonuc < 0:
                raise RuntimeError
            win32print.SetPrinter(yazici_kolu, 9, {"pDevMode": yeni}, 0)
        except Exception as hata:
            raise YazdirmaHatasi(
                "Yazıcının kağıt ayarı değiştirilemedi. Yazıcının açık olduğunu ve Brother sürücüsünün kurulu olduğunu kontrol edin."
            ) from hata

        yield
    finally:
        if yazici_kolu is not None:
            if eski9_okundu:
                try:
                    if eski9 is None:
                        _kullanici_ayarini_sil(yazici_kolu)
                    else:
                        win32print.SetPrinter(
                            yazici_kolu, 9, {"pDevMode": eski9}, 0
                        )
                except Exception:
                    pass
            try:
                win32print.ClosePrinter(yazici_kolu)
            except Exception:
                pass


def yazdir(
    veri: EtiketVerisi,
    boyut: str,
    kopya: int,
    yazici: str,
    *,
    logo: bytes | None = None,
) -> Path:
    if sys.platform != "win32":
        raise YazdirmaHatasi("Yazdırma yalnızca Windows'ta yapılabilir.")
    if not yazici:
        raise YazdirmaHatasi("Yazıcı seçilmedi. Listeden Brother QL-550 yazıcısını seçin.")
    yazicilar = yazicilari_listele()
    if yazicilar and yazici not in yazicilar:
        raise YazdirmaHatasi(
            f"'{yazici}' adlı yazıcı bulunamadı. Yazıcının açık ve bağlı olduğundan emin olun."
        )
    sumatra = _sumatra()
    if not sumatra:
        raise YazdirmaHatasi(
            "SumatraPDF bulunamadı. Programın dosyaları eksik olabilir; uygulamayı yeniden kurun."
        )

    pdf_yolu = _yazdirma_pdf_yolu()
    try:
        pdf = pdf_kaydet(veri, boyut, kopya, yol=pdf_yolu, logo=logo)
    except YazdirmaHatasi:
        if not pdf_yolu.exists():
            raise
        zamanli_yol = pdf_yolu.with_name(
            f"etiket_{datetime.now():%Y%m%d_%H%M%S_%f}.pdf"
        )
        pdf = pdf_kaydet(veri, boyut, kopya, yol=zamanli_yol, logo=logo)
    with _kagit_ayari(yazici, boyut, pdf):
        try:
            sonuc = subprocess.run(
                [
                    sumatra,
                    "-print-to",
                    yazici,
                    "-print-settings",
                    "noscale",
                    "-silent",
                    "-exit-when-done",
                    str(pdf),
                ],
                check=False,
                timeout=120,
                capture_output=True,
                creationflags=0x08000000,
            )
        except subprocess.TimeoutExpired as hata:
            raise YazdirmaHatasi(
                "Yazıcı yanıt vermedi. Yazıcının açık, bağlı ve kâğıt takılı olduğunu kontrol edin."
            ) from hata
        except OSError as hata:
            raise YazdirmaHatasi(
                "Yazdırma başlatılamadı. Yazıcının açık ve bağlı olduğunu kontrol edin."
            ) from hata
    if sonuc.returncode != 0:
        raise YazdirmaHatasi(
            "Yazıcı etiketi kabul etmedi. Yazıcının açık ve bağlı olduğunu kontrol edin."
        )
    return pdf
