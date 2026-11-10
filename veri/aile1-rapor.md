# Aile 1 teslimi: 52 ürün

Girdideki 16 HGH/HGW araba (pilot dahil), 6 HGR ray ve 30 PMI MSA/MSB arabanın tamamı işlendi. Hiçbiri atlanmadı. Panel erişimi, ürün yükleme ve push yapılmadı. Bu teslim 208 kaydın 52 tanesidir; diğer 156 ürün bu adımın kapsamında değildir.

## Çıktılar

- `urunler.jsonl`: 52 satır, istenen tüm alanlar.
- `gorseller/`: 52 ürün için 500×500 JPG. Seviye: **birebir 14, ayni_tip 38**.
- Ham değer/kaynaklar: `veri/hg.json` (16), `veri/hgr.json` (6), `veri/pmi.json` (30).
- Görsel seçimleri, ham dosya ve kesim bilgileri: `veri/gorsel-secimleri.json`.
- Her ürünün gerçek başlığı, kırıntıları, ürün kimliği, teknik listesi ve ön yazısı: `veri/lineer-ctx.json`.
- Her ürünün match/draw sonucu ve anahtarları: `veri/draw-keys.json`.
- Yerel önizleme dizini: `onizleme/index.html`; her ürüne ait HTML ve SVG aynı dizinde.
- Görünür açıklama uzunluğu: 3232–3978 karakter. İç linkler yalnız `katurl.txt` içindeki lineer araba ve ray kategorileridir.

## Kaynak ve teknik sınırlar

- https://hiwin.com/wp-content/uploads/2026/08/HIWIN-Linear-Guideway-Catalog-1.pdf
- https://www.pmi-amt.com/en/supports/7Z/2022MD09%E8%8B%B1%E6%96%87%28%E8%B7%A8%E9%A0%81P159-300%29%20%282%29.pdf

Resmi PDF kopyaları `veri/hg-resmi-katalog.pdf` ve `veri/pmi-resmi-katalog.pdf` içindedir. İlgili sayfaların metin dökümleri `veri/*sayfa-*.txt` dosyalarında saklanır.

- HGH: HG PDF sayfa 41; HGW: sayfa 45. Her ham kayıtta model satırı bulunur. Yamansa blokları için yalnız ölçüsel geometri kullanıldı. Eşdeğer markanın dinamik/statik yükü ve ağırlığı ayrı `referans_degerler` içinde tutuldu, satış alanlarına aktarılmadı.
- HGR: üstten havşalı delikli ray ölçüleri HG araba tablolarındaki ray kesitinden alındı. **HGR-T alttan dişli rayın h/ ağırlık değerleri kullanılmadı.** WR, HR, D, h, d, P, E ve girdideki 4000 mm boy ham veride bulunur. E standart katalog uç mesafesidir; 4 metre kesimin iki ucunda kesin E eşitliği iddia edilmez. Yamansa kg/m doğrulanamadığı için referans ağırlık müşteri alanına yazılmadı.
- PMI A/LA, E/LE ve S/LS tabloları PDF sayfa 30–32; MSB E ve S sayfa 41–42. A/LA üstten, E/LE üstten veya alttan montajdır. LS/LA/LE uzun gövdeyi ayırt eder. MSB E/S ağır yük gövdeleri TE/TS kısa gövdeyle karıştırılmadı.
- PMI FC hafif ön yük, N normal hassasiyet sınıfıdır (kod açıklamaları sayfa 25/36). SS iki yönlü uç keçesi + alt keçe; ZZ bunlara ek metal sıyırıcıdır (sayfa 122). ZZ toplam L ölçüleri sayfa 125 uzunluk farkıyla güncellendi. Ayrı ZZ ağırlığı verilmediğinden 4 varyantta ağırlık aktarılmadı; kapasite resmi markanın kendi değeridir. Dinamik kapasiteler 50 km nominal ömür esasıyla verilir, doğrudan güvenli çalışma yükü olarak sunulmaz.
- Çizim etiketleri için PMI H2 → H1 (alt açıklık), W2 → N (yanal taşma), ray W1 → WR ve ray H1 → HR eşlemesi yapıldı. Özgün PMI etiketleri de `katalog_etiketleri` içinde korunur. `arac/lineer.js` değiştirilmedi; geometrik şema üretir, üretim/tolerans resmi değildir.
- Pilotun kamuya açık CA karşılaştırması `veri/lineer.json` içinde korunur: https://www.yamansarulman.com/hgh-20-ca-lineer-araba-18295 . CA'nın C/L/L1 değerleri HA'ya aktarılmadı.

