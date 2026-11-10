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
- Ad kalıbı: `TB <malzeme><sınıf> <ölçü kodu> <Malzeme> Tane Bilya <çap> mm (<inç>) AISI <no> G<sınıf> - <koli adedi> Adet Koli`.

## Kategori

- `KATEGORI`: `TANE BİLYA - MASURA>TANE BİLYA` (mevcut, 92 ürün). `EK_KATEGORILER`: `RULMAN>BİLYA VE MASURALAR` (mevcut). Yeni kategori önerisi yok.

## Teknik veri ve kaynaklar

- 1010 / 316 / 52100 G1000 serileri: orkapt.com seri tablosundaki ürün satırı (çap, inç, 1000 adet ağırlığı, koli adedi, koli ağırlığı, 1 litre adedi).
- 52100 G100 (21), 1010 Soft (10) ve 36,513–40 mm büyük G1000 ölçüleri (12): seri sayfalarında satır yok; çap, inç, koli adedi ve (adında tam yazıyorsa) koli ağırlığı B2B ürün adından alındı. 1000 adet ağırlığı / 1 litre adedi yazılmadı, ürün `eksik` bayraklı.
- G100 / G1000 tolerans değerleri (küresellik, lot çap farkı, nominal çap toleransı, G100 için Ra): ABMA metrik sınıf tablosu (https://en.wikipedia.org/wiki/Ball_(bearing)#Grade). Sınıf kodu birebir aynı olduğu için kullanıldı. Sertlik, kimyasal analiz gibi kaynağı olmayan değerler yazılmadı.
- Koli adedi seri tablosu ile B2B kaydında farklı olan 3 ürün var; satılan koli B2B kaydına göre yazıldı:
  - `ORK TB 1010G1000 02381`: koli adedi farkı: seri tablosu 400.000, B2B stok kaydı 360.000 (satılan koli B2B kaydına göre yazıldı)
  - `ORK TB 1010G1000 18`: koli adedi farkı: seri tablosu 900, B2B stok kaydı 850 (satılan koli B2B kaydına göre yazıldı)
  - `ORK TB 1010G1000 1905`: koli adedi farkı: seri tablosu 800, B2B stok kaydı 700 (satılan koli B2B kaydına göre yazıldı)
- `ORK TB 316G1000 26987` seri tablosunda inç `1/16` yazıyor, doğrusu adında yazan `1-1/16″` (26,987 mm); ad kullanıldı. Diğer inç notları sadece yazım farkı (`1 1/2` ↔ `1-1/2`).

## Görseller

- Birebir (aynı kod) foto bulunamadı: Orka seri fotoğrafında (orkapt.com/wp-content/uploads/2020/04/BİLYA.jpg) tüm resmin üzerinde site filigranı var, o yüzden kullanılmadı. Yandex görselde malzeme bazında aranıp logosuz/filigransız, beyaz zeminli, kutusuz gerçek foto seçildi (`resim_seviye = ayni_tip`, kaynak her üründe `resim_kaynak`):
  - AISI 1010: alibaba.com, "AISI 1010 Carbon Steel Balls G1000"
  - AISI 1010 Soft: made-in-china.com, "AISI1010 Carbon Steel Ball"
  - AISI 316: alibaba.com, "Solid AISI 304 316 Stainless Steel Ball"
  - AISI 52100: made-in-china.com, "G16 Chrome Steel Balls"
- `sablon.png` içinde örnek ürün (mil) gömülü olduğu için ürün alanı beyazlatılıp sadece Yamansa logo bandı kullanıldı. 220 × 500x500 JPG, ad slug'ı ile `gorseller/`.

## Teknik çizim

- Mevcut `bilyali.js` tane bilyayı kapsamıyordu. Yeni modül: branch `draw/bilya` (site-assets'ten), `site/draw/bilya.js` + fixtures + preview png + `rapor/bilya.md`. PR açılmadı.
- ÖN GÖRÜNÜŞ + KESİT A-A (dolu küre), tıklanır `data-k="Dw"` çap ölçüsü. ACIKLAMA teknik listesinde `Bilya Çapı (Dw)` ve `İnç Ölçüsü` etiketleri var; 220/220 ürün çizilir. Çap yoksa / çelişkiliyse `null`.

## Otomatik denetim (220/220 geçti)

- Zorunlu alanlar dolu, kod girdiyle aynı ve sırada, tekrar kod yok; ORKA/ORKAPT yok; U+0307 ve bozuk karakter yok; "—" yok.
- ACIKLAMA en kısa 2468 karakter (≥1800); ürünler arasında birebir tekrar eden paragraf: 0; iç link 2–4 ve hepsi katurl.txt'te.
- SEO_SAYFABASLIK en uzun 60, SEO_SAYFAACIKLAMA en uzun 155, ANAHTARKELIME en uzun 950, SEO_ANAHTARKELIME en uzun 399 karakter.
- Anahtar kelimeler: boşluklu/bitişik/tireli kod, `6 mm bilya / 6mm bilya / 6 mm bilye / bilya 6 / Ø6 bilya`, virgül ve nokta ondalık, inç kesri (`5/16 bilya`, `5/16 inç`, `5/16" bilya`), malzeme (AISI 52100 + 100Cr6, krom/paslanmaz/karbon çelik bilya, inox), G sınıfı, steel ball, Türkçe karaktersiz hâller.
- Görsel: 220 dosya var, hepsi 500x500 JPEG.
