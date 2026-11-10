# Bilya parçası (parca/bilya.jsonl.gz) — teslim raporu

Ticimax'e hiçbir şey yüklenmedi, panele girilmedi.

## Sayılar

| | adet |
|---|---|
| Toplam ürün | 220 |
| Görsel birebir | 0 |
| Görsel ayni_tip | 220 |
| Görselsiz (gorsel_yok) | 0 |
| Teknik verisi seri tablosundan (orkapt.com satırı) | 177 |
| Teknik verisi sadece B2B ürün adından | 43 |
| `eksik` bayraklı (en az bir değer kaynakta yok) | 68 |
| Yeni kategori önerisi | 0 |
| Aynı kod iki kez | 0 |

Malzeme dağılımı: 1010 G1000: 91, 316 G1000: 91, 52100 G100: 21, 52100 G1000: 7, soft: 10

## Marka / ad

- Hepsi `MARKA = Yamansa` (212 ORKAPT + 8 markasız; hepsi Orka kendi ürünü). Ad, ön yazı, açıklama, SEO, anahtar kelime ve görselde ORKA/ORKAPT yok.
- Stok kodundaki `ORK ` öneki müşteriye görünen alanlardan çıkarıldı, kod `TB 52100G100 10` biçiminde yazıldı (`kod` alanı aynen duruyor). İstenirse ad/anahtar kelimeye tam kod geri eklenebilir.
- Ad kalıbı: `TB <malzeme><sınıf> <ölçü kodu> <Malzeme> Tane Bilya <çap> mm (<inç>) AISI <no> G<sınıf>`. Adda paket/koli ifadesi yok.
- Satış: ürünler adet olarak satılır. Ön yazıda ve teknik listede `Satış Birimi: Adet` yazar. Koli içeriği teknik listede `Ambalaj: N adet/koli` olarak verildi. Açıklamada "koli halinde satılır" ifadesi yok.

## Kategori

- `KATEGORI`: `TANE BİLYA - MASURA>TANE BİLYA` (mevcut, 92 ürün). `EK_KATEGORILER`: `RULMAN>BİLYA VE MASURALAR` (mevcut). Yeni kategori önerisi yok.

## Teknik veri ve kaynaklar

- 1010 / 316 / 52100 G1000 serileri: orkapt.com seri tablosundaki ürün satırı (çap, inç, 1000 adet ağırlığı, koli adedi, koli ağırlığı, 1 litre adedi).
- 52100 G100 (21), 1010 Soft (10) ve 36,513–40 mm büyük G1000 ölçüleri (12): seri sayfalarında satır yok; çap, inç, koli adedi ve (adında tam yazıyorsa) koli ağırlığı B2B ürün adından alındı. 1000 adet ağırlığı / 1 litre adedi yazılmadı, ürün `eksik` bayraklı.
- G100 / G1000 toleransları: Wikipedia değerleri ve hesaplanan çap aralıkları ÇIKARILDI. Yeni kaynak, bilya üreticisi Redhill Precision'ın sınıf sayfası (https://www.redhillballs.com/company/precision-grades/). Bu sayfada ISO 3290 tablosu da yayımlanıyor.
  - G100 (ISO 3290 tablosu): VDws 2,5 µm, küresellikten sapma 2,5 µm, VDwL 5 µm, Ra 0,1 µm.
  - G1000: ISO 3290-1'de G1000 sınıfı yok (tablo G200'de bitiyor). Değerler aynı sayfadaki AFBMA (ABMA) metrik tablosundan alındı: VDws 25 µm, küresellikten sapma 25 µm. Bu tabloda G1000 lot çap değişimi ve nominal çap toleransı verilmediği için bu iki değer yazılmadı.
  - Not: Redhill sitesinin altında "içerik yapay zekâ ile üretilmiştir" uyarısı var. Daha resmi bir üretici kataloğu bulunursa kaynak değiştirilebilir.
  - Sertlik, kimyasal analiz gibi kaynağı olmayan değerler yazılmadı.
