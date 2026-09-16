"""Arka plan ajanı: zamanlayıcı + panelden gelen komutlar. Panel kapalıyken de çalışır.

  python -m panel --ajan        (Windows Görev Zamanlayıcı bunu oturum açılışında başlatır)

Kurallar:
- Her slot günde 1 kez atılır (durum.json/yapildi). Slot saati geçmişse tolerans süresi içinde telafi edilir.
- Grup turları yalnızca ayarlarda `grup.aktif` ise çalışır; BLOK görülürse tur durur, grup turları kapatılır.
- Panel "şimdi paylaş" komutlarını KOMUT klasörüne JSON olarak bırakır; ajan sırayla işler.
"""
import datetime as dt
import json
import os
import socket
import sys
import time
import traceback

import icerik
import paylas
import tarayici
from ayarlar import ayar_oku, durum_oku, durum_yaz, log_ekle
from yollar import AJAN_LOG, KILIT, KOMUT, SHOTS

DUR_BAYRAK = KOMUT / "DUR"
MESGUL_BAYRAK = KOMUT / "PANEL_MESGUL"  # panel tarayıcıyı kullanıyor (giriş penceresi vb.)


def panel_mesgul():
    try:
        return time.time() - MESGUL_BAYRAK.stat().st_mtime < 1800
    except FileNotFoundError:
        return False


def _zaman():
    return dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def yaz(msg):
    satir = f"[{_zaman()}] {msg}"
    print(satir, flush=True)
    with AJAN_LOG.open("a", encoding="utf-8") as f:
        f.write(satir + "\n")


def _nabiz(**k):
    d = durum_oku()
    d["ajan"] = dict(d.get("ajan", {}), pid=os.getpid(), son_nabiz=_zaman(), **k)
    durum_yaz(d)


def ajan_canli():
    d = durum_oku().get("ajan", {})
    try:
        t = dt.datetime.strptime(d["son_nabiz"], "%Y-%m-%d %H:%M:%S")
        pid = int(d["pid"])
    except Exception:
        return False
    return (dt.datetime.now() - t).total_seconds() < 600 and pid_calisiyor(pid)


_ES_CONTINUOUS, _ES_SYSTEM_REQUIRED = 0x80000000, 0x00000001


def uyanik_tut(acik):
    """Windows: iş sürerken PC'nin uykuya dalmasını engeller (uykudan uyandırılmış PC 2 dk'da tekrar uyur)."""
    if os.name != "nt":
        return
    import ctypes
    ctypes.windll.kernel32.SetThreadExecutionState(_ES_CONTINUOUS | (_ES_SYSTEM_REQUIRED if acik else 0))


# ---------------------------------------------------------------- işler
def slot_isi(ctx, ayar, gun, slot, platformlar, go=True):
    """Bir slotu verilen platformlarda paylaşır, loglar. -> [log kayıtları]"""
    d = icerik.slot_icerik(gun, slot)
    out = []
    for p in platformlar:
        shot = SHOTS / f"g{gun:02d}_{slot}_{p}_{dt.datetime.now():%H%M%S}.png"
        if slot == "story":
            durum, url = (paylas.fb_story(ctx, d["img"], d["link"], d["alt"], go, shot) if p == "fb"
                          else paylas.ig_story(ctx, d["img"], go, shot))
        else:
            durum, url = (paylas.fb_post(ctx, d["img"], d["fb"], go, shot) if p == "fb"
                          else paylas.ig_post(ctx, d["img"], d["ig"], d["alt"], go, shot))
        out.append(log_ekle(tip="slot", gun=gun, slot=slot, platform=p, durum=durum, url=url, ekran=shot.name))
        yaz(f"{slot} gün {gun} {p}: {durum} {url}")
        if durum == "BLOK":
            _blok_kaydet(f"{p}: {url}")
    return out


def _blok_kaydet(neden):
    from ayarlar import ayar_yaz
    d = durum_oku()
    d["blok"] = dict(zaman=_zaman(), neden=neden)
    durum_yaz(d)
    a = ayar_oku()
    if a["bildirim"]["blokta_dur"]:
        a["grup"]["aktif"] = False
        ayar_yaz(a)
    yaz(f"BLOK: {neden} – grup turları kapatıldı")


