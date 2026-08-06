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
from xml.sax.saxutils import escape

import requests

from icerik import build_description, build_seo, desi_agirlik, gtip
from ticimax_excel import build_excel, pretty_name

try:
    from make_images import safe_name
except ImportError:
    safe_name = None

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

# Ticimax tarafinda olusturulacak ana kategori
ROOT_CATEGORY = "Matkap ve Freze"

# Cekilecek kaynak kategoriler: (kaynak kategori id, Ticimax kategori yolu)
# Sadelestirilmis, son kullanici odakli kategori yapisi.
# Kategori yolu ">" ile ayrilir; Ticimax içe aktarımda alt kategoriler
# otomatik olusturulur.
CATEGORIES = [
    # HSS matkap uclari (normal boy)
    (164, ROOT_CATEGORY + ">Matkap Uçları>HSS Matkap Uçları"),
    (165, ROOT_CATEGORY + ">Matkap Uçları>HSS Matkap Uçları"),
    (167, ROOT_CATEGORY + ">Matkap Uçları>HSS Matkap Uçları"),
    (266, ROOT_CATEGORY + ">Matkap Uçları>HSS Matkap Uçları"),
    # Bohrcraft punta matkaplari (265'ten once gelmeli ki dogru kategoriye dussun)
    (267, ROOT_CATEGORY + ">Punta Matkapları"),
    (269, ROOT_CATEGORY + ">Punta Matkapları"),
    (265, ROOT_CATEGORY + ">Matkap Uçları>HSS Matkap Uçları"),
    # Uzun seriler
    (166, ROOT_CATEGORY + ">Matkap Uçları>Uzun Matkap Uçları"),
    (168, ROOT_CATEGORY + ">Matkap Uçları>Uzun Matkap Uçları"),
    (169, ROOT_CATEGORY + ">Matkap Uçları>Uzun Matkap Uçları"),
    (170, ROOT_CATEGORY + ">Matkap Uçları>Uzun Matkap Uçları"),
    # Konik sapli
    (171, ROOT_CATEGORY + ">Matkap Uçları>Konik Saplı Matkap Uçları"),
    # Karbur
    (289, ROOT_CATEGORY + ">Matkap Uçları>Karbür Matkap Uçları"),
    (293, ROOT_CATEGORY + ">Matkap Uçları>Karbür Matkap Uçları"),
    (292, ROOT_CATEGORY + ">Matkap Uçları>Karbür Matkap Uçları"),
    # Punta matkaplari
    (190, ROOT_CATEGORY + ">Punta Matkapları"),
    (191, ROOT_CATEGORY + ">Punta Matkapları"),
    (192, ROOT_CATEGORY + ">Punta Matkapları"),
    (287, ROOT_CATEGORY + ">Punta Matkapları"),
    (288, ROOT_CATEGORY + ">Punta Matkapları"),
    (291, ROOT_CATEGORY + ">Punta Matkapları"),
    # Kademeli sac matkaplari
    (193, ROOT_CATEGORY + ">Kademeli Sac Matkapları"),
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


KNOWN_BRANDS = ["BOHRCRAFT", "ERİC", "ERIC", "HÜGEL", "HUGEL"]


def _brand_from_name(name: str) -> str:
    upper = name.upper()
    for b in KNOWN_BRANDS:
        if upper.endswith(b) or f" {b} " in upper:
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
                "brand": brands.get(str(a.get("brand_id") or ""), "") or _brand_from_name(a.get("name") or ""),
                "url": BASE + (a.get("path") or ""),
                "image": images.get(p["id"], ""),
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
        lines.append(f"    <Aciklama>{e(build_description(name, r['sku'], r['brand'], r['category_path'], r['image']))}</Aciklama>")
        lines.append(f"    <SeoSayfaBaslik>{e(seo_title)}</SeoSayfaBaslik>")
        lines.append(f"    <SeoAnahtarKelime>{e(seo_kw)}</SeoAnahtarKelime>")
        lines.append(f"    <SeoSayfaAciklama>{e(seo_desc)}</SeoSayfaAciklama>")
        lines.append(f"    <GtipKodu>{e(gtip(name, r['category_path']))}</GtipKodu>")
        lines.append(f"    <Desi>{desi}</Desi>")
        lines.append(f"    <KargoAgirligi>{desi}</KargoAgirligi>")
        lines.append(f"    <UrunAgirligi>{agirlik}</UrunAgirligi>")
        lines.append(f"    <Marka>{e(r['brand'])}</Marka>")
        lines.append(f"    <KategoriYolu>{e(r['category_path'])}</KategoriYolu>")
        lines.append(f"    <Kategori>{e(r['category_path'].split('>')[-1])}</Kategori>")
        lines.append(f"    <UrunUrl>{e(r['url'])}</UrunUrl>")
        lines.append("    <UrunSecenek>")
        lines.append("      <Secenek>")
        lines.append(f"        <VaryasyonID>{e(r['id'])}</VaryasyonID>")
        lines.append(f"        <StokKodu>{e(r['sku'])}</StokKodu>")
        lines.append(f"        <Barkod>{e(r['sku'])}</Barkod>")
        lines.append(f"        <StokAdedi>{int(r['stock'])}</StokAdedi>")
        lines.append(f"        <AlisFiyati>{e(r['price'])}</AlisFiyati>")
        lines.append(f"        <SatisFiyati>{e(r['price'])}</SatisFiyati>")
        lines.append(f"        <IndirimliFiyat>{e(r['price'])}</IndirimliFiyat>")
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
            if safe_name and IMAGE_BASE_URL:
                img_file = safe_name(p["sku"] or "") + ".jpg"
                if (IMAGE_DIR / img_file).exists():
                    p["image"] = IMAGE_BASE_URL + img_file
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
                    "Fiyat", "Para Birimi", "Fiyat (TL)", "KDV %", "Gorsel", "Urun Linki"])
        for r in rows:
            w.writerow([r["sku"], pretty_name(r["name"] or ""), r["brand"], r["category_path"], int(r["stock"]),
                        r["price"], r["currency"], r["price_try"], r["vat_rate"], r["image"], r["url"]])

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
