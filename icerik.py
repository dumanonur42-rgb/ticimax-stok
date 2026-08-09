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


def olcu_ozellikleri(sku, olcu_aleti=False):
    """Katalogdan alinan olculeri (etiket, deger) listesi olarak dondurur."""
    o = OLCULER.get((sku or "").strip())
    if not o:
        return []
    out = []
    if olcu_aleti:
        if o.get("olcum"):
            out.append(("Ölçüm Aralığı", f"{o['olcum']} mm"))
        if o.get("hassasiyet"):
            out.append(("Hassasiyet", f"{o['hassasiyet']} mm"))
        if o.get("dis_olcu"):
            out.append(("Diş Ölçüsü", str(o["dis_olcu"])))
        if o.get("hatve"):
            out.append(("Hatve (Adım)", f"{_fmt(o['hatve'])}"))
        if o.get("cene"):
            out.append(("Çene Boyu", f"{_fmt(o['cene'])} mm"))
        if o.get("cap"):
            out.append(("Uç Çapı", f"Ø{_fmt(o['cap'])} mm"))
        if o.get("boy"):
            out.append(("Boy", f"{_fmt(o['boy'])} mm"))
        if o.get("en"):
            out.append(("En", f"{_fmt(o['en'])} mm"))
        if o.get("yukseklik"):
            out.append(("Yükseklik", f"{_fmt(o['yukseklik'])} mm"))
        if o.get("kalinlik"):
            out.append(("Kalınlık", f"{_fmt(o['kalinlik'])} mm"))
        if o.get("aci"):
            out.append(("Açı Aralığı", f"{o['aci']}°"))
        if o.get("parca"):
            out.append(("Parça Sayısı", str(o["parca"])))
        if o.get("tasima"):
            out.append(("Taşıma Kapasitesi", f"{_fmt(o['tasima'])} kg"))
        if o.get("kapasite"):
            out.append(("Kapasite", f"{_fmt(o['kapasite'])} kg"))
        if o.get("agirlik"):
            out.append(("Ağırlık", f"{_fmt(o['agirlik'])} kg"))
        return out
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
# GTIP: olcu aletleri
GTIP_OLCU_KUMPAS = "9017.30.10.00.00"   # mikrometreler ve kumpaslar
GTIP_OLCU_MASTAR = "9017.30.90.00.00"   # mastarlar (vida, sentil, johnson)
GTIP_OLCU_CIZIM = "9017.20.90.00.00"    # gonye, cetvel, aci olcer, pleyt
GTIP_OLCU_DIGER = "9031.80.80.00.00"    # komparator, mihengir, prop, tester

_OLCU_GTIP = {
    GTIP_OLCU_KUMPAS: {
        "kumpas_mekanik", "kumpas_dijital", "kumpas_saatli", "kumpas_derinlik",
        "mikrometre", "mikrometre_dijital", "mikrometre_ic",
        "mikrometre_derinlik", "mikrometre_uzatma", "mikrometre_set",
    },
    GTIP_OLCU_MASTAR: {
        "mastar_erkek", "mastar_disi", "sentil", "sentil_caki", "johnson_set",
        "radius_mastar", "paralel_set", "dis_taragi",
    },
    GTIP_OLCU_CIZIM: {
        "gonye_kil", "gonye_duz", "gonye_sapkali", "cetvel", "aci_olcer",
        "pleyt_granit", "pleyt_gonye",
    },
}

