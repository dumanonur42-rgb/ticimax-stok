# HGH 20HA pilot teslimi

Bu dalda yalnız `ORK LA HGH20HA` hazırlanmıştır. Panel erişimi, ürün yükleme ve push yapılmamıştır. Kamuya açık HGH 20CA ürün sayfası yalnız karşılaştırma amacıyla okunmuştur.

## Çıktılar

- Ürün alanları: `urunler.jsonl` (1 satır).
- Değer + kaynak + kapsam: `veri/lineer.json`.
- Çizim bağlamı: `veri/lineer-ctx.json`; anahtar değerleri: `veri/draw-keys.json`.
- Görsel: `gorseller/hgh-20ha-dar-uzun-lineer-araba-20-mm.jpg` (500×500 JPEG).
- Yerel HTML: `onizleme/ORK_LA_HGH20HA.html`.
- Masaüstü 1280 px: `onizleme/ORK_LA_HGH20HA.png`.
- Mobil 390 px: `onizleme/ORK_LA_HGH20HA_mobil.png`.
- Çizim: `onizleme/hgh20ha.svg`, `onizleme/hgh20ha-cizim.png`.
- Yakın görsel kontrol kesitleri: `onizleme/kontrol-ORK_LA_HGH20HA.png`, `onizleme/kontrol-ORK_LA_HGH20HA_mobil.png`.

## Teknik kaynak ve sınırlar

Resmi HG kataloğu:

https://hiwin.com/wp-content/uploads/2026/08/HIWIN-Linear-Guideway-Catalog-1.pdf

Yerel kopya: `veri/hg-resmi-katalog.pdf`; PDF sayfa 41, basılı sayfa 38; HGH20HA satırı. Metin dökümü: `veri/hg-katalog-satiri.txt`. Birleştirilmiş hücreler HGH20CA/HA ortak ölçülerini içerir. W, H, H1, N, B, B1, C, L1, L, K1, K2, G, M×l, T, H2, H3, WR, HR kaydedilmiştir. Resmi üretici ürün sayfası ile de ölçüler karşılaştırılmıştır:

https://www.hiwin.de/en/Products/Linear-guideways/Blocks/Ball-guides/Series-HG-QH/HGH-QHH/HGH20HAZAH/p/5-001643

**Önemli kapsam kararı:** resmi katalogdaki 32,7 kN dinamik yük, 47,96 kN statik yük ve 0,39 kg ağırlık eşdeğer kodun kaynak verisi olarak saklanmıştır; Yamansa ürününün doğrulanmış kapasitesi/ağırlığı diye satış alanlarına yazılmamıştır. Geometri uyumluluğu malzeme ve yük kapasitesi eşitliğini kanıtlamaz. Kaynak girişinde doğrudan ürün sayfası null olduğundan gerçek ürün kapasitesi/ağırlığı için `eksik` bayrağı vardır. Ön yük, hassasiyet sınıfı, hız sınırı, sıcaklık veya malzeme sınıfı uydurulmamıştır.

Kamuya açık karşılaştırma sayfası:

https://www.yamansarulman.com/hgh-20-ca-lineer-araba-18295

Curl Cloudflare yanıtı verdiğinden Chrome CDP localhost:29229 üzerinden yalnız bu kamu sayfası okunmuştur. W=44, H=30, H1=4,6, N=12, B=32 mm ortak değerleri tutarlıdır. CA'nın C=36, L1=50,5 ve L=77,5 mm değerleri HA'ya aktarılmamıştır. CA sayfasındaki eski yük tablosunun değerleri güncel resmi katalogdan farklıdır; bunlar HA verisi olarak kullanılmamıştır. Sayfanın teknik tablo görseli: `veri/ca2.png` (yalnız kanıt, ürün görseli değildir).

## Görsel

Kaynak ürün sayfası: https://www.fonlinearguide.com/product/en/HGH20HA.html

Kaynak fotoğraf: https://www.fonlinearguide.com/Uploads/products/2021-03-10/en-HGH20HA--5-.jpg