def grup_turu(ctx, ayar, secili=None, ara_is=None, go=True):
    """Açık gruplara segment varyantlarıyla paylaşım. secili: URL listesi (None = tüm açık gruplar)."""
    d = durum_oku()
    tur_no = d.get("tur_no", 0) + 1
    d["tur_no"] = tur_no
    gs = [g for g in icerik.gruplar(ayar) if g["acik"] and (secili is None or g["url"] in secili)]
    gs = gs[: ayar["grup"]["gunluk_limit"]]
    d["grup_turu"] = dict(aktif=True, tur_no=tur_no, islenen=0, toplam=len(gs), son="", baslangic=_zaman())
    durum_yaz(d)
    DUR_BAYRAK.unlink(missing_ok=True)
    yaz(f"grup turu {tur_no} başladı: {len(gs)} grup, ara {ayar['grup']['ara_sn']} sn")
    ozet = {}
    try:
        for i, g in enumerate(gs):
            if DUR_BAYRAK.exists():
                yaz("grup turu kullanıcı tarafından durduruldu")
                break
            key, img, text = icerik.varyant(g["segment"], tur_no, ayar["grup"]["varyant"])
            shot = SHOTS / f"grup_{g['id']}_{dt.datetime.now():%m%d_%H%M%S}.png"
            durum, notu = paylas.grup_post(ctx, g["url"], img, text, go, shot)
            log_ekle(tip="grup", grup=g["name"], url=g["url"], segment=g["segment"], varyant=key, durum=durum,
                     notu=notu, ekran=shot.name, tur=tur_no)
            ozet[durum] = ozet.get(durum, 0) + 1
            yaz(f"  [{i + 1}/{len(gs)}] {durum:7} {g['name'][:45]} {key} {notu}")
            dd = durum_oku()
            dd["grup_turu"].update(islenen=i + 1, son=g["name"])
            durum_yaz(dd)
            if durum == "BLOK":
                _blok_kaydet(f"grup {g['name']}: {notu}")
                break
            if i < len(gs) - 1:
                _bekle(ayar["grup"]["ara_sn"], ara_is, ctx)
    finally:
        dd = durum_oku()
        dd["grup_turu"].update(aktif=False, bitis=_zaman(), ozet=ozet)
        durum_yaz(dd)
        yaz(f"grup turu {tur_no} bitti: {ozet}")
    return ozet


def _bekle(sn, ara_is, ctx):
    """Gruplar arası bekleme; bu sırada vadesi gelen slotlar (ara_is) çalıştırılır, DUR bayrağı izlenir."""
    son = time.time() + sn
    while time.time() < son:
        if DUR_BAYRAK.exists():
            return
        if ara_is:
            ara_is(ctx)
        _nabiz(is_="grup turu (bekliyor)")
        time.sleep(min(10, max(0, son - time.time())))


# ---------------------------------------------------------------- zamanlayıcı
def _saat(s):
    h, m = s.split(":")
    return int(h), int(m)


def vadesi_gelenler(ayar, durum, simdi=None):
    """Bugün için saati gelmiş, henüz yapılmamış işler -> [(anahtar, tip, veri)]"""
    simdi = simdi or dt.datetime.now()
    bugun = simdi.strftime("%Y-%m-%d")
    yapildi = durum.get("yapildi", {}).get(bugun, {})
    tol = dt.timedelta(minutes=ayar["gecikme_toleransi_dk"])
    out = []
    for slot, s in ayar["slotlar"].items():
        if not s["aktif"] or slot in yapildi:
            continue
        h, m = _saat(s["saat"])
        hedef = simdi.replace(hour=h, minute=m, second=0, microsecond=0)
        if hedef <= simdi <= hedef + tol:
            out.append((slot, "slot", s))
    if ayar["grup"]["aktif"] and not durum.get("blok"):
        for t in ayar["grup"]["turlar"]:
            key = f"grup_{t['saat']}"
            if not t["aktif"] or key in yapildi:
                continue
            h, m = _saat(t["saat"])
            hedef = simdi.replace(hour=h, minute=m, second=0, microsecond=0)
            if hedef <= simdi <= hedef + tol:
                out.append((key, "grup", t))
    return out


def sonraki_isler(ayar, durum, simdi=None, adet=6):
    """Panel için: yaklaşan işler listesi [(datetime, açıklama)]"""
    simdi = simdi or dt.datetime.now()
    out = []
    for gun_kay in range(0, 3):
        t = (simdi + dt.timedelta(days=gun_kay)).date()
        yapildi = durum.get("yapildi", {}).get(t.isoformat(), {})
        for slot, s in ayar["slotlar"].items():
            if s["aktif"] and slot not in yapildi:
                h, m = _saat(s["saat"])
                z = dt.datetime.combine(t, dt.time(h, m))
                if z >= simdi - dt.timedelta(minutes=ayar["gecikme_toleransi_dk"]):
                    out.append((z, f"{s['ad']} · Gün {icerik.gun_no(ayar, t)} · {'+'.join(p.upper() for p in s['platformlar'])}"))
        if ayar["grup"]["aktif"]:
            for tr in ayar["grup"]["turlar"]:
                if tr["aktif"] and f"grup_{tr['saat']}" not in yapildi:
                    h, m = _saat(tr["saat"])
                    z = dt.datetime.combine(t, dt.time(h, m))
                    if z >= simdi:
                        out.append((z, "Grup turu (tüm açık gruplar)"))
    return sorted(out)[:adet]


