# baglanti — teknik çizim modülü raporu

Modül: `site/draw/baglanti.js` (`window.YDRAW.baglanti`). Fotoğraftan ölçü okunmadı → `site/draw/data/baglanti.json` yok. Çizimdeki tüm sayılar ürün sayfasındaki `#divTabOzellikler li` / `#divOnyazi table` verisinden.

## Alt tipler ve kullanılan ölçü etiketleri

| Alt tip | Tanıma (breadcrumb) | Sayfa etiketi → çizim anahtarı | Çizim |
|---|---|---|---|
| Manşon somunu KM | `MANŞON SOMUN VE PUL > SOMUN` | `İç Diş` (M..x..) → G, `Dış Çap` → D, `Genişlik` → B | Ön görünüş (4 kanal, dişli delik: kalın diş dibi + ince 3/4 diş üstü yayı) + KESİT A-A |
| Manşon pulu MB | `MANŞON SOMUN VE PUL > PUL` | `İç Çap` → d, `Dış Çap` → D, `Genişlik (Kalınlık)` → s | Ön görünüş (iç tırnak + dış tırnaklar) + KESİT A-A |
| Dış segman DIN 471 | `SEGMAN > 471 DIŞ SEGMAN` | `Ebat` → d1 (mil çapı); `Ebat` "AxB" ise B → s | Açık halka, dışa dönük delikli kulaklar, mil çizgisi + KESİT A-A |
| İç segman DIN 472 | `SEGMAN > 472 İÇ SEGMAN` | `Ebat` → d1 (delik çapı); "AxB" ise B → s | Açık halka, içe dönük delikli kulaklar, delik çizgisi + KESİT A-A |
| Konik burç (taper lock) | `KAFES VE BURÇLAR > KONİK BURÇLAR` | ön yazı `Mil Çapı` → d (seri: `Burç Tipi`) | Ön görünüş (kama kanalı, yarık, yarım vida delikleri) + konik KESİT A-A |
| Kama DIN 6885 | `KAMA` | ön yazı `Kama Ölçüsü` b*h*L → b, h, L | Üst görünüş (yuvarlak uçlu; çok uzunsa kırık gösterim) + KESİT A-A |
| Konik kilit | `KONİK KİLİTLER` | — | **Çizim yok (draw → null)**, aşağıya bakın |

Kontrol: başlıktaki ölçü (ör. `1008*9`, `471 20x1.75`) sayfa verisinden farklıysa ya da özellikler ile ön yazı farklı sayı verirse `draw` null döner.

## Kapsam sayıları (ölçülen)