Ham kopya: `veri/fon9.jpg`. Seviye **ayni_tip**: başka tedarikçiden aynı HGH20HA kodu ve dar uzun gövde fotoğrafı; gerçek Yamansa stok fotoğrafı olduğu iddia edilmez. Okunur kod HGH20HA'dır; farklı ölçü/kod, marka logosu, filigran, kutu veya çizim görülmemiştir. Beyaz zeminli kaynakta beyaz olmayan alanın sınırıyla kırpılmıştır; rembg gerekmemiştir. Şablonun örnek mil resmi taşınmamış, yalnız üst 100 px ve alt 150 px bantları korunmuştur. Ürün 100–350 px arasına yerleştirilmiştir. Ham ve bitmiş görsel açılarak kontrol edilmiştir. Diğer aramalardaki logo/filigranlı görseller reddedilmiştir.

## Yapı ve denetim

ONYAZI ham table/td/strong biçimindedir; 8 kutu yerel önizlemede gerçek `onyazi.js` ile üretilir ve `ornek/yon.css` uygulanır. Açıklama h2/h3/p ve doğrudan ul/li/strong teknik listesi içerir; kullanım alanları vardır. İç linkler `katurl.txt` içindeki lineer araba ve lineer ray kategorileridir. Kategori mevcut `LİNEER>LİNEER ARABALAR` yoludur; yeni kategori gerekmez.

Görünür açıklama 3133 karakterdir. SEO başlığı 36, SEO açıklaması 125, her iki anahtar kelime alanı 304 karakterdir. Denetim tüm alanları ve URL'leri marka yasağı/U+0307/uzun tire açısından, görünür metni ondalık nokta açısından kontrol eder. `kod` içindeki ORK kaynak tanımlayıcısı korunur; müşteri adında bulunmaz. Boş ek kategori ve boş bayrak listesi geçerli kabul edilir. Link doğrulaması izin listesi esaslıdır; ayrıca ürün linki eklenmemiştir.

Çalıştırılan denetim:

```text
$ python3 arac/denetle.py
Denetlenen ürün: 1
SONUÇ: 0 hata
```

Normal, boş ve hatalı kayıt regresyon kontrolleri:

```text
$ python3 -m unittest discover -s arac -p 'test_*.py'
...
----------------------------------------------------------------------
Ran 3 tests in 0.073s

OK
```

`arac/lineer.js` ve `arac/onyazi.js`, `origin/site-assets` kaynaklarının değiştirilmemiş yerel kopyalarıdır. Node bağlamı HTML'de kullanılan aynı ölçü listesinden üretilmiştir; veri tahmini yapılmamıştır.

```text
$ node arac/ciz.js
draw() null değil; keys: W, H, L, B, C, L1, H1, N, M
Eksik H1 kontrolü: null
```

`keys` değerleri mm ve M5×6 olarak `veri/draw-keys.json` içindedir. Resmi çizim modülü tüm katalog ölçülerini çizmez; anahtar seti modülün dar araba arayüzüne uygundur.

```text
$ python3 arac/onizle.py
Önizleme: onizleme/ORK_LA_HGH20HA.png (1280px)
Önizleme: onizleme/ORK_LA_HGH20HA_mobil.png (390px)
SVG PNG: onizleme/hgh20ha-cizim.png
```

İki genişlikte 8 kutu ve yatay taşma olmaması script ile kontrol edilmiş, masaüstü/mobil PNG'ler ve çizim ayrıca görüntülenmiştir. İlk görsel kontrolde şablondaki örnek milin kenarlarda kaldığı görüldü; orta alan beyazdan yeniden kurularak düzeltildi ve düzeltilmiş PNG'ler tekrar görüntülendi. Bu yerel bir önizlemedir; gerçek site entegrasyonu denenmemiştir.

## Yeniden üretim

Python bağımlılıkları: Pillow, beautifulsoup4, playwright. Kaynak PDF metnini çıkarmak için pypdf kullanıldı. Ortamın sistem Python'unda playwright/pypdf yoktu; blueprint bakımına uygun şekilde kullanıcı alanına kuruldu. Node mevcut nvm dizinindeydi fakat PATH'te değildi; şu mutlak yol kullanıldı: `/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node`. Chrome: `/home/ubuntu/.local/bin/google-chrome`.

```sh
python3 arac/hazirla.py
/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node arac/ciz.js
python3 arac/onizle.py
python3 arac/denetle.py
python3 -m unittest discover -s arac -p 'test_*.py'
```

Araçlar yalnız yerel dosya üretir. Kaynak fotoğraf ve katalog zaten veri dizinindedir. Bu adım kalan 207 ürünü işlemez.
