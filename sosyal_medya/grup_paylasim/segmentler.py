# -*- coding: utf-8 -*-
"""Facebook grupları -> segment; her segment için satış odaklı ilan içerikleri (görsel verisi + metin)."""
import json, re
from pathlib import Path

WA = "https://wa.me/905526109363"
TEL = "0552 610 93 63"
SITE = "yamansarulman.com"


def u(path="", camp="grup"):
    return f"https://www.yamansarulman.com/{path}?utm_source=facebook&utm_medium=group&utm_campaign={camp}"


# ---------------------------------------------------------------- grup -> segment
KURAL = [
    ("rulman", r"rulman"),
    ("beyaz", r"beyaz e[sş]ya|ev e[sş]yalar"),
    ("scooter", r"scooter|elektrikli bisiklet"),
    ("moto", r"motos[iı]klet|motors[iı]klet|3 tekerlek"),
    ("oto", r"oto elektrik|motor hasar|çıkma motor"),
    ("bobinaj", r"bobinaj|elekt[ii]rikli motor|elektrik motor|red[üu]kt[öo]r|rediktör"),
    ("kompresor", r"kompres[öo]r"),
    ("traktor", r"trakt[öo]r|tarım"),
    ("sanayi", r"makina|makine|i[şs] makine|transpalet|üretim"),
]


def segment_of(name):
    n = name.replace("İ", "i").replace("I", "ı").lower()
    for seg, rx in KURAL:
        if re.search(rx, n):
            return seg
    return "sanayi"


def gruplar():
    gs = json.load(open(Path(__file__).resolve().parent / "gruplar.json"))
    for g in gs:
        g["segment"] = segment_of(g["name"])
    return gs


# ---------------------------------------------------------------- segment içerikleri
TEL_INT = "+90 552 610 93 63"
ALT_FB = f"""💬 WhatsApp sipariş: {WA}
📞 Hemen ara: {TEL_INT}
📍 İkitelli OSB, Başakşehir / İstanbul · 1986'dan beri ithalatçı
🚚 16:00'a kadar sipariş aynı gün kargoda · Faturalı · %100 orijinal"""

