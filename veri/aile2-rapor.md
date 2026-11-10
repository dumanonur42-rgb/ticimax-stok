# Aile 1 + Aile 2 teslimi: 108 ürün

Önceki **52 ürün aynen korundu**, ikinci ailenin **56 girdisinin tamamı** eklendi. Kapsam: 12 KKM, 13 İM, 7 SAC, 4 TBR, 6 VM, 6 Yamansa SFU, 3 ETAZON SFU, 5 DSG. SAC25/30'un 3 ve 4 metre varyantları ayrı kayıttır. 208 girdiden kalan 100 ürün bu teslimde işlenmedi. **Panele girilmedi, yükleme ve push yapılmadı.**

## Önemli teknik sınırlar

- KKM/İM için yalnız girdideki çap ve 4000 mm boy kesin bilgi kabul edildi. h6/g6, HRC, krom kalınlığı, CF53/Ck45 ve kg/m bulunamadı; başka markadan aktarılmadı. KKM'ye ek indüksiyon, İM'ye ek krom kaplama yakıştırılmadı. Krom kaplama ile indüksiyon ayrı işlemler olarak anlatıldı, ürünlerin birlikte her iki işlemi gördüğü iddia edilmedi.
- **ETAZON resmi kaynak bulunamadı.** Üç ETAZON ürününün markası korundu; başka markanın ölçü/yükleri aktarılmadı. Yalnız girdi/modeldeki çap ve adım kullanıldı.
- **SFU tam sirkülasyon eki belirsiz.** Resmi katalog SFU1605-3 için L40, -4 için L50 veriyor. Girdi SFU1605 diyor; keyfi -4 seçilmedi. Diğer SFU varyantlarında da tam ek yok. D/A/L/B/W/X/Q ve bilya çapı, eşleşmeyen tam varyanttan satış metnine aktarılmadı. Nominal çap/adım dışında kesin gövde değerleri eksik işaretlendi. Yamansa Ca/Coa yazılmadı.
- **SAC kesiti belirsiz.** ERSA SAC16 ile FYC SAC16-1000 kesit tabloları aynı değil; FYC bir tedarikçi, birebir Yamansa üretici kaynağı değil. Örneğin taban genişlikleri kataloglar arasında değişiyor. SAC40 için ERSA tablosu boş. Boyu ve çapı girdiden alındı; SBR araba ölçüleri destekli mile aktarılmadı.
- TBR16/20/25/30UU montaj ölçüleri, aynı model kodlarını yayımlayan üretici KOLMB/Ningbo Baoding tablosundan alındı. Yük ve ağırlık Yamansa'ya aktarılmadı.
- DSG16H/20H/25H/32H montaj geometrisi, eş kodlu Wangong tablosundan alındı. **DSG40H katalogları çelişkili** (H/h/L/C2/P); bu gövdeye nominal uyumlu mil çapı ve girdideki alüminyum dışında değer atanmadı. DSG bir gövdedir; bilya çapı/adım/Ca/Coa ona ait ölçüler değildir.
- Eksik teknik alanlar tire, boş kutu veya tahminle doldurulmadı. Yeni 56 kaydın 52 tanesinde, toplam 108 kaydın 78 tanesinde eksik bayrağı var. Ayrıntılar aşağıdadır.

## Dosyalar ve yeniden üretim

- Ürünler: `urunler.jsonl`; açıklamaların yeni ailede görünür uzunluğu 2598–3058 karakter.
- Ham değer/kaynak: `veri/aile2.json`; eski aile `veri/hg.json`, `hgr.json`, `pmi.json`.
- Yeni araçlar: `arac/aile2_veri.py`, `aile2_gorsel.py`, `aile2_hazirla.py`, `aile2_raporla.py`, `kontak.py`, `test_aile2.py`.
- Görsel seçimleri: `veri/aile2-gorsel-secimleri.json`; her seçimde kaynak URL, ham fotoğraf, seviye ve kesim bilgisi var.
- Bağlam/çizim: `veri/lineer-ctx.json`, `veri/draw-keys.json`, `veri/cizim.txt`.
- Yerel HTML dizini: `onizleme/index.html` (108 ürün). Modülsüz üründe boş/yanlış çizim bölümü gösterilmez.
- Önceki Aile 1 tesliminin raporu kaybolmadı: `veri/aile1-rapor.md`. Oradaki 52 ürünlük denetim çıktıları tarihsel teslimdir; güncel toplam çıktılar bu rapordadır.

