"""İçerik katmanı: gün numarası, slot içerikleri (görsel + metinler), grup listesi ve varyantlar."""
import datetime as dt
import json

import yollar  # noqa: F401  (sys.path kurulumu)
import gunluk_metin as M
import icerik_verisi as V
from segmentler import SEGMENT, gruplar as _gruplar, segment_of
from varyantlar import HEPSI
from yollar import GONDERILER, GRUP_GORSEL, VERI

EK_GRUPLAR = VERI / "ek_gruplar.json"

SON_GUN = 60
SEGMENT_AD = {
    "beyaz": "Beyaz eşya", "bobinaj": "Bobinaj / elektrik motoru", "moto": "Motosiklet", "scooter": "Scooter / e-bisiklet",
    "traktor": "Traktör / tarım", "kompresor": "Kompresör", "rulman": "Rulman alım-satım", "sanayi": "Sanayi / iş makinesi",
    "oto": "Oto elektrik",
}


def gun_no(ayar, tarih=None):
    tarih = tarih or dt.date.today()
    g = (tarih - dt.date.fromisoformat(ayar["baslangic"])).days + 1
    if ayar.get("dongu") and g > SON_GUN:
        g = (g - 1) % SON_GUN + 1
    return g


def slot_icerik(gun, slot):
    """-> dict(img=Path, fb=str, ig=str, alt=str, link=str, baslik=str)"""
    if not 1 <= gun <= SON_GUN:
        raise ValueError(f"Gün {gun} için içerik yok (1-{SON_GUN})")
    p = V.POST_BY_GUN[gun]
    if slot == "sabah":
        d = M.sabah(gun)
        s = next(x for x in V.SABAH if x["gun"] == gun)
        d["baslik"] = s.get("baslik", "")
    elif slot == "ana":
        d = M.ana(gun)
        d["baslik"] = p["baslik"].replace("<br>", " ")
    else:
        d = M.story(gun)
        a = next(x for x in V.AKSAM if x["gun"] == gun)
        d.update(fb="", ig="", baslik=f"Anket: {a['soru']}")
    d["img"] = GONDERILER / d["img"]
    d.setdefault("link", "")
    return d


def _ek_oku():
    try:
        return json.loads(EK_GRUPLAR.read_text(encoding="utf-8"))
    except Exception:
        return []


def gruplar(ayar):
    """Paketle gelen gruplar + kullanıcının panelden eklediği gruplar (segment atanmış, açık/kapalı işaretli)."""
    kapali = set(ayar["grup"]["kapali"])
    out, gorulen = [], set()
    for g in _gruplar() + _ek_oku():
        if g["url"] in gorulen:
            continue
        gorulen.add(g["url"])
        seg = g.get("segment_zorla") or g.get("segment") or segment_of(g["name"])
        out.append(dict(g, segment=seg, acik=g["url"] not in kapali, segment_ad=SEGMENT_AD.get(seg, seg)))
    return out


def grup_ekle(url, name, segment):
    url = url.strip()
    if not url.endswith("/"):
        url += "/"
    d = [g for g in _ek_oku() if g["url"] != url]
    d.append(dict(id=url.rstrip("/").split("/")[-1], name=name.strip() or url, url=url, uye="", ozel=False,
                  paylasim=True, beklemede=False, name_ok=True, segment_zorla=segment))
    EK_GRUPLAR.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")


def grup_sil(url):
    d = [g for g in _ek_oku() if g["url"] != url]
    EK_GRUPLAR.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")


def varyant(segment, tur_no, secim="auto"):
    """-> (key, img_path, text)"""
    vi = (tur_no - 1) % 3 + 1 if secim == "auto" else int(secim)
    key = f"{segment}_v{vi}"
    if key not in HEPSI:
        key = f"{segment}_v1"
    return key, GRUP_GORSEL / f"{key}.png", HEPSI[key][1]


def segmentler():
    return list(SEGMENT)
