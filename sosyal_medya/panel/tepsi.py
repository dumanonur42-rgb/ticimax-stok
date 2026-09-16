"""Arka plan ajanı için sistem tepsisi simgesi (Windows): durum, "Paneli aç", bildirimler, "Ajanı durdur".

Tepsi kurulamazsa (pystray yok, masaüstü oturumu yok) ajan döngüsü sade biçimde çalışır.
"""
import os
import subprocess
import sys
import threading
from pathlib import Path

from yollar import KILIT, KOK

SIMGE = KOK / "panel" / "simge.png"
BASLIK = "Yamansa Ajan"


def _panel_ac():
    if getattr(sys, "frozen", False):
        cmd = [sys.executable]
    else:
        cmd = [sys.executable, str(Path(__file__).resolve().parent / "__main__.py")]
    flags = (subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP) if os.name == "nt" else 0
    subprocess.Popen(cmd, creationflags=flags, close_fds=True)


def calistir(dongu):
    """dongu() ajan döngüsünü tepsi simgesiyle birlikte çalıştırır; dönüş kodu ajanınkidir."""
    if os.name != "nt":
        return dongu()
    try:
        import pystray
        from PIL import Image
        import ajan
        simge = Image.open(SIMGE).resize((64, 64), Image.LANCZOS)
    except Exception:  # noqa: BLE001
        return dongu()

    sonuc = [0]
    ikon = pystray.Icon("yamansa_ajan", simge, BASLIK)

    def durum_metni(_item=None):
        try:
            from ayarlar import durum_oku
            is_ = durum_oku().get("ajan", {}).get("is_", "bekliyor")
        except Exception:  # noqa: BLE001
            is_ = "bekliyor"
        return f"{BASLIK} · {is_}"

    def dur(_icon=None, _item=None):
        try:
            KILIT.unlink(missing_ok=True)
            ajan._nabiz(is_="durdu")
        finally:
            ikon.stop()
            os._exit(0)

    ikon.menu = pystray.Menu(
        pystray.MenuItem(durum_metni, None, enabled=False),
        pystray.MenuItem("Paneli aç", lambda _i, _m: _panel_ac(), default=True),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Ajanı durdur", dur),
    )

    def bildir(baslik, mesaj):
        try:
            ikon.notify(mesaj, baslik)
        except Exception:  # noqa: BLE001
            pass
    ajan.bildirici = bildir

    def arka():
        try:
            sonuc[0] = dongu()
        finally:
            ikon.stop()

    def basla(icon):
        icon.visible = True
        threading.Thread(target=arka, daemon=True).start()

    try:
        ikon.run(setup=basla)
    except Exception:  # noqa: BLE001  tepsi yoksa sade döngü
        ajan.bildirici = None
        return dongu()
    return sonuc[0]
