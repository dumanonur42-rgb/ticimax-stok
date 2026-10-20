# zincir_disli — Teknik Çizim Raporu

Modül: `site/draw/zincir_disli.js` · Fixture: `site/draw/fixtures/zincir_disli.json` (45 ürün) · Foto verisi: `site/draw/data/zincir_disli.json` (17 ürün) · Önizleme: `site/draw/preview/zincir_disli.html` + `preview/zincir_disli/*.png` (460 px ve 360 px)

## Alt tipler ve çizimler

| Alt tip | Tanıma (crumbs + başlık) | Çizim |
|---|---|---|
| Tek sıra zincir dişli (3/8″, 1/2″, 5/8″, 3/4″, 1″, 1 1/4″) | başlıkta "ZİNCİR DİŞLİ", Ürün Tipi "TEK SIRA", kategori "ZİNCİR DİŞLİLERİ" | Ön görünüş: z adet gerçek zincir dişi profili (makara oturma yayı + diş yanağı), bölüm dairesi (eksen çizgisi), iki makara yerinde kesik çizgiyle, göbek + delik; hatve ölçüsü iki makara merkezi arasında. Kesit A-A: tek diş sıralı gövde + göbek, 45° tarama, eksen çizgisi, diş ucu pahları. |
| Çift sıra zincir dişli | Ürün Tipi "ÇİFT SIRA" | Aynı ön görünüş; kesit A-A'da iki diş sırası (aralarında zincir iç plakası boşluğu) ayrı çizilir. |
| 24B (1 1/2″) tek / çift sıra | Zincir Ölçüsü "(24B) 1″1/2*1 / *2" | Hatve etiketi "1 1/2″ (24B)" ile, tek/çift sıra kesitiyle. |
| Makaralı zincir (DIN ISO B-1 serisi, 04B-1 … 72B-1) | başlık "... ZİNCİR", kategori "ZİNCİRLER" | Yan görünüş: 4 makara/3 hatve, dış ve iç plakalar (bel profilli), pim + makara (kesik), h ve p ölçüleri. Kesit A-A: pim, burç, makara, iç/dış plakalar ayrı taramalı; b1, d1, d3, F1 ölçüleri. |

## Kullanılan ölçü etiketleri

**Zincir dişli** (sayfa `#divTabOzellikler li`):
- `Diş Sayısı` → **z** (ön görünüşte z adet diş çizilir ve "z = …" yazılır)
- `Zincir Ölçüsü` (ör. `5/8*1`, `(24B) 1"1/2*2`) → **p** hatve (inç) ve **sıra sayısı** (×1 tek, ×2 çift)
- `Ürün Tipi` → tek/çift sıra doğrulaması

Diş sayısı veya zincir ölçüsü yoksa / okunamazsa `draw` → `null`.

**Zincir** (sayfa `#divOnyazi table` + 2. fotoğraftaki "MAKARALI ZİNCİR DIN ISO TEKNİK ÖLÇÜLERİ" tablosu):
- `Adım` (ön yazı) → **p**
- `DIN ISO Kodu` (ön yazı) → fotoğraf tablosunda satır seçimi
- Fotoğraf tablosundan: **b1** (iç genişlik, min), **b2** (iç plaka dış genişliği, max), **d1** (pim çapı, max h9), **d3** (makara çapı, max), **F1** (pim boyu, max), **F2** (perçin dahil boy, max), **h** (plaka yüksekliği, max)
- Çizimde yazılanlar: p, b1, d1, d3, h, F1 (b2 ve F2 veride var, kesit şeklini çizmek için kullanılır, yazılmaz).
- Fotoğraf verisi yoksa veya ön yazıdaki `Adım` tablo satırıyla aynı değilse `draw` → `null`.

## Kapsam sayıları (ölçülen)

`products.json` (13.103 URL) içinde bu aileye giren URL: **773** (zincir dişli 756, zincir 17). Pinyon dişli, zincirli kaplin, zincir spreyi ve frezeler aileye alınmadı (match=false).