# Olcu aletleri: kategori yaprak adi -> tip kodu
_OLCU_TIPLER = {
    "Mekanik Kumpaslar": "kumpas_mekanik",
    "Dijital Kumpaslar": "kumpas_dijital",
    "Saatli Kumpaslar": "kumpas_saatli",
    "Derinlik Kumpasları": "kumpas_derinlik",
    "Dış Çap Mikrometreleri": "mikrometre",
    "Dijital Dış Çap Mikrometreleri": "mikrometre_dijital",
    "İç Çap Mikrometreleri": "mikrometre_ic",
    "Derinlik Mikrometreleri": "mikrometre_derinlik",
    "Delik İçi Uzatma Mikrometreleri": "mikrometre_uzatma",
    "Mikrometre Setleri": "mikrometre_set",
    "Komparatör Saatleri": "komparator",
    "Dijital Komparatör Saatleri": "komparator_dijital",
    "Salgı Komparatör Saatleri": "komparator_salgi",
    "Kalınlık Komparatörleri": "komparator_kalinlik",
    "İç Çap Komparatörleri": "komparator_ic",
    "Dış Çap Komparatörleri": "komparator_dis",
    "Silindir Komparatör Takımları": "silindir_komparator",
    "Mercekli Yükseklik Mihengirleri": "mihengir",
    "Saatli Yükseklik Mihengirleri": "mihengir_saatli",
    "Dijital Yükseklik Mihengirleri": "mihengir_dijital",
    "Manyetik Ayaklar": "manyetik_ayak",
    "Manyetik V Yatakları": "manyetik_v",
    "Proplar": "prop",
    "Z Sıfırlama Aparatları": "z_sifirlama",
    "3D Testerler": "tester3d",
    "Erkek Vida Mastarları": "mastar_erkek",
    "Dişi Vida Mastarları": "mastar_disi",
    "Granit Pleytler": "pleyt_granit",
    "Gönye Pleytleri": "pleyt_gonye",
    "Kıl Gönyeler": "gonye_kil",
    "Şapkasız Gönyeler": "gonye_duz",
    "Şapkalı Gönyeler": "gonye_sapkali",
    "Şerit Sentiller": "sentil",
    "Sentil Filler Çakıları": "sentil_caki",
    "Paralel Setler": "paralel_set",
    "Johnson Mastar Setleri": "johnson_set",
    "Radius Mastarları": "radius_mastar",
    "Açı Ölçerler": "aci_olcer",
    "Hassas Su Terazileri": "su_terazisi",
    "Çelik Cetveller": "cetvel",
    "Diş Tarakları": "dis_taragi",
}

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


def _parse_olcu_specs(up: str, cat: str):
    """Olcu aletlerinde urun adindan olcum araligi, hassasiyet vb. cikarir."""
    s = {"olcu_aleti": True, "tip": "olcu"}
    for ad, tip in _OLCU_TIPLER.items():
        if cat.endswith(ad):
            s["tip"] = tip
            break
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*MM", up)
    if m:
        s["olcum_ad"] = f"{m.group(1)}-{m.group(2)} mm"
    else:
        m = re.search(r"(\d+(?:[.,]\d+)?)\s*MM", up)
        if m:
            s["olcum_ad"] = f"{m.group(1)} mm"
    m = re.search(r"\b0[.,](\d{1,3})\b", up)
    if m:
        s["hassasiyet_ad"] = "0," + m.group(1)
    m = re.search(r"\b(M\d+(?:[.,]\d+)?|UNF ?\d+/\d+|UNC ?\d+/\d+|G ?\d+/\d+)\b", up)
    if m:
        s["dis_ad"] = m.group(1).replace(" ", "")
    if "DİJİTAL" in up:
        s["gosterge"] = "Dijital"
    elif "SAATLİ" in up or "MERCEKLİ" in up:
        s["gosterge"] = "Saatli/Mekanik"
    elif "MEKANİK" in up or "MONOBLOK" in up:
        s["gosterge"] = "Mekanik (verniyeli)"
    if "IP67" in up:
        s["koruma"] = "IP67"
    elif "IP54" in up:
        s["koruma"] = "IP54"
    if "PASLANMAZ" in up:
        s["gövde"] = "Paslanmaz çelik"
    elif "GRANİT" in up:
        s["gövde"] = "Granit"
    elif "METAL KASA" in up:
        s["gövde"] = "Metal kasa"
    if "DIN" in up:
        m = re.search(r"D[İI]N\s*-?\s*(\d+(?:/\d+)?)", up)
        if m:
            s["din"] = "DIN " + m.group(1)
    if s["tip"] in ("gonye_kil", "gonye_duz", "gonye_sapkali"):
        s["din"] = s.get("din") or "DIN 875/1"
    if s["tip"] == "pleyt_granit":
        s["din"] = s.get("din") or "DIN 876/1"
    return s


