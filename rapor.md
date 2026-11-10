# Lineer ve diğer ürünler: 208 kayıt, Aile 4 son teslim

- Girdi: 208 satır, 208 benzersiz kod; yinelenen girdi kodu: 0.
- Çıktı: 208 satır, 208 benzersiz kod; atlanan veya fazladan ürün yok.
- Aile 4: 22 BMT + 16 SSPHS/SSPOS + 3 GKT + 4 YKKM + 1 S060 = 46 ürün. Brief dışında kalan ek aile yok.
- Toplam görsel: 14 birebir, 194 aynı tip. Aile 4 görsellerinin tamamı aynı tip; kesin kod/boy fotoğrafı iddiası yok.
- Eksik bayraklı toplam 177 ürün; Aile 4 içinde 46 ürün. Eksik ölçüler/yükler doldurulmadı.
- Panel erişimi, mağazaya yükleme ve push yapılmadı. Bu paket yerel inceleme içindir; eksik bayrakları yayın öncesi onay gerektirir.
- Önceki teslim raporları: `veri/aile1-rapor.md`, `veri/aile2-rapor.md`, `veri/aile3-rapor.md`. Eski M532/534/536 diş sayısı kararını aşağıdaki düzeltme geçersiz kılar.

## Pinyon M532 / M534 / M536 düzeltmesi

| Kod | Kaynak tablo hücresi (hatalı) | B2B addaki z | m | Dp | Müşteriye verilen z |
|---|---:|---:|---:|---:|---:|
| ORK PD M532 | 31 | 32 | 5 | 160 | 32 |
| ORK PD M534 | 32 | 34 | 5 | 170 | 34 |
| ORK PD M536 | 33 | 36 | 5 | 180 | 36 |

Her üçünde m×z=Dp: 5×32=160, 5×34=170, 5×36=180 mm. Diş sayısı boyutsuzdur. Ham hatalı hücreler ve B2B adları korundu; kaynak düzeltmesi ham kayıtta `dis_sayisi_duzeltmesi` alanındadır. Ad/modül/Dp eşleşmezse sayı geri konmaz; bu olumsuz durum test kapsamındadır.

## Aile 4 kaynak kararları ve sınırlar

- **BMT:** CY/IA/NL ve SP kodları için üretici/aynı kod katalogları incelendi. New Ball ve Techprim bazı SP bilya çapı, yük ve yüksekliklerinde ayrışıyor; çelişkili değerler aktarılmadı. SP12B ve NL8H için doğrudan kendi kod sayfasındaki yük bilgisi verildi. Kod kaynağı bulunmayan varyantlarda yalnız adın kesin malzeme/montaj bilgisi kullanıldı.
- **SSPHS/SSPOS:** Finer/SDTZ paslanmaz katalog iç/dış diş tipini destekliyor, fakat istenen R son ekini tanımlamıyor. R=sağ diş bağı ve tam R varyantının ölçü/yük tablosu doğrulanamadı. 16 kodun R eki korundu; A ile değiştirilmedi, baz seri ölçüleri kopyalanmadı. 14 ve 18 ölçüleri bulunan tabloda yok. Müşteriye sağ diş iddiası veya tahmini ölçü yazılmadı.
- **GKT:** Gedik SG2 belgesi G3Si1 / ER70S-6 eşdeğerliğini, 0,8/1,0/1,2 mm çapları destekliyor. Yamansa parti kimyası, mekanik deney değerleri ve makara ölçüleri aktarılmadı. Adlarda paket miktarı yok; teknik listede `Satış Birimi: Adet`, `Ambalaj: 15 kg/paket` var. Açıklama paket halinde satıldığı iddiasını içermiyor.
- **YKKM:** Tam kodlu güvenilir teknik kaynak bulunamadı. Yalnız girdi adlarındaki 800/1000/1500/2000 kg kapasite yayınlandı; voltaj, güç, hız, kremayer modülü, uzaktan kumanda, çalışma oranı ve dişli bilgisi verilmedi.
- **S060 ve D/L tuzağı:** CTL 250 resmi tablo PDF’sinde CTL250-60 için d=60, D=90; bu kaynakta 60×90 dış çaplı d×D ölçüsüdür. Sitedeki S040 alanı d/D derken ek JPEG aynı 40×65 adını d/L diye etiketliyor. Bu JPEG çelişkisi göz ardı edilmedi: üretici tablosundaki 38/40/42/45/48/50 çiftleri site adlarıyla d×D olarak eşleşiyor; 65/75/80 değerleri üreticinin L değerleri değil. Bu nedenle müşteri alanında `İç Çap (d): 60 mm`, `Dış Çap (D): 90 mm` kullanıldı; 90 mm boy denmedi. Site JPEG’i `veri/aile4-s040-ek.jpeg` içinde saklandı. L/L1, vida, tork ve yük verileri aktarılmadı. S040 ürün fotoğrafı kodsuz aynı tip kaynak olarak kullanıldı; S060’a birebir fotoğraf denmedi.

## Kategori kararları

| Aile | Yol | Yeni kategori | Ek kategori |
|---|---|---|---|
| BMT | BİLYALI MASAÜSTÜ TAŞIYICILAR | True | Yok |
| PM | RULMAN>MAFSAL RULMANLARI | False | Yok |
| GKT | KAYNAK SARF MALZEMELERİ>GAZALTI KAYNAK TELLERİ | True | Yok |
| YKKM | KAPI OTOMASYONU>YANA KAYAR KAPI MOTORLARI | True | Yok |
| KK | KONİK KİLİTLER>S TİPİ (250 TİPİ) KONİK KİLİTLER | False | Yok |

