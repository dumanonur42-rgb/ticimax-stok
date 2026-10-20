# Konik makaralı rulman — teknik çizim raporu

Modül: `site/draw/konik.js` (`YDRAW.konik`). Önizleme: `site/draw/preview/konik.html`, ekran görüntüleri `site/draw/preview/konik/{460,360}_*.png`.

## Kapsam ve sayılar (ölçülen)

- `products.json` içinde URL'sinde "konik" geçen ürün: 692
  - `konik-makarali` (bu aile): **189**
  - `konik-kilit`: 253, `konik-burc`: 193, `konik-matkap`: 57 → aileye dahil değil, `match` hepsini reddeder.
- 189 konik makaralı rulman sayfasının **tamamı** Chrome (CDP) ile açıldı (~1 istek/sn). Sonuç:
  - `match` = evet: **189 / 189**
  - Gerekli ölçüler (d, D, B, F) sayfada var → çizim çıkan: **189 / 189**
  - E ölçüsü de sayfada var: **189 / 189**
- Seri dağılımı (189 sayfa): 302: 26, 303: 21, 313: 17, 320: 29, 322: 21, 323: 20, 329: 14, 330: 13, 331: 13, 332: 15.
- Sitede inç serisi (LM/HM), set, cup/cone olarak satılan konik rulman ürünü **bulunamadı** (products.json'da yok); bu yüzden bu alt tipler için çizim/fixture yok. Modül inç kodlarını tanır ama gerçek ürünle test edilmedi.

## Alt tipler (seriye göre çizim)

Her seri kendi geometri parametresiyle çizilir (temas açısı, makara çapı/konumu); bütün oranlar ürünün kendi d, D, B, E, F ölçülerinden hesaplanır:

| Seri | Tip | Temas açısı (çizim) |
|---|---|---|
| 302, 303 | standart / orta seri | ~9–10° |
| 313 | dik açılı (büyük temas açısı) | ~21° |
| 320, 329, 330 | ince kesit / geniş seri | ~7.5–8.5° |
| 322, 323 | geniş (B büyük) | ~9–10° |
| 331, 332 | ekstra geniş (B = F) | ~8–8.5° |

Çizim (yerleşim: ön görünüş ~%40, kesit ~%60): solda ön görünüş (dış bilezik, iç bilezik büyük omuzu, makaralar), sağda A-A kesiti: dış bilezik (cup), iç bilezik (cone, büyük ve küçük omuz), yamuk (trapez) konik makaralar (ekseni temas açısında), ince çizgi kafes, zıt yönlü 45° tarama, eksen çizgisi, makara eksenleri, oklu ölçü çizgileri. Ölçü yazıları 14 birim (360 px'de ~11 px).

Kesitin okunur olması için iki yarım kesit arasındaki delik boşluğu gerektiğinde kısaltılarak çizilir (kısaltılmış gösterim); bu durumda Ød ve ØD ölçü çizgilerinde kırık işareti (//) vardır. Yarım kesitlerin kendi oranları ve yazılan değerler gerçektir.

## Kullanılan ölçü etiketleri (sayfadaki adıyla)

| Anahtar | Sayfa etiketi | Çizimde yeri |
|---|---|---|
| d | İç Çap (d) | Kesitte üst yarı delik yüzü ↔ alt yarı delik yüzü (Ø), ön görünüşte iç çap |
| D | Dış Çap (D) | Kesitte ve ön görünüşte dış çap (Ø) |
| B | Kalınlık (B) | İç bilezik (cone) genişliği — alt yarım kesitin altında, cone yüzlerinden uzatma çizgileriyle |
| E | E Ölçüsü | Dış bilezik (cup) genişliği (katalogda C) — kesitin üstünde, cup üzerinde |
| F | F Ölçüsü | Toplam montaj genişliği (katalogda T) — en üstte, cone arka yüzünden cup arka yüzüne |

Kaynak sırası: `#divTabOzellikler li` → `#divOnyazi table` → `ctx.data`. d, D, B veya F yoksa `draw` **null** döner (çizim çıkmaz). E yoksa yalnız E ölçüsü çizilmez.

## E ve F ölçülerinin anlamı — doğrulama

- Yamansa 30202 sayfası: d=15, D=35, B=11, E=10, F=11,75.
- SKF 30202 katalog sayfası: d=15, D=35, toplam genişlik T=11,75, iç bilezik B=11, dış bilezik C=9,25.
- F = T (toplam genişlik) birebir uyuyor; B = iç bilezik genişliği birebir uyuyor. Geriye kalan genişlik ölçüsü E, dış bilezik genişliği (C) olarak yorumlandı. Tutarlılık kontrolü: 189 ürünün hepsinde E < F ve E ≤ B (C için beklenen ilişki).
- **Not / emin olunamayan:** 30202'de Yamansa E=10, SKF C=9,25 veriyor (farklı üreticiler bu ölçüyü 10 olarak da veriyor). Çizimde sayfadaki değer (10) aynen yazıldı; hiçbir değer değiştirilmedi.
- Yamansa ürün fotoğrafları: 30202'nin 2. görseli kesik rulman fotoğrafı, 3. görseli sadece B, D, d harfli şema (sayı yok, E/F yok). Fotoğraflardan **hiçbir sayısal ölçü okunmadı**; bu yüzden `site/draw/data/konik.json` boş (`{}`).
  - 2. görsel: https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/30202-konik-makarali-rulman--d3526.png
  - 3. görsel: https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/30202-konik-makarali-rulman-c6bc2f.png

## Çizimde bilinçli olarak sayı yazılmayanlar

Makara çapı, temas açısı, omuz yükseklikleri ve kafes gibi iç detaylar sayfada olmadığı için **sadece şekil olarak** çizilir, üzerlerine hiçbir sayı yazılmaz. Çizimdeki tüm sayılar sayfadaki d, D, B, E, F değerleridir.

## Kalite kontrolü

- 460 px ve 360 px genişlikte tüm kartların ekran görüntüsü alındı ve büyütülerek tek tek incelendi.
- Tarayıcıda otomatik kontrol: SVG içindeki yazıların birbirine çakışması ve SVG dışına taşması — 460 px: 0, 360 px: 0.
- Düzeltilenler: ön görünüş başlığı ile Ø D yazısı çakışması, fazla kafes çemberi, eksene kadar uzanan yük çizgisinin B ölçüsünü kesmesi, küçük makara oranı, dar F ölçüsünde yazının yana kayması.

## Fixture'lar ve match sonuçları

`site/draw/fixtures/konik.json`: 35 gerçek ürün (her seriden en az 3). `site/draw/fixtures/konik-negatif.json`: 12 başka aile ürünü (yanlış eşleşme testi).

| Ürün | Yol | match | Çizim | Ölçüler |
|---|---|---|---|---|
| 30202 KONİK MAKARALI RULMAN | `/30202-konik-makarali-rulman-17925` | evet | var | D, d, F, E, B |
| 30208 KONİK MAKARALI RULMAN | `/30208-konik-makarali-rulman-17931` | evet | var | D, d, F, E, B |
| 30214 KONİK MAKARALI RULMAN | `/30214-konik-makarali-rulman-17937` | evet | var | D, d, F, E, B |
| 30222 KONİK MAKARALI RULMAN | `/30222-konik-makarali-rulman-17944` | evet | var | D, d, F, E, B |
| 30234 KONİK MAKARALI RULMAN | `/30234-konik-makarali-rulman-17950` | evet | var | D, d, F, E, B |
| 30302 KONİK MAKARALI RULMAN | `/30302-konik-makarali-rulman-17951` | evet | var | D, d, F, E, B |
| 30309 KONİK MAKARALI RULMAN | `/30309-konik-makarali-rulman-17958` | evet | var | D, d, F, E, B |
| 30315 KONİK MAKARALI RULMAN | `/30315-konik-makarali-rulman-17964` | evet | var | D, d, F, E, B |
| 30324 KONİK MAKARALI RULMAN | `/30324-konik-makarali-rulman-17971` | evet | var | D, d, F, E, B |
| 31305 KONİK MAKARALI RULMAN | `/31305-konik-makarali-rulman-17972` | evet | var | D, d, F, E, B |
| 31310 KONİK MAKARALI RULMAN | `/31310-konik-makarali-rulman-17977` | evet | var | D, d, F, E, B |
| 31316 KONİK MAKARALI RULMAN | `/31316-konik-makarali-rulman-17983` | evet | var | D, d, F, E, B |
| 31324 KONİK MAKARALI RULMAN | `/31324-konik-makarali-rulman-17988` | evet | var | D, d, F, E, B |
| 32004 KONİK MAKARALI RULMAN | `/32004-konik-makarali-rulman-17989` | evet | var | D, d, F, E, B |
| 32013 KONİK MAKARALI RULMAN | `/32013-konik-makarali-rulman-17998` | evet | var | D, d, F, E, B |
| 32030 KONİK MAKARALI RULMAN | `/32030-konik-makarali-rulman-18008` | evet | var | D, d, F, E, B |
| 32064 KONİK MAKARALI RULMAN | `/32064-konik-makarali-rulman-18017` | evet | var | D, d, F, E, B |
| 32205 KONİK MAKARALI RULMAN | `/32205-konik-makarali-rulman-18018` | evet | var | D, d, F, E, B |
| 32215 KONİK MAKARALI RULMAN | `/32215-konik-makarali-rulman-18028` | evet | var | D, d, F, E, B |
| 32234 KONİK MAKARALI RULMAN | `/32234-konik-makarali-rulman-18038` | evet | var | D, d, F, E, B |
| 32303 KONİK MAKARALI RULMAN | `/32303-konik-makarali-rulman-18039` | evet | var | D, d, F, E, B |
| 32313 KONİK MAKARALI RULMAN | `/32313-konik-makarali-rulman-18049` | evet | var | D, d, F, E, B |
| 32326 KONİK MAKARALI RULMAN | `/32326-konik-makarali-rulman-18058` | evet | var | D, d, F, E, B |
| 32920 KONİK MAKARALI RULMAN | `/32920-konik-makarali-rulman-18059` | evet | var | D, d, F, E, B |
| 32934 KONİK MAKARALI RULMAN | `/32934-konik-makarali-rulman-18065` | evet | var | D, d, F, E, B |
| 32960 KONİK MAKARALI RULMAN | `/32960-konik-makarali-rulman-18072` | evet | var | D, d, F, E, B |
| 33010 KONİK MAKARALI RULMAN | `/33010-konik-makarali-rulman-18073` | evet | var | D, d, F, E, B |
| 33013 KONİK MAKARALI RULMAN | `/33013-konik-makarali-rulman-18076` | evet | var | D, d, F, E, B |
| 33016 KONİK MAKARALI RULMAN | `/33016-konik-makarali-rulman-18079` | evet | var | D, d, F, E, B |
| 33108 KONİK MAKARALI RULMAN | `/33108-konik-makarali-rulman-18086` | evet | var | D, d, F, E, B |
| 33114 KONİK MAKARALI RULMAN | `/33114-konik-makarali-rulman-18092` | evet | var | D, d, F, E, B |
| 33122 KONİK MAKARALI RULMAN | `/33122-konik-makarali-rulman-18098` | evet | var | D, d, F, E, B |
| 33205 KONİK MAKARALI RULMAN | `/33205-konik-makarali-rulman-18099` | evet | var | D, d, F, E, B |
| 33212 KONİK MAKARALI RULMAN | `/33212-konik-makarali-rulman-18106` | evet | var | D, d, F, E, B |
| 33220 KONİK MAKARALI RULMAN | `/33220-konik-makarali-rulman-18113` | evet | var | D, d, F, E, B |
| 2517*45 Konik Burç | `/251745-ymn-konik-burc-12717` | hayır | yok (null) | - |
| KONİK KİLİT 301 (FB1 TİPİ) 028*55 | `/konik-kilit-301-fb1-tipi-02855-17536` | hayır | yok (null) | - |
| 29,5 MM Konik Matkap Ucu HSS DIN345 ERİC | `/295-mm-konik-matkap-ucu-hss-din345-eric-20379` | hayır | yok (null) | - |
| 22236 CAKW33C3 OYNAK MAKARALI RULMAN (SARI KAFES) | `/22236-cakw33c3-oynak-makarali-rulman-sari-kafes-17375` | hayır | yok (null) | - |
| 16100 ZZ SABİT BİLYALI RULMAN | `/16100-zz-sabit-bilyali-rulman-18293` | hayır | yok (null) | - |
| NBR Yağ keçesi 240x280x15 | `/nbr-yag-kecesi-240x280x15-7737` | hayır | yok (null) | - |
| NK 70/35 İĞNELİ RULMAN | `/nk-7035-igneli-rulman-18640` | hayır | yok (null) | - |
| 51210 EKSENEL BİLYALI RULMAN | `/51210-eksenel-bilyali-rulman-18394` | hayır | yok (null) | - |
| YATAKLI RULMAN UCF 214 | `/ymn-yatakli-rulman-ucf-214-16744` | hayır | yok (null) | - |
| LİNEER RULMAN LMEK 40 UU | `/ymn-lineer-rulman-lmek-40-uu-16538` | hayır | yok (null) | - |
| 471 60x3 Beneri Dış Segman | `/471-60x3-beneri-dis-segman-13442` | hayır | yok (null) | - |
| RULMAN MANŞONU H 316 | `/ymn-rulman-mansonu-h-316-15860` | hayır | yok (null) | - |