def parse_specs(name: str, category_path: str):
    up = (name or "").upper()
    s = {}
    cat0 = category_path or ""
    if cat0.startswith("ÖLÇÜ ALETLERİ"):
        return _parse_olcu_specs(up, cat0)
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
    cat = category_path or ""
    if cat.startswith("ÖLÇÜ ALETLERİ"):
        tip = _parse_olcu_specs((name or "").upper(), cat)["tip"]
        for kod, tipler in _OLCU_GTIP.items():
            if tip in tipler:
                return kod
        return GTIP_OLCU_DIGER
    up = (name or "").upper() + " " + cat.upper()
    karbur = "KARBÜR" in up or "CARBIDE" in up
    if ">FREZELER>" in cat:
        return GTIP_FREZE_KARBUR if karbur else GTIP_FREZE_HSS
    return GTIP_KARBUR if karbur else GTIP_HSS


def desi_agirlik(name: str, category_path: str):
    """(desi, tahmini agirlik kg) dondurur."""
    s = parse_specs(name, category_path)
    try:
        cap = float((s.get("cap") or "5").replace(",", "."))
    except ValueError:
        cap = 5.0
    if s.get("olcu_aleti"):
        if s["tip"] in ("pleyt_granit", "pleyt_gonye"):
            return 12, 15.0
        if s["tip"] in ("mihengir", "mihengir_saatli", "mihengir_dijital",
                        "manyetik_v", "silindir_komparator", "johnson_set",
                        "mikrometre_set"):
            return 3, 2.0
        if s["tip"] in ("kumpas_mekanik", "kumpas_dijital", "kumpas_saatli",
                        "kumpas_derinlik", "mikrometre", "mikrometre_dijital",
                        "mikrometre_ic", "mikrometre_derinlik",
                        "mikrometre_uzatma", "aci_olcer", "cetvel",
                        "gonye_sapkali", "gonye_duz", "gonye_kil",
                        "su_terazisi", "manyetik_ayak", "paralel_set"):
            return 2, 0.6
        return 1, 0.3
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


_OLCU_TIP_ADLARI = {
    "olcu": "ölçü aleti",
    "kumpas_mekanik": "mekanik kumpas",
    "kumpas_dijital": "dijital kumpas",
    "kumpas_saatli": "saatli kumpas",
    "kumpas_derinlik": "derinlik kumpası",
    "mikrometre": "dış çap mikrometresi",
    "mikrometre_dijital": "dijital dış çap mikrometresi",
    "mikrometre_ic": "iç çap mikrometresi",
    "mikrometre_derinlik": "derinlik mikrometresi",
    "mikrometre_uzatma": "delik içi uzatma mikrometresi",
    "mikrometre_set": "mikrometre seti",
    "komparator": "komparatör saati",
    "komparator_dijital": "dijital komparatör saati",
    "komparator_salgi": "salgı komparatör saati",
    "komparator_kalinlik": "kalınlık komparatörü",
    "komparator_ic": "iç çap komparatörü",
    "komparator_dis": "dış çap komparatörü",
    "silindir_komparator": "silindir komparatör takımı",
    "mihengir": "mercekli yükseklik mihengiri",
    "mihengir_saatli": "saatli yükseklik mihengiri",
    "mihengir_dijital": "dijital yükseklik mihengiri",
    "manyetik_ayak": "manyetik komparatör ayağı",
    "manyetik_v": "manyetik V yatağı",
    "prop": "prop (kenar bulucu)",
    "z_sifirlama": "Z sıfırlama aparatı",
    "tester3d": "3D tester",
    "mastar_erkek": "erkek vida mastarı",
    "mastar_disi": "dişi vida mastarı",
    "pleyt_granit": "granit pleyt",
    "pleyt_gonye": "gönye pleyti",
    "gonye_kil": "kıl gönye",
    "gonye_duz": "şapkasız gönye",
    "gonye_sapkali": "şapkalı gönye",
    "sentil": "şerit sentil",
    "sentil_caki": "sentil filler çakısı",
    "paralel_set": "paralel set",
    "johnson_set": "Johnson mastar seti",
    "radius_mastar": "radius mastarı",
    "aci_olcer": "açı ölçer",
    "su_terazisi": "hassas su terazisi",
    "cetvel": "paslanmaz çelik cetvel",
    "dis_taragi": "diş tarağı",
}

