# Burçlu V kasnak çizim modülü

Dal: `draw/burclu_kasnak`; taban: `origin/site-assets`. PR açılmadı, siteye yükleme yapılmadı.

## Son değişiklik

SPC4256 ve SPC5306, K+L+M ile F farklı olduğu için artık null dönmez. Kaynak ölçü yazıları/keys aynen korunur; eksenel geometri şematiktir. Göbek yerleşimi fiziksel sınırların dışına düşerse yalnız şekil yerleşimi sınırlandırılır, kaynak L/K/M sayıları değiştirilmez. F/L veya diğer zorunlu alanlar yoksa null kuralı sürer. Aile dışı, geçersiz ve çelişen aynı etiketli girdiler reddedilir.

Örnekler: SPC4256 F=162, K=30, L=102, M=24; SPC5306 F=162, K=17,5, L=114, M=17,5. Sayılar kaynaktan gösterilir; geometrik toplamdan yeni M sayısı yazılmaz. SPB1064 F ve L eksik olduğundan null.

KYS resmi teknik verileri korunur. Orka değerleri katalogla değiştirilmez. HTK SPA-4-100 K=70 değeri kaynak etiketi olarak gösterilir; fiziksel anlamı bağımsız doğrulanmış değildir. Oranlar şematik, gösterilen ölçüler veridendir.

## Kontroller

```text
PASS 45/45 fixtures; 18 SVG, 27 null; ES5, ids, keys, optional omissions
PASS 18 SVG geometry: hatched section halves, axis symmetry, channel-count V grooves at 38 degrees, front keyways, no white arm overlays
PASS 36 headless Chrome PNG; text boxes: no overlaps at 460/360px
TÜM CTX: 519 SVG 507 null 12 error 0
```

45 fixture: mevcut 40, iki gerçek eksenel ölçü uyuşmazlığı, bir F/L eksik ürün ve iki şematik yerleşim regresyonu. 36 PNG'nin 460/360 montajları gözle incelendi; SPC4256 ve SPC5306 ayrıca tekil incelendi. Yazı çakışması veya kırpılma görülmedi.

Üretim null listesi: ORK BK SPB1064; SPC1403, SPC1404, SPC1503, SPC1504, SPC1603, SPC1604, SPC1703, SPC1704, SPC1803, SPZ2361, SPZ2362 (son 11 kodun öneki ORK BK). İlkinde F/L, diğerlerinde zorunlu teknik alanlar eksiktir.

## Ön izlemeler

`preview/burclu_kasnak.html` fixture'ların güncel kopyasını içerir; `?i=40&w=460` tekil SPC4256 görünümüdür.

| Örnek | 460 px | 360 px |
|---|---|---|
| Tip 1 | ../preview/burclu_kasnak/00-460.png | ../preview/burclu_kasnak/00-360.png |
| Tip 4 | ../preview/burclu_kasnak/03-460.png | ../preview/burclu_kasnak/03-360.png |
| Tip 6 | ../preview/burclu_kasnak/05-460.png | ../preview/burclu_kasnak/05-360.png |
| Tip 8 | ../preview/burclu_kasnak/07-460.png | ../preview/burclu_kasnak/07-360.png |
| SPC4256 | ../preview/burclu_kasnak/40-460.png | ../preview/burclu_kasnak/40-360.png |
| SPC5306 | ../preview/burclu_kasnak/41-460.png | ../preview/burclu_kasnak/41-360.png |

## Fixture sonuçları

| Kod | Tip | Match | Sonuç | Null nedeni |
|---|---|---|---|---|
| ORK BK SPZ0631 | Tip 1 | true | svg | — |
| ORK BK SPA1003 | Tip 2 | true | svg | — |
| ORK BK SPB1254 | Tip 3 | true | svg | — |
| ORK BK SPB8005 | Tip 4 | true | svg | — |
| ORK BK SPA3554 | Tip 5 | true | svg | — |
| ORK BK SPA1802 | Tip 6 | true | svg | — |
| ORK BK SPA1801 | Tip 7 | true | svg | — |
| ORK BK SPA0713 | Tip 8 | true | svg | — |
| ORK BK SPZ0561 | Tip 9 | true | svg | — |
| ORK BK SPC100010 | Tip 5 | true | svg | — |
| KYS BK SPB1803 | Tip 2 | true | svg | — |
| ORK BK SPC1403 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1404 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1503 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1504 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1603 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1604 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1703 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1704 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPC1803 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPZ2361 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| ORK BK SPZ2362 | — | true | null | Zorunlu O, F, L ve tip eksik; gövde grubu atanmadı |
| HTK SPA-4-100 |  2 | true | svg | — |
| HTK SPA-1-75 |  1 | true | svg | — |
| HTK SPB-1-125 |  1 | true | svg | — |
| Burçlu Triger Kasnak | Tip 1 | false | null | Ürün ailesi dışında |
| Kör V Kasnak | Tip 1 | false | null | Ürün ailesi dışında |
| 6307 ZZ C3 Rulman | Tip 1 | false | null | Ürün ailesi dışında |
| Burçlu Zaman Kasnak | Tip 1 | false | null | Ürün ailesi dışında |
| Dolu-delikli Burçlu Kasnak | Tip 1 | false | null | Ürün ailesi dışında |
| Eksik: Profil | Tip 1 | true | null | Zorunlu alan eksik: Profil |
| Eksik: Kanal Sayısı | Tip 1 | true | null | Zorunlu alan eksik: Kanal Sayısı |
| Eksik: Anma Çapı (P) | Tip 1 | true | null | Zorunlu alan eksik: Anma Çapı (P) |
| Eksik: Dış Çap (O) | Tip 1 | true | null | Zorunlu alan eksik: Dış Çap (O) |
| Eksik: Kasnak Genişliği (F) | Tip 1 | true | null | Zorunlu alan eksik: Kasnak Genişliği (F) |
| Eksik: Göbek Uzunluğu (L) | Tip 1 | true | null | Zorunlu alan eksik: Göbek Uzunluğu (L) |
| Eksik: Gövde Tipi | — | true | null | Zorunlu alan eksik: Gövde Tipi |
| Çelişen F | Tip 1 | true | null | Çelişen/geçersiz teknik veri |
| Geçersiz kanal | Tip 1 | true | null | Çelişen/geçersiz teknik veri |
| Boş ctx | — | false | null | Boş veri |
| ORK BK SPC4256 | Tip 6 | true | svg | — |
| ORK BK SPC5306 | Tip 5 | true | svg | — |
| ORK BK SPB1064 | Tip 8 | true | null | Zorunlu F ve L eksik |
| SCHEMATIC_RECESS | Tip 6 | true | svg | — |
| SCHEMATIC_PROJECTION | Tip 4 | true | svg | — |
