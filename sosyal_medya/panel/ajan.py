"""Arka plan ajanı: zamanlayıcı + panelden gelen komutlar. Panel kapalıyken de çalışır.

  python -m panel --ajan        (Windows Görev Zamanlayıcı bunu oturum açılışında başlatır)

Kurallar:
- Her slot her platformda günde 1 kez atılır (durum.json/yapildi, anahtar "slot:platform"). Slot saati geçmişse
  tolerans süresi içinde telafi edilir. Paylaş'a hiç basılamadan biten denemeler (HATA) 10 dk sonra en fazla
  3 kez yinelenir; Paylaş'a basılan denemeler (OK/FAIL/PENDING) yinelenmez – çift gönderi riski.
- Grup turları yalnızca ayarlarda `grup.aktif` ise çalışır; BLOK görülürse tur durur, grup turları kapatılır.
- Panel "şimdi paylaş" komutlarını KOMUT klasörüne JSON olarak bırakır; ajan sırayla işler.
"""
import datetime as dt
import itertools
import json
import os
import socket
import sys
import time
import traceback

import icerik
import paylas
import tarayici
from ayarlar import ayar_guncelle, ayar_oku, durum_guncelle, durum_oku, log_ekle
from yollar import AJAN_LOG, KILIT, KOMUT, SHOTS

DUR_BAYRAK = KOMUT / "DUR"                 # süren grup turunu durdur
AJAN_DUR_BAYRAK = KOMUT / "AJAN_DUR"       # ajan döngüsünü nazikçe bitir
MESGUL_BAYRAK = KOMUT / "PANEL_MESGUL"     # panel tarayıcıyı kullanıyor (giriş penceresi vb.); içinde panel PID'i
BOSTA = ("bekliyor", "giriş bekleniyor", "internet bekleniyor", "durdu", "")  # tarayıcı açık değil
TEKRAR_MAX = 3      # HATA sonrası aynı gün en fazla bu kadar deneme
TEKRAR_DK = 10      # HATA sonrası yeniden deneme arası
NABIZ_SN = 600      # nabız bundan eskiyse ajan kapalı sayılır
KOMUT_OMRU_SN = 6 * 3600   # panel komutu bundan eskiyse işlenmez (ajan günler sonra açılıp sürpriz paylaşım yapmasın)
EKRAN_GUN = 30      # ekran görüntüleri bu kadar gün saklanır
AJAN_LOG_MB = 5
bildirici = None    # tepsi simgesi varsa (baslik, mesaj) -> Windows bildirimi


def bildir(baslik, mesaj):
    if bildirici:
        try:
            bildirici(baslik, mesaj)
        except Exception:  # noqa: BLE001
            pass


def panel_mesgul():
    """Panel tarayıcıyı kullanıyor mu? Bayrak eski (30 dk) ya da paneli yazan süreç kapanmışsa geçersiz sayılır."""
    try:
        st = MESGUL_BAYRAK.stat()
    except FileNotFoundError:
        return False
    if time.time() - st.st_mtime > 1800:
        return False
    try:
        pid = int(MESGUL_BAYRAK.read_text().strip() or 0)
    except (OSError, ValueError):
        return True
    return not pid or pid_calisiyor(pid)


def panel_mesgul_isaretle(acik):
    if acik:
        MESGUL_BAYRAK.write_text(str(os.getpid()))
    else:
        MESGUL_BAYRAK.unlink(missing_ok=True)


def _zaman():
    return dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def yaz(msg):
    satir = f"[{_zaman()}] {msg}"
    print(satir, flush=True)
    try:
        with AJAN_LOG.open("a", encoding="utf-8") as f:
            f.write(satir + "\n")
    except OSError:
        pass


def _nabiz(**k):
    def _fn(d):
        d["ajan"] = dict(d.get("ajan", {}), pid=os.getpid(), son_nabiz=_zaman(), **k)
    durum_guncelle(_fn)