_OLCU_KULLANIM = {
    "olcu": "atölye ve kalite kontrol ortamlarında hassas ölçüm yapmanızı sağlar",
    "kumpas_mekanik": "iç çap, dış çap, derinlik ve kademe ölçümlerini verniyer skalasıyla pilsiz olarak yapar",
    "kumpas_dijital": "iç çap, dış çap, derinlik ve kademe ölçümlerini dijital ekranda anında ve okuma hatasız gösterir",
    "kumpas_saatli": "kadranlı göstergesiyle titreşimli atölye ortamında hızlı ve kolay okunabilir ölçüm sağlar",
    "kumpas_derinlik": "delik, kanal ve kademe derinliklerini hassas biçimde ölçer",
    "mikrometre": "mil, levha ve parça dış ölçülerini 0,01 mm hassasiyetle ölçer",
    "mikrometre_dijital": "dış ölçüleri dijital ekranda mikron mertebesinde okur, mm/inç dönüşümü yapar",
    "mikrometre_ic": "delik ve yatak iç çaplarını hassas biçimde ölçer",
    "mikrometre_derinlik": "delik, kanal ve kademe derinliklerini mikrometre hassasiyetinde ölçer",
    "mikrometre_uzatma": "uzatma çubukları sayesinde derin deliklerin iç çapını ölçer",
    "mikrometre_set": "farklı ölçüm aralıklarındaki mikrometreleri tek kutuda sunar",
    "komparator": "iş parçasındaki sapma, düzlemsellik ve paralellik farklarını 0,01 mm hassasiyetle gösterir",
    "komparator_dijital": "sapma ölçümlerini dijital ekranda okuma hatası olmadan gösterir",
    "komparator_salgi": "mil ve tezgah tablalarında salgı (eksenden kaçıklık) ölçümü yapar",
    "komparator_kalinlik": "sac, levha, boru ve conta kalınlıklarını hızlıca ölçer",
    "komparator_ic": "silindir ve delik iç çaplarında ovallik ve konikliği tespit eder",
    "komparator_dis": "mil ve parça dış çaplarında seri ölçüm ve karşılaştırma yapar",
    "silindir_komparator": "silindir deliklerinde iç çap, ovallik ve konikliği uzatma parçalarıyla ölçer",
    "mihengir": "yükseklik ölçümü ve pleyt üzerinde hassas markalama yapar",
    "mihengir_saatli": "kadranlı göstergesiyle yükseklik ölçümü ve markalamayı kolaylaştırır",
    "mihengir_dijital": "yükseklik ölçümlerini dijital ekranda hızlı ve hatasız okur",
    "manyetik_ayak": "komparatör saatini tezgaha manyetik olarak sabitler, açılı kollarla her konuma ayarlanır",
    "manyetik_v": "silindirik parçaları manyetik olarak sabitleyerek ölçüm ve markalama sırasında kaymayı önler",
    "prop": "freze tezgahında iş parçası kenarını hassas biçimde bulur ve sıfır noktası belirler",
    "z_sifirlama": "CNC ve freze tezgahlarında takım boyu Z eksen sıfırlamasını hızlı ve tekrarlanabilir şekilde yapar",
    "tester3d": "X, Y ve Z eksenlerinde kenar, delik merkezi ve sıfır noktası tespitini tek aparatla yapar",
    "mastar_erkek": "dişi vida deliklerinin diş ölçüsünü ve toleransını hızlıca kontrol eder",
    "mastar_disi": "erkek vidaların diş ölçüsünü ve toleransını hızlıca kontrol eder",
    "pleyt_granit": "ölçüm ve markalama işlerinde ısıl genleşmesi düşük, aşınmaya dayanıklı referans yüzey sunar",
    "pleyt_gonye": "dik konumdaki ölçüm ve markalama işlerinde 90° referans yüzey sağlar",
    "gonye_kil": "dikliği ince kıl kenarıyla ışık sızdırma yöntemiyle en hassas şekilde kontrol eder",
    "gonye_duz": "montaj ve markalama işlerinde 90° kontrolü yapar",
    "gonye_sapkali": "şapkalı tabanı sayesinde iş parçasına dayanarak güvenli 90° kontrolü sağlar",
    "sentil": "boşluk, aralık ve tolerans ölçümlerinde şerit biçiminde istenen kalınlığı verir",
    "sentil_caki": "farklı kalınlıktaki yaprakları tek gövdede toplayarak boşluk ölçümünü pratikleştirir",
    "paralel_set": "mengenede iş parçasını tabandan yükselterek düzgün ve paralel bağlanmasını sağlar",
    "johnson_set": "hassas ölçüm cihazlarının kalibrasyonu ve referans ölçü oluşturmada kullanılır",
    "radius_mastar": "iç ve dış radüsleri şablon yaprakları ile hızlıca kontrol eder",
    "aci_olcer": "açı ölçümü ve açılı markalama işlerinde 0-360° aralığında çalışır",
    "su_terazisi": "tezgah tablası ve makine montajında hassas terazileme yapar",
    "cetvel": "paslanmaz çelik gövdesiyle atölyede uzun ömürlü ölçüm ve markalama sağlar",
    "dis_taragi": "metrik ve inç vida dişlerinin hatvesini şablonlarla hızlıca belirler",
}

