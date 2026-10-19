# Rulman Etiket — etiket tasarımı

Brother QL-550 (300 dpi, siyah-beyaz) için rulman kutusu etiketi. Düzen, verilen referans fotoğraftaki
etiketle aynıdır; marka işareti, desen, EAN/GTIN alanı ve lot numarası **yoktur**. Zemin düz beyazdır.

Bu belgedeki ölçüleri `etiket_cizim.py` uygular; geliştirici çizimi kendisi yapmaz, bu modülü çağırır:

```python
from etiket_cizim import EtiketVerisi, BOYUTLAR, dogrula, ciz, onizleme_png
veri = EtiketVerisi(kod="6308-C-2HRS", ek="C3", adet=1)
hatalar = dogrula(veri)            # [] ise basılabilir; değilse Türkçe metinleri göster
doc = ciz(veri, "62x100", kopya=3) # pymupdf.Document, her kopya ayrı sayfa
png = onizleme_png(veri, "62surekli", dpi=300)
```

Ek yardımcılar (sözleşme dışı, isteğe bağlı): `yerlesim(veri, boyut)` hesaplanan tüm ölçüler,
`uyarilar(veri, boyut)` basmaya engel olmayan notlar (ör. "Bilgi satırları çok uzun olduğu için kare koda eklenmedi."),
`EtiketHatasi` (`ciz` bunu fırlatır; `str(e)` kullanıcıya gösterilecek metin).

## 1. Genel kurallar

| Konu | Değer |
|---|---|
| Birim | 1 nokta = 1/300 inç = 0.0847 mm = 0.24 pt. Barkod ve kare kod modülleri tam noktaya oturur (sayfa sol üstünden tam sayı nokta). |
| Sayfa genişliği | 62 mm (175.75 pt). PDF ölçeklemesiz basılmalı (SumatraPDF `noscale`). |
| Kenar boşluğu | Sol / sağ / üst / alt **36 nokta = 3.05 mm**. QL-550 62 mm ruloda ~58 mm basabilir (her kenarda ~2 mm basılamaz) + ~1 mm güvenlik. |
| İçerik alanı | x = 3.05 … 58.93 mm, genişlik **55.88 mm (660 nokta)** |
| Hizalama | Her şey sola hizalı. Barkod sol üstte, kare kod sağ üstte (sağ kenara dayalı). |
| Renk | Yalnız siyah (0,0,0) dolgu, beyaz zemin; gri/ince çizgi yok. |
| Yazı tipi | **Hind** Medium ve Bold (`fonts/`, SIL Open Font License 1.1, `fonts/LICENSE`). Bilgi satırları ve barkod rakamları Medium; Qty, kod ve ek Bold olarak PDF'e alt küme halinde gömülür. Türkçe harfler dahildir. |
| Ölçüler | Hind büyük harf yüksekliği = 0.679 × punto (`OS/2.sCapHeight`); en derin glif taşması = 0.268 × punto (Bold `ç`/`ş` konturu). Aşağıdaki "taban" değerleri yazı taban çizgisinin sayfa üstünden uzaklığıdır. |

## 2. İçerik

| Öğe | İçerik |
|---|---|
| Code128 | `kod` + (ek doluysa) boşluk + `ek`. Ör. `6308-C-2HRS C3`. Sadece ASCII 32–126 (Türkçe harf girilemez, `dogrula` uyarır). |
| Barkod altı yazı | Code128 içeriğinin aynısı. |
| DataMatrix | Satır sonu (`\n`) ile: Code128 metni, adet (yalnız sayı), doluysa bilgi1, doluysa bilgi2. Ör. `6308-C-2HRS C3\n1\nRAF A-12\nYamansa Rulman`. |
| Adet satırı | `"{adet} {adet_yazisi}"` → `1 Qty`, `10 Qty` (adet_yazisi varsayılan "Qty", değiştirilebilir, ör. "Adet"). |
| Kod / ek | `kod` büyük kalın; `ek` (C3, C4 …) hemen altında aynı büyüklükte kalın. |
| Bilgi satırları | Kullanıcının yazdığı serbest metin, varsayılan boş. Hiçbir numara üretilmez. |
| Alt tekrar | Adet satırı + kod + ek, üstteki ile aynı punto. `alt_tekrar=False` ise yok. |

## 3. Ölçüler

### 3a. 62 x 100 mm kesik etiket (DK-11202) — `"62x100"`