## Görsel seçimi ve kontrol

Önce aynı kod arandı; bulunamayanlarda gövde formu aynı, okunur farklı kodu ve yasak logosu olmayan gerçek fotoğraflar seçildi. `birebir`, aynı model kodunun fotoğrafını ifade eder; gerçek Yamansa stok çekimi olduğu iddia edilmez. PMI'nin kendi logosu yalnız PMI ürünlerinde serbesttir. Teknik çizimler, renderlar, filigranlı fotoğraflar ve ambalajlar ürün görseli olarak kullanılmadı.

FOnlineGuide 45HA/45CC/45HC sayfalarının bazı fotoğraflarında 35 kodu görüldüğünden bu fotoğraflar reddedildi. 45HA ve 45HC için kodu görünmeyen aynı tip alt görünüş; 45CC için kodsuz kısa flanş alt görünüş kullanıldı. PMI'de geniş/dar, normal/uzun ve MSB alçak tip fotoğrafları ayrı seçildi. SS/ZZ varyantlarda seviye `ayni_tip` olup fotoğraf conta/sıyırıcı seçeneğinin birebir kanıtı değildir; doğru conta teknik listede yazılıdır.

Ürün dışındaki montaj parçaları satışa dahil değildir. Uzun ray kuyrukları ve diğer ürünler kadraj dışında tutuldu. Renkli/gri zeminlerde rembg `isnet-general-use` kullanıldı. HGW25CC'nin parlak orta yüzeyinde ilk maskenin kestiği alan, kaynak fotoğrafın gerçek pikselleri korunarak geri alındı; ürün yazısı/logo silinmedi ve yeni ürün detayı çizilmedi.

Tuval saf beyazdan kurulur, `sablon.png` dosyasından **yalnız üst 100 px** kopyalanır. Alt panelin tamamı beyazdır. Ürün oranı korunarak yaklaşık 440×240 kutuyu mümkün olduğunca dolduracak şekilde ölçeklenir. Pilotun açık gri şeridi kaldırıldı, aynı HGH20HA kodlu logosuz fotoğrafı `birebir` yapıldı.

Seçilen bütün kaynak fotoğraflar ve bitmiş ürünlerin 4 kontrol paftası açılarak incelendi: `onizleme/gorsel-kontrol-1.jpg` … `onizleme/gorsel-kontrol-4.jpg`. Ayrıca tekil bitmiş örnekler bizzat açıldı:

- `gorseller/hgh-20ha-dar-uzun-lineer-araba-20-mm.jpg`
- `gorseller/hgr-25-lineer-ray-25-mm-4-metre.jpg`
- `gorseller/pmi-msa-30-le-ss-fcn-genis-uzun-lineer-araba-30-mm.jpg`
- `gorseller/pmi-msb-15-s-ss-fcn-dar-alcak-lineer-araba-15-mm.jpg`
- `gorseller/hgw-25cc-genis-lineer-araba-25-mm.jpg`

### Ürün bazında görsel kaynakları

