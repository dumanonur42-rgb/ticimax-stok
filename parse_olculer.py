#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tedarikci katalogundan (PDF) cikartilan urun olculerini olculer.json'a yazar.

Kaynak: Talha Teknik katalogu. Sadece olcu bilgileri alinir, fiyat alinmaz.
Kullanim: python3 parse_olculer.py <pdf_yolu>
"""

import json
import re
import sys
from pathlib import Path

import pdfplumber

HERE = Path(__file__).resolve().parent
OUT = HERE / "olculer.json"

# DIN 333 A punta matkabi standart tablosu: kod eki -> (uc capi, govde capi, boy)
DIN333A = {
    "100": (3.15, 31.5), "125": (3.15, 31.5), "160": (4.0, 35.5),
    "200": (5.0, 40.0), "250": (6.3, 45.0), "315": (8.0, 50.0),
    "400": (10.0, 56.0), "500": (12.5, 63.0), "630": (16.0, 71.0),
    "800": (20.0, 80.0), "1000": (25.0, 100.0),
}

NUM = r"(\d+(?:[.,]\d+)?)"


def main(pdf_path):
    pdf = pdfplumber.open(pdf_path)
    pages = {}
    for i in [86, 87, 88, 89, 90, 91, 92, 103, 104, 133, 140, 141, 142]:
        pages[i] = pdf.pages[i - 1].extract_text() or ""
    data = {}

    # --- Iki sutunlu HSS matkap tablolari (DIN338, DIN340, DIN1869):
    # KOD D L l PAKET FIYAT  (satirda 1 veya 2 kayit)
    pat = re.compile(
        r"([0-9]?T(?:GT)?[A-Z0-9]*\d{3,}[A-Z]{0,2})\s+" + NUM +
        r"\s+(\d+)\s+(\d+)\s+\d+\s+\d+[.,]\d+")
    for pg in (86, 87, 88, 89, 90, 91):
        for m in pat.finditer(pages[pg]):
            sku, d, L, l = m.groups()
            data[sku] = {"boy": int(L), "helis": int(l)}

    # --- DIN345 konik sapli: KOD d L L1 MK FIYAT
    pat345 = re.compile(r"(T345\d+)\s+" + NUM + r"\s+(\d+)\s+(\d+)\s+(\d)\s+\d+[.,]\d+")
    for m in pat345.finditer(pages[92]):
        sku, d, L, L1, mk = m.groups()
        data[sku] = {"boy": int(L), "helis": int(L1), "mk": int(mk)}

    # --- T333A / 1600 (DIN 333A punta): standart tablo
    for sku_pref, page in (("T333A", 103), ("16000300", 133)):
        for suf, (govde, L) in DIN333A.items():
            if sku_pref == "T333A":
                data[f"T333A{suf}"] = {"govde": govde, "boy": L}
            else:
                data[f"1600 03{suf.zfill(5)}"] = {"govde": govde, "boy": L}

    # --- T333U uzun punta: KOD d D L FIYAT
    patU = re.compile(r"(T333U\d+)\s+" + NUM + r"\s+" + NUM + r"\s+(\d+)\s+\d+[.,]\d+")
    for m in patU.finditer(pages[103]):
        sku, d, govde, L = m.groups()
        data[sku] = {"govde": float(govde.replace(",", ".")), "boy": int(L)}

    # --- TCO333A cobalt punta: KOD d GOVDE FIYAT (govde DIN tablosundan boy ile)
    patCO = re.compile(r"(TCO333A\d+)\s+" + NUM + r"\s+" + NUM)
    for m in patCO.finditer(pages[104]):
        sku = m.group(1)
        suf = sku.replace("TCO333A", "")
        if suf in DIN333A:
            govde, L = DIN333A[suf]
            data[sku] = {"govde": govde, "boy": L}

    # --- Kademeli sac matkaplari (sayfa 104)
    patK = re.compile(r"(T417\d+)\s+[\d,]+-\d+\s*mm\s*x\s*\d+\s*mm\s+(\d+)\s+(\d+)\s+([\d\-]+)")
    for m in patK.finditer(pages[104].replace("\n", " ")):
        sku, L, sap, kadem = m.groups()
        data[sku] = {"boy": int(L), "sap": int(sap), "kademeler": kadem}

    # --- 1801 punta curutme: KOD d L FIYAT
    pat1801 = re.compile(r"(1801 03 \d+)\s+(\d+)\s+(\d+)\s+\d+[.,]\d+")
    for m in pat1801.finditer(pages[133]):
        sku = m.group(1).replace("1801 03 ", "1801 03")
        data[sku] = {"boy": int(m.group(3))}

    # --- TNC karbur NC punta: KOD d sap L1 L2 derece FIYAT
    patNC = re.compile(r"(TNC\d+)\s+" + NUM + r"\s+" + NUM + r"\s+(\d+)\s+(\d+)\s+(\d+)°")
    for m in patNC.finditer(pages[140]):
        sku, d, sap, L1, L2, der = m.groups()
        data[sku] = {"sap": float(sap.replace(",", ".")), "boy": int(L1),
                     "helis": int(L2), "derece": int(der)}

    # --- TK333 karbur punta: KOD d sap L1 L2
    patTKP = re.compile(r"(TK333\d+)\s+" + NUM + r"\s+" + NUM + r"\s+(\d+)\s+" + NUM)
    for m in patTKP.finditer(pages[140]):
        sku, d, sap, L1, L2 = m.groups()
        data[sku] = {"sap": float(sap.replace(",", ".")), "boy": int(L1),
                     "helis": float(L2.replace(",", "."))}

    # --- Karbur matkaplar TK4D / TK338: KOD olcu kesme_boyu tam_boy saft FIYAT
    patC = re.compile(r"(TK(?:4D|338)\d+)\s+" + NUM + r"\s+(\d+)\s+(\d+)\s+" + NUM +
                      r"\s+\d+[.,]\d+")
    for pg in (141, 142):
        for m in patC.finditer(pages[pg]):
            sku, d, kesme, boy, sap = m.groups()
            data[sku] = {"boy": int(boy), "helis": int(kesme),
                         "sap": float(sap.replace(",", "."))}

    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print(f"{len(data)} urun olcusu yazildi -> {OUT}")


if __name__ == "__main__":
    main(sys.argv[1])
