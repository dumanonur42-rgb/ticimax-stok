"""Ticimax 'Kargo Gönderim Toplu Barkod' çıktısını taklit eden, uydurma verili
örnek PDF üretir (gerçek müşteri bilgisi içermez). Çalıştır: python make_ornek.py"""

from pathlib import Path

import pymupdf

HERE = Path(__file__).resolve().parent
FONT = HERE.parent / "fonts" / "DejaVuSans.ttf"

ETIKETLER = [
    {
        "Gönderici Bilgileri": [
            ("Firma", ["ÖRNEK RULMAN SANAYİ VE", "DIŞ TİC LTD ŞTİ"]),
            ("Telefon", ["+905000000000"]),
            ("Adres", ["ÖRNEK OSB MAH. DENEME SK.", "NO: 1 BAŞAKŞEHİR/ İSTANBUL",
                       "Başakşehir / İstanbul"]),
        ],
        "Alıcı Bilgileri": [
            ("İsim", ["Ayşe Örnek"]),
            ("Telefon", ["905000000001"]),
            ("Adres", ["Deneme Mah. Örnek Cad. No:6 D:3", "Merkez/Nevşehir (OKUL KARŞISI)",
                       "Merkez / Nevşehir"]),
        ],
        "Kargo Bilgileri": [
            ("Kargo Firması", ["Yurtiçi Kargo"]),
            ("Ödeme Türü", ["Gönderici Ödemeli"]),
            ("Kargo Tipi", ["Gönderici Ödemeli Kargo"]),
            ("Paket Sayısı", ["1/1"]),
            ("Desi", ["2"]),
        ],
        "barkod": "61-8",
    },
    {
        "Gönderici Bilgileri": [
            ("Firma", ["ÖRNEK RULMAN SANAYİ VE", "DIŞ TİC LTD ŞTİ"]),
            ("Telefon", ["+905000000000"]),
            ("Adres", ["ÖRNEK OSB MAH. DENEME SK.", "NO: 1 BAŞAKŞEHİR/ İSTANBUL"]),
        ],
        "Alıcı Bilgileri": [
            ("İsim", ["Mehmet Deneme"]),
            ("Telefon", ["905000000002"]),
            ("Adres", ["Çiçek Sk. No:12 Kat:2 Çankaya/Ankara", "Çankaya / Ankara"]),
        ],
        "Kargo Bilgileri": [
            ("Kargo Firması", ["Aras Kargo"]),
            ("Ödeme Türü", ["Gönderici Ödemeli"]),
            ("Kargo Tipi", ["Gönderici Ödemeli Kargo"]),
            ("Paket Sayısı", ["1/2"]),
            ("Desi", ["5"]),
        ],
        "barkod": "62-1",
    },
]


def main():
    doc = pymupdf.open()
    for e in ETIKETLER:
        page = doc.new_page(width=420, height=595)
        y = 5.0
        for baslik in ("Gönderici Bilgileri", "Alıcı Bilgileri", "Kargo Bilgileri"):
            page.draw_rect(pymupdf.Rect(46, y, 374, y + 24), width=0.5)
            page.insert_text((156, y + 18), baslik, fontsize=14, fontfile=str(FONT), fontname="F0")
            y += 24
            for key, lines in e[baslik]:
                h = 10 * len(lines) + 6
                page.draw_rect(pymupdf.Rect(46, y, 155.33, y + h), width=0.5)
                page.draw_rect(pymupdf.Rect(155.33, y, 374, y + h), width=0.5)
                page.insert_text((49, y + 11), key, fontsize=10, fontfile=str(FONT), fontname="F0")
                for i, ln in enumerate(lines):
                    page.insert_text((158, y + 11 + 10 * i), ln, fontsize=10,
                                     fontfile=str(FONT), fontname="F0")
                y += h
        page.draw_rect(pymupdf.Rect(51, y + 10, 369, y + 100), fill=(0, 0, 0))
        page.insert_text((198, y + 115), e["barkod"], fontsize=12, fontfile=str(FONT), fontname="F0")
    doc.subset_fonts()
    doc.save(HERE / "ornek.pdf", garbage=3, deflate=True)


if __name__ == "__main__":
    main()
