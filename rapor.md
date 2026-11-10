# Aile 3 ve Aile 2 düzeltmeleri: toplam 162 ürün

**Panele girilmedi, yükleme ve push yapılmadı.** Önceki 108 kayıt korunarak Aile 3'ün **54 girdisi** eklendi: 40 pinyon, 7 kremayer, 7 ince seri motor kızağı. Girdide belirtilen pinyon aralığında 29 değil **40** satır var (31 modül 4, 9 modül 5). Önceki “eşleşen hiçbir kayıt atlanmaz” talimatı gereği tümü işlendi; kapsam 151 değil **162**. Kalan 46 girdi bu adımda işlenmedi.

## Önceki aileye iki düzeltme

### SAC görseli

Yedi SAC kaydındaki küçük şeffaf ayak üstünde duran mil fotoğrafı kaldırıldı. Yeni gerçek fotoğraf, mil boyunca devam eden alüminyum destek profilini ve tabandaki bağlantı deliklerini gösteriyor. Rulman/araba, marka, okunur başka model kodu, filigran ve ambalaj yok. Fotoğrafın kaynak kadrajı tek destekli milin kesitini gösterir; gerçek ürünün 3/4 metre boyunun ölçü kanıtı sayılmaz. Seviye `ayni_tip`.

- Seçim: `veri/aile2-gorsel-secimleri.json`; `arac/aile2_gorsel.py` ile yeniden üretilebilir.
- **Görme kontrolü:** kaynak fotoğraf ve bitmiş yedi JPG açıldı: `onizleme/sac-yeni-kontrol.jpg`.
- Güncel Aile 2 paftası: `onizleme/aile2-kontak.jpg`.
- Üst 100 px logo dışında tuval saf beyazdan kuruldu; oran korunarak 440×240 kutuya yerleştirildi.

### Pasif/boş kategoriler

**katurl'da URL var ama sayfa ana sayfaya yönleniyor; kategori boş/pasif olabilir, kullanıcı onaylayacak.** Şu beş öneri yolu aynı kaldı; 31 üründe **`yeni_kategori:true`** ve **`EK_KATEGORILER:["LİNEER"]`** olarak düzeltildi. LİNEER, kamu sayfası açılan mevcut üst köktür; ürünleri başka bir alt ürün tipine yanlış sınıflandırmamak için en yakın güvenli ortak ek yol olarak seçildi.

| Önerilen yol | Katurl kaydı |
|---|---|
| LİNEER>ALT DESTEKLİ MİLLER | /alt-destekli-miller |
| LİNEER>TBR SERİSİ | /tbr-serisi |
| LİNEER>VİDALI MİLLER | /vidali-miller |
| LİNEER>BİLYALI SOMUNLAR | /bilyali-somunlar |
| LİNEER>VİDALI MİL SOMUN GÖVDESİ | /vidali-mil-somun-govdesi |

Makine okunur karar: `veri/kategori-aile2.json`. KKM/İM'nin mevcut ortak kategori yolu değiştirilmedi. Pasif URL'ler açıklamalara iç link yapılmadı.

## Dosyalar

- `urunler.jsonl`: 162 tam alanlı kayıt; yeni açıklamalar 2657–2860 görünür karakter.
- `veri/aile3.json`: her değerin kaynağı, özgün orka_site satırı, kod eşlemesi, eksikler ve boş birimler.
- `veri/aile3-gorsel-secimleri.json`: her ürünün fotoğraf URL'si, dosyası ve seviye kararı.
- `arac/aile3_veri.py`, `aile3_gorsel.py`, `aile3_hazirla.py`, `aile3_raporla.py`, `test_aile3.py`: yeniden üretim ve testler.
- `veri/lineer-ctx.json`, `veri/draw-keys.json`: toplam kapsam ve çizim politikası.
- `onizleme/index.html`: bütün ürünler; yeni HTML'ler ve örnek masaüstü/mobil PNG'ler aynı dizinde.
- Tarihçe: `veri/aile1-rapor.md`, `veri/aile2-rapor.md`. Bu eski raporlardaki kategori/görsel kararları tarihsel durumdur; bu rapor ve güncel JSON düzeltmeleri geçerlidir.

## Teknik kaynaklar ve doğruluk sınırları

