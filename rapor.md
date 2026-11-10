# Triger kasnak ürün teslim raporu

## Kapsam ve toplamlar

- Dal: `orkapt/triger`; çalışma alanı: `~/w/girdi`.
- Girdi: `parca/triger.jsonl.gz`, 915 ürün.
- Teslim: `urunler.jsonl`, 915 nesne / 915 benzersiz kod / 915 benzersiz görsel yolu.
- Marka tüm ürünlerde `Yamansa`; satış birimi tüm ürünlerde **Adet**.
- Alan sırası: kod, URUNADI, MARKA, KATEGORI, EK_KATEGORILER, yeni_kategori, ONYAZI,
  ACIKLAMA, ANAHTARKELIME, SEO_SAYFABASLIK, SEO_SAYFAACIKLAMA, SEO_ANAHTARKELIME,
  resim, resim_seviye, resim_kaynak, gorsel_grup, teknik_kaynak, bayraklar.
- `_d` ve `grup` dışarı verilmez; `gorsel_grup` kullanılır. Türkçe JSON, satır başına bir nesne.
- Ticimax'e yükleme yapılmadı; PR açılmadı.

## Görseller

**birebir: 0 / ayni_tip: 915.** Onaylanan 11 grup master'ı, ürünün grubuna göre ayrı slug dosyalarına kopyalandı.
500×500 JPEG, kalite 92; üst ve alt şablon bantları kompozit aşamasında aynen korunur.
Ürünler beyaz orta alanda, oranları korunarak yatay merkezlenir. Slug çakışmasında `-2`, `-3` eklenir.

Araştırma notu: SKU'ya birebir fotoğraflar Yandex ve bayi sitelerinde arandı; yalnız seri fotoğrafları bulundu.
Bayi fotoğrafları filigran taşıdığından kullanılmadı. Kullanılan görseller birebir SKU fotoğrafı iddiası taşımaz.
Kaynaklar her üründe `resim_kaynak` alanında ve `tools/gorsel_gruplar.json` içinde korunur.

| Grup | Açıklama | Ürün | Kaynak URL |
| --- | --- | ---: | --- |
| G1 | AL flanşlı XL | 23 | https://orkapt.com/wp-content/uploads/2020/03/XL-TRİGER-KASNAKLAR.jpg |
| G2 | AL flanşlı T5/T10 | 121 | https://orkapt.com/wp-content/uploads/2020/03/T5-TRİGER-KASNAKLAR.jpg |
| G3a | AL flanşlı 3M | 51 | https://orkapt.com/wp-content/uploads/2020/03/3M-TRİGER-KASNAKLAR.jpg |
| G3b | AL flanşlı 5M | 47 | https://orkapt.com/wp-content/uploads/2020/03/5M-TRİGER-KASNAKLAR.jpg |
| G4 | AL flanşsız, yalnız üst-sol kasnak | 65 | https://m.media-amazon.com/images/I/31VsZnUhdAL._AC_UL480_QL65_.jpg |
| G5 | Çelik flanşlı yuvarlak diş | 99 | https://orkapt.com/wp-content/uploads/2020/03/8M-TRİGER-KASNAKLAR-1.jpg |
| G6 | Çelik flanşlı trapez | 237 | https://orkapt.com/wp-content/uploads/2020/03/L-TRİGER-KASNAK.jpg |
| G7 | Çelik flanşsız göbekli | 72 | https://stsrulman.com/wp-content/uploads/2018/09/AnyConv.com__555555.webp |
| G8 | Çelik kollu flanşsız | 41 | https://orkapt.com/wp-content/uploads/2020/03/H-TRİGER-KASNAKLAR.jpg |
| G9 | Burçlu flanşlı | 132 | https://orkapt.com/wp-content/uploads/2020/03/BH-BURÇLU-TRİGER-KASNAKLAR.jpg |
| G10 | Burçlu flanşsız | 27 | https://www.aksdekom.ru/images/cms/thumbs/c8c71e1a70074e158e2eb00595b497fde487673b/3f_df_460_auto.png |

G5'te `-1` dosyası seçildi; iki adayın dosya SHA-256'ları aynıydı ve flanşlar görünür.
G7 turuncu geçişli arka planı koyu-piksel maskesi, delik doldurma ve hafif yumuşatmayla kaldırıldı.
G8 fotoğrafında silik döküm işaretleri var; 500px çıktıda güvenle okunabilir değiller, rötuşla gizlenmediler.
G5/G6/G9'da da silik damga izleri korunur. Görseller kullanıcı tarafından grup master'ı olarak onaylandı.
`tmp_master/` teslim commit'ine dahil değildir; 915 ürün görseli `gorseller/` altındadır.

## Eksik teknik veriler ve bayraklar

`eksik:` bayrağı altındaki her bileşenin sayısı (aynı üründe birden çok eksik bulunabilir):

| Bayrak / eksik alan | Sayı |
| --- | ---: |
| Dp | 7 |
| De | 7 |
| F | 9 |
| Df | 17 |
| on_delik | 33 |
| maks_delik | 5 |
| malzeme | 503 |
| kaynak_yok | 7 |
| gorsel_flans_dogrulanmadi | 1 |

Eksik değerler sayı ile doldurulmadı. Malzeme yalnız kaynak açıkça belirtiyorsa yazıldı.
TKX özel kasnağının flanş/görsel durumu `gorsel_flans_dogrulanmadi` ile ayrıca işaretlidir.

Üretici ölçü tablosu olmayan yedi ürün:

