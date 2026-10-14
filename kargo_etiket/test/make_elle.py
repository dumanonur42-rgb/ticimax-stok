"""Elle girilen (barkodsuz) örnek etiket üretir. Çalıştır: python test/make_elle.py"""

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import kargo_etiket as ke  # noqa: E402

ORNEKLER = [
    ke.elle_etiket("Ayşe Örnek", "05000000001", "Deneme Mah. Örnek Cad. No:6 D:3 (OKUL KARŞISI)",
                   "Merkez", "Nevşehir", "Yurtiçi Kargo", "Gönderici Ödemeli", "1", "2"),
    ke.elle_etiket("Mehmet Uzunisimli Denemeoğlu Sanayi Ticaret", "5000000002",
                   "Organize Sanayi Bölgesi 3. Cadde Çiçek Sokak No:12 Kat:2 Daire:5 Blok B",
                   "Kızılcahamam", "Ankara", "", "Alıcı Ödemeli", "2", "5"),
]

if __name__ == "__main__":
    for size in ke.LABEL_SIZES:
        dst = ke.write_labels(ORNEKLER, HERE / f"elle_{size}.pdf", size)
        print("OK", dst)