BMT, kaynak sarf ve kapı otomasyonu için mevcut uygun yol bulunmadığından öneri yeni kategori olarak işaretlendi. Alakasız bir ek kategori atanmadı. PM mevcut RULMAN>MAFSAL RULMANLARI yolunda, S060 istenen mevcut S tipi (250 tipi) yolundadır.

Önceki SAC/TBR/VM/SFU/DSG düzeltmesi korunur: katurl'da URL var ama sayfa ana sayfaya yönleniyor; kategori boş/pasif olabilir, kullanıcı onaylayacak. 31 kayıtta `yeni_kategori:true`, `EK_KATEGORILER:["LİNEER"]` vardır.

## Teknik etiketler ve çizim politikası

Aile 4 için yeni çizim modülü yazılmadı; 46 bağlamın tamamında `cizim_modulu:null`, sonuç `modül yok`, `keys:[]`, `cagrildi:false`. Etiketler ön yazı ve doğrudan ul/li/strong teknik listesinde aynıdır; Marka ayrıca eklenir.

| Alt aile | Kullanılan etiketler |
|---|---|
| BMT | Ölçü (Dp); Gövde Tipi; Ana Bilya Çapı (Dw); Montaj Tipi; Bilya Malzemesi; Önerilen Yük Kapasitesi; Yük Kapasitesi; Malzeme; Gövde Çapı (D); Ölçü (h); Toplam Yükseklik (H); Flanş Çapı (D1); Ölçü (b); Ana Bilya Malzemesi |
| PM | Malzeme; Diş Tipi |
| GKT | Tel Çapı (d); Tel Sınıfı; Standart Sınıf Eşdeğerliği; Satış Birimi; Ambalaj |
| YKKM | Kapı Ağırlığı Kapasitesi |
| KK | İç Çap (d); Dış Çap (D); Tip |

## Görsel ve sayfa kontrolü

- `onizleme/aile4-kontak.jpg`: 46 son ürün görseli açılarak kontrol edildi.
- `onizleme/aile4-kaynak-kontrol.jpg`: seçili kaynak fotoğraflar açılarak kontrol edildi; farklı montajlı, logolu/kodlu ve uygun olmayan adaylar kullanılmadı.
- `onizleme/aile4-sayfa-kontrol.jpg`: altı mobil sayfanın gerçek Chromium ekran görüntülerinden kontrol levhası.
- Tam masaüstü/mobil örnekler: `onizleme/ORK_BMT_SP12AFL.png`, `ORK_BMT_NL8H.png`, `ORK_PM_SSPHS06R.png`, `ORK_GKT_MG208.png`, `ORK_YKKM_800.png`, `ORK_KK_S060.png` ve aynı dizindeki `_mobil.png` karşılıkları. `onizleme/index.html` tüm 208 ürünü açar.
- SAC düzeltme kanıtı korunur: `onizleme/sac-yeni-kontrol.jpg`. HGH45HA, HGW30CC, HGW45HC, HGW30HC: rayla birlikte görünüyor; önceki kaynak/alternatif sınırı değişmedi.
- Yalnız üst 100 px Yamansa bandı korunur; kalan 500×500 tuval saf beyazdan kurulur. Ürün oranı korunarak 440×240 alana yerleşir. Fotoğraf içindeki gölge/metal yansıması fiziksel yüzeydir; eski şablon paneli değildir.
- Kullanılmayan yeni araştırma adayları teslimden ayrıldı: `/home/ubuntu/lineer-diger-aile4-arastirma`. Seçili ham/işlenmiş dosyalar ve gerekli arama manifestleri `veri/` içinde kalır.

## Denetim çıktıları

```text
Girdi: 208 satır; 208 benzersiz kod; yinelenen kod: 0
Çıktı: 208 satır; 208 benzersiz kod; yinelenen kod: 0
Denetlenen ürün: 208
SONUÇ: 0 hata
```

```text
......................
----------------------------------------------------------------------
Ran 22 tests in 3.606s

OK
```

```text
Çizim: 77 başarılı; 131 modül yok; eksik veri kontrolleri: null
HTML: 208 ürün; 1280/390 px taşma kontrolleri tamamlandı
```

İlk denetimde standart adındaki nokta sayısal ondalık kontrolüne takıldı; müşteri adlandırması kaynakla uyumlu AWS ER70S-6 olarak sadeleştirildi. Yeni diş sayısı düzeltmesindeki yanlış mm birimi testte yakalanıp kaldırıldı; 208 kapsamına geçen eski test fikstürüne Aile 4 ham dosyası eklendi. Yukarıdaki sonuçlar bu düzeltmelerden sonradır.
Node PATH üzerinde tanımlı olmadığından ortam kontrol edildi: Python bağımlılıkları yüklü, nvm Node v24.22.2 mevcut. Çizim kontrolü kurulu `/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node` ile yapıldı; bağımlılık veya ortak ortam ayarı değiştirilmedi.

## Yeniden üretim

```sh
python3 arac/aile3_veri.py
python3 arac/aile4_veri.py
python3 arac/aile4_gorsel.py
python3 arac/gorsel_hazirla.py veri/aile4-gorsel-secimleri.json
python3 arac/aile_hazirla.py
/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node arac/ciz.js
python3 arac/kontak.py
python3 arac/onizle.py
python3 arac/denetle.py urunler.jsonl --aile
python3 -m unittest discover -s arac -p 'test_*.py'
git diff --check
```

## Teknik kaynak URL’leri (tüm teslim)

