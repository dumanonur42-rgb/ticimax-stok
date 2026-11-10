# V Kasnak Ürün Hazırlama Raporu

## Kapsam ve sayılar

| Kontrol | Sonuç |
|---|---:|
| Toplam ürün | 372 |
| Kör V Kasnak (VK) | 340 |
| Dolu V Kasnak (VKD) | 32 |
| Birebir görsel | 1 |
| Aynı tip görsel | 371 |
| Kullanılan farklı kaynak fotoğraf | 7 |
| Üretilen JPG | 372 |
| Eksik teknik bilgisi bulunan ürün | 372 |
| Çap türü belirsiz ürün | 372 |
| Kaynak ad/birim alanında ambalaj miktarı bulunan ürün | 0 |
| Satış birimi ADET olan kaynak ürün | 372 |
| Yeni kategori önerisi | 0 |

`urunler.jsonl` bütün kaynak kodlarını birer kez içerir. Marka Yamansa, satış birimi Adet olarak hazırlanmıştır. Her açıklamanın teknik listesinde Model ve Satış Birimi bulunur. Ambalaj miktarı bulunmadığından Ambalaj satırı eklenmemiştir. Ürünler siteye yüklenmemiştir; bu çalışma içe aktarma dosyaları ve görsellerin hazırlanmasıdır.

Kategori her iki ürün tipinde `KASNAKLAR>KÖR V KASNAKLAR`; `EK_KATEGORILER=[]`, `yeni_kategori=false` bırakılmıştır. KÖR V KASNAKLAR, `site_kategoriler.txt` içinde mevcuttur; `katurl.txt` içinde URL'si yoktur. Önceki canlı site araştırmasında `/kasnaklar` sayfası 15 ürün ve alternatör kasnakları/gergi makaraları göstermiştir. Bu canlı kategori uyuşmazlığı kullanıcı kontrolü gerektirir; bu üretimde yeniden canlı site taraması yapılmamıştır. Açıklamalardaki iki bağlantı mevcut `katurl.txt` içindeki `/duz-v-kayis` ve `/kasnaklar` adresleridir.

## Metin, teknik bilgi ve sınırlar

Başlıklar model, tip, kanal sayısı, kayış genişliği, profil ve kasnak çapını içerir. SEO başlığı ürün adı biçimindedir; marka son eki yoktur. SEO açıklaması ölçüler ve “Hızlı kargo.” ifadesiyle biter. Anahtar kelimelerde ölçü yazımları, model + v kasnak, kasnak + çap, profil tipi, kanal/profil birleşimleri ve ASCII karşılıkları bulunur.

Açıklamalardaki eksik-veri uyarıları kaldırılmıştır. Kullanım Alanları kısa ürün paragrafı ve tipik V kayışlı tahriklerin listesiyle sunulur; liste sırası ve paragraflar deterministik değişir. Kullanım alanları genel V kayışlı aktarma örnekleridir; belirli makineye uygunluk, güç veya devir değeri iddiası değildir. 120 karakteri aşan 2232 paragrafın tamamı ürün modeli içerir ve birbirinden farklıdır.

* VK: Kör V Kasnak. Kör, mil deliği açılmamış/kullanılacak mile göre işlenecek göbek anlamında kullanılır; mil deliği ölçüsü verilmez.
* VKD: Dolu V Kasnak. Dolu/Kör arasındaki imalat farkı kaynakta açıklanmadığından yapısal fark anlatılmamıştır.
* Kaynak boyutu yalnızca **Kasnak Çapı** olarak gösterilir. Dış çap/bölüm çapı ayrımı belirsizdir; tüm ürünlerde `cap_tipi_belirsiz` bayrağı vardır.
* Delik çapı, toplam genişlik, göbek ölçüleri ve ağırlık eksikleri yalnızca `bayraklar` alanında tutulmuştur. Sayısal tahmin yapılmamıştır; malzeme iddiası eklenmemiştir.
* `teknik_kaynak`, kaynak kaydındaki seri URL'sini ve DIN 2215 / ISO 4184 klasik V kayış eşleştirmesini içerir: 13 mm=A, 17 mm=B, 22 mm=C.
* Kaynak stok kodları korunmuştur. Kaynak URL'leri izlenebilirlik metaverisidir; müşteri başlıkları, metinleri, anahtar kelimeleri ve görsel dosya adları kaynak marka adlarını içermez.

Ölçülen alan uzunlukları: ACIKLAMA 2396–2565; SEO başlığı 44–46; SEO açıklaması 78–81; anahtar kelimeler 539–637 karakter.

## Görsel kaynakları

