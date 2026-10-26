# Parça 04 – FAG/INA (Schaeffler) – 3628 ürün

## Özet
| | adet |
|---|---|
| Toplam ürün | 3628 |
| Görsel birebir (üretici görseli, aynı kod) | 2422 |
| Görsel aynı tip (aynı ana kod + aynı conta/kapak, delik ve kafes tipi) | 381 |
| Görselsiz | 825 |
| Farklı görsel dosyası | 61 |
| Boş kategori | 54 |
| Bayraklı ürün (tümü) | 3628 |
| Bayraklı ürün ("kesit gorsel" dışında bayrağı olan) | 1164 |

Kaynak: teknik veriler ve görseller medias.schaeffler.com üretici kataloğundan. 3126 kod katalogda birebir bulundu (ölçü, yük değerleri, ağırlık, yapı özellikleri). 439 kod katalogda birebir yok; bunlarda yalnızca aynı ana kodlu tüm katalog kayıtlarında ortak olan ana ölçüler (d, D, B/T) yazıldı, yük değerleri yazılmadı, bayrak eklendi. 63 kod için katalogda hiçbir kayıt yok: teknik bilgi yok, kategori boş, görsel yok, bayraklı.

Aynı tip görsel kuralı: kod eklerinden conta/kapak (2RS/2RSR/2HRS → lastik conta, 2Z → metal kapak, açık), konik delik (K/K30) ve kafes (pirinç M/MB, poliamid TVH/TVP, standart) birebir aynı olan kardeş kayıtların resmi kullanıldı; uyan yoksa görsel konmadı.

## Fotoğraf gerçekliği düzeltmesi
Önceki 77 farklı görselin hepsi tek tek sınıflandırıldı:
- Çizim tipi: **16** görsel. 12 tanesinde ölçü çizgisi/harfleri var (D, d, B, T): 234406-M-SP, 53203, 54305, 108-TVH, 11204-TVH, 2200-2RS-TVH, 4200-BB-TVH, 20318-K-MB-C3, 23230-E1A-XL-M-H40-C3, 23936-S-K-MB, 22308-E1-XL-T41A, 21307-E1-XL-K-TVPB. 4 tanesi düz, mavi-yeşil CAD görünümlü: 20204-TVP, 51130-MP, 51100, 52202.
- Bu 16 görselin hepsi çıkarıldı. Bunları kullanan ürünlerden 42'sine aynı ana kod, aynı tip ve aynı conta/kafes yapısındaki kardeş ürünün fotoğraf gibi görünen resmi kondu (ayni_tip). Uygun görsel bulunamayan 662 ürün görselsiz bırakıldı ve "yalnızca çizim tipi görseli var" bayrağı eklendi.
- Kalan **61** görselin hepsi gerçekçi metal görünümlü üretici render'ı. Ancak hepsi çeyreği kesilmiş kesit görünüşte. Schaeffler katalog araması ürün başına tek görsel veriyor ve ürün sayfalarında başka medya alınamıyor (sayfa verisi hata döndürüyor). Bu yüzden kesitsiz tam görünüş bulunamadı. Kesit görsel kullanılan tüm ürünlere "kesit gorsel" bayrağı eklendi (2803 ürün).
- Sayılar: ölçü çizgili görsel kaldırıldı: 12; CAD görünümlü görsel kaldırıldı: 4; kesit görselin yerine tam görünüş konan: 0; bayrakla tutulan kesit görsel: 61 (farklı dosya).

`ornek_1.jpg` ve `ornek_2.jpg` düzeltme sonrası **tüm 61 farklı görseli** gösteriyor (* = aynı tip görsel).