- https://file.gedik.com.tr/portal/approval_documents/geka-sg-2-tr_6278a8d8217cb.pdf?v=1652074703
- https://hiwin.com/wp-content/uploads/2026/08/HIWIN-Linear-Guideway-Catalog-1.pdf
- https://orkapt.com/service/kremayer-raylar/
- https://orkapt.com/service/motor-kizaklari/
- https://orkapt.com/service/pinyon-disliler-modul-dislilermodul-4/
- https://orkapt.com/service/pinyon-disliler-modul-dislilermodul-5/
- https://orkapt.com/service/pinyon-disliler-modul-dislilermodul-5/#Dp=m×z
- https://www.en.techprim.pl/offer/ball-transfer-units-omni-wheels-rack-multi-directional-transfer-units/ball-transfer-units-series-ef/ball-transfer-units-with-solid-body-and-flange/
- https://www.finerpt.com/site/DefaultSite/filesystem/documents/Finer%20Catalogue%20Files/Bearings%20-%20Rod%20Ends/Stainless%20Steel%20Rod%20Ends/SS%20Rod%20Ends.pdf
- https://www.kolmb.com.cn/en/prd-20.html
- https://www.konikkilit.com/_ekler/122-1583389614-ctl-250-tablo.pdf
- https://www.newball.it/en/prodotto/sp12b/
- https://www.newball.it/en/prodotto/sp15b/
- https://www.newball.it/en/prodotto/sp15c/
- https://www.newball.it/en/prodotto/sp22b/
- https://www.newball.it/en/prodotto/sp30b/
- https://www.newball.it/en/prodotto/sp45b/
- https://www.pmi-amt.com/en/supports/7Z/2022MD09%E8%8B%B1%E6%96%87%28%E8%B7%A8%E9%A0%81P159-300%29%20%282%29.pdf
- https://www.slidingbearings.com/Product/1896301434.html
- https://www.slidingbearings.com/Product/4967821313.html
- https://www.slidingbearings.com/Product/5147985851.html
- https://www.transferunits.com/product/NL-8H-Drop-in-Plastic-Nylon-Ball-Roller.html
- https://www.wangong.net/product/coupling-nut-housing/bsg-dsg-series-aluminum-nut-housing.html
- https://www.yamansarulman.com/konik-kilit-250-s-tipi-04065-17617

B2B adından alınan kesin bilgiler için kaynak izi `parca/lineer_diger.jsonl.gz` ve `veri/*.json` içindedir; hesaplar ayrıca etiketlenir. Müşteri alanlarına kaynak domaini veya rakip marka adı eklenmedi.

## Aile 4 fotoğraf kaynakları

| Ürün kodları | Seviye | URL |
|---|---|---|
| ORK BMT CY16B2 | aynı tip | https://st.aestatic.net/items-img-20/R/J/4/2/Adeb7aa44e91740dcb201e46dffa43a05E.jpeg_960x960.jpg |
| ORK BMT CY25A | aynı tip | https://sc04.alicdn.com/kf/H061d3526242d4157bb1e2e8110e768f0Z/CY-25A-Stainless-Steel-Heavy-Duty-Ball-Transfer-Unit-for-Ball-Transfer-Table-Conveyor-System.jpg |
| ORK BMT IA19, ORK BMT IA25 | aynı tip | https://image.made-in-china.com/2f0j00FEavclUCrmbn/Ia-Series-Ball-Transfer-Unit-with-Carbon-Steel-Balls.jpg |
| ORK BMT NL8H | aynı tip | https://sc04.alicdn.com/kf/Hf66d8328bc6249bd9d038726e3331e7c0.jpg |
| ORK BMT SP12AFL, ORK BMT SP15AFL | aynı tip | https://image.made-in-china.com/2f0j00bKoewLfqEhkQ/Flanged-Universal-Steel-Ball-Transfer-Unit-for-Conveyor-System.webp |
| ORK BMT SP12B | aynı tip | https://ir.ozone.ru/s3/multimedia-1-o/8658196080.jpg |
| ORK BMT SP12BF, ORK BMT SP15B, ORK BMT SP25B | aynı tip | https://static.chipdip.ru/lib2/a/261/DOC069261814.jpg |
| ORK BMT SP15A, ORK BMT SP15C, ORK BMT SP22B, ORK BMT SP22C, ORK BMT SP30B, ORK BMT SP30C, ORK BMT SP45B, ORK BMT SP60B | aynı tip | https://image.made-in-china.com/2f0j00TVnkaYpqJIbe/Sp60-Sp-60-Heavy-Load-Conveyor-Ball-Caster-Transfer-Unit-Bearing.jpg |
| ORK BMT SP15P, ORK BMT SP22P, ORK BMT SP30P | aynı tip | https://sc03.alicdn.com/kf/H27d01c7feb2f4888bf4e64f71135cd388.jpg |
| ORK GKT MG208, ORK GKT MG210, ORK GKT MG212 | aynı tip | https://a.allegroimg.com/original/255da0/dbc840424714898796e37cc0e54e/Drut-spawalniczy-do-MIG-MAG-spawarka-migomat-SG2-0-8mm-5kg |
| ORK KK S060 | aynı tip | https://static.ticimax.cloud/79038/uploads/urunresimleri/buyuk/konik-kilit-250-s-tipi-04065-64b-4d.png |
| ORK PM SSPHS06R, ORK PM SSPHS08R, ORK PM SSPHS10R, ORK PM SSPHS12R, ORK PM SSPHS14R, ORK PM SSPHS16R, ORK PM SSPHS18R, ORK PM SSPHS20R | aynı tip | https://static.chipdip.ru/lib/576/DOC045576733.jpg |
| ORK PM SSPOS06R, ORK PM SSPOS08R, ORK PM SSPOS10R, ORK PM SSPOS12R, ORK PM SSPOS14R, ORK PM SSPOS16R, ORK PM SSPOS18R, ORK PM SSPOS20R | aynı tip | https://syzrodends.com/wp-content/uploads/2023/11/High-Misalignment-Stainless-Rod-End.jpg |
| ORK YKKM 1000, ORK YKKM 1500, ORK YKKM 2000, ORK YKKM 800 | aynı tip | https://sc04.alicdn.com/kf/H8e197a95329a4d72bbb5bbbc85f1cc91N/Gate-Automation-AC-220V-800KG-Capacity-Sliding-Gate-Opener-Kit.jpg |

