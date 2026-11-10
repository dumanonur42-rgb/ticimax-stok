# yatak — teknik çizim modülü

Dal: `draw/yatak`, taban `origin/site-assets`. Ana `orkapt-girdi` checkout'u korunur.
Yalnız yeni dosyalar eklendi; eski modüller, yg.js, veri araştırması ve yükleyici değiştirilmedi.
Kullanımda `yatakli.js` ve `yatak.js`, `yg.js` çalışmadan önce yüklenmelidir.

## Sözleşme

Saf ES5, dış bağımlılık yok, tek global `window.YDRAW.yatak`.
match yalnız `ctx.specs` içindeki Seri ve en az bir `(HARF)` son ekli etiketle çalışır.
Seri/harf büyük-küçük duyarlıdır; `d` ve `D` ayrıdır. Son ekler alfanümeriktir.
Numara metadata'dır, ölçü türetmez. Değerler pozitif mm veya birimsiz ondalık olabilir; virgül desteklenir.
Çelişen tekrar, negatif/sıfır, aralık, bozuk metin ve başka birim çizimi iptal eder.
Eşit tekrar kabul edilir. ctx.data ve onyazi ölçü kaynağı değildir.
Gerekli ölçü yoksa null; uygulamaya sahte ölçü veya varsayılan ölçü gönderilmez.
TSN her zaman null; yalnız mil çapı keçe kesiti için yeterli değildir.

SSUCP/SUCP→UCP, SSUCF/SUCF→UCF, SSUCFL/SUCFL→UCFL,
SSUCFC/SUCFC→UCFC, SSUCT/SUCT→UCT delegasyonu:
ctx kopyalanır, başlık ör. `UCF 205 Yataklı Rulman`, specs/onyazi boşaltılır,
yalnız ölçü harfleri data'ya aktarılır. yatakli yoksa null. Gelen ctx değişmez.
Yeni modül alfabetik olarak yatakli'den önce seçilir.

Bağımsız çizimler ön görünüş ve kesit A-A, 460×260 viewBox, tarama, eksenler,
ölçü çizgisi/ok/yazıyı kapsayan data-k grupları üretir. Tarama/marker ID'leri opt.id önekli,
ölçü rengi opt.dim'dir. Ölçülendirilmemiş iç profil, bilye, gövde ve kanal şekilleri şematiktir;
imalat resmi veya üretici profil replikası değildir. Ekrandaki ölçü sayıları yalnız specs'tendir.

## İçerik etiketleri — birebir kullanılacak metinler

Metadata: `Seri: SSUCF`, `Numara: 205`. Aşağıda her hücre ayrı etiket/metindir;
değer örneği `25 mm`. HTML: `<li><strong>Mil Çapı (d):</strong> 25 mm</li>`.

### yatakli LBL ile birebir ortak ünite etiketleri

| Alt tip | Etiketler |
|---|---|
| UCP | Mil Çapı (d); Merkez Yüksekliği (H); Toplam Yükseklik (H2); Taban Uzunluğu (L); Cıvata Aralığı (J); Taban Genişliği (A); Cıvata Deliği (N); İç Bilezik Genişliği (B) |
| UCF | Mil Çapı (d); Flanş Kenarı (L); Cıvata Aralığı (J); Gövde Genişliği (A); İç Bilezik Genişliği (B) |
| UCFL | Mil Çapı (d); Flanş Boyu (H); Flanş Genişliği (L); Cıvata Aralığı (J); Gövde Genişliği (A); İç Bilezik Genişliği (B) |
| UCFC | Mil Çapı (d); Flanş Dış Çapı (L); Cıvata Dairesi (J); Pilot Çapı (H3); İç Bilezik Genişliği (B) |
| UCT | Mil Çapı (d); Gövde Yüksekliği (H); Toplam Uzunluk (L); Kızak Ucu - Merkez (L1); Kızak Yüksekliği (H2); Gergi Deliği (N); Gövde Genişliği (A); İç Bilezik Genişliği (B) |

Bu adlar SS/SU aliasları için de geçerlidir. Ekstra ölçü zorunlu değildir.

### Diğer aileler

