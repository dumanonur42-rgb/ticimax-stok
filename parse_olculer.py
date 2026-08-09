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

    data.update(parse_freze(pdf))
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print(f"{len(data)} urun olcusu yazildi -> {OUT}")


def _f(x):
    return float(str(x).replace(",", "."))


def parse_freze(pdf):
    """Freze sayfalarindaki olcu tablolarini okur (fiyatlar alinmaz)."""
    pg = {}
    for i in list(range(93, 103)) + list(range(138, 173)):
        pg[i] = pdf.pages[i - 1].extract_text() or ""
    data = {}

    # HSS parmak frezeler (93-96): KOD D L1 L SAFT
    pat = re.compile(r"(T[PK]U?844\d+)\s+" + NUM + r"\s+(\d+)\s+(\d+)\s+(\d+)")
    for i in (93, 94, 95, 96):
        for m in pat.finditer(pg[i]):
            sku, d, l1, L, saft = m.groups()
            data[sku] = {"boy": int(L), "helis": int(l1), "sap": int(saft)}

    # HSS T frezeler (99): KOD D H L d DIS
    for m in re.finditer(r"(TRF\d+)\s+" + NUM + r"\s+" + NUM + r"\s+(\d+)\s+(\d+)\s+(\d+)", pg[99]):
        sku, D, H, L, dd, dis = m.groups()
        data[sku] = {"boy": int(L), "kanal": _f(H), "sap": int(dd), "dis": int(dis)}

    # Kose yuvarlama (100): KOD R D L d DIS
    for m in re.finditer(r"(TKV\d+)\s+" + NUM + r"\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)", pg[100]):
        sku, R, D, L, dd, dis = m.groups()
        data[sku] = {"boy": int(L), "govde": int(D), "sap": int(dd), "dis": int(dis)}

    # Kirlangic (101): KOD DER° D I L d DIS
    for m in re.finditer(r"(TK(?:450|600)\d+)\s+(\d+)°\s+(\d+)\s+" + NUM + r"\s+(\d+)\s+(\d+)\s+(\d+)", pg[101]):
        sku, der, D, I, L, dd, dis = m.groups()
        data[sku] = {"boy": int(L), "helis": _f(I), "sap": int(dd), "dis": int(dis), "derece": int(der)}

    # Sabit pilotlu havsa (101): KOD Mx D d1 d2 i
    for m in re.finditer(r"(T373\d+)\s+M\d+\s+(\d+)\s+" + NUM + r"\s+" + NUM + r"\s+(\d+)", pg[101]):
        sku, D, d1, d2, i_ = m.groups()
        data[sku] = {"govde": int(D)}

    # HSS havsa frezeler (102): T335 D L d / T334 D d L
    for m in re.finditer(r"(T335\d+)\s+" + NUM + r"\s+(\d+)\s+(\d+)", pg[102]):
        sku, D, L, dd = m.groups()
        data[sku] = {"boy": int(L), "sap": int(dd)}
    for m in re.finditer(r"(T334\d+)\s+" + NUM + r"\s+(\d+)\s+(\d+)", pg[102]):
        sku, D, dd, L = m.groups()
        data[sku] = {"boy": int(L), "sap": int(dd)}

    # Karbur dis frezeleri (138): KOD Mx hatve d D L1 L
    for m in re.finditer(r"(T41[12]\d+)\s+M[\d,.\-]+\s+" + NUM + r"\s+" + NUM + r"\s+" + NUM + r"\s+" + NUM + r"\s+(\d+)", pg[138]):
        sku, hatve, dd, D, l1, L = m.groups()
        data[sku] = {"boy": int(L), "helis": _f(l1)}

    # Pah kirma (139): KOD D L2 L1 d2 DER° DIS
    for m in re.finditer(r"(TKP\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)°\s+(\d+)", pg[139]):
        sku, D, l2, l1, d2, der, dis = m.groups()
        data[sku] = {"boy": int(l1), "helis": int(l2), "sap": int(d2), "derece": int(der), "dis": int(dis)}

    # Karbur havsa freze (140): KOD D d L
    for m in re.finditer(r"(TK335\d+)\s+" + NUM + r"\s+(\d+)\s+(\d+)", pg[140]):
        sku, D, dd, L = m.groups()
        data[sku] = {"boy": int(L), "sap": int(dd)}

    # Karbur T-yarik (144): KOD D1 L2 L3 D3 L1 D2 DIS
    for m in re.finditer(r"(TKTF\d+)\s+" + NUM + r"\s+" + NUM + r"\s+(\d+)\s+" + NUM + r"\s+(\d+)\s+(\d+)\s+(\d+)", pg[144]):
        sku, D1, l2, l3, D3, l1, D2, dis = m.groups()
        data[sku] = {"boy": int(l1), "kanal": _f(l2), "sap": int(D2), "dis": int(dis)}

    # Karbur parmak frezeler 45/55HRC + radusler (145-156):
    # KOD "X mm"/"XRY mm" TAMBOY KESME SAFT
    patF = re.compile(r"([24]F[A-Z0-9]*\d)\s+[\d,.]+\s*(?:R[\d,.]+\s*)?mm\s+(\d+)\s+(\d+)\s+(\d+)")
    for i in range(145, 157):
        for m in patF.finditer(pg[i]):
            sku, L, l1, saft = m.groups()
            data[sku] = {"boy": int(L), "helis": int(l1), "sap": int(saft)}

    # Mikro frezeler (157-159): KOD D L2 L3 L1 d [R] DIS
    for i in (157, 158):
        for m in re.finditer(r"(M[İI]R?\d+)\s+" + NUM + r"\s+" + NUM + r"\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)", pg[i]):
            sku, D, l2, l3, l1, dd, dis = m.groups()
            data[sku] = {"boy": int(l1), "helis": _f(l2), "dalma": int(l3), "sap": int(dd), "dis": int(dis)}
    for m in re.finditer(r"(M[İI]R\d+)\s+" + NUM + r"\s+" + NUM + r"\s+(\d+)\s+(\d+)\s+(\d+)\s+" + NUM + r"\s+(\d+)", pg[159]):
        sku, D, l2, l3, l1, dd, R, dis = m.groups()
        data[sku] = {"boy": int(l1), "helis": _f(l2), "dalma": int(l3), "sap": int(dd), "radus": _f(R), "dis": int(dis)}

    # Aluminyum frezeler (160-162): KOD D d L(1) L2
    for i in (160, 161, 162):
        for m in re.finditer(r"((?:T3?U?AL|TUAL|TA1K)\d+)\s+" + NUM + r"\s+" + NUM + r"\s+(\d+)\s+(\d+)", pg[i]):
            sku, D, dd, L, l2 = m.groups()
            data[sku] = {"boy": int(L), "helis": int(l2), "sap": _f(dd)}

    # BOHRCRAFT DIN335 havsa frezeler: ayni DIN normundaki T335 olculeri
    for cap, t335 in (("08390", "T335083"), ("10490", "T335104"),
                      ("12490", "T335124"), ("16590", "T335165"),
                      ("20590", "T335205"), ("25090", "T335250")):
        if t335 in data:
            data[f"1700 03{cap}"] = dict(data[t335])
            data[f"1702 03{cap}"] = dict(data[t335])

    # Kalipci frezeler (171-172): KOD d1 d2 L2 L1
    for i in (171, 172):
        for m in re.finditer(r"(T[A-HLM]\d{6})\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)", pg[i]):
            sku, d1, d2, l2, l1 = m.groups()
            data[sku] = {"boy": int(l1), "helis": int(l2), "sap": int(d2)}

    return data


if __name__ == "__main__":
    main(sys.argv[1])