def _isaretle(key):
    d = durum_oku()
    bugun = dt.datetime.now().strftime("%Y-%m-%d")
    d.setdefault("yapildi", {}).setdefault(bugun, {})[key] = _zaman()
    durum_yaz(d)


def giris_guncelle(ctx):
    """Oturum durumunu kontrol eder, durum.json'a yazar. -> {'fb': bool, 'ig': bool}"""
    g = tarayici.giris_kontrol(ctx)
    d = durum_oku()
    d["giris"] = dict(g, zaman=_zaman())
    durum_yaz(d)
    return g


def _giris_yok_uyar(key, platformlar):
    """Oturumu olmayan platformları günde bir kez loglar; slot 'yapıldı' sayılmaz, giriş yapılınca tolerans içinde atılır."""
    d = durum_oku()
    bugun = dt.datetime.now().strftime("%Y-%m-%d")
    uyar = d.setdefault("giris_uyari", {}).setdefault(bugun, [])
    for p in platformlar:
        if f"{key}:{p}" not in uyar:
            uyar.append(f"{key}:{p}")
            log_ekle(tip="slot", gun=icerik.gun_no(ayar_oku()), slot=key, platform=p, durum="FAIL",
                     url="Oturum açık değil – Hesaplar sayfasından giriş yapın")
            yaz(f"{key} {p}: oturum yok, giriş bekleniyor")
    durum_yaz(d)


def _vadeli_slotlari_calistir(ctx, giris=None):
    """Vadesi gelen slot işlerini çalıştırır (grup turu beklemeleri sırasında da çağrılır)."""
    ayar = ayar_oku()
    vadeli = [(k, v) for k, t, v in vadesi_gelenler(ayar, durum_oku()) if t == "slot"]
    if not vadeli:
        return False
    giris = giris or giris_guncelle(ctx)
    atlandi = False
    for key, veri in vadeli:
        acik = [p for p in veri["platformlar"] if giris.get(p)]
        kapali = [p for p in veri["platformlar"] if not giris.get(p)]
        if kapali:
            _giris_yok_uyar(key, kapali)
            atlandi = True
        if not acik:
            continue
        _isaretle(key)  # önce işaretle: hata olursa aynı gün tekrar denenmez (çift paylaşım riski)
        gun = icerik.gun_no(ayar)
        _nabiz(is_=f"{veri['ad']} paylaşılıyor")
        try:
            slot_isi(ctx, ayar, gun, key, acik)
        except Exception as e:
            yaz(f"slot {key} hata: {e}")
            log_ekle(tip="slot", gun=gun, slot=key, platform="-", durum="FAIL", url=str(e)[:150])
    return atlandi


# ---------------------------------------------------------------- komutlar
def _komutlar():
    for p in sorted(KOMUT.glob("*.json")):
        try:
            k = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            k = None
        p.unlink(missing_ok=True)
        if k:
            yield k


def komut_isle(ctx, k):
    ayar = ayar_oku()
    tip = k.get("tip")
    if tip == "slot":
        _nabiz(is_=f"panel: {k['slot']} gün {k['gun']}")
        slot_isi(ctx, ayar, int(k["gun"]), k["slot"], k["platformlar"], k.get("go", True))
    elif tip == "grup_turu":
        _nabiz(is_="panel: grup turu")
        grup_turu(ctx, ayar, k.get("gruplar"), _vadeli_slotlari_calistir, k.get("go", True))
    elif tip == "giris_kontrol":
        giris_guncelle(ctx)


def komut_gonder(**k):
    """Panel tarafı: ajana komut bırakır."""
    p = KOMUT / f"{time.time():.3f}.json"
    p.write_text(json.dumps(k, ensure_ascii=False), encoding="utf-8")


def grup_turunu_durdur():
    DUR_BAYRAK.write_text("dur")


# ---------------------------------------------------------------- döngü
def pid_calisiyor(pid):
    if os.name == "nt":
        import ctypes
        h = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
        if not h:
            return False
        kod = ctypes.c_ulong()
        ok = ctypes.windll.kernel32.GetExitCodeProcess(h, ctypes.byref(kod))
        ctypes.windll.kernel32.CloseHandle(h)
        return bool(ok) and kod.value == 259  # STILL_ACTIVE
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _kilit_al():
    if KILIT.exists():
        try:
            pid = int(KILIT.read_text())
            if pid != os.getpid() and pid_calisiyor(pid) and ajan_canli():
                return False
        except Exception:
            pass
    KILIT.write_text(str(os.getpid()))
    return True


