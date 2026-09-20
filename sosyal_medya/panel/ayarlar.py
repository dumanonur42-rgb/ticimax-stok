"""Kullanıcı ayarları (ayarlar.json), çalışma durumu (durum.json) ve paylaşım günlüğü (log.json).

Panel ve ajan ayrı süreçler olarak aynı dosyaları günceller; oku-değiştir-yaz adımları dosya kilidiyle
sıralanır (*_guncelle), yazımlar geçici dosya + os.replace ile atomiktir, önceki sürüm .bak olarak saklanır."""
import copy
import datetime as dt
import json
import os
import time
from contextlib import contextmanager

from yollar import AYAR, DURUM, LOG

VARSAYILAN = {
    "baslangic": "2026-09-15",          # Gün 1 tarihi
    "dongu": True,                       # 60 gün bitince başa dön
    "gizli_pencere": False,              # paylaşırken tarayıcıyı gizle (headless)
    "gecikme_toleransi_dk": 180,         # PC kapalıysa slot saatinden en fazla bu kadar sonra atılır
    "slotlar": {
        "sabah": {"saat": "09:00", "aktif": True, "platformlar": ["fb", "ig"], "ad": "Sabah kartı"},
        "ana":   {"saat": "12:30", "aktif": True, "platformlar": ["fb", "ig"], "ad": "Ana gönderi"},
        "story": {"saat": "18:30", "aktif": True, "platformlar": ["fb", "ig"], "ad": "Story"},
    },
    "grup": {
        "aktif": False,                  # grup turları (kullanıcı açmadan çalışmaz)
        "turlar": [{"saat": "09:30", "aktif": True}, {"saat": "20:00", "aktif": False}],
        "ara_sn": 90,                   # gruplar arası bekleme
        "gunluk_limit": 55,              # bir turda en fazla grup
        "kapali": [],                    # paylaşım yapılmayacak grup URL'leri
        "varyant": "auto",               # auto: tur no'ya göre v1/v2/v3 döner
    },
    "bildirim": {"blokta_dur": True},
}
BOS_DURUM = {"yapildi": {}, "ajan": {}, "blok": None, "grup_turu": {}, "tur_no": 0}
LOG_SINIR = 5000
KILIT_ESKI_SN = 15       # bu kadar eski kilit, çökmüş bir süreçten kalmıştır


def _yedek(p):
    return p.with_suffix(p.suffix + ".bak")


@contextmanager
def _kilitli(p, zaman_asimi=5.0):
    """Süreçler arası dosya kilidi (O_EXCL ile oluşturulan .lock). Süre dolarsa donmamak için kilitsiz devam eder."""
    kilit = p.with_suffix(p.suffix + ".lock")
    son = time.time() + zaman_asimi
    fd = None
    while fd is None:
        try:
            fd = os.open(kilit, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            try:
                if time.time() - kilit.stat().st_mtime > KILIT_ESKI_SN:
                    kilit.unlink(missing_ok=True)
                    continue
            except OSError:
                continue
            if time.time() > son:
                break
            time.sleep(0.02)
        except OSError:
            break
    try:
        yield
    finally:
        if fd is not None:
            os.close(fd)
            kilit.unlink(missing_ok=True)


def _oku(p, bos):
    """JSON dosyasını okur; bozuksa (yarım yazım, elle düzenleme) son sağlam yedeğe düşer."""
    for yol in (p, _yedek(p)):
        try:
            return json.loads(yol.read_text(encoding="utf-8"))
        except Exception:
            continue
    return copy.deepcopy(bos)


def _yaz(p, d):
    """Atomik yazım: geçici dosyaya yaz, önceki sağlam sürümü .bak olarak sakla, sonra yerine koy.
    Windows'ta başka süreç dosyayı o an okuyorsa PermissionError gelebilir; birkaç kez denenir."""
    veri = json.dumps(d, ensure_ascii=False, indent=1)
    gecici = p.with_suffix(p.suffix + f".{os.getpid()}.tmp")
    gecici.write_text(veri, encoding="utf-8")
    for deneme in range(8):
        try:
            if p.exists():
                try:
                    os.replace(p, _yedek(p))
                except OSError:
                    pass
            os.replace(gecici, p)
            return
        except PermissionError:
            time.sleep(0.05 * (deneme + 1))
    gecici.unlink(missing_ok=True)
    p.write_text(veri, encoding="utf-8")


def _guncelle(p, bos, fn):
    """Kilit altında oku -> fn(veri) -> yaz. fn yerinde değiştirir; güncel veri döner."""
    with _kilitli(p):
        d = _oku(p, bos)
        fn(d)
        _yaz(p, d)
    return d


def _birlestir(vars_, d):
    out = copy.deepcopy(vars_)
    for k, v in d.items():
        out[k] = _birlestir(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def ayar_oku():
    return _birlestir(VARSAYILAN, _oku(AYAR, {}))


def ayar_yaz(a):
    with _kilitli(AYAR):
        _yaz(AYAR, a)


def ayar_guncelle(fn):
    """Ayarların bir kısmını değiştirmek için (ajan BLOK'ta grup turlarını kapatır); panelin diğer alanları ezilmez."""
    def _fn(d):
        tam = _birlestir(VARSAYILAN, d)
        fn(tam)
        d.clear()
        d.update(tam)
    return _guncelle(AYAR, {}, _fn)


def durum_oku():
    return _birlestir(BOS_DURUM, _oku(DURUM, {}))


def durum_yaz(d):
    with _kilitli(DURUM):
        _yaz(DURUM, d)


def durum_guncelle(fn):
    """Kilitli oku-değiştir-yaz: panel ve ajan aynı anda yazsa da işaretler kaybolmaz."""
    def _fn(d):
        tam = _birlestir(BOS_DURUM, d)
        fn(tam)
        d.clear()
        d.update(tam)
    return _guncelle(DURUM, {}, _fn)


def log_oku():
    d = _oku(LOG, [])
    return d if isinstance(d, list) else []


def log_ekle(**kw):
    kayit = dict(zaman=dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), **kw)

    def _fn(d):
        d.append(kayit)
        del d[:-LOG_SINIR]
    with _kilitli(LOG):
        d = log_oku()
        _fn(d)
        _yaz(LOG, d)
    return kayit