| Kod | Seviye | Kaynak |
|---|---|---|
| ORK LA HGH20HA | birebir | https://www.fonlinearguide.com/Uploads/products/2021-03-10/en-HGH20HA--5-.jpg |
| ORK LA HGH25HA | birebir | https://www.fonlinearguide.com/Uploads/products/2021-03-10/en-HGH25HA--4-.jpg |
| ORK LA HGH30HA | birebir | https://www.fonlinearguide.com/Uploads/products/2022-08-23/en-HGH30HA.jpg |
| ORK LA HGH35HA | birebir | https://www.fonlinearguide.com/Uploads/products/2021-03-11/en-HGH35HA--8-.jpg |
| ORK LA HGH45HA | ayni_tip | https://www.fonlinearguide.com/Uploads/products/2021-03-11/en-HGH45HA--2-.jpg |
| ORK LA HGW15CC | birebir | https://www.fonlinearguide.com/Uploads/products/2022-10-24/en-HGW15CC.jpg |
| ORK LA HGW20CC | birebir | https://www.fonlinearguide.com/Uploads/products/2022-10-24/en-HGW20CC.jpg |
| ORK LA HGW20HC | birebir | https://www.fonlinearguide.com/Uploads/products/2022-10-24/en-HGW20HC.jpg |
| ORK LA HGW25CC | birebir | https://www.fonlinearguide.com/Uploads/products/2022-10-24/en-HGW25CC.jpg |
| ORK LA HGW25HC | birebir | https://www.fonlinearguide.com/Uploads/products/2022-10-24/en-HGW25HC.jpg |
| ORK LA HGW30CC | birebir | https://www.fonlinearguide.com/Uploads/products/2022-10-27/en-HGW30CC.jpg |
| ORK LA HGW30HC | birebir | https://www.fonlinearguide.com/Uploads/products/2022-06-21/en-HGW30HC.jpg |
| ORK LA HGW35CC | birebir | https://www.fonlinearguide.com/Uploads/products/2022-06-21/en-HGW35CC.jpg |
| ORK LA HGW35HC | birebir | https://www.fonlinearguide.com/Uploads/products/2022-06-21/en-HGW35HC.jpg |
| ORK LA HGW45CC | ayni_tip | https://ae-pic-a1.aliexpress-media.com/kf/S8d1b721140e94d03be423f459a974c744.jpg |
| ORK LA HGW45HC | ayni_tip | https://www.fonlinearguide.com/Uploads/products/2021-03-15/en-HGW45HC--4-.jpg |
| ORK LR HGR15 | ayni_tip | https://avatars.mds.yandex.net/get-mpic/11442293/2a0000018cabb833471c0ac26b3354cdd118/orig |
| ORK LR HGR20 | ayni_tip | https://avatars.mds.yandex.net/get-mpic/11442293/2a0000018cabb833471c0ac26b3354cdd118/orig |
| ORK LR HGR25 | ayni_tip | https://avatars.mds.yandex.net/get-mpic/11442293/2a0000018cabb833471c0ac26b3354cdd118/orig |
| ORK LR HGR30 | ayni_tip | https://avatars.mds.yandex.net/get-mpic/11442293/2a0000018cabb833471c0ac26b3354cdd118/orig |
| ORK LR HGR35 | ayni_tip | https://avatars.mds.yandex.net/get-mpic/11442293/2a0000018cabb833471c0ac26b3354cdd118/orig |
| ORK LR HGR45 | ayni_tip | https://avatars.mds.yandex.net/get-mpic/11442293/2a0000018cabb833471c0ac26b3354cdd118/orig |
| PMI MSA15E | ayni_tip | https://sc04.alicdn.com/kf/H88a1507ebf024c7596420cc51fa2e1e8d/225270570/H88a1507ebf024c7596420cc51fa2e1e8d.jpg |
| PMI MSA15S | ayni_tip | https://xn--80akffkb2bye.xn--p1ai/images/stories/virtuemart/product/resized/12,17_560x560.jpg |
| PMI MSA15SZZ | ayni_tip | https://xn--80akffkb2bye.xn--p1ai/images/stories/virtuemart/product/resized/12,17_560x560.jpg |
| PMI MSA20S | ayni_tip | https://xn--80akffkb2bye.xn--p1ai/images/stories/virtuemart/product/resized/12,17_560x560.jpg |
| PMI MSA25S | ayni_tip | https://xn--80akffkb2bye.xn--p1ai/images/stories/virtuemart/product/resized/12,17_560x560.jpg |
| PMI MSA25SZZ | ayni_tip | https://xn--80akffkb2bye.xn--p1ai/images/stories/virtuemart/product/resized/12,17_560x560.jpg |
| PMI MSA30A | ayni_tip | https://sc04.alicdn.com/kf/H88a1507ebf024c7596420cc51fa2e1e8d/225270570/H88a1507ebf024c7596420cc51fa2e1e8d.jpg |
| PMI MSA30E | ayni_tip | https://sc04.alicdn.com/kf/H88a1507ebf024c7596420cc51fa2e1e8d/225270570/H88a1507ebf024c7596420cc51fa2e1e8d.jpg |
| PMI MSA30EZZ | ayni_tip | https://sc04.alicdn.com/kf/H88a1507ebf024c7596420cc51fa2e1e8d/225270570/H88a1507ebf024c7596420cc51fa2e1e8d.jpg |
| PMI MSA30LE | ayni_tip | https://shopcdnpro.grainajz.com/861/upload/other/7bb68a528d87348a98de6a3dd16ad80724ea6af48b679255c36713b2b4ae2cd5.jpeg |
| PMI MSA30LS | ayni_tip | https://image.made-in-china.com/2f0j00SyjcFqHMcJkg/PMI-MSA45LS-Support-Roller-CNC-Linear-Motion-Guide-Rail.webp |
| PMI MSA30S | ayni_tip | https://xn--80akffkb2bye.xn--p1ai/images/stories/virtuemart/product/resized/12,17_560x560.jpg |
| PMI MSA35A | ayni_tip | https://sc04.alicdn.com/kf/H88a1507ebf024c7596420cc51fa2e1e8d/225270570/H88a1507ebf024c7596420cc51fa2e1e8d.jpg |
| PMI MSA35E | ayni_tip | https://sc04.alicdn.com/kf/H88a1507ebf024c7596420cc51fa2e1e8d/225270570/H88a1507ebf024c7596420cc51fa2e1e8d.jpg |
| PMI MSA35LA | ayni_tip | https://shopcdnpro.grainajz.com/861/upload/other/7bb68a528d87348a98de6a3dd16ad80724ea6af48b679255c36713b2b4ae2cd5.jpeg |
| PMI MSA35LE | ayni_tip | https://shopcdnpro.grainajz.com/861/upload/other/7bb68a528d87348a98de6a3dd16ad80724ea6af48b679255c36713b2b4ae2cd5.jpeg |
| PMI MSA35S | ayni_tip | https://xn--80akffkb2bye.xn--p1ai/images/stories/virtuemart/product/resized/12,17_560x560.jpg |
| PMI MSA35SZZ | ayni_tip | https://xn--80akffkb2bye.xn--p1ai/images/stories/virtuemart/product/resized/12,17_560x560.jpg |
| PMI MSA45E | ayni_tip | https://sc04.alicdn.com/kf/H88a1507ebf024c7596420cc51fa2e1e8d/225270570/H88a1507ebf024c7596420cc51fa2e1e8d.jpg |
| PMI MSA45LA | ayni_tip | https://shopcdnpro.grainajz.com/861/upload/other/7bb68a528d87348a98de6a3dd16ad80724ea6af48b679255c36713b2b4ae2cd5.jpeg |
| PMI MSA45LE | ayni_tip | https://shopcdnpro.grainajz.com/861/upload/other/7bb68a528d87348a98de6a3dd16ad80724ea6af48b679255c36713b2b4ae2cd5.jpeg |
| PMI MSA45LS | ayni_tip | https://image.made-in-china.com/2f0j00SyjcFqHMcJkg/PMI-MSA45LS-Support-Roller-CNC-Linear-Motion-Guide-Rail.webp |
| PMI MSA45S | ayni_tip | https://xn--80akffkb2bye.xn--p1ai/images/stories/virtuemart/product/resized/12,17_560x560.jpg |
| PMI MSB15E | ayni_tip | https://ae-pic-a1.aliexpress-media.com/kf/Sae013c3515fb47fe92c2c779351858cdV.png |
| PMI MSB15S | birebir | https://ae-pic-a1.aliexpress-media.com/kf/Sf925feaa64a14e6288008966cf5149959.jpg |
| PMI MSB20E | ayni_tip | https://ae-pic-a1.aliexpress-media.com/kf/Sae013c3515fb47fe92c2c779351858cdV.png |
| PMI MSB25S | ayni_tip | https://image.made-in-china.com/2f0j00LydbZJGcewkq/PMI-MSB20S-Linear-Rail-High-Precision-Linear-Guide-Motion-Slide-Rod-Bearing.webp |
| PMI MSB30E | ayni_tip | https://ae-pic-a1.aliexpress-media.com/kf/Sae013c3515fb47fe92c2c779351858cdV.png |
| PMI MSB30S | ayni_tip | https://image.made-in-china.com/2f0j00LydbZJGcewkq/PMI-MSB20S-Linear-Rail-High-Precision-Linear-Guide-Motion-Slide-Rod-Bearing.webp |
| PMI MSB35S | ayni_tip | https://image.made-in-china.com/2f0j00LydbZJGcewkq/PMI-MSB20S-Linear-Rail-High-Precision-Linear-Guide-Motion-Slide-Rod-Bearing.webp |