```sh
python3 arac/veri_hazirla.py
python3 arac/aile2_veri.py
python3 arac/gorsel_sec.py
python3 arac/aile2_gorsel.py
OMP_NUM_THREADS=2 python3 arac/gorsel_hazirla.py
OMP_NUM_THREADS=2 python3 arac/gorsel_hazirla.py veri/aile2-gorsel-secimleri.json
python3 arac/aile_hazirla.py
/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node arac/ciz.js
python3 arac/kontak.py
python3 arac/onizle.py
python3 arac/denetle.py urunler.jsonl --aile
python3 -m unittest discover -s arac -p 'test_*.py'
python3 arac/raporla.py
```

## Kaynaklar

Nominal çap/boy ve ürün tipi: `parca/lineer_diger.jsonl.gz`. URL bulunmayan kesin girdi bilgisi ham veride `girdi:parca/...#kod` olarak açıkça gösterildi; uydurma kaynak URL yazılmadı. `teknik_kaynak` alanındaki yerel girdi referansı bir katalog bağlantısı değildir. Yalnız araştırma için bakılan, satış alanına değer aktarılmayan URL'ler ham kaydın `referans_kaynaklar` alanında tutulur.

- TBR resmi üretici: https://www.kolmb.com.cn/en/prd-20.html — yerel kopya `veri/tbr-resmi-sayfa.html`.
- DSG resmi üretici: https://www.wangong.net/product/coupling-nut-housing/bsg-dsg-series-aluminum-nut-housing.html — içerik dökümü `veri/dsg-resmi-tablo.txt`. Doğrudan HTTP 403 verdi, kamu içerik aracıyla tablo okundu.
- SFU resmi üretici (varyant referansı, satış gövde değeri değil): https://www.wfint.com.tw/Ball-Screw-SFU-Series-DIN69051/Ball-Screw-Factory.html — `veri/sfu-resmi-sayfa.html`, `veri/sfu-resmi-cizim.jpg`.
- SAC karşılaştırması: https://www.ersarulman.com/tr-TR/sac/3/15/97 ve https://fycrulman.com/wp-content/uploads/2021/09/katalog.pdf — `veri/fyc-lineer-katalog.pdf`, `veri/fyc-sayfa-5.txt`.
- DSG40 karşılaştırması: https://saivsautomatic.com/ball-screw/dsg-series-ball-nut-housing-178.html ve indekslenmiş Limon tablosu https://www.powerbelt.hu/uploads/source/Lintech/katalog/Limon_DSG.pdf (doğrudan PDF 404; canlı dosya doğrulanmış gibi sunulmadı).
- Orkapt kamu sitesi ve model aramalarında yeni aileye ait ürün özelinde teknik satır bulunamadı. Girdide tüm 56 `orka_site` alanı null. `ETAZON`, `ETAZON SFU somun katalog`, `ETAZON official linear ball screw` aramalarında resmi kaynak bulunamadı.

Eski ailenin resmi HG/PMI kaynakları ve yük/ağırlık sınırları `veri/aile1-rapor.md` içinde aynen korunmuştur.

## Kategoriler ve iç linkler

`veri/kategori-aile2.json` kategori kararlarını ve kamu URL kontrolünü saklar. KKM/İM için `site_kategoriler.txt` içindeki ortak kategori ve onun `/krom-kapli-` breadcrumb'ı doğrulandı. Ortak kategori adında krom geçmesi, İM ürününün ayrıca krom kaplı olduğuna ilişkin ürün iddiası değildir.

Diğer beş alt yol `site_kategoriler.txt` içinde yok; **katurl.txt içindeki URL adından LİNEER altında türetildi**, bu yüzden brief doğrultusunda `yeni_kategori:false`. Ancak bu beş kamu URL'si kontrol sırasında `/?c=1` ana sayfasına yönlendi; canlı kategori kimliği/breadcrumb doğrulanamadı. Yüklemeden önce bu kimliklerin teyidi gerekir. Bu adım yükleme içermez. Aynı URL'ler açıklamaya iç link yapılmadı; açıklamalarda yalnız katurl'da bulunan ve kamu sayfası açılan `krom-kapli-`, `sbr-serisi`, `lIneer`, `vidali-mil-uc-yatagi` kullanıldı (ürün başına iki link).