def _ajan_kaydi(d=None):
    """durum.json'daki ajan kaydı -> (pid, nabız yaşı sn) ya da (None, None)."""
    a = (d or durum_oku()).get("ajan", {})
    try:
        t = dt.datetime.strptime(a["son_nabiz"], "%Y-%m-%d %H:%M:%S")
        return int(a["pid"]), (dt.datetime.now() - t).total_seconds()
    except (KeyError, TypeError, ValueError):
        return None, None


def ajan_canli():
    pid, yas = _ajan_kaydi()
    return pid is not None and yas < NABIZ_SN and pid_calisiyor(pid)


def ajan_bosta():
    """Ajan kapalı ya da tarayıcıyı kullanmıyor (panel giriş penceresi açabilir)."""
    d = durum_oku()
    pid, yas = _ajan_kaydi(d)
    if pid is None or yas >= NABIZ_SN or not pid_calisiyor(pid):
        return True
    return d.get("ajan", {}).get("is_", "") in BOSTA


_ES_CONTINUOUS, _ES_SYSTEM_REQUIRED = 0x80000000, 0x00000001


def uyanik_tut(acik):
    """Windows: iş sürerken PC'nin uykuya dalmasını engeller (uykudan uyandırılmış PC 2 dk'da tekrar uyur)."""
    if os.name != "nt":
        return
    try:
        import ctypes
        ctypes.windll.kernel32.SetThreadExecutionState(_ES_CONTINUOUS | (_ES_SYSTEM_REQUIRED if acik else 0))
    except Exception:  # noqa: BLE001
        pass


# ---------------------------------------------------------------- işler
def slot_isi(ctx, ayar, gun, slot, platformlar, go=True):
    """Bir slotu verilen platformlarda paylaşır, loglar. -> [log kayıtları]
    Bugünün içeriği gerçekten paylaşılıyorsa sonuç 'yapıldı' tablosuna da işlenir (panelden elle atılan
    slotu ajan saatinde bir daha atmaz)."""
    d = icerik.slot_icerik(gun, slot)
    bugunun = go and gun == icerik.gun_no(ayar)
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
        if bugunun:
            _isaretle(slot, [p], durum)
        if go:
            bildir(f"{'Facebook' if p == 'fb' else 'Instagram'} · {slot} (Gün {gun})",
                   "Paylaşım yayında ✔" if durum == "OK" else f"Sonuç: {durum} {url or ''}".strip())
        if durum == "BLOK":
            _blok_kaydet(f"{p}: {url}")
    return out


def _blok_kaydet(neden):
    durum_guncelle(lambda d: d.__setitem__("blok", dict(zaman=_zaman(), neden=neden)))
    kapatildi = False
    if ayar_oku()["bildirim"]["blokta_dur"]:
        ayar_guncelle(lambda a: a["grup"].__setitem__("aktif", False))
        kapatildi = True
    yaz(f"BLOK: {neden}" + (" – grup turları kapatıldı" if kapatildi else ""))
    bildir("Facebook engeli", neden + ("\nGrup turları kapatıldı; panelden kontrol edin." if kapatildi else ""))


