# makarali — Teknik Çizim Modülü Raporu

Modül: `site/draw/makarali.js` → `window.YDRAW.makarali` (`match`, `draw`). ES5, dış kütüphane yok.

Kural: çizimdeki her sayı ürünün kendi sayfasından (Ürün Özellikleri / ön yazı tablosu) ya da ürünün kendi fotoğrafındaki ölçü tablosundan gelir. Ölçü eksik ya da çelişkiliyse (`d≥D`, sayfa ile ad/foto farklı) `draw` null döner. Tahmini ölçü yok.

## Alt tipler ve çizim farkları

- **Oynak makaralı (222xx, 223xx)**: Çift sıra fıçı makara (ön görünüşte iki sıra), kesitte tek parça küresel dış bilezik yolu, iki yollu iç bilezik; W33 olanlarda dış bilezikte yağ kanalı + delik.
- **NK / NKS / RNA (iç bileziksiz)**: Kalın işlenmiş dış bilezik (omuzlu), iğne + kafes, mil çapı (Fw) kesikli çizgi; dış yüzde yağlama kanalı.
- **NKI / NKIS / NA (iç bilezikli)**: NK ile aynı dış bilezik + ayrı taranmış iç bilezik. 2RS olanlarda iki uçta lastik keçe çizilir.
- **HK (çekme kovanlı, açık uçlu)**: İnce sac kovan, iki ucu içe kıvrık, kalın dış bilezik yok; iğne + kafes.
- **RAX 7xx (kombine)**: Radyal iğne kovanı + ayrı eksenel iğne pulu (eksenel parça kesitte ve ön görünüşte). Ölçüler ürün fotoğrafındaki tablodan (Ci, D1, D2, L, h).
- **NKX Z / NX Z (kombine)**: Radyal iğneli dış bilezik + eksenel bilyalı kısım (mil pulu, bilya, sac kapak Z). Eksenel kısmın dış çapı sayfada yok → ölçü yazılmadan şekil olarak çizilir; sadece d, D, B yazılır.
- **NKXR Z (kombine)**: NKX gibi, eksenel kısım silindirik makaralı (kafesli).
- **NKIA / NKIB (kombine)**: İç bilezikli iğne + açısal temaslı bilyalı kısım; NKIA ve NKIB yön farkıyla ayrı çizilir.
- **Silindirik makaralı NU/NJ/NUP/N/NN**: Kodda çizimleri var (flanş farkları ayrı), fakat sitede bu ailede ürün sayfası bulunamadı (aşağıya bakın).

Her çizim: ön görünüş + kesit A-A, 45° tarama, eksen çizgisi (çizgi-nokta), ok uçlu ölçü çizgileri, `data-k` ile vurgulanan ölçü grupları.
Kesit A-A kendi ölçeğinde çizilir (yüksekliği çizim alanının ~%80’i, RAX’ta üstte iki ölçü olduğu için ~%72); ön görünüş ayrı ölçekte. Yazan ölçü değerleri yine ürünün gerçek ölçüleridir. Ölçü yazısı 17 birim: 360px ekranda (çizim ~308px genişlik) ~11,4px.

## Kullanılan ölçü etiketleri (sayfadan)

- `Dış Çap (D)` (762 satır)
- `Genişlik (B)` (762 satır)
- `İç Çap (d)` (718 satır)
- `Ölçü (dxDxB)` (72 satır)
- `Saplama Çapı (d)` (44 satır)
- `İç Çap` (36 satır)
- `Dış Çap` (36 satır)
- `Genişlik` (36 satır)
- `Ölçüler (iç çap x dış çap x genişlik)` (23 satır)

Fotoğraf tablosundan (sadece RAX): `Ci`, `D1`, `D2`, `l`, `h`, `L`, `d1`, `d2` → `site/draw/data/makarali.json`.

## Kapsam sayıları (ölçülen)

`products.json` toplam 13103 URL. Aile adayı URL’lerin hepsi (435 sayfa, kapsam dışı kam makaralılar dahil) tarayıcıyla tek tek açıldı; ayrıca diğer ailelerden 28 kontrol sayfası açıldı.

