#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Urun aciklamasi, SEO metinleri, GTIP ve desi uretimi.

Her urun icin benzersiz icerik uretir: cumle varyantlari stok kodundan
turetilen deterministik bir indisle secilir, teknik degerler (cap, DIN
standardi, kaplama, malzeme) urun adindan ayiklanir.
"""

import hashlib
import re

# GTIP: 8207.50 delmeye mahsus aletler (metal isleme)
GTIP_HSS = "8207.50.60.00.00"      # is goren kismi yuksek hiz celigi (HSS)
GTIP_KARBUR = "8207.50.50.00.00"   # is goren kismi sermet/karbur


def _pick(variants, key, salt=""):
    h = int(hashlib.md5((key + salt).encode()).hexdigest(), 16)
    return variants[h % len(variants)]


def parse_specs(name: str, category_path: str):
    up = (name or "").upper()
    s = {}
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*[Xx\-]\s*(\d+(?:[.,]\d+)?)\s*MM", up)
    if m:
        s["cap"] = m.group(1).replace(".", ",")
        s["cap2"] = m.group(2).replace(".", ",")
    else:
        m = re.search(r"(\d+(?:[.,]\d+)?)\s*MM", up)
        if m:
            s["cap"] = m.group(1).replace(".", ",")
    m = re.search(r"D[İI]N\s*-?\s*(\d+)", up) or re.search(r"(1869)-(\d)", up)
    if m:
        s["din"] = "DIN " + m.group(1) + (("-" + m.group(2)) if m.lastindex and m.lastindex > 1 else "")
    if "KARBÜR" in up or "CARBIDE" in up:
        s["malzeme"] = "karbür"
    elif "HSS-E" in up or "HSSE" in up or "CO5" in up or "COBALT" in up or "ALTIN SERİ" in up:
        s["malzeme"] = "HSS-E kobalt alaşımlı"
    elif "HSS" in up:
        s["malzeme"] = "HSS (yüksek hız çeliği)"
    if "TİN" in up.split() or "TIN KAPLI" in up or " TIN " in f" {up} " or "ALTIN" in up:
        s["kaplama"] = "TiN (titanyum nitrür) kaplama"
    if "FULLY GROUND" in up or "TAŞLANMIŞ" in up:
        s["islem"] = "komple taşlanmış (fully ground)"
    cat = category_path or ""
    if "Kademeli" in cat:
        s["tip"] = "kademeli"
    elif "Punta" in cat:
        s["tip"] = "punta"
    elif "Konik" in cat:
        s["tip"] = "konik"
    elif "Uzun" in cat:
        s["tip"] = "uzun"
    else:
        s["tip"] = "matkap"
    return s


def gtip(name: str, category_path: str) -> str:
    up = (name or "").upper() + " " + (category_path or "").upper()
    return GTIP_KARBUR if "KARBÜR" in up or "CARBIDE" in up else GTIP_HSS


def desi_agirlik(name: str, category_path: str):
    """(desi, tahmini agirlik kg) dondurur."""
    s = parse_specs(name, category_path)
    try:
        cap = float((s.get("cap") or "5").replace(",", "."))
    except ValueError:
        cap = 5.0
    if s["tip"] == "kademeli":
        return 2, 0.45
    if s["tip"] == "konik":
        return 3 if cap >= 20 else 2, round(0.15 + cap * 0.035, 2)
    if s["tip"] == "uzun":
        return 2 if cap >= 10 else 1, round(0.03 + cap * 0.02, 2)
    if s["tip"] == "punta":
        return 1, round(0.02 + cap * 0.01, 2)
    # standart matkap ucu
    if cap >= 14:
        return 2, round(0.05 + cap * 0.02, 2)
    return 1, round(0.01 + cap * 0.012, 2)


_KULLANIM = {
    "kademeli": "sac, panel, profil ve ince metal levhalarda tek uçla farklı çaplarda temiz delikler açar; elektrik, havalandırma ve karoseri işlerinde vazgeçilmezdir",
    "punta": "torna ve CNC tezgahlarında delik öncesi hassas merkezleme yapar, matkap ucunun kaymasını önleyerek delik hassasiyetini artırır",
    "konik": "sütunlu matkap ve torna tezgahlarında Mors konik kovana doğrudan takılır, büyük çaplı deliklerde yüksek tork aktarımı sağlar",
    "uzun": "standart uçların yetişmediği derin deliklerde ve ulaşılması zor noktalarda güvenle çalışır",
    "matkap": "çelik, alaşımlı çelik, döküm, alüminyum ve sert plastiklerde hassas ve temiz delikler açar",
}

_GIRIS = [
    "{marka} kalitesiyle üretilen bu {tip_adi}, {kullanim}.",
    "Atölye ve sanayi kullanımı için tasarlanan {marka} {tip_adi}, {kullanim}.",
    "{marka} imzalı bu {tip_adi} ile {kullanim}.",
    "Profesyonellerin tercihi {marka} {tip_adi}, {kullanim}.",
]

_KAPANIS = [
    "Uzun ömürlü kesici kenarları sayesinde bileme ihtiyacını azaltır, işçilik maliyetlerinizi düşürür.",
    "Isıl işlem görmüş gövdesi yüksek devirlerde dahi form bozulmasına karşı direnç gösterir.",
    "Hassas helis geometrisi talaş tahliyesini hızlandırır, delme süresini kısaltır.",
    "Dengeli sertlik ve tokluk oranı ile kırılmaya karşı yüksek dayanım sunar.",
    "Seri üretim koşullarında dahi ölçü tutarlılığından ödün vermez.",
]


def _tip_adi(s):
    return {
        "kademeli": "kademeli sac matkabı",
        "punta": "punta matkabı",
        "konik": "konik saplı matkap ucu",
        "uzun": "uzun seri matkap ucu",
        "matkap": "matkap ucu",
    }[s["tip"]]


def build_description(name, sku, brand, category_path):
    s = parse_specs(name, category_path)
    marka = brand or "YAMANSA"
    tip_adi = _tip_adi(s)
    giris = _pick(_GIRIS, sku, "g").format(
        marka=marka, tip_adi=tip_adi, kullanim=_KULLANIM[s["tip"]])
    ozellikler = []
    if s.get("cap"):
        if s.get("cap2"):
            ozellikler.append(f"Çap aralığı: {s['cap']} - {s['cap2']} mm")
        else:
            ozellikler.append(f"Çap: {s['cap']} mm")
    if s.get("din"):
        ozellikler.append(f"Standart: {s['din']}")
    if s.get("malzeme"):
        ozellikler.append(f"Malzeme: {s['malzeme']}")
    if s.get("kaplama"):
        ozellikler.append(f"Kaplama: {s['kaplama']}")
    if s.get("islem"):
        ozellikler.append(f"İşlem: {s['islem']}")
    ozellikler.append(f"Marka: {marka}")
    ozellikler.append(f"Stok kodu: {sku}")
    kapanis = _pick(_KAPANIS, sku, "k")
    li = "".join(f"<li>{o}</li>" for o in ozellikler)
    return (f"<h2>{name}</h2><p>{giris}</p>"
            f"<h3>Teknik Özellikler</h3><ul>{li}</ul>"
            f"<p>{kapanis}</p>")


def build_onyazi(name, sku, brand, category_path):
    """Urun karti ustunde gorunen tablo bicimli on yazi."""
    s = parse_specs(name, category_path)
    tip = _tip_adi(s).title()
    cols = [("Ürün Kodu", sku), ("Ürün Tipi", tip)]
    if s.get("cap"):
        cols.append(("Çap", f"{s['cap']} - {s['cap2']} mm" if s.get("cap2") else f"{s['cap']} mm"))
    if s.get("din"):
        cols.append(("Standart", s["din"]))
    malzeme = ""
    if s.get("malzeme"):
        malzeme = "Karbür" if s["malzeme"] == "karbür" else s["malzeme"].split(" ")[0].upper()
    if s.get("kaplama"):
        malzeme = (malzeme + " / TiN Kaplı") if malzeme else "TiN Kaplı"
    if malzeme:
        cols.append(("Malzeme", malzeme))
    cols.append(("Marka", brand or "YAMANSA"))
    th = ('style="border:1px solid #e0e0e0;padding:8px 12px;text-align:center;'
          'font-weight:bold;background:#fff;"')
    td = 'style="border:1px solid #e0e0e0;padding:8px 12px;text-align:center;"'
    heads = "".join(f"<th {th}>{k}</th>" for k, _ in cols)
    vals = "".join(f"<td {td}>{v}</td>" for _, v in cols)
    return (
        '<table style="width:100%;border-collapse:collapse;font-family:inherit;'
        'font-size:14px;margin-bottom:10px;">'
        f"<tr>{heads}</tr><tr>{vals}</tr></table>"
    )


_SEO_DESC = [
    "{name} en uygun fiyatla YAMANSA'da. {ek} Stoktan aynı gün kargo.",
    "{name} stokta! {ek} Hızlı kargo ve orijinal ürün garantisiyle sipariş verin.",
    "{ek} {name} uygun fiyat ve güvenli alışveriş imkanıyla YAMANSA'da.",
    "{name} - {ek} Kapıda teslimat seçeneği ve stoktan hızlı gönderim.",
]


def build_seo(name, sku, brand, category_path):
    s = parse_specs(name, category_path)
    tip_adi = _tip_adi(s)
    title = f"{name} | {sku}"
    if len(title) > 65:
        title = name[:65]
    kws = []
    if s.get("cap"):
        cap_txt = f"{s['cap']}-{s['cap2']}" if s.get("cap2") else s["cap"]
        kws.append(f"{cap_txt} mm {tip_adi}")
    kws.append(tip_adi)
    if s.get("din"):
        kws.append(f"{s['din']} {tip_adi}")
    if s.get("malzeme"):
        kws.append(f"{s['malzeme'].split(' ')[0].lower()} {tip_adi}")
    if brand:
        kws.append(f"{brand.lower()} {tip_adi}")
    kws.append(f"{tip_adi} fiyatları")
    keywords = ", ".join(dict.fromkeys(kws))
    ek_parcalar = []
    if s.get("malzeme"):
        ek_parcalar.append(s["malzeme"].split(" ")[0])
    if s.get("din"):
        ek_parcalar.append(s["din"])
    if s.get("kaplama"):
        ek_parcalar.append("TiN kaplı")
    ek = " ".join(ek_parcalar)
    ek = (ek + " " + tip_adi + ".").capitalize() if ek else (tip_adi.capitalize() + ".")
    desc = _pick(_SEO_DESC, sku, "s").format(name=name, ek=ek)
    if len(desc) > 160:
        desc = desc[:157] + "..."
    return title, keywords, desc
