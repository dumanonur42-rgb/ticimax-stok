# Zincir — adım 1 ara veri ve teknik kaynak denetimi

## Adım 2 öncesi kullanıcı kararları (önceki sınırlamaları geçersiz kılar)

Natural adlı 8 ürünün markası Natural; CSE ZİN 06B2 markası CSE; AYZ 16B2 çift sıra. Eski ham çatışma bayrakları korunur. Aynı standart kodda ISO606/DIN8187 p/b1/d1/d3/h/pt tüm markalara uygulanır; kaynak metni `ISO 606 standard tablosu (URL)` olarak kayıtlıdır. ISO606 minimum kopma yükü yalnız normal zincire uygulanır, SS ve kilit/baklada yoktur. Üreticiye özgü değerler yalnız kendi marka profilindedir. HP'de eşleşmeyen ölçü aktarılmaz; yalnız kod hatvesi, eksik bayrağı. HPA2052 ve HPC2102 artık kullanıcı kararıyla koddan p=31,75 ve p=63,5 alır. 415H genişliği boş kalır ve çatışması korunur. Aşağıdaki adım 1 araştırma notları tarihçe olarak korunmuştur; marka/h/geometri ve eksik yorumlarında bu bölüm önceliklidir.

Bu dosyalar müşteriye gösterilecek ürün içeriği değildir. Ticimax'e girilmedi, yükleme yapılmadı. Kaynak adlarında ve ham adlarda ORKA/ORKAPT bulunması kasıtlıdır; müşteri alanlarına aktarılmayacaktır.

## Dosya arayüzü

- `urunler_parsed.json`: 230 ham satır; `kod` aynen korunur. `marka` ham değer, `gosterilecek_marka` öneri, çözülemeyen iki marka çatışmasında null. `paket_adet` adın içindeki sayıdır; stok kodunun sonu paket sayısı olarak yorumlanmaz.
- `teknik.json`: 70 varyant anahtarı. Ürün `teknik_anahtar` ile bağlanır. Aynı ISO kodun SS, HP, dişli varyantlarını **birleştirmeyin**.
- `olculer`: doğrulanmış eşdeğer geometri; eksikler JSON null. Her sayı `deger`, `kaynak`, `sayfa`, `kapsam` taşır; birim mm, kuvvet kN, kütle kg/m.
- Sembol sözleşmesi site çizim verisiyle aynı: **d1 pim çapı, d3 makara çapı**. iwis/Sedis kataloglarındaki d1 makara/d2 pim sembolleri dönüştürülmüştür. `b2` iç baklanın dış genişliği; **pim boyu değildir**. Pim boyu `F1` (iwis b4) alanıdır. `pt` enine hatve.
- `katalog_referanslari` başka üreticinin seri değerlerini korur; **müşteriye otomatik aktarılmamalı**. SS için karbon çelik kopma/ağırlık verisi uygulanmaz. Tam veya yarım kilide zincirin perçinli pim boyu uygulanmaz.
- `marka_verileri`: iwis ECOPLUS iki üründe tam resmi seri verisi; Sedis dört üründe resmi marka fakat DELTA/ALPHA/VERTE serisi belirsiz; kalan 53 gerçek/çatışmalı marka satırında resmi marka kaynağı bulunamadı. ISO eşdeğer fallback, kullanıcının gerçek markalı ürün için resmi marka kaynağı şartını tamamlamaz: bu ürünler eksik kalır.
- `kaynak_karsilastirma.json`: mevcut site çizim tablosu ile resmi iwis katalog karşılaştırması. 04B-1 b2: 4,1/4,15 ve F1: 7,4/6,8; 16B-1 b2: 25,42/25,45. Bu nedenle site görsel tablosu üreticisi bilinmeyen ürüne tam boy/dayanım otoritesi sayılmadı.

## Sayılar

230 ürün; 106 zincir, 58 yarım kilit/bakla, 65 tam kilit, 1 dişli. Kopya stok kodu yok.

201 BS ailesi (kilitler dahil), 1 ANSI 60, 17 BS pim delikli, 3 çift hatveli, 6 çift hatveli pim delikli, 1 adet 415H kilit, 1 dişli. Bunların 62'si paslanmaz, 23'ü pim delikli. Sıra sayıları: 110 tek, 90 çift, 27 üç, 3 dört sıra. Paket bilgisi 70 üründe var.

