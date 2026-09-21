"""Ajanın Windows'ta otomatik başlaması (Görev Zamanlayıcı). Panel kapalıyken de paylaşım atılması bunu gerektirir.

İki görev (XML ile kurulur; schtasks komut satırı 'sadece prizde çalıştır', '72 saat sonra durdur' ve
'uykudan uyandır' ayarlarını vermez):
- YamansaAjan:     oturum açılışında + 15 dk'da bir `--ajan` (çalışıyorsa yeni örnek başlatılmaz), süre sınırı yok.
- YamansaUyandir:  her aktif slot/grup turu saatinde PC'yi uykudan uyandırır ve `--uyandir` çalıştırır
                   (ajan yoksa başlatır, iş bitene kadar PC'yi uyanık tutar; paylaşımı ajan yapar).
"""
import ctypes
import datetime as dt
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from xml.sax.saxutils import escape

GOREV = "YamansaAjan"
GOREV_UYANDIR = "YamansaUyandir"
_ESKI = ("YamansaAjanKontrol",)
_GIZLI = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
_KURULU_ONBELLEK_SN = 30
_kurulu_onbellek = (0.0, False)


def ajan_komutu():
    exe, arg = _exe_ve_arg()
    return f'"{exe}" {arg}'


def _exe_ve_arg(arg="--ajan"):
    if getattr(sys, "frozen", False):
        return sys.executable, arg
    main = Path(__file__).resolve().parent / "__main__.py"
    py = Path(sys.executable)
    if os.name == "nt":  # konsol penceresi açılmasın
        pyw = py.with_name("pythonw.exe")
        py = pyw if pyw.exists() else py
    return str(py), f'"{main}" {arg}'


def _schtasks(*args):
    r = subprocess.run(["schtasks", *args], capture_output=True, text=True, creationflags=_GIZLI,
                       encoding="cp857", errors="replace")
    return r.returncode == 0, (r.stdout + r.stderr).strip()


def kurulu(yenile=False):
    """Ana görev kayıtlı mı? Panel sık sorduğu için sonuç kısa süre önbelleklenir (her sorgu bir schtasks süreci)."""
    global _kurulu_onbellek
    if os.name != "nt":
        return False
    zaman, deger = _kurulu_onbellek
    if not yenile and time.time() - zaman < _KURULU_ONBELLEK_SN:
        return deger
    ok, _ = _schtasks("/Query", "/TN", GOREV)
    _kurulu_onbellek = (time.time(), ok)
    return ok


def yol_guncel():
    """Kurulu görev bu exe'yi mi çalıştırıyor? (uygulama taşındı/güncellendiyse False)"""
    if os.name != "nt":
        return True
    ok, xml = _schtasks("/Query", "/TN", GOREV, "/XML")
    if not ok:
        return True
    exe, _ = _exe_ve_arg()
    return escape(exe).lower() in xml.lower()


def tamamen_kaldir():
    """Kaldırıcı için: çalışan ajanı durdur, zamanlanmış görevleri sil."""
    durdur()
    return kaldir()


def uyandirma_saatleri(ayar):
    """Uyandırma tetikleyicisi kurulacak saatler: aktif slotlar + (grup turları açıksa) aktif turlar."""
    saatler = {s["saat"] for s in ayar["slotlar"].values() if s["aktif"]}
    if ayar["grup"]["aktif"]:
        saatler |= {t["saat"] for t in ayar["grup"]["turlar"] if t["aktif"]}
    return sorted(saatler)


def _kullanici():
    """DOMAIN\\kullanici (whoami); yönetici olmayan hesap yalnızca kendi adına görev kurabilir."""
    if os.name == "nt":
        try:  # GetUserNameExW(NameSamCompatible) -> "DOMAIN\kullanici" (Unicode; Türkçe karakterli adlar bozulmaz)
            buf = ctypes.create_unicode_buffer(512)
            n = ctypes.c_ulong(512)
            if ctypes.windll.secur32.GetUserNameExW(2, buf, ctypes.byref(n)) and buf.value:
                return buf.value
        except Exception:
            pass
        r = subprocess.run(["whoami"], capture_output=True, text=True, creationflags=_GIZLI,
                           encoding="cp857", errors="replace")
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.strip()
    return f"{os.environ.get('USERDOMAIN', '')}\\{os.environ.get('USERNAME', '')}".strip("\\")


def _erisim_hatasi(mesaj):
    m = mesaj.lower()
    return "engellendi" in m or "denied" in m or "0x80070005" in m