def vadeli_isleri_calistir(ctx):
    """Vadesi gelen slot + grup işlerini çalıştırır. -> True: oturum eksik, uzun bekleme gerekir."""
    giris_bekle = _vadeli_slotlari_calistir(ctx)
    for key, tip, veri in vadesi_gelenler(ayar_oku(), durum_oku()):
        if tip != "grup":
            continue
        if not durum_oku().get("giris", {}).get("fb") and not giris_guncelle(ctx).get("fb"):
            yaz(f"{key}: Facebook oturumu yok, grup turu atlandı")
            giris_bekle = True
            continue
        _isaretle(key)
        grup_turu(ctx, ayar_oku(), None, _vadeli_slotlari_calistir)
    return giris_bekle


def tek_sefer():
    """--ajan-tek: vadesi gelen işleri bir kez çalıştırıp çıkar (Görev Zamanlayıcı yedeği)."""
    ayar = ayar_oku()
    if not vadesi_gelenler(ayar, durum_oku()):
        print("vadesi gelen iş yok")
        return 0
    if ajan_canli():
        print("ajan zaten çalışıyor, işleri o yapacak")
        return 0
    if not tarayici.tarayici_kurulu():
        print("Chromium kurulu değil – panelden 'Tarayıcıyı kur' çalıştırın")
        return 1
    with tarayici.ac(gizli=ayar["gizli_pencere"]) as ctx:
        vadeli_isleri_calistir(ctx)
    return 0


def ag_bekle(sn=90):
    """Uykudan uyanan PC'de Wi-Fi'nin gelmesini bekler (en fazla sn). -> internet var mı"""
    son = time.time() + sn
    while True:
        try:
            socket.create_connection(("www.facebook.com", 443), timeout=5).close()
            return True
        except OSError:
            if time.time() >= son:
                return False
            _nabiz(is_="internet bekleniyor")
            time.sleep(5)


def uyandir():
    """--uyandir: Görev Zamanlayıcı PC'yi uyandırdığında çalışır. Ajan yoksa başlatır; vadesi gelen işler
    bitene kadar (en fazla 20 dk) PC'yi uyanık tutar, sonra çıkar."""
    uyanik_tut(True)
    try:
        if not ajan_canli():
            import gorev
            gorev.simdi_baslat()
            yaz("uyandırma: ajan çalışmıyordu, başlatıldı")
        son = time.time() + 20 * 60
        time.sleep(30)  # ajan işi görüp başlasın
        while time.time() < son:
            d = durum_oku()
            mesgul = d.get("ajan", {}).get("is_", "") not in ("bekliyor", "giriş bekleniyor", "internet bekleniyor", "durdu", "")
            if not mesgul and not vadesi_gelenler(ayar_oku(), d):
                break
            time.sleep(15)
    finally:
        uyanik_tut(False)
    return 0


def dongu():
    if not _kilit_al():
        return 2  # başka bir ajan zaten çalışıyor (15 dk'lık kontrol görevi normalde buraya düşer)
    yaz("ajan başladı")
    _nabiz(is_="bekliyor", baslangic=_zaman())
    bekleme = 20
    try:
        while True:
            bekleme = 20
            try:
                komutlar = list(_komutlar())
                ayar = ayar_oku()
                vadeli = vadesi_gelenler(ayar, durum_oku())
                if komutlar or vadeli:
                    if panel_mesgul():
                        for k in komutlar:  # komutları geri bırak
                            komut_gonder(**k)
                        _nabiz(is_="panel tarayıcıyı kullanıyor, bekliyor")
                        time.sleep(10)
                        continue
                    if not tarayici.tarayici_kurulu():
                        yaz("Chromium kurulu değil – panelden 'Tarayıcıyı kur' çalıştırın")
                        time.sleep(60)
                        continue
                    uyanik_tut(True)
                    try:
                        if not ag_bekle():
                            yaz("internet yok, 60 sn sonra yeniden denenecek")
                            _nabiz(is_="internet bekleniyor")
                            time.sleep(60)
                            continue
                        with tarayici.ac(gizli=ayar["gizli_pencere"]) as ctx:
                            for k in komutlar:
                                try:
                                    komut_isle(ctx, k)
                                except Exception as e:
                                    yaz(f"komut hatası {k}: {e}\n{traceback.format_exc()}")
                            if vadeli_isleri_calistir(ctx):
                                bekleme = 300  # oturum yok: giriş bekleniyor, 5 dk'da bir yeniden dene
                    finally:
                        uyanik_tut(False)
                _nabiz(is_="bekliyor")
            except Exception as e:
                yaz(f"döngü hatası: {e}\n{traceback.format_exc()}")
            for i in range(bekleme // 10):
                if bekleme > 20 and (list(KOMUT.glob("*.json"))):
                    break
                if i and i % 6 == 0:
                    _nabiz(is_="giriş bekleniyor")
                time.sleep(10)
    finally:
        KILIT.unlink(missing_ok=True)
        _nabiz(is_="durdu")


if __name__ == "__main__":
    sys.exit(dongu())