## Ana kategori dağılımı
| kategori | adet |
|---|---|
| RULMAN>OYNAK MAKARALI RULMANLAR | 1251 |
| RULMAN>SABİT BİLYALI RULMANLAR>TEK SIRALI SABİT BİLYALI RULMANLAR | 1081 |
| RULMAN>AÇISAL TEMASLI RULMANLAR | 320 |
| RULMAN>KONİK MAKARALI RULMANLAR>30000 SERİSİ KONİK MAKARALI RULMANLAR | 309 |
| RULMAN>OYNAK BİLYALI RULMANLAR | 274 |
| RULMAN>EKSENEL BİLYALI RULMANLAR (BÜTE)>EKSENEL BİLYALI RULMANLAR | 186 |
| RULMAN>EKSENEL MAKARALI VE İĞNELİ RULMANLAR | 62 |
| (boş) | 54 |
| RULMAN>MİNYATÜR RULMANLAR | 50 |
| RULMAN>SABİT BİLYALI RULMANLAR>ÇİFT SIRALI SABİT BİLYALI RULMANLAR | 32 |
| RULMAN>İĞNELİ RULMANLAR | 9 |

## Tüm kategori atamaları (ikincil dahil)
| kategori | adet |
|---|---|
| RULMAN>OYNAK MAKARALI RULMANLAR | 1251 |
| RULMAN>SABİT BİLYALI RULMANLAR>TEK SIRALI SABİT BİLYALI RULMANLAR | 1131 |
| RULMAN>AÇISAL TEMASLI RULMANLAR | 320 |
| RULMAN>KONİK MAKARALI RULMANLAR>30000 SERİSİ KONİK MAKARALI RULMANLAR | 309 |
| RULMAN>OYNAK BİLYALI RULMANLAR | 274 |
| RULMAN>EKSENEL BİLYALI RULMANLAR (BÜTE)>EKSENEL BİLYALI RULMANLAR | 212 |
| RULMAN>EKSENEL MAKARALI VE İĞNELİ RULMANLAR | 62 |
| RULMAN>MİNYATÜR RULMANLAR | 50 |
| RULMAN>SABİT BİLYALI RULMANLAR>ÇİFT SIRALI SABİT BİLYALI RULMANLAR | 32 |
| RULMAN>İĞNELİ RULMANLAR | 9 |

İkincil kategori: iç çapı 10 mm altı sabit bilyalılar MİNYATÜR + TEK SIRALI SABİT; eksenel açısal temaslılar AÇISAL TEMASLI + EKSENEL BİLYALI.

## yeni_kategori_onerileri
- `RULMAN>SABİT BİLYALI RULMANLAR>ÇİFT SIRALI SABİT BİLYALI RULMANLAR` – 32 ürün (FAG 42xx/43xx çift sıralı sabit bilyalılar; mevcut ağaçta sadece tek sıralı var).
- `RULMAN MONTAJ ALETLERİ` – 1 ürün (BETEX IMPACT-33 çakma seti; şimdilik kategorisiz bırakıldı).

## Bayrak türleri
| bayrak | adet |
|---|---|
| kesit gorsel | 2803 |
| Üreticinin bu ürün için yalnızca çizim tipi görseli var | 662 |
| Bu kod üretici kataloğunda birebir bulunamadı | 439 |
| Aynı conta/kapak/kafes tipinde doğru görsel bulunamadı | 100 |
| Üretici kataloğunda kayıt bulunamadı | 63 |
| Doğru görsel bulunamadı | 63 |
| Kategori belirlenemedi | 53 |
| Tip yalnızca tedarikçi notundaki koddan belirlendi | 9 |
| Kategori önerisi | 1 |

## Birebir gerçek fotoğraf araması
- Schaeffler görsel sunucusunda her ürün görselinin farklı boyutları (_a … _f) denendi. Hepsi aynı kesit render çıktı, başka açı ya da fotoğraf yok.
- Schaeffler ürün sayfaları sunucu hatası veriyor. Medya arşivindeki fotoğraflar seri/tip tanıtım fotoğrafı; belirli bir koda bağlı değil, bu yüzden birebir sayılmadı.
- Bayi sayfalarındaki fotoğraflar ya üreticinin aynı render'ı, ya filigranlı ya da kopyalanması yasak (ör. "copying prohibited" notu). Kullanılmadı.
- Sonuç: gerçek fotoğrafla değiştirilen kesit görsel 0, birebire yükseltilen aynı tip görsel 0. Kesit görseller "kesit gorsel" bayrağıyla kaldı.