def grup_turu(ctx, ayar, secili=None, ara_is=None, go=True):
    """Açık gruplara segment varyantlarıyla paylaşım. secili: URL listesi (None = tüm açık gruplar)."""
    gs = [g for g in icerik.gruplar(ayar) if g["acik"] and (secili is None or g["url"] in secili)]
    gs = gs[: ayar["grup"]["gunluk_limit"]]

    def _basla(d):
        d["tur_no"] = d.get("tur_no", 0) + 1
        d["grup_turu"] = dict(aktif=True, tur_no=d["tur_no"], islenen=0, toplam=len(gs), son="", baslangic=_zaman())
    tur_no = durum_guncelle(_basla)["tur_no"]
    DUR_BAYRAK.unlink(missing_ok=True)
    yaz(f"grup turu {tur_no} başladı: {len(gs)} grup, ara {ayar['grup']['ara_sn']} sn")
    ozet = {}
    try:
        for i, g in enumerate(gs):
            if DUR_BAYRAK.exists() or AJAN_DUR_BAYRAK.exists():
                yaz("grup turu kullanıcı tarafından durduruldu")
                break
            key, img, text = icerik.varyant(g["segment"], tur_no, ayar["grup"]["varyant"])
            shot = SHOTS / f"grup_{g['id']}_{dt.datetime.now():%m%d_%H%M%S}.png"
            durum, notu = paylas.grup_post(ctx, g["url"], img, text, go, shot)
            log_ekle(tip="grup", grup=g["name"], url=g["url"], segment=g["segment"], varyant=key, durum=durum,
                     notu=notu, ekran=shot.name, tur=tur_no)
            ozet[durum] = ozet.get(durum, 0) + 1
            yaz(f"  [{i + 1}/{len(gs)}] {durum:7} {g['name'][:45]} {key} {notu}")
            durum_guncelle(lambda d, i=i, g=g: d.setdefault("grup_turu", {}).update(islenen=i + 1, son=g["name"]))
            if durum == "BLOK":
                _blok_kaydet(f"grup {g['name']}: {notu}")
                break
            if i < len(gs) - 1:
                _bekle(ayar["grup"]["ara_sn"], ara_is, ctx)
    finally:
        durum_guncelle(lambda d: d.setdefault("grup_turu", {}).update(aktif=False, bitis=_zaman(), ozet=ozet))
        yaz(f"grup turu {tur_no} bitti: {ozet}")
    return ozet


def _bekle(sn, ara_is, ctx):
    """Gruplar arası bekleme; bu sırada vadesi gelen slotlar (ara_is) çalıştırılır, DUR bayrağı izlenir."""
    son = time.time() + sn
    while time.time() < son:
        if DUR_BAYRAK.exists() or AJAN_DUR_BAYRAK.exists():
            return
        if ara_is:
            ara_is(ctx)
        _nabiz(is_="grup turu (ara)")
        time.sleep(min(10, max(0, son - time.time())))


# ---------------------------------------------------------------- zamanlayıcı
def _saat(s):
    h, m = s.split(":")
    return int(h), int(m)


def _sayac(v):
    """'DURUM#n zaman' işaretinden n'yi çıkarır (yoksa 0)."""
    try:
        return int(str(v).split("#", 1)[1].split()[0])
    except (IndexError, ValueError):
        return 0


def _isaret_zamani(v):
    try:
        return dt.datetime.strptime(str(v).split(" ", 1)[1], "%Y-%m-%d %H:%M:%S")
    except (IndexError, ValueError):
        return None


def bekleyen_platformlar(yapildi, slot, platformlar, simdi=None):
    """Slotun bugün henüz işlenmemiş (ya da HATA sonrası yeniden denenecek) platformları."""
    simdi = simdi or dt.datetime.now()
    out = []
    for p in platformlar:
        v = yapildi.get(f"{slot}:{p}")
        if v is None:
            if slot in yapildi:  # eski sürümün tek anahtarlı işareti
                continue
            out.append(p)
            continue
        if str(v).startswith("HATA#") and _sayac(v) < TEKRAR_MAX:
            z = _isaret_zamani(v)
            if z is None or simdi - z >= dt.timedelta(minutes=TEKRAR_DK):
                out.append(p)
    return out


def slot_islendi(yapildi, slot):
    """Panel için: slot bugün herhangi bir platformda ele alındı mı?"""
    return slot in yapildi or any(k.startswith(slot + ":") for k in yapildi)