## Kullanılan kaynaklar

| Kaynak | Kapsam | Yerel kanıt / sınır |
|---|---|---|
| [iwis ECOPLUS resmi PDF](https://iwis.com/antriebssysteme-drive-systems/as-catalogs/ecoplus/ecoplus-catalog-roller-chains-iwis.pdf) | ISO606/DIN8187 BS 06B–32B 1/2/3 sıra; ANSI 60=12A-1; iki gerçek ECOPLUS ürünü | `kaynaklar/iwis-ecoplus.pdf`, metin; PDF s.4/5/6/7. Diğer markalara h/pim boyu/dayanım/kg/m taşınmadı. |
| [iwis 04B-1](https://www.iwis.com/en-en/products-services/roller-chain-04b-1-elite~p3210), [05B-1](https://www.iwis.com/en-en/products-services/roller-chain-05b-1-elite~p3212), [05B-2](https://www.iwis.com/en-en/products-services/roller-chain-05b-2-elite~p3240) | Küçük ISO606 kod geometrileri | `kaynaklar/iwis-04b.html`, `iwis-05b1.html`, `iwis-05b2.html`; ELITE performansı Yamansa verisi değildir. 04B gerçek hatve 6 mm, 05B 8 mm; 1/4 ve 5/16 olarak zorlanmadı. |
| [Sedis resmi BS PDF](https://www.sedis.com/fichiers/uploads/sedis-principal-products-bs-chains-european-series-20-22.pdf) | Dört Sedis kodu; iwis standart boyutlarını çapraz kontrol | `kaynaklar/sedis-bs.pdf`, metin; PDF s.1 / basılı 20. Girdide seri yok; DELTA referansı genel Sedis performansı diye kullanılamaz. 20B pim çapı dipnotu nedeniyle o Sedis değeri alınmadı. |
| [Donghua resmi çift hatve PDF](https://www.donghua.co.uk/downloads/doublepitchconveyorchains.pdf) | C2052 / C2062; ISO1275/ANSI kod eşdeğer geometri | `kaynaklar/donghua-doublepitch.pdf`, basılı s.31; PDF metin font eşlemesi bozuk, web metin çıkarımıyla okundu. |
| [Beijing THC resmi A serisi](http://www.beijingthc.com/transmission_drive_chain/ansi_double_pitch_transmission_roller_chains.html) | A2052 birebir kodu | Web içerik aracından okundu; doğrudan HTTPS bağlantısı başarısız: `No route to host`. Satır P31,75 / makara19,05 / b1 9,40 / pim5,08 / h15 / L20,50 / Lc21,90 / UTS21,80 / kg/m1,14. Son dört değer yalnız THC referansı. |
| [Tsubaki resmi HP çift hatve](https://tsubaki.eu/products/chain/attachment-chain/ansi-standard-attachment-chain/ansi-double-pitch-hp/) | RF2040R-HP–RF2080R-HP karşılaştırma; pim iç çapı 4 / 5,12 / 5,99 / 8,02 mm | Orijinal HP C20xx ile tam üretici/seri eşleşmesi yok. Bu delik çapları Yamansa HP'ye geçirilmedi. |
| [Tsubaki ABD resmi HP tablosu](https://chains.ustsubaki.com/viewitems/hollow-pin-chain/double-pitch-type-hollow-pin-chain) | C2042HPB–C2082HPB hatveleri | Yalnız birebir standart hatve, inçten mm dönüşümü; diğer değerler otomatik aktarılmaz. |
| [KMC resmi 415H](https://www.kmc-international.com/motorcycle.html) | Kod ölçüsüyle girdi çelişkisi | `kaynaklar/kmc-motorcycle.html`; 12,7 x 4,7 mm. Girdi 1/2 x 1/8: genişlik yayımlanmamalı. |
| `origin/site-assets:site/draw/data/zincir_disli.json` | Mevcut sitenin basit zincir geometrileri | Çapraz kontrol, iki farklı boyut uyuşmazlığı; tek başına üretici kaynağı kabul edilmedi. |

Araştırılıp resmi teknik kataloğu doğrulanamayan markalar: TMP, ETAZON, Natural, Ayzin, Deckel, CSE, SPC, EBF, SPC-EBF. Aramalar marka + zincir/katalog/üretici ve İngilizce manufacturer karşılıklarıyla yapıldı. Benzer adlı mücevher, kimyasal, takım tezgâhı ve tarım ekipmanı şirketleri kaynak kabul edilmedi. TMP yerine TPM olarak sessiz düzeltme yapılmadı. CSE satırları için bulunan bayi tablosunda kauçuk SPA kayış verisi bulunuyordu; reddedildi.

## Kimlik / veri sorunları

- `AYZ ZİN 16B2`: adın ilk bölümü 1-1 SIRA; kod ve parantez 16B*2. İki sıra parse edildi, çelişki işaretlendi.
- `CSE ZİN 06B2`: ham marka CSE (CZECH), ad ARASHİ-TYCO-REXBO. Tek marka seçilemez; öneri null.
- `ETA ZİN 08B1`, `NAT ZİN 06B2`, `NAT ZİN 08B2`, `NAT ZİN 16B1`, `NAT ZİN 20B1`, `NAT ZİN 20B2`, `NAT ZİN ASA601`: ham marka SARI KUTU, ad NATURAL. Öneri NATURAL, ham değer korunur ve çatışma bayrağı var.
- `NAT ZİN HP08B`: ham marka DECKEL, ad NATURAL. Tek marka seçilemez; öneri null.
- `ORK ZK P415H20`: ham marka boş; adın ORKA olması nedeniyle öneri Yamansa. Kod sonu20 fakat ad100 AD/PKT, **100 korundu**. Ayrıca 415H kodu KMC resmi genişliğiyle çelişiyor; yalnız hatve güvenle alınabildi.
- `ORK ZD 1209`: ad 1 inç, çift sıra, 9 diş. 16B-2 eşlemesi ad bazlıdır; tam üretici satırı bulunamadı. ORKA 08B sayfasına çıkan arama sonucu kod satırını doğrulamadı; dış/delik/göbek çapları uydurulmadı.

## Teknik açıklar ve sonraki adım uyarıları

- HP08B/10B/12B/16B ve paslanmaz karşılıklarında gerçek pim iç/dış çapı yok. Örn. farklı kataloglarda 08B HP delik 4,0 veya 4,6 mm çıkıyor; dolu pim çapı 4,45'i HP'ye kullanmak yanlıştır.
- HPA2052 ve HPC2102 tam eşleşen resmi kaynak bulunamadı; bütün sayısal alanlar null. HP C2042/52/62/82 yalnız hatve doğrulandı.
- Dört sıralı 16B/20B toplam pim boyu/dayanım/kg/m yok; üç sıralı değerden çarpma yapılmadı.
- A2052'yi küçük makara, C2052'yi büyük makara diye ayırma: resmi THC A2052 satırı da 19,05 mm **büyük makaralı**. Küçük makaralı kod A2050 olur.
- Tüm genel kayıtlarda üreticiye/seriye bağlı kopma yükü ve kg/m null. Referans verisini ürün garantisiymiş gibi yazma. Tek sıra `pt` null olması eksik değil, uygulanmazdır.
- İçerik, görsel, çizim modülü ve ön izlemeler bu adımda yapılmadı. `eksik teknik` nihai sayısı içerik aşamasının hangi ölçüleri kullanacağına bağlıdır; burada null sayıları alan bazında verilir, tamamlanmış ürün iddiası yoktur.

## Yeniden üretim ve kontrol

`python3 work/parse_products.py && python3 work/collect_technical.py`

Null sayıları (tek sırada uygulanmaz pt dahil, her varyant ayrı):

`python3 -c "import json; d=json.load(open('work/teknik.json')); [print(k, sum(v is None for v in r['olculer'].values())) for k,r in d.items()]"`

Dal yalnız veri içeriyor; paket betiği/CI/test konfigürasyonu yok. Kontrol JSON şeması, kaynaklı sayılar, 230 kodun birebir korunması, paket ve varyant eşleşmeleri ve Python sözdizimi ile sınırlıdır.