## İkinci görsel turu (derin arama)
- Taranan kaynaklar: Schaeffler katalog araması, görsel sunucusunun bütün boyut varyantları, Schaeffler bölge sitesi ürün sayfaları (galeri ve TECH görselleri), Schaeffler medya arşivi, resmi Schaeffler distribütörü ve bayi sayfaları, Wikimedia Commons.
- Bulgular: Schaeffler'de ürün başına tek galeri görseli var. Ek TECH görselleri ölçü çizgili çizim. Resmi distribütörün gerçek fotoğraflarında distribütör filigranı var; bayilerde ya aynı render, ya filigranlı görsel, ya da farklı ürün görseli var. Commons'ta aynı yapıda (aynı kafes/conta) FAG fotoğrafı yok.
- Sonuç: birebir gerçek fotoğrafa yükseltilen 0, yeni aynı tip görsel 0, kesit görselle doldurulan 0.

Görseli hâlâ olmayan ürünler (yok), seri/tipe göre:

| sebep | seri/tip | adet |
|---|---|---|
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Self-aligning ball bearing #..-TVH, plastic cage | 125 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Axial deep groove ball bearing #, single direction, steel sheet metal cage | 68 |
| Kod üretici kataloğunda yok (eski/eksik kod); tip doğrulanamadığı için görsel konamadı |  | 63 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Spherical roller bearings #..-E#, main dimensions to DIN #-# | 60 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Self-aligning ball bearing #..-K-TVH, tapered bore taper #:#, plastic cage | 51 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Barrel roller bearings #, main dimensions to DIN #-# | 49 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Self-aligning ball bearing #..-M, solid brass cage | 40 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Axial deep groove ball bearing #, double direction, steel sheet metal cage | 36 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Axial deep groove ball bearing #..-MP, single direction, solid brass cage | 35 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Spherical roller bearings #..-E#-K, main dimensions to DIN #-#, with tapered bore, taper # | 30 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Self-aligning ball bearing #..-#RS-TVH, seals, plastic cage | 30 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Axial angular contact ball bearings #, double direction, separable, restricted tolerances | 26 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Barrel roller bearing #..-MB | 18 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Deep groove ball bearing #..-BB-TVH, double row, plastic cage | 17 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 223xx | 15 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Deep groove ball bearing #..-B-TVH, double row, plastic cage | 15 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 230xx | 13 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Axial deep groove ball bearing #, single direction, with spherical housing washer, steel s | 12 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 231xx | 11 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 232xx | 11 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Self-aligning ball bearing #..-K-#RS-TVH, tapered bore taper #:#, seals, plastic cage | 9 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 618xx | 9 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 222xx | 8 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Axial deep groove ball bearing #, double direction, with spherical housing washer, steel s | 7 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 600xx | 6 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 240xx | 5 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 321xx | 5 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 331xx | 5 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 620xx | 5 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 630xx | 5 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Spherical roller bearings #..-K, main dimensions to DIN #-#, with tapered bore, taper #:# | 4 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 380xx | 4 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 624xx | 4 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 161xx | 3 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 322xx | 3 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 609xx | 3 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 130xx | 2 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 203xx | 2 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 627xx | 2 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 108xx | 1 |
| Üreticide bu seri/tip için yalnızca ölçü çizgili çizim veya CAD görseli var; fotoğraf gibi görünen resmi görsel yok | Barrel roller bearing #..-K-MB | 1 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 233xx | 1 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 320xx | 1 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 607xx | 1 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 608xx | 1 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 619xx | 1 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 625xx | 1 |
| Katalogda birebir yok; aynı ana kodda aynı conta/kafes tipinde görsel yok | 626xx | 1 |