_OLCU_ALANLAR = {
    "kalite": ["Kalite kontrol ve ölçüm laboratuvarı", "CNC ve talaşlı imalat atölyeleri",
               "Makine bakım-onarım işleri", "Kalıp ve aparat imalatı"],
    "tezgah": ["CNC işleme merkezleri", "Freze ve torna tezgahları",
               "Kalıp ve aparat imalatı", "Seri üretimde takım ayarı"],
    "markalama": ["Pleyt üzerinde markalama", "Kalite kontrol ölçümleri",
                  "Makine montajı ve ayarı", "Model ve prototip üretimi"],
    "vida": ["Vida ve cıvata diş kontrolü", "Kalite kontrol girdi muayenesi",
             "Diş açma sonrası tolerans kontrolü", "Makine imalatı ve montaj"],
}

_OLCU_ALAN_TIP = {
    "prop": "tezgah", "z_sifirlama": "tezgah", "tester3d": "tezgah",
    "manyetik_ayak": "tezgah", "manyetik_v": "markalama",
    "paralel_set": "tezgah", "su_terazisi": "tezgah",
    "mihengir": "markalama", "mihengir_saatli": "markalama",
    "mihengir_dijital": "markalama", "pleyt_granit": "markalama",
    "pleyt_gonye": "markalama", "cetvel": "markalama",
    "gonye_kil": "markalama", "gonye_duz": "markalama",
    "gonye_sapkali": "markalama", "aci_olcer": "markalama",
    "mastar_erkek": "vida", "mastar_disi": "vida", "dis_taragi": "vida",
}


def _tip_adi(s):
    if s.get("olcu_aleti"):
        return _OLCU_TIP_ADLARI.get(s["tip"], "ölçü aleti")
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


def _olcu_teknik_listesi(s, sku):
    """Olcu aletleri icin (etiket, deger) listesi: katalog + urun adi."""
    out = list(olcu_ozellikleri(sku, olcu_aleti=True))
    etiketler = {e for e, _ in out}
    if s.get("olcum_ad") and "Ölçüm Aralığı" not in etiketler:
        out.insert(0, ("Ölçüm Aralığı", s["olcum_ad"]))
    if s.get("hassasiyet_ad") and "Hassasiyet" not in etiketler:
        out.append(("Hassasiyet", f"{s['hassasiyet_ad']} mm"))
    if s.get("dis_ad") and "Diş Ölçüsü" not in etiketler:
        out.append(("Diş Ölçüsü", s["dis_ad"]))
    if s.get("gosterge"):
        out.append(("Gösterge Tipi", s["gosterge"]))
    if s.get("koruma"):
        out.append(("Koruma Sınıfı", s["koruma"]))
    if s.get("gövde"):
        out.append(("Gövde Malzemesi", s["gövde"]))
    if s.get("din"):
        out.append(("Standart", s["din"]))
    return out


_OLCU_KAPANIS = [
    "Hassas işleme ve sıkı kalite kontrol süreçleriyle üretilir, ölçüm tekrarlanabilirliği yüksektir.",
    "Düzgün taşlanmış ölçüm yüzeyleri uzun ömür ve kararlı hassasiyet sunar.",
    "Atölye koşullarına dayanıklı yapısıyla yıllarca güvenle kullanılır.",
    "Kutusunda korumalı olarak gönderilir, kullanıma hazırdır.",
]

