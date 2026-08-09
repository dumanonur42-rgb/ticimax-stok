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
    data.update(parse_olcu_aletleri(pdf))
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


def parse_olcu_aletleri(pdf):
    """Olcu aletleri sayfalarindaki tablolari okur (fiyatlar alinmaz)."""
    pg = {}
    for i in range(177, 198):
        pg[i] = pdf.pages[i - 1].extract_text() or ""
    data = {}
    KOD = r"(T[SB]?[A-Z0-9İ]+)"

    # Olcum araligi * hassasiyet tablolari (kumpas, mikrometre, komparator,
    # mihengir, Z sifirlama, su terazisi, aci olcer)
    pat = re.compile(
        KOD + r"\s+(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?)"
        r"\s*\*\s*(\d+[.,]\d+)(?:\s*(?:mm|MM))?(?:\s*\*\s*\d+)?"
        r"(?:\s*\(?[^)\d]{0,20}\)?)?\s+(?:(\d+)\s*mm\s+)?[\d.]*\d+[.,]\d+")
    for i in (177, 178, 179, 180, 181, 182, 183, 184, 187, 188, 193, 195):
        for m in pat.finditer(pg[i]):
            sku, aralik, hass, cene = m.groups()
            d = {"olcum": aralik.replace(" ", ""), "hassasiyet": hass}
            if cene:
                d["cene"] = int(cene)
            data[sku] = d

    # Gonyeler (194) ve mercekli gonye (193): KOD A * B mm
    for m in re.finditer(r"(T2[5678]\d+)\s+(\d+)\s*\*\s*(\d+)\s*mm\s+[\d.,]+", pg[193] + "\n" + pg[194]):
        sku, a, b = m.groups()
        data[sku] = {"en": int(a), "boy": int(b)}

    # Granit / gonye pleyti (190): KOD En Boy Yukseklik Agirlik
    for m in re.finditer(r"(T4\d{5,6})\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+[\d.,]+", pg[190]):
        sku, en, boy, yuk, kg = m.groups()
        data[sku] = {"en": int(en), "boy": int(boy), "yukseklik": int(yuk),
                     "agirlik": int(kg)}

    # Serit sentiller (191): KOD OLCU EN BOY
    for m in re.finditer(r"(TS100\d+)\s+(\d+[.,]\d+)\s+(\d+)\s+(\d+)\s+[\d.,]+", pg[191]):
        sku, olc, en, boy = m.groups()
        data[sku] = {"kalinlik": _f(olc), "en": int(en), "boy": int(boy)}
    # Celik cetveller (191): KOD BOY GENISLIK KALINLIK
    for m in re.finditer(r"(TS11\d+)\s+(\d+)\s+(\d+)\s+(\d+[.,]\d+)\s+[\d.,]+", pg[191]):
        sku, boy, en, kal = m.groups()
        data[sku] = {"boy": int(boy), "en": int(en), "kalinlik": _f(kal)}

    # Z sifirlamalar (187-188): KOD OLCU [mm] HASSASIYET
    for i in (187, 188):
        for m in re.finditer(r"(T22[A-ZİI0-9]+)\s+(\d+)\s*(?:mm)?\s+(\d+[.,]\d+)\s+[\d.,]+", pg[i]):
            sku, olc, hass = m.groups()
            data[sku] = {"olcum": olc, "hassasiyet": hass}

    # Paralel / ayarlanabilir V-yatak (185): KOD L H KAPASITE
    for m in re.finditer(r"(T21PAR\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+[\d.,]+", pg[185]):
        sku, L, H, kap = m.groups()
        data[sku] = {"boy": int(L), "yukseklik": int(H), "kapasite": int(kap)}
    for m in re.finditer(r"(T21CİF\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+", pg[185]):
        sku, L, W, H, L1 = m.groups()
        data[sku] = {"boy": int(L), "en": int(W), "yukseklik": int(H)}
    for m in re.finditer(r"(T21AYA\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+", pg[185]):
        sku, H, W, L, h = m.groups()
        data[sku] = {"boy": int(L), "en": int(W), "yukseklik": int(H)}

    # Manyetik V yatagi + proplar (186)
    for m in re.finditer(r"(T21MANV\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+[\d.,]+", pg[186]):
        sku, L, W, H, kg = m.groups()
        data[sku] = {"boy": int(L), "en": int(W), "yukseklik": int(H), "agirlik": int(kg)}
    for m in re.finditer(r"(T22ISP)\s+(\d+)\s*\*\s*(\d+)\s*mm", pg[186]):
        sku, d, L = m.groups()
        data[sku] = {"cap": int(d), "boy": int(L)}
    for m in re.finditer(r"(T22TPRA)\s+T PROP\s+(\d+)\s+", pg[186]):
        data[m.group(1)] = {"cap": int(m.group(2))}
    for sku, tasima in (("T21MAN60", 60), ("T21MANU60", 60)):
        if re.search(sku, pg[186]):
            data[sku] = {"tasima": tasima}

    # 3D tester (189): KOD HASSASIYET ACIKLAMA
    for m in re.finditer(r"(TTES\d+)\s+(\d+[.,]\d+)\s*mm\s+(\d+)\s*mm", pg[189]):
        sku, hass, boy = m.groups()
        data[sku] = {"hassasiyet": hass, "boy": int(boy)}

    # Radius mastari (192): KOD A * B * KALINLIK mm
    for m in re.finditer(r"(T23\d+)\s+(\d+(?:[.,]\d+)?)\s*\*\s*(\d+(?:[.,]\d+)?)\s*\*\s*"
                         r"(\d+[.,]\d+)\s*mm", pg[192]):
        sku, a, b, kal = m.groups()
        data[sku] = {"olcum": f"{a}-{b}", "kalinlik": _f(kal)}
    # Sentil filler cakisi (192) ve dis taragi
    for m in re.finditer(r"(T231100)\s+([\d,]+)\s*-\s*([\d,]+)\*(\d+)\s*mm", pg[192]):
        sku, a, b, boy = m.groups()
        data[sku] = {"olcum": f"{a}-{b}", "boy": int(boy)}
    for m in re.finditer(r"(T230052)\s+(\d+)\s*PARÇALI", pg[192]):
        data[m.group(1)] = {"parca": int(m.group(2))}
    # Paralel setler (192): KOD ... N CIFT
    for m in re.finditer(r"(T24\d+)\s+([\d*,]+)\s*MM\s+(\d+)\s*ÇİFT", pg[192]):
        sku, olc, cift = m.groups()
        data[sku] = {"olcum": olc, "parca": int(cift) * 2}
    # Johnson mastar / mikrometre setleri: KOD ... N PARCALI SET
    flat = re.sub(r"\s+", " ", pg[193] + " " + pg[180])
    for m in re.finditer(r"T240(\d{3})", flat):
        data["T240" + m.group(1)] = {"parca": int(m.group(1))}
    # 3D tester yedek uclari (189): KOD 0,01 mm - OcapUC
    for m in re.finditer(r"(TTES\d+)\s+[\d,]+\s*mm\s+-\s*Ø(\d+)", pg[189]):
        data[m.group(1)] = {"cap": int(m.group(2))}
    for m in re.finditer(r"(T160\d+SET) ([\d,]+)-([\d,]+)mm", flat):
        data[m.group(1)] = {"olcum": f"{m.group(2)}-{m.group(3)}"}
    # Aci olcer (193): KOD 0 - 10 * 0,01 mm 0 - 360 DERECE
    for m in re.finditer(r"(T25\d+)\s+([\d,]+ ?- ?[\d,]+)\s*\*\s*([\d,]+)\s*mm\s+"
                         r"([\d,]+ ?- ?[\d,]+)\s*DERECE", pg[193]):
        sku, olc, hass, der = m.groups()
        data[sku] = {"olcum": olc.replace(" ", ""), "hassasiyet": hass,
                     "aci": der.replace(" ", "")}

    # Mastarlar (196-197): OLCU HATVE ERKEK_KOD FIYAT DISI_KOD FIYAT
    patM = re.compile(
        r"(M[\d,]+|UNF ?[\d/ ]+|UNC ?[\d/ ]+|G ?[\d/ ]+)\s+(\d+(?:[.,]\d+)?)\s+"
        r"(T31[A-Z0-9]+)\s+[\d.,]+\s+(T33[A-Z0-9]+)\s+[\d.,]+")
    for i in (196, 197):
        for m in patM.finditer(pg[i]):
            olcu, hatve, erkek, disi = m.groups()
            d = {"dis_olcu": olcu.strip(), "hatve": hatve}
            data[erkek] = dict(d)
            data[disi] = dict(d)

    return data


if __name__ == "__main__":
    main(sys.argv[1])