## Eksik bayraklı ürünler

- **ORK LA HGH20HA**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LA HGH25HA**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LA HGH30HA**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LA HGH35HA**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LA HGH45HA**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LA HGW15CC**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LA HGW20CC**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LA HGW20HC**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LA HGW25CC**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LA HGW25HC**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LA HGW30CC**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LA HGW30HC**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LA HGW35CC**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LA HGW35HC**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LA HGW45CC**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LA HGW45HC**: eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LR HGR15**: eksik: Yamansa ray ağırlığı (kg/m) için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LR HGR20**: eksik: Yamansa ray ağırlığı (kg/m) için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LR HGR25**: eksik: Yamansa ray ağırlığı (kg/m) için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LR HGR30**: eksik: Yamansa ray ağırlığı (kg/m) için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LR HGR35**: eksik: Yamansa ray ağırlığı (kg/m) için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **ORK LR HGR45**: eksik: Yamansa ray ağırlığı (kg/m) için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı
- **PMI MSA15SZZ**: eksik: ZZ metal sıyırıcılı varyantın ayrı ağırlığı resmi tabloda yok; standart gövde ağırlığı satış metnine aktarılmadı
- **PMI MSA25SZZ**: eksik: ZZ metal sıyırıcılı varyantın ayrı ağırlığı resmi tabloda yok; standart gövde ağırlığı satış metnine aktarılmadı
- **PMI MSA30EZZ**: eksik: ZZ metal sıyırıcılı varyantın ayrı ağırlığı resmi tabloda yok; standart gövde ağırlığı satış metnine aktarılmadı
- **PMI MSA35SZZ**: eksik: ZZ metal sıyırıcılı varyantın ayrı ağırlığı resmi tabloda yok; standart gövde ağırlığı satış metnine aktarılmadı