_OLCU_NEDEN = [
    "{marka} ölçü aletleri, sanayi standartlarına uygun üretim ve sıkı kalite kontrol süreçlerinden geçer. {sku} stok kodlu bu ürün, orijinal ve faturalı olarak YAMANSA güvencesiyle gönderilir.",
    "Doğru {tip_adi} seçimi; ölçüm güvenilirliğini, ürün kalitesini ve fire oranını doğrudan etkiler. {marka} kalitesindeki bu ürün, hem hobi kullanıcısının hem profesyonel atölyelerin beklentisini karşılar.",
    "{sku} stok kodlu {marka} {tip_adi}, ölçüm kararlılığı ve dayanıklı yapısıyla uzun vadede güvenilir sonuç verir. YAMANSA stoklarından hızlı ve güvenli teslimat.",
    "Hassas ölçüm aletlerinde marka ve işçilik kalitesi belirleyicidir. {marka} imzalı bu {tip_adi}, tekrarlanabilir ölçüm ve uzun ömür sunar.",
]

_OLCU_SSS = [
    ("Nasıl korunmalı?",
     "Kullanım sonrası temiz ve kuru bir bezle silinmeli, ince yağ ile korunmalı ve kutusunda saklanmalıdır; düşme ve darbeden kaçınılmalıdır.",),
    ("Kalibrasyon gerekir mi?",
     "Hassas ölçüm aletlerinin belirli aralıklarla mastar veya referans bloklarla doğrulanması ölçüm güvenilirliğini artırır.",),
    ("Hangi ortamda kullanılmalı?",
     "Aşırı tozlu, nemli ve manyetik alanlı ortamlardan kaçınılmalı; ölçüm öncesi alet ve iş parçası aynı ortam sıcaklığında olmalıdır.",),
]


def _build_olcu_description(name, sku, brand, s):
    marka = brand or "YAMANSA"
    tip_adi = _tip_adi(s)
    kullanim = _OLCU_KULLANIM.get(s["tip"], _OLCU_KULLANIM["olcu"])
    giris = _pick(_GIRIS, sku, "g").format(marka=marka, tip_adi=tip_adi,
                                           kullanim=kullanim)
    ozellikler = [f"{e}: {d}" for e, d in _olcu_teknik_listesi(s, sku)]
    ozellikler.append(f"Marka: {marka}")
    ozellikler.append(f"Stok kodu: {sku}")
    li = "".join(f"<li>{o}</li>" for o in ozellikler)
    alan_key = _OLCU_ALAN_TIP.get(s["tip"], "kalite")
    alanlar = list(_OLCU_ALANLAR[alan_key])
    rot = int(hashlib.md5((sku + "a").encode()).hexdigest(), 16) % len(alanlar)
    alanlar = alanlar[rot:] + alanlar[:rot]
    alan_li = "".join(f"<li>{a}</li>" for a in alanlar)
    kapanis = _pick(_OLCU_KAPANIS, sku, "k")
    neden = _pick(_OLCU_NEDEN, sku, "n").format(marka=marka, sku=sku,
                                                tip_adi=tip_adi)
    soru, cevap = _pick(_OLCU_SSS, sku, "q")
    return (f"<h2>{name}</h2><p>{giris}</p>"
            f"<h3>Teknik Özellikler</h3><ul>{li}</ul>"
            f"<h3>Kullanım Alanları</h3><ul>{alan_li}</ul>"
            f"<h3>Neden {marka} {tip_adi.capitalize()}?</h3><p>{neden} {kapanis}</p>"
            f"<h3>Sık Sorulan Soru</h3><p><strong>{soru}</strong> {cevap}</p>")


def build_description(name, sku, brand, category_path):
    s = parse_specs(name, category_path)
    if s.get("olcu_aleti"):
        return _build_olcu_description(name, sku, brand, s)
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
    if s.get("olcu_aleti"):
        return _olcu_teknik_listesi(s, sku)
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
    if s.get("olcu_aleti"):
        for etiket, deger in _olcu_teknik_listesi(s, sku):
            if etiket in ("Ölçüm Aralığı", "Hassasiyet", "Diş Ölçüsü",
                          "Hatve (Adım)", "Boy") and len(cols) < 3:
                cols.append(("Ölçüm" if etiket == "Ölçüm Aralığı" else
                             ("Hatve" if etiket.startswith("Hatve") else etiket),
                             deger))
        cols.append(("Marka", brand or "YAMANSA"))
        return _onyazi_html(cols)
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
    return _onyazi_html(cols)