## Ölçü çizgisi temizleme denemesi
- 12 ölçü çizgili görselin büyük boyutlu (1200 px) halleri indirildi. 21307/22308 tipi iki görsel turkuaz/CAD görünümlü olduğu için baştan dışarıda bırakıldı; kalan 10 görsel temizlendi.
- Gövde dışındaki çizgiler, oklar ve harfler (D, d, B, T) temiz silindi. Ancak bu görsellerin hepsinde d/D ölçü uzatma çizgileri rulman gövdesinin üzerinden geçiyor, T/B çizgileri de halka kenarına teğet gidiyor.
- Büyütülmüş kontrolde gövde üzerinde çizgi kalıntıları ve silinen kenar çizgileri (beyaz yırtıklar) görüldü (`temizleme_yakin.png`, `temizleme_denemesi.jpg`). Kural gereği ("ürüne zarar vermeden temizlenemiyorsa kullanma") hiçbiri kullanılmadı.
- Aynı seri ve birebir aynı yapıda gerçekçi görsel (B adımı): bu tiplerde Schaeffler'in bütün kayıtları aynı çizim görselini kullanıyor; parçada ya da resmi kaynaklarda uygun görsel yok. Yeni aynı tip görsel: 0.
- Sonuç: temizlenip kullanılan 0, kapsanan ürün 0, görselsiz ürün 825 (dağılım yukarıdaki tabloda).

## Ortak görsel havuzu (parça 04–07)
- 05, 06 ve 07 dallarındaki görselli 7425 ürün (FAG 3151, INA 4274) tarandı. Görselsiz her ürün için aynı marka, aynı seri, aynı ek (conta/kapak, kafes, delik) arandı; sadece boşluk (C3/C4) farkı kabul edildi.
- Eşleşen: FAG 6305-M ve 6305-M-C3 → 6307-M görseli (aynı 63 serisi, açık, masif pirinç kafes). Aynı tip + kesit bayraklı.
- Reddedilen: 607 ve 623–627 (açık ve -2Z) minyatürleri için sadece 634/635 görseli var. Bunlar 63 serisi, bizimkiler 60/62 serisi; seri aynı olmadığı için kullanılmadı (9 ürün).
- Diğer parçalarda oynak bilyalı, eksenel bilyalı, oynak makaralı, fıçı makaralı, eksenel açısal temaslı ve çift sıralı sabit bilyalı serilerinin hiçbirinde görsel yok.
- Görselsiz ürün: 825 → 823.

## Çok derin arama – 1. ilerleme
- Oynak bilyalı ..-TVH (açık, silindirik delik, poliamid kafes): 125 ürün. Kaynak: Alman FAG bayisinin filigransız gerçekçi kesit görseli. Aynı tip + kesit bayraklı.
- Tek yönlü eksenel bilyalı 511–514xx (düz pullar, sac çelik kafes): 68 ürün. Kaynak: Alman bayide "FAG" adıyla yayınlanan filigransız gerçek ürün fotoğrafı; arka planı beyazlatıldı. Aynı tip bayraklı.
- Oynak makaralı ..-E1 (açık, silindirik delik, çelik kafes): 60 ürün. Kaynak: filigransız resmi kesit render'ı. Aynı tip + kesit bayraklı.
- Reddedilenler: filigranlı Alman bayi fotoğrafı (22210-E1); kutusu görünen fotoğraf; markası belli olmayan oynak bilyalı fotoğrafı.
- Görselsiz ürün: 823 → 570.

## Çok derin arama – 2. ilerleme
- Oynak bilyalı ..-2RS-TVH (iki tarafı contalı, poliamid kafes): 30 ürün. Avusturyalı FAG/INA bayisinin filigransız resmi kesit görseli. Aynı tip + kesit bayraklı.
- Çift sıralı sabit bilyalı 42/43..-B-TVH: 15 ürün. Aynı bayinin filigransız resmi kesit görseli. Aynı tip + kesit bayraklı.
- Fıçı makaralı 202/203..-TVP (poliamid kafes): 36 ürün. Alman bayide "FAG" adıyla yayınlanan gerçek ürün fotoğrafı; arka plan beyazlatıldı. Aynı tip bayraklı.
- Reddedilen: aynı bayideki eksenel bilyalı görseli (ölçü çizgili çizim); başka bayide 20210-TVP için konan farklı (contalı) rulman görseli.
- Görselsiz ürün: 570 → 489.