Sayfa 62 x 100 mm. Değerler `6308-C-2HRS / C3 / 1` içindir (bilgi satırlı hali parantezde).

| Öğe | x (mm) | y / taban (mm) | genişlik x yükseklik (mm) | Yazı |
|---|---|---|---|---|
| Code128 çubuklar | 3.05 | üst 3.05 | 30.14 x 9.99 (modül 2 nokta = 0.169 mm, 178 modül) | — |
| Barkod altı yazı | çubukların ortasına | taban 15.42 (çubuk altı + 0.7 mm + büyük harf) | çubuk genişliğini geçmez | Medium 7 pt (en az 5 pt) |
| DataMatrix | sağa dayalı, sağ kenar 58.93 | üst 3.05 | 12.19 x 12.19 (18x18 modül, 8 nokta = 0.68 mm) (24x24 x 7 nokta = 14.22 mm) | — |
| Adet "1 Qty" | 3.05 | taban 20.21 (22.07, bilgili) — üst sıranın altından 2.4 mm boşluk | — | Bold 10 pt |
| Kod "6308-C-2HRS" | 3.05 | taban 26.60 (28.46, bilgili) — adet tabanından 1.6 mm + büyük harf | 40.6 mm | Bold 20 pt |
| Ek "C3" | 3.05 | taban 33.30 (35.16, bilgili) — satır aralığı 0.95 em | — | Bold 20 pt (kodla aynı) |
| Bilgi 1 / 2 | 3.05 | taban 54.27 / 57.94 (alt tekrar açık); kapalıysa ekten 3.5 mm sonra | en fazla 55.88 | Medium 8 pt (en az 6 pt) |
| Alt tekrar | 3.05 | blok sayfa altına dayalı; "1 Qty" tabanı 81.97 | — | üsttekiyle aynı |
| Esnek boşluk | — | üst blok ile alt tekrar arası; en az 6 mm | — | — |

### 3b. 62 mm sürekli rulo (DK-22205) — `"62surekli"`

Uzunluk içeriğe göre hesaplanır, tam noktaya yuvarlanır. Alt tekrar açıkken **en az 80 mm** (referans oranı
62:77, okunurluk için biraz uzun); içerik uzarsa (iki satır kod, bilgi satırları + büyük kare kod) uzar.
Alt tekrar kapalıysa uzunluk = içerik + 3.05 mm alt boşluk (ör. `51100` → ~31 mm).

| Öğe | x (mm) | y / taban (mm) | genişlik x yükseklik (mm) | Yazı |
|---|---|---|---|---|
| Code128 çubuklar | 3.05 | üst 3.05 | 30.14 x 8.97 | — |
| Barkod altı yazı | ortalı | taban 14.40 | — | Medium 7 pt |
| DataMatrix | sağa dayalı | üst 3.05 | 12.19 (18x18 x 8 nokta) (bilgili: 24x24 x 6 nokta = 12.19) | — |
| Adet | 3.05 | taban 19.80 | — | Bold 9 pt |
| Kod | 3.05 | taban 25.71 | 36.5 mm | Bold 18 pt |
| Ek | 3.05 | taban 31.74 | — | Bold 18 pt |
| Bilgi 1 / 2 | 3.05 | taban 44.16 / 47.60 (alt tekrar açık); kapalıysa ekten 3.5 mm sonra | ≤ 55.88 | Medium 7.5 pt (en az 6 pt) |
| Alt tekrar | 3.05 | sayfa altına dayalı; "1 Qty" tabanı 63.32 | — | üsttekiyle aynı |
| Uzunluk | — | 80.01 mm | — | — |

Referansla oran: referansta kod yazısı genişliğin ~%51'i, büyük harf yüksekliği / adet yazısı ≈ 1.4, kod / bilgi ≈ 1.5.
Burada kod yazısı daha büyük tutuldu (62x100'de genişliğin %71'i, 62 sürekli'de %64'ü; kod/adet = 2.0, kod/bilgi = 2.5)
çünkü raftan okunacak asıl bilgi koddur. Bilgi satırları alt tekrar açıkken iki kod bloğu arasındaki boşluğun %45 noktasında ortalanır; kapalıyken ekten 3.5 mm sonra başlar.
Kod puntosu bilinçli olarak sabit bir üst sınırdır (62x100: 20 pt, sürekli: 18 pt) ve kısa kodlar (`608-2Z`, `51100`) da bu puntoda basılır: referans etikette de punto koddan koda değişmez, bu puntoda kod zaten referanstan büyüktür ve böylece raftaki bütün kutularda kod aynı boyda görünür.

