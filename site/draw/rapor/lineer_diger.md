# Lineer diğer: son çizim kapsamı

208 gerçek ctx tüm modüllerin alfabetik ilk-match seçimiyle çalıştırıldı. Ham sonuç: `preview/lineer_diger-total.json`.

| Modül | Ürün | SVG | null | Modül yok |
|---|---:|---:|---:|---:|
| lineer | 77 | 77 | 0 | 0 |
| pinyon_kremayer | 47 | 41 | 6 | 0 |
| vidali_mil | 31 | 22 | 9 | 0 |
| mafsal | 16 | 12 | 4 | 0 |
| tasiyici | 22 | 6 | 16 | 0 |
| baglanti | 1 | 0 | 1 | 0 |
| Yok | 14 | 0 | 0 | 14 |
| **Toplam** | **208** | **158** | **36** | **14** |

SFU W ölçüsü iki karşılıklı **gerçek delik merkezinden** başlar. Ölçü doğrultusu bu iki merkezi birleştiren çapla paraleldir. Altı delikte 90°/270°, sekiz delikte 60°/240° çifti kullanılır. Uzatma çizgileri bu merkezleri ölçü uçlarına bağlar; ölçü boyu tam W çapıdır, flanş A değildir.

Kremayer hp yan görünüşün alt yüzeyi ile kesik bölüm çizgisi arasındaki dikey ölçüdür. Bölüm çizgisinin konumu kaynak hp/he oranıyla hesaplanır; kesit altına serbest hp etiketi bırakılmaz.

S060 ilk olarak baglanti modülünü seçer ve null döner. `baglanti.js` içindeki `kilit:function(){return null}` koşulsuzdur; mevcut yorum eski d/D/L kaynak çelişkisini gerekçe gösterir. Güncel üründe d=60/D=90 çözülmüş olsa da bu kod ürün ölçülerini hiç okumaz. Bu görevde baglanti.js değiştirilmedi.

Motor kızağı (7), kaynak teli (3), kapı motoru (4) için modül yazılmadı. Yeni mafsal ve taşıyıcı modüllerinin mevcut loader ile çakışması yok; ilave öncelik kaydı gerekmedi. vidali_mil eski 0_vidali_mil öncelik kaydını korur. Loader null sonucunda devam etmez.

Görsel kontrol için açılan 360 px PNG’ler (preview/ altında):

- vidali_mil/ORK_VMS_SFU1605-360.png
- vidali_mil/ORK_VMS_SFU4010-360.png
- pinyon_kremayer/ORK_KR__M225251000-360.png
- mafsal/ORK_PM_SSPHS06R-360.png
- mafsal/ORK_PM_SSPOS20R-360.png
- tasiyici/ORK_BMT_SP12B-360.png
- tasiyici/ORK_BMT_SP60B-360.png

Yeni modüllerin dört çizilebilir alt tipi (iç/dış dişli mafsal, flanşlı/flanşsız yuvaya oturtmalı taşıyıcı) görüntülendi. Saplı ve cıvatalı BMT geometrileri için yeterli kaynak ölçüsü yoktur; bunlar null, dolayısıyla bu tiplerden gerçek ürün PNG’si yoktur. Destek bilya adedi/çapı temsili çizilir, sayısal teknik ölçü sayılmaz. Diğer null nedenleri aile raporlarında ürün bazında listelidir.

81 başarılı yeni-modül ürünü için toplam 162 PNG (460/360 px) üretildi. Metin kutuları dönüşümler dahil çakışma/taşma kontrolünden geçti; ölçü grubu tıklama/rengi Chromium’da denetlendi. Node sözleşme ve loader testleri dört modülde 3’er negatif fixture ile geçti; yeni modüllerde ayrıca boş ctx ve çelişkili ölçü null testi var. Canlı mağazaya girilmedi; entegrasyon denenmedi.