def _xml(tetikleyiciler, sure_siniri="PT0S", uyandir=False, arg="--ajan"):
    exe, arg = _exe_ve_arg(arg)
    kullanici = _kullanici()
    tetikleyiciler = tetikleyiciler.replace("{KULLANICI}", escape(kullanici))
    return f"""<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>Yamansa Sosyal Medya Paneli arka plan ajanı</Description></RegistrationInfo>
  <Triggers>
{tetikleyiciler}
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>{escape(kullanici)}</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>{'true' if uyandir else 'false'}</WakeToRun>
    <ExecutionTimeLimit>{sure_siniri}</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>{escape(exe)}</Command>
      <Arguments>{escape(arg)}</Arguments>
      <WorkingDirectory>{escape(str(Path(exe).parent))}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"""


def _gorev_yaz(ad, xml):
    with tempfile.NamedTemporaryFile("w", suffix=".xml", delete=False, encoding="utf-16") as f:
        f.write(xml)
        yol = f.name
    try:
        return _schtasks("/Create", "/F", "/TN", ad, "/XML", yol)
    finally:
        Path(yol).unlink(missing_ok=True)


def _ajan_xml():
    simdi = dt.datetime.now().replace(second=0, microsecond=0)
    # LogonTrigger'da UserId şart: kullanıcı belirtilmeyen ("herhangi bir kullanıcı") oturum açma
    # tetikleyicisi yalnızca yönetici tarafından kaydedilebilir -> standart hesapta 'Erişim engellendi'.
    t = f"""    <LogonTrigger><Enabled>true</Enabled><Delay>PT30S</Delay><UserId>{{KULLANICI}}</UserId></LogonTrigger>
    <TimeTrigger>
      <Repetition><Interval>PT15M</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition>
      <StartBoundary>{simdi:%Y-%m-%dT%H:%M:%S}</StartBoundary>
      <Enabled>true</Enabled>
    </TimeTrigger>"""
    return _xml(t)


def _uyandir_xml(saatler):
    bugun = dt.date.today()
    t = "\n".join(
        f"""    <CalendarTrigger>
      <StartBoundary>{bugun:%Y-%m-%d}T{s}:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay>
    </CalendarTrigger>"""
        for s in saatler
    )
    return _xml(t, sure_siniri="PT1H", uyandir=True, arg="--uyandir")


def uyandirma_guncelle(ayar):
    """Uyandırma görevini ayarlardaki saatlere göre yeniden kurar (ana görev kuruluysa)."""
    if os.name != "nt" or not kurulu():
        return False, ""
    saatler = uyandirma_saatleri(ayar)
    if not saatler:
        return _schtasks("/Delete", "/F", "/TN", GOREV_UYANDIR)
    return _gorev_yaz(GOREV_UYANDIR, _uyandir_xml(saatler))


def uyandirma_izni():
    """Güç planında 'uyandırma zamanlayıcılarına izin ver' açmayı dener (yönetici gerekmezse). -> (ok, mesaj)"""
    if os.name != "nt":
        return False, ""
    ok = True
    for tur in ("/setacvalueindex", "/setdcvalueindex"):
        r = subprocess.run(["powercfg", tur, "SCHEME_CURRENT", "SUB_SLEEP", "RTCWAKE", "1"],
                           capture_output=True, creationflags=_GIZLI)
        ok = ok and r.returncode == 0
    subprocess.run(["powercfg", "/setactive", "SCHEME_CURRENT"], capture_output=True, creationflags=_GIZLI)
    return ok, ("Uyandırma zamanlayıcıları açıldı." if ok else
                "Güç planı değiştirilemedi: Denetim Masası > Güç Seçenekleri > Plan ayarları > Gelişmiş > Uyku > "
                "Uyandırma zamanlayıcılarına izin ver = Etkin yapın.")