## Çok derin arama – 3. ilerleme
- Oynak bilyalı ..-K-TVH (açık, konik delik, poliamid kafes): 51 ürün. Avusturyalı FAG/INA bayisinin bu ürünlerde kullandığı filigransız resmi kesit görseli. Konik delik görselde ayırt edilmiyor; aynı tip + kesit bayraklı.
- Reddedilen: aynı bayinin "konik" görselleri (ölçü çizgili çizim). Oynak makaralı E1-K görseli çelik kafesli; görselsiz kalan E1-XL-K-TVPB ürünleri poliamid kafesli olduğu için kullanılmadı.
- Görselsiz ürün: 489 → 438.

## Aynı tip görsel denetimi (ürün üzerinde farklı kod/ölçü, kadraj, renk/malzeme)
- 41 farklı aynı tip görsel tek tek incelendi. Hiçbirinde ürün üzerinde okunabilir kod veya ölçü yok. Hepsi kadrajın içinde ve ortalı.
- Düzeltilen: 1 görsel / 60 ürün. Oynak makaralı E1 görseli çelik sac kafesli, ama kullanıldığı 230/231/232..-E1-XL-TVPB ürünleri poliamid kafesli. Görsel kaldırıldı; bu ürünler görselsiz bırakıldı ve bayraklandı.
- Görselsiz ürün: 438 → 498.