| Aile | Zorunlu etiketler |
|---|---|
| SUC/UC insert | Mil Çapı (d); Dış Çap (D); Mil Bil. Genişliği (B); Yuva Bil. Genişliği (C); Mil Bil. Ucu - Merkez (S) |
| FRB | Dış Çap (D); İç Çap (d1); Bilezik Genişliği (B) |
| SN — NTN sembolleri | Manşonlu Mil Çapı (d1); Rulman Yuvası Çapı (D); Merkez Yüksekliği (H); Taban Yüksekliği (H1); Toplam Yükseklik (H2); Cıvata Aralığı (J); Taban Uzunluğu (L); Toplam Genişlik (A); Taban Genişliği (A1); Cıvata Deliği (N); Kapak Cıvatası Aralığı (g) |
| UCFB / SSUCFB / SUCFB | Mil Çapı (d); Toplam Boy (w); Merkez - Alt Uç (A); Üst Gövde Genişliği (b); Alt Gövde Genişliği (D); Montaj Yüzeyi - Merkez (i); Gövde Derinliği (l); Cıvata Deliği (s); Taban Kalınlığı (g); Merkez - Delik Hattı (h); Delik Hatları Arası (j); Cıvata Aralığı (e); Montaj Derinliği (Z) |
| UCPA / SUCPA / SSUCPA | Mil Çapı (d); Merkez Yüksekliği (H); Toplam Yükseklik (H2); Taban Uzunluğu (L); Cıvata Aralığı (J); Gövde Genişliği (A); Dişli Delik Çapı (N); Mil Bil. Genişliği (B) |
| SSBF / S-SBF | Mil Çapı (d); Taban Uzunluğu (L); Cıvata Aralığı (J); Gövde Genişliği (A); Mil Bil. Genişliği (B) |
| SSBP / S-SBP | Mil Çapı (d); Merkez Yüksekliği (H); Toplam Yükseklik (H2); Taban Uzunluğu (L); Cıvata Aralığı (J); Gövde Genişliği (A); Cıvata Deliği (N); Mil Bil. Genişliği (B) |
| SSBT / S-SBT | Mil Çapı (d); Gövde Genişliği (A); Merkez Yüksekliği (H); Toplam Yükseklik (H2); Taban Uzunluğu (L); Kızak Ucu - Merkez (L1); Cıvata Deliği (N); Mil Bil. Genişliği (B) |
| TSN | Mil Çapı (d) — metadata; çizim üretilmez |

S-SB ve UCPA etiketleri gelecekte doğrulanmış ölçü geldiğinde kullanılacak çizici sözleşmesidir;
henüz bu ürünlere katalog ölçüsü bulunduğu iddiası değildir. UCPA N, mm cinsinden diş çapıdır;
`M10` metni mm ölçüsü olarak ayrıştırılmaz. UCFB D, insert dış çapı değildir.
Mil bil./yuva bil. kısaltmaları insert iç/dış bileziklerini ifade eder; C bir yük değeri değildir.

## Gerçek veri ve fixture kapsamı

`fixtures/yatak.json`: 21 alt serinin her birinden iki gerçek ürün = 42 ctx, ayrıca 6 negatif.
Path'ler /ornek- ile başlayan test URL'leridir, gerçek mağaza sayfası oldukları iddia edilmez.
Her gerçek ctx'de kaynak ürün kodu, kaynak URL'leri ve eksik bayrağı var.
Araştırma girdisi: /home/ubuntu/work/yatak/teknik.json; bu adımda değiştirilmedi.
Sayılar FK, PEER, CRAFT, NTN ve SKF resmi tablolarından önceki araştırmada alınmıştır.
PEER PBT ve FK varyantları ORKAPT imalat eşitliği değildir.

