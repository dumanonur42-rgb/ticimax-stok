#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Urun aciklamasi, SEO metinleri, GTIP ve desi uretimi.

Her urun icin benzersiz icerik uretir: cumle varyantlari stok kodundan
turetilen deterministik bir indisle secilir, teknik degerler (cap, DIN
standardi, kaplama, malzeme) urun adindan ayiklanir.
"""

import hashlib
import json
import re
from pathlib import Path

try:
    OLCULER = json.load(open(Path(__file__).resolve().parent / "olculer.json"))
except OSError:
    OLCULER = {}


def _fmt(v):
    return ("%g" % v).replace(".", ",") if isinstance(v, float) else str(v)


def olcu_ozellikleri(sku):
    """Katalogdan alinan olculeri (etiket, deger) listesi olarak dondurur."""
    o = OLCULER.get(sku or "")
    if not o:
        return []
    out = []
    if o.get("boy"):
        out.append(("Toplam Boy", f"{_fmt(o['boy'])} mm"))
    if o.get("helis"):
        out.append(("Helis (Kesme) Boyu", f"{_fmt(o['helis'])} mm"))
    if o.get("sap"):
        out.append(("Şaft Çapı", f"{_fmt(o['sap'])} mm"))
    if o.get("govde"):
        out.append(("Gövde Çapı", f"{_fmt(o['govde'])} mm"))
    if o.get("mk"):
        out.append(("Mors Konik", f"MK{o['mk']}"))
    if o.get("derece"):
        out.append(("Uç Açısı", f"{o['derece']}°"))
    if o.get("kademeler"):
        out.append(("Kademeler", f"{o['kademeler']} mm"))
    if o.get("dalma"):
        out.append(("Dalma Boyu", f"{_fmt(o['dalma'])} mm"))
    if o.get("kanal"):
        out.append(("Kanal Genişliği", f"{_fmt(o['kanal'])} mm"))
    if o.get("radus"):
        out.append(("Köşe Radüsü", f"{_fmt(o['radus'])} mm"))
    if o.get("dis"):
        out.append(("Ağız (Diş) Sayısı", str(o["dis"])))
    return out

# GTIP: 8207.50 delmeye mahsus aletler (metal isleme)
GTIP_HSS = "8207.50.60.00.00"      # is goren kismi yuksek hiz celigi (HSS)
GTIP_KARBUR = "8207.50.50.00.00"   # is goren kismi sermet/karbur
# GTIP: 8207.70 frezelemeye mahsus aletler
GTIP_FREZE_HSS = "8207.70.35.00.00"     # sapli frezeler (HSS)
GTIP_FREZE_KARBUR = "8207.70.10.00.00"  # is goren kismi sermet/karbur

_FREZE_TIPLER = {
    "HSS Parmak Frezeler": "parmak",
    "Karbür Parmak Frezeler": "karbur_parmak",
    "Mikro Karbür Frezeler": "mikro",
    "Alüminyum Frezeler": "alu",
    "Kalıpçı Frezeler": "kalipci",
    "Havşa Frezeleri": "havsa",
    "T Kanal Frezeleri": "tkanal",
    "Köşe Yuvarlama Frezeleri": "kose",
    "Kırlangıç Frezeler": "kirlangic",
    "Diş Frezeleri": "dis_freze",
    "Pah Kırma Frezeleri": "pah",
}


def _pick(variants, key, salt=""):
    h = int(hashlib.md5((key + salt).encode()).hexdigest(), 16)
    return variants[h % len(variants)]


def parse_specs(name: str, category_path: str):
    up = (name or "").upper()
    s = {}
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*[Xx\-*]\s*(\d+(?:[.,]\d+)?)\s*MM", up)
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
    elif "HSS-E" in up or "HSSE" in up or "CO5" in up or "COBALT" in up or "ALTIN SERİ" in up or "ALTIN SERI" in up:
        s["malzeme"] = "HSS-E kobalt alaşımlı"
    elif "HSS" in up:
        s["malzeme"] = "HSS (yüksek hız çeliği)"
    if "TİN" in up.split() or "TIN KAPLI" in up or " TIN " in f" {up} " or "ALTIN" in up:
        s["kaplama"] = "TiN (titanyum nitrür) kaplama"
    if "TIALN" in up or "TİALN" in up:
        s["kaplama"] = "TiAlN (titanyum alüminyum nitrür) kaplama"
    m = re.search(r"(\d{2})\s*HRC", up)
    if m:
        s["hrc"] = m.group(1)
    m = re.search(r"\bM(\d+)\b", up)
    if m:
        s["m_olcu"] = "M" + m.group(1)
    m = re.search(r"R(\d+(?:[.,]\d+)?)\b", up)
    if m and "HRC" not in up[max(0, m.start()-3):m.start()]:
        s["radus_ad"] = m.group(1).replace(".", ",")
    m = re.search(r"BOY[: ]\s*(\d+)", up)
    if m:
        s["boy_ad"] = m.group(1)
    cat = category_path or ""
    for ad, tip in _FREZE_TIPLER.items():
        if ad in cat:
            s["tip"] = tip
            if not s.get("malzeme") and tip in ("karbur_parmak", "mikro", "kalipci", "dis_freze", "pah"):
                s["malzeme"] = "karbür"
            if tip == "tkanal":
                # T frezelerde "45,5*10MM" cap x kanal genisligidir, aralik degil
                s.pop("cap2", None)
            return s
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
    karbur = "KARBÜR" in up or "CARBIDE" in up
    if ">FREZELER>" in (category_path or ""):
        return GTIP_FREZE_KARBUR if karbur else GTIP_FREZE_HSS
    return GTIP_KARBUR if karbur else GTIP_HSS


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
    if s["tip"] in _FREZE_TIP_ADLARI:
        if cap >= 20:
            return 2, round(0.1 + cap * 0.03, 2)
        return 1, round(0.02 + cap * 0.02, 2)
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
    "parmak": "freze ve CNC tezgahlarında kanal açma, yüzey frezeleme ve cep boşaltma işlemlerinde kullanılır",
    "karbur_parmak": "CNC işleme merkezlerinde sertleştirilmiş çelik dahil zorlu malzemelerde yüksek hızda kanal, cep ve profil frezeler",
    "mikro": "hassas kalıp, elektrot ve ince detay işlemede mikro ölçekli kanal ve cep frezeleme yapar",
    "alu": "alüminyum ve demir dışı metallerde yüksek talaş tahliyesiyle yapışma yapmadan hızlı frezeleme sağlar",
    "kalipci": "kalıp boşluklarında form verme, radüs ve detay işlemede el breyzi ve tezgahlarda kullanılır",
    "havsa": "delik ağızlarında havşa açarak vida başlarının yüzeyle aynı hizada oturmasını sağlar ve çapak alır",
    "tkanal": "tezgah tablalarında ve bağlantı elemanı yuvalarında T biçimli kanallar açar",
    "kose": "iş parçası kenarlarına belirli yarıçapta yuvarlatma (radüs) formu verir",
    "kirlangic": "kızak ve bağlantı yüzeylerinde açılı kırlangıç kuyruğu kanalları açar",
    "dis_freze": "CNC tezgahlarda frezeleme yöntemiyle iç diş açar; kılavuz kırılma riskini ortadan kaldırır",
    "pah": "kenar kırma, pah açma ve çapak alma işlemlerini tek operasyonda hassas biçimde yapar",
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
    "Hassas helis geometrisi talaş tahliyesini hızlandırır, işleme süresini kısaltır.",
    "Dengeli sertlik ve tokluk oranı ile kırılmaya karşı yüksek dayanım sunar.",
    "Seri üretim koşullarında dahi ölçü tutarlılığından ödün vermez.",
]


_FREZE_TIP_ADLARI = {
    "parmak": "HSS parmak freze",
    "karbur_parmak": "karbür parmak freze",
    "mikro": "mikro karbür freze",
    "alu": "alüminyum frezesi",
    "kalipci": "karbür kalıpçı freze",
    "havsa": "havşa freze",
    "tkanal": "T kanal frezesi",
    "kose": "köşe yuvarlama frezesi",
    "kirlangic": "kırlangıç freze",
    "dis_freze": "karbür diş frezesi",
    "pah": "pah kırma frezesi",
}


def _tip_adi(s):
    return {
        "kademeli": "kademeli sac matkabı",
        "punta": "punta matkabı",
        "konik": "konik saplı matkap ucu",
        "uzun": "uzun seri matkap ucu",
        "matkap": "matkap ucu",
        **_FREZE_TIP_ADLARI,
    }[s["tip"]]


_ALANLAR = {
    "kademeli": ["Elektrik pano ve tesisat işleri", "Havalandırma kanalı ve sac montajı",
                 "Otomotiv karoseri tamiri", "Reklam tabelası ve profil işleri",
                 "İnce sac ve alüminyum levha delme"],
    "punta": ["Torna tezgahlarında merkezleme deliği açma", "CNC işleme merkezlerinde delik öncesi puntalama",
              "Hassas ölçüm ve markalama işleri", "Mil ve şaft uçlarına punta yuvası açma"],
    "konik": ["Sütunlu matkap tezgahlarında büyük çaplı delik delme", "Torna gövdesinde Mors konik kovanla kullanım",
              "Çelik konstrüksiyon ve makine imalatı", "Kalıp ve aparat üretimi"],
    "uzun": ["Derin delik delme uygulamaları", "Kalıp ve enjeksiyon soğutma kanalları",
             "Ulaşılması zor bölgelerde delme", "Ahşap ve metal karkas montaj işleri"],
    "matkap": ["Metal atölyesi ve tornacılıkta genel delme", "Makine imalatı ve bakım-onarım",
               "Çelik konstrüksiyon montajı", "Hobi ve profesyonel atölye kullanımı"],
    "parmak": ["Üniversal freze tezgahında kanal açma", "Yüzey ve kenar frezeleme",
               "Kalıp ve aparat imalatı", "Genel talaşlı imalat işleri"],
    "karbur_parmak": ["CNC işleme merkezlerinde kanal ve cep frezeleme", "Sertleştirilmiş çelik işleme",
                      "Kalıp imalatı ve finiş operasyonları", "Yüksek hızlı seri üretim"],
    "mikro": ["Hassas kalıp ve elektrot işleme", "Medikal ve elektronik parça üretimi",
              "İnce detay ve gravür frezeleme", "Mikro kanal ve cep açma"],
    "alu": ["Alüminyum profil ve plaka işleme", "Havacılık ve otomotiv parçaları",
            "Demir dışı metallerin frezelenmesi", "Reklam ve CNC router uygulamaları"],
    "kalipci": ["Kalıp boşluğu form işleme", "El breyzi ile taşlama-frezeleme",
                "Radüs ve kavis verme", "Çelik yüzeylerde detay düzeltme"],
    "havsa": ["Vida başı havşası açma", "Delik ağzı çapak alma",
              "Makine montaj delikleri hazırlama", "Sac ve profil işlerinde havşalama"],
    "tkanal": ["Tezgah tablası T kanalı açma", "Bağlantı ve sabitleme kanalları",
               "Kızak yuvası işleme", "Aparat ve fikstür imalatı"],
    "kose": ["Kenar yuvarlatma (radüs) işleme", "Kalıp kenarı form verme",
             "Görsel ve fonksiyonel kenar bitirme", "Makine parçası kenar yumuşatma"],
    "kirlangic": ["Kırlangıç kuyruğu kızak açma", "Torna ve tezgah kızak yüzeyleri",
                  "Açılı bağlantı kanalları", "Hassas kayıt yüzeyleri işleme"],
    "dis_freze": ["CNC tezgahta iç diş frezeleme", "Sert malzemelerde diş açma",
                  "Kör deliklerde emniyetli diş işleme", "Büyük çaplı dişlerin frezelenmesi"],
    "pah": ["Kenar pah kırma", "Delik ağzı çapak alma",
            "Kaynak ağzı hazırlama", "Görsel kenar bitirme işlemleri"],
}

_MALZEME_UYUM = {
    "karbür": "Sertleştirilmiş çelik (HRC 45-55), paslanmaz çelik, dökme demir, titanyum alaşımları ve aşındırıcı malzemelerde üstün performans gösterir.",
    "hsse": "Paslanmaz çelik, asitli çelikler, ısıya dayanıklı alaşımlar ve zorlu malzemelerde standart HSS'e göre belirgin biçimde daha uzun ömür sunar.",
    "hss": "Yapı çeliği, alaşımsız ve düşük alaşımlı çelikler, dökme demir, pirinç, bakır, alüminyum ve sert plastiklerde güvenle kullanılır.",
}

_NEDEN = [
    "{marka} ürünleri, sanayi standartlarına uygun üretim ve sıkı kalite kontrol süreçlerinden geçer. {sku} stok kodlu bu ürün, orijinal ve faturalı olarak YAMANSA güvencesiyle gönderilir.",
    "Doğru {tip_adi} seçimi; delik kalitesini, takım ömrünü ve işçilik süresini doğrudan etkiler. {marka} kalitesindeki bu ürün, hem hobi kullanıcısının hem profesyonel atölyelerin beklentisini karşılar.",
    "{sku} stok kodlu {marka} {tip_adi}, yüksek talaş tahliye kapasitesi ve ölçü hassasiyeti ile uzun vadede takım maliyetinizi düşürür. YAMANSA stoklarından hızlı ve güvenli teslimat.",
    "Endüstriyel kesici takımlarda marka ve malzeme kalitesi belirleyicidir. {marka} imzalı bu {tip_adi}, ölçü kararlılığı ve dayanımı ile tekrarlı işlerde güvenilir sonuç verir.",
]

_SSS_KULLANIM = [
    ("Hangi devirde kullanılmalı?",
     "Delinecek malzemeye ve çapa göre devir seçilmelidir: çap büyüdükçe devir düşürülür, sert malzemelerde düşük devir ve bol soğutma sıvısı önerilir."),
    ("Soğutma sıvısı gerekli mi?",
     "Metal delme işlemlerinde bor yağı veya kesme sıvısı kullanmak takım ömrünü belirgin şekilde uzatır ve delik yüzey kalitesini artırır."),
    ("Nasıl daha uzun ömürlü kullanılır?",
     "Sabit ilerleme, doğru devir ve titreşimsiz bağlama takım ömrünü uzatır; körelme başladığında ucu bilemek kesme performansını geri kazandırır."),
]


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
    if s.get("hrc"):
        ozellikler.append(f"İşlenebilir Sertlik: {s['hrc']} HRC'ye kadar")
    if s.get("m_olcu") and s["tip"] in ("dis_freze", "havsa"):
        ozellikler.append(f"Diş/Cıvata Ölçüsü: {s['m_olcu']}")
    for etiket, deger in olcu_ozellikleri(sku):
        ozellikler.append(f"{etiket}: {deger}")
    ozellikler.append(f"Marka: {marka}")
    ozellikler.append(f"Stok kodu: {sku}")
    kapanis = _pick(_KAPANIS, sku, "k")
    li = "".join(f"<li>{o}</li>" for o in ozellikler)

    cap_txt = ""
    if s.get("cap"):
        cap_txt = (f"{s['cap']}-{s['cap2']} mm" if s.get("cap2") else f"{s['cap']} mm")
    baslik_alan = f"{cap_txt} {tip_adi}".strip().capitalize()

    # Kullanim alanlari: urune gore deterministik siralanmis liste
    alanlar = list(_ALANLAR[s["tip"]])
    rot = int(hashlib.md5((sku + "a").encode()).hexdigest(), 16) % len(alanlar)
    alanlar = alanlar[rot:] + alanlar[:rot]
    alan_li = "".join(f"<li>{a}</li>" for a in alanlar)

    # Malzeme uyumu
    malz = s.get("malzeme", "")
    if "karbür" in malz:
        uyum = _MALZEME_UYUM["karbür"]
    elif "HSS-E" in malz:
        uyum = _MALZEME_UYUM["hsse"]
    else:
        uyum = _MALZEME_UYUM["hss"]
    din_txt = f" {s['din']} normuna uygun üretilmiştir." if s.get("din") else ""

    neden = _pick(_NEDEN, sku, "n").format(marka=marka, sku=sku, tip_adi=tip_adi)
    soru, cevap = _pick(_SSS_KULLANIM, sku, "q")

    return (f"<h2>{name}</h2><p>{giris}</p>"
            f"<h3>Teknik Özellikler</h3><ul>{li}</ul>"
            f"<h3>Kullanım Alanları</h3><ul>{alan_li}</ul>"
            f"<h3>Hangi Malzemelerde Kullanılır?</h3><p>{uyum}{din_txt}</p>"
            f"<h3>Neden {marka} {baslik_alan}?</h3><p>{neden} {kapanis}</p>"
            f"<h3>Sık Sorulan Soru</h3><p><strong>{soru}</strong> {cevap}</p>")


def teknik_detaylar(name, sku, brand, category_path):
    """Ticimax teknik detay/filtre alanlari icin (ozellik, deger) listesi."""
    s = parse_specs(name, category_path)
    out = []
    if s.get("cap"):
        out.append(("Çap", f"{s['cap']}-{s['cap2']} mm" if s.get("cap2") else f"{s['cap']} mm"))
    if s.get("malzeme"):
        malz = ("Karbür" if s["malzeme"] == "karbür"
                else ("HSS-E Kobalt" if "HSS-E" in s["malzeme"] else "HSS"))
        out.append(("Malzeme", malz))
    out.append(("Kaplama", "TiN Kaplı" if s.get("kaplama") else "Kaplamasız"))
    if s.get("din"):
        out.append(("Standart", s["din"]))
    if s.get("islem"):
        out.append(("İşlem", "Fully Ground (Taşlanmış)"))
    if s.get("hrc"):
        out.append(("Sertlik Sınıfı", f"{s['hrc']} HRC"))
    if s.get("m_olcu") and s["tip"] in ("dis_freze", "havsa"):
        out.append(("Diş/Cıvata Ölçüsü", s["m_olcu"]))
    olculer = olcu_ozellikleri(sku)
    for etiket, deger in olculer:
        out.append((etiket, deger))
    etiketler = {e for e, _ in olculer}
    if s.get("boy_ad") and "Toplam Boy" not in etiketler:
        out.append(("Toplam Boy", f"{s['boy_ad']} mm"))
    if s.get("radus_ad") and "Köşe Radüsü" not in etiketler and s["tip"] in ("karbur_parmak", "mikro", "kose"):
        out.append(("Köşe Radüsü", f"{s['radus_ad']} mm"))
    return out


def build_onyazi(name, sku, brand, category_path):
    """Urun karti ustunde gorunen tablo bicimli on yazi."""
    s = parse_specs(name, category_path)
    cols = []
    if s.get("cap"):
        cols.append(("Çap", f"{s['cap']}-{s['cap2']} mm" if s.get("cap2") else f"{s['cap']} mm"))
    malzeme = ""
    if s.get("malzeme"):
        malzeme = "Karbür" if s["malzeme"] == "karbür" else s["malzeme"].split(" ")[0].upper()
    if s.get("kaplama"):
        malzeme = (malzeme + " / TiN Kaplı") if malzeme else "TiN Kaplı"
    if malzeme:
        cols.append(("Malzeme", malzeme))
    for etiket, deger in olcu_ozellikleri(sku):
        if etiket in ("Toplam Boy", "Helis (Kesme) Boyu", "Mors Konik"):
            cols.append(("Boy" if etiket == "Toplam Boy" else
                         ("Helis Boyu" if etiket.startswith("Helis") else etiket), deger))
    cols.append(("Marka", brand or "YAMANSA"))
    hucre = ('style="flex:1 1 0;min-width:0;border:1px solid #e0e0e0;'
             'padding:5px 3px;text-align:center;overflow:hidden;"')
    etiket = ('style="font-weight:bold;font-size:11px;margin-bottom:3px;'
              'white-space:nowrap;"')
    deger_s = 'style="font-size:12px;"'
    kutular = "".join(
        f'<div {hucre}><div {etiket}>{k}</div><div {deger_s}>{v}</div></div>'
        for k, v in cols)
    return (
        '<div style="display:flex;flex-wrap:nowrap;gap:4px;width:100%;'
        'max-width:100%;font-family:inherit;margin-bottom:10px;'
        'box-sizing:border-box;">'
        f"{kutular}</div>"
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
