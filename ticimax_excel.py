#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ticimax ornek urun Excel sablonuna uygun xlsx uretimi."""

import re

from openpyxl import Workbook

from icerik import build_description, build_onyazi, build_seo, desi_agirlik, gtip

COLUMNS = [
    "URUNKARTIID", "URUNID", "STOKKODU", "VARYASYONKODU", "BARKOD", "URUNADI",
    "ONYAZI", "ACIKLAMA", "PUANDEGER", "PUANYUZDE", "MARKA", "TEDARIKCI",
    "MAKSTAKSITSAYISI", "BREADCRUMBKAT", "KATEGORILER", "SATISBIRIMI",
    "VITRIN", "YENIURUN", "FIRSATURUNU", "FBSTOREGOSTER", "SEO_SAYFABASLIK",
    "SEO_ANAHTARKELIME", "SEO_SAYFAACIKLAMA", "UCRETSIZKARGO", "STOKADEDI",
    "ALISFIYATI", "SATISFIYATI", "INDIRIMLIFIYAT", "UYETIPIFIYAT1",
    "UYETIPIFIYAT2", "UYETIPIFIYAT3", "UYETIPIFIYAT4", "UYETIPIFIYAT5",
    "KDVORANI", "KDVDAHIL", "PARABIRIMI", "KUR", "KARGOAGIRLIGI",
    "KARGOAGIRLIGIYURTDISI", "URUNGENISLIK", "URUNDERINLIK", "URUNYUKSEKLIK",
    "URUNAGIRLIGI", "KARGOUCRETI", "URUNAKTIF", "VARYASYON",
    "TAHMINITESLIMSURESIGOSTER", "URUNADEDIMINIMUMDEGER",
    "URUNADEDIVARSAYILANDEGER", "URUNADEDIARTISKADEMESI", "GTIPKODU",
    "OZELALAN1", "OZELALAN2", "OZELALAN3", "OZELALAN4", "OZELALAN5",
    "VERGIISTISNAKODU", "YEMEKKARTIODEMEYASAKLILISTESI",
    "MOBILBEDENTABLOSUAKTIF", "MOBILBEDENTABLOSUICERIK",
    "PAZARYERIAKTIFLISTESI", "PAKETURUNUMU", "PAKETADEDI",
]

# Buyuk harf kalacak kisaltmalar
KEEP_UPPER = {
    "HSS", "HSSE", "HSS-E", "HSS-G", "DIN", "NC", "CNC", "GT-100", "GT100",
    "CO5", "TIN", "MM", "XD", "4XD", "8XD", "Z20", "H7", "ERİC", "ERIC",
    "BOHRCRAFT", "HÜGEL", "HUGEL",
}

_TR_LOWER = str.maketrans("ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZXQW", "abcçdefgğhıijklmnoöprsştuüvyzxqw")


def _tr_title_word(w: str) -> str:
    base = w.upper()
    if base in KEEP_UPPER or re.match(r"^(DIN|GT|Z|H)?[0-9]", base) or re.search(r"[0-9]", base):
        return w.upper()
    if re.sub(r"[^A-ZÇĞİÖŞÜ]", "", base) in KEEP_UPPER:
        return w.upper()
    lower = base.translate(_TR_LOWER)
    return base[:1] + lower[1:]


def pretty_name(name: str) -> str:
    """'10MM FULLY GROUND MATKAP UCU HSS DIN338 ERİC' -> okunabilir hale getirir."""
    name = re.sub(r"(?i)^(\d+(?:[.,]\d+)?)\s*MM", r"\1 mm", name.strip())
    words = name.split()
    out = []
    for w in words:
        if w.endswith("mm") and re.match(r"^[\d.,]+\s*mm$", w):
            out.append(w)
        else:
            out.append(_tr_title_word(w))
    return " ".join(out)


def build_excel(rows, path):
    wb = Workbook()
    ws = wb.active
    ws.title = "Worksheet"
    ws.append(COLUMNS)
    for r in rows:
        stock = int(r["stock"])
        name = pretty_name(r["name"] or "")
        cat = r["category_path"]
        price_try = r["price_try"] if r["price_try"] != "" else 0
        seo_title, seo_kw, seo_desc = build_seo(name, r["sku"], r["brand"], cat)
        desi, agirlik = desi_agirlik(name, cat)
        row = {
            "URUNKARTIID": 0,
            "URUNID": 0,
            "STOKKODU": r["sku"],
            "VARYASYONKODU": r["sku"],
            "BARKOD": r["sku"],
            "URUNADI": name,
            "ONYAZI": build_onyazi(name, r["sku"], r["brand"], cat),
            "ACIKLAMA": build_description(name, r["sku"], r["brand"], cat),
            "PUANDEGER": 0,
            "PUANYUZDE": 0,
            "MARKA": r["brand"],
            "TEDARIKCI": "Talha",
            "MAKSTAKSITSAYISI": 9,
            "BREADCRUMBKAT": cat,
            "KATEGORILER": cat,
            "SATISBIRIMI": "ADET",
            "VITRIN": 0,
            "YENIURUN": 1,
            "FIRSATURUNU": 0,
            "FBSTOREGOSTER": 0,
            "SEO_SAYFABASLIK": seo_title,
            "SEO_ANAHTARKELIME": seo_kw,
            "SEO_SAYFAACIKLAMA": seo_desc,
            "UCRETSIZKARGO": 0,
            "STOKADEDI": stock,
            "ALISFIYATI": 0,
            "SATISFIYATI": price_try,
            "INDIRIMLIFIYAT": round(price_try * 0.80, 2) if isinstance(price_try, (int, float)) else 0,
            "UYETIPIFIYAT1": 0, "UYETIPIFIYAT2": 0, "UYETIPIFIYAT3": 0,
            "UYETIPIFIYAT4": 0, "UYETIPIFIYAT5": 0,
            "KDVORANI": r["vat_rate"] if r["vat_rate"] is not None else 20,
            "KDVDAHIL": 0,
            "PARABIRIMI": "TL",
            "KUR": 1,
            "KARGOAGIRLIGI": desi, "KARGOAGIRLIGIYURTDISI": desi,
            "URUNGENISLIK": 0, "URUNDERINLIK": 0, "URUNYUKSEKLIK": 0,
            "URUNAGIRLIGI": agirlik, "KARGOUCRETI": 0,
            "URUNAKTIF": 1,
            "VARYASYON": "",
            "TAHMINITESLIMSURESIGOSTER": 0,
            "URUNADEDIMINIMUMDEGER": r.get("moq") or 1,
            "URUNADEDIVARSAYILANDEGER": r.get("moq") or 1,
            "URUNADEDIARTISKADEMESI": r.get("moq") or 1,
            "GTIPKODU": gtip(name, cat),
            "OZELALAN1": "", "OZELALAN2": "",
            "OZELALAN3": "", "OZELALAN4": "", "OZELALAN5": "",
            "VERGIISTISNAKODU": 0,
            "YEMEKKARTIODEMEYASAKLILISTESI": "",
            "MOBILBEDENTABLOSUAKTIF": 0,
            "MOBILBEDENTABLOSUICERIK": "",
            "PAZARYERIAKTIFLISTESI": "",
            "PAKETURUNUMU": 0,
            "PAKETADEDI": 1,
        }
        ws.append([row[c] for c in COLUMNS])
    wb.save(path)