## Çizim tablosu

Her bağlamda `window.YDRAW.lineer.match(ctx)` ve `draw(ctx, options)` çağrıldı. Hepsi eşleşti ve null olmayan SVG üretti. Her üründe zorunlu bir ölçü kaldırıldığında null döndüğü de kontrol edildi.

| Kod | match | draw() | keys |
|---|---|---|---|
| ORK LA HGH20HA | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LA HGH25HA | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LA HGH30HA | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LA HGH35HA | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LA HGH45HA | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LA HGW15CC | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LA HGW20CC | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LA HGW20HC | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LA HGW25CC | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LA HGW25HC | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LA HGW30CC | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LA HGW30HC | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LA HGW35CC | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LA HGW35HC | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LA HGW45CC | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LA HGW45HC | true | null değil | W, H, L, B, C, L1, H1, N, M |
| ORK LR HGR15 | true | null değil | WR, HR, P |
| ORK LR HGR20 | true | null değil | WR, HR, P |
| ORK LR HGR25 | true | null değil | WR, HR, P |
| ORK LR HGR30 | true | null değil | WR, HR, P |
| ORK LR HGR35 | true | null değil | WR, HR, P |
| ORK LR HGR45 | true | null değil | WR, HR, P |
| PMI MSA15E | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA15S | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA15SZZ | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA20S | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA25S | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA25SZZ | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA30A | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA30E | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA30EZZ | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA30LE | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA30LS | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA30S | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA35A | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA35E | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA35LA | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA35LE | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA35S | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA35SZZ | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA45E | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA45LA | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA45LE | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA45LS | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSA45S | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSB15E | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSB15S | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSB20E | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSB25S | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSB30E | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSB30S | true | null değil | W, H, L, B, C, L1, H1, N, M |
| PMI MSB35S | true | null değil | W, H, L, B, C, L1, H1, N, M |

