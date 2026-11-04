# -*- coding: utf-8 -*-
"""Her segment için 3 satış varyantı (görsel verisi + metin). v1 = segmentler.SEGMENT temel ilanı."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from segmentler import SEGMENT, ALT_FB, u  # noqa: E402


def metin(hook, link, tags):
    return f"{hook}\n\n🛒 {link}\n{ALT_FB}\n\n{tags}"


def tags_of(seg):
    return SEGMENT[seg]["text"].strip().splitlines()[-1]


V = {
    "beyaz": [
        dict(etiket="KOLİ FİYATI", baslik="ORS 6204 · 6205<br>ÇAMAŞIR MAKİNESİ RULMANI", alt="Servislere koli fiyatı · 10'lu paket indirimi · Keçe setiyle birlikte",
             kodlar=["6204 ZZ ORS", "6205 ZZ ORS", "6203 2RS", "25x47x8 keçe", "30x52x10 keçe", "35x62x10 keçe"],
             hook="""🧺 ORS 6204 – 6205 ÇAMAŞIR MAKİNESİ RULMANI KOLİ FİYATIYLA

Beyaz eşya servisleri: ORS orijinal 6204 ZZ, 6205 ZZ, 6203 2RS + 25x47 / 30x52 / 35x62 keçeler rafta.
10'lu paket alımında ek indirim · Arçelik, Beko, Vestel, Bosch, Samsung, LG uyumlu.
Adet veya koli yazın, fiyatı hemen dönelim ✅ Aynı gün kargo""", link=u('sabit-bilyali-rulmanlar', 'beyaz-esya-v2')),
        dict(etiket="ACİL PARÇA", baslik="BUGÜN SİPARİŞ<br>BUGÜN KARGODA", alt="Çamaşır, kurutma, bulaşık makinesi rulman & keçe · ORS · SKF · FAG",
             kodlar=["6305 ZZ ORS", "6306 ZZ ORS", "6204 ZZ ORS", "6205 ZZ ORS", "Kurutma makinesi rulmanı", "Keçe setleri"],
             hook="""⏱️ SERVİSTE MÜŞTERİ BEKLİYOR MU? RULMAN + KEÇE BUGÜN KARGODA

Çamaşır, kurutma ve bulaşık makinesi rulmanları: 6204 · 6205 · 6305 · 6306 ZZ ORS + keçe setleri stokta.
16:00'a kadar gelen sipariş aynı gün yola çıkar, İstanbul içi ertesi gün elinizde.
Makine marka/modelini yazın, doğru seti hazırlayalım ✅ Servislere özel fiyat""", link=u('sabit-bilyali-rulmanlar', 'beyaz-esya-v3')),
    ],
    "bobinaj": [
        dict(etiket="TOPTAN · CARİ HESAP", baslik="6205 · 6206 · 6306<br>ZZ C3 STOKTA", alt="Elektrik motoru, pompa, redüktör rulmanları · SKF · FAG · ORS · NMB",
             kodlar=["6205 ZZ C3", "6206 ZZ C3", "6207 ZZ C3", "6306 ZZ C3", "6307 ZZ C3", "6308 ZZ C3"],
             hook="""🔌 BOBİNAJ ATÖLYELERİNE: 6205 · 6206 · 6207 · 6306 · 6307 · 6308 ZZ C3 TOPTAN