SEGMENT = {
    "beyaz": dict(
        ad="Beyaz eşya servisleri",
        etiket="SERVİSLERE TOPTAN",
        baslik="ÇAMAŞIR MAKİNESİ<br>RULMAN + KEÇE SETİ",
        alt="ORS orijinal · Arçelik, Beko, Bosch, Vestel, Samsung, LG tüm modeller",
        kodlar=["6204 ZZ ORS", "6205 ZZ ORS", "6305 ZZ ORS", "6306 ZZ ORS", "6203 2RS", "Keçe setleri"],
        markalar="ORS · SKF · FAG",
        foto="34397245.jpg",
        text=f"""🧺 BEYAZ EŞYA SERVİSLERİ – ORS ÇAMAŞIR MAKİNESİ RULMANI & KEÇE STOKTA

ORS orijinal 6204 · 6205 · 6305 · 6306 ZZ ve keçe setleri, koli ve adet fiyatıyla.
Arçelik / Beko / Bosch / Vestel / Samsung / LG – marka model yazın, seti hazırlayalım.
✅ Servislere özel toptan fiyat · ✅ 10'lu paket indirimi · ✅ Aynı gün kargo

🛒 Online katalog: {u('sabit-bilyali-rulmanlar','beyaz-esya')}
{ALT_FB}

#beyazeşya #çamaşırmakinesi #rulman #ors #6204 #6205 #6305 #keçe #teknikservis #yedekparça""",
    ),
    "bobinaj": dict(
        ad="Bobinaj / elektrik motoru",
        etiket="BOBİNAJCIYA ÖZEL",
        baslik="ELEKTRİK MOTORU<br>RULMANLARI C3",
        alt="6201'den 6312'ye tüm ölçüler · ZZ / 2RS / C3 · SKF · FAG · ORS",
        kodlar=["6203 ZZ C3", "6204 ZZ C3", "6205 ZZ C3", "6206 ZZ C3", "6305 ZZ C3", "6306 ZZ C3", "6308 ZZ C3"],
        markalar="SKF · FAG · ORS · NMB",
        foto="34194564.jpg",
        text=f"""🔌 BOBİNAJCILAR – ELEKTRİK MOTORU RULMANI 6201'DEN 6312'YE STOKTA (C3)

Motor sarımında rulman beklemeyin: 6203 · 6204 · 6205 · 6206 · 6305 · 6306 · 6308 ZZ C3 rafta.
SKF · FAG · ORS seçenekleri, atölyelere özel toptan fiyat, cari hesap imkânı.
Motor etiketinin fotoğrafını atın, rulmanları hazırlayıp aynı gün kargolayalım ✅

🛒 Online katalog: {u('sabit-bilyali-rulmanlar','bobinaj')}
{ALT_FB}

#bobinaj #elektrikmotoru #rulman #c3 #skf #fag #ors #motorsarım #redüktör #sanayi""",
    ),
    "moto": dict(
        ad="Motosiklet",
        etiket="ÖN + ARKA SET",
        baslik="MOTOSİKLET TEKERLEK<br>RULMAN SETLERİ",
        alt="Mondial · Kuba · RKS · Yamaha · Honda · Bajaj · CF Moto · Kanuni · Yuki",
        kodlar=["6301 2RS", "6302 2RS", "6203 2RS", "6204 2RS", "6004 2RS", "Keçeli komple set"],
        markalar="SKF · NMB · TPI · ORS",
        foto="18171624.jpg",
        text=f"""🏍️ MOTOSİKLET TAMİRCİLERİ – TEKERLEK RULMANI SETLERİ KEÇELİ, STOKTAN AYNI GÜN

Ön + arka komple set: 6301 · 6302 · 6203 · 6204 · 6004 2RS + keçeler.
Mondial / Kuba / RKS / Yamaha / Honda / Bajaj / CF Moto – modeli yazın, seti çıkaralım.
✅ Tamircilere toptan fiyat · ✅ Orijinal SKF · NMB · TPI · ✅ Direksiyon rulmanı da stokta

🛒 Motosiklet rulmanları: {u('motosiklet-rulmanlari','moto')}
{ALT_FB}

#motosiklet #motosikletyedekparça #tekerlekrulmanı #rulman #6301 #6302 #6204 #mondial #kuba #rks #yamaha #honda""",
    ),
    "scooter": dict(
        ad="E-scooter / e-bisiklet",
        etiket="SERVİSLERE TOPTAN",
        baslik="E-SCOOTER & E-BİSİKLET<br>RULMANLARI",
        alt="Xiaomi · Ninebot · Kaabo · Dualtron · RKS · Volta · tüm modeller",
        kodlar=["608 2RS", "6000 2RS", "6001 2RS", "6900 2RS", "6901 2RS", "6902 2RS", "6802 / 6803"],
        markalar="NMB · TPI · ORS · SKF",
        foto="38292508.jpg",
        text=f"""🛴 E-SCOOTER / E-BİSİKLET SERVİSLERİ – TEKERLEK & MOTOR RULMANI STOKTA

608 · 6000 · 6001 · 6900 · 6901 · 6902 · 6802 · 6803 2RS – Xiaomi, Ninebot, Kaabo, Dualtron, RKS, Volta.
Sessiz, yüksek devir NMB · TPI · ORS. 10'lu / 100'lü paket fiyatı için yazın.
✅ Aynı gün kargo · ✅ Faturalı · ✅ Servis fiyatı

🛒 Katalog: {u('','scooter')}
{ALT_FB}

#elektrikliscooter #escooter #elektriklibisiklet #rulman #608 #6000 #6900 #xiaomi #ninebot #servis""",
    ),
    "traktor": dict(
        ad="Traktör / tarım makineleri",
        etiket="TARIM SEZONU STOĞU",
        baslik="TRAKTÖR & TARIM MAKİNESİ<br>RULMANLARI",
        alt="Yataklı UCP/UCF · Konik 30200 · Oynak 22200 · Balya, biçerdöver, pulluk, mibzer",
        kodlar=["UCP 205 / 206 / 207", "UCF 205 / 206", "30205 / 30206", "6205 2RS", "22208 / 22210", "6305 2RS"],
        markalar="SKF · FAG · ORS · TPI",
        foto="18500079.jpg",
        text=f"""🚜 TRAKTÖR & TARIM MAKİNESİ RULMANLARI – SEZON AÇILMADAN STOKTAN ALIN

Yataklı UCP 205/206/207 · UCF 205/206 · konik 30205/30206 · oynak 22208/22210 · 6205/6305 2RS.
Balya, biçerdöver, pulluk, mibzer, römork göbeği – ölçü veya kod yazın, aynı gün kargolayalım.
✅ Çiftçiye ve tamirciye toptan fiyat · ✅ SKF · FAG · ORS · ✅ Kapıda ödeme

🛒 Katalog: {u('','traktor')}
{ALT_FB}

#traktör #tarımmakineleri #rulman #yataklırulman #ucp205 #ucp206 #konikrulman #biçerdöver #balyamakinesi #yedekparça""",
    ),
    "kompresor": dict(
        ad="Kompresör",
        etiket="AĞIR HİZMET C3",
        baslik="KOMPRESÖR<br>RULMANLARI",
        alt="Kafa, volan ve elektrik motoru rulmanları · 6300 serisi C3 · SKF · FAG · ORS",
        kodlar=["6305 ZZ C3", "6306 ZZ C3", "6307 ZZ C3", "6308 ZZ C3", "6206 ZZ C3", "NU 206 / NU 207"],
        markalar="SKF · FAG · ORS",
        foto="hero_rulman_navy.png",
        text=f"""⚙️ KOMPRESÖR SERVİSLERİ – KAFA, VOLAN VE MOTOR RULMANLARI STOKTA (C3)

6305 · 6306 · 6307 · 6308 ZZ C3, 6206 C3, NU 206 / NU 207 silindirik – pistonlu ve vidalı kompresörler için.
SKF · FAG · ORS orijinal, servislere toptan fiyat, cari hesap imkânı.
Kompresör marka/model veya rulman kodu yazın, aynı gün kargo ✅

🛒 Katalog: {u('sabit-bilyali-rulmanlar','kompresor')}
{ALT_FB}

#kompresör #kompresörservis #rulman #6306 #6308 #c3 #skf #fag #ors #sanayi #teknikservis""",
    ),
    "rulman": dict(
        ad="Rulman alım-satım / bayiler",
        etiket="İTHALATÇIDAN BAYİ FİYATI",
        baslik="TOPTAN RULMAN<br>İTHALATÇIDAN",
        alt="SKF · FAG · ORS · NMB · TPI yetkili distribütör · 1986'dan beri · Cari hesap",
        kodlar=["6000 – 6312 serisi", "6800 / 6900 ince kesit", "30200 / 32200 konik", "NU / NJ silindirik", "UCP / UCF yataklı", "22200 oynak makaralı"],
        markalar="SKF · FAG · ORS · NMB · TPI",
        foto="36398150.jpg",
        text=f"""📦 RULMANCILAR & HIRDAVATÇILAR – İTHALATÇIDAN BAYİ FİYATIYLA TOPTAN RULMAN

1986'dan beri İkitelli OSB'den: SKF · FAG · ORS · NMB · TPI yetkili distribütörü.
6000–6312 serisi, 6800/6900 ince kesit, 30200 konik, NU/NJ silindirik, UCP/UCF yataklı, 22200 oynak – binlerce kalem stokta.
✅ Bayi fiyat listesi · ✅ Cari hesap & vadeli çalışma · ✅ Aynı gün sevkiyat

Stok listesi ve bayi fiyatı için WhatsApp'tan "BAYİ" yazın 👇
🛒 Katalog: {u('','bayi')}
{ALT_FB}

#rulman #toptanrulman #rulmanbayi #skf #fag #ors #nmb #tpi #hırdavat #rulmanithalat""",
    ),
    "sanayi": dict(
        ad="Sanayi / iş makineleri",
        etiket="SANAYİ STOĞU",
        baslik="KONİK · SİLİNDİRİK · OYNAK<br>MAKARALI RULMANLAR",
        alt="İş makinesi, transpalet, forklift, üretim hatları · Bakım ekiplerine cari hesap",
        kodlar=["30205 – 30212 konik", "32008 – 32012 konik", "NU 205 – NU 212", "22208 – 22216 oynak", "6205 – 6312 C3", "Transpalet tekerlek rulmanı"],
        markalar="SKF · FAG · ORS",
        foto="pixabay_3460126.jpg",
        text=f"""🏭 İŞ MAKİNESİ & SANAYİ BAKIM – KONİK, SİLİNDİRİK, OYNAK MAKARALI RULMAN STOKTA

30205–30212 / 32008–32012 konik · NU 205–212 silindirik · 22208–22216 oynak · 6205–6312 C3.
Forklift, transpalet, ekskavatör, üretim hattı – kod veya ölçü yazın, aynı gün kargolayalım.
✅ SKF · FAG · ORS orijinal · ✅ Bakım ekiplerine cari hesap · ✅ Faturalı

🌐 Katalog: {u('','sanayi')}
{ALT_FB}

#işmakinesi #sanayi #rulman #konikrulman #silindirikrulman #oynakrulman #forklift #transpalet #bakımonarım #skf #fag""",
    ),
    "oto": dict(
        ad="Oto elektrik / motor",
        etiket="OTO ELEKTRİKÇİYE TOPTAN",
        baslik="ALTERNATÖR & MARŞ<br>RULMANLARI",
        alt="6203 · 6303 · 6003 · 6202 · 6302 2RS · Klima kompresörü rulmanları",
        kodlar=["6203 2RS", "6303 2RS", "6003 2RS", "6202 2RS", "6302 2RS", "Klima kompresör rulmanı"],
        markalar="SKF · NMB · ORS · TPI",
        foto="29342768.jpg",
        text=f"""🔧 OTO ELEKTRİKÇİLER – ALTERNATÖR, MARŞ VE KLİMA KOMPRESÖRÜ RULMANLARI STOKTA

6203 · 6303 · 6003 · 6202 · 6302 2RS ve klima kompresör rulmanları (35BD5220 vb.).
SKF · NMB · ORS · TPI orijinal, oto elektrikçilere toptan fiyat, 10'lu paket indirimi.
Kod yazın, aynı gün kargoya verelim ✅

🛒 Katalog: {u('sabit-bilyali-rulmanlar','oto')}
{ALT_FB}

#otoelektrik #alternatör #marşmotoru #rulman #6203 #6303 #klimakompresörü #otoyedekparça #skf #nmb""",
    ),
}

if __name__ == "__main__":
    from collections import Counter
    gs = gruplar()
    c = Counter(g["segment"] for g in gs)
    for seg, n in c.most_common():
        print(f"\n== {seg} ({n}) – {SEGMENT[seg]['ad']}")
        for g in gs:
            if g["segment"] == seg:
                print("  ", g["name"], "|", g["uye"], "| paylaşım" if g.get("paylasim") else "| (paylaşım kapalı/onay)")