| Alt tip | Kategori | Dayanak |
|---|---|---|
| KKM | LİNEER>KROM KAPLI İNDÜKSİYONLU MİLLER | katurl: /krom-kapli-; mevcut yol |
| IM | LİNEER>KROM KAPLI İNDÜKSİYONLU MİLLER | katurl: /krom-kapli-; mevcut yol |
| SAC | LİNEER>ALT DESTEKLİ MİLLER | katurl: /alt-destekli-miller; URL adından türetildi, canlı kimlik teyidi gerekli |
| TBR | LİNEER>TBR SERİSİ | katurl: /tbr-serisi; URL adından türetildi, canlı kimlik teyidi gerekli |
| VM | LİNEER>VİDALI MİLLER | katurl: /vidali-miller; URL adından türetildi, canlı kimlik teyidi gerekli |
| SFU | LİNEER>BİLYALI SOMUNLAR | katurl: /bilyali-somunlar; URL adından türetildi, canlı kimlik teyidi gerekli |
| DSG | LİNEER>VİDALI MİL SOMUN GÖVDESİ | katurl: /vidali-mil-somun-govdesi; URL adından türetildi, canlı kimlik teyidi gerekli |

## Teknik etiket listeleri

Ölçü etiketleri `Etiket (Harf)` biçimindedir. Marka ve malzeme sayısal ölçü olmadığı için harf almaz. Eksik ölçü etiketi müşteri listesine boş olarak eklenmedi. TBR gövde harfleri, farklı çizim standardına dönüştürülmeden üreticinin harfleriyle korundu.

- **KKM**: `Mil Çapı (dr)`, `Boy (Lm)`; `Marka`.
- **IM**: `Mil Çapı (dr)`, `Boy (Lm)`; `Marka`.
- **SAC**: `Mil Çapı (d)`, `Boy (L)`; `Marka`.
- **TBR**: `Mil Çapı (d)`, `Gövde Ölçüsü (W)`, `Gövde Ölçüsü (G)`, `Gövde Ölçüsü (A)`, `Gövde Ölçüsü (L)`, `Gövde Ölçüsü (B)`, `Gövde Ölçüsü (D)`, `Gövde Ölçüsü (C)`, `Bağlantı Dişi (S1)`; `Marka`.
- **VM**: `Mil Çapı (d)`, `Vida Adımı (Ph)`, `Boy (L)`; `Marka`.
- **SFU**: `Mil Çapı (d)`, `Vida Adımı (Ph)`; `Marka`.
- **DSG**: `Uyumlu Mil Çapı (d)`, `Malzeme`, `Somun Yuva Çapı (D)`, `Gövde Genişliği (B)`, `Gövde Yüksekliği (H)`, `Eksen Yüksekliği (h)`, `Gövde Ölçüsü (E)`, `Gövde Uzunluğu (L)`, `Gövde Ölçüsü (C1)`, `Gövde Ölçüsü (C2)`, `Bağlantı Aralığı (P)`, `Bağlantı Dişi (X)`, `Bağlantı Aralığı (W)`, `Bağlantı Dişi (Y)`; `Marka`.

## Görseller ve görme kontrolü

Üst 100 px şablon bandı korunur, tuvalin kalanı saf beyazdan kurulur. Ürün 440×240 kutuya oranı korunarak sığdırılır; önceki gri şerit geri gelmedi. Yeni mil, destekli mil ve gri zeminli SFU2005 fotoğraflarında rembg isnet-general-use uygulandı; delik boşlukları korunur. Milin parlak yüzeyi gerçek kaynak pikselleriyle maskede korundu. Ürün yazısı/logo silinmedi. SFU2505 fotoğrafındaki ürün dışı model yazısı kadraj dışında tutuldu.