| Alt seri | Fixture | Çizim | Durum |
|---|---:|---:|---|
| SSUCP, SSUCF, SSUCFL, SSUCFC, SSUCT | her biri 2 | her biri 2 | FK, yatakli delegasyonu |
| SSUCFB | 2 | 2 | PEER, bağımsız üç delikli flanş |
| SUCP, SUCF | her biri 2 | her biri 2 | PEER PBT karşılaştırma, delegasyon |
| SUCFB | 2 | 2 | PEER PBT karşılaştırma, bağımsız |
| SUC, UC | her biri 2 | her biri 2 | CRAFT insert, ön + kesit |
| SN | 2 | 2 | NTN gövde geometrisi; SKF alternatifleri karıştırılmadı |
| FRB | 2 | 2 | SKF D/iç çap/B |
| SUCFC, SUCFL, SUCPA, SSBF, SSBP, SSBT | her biri 2 | 0 | boş veri, eksik=true |
| SUCT | 2 | 0 | PEER slot N yok, eksik=true |
| TSN | 2 | 0 | ortak mil çapı var, kesit yok |
| Negatif | 6 | 0 | eski etiket, bilinmeyen seri, eksik/çelişen ölçü, inç, boş |

Gerçek ürün fixture'larında toplam26 çizim/22 null. Kaynağı olmayan ölçü eklenmedi.
UCPA/S-SB bağımsız çizici dalları yalnız açıkça sentetik sözleşme testleriyle çalıştırıldı;
gerçek ürün çizimi veya doğrulanmış üretim çizimi diye sunulmaz.
SSUCFL araştırma aliaslarındaki H/L, mevcut yatakli LBL anlamıyla ters:
fixture üretiminde uzun FK a→H, kısa FK b→L kullanıldı (205: H130,L68,J99mm).
Araştırma dosyasındaki yanlış isimli alias aynen kopyalanmadı, kaynak değer değiştirilmedi.

Temel kaynaklar:
- https://www.fk-bearing.com/cn/products/SS-UCF200/740.html (diğer FK aile URL'leri fixture'da)
- https://peerbearing.com/wp-content/uploads/peer_mounted_units_catalog.pdf
- https://www.craft-bearings.com/uploads/files/b64cebd8fb9b4c798a8cf85d9359838e.pdf
- https://www.ntn.co.jp/japan/products/catalog/pdf/2203_g01.pdf
- https://cdn.skfmediahub.skf.com/api/public/0901d196801106cc/pdf_preview_medium/0901d196801106cc_pdf_preview_medium.pdf

## Kontroller

Komut: `node site/draw/fixtures/yatak.test.js` (Node24; XML doğrulama Python3 standart kütüphanesi).
Ortamda Node PATH'e otomatik eklenmemişti; NVM kurulumundaki node mutlak yolu kullanıldı.

```text
PASS: legacy fixtures 725; yatak.match=true: 0
PASS: yatak fixtures 48; drawings 26; null 22
PASS: competing modules baglanti=0, bilyali=0, eksenel=0, kece=0, konik=0, lineer=0, makarali=0
PASS: 30 SVG contracts; keys/data-k, prefix IDs, missing/error/duplicate cases, immutable delegation
PASS: SVG XML valid
```

Tüm eski fixture'larda yatak.draw=null kontrol edilir. Yeni fixture'larda diğer yedi modül false;
TSN `Yatak Keçesi` başlığı yağ-keçesi modülüne, insert kategorisi bilyalı modülüne takılmadı.
Çakışma yok, diğer modüllerde değişiklik gerekmedi. İçerik üretiminde kategoriler fixture'lardaki
gibi YATAKLI RULMAN / INSERT RULMAN / YATAK KEÇESİ olarak korunmalı.
ES5 sözdizimi kısıtı, kırmızı opt.dim, aynı tekrar, geçersiz birim, her ölçüyü tek tek silme,
aynı ctx'nin değişmemesi ve delegasyon bağımlılığının yokluğu da test edilir.

## Görsel kanıt

Chrome156 headless, gerçek 460 ve360 viewport; 42 ürünün iki genişlikte84 PNG'si preview/yatak altında.
Önizleme: preview/yatak.html; tek ürün için ?case=0&w=360.
Ölçü kartına tıklama data-k grubunu kırmızı yapar; ilk çekimde etkileşim doğrulandı.
İlk tam çekimde SVG text kutusu çakışması0; insert profil iyileştirmesinden sonra görseller yenilendi.
SN360, UCFB460, insert360, UCFL360 ve FRB460 görüntüleri ayrıca gözle incelendi.

- preview/yatak/sn-506-360.png
- preview/yatak/ssucfb-205-460.png
- preview/yatak/suc-205-360.png
- preview/yatak/ssucfl-205-360.png
- preview/yatak/frb-10110-460.png