Taranan ürün sayfası: **773 / 773** (tarayıcı ile, ~1 sayfa/sn'den yavaş).

| Grup | Taranan | match=true | Çizim çıkan (gerekli ölçü sayfada var) |
|---|---|---|---|
| Tek sıra (24B hariç) | 358 | 358 | 358 |
| Tek sıra 24B | 21 | 21 | 21 |
| Çift sıra (24B hariç) | 356 | 356 | 356 |
| Çift sıra 24B | 21 | 21 | 21 |
| Zincir (B-1) | 17 | 17 | 17 |


## Fotoğraftan okunan ölçüler (kaynak)

Tablo bir kez büyütülerek satır satır okundu (18 satır; 081-1 satırının sitede ürünü yok). Her ürünün 2. fotoğrafı indirildi: 16 ürün aynı dosya (md5 `0a3eef199c…`), 12B-1 ürünü farklı kodlanmış ama aynı tablo — 12B satırı bu fotoğraftan ayrıca kontrol edildi.

| Ürün | DIN ISO | p | b1 | b2 | d1 | d3 | F1 | F2 | h | Kaynak foto |
|---|---|---|---|---|---|---|---|---|---|---|
| `/04b-1-14-1-zincir-17695` | 04B-1 | 6,0 | 2,8 | 4,1 | 1,85 | 4,0 | 7,4 | 10,3 | 5,0 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/04b-1-14-1-zincir--b83cf.jpeg |
| `/05b-1-516-1-zincir-17696` | 05B-1 | 8,0 | 3,0 | 4,77 | 2,31 | 5,0 | 8,6 | 11,7 | 7,11 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/05b-1-516-1-zincir-b37c-4.jpeg |
| `/06b-1-38-1-zincir-17697` | 06B-1 | 9,525 | 5,72 | 8,53 | 3,28 | 6,35 | 13,5 | 16,8 | 8,26 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/06b-1-38-1-zincir-4ea3-b.jpeg |
| `/084-1-12-1-zincir-17699` | 084-1 | 12,7 | 4,88 | 8,8 | 4,09 | 7,75 | 14,8 | 16,3 | 11,15 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/084-1-12-1-zincir-19eb3c.jpeg |
| `/08b-1-12-1-zincir-17700` | 08B-1 | 12,7 | 7,75 | 11,3 | 4,45 | 8,51 | 17,0 | 20,9 | 11,81 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/08b-1-12-1-zincir-c7-bec.jpeg |
| `/10b-1-58-1-zincir-17701` | 10B-1 | 15,875 | 9,65 | 13,28 | 5,08 | 10,16 | 19,6 | 23,7 | 14,73 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/10b-1-58-1-zincir-8-3387.jpeg |
| `/12b-1-34-1-zincir-17702` | 12B-1 | 19,05 | 11,68 | 15,62 | 5,72 | 12,07 | 22,7 | 27,3 | 16,13 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/12b-1-34-1-zincir-504-67.jpeg |
| `/16b-1-1-1-zincir-17703` | 16B-1 | 25,4 | 17,02 | 25,42 | 8,28 | 15,88 | 36,1 | 41,5 | 21,08 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/16b-1-1-1-zincir-5-4b10.jpeg |
| `/20b-1-1-14-1-zincir-17704` | 20B-1 | 31,75 | 19,56 | 29,01 | 10,19 | 19,05 | 43,2 | 49,3 | 26,42 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/20b-1-1-14-1-zincir-db-5b8.jpeg |
| `/24b-1-1-12-1-zincir-17705` | 24B-1 | 38,1 | 25,4 | 37,92 | 14,63 | 25,4 | 53,4 | 60,0 | 33,4 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/24b-1-1-12-1-zincir-792666.jpeg |
| `/28b-1-1-34-1-zincir-17706` | 28B-1 | 44,45 | 30,99 | 46,58 | 15,9 | 27,94 | 65,1 | 72,5 | 37,08 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/28b-1-1-34-1-zincir-90db3d.jpeg |
| `/32b-1-2-1-zincir-17707` | 32B-1 | 50,8 | 30,99 | 45,57 | 17,81 | 29,21 | 67,4 | 75,3 | 42,29 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/32b-1-2-1-zincir-8a79-b.jpeg |
| `/40b-1-2-12-1-zincir-17708` | 40B-1 | 63,5 | 38,1 | 55,75 | 22,89 | 39,37 | 82,6 | 92,8 | 52,96 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/40b-1-2-12-1-zincir-af7-94.jpeg |
| `/48b-1-3-1-zincir-17709` | 48B-1 | 76,2 | 45,72 | 70,56 | 29,24 | 48,26 | 99,1 | 109,6 | 63,88 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/48b-1-3-1-zincir-2747d3.jpeg |
| `/56b-1-3-12-1-zincir-17710` | 56B-1 | 88,9 | 53,34 | 81,33 | 34,32 | 53,98 | 117,0 | 126,6 | 77,85 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/56b-1-3-12-1-zincir-0-1c1e.jpeg |
| `/64b-1-4-1-zincir-17711` | 64B-1 | 101,6 | 60,69 | 92,02 | 39,4 | 63,5 | 131,4 | 140,0 | 90,17 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/64b-1-4-1-zincir-9d-2c0.jpeg |
| `/72b-1-4-12-1-zincir-17712` | 72B-1 | 114,3 | 68,58 | 103,81 | 44,48 | 72,39 | 148,7 | 157,2 | 103,63 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/72b-1-4-12-1-zincir--b28a-.jpeg |

## Fixture match sonuçları

| Yol | Başlık | Kategori | match | tip | draw |
|---|---|---|---|---|---|
| `/ymn-zincir-disli-tek-sira-38110-14776` | ZİNCİR DİŞLİ TEK SIRA 3/8*1*10 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › TEK SIRA ZİNCİR DİŞLİLERİ | true | tek | çizim (z, p, n) |
| `/ymn-zincir-disli-tek-sira-38176-14842` | ZİNCİR DİŞLİ TEK SIRA 3/8*1*76 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › TEK SIRA ZİNCİR DİŞLİLERİ | true | tek | çizim (z, p, n) |
| `/ymn-zincir-disli-tek-sira-12130-14863` | ZİNCİR DİŞLİ TEK SIRA 1/2*1*30 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › TEK SIRA ZİNCİR DİŞLİLERİ | true | tek | çizim (z, p, n) |
| `/ymn-zincir-disli-tek-sira-58113-14913` | ZİNCİR DİŞLİ TEK SIRA 5/8*1*13 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › TEK SIRA ZİNCİR DİŞLİLERİ | true | tek | çizim (z, p, n) |
| `/ymn-zincir-disli-tek-sira-34145-15012` | ZİNCİR DİŞLİ TEK SIRA 3/4*1*45 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › TEK SIRA ZİNCİR DİŞLİLERİ | true | tek | çizim (z, p, n) |
| `/ymn-zincir-disli-tek-sira-1110-15044` | ZİNCİR DİŞLİ TEK SIRA 1*1*10 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › TEK SIRA ZİNCİR DİŞLİLERİ | true | tek | çizim (z, p, n) |
| `/ymn-zincir-disli-tek-sira-24b-112110-15134` | ZİNCİR DİŞLİ TEK SIRA (24B) 1''1/2*1*10 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › TEK SIRA ZİNCİR DİŞLİLERİ | true | tek | çizim (z, p, n) |
| `/ymn-zincir-disli-tek-sira-24b-112130-15154` | ZİNCİR DİŞLİ TEK SIRA (24B) 1''1/2*1*30 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › TEK SIRA ZİNCİR DİŞLİLERİ | true | tek | çizim (z, p, n) |
| `/ymn-zincir-disli-cift-sira-38210-15155` | ZİNCİR DİŞLİ ÇİFT SIRA 3/8*2*10 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › ÇİFT SIRA ZİNCİR DİŞLİLERİ | true | cift | çizim (z, p, n) |
| `/ymn-zincir-disli-cift-sira-38276-15221` | ZİNCİR DİŞLİ ÇİFT SIRA 3/8*2*76 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › ÇİFT SIRA ZİNCİR DİŞLİLERİ | true | cift | çizim (z, p, n) |
| `/ymn-zincir-disli-cift-sira-1240-15453` | ZİNCİR DİŞLİ ÇİFT SIRA 1*2*40 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › ÇİFT SIRA ZİNCİR DİŞLİLERİ | true | cift | çizim (z, p, n) |
| `/ymn-zincir-disli-cift-sira-58225-15304` | ZİNCİR DİŞLİ ÇİFT SIRA 5/8*2*25 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › ÇİFT SIRA ZİNCİR DİŞLİLERİ | true | cift | çizim (z, p, n) |
| `/ymn-zincir-disli-cift-sira-34260-15406` | ZİNCİR DİŞLİ ÇİFT SIRA 3/4*2*60 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › ÇİFT SIRA ZİNCİR DİŞLİLERİ | true | cift | çizim (z, p, n) |
| `/ymn-zincir-disli-cift-sira-1219-15432` | ZİNCİR DİŞLİ ÇİFT SIRA 1*2*19 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › ÇİFT SIRA ZİNCİR DİŞLİLERİ | true | cift | çizim (z, p, n) |
| `/ymn-zincir-disli-cift-sira-24b-112210-15511` | ZİNCİR DİŞLİ ÇİFT SIRA (24B) 1''1/2*2*10 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › ÇİFT SIRA ZİNCİR DİŞLİLERİ | true | cift | çizim (z, p, n) |
| `/ymn-zincir-disli-cift-sira-24b-112230-15531` | ZİNCİR DİŞLİ ÇİFT SIRA (24B) 1''1/2*2*30 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › ÇİFT SIRA ZİNCİR DİŞLİLERİ | true | cift | çizim (z, p, n) |
| `/ymn-zincir-disli-tek-sira-1-14130-15133` | ZİNCİR DİŞLİ TEK SIRA 1 1/4*1*30 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › TEK SIRA ZİNCİR DİŞLİLERİ | true | tek | çizim (z, p, n) |
| `/ymn-zincir-disli-cift-sira-1-14210-15490` | ZİNCİR DİŞLİ ÇİFT SIRA 1 1/4*2*10 | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİR DİŞLİLERİ › ÇİFT SIRA ZİNCİR DİŞLİLERİ | true | cift | çizim (z, p, n) |
| `/04b-1-14-1-zincir-17695` | 04B-1 (1/4-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/05b-1-516-1-zincir-17696` | 05B-1 (5/16-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/06b-1-38-1-zincir-17697` | 06B-1 (3/8-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/084-1-12-1-zincir-17699` | 084-1 (1/2-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/08b-1-12-1-zincir-17700` | 08B-1 (1/2-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/10b-1-58-1-zincir-17701` | 10B-1 (5/8-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/12b-1-34-1-zincir-17702` | 12B-1 (3/4-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/16b-1-1-1-zincir-17703` | 16B-1 (1-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/20b-1-1-14-1-zincir-17704` | 20B-1 (1 1/4-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/24b-1-1-12-1-zincir-17705` | 24B-1 (1 1/2-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/28b-1-1-34-1-zincir-17706` | 28B-1 (1 3/4-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/32b-1-2-1-zincir-17707` | 32B-1 (2-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/40b-1-2-12-1-zincir-17708` | 40B-1 (2 1/2-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/48b-1-3-1-zincir-17709` | 48B-1 (3-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/56b-1-3-12-1-zincir-17710` | 56B-1 (3 1/2-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/64b-1-4-1-zincir-17711` | 64B-1 (4-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/72b-1-4-12-1-zincir-17712` | 72B-1 (4 1/2-1) ZİNCİR | ZİNCİR - ZİNCİR DİŞLİSİ › ZİNCİRLER | true | zincir | çizim (p, b1, d3, d1, h, F1) |
| `/ymn-helis-pinyon-disli-m116-16226` | HELİS PİNYON DİŞLİ M1*16 | KREMAYER RAYLAR VE PİNYON DİŞLİLER › PİNYON DİŞLİLER › HELİS PİNYONLAR | false | - | null |
| `/ymn-duz-pinyon-disli-m112-16250` | DÜZ PİNYON DİŞLİ M1*12 | KREMAYER RAYLAR VE PİNYON DİŞLİLER › PİNYON DİŞLİLER › DÜZ PİNYONLAR | false | - | null |
| `/10020-ymn-zincirli-kaplin-13761` | 10020 Zincirli Kaplin | KAPLİNLER › ZİNCİRLİ KAPLİNLER | false | - | null |
| `/zincir-yaglama-sprey-400-ml-19772` | ZİNCİR YAĞLAMA SPREY 400 ML | YAĞ VE BAKIM SPREYLERİ › YAĞLAMA SPREYLERİ | false | - | null |
| `/zincir-halat-bakim-sprey-400-ml-19771` | ZİNCİR HALAT BAKIM SPREY 400 ML | YAĞ VE BAKIM SPREYLERİ › YAĞLAMA SPREYLERİ | false | - | null |
| `/nbr-yag-kecesi-5x16x7-5906` | NBR Yağ keçesi 5x16x7 | YAĞ KEÇESİ › NBR YAĞ KEÇELERİ | false | - | null |
| `/6204-zz-c3-ors-rulman-11930` | 6204 ZZ C3 ORS Rulman | RULMAN › SABİT BİLYALI RULMANLAR › TEK SIRALI SABİT BİLYALI RULMANLAR | false | - | null |
| `/10089-ymn-konik-burc-12621` | 1008*9 Konik Burç | RULMAN › KAFES VE BURÇLAR › KONİK BURÇLAR | false | - | null |
| `/rax-705-kombine-igneli-rulman-17716` | RAX 705 KOMBİNE İĞNELİ RULMAN | RULMAN › İĞNELİ RULMANLAR › KOMBİNE İĞNELİ RULMANLAR | false | - | null |
| `/ymn-yatakli-rulman-ucfa-204-16617` | YATAKLI RULMAN UCFA 204 | RULMAN › YATAKLI RULMAN › YATAKLI RULMANLAR | false | - | null |

## Emin olunamayanlar / bilerek çizilmeyenler

- **Zincir dişli göbek çapı, göbek boyu, diş genişliği, delik çapı:** taranan zincir dişli sayfalarının hiçbirinde (Ürün Özellikleri, ön yazı) bu ölçüler yok; 2. fotoğrafı olan dişlilerde (116 ürün) 2. fotoğraf da ölçüsüz ürün resmi (ölçü tablosu yok). Bu yüzden çizimde bu ölçülere **sayı yazılmadı**. Şekil, ölçüsüz olarak genel oranlarla (göbek, delik, diş genişliği) gösterilir; sadece z, p ve sıra sayısı yazılır.
- **Dış çap / bölüm dairesi çapı** p ve z'den hesaplanabilir ama sayfada yazmadığı için **sayı olarak yazılmadı**; sadece çizimin ölçeği (dişlerin ve bölüm dairesinin oranı) bu formülle (Dp = p / sin(180°/z)) doğru çizildi.
- **Ham / göbekli ayrımı:** sitedeki ürünlerde böyle bir özellik yok; ayrı alt tip yapılmadı (veri gelirse eklenebilir).
- **Zincir tablosundaki min/max:** b1 "min", diğerleri "max" değer; çizimde tablodaki değer aynen yazıldı.
- **Çift/üç sıra zincir (-2, -3):** sitede ürünü yok; sadece B-1 tek sıra zincirler var.
- Taranamayan sayfalar varsa yukarıdaki "Taranan" sütunu ölçülen sayıdır; taranmayanlar için oran tahmini yazılmadı.