Yeni görüntüler birebir Yamansa/ETAZON stok varyantı olarak doğrulanmadığından **aynı tip** seviyesinde tutuldu. Mil fotoğrafı tek, dolu ve işlenmemiş düz mili; VM fotoğrafı somunsuz bilyalı vidalı mil yüzeyini; TBR açık flanşı; DSG alüminyum gövdeyi gösterir. SFU1605/2005/2505/3210 için altı delikli, 4010/5010 için sekiz delikli flanş görünüşü kullanıldı. Büyük iki SFU için aynı logosuz/kodsuz sekiz delikli gerçek fotoğraf kullanıldı; fotoğraf devre sayısı veya ölçü kanıtı sayılmaz. Kutu, kablo bağı, filigran, okunur farklı kod veya başka marka logosu gösteren adaylar seçilmedi. Bir kısım somundaki bilya tutma aktarım kovanı montaj yardımcısıdır; mil veya somun gövdesi değildir.

Seçilen her benzersiz kaynak fotoğraf açılarak incelendi. Bitmiş **56 görselin tümü** `onizleme/aile2-kontak.jpg` paftasında açılarak kontrol edildi. Yeni düz mil fotoğrafında ilk kontrolde görülen soluk zemin, tek milin arka planı ayrılarak giderildi. Son kontrol paftası ve tekil örnekler bu düzeltmeden sonradır.

- Aile 2: **birebir 0, ayni_tip 56**.
- Toplam: **birebir 14, ayni_tip 94**.

### Aile 1: ray üzerinde görünen arabalar

`onizleme/aile1-araba-kontrol.jpg` ile 16 araba yeniden gözden geçirildi. HGH45HA, HGW30CC, HGW45HC için raysız alternatif arandı. Bulunanlar farklı kod, rakip logo, filigran veya yanlış kısa/uzun gövde nedeniyle reddedildi. Mevcut fotoğraflar korunmuştur:

- **HGH45HA: rayla birlikte görünüyor.** Ürün yalnız arabadır.
- **HGW30CC: rayla birlikte görünüyor.** Ürün yalnız arabadır.
- **HGW45HC: rayla birlikte görünüyor.** Ürün yalnız arabadır.
- Ek kontrolde **HGW30HC: rayla birlikte görünüyor.** Ürün yalnız arabadır; aynı uzun flanş formunda kurala uygun raysız alternatif bulunamadı.

Ray dahil set olarak sunulmaz; araba adları/kategorileri değişmedi.

### Aile 2 ürün bazında görsel kaynağı

