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
| Yazı tipi | **Liberation Sans 2.1.5** Regular ve Bold (`fonts/`, SIL Open Font License 1.1, `fonts/LICENSE`). Arial ile aynı harf genişliklerine sahiptir; PDF'e alt küme olarak gömülür. Türkçe harflerin (İ ı Ş ş Ğ ğ Ü ü Ö ö Ç ç) hepsi var. |
| Ölçüler | Büyük harf yüksekliği = 0.716 × punto, alt taşma = 0.212 × punto (Liberation/Arial). Aşağıdaki "taban" değerleri yazı taban çizgisinin sayfa üstünden uzaklığıdır. |

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
| Barkod altı yazı | çubukların ortasına | taban 15.51 (çubuk altı + 0.7 mm + büyük harf) | çubuk genişliğini geçmez | Regular 7 pt (en az 5 pt) |
| DataMatrix | sağa dayalı, sağ kenar 58.93 | üst 3.05 | 12.19 x 12.19 (18x18 modül, 8 nokta = 0.68 mm) (24x24 x 7 nokta = 14.22 mm) | — |
| Adet "1 Qty" | 3.05 | taban 20.43 (22.20) — üst sıranın altından 2.4 mm boşluk | — | Bold 10 pt |
| Kod "6308-C-2HRS" | 3.05 | taban 27.08 (28.85) — adet tabanından 1.6 mm + büyük harf | 44.3 mm | Bold 20 pt |
| Ek "C3" | 3.05 | taban 33.79 (35.55) — satır aralığı 0.95 em | — | Bold 20 pt (kodla aynı) |
| Bilgi 1 / 2 | 3.05 | taban (41.07 / 44.74) — ekten 3.5 mm sonra, satır aralığı 1.3 em | en fazla 55.88 | Regular 8 pt (en az 6 pt) |
| Alt tekrar | 3.05 | blok sayfa altına dayalı: son satır alt taşması 100 − 3.05 mm'de; "1 Qty" tabanı 82.1 | — | üsttekiyle aynı |
| Esnek boşluk | — | üst blok ile alt tekrar arası; en az 6 mm | — | — |

### 3b. 62 mm sürekli rulo (DK-22205) — `"62surekli"`

Uzunluk içeriğe göre hesaplanır, tam noktaya yuvarlanır. Alt tekrar açıkken **en az 80 mm** (referans oranı
62:77, okunurluk için biraz uzun); içerik uzarsa (iki satır kod, bilgi satırları + büyük kare kod) uzar.
Alt tekrar kapalıysa uzunluk = içerik + 3.05 mm alt boşluk (ör. `51100` → ~31 mm).

| Öğe | x (mm) | y / taban (mm) | genişlik x yükseklik (mm) | Yazı |
|---|---|---|---|---|
| Code128 çubuklar | 3.05 | üst 3.05 | 30.14 x 8.97 | — |
| Barkod altı yazı | ortalı | taban 14.49 | — | Regular 7 pt |
| DataMatrix | sağa dayalı | üst 3.05 | 12.19 (18x18 x 8 nokta) (bilgili: 24x24 x 6 nokta = 12.19) | — |
| Adet | 3.05 | taban 19.91 | — | Bold 9 pt |
| Kod | 3.05 | taban 26.06 | 39.9 mm | Bold 18 pt |
| Ek | 3.05 | taban 32.09 | — | Bold 18 pt |
| Bilgi 1 / 2 | 3.05 | taban (37.49 / 40.93) | ≤ 55.88 | Regular 7.5 pt (en az 6 pt) |
| Alt tekrar | 3.05 | sayfa altına dayalı; "1 Qty" tabanı 63.4 | — | üsttekiyle aynı |
| Uzunluk | — | 80.0 mm | — | — |

Referansla oran: referansta kod yazısı genişliğin ~%51'i, büyük harf yüksekliği / adet yazısı ≈ 1.4, kod / bilgi ≈ 1.5.
Burada kod yazısı daha büyük tutuldu (62x100'de genişliğin %71'i, 62 sürekli'de %64'ü; kod/adet = 2.0, kod/bilgi = 2.5)
çünkü raftan okunacak asıl bilgi koddur. Dikey sıra ve boşluk mantığı referansla aynıdır.

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
- 5 noktada 180 noktayı (15.2 mm) geçecekse bilgi satırları kare koddan çıkarılır (etikette yazılı kalır); uyarı: "Bilgi satırları çok uzun olduğu için kare koda eklenmedi."
- Türkçe harfler UTF-8 (ECI 26) ile kodlanır; zxing tabanlı okuyucular ve güncel el terminalleri doğru okur. Çok eski okuyucular Türkçe harfleri bozuk gösterebilir (rulman kodu ASCII olduğundan kodu etkilemez).

## 5. Otomatik sığdırma kuralları

| Durum | Kural |
|---|---|
| Uzun kod | Tek satıra sığana kadar 0.5 pt adımlarla küçülür (20/18 pt → **en az 12 pt**). |
| Hâlâ sığmıyor | İki satıra bölünür: **'-' işaretinden sonra** (tire ilk satırda kalır), iki satırın uzununu en kısa yapan tire seçilir. İki satır 20/18 pt'den başlayıp **en az 9 pt**'ye kadar küçülür. Tire yoksa (ör. 40 karakter harf) en dengeli harf yerinden bölünür. |
| Ek (C3) | Kodla aynı punto; tek başına sığmazsa küçülür (en az 9 pt), yine sığmazsa "…" ile kısaltılır (ek en fazla 15 karakter). |
| Ek boş | Ek satırı hiç çizilmez, alttaki her şey bir satır yukarı kayar (üstte ve alt tekrarda). |
| Bilgi satırı boş | Satır kalkar; ikisi de boşsa bilgi bloğu ve önündeki 3.5 mm boşluk da kalkar. |
| Uzun bilgi satırı | İki satır aynı puntoda kalır: 8/7.5 pt'den 0.25 pt adımla **en az 6 pt**'ye kadar küçülür; yine sığmazsa sonu "…" ile kesilir. Satır kaydırma yapılmaz (en fazla 60 karakter). |
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
`NN_ad_62x100.png/.pdf`, `NN_ad_62surekli.png/.pdf` (300 dpi), `karsilastirma.png` (referans fotoğraf ↔ 6308-C-2HRS C3, 62 mm sürekli),
`dogrulama.md` (aşağıdaki tablo). Çıkış kodu 0 = bütün barkodlar doğru okundu.

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
