# kece — Yağ keçesi / simering teknik çizim modülü

Dosyalar: `site/draw/kece.js`, `site/draw/fixtures/kece.json` (32 gerçek ürün), `site/draw/preview/kece.html`, `site/draw/preview/kece/*.png` (her fixture için 460 ve 360 px).
`site/draw/data/kece.json` **oluşturulmadı**: taranan hiçbir keçe ürününde 2./3. fotoğraf yok (hepsinde tek ürün fotoğrafı var), fotoğraftan ölçü okunmadı.

## Kapsam sayıları (ölçülen, tahmin yok)

- `site/products.json`: 13.103 URL; adında `kece|simering` geçen **3.662** URL
  - `nbr-yag-kecesi-…`: 1.927
  - `viton-yag-kecesi-…`: 1.735
- Tarayıcıyla açılan ürün sayfası: **901** (NBR 532, Viton 369; listede NBR ve Viton dönüşümlü sırayla). Kalan 2.761 sayfa açılmadı, onlar için sayı yazılmadı.
- 901 sayfanın **901**'inde Ürün Özellikleri'nde İç Çap / Dış Çap / Kalınlık var, ön yazı tablosunda da aynı üç ölçü var ve ikisi birbirini tutuyor → `match=true`, `draw` çizim döndü: **901 / 901**.
- 901 sayfanın 901'inde `Tip` alanı = `TC (Çift Dudaklı)`; ürün kodu da `…-TC-MEL`. Taranan sayfalarda başka tip (SC, TB, SB, VC, VB, TCV) **görülmedi**.
- 901 sayfanın 901'inde `#divThumbList` içinde tek fotoğraf var.

## Alt tipler

Sitede gerçekten görülen alt tipler: **NBR TC** ve **Viton (FKM) TC**. Fixture'lar bu iki gruptan, kesit oranlarına göre (ince/uzun, kare, geniş; ø6'dan ø550'ye) seçildi: NBR 16, Viton 16.
Görevdeki "her alt tipten en az 3" şartı SC/TB/TCV vb. için gerçek sayfa bulunamadığından o tipler için karşılanamadı.

Modül tipe göre farklı kesit çizer (tip ancak sayfada yazıyorsa):

| Tip | Dış yüz | Dudak | Yay |
|---|---|---|---|
| TC | kauçuk kaplı | ana dudak + toz dudağı | var |
| SC | kauçuk kaplı | tek dudak | var |
| TB | metal | ana dudak + toz dudağı | var |
| SB | metal | tek dudak | var |
| VC | kauçuk kaplı | tek dudak | yok |
| VB | metal | tek dudak | yok |
| TCV | kauçuk kaplı | basınca dayanıklı kısa dudak + toz dudağı | var |

SC/TB/SB/VC/VB/TCV çizimleri yalnızca tip ve ürün kodu değiştirilmiş deneme verisiyle kontrol edildi (repoya fixture olarak konmadı).
Tip alanı ile ürün adındaki kod çelişirse tip kullanılmaz; tip yoksa ve adda da yoksa yalnızca ölçü zarfı (kesik çizgili dikdörtgen kesit) çizilir, dudak/yay uydurulmaz.

## Kullanılan ölçü etiketleri

| key | etiket | kaynak alan |
|---|---|---|
| d | İç Çap (d) | `İç Çap` (Ürün Özellikleri ve ön yazı) |
| D | Dış Çap (D) | `Dış Çap` |
| B | Kalınlık (B) | `Kalınlık` (ayrıca `Genişlik`/`Yükseklik` adları da okunur) |

Kurallar: özellikler ve ön yazı ikisi de varsa değerler aynı olmalı; adda/URL'de `d x D x B` varsa sayfa değeriyle aynı olmalı; d < D ve B > 0 olmalı. Biri tutmazsa `draw` null döner.
Çizim gerçek orandadır (kesit yüksekliği (D−d)/2 ve B aynı ölçekte). Büyük çaplarda eksene kadar sığmazsa çap ölçü çizgisi kırık gösterilir (çift eğik çizgi), kesit yine gerçek orandadır.