| Kod | Seviye | Fotoğraf |
|---|---|---|
| ETA VMS SFU2005 | ayni_tip | https://ir.ozone.ru/s3/multimedia-1-o/7358212608.jpg |
| ETA VMS SFU2505 | ayni_tip | https://basket-34.wbbasket.ru/vol7120/part712028/712028248/images/big/1.webp |
| ETA VMS SFU3210 | ayni_tip | https://ir.ozone.ru/s3/multimedia-1-6/7285258914.jpg |
| ORK ADM SAC164000 | ayni_tip | https://image.ec21.com/image/mytbearing/oimg_GC03624009_CA03624195/Shaft-Support-Rail.jpg |
| ORK ADM SAC204000 | ayni_tip | https://image.ec21.com/image/mytbearing/oimg_GC03624009_CA03624195/Shaft-Support-Rail.jpg |
| ORK ADM SAC253000 | ayni_tip | https://image.ec21.com/image/mytbearing/oimg_GC03624009_CA03624195/Shaft-Support-Rail.jpg |
| ORK ADM SAC254000 | ayni_tip | https://image.ec21.com/image/mytbearing/oimg_GC03624009_CA03624195/Shaft-Support-Rail.jpg |
| ORK ADM SAC303000 | ayni_tip | https://image.ec21.com/image/mytbearing/oimg_GC03624009_CA03624195/Shaft-Support-Rail.jpg |
| ORK ADM SAC304000 | ayni_tip | https://image.ec21.com/image/mytbearing/oimg_GC03624009_CA03624195/Shaft-Support-Rail.jpg |
| ORK ADM SAC404000 | ayni_tip | https://image.ec21.com/image/mytbearing/oimg_GC03624009_CA03624195/Shaft-Support-Rail.jpg |
| ORK İM 06 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK İM 08 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK İM 10 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK İM 12 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK İM 15 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK İM 16 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK İM 20 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK İM 25 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK İM 30 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK İM 35 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK İM 40 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK İM 45 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK İM 50 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK KKM 06 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK KKM 08 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK KKM 10 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK KKM 12 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK KKM 15 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK KKM 16 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK KKM 20 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK KKM 25 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK KKM 30 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK KKM 35 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK KKM 40 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK KKM 50 | ayni_tip | https://image.made-in-china.com/2f0j00eWqkFZzdcBcy/Custom-Precision-Hardened-Steel-Linear-Small-Shaft-Polishing-Stainless-Steel-Knurled-Shaft-Chrome-Hardness-Shaft.webp |
| ORK LR TBR16UU | ayni_tip | https://cdn.vseinstrumenti.ru/images/goods/stanki/promyshlennye-komponenty/8428893/1000x1000/164916649.jpg |
| ORK LR TBR20UU | ayni_tip | https://cdn.vseinstrumenti.ru/images/goods/stanki/promyshlennye-komponenty/8428893/1000x1000/164916649.jpg |
| ORK LR TBR25UU | ayni_tip | https://cdn.vseinstrumenti.ru/images/goods/stanki/promyshlennye-komponenty/8428893/1000x1000/164916649.jpg |
| ORK LR TBR30UU | ayni_tip | https://cdn.vseinstrumenti.ru/images/goods/stanki/promyshlennye-komponenty/8428893/1000x1000/164916649.jpg |
| ORK VM 1605 | ayni_tip | https://i0.wp.com/maedler.in/wp-content/uploads/2026/02/KGT_Spindel.jpg?resize=1536%2C1536&ssl=1 |
| ORK VM 2005 | ayni_tip | https://i0.wp.com/maedler.in/wp-content/uploads/2026/02/KGT_Spindel.jpg?resize=1536%2C1536&ssl=1 |
| ORK VM 2505 | ayni_tip | https://i0.wp.com/maedler.in/wp-content/uploads/2026/02/KGT_Spindel.jpg?resize=1536%2C1536&ssl=1 |
| ORK VM 3210 | ayni_tip | https://i0.wp.com/maedler.in/wp-content/uploads/2026/02/KGT_Spindel.jpg?resize=1536%2C1536&ssl=1 |
| ORK VM 4010 | ayni_tip | https://i0.wp.com/maedler.in/wp-content/uploads/2026/02/KGT_Spindel.jpg?resize=1536%2C1536&ssl=1 |
| ORK VM 5010 | ayni_tip | https://i0.wp.com/maedler.in/wp-content/uploads/2026/02/KGT_Spindel.jpg?resize=1536%2C1536&ssl=1 |
| ORK VMS SFU1605 | ayni_tip | https://ir.ozone.ru/s3/multimedia-1-0/6933370608.jpg |
| ORK VMS SFU2005 | ayni_tip | https://ir.ozone.ru/s3/multimedia-1-o/7358212608.jpg |
| ORK VMS SFU2505 | ayni_tip | https://basket-34.wbbasket.ru/vol7120/part712028/712028248/images/big/1.webp |
| ORK VMS SFU3210 | ayni_tip | https://ir.ozone.ru/s3/multimedia-1-6/7285258914.jpg |
| ORK VMS SFU4010 | ayni_tip | https://i.siteapi.org/p2I17-tB83_KVJFrAIijJRbz6fI=/0x57:869x726/fit-in/800x800/filters:format(jpg)/s.siteapi.org/a21e49453f8e970/img/l1e4rwqdutcw8484ow8wskws8oc4ws |
| ORK VMS SFU5010 | ayni_tip | https://i.siteapi.org/p2I17-tB83_KVJFrAIijJRbz6fI=/0x57:869x726/fit-in/800x800/filters:format(jpg)/s.siteapi.org/a21e49453f8e970/img/l1e4rwqdutcw8484ow8wskws8oc4ws |
| ORK VSG DSG16H | ayni_tip | https://ae-pic-a1.aliexpress-media.com/kf/S5d91ae0dfa7d4cdd8fbf5c1f6651e092A.jpg |
| ORK VSG DSG20H | ayni_tip | https://ae-pic-a1.aliexpress-media.com/kf/S5d91ae0dfa7d4cdd8fbf5c1f6651e092A.jpg |
| ORK VSG DSG25H | ayni_tip | https://ae-pic-a1.aliexpress-media.com/kf/S5d91ae0dfa7d4cdd8fbf5c1f6651e092A.jpg |
| ORK VSG DSG32H | ayni_tip | https://ae-pic-a1.aliexpress-media.com/kf/S5d91ae0dfa7d4cdd8fbf5c1f6651e092A.jpg |
| ORK VSG DSG40H | ayni_tip | https://ae-pic-a1.aliexpress-media.com/kf/S5d91ae0dfa7d4cdd8fbf5c1f6651e092A.jpg |