## 4. Barkod kuralları

**Code128** (`python-barcode` ile modül dizisi, çubuklar vektör dikdörtgen olarak çizilir):
- Modül genişliği 3 nokta (0.254 mm) denenir; sığmazsa **2 nokta (0.169 mm, 6.7 mil)**. 1 nokta asla kullanılmaz
  (300 dpi termal baskıda çizgi yayılması okunmayı bozar). Kısa kodlar (`6205-2RSR`, `608-2Z`, `51100`) 3 noktaya, `6308-C-2HRS C3` gibi
  14+ karakter 2 noktaya düşer.
- Sessiz bölge: her yanda **en az 10 modül**. Sol sessiz bölge = 3.05 mm sol kenar boşluğu (36 nokta ≥ 30); sağ sessiz bölge çubuk ile kare kod arasında ayrılır.
- Çubuk yüksekliği 10 mm (62x100) / 9 mm (sürekli).
- Yerleşim sırası:
  1. **Yan yana** (normal): barkod soldan, kare kod sağdan; arada ≥ 10 modül. Sığmazsa kare kod modülü 8 → 5 noktaya kadar küçültülüp tekrar denenir.
  2. **Geniş barkod**: yine sığmazsa barkod tek başına tam genişlikte (55.88 mm) üst sırada; kare kod bilgi satırlarının sağına iner, bilgi satırları onun soluna daralır. Uyarı: "Kod uzun olduğu için barkod tam genişlikte, kare kod aşağıda."
  3. **Yalnız kare kod**: 2 nokta modülle tam genişliğe de sığmıyorsa (yaklaşık 27+ karakter harfli kod) Code128 basılmaz, sadece kare kod basılır. Uyarı: "Kod çok uzun olduğu için çizgili barkod basılmadı; kare kod var."

**DataMatrix** (ECC200, kare, `zxing-cpp` ile matris; modüller vektör dikdörtgen):
- Modül: hedef genişlik / modül sayısı (62x100: 168 nokta = 14.2 mm, sürekli: 156 nokta = 13.2 mm), **en az 5 nokta (0.42 mm)**, en çok 8 nokta (0.68 mm).
- Sessiz bölge: sağda ve üstte kenar boşluğu (3.05 mm ≥ 1 modül), solda Code128 sağ sessiz bölgesi.
- 5 noktada 260 noktayı (22 mm, 52x52 modül) geçecekse bilgi satırları kare koddan çıkarılır (etikette yazılı kalır); uyarı: "Bilgi satırları çok uzun olduğu için kare koda eklenmedi." Büyük kare kod çubuk barkodun yanına sığmazsa yerleşim "geniş" moda geçer (kare kod bilgi satırlarının sağına iner).
- Türkçe harfler UTF-8 (ECI 26) ile kodlanır; zxing tabanlı okuyucular ve güncel el terminalleri doğru okur. Çok eski okuyucular Türkçe harfleri bozuk gösterebilir (rulman kodu ASCII olduğundan kodu etkilemez).

## 5. Otomatik sığdırma kuralları

| Durum | Kural |
|---|---|
| Uzun kod | Tek satıra sığana kadar 0.5 pt adımlarla küçülür (20/18 pt → **en az 12 pt**). |
| Hâlâ sığmıyor | İki satıra bölünür: **'-' işaretinden sonra** (tire ilk satırda kalır), iki satırın uzununu en kısa yapan tire seçilir. İki satır 20/18 pt'den başlayıp **en az 9 pt**'ye kadar küçülür. Tire yoksa (ör. 40 karakter harf) en dengeli harf yerinden bölünür. |
| Ek (C3) | Kodla aynı punto; tek başına sığmazsa küçülür (en az 9 pt), yine sığmazsa "…" ile kısaltılır (ek en fazla 15 karakter); uyarı: "Ek etikete sığmadığı için kısaltıldı." |
| Ek boş | Ek satırı hiç çizilmez, alttaki her şey bir satır yukarı kayar (üstte ve alt tekrarda). |
| Bilgi satırı boş | Satır kalkar; ikisi de boşsa bilgi bloğu ve önündeki 3.5 mm boşluk da kalkar. |
| Uzun bilgi satırı | İki satır aynı puntoda kalır: 8/7.5 pt'den 0.25 pt adımla **en az 6 pt**'ye kadar küçülür; yine sığmazsa sonu "…" ile kesilir (bütün yerleşim modlarında); uyarı: "Bilgi satırı etikete sığmadığı için kısaltıldı." Satır kaydırma yapılmaz (en fazla 60 karakter). |
| 62x100'e sığmama | Kod puntosu 1 pt adımlarla 12 pt'ye kadar düşürülür; yine sığmazsa `dogrula` hata döner: "Yazılanlar 62 x 100 mm etikete sığmıyor; kodu veya bilgi satırlarını kısaltın." |
| Sürekli rulo | Hiç sığmama yok; uzunluk büyür. |
| Alt tekrar | `alt_tekrar` (varsayılan **açık**). Kapalıysa alt blok çizilmez; 62x100'de alt kısım boş kalır, süreklide etiket kısalır. |

