# mafsal

16 gerçek ürün; 12 SVG; 4 null.

## Sözleşme ve loader

ES5; yalnız window.YDRAW kaydı; 460×260 viewBox; 12,5 px bold metin; opt.id önekli marker ve hatch; keys/data-k eşliği. Gerekli ölçü yoksa veya kaynak değerleri çelişirse null. Üç negatif fixture: yabancı aile, gerekli ölçü eksik, boş ölçüler; ek test boş ctx ve çelişkili ölçüyü denetler.

Loader alfabetik ilk match sonucunda durur ve null sonucunda başka modüle geçmez. 16 mafsal ve 22 taşıyıcı ctx ile mevcut modüller arasında ilk-match çakışması yoktur. bilyali.js mafsal ailesini açıkça dışlar; yeni modüllerde alias gerekmez. Loader/build dosyaları değiştirilmedi.

## Alt tipler ve ölçü anlamları

SSPHS iç dişli: 6 SVG / 2 null; SSPOS dış dişli: 6 SVG / 2 null. 14/18 boyutlarında katalog satırı olmadığı için dört null. Sağ/sol diş iddiası yoktur.

Ön görünüşte dış başlık d2, küre dk ve delik d; şaftlı gövde ve G dişi. Kesitte C1 gövde genişliği, B bilya genişliği, küresel temas yüzeyleri ve açık delik; SSPHS iç dişi kesik çizgili, SSPOS dış dişi profilli. L4/L2 toplam boy; h1/h göz merkezinden tabana; L3 iç diş derinliği / L1 dış diş boyu. G kaynaktaki diş metnini aynen korur; SSPHS06R için M6 adımı tahmin edilmez.

Etiketler: İç Çap (d), Küre Çapı (dk), Başlık Çapı (d2), Bilezik Genişliği (B), Gövde Genişliği (C1), Bağlantı Dişi (G), Ölçü (h1)/(h), Ölçü (L4)/(L2), Ölçü (L3)/(L1). Diğer teknik liste alanları anlamı doğrulanmadan yeni geometrik ölçüye çevrilmedi.

Geometri kaynağı: ürün dalındaki veri/aile4-mafsal-sdtz.pdf; URL her ürünün teknik_kaynak alanında korunur. Kaynak şekli ve aynı kod satırları incelendi. Dış başlık d2 ile küre dk birbirine karıştırılmadı.

Açılan PNG’ler: preview/mafsal/ORK_PM_SSPHS06R-360.png ve preview/mafsal/ORK_PM_SSPOS20R-360.png.

## Gerçek ürün sonuçları

| Kod | Sonuç | Loader | Keys / neden |
|---|---|---|---|
| ORK PM SSPHS06R | SVG | mafsal | d2, d, dk, L4, h1, G, B, C1, L3 |
| ORK PM SSPHS08R | SVG | mafsal | d2, d, dk, L4, h1, G, B, C1, L3 |
| ORK PM SSPHS10R | SVG | mafsal | d2, d, dk, L4, h1, G, B, C1, L3 |
| ORK PM SSPHS12R | SVG | mafsal | d2, d, dk, L4, h1, G, B, C1, L3 |
| ORK PM SSPHS14R | null | mafsal | 14/18 boyutlarında SSPHS/SSPOS baz seri katalog satırı yok |
| ORK PM SSPHS16R | SVG | mafsal | d2, d, dk, L4, h1, G, B, C1, L3 |
| ORK PM SSPHS18R | null | mafsal | 14/18 boyutlarında SSPHS/SSPOS baz seri katalog satırı yok |
| ORK PM SSPHS20R | SVG | mafsal | d2, d, dk, L4, h1, G, B, C1, L3 |
| ORK PM SSPOS06R | SVG | mafsal | d2, d, dk, L2, h, G, B, C1, L1 |
| ORK PM SSPOS08R | SVG | mafsal | d2, d, dk, L2, h, G, B, C1, L1 |
| ORK PM SSPOS10R | SVG | mafsal | d2, d, dk, L2, h, G, B, C1, L1 |
| ORK PM SSPOS12R | SVG | mafsal | d2, d, dk, L2, h, G, B, C1, L1 |
| ORK PM SSPOS14R | null | mafsal | 14/18 boyutlarında SSPHS/SSPOS baz seri katalog satırı yok |
| ORK PM SSPOS16R | SVG | mafsal | d2, d, dk, L2, h, G, B, C1, L1 |
| ORK PM SSPOS18R | null | mafsal | 14/18 boyutlarında SSPHS/SSPOS baz seri katalog satırı yok |
| ORK PM SSPOS20R | SVG | mafsal | d2, d, dk, L2, h, G, B, C1, L1 |

Tüm başarılı gerçek ürünler 460/360 px PNG olarak yeniden üretildi; metin kutuları (dönüşümler dahil) çakışma/taşma için denetlendi; ölçü grubunun tıklanıp kırmızı olması Chromium’da doğrulandı. Canlı site entegrasyonu denenmedi.

Yeniden üretim: _lineer_diger.py --catalog /home/ubuntu/repos/ticimax-stok; node _test_lineer_diger.js /home/ubuntu/repos/ticimax-stok/veri/lineer-ctx.json; _lineer_diger.py --preview --report-draw.