| Alt tip | Açılan sayfa | match=true | Çizim çıktı (ölçü tam) | Çizim yok |
|---|---|---|---|---|
| Oynak makaralı 222xx | 32 | 32 | 32 | 0 |
| Oynak makaralı 223xx | 4 | 4 | 4 | 0 |
| NA (iç bilezikli, işlenmiş) | 83 | 83 | 83 | 0 |
| NKI (iç bilezikli) | 60 | 60 | 60 | 0 |
| NKIS (iç bilezikli) | 11 | 11 | 11 | 0 |
| NK (iç bileziksiz) | 89 | 89 | 88 | 1 |
| NKS (iç bileziksiz) | 9 | 9 | 9 | 0 |
| HK çekme kovanlı (açık uçlu) | 23 | 23 | 23 | 0 |
| RAX / RAXPZ kombine | 13 | 13 | 11 | 2 |
| NKX Z kombine (iğne + eksenel bilya, kapaklı) | 13 | 13 | 13 | 0 |
| NKXR Z kombine (iğne + eksenel silindirik makara) | 8 | 8 | 8 | 0 |
| NX Z kombine (iğne + eksenel bilya) | 8 | 8 | 8 | 0 |
| NKIA kombine (iç bilezikli iğne + açısal bilya) | 14 | 14 | 14 | 0 |
| NKIB kombine (iç bilezikli iğne + açısal bilya, ters yön) | 14 | 14 | 14 | 0 |
| Kam makaralı (KR/NATR/NUTR) — kapsam dışı | 54 | 0 | 0 | 54 |
| **Toplam (kam hariç)** | **381** | **381** | **378** | **3** |

Sitede bulunamayan alt tipler (ölçülen):
- Silindirik makaralı (NU, NJ, NUP, N, NN): `products.json` içinde adında "silindirik" geçen ya da NU/NJ/NUP/N/NN koduyla başlayan URL sayısı **0**; "TEK SIRALI / ÇİFT SIRALI SİLİNDİRİK MAKARALI RULMAN" kategori sayfaları boş. Çizim kodu hazır, ürün eklenince çalışır; gerçek sayfayla test edilemedi.
- Oynak makaralı 230xx, 231xx, 232xx, 240xx: URL sayısı **0** (sadece 222xx ve 223xx var).
- RNA: URL sayısı **0**. BK: `bk-` ile başlayan URL’ler servo kaplin ürünü (rulman değil) → match=false.
- HK: sadece motosiklet/scooter varyatör ürünleri (HK202918, 23 sayfa) var; ölçü "Ölçüler (iç çap x dış çap x genişlik)" satırından okunur.

## Fotoğraftan okunan ölçüler

Sadece net okunan tablo değerleri yazıldı. Hepsi ürünün kendi 2. fotoğrafındaki "RAX700 / RAXF700 Serisi" ölçü tablosundan, ilgili model satırından.