- Koli adedi seri tablosu ile B2B kaydında farklı olan 3 ürün var; satılan koli B2B kaydına göre yazıldı:
  - `ORK TB 1010G1000 02381`: koli adedi farkı: seri tablosu 400.000, B2B stok kaydı 360.000 (satılan koli B2B kaydına göre yazıldı)
  - `ORK TB 1010G1000 18`: koli adedi farkı: seri tablosu 900, B2B stok kaydı 850 (satılan koli B2B kaydına göre yazıldı)
  - `ORK TB 1010G1000 1905`: koli adedi farkı: seri tablosu 800, B2B stok kaydı 700 (satılan koli B2B kaydına göre yazıldı)
- `ORK TB 316G1000 26987` seri tablosunda inç `1/16` yazıyor, doğrusu adında yazan `1-1/16″` (26,987 mm); ad kullanıldı. Diğer inç notları sadece yazım farkı (`1 1/2` ↔ `1-1/2`).

## Görseller

- Birebir (aynı kod) fotoğraf bulunamadı. 220 ürünün hepsi `ayni_tip`, her üründe `resim_kaynak` var.
- Önceki yansımalı ve karışık boy gösteren fotoğraflar değiştirildi. Her malzeme için tek boy bilya gösteren, logosuz, filigransız, kişi/kamera yansıması olmayan, beyaz zeminli gerçek bir fotoğraf seçildi:
  - AISI 1010: jinnai (made-in-china), "12mm Low Carbon Steel Ball AISI1010": aynı boy 20 bilya, ızgara düzeni.
  - AISI 1010 Soft: jinnai (made-in-china), "6.28mm Carbon Steel Ball AISI1010-AISI1015": aynı boy 5 bilya.
  - AISI 316: lasercutting (made-in-china), "Stainless Steel Hard Balls": aynı boy 8 bilya.
  - AISI 52100: czhuari (made-in-china), "7mm G24 100Cr6 Chrome Steel Balls": aynı boy 5 bilya.
- Üretici sitelerine bakıldı:
  - Redhill'in krom, düşük karbonlu ve 316 ürün fotoğraflarının hepsi karışık boy bilya kompozisyonu, bu yüzden kullanılmadı.
  - Hartford, Thomson, Tsubaki Nakashima, Kugel Pompel, Spheric-Trafalgar ve Dejiang sayfaları açılmadı (404, 403 ya da bağlantı hatası) veya uygun fotoğraf çıkmadı.
  - Orka seri fotoğrafının filigransız versiyonu bulunamadı.
- `sablon.png` içinde örnek ürün (mil) gömülü olduğu için ürün alanı beyazlatılıp sadece Yamansa logo bandı kullanıldı. 220 adet 500x500 JPG, ad slug'ı ile `gorseller/` altında.

## Teknik çizim

- Mevcut `bilyali.js` tane bilyayı kapsamıyordu. Yeni modül: branch `draw/bilya` (site-assets'ten), `site/draw/bilya.js` + fixtures + preview png + `rapor/bilya.md`. PR açılmadı.
- ÖN GÖRÜNÜŞ + KESİT A-A (dolu küre), tıklanır `data-k="Dw"` çap ölçüsü. ACIKLAMA teknik listesinde `Bilya Çapı (Dw)` ve `İnç Ölçüsü` etiketleri var; 220/220 ürün çizilir. Çap yoksa / çelişkiliyse `null`.

## Otomatik denetim (220/220 geçti)

- Zorunlu alanlar dolu, kod girdiyle aynı ve sırada, tekrar kod yok; ORKA/ORKAPT yok; U+0307 ve bozuk karakter yok; "—" yok.
- ACIKLAMA en kısa 2468 karakter (≥1800); ürünler arasında birebir tekrar eden paragraf: 0; iç link 2–4 ve hepsi katurl.txt'te.
- SEO_SAYFABASLIK en uzun 60, SEO_SAYFAACIKLAMA en uzun 155, ANAHTARKELIME en uzun 950, SEO_ANAHTARKELIME en uzun 399 karakter.
- Anahtar kelimeler: boşluklu/bitişik/tireli kod, `6 mm bilya / 6mm bilya / 6 mm bilye / bilya 6 / Ø6 bilya`, virgül ve nokta ondalık, inç kesri (`5/16 bilya`, `5/16 inç`, `5/16" bilya`), malzeme (AISI 52100 + 100Cr6, krom/paslanmaz/karbon çelik bilya, inox), G sınıfı, steel ball, Türkçe karaktersiz hâller.
- Görsel: 220 dosya var, hepsi 500x500 JPEG.