## Çok derin arama – 4. ilerleme
- Oynak makaralı ..-E1-XL-TVPB ve ..-E1-XL-K-TVPB (açık, siyah poliamid kafes): 119 ürün (59'u konik delikli). Görsel, bir Alman FAG bayisinin filigransız tam görünüş fotoğrafı. Ürün üzerinde kod okunmuyor. Hepsi aynı tip olarak bayraklı; konik delikli ürünlerin bayrağına konik deliğin görselde ayırt edilmediği yazıldı.
- Görselsiz ürün: 498 → 379.

## Çok derin arama – 5. ilerleme
- Çift yönlü eksenel bilyalı 522–524xx: 36 ürün. Kaynak bir Alman FAG bayisinin filigransız fotoğrafı (sökülmüş görünüş, kod okunmuyor).
- Fıçı makaralı 202/203xx-MB ve -K-MB (pirinç kafes): 33 ürün. Kaynak aynı bayinin filigransız fotoğrafı.
- Reddedilenler: üzerinde "SAMPLE" yazan görseller (MP pirinç kafesli eksenel, 2344xx, 20217-MB). 2305-M sayfasındaki farklı ürün (geniş iç bilezikli) görseli. Pirinç kafesi olduğu halde görselde pirinç görünmeyen MB1 görseli. 532/533xx için küresel yataklı pul görselde ayırt edilemediği için o görsel de kullanılmadı.
- Görselsiz ürün: 379 → 310.

## Çok derin arama – 6. ilerleme
- Çift sıralı sabit bilyalı 42/43..-BB-TVH: 17 ürün. Oynak bilyalı ..-M (pirinç kafes): 40 ürün. Oynak bilyalı ..-K-2RS-TVH: 9 ürün. Üçü de aynı Alman FAG bayisinin filigransız tam görünüş fotoğrafı; ürün üzerinde kod okunmuyor.
- Görselsiz ürün: 310 → 244.

## Çok derin arama – 7. ilerleme
- Sabit bilyalı ..-MA (dış bilezik kılavuzlu pirinç kafes): 9 ürün. Sabit bilyalı ..-M (pirinç kafes): 3 ürün. Görseller aynı Alman FAG bayisinin filigransız fotoğrafları.
- Reddedilen: 532/533 ve 542/543xx eksenel bilyalı (küresel yataklı pullu). Bayi bu kodlarda düz pullu genel görseli kullanıyor (54307 görseli 52210 ile birebir aynı), küresel pul görünmüyor. Bu 19 ürün görselsiz kaldı.
- Görselsiz ürün: 244 → 232.

## Çok derin arama – 8. ilerleme
- Çift sıralı eğik bilyalı 32/33..-M (açık, pirinç kafes): 12 ürün. Görsel aynı Alman FAG bayisinin filigransız fotoğrafı.
- Reddedilen: 2344xx-M-SP, 32/33xx açık (çelik kafes) ve 23180-BEA-MB1 görsellerinde "SAMPLE" yazısı var. 22256-BEA-XL-MB1 ve 23936-S-MB görselleri aynı genel resim ve kafes pirinç görünmüyor. 3312-B-2RSR-TVH görselinde mavi conta var, renk doğrulanamadı.
- Görselsiz ürün: 232 → 220.

## Çok derin arama – 9. ilerleme
- Sabit bilyalı 607 ve 609-HLC (açık, çelik sac kafes): 2 ürün. Görsel aynı bayinin 607 sayfasındaki filigransız fotoğraf; bayi aynı tipte genel resim kullandığı için "aynı tip" olarak işaretlendi.
- 623–627 açık minyatürler 62 serisinden. Seri farkı yüzünden bu görsel onlara verilmedi.
- Görselsiz ürün: 220 → 218.

## Çok derin arama – 10. ilerleme
- Taranan ek kaynaklar: Çin pazaryeri ve bayi sayfaları (234420-M-SP), Kanada/ABD bayileri (51130-MP), Alman çevrim içi FAG mağazası ve Misumi (22240-BEA-XL-MB1).
- Reddedilenler: 51130/51148-MP fotoğrafları rulmanı kutunun üstünde gösteriyor ve iki kodda da aynı genel fotoğraf kullanılmış. 22238-BE-XL render'ında kafes çelik, MB1 (pirinç) ürünlere uymuyor. Çin sitelerinde ya görsel yok ya da sitenin filigranı var.
- Yeni görsel: 0. Görselsiz ürün 218.

## Yakın tip önerileri (uygulanmadı, sahibin onayını bekliyor)
- Dosya: `yakin_tip_onerileri.jsonl`, 56 ürün. Her satırda id, stok_kodu, önerilen görsel/kaynak ve farkın kısa açıklaması var.
  - 623–627 açık minyatür: 5 ürün (607 görseli, seri farkı)
  - 3312-B-2RSR-TVH: 2 ürün (conta rengi doğrulanamadı)
  - 532/533/542/543xx: 19 ürün (görselde küresel pul görünmüyor)
  - 222/223xx-BEA-XL-MB1: 22 ürün ve 239/240xx-S-MB: 8 ürün (görselde pirinç kafes belirgin değil)

## Çok derin arama – 11. ilerleme (seri bazında bakılan kaynaklar)
- 511–514xx-MP: Amazon (51120 çelik kafes, MP değil), Rus bayi sayfası (görsel yok), Kanada/İngiltere bayileri (rulman kutu üstünde, aynı genel fotoğraf). Uygun görsel yok.
- 2344xx-M-SP: İngiltere bayisinin genel fotoğrafı gerçek ve pirinç kafesli, ama halka üzerinde "234487..-SP" yazısı okunuyor. Kod çeliştiği için kullanılmadı. Diğer görsel ölçü çizgili ve filigranlı çizim. İspanya bayisi ve Çin bayi sayfalarında görsel yok ya da filigranlı.
- 32/33xx: Amazon/neeep "3310-BD-XL" fotoğrafında siyah poliamid kafes görünüyor, BD serisi ise çelik sac kafesli. Başlık ile görsel çeliştiği ve FAG markası görselde görünmediği için kullanılmadı. MRO ve ap.cool sayfalarında görsel çekilemedi.
- 222/223xx-MB1 ve 239/240xx-S-MB: Misumi, Alman FAG mağazası (BE-XL çelik kafes render'ı), Çin bayi sayfaları, Gürcistan ve Hong Kong bayileri. Pirinç kafesi görünen FAG fotoğrafı bulunamadı.
- 532/533/543xx: Kanada/ABD bayileri, SKF sayfası (marka farklı, kullanılamaz), Çin görsel sitesi. Küresel pulu görünen FAG fotoğrafı yok.
- Tersine görsel arama: SAMPLE yazılı görseller bayinin kendi çekimi. Bulunan kopyalar yine aynı bayiden geliyor, temiz asıl bulunamadı.
- Yeni görsel: 0. Görselsiz ürün 218.
