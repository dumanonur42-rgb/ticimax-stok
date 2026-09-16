# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller: Windows'ta `exe_uret.bat` ile çalıştırılır -> dist/YamansaPanel/YamansaPanel.exe

Tek exe hem paneli (argümansız) hem ajanı (--ajan) çalıştırır; yollar.py sys._MEIPASS altında
gonderiler/, grup_paylasim/, otomasyon/ ve icerik_verisi.py'yi bulur.
"""
from pathlib import Path

import customtkinter

PANEL = Path(SPECPATH)
KOK = PANEL.parent  # sosyal_medya/

datas = [
    (str(KOK / "icerik_verisi.py"), "."),
    (str(KOK / "logo_yamansa.png"), "."),
    (str(KOK / "otomasyon" / "gunluk_metin.py"), "otomasyon"),
    (str(KOK / "grup_paylasim" / "segmentler.py"), "grup_paylasim"),
    (str(KOK / "grup_paylasim" / "varyantlar.py"), "grup_paylasim"),
    (str(KOK / "grup_paylasim" / "gruplar.json"), "grup_paylasim"),
    (str(Path(customtkinter.__file__).parent), "customtkinter"),
]
datas += [(str(p), "grup_paylasim/gorseller") for p in (KOK / "grup_paylasim" / "gorseller").glob("*.png")
          if not p.name.startswith("_")]
datas += [(str(p), "gonderiler") for p in (KOK / "gonderiler").glob("gun*_*.png")
          if p.stem.split("_")[1] in ("kare", "sabah", "story")]

a = Analysis(
    [str(PANEL / "__main__.py")],
    pathex=[str(PANEL), str(KOK), str(KOK / "otomasyon"), str(KOK / "grup_paylasim")],
    datas=datas,
    hiddenimports=["arayuz", "ajan", "ayarlar", "gorev", "icerik", "paylas", "tarayici", "yollar",
                   "gunluk_metin", "icerik_verisi", "segmentler", "varyantlar", "PIL._tkinter_finder"],
    excludes=["matplotlib", "numpy", "scipy", "pandas"],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz,
    a.scripts,
    exclude_binaries=True,
    name="YamansaPanel",
    console=False,
    icon=str(PANEL / "yamansa.ico"),
)
coll = COLLECT(exe, a.binaries, a.datas, name="YamansaPanel")
