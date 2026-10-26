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
