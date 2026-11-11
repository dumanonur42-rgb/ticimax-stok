# tasiyici

22 gerçek ürün; 6 SVG; 16 null.

## Sözleşme ve loader

ES5; yalnız window.YDRAW kaydı; 460×260 viewBox; 12,5 px bold metin; opt.id önekli marker ve hatch; keys/data-k eşliği. Gerekli ölçü yoksa veya kaynak değerleri çelişirse null. Üç negatif fixture: yabancı aile, gerekli ölçü eksik, boş ölçüler; ek test boş ctx ve çelişkili ölçüyü denetler.

Loader alfabetik ilk match sonucunda durur ve null sonucunda başka modüle geçmez. 16 mafsal ve 22 taşıyıcı ctx ile mevcut modüller arasında ilk-match çakışması yoktur. bilyali.js mafsal ailesini açıkça dışlar; yeni modüllerde alias gerekmez. Loader/build dosyaları değiştirilmedi.

## Alt tipler ve ölçü anlamları

Flanşlı yuvaya oturtmalı: SP15A, SP22C, SP25B, SP30C, SP60B (5 SVG). Flanşsız yuvaya oturtmalı: SP12B (1 SVG). Diğer 16 ürün null.

Saplı / saplamalı kesit için kaynaklı sap dişi, sap boyu ve gövde yüksekliği gerekir; bu girdilerde böyle eksiksiz kaynaklı saplı ürün yoktur ve saplı geometri çizilmez. Cıvatalı flanş / tabla tipleri delik yerleşimi ve gövde ölçüleri eksik olduğu için null; tahmini cıvata veya delik adedi eklenmez. CY16B2 yalnız Dp ve yuvarlak gövde bilgisi taşır; montaj biçimi türetilmez.

Ön görünüşte Dw ana bilya, D gövde, flanşlıda D1. Kesitte ana bilya, destek bilyaları, taralı gövde ve flanş dudağı. Destek bilyalarının sayısı ve çapı temsili; sayısal ölçü olarak yayınlanmaz.

New Ball kesitindeki H tabandan ana bilya tepesine, h montaj düzleminden bilya tepesine; flanşlı tipte b montaj düzleminden üst bilezik yüzeyine ölçülür. Dolayısıyla üst bilezik yüzeyi bilya tepesinden h−b aşağıdadır. Flanşsız SP12B’de h üst gövde yüzeyinden bilya tepesine; olmayan b alanı üretilmez.

Şekil referansı: https://www.newball.it/wp-content/uploads/2021/11/ball-transfer-units.pdf (flanşsız ve flanşlı sayfalar). Yeni sayısal değer aktarılmadı; yalnız urunler.jsonl ctx değerleri kullanılır. Örneğin SP15B/C Dw kaynakları çeliştiği için Dw yoktur ve iki ürün de null kalır.

Etiketler: Ana Bilya Çapı (Dw), Gövde Çapı (D), Flanş Çapı (D1), Ölçü (h), Toplam Yükseklik (H), Ölçü (b). Montaj Tipi alt tipi belirler; kapasite ve malzeme geometri ölçüsü yapılmaz.

Açılan PNG’ler: preview/tasiyici/ORK_BMT_SP12B-360.png ve preview/tasiyici/ORK_BMT_SP60B-360.png.

## Gerçek ürün sonuçları

| Kod | Sonuç | Loader | Keys / neden |
|---|---|---|---|
| ORK BMT CY16B2 | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT CY25A | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT IA19 | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT IA25 | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT NL8H | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT SP12AFL | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT SP12B | SVG | tasiyici | Dw, D, H, h |
| ORK BMT SP12BF | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT SP15A | SVG | tasiyici | Dw, D, D1, b, H, h |
| ORK BMT SP15AFL | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT SP15B | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT SP15C | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT SP15P | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT SP22B | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT SP22C | SVG | tasiyici | Dw, D, D1, b, H, h |
| ORK BMT SP22P | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT SP25B | SVG | tasiyici | Dw, D, D1, b, H, h |
| ORK BMT SP30B | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT SP30C | SVG | tasiyici | Dw, D, D1, b, H, h |
| ORK BMT SP30P | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT SP45B | null | tasiyici | Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor |
| ORK BMT SP60B | SVG | tasiyici | Dw, D, D1, b, H, h |

Tüm başarılı gerçek ürünler 460/360 px PNG olarak yeniden üretildi; metin kutuları (dönüşümler dahil) çakışma/taşma için denetlendi; ölçü grubunun tıklanıp kırmızı olması Chromium’da doğrulandı. Canlı site entegrasyonu denenmedi.

Yeniden üretim: _lineer_diger.py --catalog /home/ubuntu/repos/ticimax-stok; node _test_lineer_diger.js /home/ubuntu/repos/ticimax-stok/veri/lineer-ctx.json; _lineer_diger.py --preview --report-draw.