Onaylanan eşleştirme değiştirilmemiştir. Birebir olan ürün `ORK VK 131175` (13x1x175); fotoğraf toplanan ilanlar içinde o ölçüye özgüdür. Aynı fotoğrafın farklı dosya adlarıyla kullanıldığı diğer eşleşmeler birebir sayılmamıştır. Önceki tarama 699 ilanı kapsamış; Esanayim hız sınırı nedeniyle bütün web sitesinin eksiksiz tarandığı iddia edilmemiştir. Kaynakların kullanım hakkına dair ayrıca lisans doğrulaması yapılmamıştır.

| Grup | Ürün sayısı | İlan | Fotoğraf |
|---|---:|---|---|
| 1 kanal, küçük çap grubu | 28 | [Esanayim 13x1x110](https://www.esanayim.com/urun/torkpt-13x1x110-v-kayis-kasnak) | [Kaynak](https://www.esanayim.com/idea/ia/23/myassets/products/186/13x1x110-v-kayis-kasnak-25783.png?revision=1783616661) |
| 1 kanal, kollu/büyük çap grubu | 35 | [Esanayim 13x1x175](https://www.esanayim.com/urun/13x1x175-v-kayis-kasnak-33372) | [Kaynak](https://www.esanayim.com/idea/ia/23/myassets/products/434/orka-13x1x175-v-kayis-kasnak-21188.jpeg?revision=1784067114) |
| 2 kanal | 73 | [Esanayim 17x2x140](https://www.esanayim.com/urun/torkpt-17x2x140-v-kayis-kasnak) | [Kaynak](https://www.esanayim.com/idea/ia/23/myassets/products/215/17x2x140-v-kayis-kasnak-25828.png?revision=1783617066) |
| 3 kanal | 76 | [Esanayim 13x3x60](https://www.esanayim.com/urun/torkpt-13x3x60-v-kayis-kasnak) | [Kaynak](https://www.esanayim.com/idea/ia/23/myassets/products/156/13x3x60-v-kayis-kasnak-25691.jpeg?revision=1783616156) |
| 4 kanal | 76 | [Esanayim 17x4x80](https://www.esanayim.com/urun/torkpt-17x4x080-v-kayis-kasnak) | [Kaynak](https://www.esanayim.com/idea/ia/23/myassets/products/232/torkpt-17mm-kayis-4-kanal-80-mm-cap-v-kasnak-5570.jpeg?revision=1783617245) |
| 5 kanal | 56 | [C-PM SPA 100-5](https://c-pm.ru/shkivy-spa-5/shkiv-spa-100-5/) | [Kaynak](https://c-pm.ru/upload/iblock/c93/xkupig27qv1n313ymm4k4l4gcb5ihrfk/shkiv_spa_100_5.webp) |
| 6 kanal | 28 | [C-PM SPB 140-6](https://c-pm.ru/shkivy-spb-6/shkiv-spb-140-6/) | [Kaynak](https://c-pm.ru/upload/iblock/fb9/bl5x3ppusxx39ea199w5w1ytiwzdt4w9/shkiv_spa_140_6_.webp) |

Aynı tip fotoğraflar kanal sayısını korur; her çapın gövde/kollu geometrisini birebir temsil etmez. VKD'ye özgü imalat görünümü doğrulanmış değildir. 5/6 kanallı fotoğrafların göbeği yandan görünüşte gizlidir; kaynak ürünler işlenmek üzere sunulan kasnaklardır. Bu fotoğraflar onaylanan aynı-tip eşleştirmeleridir; teknik profil kanıtı olarak kullanılmamıştır.

Gri dikdörtgenin kaynağı `sablon.png` içindeki eski ürünün 350 piksel altında kalan zeminidir. Artık beyaz 500x500 tuval üzerine yalnızca üst 100 piksellik logo bandı alınır. Fotoğraflardaki açık zemin pikselleri, kol arası boşluklar dahil beyazlaştırılır. Ürün kırpılmış kutusuyla 480x250 alana orantılı yerleştirilir; küçük kaynaklar da bu alana büyütülür. Ürün üst 100 ve alt 150 piksellik bantların arasındadır. Yedi kompozit görsel olarak, kol boşlukları dahil incelenmiştir; gri dikdörtgen görülmemiştir. Ürün yüzeyinin doğal tonları ve gölgeleri korunmuştur. Otomatik kontrol tüm JPG'lerde y355–499 bölgesinin saf beyaz olduğunu da doğrular.

Kompozit kontrol levhası: `/home/ubuntu/vk-research/bulk_composites.jpg`.

## Çizim modülü

Dal: `draw/v_kasnak` (taban `origin/site-assets`). Çalışma ağacı: `/home/ubuntu/repos/ticimax-stok-draw`.

Dosyalar:

* `site/draw/v_kasnak.js`
* `site/draw/fixtures/v_kasnak.json`
* `site/draw/fixtures/check_v_kasnak.js`
* `site/draw/preview/v_kasnak.html`
* `site/draw/preview/v_kasnak/case0_460.png`, `case0_360.png`
* `site/draw/preview/v_kasnak/case1_460.png`, `case1_360.png`
* `site/draw/preview/v_kasnak/case2_460.png`, `case2_360.png`
* `site/draw/preview/v_kasnak/case3_460.png`, `case3_360.png`
* `site/draw/rapor/v_kasnak.md`

ES5, dış bağımlılıksız; `window.YDRAW['v_kasnak']` üzerinden `match/draw` verir. Kayış Genişliği, Kanal Sayısı ve Kasnak Çapı etiketlerinden w/z/D okunur; kanal sayısı gerçek veriyle çizilir. Eksik, geçersiz veya çelişkili ölçülerde null döner. Triger, burçlu, rulman, alternatör ve gergi aileleri dışlanır. Ön görünüş ve KESİT A-A, 460x250 viewBox içindedir; 360/460 genişlikli önizlemeler bulunur.

**Oranlar şematik.** Göbek, toplam genişlik, kanal derinliği ve açısı ölçülendirilmez; mil deliği ölçüsü türetilmez. Çapın dış/bölüm çapı ayrımı kaynakta belirtilmez. Bu açıklama SVG içinde yer almaz; SVG'de yalnızca çizim, ölçüler ve görünüş başlıkları bulunur. 372 ürünün açıklama teknik listesi ayrı ayrı Node ile modüle verilmiş; hepsinde null olmayan çizim ve kaynakla eşleşen D/w/z değerleri doğrulanmıştır.

Fixture kontrol çıktısı:

```text
PASS fixture 0 -> Kasnak Çapı=100 mm, Kayış Genişliği=13 mm, Kanal Sayısı=1
PASS fixture 1 -> Kasnak Çapı=100 mm, Kayış Genişliği=13 mm, Kanal Sayısı=3
PASS fixture 2 -> Kasnak Çapı=200 mm, Kayış Genişliği=13 mm, Kanal Sayısı=6
PASS fixture 3 -> Kasnak Çapı=90 mm, Kayış Genişliği=17 mm, Kanal Sayısı=4
PASS missing Kasnak Çapı -> null
PASS empty, conflicting, invalid values and excluded families
PASS sample ACIKLAMA labels alone feed module
```

## Otomatik denetim

Komut (`node` PATH üzerinde bulunuyorsa `--node` gerekli değildir):

```sh
python3 v_kasnak_uret.py --audit --node /home/ubuntu/.nvm/versions/node/v24.22.2/bin/node
```

Çıktı:

```text
PASS PRODUCTS 372; empty fields 0; duplicate kod/title/image filename 0
PASS SEO title <=60; description <=155; keywords <=950; ACIKLAMA >=1800
PASS forbidden customer names/filenames 0; U+0307 0; em dash 0; invalid links 0
PASS LONG PARAGRAPHS 2232 unique; repeated >120-char paragraphs 0
PASS Model + Satış Birimi: Adet 372/372; package wording in titles 0; warning/missing-data prose 0
PASS PACKAGE_QTY_IN_AD_OR_BIRIM 0; BIRIM {'ADET': 372}
PASS IMAGES 372/372 JPEG 500x500; bottom band y355-499 pure white; birebir 1; ayni_tip 371
PASS DRAWING 372/372: ACIKLAMA labels -> non-null, correct D/w/z; no schematic/diameter caption in SVG
AUDIT OK
```

Yeniden üretim: `python3 v_kasnak_uret.py`. Varsayılan onaylı görsel haritası `/home/ubuntu/vk-research/img_map.json`; başka konum için `--image-map` kullanılır. Harita dosyalarındaki geçici kaynak yolları yoksa haritanın yanındaki `originals/` kalıcı yedeği kullanılır. Harita ve orijinaller bu repo tesliminin dışında, araştırma klasöründe korunur. Denetim varsayılan olarak komşu çizim çalışma ağacındaki modülü okur; farklı konum `--draw-module` ile belirtilebilir.

## Ürün önizlemeleri

Basit yerel HTML önizlemeleri; canlı Ticimax görünümü veya yayına alma testi değildir. Dördü de görsel olarak incelenmiştir.

* VK 1 kanal (`ORK VK 131050`): `/tmp/vk/onizleme_vk_1.png`
* VK 6 kanal (`ORK VK 136200`): `/tmp/vk/onizleme_vk_6.png`
* VKD (`ORK VKD 172090`): `/tmp/vk/onizleme_vkd.png`
* Yenilenen 13x3x100: `/tmp/vk/ornek_133100.png`

Kalıcı HTML/PNG kopyaları `/home/ubuntu/vk-research/` içinde aynı dosya adlarıyla saklanır.