| Ürün | Değerler | Kaynak foto |
|---|---|---|
| `/rax-705-kombine-igneli-rulman-17716` | Ci=5, D1=9, D2=15.5, l=7.7, h=3.3, L=11, d1=7.2, d2=11.2 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/rax-705-kombine-igneli-rulman-7-4298.jpeg |
| `/rax-712-kombine-igneli-rulman-17717` | Ci=12, D1=18, D2=27.5, l=10, h=4.2, L=14.2, d1=15, d2=22.6 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/rax-712-kombine-igneli-rulman-1-41fe.jpeg |
| `/rax-714-kombine-igneli-rulman-17718` | Ci=14, D1=20, D2=29.5, l=10, h=4.2, L=14.2, d1=17, d2=24.6 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/rax-714-kombine-igneli-rulman-35fafa.jpeg |
| `/rax-715-kombine-igneli-rulman-17719` | Ci=15, D1=21, D2=31.5, l=10, h=4.2, L=14.2, d1=19, d2=26.6 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/rax-715-kombine-igneli-rulman--b5b3-.jpeg |
| `/rax-718-kombine-igneli-rulman-17720` | Ci=18, D1=24, D2=33.5, l=14, h=4.2, L=18.2, d1=21, d2=28.6 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/rax-718-kombine-igneli-rulman-5-4287.jpeg |
| `/rax-720-kombine-igneli-rulman-17721` | Ci=20, D1=26, D2=36.5, l=14, h=4.2, L=18.2, d1=22, d2=31.6 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/rax-720-kombine-igneli-rulman-74-468.jpeg |
| `/rax-725-kombine-igneli-rulman-17722` | Ci=25, D1=33, D2=45.5, l=18, h=4.2, L=22.2, d1=30, d2=39.6 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/rax-725-kombine-igneli-rulman-7a55-4.jpeg |
| `/rax-730-kombine-igneli-rulman-17723` | Ci=30, D1=38, D2=50.5, l=18, h=4.2, L=22.2, d1=35, d2=44.7 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/rax-730-kombine-igneli-rulman-310b78.jpeg |
| `/rax-735-kombine-igneli-rulman-17724` | Ci=35, D1=43, D2=56.5, l=18, h=4.2, L=22.2, d1=39, d2=50.9 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/rax-735-kombine-igneli-rulman-79a230.jpeg |
| `/rax-740-kombine-igneli-rulman-17725` | Ci=40, D1=48, D2=61.5, l=18, h=4.2, L=22.2, d1=43, d2=54.9 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/rax-740-kombine-igneli-rulman-450-ba.jpeg |
| `/rax-745-kombine-igneli-rulman-17726` | Ci=45, D1=52, D2=66.5, l=18, h=4.2, L=22.2, d1=48, d2=59.9 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/rax-745-kombine-igneli-rulman-82-8dd.jpeg |

## Emin olunamayanlar / çizim çıkmayanlar

- `/raxpz-415-kombine-igneli-rulman-17727` (RAXPZ 415 KOMBİNE İĞNELİ RULMAN) — sayfada d/D/B yok; fotoğraftaki tablo RAX700 serisi, bu model tabloda yok.
- `/raxpz-425-kombine-igneli-rulman-17728` (RAXPZ 425 KOMBİNE İĞNELİ RULMAN) — sayfada d/D/B yok; fotoğraftaki tablo RAX700 serisi, bu model tabloda yok.
- `/nk-2116-igneli-rulman-18596` (NK 21/16 İĞNELİ RULMAN) — sayfadaki ölçüler çelişkili (dış çap iç çaptan küçük). İç Çap (d): 21 mm, Dış Çap (D): 19 mm, Genişlik (B): 16 mm
- NKX/NX/NKXR eksenel kısmın dış çapı ve genişliği sayfada yok: şekil olarak çizildi, üzerine sayı yazılmadı.

## Fixture listesi ve match sonuçları

`site/draw/fixtures/makarali.json`: 87 sayfa (56 aile ürünü + 31 kapsam dışı kontrol ürünü, `_neg: true`).