`products.json` URL deseni + Chrome ile açılan sayfalar (curl Cloudflare'e takıldı; ~1 sayfa/sn). 1031 aday sayfadan 414 tanesi açıldı (süre nedeniyle tarama yarıda bırakıldı; açılmayanlar sayılmadı).

| Alt tip | products.json URL | Açılan sayfa | Gerekli ölçü sayfada var (çizim çıkıyor) |
|---|---|---|---|
| Manşon somunu KM | 36 | 36 | 36 |
| Manşon pulu MB | 38 | 38 | 38 |
| Dış segman DIN 471 | 137 | 56 | 56 |
| İç segman DIN 472 | 119 | 56 | 56 |
| Konik burç (taper lock) | 193 | 53 | 53 |
| Kama DIN 6885 | 170 | 53 | 53 |
| Konik kilit | 253 | 67 | 0 |

- Emniyet pulu: products.json içinde "emniyet" geçen ürün yok; emniyet pulu olarak MB manşon pulları var.
- Rulman manşonu (H 2xx / H 23xx, `MANŞON SOMUN VE PUL > MANŞON`): aile tanımında yok, sayfada boy ölçüsü yok → match false. Açılan sayfalardan 55 tanesi match=false (H manşonları + kaldırılıp anasayfaya yönlenen ürünler).

## Emin olunamayanlar

- **Konik kilit (253 ürün):** sayfada `Ölçü 019*47`, `İç Çap (d) 19`, `Dış Çap (D) 47` yazıyor; ama 2. fotoğraftaki üretici tablosunda ölçü sırası d×L, yani 47 = L (boy). Sayfa verisi ile fotoğraf tablosu çelişiyor → konik kilitte çizim çıkmıyor. Sayfadaki "Dış Çap" etiketi düzeltilirse çizim eklenebilir. Bakılan fotoğraflar:
  - `/konik-kilit-200-b-tipi-01947-17411` → https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/konik-kilit-200-b-tipi-01947--4c1c-.jpeg
  - `/konik-kilit-300-fa1-tipi-02047-17456` → https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/konik-kilit-300-fa1-tipi-02047-80829e.jpeg
  - `/konik-kilit-401-de-tipi-02455-17490` → https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/konik-kilit-401-de-tipi-02455-cdefa9.png
  - `/konik-kilit-301-fb1-tipi-02047-17532` → https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/konik-kilit-301-fb1-tipi-02047--bc3a-.png
- **Konik burç:** sayfada sadece mil çapı var. Dış çap / boy yazılmıyor; çizimin oranı burç serisinin (1008, 1210, 1610 …) standart dış çap/boy değerlerinden alınır (sayı gösterilmez). Tabloda olmayan seri (ör. 6050) → null.
- **Segman:** kulak şekli, halka genişliği ve delik boyutu DIN 471/472 biçimine göre orantılı çizilir, sayı yazılmaz. Sadece çapı olan ürünlerde kalınlık sayfada yok → kesitte kalınlık ölçüsü yok. `Ebat 20x1.75` gibi ürünlerde ikinci sayı DIN gösterimine (d1×s) göre kalınlık kabul edildi.
- **KM / MB:** kanal ve tırnak ölçüleri sayfada yok; şekil orantılı, sayı yazılmaz. MB `Diş Aralığı` çizimde kullanılmadı.
- Fotoğraftan ölçü okunmadı (KM/MB/segman/kama fotoğrafları ürün fotoğrafı, ölçü tablosu yok).

## Fixture match sonuçları (35 ürün)

| Ürün | Alt tip | match | draw | Gösterilen ölçüler |
|---|---|---|---|---|
| `/ymn-manson-somunu-km-0-15866` | km | true | svg | G=M10×0,75; D=18 mm; B=4 mm |
| `/ymn-manson-somunu-km-11-15877` | km | true | svg | G=M55×2; D=75 mm; B=11 mm |
| `/ymn-manson-somunu-km-22-15888` | km | true | svg | G=M110×2; D=145 mm; B=19 mm |
| `/ymn-manson-somunu-km-34-15898` | km | true | svg | G=M170×3; D=220 mm; B=26 mm |
| `/ymn-manson-pulu-mb-0-15902` | mb | true | svg | d=10 mm; D=21 mm; s=1 mm |
| `/ymn-manson-pulu-mb-11-15913` | mb | true | svg | d=55 mm; D=81 mm; s=1,5 mm |
| `/ymn-manson-pulu-mb-22-15924` | mb | true | svg | d=110 mm; D=154 mm; s=1,8 mm |
| `/ymn-manson-pulu-mb-32-15934` | mb | true | svg | d=160 mm; D=217 mm; s=2,5 mm |
| `/471-4-beneri-dis-segman-13314` | s471 | true | svg | d1=4 mm |
| `/471-14-beneri-dis-segman-13324` | s471 | true | svg | d1=14 mm |
| `/471-25-beneri-dis-segman-13335` | s471 | true | svg | d1=25 mm |
| `/471-35-beneri-dis-segman-13345` | s471 | true | svg | d1=35 mm |
| `/472-8-beneri-ic-segman-13451` | s472 | true | svg | d1=8 mm |
| `/472-18-beneri-ic-segman-13461` | s472 | true | svg | d1=18 mm |
| `/472-29-beneri-ic-segman-13472` | s472 | true | svg | d1=29 mm |
| `/472-39-beneri-ic-segman-13482` | s472 | true | svg | d1=39 mm |
| `/471-20x1.75-beneri-dis-segman-13417` | s471 | true | svg | d1=20 mm; s=1,75 mm |
| `/471-30x2.5-beneri-dis-segman-13425` | s471 | true | svg | d1=30 mm; s=2,5 mm |
| `/472-24x1.5-beneri-ic-segman-13554` | s472 | true | svg | d1=24 mm; s=1,5 mm |
| `/472-30x1.5-beneri-ic-segman-13556` | s472 | true | svg | d1=30 mm; s=1,5 mm |
| `/10089-ymn-konik-burc-12621` | burc | true | svg | d=9 mm |
| `/100814-ymn-konik-burc-12625` | burc | true | svg | d=14 mm |
| `/121019-ymn-konik-burc-12651` | burc | true | svg | d=19 mm |
| `/110828-ymn-konik-burc-12645` | burc | true | svg | d=28 mm |
| `/14930-ymn-kama-din-6885-12824` | kama | true | svg | b=14 mm; h=9 mm; L=30 mm |
| `/14955-ymn-kama-din-6885-12829` | kama | true | svg | b=14 mm; h=9 mm; L=55 mm |
| `/1610100-ymn-kama-din-6885-12835` | kama | true | svg | b=16 mm; h=10 mm; L=100 mm |
| `/1610150-ymn-kama-din-6885-12840` | kama | true | svg | b=16 mm; h=10 mm; L=150 mm |
| `/konik-kilit-200-b-tipi-01947-17411` | kilit | true | null | - |
| `/konik-kilit-300-fa1-tipi-02047-17456` | kilit | true | null | - |
| `/konik-kilit-401-de-tipi-02455-17490` | kilit | true | null | - |
| `/konik-kilit-301-fb1-tipi-02047-17532` | kilit | true | null | - |
| `/ymn-rulman-mansonu-h-205-15780` | - | false | null | - |
| `/ymn-rulman-mansonu-h-206-15781` | - | false | null | - |
| `/ymn-rulman-mansonu-h-207-15782` | - | false | null | - |

## Önizleme
`site/draw/preview/baglanti.html` (fixture kartları; ölçü etiketine tıklayınca ölçü çizgisi kırmızı). Ekran görüntüleri: `site/draw/preview/baglanti/NN-<ürün>-460.png` / `-360.png` (2x).
