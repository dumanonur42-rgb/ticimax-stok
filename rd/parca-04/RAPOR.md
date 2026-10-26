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