| # | Ürün | match | alt tip | çizim |
|---|---|---|---|---|
| c0 | 22219 CCKW33C3 OYNAK MAKARALI RULMAN (ÇELİK KAFES) | true | sf | var |
| c1 | 22228 CAKW33C3 OYNAK MAKARALI RULMAN (SARI KAFES) | true | sf | var |
| c2 | 22238 CAW33C3 OYNAK MAKARALI RULMAN (SARI KAFES) | true | sf | var |
| c3 | 22256 CAW33C3 OYNAK MAKARALI RULMAN (SARI KAFES) | true | sf | var |
| c4 | 22322 E1.XL.T41D OYNAK MAKARALI RULMAN (ÇELİK KAFES) | true | sf | var |
| c5 | 22324 E1.XL.T41D OYNAK MAKARALI RULMAN (ÇELİK KAFES) | true | sf | var |
| c6 | 22328 E1.XL.T41D OYNAK MAKARALI RULMAN (ÇELİK KAFES) | true | sf | var |
| c7 | 22330 E1.XL.T41D OYNAK MAKARALI RULMAN (ÇELİK KAFES) | true | sf | var |
| c8 | RAX 705 KOMBİNE İĞNELİ RULMAN | true | rax | var |
| c9 | RAX 718 KOMBİNE İĞNELİ RULMAN | true | rax | var |
| c10 | RAX 735 KOMBİNE İĞNELİ RULMAN | true | rax | var |
| c11 | RAXPZ 425 KOMBİNE İĞNELİ RULMAN | true | rax | yok |
| c12 | KR 16 PP KAM MAKARALI RULMAN *(kontrol)* | false | - | yok |
| c13 | NATR 12 PP KAM MAKARALI RULMAN *(kontrol)* | false | - | yok |
| c14 | NUTR 50110 KAM MAKARALI RULMAN *(kontrol)* | false | - | yok |
| c15 | NA 4822 İĞNELİ RULMAN | true | ir | var |
| c16 | NA 4902 2RS İĞNELİ RULMAN | true | ir | var |
| c17 | NA 4924 İĞNELİ RULMAN | true | ir | var |
| c18 | NA 6918 İĞNELİ RULMAN | true | ir | var |
| c19 | NK 05/12 İĞNELİ RULMAN | true | nk | var |
| c20 | NK 18/20 İĞNELİ RULMAN | true | nk | var |
| c21 | NK 43/20 İĞNELİ RULMAN | true | nk | var |
| c22 | NK 95/36 İĞNELİ RULMAN | true | nk | var |
| c23 | NKI 05/12 İĞNELİ RULMAN | true | ir | var |
| c24 | NKI 22/16 İĞNELİ RULMAN | true | ir | var |
| c25 | NKI 45/35 İĞNELİ RULMAN | true | ir | var |
| c26 | NKI 95/36 İĞNELİ RULMAN | true | ir | var |
| c27 | NKIA 5901 KOMBİNE İĞNELİ RULMAN | true | nkia | var |
| c28 | NKIA 5905 KOMBİNE İĞNELİ RULMAN | true | nkia | var |
| c29 | NKIA 5910 KOMBİNE İĞNELİ RULMAN | true | nkia | var |
| c30 | NKIA 5914 KOMBİNE İĞNELİ RULMAN | true | nkia | var |
| c31 | NKIB 5901 KOMBİNE İĞNELİ RULMAN | true | nkib | var |
| c32 | NKIB 5905 KOMBİNE İĞNELİ RULMAN | true | nkib | var |
| c33 | NKIB 5910 KOMBİNE İĞNELİ RULMAN | true | nkib | var |
| c34 | NKIB 5914 KOMBİNE İĞNELİ RULMAN | true | nkib | var |
| c35 | NKIS 15 İĞNELİ RULMAN | true | ir | var |
| c36 | NKIS 30 İĞNELİ RULMAN | true | ir | var |
| c37 | NKIS 50 İĞNELİ RULMAN | true | ir | var |
| c38 | NKIS 70 İĞNELİ RULMAN | true | ir | var |
| c39 | NKS 20 İĞNELİ RULMAN | true | nk | var |
| c40 | NKS 25 İĞNELİ RULMAN | true | nk | var |
| c41 | NKS 30 İĞNELİ RULMAN | true | nk | var |
| c42 | NKS 37 İĞNELİ RULMAN | true | nk | var |
| c43 | NKX 10 Z KOMBİNE İĞNELİ RULMAN | true | nkx | var |
| c44 | NKX 20 Z KOMBİNE İĞNELİ RULMAN | true | nkx | var |
| c45 | NKX 40 Z KOMBİNE İĞNELİ RULMAN | true | nkx | var |
| c46 | NKX 70 Z KOMBİNE İĞNELİ RULMAN | true | nkx | var |
| c47 | NKXR 15 Z KOMBİNE İĞNELİ RULMAN | true | nkxr | var |
| c48 | NKXR 25 Z KOMBİNE İĞNELİ RULMAN | true | nkxr | var |
| c49 | NKXR 40 Z KOMBİNE İĞNELİ RULMAN | true | nkxr | var |
| c50 | NKXR 50 Z KOMBİNE İĞNELİ RULMAN | true | nkxr | var |
| c51 | NX 12 Z KOMBİNE İĞNELİ RULMAN | true | nx | var |
| c52 | NX 17 Z KOMBİNE İĞNELİ RULMAN | true | nx | var |
| c53 | NX 30 Z KOMBİNE İĞNELİ RULMAN | true | nx | var |
| c54 | NX 7 Z KOMBİNE İĞNELİ RULMAN | true | nx | var |
| c55 | Honda SH 125 / SH 150 Arka Varyatör İğneli Rulmanı HK202918 - Ekonomik Model | true | hk | var |
| c56 | Vespa GTS 250 / GTS 300 Arka Varyatör İğneli Rulmanı HK202918 - Ekonomik Model | true | hk | var |
| c57 | Kymco Like 125 Arka Varyatör İğneli Rulmanı HK202918 - Ekonomik Model | true | hk | var |
| c58 | Kymco MXer 150 Arka Varyatör İğneli Rulmanı HK202918 - Ekonomik Model | true | hk | var |
| c59 | NBR Yağ keçesi 5x16x7 *(kontrol)* | false | - | yok |
| c60 | NBR Yağ keçesi 5x18x7 *(kontrol)* | false | - | yok |
| c61 | 1008*9 Konik Burç *(kontrol)* | false | - | yok |
| c62 | 1008*10 Konik Burç *(kontrol)* | false | - | yok |
| c63 | KFL000 Minyatür Yataklı Rulman (10 mm) *(kontrol)* | false | - | yok |
| c64 | KFL001 Minyatür Yataklı Rulman (12 mm) *(kontrol)* | false | - | yok |
| c65 | AKL 03 Minyatür Eksenel Bilyalı Rulman (Büte) 3x8x3.5 *(kontrol)* | false | - | yok |
| c66 | AKL 04 Minyatür Eksenel Bilyalı Rulman (Büte) 4x10x4 *(kontrol)* | false | - | yok |
| c67 | 10020 Zincirli Kaplin *(kontrol)* | false | - | yok |
| c68 | 12018 Zincirli Kaplin *(kontrol)* | false | - | yok |
| c69 | Hiwin HGH15 CA ZAC Dar Araba (Lineer Araba) *(kontrol)* | false | - | yok |
| c70 | Hiwin HGW15 CC ZAC Geniş Araba (Lineer Araba) *(kontrol)* | false | - | yok |
| c71 | RULMAN MANŞONU H 205 *(kontrol)* | false | - | yok |
| c72 | RULMAN MANŞONU H 206 *(kontrol)* | false | - | yok |
| c73 | 471 4 Beneri Dış Segman *(kontrol)* | false | - | yok |
| c74 | 471 5 Beneri Dış Segman *(kontrol)* | false | - | yok |
| c75 | NBR Yağ keçesi 20x48x7 *(kontrol)* | false | - | yok |
| c76 | 6204 ZZ C3 ORS Rulman *(kontrol)* | false | - | yok |
| c77 | 068-B (5 AD/1 TK) Ayaklı Kaplin Lastiği *(kontrol)* | false | - | yok |
| c78 | 080-B (6 AD/1 TK) Ayaklı Kaplin Lastiği *(kontrol)* | false | - | yok |
| c79 | KR 16 PP KAM MAKARALI RULMAN *(kontrol)* | false | - | yok |
| c80 | KR 19 PP KAM MAKARALI RULMAN *(kontrol)* | false | - | yok |
| c81 | NUTR 15 KAM MAKARALI RULMAN *(kontrol)* | false | - | yok |
| c82 | NUTR 1542 KAM MAKARALI RULMAN *(kontrol)* | false | - | yok |
| c83 | NATR 5 PP KAM MAKARALI RULMAN *(kontrol)* | false | - | yok |
| c84 | NATR 6 PP KAM MAKARALI RULMAN *(kontrol)* | false | - | yok |
| c85 | MANŞON SOMUNU KM 0 *(kontrol)* | false | - | yok |
| c86 | MANŞON SOMUNU KM 1 *(kontrol)* | false | - | yok |

Kapsam dışı kontrol ürünlerinde match=true çıkan: **0**.

## Önizleme

`site/draw/preview/makarali.html` (fixture kartları). Ekran görüntüleri: `site/draw/preview/makarali/cN-460.png`, `cN-360.png` (aile ürünlerinin hepsi, iki genişlik).
