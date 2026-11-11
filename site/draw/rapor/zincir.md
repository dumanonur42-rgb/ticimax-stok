# Zincir çizim modülü — Adım 2

## Teslim ve arayüz

- Dal: `draw/zincir`, `origin/site-assets` tabanlı ayrı worktree.
- `site/draw/zincir.js`: ES5, yalnız `window.YDRAW.zincir`; `match(ctx)` ve `draw(ctx,opt)`.
- Ölçüler yalnız `ctx.specs` / `ctx.onyazi` etiketlerinden okunur. Yeni ürünler için yol tablosu veya `data/zincir.json` gerekmez.
- `viewBox="0 0 460 260"`, YAN GÖRÜNÜŞ + KESİT A-A. Renkler, tarama, oklar ve plaka geometrisi mevcut `zincir_disli` stilini kullanır.
- Plaka/burç kalınlığı şematiktir; bunlara sayısal ölçü etiketi verilmez. Yazılan tüm ölçüler bağlamdan gelir.
- 1–4 sıra, paslanmaz, pim delikli, çift hatve A/C 20xx, yarım kilit ve klipsli tam kilit desteklenir. Çok sıralı kesitte her sıra ve ilk iki sıra arasındaki `pt` gösterilir.
- Eksik/geçersiz gerekli ölçü → `null`. HP delik çapı yoksa delik çizilmez; diğer gerekli ölçüler de eksikse hiç çizim üretilmez. Delik çapı verilmiş ama geçersizse `null`.

## Sonraki ürün içeriklerinde kullanılacak etiketler

| Etiket | keys / data-k | Zorunluluk |
|---|---|---|
| Adım (p) | p | her çizim |
| İç Genişlik (b1) | b1 | her çizim |
| Makara Çapı (d3) | d3 | her çizim |
| Pim Çapı (d1) | d1 | her çizim |
| Plaka Yüksekliği (h) | h | her çizim |
| Sıra Sayısı | n | her çizim; 1–4 tam sayı |
| Sıralar Arası Mesafe (pt) | pt | n > 1 |
| Pim Delik Çapı | bore | isteğe bağlı, yalnız HP |

Etiketler ACIKLAMA teknik listesindeki `<strong>Etiket:</strong> değer` biçiminde kullanılmalı. ONYAZI tablosunda da aynı etiketler okunur. `Ürün Tipi` etiketi, başlığa ek olarak alt tip tespitinde kullanılabilir. Ondalık virgül ve nokta kabul edilir; geçersiz/aralıklı metinden ilk sayı çekilerek tahmin yapılmaz.

## Eşleştirme ve mevcut sayfalar

Başlık zincir/bakla/kilit sözcüğünü (Türkçe çekimleri dahil) ve `Adım (p)` + `İç Genişlik (b1)` etiketlerini taşımalı. Dişli, kaplin, sprey, yağ, kasnak vb. başlıkları dışlanır. Eski sayfaların `Adım` etiketi yeni modülü tetiklemez.

`yg.js` alfabetik modül seçimi kontrol edildi. Mevcut 17 zincir sayfasının tümü yeni modülde `match=false`; hepsi eski `zincir_disli` ile non-null çizilmeye devam ediyor. `site/draw/zincir_disli.js` ve onun veri tablosu değiştirilmedi.

### ORK ZD 1209 dişlisi

Yeni modül: `match=false`, `draw=null`. Eski modül seçilir ve çizim üretir; keys: `z,p,n`.

Fixture başlığı: `Zincir Dişli Çift Sıra 1*2*09`, breadcrumb: `ZİNCİR DİŞLİLERİ`.

- `Diş Sayısı`: `9`
- `Zincir Ölçüsü`: `1*2` (1 inç adım, 2 sıra)
- `Ürün Tipi`: `ÇİFT SIRA`

Başlıkta “Zincir Dişli” ifadesi ve doğru kategori bağlamı mevcut modülün yönlendirmesi için önemlidir. Bu dişlinin göbek/delik/profil oranları mevcut modülün şemasıdır; yeni doğrulanmış üretici ölçüsü iddia edilmemiştir.