### Pinyonlar

Tüm 40 ürünün girdi orka_site satırı mevcut. Modül, De, Dp, d, D hücreleri sıra/harf değiştirmeden alındı. 37 üründe diş sayısı da kullanıldı. **M532/M534/M536 kaynak diş sayıları 31/32/33, adları ve Dp/modül oranlarıyla çelişiyor. Canlı modül 5 tablosunda da aynı hücreler var.** Bu üç değer müşteri adı, metni, SEO'su, anahtar kelimesi ve teknik listesinden çıkarıldı; koddan veya Dp'den sayısal düzeltme yapılmadı. Özgün hücreler orka_site ham satırında korunur ve her kayıt ayrıca eksik bayraklıdır. Seri ürün fotoğrafında dişlerin eksene paralel olması **düz pinyon** görünüşünü doğruluyor; zincir dişlisi veya helis fotoğrafı kullanılmadı.

- https://orkapt.com/service/pinyon-disliler-modul-dislilermodul-4/
- https://orkapt.com/service/pinyon-disliler-modul-dislilermodul-5/
- Yerel kamu sayfaları: `veri/aile3-pinyon-sayfa.html`, `veri/aile3-pinyon5-sayfa.html`.
- Kaynak teknik resim: `veri/aile3-pinyon-teknik.jpg`. Resim D/D1/D2/D3/D4 harflerini kullanırken tablo De/Dp/d/D diyor. Bu yüzden küçük d/büyük D için göbek veya delik anlamı atanmadı; **Ölçü (d), Ölçü (D)** olarak tutuldu. De dış çap, Dp bölüm dairesi çapıdır. Diş genişliği, malzeme ve göbek boyu satırda yok; yazılmadı.

### Kremayerler

`curl -skL` ile https://orkapt.com/service/kremayer-raylar/ yeniden indirildi. Ek olarak https://orkapt.com/service-cat/kremayer-raylar-pinyon-disliler/ ve https://orkapt.com/?s=kap%C4%B1 tarandı; kamu web aramasında KRKA/kapı altı ayrı ürün tablosu aranarak sonuçlar gözden geçirildi. Altı eksik tam kod bu üç sayfada yok: **M320201000, M550503000, M410053010, M410053012, M41005308, M422222010**. Başka boydaki benzer satırlar bu ürünlere aktarılmadı. Arşivler `veri/aile3-kremayer-sayfa.html`, `aile3-kremayer-kategori.html`, `aile3-kapi-arama.html`.

KRÖ M225251000 girdisi, kaynakta **KR M225251000** satırına bağlı: modül 2 ve 25×25×1000 açıklaması birebir aynı. Bu eşleme ham veride açıkça yazıldı; girdi kodu değiştirilmedi. Diş sayısı 159, hatve 6,28 ve hp/he/hs/L değerleri o satırdan alındı. Seri görselinin kaynak adı DÜZ-KREMAYER-RAYLAR ve dişleri düz görünüştedir.

Diğer kodlarda yalnız addaki modül ve açık kesit/boy bilgileri kesin veri olarak kullanıldı. **M41005308** adında kesit/boy yok; son rakamlardan 8 mm veya herhangi bir boy çıkarılmadı. **Hatve p = π·m** tanım gereği hesaplandı, iki ondalığa yuvarlandı: modül 3 → 9,42 mm; modül 4 → 12,57 mm; modül 5 → 15,71 mm. Bu değerler ölçülmüş ürün toleransı değil geometrik hesap sonucudur; hücre kaynağı `hesap:p=π·m` olarak ayırt edilir. Diş sayısı, hp/he/hs, malzeme, sertlik ve delik düzeni üretilmedi.

KRKA için koda özgü üretici fotoğrafı ve diş profili kanıtı bulunamadı. Aynı tip düz kremayer seri fotoğrafı kullanıldı; kapı altı modellerin **düz sınıflaması koda özel üretici doğrulaması değildir**, bu dört kayıtta açık eksik bayrağı vardır. Kategori önerisi mevcut DÜZ KREMAYERLER altında tutuldu; profil/bağlantı teyidi yayın öncesi gereklidir. Eş ölçülü kapı kremayeri araştırma örneği (değer aktarılmadı): https://www.iotivedo.it/catalog/product/view/_ignore_category/1/id/8286/s/cremagliera-zincata-m4-1mt-30x10x1005-asolata-con-distanziali/ .