## 6. Giriş denetimi (`dogrula`)

Boş liste = basılabilir. Hata metinleri (Türkçe, kullanıcıya aynen gösterilir):
- "Rulman kodu boş olamaz." · "Rulman kodu en fazla 40 karakter olabilir (şu an N)."
- "Ek (ör. C3) en fazla 15 karakter olabilir."
- "Rulman kodu / Ek barkoda yazılamayan harf içeriyor: Ş (Türkçe harf kullanmayın, ör. Ş yerine S)."
- "Adet tam sayı olmalı." · "Adet 1 ile 99999 arasında olmalı."
- "Adet yazısı en fazla 12 karakter olabilir." · "Bilgi satırı N en fazla 60 karakter olabilir."
- "… tek satır olmalı." (alanlarda satır sonu/sekme)
- Her iki boyutta yerleşim denenir; sığmazsa yukarıdaki sığmama metni.
`ciz` ayrıca kopya 1–999 ve boyut adını denetler, hata varsa `EtiketHatasi` fırlatır.

## 7. Kütüphane seçimi

| İş | Kütüphane | Gerekçe |
|---|---|---|
| PDF çizimi | `pymupdf` | Kargo Etiket'te kullanılan, PyInstaller ile sorunsuz paketlenen vektörel PDF; PNG önizleme de aynı kütüphaneyle. |
| Code128 | `python-barcode` | Saf Python, Kargo Etiket'teki gibi yalnız modül dizisi alınır, çizim bizde. |
| DataMatrix | **`zxing-cpp`** (`zxingcpp.create_barcode(..., force_square=True)`) | Windows için hazır wheel (tek `.pyd`, ayrı DLL yok); PyInstaller onu sıradan uzantı modülü gibi otomatik toplar. UTF-8/ECI ile Türkçe harfleri kodlar. Aynı paket testte okuyucu olarak da kullanılır. **Saf Python seçenek `ppf.datamatrix` denendi: Türkçe harfte hata veriyor** (yalnız ASCII/C40/Text/X12/EDIFACT, Base256/ECI yok). `pylibdmtx` ayrı `libdmtx` DLL'i ister, bu yüzden seçilmedi. |
| Matris dizisi | `numpy` | zxing-cpp görüntüsünü diziye çevirmek için (zxing-cpp'nin `to_image` çıktısı). |

PyInstaller notu: `fonts/` klasörü exe'ye `fonts/` adıyla eklenmeli (`--add-data "fonts;fonts"`); modül `sys._MEIPASS/fonts` altında arar.
`zxing-cpp` için ek ayar gerekmez; gerekirse `--collect-binaries zxingcpp`.

## 8. Önizlemeler

`python test/onizleme_uret.py` (rulman_etiket klasöründen) → `test/onizleme/`:
`NN_ad_62x100.png/.pdf`, `NN_ad_62surekli.png/.pdf` (300 dpi) ve
`dogrulama.md` (aşağıdaki tablo). Çıkış kodu 0 = bütün barkodlar doğru okundu.
Referans fotoğraf (marka deseni, EAN ve lot numarası içerdiği için) repoda tutulmaz; karşılaştırma için
`python test/onizleme_uret.py --referans <foto.jpg>` çalıştırılır, görüntü geçici klasöre yazılır (`test/onizleme/.gitignore` bu dosyaları dışarıda tutar).

## 9. Barkod doğrulama sonuçları

300 dpi PNG'ler `zxing-cpp` 3.1.1 (`read_barcodes`) ile okundu; okunan metin beklenenle birebir karşılaştırıldı (⏎ = satır sonu).

| Örnek | Boyut | Etiket (mm) | Code128 beklenen | Code128 okunan | DataMatrix beklenen | DataMatrix okunan | Sonuç |
|---|---|---|---|---|---|---|---|
| 01_6308_C3 | 62x100 | 62 x 100.0 | `6308-C-2HRS C3` | `6308-C-2HRS C3` | `6308-C-2HRS C3⏎1` | `6308-C-2HRS C3⏎1` | TAMAM |
| 01_6308_C3 | 62surekli | 62 x 80.0 | `6308-C-2HRS C3` | `6308-C-2HRS C3` | `6308-C-2HRS C3⏎1` | `6308-C-2HRS C3⏎1` | TAMAM |
| 02_6308_C3_bilgili | 62x100 | 62 x 100.0 | `6308-C-2HRS C3` | `6308-C-2HRS C3` | `6308-C-2HRS C3⏎1⏎RAF A-12⏎Yamansa Rulman` | `6308-C-2HRS C3⏎1⏎RAF A-12⏎Yamansa Rulman` | TAMAM |
| 02_6308_C3_bilgili | 62surekli | 62 x 80.0 | `6308-C-2HRS C3` | `6308-C-2HRS C3` | `6308-C-2HRS C3⏎1⏎RAF A-12⏎Yamansa Rulman` | `6308-C-2HRS C3⏎1⏎RAF A-12⏎Yamansa Rulman` | TAMAM |
| 03_6205_adet10 | 62x100 | 62 x 100.0 | `6205-2RSR` | `6205-2RSR` | `6205-2RSR⏎10` | `6205-2RSR⏎10` | TAMAM |
| 03_6205_adet10 | 62surekli | 62 x 80.0 | `6205-2RSR` | `6205-2RSR` | `6205-2RSR⏎10` | `6205-2RSR⏎10` | TAMAM |
| 04_uzun_kod | 62x100 | 62 x 100.0 | `22320-E1-XL-K-T41A C3` | `22320-E1-XL-K-T41A C3` | `22320-E1-XL-K-T41A C3⏎1` | `22320-E1-XL-K-T41A C3⏎1` | TAMAM |
| 04_uzun_kod | 62surekli | 62 x 80.0 | `22320-E1-XL-K-T41A C3` | `22320-E1-XL-K-T41A C3` | `22320-E1-XL-K-T41A C3⏎1` | `22320-E1-XL-K-T41A C3⏎1` | TAMAM |
| 05_NU2215 | 62x100 | 62 x 100.0 | `NU2215-E-XL-TVP2 C3` | `NU2215-E-XL-TVP2 C3` | `NU2215-E-XL-TVP2 C3⏎2` | `NU2215-E-XL-TVP2 C3⏎2` | TAMAM |
| 05_NU2215 | 62surekli | 62 x 80.0 | `NU2215-E-XL-TVP2 C3` | `NU2215-E-XL-TVP2 C3` | `NU2215-E-XL-TVP2 C3⏎2` | `NU2215-E-XL-TVP2 C3⏎2` | TAMAM |
| 06_turkce | 62x100 | 62 x 100.0 | `608-2Z` | `608-2Z` | `608-2Z⏎100⏎ÇİFT TARAF KAPAKLI ŞIĞ İĞNE ÜÖ` | `608-2Z⏎100⏎ÇİFT TARAF KAPAKLI ŞIĞ İĞNE ÜÖ` | TAMAM |
| 06_turkce | 62surekli | 62 x 80.0 | `608-2Z` | `608-2Z` | `608-2Z⏎100⏎ÇİFT TARAF KAPAKLI ŞIĞ İĞNE ÜÖ` | `608-2Z⏎100⏎ÇİFT TARAF KAPAKLI ŞIĞ İĞNE ÜÖ` | TAMAM |
| 07_alt_tekrar_yok | 62x100 | 62 x 100.0 | `51100` | `51100` | `51100⏎1` | `51100⏎1` | TAMAM |
| 07_alt_tekrar_yok | 62surekli | 62 x 29.7 | `51100` | `51100` | `51100⏎1` | `51100⏎1` | TAMAM |