## Eksik ürünlerin tamamı

| Kod | Gerekçe |
|---|---|
| ORK LA HGH20HA | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LA HGH25HA | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LA HGH30HA | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LA HGH35HA | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LA HGH45HA | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LA HGW15CC | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LA HGW20CC | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LA HGW20HC | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LA HGW25CC | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LA HGW25HC | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LA HGW30CC | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LA HGW30HC | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LA HGW35CC | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LA HGW35HC | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LA HGW45CC | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LA HGW45HC | eksik: Yamansa dinamik/statik yük kapasitesi ve araba ağırlığı için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LR HGR15 | eksik: Yamansa ray ağırlığı (kg/m) için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LR HGR20 | eksik: Yamansa ray ağırlığı (kg/m) için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LR HGR25 | eksik: Yamansa ray ağırlığı (kg/m) için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LR HGR30 | eksik: Yamansa ray ağırlığı (kg/m) için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LR HGR35 | eksik: Yamansa ray ağırlığı (kg/m) için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| ORK LR HGR45 | eksik: Yamansa ray ağırlığı (kg/m) için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı |
| PMI MSA15SZZ | eksik: ZZ metal sıyırıcılı varyantın ayrı ağırlığı resmi tabloda yok; standart gövde ağırlığı satış metnine aktarılmadı |
| PMI MSA25SZZ | eksik: ZZ metal sıyırıcılı varyantın ayrı ağırlığı resmi tabloda yok; standart gövde ağırlığı satış metnine aktarılmadı |
| PMI MSA30EZZ | eksik: ZZ metal sıyırıcılı varyantın ayrı ağırlığı resmi tabloda yok; standart gövde ağırlığı satış metnine aktarılmadı |
| PMI MSA35SZZ | eksik: ZZ metal sıyırıcılı varyantın ayrı ağırlığı resmi tabloda yok; standart gövde ağırlığı satış metnine aktarılmadı |
| ETA VMS SFU2005 | eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: ETAZON resmi katalog veya üretici sayfası bulunamadı; başka markanın geometrisi kullanılmadı |
| ETA VMS SFU2505 | eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: ETAZON resmi katalog veya üretici sayfası bulunamadı; başka markanın geometrisi kullanılmadı |
| ETA VMS SFU3210 | eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: ETAZON resmi katalog veya üretici sayfası bulunamadı; başka markanın geometrisi kullanılmadı |
| ORK ADM SAC164000 | eksik: aynı SAC boyunda katalog kesitleri farklı; Yamansa kesit ve delik düzeni doğrulanmadı, SBR ölçüleri aktarılmadı |
| ORK ADM SAC204000 | eksik: aynı SAC boyunda katalog kesitleri farklı; Yamansa kesit ve delik düzeni doğrulanmadı, SBR ölçüleri aktarılmadı |
| ORK ADM SAC253000 | eksik: aynı SAC boyunda katalog kesitleri farklı; Yamansa kesit ve delik düzeni doğrulanmadı, SBR ölçüleri aktarılmadı |
| ORK ADM SAC254000 | eksik: aynı SAC boyunda katalog kesitleri farklı; Yamansa kesit ve delik düzeni doğrulanmadı, SBR ölçüleri aktarılmadı |
| ORK ADM SAC303000 | eksik: aynı SAC boyunda katalog kesitleri farklı; Yamansa kesit ve delik düzeni doğrulanmadı, SBR ölçüleri aktarılmadı |
| ORK ADM SAC304000 | eksik: aynı SAC boyunda katalog kesitleri farklı; Yamansa kesit ve delik düzeni doğrulanmadı, SBR ölçüleri aktarılmadı |
| ORK ADM SAC404000 | eksik: aynı SAC boyunda katalog kesitleri farklı; Yamansa kesit ve delik düzeni doğrulanmadı, SBR ölçüleri aktarılmadı |
| ORK İM 06 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı |
| ORK İM 08 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı |
| ORK İM 10 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı |
| ORK İM 12 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı |
| ORK İM 15 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı |
| ORK İM 16 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı |
| ORK İM 20 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı |
| ORK İM 25 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı |
| ORK İM 30 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı |
| ORK İM 35 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı |
| ORK İM 40 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı |
| ORK İM 45 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı |
| ORK İM 50 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: krom kaplama uygulanıp uygulanmadığı doğrulanmadı |
| ORK KKM 06 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı |
| ORK KKM 08 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı |
| ORK KKM 10 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı |
| ORK KKM 12 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı |
| ORK KKM 15 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı |
| ORK KKM 16 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı |
| ORK KKM 20 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı |
| ORK KKM 25 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı |
| ORK KKM 30 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı |
| ORK KKM 35 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı |
| ORK KKM 40 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı |
| ORK KKM 50 | eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı; eksik: ilave indüksiyon işlemi doğrulanmadı |
| ORK LR TBR16UU | eksik: Yamansa yük ve ağırlık kanıtı yok; eş kodlu katalogdan yalnız montaj geometrisi kullanıldı |
| ORK LR TBR20UU | eksik: Yamansa yük ve ağırlık kanıtı yok; eş kodlu katalogdan yalnız montaj geometrisi kullanıldı |
| ORK LR TBR25UU | eksik: Yamansa yük ve ağırlık kanıtı yok; eş kodlu katalogdan yalnız montaj geometrisi kullanıldı |
| ORK LR TBR30UU | eksik: Yamansa yük ve ağırlık kanıtı yok; eş kodlu katalogdan yalnız montaj geometrisi kullanıldı |
| ORK VM 1605 | eksik: hassasiyet, ön yük, malzeme, bilya çapı ve yük kapasitesi ürüne özgü kaynakla doğrulanmadı |
| ORK VM 2005 | eksik: hassasiyet, ön yük, malzeme, bilya çapı ve yük kapasitesi ürüne özgü kaynakla doğrulanmadı |
| ORK VM 2505 | eksik: hassasiyet, ön yük, malzeme, bilya çapı ve yük kapasitesi ürüne özgü kaynakla doğrulanmadı |
| ORK VM 3210 | eksik: hassasiyet, ön yük, malzeme, bilya çapı ve yük kapasitesi ürüne özgü kaynakla doğrulanmadı |
| ORK VM 4010 | eksik: hassasiyet, ön yük, malzeme, bilya çapı ve yük kapasitesi ürüne özgü kaynakla doğrulanmadı |
| ORK VM 5010 | eksik: hassasiyet, ön yük, malzeme, bilya çapı ve yük kapasitesi ürüne özgü kaynakla doğrulanmadı |
| ORK VMS SFU1605 | eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: Yamansa Ca/Coa ve bilya çapı kanıtı yok |
| ORK VMS SFU2005 | eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: Yamansa Ca/Coa ve bilya çapı kanıtı yok |
| ORK VMS SFU2505 | eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: Yamansa Ca/Coa ve bilya çapı kanıtı yok |
| ORK VMS SFU3210 | eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: Yamansa Ca/Coa ve bilya çapı kanıtı yok |
| ORK VMS SFU4010 | eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: Yamansa Ca/Coa ve bilya çapı kanıtı yok |
| ORK VMS SFU5010 | eksik: sirkülasyon eki ve tam gövde ölçüleri belirtilmemiş; -3/-4 varyantı seçilmedi, başka varyantın L ve yükleri aktarılmadı; eksik: Yamansa Ca/Coa ve bilya çapı kanıtı yok |
| ORK VSG DSG40H | eksik: DSG40H için üretici katalogları arasında H/h/L/C2/P farkı var; kesit ölçüsü doğrulanana kadar aktarılmadı |
| ORK KR M320201000 | eksik: canlı kremayer tablosunda tam kod yok; diş sayısı, malzeme, hp/he/hs ve bağlantı delikleri aktarılmadı |
| ORK KR M550503000 | eksik: canlı kremayer tablosunda tam kod yok; diş sayısı, malzeme, hp/he/hs ve bağlantı delikleri aktarılmadı |
| ORK KRKA M410053010 | eksik: canlı kremayer tablosunda tam kod yok; diş sayısı, malzeme, hp/he/hs ve bağlantı delikleri aktarılmadı; eksik: KRKA kapı altı koduna özel üretici fotoğrafı/diş geometrisi bulunamadı; düz kremayer sınıflaması aynı tip kapı kremayeri görünüşüne dayanır; eksik: girdide satış birimi boş; birim varsayılmadı |
| ORK KRKA M410053012 | eksik: canlı kremayer tablosunda tam kod yok; diş sayısı, malzeme, hp/he/hs ve bağlantı delikleri aktarılmadı; eksik: KRKA kapı altı koduna özel üretici fotoğrafı/diş geometrisi bulunamadı; düz kremayer sınıflaması aynı tip kapı kremayeri görünüşüne dayanır; eksik: girdide satış birimi boş; birim varsayılmadı |
| ORK KRKA M41005308 | eksik: ürün adında kesit ve boy ölçüsü yok; kod rakamlarından ölçü türetilmedi; eksik: canlı kremayer tablosunda tam kod yok; diş sayısı, malzeme, hp/he/hs ve bağlantı delikleri aktarılmadı; eksik: KRKA kapı altı koduna özel üretici fotoğrafı/diş geometrisi bulunamadı; düz kremayer sınıflaması aynı tip kapı kremayeri görünüşüne dayanır; eksik: girdide satış birimi boş; birim varsayılmadı |
| ORK KRKA M422222010 | eksik: canlı kremayer tablosunda tam kod yok; diş sayısı, malzeme, hp/he/hs ve bağlantı delikleri aktarılmadı; eksik: KRKA kapı altı koduna özel üretici fotoğrafı/diş geometrisi bulunamadı; düz kremayer sınıflaması aynı tip kapı kremayeri görünüşüne dayanır |
| ORK MKİ 210 | eksik: kaynak motor-teknik.png, motor kızağı yerine ilgisiz araç çizimi; A…S harflerine ölçü anlamı atanmadı, sadece tablo değerleri kullanıldı |
| ORK MKİ 260 | eksik: kaynak motor-teknik.png, motor kızağı yerine ilgisiz araç çizimi; A…S harflerine ölçü anlamı atanmadı, sadece tablo değerleri kullanıldı |
| ORK MKİ 280 | eksik: kaynak motor-teknik.png, motor kızağı yerine ilgisiz araç çizimi; A…S harflerine ölçü anlamı atanmadı, sadece tablo değerleri kullanıldı |
| ORK MKİ 330 | eksik: kaynak motor-teknik.png, motor kızağı yerine ilgisiz araç çizimi; A…S harflerine ölçü anlamı atanmadı, sadece tablo değerleri kullanıldı |
| ORK MKİ 380 | eksik: kaynak motor-teknik.png, motor kızağı yerine ilgisiz araç çizimi; A…S harflerine ölçü anlamı atanmadı, sadece tablo değerleri kullanıldı |
| ORK MKİ 430 | eksik: kaynak motor-teknik.png, motor kızağı yerine ilgisiz araç çizimi; A…S harflerine ölçü anlamı atanmadı, sadece tablo değerleri kullanıldı |
| ORK MKİ 500 | eksik: kaynak motor-teknik.png, motor kızağı yerine ilgisiz araç çizimi; A…S harflerine ölçü anlamı atanmadı, sadece tablo değerleri kullanıldı |
| ORK PD M416 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M417 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M418 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M419 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M421 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M423 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M424 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M426 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M427 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M428 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M429 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M431 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M432 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M433 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M434 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M435 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M436 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M437 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M438 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M439 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M440 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M441 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M442 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M443 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M444 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M445 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M446 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M447 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M448 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M449 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M450 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M520 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M522 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M524 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M526 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M528 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M530 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M532 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M534 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK PD M536 | eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı |
| ORK BMT CY16B2 | eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT CY25A | eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT IA19 | eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT IA25 | eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT NL8H | eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP12AFL | eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP12B | eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP12BF | eksik: girdi kodu SP12BF fakat adı SP12B flanşlı; flanşsız SP12B katalog ölçüleri bu varyanta aktarılmadı; eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP15A | eksik: ölçüler tam kodlu Techprim SP tablosundan; yük ve malzeme kalitesi için Yamansa varyant teyidi yok, aktarılmadı; eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP15AFL | eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP15B | eksik: aynı kodda New Ball ve Techprim bilya çapı/yük değerleri farklı; çelişen değerler ve yuvarlaması farklı H/h/b hücreleri aktarılmadı, ortak geometrik ölçüler korundu; eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP15C | eksik: aynı kodda New Ball ve Techprim bilya çapı/yük değerleri farklı; çelişen değerler ve yuvarlaması farklı H/h/b hücreleri aktarılmadı, ortak geometrik ölçüler korundu; eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP15P | eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP22B | eksik: aynı kodda New Ball ve Techprim bilya çapı/yük değerleri farklı; çelişen değerler ve yuvarlaması farklı H/h/b hücreleri aktarılmadı, ortak geometrik ölçüler korundu; eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP22C | eksik: ölçüler tam kodlu Techprim SP tablosundan; yük ve malzeme kalitesi için Yamansa varyant teyidi yok, aktarılmadı; eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP22P | eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP25B | eksik: ölçüler tam kodlu Techprim SP tablosundan; yük ve malzeme kalitesi için Yamansa varyant teyidi yok, aktarılmadı; eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP30B | eksik: aynı kodda New Ball ve Techprim bilya çapı/yük değerleri farklı; çelişen değerler ve yuvarlaması farklı H/h/b hücreleri aktarılmadı, ortak geometrik ölçüler korundu; eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP30C | eksik: ölçüler tam kodlu Techprim SP tablosundan; yük ve malzeme kalitesi için Yamansa varyant teyidi yok, aktarılmadı; eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP30P | eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP45B | eksik: aynı kodda New Ball ve Techprim bilya çapı/yük değerleri farklı; çelişen değerler ve yuvarlaması farklı H/h/b hücreleri aktarılmadı, ortak geometrik ölçüler korundu; eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK BMT SP60B | eksik: ölçüler tam kodlu Techprim SP tablosundan; yük ve malzeme kalitesi için Yamansa varyant teyidi yok, aktarılmadı; eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı |
| ORK GKT MG208 | eksik: SG2 sınıf eşdeğerliği Gedik teknik föyünden; Yamansa parti sertifikası, akım aralığı ve kimyasal/mekanik değerleri yok, aktarılmadı |
| ORK GKT MG210 | eksik: SG2 sınıf eşdeğerliği Gedik teknik föyünden; Yamansa parti sertifikası, akım aralığı ve kimyasal/mekanik değerleri yok, aktarılmadı |
| ORK GKT MG212 | eksik: SG2 sınıf eşdeğerliği Gedik teknik föyünden; Yamansa parti sertifikası, akım aralığı ve kimyasal/mekanik değerleri yok, aktarılmadı |
| ORK KK S060 | eksik: site S040 metni 40×65 için d×D, ek JPEG ise aynı 65 değerini L diye adlandırıyor; 250 üretici tablosunda 38/40/42/45/48/50 modelleri site adlarıyla d×D olarak eşleşiyor ve CTL250-60 satırı d=60 D=90 veriyor; bu nedenle 60×90 d×D alındı, çelişkili site L etiketi kullanılmadı; diğer boylar ve Yamansa tork/yük değerleri aktarılmadı |
| ORK PM SSPHS06R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi |
| ORK PM SSPHS08R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi |
| ORK PM SSPHS10R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi |
| ORK PM SSPHS12R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi |
| ORK PM SSPHS14R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi; eksik: bulunan paslanmaz seri tablosunda 14/18 satırı da yok; ara ölçü hesaplanmadı |
| ORK PM SSPHS16R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi |
| ORK PM SSPHS18R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi; eksik: bulunan paslanmaz seri tablosunda 14/18 satırı da yok; ara ölçü hesaplanmadı |
| ORK PM SSPHS20R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi |
| ORK PM SSPOS06R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi |
| ORK PM SSPOS08R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi |
| ORK PM SSPOS10R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi |
| ORK PM SSPOS12R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi |
| ORK PM SSPOS14R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi; eksik: bulunan paslanmaz seri tablosunda 14/18 satırı da yok; ara ölçü hesaplanmadı |
| ORK PM SSPOS16R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi |
| ORK PM SSPOS18R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi; eksik: bulunan paslanmaz seri tablosunda 14/18 satırı da yok; ara ölçü hesaplanmadı |
| ORK PM SSPOS20R | eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi |
| ORK YKKM 1000 | eksik: tam kodlu üretici kaynağı bulunamadı; voltaj, güç, hız, modül, kumanda, görev çevrimi ve dişli verileri yazılmadı |
| ORK YKKM 1500 | eksik: tam kodlu üretici kaynağı bulunamadı; voltaj, güç, hız, modül, kumanda, görev çevrimi ve dişli verileri yazılmadı |
| ORK YKKM 2000 | eksik: tam kodlu üretici kaynağı bulunamadı; voltaj, güç, hız, modül, kumanda, görev çevrimi ve dişli verileri yazılmadı |
| ORK YKKM 800 | eksik: tam kodlu üretici kaynağı bulunamadı; voltaj, güç, hız, modül, kumanda, görev çevrimi ve dişli verileri yazılmadı |