1. `ORK BTK 1128M50` — 112 diş, 8M 50, 3020 burç.
2. `ORK BTK 428M50F` — 42 diş, 8M 50, 2012 burç.
3. `ORK BTK 608M20F` — 60 diş, 8M 20, 2012 burç.
4. `ORK BTK 608M30F` — 60 diş, 8M 30, 2012 burç.
5. `ORK BTK 608M50F` — 60 diş, 8M 50, 2517 burç.
6. `ORK TK 39H075F` — 39 diş, H 075.
7. `ORK TKX 60T1025` — özel T10 25 kasnak, ürün adında 50 mm delik.

Tedarikçi kodu yalnız iç kayıt alanı `kod` ve rapordaki izlenebilirlik listesinde korunur;
müşteriye dönük alanlarda ORKA/ORKAPT/ORK bulunmaz.

## Yeni kategori önerileri

Bu yollar mevcut `site_kategoriler.txt` içinde yoktur; tüm ilgili kayıtlarda `yeni_kategori: true`:

| Öneri | Ürün |
| --- | ---: |
| KASNAKLAR>TRİGER KASNAKLAR | 756 |
| KASNAKLAR>BURÇLU TRİGER KASNAKLAR | 159 |

İki grupta da ek kategori `KASNAKLAR`.

## Metin, satış birimi ve anahtar kelimeler

`tools/gen.py` metin/ölçü üretimi korundu. Son ek talep doğrultusunda `specs()` içinde Marka'dan hemen sonra
`Satış Birimi: Adet` eklendi. Uygulama alanlarındaki `paketleme` sözcükleri, istenen `paket` regex'ine takılmaması
için aynı anlamdaki `ambalajlama` ile değiştirildi. Bunlar dışında gen.py metni/mantığı değiştirilmedi;
kaynakla doğrulanmış bir değer hatası saptanmadı.

`denetle.py`, URUNADI ve açıklama paragraflarında `koli|paket|\bPKT\b|\d+\s*AD\b` ifadesini reddeder;
teknik listede `Satış Birimi: Adet` bulunmasını da zorunlu kılar. 915 girdinin birimi ADET'tir.

ANAHTARKELIME ondalık nokta kullanır ve **en çok 250 karakterdir**: Ticimax virgülle böler, panel sınırı 250'dir.
SEO_ANAHTARKELIME hem virgüllü hem noktalı sayısal biçimleri içerir ve **en çok 950 karakterdir**.
SEO başlık en çok 60, SEO açıklama en çok 155 karakterdir.

## Teknik çizim ve önizlemeler

Modül: `~/w/draw/site/draw/triger.js`, dal `draw/triger`, commit `aaffafe`.
Ctx, her kaydın ACIKLAMA `<li><strong>Etiket:</strong> değer</li>` listesinden ve URUNADI başlığından üretildi;
gerçek modül Node vm içinde çağrıldı. Sonuç **908/915 çizim**, 7 null (De/Dp yok; kaynak tablosu yok).
Çizim şematiktir; Di/S/R teknik listede kalabilir ancak çizimde kullanılmaz.

Ürün fotoğrafı, başlık, ONYAZI kutuları, modülün SVG'si ve ACIKLAMA ile üç statik HTML oluşturuldu;
1100px genişlikte headless Chrome/Playwright tam sayfa PNG'leri alındı ve üçü de açılarak incelendi:

- `onizleme/btk-16h100f.html` / `onizleme/btk-16h100f.png`
- `onizleme/tk-208m20f.html` / `onizleme/tk-208m20f.png`
- `onizleme/tk-10xl037fal.html` / `onizleme/tk-10xl037fal.png`

Bu yerel yaklaşık ürün sayfalarıdır; canlı Ticimax entegrasyonu yapılmadı.

## Denetim özeti

Çalıştırma (Node PATH'i hazır olmalı; bu ortamda `source ~/.nvm/nvm.sh`):

```sh
python3 tools/assemble.py
python3 -m unittest discover -s tools -p test_delivery.py -v
python3 tools/denetle.py
python3 tools/onizleme.py
```

Görsel yeniden üretimi için `python3 tools/gorsel.py`; Pillow, NumPy, SciPy gerekir.
Önizlemeler Playwright ve `~/.local/bin/google-chrome` kullanır.

```text
ASSEMBLE: 915 records, 915 unique image paths
Ran 5 tests in 0.244s
OK
RECORDS: 915; unique kod: 915; unique resim: 915
DRAW: 908/915; NULL: 7
NULL REASON: De ve Dp eksik (kaynak tablosu yok): 7
PASS: 0 validation errors
```

Denetim zorunlu alanlar, uzunluk sınırları, tedarikçi adları, Unicode/mojibake, eksik ölçü yer tutucuları,
görsel biçimi/boyutu/dosyası, benzersizlik, kategori bayrağı, marka, link izin listesi ve 2–4 link sınırını kapsar.
Negatif testlerde bu kuralların reddetmesi, boş veri, slug çakışması ve alan sırası kontrol edildi.

Birden çok üründe birebir aynı `<p>` paragrafları (bilgilendirme; ürün başına sayılır), ilk beş:

| Ürün sayısı | Paragraf |
| ---: | --- |
| 7 | Aynı diş sayısı ve aynı H profilindeki ürünlerde profil/hatve paragrafı (ürün kodu ve ölçüler diğer paragraflarda ayrışır) |

Burç, pilot delik ve flanş paragrafları ürün kodu ve diş sayısı içerecek şekilde ürüne özgü hale getirildi; en çok tekrar eden paragraf 7 ürünle sınırlı.