**Girdide satış birimi boş:** ORK KRKA M410053010, ORK KRKA M410053012, ORK KRKA M41005308. Adet, metre veya başka bir satış birimi varsayılmadı; her biri bayraklandı. M422222010 girdisinde ADET mevcut.

### Motor kızakları

Yedi ince seri ürünün A/B/C/D/E/F/G/H/M/N/O/S hücreleri https://orkapt.com/service/motor-kizaklari/ orka_site satırlarından alındı. Tablo, `veri/aile3-motor-sayfa.html` içinde canlı sayfadan da saklandı.

**Kaynak teknik resmi yanlış:** sayfanın `motor-teknik.png` bağlantısı bir motor kızağı yerine Rusça yazılı Honda motorlu paletli bir araç çizimini gösteriyor (`veri/aile3-motor-teknik.png`). Bu çizim tablo harflerinin anlamını kanıtlamaz. Harflere “toplam boy”, “strok”, “sac kalınlığı” gibi anlamlar uydurulmadı; bütün değerler **Ölçü (A)…Ölçü (S)** biçiminde korunup eksik işaretlendi. Sayısal tablo hücreleri aynen kullanıldı, kalın seri satırlarına geçilmedi. Kaynak çizim müşteri fotoğrafı veya ürün çizimi yapılmadı.

## Kategori kararları

| Aile | Yol | Yeni kategori |
|---|---|---|
| PD | KREMAYER RAYLAR VE PİNYON DİŞLİLER>PİNYON DİŞLİLER>DÜZ PİNYONLAR | false, mevcut |
| KR/KRÖ/KRKA | KREMAYER RAYLAR VE PİNYON DİŞLİLER>KREMAYER RAYLAR>DÜZ KREMAYERLER | false, mevcut; KRKA profil teyidi gerekli |
| MKİ | MOTOR KIZAKLARI | true, uygun mevcut yol yok |

Bu iki mevcut dişli yolu `site_kategoriler.txt` içinde var. Motor kızağına ilgisiz hidromotor veya lineer araba kategorisi eklenmedi. Açıklamalardaki iki iç link katurl.txt içindeki düz pinyon/düz kremayer veya kasnak/kayış gruplarıdır. Motor kızağı bir motor, kasnak veya kayış seti olarak sunulmadı.

## Teknik etiket listeleri

- **PD**: `Modül (m)`, `Diş Sayısı (Z)`, `Dış Çap (De)`, `Bölüm Dairesi Çapı (Dp)`, `Ölçü (d)`, `Ölçü (D)`; `Marka`.
- **KR**: `Modül (m)`, `Hatve (p)`, `Kesit Ölçüsü (a)`, `Kesit Ölçüsü (b)`, `Boy (L)`, `Diş Sayısı (Z)`, `Ölçü (hp)`, `Ölçü (he)`, `Ölçü (hs)`; `Marka`.
- **MKI**: `Ölçü (A)`, `Ölçü (B)`, `Ölçü (C)`, `Ölçü (D)`, `Ölçü (E)`, `Ölçü (F)`, `Ölçü (G)`, `Ölçü (H)`, `Ölçü (M)`, `Ölçü (N)`, `Ölçü (O)`, `Ölçü (S)`; `Marka`.

KR'de a/b genel kesit ölçüleridir; hp/he/hs yalnız kaynak satırı olan KRÖ'de bulunur. Ölçü harfi bilinmeyen genel kesit için başka standardın hp/he/hs anlamı atanmadı. Boylar ürün adlarında korunur; paket bilgisi değildir.

## Görseller