def _yukseltilmis_kur(gorevler):
    """Yedek yol: görevleri tek UAC onayıyla (yönetici) kaydeder. gorevler = {ad: xml}. -> (ok, mesaj)"""
    d = Path(tempfile.mkdtemp(prefix="yamansa_gorev_"))
    try:
        satirlar = ["$ErrorActionPreference = 'Stop'"]
        for ad, xml in gorevler.items():
            yol = d / f"{ad}.xml"
            yol.write_text(xml, encoding="utf-16")
            satirlar.append(f"schtasks /Delete /F /TN {ad} 2>$null")
            satirlar.append(f"schtasks /Create /F /TN {ad} /XML '{yol}'")
            satirlar.append("if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }")
        ps1 = d / "kur.ps1"
        ps1.write_text("\r\n".join(satirlar) + "\r\nexit 0\r\n", encoding="utf-8-sig")
        komut = ("$p = Start-Process -FilePath powershell -Verb RunAs -Wait -PassThru -WindowStyle Hidden "
                 f"-ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','\"{ps1}\"'; exit $p.ExitCode")
        r = subprocess.run(["powershell", "-NoProfile", "-Command", komut], capture_output=True,
                           creationflags=_GIZLI, timeout=180)
        if r.returncode != 0:
            return False, ("Erişim engellendi: Windows yönetici onayı (UAC) verilmedi veya görev kaydı reddedildi. "
                           "Tekrar deneyip 'Evet' deyin ya da uygulamayı bir kez sağ tık > Yönetici olarak çalıştır ile açın.")
        if not kurulu(yenile=True):
            return False, "Görev yönetici izniyle de kaydedilemedi."
        return True, "Görevler yönetici onayıyla kuruldu."
    except Exception as e:  # noqa: BLE001
        return False, f"Yönetici onayı alınamadı: {e}"
    finally:
        shutil.rmtree(d, ignore_errors=True)


def kur(ayar=None, calistir=True):
    """Oturum açılışında başlat + 15 dk'da bir kontrol + slot saatlerinde uykudan uyandır."""
    if os.name != "nt":
        return False, "Otomatik başlatma yalnızca Windows'ta kurulur; ajanı 'Ajanı şimdi başlat' ile elle çalıştırın."
    if ayar is None:
        from ayarlar import ayar_oku
        ayar = ayar_oku()
    for eski in _ESKI:
        _schtasks("/Delete", "/F", "/TN", eski)
    saatler = uyandirma_saatleri(ayar)
    ok, m1 = _gorev_yaz(GOREV, _ajan_xml())
    mesaj = [m1]
    if ok:
        ok, m2 = uyandirma_guncelle(ayar)
        mesaj.append(m2)
    if not ok and any(_erisim_hatasi(m) for m in mesaj):
        gorevler = {GOREV: _ajan_xml()}
        if saatler:
            gorevler[GOREV_UYANDIR] = _uyandir_xml(saatler)
        ok, m = _yukseltilmis_kur(gorevler)
        mesaj = [m]
    kurulu(yenile=True)
    if ok:
        if calistir:
            _schtasks("/Run", "/TN", GOREV)
        _, m3 = uyandirma_izni()
        mesaj.append(m3)
    return ok, "\n".join(m for m in mesaj if m).strip()


def kaldir():
    if os.name != "nt":
        return False, "Windows değil"
    sonuc = [_schtasks("/Delete", "/F", "/TN", ad) for ad in (GOREV, GOREV_UYANDIR, *_ESKI)]
    kurulu(yenile=True)
    return any(ok for ok, _ in sonuc), "\n".join(m for _, m in sonuc).strip()


def simdi_baslat():
    """Ajanı hemen arka planda başlatır (görev kurulu olmasa da)."""
    if os.name == "nt":
        flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP | _GIZLI
        subprocess.Popen(ajan_komutu(), creationflags=flags, close_fds=True)
    else:
        args = [sys.executable] + ([] if getattr(sys, "frozen", False) else [str(Path(__file__).resolve().parent / "__main__.py")]) + ["--ajan"]
        subprocess.Popen(args, start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, close_fds=True)


def durdur(bekle_sn=20):
    """Çalışan ajanı kapatır: önce nazik durdurma isteği (döngü kendini bitirir, tarayıcıyı kapatır); süre
    dolarsa süreç ağacı (Chromium alt süreçleri dahil) zorla sonlandırılır. -> ajan var mıydı"""
    import ajan
    from ayarlar import durum_oku
    try:
        pid = int(durum_oku().get("ajan", {}).get("pid") or 0)
    except (TypeError, ValueError):
        pid = 0
    if not pid or not ajan.pid_calisiyor(pid):
        return False
    ajan.ajani_durdur_iste()
    son = time.time() + bekle_sn
    while time.time() < son:
        if not ajan.pid_calisiyor(pid):
            return True
        time.sleep(0.5)
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True, creationflags=_GIZLI)
        else:
            os.kill(pid, 15)
    except Exception:  # noqa: BLE001
        return False
    return True