def _onyazi_html(cols):
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


# Elastic arama icin tip bazli es anlamli / yaygin yazim etiketleri
_ETIKET_ES = {
    "matkap": ["matkap ucu", "hss matkap ucu", "metal matkap ucu", "matkap"],
    "uzun": ["uzun matkap ucu", "derin delik matkabi", "uzun seri matkap"],
    "konik": ["konik sapli matkap", "mors konik matkap", "mk matkap ucu"],
    "punta": ["punta matkabi", "merkezleme matkabi", "center drill", "punta ucu"],
    "kademeli": ["kademeli matkap", "adim matkap", "step drill", "sac matkabi"],
    "parmak": ["parmak freze", "end mill", "endmill", "hss freze", "freze ucu"],
    "karbur_parmak": ["karbur parmak freze", "carbide freze", "end mill", "sert metal freze", "freze ucu"],
    "mikro": ["mikro freze", "mikro karbur freze", "hassas freze"],
    "alu": ["aluminyum frezesi", "alu freze", "aluminyum end mill"],
    "kalipci": ["kalipci frezesi", "kalip frezesi", "rotary freze"],
    "havsa": ["havsa frezesi", "havsa ucu", "countersink", "havsa matkabi"],
    "tkanal": ["t kanal frezesi", "t freze", "kanal frezesi"],
    "kose": ["kose yuvarlama frezesi", "radus frezesi", "corner radius"],
    "kirlangic": ["kirlangic freze", "kirlangic kuyrugu frezesi", "dovetail"],
    "dis_freze": ["dis frezesi", "dis acma frezesi", "thread mill"],
    "pah": ["pah frezesi", "pah kirma ucu", "chamfer freze"],
    "kumpas_mekanik": ["kumpas", "mekanik kumpas", "surmeli kumpas", "caliper", "verniyeli kumpas"],
    "kumpas_dijital": ["kumpas", "dijital kumpas", "digital kumpas", "elektronik kumpas", "caliper"],
    "kumpas_saatli": ["kumpas", "saatli kumpas", "ibreli kumpas", "dial caliper"],
    "kumpas_derinlik": ["derinlik kumpasi", "derinlik olcer", "depth gauge"],
    "mikrometre": ["mikrometre", "mikro metre", "dis cap mikrometresi", "micrometer"],
    "mikrometre_dijital": ["mikrometre", "dijital mikrometre", "digital mikrometre"],
    "mikrometre_ic": ["ic cap mikrometresi", "mikrometre", "delik mikrometresi"],
    "mikrometre_derinlik": ["derinlik mikrometresi", "mikrometre", "derinlik olcer"],
    "mikrometre_uzatma": ["uzatma mikrometresi", "delik ici mikrometre", "mikrometre"],
    "mikrometre_set": ["mikrometre seti", "mikrometre takimi", "mikrometre"],
    "komparator": ["komparator", "komparator saati", "olcu saati", "dial indicator", "salgi saati"],
    "komparator_dijital": ["komparator", "dijital komparator", "digital komparator saati"],
    "komparator_salgi": ["salgi komparatoru", "salgi saati", "komparator"],
    "komparator_kalinlik": ["kalinlik komparatoru", "kalinlik olcer", "komparator"],
    "komparator_ic": ["ic cap komparatoru", "komparator", "delik komparatoru"],
    "komparator_dis": ["dis cap komparatoru", "komparator"],
    "silindir_komparator": ["silindir komparatoru", "silindir takimi", "bore gauge", "komparator"],
    "mihengir": ["mihengir", "yukseklik olcer", "height gauge", "mercekli mihengir"],
    "mihengir_saatli": ["mihengir", "saatli mihengir", "yukseklik olcer"],
    "mihengir_dijital": ["mihengir", "dijital mihengir", "digital mihengir", "yukseklik olcer"],
    "manyetik_ayak": ["manyetik ayak", "komparator ayagi", "magnet ayak", "manyetik stand"],
    "manyetik_v": ["manyetik v yatagi", "v blok", "v yatak", "v-block"],
    "prop": ["prop", "kenar bulucu", "edge finder", "sifirlama probu"],
    "z_sifirlama": ["z sifirlama", "takim boyu olcer", "tool setter", "z ekseni sifirlayici"],
    "tester3d": ["3d tester", "3 boyutlu tester", "universal tester"],
    "mastar_erkek": ["erkek mastar", "vida mastari", "tampon mastar", "dis mastari", "go nogo"],
    "mastar_disi": ["disi mastar", "vida mastari", "halka mastar", "dis mastari", "go nogo"],
    "pleyt_granit": ["granit pleyt", "pleyt", "olcum pleyti", "kontrol pleyti"],
    "pleyt_gonye": ["gonye pleyti", "pleyt", "dik pleyt"],
    "gonye_kil": ["kil gonye", "gonye", "hassas gonye"],
    "gonye_duz": ["gonye", "duz gonye", "sapkasiz gonye"],
    "gonye_sapkali": ["gonye", "sapkali gonye", "tesviyeci gonyesi"],
    "sentil": ["sentil", "sentil seridi", "filler", "feeler gauge"],
    "sentil_caki": ["sentil cakisi", "sentil", "filler caki"],
    "paralel_set": ["paralel set", "paralel takim", "paralel altlik"],
    "johnson_set": ["johnson mastari", "blok mastar", "gauge block", "mastar seti"],
    "radius_mastar": ["radius mastari", "radus mastari", "radius gauge"],
    "aci_olcer": ["aci olcer", "aci gonyesi", "iletki", "universal aci olcer"],
    "su_terazisi": ["su terazisi", "hassas su terazisi", "makinist terazisi", "level"],
    "cetvel": ["celik cetvel", "cetvel", "paslanmaz cetvel", "metal cetvel"],
    "dis_taragi": ["dis taragi", "hatve taragi", "vida taragi", "pitch gauge"],
    "olcu": ["olcu aleti", "olcum aleti"],
}

