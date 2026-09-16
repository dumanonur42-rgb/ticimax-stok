"""Ajanın Windows'ta otomatik başlaması (Görev Zamanlayıcı). Panel kapalıyken de paylaşım atılması bunu gerektirir."""
import os
import subprocess
import sys
from pathlib import Path

GOREV = "YamansaAjan"
GOREV_KONTROL = "YamansaAjanKontrol"
_GIZLI = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0


def ajan_komutu():
    if getattr(sys, "frozen", False):
        return f'"{sys.executable}" --ajan'
    main = Path(__file__).resolve().parent / "__main__.py"
    py = Path(sys.executable)
    if os.name == "nt":  # konsol penceresi açılmasın
        pyw = py.with_name("pythonw.exe")
        py = pyw if pyw.exists() else py
    return f'"{py}" "{main}" --ajan'


def _schtasks(*args):
    r = subprocess.run(["schtasks", *args], capture_output=True, text=True, creationflags=_GIZLI,
                       encoding="cp857", errors="replace")
    return r.returncode == 0, (r.stdout + r.stderr).strip()


def kurulu():
    if os.name != "nt":
        return False
    ok, _ = _schtasks("/Query", "/TN", GOREV)
    return ok


def kur():
    """Oturum açılışında başlat + her 15 dk'da 'çalışıyor mu' kontrolü (ajan tek örnek kilidiyle korunur)."""
    if os.name != "nt":
        return False, "Otomatik başlatma yalnızca Windows'ta kurulur; ajanı 'Ajanı şimdi başlat' ile elle çalıştırın."
    cmd = ajan_komutu()
    ok1, m1 = _schtasks("/Create", "/F", "/TN", GOREV, "/TR", cmd, "/SC", "ONLOGON", "/RL", "LIMITED")
    ok2, m2 = _schtasks("/Create", "/F", "/TN", GOREV_KONTROL, "/TR", cmd, "/SC", "MINUTE", "/MO", "15",
                        "/RL", "LIMITED")
    if ok1:
        _schtasks("/Run", "/TN", GOREV)
    return ok1 and ok2, (m1 + "\n" + m2).strip()


def kaldir():
    if os.name != "nt":
        return False, "Windows değil"
    ok1, m1 = _schtasks("/Delete", "/F", "/TN", GOREV)
    ok2, m2 = _schtasks("/Delete", "/F", "/TN", GOREV_KONTROL)
    return ok1 or ok2, (m1 + "\n" + m2).strip()


def simdi_baslat():
    """Ajanı hemen arka planda başlatır (görev kurulu olmasa da)."""
    if os.name == "nt":
        flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP | _GIZLI
        subprocess.Popen(ajan_komutu(), creationflags=flags, close_fds=True)
    else:
        args = [sys.executable] + ([] if getattr(sys, "frozen", False) else [str(Path(__file__).resolve().parent / "__main__.py")]) + ["--ajan"]
        subprocess.Popen(args, start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, close_fds=True)


def durdur():
    """Çalışan ajanı kapatır (durum.json'daki pid)."""
    from ayarlar import durum_oku
    pid = durum_oku().get("ajan", {}).get("pid")
    if not pid:
        return False
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(pid), "/F"], capture_output=True, creationflags=_GIZLI)
        else:
            os.kill(pid, 15)
        return True
    except Exception:
        return False
