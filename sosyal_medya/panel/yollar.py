"""Dosya yolları: kaynak kodla ve PyInstaller paketiyle aynı şekilde çalışır."""
import os
import sys
from pathlib import Path

DONMUS = getattr(sys, "frozen", False)
KOK = Path(sys._MEIPASS) if DONMUS else Path(__file__).resolve().parents[1]  # sosyal_medya/
GONDERILER = KOK / "gonderiler"
GRUP = KOK / "grup_paylasim"
GRUP_GORSEL = GRUP / "gorseller"

if os.environ.get("YAMANSA_VERI"):  # test / taşınabilir kurulum: veri klasörünü dışarıdan seç
    VERI = Path(os.environ["YAMANSA_VERI"])
elif os.name == "nt":
    VERI = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "YamansaPanel"
else:
    VERI = Path.home() / ".yamansa_panel"
VERI.mkdir(parents=True, exist_ok=True)
AYAR = VERI / "ayarlar.json"
DURUM = VERI / "durum.json"
LOG = VERI / "log.json"
SHOTS = VERI / "ekran"
PROFIL = VERI / "profil"
TARAYICILAR = VERI / "tarayicilar"
KOMUT = VERI / "komut"
KILIT = VERI / "ajan.kilit"
AJAN_LOG = VERI / "ajan.log"
for d in (SHOTS, KOMUT):
    d.mkdir(exist_ok=True)

for p in (KOK, KOK / "otomasyon", GRUP):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))
