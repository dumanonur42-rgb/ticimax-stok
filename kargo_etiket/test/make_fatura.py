"""Fatura PDF okuma örnekleri üretip ayrıştırmayı doğrular."""

import sys
from pathlib import Path

import pymupdf

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import kargo_etiket as ke  # noqa: E402

FONT = HERE.parent / "fonts" / "DejaVuSans.ttf"
FONT_BOLD = HERE.parent / "fonts" / "DejaVuSans-Bold.ttf"


def put(page, x: float, y: float, text: str, bold: bool = False, size: int = 10):
    page.insert_text((x, y), text, fontname="dejavu-bold" if bold else "dejavu",
                     fontfile=str(FONT_BOLD if bold else FONT), fontsize=size)


def make_invoice(path: Path, teslimat: bool = False):
    doc = pymupdf.open()
    page = doc.new_page()
    put(page, 42, 38, "e-Arşiv Fatura", bold=True, size=16)
    put(page, 42, 63, "Örnek Satıcı San. ve Tic. Ltd. Şti.", bold=True)
    put(page, 42, 79, "İstanbul / TÜRKİYE")
    put(page, 42, 95, "Vergi Dairesi: Örnek")

    put(page, 42, 154, "SAYIN", bold=True)
    put(page, 42, 172, "Zeynep Deneme", bold=True)
    put(page, 42, 190, "Örnek Mah. Test Sk. No:3 D:4")
    put(page, 42, 208, "Merkez / NEVŞEHİR")
    put(page, 42, 226, "Tel: 0500 000 00 03")
    put(page, 42, 244, "E-Posta: test@example.com")
    put(page, 42, 262, "VKN: 11111111111")
    for y, text in ((154, "Fatura No: EA-2025-0001"),
                    (172, "Fatura Tarihi: 01.01.2025"),
                    (190, "ETTN: 00000000-0000-0000-0000-000000000001")):
        put(page, 370, y, text)

    table_y = 310
    if teslimat:
        put(page, 42, 302, "Teslimat Adresi:", bold=True)
        put(page, 42, 320, "Ali Örnek", bold=True)
        put(page, 42, 338, "Sanayi Mah. 5. Cad. No:10")
        put(page, 42, 356, "Çankaya / ANKARA")
        put(page, 42, 374, "Tel: 0500 000 00 04")
        put(page, 370, 302, "Fatura No: EA-2025-0002")
        put(page, 370, 320, "Fatura Tarihi: 02.01.2025")
        put(page, 370, 338, "ETTN: 00000000-0000-0000-0000-000000000002")
        table_y = 430

    page.draw_line((42, table_y), (552, table_y), color=(0.25, 0.25, 0.25))
    put(page, 42, table_y + 18, "Mal / Hizmet", bold=True)
    put(page, 42, table_y + 38, "Örnek ürün", size=9)
    page.draw_line((42, table_y + 48), (552, table_y + 48), color=(0.25, 0.25, 0.25))
    doc.save(path)
    doc.close()


def main():
    path_a = HERE / "fatura_a.pdf"
    path_b = HERE / "fatura_b.pdf"
    make_invoice(path_a)
    make_invoice(path_b, teslimat=True)

    expected_a = {
        "isim": "Zeynep Deneme",
        "telefon": "0500 000 00 03",
        "adres": "Örnek Mah. Test Sk. No:3 D:4",
        "ilce": "Merkez",
        "il": "Nevşehir",
    }
    expected_b = {
        "isim": "Ali Örnek",
        "telefon": "0500 000 00 04",
        "adres": "Sanayi Mah. 5. Cad. No:10",
        "ilce": "Çankaya",
        "il": "Ankara",
    }
    assert ke.fatura_oku(path_a) == expected_a, ke.fatura_oku(path_a)
    assert ke.fatura_oku(path_b) == expected_b, ke.fatura_oku(path_b)

    empty_path = HERE / "fatura_bos.pdf"
    empty = pymupdf.open()
    empty.new_page()
    empty.save(empty_path)
    empty.close()
    try:
        ke.fatura_oku(empty_path)
    except ValueError as ex:
        assert str(ex) == "Bu PDF'te okunabilir yazı yok (taranmış resim olabilir)."
    else:
        raise AssertionError("Text-less PDF should raise ValueError")
    print("OK", path_a.name, expected_a)
    print("OK", path_b.name, expected_b)
    print("OK", empty_path.name, "raises ValueError")


if __name__ == "__main__":
    main()