def vadesi_gelenler(ayar, durum, simdi=None):
    """Bugün için saati gelmiş, henüz yapılmamış işler -> [(anahtar, tip, veri)]"""
    simdi = simdi or dt.datetime.now()
    bugun = simdi.strftime("%Y-%m-%d")
    yapildi = durum.get("yapildi", {}).get(bugun, {})
    tol = dt.timedelta(minutes=ayar["gecikme_toleransi_dk"])
    out = []
    if icerik.plan_aktif(ayar, simdi.date()):
        for slot, s in ayar["slotlar"].items():
            if not s["aktif"]:
                continue
            bek = bekleyen_platformlar(yapildi, slot, s["platformlar"], simdi)
            if not bek:
                continue
            h, m = _saat(s["saat"])
            hedef = simdi.replace(hour=h, minute=m, second=0, microsecond=0)
            if hedef <= simdi <= hedef + tol:
                out.append((slot, "slot", dict(s, platformlar=bek)))
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
        if icerik.plan_aktif(ayar, t):
            for slot, s in ayar["slotlar"].items():
                bek = bekleyen_platformlar(yapildi, slot, s["platformlar"], simdi) if s["aktif"] else []
                if bek:
                    h, m = _saat(s["saat"])
                    z = dt.datetime.combine(t, dt.time(h, m))
                    if z >= simdi - dt.timedelta(minutes=ayar["gecikme_toleransi_dk"]):
                        out.append((z, f"{s['ad']} · Gün {icerik.gun_no(ayar, t)} · {'+'.join(p.upper() for p in bek)}"))
        if ayar["grup"]["aktif"]:
            for tr in ayar["grup"]["turlar"]:
                if tr["aktif"] and f"grup_{tr['saat']}" not in yapildi:
                    h, m = _saat(tr["saat"])
                    z = dt.datetime.combine(t, dt.time(h, m))
                    if z >= simdi:
                        out.append((z, "Grup turu (tüm açık gruplar)"))
    return sorted(out)[:adet]


def _isaretle(key, platformlar=None, durum="BASLADI"):
    """yapildi[bugün][key:platform] = 'DURUM#n zaman'. platformlar None ise (grup turu) key tek başına işaretlenir.
    HATA her seferinde sayacı artırır; BASLADI/OK/FAIL… önceki sayacı taşır."""
    bugun = dt.datetime.now().strftime("%Y-%m-%d")
    sinir = (dt.date.today() - dt.timedelta(days=14)).isoformat()

    def _fn(d):
        y = d.setdefault("yapildi", {}).setdefault(bugun, {})
        if platformlar is None:
            y[key] = _zaman()
        else:
            for p in platformlar:
                n = _sayac(y.get(f"{key}:{p}")) + (1 if durum == "HATA" else 0)
                y[f"{key}:{p}"] = f"{durum}#{n} {_zaman()}"
        for gun in [g for g in d["yapildi"] if g < sinir]:
            del d["yapildi"][gun]
        for gun in [g for g in d.get("giris_uyari", {}) if g < sinir]:
            del d["giris_uyari"][gun]
    durum_guncelle(_fn)


def giris_guncelle(ctx):
    """Oturum durumunu kontrol eder, durum.json'a yazar. -> {'fb': bool, 'ig': bool}"""
    g = tarayici.giris_kontrol(ctx)
    durum_guncelle(lambda d: d.__setitem__("giris", dict(g, zaman=_zaman())))
    return g


def _giris_yok_uyar(key, platformlar):
    """Oturumu olmayan platformları günde bir kez loglar; slot 'yapıldı' sayılmaz, giriş yapılınca tolerans içinde atılır."""
    bugun = dt.datetime.now().strftime("%Y-%m-%d")
    yeni = []

    def _fn(d):
        uyar = d.setdefault("giris_uyari", {}).setdefault(bugun, [])
        for p in platformlar:
            if f"{key}:{p}" not in uyar:
                uyar.append(f"{key}:{p}")
                yeni.append(p)
    durum_guncelle(_fn)
    for p in yeni:
        log_ekle(tip="slot", gun=icerik.gun_no(ayar_oku()), slot=key, platform=p, durum="HATA",
                 url="Oturum açık değil – Hesaplar sayfasından giriş yapın")
        yaz(f"{key} {p}: oturum yok, giriş bekleniyor")