## Denetim ve önizleme

`arac/denetle.py` zorunlu alanları, boş değerleri, marka yasağını (URL ve dosya adı dahil), U+0307/uzun tire/ondalık noktayı, SEO sınırlarını, açıklama uzunluğunu/bölümlerini, izinli iç linkleri, 120+ karakter paragraf tekrarlarını, ONYAZI ve teknik liste yapısını ve 500×500 JPEG dosyalarını kontrol eder. `--aile` ayrıca 52 girdinin tümünün birer kez işlenmesini, ham değer/kaynakları, çizim bağlamı/sonuç kapsamını ve satış metniyle ölçü eşitliğini denetler.

```text
$ python3 arac/denetle.py urunler.jsonl --aile
Denetlenen ürün: 52
SONUÇ: 0 hata
```

```text
$ python3 -m unittest discover -s arac -p 'test_*.py'
.......
----------------------------------------------------------------------
Ran 7 tests in 0.527s

OK
```


Örnek masaüstü/mobil PNG'ler:

- `onizleme/ORK_LA_HGH20HA.png`, `onizleme/ORK_LA_HGH20HA_mobil.png`
- `onizleme/ORK_LR_HGR25.png`, `onizleme/ORK_LR_HGR25_mobil.png`
- `onizleme/PMI_MSA30LE.png`, `onizleme/PMI_MSA30LE_mobil.png`
- `onizleme/PMI_MSB15S.png`, `onizleme/PMI_MSB15S_mobil.png`
- `onizleme/hgh20ha-cizim.png`

52 HTML, 1280 ve 390 px genişlikte yerel Chrome ile render edildi; ön yazı kutuları ve yatay taşma kontrol edildi. Örneklerin görsel+ön yazı+çizim kesitleri `onizleme/kontrol-*.png` içinde ayrıca görüntülendi. Canlı mağaza entegrasyonu denenmedi.

## Yeniden üretim

```sh
python3 arac/veri_hazirla.py
python3 arac/gorsel_sec.py
OMP_NUM_THREADS=2 python3 arac/gorsel_hazirla.py
python3 arac/aile_hazirla.py
/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node arac/ciz.js
python3 arac/onizle.py
python3 arac/denetle.py urunler.jsonl --aile
python3 -m unittest discover -s arac -p 'test_*.py'
python3 arac/raporla.py
```

Görsel arama aracı `arac/gorsel_ara.py` yalnız aday indirir; kendiliğinden ürüne atamaz. Yerel ham fotoğraflar saklandığından yeniden üretimde kaynak sitelere erişim gerekmez. Python: Pillow, beautifulsoup4, numpy, scipy, rembg[cpu], playwright; PDF dökümleri için pypdf kullanıldı. Chrome `/home/ubuntu/.local/bin/google-chrome`, Node mevcut nvm dizinindedir; PATH yerine mutlak yolu kullanıldı. `arac/hazirla.py` eski tek ürün pilot aracıdır; 52'li teslim için `arac/aile_hazirla.py` kullanılır.

## Sonraki ürünler için ek satış birimi kuralı

Paket/koli ürünleri sitede ADET olarak satılır. Gelecek `ORK GKT MG2xx` kaynak tellerinin adına `(15 KG/PKT)` veya `5.000 Adet Koli` gibi paket bilgisi eklenmeyecek; açıklamada paket/koli halinde satış iddia edilmeyecek. Teknik listede `Satış Birimi: Adet`, gerekiyorsa `Ambalaj: 15 kg/paket` yazılacak. 4 metre ve 5700 mm gibi ürün boyları paket sayılmaz ve ad içinde korunur. Bu 52 kaydın dışında kalan kaynak telleri bu adımda değiştirilmedi.
