#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Talha Teknik B2B -> Ticimax uyumlu urun/stok senkronizasyonu.

- talhateknik.diaeticaret.com/b2b sitesine bayi hesabiyla giris yapar
- Secili MATKAP kategorilerindeki tum urunleri ceker (isim, stok kodu, stok
  adedi, fiyat, para birimi, gorsel)
- Ticimax'in XML entegrasyonunun okuyabilecegi formatta cikti uretir:
    output/ticimax_urunler.xml   (Ticimax XML urun aktarimi icin)
    output/urunler.csv           (Excel ile acilabilir kontrol listesi)
    output/stok_degisimleri.csv  (bir onceki calismaya gore degisen stoklar)

Kullanim:
    TALHA_B2B_USER=... TALHA_B2B_PASS=... python3 sync.py
veya ayni klasordeki .env dosyasina yazin:
    TALHA_B2B_USER=info@ornek.com.tr
    TALHA_B2B_PASS=xxxxx
"""

import csv
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import quote
from xml.sax.saxutils import escape

import requests

from icerik import (build_description, build_etiketler, build_onyazi,
                    build_seo, desi_agirlik, gtip, teknik_detaylar)
from ticimax_excel import build_excel, pretty_name

try:
    from make_images import image_filename
except ImportError:
    image_filename = None

BASE = "https://talhateknik.diaeticaret.com"
HERE = Path(__file__).resolve().parent
OUT = HERE / "output"
STATE_FILE = HERE / "state.json"

# YAMANSA sablonlu gorsellerin yayinlandigi adres (bos birakilirsa
# kaynak sitedeki orijinal gorsel linkleri kullanilir)
IMAGE_BASE_URL = os.environ.get(
    "IMAGE_BASE_URL",
    "https://raw.githubusercontent.com/dumanonur42-rgb/ticimax-stok/main/gorseller/",
)
IMAGE_DIR = HERE / "gorseller"
# Gorsel adresi surum eki: degistirilirse Ticimax gorselleri yeniden indirir
IMAGE_VERSION = "?v=2"

# Ticimax tarafinda olusturulacak ana kategori
ROOT_CATEGORY = "MATKAP VE FREZE"
OLCU_ROOT = "ÖLÇÜ ALETLERİ"

# Cekilecek kaynak kategoriler: (kaynak kategori id, Ticimax kategori yolu)
# Sadelestirilmis, son kullanici odakli kategori yapisi.
# Kategori yolu ">" ile ayrilir; Ticimax içe aktarımda alt kategoriler
# otomatik olusturulur.
CATEGORIES = [
    # HSS matkap uclari (normal boy)
    (164, ROOT_CATEGORY + ">MATKAP UÇLARI>HSS Matkap Uçları"),
    (165, ROOT_CATEGORY + ">MATKAP UÇLARI>HSS Matkap Uçları"),
    (167, ROOT_CATEGORY + ">MATKAP UÇLARI>HSS Matkap Uçları"),
    (266, ROOT_CATEGORY + ">MATKAP UÇLARI>HSS Matkap Uçları"),
    # Bohrcraft punta matkaplari (265'ten once gelmeli ki dogru kategoriye dussun)
    (267, ROOT_CATEGORY + ">MATKAP UÇLARI>Punta Matkapları"),
    (269, ROOT_CATEGORY + ">MATKAP UÇLARI>Punta Matkapları"),
    (265, ROOT_CATEGORY + ">MATKAP UÇLARI>HSS Matkap Uçları"),
    # Uzun seriler
    (166, ROOT_CATEGORY + ">MATKAP UÇLARI>Uzun Matkap Uçları"),
    (168, ROOT_CATEGORY + ">MATKAP UÇLARI>Uzun Matkap Uçları"),
    (169, ROOT_CATEGORY + ">MATKAP UÇLARI>Uzun Matkap Uçları"),
    (170, ROOT_CATEGORY + ">MATKAP UÇLARI>Uzun Matkap Uçları"),
    # Konik sapli
    (171, ROOT_CATEGORY + ">MATKAP UÇLARI>Konik Saplı Matkap Uçları"),
    # Karbur
    (289, ROOT_CATEGORY + ">MATKAP UÇLARI>Karbür Matkap Uçları"),
    (293, ROOT_CATEGORY + ">MATKAP UÇLARI>Karbür Matkap Uçları"),
    (292, ROOT_CATEGORY + ">MATKAP UÇLARI>Karbür Matkap Uçları"),
    # Punta matkaplari
    (190, ROOT_CATEGORY + ">MATKAP UÇLARI>Punta Matkapları"),
    (191, ROOT_CATEGORY + ">MATKAP UÇLARI>Punta Matkapları"),
    (192, ROOT_CATEGORY + ">MATKAP UÇLARI>Punta Matkapları"),
    (287, ROOT_CATEGORY + ">MATKAP UÇLARI>Punta Matkapları"),
    (288, ROOT_CATEGORY + ">MATKAP UÇLARI>Punta Matkapları"),
    (291, ROOT_CATEGORY + ">MATKAP UÇLARI>Punta Matkapları"),
    # Kademeli sac matkaplari
    (193, ROOT_CATEGORY + ">MATKAP UÇLARI>Kademeli Sac Matkapları"),
    # --- FREZELER ---
    # HSS parmak frezeler (normal, uzun, kabatalas)
    (172, ROOT_CATEGORY + ">FREZELER>HSS Parmak Frezeler"),
    (173, ROOT_CATEGORY + ">FREZELER>HSS Parmak Frezeler"),
    (174, ROOT_CATEGORY + ">FREZELER>HSS Parmak Frezeler"),
    (175, ROOT_CATEGORY + ">FREZELER>HSS Parmak Frezeler"),
    (177, ROOT_CATEGORY + ">FREZELER>HSS Parmak Frezeler"),
    # Karbur parmak frezeler (45/55HRC duz-kure-radus, high feed)
    (300, ROOT_CATEGORY + ">FREZELER>Karbür Parmak Frezeler"),
    (301, ROOT_CATEGORY + ">FREZELER>Karbür Parmak Frezeler"),
    (302, ROOT_CATEGORY + ">FREZELER>Karbür Parmak Frezeler"),
    (303, ROOT_CATEGORY + ">FREZELER>Karbür Parmak Frezeler"),
    (304, ROOT_CATEGORY + ">FREZELER>Karbür Parmak Frezeler"),
    (305, ROOT_CATEGORY + ">FREZELER>Karbür Parmak Frezeler"),
    (307, ROOT_CATEGORY + ">FREZELER>Karbür Parmak Frezeler"),
    (308, ROOT_CATEGORY + ">FREZELER>Karbür Parmak Frezeler"),
    (309, ROOT_CATEGORY + ">FREZELER>Karbür Parmak Frezeler"),
    (310, ROOT_CATEGORY + ">FREZELER>Karbür Parmak Frezeler"),
    (311, ROOT_CATEGORY + ">FREZELER>Karbür Parmak Frezeler"),
    (312, ROOT_CATEGORY + ">FREZELER>Karbür Parmak Frezeler"),
    (317, ROOT_CATEGORY + ">FREZELER>Karbür Parmak Frezeler"),
    # Dalma boylu mikro karbur frezeler
    (314, ROOT_CATEGORY + ">FREZELER>Mikro Karbür Frezeler"),
    (315, ROOT_CATEGORY + ">FREZELER>Mikro Karbür Frezeler"),
    (316, ROOT_CATEGORY + ">FREZELER>Mikro Karbür Frezeler"),
    # Aluminyum karbur frezeler (1-2-3 agiz)
    (319, ROOT_CATEGORY + ">FREZELER>Alüminyum Frezeler"),
    (320, ROOT_CATEGORY + ">FREZELER>Alüminyum Frezeler"),
    (321, ROOT_CATEGORY + ">FREZELER>Alüminyum Frezeler"),
    (322, ROOT_CATEGORY + ">FREZELER>Alüminyum Frezeler"),
    (323, ROOT_CATEGORY + ">FREZELER>Alüminyum Frezeler"),
    # Karbur kalipci frezeler
    (343, ROOT_CATEGORY + ">FREZELER>Kalıpçı Frezeler"),
    # Havsa frezeleri (HSS, karbur, Bohrcraft)
    (185, ROOT_CATEGORY + ">FREZELER>Havşa Frezeleri"),
    (187, ROOT_CATEGORY + ">FREZELER>Havşa Frezeleri"),
    (188, ROOT_CATEGORY + ">FREZELER>Havşa Frezeleri"),
    (263, ROOT_CATEGORY + ">FREZELER>Havşa Frezeleri"),
    (268, ROOT_CATEGORY + ">FREZELER>Havşa Frezeleri"),
    (290, ROOT_CATEGORY + ">FREZELER>Havşa Frezeleri"),
    # T kanal frezeleri (HSS ve karbur)
    (181, ROOT_CATEGORY + ">FREZELER>T Kanal Frezeleri"),
    (297, ROOT_CATEGORY + ">FREZELER>T Kanal Frezeleri"),
    # Kose yuvarlama frezeleri
    (182, ROOT_CATEGORY + ">FREZELER>Köşe Yuvarlama Frezeleri"),
    # Kirlangic frezeler
    (184, ROOT_CATEGORY + ">FREZELER>Kırlangıç Frezeler"),
    # Karbur dis frezeleri
    (272, ROOT_CATEGORY + ">FREZELER>Diş Frezeleri"),
    (279, ROOT_CATEGORY + ">FREZELER>Diş Frezeleri"),
    # Pah kirma frezeleri
    (284, ROOT_CATEGORY + ">FREZELER>Pah Kırma Frezeleri"),
    (285, ROOT_CATEGORY + ">FREZELER>Pah Kırma Frezeleri"),
    # --- OLCU ALETLERI ---
    (348, OLCU_ROOT + ">KUMPASLAR>Mekanik Kumpaslar"),
    (349, OLCU_ROOT + ">KUMPASLAR>Dijital Kumpaslar"),
    (500, OLCU_ROOT + ">KUMPASLAR>Saatli Kumpaslar"),
    (350, OLCU_ROOT + ">KUMPASLAR>Derinlik Kumpasları"),
    (352, OLCU_ROOT + ">MİKROMETRELER>Dış Çap Mikrometreleri"),
    (354, OLCU_ROOT + ">MİKROMETRELER>Dijital Dış Çap Mikrometreleri"),
    (355, OLCU_ROOT + ">MİKROMETRELER>İç Çap Mikrometreleri"),
    (356, OLCU_ROOT + ">MİKROMETRELER>Derinlik Mikrometreleri"),
    (357, OLCU_ROOT + ">MİKROMETRELER>Delik İçi Uzatma Mikrometreleri"),
    (353, OLCU_ROOT + ">MİKROMETRELER>Mikrometre Setleri"),
    (360, OLCU_ROOT + ">KOMPARATÖRLER>Komparatör Saatleri"),
    (361, OLCU_ROOT + ">KOMPARATÖRLER>Dijital Komparatör Saatleri"),
    (362, OLCU_ROOT + ">KOMPARATÖRLER>Salgı Komparatör Saatleri"),
    (363, OLCU_ROOT + ">KOMPARATÖRLER>Kalınlık Komparatörleri"),
    (364, OLCU_ROOT + ">KOMPARATÖRLER>İç Çap Komparatörleri"),
    (365, OLCU_ROOT + ">KOMPARATÖRLER>Dış Çap Komparatörleri"),
    (367, OLCU_ROOT + ">KOMPARATÖRLER>Silindir Komparatör Takımları"),
    (368, OLCU_ROOT + ">KOMPARATÖRLER>Silindir Komparatör Takımları"),
    (370, OLCU_ROOT + ">MİHENGİRLER>Mercekli Yükseklik Mihengirleri"),
    (371, OLCU_ROOT + ">MİHENGİRLER>Saatli Yükseklik Mihengirleri"),
    (372, OLCU_ROOT + ">MİHENGİRLER>Dijital Yükseklik Mihengirleri"),
    (374, OLCU_ROOT + ">MANYETİK ÜRÜNLER>Manyetik Ayaklar"),
    (375, OLCU_ROOT + ">MANYETİK ÜRÜNLER>Manyetik Ayaklar"),
    (376, OLCU_ROOT + ">MANYETİK ÜRÜNLER>Manyetik V Yatakları"),
    (378, OLCU_ROOT + ">PROPLAR VE Z SIFIRLAMA>Proplar"),
    (379, OLCU_ROOT + ">PROPLAR VE Z SIFIRLAMA>Proplar"),
    (380, OLCU_ROOT + ">PROPLAR VE Z SIFIRLAMA>Proplar"),
    (381, OLCU_ROOT + ">PROPLAR VE Z SIFIRLAMA>Proplar"),
    (383, OLCU_ROOT + ">PROPLAR VE Z SIFIRLAMA>Z Sıfırlama Aparatları"),
    (384, OLCU_ROOT + ">PROPLAR VE Z SIFIRLAMA>Z Sıfırlama Aparatları"),
    (519, OLCU_ROOT + ">PROPLAR VE Z SIFIRLAMA>Z Sıfırlama Aparatları"),
    (520, OLCU_ROOT + ">PROPLAR VE Z SIFIRLAMA>Z Sıfırlama Aparatları"),
    (385, OLCU_ROOT + ">PROPLAR VE Z SIFIRLAMA>3D Testerler"),
    (409, OLCU_ROOT + ">MASTARLAR>Erkek Vida Mastarları"),
    (410, OLCU_ROOT + ">MASTARLAR>Erkek Vida Mastarları"),
    (411, OLCU_ROOT + ">MASTARLAR>Erkek Vida Mastarları"),
    (412, OLCU_ROOT + ">MASTARLAR>Erkek Vida Mastarları"),
    (413, OLCU_ROOT + ">MASTARLAR>Erkek Vida Mastarları"),
    (415, OLCU_ROOT + ">MASTARLAR>Dişi Vida Mastarları"),
    (416, OLCU_ROOT + ">MASTARLAR>Dişi Vida Mastarları"),
    (417, OLCU_ROOT + ">MASTARLAR>Dişi Vida Mastarları"),
    (418, OLCU_ROOT + ">MASTARLAR>Dişi Vida Mastarları"),
    (419, OLCU_ROOT + ">MASTARLAR>Dişi Vida Mastarları"),
    (387, OLCU_ROOT + ">PLEYTLER>Granit Pleytler"),
    (389, OLCU_ROOT + ">PLEYTLER>Gönye Pleytleri"),
    (398, OLCU_ROOT + ">GÖNYELER>Kıl Gönyeler"),
    (399, OLCU_ROOT + ">GÖNYELER>Şapkasız Gönyeler"),
    (403, OLCU_ROOT + ">GÖNYELER>Şapkalı Gönyeler"),
    (391, OLCU_ROOT + ">SENTİLLER>Şerit Sentiller"),
    (393, OLCU_ROOT + ">SENTİLLER>Sentil Filler Çakıları"),
    (394, OLCU_ROOT + ">DİĞER ÖLÇÜ ALETLERİ>Paralel Setler"),
    (395, OLCU_ROOT + ">MASTARLAR>Johnson Mastar Setleri"),
    (400, OLCU_ROOT + ">MASTARLAR>Radius Mastarları"),
    (396, OLCU_ROOT + ">DİĞER ÖLÇÜ ALETLERİ>Açı Ölçerler"),
    (402, OLCU_ROOT + ">DİĞER ÖLÇÜ ALETLERİ>Açı Ölçerler"),
    (405, OLCU_ROOT + ">DİĞER ÖLÇÜ ALETLERİ>Hassas Su Terazileri"),
    (406, OLCU_ROOT + ">DİĞER ÖLÇÜ ALETLERİ>Hassas Su Terazileri"),
    (501, OLCU_ROOT + ">DİĞER ÖLÇÜ ALETLERİ>Çelik Cetveller"),
    (392, OLCU_ROOT + ">MASTARLAR>Diş Tarakları"),
]


def load_env():
    envf = HERE / ".env"
    if envf.exists():
        for line in envf.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


def login(session: requests.Session, user: str, password: str):
    session.get(BASE + "/b2b", timeout=30)
    r = session.post(
        BASE + "/api/tr/v1/data/b2b_signin.json",
        json={"username": user, "password": password, "spSignedIn": False},
        timeout=30,
    )
    r.raise_for_status()
    if "jwt_access" not in session.cookies:
        raise RuntimeError("Giris basarisiz: kullanici adi veya sifre hatali olabilir. Yanit: %s" % r.text[:300])


def get_currencies(session: requests.Session):
    r = session.get(BASE + "/api/tr/v1/data/currencies.js", timeout=30)
    id_code = json.loads(re.search(r"currenciesIdCode = (\{.*?\});", r.text).group(1))
    code_rate = json.loads(re.search(r"currenciesCodeRate = (\{.*?\});", r.text).group(1))
    rates = {code: vals[0] for code, vals in code_rate.items()}
    return id_code, rates


KNOWN_BRANDS = ["BOHRCRAFT", "ERİC", "ERIC", "HÜGEL", "HUGEL", "VERTEX"]


def _brand_from_name(name: str) -> str:
    upper = name.upper()
    for b in KNOWN_BRANDS:
        if upper.endswith(b) or f" {b} " in upper or upper.startswith(b + " "):
            return "ERİC" if b == "ERIC" else ("HÜGEL" if b == "HUGEL" else b)
    return ""


def fetch_category(session: requests.Session, cat_id: int):
    """Bir kategorinin tum sayfalarindaki urunleri dondurur."""
    products = []
    page = 1
    while True:
        url = f"{BASE}/api/tr/v1/layouts/b2b/categories/{cat_id}.json"
        for attempt in range(8):
            r = session.get(url, params={"page": page}, timeout=60)
            if r.status_code == 429:
                time.sleep(30 * (attempt + 1))
                continue
            r.raise_for_status()
            break
        else:
            raise RuntimeError(f"Kategori {cat_id} sayfa {page}: istek limiti asildi (429).")
        d = r.json()
        prods = d.get("products") or {}
        data = prods.get("data") or []
        included = prods.get("included") or []
        units = {i["id"]: i["attributes"] for i in included if i["type"] == "unit"}
        images = {}
        for i in included:
            if i["type"] == "image":
                pid = i.get("relationships", {}).get("product", {}).get("data", {}).get("id")
                if pid and pid not in images:
                    images[pid] = i["attributes"].get("url")
        brands = {str(i["id"]): i["attributes"].get("name") for i in included if i["type"] == "brand"}
        for p in data:
            a = p["attributes"]
            u = units.get(p["id"], {})
            products.append({
                "id": p["id"],
                "name": a.get("name"),
                "sku": a.get("sku"),
                "vat_rate": a.get("vat_rate"),
                "stock": a.get("b2b_stock_qty") or 0,
                "in_stock": a.get("b2b_in_stock"),
                "price": u.get("b2b_price"),
                "currency_id": str(u.get("b2b_currency_id") or ""),
                "brand_id": str(a.get("brand_id") or ""),
                "brand": (brands.get(str(a.get("brand_id") or ""), "")
                          or _brand_from_name(a.get("name") or "") or "ERİC"),
                "url": BASE + (a.get("path") or ""),
                "image": images.get(p["id"], ""),
                "moq": int(u.get("moq") or 1),
            })
        pagination = d.get("pagination") or {}
        pages = pagination.get("pages") or 1
        if not data or not pagination.get("next") or page >= pages:
            break
        page = pagination["next"]
        time.sleep(2.0)
    return products


def build_xml(rows):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', "<Urunler>"]
    for r in rows:
        e = lambda s: escape(str(s if s is not None else ""))
        lines.append("  <Urun>")
        lines.append(f"    <UrunKartiID>{e(r['id'])}</UrunKartiID>")
        name = pretty_name(r["name"] or "")
        seo_title, seo_kw, seo_desc = build_seo(name, r["sku"], r["brand"], r["category_path"])
        desi, agirlik = desi_agirlik(name, r["category_path"])
        lines.append(f"    <UrunAdi>{e(name)}</UrunAdi>")
        lines.append(f"    <OnYazi>{e(build_onyazi(name, r['sku'], r['brand'], r['category_path']))}</OnYazi>")
        lines.append(f"    <Aciklama>{e(build_description(name, r['sku'], r['brand'], r['category_path']))}</Aciklama>")
        lines.append(f"    <SeoSayfaBaslik>{e(seo_title)}</SeoSayfaBaslik>")
        lines.append(f"    <SeoAnahtarKelime>{e(seo_kw)}</SeoAnahtarKelime>")
        lines.append(f"    <SeoSayfaAciklama>{e(seo_desc)}</SeoSayfaAciklama>")
        lines.append(f"    <GtipKodu>{e(gtip(name, r['category_path']))}</GtipKodu>")
        lines.append(f"    <Desi>{desi}</Desi>")
        lines.append(f"    <KargoAgirligi>{desi}</KargoAgirligi>")
        lines.append(f"    <UrunAgirligi>{agirlik}</UrunAgirligi>")
        moq = r.get("moq") or 1
        lines.append(f"    <MinSiparisAdedi>{moq}</MinSiparisAdedi>")
        lines.append(f"    <UrunAdediMinimumDeger>{moq}</UrunAdediMinimumDeger>")
        lines.append(f"    <UrunAdediVarsayilanDeger>{moq}</UrunAdediVarsayilanDeger>")
        lines.append(f"    <UrunAdediArtisKademesi>{moq}</UrunAdediArtisKademesi>")
        lines.append(f"    <UyeAlisMin>{moq}</UyeAlisMin>")
        lines.append(f"    <BayiAlisMin>{moq}</BayiAlisMin>")
        lines.append("    <TeknikDetaylar>")
        for ozellik, deger in teknik_detaylar(name, r["sku"], r["brand"], r["category_path"]):
            lines.append("      <TeknikDetay>")
            lines.append(f"        <Ozellik>{e(ozellik)}</Ozellik>")
            lines.append(f"        <Deger>{e(deger)}</Deger>")
            lines.append("      </TeknikDetay>")
        lines.append("    </TeknikDetaylar>")
        lines.append(f"    <Marka>{e(r['brand'])}</Marka>")
        lines.append(f"    <Etiketler>{e(build_etiketler(name, r['sku'], r['brand'], r['category_path']))}</Etiketler>")
        lines.append("    <Tedarikci>Talha</Tedarikci>")
        lines.append(f"    <KategoriYolu>{e(r['category_path'])}</KategoriYolu>")
        lines.append(f"    <Kategori>{e(r['category_path'].split('>')[-1])}</Kategori>")
        lines.append("    <UrunSecenek>")
        lines.append("      <Secenek>")
        lines.append(f"        <VaryasyonID>{e(r['id'])}</VaryasyonID>")
        lines.append(f"        <StokKodu>{e(r['sku'])}</StokKodu>")
        lines.append(f"        <Barkod>{e(r['sku'])}</Barkod>")
        lines.append(f"        <StokAdedi>{int(r['stock'])}</StokAdedi>")
        try:
            if float(r["price_try"]) >= 100:
                indirimli = round(float(r["price"]) * 0.80, 2)
                indirimli_try = round(float(r["price_try"]) * 0.80, 2)
            else:
                indirimli = r["price"]
                indirimli_try = r["price_try"]
        except (TypeError, ValueError):
            indirimli = r["price"]
            indirimli_try = r["price_try"]
        lines.append(f"        <SatisFiyati>{e(r['price'])}</SatisFiyati>")
        lines.append(f"        <IndirimliFiyat>{e(indirimli)}</IndirimliFiyat>")
        lines.append(f"        <IndirimliFiyatTL>{e(indirimli_try)}</IndirimliFiyatTL>")
        lines.append("        <KDVDahil>false</KDVDahil>")
        lines.append(f"        <KdvOrani>{e(r['vat_rate'])}</KdvOrani>")
        lines.append(f"        <ParaBirimi>{e(r['currency'])}</ParaBirimi>")
        lines.append(f"        <ParaBirimiKodu>{e(r['currency'])}</ParaBirimiKodu>")
        lines.append(f"        <FiyatTL>{e(r['price_try'])}</FiyatTL>")
        lines.append("      </Secenek>")
        lines.append("    </UrunSecenek>")
        lines.append("    <Resimler>")
        if r["image"]:
            lines.append(f"      <Resim>{e(r['image'])}</Resim>")
        lines.append("    </Resimler>")
        lines.append("  </Urun>")
    lines.append("</Urunler>")
    return "\n".join(lines)


def main():
    load_env()
    user = os.environ.get("TALHA_B2B_USER")
    password = os.environ.get("TALHA_B2B_PASS")
    if not user or not password:
        sys.exit("TALHA_B2B_USER ve TALHA_B2B_PASS ortam degiskenlerini ayarlayin (veya .env dosyasina yazin).")

    OUT.mkdir(exist_ok=True)
    s = requests.Session()
    s.headers["User-Agent"] = "Mozilla/5.0 (X11; Linux x86_64) TicimaxSync/1.0"

    print("Giris yapiliyor...")
    login(s, user, password)
    id_code, rates = get_currencies(s)
    print("Kur bilgisi:", rates)

    rows = []
    seen = set()
    for cat_id, cat_path in CATEGORIES:
        prods = fetch_category(s, cat_id)
        new = 0
        for p in prods:
            if p["id"] in seen:
                continue
            seen.add(p["id"])
            code = id_code.get(p["currency_id"], "TRY")
            p["currency"] = code
            try:
                p["price_try"] = round(float(p["price"]) * rates.get(code, 1.0), 2)
            except (TypeError, ValueError):
                p["price_try"] = ""
            p["category_path"] = cat_path
            p["source_image"] = p["image"]
            if image_filename and IMAGE_BASE_URL:
                img_file = image_filename(pretty_name(p["name"] or ""), p["sku"] or "")
                if (IMAGE_DIR / img_file).exists():
                    p["image"] = IMAGE_BASE_URL + quote(img_file) + IMAGE_VERSION
            rows.append(p)
            new += 1
        print(f"Kategori {cat_id}: {len(prods)} urun ({new} yeni) -> {cat_path}")

    rows.sort(key=lambda r: (r["category_path"], r["name"] or ""))
    print(f"Toplam {len(rows)} benzersiz urun cekildi.")

    # XML
    (OUT / "ticimax_urunler.xml").write_text(build_xml(rows), encoding="utf-8")

    # Ticimax ornek sablonuna uygun Excel
    build_excel(rows, OUT / "ticimax_urunler.xlsx")

    # CSV
    with open(OUT / "urunler.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Stok Kodu", "Urun Adi", "Marka", "Kategori Yolu", "Stok Adedi",
                    "Fiyat", "Para Birimi", "Fiyat (TL)", "KDV %", "Gorsel", "Kaynak Gorsel", "Urun Linki"])
        for r in rows:
            w.writerow([r["sku"], pretty_name(r["name"] or ""), r["brand"], r["category_path"], int(r["stock"]),
                        r["price"], r["currency"], r["price_try"], r["vat_rate"], r["image"],
                        r.get("source_image", ""), r["url"]])

    # Stok degisim raporu
    old = {}
    if STATE_FILE.exists():
        old = json.loads(STATE_FILE.read_text())
    changes = []
    for r in rows:
        prev = old.get(r["sku"])
        if prev is not None and int(prev) != int(r["stock"]):
            changes.append((r["sku"], r["name"], int(prev), int(r["stock"])))
    with open(OUT / "stok_degisimleri.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Tarih", "Stok Kodu", "Urun Adi", "Eski Stok", "Yeni Stok"])
        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        for sku, name, o, n in changes:
            w.writerow([now, sku, name, o, n])
    STATE_FILE.write_text(json.dumps({r["sku"]: int(r["stock"]) for r in rows}, ensure_ascii=False, indent=1))

    print(f"Degisen stok sayisi: {len(changes)}")
    print("Ciktilar:", OUT / "ticimax_urunler.xlsx", OUT / "ticimax_urunler.xml",
          OUT / "urunler.csv", OUT / "stok_degisimleri.csv")


if __name__ == "__main__":
    main()