## Eksik bayraklı ürünler (toplam)

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
- **ETA VMS SFU2005**: eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: ETAZON resmi katalog veya üretici sayfası bulunamadı; başka markanın geometrisi kullanılmadı
- **ETA VMS SFU2505**: eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: ETAZON resmi katalog veya üretici sayfası bulunamadı; başka markanın geometrisi kullanılmadı
- **ETA VMS SFU3210**: eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: ETAZON resmi katalog veya üretici sayfası bulunamadı; başka markanın geometrisi kullanılmadı
- **ORK ADM SAC164000**: eksik: aynı SAC boyunda katalog kesitleri farklı; Yamansa kesit ve delik düzeni doğrulanmadı, SBR ölçüleri aktarılmadı
- **ORK ADM SAC204000**: eksik: aynı SAC boyunda katalog kesitleri farklı; Yamansa kesit ve delik düzeni doğrulanmadı, SBR ölçüleri aktarılmadı
- **ORK ADM SAC253000**: eksik: aynı SAC boyunda katalog kesitleri farklı; Yamansa kesit ve delik düzeni doğrulanmadı, SBR ölçüleri aktarılmadı
- **ORK ADM SAC254000**: eksik: aynı SAC boyunda katalog kesitleri farklı; Yamansa kesit ve delik düzeni doğrulanmadı, SBR ölçüleri aktarılmadı
- **ORK ADM SAC303000**: eksik: aynı SAC boyunda katalog kesitleri farklı; Yamansa kesit ve delik düzeni doğrulanmadı, SBR ölçüleri aktarılmadı
- **ORK ADM SAC304000**: eksik: aynı SAC boyunda katalog kesitleri farklı; Yamansa kesit ve delik düzeni doğrulanmadı, SBR ölçüleri aktarılmadı
- **ORK ADM SAC404000**: eksik: aynı SAC boyunda katalog kesitleri farklı; Yamansa kesit ve delik düzeni doğrulanmadı, SBR ölçüleri aktarılmadı
- **ORK İM 06**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı
- **ORK İM 08**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı
- **ORK İM 10**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı
- **ORK İM 12**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı
- **ORK İM 15**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı
- **ORK İM 16**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı
- **ORK İM 20**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı
- **ORK İM 25**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı
- **ORK İM 30**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı
- **ORK İM 35**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı
- **ORK İM 40**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı
- **ORK İM 45**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı
- **ORK İM 50**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı
- **ORK KKM 06**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı
- **ORK KKM 08**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı
- **ORK KKM 10**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı
- **ORK KKM 12**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı
- **ORK KKM 15**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı
- **ORK KKM 16**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı
- **ORK KKM 20**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı
- **ORK KKM 25**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı
- **ORK KKM 30**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı
- **ORK KKM 35**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı
- **ORK KKM 40**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı
- **ORK KKM 50**: eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı
- **ORK LR TBR16UU**: eksik: Yamansa yük ve ağırlık kanıtı yok; eş kodlu katalogdan yalnız montaj geometrisi kullanıldı
- **ORK LR TBR20UU**: eksik: Yamansa yük ve ağırlık kanıtı yok; eş kodlu katalogdan yalnız montaj geometrisi kullanıldı
- **ORK LR TBR25UU**: eksik: Yamansa yük ve ağırlık kanıtı yok; eş kodlu katalogdan yalnız montaj geometrisi kullanıldı
- **ORK LR TBR30UU**: eksik: Yamansa yük ve ağırlık kanıtı yok; eş kodlu katalogdan yalnız montaj geometrisi kullanıldı
- **ORK VM 1605**: eksik: hassasiyet, ön yük, malzeme, bilya çapı ve yük kapasitesi ürüne özgü kaynakla doğrulanmadı
- **ORK VM 2005**: eksik: hassasiyet, ön yük, malzeme, bilya çapı ve yük kapasitesi ürüne özgü kaynakla doğrulanmadı
- **ORK VM 2505**: eksik: hassasiyet, ön yük, malzeme, bilya çapı ve yük kapasitesi ürüne özgü kaynakla doğrulanmadı
- **ORK VM 3210**: eksik: hassasiyet, ön yük, malzeme, bilya çapı ve yük kapasitesi ürüne özgü kaynakla doğrulanmadı
- **ORK VM 4010**: eksik: hassasiyet, ön yük, malzeme, bilya çapı ve yük kapasitesi ürüne özgü kaynakla doğrulanmadı
- **ORK VM 5010**: eksik: hassasiyet, ön yük, malzeme, bilya çapı ve yük kapasitesi ürüne özgü kaynakla doğrulanmadı
- **ORK VMS SFU1605**: eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: Yamansa Ca/Coa ve bilya çapı kanıtı yok
- **ORK VMS SFU2005**: eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: Yamansa Ca/Coa ve bilya çapı kanıtı yok
- **ORK VMS SFU2505**: eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: Yamansa Ca/Coa ve bilya çapı kanıtı yok
- **ORK VMS SFU3210**: eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: Yamansa Ca/Coa ve bilya çapı kanıtı yok
- **ORK VMS SFU4010**: eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: Yamansa Ca/Coa ve bilya çapı kanıtı yok
- **ORK VMS SFU5010**: eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: Yamansa Ca/Coa ve bilya çapı kanıtı yok
- **ORK VSG DSG40H**: eksik: DSG40H için üretici katalogları arasında H/h/L/C2/P farkı var; kesit ölçüsü doğrulanana kadar aktarılmadı