- Yeni aile: **birebir 0, ayni_tip 54**. Toplam **birebir 14, ayni_tip 148**.
- Önce kod/model aramaları ve seri sayfaları incelendi; logosuz, eksiksiz model eşleşmesi kanıtlanmadığında birebir yazılmadı. Fotoğraftaki dişleri sayarak ya da görünüşten boy ölçerek veri üretilmedi.
- Pinyon ve kremayer için kaynak seri ürün fotoğrafları kullanıldı; görünür ORKA/başka marka logosu veya okunur farklı model yok. Seri fotoğrafı, modele ait diş sayısının veya delik düzeninin fotoğraf kanıtı değildir.
- MKİ için gerçek, logosuz ve okunur model kodu olmayan ince sac motor ayar tabanı fotoğrafı seçildi. 210/280 gibi başka ölçüleri okunabilen adaylar diğer ürünlere taşınmadı; motorlu/kalın kaynaklı şaseler reddedildi. Seri fotoğrafı yalnız aynı tip görünüş içindir; tam boyut eşitliği iddiası yoktur.
- Kaynaklar tek tek, bitmiş 54 görsel de **`onizleme/aile3-kontak.jpg`** açılarak kontrol edildi. Masaüstü/mobil örnek yüzeyleri `onizleme/aile3-sayfa-kontrol.jpg` içinde görüntülendi.
- Müşteriye görünen ad/metin/SEO/anahtar kelime/slug/JPG dosya adlarında ORKA/ORKAPT yasak olmaya devam eder. Bu ailede **müşteriye aktarılmayan iki kaynak metadatası** (`resim_kaynak`, `teknik_kaynak`) gerçek kaynak URL'sini korur; orka_site görsellerine izin veren bu brief gereği kaynak alanlarında orkapt.com bulunur. Kaynak URL'si açıklamaya link veya metin olarak eklenmedi. Denetim istisnası yalnız bu ailelerin bu iki alanındadır; satış HTML'si hâlâ yasak kelime denetiminden geçer.

| Kod | Seviye | Görsel kaynak |
|---|---|---|
| ORK KR M320201000 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/DÜZ-KREMAYER-RAYLAR.jpg |
| ORK KR M550503000 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/DÜZ-KREMAYER-RAYLAR.jpg |
| ORK KRKA M410053010 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/DÜZ-KREMAYER-RAYLAR.jpg |
| ORK KRKA M410053012 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/DÜZ-KREMAYER-RAYLAR.jpg |
| ORK KRKA M41005308 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/DÜZ-KREMAYER-RAYLAR.jpg |
| ORK KRKA M422222010 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/DÜZ-KREMAYER-RAYLAR.jpg |
| ORK KRÖ M225251000 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/DÜZ-KREMAYER-RAYLAR.jpg |
| ORK MKİ 210 | ayni_tip | https://sc04.alicdn.com/kf/H03f17b8708984f1ab4ee8441b3768784a/European-Standard-Adjustable-DHA-Motor-Rail-Motorized-Linear-Track-Series-Motor-Slide-SM-MB-SMA-Common-Motor-Pedestal-Base.jpg |
| ORK MKİ 260 | ayni_tip | https://sc04.alicdn.com/kf/H03f17b8708984f1ab4ee8441b3768784a/European-Standard-Adjustable-DHA-Motor-Rail-Motorized-Linear-Track-Series-Motor-Slide-SM-MB-SMA-Common-Motor-Pedestal-Base.jpg |
| ORK MKİ 280 | ayni_tip | https://sc04.alicdn.com/kf/H03f17b8708984f1ab4ee8441b3768784a/European-Standard-Adjustable-DHA-Motor-Rail-Motorized-Linear-Track-Series-Motor-Slide-SM-MB-SMA-Common-Motor-Pedestal-Base.jpg |
| ORK MKİ 330 | ayni_tip | https://sc04.alicdn.com/kf/H03f17b8708984f1ab4ee8441b3768784a/European-Standard-Adjustable-DHA-Motor-Rail-Motorized-Linear-Track-Series-Motor-Slide-SM-MB-SMA-Common-Motor-Pedestal-Base.jpg |
| ORK MKİ 380 | ayni_tip | https://sc04.alicdn.com/kf/H03f17b8708984f1ab4ee8441b3768784a/European-Standard-Adjustable-DHA-Motor-Rail-Motorized-Linear-Track-Series-Motor-Slide-SM-MB-SMA-Common-Motor-Pedestal-Base.jpg |
| ORK MKİ 430 | ayni_tip | https://sc04.alicdn.com/kf/H03f17b8708984f1ab4ee8441b3768784a/European-Standard-Adjustable-DHA-Motor-Rail-Motorized-Linear-Track-Series-Motor-Slide-SM-MB-SMA-Common-Motor-Pedestal-Base.jpg |
| ORK MKİ 500 | ayni_tip | https://sc04.alicdn.com/kf/H03f17b8708984f1ab4ee8441b3768784a/European-Standard-Adjustable-DHA-Motor-Rail-Motorized-Linear-Track-Series-Motor-Slide-SM-MB-SMA-Common-Motor-Pedestal-Base.jpg |
| ORK PD M416 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M417 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M418 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M419 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M421 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M423 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M424 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M426 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M427 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M428 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M429 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M431 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M432 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M433 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M434 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M435 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M436 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M437 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M438 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M439 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M440 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M441 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M442 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M443 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M444 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M445 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M446 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M447 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M448 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M449 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M450 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M520 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M522 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M524 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M526 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M528 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M530 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M532 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M534 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |
| ORK PD M536 | ayni_tip | https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg |

## Eksikler

Yeni 54 ürünün 53 tanesi; toplam 162 ürünün 131 tanesi eksik bayraklı. Bütün mevcut bayraklar korunmuştur. Önceki ailelerin gerekçeleri ham veri ve tarihçe raporlarında bulunur; yeni ürünlerin tam listesi:

- **ORK KR M320201000**: eksik: canlı kremayer tablosunda tam kod yok; diş sayısı, malzeme, hp/he/hs ve bağlantı delikleri aktarılmadı
- **ORK KR M550503000**: eksik: canlı kremayer tablosunda tam kod yok; diş sayısı, malzeme, hp/he/hs ve bağlantı delikleri aktarılmadı
- **ORK KRKA M410053010**: eksik: canlı kremayer tablosunda tam kod yok; diş sayısı, malzeme, hp/he/hs ve bağlantı delikleri aktarılmadı; eksik: KRKA kapı altı koduna özel üretici fotoğrafı/diş geometrisi bulunamadı; düz kremayer sınıflaması aynı tip kapı kremayeri görünüşüne dayanır; eksik: girdide satış birimi boş; birim varsayılmadı
- **ORK KRKA M410053012**: eksik: canlı kremayer tablosunda tam kod yok; diş sayısı, malzeme, hp/he/hs ve bağlantı delikleri aktarılmadı; eksik: KRKA kapı altı koduna özel üretici fotoğrafı/diş geometrisi bulunamadı; düz kremayer sınıflaması aynı tip kapı kremayeri görünüşüne dayanır; eksik: girdide satış birimi boş; birim varsayılmadı
- **ORK KRKA M41005308**: eksik: ürün adında kesit ve boy ölçüsü yok; kod rakamlarından ölçü türetilmedi; eksik: canlı kremayer tablosunda tam kod yok; diş sayısı, malzeme, hp/he/hs ve bağlantı delikleri aktarılmadı; eksik: KRKA kapı altı koduna özel üretici fotoğrafı/diş geometrisi bulunamadı; düz kremayer sınıflaması aynı tip kapı kremayeri görünüşüne dayanır; eksik: girdide satış birimi boş; birim varsayılmadı
- **ORK KRKA M422222010**: eksik: canlı kremayer tablosunda tam kod yok; diş sayısı, malzeme, hp/he/hs ve bağlantı delikleri aktarılmadı; eksik: KRKA kapı altı koduna özel üretici fotoğrafı/diş geometrisi bulunamadı; düz kremayer sınıflaması aynı tip kapı kremayeri görünüşüne dayanır
- **ORK MKİ 210**: eksik: kaynak motor-teknik.png, motor kızağı yerine ilgisiz araç çizimi; A…S harflerine ölçü anlamı atanmadı, sadece tablo değerleri kullanıldı
- **ORK MKİ 260**: eksik: kaynak motor-teknik.png, motor kızağı yerine ilgisiz araç çizimi; A…S harflerine ölçü anlamı atanmadı, sadece tablo değerleri kullanıldı
- **ORK MKİ 280**: eksik: kaynak motor-teknik.png, motor kızağı yerine ilgisiz araç çizimi; A…S harflerine ölçü anlamı atanmadı, sadece tablo değerleri kullanıldı
- **ORK MKİ 330**: eksik: kaynak motor-teknik.png, motor kızağı yerine ilgisiz araç çizimi; A…S harflerine ölçü anlamı atanmadı, sadece tablo değerleri kullanıldı
- **ORK MKİ 380**: eksik: kaynak motor-teknik.png, motor kızağı yerine ilgisiz araç çizimi; A…S harflerine ölçü anlamı atanmadı, sadece tablo değerleri kullanıldı
- **ORK MKİ 430**: eksik: kaynak motor-teknik.png, motor kızağı yerine ilgisiz araç çizimi; A…S harflerine ölçü anlamı atanmadı, sadece tablo değerleri kullanıldı
- **ORK MKİ 500**: eksik: kaynak motor-teknik.png, motor kızağı yerine ilgisiz araç çizimi; A…S harflerine ölçü anlamı atanmadı, sadece tablo değerleri kullanıldı
- **ORK PD M416**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M417**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M418**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M419**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M421**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M423**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M424**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M426**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M427**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M428**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M429**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M431**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M432**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M433**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M434**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M435**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M436**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M437**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M438**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M439**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M440**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M441**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M442**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M443**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M444**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M445**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M446**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M447**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M448**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M449**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M450**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M520**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M522**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M524**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M526**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M528**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M530**: eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M532**: eksik: kaynak diş sayısı 31, ad ve Dp/modül oranıyla çelişkili; diş sayısı yayınlanmadı, üretici teyidi gerekiyor; eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M534**: eksik: kaynak diş sayısı 32, ad ve Dp/modül oranıyla çelişkili; diş sayısı yayınlanmadı, üretici teyidi gerekiyor; eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı
- **ORK PD M536**: eksik: kaynak diş sayısı 33, ad ve Dp/modül oranıyla çelişkili; diş sayısı yayınlanmadı, üretici teyidi gerekiyor; eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı

Önceki aile teknik sınırları aynen sürer: ETAZON resmi kaynak yok; KKM/İM ek yüzey özellikleri, SAC kesiti, SFU tam varyant geometrisi ve DSG40H çelişkili ölçüleri tahminle doldurulmadı. Aile 1'de HGH45HA, HGW30CC, HGW45HC ve HGW30HC için **rayla birlikte görünüyor** notu geçerlidir; ürün yalnız arabadır.

## Çizim ve denetim

Bu aileye yeni çizim modülü yazılmadı; zincir_disli.js pinyon için kullanılmadı. 54 yeni kaydın `cizim_modulu:null` bağlamları ve “modül yok / çağrılmadı” sonuçları kayıtlıdır. Önceki 77 başarılı çizim korunur; toplam 85 ürün modül kapsamı dışıdır. Aynı modülsüzlük politikası önizlemede de geçerlidir, yanlış çizim gösterilmez.

```text
$ python3 arac/denetle.py urunler.jsonl --aile
Denetlenen ürün: 162
SONUÇ: 0 hata
```

```text
$ python3 -m unittest discover -s arac -p 'test_*.py'
................
----------------------------------------------------------------------
Ran 16 tests in 1.534s

OK
```

```text
Çizim: 77 başarılı; 85 modül yok; eksik veri kontrolleri: null
HTML: 162 ürün; 1280/390 px taşma kontrolleri tamamlandı
```

Yeniden üretim:

```sh
python3 arac/aile2_gorsel.py
python3 arac/aile3_veri.py
python3 arac/aile3_gorsel.py
python3 arac/aile_hazirla.py
/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node arac/ciz.js
python3 arac/kontak.py
python3 arac/onizle.py
python3 arac/denetle.py urunler.jsonl --aile
python3 -m unittest discover -s arac -p 'test_*.py'
python3 arac/raporla.py
```

Görsel kanıtlar: `onizleme/sac-yeni-kontrol.jpg`, `onizleme/aile3-kontak.jpg`, `onizleme/aile3-sayfa-kontrol.jpg`. Örnek tam sayfalar `onizleme/ORK_PD_M416.png`, `ORK_PD_M536_mobil.png`, `ORK_KRKA_M41005308.png`, `ORK_MK__210.png` ve eş HTML'leridir. Canlı mağaza entegrasyonu denenmedi. Paket/Adet kuralı sonraki kaynak teli ürünleri için geçerliliğini korur; bu ailede ürün boyu adlardan çıkarılmadı.
