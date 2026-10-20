# Lineer ailesi – teknik çizim raporu

## Alt tipler ve çizimler
| Alt tip (`sub`) | Ürünler | Çizim | Gerekli ölçüler (yoksa `draw` → null) |
|---|---|---|---|
| `arabaH` – dar/yüksek araba (HGH, QHH, HGL…) | LİNEER ARABALAR | Kesit A-A (taranmış gövde + ters taralı ray profili, 4 sıra bilya, dönüş kanalları, dişli delikler) + yan görünüş (gövde, uç kapak/keçe, gres nipeli, kırık uçlu ray, gizli delikler, kesit izi) | W, H, H1, N, B, C, L, L1 (+ isteğe bağlı Vida M×l) |
| `arabaW` – geniş flanşlı araba (HGW, QHW…) | LİNEER ARABALAR | Flanşlı kesit (flanş + dar gövde, flanştan geçen dişli delikler) + yan görünüş | W, H, H1, N, B, C, L, L1 (+ Vida M) |
| `ray` – HGR raylar | LİNEER RAYLAR | Profil kesiti + yan görünüş (havşalı delikler, P aralığı) | WR, HR, P |
| `lm` / `lmf` / `lmk` – düz / yuvarlak flanşlı (LMEF) / kare flanşlı (LMEK) lineer rulman | LMEF, LMEK SERİSİ | Ön görünüş (bilya sıraları, flanş delikleri) + kesit A-A (taranmış zarf, flanş, bilyalar) | dr, D, L (+ flanş Df veya K ve t) |
| `sce` / `sbr` – kapalı / açık yataklı lineer rulman | SCE, SBR SERİSİ | Ön görünüş (SBR'de açık ağız) + kesit | dr, W, H, h, L |
| `sk` – dikey mil tutucu | MİL TUTUCU (SK) | Ön görünüş (yarık, bağlantı delikleri) + kesit | dr, W, H, h, T |
| `shf` – flanşlı mil tutucu | MİL TUTUCU (SHF) | Üst görünüş + yarım kesit | dr, D, W, H, T |
| `bkbf` – vidalı mil uç yatağı (BK sabit / BF serbest) | VİDALI MİL UÇ YATAĞI | Ön görünüş + kesit (BK'da çift rulman) | dr, W, H, h, B |
| `mil` – krom kaplı mil | KROM KAPLI İNDÜKSİYONLU MİLLER | Kırık görünüş | dr, Lm |

Ölçü etiketleri sayfadaki "Ürün Özellikleri" etiketinden okunur: parantez içindeki harf anahtar olur (ör. `Genişlik (W)` → `W`, `H1`, `N`, `B`, `C`, `L1`); `Mil Çapı` → `dr`; `Vida (M x l)` / `Vida (M)` → bağlantı vidası notu (`4-M5×6`). Değeri "sayı mm" olmayan alanlar (yük, kg) alınmaz.
Ray genişliği (W−2N) ve ray profili, kapak/keçe, bilya gibi detaylar yalnızca orantı için çizilir; üzerlerine sayı yazılmaz.

## Kapsam sayıları (ölçülen, tamamı tarandı)
`products.json` (13.103 URL) + kategori sayfası `/lIneer` ("180 Ürün") → 180 ürün sayfasının hepsi tarayıcıyla açıldı (`fixtures/lineer.json`, 180 ürün + başka ailelerden 12 negatif örnek).

| Kategori (breadcrumb) | Ürün | Çizim için ölçü sayfada var |
|---|---|---|
| LİNEER ARABALAR | 73 | 30 (HGH 15 CA … HGW 65 HC, `-18294`…`-18323`) |
| LİNEER RAYLAR | 16 | 0 |
| LMEF SERİSİ | 16 | 0 |
| LMEK SERİSİ | 16 | 0 |
| SCE SERİSİ | 16 | 0 |
| SBR SERİSİ | 7 | 0 |
| MİL TUTUCU (SK 10, SHF 9) | 19 | 0 |
| VİDALI MİL UÇ YATAĞI (BK/BF) | 16 | 0 |
| KROM KAPLI İNDÜKSİYONLU MİLLER | 1 | 0 |
| **Toplam** | **180** | **30** |

Ölçü olmayan 150 üründe sayfada yalnız model/seri, `Mil Çapı` ve tip bilgisi var; 150'sinin hepsinde tek fotoğraf var (ürün resmi, ölçü tablosu yok). Bu yüzden `draw` null döner, çizim çıkmaz. Çizimleri hazır; ölçü tablosu siteye/fotoğrafa eklendiğinde kendiliğinden çıkar.

## Fotoğraf okuması
`data/lineer.json` boş (`{}`): çizim çıkan 30 ürünün tüm ölçüleri sayfanın "Ürün Özellikleri" alanında var. Bu 30 ürünün 2. fotoğrafı HIWIN ölçü tablosu; kontrol için açıldı (örnekler: HGH 20 CA, HGW 20 CC) ve sayfa değerleriyle aynı. Not: HGW tablo görselinde L ile L1 sütun başlıkları yer değiştirmiş görünüyor; sayfadaki değerler (L > L1) kullanıldı. 2. fotoğraf adresleri:
- `/hgh-15-ca-lineer-araba-18294` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgh-15-ca-lineer-araba-ccc-bf.png
- `/hgh-20-ca-lineer-araba-18295` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgh-20-ca-lineer-araba-d6bd-4.png
- `/hgh-20-ha-lineer-araba-18296` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgh-20-ha-lineer-araba-bca5b6.png
- `/hgh-25-ca-lineer-araba-18297` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgh-25-ca-lineer-araba-51c18f.png
- `/hgh-25-ha-lineer-araba-18298` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgh-25-ha-lineer-araba-4eb269.png
- `/hgh-30-ca-lineer-araba-18299` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgh-30-ca-lineer-araba-7-6d5f.png
- `/hgh-30-ha-lineer-araba-18300` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgh-30-ha-lineer-araba-59c9fc.png
- `/hgh-35-ca-lineer-araba-18301` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgh-35-ca-lineer-araba-38549f.png
- `/hgh-35-ha-lineer-araba-18302` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgh-35-ha-lineer-araba-e53-43.png
- `/hgh-45-ca-lineer-araba-18303` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgh-45-ca-lineer-araba-edf164.png
- `/hgh-45-ha-lineer-araba-18304` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgh-45-ha-lineer-araba-1da558.png
- `/hgh-55-ca-lineer-araba-18305` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgh-55-ca-lineer-araba-b-044f.png
- `/hgh-55-ha-lineer-araba-18306` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgh-55-ha-lineer-araba-edfb8-.png
- `/hgh-65-ca-lineer-araba-18307` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgh-65-ca-lineer-araba-719-45.png
- `/hgh-65-ha-lineer-araba-18308` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgh-65-ha-lineer-araba-4a07-8.png
- `/hgw-15-cc-lineer-araba-18309` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgw-15-cc-lineer-araba-1f5739.png
- `/hgw-20-cc-lineer-araba-18310` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgw-20-cc-lineer-araba-9ce781.png
- `/hgw-20-hc-lineer-araba-18311` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgw-20-hc-lineer-araba-01-3f6.png
- `/hgw-25-cc-lineer-araba-18312` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgw-25-cc-lineer-araba-4a1a-8.png
- `/hgw-25-hc-lineer-araba-18313` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgw-25-hc-lineer-araba-4c98bb.png
- `/hgw-30-cc-lineer-araba-18314` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgw-30-cc-lineer-araba-ea9720.png
- `/hgw-30-hc-lineer-araba-18315` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgw-30-hc-lineer-araba-0c1c8e.png
- `/hgw-35-cc-lineer-araba-18316` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgw-35-cc-lineer-araba-e40995.png
- `/hgw-35-hc-lineer-araba-18317` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgw-35-hc-lineer-araba-4e79b4.png
- `/hgw-45-cc-lineer-araba-18318` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgw-45-cc-lineer-araba-ab9e5c.png
- `/hgw-45-hc-lineer-araba-18319` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgw-45-hc-lineer-araba--be73-.png
- `/hgw-55-cc-lineer-araba-18320` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgw-55-cc-lineer-araba-0d140f.png
- `/hgw-55-hc-lineer-araba-18321` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgw-55-hc-lineer-araba-19-79f.png
- `/hgw-65-cc-lineer-araba-18322` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgw-65-cc-lineer-araba-14-414.png
- `/hgw-65-hc-lineer-araba-18323` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/hgw-65-hc-lineer-araba-26ef99.png
- `/konik-kilit-200-b-tipi-01847-17410` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/konik-kilit-200-b-tipi-01847-9-9168.jpeg
- `/ymn-yatakli-rulman-ucp-208-16683` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-208-26cc-4.png
- `/akl-04-ymn-minyatur-eksenel-bilyali-rulman-bute-4x10x4-16769` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/akl-04-minyatur-eksenel-bilyali-rulman-242-66.png
- `/rax-705-kombine-igneli-rulman-17716` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/rax-705-kombine-igneli-rulman-7-4298.jpeg
- `/302040-ymn-konik-burc-12729` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/302040-konik-burc-15-a2a.png
- `/ymn-rulman-mansonu-h-205-15780` — https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/rulman-mansonu-h-205-135430.png

## Emin olunamayanlar / notlar
- HIWIN ZAC eski kayıtları (43 araba), raylar, LMEF/LMEK, SCE, SBR, SK, SHF, BK/BF, krom mil: sayfada ölçü yok → çizim yok (bilerek).
- BK/BF vidalı mil yatakları ve krom mil sitede LİNEER kategorisinde olduğu için bu aileye alındı; başka bir aile de bunları sahiplenirse `match` çakışmasına bakılmalı.
- Çizimde ray profili/bilya yerleri temsilidir (ölçü yazılmaz); flanş kalınlığı için HGW'de sayfadaki T1 yalnız orantıda kullanıldı.

## match sonuçları (tüm fixture'lar)
| # | Yol | Başlık | Alt tip | match | draw |
|---|---|---|---|---|---|
| 1 | `/hiwin-hgh15-ca-zac-dar-araba-lineer-araba-15555` | Hiwin HGH15 CA ZAC Dar Araba (Lineer Araba) | arabaH | true | null |
| 2 | `/hiwin-hgw15-cc-zac-genis-araba-lineer-araba-15556` | Hiwin HGW15 CC ZAC Geniş Araba (Lineer Araba) | arabaW | true | null |
| 3 | `/hiwin-hgl15-ca-zac-dar-alcak-araba-lineer-araba-15557` | Hiwin HGL15 CA ZAC Dar Alçak Araba (Lineer Araba) | arabaH | true | null |
| 4 | `/hiwin-qhh15-ca-zac-plastik-kafesli-dar-araba-lineer-araba-15558` | Hiwin QHH15 CA ZAC Plastik Kafesli Dar Araba (Lineer Araba) | arabaH | true | null |
| 5 | `/hiwin-qhw15-cc-zac-plastik-kafesli-genis-araba-lineer-araba-15559` | Hiwin QHW15 CC ZAC Plastik Kafesli Geniş Araba (Lineer Araba) | arabaW | true | null |
| 6 | `/hiwin-hgh20-ca-zac-dar-araba-lineer-araba-15560` | Hiwin HGH20 CA ZAC Dar Araba (Lineer Araba) | arabaH | true | null |
| 7 | `/hiwin-hgw20-cc-zac-genis-araba-lineer-araba-15561` | Hiwin HGW20 CC ZAC Geniş Araba (Lineer Araba) | arabaW | true | null |
| 8 | `/hiwin-hgh20-ha-zac-dar-uzun-araba-lineer-araba-15562` | Hiwin HGH20 HA ZAC Dar Uzun Araba (Lineer Araba) | arabaH | true | null |
| 9 | `/hiwin-hgw20-hc-zac-genis-uzun-araba-lineer-araba-15563` | Hiwin HGW20 HC ZAC Geniş Uzun Araba (Lineer Araba) | arabaW | true | null |
| 10 | `/hiwin-qhh20-ca-zac-plastik-kafesli-dar-araba-lineer-araba-15564` | Hiwin QHH20 CA ZAC Plastik Kafesli Dar Araba (Lineer Araba) | arabaH | true | null |
| 11 | `/hiwin-qhh20-ha-zac-plastik-kafesli-dar-uzun-araba-lineer-araba-15565` | Hiwin QHH20 HA ZAC Plastik Kafesli Dar Uzun Araba (Lineer Araba) | arabaH | true | null |
| 12 | `/hiwin-qhw20-cc-zac-plastik-kafesli-genis-araba-lineer-araba-15566` | Hiwin QHW20 CC ZAC Plastik Kafesli Geniş Araba (Lineer Araba) | arabaW | true | null |
| 13 | `/hiwin-hgh25-ca-zac-dar-araba-lineer-araba-15567` | Hiwin HGH25 CA ZAC Dar Araba (Lineer Araba) | arabaH | true | null |
| 14 | `/hiwin-hgw25-cc-zac-genis-araba-lineer-araba-15568` | Hiwin HGW25 CC ZAC Geniş Araba (Lineer Araba) | arabaW | true | null |
| 15 | `/hiwin-hgh25-ha-zac-dar-uzun-araba-lineer-araba-15569` | Hiwin HGH25 HA ZAC Dar Uzun Araba (Lineer Araba) | arabaH | true | null |
| 16 | `/hiwin-hgw25-hc-zac-genis-uzun-araba-lineer-araba-15570` | Hiwin HGW25 HC ZAC Geniş Uzun Araba (Lineer Araba) | arabaW | true | null |
| 17 | `/hiwin-hgl25-ca-zac-dar-alcak-araba-lineer-araba-15571` | Hiwin HGL25 CA ZAC Dar Alçak Araba (Lineer Araba) | arabaH | true | null |
| 18 | `/hiwin-hgl25-ha-zac-dar-alcak-uzun-araba-lineer-araba-15572` | Hiwin HGL25 HA ZAC Dar Alçak Uzun Araba (Lineer Araba) | arabaH | true | null |
| 19 | `/hiwin-qhh25-ca-zac-plastik-kafesli-dar-araba-lineer-araba-15573` | Hiwin QHH25 CA ZAC Plastik Kafesli Dar Araba (Lineer Araba) | arabaH | true | null |
| 20 | `/hiwin-qhw25-cc-zac-plastik-kafesli-genis-araba-lineer-araba-15574` | Hiwin QHW25 CC ZAC Plastik Kafesli Geniş Araba (Lineer Araba) | arabaW | true | null |
| 21 | `/hiwin-hgh30-ca-z0c-dar-araba-lineer-araba-15575` | Hiwin HGH30 CA Z0C Dar Araba (Lineer Araba) | arabaH | true | null |
| 22 | `/hiwin-hgw30-cc-z0c-genis-araba-lineer-araba-15576` | Hiwin HGW30 CC Z0C Geniş Araba (Lineer Araba) | arabaW | true | null |
| 23 | `/hiwin-hgh30-ha-z0c-dar-uzun-araba-lineer-araba-15577` | Hiwin HGH30 HA Z0C Dar Uzun Araba (Lineer Araba) | arabaH | true | null |
| 24 | `/hiwin-hgw30-hc-z0c-genis-uzun-araba-lineer-araba-15578` | Hiwin HGW30 HC Z0C Geniş Uzun Araba (Lineer Araba) | arabaW | true | null |
| 25 | `/hiwin-hgl30-ca-zac-dar-alcak-araba-lineer-araba-15579` | Hiwin HGL30 CA ZAC Dar Alçak Araba (Lineer Araba) | arabaH | true | null |
| 26 | `/hiwin-hgl30-ha-zac-dar-alcak-uzun-araba-lineer-araba-15580` | Hiwin HGL30 HA ZAC Dar Alçak Uzun Araba (Lineer Araba) | arabaH | true | null |
| 27 | `/hiwin-qhh30-ca-zac-plastik-kafesli-dar-araba-lineer-araba-15581` | Hiwin QHH30 CA ZAC Plastik Kafesli Dar Araba (Lineer Araba) | arabaH | true | null |
| 28 | `/hiwin-qhw30-cc-zac-plastik-kafesli-genis-araba-lineer-araba-15582` | Hiwin QHW30 CC ZAC Plastik Kafesli Geniş Araba (Lineer Araba) | arabaW | true | null |
| 29 | `/hiwin-hgh35-ca-z0c-dar-araba-lineer-araba-15583` | Hiwin HGH35 CA Z0C Dar Araba (Lineer Araba) | arabaH | true | null |
| 30 | `/hiwin-hgw35-cc-z0c-genis-araba-lineer-araba-15584` | Hiwin HGW35 CC Z0C Geniş Araba (Lineer Araba) | arabaW | true | null |
| 31 | `/hiwin-hgh35-ha-z0c-dar-uzun-araba-lineer-araba-15585` | Hiwin HGH35 HA Z0C Dar Uzun Araba (Lineer Araba) | arabaH | true | null |
| 32 | `/hiwin-hgw35-hc-z0c-genis-uzun-araba-lineer-araba-15586` | Hiwin HGW35 HC Z0C Geniş Uzun Araba (Lineer Araba) | arabaW | true | null |
| 33 | `/hiwin-hgl35-ca-z0c-dar-alcak-araba-lineer-araba-15587` | Hiwin HGL35 CA Z0C Dar Alçak Araba (Lineer Araba) | arabaH | true | null |
| 34 | `/hiwin-hgl35-ha-z0c-dar-alcak-uzun-araba-lineer-araba-15588` | Hiwin HGL35 HA Z0C Dar Alçak Uzun Araba (Lineer Araba) | arabaH | true | null |
| 35 | `/hiwin-hgh45-ca-z0c-dar-araba-lineer-araba-15589` | Hiwin HGH45 CA Z0C Dar Araba (Lineer Araba) | arabaH | true | null |
| 36 | `/hiwin-hgw45-cc-z0c-genis-araba-lineer-araba-15590` | Hiwin HGW45 CC Z0C Geniş Araba (Lineer Araba) | arabaW | true | null |
| 37 | `/hiwin-hgh45-ha-z0c-dar-uzun-araba-lineer-araba-15591` | Hiwin HGH45 HA Z0C Dar Uzun Araba (Lineer Araba) | arabaH | true | null |
| 38 | `/hiwin-hgw45-hc-z0c-genis-uzun-araba-lineer-araba-15592` | Hiwin HGW45 HC Z0C Geniş Uzun Araba (Lineer Araba) | arabaW | true | null |
| 39 | `/hiwin-hgl45-ca-z0c-dar-alcak-araba-lineer-araba-15593` | Hiwin HGL45 CA Z0C Dar Alçak Araba (Lineer Araba) | arabaH | true | null |
| 40 | `/hiwin-hgl45-ha-z0c-dar-alcak-uzun-araba-lineer-araba-15594` | Hiwin HGL45 HA Z0C Dar Alçak Uzun Araba (Lineer Araba) | arabaH | true | null |
| 41 | `/hiwin-hgh55-ca-z0c-dar-araba-lineer-araba-15595` | Hiwin HGH55 CA Z0C Dar Araba (Lineer Araba) | arabaH | true | null |
| 42 | `/hiwin-hgw55-cc-z0c-genis-araba-lineer-araba-15596` | Hiwin HGW55 CC Z0C Geniş Araba (Lineer Araba) | arabaW | true | null |
| 43 | `/hiwin-hgh55-ha-z0c-dar-uzun-araba-lineer-araba-15597` | Hiwin HGH55 HA Z0C Dar Uzun Araba (Lineer Araba) | arabaH | true | null |
| 44 | `/hiwin-hgr15-r4000-c-ray-lineer-ray-15598` | Hiwin HGR15 R4000 C Ray (Lineer Ray) | ray | true | null |
| 45 | `/hiwin-hgr15-t4000-c-alttan-montajli-ray-lineer-ray-15599` | Hiwin HGR15 T4000 C Alttan Montajlı Ray (Lineer Ray) | ray | true | null |
| 46 | `/hiwin-hgr20-r4000-c-ray-lineer-ray-15600` | Hiwin HGR20 R4000 C Ray (Lineer Ray) | ray | true | null |
| 47 | `/hiwin-hgr20-r5600-c-ray-lineer-ray-15601` | Hiwin HGR20 R5600 C Ray (Lineer Ray) | ray | true | null |
| 48 | `/hiwin-hgr20-t4000-c-alttan-montajli-ray-lineer-ray-15602` | Hiwin HGR20 T4000 C Alttan Montajlı Ray (Lineer Ray) | ray | true | null |
| 49 | `/hiwin-hgr25-r4000-c-ray-lineer-ray-15603` | Hiwin HGR25 R4000 C Ray (Lineer Ray) | ray | true | null |
| 50 | `/hiwin-hgr25-r5600-c-ray-lineer-ray-15604` | Hiwin HGR25 R5600 C Ray (Lineer Ray) | ray | true | null |
| 51 | `/hiwin-hgr25-t4000-c-alttan-montajli-ray-lineer-ray-15605` | Hiwin HGR25 T4000 C Alttan Montajlı Ray (Lineer Ray) | ray | true | null |
| 52 | `/hiwin-hgr30-r4000-c-ray-lineer-ray-15606` | Hiwin HGR30 R4000 C Ray (Lineer Ray) | ray | true | null |
| 53 | `/hiwin-hgr30-r5600-c-ray-lineer-ray-15607` | Hiwin HGR30 R5600 C Ray (Lineer Ray) | ray | true | null |
| 54 | `/hiwin-hgr30-t4000-c-alttan-montajli-ray-lineer-ray-15608` | Hiwin HGR30 T4000 C Alttan Montajlı Ray (Lineer Ray) | ray | true | null |
| 55 | `/hiwin-hgr35-r5600-c-ray-lineer-ray-15609` | Hiwin HGR35 R5600 C Ray (Lineer Ray) | ray | true | null |
| 56 | `/hiwin-hgr35-t4000-c-alttan-montajli-ray-lineer-ray-15610` | Hiwin HGR35 T4000 C Alttan Montajlı Ray (Lineer Ray) | ray | true | null |
| 57 | `/hiwin-hgr45-r4000-c-ray-lineer-ray-15611` | Hiwin HGR45 R4000 C Ray (Lineer Ray) | ray | true | null |
| 58 | `/hiwin-hgr45-r5600-c-ray-lineer-ray-15612` | Hiwin HGR45 R5600 C Ray (Lineer Ray) | ray | true | null |
| 59 | `/hiwin-hgr55-r5600-c-ray-lineer-ray-15613` | Hiwin HGR55 R5600 C Ray (Lineer Ray) | ray | true | null |
| 60 | `/ymn-lineer-rulman-lmek-08-uu-16525` | LİNEER RULMAN LMEK 08 UU | lmk | true | null |
| 61 | `/ymn-lineer-rulman-lmek-10-uu-16526` | LİNEER RULMAN LMEK 10 UU | lmk | true | null |
| 62 | `/ymn-lineer-rulman-lmek-12-luu-uzun-16527` | LİNEER RULMAN LMEK 12 LUU (UZUN) | lmk | true | null |
| 63 | `/ymn-lineer-rulman-lmek-12-uu-16528` | LİNEER RULMAN LMEK 12 UU | lmk | true | null |
| 64 | `/ymn-lineer-rulman-lmek-16-luu-uzun-16529` | LİNEER RULMAN LMEK 16 LUU (UZUN) | lmk | true | null |
| 65 | `/ymn-lineer-rulman-lmek-16-uu-16530` | LİNEER RULMAN LMEK 16 UU | lmk | true | null |
| 66 | `/ymn-lineer-rulman-lmek-20-luu-uzun-16531` | LİNEER RULMAN LMEK 20 LUU (UZUN) | lmk | true | null |
| 67 | `/ymn-lineer-rulman-lmek-20-uu-16532` | LİNEER RULMAN LMEK 20 UU | lmk | true | null |
| 68 | `/ymn-lineer-rulman-lmek-25-luu-uzun-16533` | LİNEER RULMAN LMEK 25 LUU (UZUN) | lmk | true | null |
| 69 | `/ymn-lineer-rulman-lmek-25-uu-16534` | LİNEER RULMAN LMEK 25 UU | lmk | true | null |
| 70 | `/ymn-lineer-rulman-lmek-30-luu-uzun-16535` | LİNEER RULMAN LMEK 30 LUU (UZUN) | lmk | true | null |
| 71 | `/ymn-lineer-rulman-lmek-30-uu-16536` | LİNEER RULMAN LMEK 30 UU | lmk | true | null |
| 72 | `/ymn-lineer-rulman-lmek-40-luu-uzun-16537` | LİNEER RULMAN LMEK 40 LUU (UZUN) | lmk | true | null |
| 73 | `/ymn-lineer-rulman-lmek-40-uu-16538` | LİNEER RULMAN LMEK 40 UU | lmk | true | null |
| 74 | `/ymn-lineer-rulman-lmek-50-luu-uzun-16539` | LİNEER RULMAN LMEK 50 LUU (UZUN) | lmk | true | null |
| 75 | `/ymn-lineer-rulman-lmek-50-uu-16540` | LİNEER RULMAN LMEK 50 UU | lmk | true | null |
| 76 | `/ymn-lineer-rulman-lmef-08-uu-16541` | LİNEER RULMAN LMEF 08 UU | lmf | true | null |
| 77 | `/ymn-lineer-rulman-lmef-10-uu-16542` | LİNEER RULMAN LMEF 10 UU | lmf | true | null |
| 78 | `/ymn-lineer-rulman-lmef-12-luu-uzun-16543` | LİNEER RULMAN LMEF 12 LUU (UZUN) | lmf | true | null |
| 79 | `/ymn-lineer-rulman-lmef-12-uu-16544` | LİNEER RULMAN LMEF 12 UU | lmf | true | null |
| 80 | `/ymn-lineer-rulman-lmef-16-luu-uzun-16545` | LİNEER RULMAN LMEF 16 LUU (UZUN) | lmf | true | null |
| 81 | `/ymn-lineer-rulman-lmef-16-uu-16546` | LİNEER RULMAN LMEF 16 UU | lmf | true | null |
| 82 | `/ymn-lineer-rulman-lmef-20-luu-uzun-16547` | LİNEER RULMAN LMEF 20 LUU (UZUN) | lmf | true | null |
| 83 | `/ymn-lineer-rulman-lmef-20-uu-16548` | LİNEER RULMAN LMEF 20 UU | lmf | true | null |
| 84 | `/ymn-lineer-rulman-lmef-25-luu-uzun-16549` | LİNEER RULMAN LMEF 25 LUU (UZUN) | lmf | true | null |
| 85 | `/ymn-lineer-rulman-lmef-25-uu-16550` | LİNEER RULMAN LMEF 25 UU | lmf | true | null |
| 86 | `/ymn-lineer-rulman-lmef-30-luu-uzun-16551` | LİNEER RULMAN LMEF 30 LUU (UZUN) | lmf | true | null |
| 87 | `/ymn-lineer-rulman-lmef-30-uu-16552` | LİNEER RULMAN LMEF 30 UU | lmf | true | null |
| 88 | `/ymn-lineer-rulman-lmef-40-luu-uzun-16553` | LİNEER RULMAN LMEF 40 LUU (UZUN) | lmf | true | null |
| 89 | `/ymn-lineer-rulman-lmef-40-uu-16554` | LİNEER RULMAN LMEF 40 UU | lmf | true | null |
| 90 | `/ymn-lineer-rulman-lmef-50-luu-uzun-16555` | LİNEER RULMAN LMEF 50 LUU (UZUN) | lmf | true | null |
| 91 | `/ymn-lineer-rulman-lmef-50-uu-16556` | LİNEER RULMAN LMEF 50 UU | lmf | true | null |
| 92 | `/ymn-mil-tutucu-shf-10-16557` | MİL TUTUCU SHF 10 | shf | true | null |
| 93 | `/ymn-mil-tutucu-shf-12-16558` | MİL TUTUCU SHF 12 | shf | true | null |
| 94 | `/ymn-mil-tutucu-shf-16-16559` | MİL TUTUCU SHF 16 | shf | true | null |
| 95 | `/ymn-mil-tutucu-shf-20-16560` | MİL TUTUCU SHF 20 | shf | true | null |
| 96 | `/ymn-mil-tutucu-shf-25-16561` | MİL TUTUCU SHF 25 | shf | true | null |
| 97 | `/ymn-mil-tutucu-shf-30-16562` | MİL TUTUCU SHF 30 | shf | true | null |
| 98 | `/ymn-mil-tutucu-shf-35-16563` | MİL TUTUCU SHF 35 | shf | true | null |
| 99 | `/ymn-mil-tutucu-shf-40-16564` | MİL TUTUCU SHF 40 | shf | true | null |
| 100 | `/ymn-mil-tutucu-shf-50-16565` | MİL TUTUCU SHF 50 | shf | true | null |
| 101 | `/ymn-mil-tutucu-sk-08-16566` | MİL TUTUCU SK 08 | sk | true | null |
| 102 | `/ymn-mil-tutucu-sk-10-16567` | MİL TUTUCU SK 10 | sk | true | null |
| 103 | `/ymn-mil-tutucu-sk-12-16568` | MİL TUTUCU SK 12 | sk | true | null |
| 104 | `/ymn-mil-tutucu-sk-16-16569` | MİL TUTUCU SK 16 | sk | true | null |
| 105 | `/ymn-mil-tutucu-sk-20-16570` | MİL TUTUCU SK 20 | sk | true | null |
| 106 | `/ymn-mil-tutucu-sk-25-16571` | MİL TUTUCU SK 25 | sk | true | null |
| 107 | `/ymn-mil-tutucu-sk-30-16572` | MİL TUTUCU SK 30 | sk | true | null |
| 108 | `/ymn-mil-tutucu-sk-35-16573` | MİL TUTUCU SK 35 | sk | true | null |
| 109 | `/ymn-mil-tutucu-sk-40-16574` | MİL TUTUCU SK 40 | sk | true | null |
| 110 | `/ymn-mil-tutucu-sk-50-16575` | MİL TUTUCU SK 50 | sk | true | null |
| 111 | `/ymn-lineer-rulman-sbr-12-uu-16576` | LİNEER RULMAN SBR 12 UU | sbr | true | null |
| 112 | `/ymn-lineer-rulman-sbr-16-uu-16577` | LİNEER RULMAN SBR 16 UU | sbr | true | null |
| 113 | `/ymn-lineer-rulman-sbr-20-uu-16578` | LİNEER RULMAN SBR 20 UU | sbr | true | null |
| 114 | `/ymn-lineer-rulman-sbr-25-uu-16579` | LİNEER RULMAN SBR 25 UU | sbr | true | null |
| 115 | `/ymn-lineer-rulman-sbr-30-uu-16580` | LİNEER RULMAN SBR 30 UU | sbr | true | null |
| 116 | `/ymn-lineer-rulman-sbr-40-uu-16581` | LİNEER RULMAN SBR 40 UU | sbr | true | null |
| 117 | `/ymn-lineer-rulman-sbr-50-uu-16582` | LİNEER RULMAN SBR 50 UU | sbr | true | null |
| 118 | `/ymn-lineer-rulman-sce-08-uu-16583` | LİNEER RULMAN SCE 08 UU | sce | true | null |
| 119 | `/ymn-lineer-rulman-sce-10-uu-16584` | LİNEER RULMAN SCE 10 UU | sce | true | null |
| 120 | `/ymn-lineer-rulman-sce-12-uu-16585` | LİNEER RULMAN SCE 12 UU | sce | true | null |
| 121 | `/ymn-lineer-rulman-sce-12-wuu-uzun-16586` | LİNEER RULMAN SCE 12 WUU (UZUN) | sce | true | null |
| 122 | `/ymn-lineer-rulman-sce-16-uu-16587` | LİNEER RULMAN SCE 16 UU | sce | true | null |
| 123 | `/ymn-lineer-rulman-sce-16-wuu-uzun-16588` | LİNEER RULMAN SCE 16 WUU (UZUN) | sce | true | null |
| 124 | `/ymn-lineer-rulman-sce-20-uu-16589` | LİNEER RULMAN SCE 20 UU | sce | true | null |
| 125 | `/ymn-lineer-rulman-sce-20-wuu-uzun-16590` | LİNEER RULMAN SCE 20 WUU (UZUN) | sce | true | null |
| 126 | `/ymn-lineer-rulman-sce-25-uu-16591` | LİNEER RULMAN SCE 25 UU | sce | true | null |
| 127 | `/ymn-lineer-rulman-sce-25-wuu-uzun-16592` | LİNEER RULMAN SCE 25 WUU (UZUN) | sce | true | null |
| 128 | `/ymn-lineer-rulman-sce-30-uu-16593` | LİNEER RULMAN SCE 30 UU | sce | true | null |
| 129 | `/ymn-lineer-rulman-sce-30-wuu-uzun-16594` | LİNEER RULMAN SCE 30 WUU (UZUN) | sce | true | null |
| 130 | `/ymn-lineer-rulman-sce-40-uu-16595` | LİNEER RULMAN SCE 40 UU | sce | true | null |
| 131 | `/ymn-lineer-rulman-sce-40-wuu-uzun-16596` | LİNEER RULMAN SCE 40 WUU (UZUN) | sce | true | null |
| 132 | `/ymn-lineer-rulman-sce-50-uu-16597` | LİNEER RULMAN SCE 50 UU | sce | true | null |
| 133 | `/ymn-lineer-rulman-sce-50-wuu-uzun-16598` | LİNEER RULMAN SCE 50 WUU (UZUN) | sce | true | null |
| 134 | `/hgh-15-ca-lineer-araba-18294` | HGH 15 CA LİNEER ARABA | arabaH | true | çizim |
| 135 | `/hgh-20-ca-lineer-araba-18295` | HGH 20 CA LİNEER ARABA | arabaH | true | çizim |
| 136 | `/hgh-20-ha-lineer-araba-18296` | HGH 20 HA LİNEER ARABA | arabaH | true | çizim |
| 137 | `/hgh-25-ca-lineer-araba-18297` | HGH 25 CA LİNEER ARABA | arabaH | true | çizim |
| 138 | `/hgh-25-ha-lineer-araba-18298` | HGH 25 HA LİNEER ARABA | arabaH | true | çizim |
| 139 | `/hgh-30-ca-lineer-araba-18299` | HGH 30 CA LİNEER ARABA | arabaH | true | çizim |
| 140 | `/hgh-30-ha-lineer-araba-18300` | HGH 30 HA LİNEER ARABA | arabaH | true | çizim |
| 141 | `/hgh-35-ca-lineer-araba-18301` | HGH 35 CA LİNEER ARABA | arabaH | true | çizim |
| 142 | `/hgh-35-ha-lineer-araba-18302` | HGH 35 HA LİNEER ARABA | arabaH | true | çizim |
| 143 | `/hgh-45-ca-lineer-araba-18303` | HGH 45 CA LİNEER ARABA | arabaH | true | çizim |
| 144 | `/hgh-45-ha-lineer-araba-18304` | HGH 45 HA LİNEER ARABA | arabaH | true | çizim |
| 145 | `/hgh-55-ca-lineer-araba-18305` | HGH 55 CA LİNEER ARABA | arabaH | true | çizim |
| 146 | `/hgh-55-ha-lineer-araba-18306` | HGH 55 HA LİNEER ARABA | arabaH | true | çizim |
| 147 | `/hgh-65-ca-lineer-araba-18307` | HGH 65 CA LİNEER ARABA | arabaH | true | çizim |
| 148 | `/hgh-65-ha-lineer-araba-18308` | HGH 65 HA LİNEER ARABA | arabaH | true | çizim |
| 149 | `/hgw-15-cc-lineer-araba-18309` | HGW 15 CC LİNEER ARABA | arabaW | true | çizim |
| 150 | `/hgw-20-cc-lineer-araba-18310` | HGW 20 CC LİNEER ARABA | arabaW | true | çizim |
| 151 | `/hgw-20-hc-lineer-araba-18311` | HGW 20 HC LİNEER ARABA | arabaW | true | çizim |
| 152 | `/hgw-25-cc-lineer-araba-18312` | HGW 25 CC LİNEER ARABA | arabaW | true | çizim |
| 153 | `/hgw-25-hc-lineer-araba-18313` | HGW 25 HC LİNEER ARABA | arabaW | true | çizim |
| 154 | `/hgw-30-cc-lineer-araba-18314` | HGW 30 CC LİNEER ARABA | arabaW | true | çizim |
| 155 | `/hgw-30-hc-lineer-araba-18315` | HGW 30 HC LİNEER ARABA | arabaW | true | çizim |
| 156 | `/hgw-35-cc-lineer-araba-18316` | HGW 35 CC LİNEER ARABA | arabaW | true | çizim |
| 157 | `/hgw-35-hc-lineer-araba-18317` | HGW 35 HC LİNEER ARABA | arabaW | true | çizim |
| 158 | `/hgw-45-cc-lineer-araba-18318` | HGW 45 CC LİNEER ARABA | arabaW | true | çizim |
| 159 | `/hgw-45-hc-lineer-araba-18319` | HGW 45 HC LİNEER ARABA | arabaW | true | çizim |
| 160 | `/hgw-55-cc-lineer-araba-18320` | HGW 55 CC LİNEER ARABA | arabaW | true | çizim |
| 161 | `/hgw-55-hc-lineer-araba-18321` | HGW 55 HC LİNEER ARABA | arabaW | true | çizim |
| 162 | `/hgw-65-cc-lineer-araba-18322` | HGW 65 CC LİNEER ARABA | arabaW | true | çizim |
| 163 | `/hgw-65-hc-lineer-araba-18323` | HGW 65 HC LİNEER ARABA | arabaW | true | çizim |
| 164 | `/ymn-vidali-mil-yatagi-bf-10-6000-16599` | VİDALI MİL YATAĞI BF 10 (6000) | bkbf | true | null |
| 165 | `/ymn-vidali-mil-yatagi-bf-12-6001-16600` | VİDALI MİL YATAĞI BF 12 (6001) | bkbf | true | null |
| 166 | `/ymn-vidali-mil-yatagi-bf-15-6002-16601` | VİDALI MİL YATAĞI BF 15 (6002) | bkbf | true | null |
| 167 | `/ymn-vidali-mil-yatagi-bf-17-6003-16602` | VİDALI MİL YATAĞI BF 17 (6003) | bkbf | true | null |
| 168 | `/ymn-vidali-mil-yatagi-bf-20-6004-16603` | VİDALI MİL YATAĞI BF 20 (6004) | bkbf | true | null |
| 169 | `/ymn-vidali-mil-yatagi-bf-25-6205-16604` | VİDALI MİL YATAĞI BF 25 (6205) | bkbf | true | null |
| 170 | `/ymn-vidali-mil-yatagi-bf-30-6206-16605` | VİDALI MİL YATAĞI BF 30 (6206) | bkbf | true | null |
| 171 | `/ymn-vidali-mil-yatagi-bf-40-6208-16606` | VİDALI MİL YATAĞI BF 40 (6208) | bkbf | true | null |
| 172 | `/ymn-vidali-mil-yatagi-bk-10-7000-16607` | VİDALI MİL YATAĞI BK 10 (7000) | bkbf | true | null |
| 173 | `/ymn-vidali-mil-yatagi-bk-12-7001-16608` | VİDALI MİL YATAĞI BK 12 (7001) | bkbf | true | null |
| 174 | `/ymn-vidali-mil-yatagi-bk-15-7002-16609` | VİDALI MİL YATAĞI BK 15 (7002) | bkbf | true | null |
| 175 | `/ymn-vidali-mil-yatagi-bk-17-7003-16610` | VİDALI MİL YATAĞI BK 17 (7003) | bkbf | true | null |
| 176 | `/ymn-vidali-mil-yatagi-bk-20-7004-16611` | VİDALI MİL YATAĞI BK 20 (7004) | bkbf | true | null |
| 177 | `/ymn-vidali-mil-yatagi-bk-25-7205-16612` | VİDALI MİL YATAĞI BK 25 (7205) | bkbf | true | null |
| 178 | `/ymn-vidali-mil-yatagi-bk-30-7206-16613` | VİDALI MİL YATAĞI BK 30 (7206) | bkbf | true | null |
| 179 | `/ymn-vidali-mil-yatagi-bk-40-7208-16614` | VİDALI MİL YATAĞI BK 40 (7208) | bkbf | true | null |
| 180 | `/6-mm-nimet-krom-kapli-induksiyonlu-mil` | 6 MM KROM KAPLI İNDÜKSİYONLU MİL NİMET | mil | true | null |
| 181 | `/konik-kilit-200-b-tipi-01847-17410` | KONİK KİLİT 200 (B TİPİ) 018*47 | (başka aile) | false | null |
| 182 | `/ymn-kremayer-ray-m3-15302000-genislik15-mm-16489` | KREMAYER RAY M3 15*30*2000 (GENİŞLİK:15 MM) | (başka aile) | false | null |
| 183 | `/bk-12-gs-12-gs12-ymn-bosluksuz-servo-kaplin-13637` | BK 12-GS 12 (GS12) Boşluksuz Servo Kaplin | (başka aile) | false | null |
| 184 | `/ymn-yatakli-rulman-ucp-208-16683` | YATAKLI RULMAN UCP 208 | (başka aile) | false | null |
| 185 | `/nbr-yag-kecesi-20x28x5-6162` | NBR Yağ keçesi 20x28x5 | (başka aile) | false | null |
| 186 | `/6204-zz-c3-ors-rulman-11930` | 6204 ZZ C3 ORS Rulman | (başka aile) | false | null |
| 187 | `/akl-04-ymn-minyatur-eksenel-bilyali-rulman-bute-4x10x4-16769` | AKL 04 Minyatür Eksenel Bilyalı Rulman (Büte) 4x10x4 | (başka aile) | false | null |
| 188 | `/rax-705-kombine-igneli-rulman-17716` | RAX 705 KOMBİNE İĞNELİ RULMAN | (başka aile) | false | null |
| 189 | `/302040-ymn-konik-burc-12729` | 3020*40 Konik Burç | (başka aile) | false | null |
| 190 | `/ymn-rulman-mansonu-h-205-15780` | RULMAN MANŞONU H 205 | (başka aile) | false | null |
| 191 | `/471-4-beneri-dis-segman-13314` | 471 4 Beneri Dış Segman | (başka aile) | false | null |
| 192 | `/ymn-helis-pinyon-disli-m116-16226` | HELİS PİNYON DİŞLİ M1*16 | (başka aile) | false | null |