## Çizim sonuçları (toplam)

Mevcut `arac/lineer.js` değiştirilmedi. 52 eski ürüne ek olarak 25 KKM/İM mil bağlamı mevcut `mil` alt tipiyle çizilir; `dr`, `Lm` anahtarları aranır. Boy kaldırıldığında null dönmesi de kontrol edilir. SAC/TBR/VM/SFU/DSG için yeni modül yazılmadı: 31 bağlam `cizim_modulu:null` taşır. Bu ailelerde genel lineer match=true olabilse de yanlış BK/BF veya SBR çizimi çağrılmaz; sonuç **modül yok / çağrılmadı** olarak ayrı kaydedilir. Bu, başarısız bir çizimi başarılı sayma değildir.

| Kod | match | Sonuç | Anahtarlar |
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
| ETA VMS SFU2005 | true | modül yok | uygulanmaz |
| ETA VMS SFU2505 | true | modül yok | uygulanmaz |
| ETA VMS SFU3210 | true | modül yok | uygulanmaz |
| ORK ADM SAC164000 | true | modül yok | uygulanmaz |
| ORK ADM SAC204000 | true | modül yok | uygulanmaz |
| ORK ADM SAC253000 | true | modül yok | uygulanmaz |
| ORK ADM SAC254000 | true | modül yok | uygulanmaz |
| ORK ADM SAC303000 | true | modül yok | uygulanmaz |
| ORK ADM SAC304000 | true | modül yok | uygulanmaz |
| ORK ADM SAC404000 | true | modül yok | uygulanmaz |
| ORK İM 06 | true | null değil | dr, Lm |
| ORK İM 08 | true | null değil | dr, Lm |
| ORK İM 10 | true | null değil | dr, Lm |
| ORK İM 12 | true | null değil | dr, Lm |
| ORK İM 15 | true | null değil | dr, Lm |
| ORK İM 16 | true | null değil | dr, Lm |
| ORK İM 20 | true | null değil | dr, Lm |
| ORK İM 25 | true | null değil | dr, Lm |
| ORK İM 30 | true | null değil | dr, Lm |
| ORK İM 35 | true | null değil | dr, Lm |
| ORK İM 40 | true | null değil | dr, Lm |
| ORK İM 45 | true | null değil | dr, Lm |
| ORK İM 50 | true | null değil | dr, Lm |
| ORK KKM 06 | true | null değil | dr, Lm |
| ORK KKM 08 | true | null değil | dr, Lm |
| ORK KKM 10 | true | null değil | dr, Lm |
| ORK KKM 12 | true | null değil | dr, Lm |
| ORK KKM 15 | true | null değil | dr, Lm |
| ORK KKM 16 | true | null değil | dr, Lm |
| ORK KKM 20 | true | null değil | dr, Lm |
| ORK KKM 25 | true | null değil | dr, Lm |
| ORK KKM 30 | true | null değil | dr, Lm |
| ORK KKM 35 | true | null değil | dr, Lm |
| ORK KKM 40 | true | null değil | dr, Lm |
| ORK KKM 50 | true | null değil | dr, Lm |
| ORK LR TBR16UU | true | modül yok | uygulanmaz |
| ORK LR TBR20UU | true | modül yok | uygulanmaz |
| ORK LR TBR25UU | true | modül yok | uygulanmaz |
| ORK LR TBR30UU | true | modül yok | uygulanmaz |
| ORK VM 1605 | true | modül yok | uygulanmaz |
| ORK VM 2005 | true | modül yok | uygulanmaz |
| ORK VM 2505 | true | modül yok | uygulanmaz |
| ORK VM 3210 | true | modül yok | uygulanmaz |
| ORK VM 4010 | true | modül yok | uygulanmaz |
| ORK VM 5010 | true | modül yok | uygulanmaz |
| ORK VMS SFU1605 | true | modül yok | uygulanmaz |
| ORK VMS SFU2005 | true | modül yok | uygulanmaz |
| ORK VMS SFU2505 | true | modül yok | uygulanmaz |
| ORK VMS SFU3210 | true | modül yok | uygulanmaz |
| ORK VMS SFU4010 | true | modül yok | uygulanmaz |
| ORK VMS SFU5010 | true | modül yok | uygulanmaz |
| ORK VSG DSG16H | true | modül yok | uygulanmaz |
| ORK VSG DSG20H | true | modül yok | uygulanmaz |
| ORK VSG DSG25H | true | modül yok | uygulanmaz |
| ORK VSG DSG32H | true | modül yok | uygulanmaz |
| ORK VSG DSG40H | true | modül yok | uygulanmaz |

