# Zincir — STEP 3 görselleri

230 stok kodunun tamamı `work/gorsel.json` içinde görsele bağlıdır. Dosya adı,
orada sabitlenen paket miktarsız `URUNADI` alanının ASCII slug'ıdır.
**0 birebir, 230 aynı tip, 0 görselsiz.** 212 farklı ad/dosya vardır; aynı ürünün
paketli ve paketsiz stokları paket miktarı addan çıkarıldığı için 17 dosya yolunu paylaşır (18 ek stok kaydı).

## Araştırma ve seçim

- `work/gorsel_arama.json`: 230 kod için marka + kod + ürün tipi sorgusu ve
  Yandex Images üzerinden bulunan ilk 20 görselin gerçek kaynak/ürün URL'leri.
  Chrome/Playwright ile ayrı tarayıcı bağlamlarında arandı; sonuç bulunması,
  birebir fotoğraf bulunduğu anlamına **gelmez**.
- iwis resmi ECOPLUS ürün sayfasındaki erişilebilir görsel teknik çizimdi.
  Resmi ECOPLUS katalog fotoğrafları da incelendi; çoklu ürünlü/mavi zeminli
  seri fotoğrafları tam kodun birebir fotoğrafı olarak sunulmadı.
- Sedis aynı kodlu bayi sonuçlarının kutu ve bilgisayar çizimi içeren örnekleri
  elendi. RS sayfaları doğrudan `Access Denied` döndürdü; Ayzin'in resmi
  16B-1 görseli de çizim/render olduğu için kullanılmadı.
- TMP, CSE, SPC/EBF, ETAZON, Natural ve Ayzin marka/kod sorguları da kaydedildi.
  Kabul edilen hiçbir fotoğraf aynı marka ve tam ölçüyü ispatlayan birebir fotoğraf
  olarak etiketlenmedi; tamamı ihtiyatlı biçimde `ayni_tip`tir.
- Bing temiz bağlamda denendi; başlıktaki doğru sorguya rağmen Softway Medical
  gibi ilgisiz sonuçlar döndürdü. `work/gorsel_kaynak/bing-iwis12.html` kanıttır;
  bu sonuçlar kaynak olarak kullanılmadı.
- Nitro'nun filigranlı fotoğrafları, üzeri markalı bazı US Roller Chain
  seçenekleri, teknik resimler ve kutulu görseller kullanılmadı. `bakla.jpg`
  kullanılmadı. Başka markanın logosu/filigranı veya okunabilir farklı ölçü/kod
  son görsellere eklenmedi.

## 24 kaynak varyantı

Tam fotoğraf URL'si, ürün sayfası URL'si, yerel orijinali ve kırpma koordinatları
`work/gorsel_kaynaklar.json` dosyasındadır. Her stokta ayrıca `kaynak_tip` bulunur.

| Tip anahtarı | Gerçek fotoğraf kaynağı / görünüş |
|---|---|
| chain1 | Orka `06B-ZİNCİR.jpg`, tek sıra |
| chain2 | Orka `08B-ZİNCİR-.jpg`, **çift** sıra |
| chain3 | Made-in-China / Starmachine, üç sıra, baskısız plaka |
| chain4 | USA Roller Chain, dört sıra |
| sschain1 | Ever-Power, parlak paslanmaz tek sıra |
| sschain2 | Alibaba kaynak fotoğrafı, parlak paslanmaz çift sıra |
| hpchain / sshpchain | USA Roller Chain, boş pimleri görünen normal/paslanmaz tek sıra |
| double / hpdouble | USA Roller Chain, uzun düz plakalı büyük makaralı çift hatve; dolu/boş pim |
| offset1 / clip1 | Orka `zincir-kilitleri.jpg`; sağdaki yarım kilit ve soldaki yaylı tam kilit ayrı kırpıldı |
| offset2 / offset3 | USA Roller Chain, iki/üç sıralı kranked yarım kilit |
| ssoffset1 / ssoffset2 | USA Roller Chain, paslanmaz bir/iki sıralı yarım kilit |
| clip2 / clip3 | USA Roller Chain, iki/üç sıralı yaylı klipsli tam kilit |
| ssclip1 / ssclip2 | USA Roller Chain, paslanmaz bir/iki sıralı yaylı tam kilit |
| hpclip / sshpclip | USA Roller Chain, normal/paslanmaz boş pimli segmanlı tam kilit |
| 415hclip | Pocket Bike Canada, 415H tipi ince yaylı zincir kilidi |
| sprocket2 | Orka `20B-ZİNCİR-DİŞLİLER.jpg`, çift sıralı göbekli pilot delikli seri dişli |

## Önemli sınırlar ve kararlar

- `ORK ZD 1209` görseli **9 dişli birebir fotoğraf değildir**. İki sıralı,
  göbekli, düz pilot delikli Orka seri fotoğrafıdır; diş sayısı/ölçü için
  görsel üzerinden doğrulama iddiası yoktur. Bu sınır stok kaydının notunda da yazılıdır.
- A2052 için önceki onaylı teknik araştırmadaki aynı kodlu THC satırı
  19,05 mm büyük makara tanımlar; "A mutlaka küçük makara" varsayımıyla
  farklı tip fotoğraf seçilmedi. A2052 ve C2052 büyük makaralı çift hatve
  fotoğraf grubundadır. Teknik verilere bu adımda müdahale edilmedi.
- Alt 150 px beyaz/logosuz bırakıldı. Gerçek markaların doğrulanmamış logoları
  eklenmedi; Yamansa üst şablonu bütün ürünlerde aynıdır. Referans şablondaki
  mil fotoğrafı aktarılmadı.
- Beyaz kaynaklar içerik sınırına kırpıldı. Boş pimli iki kilit grubunda
  `rembg` / `isnet-general-use` kullanıldı; son halleri temas sayfalarında
  incelendi. Delikler/pimler ve segmanlar görünür durumdadır.
- Bazı bağlantı elemanı kaynakları düşük çözünürlüklüdür (ör. 200×200);
  yapay detay üretimi yapılmadı. Çıktı 500×500 olsa da kaynak fotoğrafın
  gerçek çözünürlüğünden daha yüksek detay iddiası yoktur.
- Son kullanıcı kuralına uygun olarak adlarda paket/koli miktarı yoktur.
  Fiyat ve minimum sipariş adedi değiştirilmedi. Sonraki içerik adımında
  teknik listede `Satış Birimi: Adet` kullanılacak; ambalaj bilgisi isteğe bağlıdır.

## Ön izleme ve doğrulama

- Tam pano: `work/gorsel_onizleme/tum-230-urun.png`
- Yakın inceleme: `work/gorsel_onizleme/tum-urunler-1.png` … `tum-urunler-6.png`
- Altı yakın temas sayfasındaki 230 stok kodu görsel olarak incelendi.
- Yeniden üretim: `python3 work/select_image_sources.py && python3 work/prepare_images.py`
- Otomatik denetim: `python3 work/check_images.py`; çıktı `work/gorsel_kontrol.log`.
- Sözdizimi: yeni/değişen Python araçlarında `python3 -m py_compile`.
- Bu girdi branch'inde paket düzeyi test/lint/typecheck yapılandırması yoktur.
  Ürün içeriği/SEO henüz üretilmedi; Ticimax paneline erişim veya yükleme yapılmadı.