def _vadeli_slotlari_calistir(ctx, giris=None):
    """Vadesi gelen slot işlerini çalıştırır (grup turu beklemeleri sırasında da çağrılır). -> oturum eksik mi"""
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
        # önce BASLADI işareti: paylaşım sırasında ajan çökse bile aynı gün yeniden denenmez (çift paylaşım riski);
        # slot_isi her platformun sonucunu (OK/HATA/FAIL…) bu işaretin üzerine yazar
        _isaretle(key, acik)
        gun = icerik.gun_no(ayar)
        _nabiz(is_=f"{veri['ad']} paylaşılıyor ({'+'.join(p.upper() for p in acik)})")
        try:
            slot_isi(ctx, ayar, gun, key, acik)
        except Exception as e:
            yaz(f"slot {key} hata: {e}\n{traceback.format_exc()}")
            log_ekle(tip="slot", gun=gun, slot=key, platform="-", durum="FAIL", url=str(e).splitlines()[0][:150])
    return atlandi


# ---------------------------------------------------------------- komutlar
class Komut:
    """Kuyruktan alınmış (“.isleniyor” adıyla sahiplenilmiş) panel komutu.
    bitti(): işlendi, sil. geri_birak(): işlenemedi, kuyruğa geri koy (sırası korunur)."""

    def __init__(self, yol, veri):
        self.yol, self.veri = yol, veri

    def bitti(self):
        self.yol.unlink(missing_ok=True)

    def geri_birak(self):
        try:
            os.replace(self.yol, self.yol.with_suffix(".json"))
        except OSError:
            pass


