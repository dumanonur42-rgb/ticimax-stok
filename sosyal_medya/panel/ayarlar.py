"""Kullanıcı ayarları (ayarlar.json) ve çalışma durumu (durum.json)."""
import copy
import datetime as dt
import json

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
        "ara_sn": 180,                   # gruplar arası bekleme
        "gunluk_limit": 55,              # bir turda en fazla grup
        "kapali": [],                    # paylaşım yapılmayacak grup URL'leri
        "varyant": "auto",               # auto: tur no'ya göre v1/v2/v3 döner
    },
    "bildirim": {"blokta_dur": True},
}


def _oku(p, bos):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return copy.deepcopy(bos)


def _yaz(p, d):
    p.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")


def _birlestir(vars_, d):
    out = copy.deepcopy(vars_)
    for k, v in d.items():
        out[k] = _birlestir(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def ayar_oku():
    return _birlestir(VARSAYILAN, _oku(AYAR, {}))


def ayar_yaz(a):
    _yaz(AYAR, a)


def durum_oku():
    return _oku(DURUM, {"yapildi": {}, "ajan": {}, "blok": None, "grup_turu": {}, "tur_no": 0})


def durum_yaz(d):
    _yaz(DURUM, d)


def log_oku():
    return _oku(LOG, [])


def log_ekle(**kw):
    d = log_oku()
    d.append(dict(zaman=dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), **kw))
    _yaz(LOG, d[-5000:])
    return d[-1]