## Fixture match sonuçları

| path | kategori | d/D/B | Tip | match | draw |
|---|---|---|---|---|---|
| /nbr-yag-kecesi-14x20x7-6015 | NBR YAĞ KEÇELERİ | 14 mm/20 mm/7 mm | TC (Çift Dudaklı) | true | çizim |
| /nbr-yag-kecesi-8x15x8-5918 | NBR YAĞ KEÇELERİ | 8 mm/15 mm/8 mm | TC (Çift Dudaklı) | true | çizim |
| /nbr-yag-kecesi-9x19x7-5936 | NBR YAĞ KEÇELERİ | 9 mm/19 mm/7 mm | TC (Çift Dudaklı) | true | çizim |
| /nbr-yag-kecesi-34x47x8-6547 | NBR YAĞ KEÇELERİ | 34 mm/47 mm/8 mm | TC (Çift Dudaklı) | true | çizim |
| /nbr-yag-kecesi-100x120x11-7430 | NBR YAĞ KEÇELERİ | 100 mm/120 mm/11 mm | TC (Çift Dudaklı) | true | çizim |
| /nbr-yag-kecesi-14x22x4-6016 | NBR YAĞ KEÇELERİ | 14 mm/22 mm/4 mm | TC (Çift Dudaklı) | true | çizim |
| /nbr-yag-kecesi-75x100x12-7271 | NBR YAĞ KEÇELERİ | 75 mm/100 mm/12 mm | TC (Çift Dudaklı) | true | çizim |
| /nbr-yag-kecesi-34x50x7-6548 | NBR YAĞ KEÇELERİ | 34 mm/50 mm/7 mm | TC (Çift Dudaklı) | true | çizim |
| /nbr-yag-kecesi-210x250x16-7711 | NBR YAĞ KEÇELERİ | 210 mm/250 mm/16 mm | TC (Çift Dudaklı) | true | çizim |
| /nbr-yag-kecesi-35x55x7-6588 | NBR YAĞ KEÇELERİ | 35 mm/55 mm/7 mm | TC (Çift Dudaklı) | true | çizim |
| /nbr-yag-kecesi-38x62x7-6672 | NBR YAĞ KEÇELERİ | 38 mm/62 mm/7 mm | TC (Çift Dudaklı) | true | çizim |
| /nbr-yag-kecesi-65x110x7-7188 | NBR YAĞ KEÇELERİ | 65 mm/110 mm/7 mm | TC (Çift Dudaklı) | true | çizim |
| /nbr-yag-kecesi-90x160x10-7392 | NBR YAĞ KEÇELERİ | 90 mm/160 mm/10 mm | TC (Çift Dudaklı) | true | çizim |
| /nbr-yag-kecesi-6x12x5-5908 | NBR YAĞ KEÇELERİ | 6 mm/12 mm/5 mm | TC (Çift Dudaklı) | true | çizim |
| /nbr-yag-kecesi-500x550x20-7831 | NBR YAĞ KEÇELERİ | 500 mm/550 mm/20 mm | TC (Çift Dudaklı) | true | çizim |
| /nbr-yag-kecesi-36x50x10-6629 | NBR YAĞ KEÇELERİ | 36 mm/50 mm/10 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-65x75x12-8892 | VİTON YAĞ KEÇELERİ | 65 mm/75 mm/12 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-38x48x10-8571 | VİTON YAĞ KEÇELERİ | 38 mm/48 mm/10 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-28x37x7-8330 | VİTON YAĞ KEÇELERİ | 28 mm/37 mm/7 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-50x62x8-8650 | VİTON YAĞ KEÇELERİ | 50 mm/62 mm/8 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-160x185x14-9369 | VİTON YAĞ KEÇELERİ | 160 mm/185 mm/14 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-54x70x8-8732 | VİTON YAĞ KEÇELERİ | 54 mm/70 mm/8 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-32x55x10-8451 | VİTON YAĞ KEÇELERİ | 32 mm/55 mm/10 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-80x100x8-9571 | VİTON YAĞ KEÇELERİ | 80 mm/100 mm/8 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-50x85x12-8689 | VİTON YAĞ KEÇELERİ | 50 mm/85 mm/12 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-20x40x6-8172 | VİTON YAĞ KEÇELERİ | 20 mm/40 mm/6 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-75x122x12-9569 | VİTON YAĞ KEÇELERİ | 75 mm/122 mm/12 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-75x150x12-9014 | VİTON YAĞ KEÇELERİ | 75 mm/150 mm/12 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-38x82x7-8614 | VİTON YAĞ KEÇELERİ | 38 mm/82 mm/7 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-8x18x7-8769 | VİTON YAĞ KEÇELERİ | 8 mm/18 mm/7 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-270x330x25-9530 | VİTON YAĞ KEÇELERİ | 270 mm/330 mm/25 mm | TC (Çift Dudaklı) | true | çizim |
| /viton-yag-kecesi-65x75x10-8891 | VİTON YAĞ KEÇELERİ | 65 mm/75 mm/10 mm | TC (Çift Dudaklı) | true | çizim |

