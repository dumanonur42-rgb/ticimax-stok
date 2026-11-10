# vidali_mil

## Sözleşme ve loader

`site/yg.js:26–29` alfabetik ilk match sonucunda durur; draw null döndüğünde sıradaki modüle geçmez. `site/build.py` alt çizgiyle başlamayan draw/*.js dosyalarını otomatik birleştirir. lineer.match, LİNEER breadcrumb için koşulsuz true olabilir; SFU/DSG/SAC/TBR/VM böylece gölgelenir.
Mevcut dosyalara dokunulmadı. vidali_mil.js aynı API nesnesini hem `vidali_mil` hem öncelik anahtarı `0_vidali_mil` olarak kaydeder. İlk anahtar sıralamada lineer’den önce gelir; match yalnız beş hedef alt tiptedir. İlgisiz ürünlerde false döner. Canonical arayüz korunur. Loader değişikliği gerekmez; ileride loader açık öncelik/fallback desteklerse alias kaldırılabilir.

## Kapsam

31 gerçek ürün: 22 SVG, 9 null. Üç negatif: yabancı aile, gerekli ölçü iki veri alanında eksik, boş ölçü listeleri.

ES5, bağımsız modül; yalnız window.YDRAW kaydı, data-k/keys eşliği, opt.id önekli marker/pattern, iki renk, 460×260 viewBox. Yazılan sayılar yalnız kaynak ctx ölçüleridir. Boyu bilinmeyen kesit şematiktir; bilinmeyen boy yazılmaz.

## Alt tipler ve ölçü sınırları

- VM: 6/6; Mil Çapı (d), Vida Adımı (Ph), Boy (L). Kırık gövde, bir adımlık Ph, katı mil kesiti.
- SFU: 8/9; d/Ph/D/A/B/W/X ve Q varsa. SFU5010 yalnız -4 kaynaklı olduğundan ortak varyant montaj ölçüleri henüz yayınlanmaz ve null döner. Ön görünüşte flanş, delikler, delik dairesi; kesitte vida kanalı ve kırık gövde. L verilmediği için L ölçüsü yoktur. Altı/sekiz delik yerleşimi kaynak SFU katalog şeklinin şematik geometrisidir; ekrana delik adedi yazılmaz. Flanş H, Da gibi kullanılmayan değerler sayfada kalır fakat keys içine eklenmez.
- DSG: 4/5; D/B/H/h/L gerekli. Delikli ön görünüş ve boyuna taramalı kesit. DSG40H çelişkili kesit nedeniyle null.
- TBR: 4/4; d/W/L gerekli, S1 varsa gösterilir. Açık rulman kesiti; genel G/A/B/D/C harflerine kanıtlanmamış yükseklik/merkez anlamı atanmaz ve bu ölçüler keys listesine alınmaz.
- SAC: 0/7; renderer d/B/H/h/L ile destekli milin ön görünüşünü ve kesitini destekler, fakat gerçek 7 girdide yalnız d/L vardır. B/H/h tahmin edilmedi; tümü null. Tam destek kesiti olmadan sıradan mil resmi çizilmez.

## Ölçülendirme ve kesit kalite düzeltmesi

Referans olarak `preview/bilyali/w360-c0.png` ve `preview/lineer/00-460.png` açıldı. Aynı ince uzatma çizgisi, sınırda ok ucu, tarama ve eksen çizgisi dili kullanıldı.
Ölçü oklarının referansı marker ucudur (refX=10); uzatma çizgileri ölçülen kontur veya eksen noktasından başlar. Çaplarda Ø vardır. Yazılar 12–12,5 px bold; 460/360 px tüm SVG metin kutuları taşma ve birbirleriyle çakışma için denetlendi. SVG’de açıklama notu yoktur: yalnız görünüş başlıkları, ölçüler ve pinyon z/m bilgisi bulunur.
Pinyonda De dış diş ucu zarfına, Dp bölüm dairesi kutuplarına bağlıdır. z ve m başlık altında oklu olmayan ayrı data-k gruplarıdır. Kesitte diş bölgesi, kök çizgisi, göbek, açık delik ve eksen bulunur. Diş genişliği ve anlamı belirsiz d/D sayıları eklenmedi; bu eksikler yalnız rapordadır.
SFU kesitindeki A/D çapları ve B kalınlığı ön görünüşle aynı ölçeğe bağlıdır. W uzatmaları delik dairesinin çap uçlarından çıkar. İç bilya kanalı profilleri kesik çizgilidir; Ph aynı profilde iki komşu diş tepesi arasında ölçülür. Q oku çizilmiş radyal yağlama deliğinin ağzına gider. Eksenel L hâlâ kaynakta bilinmediğinden boy ölçüsü verilmez; kesit uzunluğu temsili kalır.
VM diş profili ve helisel izleri ile bir adımlık Ph gösterilir. DSG kesitinde açık iç delik ve kaynak L/B/H oranları korunur. TBR kesitine yuvarlanma elemanları eklendi; d çap çizgisi delik merkezinden geçer, S1 oku çizilmiş bağlantı deliğine gider. SAC sayısal destek kesiti yokken yine null döner; tam verili renderer da uzatma/çap çizgileri kullanır.

## Gerçek ürün sonuçları

| Kod | Sonuç | Loader seçimi | Keys / null nedeni |
|---|---|---|---|
| ETA VMS SFU2005 | SVG | 0_vidali_mil | A, W, X, d, B, D, Ph, Q |
| ETA VMS SFU2505 | SVG | 0_vidali_mil | A, W, X, d, B, D, Ph, Q |
| ETA VMS SFU3210 | SVG | 0_vidali_mil | A, W, X, d, B, D, Ph, Q |
| ORK ADM SAC164000 | null | 0_vidali_mil | SAC destek kesitinin B/H/h ölçüleri yok; SBR geometrisi varsayılmadı |
| ORK ADM SAC204000 | null | 0_vidali_mil | SAC destek kesitinin B/H/h ölçüleri yok; SBR geometrisi varsayılmadı |
| ORK ADM SAC253000 | null | 0_vidali_mil | SAC destek kesitinin B/H/h ölçüleri yok; SBR geometrisi varsayılmadı |
| ORK ADM SAC254000 | null | 0_vidali_mil | SAC destek kesitinin B/H/h ölçüleri yok; SBR geometrisi varsayılmadı |
| ORK ADM SAC303000 | null | 0_vidali_mil | SAC destek kesitinin B/H/h ölçüleri yok; SBR geometrisi varsayılmadı |
| ORK ADM SAC304000 | null | 0_vidali_mil | SAC destek kesitinin B/H/h ölçüleri yok; SBR geometrisi varsayılmadı |
| ORK ADM SAC404000 | null | 0_vidali_mil | SAC destek kesitinin B/H/h ölçüleri yok; SBR geometrisi varsayılmadı |
| ORK LR TBR16UU | SVG | 0_vidali_mil | W, d, L, S1 |
| ORK LR TBR20UU | SVG | 0_vidali_mil | W, d, L, S1 |
| ORK LR TBR25UU | SVG | 0_vidali_mil | W, d, L, S1 |
| ORK LR TBR30UU | SVG | 0_vidali_mil | W, d, L, S1 |
| ORK VM 1605 | SVG | 0_vidali_mil | d, Ph, L |
| ORK VM 2005 | SVG | 0_vidali_mil | d, Ph, L |
| ORK VM 2505 | SVG | 0_vidali_mil | d, Ph, L |
| ORK VM 3210 | SVG | 0_vidali_mil | d, Ph, L |
| ORK VM 4010 | SVG | 0_vidali_mil | d, Ph, L |
| ORK VM 5010 | SVG | 0_vidali_mil | d, Ph, L |
| ORK VMS SFU1605 | SVG | 0_vidali_mil | A, W, X, d, B, D, Ph, Q |
| ORK VMS SFU2005 | SVG | 0_vidali_mil | A, W, X, d, B, D, Ph, Q |
| ORK VMS SFU2505 | SVG | 0_vidali_mil | A, W, X, d, B, D, Ph, Q |
| ORK VMS SFU3210 | SVG | 0_vidali_mil | A, W, X, d, B, D, Ph, Q |
| ORK VMS SFU4010 | SVG | 0_vidali_mil | A, W, X, d, B, D, Ph, Q |
| ORK VMS SFU5010 | null | 0_vidali_mil | Yalnız -4 kaynakları bulundu; ikinci varyantta ortak montaj ölçüleri kanıtlanamadı |
| ORK VSG DSG16H | SVG | 0_vidali_mil | B, H, D, h, L |
| ORK VSG DSG20H | SVG | 0_vidali_mil | B, H, D, h, L |
| ORK VSG DSG25H | SVG | 0_vidali_mil | B, H, D, h, L |
| ORK VSG DSG32H | SVG | 0_vidali_mil | B, H, D, h, L |
| ORK VSG DSG40H | null | 0_vidali_mil | DSG40H H/h/L kaynakları çelişkili, kesit verisi eksik |

## Kontrol ve yeniden üretim

```sh
python3 site/draw/_lineer_diger.py --catalog /home/ubuntu/repos/ticimax-stok
/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node site/draw/_test_lineer_diger.js /home/ubuntu/repos/ticimax-stok/veri/lineer-ctx.json
python3 site/draw/_lineer_diger.py --preview
```

460 ve 360 px tüm başarılı ürün PNG’leri `site/draw/preview/vidali_mil/` içinde; HTML null nedenleri dahil tüm gerçek ürünleri içerir. Metin sınırları ve tıklanan data-k grubunun kırmızı olması Chromium’da test edildi.
Görsel olarak açılan 360 px PNG’ler: pinyon_kremayer/ORK_PD_M416-360.png, pinyon_kremayer/ORK_KR__M225251000-360.png, vidali_mil/ORK_VM_1605-360.png, vidali_mil/ORK_VMS_SFU1605-360.png, vidali_mil/ORK_VSG_DSG16H-360.png, vidali_mil/ORK_LR_TBR16UU-360.png. Ölçü yazıları çakışmıyor; tarama ve eksen çizgileri okunur. Göbek/delik ve boy eksikliği yalnız raporda belirtilir. Canlı siteye yüklenmedi.
PDF raster aracı pdftoppm ortamda yoktu; Python bağımlılıkları kontrol edildi ve kurulu pypdfium2 ile kaynak PDF açıldı. Ortam/bağımlılık ayarı değiştirilmedi.