## Denetim ve yerel önizleme

```text
$ python3 arac/denetle.py urunler.jsonl --aile
Denetlenen ürün: 108
SONUÇ: 0 hata
```

```text
$ python3 -m unittest discover -s arac -p 'test_*.py'
............
----------------------------------------------------------------------
Ran 12 tests in 0.998s

OK
```

```text
Çizim: 77 başarılı; 31 modül yok; eksik veri kontrolleri: null
HTML: 108 ürün; 1280/390 px taşma kontrolleri tamamlandı
```

Örnekler: `onizleme/ORK_KKM_20.png` ve `_mobil.png`, `onizleme/ORK__M_20.png` ve `_mobil.png`, `onizleme/ORK_ADM_SAC204000.png`, `onizleme/ORK_LR_TBR20UU.png`, `onizleme/ORK_VM_2505.png`, `onizleme/ORK_VMS_SFU3210.png`, `onizleme/ETA_VMS_SFU2005.png`, `onizleme/ORK_VSG_DSG40H.png`. İlgili HTML'ler aynı dizinde. Seçilmiş sayfaların görsel/ön yazı/çizim yüzeyi `onizleme/aile2-sayfa-kontrol.jpg` içinde açılarak kontrol edildi. Canlı mağaza entegrasyonu denenmedi.

Paket/Adet kuralı korunur: ileride GKT kaynak teli ürünleri adet olarak sunulacak, adlarında paket/koli ifadesi kullanılmayacak. Bu ailedeki 4 metre, 3 metre, 4000 mm ve 5700 mm değerleri paket değil ürün boyudur; adlarda tutulmuştur.
