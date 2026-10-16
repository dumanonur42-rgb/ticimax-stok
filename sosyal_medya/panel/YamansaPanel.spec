# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller: dist/YamansaPanel/YamansaPanel.exe (+ _internal/).

Tek exe hem paneli (argümansız) hem ajanı (--ajan) çalıştırır; yollar.py sys._MEIPASS altında
gonderiler/, grup_paylasim/, otomasyon/ ve icerik_verisi.py'yi bulur. Kullanıcıya bu klasör değil,
kurulum.iss ile üretilen tek dosya YamansaPanel_Kurulum.exe verilir (Program Files benzeri klasöre kurar,
kısayol açar) – exe'nin _internal'dan ayrı taşınması sorunu böylece ortadan kalkar.
Tek dosya (onefile) bilinçli olarak kullanılmıyor: ~400 MB paket her açılışta geçici klasöre çıkarılır,
ajan görevi 15 dakikada bir tetiklendiği için bu diski ve açılış süresini gereksiz yorar.
"""
from pathlib import Path

import customtkinter
from PyInstaller.utils.hooks import collect_data_files

PANEL = Path(SPECPATH)
KOK = PANEL.parent  # sosyal_medya/

datas = [
    (str(KOK / "icerik_verisi.py"), "."),
    (str(KOK / "logo_yamansa.png"), "."),
    (str(PANEL / "yamansa.ico"), "panel"),
    (str(PANEL / "simge.png"), "panel"),
    (str(KOK / "otomasyon" / "gunluk_metin.py"), "otomasyon"),
    (str(KOK / "grup_paylasim" / "segmentler.py"), "grup_paylasim"),
    (str(KOK / "grup_paylasim" / "varyantlar.py"), "grup_paylasim"),
    (str(KOK / "grup_paylasim" / "gruplar.json"), "grup_paylasim"),
    (str(Path(customtkinter.__file__).parent), "customtkinter"),  # tema json'ları + yazı tipleri
]
datas += collect_data_files("playwright")  # driver/ (node + package) – tarayıcı sürücüsü
datas += [(str(p), "grup_paylasim/gorseller") for p in (KOK / "grup_paylasim" / "gorseller").glob("*.png")
          if not p.name.startswith("_")]
datas += [(str(p), "gonderiler") for p in (KOK / "gonderiler").glob("gun*_*.png")
          if p.stem.split("_")[1] in ("kare", "sabah", "story")]

a = Analysis(
    [str(PANEL / "__main__.py")],
    pathex=[str(PANEL), str(KOK), str(KOK / "otomasyon"), str(KOK / "grup_paylasim")],
    datas=datas,
    hiddenimports=["arayuz", "ajan", "ayarlar", "gorev", "icerik", "paylas", "tarayici", "tepsi", "yollar",
                   "PIL._tkinter_finder", "pystray._win32"],
    # İçerik modülleri PYZ'ye alınmaz; datas'taki .py dosyalarından (yollar.py'nin eklediği sys.path)
    # yüklenir ki segmentler.py `Path(__file__).parent / "gruplar.json"` doğru klasörü bulsun.
    excludes=["matplotlib", "numpy", "scipy", "pandas", "gunluk_metin", "icerik_verisi", "segmentler", "varyantlar",
              # kullanılmayan stdlib/araçlar
              "unittest", "doctest", "pydoc", "pydoc_data", "lib2to3", "test", "tkinter.test", "turtledemo", "idlelib",
              "setuptools", "pkg_resources", "wheel", "pip",
              # pystray'in diğer platform arka uçları
              "pystray._appindicator", "pystray._gtk", "pystray._xorg", "pystray._darwin", "pystray._dummy", "Xlib"],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz,
    a.scripts,
    [("X utf8", None, "OPTION")],  # Türkçe Windows'ta (cp1254) open()/subprocess varsayılanı UTF-8 olsun
    exclude_binaries=True,
    name="YamansaPanel",
    console=False,
    icon=str(PANEL / "yamansa.ico"),
    version=str(PANEL / "surum_bilgisi.txt"),
)
coll = COLLECT(exe, a.binaries, a.datas, name="YamansaPanel")
