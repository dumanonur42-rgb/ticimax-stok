# pinyon_kremayer

## Sözleşme ve loader

`site/yg.js:26–29` alfabetik ilk match sonucunda durur; draw null döndüğünde sıradaki modüle geçmez. `site/build.py` alt çizgiyle başlamayan draw/*.js dosyalarını otomatik birleştirir. lineer.match, LİNEER breadcrumb için koşulsuz true olabilir; SFU/DSG/SAC/TBR/VM böylece gölgelenir.
Mevcut dosyalara dokunulmadı. vidali_mil.js aynı API nesnesini hem `vidali_mil` hem öncelik anahtarı `0_vidali_mil` olarak kaydeder. İlk anahtar sıralamada lineer’den önce gelir; match yalnız beş hedef alt tiptedir. İlgisiz ürünlerde false döner. Canonical arayüz korunur. Loader değişikliği gerekmez; ileride loader açık öncelik/fallback desteklerse alias kaldırılabilir.

## Kapsam

47 gerçek ürün: 41 SVG, 6 null. Üç negatif: yabancı aile, gerekli ölçü iki veri alanında eksik, boş ölçü listeleri.

ES5, bağımsız modül; yalnız window.YDRAW kaydı, data-k/keys eşliği, opt.id önekli marker/pattern, iki renk, 460×260 viewBox. Yazılan sayılar yalnız kaynak ctx ölçüleridir. Boyu bilinmeyen kesit şematiktir; bilinmeyen boy yazılmaz.

## Alt tipler ve ölçü sınırları

- 40 düz pinyonda Z adet involüt benzeri diş, De ve Dp, m ve Z vardır. Kesit taramalıdır; diş genişliği/göbek boyu yazılmaz.
- **Önemli sınır:** ürünlerde `Ölçü (d)` genellikle 50 mm, `Ölçü (D)` 15 mm gibi gelir; kaynak çizim D/D1/D2/D3/D4 kullanır. Bunları ters çevirip delik/göbek diye adlandırmadık. Bu 40 SVG’de iç halkalar ve göbek kesiti açıkça şematik, d/D sayısal ölçüleri yoktur. Kaynakta anlamı açık `Göbek Çapı (D)` ve `Delik/İç Çap (d)` bulunursa modül bunları ölçülendirir. Bu karar istenen tam göbek/delik ölçülendirmesinin henüz tamamlanmadığı anlamına gelir.
- Tam hp/he/hs/p/L bulunan tek kremayer çizilir: yan diş profili, p, L kırık gösterim, hs×he kesit ve hp ekseni. Diğer altı kremayerde he/hs/hp bilinmiyor; a/b alanları bunların yerine geçirilmez. KRKA profil teyidi de hâlâ eksiktir.

Etiketler: Modül (m), Diş Sayısı (Z), Dış Çap (De), Bölüm Dairesi Çapı (Dp), Hatve (p), Boy (L), Ölçü (hs), Ölçü (he), Ölçü (hp). Belirsiz Ölçü (d)/(D) çizim keys listesine alınmaz.

## Ölçülendirme ve kesit kalite düzeltmesi

Referans olarak `preview/bilyali/w360-c0.png` ve `preview/lineer/00-460.png` açıldı. Aynı ince uzatma çizgisi, sınırda ok ucu, tarama ve eksen çizgisi dili kullanıldı.
Ölçü oklarının referansı marker ucudur (refX=10); uzatma çizgileri ölçülen kontur veya eksen noktasından başlar. Çaplarda Ø vardır. Yazılar 12–12,5 px bold; 460/360 px tüm SVG metin kutuları taşma ve birbirleriyle çakışma için denetlendi. SVG’de açıklama notu yoktur: yalnız görünüş başlıkları, ölçüler ve pinyon z/m bilgisi bulunur.
Pinyonda De dış diş ucu zarfına, Dp bölüm dairesi kutuplarına bağlıdır. z ve m başlık altında oklu olmayan ayrı data-k gruplarıdır. Kesitte diş bölgesi, kök çizgisi, göbek, açık delik ve eksen bulunur. Diş genişliği ve anlamı belirsiz d/D sayıları eklenmedi; bu eksikler yalnız rapordadır.
SFU kesitindeki A/D çapları ve B kalınlığı ön görünüşle aynı ölçeğe bağlıdır. W uzatmaları delik dairesinin çap uçlarından çıkar. İç bilya kanalı profilleri kesik çizgilidir; Ph aynı profilde iki komşu diş tepesi arasında ölçülür. Q oku çizilmiş radyal yağlama deliğinin ağzına gider. Eksenel L hâlâ kaynakta bilinmediğinden boy ölçüsü verilmez; kesit uzunluğu temsili kalır.
VM diş profili ve helisel izleri ile bir adımlık Ph gösterilir. DSG kesitinde açık iç delik ve kaynak L/B/H oranları korunur. TBR kesitine yuvarlanma elemanları eklendi; d çap çizgisi delik merkezinden geçer, S1 oku çizilmiş bağlantı deliğine gider. SAC sayısal destek kesiti yokken yine null döner; tam verili renderer da uzatma/çap çizgileri kullanır.

## Gerçek ürün sonuçları

| Kod | Sonuç | Loader seçimi | Keys / null nedeni |
|---|---|---|---|
| ORK KR M320201000 | null | pinyon_kremayer | hp/he/hs kesit ölçüleri eksik; bazı kodlarda L de yok |
| ORK KR M550503000 | null | pinyon_kremayer | hp/he/hs kesit ölçüleri eksik; bazı kodlarda L de yok |
| ORK KRKA M410053010 | null | pinyon_kremayer | hp/he/hs kesit ölçüleri eksik; bazı kodlarda L de yok |
| ORK KRKA M410053012 | null | pinyon_kremayer | hp/he/hs kesit ölçüleri eksik; bazı kodlarda L de yok |
| ORK KRKA M41005308 | null | pinyon_kremayer | hp/he/hs kesit ölçüleri eksik; bazı kodlarda L de yok |
| ORK KRKA M422222010 | null | pinyon_kremayer | hp/he/hs kesit ölçüleri eksik; bazı kodlarda L de yok |
| ORK KRÖ M225251000 | SVG | pinyon_kremayer | p, L, hs, he, hp |
| ORK PD M416 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M417 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M418 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M419 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M421 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M423 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M424 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M426 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M427 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M428 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M429 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M431 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M432 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M433 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M434 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M435 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M436 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M437 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M438 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M439 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M440 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M441 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M442 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M443 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M444 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M445 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M446 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M447 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M448 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M449 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M450 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M520 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M522 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M524 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M526 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M528 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M530 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M532 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M534 | SVG | pinyon_kremayer | De, Dp, Z, m |
| ORK PD M536 | SVG | pinyon_kremayer | De, Dp, Z, m |

## Kontrol ve yeniden üretim

```sh
python3 site/draw/_lineer_diger.py --catalog /home/ubuntu/repos/ticimax-stok
/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node site/draw/_test_lineer_diger.js /home/ubuntu/repos/ticimax-stok/veri/lineer-ctx.json
python3 site/draw/_lineer_diger.py --preview
```

460 ve 360 px tüm başarılı ürün PNG’leri `site/draw/preview/pinyon_kremayer/` içinde; HTML null nedenleri dahil tüm gerçek ürünleri içerir. Metin sınırları ve tıklanan data-k grubunun kırmızı olması Chromium’da test edildi.
Görsel olarak açılan 360 px PNG’ler: pinyon_kremayer/ORK_PD_M416-360.png, pinyon_kremayer/ORK_KR__M225251000-360.png, vidali_mil/ORK_VM_1605-360.png, vidali_mil/ORK_VMS_SFU1605-360.png, vidali_mil/ORK_VSG_DSG16H-360.png, vidali_mil/ORK_LR_TBR16UU-360.png. Ölçü yazıları çakışmıyor; tarama ve eksen çizgileri okunur. Göbek/delik ve boy eksikliği yalnız raporda belirtilir. Canlı siteye yüklenmedi.
PDF raster aracı pdftoppm ortamda yoktu; Python bağımlılıkları kontrol edildi ve kurulu pypdfium2 ile kaynak PDF açıldı. Ortam/bağımlılık ayarı değiştirilmedi.