## Diğer ailelerden ürünler (match testi)

| path | kategori | match | draw |
|---|---|---|---|
| /638-2rs-minyatur-rulman-18153 | RULMAN > MİNYATÜR RULMANLAR | false | null |
| /6224-zz-ors-rulman-12167 | RULMAN > SABİT BİLYALI RULMANLAR | false | null |
| /31320-konik-makarali-rulman-17986 | RULMAN > KONİK MAKARALI RULMANLAR | false | null |
| /ucp-211-fag-yatakli-rulman-17877 | RULMAN > YATAKLI RULMAN | false | null |
| /nki-1020-igneli-rulman-18662 | RULMAN > İĞNELİ RULMANLAR | false | null |
| /51120-eksenel-bilyali-rulman-18366 | RULMAN > EKSENEL BİLYALI RULMANLAR (BÜTE) | false | null |
| /ymn-zincir-disli-tek-sira-58150-14950 | ZİNCİR - ZİNCİR DİŞLİSİ > ZİNCİR DİŞLİLERİ | false | null |
| /472-205-beneri-ic-segman-13535 | SEGMAN > 472 İÇ SEGMAN | false | null |
| /ymn-rulman-mansonu-h-2330-15815 | RULMAN > MANŞON SOMUN VE PUL | false | null |
| /353545-ymn-konik-burc-12757 | RULMAN > KAFES VE BURÇLAR | false | null |
| /yamaha-nmax-125-arka-teker-rulmani-6205-2rs-fag-23847 | MOTOSİKLET VE SCOOTER RULMANLARI > MOTOSİKLET RULMANLARI | false | null |
| /winkel-pro-5w42-hydraulic-sealant-50-ml-19711 | YAĞ VE BAKIM SPREYLERİ > SIZDIRMAZLIK VE SIVI CONTALAR | false | null |
| /pipe-sealing-cord-160m-19823 | YAĞ VE BAKIM SPREYLERİ > ÖZEL AMAÇLI SPREYLER | false | null |

## Emin olunamayanlar

- Açılmayan 2.761 sayfa için ölçü/tip bilgisi ölçülmedi.
- SC, TB, SB, VC, VB, TCV tiplerinde sitede gerçek ürün görülmedi; bu tiplerin çizimi gerçek ürün sayfasıyla doğrulanmadı.
- `Tip` alanı yoksa ürün adındaki kod (ör. `-TC-MEL`) tip olarak kullanılır; bu kod da yoksa tip çizilmez.
- Lineer ürün ailesinden örnek sayfa match testine konmadı; match yalnızca kategori/adda "yağ keçesi / simering" geçen ürünleri alır.