def _komutlar():
    """Bekleyen panel komutlarını sahiplenir (.json -> .isleniyor). Dosya iş bitince silinir; ajan bu arada
    çökerse yarım komut bir sonraki başlangıçta tekrarlanmaz, HATA olarak loglanır (çift paylaşım olmasın)."""
    out = []
    for p in sorted(KOMUT.glob("*.json")):
        sahip = p.with_suffix(".isleniyor")
        try:
            os.replace(p, sahip)
            k = json.loads(sahip.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            sahip.unlink(missing_ok=True)
            continue
        if not isinstance(k, dict) or not k.get("tip"):
            sahip.unlink(missing_ok=True)
        elif time.time() - _komut_zamani(p) > KOMUT_OMRU_SN:
            yaz(f"eski komut atıldı ({p.name}): {k}")
            _komut_hatasi(k, "Komut ajan kapalıyken verilmiş ve çok eskimiş; güvenlik için işlenmedi, yeniden gönderin.")
            sahip.unlink(missing_ok=True)
        else:
            out.append(Komut(sahip, k))
    return out


def _komut_zamani(p):
    try:
        return float(p.stem.split("_")[0])
    except ValueError:
        return p.stat().st_mtime


def _yarim_komutlari_temizle():
    """Önceki ajan komutu işlerken kapanmış: paylaşım yarıda kalmış olabilir, tekrarlanmaz; giriş kontrolü zararsız, yeniden sıraya girer."""
    for p in sorted(KOMUT.glob("*.isleniyor")):
        try:
            k = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            k = {}
        if isinstance(k, dict) and k.get("tip") == "giris_kontrol":
            Komut(p, k).geri_birak()
            continue
        if isinstance(k, dict) and k.get("tip"):
            yaz(f"yarım kalmış komut atıldı: {k}")
            _komut_hatasi(k, "Ajan komutu işlerken kapanmış; tekrar denenmedi (çift paylaşım olmasın). Logları kontrol edin.")
        p.unlink(missing_ok=True)


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


_komut_sira = itertools.count()


def komut_gonder(**k):
    """Panel tarafı: ajana komut bırakır (önce .tmp'ye yazılır; ajan yarım dosya okumaz)."""
    ad = f"{time.time():.3f}_{os.getpid()}_{next(_komut_sira)}"  # aynı ms'de iki komut birbirini ezmesin
    gecici = KOMUT / f"{ad}.tmp"
    gecici.write_text(json.dumps(k, ensure_ascii=False), encoding="utf-8")
    os.replace(gecici, KOMUT / f"{ad}.json")


def _komut_hatasi(k, e):
    """Tarayıcı açılamadığı için işlenemeyen panel komutu: kullanıcı Loglar'da görsün."""
    msg = str(e).splitlines()[0][:150] if str(e) else "tarayıcı açılamadı"
    if k.get("tip") == "slot":
        for p in k.get("platformlar", ["-"]):
            log_ekle(tip="slot", gun=int(k.get("gun", 0)), slot=k.get("slot", ""), platform=p, durum="HATA", url=msg)
    elif k.get("tip") == "grup_turu":
        log_ekle(tip="grup", grup="(tur başlatılamadı)", url="", segment="", varyant="", durum="HATA", notu=msg, tur=0)


def grup_turunu_durdur():
    DUR_BAYRAK.write_text("dur")


def ajani_durdur_iste():
    """Ajan döngüsüne nazikçe bitmesini söyler (süren grup turu sıradaki grupta durur)."""
    AJAN_DUR_BAYRAK.write_text("dur")


# ---------------------------------------------------------------- döngü
def pid_calisiyor(pid):
    if not pid or pid <= 0:
        return False
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
    """Tek ajan kilidi: dosya O_EXCL ile atomik oluşturulur. Sahibi yaşamıyorsa ya da nabzı kesilmişse
    (donmuş süreç) kilit sahipsiz sayılıp devralınır."""
    for _ in range(3):
        try:
            fd = os.open(KILIT, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            try:
                pid = int(KILIT.read_text().strip() or 0)
            except (OSError, ValueError):
                pid = 0
            if pid and pid != os.getpid() and pid_calisiyor(pid):
                try:
                    kilit_yasi = time.time() - KILIT.stat().st_mtime
                except OSError:
                    kilit_yasi = 0
                ajan_pid, yas = _ajan_kaydi()
                if kilit_yasi < 120 or (ajan_pid == pid and yas < 3 * NABIZ_SN):
                    return False  # yeni başlayan ya da nabzı düzgün atan bir ajan
                yaz(f"kilit sahibi {pid} ajan olarak yanıt vermiyor (nabız: {ajan_pid}/{yas}), kilit devralınıyor")
            KILIT.unlink(missing_ok=True)
            continue
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(str(os.getpid()))
        return True
    return False


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
        print("Tarayıcı bulunamadı – panelde Hesaplar > 'Tarayıcıyı indir'")
        return 1
    if not _kilit_al():
        print("başka bir ajan kilidi tutuyor")
        return 2
    try:
        with tarayici.ac(gizli=ayar["gizli_pencere"]) as ctx:
            vadeli_isleri_calistir(ctx)
    finally:
        KILIT.unlink(missing_ok=True)
    return 0


AG_HEDEFLER = (("www.facebook.com", 443), ("www.instagram.com", 443), ("1.1.1.1", 443))


def ag_var():
    for hedef in AG_HEDEFLER:
        try:
            socket.create_connection(hedef, timeout=5).close()
            return True
        except OSError:
            continue
    return False


def ag_bekle(sn=90):
    """Uykudan uyanan PC'de Wi-Fi'nin gelmesini bekler (en fazla sn). -> internet var mı"""
    son = time.time() + sn
    while True:
        if ag_var():
            return True
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
            if ajan_bosta() and not vadesi_gelenler(ayar_oku(), durum_oku()):
                break
            time.sleep(15)
    finally:
        uyanik_tut(False)
    return 0


def bakim():
    """Günlük temizlik: eski ekran görüntüleri ve şişen ajan.log."""
    try:
        sinir = time.time() - EKRAN_GUN * 86400
        for p in SHOTS.glob("*.png"):
            if p.stat().st_mtime < sinir:
                p.unlink(missing_ok=True)
        if AJAN_LOG.exists() and AJAN_LOG.stat().st_size > AJAN_LOG_MB * 1024 * 1024:
            eski = AJAN_LOG.with_suffix(".eski.log")
            eski.unlink(missing_ok=True)
            os.replace(AJAN_LOG, eski)
    except OSError as e:
        yaz(f"bakım hatası: {e}")


def dongu():
    if not _kilit_al():
        return 2  # başka bir ajan zaten çalışıyor (15 dk'lık kontrol görevi normalde buraya düşer)
    AJAN_DUR_BAYRAK.unlink(missing_ok=True)
    yaz("ajan başladı")
    _nabiz(is_="bekliyor", baslangic=_zaman())
    _yarim_komutlari_temizle()
    bakim()
    son_bakim = time.time()
    bekleme = 20
    try:
        while not AJAN_DUR_BAYRAK.exists():
            bekleme = 20
            try:
                if time.time() - son_bakim > 86400:
                    bakim()
                    son_bakim = time.time()
                komutlar = _komutlar()
                ayar = ayar_oku()
                vadeli = vadesi_gelenler(ayar, durum_oku())
                if komutlar or vadeli:
                    if panel_mesgul():
                        for k in komutlar:
                            k.geri_birak()
                        _nabiz(is_="panel tarayıcıyı kullanıyor, bekliyor")
                        time.sleep(10)
                        continue
                    if not tarayici.tarayici_kurulu():
                        yaz("Tarayıcı bulunamadı – panelde Hesaplar > 'Tarayıcıyı indir'")
                        for k in komutlar:
                            _komut_hatasi(k.veri, "Tarayıcı bulunamadı – Hesaplar > 'Tarayıcıyı indir'")
                            k.bitti()
                        time.sleep(60)
                        continue
                    uyanik_tut(True)
                    try:
                        if not ag_bekle():
                            yaz("internet yok, 60 sn sonra yeniden denenecek")
                            for k in komutlar:
                                _komut_hatasi(k.veri, "İnternet bağlantısı yok")
                                k.bitti()
                            _nabiz(is_="internet bekleniyor")
                            time.sleep(60)
                            continue
                        _nabiz(is_="tarayıcı açılıyor")
                        try:
                            tarayici_ctx = tarayici.ac(gizli=ayar["gizli_pencere"])
                            ctx = tarayici_ctx.__enter__()
                        except tarayici.ProfilMesgul as e:
                            yaz(str(e))
                            for k in komutlar:  # panel penceresi kapanınca işlenir
                                k.geri_birak()
                            _nabiz(is_="panel tarayıcıyı kullanıyor, bekliyor")
                            time.sleep(30)
                            continue
                        except Exception as e:
                            yaz(f"tarayıcı açılamadı: {e}")
                            for k in komutlar:
                                _komut_hatasi(k.veri, e)
                                k.bitti()
                            _nabiz(is_="bekliyor")
                            time.sleep(60)
                            continue
                        try:
                            for k in komutlar:
                                try:
                                    komut_isle(ctx, k.veri)
                                except Exception as e:
                                    yaz(f"komut hatası {k.veri}: {e}\n{traceback.format_exc()}")
                                    _komut_hatasi(k.veri, e)
                                finally:
                                    k.bitti()
                            if vadeli_isleri_calistir(ctx):
                                bekleme = 300  # oturum yok: giriş bekleniyor, 5 dk'da bir yeniden dene
                        finally:
                            tarayici_ctx.__exit__(None, None, None)
                    finally:
                        uyanik_tut(False)
                _nabiz(is_="bekliyor")
            except Exception as e:
                yaz(f"döngü hatası: {e}\n{traceback.format_exc()}")
                _nabiz(is_="bekliyor")
            for i in range(max(1, bekleme // 10)):
                if AJAN_DUR_BAYRAK.exists():
                    break
                if bekleme > 20 and list(KOMUT.glob("*.json")):
                    break
                if i and i % 6 == 0:
                    _nabiz(is_="giriş bekleniyor")
                time.sleep(10)
    finally:
        yaz("ajan durdu")
        KILIT.unlink(missing_ok=True)
        AJAN_DUR_BAYRAK.unlink(missing_ok=True)
        _nabiz(is_="durdu")


if __name__ == "__main__":
    sys.exit(dongu())