_ASCII_TR = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")


def _tr_lower_ascii(t: str) -> str:
    return t.translate(_ASCII_TR).lower()


def _olcu_varyantlari(name: str):
    """Urun adindaki mm olculerinden bitisik/ayri, virgul/nokta varyantlari."""
    out = []
    for m in re.finditer(r"(\d+(?:[.,]\d+)?)\s*(?:\*\s*(\d+(?:[.,]\d+)?)\s*)?MM",
                         name.upper()):
        n = m.group(1).replace(",", ".")
        out += [f"{n}mm", f"{n} mm"]
    return out


def build_etiketler(name, sku, brand, category_path):
    """Elastic arama icin etiket listesi (virgulle ayrilmis)."""
    s = parse_specs(name, category_path)
    tip_adi = _tip_adi(s)
    tags = []
    tags += _ETIKET_ES.get(s["tip"], [])
    tags.append(tip_adi)
    tags.append(_tr_lower_ascii(tip_adi))
    olculer = _olcu_varyantlari(name or "")
    tags += olculer
    ana = _ETIKET_ES.get(s["tip"], [tip_adi])[0]
    for o in olculer[:4]:
        tags.append(f"{o} {ana}")
    if s.get("din"):
        d = s["din"]
        tags += [d.lower(), d.replace(" ", "").lower()]
    if s.get("malzeme"):
        mal = s["malzeme"].split(" ")[0]
        tags += [mal.lower(), _tr_lower_ascii(mal)]
    if s.get("dis_ad"):
        tags += [s["dis_ad"].lower(), s["dis_ad"].upper()]
    if s.get("m_olcu"):
        tags.append(s["m_olcu"].lower())
    if brand:
        tags.append(_tr_lower_ascii(brand))
    if sku:
        tags += [sku, sku.replace(" ", "")]
    kat = (category_path or "").split(">")[-1]
    if kat:
        tags += [kat.lower(), _tr_lower_ascii(kat)]
    mevcut = _tr_lower_ascii(f"{name or ''} {kat}")
    mevcut_kelimeler = set(re.split(r"[^a-z0-9.]+", mevcut))
    uniq = []
    for t in dict.fromkeys(x.strip() for x in tags if x and x.strip()):
        kelimeler = [k for k in re.split(r"[^a-z0-9.]+", _tr_lower_ascii(t)) if k]
        # Urun adinda/kategorisinde zaten gecen tek kelimelik genel
        # etiketler aramada gurultu yaratiyor, atla
        if kelimeler and all(k in mevcut_kelimeler for k in kelimeler) and t != sku:
            continue
        uniq.append(t)
    return ",".join(uniq[:30])


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