## 208 ürün çizim sonuçları

| Kod | Sonuç | keys | draw çağrıldı |
|---|---|---|---|
| ORK LA HGH20HA | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LA HGH25HA | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LA HGH30HA | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LA HGH35HA | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LA HGH45HA | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LA HGW15CC | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LA HGW20CC | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LA HGW20HC | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LA HGW25CC | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LA HGW25HC | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LA HGW30CC | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LA HGW30HC | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LA HGW35CC | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LA HGW35HC | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LA HGW45CC | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LA HGW45HC | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ORK LR HGR15 | null değil | WR, HR, P | True |
| ORK LR HGR20 | null değil | WR, HR, P | True |
| ORK LR HGR25 | null değil | WR, HR, P | True |
| ORK LR HGR30 | null değil | WR, HR, P | True |
| ORK LR HGR35 | null değil | WR, HR, P | True |
| ORK LR HGR45 | null değil | WR, HR, P | True |
| PMI MSA15E | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA15S | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA15SZZ | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA20S | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA25S | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA25SZZ | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA30A | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA30E | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA30EZZ | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA30LE | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA30LS | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA30S | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA35A | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA35E | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA35LA | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA35LE | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA35S | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA35SZZ | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA45E | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA45LA | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA45LE | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA45LS | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSA45S | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSB15E | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSB15S | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSB20E | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSB25S | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSB30E | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSB30S | null değil | W, H, L, B, C, L1, H1, N, M | True |
| PMI MSB35S | null değil | W, H, L, B, C, L1, H1, N, M | True |
| ETA VMS SFU2005 | modül yok | [] | False |
| ETA VMS SFU2505 | modül yok | [] | False |
| ETA VMS SFU3210 | modül yok | [] | False |
| ORK ADM SAC164000 | modül yok | [] | False |
| ORK ADM SAC204000 | modül yok | [] | False |
| ORK ADM SAC253000 | modül yok | [] | False |
| ORK ADM SAC254000 | modül yok | [] | False |
| ORK ADM SAC303000 | modül yok | [] | False |
| ORK ADM SAC304000 | modül yok | [] | False |
| ORK ADM SAC404000 | modül yok | [] | False |
| ORK İM 06 | null değil | dr, Lm | True |
| ORK İM 08 | null değil | dr, Lm | True |
| ORK İM 10 | null değil | dr, Lm | True |
| ORK İM 12 | null değil | dr, Lm | True |
| ORK İM 15 | null değil | dr, Lm | True |
| ORK İM 16 | null değil | dr, Lm | True |
| ORK İM 20 | null değil | dr, Lm | True |
| ORK İM 25 | null değil | dr, Lm | True |
| ORK İM 30 | null değil | dr, Lm | True |
| ORK İM 35 | null değil | dr, Lm | True |
| ORK İM 40 | null değil | dr, Lm | True |
| ORK İM 45 | null değil | dr, Lm | True |
| ORK İM 50 | null değil | dr, Lm | True |
| ORK KKM 06 | null değil | dr, Lm | True |
| ORK KKM 08 | null değil | dr, Lm | True |
| ORK KKM 10 | null değil | dr, Lm | True |
| ORK KKM 12 | null değil | dr, Lm | True |
| ORK KKM 15 | null değil | dr, Lm | True |
| ORK KKM 16 | null değil | dr, Lm | True |
| ORK KKM 20 | null değil | dr, Lm | True |
| ORK KKM 25 | null değil | dr, Lm | True |
| ORK KKM 30 | null değil | dr, Lm | True |
| ORK KKM 35 | null değil | dr, Lm | True |
| ORK KKM 40 | null değil | dr, Lm | True |
| ORK KKM 50 | null değil | dr, Lm | True |
| ORK LR TBR16UU | modül yok | [] | False |
| ORK LR TBR20UU | modül yok | [] | False |
| ORK LR TBR25UU | modül yok | [] | False |
| ORK LR TBR30UU | modül yok | [] | False |
| ORK VM 1605 | modül yok | [] | False |
| ORK VM 2005 | modül yok | [] | False |
| ORK VM 2505 | modül yok | [] | False |
| ORK VM 3210 | modül yok | [] | False |
| ORK VM 4010 | modül yok | [] | False |
| ORK VM 5010 | modül yok | [] | False |
| ORK VMS SFU1605 | modül yok | [] | False |
| ORK VMS SFU2005 | modül yok | [] | False |
| ORK VMS SFU2505 | modül yok | [] | False |
| ORK VMS SFU3210 | modül yok | [] | False |
| ORK VMS SFU4010 | modül yok | [] | False |
| ORK VMS SFU5010 | modül yok | [] | False |
| ORK VSG DSG16H | modül yok | [] | False |
| ORK VSG DSG20H | modül yok | [] | False |
| ORK VSG DSG25H | modül yok | [] | False |
| ORK VSG DSG32H | modül yok | [] | False |
| ORK VSG DSG40H | modül yok | [] | False |
| ORK KR M320201000 | modül yok | [] | False |
| ORK KR M550503000 | modül yok | [] | False |
| ORK KRKA M410053010 | modül yok | [] | False |
| ORK KRKA M410053012 | modül yok | [] | False |
| ORK KRKA M41005308 | modül yok | [] | False |
| ORK KRKA M422222010 | modül yok | [] | False |
| ORK KRÖ M225251000 | modül yok | [] | False |
| ORK MKİ 210 | modül yok | [] | False |
| ORK MKİ 260 | modül yok | [] | False |
| ORK MKİ 280 | modül yok | [] | False |
| ORK MKİ 330 | modül yok | [] | False |
| ORK MKİ 380 | modül yok | [] | False |
| ORK MKİ 430 | modül yok | [] | False |
| ORK MKİ 500 | modül yok | [] | False |
| ORK PD M416 | modül yok | [] | False |
| ORK PD M417 | modül yok | [] | False |
| ORK PD M418 | modül yok | [] | False |
| ORK PD M419 | modül yok | [] | False |
| ORK PD M421 | modül yok | [] | False |
| ORK PD M423 | modül yok | [] | False |
| ORK PD M424 | modül yok | [] | False |
| ORK PD M426 | modül yok | [] | False |
| ORK PD M427 | modül yok | [] | False |
| ORK PD M428 | modül yok | [] | False |
| ORK PD M429 | modül yok | [] | False |
| ORK PD M431 | modül yok | [] | False |
| ORK PD M432 | modül yok | [] | False |
| ORK PD M433 | modül yok | [] | False |
| ORK PD M434 | modül yok | [] | False |
| ORK PD M435 | modül yok | [] | False |
| ORK PD M436 | modül yok | [] | False |
| ORK PD M437 | modül yok | [] | False |
| ORK PD M438 | modül yok | [] | False |
| ORK PD M439 | modül yok | [] | False |
| ORK PD M440 | modül yok | [] | False |
| ORK PD M441 | modül yok | [] | False |
| ORK PD M442 | modül yok | [] | False |
| ORK PD M443 | modül yok | [] | False |
| ORK PD M444 | modül yok | [] | False |
| ORK PD M445 | modül yok | [] | False |
| ORK PD M446 | modül yok | [] | False |
| ORK PD M447 | modül yok | [] | False |
| ORK PD M448 | modül yok | [] | False |
| ORK PD M449 | modül yok | [] | False |
| ORK PD M450 | modül yok | [] | False |
| ORK PD M520 | modül yok | [] | False |
| ORK PD M522 | modül yok | [] | False |
| ORK PD M524 | modül yok | [] | False |
| ORK PD M526 | modül yok | [] | False |
| ORK PD M528 | modül yok | [] | False |
| ORK PD M530 | modül yok | [] | False |
| ORK PD M532 | modül yok | [] | False |
| ORK PD M534 | modül yok | [] | False |
| ORK PD M536 | modül yok | [] | False |
| ORK BMT CY16B2 | modül yok | [] | False |
| ORK BMT CY25A | modül yok | [] | False |
| ORK BMT IA19 | modül yok | [] | False |
| ORK BMT IA25 | modül yok | [] | False |
| ORK BMT NL8H | modül yok | [] | False |
| ORK BMT SP12AFL | modül yok | [] | False |
| ORK BMT SP12B | modül yok | [] | False |
| ORK BMT SP12BF | modül yok | [] | False |
| ORK BMT SP15A | modül yok | [] | False |
| ORK BMT SP15AFL | modül yok | [] | False |
| ORK BMT SP15B | modül yok | [] | False |
| ORK BMT SP15C | modül yok | [] | False |
| ORK BMT SP15P | modül yok | [] | False |
| ORK BMT SP22B | modül yok | [] | False |
| ORK BMT SP22C | modül yok | [] | False |
| ORK BMT SP22P | modül yok | [] | False |
| ORK BMT SP25B | modül yok | [] | False |
| ORK BMT SP30B | modül yok | [] | False |
| ORK BMT SP30C | modül yok | [] | False |
| ORK BMT SP30P | modül yok | [] | False |
| ORK BMT SP45B | modül yok | [] | False |
| ORK BMT SP60B | modül yok | [] | False |
| ORK GKT MG208 | modül yok | [] | False |
| ORK GKT MG210 | modül yok | [] | False |
| ORK GKT MG212 | modül yok | [] | False |
| ORK KK S060 | modül yok | [] | False |
| ORK PM SSPHS06R | modül yok | [] | False |
| ORK PM SSPHS08R | modül yok | [] | False |
| ORK PM SSPHS10R | modül yok | [] | False |
| ORK PM SSPHS12R | modül yok | [] | False |
| ORK PM SSPHS14R | modül yok | [] | False |
| ORK PM SSPHS16R | modül yok | [] | False |
| ORK PM SSPHS18R | modül yok | [] | False |
| ORK PM SSPHS20R | modül yok | [] | False |
| ORK PM SSPOS06R | modül yok | [] | False |
| ORK PM SSPOS08R | modül yok | [] | False |
| ORK PM SSPOS10R | modül yok | [] | False |
| ORK PM SSPOS12R | modül yok | [] | False |
| ORK PM SSPOS14R | modül yok | [] | False |
| ORK PM SSPOS16R | modül yok | [] | False |
| ORK PM SSPOS18R | modül yok | [] | False |
| ORK PM SSPOS20R | modül yok | [] | False |
| ORK YKKM 1000 | modül yok | [] | False |
| ORK YKKM 1500 | modül yok | [] | False |
| ORK YKKM 2000 | modül yok | [] | False |
| ORK YKKM 800 | modül yok | [] | False |