## Fixture kaynakları ve eksikler

`fixtures/zincir.json`: 27 bağlam. Gerçek ürün stok kodları `parca/zincir.jsonl.gz` ile korunmuştur; ölçüler Adım 1'in doğrulanmış teknik tablosundan alınmıştır. `kaynak` alanları URL/sayfa/kapsam bilgisini içerir.

- BS kodları: ISO 606/DIN 8187 geometrisi, [iwis ECOPLUS](https://iwis.com/antriebssysteme-drive-systems/as-catalogs/ecoplus/ecoplus-catalog-roller-chains-iwis.pdf), [Sedis BS](https://www.sedis.com/fichiers/uploads/sedis-principal-products-bs-chains-european-series-20-22.pdf) ve resmi iwis küçük zincir sayfaları. SS geometriyi paylaşır; fixture'da kopma yükü yoktur. Bakla/kilitlere kopma yükü verilmedi.
- C2052: [Donghua resmi katalog](https://www.donghua.co.uk/downloads/doublepitchconveyorchains.pdf), basılı s.31. Makara 19,05 mm, plaka yüksekliği 15 mm; büyük makara plakadan yüksek olabilir ve çizimi engellemez.
- A2052: [THC resmi tablo](http://www.beijingthc.com/transmission_drive_chain/ansi_double_pitch_transmission_roller_chains.html). A2052 de büyük makaralıdır; A/C ayrımı küçük/büyük diye varsayılmadı.
- `hp-08b-1` ve `hp-c2052`: gerçek Yamansa HP ürünlerinde yalnız adım doğrulanmış, diğer alanlar boş → beklenen `draw=false`; standart dolu pim ölçüleri aktarılmadı.
- `415h`: 1/8 ile resmi KMC 4,7 mm genişlik çelişkisi korunuyor, genişlik yazılmadı → `draw=false`.
- `official-hp-reference`: [Tsubaki RF2050R-HP resmi tablo](https://tsubaki.eu/products/chain/attachment-chain/ansi-standard-attachment-chain/ansi-double-pitch-hp/) ile ayrı, açıkça referans fixture'ı. P31,75 / b1 9,53 / d3 19,05 / d1 7,22 / h15 / delik5,12 mm. **Bu değerler Yamansa HP ürünlerine aktarılmadı.** `official-hp-no-bore` aynı referansın isteğe bağlı delik alanı çıkarılmış örneği; diğer gerekli ölçülerle çizim üretir, `bore` anahtarı üretmez.
- `ss-12b-1` yalnız `onyazi` üzerinden okunmayı doğrular.
- Negatif fixture'lar: dişli/kaplin/sprey dışlama; boş bağlam; eksik p/b1/h/pt; negatif çap; 5 sıra; pimden büyük delik çapı.

## Önizlemeler

`preview/zincir.html` kendi fixture/veri kopyasını içerir, yerel dosya olarak Chrome'da açılabilir. `?w=460` ve `?w=360` kullanılır. Ölçü düğmesine tıklamak ilgili `data-k` grubunu kırmızı yapar.

27 fixture'ın her biri için iki PNG: `site/draw/preview/zincir/<fixture-id>-460.png` ve `.../<fixture-id>-360.png`. Ek iki dosya: `16b-4-pt-active-460.png`, `16b-4-pt-active-360.png`. Beş incelenen ürünün 460px kartlarını ölçeklemeden birleştiren `review-460.png` ile toplam **57 PNG**.

Fixture id'leri: `06b-1`, `08b-2`, `16b-3`, `16b-4`, `ss-12b-1`, `hp-08b-1`, `c2052`, `a2052`, `offset-08b-1`, `clip-12b-2`, `hp-c2052`, `415h`, `official-hp-reference`, `official-hp-no-bore`, `existing-08b-1`, `sprocket-1209`, `exclude-disli`, `exclude-kaplin`, `exclude-sprey`, `missing-p`, `missing-b1`, `missing-h`, `invalid-number`, `invalid-strands`, `invalid-pt`, `invalid-bore`, `empty`.

360px dört sıra, çift hatve, yarım kilit, klipsli tam kilit, HP ve 460px dişli PNG'leri görsel olarak incelendi. `pt` tıklaması iki genişlikte de tek doğru grubu kırmızı yaptı. Metin sınırları/çakışmaları ayrıca browser'da denetlendi.

## Kontroller

`python3 site/build.py` çıkış kodu 0 (stdout üretmez). Üretilen `yamansa-urun.js` Chrome'da `new Function(source)` ile sözdizimi kontrolünden geçti. Üretilen birleşik dosya bu aile dalına dahil edilmedi; entegrasyon sırasında build yeniden çalıştırılmalı. Repo'da bu JS aileleri için package.json, test/lint/typecheck komutu yok. Node PATH'te yok; Chrome + Python Playwright kullanıldı. Modül için ES5 sözcük denetimi ve `ctx.data` bulunmaması da kontrol edildi.

Browser konsolunda önizleme açıldıktan sonra sonuçları tekrar yazdırmak için:

```js
RESULTS.forEach(function(r){console.log(r.id+': match='+r.match+' draw='+r.draw+' keys='+r.keys.join(',')+' route='+r.selected+' routedDraw='+r.routedDraw)});
FX.forEach(function(c,i){var r=RESULTS[i],e=c.expected;if(r.match!==e.match||r.draw!==e.draw||r.selected!==e.module)throw Error(c.id)});
```

Playwright kontrolü çıktısı:

```text
06b-1: match=true draw=true keys=p,h,d1,d3,b1,n route=zincir routedDraw=true
08b-2: match=true draw=true keys=p,h,d1,d3,b1,n,pt route=zincir routedDraw=true
16b-3: match=true draw=true keys=p,h,d1,d3,b1,n,pt route=zincir routedDraw=true
16b-4: match=true draw=true keys=p,h,d1,d3,b1,n,pt route=zincir routedDraw=true
ss-12b-1: match=true draw=true keys=p,h,d1,d3,b1,n route=zincir routedDraw=true
hp-08b-1: match=true draw=false keys= route=zincir routedDraw=false
c2052: match=true draw=true keys=p,h,d1,d3,b1,n route=zincir routedDraw=true
a2052: match=true draw=true keys=p,h,d1,d3,b1,n route=zincir routedDraw=true
offset-08b-1: match=true draw=true keys=p,h,d1,d3,b1,n route=zincir routedDraw=true
clip-12b-2: match=true draw=true keys=p,h,d1,d3,b1,n,pt route=zincir routedDraw=true
hp-c2052: match=true draw=false keys= route=zincir routedDraw=false
415h: match=true draw=false keys= route=zincir routedDraw=false
official-hp-reference: match=true draw=true keys=p,h,d1,d3,b1,n,bore route=zincir routedDraw=true
official-hp-no-bore: match=true draw=true keys=p,h,d1,d3,b1,n route=zincir routedDraw=true
existing-08b-1: match=false draw=false keys= route=zincir_disli routedDraw=true
sprocket-1209: match=false draw=false keys= route=zincir_disli routedDraw=true
exclude-disli: match=false draw=false keys= route=zincir_disli routedDraw=false
exclude-kaplin: match=false draw=false keys= route=None routedDraw=false
exclude-sprey: match=false draw=false keys= route=None routedDraw=false
missing-p: match=false draw=false keys= route=zincir_disli routedDraw=false
missing-b1: match=false draw=false keys= route=zincir_disli routedDraw=false
missing-h: match=true draw=false keys= route=zincir routedDraw=false
invalid-number: match=true draw=false keys= route=zincir routedDraw=false
invalid-strands: match=true draw=false keys= route=zincir routedDraw=false
invalid-pt: match=true draw=false keys= route=zincir routedDraw=false
invalid-bore: match=true draw=false keys= route=zincir routedDraw=false
empty: match=false draw=false keys= route=None routedDraw=false
PASS: 460px screenshots; SVG/text bounds, labels, strand count, hollow bore, clip/offset, clickable pt highlight
PASS: 360px screenshots; SVG/text bounds, labels, strand count, hollow bore, clip/offset, clickable pt highlight
PASS: all 17 existing chain pages bypass zincir and retain non-null zincir_disli drawings
PASS: built yamansa-urun.js parses in Chrome
PASS: ES5 lexical guard and no ctx.data dependency
PASS: diff whitespace and existing zincir_disli files unchanged
```

## Görsel inceleme sonrası revizyon

- Yan görünüş büyütüldü: tek tam hatve ve normal zincirlerde kırpılmış komşu plakalar. Alan genişliği 176 SVG px. Büyük alt tip yazıları kaldırıldı.
- Makaralı zincirde yan görünüş ve kesit **aynı mm→SVG ölçeğini** kullanır. 16B-4 kesit plakaları artık 64,2 SVG px yüksekliğinde (önce yaklaşık 25 px); 360px önizlemede yaklaşık 50 px.
- 3–4 sırayı tek yatay şeride küçültmek yerine aynı pim kesiti iki devam satırında gösterilir: ilk satırda sıra 1–2, ikinci satırda kalan sıralar. Pim uçlarında kırılma işaretleri ve küçük `A-A · DEVAM` yazısı vardır. Böylece tüm sıralar, gerçek h oranı ve pt korunur; enine kesit anisotropik olarak gerilmez. `pt` ölçüsü ilk iki sıra merkezinin mesafesidir.
- Sıra sayısının lider çizgileri kaldırıldı; yalnız anahtar ve küçük `n` metni kaldı.
- d3 ilk makarada, d1 diğer pimde; yatay çap ölçüleri ve dik uzatma çizgileriyle birbirinden ayrı gösterilir. Çaplar için çapraz lider yok.
- Yarım kilit kesiti artık iki pim ekseninden geçen boyuna kesittir: sabit kalınlıklı iki krank plaka, bir uçta makara/burç ve diğer uçta pim. Karşılıklı eğik/flared enine plakalar kaldırıldı. Yan görünüşte makara yalnız makara ucunda gösterilir.
- Tam kilit boyuna kesitinde dış plakalar, iki pim ve pim uçlarına oturan ayrı yaylı klips bulunur. Çok sıralı kilitte her sıra plaka çifti ortak iki pim üzerinde gösterilir. Son yönlendirme düzeltmesiyle tam kilit kesitindeki plakalar diğer zincir kesitleriyle aynı yöndedir; b1 üstte ve pt altta yatay ölçülendirilir. Boyuna kilit kesitleri, b1/pt genişliğini de gösterecek şekilde kendi alanına ölçeklenir; h ölçeği eşitliği makaralı zincirin enine kesiti için geçerlidir.
- Etiketler, anahtar sırası, fixture verileri, eşleştirme ve eksik ölçü davranışı değişmedi. 27 fixture iki genişlikte yeniden çalıştırıldı; mevcut 17 sayfa ve dişli yönlendirmesi yine geçti. Build yeniden çalıştı, üretilen JS Chrome'da parse edildi.
- Birleşik dosya: `site/draw/preview/zincir/review-460.png` (936×1313, iki sütun; 16b-4, 08b-2, offset-08b-1, clip-12b-2, c2052). Beş 460px kartın tamamı ve 16B-4 360px kartı görsel olarak incelendi; önceki metin sınırı/çakışma kontrolleri de geçti.

Ek browser kontrolü çıktısı:

```text
PASS: common side/section scale; h matches section plates; 16B-4 plates 64.2 SVG px
PASS: cranked offset pair, two-pin link sections, section spring clip, no n leader fan or diagonal d1/d3 leaders
PASS: five full-resolution 460px previews combined: site/draw/preview/zincir/review-460.png
```

Ticimax paneline girilmedi, yükleme/deploy yapılmadı. Bu adım 230 ürünün nihai içerik/görsel/SEO teslimi değildir. Onaylı marka/standart veri kararları `orkapt/zincir` worktree'sindeki ara verilere uygulandı; o dalın `work/` dosyaları henüz commit edilmedi.