Elektrik motoru, pompa, redüktör sarımında en çok çıkan ölçüler kolide hazır.
SKF · FAG · ORS · NMB seçenekleri · Atölyelere toptan fiyat · Cari hesap / vadeli çalışma.
Sarım listenizi WhatsApp'tan gönderin, aynı gün kargolayalım ✅""", link=u('sabit-bilyali-rulmanlar', 'bobinaj-v2')),
        dict(etiket="MOTOR ETİKETİNİ ATIN", baslik="MOTOR RULMANI<br>ÖLÇÜ SORUNU YOK", alt="6201'den 6312'ye tüm ölçüler · ZZ / 2RS / C3 / C4 · Yüksek devir & yüksek sıcaklık",
             kodlar=["6201 – 6212 ZZ C3", "6301 – 6312 ZZ C3", "2RS kapaklı", "C4 boşluklu", "NU 205 – NU 210", "Redüktör rulmanları"],
             hook="""⚡ MOTOR ETİKETİNİN FOTOĞRAFINI ATIN, RULMANLARI BİZ ÇIKARALIM

0,25 kW'tan 200 kW'a kadar elektrik motoru rulmanları: 6201–6312 ZZ/2RS C3, C4, NU 205–210 silindirik.
Yüksek devir ve sıcaklık için SKF · FAG orijinal, ekonomik seride ORS.
Bobinajcıya özel toptan fiyat · Aynı gün kargo · Faturalı ✅""", link=u('sabit-bilyali-rulmanlar', 'bobinaj-v3')),
    ],
    "moto": [
        dict(etiket="MODELİNİ YAZ", baslik="MODELİNİ YAZ<br>SETİN HAZIR", alt="Mondial · Kuba · RKS · Yamaha · Honda · Bajaj · CF Moto · Kanuni · Yuki · Arora",
             kodlar=["Ön teker seti", "Arka teker seti", "Direksiyon rulmanı", "Salıncak burcu rulmanı", "Krank rulmanı", "Keçe takımı"],
             hook="""🏍️ MOTOSİKLET MODELİNİ YAZIN, ÖN + ARKA TEKER RULMAN SETİ KEÇELİ HAZIR

Mondial, Kuba, RKS, Yamaha NMAX, Honda PCX, Bajaj, CF Moto, Kanuni, Yuki, Arora – hepsi için set stokta.
Ön/arka teker, direksiyon, salıncak ve krank rulmanları · SKF · NMB · TPI · ORS.
Tamircilere toptan fiyat · Aynı gün kargo ✅""", link=u('motosiklet-rulmanlari', 'moto-v2')),
        dict(etiket="TAMİRCİYE TOPTAN", baslik="6301 · 6302 · 6204<br>2RS TEKER RULMANI", alt="En çok çıkan motosiklet teker rulmanları 10'lu paket fiyatıyla",
             kodlar=["6301 2RS", "6302 2RS", "6203 2RS", "6204 2RS", "6004 2RS", "6005 2RS"],
             hook="""🔩 6301 · 6302 · 6203 · 6204 · 6004 2RS – MOTOSİKLET TEKER RULMANI 10'LU PAKET FİYATI

En çok çıkan teker rulmanlarını paketle alın, adet maliyetini düşürün.
Kapaklı 2RS, su/toz korumalı · SKF · NMB · TPI orijinal · ORS ekonomik seri.
Tamircilere toptan fiyat · Kapıda ödeme · Aynı gün kargo ✅""", link=u('motosiklet-rulmanlari', 'moto-v3')),
    ],
    "scooter": [
        dict(etiket="SESSİZ · YÜKSEK DEVİR", baslik="608 · 6000 · 6001<br>2RS SCOOTER RULMANI", alt="Xiaomi · Ninebot · Kaabo · Dualtron · RKS · Volta · 100'lü paket fiyatı",
             kodlar=["608 2RS", "6000 2RS", "6001 2RS", "6900 2RS", "6901 2RS", "6902 2RS"],
             hook="""🛴 608 · 6000 · 6001 · 6900 · 6901 · 6902 2RS – E-SCOOTER RULMANI 100'LÜ PAKET FİYATI

Xiaomi, Ninebot, Kaabo, Dualtron, RKS, Volta teker ve motor rulmanları stokta.
Sessiz, yüksek devir NMB · TPI orijinal · ORS ekonomik.
Servislere toptan fiyat · Aynı gün kargo · Faturalı ✅""", link=u('', 'scooter-v2')),
        dict(etiket="SERVİS STOĞU", baslik="E-BİSİKLET & SCOOTER<br>HUB MOTOR RULMANLARI", alt="Hub motor, teker, direksiyon rulmanları · 6802 · 6803 · 6902 · 15267 · 6000",
             kodlar=["6802 2RS", "6803 2RS", "6902 2RS", "6000 2RS", "15267 2RS", "Direksiyon seti"],
             hook="""⚡ E-BİSİKLET / E-SCOOTER HUB MOTOR RULMANLARI – 6802 · 6803 · 6902 · 15267 STOKTA

Hub motor, teker ve direksiyon rulmanları; modele göre set hazırlıyoruz.
NMB · TPI · ORS · SKF · Servislere özel fiyat · 10'lu ve 100'lü paket.
Model veya ölçüyü yazın, aynı gün kargoya verelim ✅""", link=u('', 'scooter-v3')),
    ],
    "traktor": [
        dict(etiket="YATAKLI RULMAN", baslik="UCP 205 · 206 · 207<br>YATAKLI RULMAN", alt="Balya, mibzer, çapa, römork · Ayaklı & flanşlı yataklar · SKF · FAG · ORS · TPI",
             kodlar=["UCP 204 / 205", "UCP 206 / 207", "UCP 208 / 209", "UCF 205 / 206", "UCFL 205 / 206", "UCT 205 / 206"],
             hook="""🚜 UCP 205 · 206 · 207 YATAKLI RULMAN – BALYA, MİBZER, ÇAPA, RÖMORK İÇİN STOKTA

Ayaklı UCP, flanşlı UCF/UCFL, gergi tipi UCT yataklar 204'ten 212'ye kadar.
SKF · FAG orijinal, ORS · TPI ekonomik · Çiftçiye ve tamirciye toptan fiyat.
Ölçü veya kodu yazın, aynı gün kargo · Kapıda ödeme ✅""", link=u('', 'traktor-v2')),
        dict(etiket="GÖBEK & DİNGİL", baslik="KONİK RULMAN<br>30205 · 30206 · 32208", alt="Römork göbeği, traktör ön dingil, biçerdöver · Konik & oynak makaralı",
             kodlar=["30205 / 30206", "30207 / 30208", "32208 / 32210", "22208 / 22210", "6205 / 6305 2RS", "Keçeler"],
             hook="""🔧 RÖMORK GÖBEĞİ & TRAKTÖR DİNGİL RULMANLARI – KONİK 30205 · 30206 · 32208 STOKTA

Konik 30205–30208, 32208–32210 · oynak 22208–22210 · 6205/6305 2RS + keçeler.
Traktör, römork, biçerdöver, pulluk – parçanın fotoğrafını atın, doğru kodu bulalım.
SKF · FAG · ORS · Toptan fiyat · Aynı gün kargo ✅""", link=u('', 'traktor-v3')),
    ],
    "kompresor": [
        dict(etiket="SERVİSE TOPTAN", baslik="6306 · 6307 · 6308<br>ZZ C3 KOMPRESÖR", alt="Pistonlu & vidalı kompresör kafa/volan rulmanları · SKF · FAG · ORS",
             kodlar=["6306 ZZ C3", "6307 ZZ C3", "6308 ZZ C3", "6309 ZZ C3", "6206 ZZ C3", "6207 ZZ C3"],
             hook="""⚙️ KOMPRESÖR KAFA & VOLAN RULMANI – 6306 · 6307 · 6308 · 6309 ZZ C3 STOKTA

Pistonlu ve vidalı kompresörlerde en çok çıkan ölçüler, servis kolisiyle hazır.
SKF · FAG orijinal · ORS ekonomik · Servislere toptan fiyat · Cari hesap.
Kompresör marka/model veya kodu yazın, aynı gün kargo ✅""", link=u('sabit-bilyali-rulmanlar', 'kompresor-v2')),
        dict(etiket="AĞIR HİZMET", baslik="NU 206 · NU 207<br>SİLİNDİRİK MAKARALI", alt="Vidalı kompresör, blower, pompa · Silindirik + bilyalı C3 seti",
             kodlar=["NU 206 / NU 207", "NU 208 / NU 209", "NJ 206 / NJ 207", "6206 ZZ C3", "6305 ZZ C3", "6306 ZZ C3"],
             hook="""🔩 VİDALI KOMPRESÖR & BLOWER İÇİN NU / NJ SİLİNDİRİK MAKARALI RULMAN STOKTA

NU 206–209, NJ 206–207 silindirik + 6206/6305/6306 ZZ C3 bilyalı set olarak.
SKF · FAG orijinal · Servislere toptan fiyat · Faturalı · Cari hesap.
Kod veya ölçü yazın, aynı gün kargolayalım ✅""", link=u('sabit-bilyali-rulmanlar', 'kompresor-v3')),
    ],
    "rulman": [
        dict(etiket="BAYİ FİYAT LİSTESİ", baslik="'BAYİ' YAZ<br>LİSTE GELSİN", alt="SKF · FAG · ORS · NMB · TPI · Binlerce kalem stok · Cari hesap & vadeli",
             kodlar=["6000 – 6312 serisi", "6800 / 6900 ince kesit", "Konik & silindirik", "UCP / UCF yataklı", "Oynak makaralı", "Keçe · Kayış · Zincir"],
             hook="""📦 RULMANCILAR & HIRDAVATÇILAR: WHATSAPP'TAN "BAYİ" YAZIN, FİYAT LİSTESİ GELSİN

İkitelli'den 1986'dan beri: SKF · FAG · ORS · NMB · TPI ithalatçısı, binlerce kalem stok.
Bilyalı, ince kesit, konik, silindirik, yataklı, oynak + keçe/kayış/zincir tek adresten.
Bayi fiyatı · Cari hesap & vadeli çalışma · Aynı gün sevkiyat ✅""", link=u('', 'bayi-v2')),
        dict(etiket="İTHALATÇIDAN", baslik="ARACI YOK<br>İTHALATÇI FİYATI", alt="Rulman bayileri, hırdavatçılar, yedek parçacılar için toptan tedarik",
             kodlar=["6200 / 6300 serisi", "6000 / 6800 / 6900", "30200 / 32200 konik", "NU / NJ / N serisi", "UCP / UCF / UCFL", "22200 / 23200 oynak"],
             hook="""🏭 ARACI YOK – RULMANI DOĞRUDAN İTHALATÇIDAN ALIN

Rulman bayileri, hırdavatçılar, yedek parçacılar: SKF · FAG · ORS · NMB · TPI bayi fiyatıyla.
6200/6300, ince kesit, konik, silindirik, yataklı, oynak – tek siparişte tüm liste.
Cari hesap · Vadeli · Aynı gün sevkiyat · Faturalı ✅""", link=u('', 'bayi-v3')),
    ],
    "sanayi": [
        dict(etiket="BAKIM EKİPLERİNE", baslik="ARIZA DURMASIN<br>RULMAN BUGÜN KARGODA", alt="Üretim hattı, forklift, transpalet, ekskavatör · Konik · Silindirik · Oynak · C3",
             kodlar=["30205 – 30212", "NU 205 – NU 212", "22208 – 22216", "6205 – 6312 C3", "UCP 205 – UCP 212", "Transpalet tekerlek rulmanı"],
             hook="""🏭 HAT DURDU MU? RULMAN BUGÜN KARGODA – BAKIM EKİPLERİNE ÖZEL STOK

Konik 30205–30212 · silindirik NU 205–212 · oynak 22208–22216 · 6205–6312 C3 · yataklı UCP.
Forklift, transpalet, ekskavatör, pres, konveyör – kod veya ölçü yazın, aynı gün kargolayalım.
SKF · FAG · ORS orijinal · Cari hesap · Faturalı ✅""", link=u('', 'sanayi-v2')),
        dict(etiket="İŞ MAKİNESİ", baslik="İŞ MAKİNESİ & FORKLİFT<br>RULMANLARI", alt="Ekskavatör, loder, forklift, vinç · Konik & oynak makaralı · Ağır hizmet",
             kodlar=["32008 – 32012 konik", "30208 – 30212 konik", "22210 – 22216 oynak", "23218 – 23224 oynak", "NJ 208 – NJ 212", "6308 – 6312 C3"],
             hook="""🚧 İŞ MAKİNESİ & FORKLİFT RULMANLARI – KONİK, OYNAK, SİLİNDİRİK AĞIR HİZMET STOKTA

Ekskavatör, loder, forklift, vinç: 32008–32012, 30208–30212 konik · 22210–23224 oynak · NJ 208–212.
SKF · FAG orijinal · Kod veya ölçü yazın, aynı gün kargo.
Bakım firmalarına toptan fiyat · Cari hesap ✅""", link=u('', 'sanayi-v3')),
    ],
    "oto": [
        dict(etiket="10'LU PAKET", baslik="ALTERNATÖR RULMANI<br>6203 · 6303 · 6003", alt="Oto elektrikçilere 10'lu paket fiyatı · SKF · NMB · ORS · TPI",
             kodlar=["6203 2RS", "6303 2RS", "6003 2RS", "6202 2RS", "6302 2RS", "6201 2RS"],
             hook="""🔧 ALTERNATÖR & MARŞ RULMANI 6203 · 6303 · 6003 · 6202 · 6302 – 10'LU PAKET FİYATI

Oto elektrikçilere en çok çıkan ölçüler paket fiyatıyla; SKF · NMB · TPI orijinal, ORS ekonomik.
Kod yazın, aynı gün kargoya verelim · Faturalı ✅""", link=u('sabit-bilyali-rulmanlar', 'oto-v2')),
        dict(etiket="KLİMA KOMPRESÖRÜ", baslik="KLİMA KOMPRESÖR<br>RULMANLARI STOKTA", alt="35BD5220 · 30BD40 · 40BD49 · 32BD45 · Kasnak rulmanları · Tüm araçlar",
             kodlar=["35BD5220", "30BD40", "40BD49", "32BD45", "35BD219", "Kasnak rulmanları"],
             hook="""❄️ KLİMA KOMPRESÖRÜ KASNAK RULMANLARI – 35BD5220 · 30BD40 · 40BD49 · 32BD45 STOKTA

Oto klima servisleri ve oto elektrikçiler: binek/ticari tüm araçlar için kasnak rulmanları.
NMB · TPI · ORS · SKF · Toptan fiyat · Aynı gün kargo · Faturalı ✅""", link=u('sabit-bilyali-rulmanlar', 'oto-v3')),
    ],
}


def varyantlar(seg):
    """[(key, gorsel_verisi, metin), ...] – v1 temel + v2, v3"""
    base = SEGMENT[seg]
    out = [(f"{seg}_v1", base, base["text"])]
    for i, v in enumerate(V[seg], start=2):
        g = dict(base, **{k: v[k] for k in ("etiket", "baslik", "alt", "kodlar")})
        out.append((f"{seg}_v{i}", g, metin(v["hook"], v["link"], tags_of(seg))))
    return out


HEPSI = {k: (g, t) for seg in SEGMENT for k, g, t in varyantlar(seg)}

if __name__ == "__main__":
    for k, (g, t) in HEPSI.items():
        print("=" * 60, k)
        print(t)