Görseller ürün sayfası entegrasyonunu veya üretim toleranslarını doğrulamaz.

## Kalite revizyonu

Referanslar: preview/yatakli/ucp-201-fag-yatakli-rulman-17867-460.png ve
preview/bilyali/w360-c0.png. Bu referans dosyalar ve modülleri değiştirilmedi.

- Ölçü gruplarındaki harf önekleri kaldırıldı: yalnız sayı; çaplar ø ile.
  UCFB'nin D ölçüsü gövde genişliği olduğu için çap işareti almaz.
- SN: taban ayakları, eksendeki kapak/alt gövde ayrımı, kapak cıvataları,
  J/N taban delikleri, gizli D yuva çizgisi ve d1 mil açıklığı yeniden çizildi.
  Kesitte taranmış gövde, D yüksekliğinde yuva boşluğu, iki yanda kademeli keçe
  kanalları ve eksen var. D ölçüsü boşluğun içinde dikey; gövdeyi çaprazlayan
  eski D kılavuzu yok. H/H1/H2, A/A1 ve g ayrı dış ölçü hatlarına taşındı.
- UCFB: gövde taralı, küresel yatak yuvasına oturan dış bilezik ve asimetrik
  iç bilezik kesitleri ayrı dolu taralı profiller. Bilye ve vida detayı var.
  S deliğinin kılavuzu sol tarafa, j ölçüsü sağ tarafa alındı; kesişmezler.
- SUC/UC: küresel dış bilezik, bilyeye oturan yay biçimli bilezik kanalları,
  B genişliğinde asimetrik iç bilezik, kesitte vida deliği ve ön görünüşte
  setuskur çizildi. B/C/S ve ød/øD yalnız spec değerlerini gösterir.
- FRB: ön görünüşte iki çaplı halka, kesitte B genişliğinde taralı dikdörtgenler.
- UCPA ve S-SB dalları aynı ortak dolu bilezik/bilye/küresel yuva çizicisini kullanır.
  Gövde ve insert taramalarının yönleri farklıdır.

Profil, bilye adedi/çapı, kanal ve vida şekli ölçülendirilmemiş şematik detaydır;
yeni ürün ölçüsü veya tolerans türetilmedi. Araştırma verisi ve gerçek fixture'lar
değişmedi; eksik verili gerçek UCPA/S-SB ürünleri halen null döner.

### Son kontroller

```text
PASS: legacy fixtures 725; yatak.match=true: 0
PASS: yatak fixtures 48; drawings 26; null 22
PASS: competing modules baglanti=0, bilyali=0, eksenel=0, kece=0, konik=0, lineer=0, makarali=0
PASS: 30 SVG contracts; keys/data-k, prefix IDs, missing/error/duplicate cases, immutable delegation
PASS: SVG XML valid
PASS: numeric-only dimensions, diameter prefixes, filled hatched races, balls and set screws
SCREENSHOTS: captured selected fixtures at 460/360
TEXT OVERLAPS: []
PASS: preview key button highlights dimension group
PASS: 8 explicitly synthetic UCPA/S-SB viewport captures
TEXT OVERLAPS: []
```

Mevcut42 ürünün84 PNG'sinin tamamı yeniden üretildi. Değişmeyen delegasyon
çizimleri piksel olarak aynı kaldığından git farkı oluşturmayabilir.
UCPA/SSBF/SSBP/SSBT için sekiz ek test PNG'si eklendi: contract-*-460.png,
contract-*-360.png. Bunların başlıkları **SENTETİK TEST, gerçek ürün değil**;
preview/yatak.html?contract=UCPA&w=360 gibi adreslerle tekrar açılır.

SN, SSUCFB, SUC ve FRB 360px'te; UCFB/insert 460px'te; dört sentetik dal
360px'te ayrıca gözle incelendi. Son çap işareti değişikliğinden sonraki
Chrome text kutusu kontrolünde de kesişme yok.

İstenen 460px kanıtları:
- preview/yatak/sn-506-460.png
- preview/yatak/ssucfb-205-460.png
- preview/yatak/suc-205-460.png
- preview/yatak/frb-10110-460.png
