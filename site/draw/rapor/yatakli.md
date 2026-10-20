# yatakli — teknik çizim modülü raporu

Modül: `site/draw/yatakli.js` · veri: `site/draw/data/yatakli.json` · fixture: `site/draw/fixtures/yatakli.json` · önizleme: `site/draw/preview/yatakli.html` (+ `preview/yatakli/*-460.png`, `*-360.png`).

## Alt tipler ve çizimler

| Seri | Çizim | Gerekli ölçüler (hepsi yoksa null) | Ekstra |
|---|---|---|---|
| UCP | Ayaklı yatak (S: vida-bilezik ucu da yazılır): ön görünüş (taban, cıvata delikleri gizli çizgi, gövde, gres nipeli) + kesit A-A | d, H, H2, L, J, A, N, B | — |
| KP (minyatür) | Ayaklı (zamak) yatak: ön görünüş + kesit | d, H, L, J | — |
| UCF | 4 delikli kare flanş: ön görünüş + kesit (flanş levhası + göbek) | d, L, J, A, B | 4 × M (cıvata) |
| UCFL | 2 delikli oval flanş: ön görünüş + kesit | d, H, L, J, A, B | 2 × M |
| KFL (minyatür) | 2 delikli oval flanş | d, H, L, J | 2 × M |
| UCFC | Yuvarlak pilotlu flanş: ön görünüş (cıvata dairesi, 4 delik) + kesit (pilot çapı) | d, L(ø), J(ø), H3(ø), B | 4 × M |
| UCT | Germe (gergi) yatağı: ön görünüş (gövde + gergi kızağı, gergi deliği gizli çizgi) + kesit | d, A, H, H2, L, L1, N, B | — |

Rulman insert küre dış çapı, levha kalınlığı gibi tabloda olmayan şekil oranları sadece çizimi orantılı yapmak için kullanılır; ekrana sayı olarak yazılmaz. Ekrana yazılan her sayı ürünün kendi fotoğrafındaki ölçü tablosundan (data json) ya da sayfadaki "Mil Çapı" özelliğinden gelir; ikisi çelişirse çizim çıkmaz.

## Kapsam (ölçülen)

- `products.json` (13.103 URL) içinden yataklı aday 322 sayfa tarayıcıyla açıldı (+27 başka aile negatif örnek).
- `match()` = true: 318 ürün. Bunların 186 tanesinde çizim çıkıyor (gerekli ölçülerin tamamı ürünün kendi 2./3. fotoğrafındaki tabloda net okunuyor).
- Sayfa özelliklerinde (#divTabOzellikler / #divOnyazi) ölçü olan ürün: 15 (sadece minyatür KFL/KP'de "Mil Çapı"). Diğerlerinde ölçü yalnız fotoğraftaki tabloda.

| Seri | Ürün (match) | Çizim çıkan |
|---|---|---|
| KFL | 8 | 8 |
| KP | 7 | 7 |
| SBPF | 3 | 0 |
| SBPFL | 10 | 0 |
| SBPFT | 3 | 0 |
| SBPP | 3 | 0 |
| SNH | 40 | 0 |
| SSKFL | 7 | 0 |
| SSKP | 7 | 0 |
| UC | 3 | 0 |
| UCF | 36 | 35 |
| UCFA | 14 | 0 |
| UCFB | 7 | 0 |
| UCFC | 34 | 32 |
| UCFL | 35 | 34 |
| UCHA | 7 | 0 |
| UCP | 40 | 39 |
| UCPA | 14 | 0 |
| UCPH | 7 | 0 |
| UCT | 33 | 31 |

## Emin olunamayanlar / çizim çıkmayanlar

- SNH / SN / SNL yatak setleri (40 ürün): sayfalarda tek fotoğraf var, ölçü tablosu yok, özelliklerde ölçü yok → çizim yok (null). SN split yatak çizimi bu yüzden eklenmedi; veri gelince eklenebilir.
- UCPA, UCPH, UCFA, UCFB, UCHA, SBPF/SBPFL/SBPFT/SBPP (sac), SSKFL/SSKP, UC (yalnız insert): ikinci fotoğraf ya yok ya da ürün resmi/ölçüsüz FAG şeması → null. UKP/UKF sitede bulunamadı.
- UCT 218: tabloda satır boş (–) → null. Tablosu olmayan birkaç UCP/UCF/UCFC/UCFL/UCT ürünü (yalnız 1 fotoğraf) → null.
- S (sıkma vidası ekseni – iç bilezik ucu): tablodaki yan görünüşte bu şekilde gösteriliyor; UCP/UCT/UCF/UCFL/UCFC kesitlerinde vida bu konumda çizilip S yazılıyor. A1, A2 sütunları (yan görünüşteki toplamları A ile tutmuyor) ve KFL/KP tablosundaki B, S sütunları anlamı kesin olmadığı için yazılmıyor; KFL/KP kesitinde insert genişliği sadece şekil oranıdır.
- Kesit A-A, tablodaki yan görünüş gibi çizilir: gövde (taban/flanş dahil) tek parça taralı, insert küresel yuvaya oturmuş (dış bilezik, bilyeler, B genişliğinde iç bilezik, vida). Gövde genişliği, flanş kalınlığı gibi tabloda olmayan oranlar ekrana sayı olarak yazılmaz.
- FAG ürünlerinin tablo fotoğrafları YMN tablolarıyla piksel olarak aynı (fark yalnız sıkıştırma) — aynı değerler kullanıldı.

## Fotoğraftan okunan ölçüler — kaynak fotoğraf

| Ürün | Kaynak foto |
|---|---|
| /kfl000-ymn-minyatur-yatakli-rulman-10-mm-14005 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/kfl000-minyatur-yatakli-rulman-10-mm--29a8-.jpeg |
| /kfl001-ymn-minyatur-yatakli-rulman-12-mm-14006 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/kfl001-minyatur-yatakli-rulman-12-mm-0-12a5.jpeg |
| /kfl002-ymn-minyatur-yatakli-rulman-15-mm-14007 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/kfl002-minyatur-yatakli-rulman-15-mm-72c-01.jpeg |
| /kfl003-ymn-minyatur-yatakli-rulman-17-mm-14008 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/kfl003-minyatur-yatakli-rulman-17-mm-53-a7f.jpeg |
| /kfl004-ymn-minyatur-yatakli-rulman-20-mm-14009 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/kfl004-minyatur-yatakli-rulman-20-mm-f-442d.jpeg |
| /kfl005-ymn-minyatur-yatakli-rulman-25-mm-14010 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/kfl005-minyatur-yatakli-rulman-25-mm--41b8-.jpeg |
| /kfl006-ymn-minyatur-yatakli-rulman-30-mm-14011 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/kfl006-minyatur-yatakli-rulman-30-mm-f51-8b.jpeg |
| /kfl007-ymn-minyatur-yatakli-rulman-35-mm-14012 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/kfl007-minyatur-yatakli-rulman-35-mm--4bab9.jpeg |
| /kp000-ymn-minyatur-yatakli-rulman-10-mm-14013 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/kp000-minyatur-yatakli-rulman-10-mm-d9d64b.jpeg |
| /kp001-ymn-minyatur-yatakli-rulman-12-mm-14014 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/kp001-minyatur-yatakli-rulman-12-mm-efb-f2.jpeg |
| /kp002-ymn-minyatur-yatakli-rulman-15-mm-14015 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/kp002-minyatur-yatakli-rulman-15-mm-cd0e-4.jpeg |
| /kp003-ymn-minyatur-yatakli-rulman-17-mm-14016 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/kp003-minyatur-yatakli-rulman-17-mm-7-44d0.jpeg |
| /kp004-ymn-minyatur-yatakli-rulman-20-mm-14017 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/kp004-minyatur-yatakli-rulman-20-mm--8c8b0.jpeg |
| /kp005-ymn-minyatur-yatakli-rulman-25-mm-14018 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/kp005-minyatur-yatakli-rulman-25-mm-908-1e.jpeg |
| /kp006-ymn-minyatur-yatakli-rulman-30-mm-14019 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/kp006-minyatur-yatakli-rulman-30-mm-e-4604.jpeg |
| /ucf-201-fag-yatakli-rulman-17907 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-201-fag-yatakli-rulman-89e3-4.png |
| /ucf-202-fag-yatakli-rulman-17908 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-202-fag-yatakli-rulman-fce7-4.png |
| /ucf-203-fag-yatakli-rulman-17909 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-203-fag-yatakli-rulman-7-ac95.png |
| /ucf-204-fag-yatakli-rulman-17910 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-204-fag-yatakli-rulman-fe3d9-.png |
| /ucf-205-fag-yatakli-rulman-17911 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-205-fag-yatakli-rulman-f65-c7.png |
| /ucf-206-fag-yatakli-rulman-17912 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-206-fag-yatakli-rulman-a86156.png |
| /ucf-207-fag-yatakli-rulman-17913 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-207-fag-yatakli-rulman-a14e-9.png |
| /ucf-208-fag-yatakli-rulman-17914 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-208-fag-yatakli-rulman-48ef-a.png |
| /ucf-209-fag-yatakli-rulman-17915 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-209-fag-yatakli-rulman-b99d-2.png |
| /ucf-210-fag-yatakli-rulman-17916 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-210-fag-yatakli-rulman-24b-46.png |
| /ucf-211-fag-yatakli-rulman-17917 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-211-fag-yatakli-rulman-3d0-f5.png |
| /ucf-212-fag-yatakli-rulman-17918 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-212-fag-yatakli-rulman-20d3f-.png |
| /ucf-213-fag-yatakli-rulman-17919 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-213-fag-yatakli-rulman-4-abf7.png |
| /ucf-214-fag-yatakli-rulman-17920 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-214-fag-yatakli-rulman-9715-b.png |
| /ucf-215-fag-yatakli-rulman-17921 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-215-fag-yatakli-rulman-4d61-8.png |
| /ucf-216-fag-yatakli-rulman-17922 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-216-fag-yatakli-rulman-fcbafd.png |
| /ucf-217-fag-yatakli-rulman-17923 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucf-217-fag-yatakli-rulman-8-8f3f.png |
| /ucfc-204-fag-yatakli-rulman-17834 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfc-204-fag-yatakli-rulman-49-45d.png |
| /ucfc-206-fag-yatakli-rulman-17836 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfc-206-fag-yatakli-rulman-2e6cba.png |
| /ucfc-207-fag-yatakli-rulman-17837 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfc-207-fag-yatakli-rulman-a0be-a.png |
| /ucfc-208-fag-yatakli-rulman-17838 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfc-208-fag-yatakli-rulman-c9-9ef.png |
| /ucfc-209-fag-yatakli-rulman-17839 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfc-209-fag-yatakli-rulman-05a-47.png |
| /ucfc-210-fag-yatakli-rulman-17840 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfc-210-fag-yatakli-rulman-8a-19f.png |
| /ucfc-211-fag-yatakli-rulman-17841 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfc-211-fag-yatakli-rulman-61dee2.png |
| /ucfc-212-fag-yatakli-rulman-17842 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfc-212-fag-yatakli-rulman-e7a-19.png |
| /ucfc-213-fag-yatakli-rulman-17843 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfc-213-fag-yatakli-rulman-b5-478.png |
| /ucfc-214-fag-yatakli-rulman-17844 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfc-214-fag-yatakli-rulman-729c0d.png |
| /ucfc-215-fag-yatakli-rulman-17845 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfc-215-fag-yatakli-rulman-1bf-58.png |
| /ucfc-216-fag-yatakli-rulman-17846 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfc-216-fag-yatakli-rulman--30db5.png |
| /ucfc-217-fag-yatakli-rulman-17847 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfc-217-fag-yatakli-rulman-0-44fd.png |
| /ucfl-201-fag-yatakli-rulman-17849 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-201-fag-yatakli-rulman-48c0b1.png |
| /ucfl-202-fag-yatakli-rulman-17850 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-202-fag-yatakli-rulman-4a7d18.png |
| /ucfl-203-fag-yatakli-rulman-17851 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-203-fag-yatakli-rulman-e-9e0d.png |
| /ucfl-204-fag-yatakli-rulman-17852 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-204-fag-yatakli-rulman-d61258.png |
| /ucfl-205-fag-yatakli-rulman-17853 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-205-fag-yatakli-rulman-b13d-2.png |
| /ucfl-207-fag-yatakli-rulman-17855 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-207-fag-yatakli-rulman--e51d-.png |
| /ucfl-208-fag-yatakli-rulman-17856 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-208-fag-yatakli-rulman-fc2-b8.png |
| /ucfl-209-fag-yatakli-rulman-17857 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-209-fag-yatakli-rulman-40c7b2.png |
| /ucfl-210-fag-yatakli-rulman-17858 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-210-fag-yatakli-rulman-3-b10d.png |
| /ucfl-211-fag-yatakli-rulman-17859 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-211-fag-yatakli-rulman-b7b-e8.png |
| /ucfl-212-fag-yatakli-rulman-17860 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-212-fag-yatakli-rulman-caba9f.png |
| /ucfl-213-fag-yatakli-rulman-17861 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-213-fag-yatakli-rulman-5649c7.png |
| /ucfl-214-fag-yatakli-rulman-17862 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-214-fag-yatakli-rulman-84bb2a.png |
| /ucfl-215-fag-yatakli-rulman-17863 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-215-fag-yatakli-rulman-df1-b6.png |
| /ucfl-216-fag-yatakli-rulman-17864 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-216-fag-yatakli-rulman--6b81b.png |
| /ucfl-217-fag-yatakli-rulman-17865 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-217-fag-yatakli-rulman-25-aff.png |
| /ucfl-218-fag-yatakli-rulman-17866 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucfl-218-fag-yatakli-rulman-309-af.png |
| /ucp-201-fag-yatakli-rulman-17867 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-201-fag-yatakli-rulman-b3ed0d.png |
| /ucp-202-fag-yatakli-rulman-17868 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-202-fag-yatakli-rulman--b942-.png |
| /ucp-203-fag-yatakli-rulman-17869 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-203-fag-yatakli-rulman-31-47b.png |
| /ucp-204-fag-yatakli-rulman-17870 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-204-fag-yatakli-rulman-3a674-.png |
| /ucp-205-fag-yatakli-rulman-17871 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-205-fag-yatakli-rulman-dc9959.png |
| /ucp-206-fag-yatakli-rulman-17872 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-206-fag-yatakli-rulman-a-b15b.png |
| /ucp-207-fag-yatakli-rulman-17873 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-207-fag-yatakli-rulman-9e61-6.png |
| /ucp-208-fag-yatakli-rulman-17874 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-208-fag-yatakli-rulman-9740d9.png |
| /ucp-209-fag-yatakli-rulman-17875 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-209-fag-yatakli-rulman-4f8bc9.png |
| /ucp-210-fag-yatakli-rulman-17876 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-210-fag-yatakli-rulman-1b-8a8.png |
| /ucp-211-fag-yatakli-rulman-17877 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-211-fag-yatakli-rulman--1ae07.png |
| /ucp-212-fag-yatakli-rulman-17878 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-212-fag-yatakli-rulman-d54-40.png |
| /ucp-213-fag-yatakli-rulman-17879 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-213-fag-yatakli-rulman-22-212.png |
| /ucp-214-fag-yatakli-rulman-17880 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-214-fag-yatakli-rulman-ce-4ec.png |
| /ucp-215-fag-yatakli-rulman-17881 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-215-fag-yatakli-rulman-4024-a.png |
| /ucp-216-fag-yatakli-rulman-17882 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-216-fag-yatakli-rulman-7a3-a5.png |
| /ucp-217-fag-yatakli-rulman-17883 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/ucp-217-fag-yatakli-rulman-a4f-a5.png |
| /uct-204-fag-yatakli-rulman-17892 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/uct-204-fag-yatakli-rulman-e309ea.png |
| /uct-205-fag-yatakli-rulman-17893 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/uct-205-fag-yatakli-rulman-2ae-46.png |
| /uct-206-fag-yatakli-rulman-17894 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/uct-206-fag-yatakli-rulman--437c-.png |
| /uct-207-fag-yatakli-rulman-17895 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/uct-207-fag-yatakli-rulman-e48fc2.png |
| /uct-208-fag-yatakli-rulman-17896 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/uct-208-fag-yatakli-rulman--9356-.png |
| /uct-209-fag-yatakli-rulman-17897 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/uct-209-fag-yatakli-rulman-bb98c8.png |
| /uct-210-fag-yatakli-rulman-17898 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/uct-210-fag-yatakli-rulman-108-8b.png |
| /uct-211-fag-yatakli-rulman-17899 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/uct-211-fag-yatakli-rulman--83fb-.png |
| /uct-212-fag-yatakli-rulman-17900 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/uct-212-fag-yatakli-rulman-3f-4f8.png |
| /uct-213-fag-yatakli-rulman-17901 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/uct-213-fag-yatakli-rulman-9f-f09.png |
| /uct-214-fag-yatakli-rulman-17902 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/uct-214-fag-yatakli-rulman-012af0.png |
| /uct-215-fag-yatakli-rulman-17903 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/uct-215-fag-yatakli-rulman-b18-a8.png |
| /uct-216-fag-yatakli-rulman-17904 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/uct-216-fag-yatakli-rulman-24664-.png |
| /uct-217-fag-yatakli-rulman-17905 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/uct-217-fag-yatakli-rulman-27e993.png |
| /ymn-yatakli-rulman-ucf-201-16731 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-201-820-47.png |
| /ymn-yatakli-rulman-ucf-202-16732 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-202-d86e51.png |
| /ymn-yatakli-rulman-ucf-203-16733 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-203-219-97.png |
| /ymn-yatakli-rulman-ucf-204-16734 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-204-b8-eb2.png |
| /ymn-yatakli-rulman-ucf-205-16735 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-205--d2452.png |
| /ymn-yatakli-rulman-ucf-206-16736 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-206-a53f-b.png |
| /ymn-yatakli-rulman-ucf-207-16737 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-207--eb366.png |
| /ymn-yatakli-rulman-ucf-208-16738 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-208-d2-49b.png |
| /ymn-yatakli-rulman-ucf-209-16739 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-209-10-84c.png |
| /ymn-yatakli-rulman-ucf-210-16740 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-210-b25f99.png |
| /ymn-yatakli-rulman-ucf-211-16741 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-211-10e-84.png |
| /ymn-yatakli-rulman-ucf-212-16742 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-212-e176b5.png |
| /ymn-yatakli-rulman-ucf-213-16743 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-213-49d-9b.png |
| /ymn-yatakli-rulman-ucf-214-16744 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-214-51-409.png |
| /ymn-yatakli-rulman-ucf-215-16745 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-215-5f2918.png |
| /ymn-yatakli-rulman-ucf-216-16746 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-216--8813-.png |
| /ymn-yatakli-rulman-ucf-217-16747 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-217-730-ec.png |
| /ymn-yatakli-rulman-ucf-218-16748 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucf-218-85-42d.png |
| /ymn-yatakli-rulman-ucfc-204-16631 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-204--7009-.png |
| /ymn-yatakli-rulman-ucfc-205-16632 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-205-4ab2-a.png |
| /ymn-yatakli-rulman-ucfc-206-16633 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-206--4dc8-.png |
| /ymn-yatakli-rulman-ucfc-207-16634 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-207-44bf-b.png |
| /ymn-yatakli-rulman-ucfc-207-fk-16646 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-207-fk--4f42-.png |
| /ymn-yatakli-rulman-ucfc-208-16635 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-208-fa-bb7.png |
| /ymn-yatakli-rulman-ucfc-209-16636 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-209-294cf7.png |
| /ymn-yatakli-rulman-ucfc-210-16637 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-210-1d6bc4.png |
| /ymn-yatakli-rulman-ucfc-210-fk-16647 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-210-fk-20-4bf.png |
| /ymn-yatakli-rulman-ucfc-211-16638 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-211-d9-7cc.png |
| /ymn-yatakli-rulman-ucfc-211-fk-16648 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-211-fk-1c1-1f.png |
| /ymn-yatakli-rulman-ucfc-212-16639 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-212-9dd-5b.png |
| /ymn-yatakli-rulman-ucfc-213-16640 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-213-b658-7.png |
| /ymn-yatakli-rulman-ucfc-213-fk-16649 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-213-fk-626-43.png |
| /ymn-yatakli-rulman-ucfc-214-16641 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-214-0f-af4.png |
| /ymn-yatakli-rulman-ucfc-215-16642 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-215-986403.png |
| /ymn-yatakli-rulman-ucfc-216-16643 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-216-16a-5e.png |
| /ymn-yatakli-rulman-ucfc-217-16644 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-217-c0d0fd.png |
| /ymn-yatakli-rulman-ucfc-218-16645 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfc-218-8037-d.png |
| /ymn-yatakli-rulman-ucfl-201-16650 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-201-1314-d.png |
| /ymn-yatakli-rulman-ucfl-202-16651 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-202-8-dcad.png |
| /ymn-yatakli-rulman-ucfl-203-16652 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-203-b09274.png |
| /ymn-yatakli-rulman-ucfl-204-16653 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-204--3243f.png |
| /ymn-yatakli-rulman-ucfl-205-16654 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-205-0a0ca1.png |
| /ymn-yatakli-rulman-ucfl-206-16655 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-206-47fd-c.png |
| /ymn-yatakli-rulman-ucfl-207-16656 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-207-af-9f0.png |
| /ymn-yatakli-rulman-ucfl-207-fk-16664 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-207-fk-8a38e1.png |
| /ymn-yatakli-rulman-ucfl-208-16657 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-208-714-8b.png |
| /ymn-yatakli-rulman-ucfl-208-fk-16665 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-208-fk--9157-.png |
| /ymn-yatakli-rulman-ucfl-209-16658 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-209-23d6ad.png |
| /ymn-yatakli-rulman-ucfl-210-16659 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-210-c2-488.png |
| /ymn-yatakli-rulman-ucfl-211-16660 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-211-a-b27a.png |
| /ymn-yatakli-rulman-ucfl-212-16661 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-212-2c3fe3.png |
| /ymn-yatakli-rulman-ucfl-212-fk-16666 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-212-fk-a-80f3.png |
| /ymn-yatakli-rulman-ucfl-213-16662 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-213-0321-0.png |
| /ymn-yatakli-rulman-ucfl-214-16663 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucfl-214-9-c516.png |
| /ymn-yatakli-rulman-ucp-201-16674 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-201-1bbc43.png |
| /ymn-yatakli-rulman-ucp-201-dokum-yatagi204-16675 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-201-dokum-yatagi204-39-43a.png |
| /ymn-yatakli-rulman-ucp-202-16676 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-202-45d-46.png |
| /ymn-yatakli-rulman-ucp-202-dokum-yatagi204-16677 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-202-dokum-yatagi204--b464-.png |
| /ymn-yatakli-rulman-ucp-203-16678 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-203-d91-4c.png |
| /ymn-yatakli-rulman-ucp-204-16679 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-204-4f25-9.png |
| /ymn-yatakli-rulman-ucp-205-16680 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-205-4537-8.png |
| /ymn-yatakli-rulman-ucp-206-16681 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-206-03-b4a.png |
| /ymn-yatakli-rulman-ucp-207-ege-marka-16682 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-207-ege-marka-0d162f.png |
| /ymn-yatakli-rulman-ucp-208-16683 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-208-26cc-4.png |
| /ymn-yatakli-rulman-ucp-208-fk-16694 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-208-fk-ff3836.png |
| /ymn-yatakli-rulman-ucp-209-16684 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-209-554-be.png |
| /ymn-yatakli-rulman-ucp-209-fk-16695 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-209-fk--fd30d.png |
| /ymn-yatakli-rulman-ucp-210-16685 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-210-e-98b5.png |
| /ymn-yatakli-rulman-ucp-211-16686 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-211-45d7-9.png |
| /ymn-yatakli-rulman-ucp-212-16687 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-212-7b1b2d.png |
| /ymn-yatakli-rulman-ucp-213-16688 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-213-3-7e2d.png |
| /ymn-yatakli-rulman-ucp-214-16689 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-214-33c958.png |
| /ymn-yatakli-rulman-ucp-215-16690 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-215-98-095.png |
| /ymn-yatakli-rulman-ucp-216-16691 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-216-dfb3-4.png |
| /ymn-yatakli-rulman-ucp-217-16692 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-217-1-bdae.png |
| /ymn-yatakli-rulman-ucp-218-16693 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-ucp-218-4a56-b.png |
| /ymn-yatakli-rulman-uct-204-16710 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-204-30018a.png |
| /ymn-yatakli-rulman-uct-205-16711 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-205-1-4d37.png |
| /ymn-yatakli-rulman-uct-206-16712 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-206-80f32d.png |
| /ymn-yatakli-rulman-uct-206-fk-16728 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-206-fk-263a9e.png |
| /ymn-yatakli-rulman-uct-207-16713 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-207-be6-47.png |
| /ymn-yatakli-rulman-uct-207-fk-16729 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-207-fk-9b09d6.png |
| /ymn-yatakli-rulman-uct-208-16714 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-208-7d6-f5.png |
| /ymn-yatakli-rulman-uct-208-fk-16730 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-208-fk-a4cfae.png |
| /ymn-yatakli-rulman-uct-209-16715 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-209-af17-f.png |
| /ymn-yatakli-rulman-uct-210-16716 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-210-5f-979.png |
| /ymn-yatakli-rulman-uct-211-16717 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-211-68-aa9.png |
| /ymn-yatakli-rulman-uct-212-16718 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-212-a14a97.png |
| /ymn-yatakli-rulman-uct-213-16719 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-213-152458.png |
| /ymn-yatakli-rulman-uct-214-16720 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-214-1e-a5c.png |
| /ymn-yatakli-rulman-uct-215-16721 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-215-95728-.png |
| /ymn-yatakli-rulman-uct-216-16722 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-216-00-a89.png |
| /ymn-yatakli-rulman-uct-217-16723 | https://static.ticimax.cloud/cdn-cgi/image/width=-,quality=85,format=webp/79038/uploads/urunresimleri/buyuk/yatakli-rulman-uct-217-bd38b5.png |

## Fixture match / draw sonuçları

| Ürün | Başlık | match | çizim | yazılan ölçüler |
|---|---|---|---|---|
| /kfl000-ymn-minyatur-yatakli-rulman-10-mm-14005 | KFL000 Minyatür Yataklı Rulman (10 mm) | true | var | d,H,L,J,M |
| /kfl002-ymn-minyatur-yatakli-rulman-15-mm-14007 | KFL002 Minyatür Yataklı Rulman (15 mm) | true | var | d,H,L,J,M |
| /kfl005-ymn-minyatur-yatakli-rulman-25-mm-14010 | KFL005 Minyatür Yataklı Rulman (25 mm) | true | var | d,H,L,J,M |
| /kfl007-ymn-minyatur-yatakli-rulman-35-mm-14012 | KFL007 Minyatür Yataklı Rulman (35 mm) | true | var | d,H,L,J,M |
| /kp000-ymn-minyatur-yatakli-rulman-10-mm-14013 | KP000 Minyatür Yataklı Rulman (10 mm) | true | var | d,H,L,J |
| /kp002-ymn-minyatur-yatakli-rulman-15-mm-14015 | KP002 Minyatür Yataklı Rulman (15 mm) | true | var | d,H,L,J |
| /kp004-ymn-minyatur-yatakli-rulman-20-mm-14017 | KP004 Minyatür Yataklı Rulman (20 mm) | true | var | d,H,L,J |
| /kp006-ymn-minyatur-yatakli-rulman-30-mm-14019 | KP006 Minyatür Yataklı Rulman (30 mm) | true | var | d,H,L,J |
| /33109-konik-makarali-rulman-18087 | 33109 KONİK MAKARALI RULMAN | false | yok (null) |  |
| /353538-ymn-konik-burc-12754 | 3535*38 Konik Burç | false | yok (null) |  |
| /51218-eksenel-bilyali-rulman-18402 | 51218 EKSENEL BİLYALI RULMAN | false | yok (null) |  |
| /6003-n-ors-rulman-11762 | 6003 N ORS Rulman | false | yok (null) |  |
| /6206-k-ors-rulman-12014 | 6206 K ORS Rulman | false | yok (null) |  |
| /6215-pls-zz-c3-ors-rulman-12556 | 6215 PLS ZZ  C3 ORS Rulman | false | yok (null) |  |
| /ciftli-manyetik-v-yatak-100x50x80-21390 | Çiftli Manyetik V Yatak 100X50X80 | false | yok (null) |  |
| /ciftli-manyetik-v-yatak-70x40x50-21391 | Çiftli Manyetik V Yatak 70X40X50 | false | yok (null) |  |
| /hiwin-hgr25-r5600-c-ray-lineer-ray-15604 | Hiwin HGR25 R5600 C Ray (Lineer Ray) | false | yok (null) |  |
| /konik-kilit-100-t-tipi-03041-17585 | KONİK KİLİT 100 (T TİPİ) 030*41 | false | yok (null) |  |
| /manyetik-v-yatak-1007096-eric-21386 | Manyetik V Yatak 100*70*96 ERİC | false | yok (null) |  |
| /nbr-yag-kecesi-47x72x8-6880 | NBR Yağ keçesi 47x72x8 | false | yok (null) |  |
| /nki-9036-igneli-rulman-18710 | NKI 90/36 İĞNELİ RULMAN | false | yok (null) |  |
| /nkx-20-z-kombine-igneli-rulman-18765 | NKX 20 Z KOMBİNE İĞNELİ RULMAN | false | yok (null) |  |
| /nx-35-z-kombine-igneli-rulman-18788 | NX 35 Z KOMBİNE İĞNELİ RULMAN | false | yok (null) |  |
| /viton-yag-kecesi-20x35x7-8157 | Viton Yağ Keçesi 20x35x7 | false | yok (null) |  |
| /viton-yag-kecesi-30x40x7-8355 | Viton Yağ Keçesi 30x40x7 | false | yok (null) |  |
| /ymn-lineer-rulman-lmek-08-uu-16525 | LİNEER RULMAN LMEK 08 UU | false | yok (null) |  |
| /ymn-lineer-rulman-sce-40-wuu-uzun-16596 | LİNEER RULMAN SCE 40 WUU (UZUN) | false | yok (null) |  |
| /ymn-manson-somunu-km-19-15885 | MANŞON SOMUNU KM 19 | false | yok (null) |  |
| /ymn-manson-somunu-km-28-15894 | MANŞON SOMUNU KM 28 | false | yok (null) |  |
| /ymn-rulman-mansonu-h-2338-15819 | RULMAN MANŞONU H 2338 | false | yok (null) |  |
| /ymn-zincir-disli-cift-sira-12228-15240 | ZİNCİR DİŞLİ ÇİFT SIRA 1/2*2*28 | false | yok (null) |  |
| /ymn-zincir-disli-cift-sira-58245-15324 | ZİNCİR DİŞLİ ÇİFT SIRA 5/8*2*45 | false | yok (null) |  |
| /ymn-zincir-disli-tek-sira-1-14114-15117 | ZİNCİR DİŞLİ TEK SIRA 1 1/4*1*14 | false | yok (null) |  |
| /ymn-zincir-disli-tek-sira-1176-15110 | ZİNCİR DİŞLİ TEK SIRA 1*1*76 | false | yok (null) |  |
| /ymn-zincir-disli-tek-sira-34156-15023 | ZİNCİR DİŞLİ TEK SIRA 3/4*1*56 | false | yok (null) |  |
| /ayarlanabilir-v-yatak-48x30x102mm-21385 | Ayarlanabilir V-yatak 48X30X102MM | false | yok (null) |  |
| /manyetik-v-yatak-706075-eric-21387 | Manyetik V Yatak 70*60*75 ERİC | false | yok (null) |  |
| /paralel-v-yatak-444135-21388 | Paralel V Yatak 44*41*35 | false | yok (null) |  |
| /ymn-sac-yatakli-rulman-sbpf-204-yuvarlak-model-16749 | SAÇ YATAKLI RULMAN SBPF 204 (YUVARLAK MODEL) | true | yok (null) |  |
| /ymn-sac-yatakli-rulman-sbpf-205-yuvarlak-model-16750 | SAÇ YATAKLI RULMAN SBPF 205 (YUVARLAK MODEL) | true | yok (null) |  |
| /ymn-sac-yatakli-rulman-sbpf-206-yuvarlak-model-16751 | SAÇ YATAKLI RULMAN SBPF 206 (YUVARLAK MODEL) | true | yok (null) |  |
| /ymn-sac-yatakli-rulman-sbpfl-201-16752 | SAÇ YATAKLI RULMAN SBPFL 201 | true | yok (null) |  |
| /ymn-sac-yatakli-rulman-sbpfl-202-16753 | SAÇ YATAKLI RULMAN SBPFL 202 | true | yok (null) |  |
| /ymn-sac-yatakli-rulman-sbpfl-203-16754 | SAÇ YATAKLI RULMAN SBPFL 203 | true | yok (null) |  |
| /ymn-sac-yatakli-rulman-sbpft-204-ucgen-model-16762 | SAÇ YATAKLI RULMAN SBPFT 204 (ÜÇGEN MODEL) | true | yok (null) |  |
| /ymn-sac-yatakli-rulman-sbpft-205-ucgen-model-16763 | SAÇ YATAKLI RULMAN SBPFT 205 (ÜÇGEN MODEL) | true | yok (null) |  |
| /ymn-sac-yatakli-rulman-sbpft-206-ucgen-model-16764 | SAÇ YATAKLI RULMAN SBPFT 206 (ÜÇGEN MODEL) | true | yok (null) |  |
| /ymn-sac-yatakli-rulman-sbpp-204-16765 | SAÇ YATAKLI RULMAN SBPP 204 | true | yok (null) |  |
| /ymn-sac-yatakli-rulman-sbpp-205-16766 | SAÇ YATAKLI RULMAN SBPP 205 | true | yok (null) |  |
| /ymn-sac-yatakli-rulman-sbpp-206-16767 | SAÇ YATAKLI RULMAN SBPP 206 | true | yok (null) |  |
| /snh-505-ymn-rulman-yatagi-13844 | SNH 505 Rulman Yatağı | true | yok (null) |  |
| /snh-506-ymn-rulman-yatagi-13845 | SNH 506 Rulman Yatağı | true | yok (null) |  |
| /snh-507-komple-set-ymn-rulman-yatagi-13822 | SNH 507 (Komple Set) Rulman Yatağı | true | yok (null) |  |
| /sskfl-000-minyatur-komple-paslanmaz-yatakli-rulman-17670 | SSKFL 000 MİNYATÜR KOMPLE PASLANMAZ YATAKLI RULMAN | true | yok (null) |  |
| /sskfl-001-minyatur-komple-paslanmaz-yatakli-rulman-17671 | SSKFL 001 MİNYATÜR KOMPLE PASLANMAZ YATAKLI RULMAN | true | yok (null) |  |
| /sskfl-002-minyatur-komple-paslanmaz-yatakli-rulman-17672 | SSKFL 002 MİNYATÜR KOMPLE PASLANMAZ YATAKLI RULMAN | true | yok (null) |  |
| /sskp-000-minyatur-komple-paslanmaz-yatakli-rulman-17663 | SSKP 000 MİNYATÜR KOMPLE PASLANMAZ YATAKLI RULMAN | true | yok (null) |  |
| /sskp-001-minyatur-komple-paslanmaz-yatakli-rulman-17664 | SSKP 001 MİNYATÜR KOMPLE PASLANMAZ YATAKLI RULMAN | true | yok (null) |  |
| /sskp-002-minyatur-komple-paslanmaz-yatakli-rulman-17665 | SSKP 002 MİNYATÜR KOMPLE PASLANMAZ YATAKLI RULMAN | true | yok (null) |  |
| /ymn-yatakli-rulman-uc-205-fk-16725 | YATAKLI RULMAN UC 205 (FK) | true | yok (null) |  |
| /ymn-yatakli-rulman-uc-206-fk-16726 | YATAKLI RULMAN UC 206 (FK) | true | yok (null) |  |
| /ymn-yatakli-rulman-uc-209-fk-kutusuz-16727 | YATAKLI RULMAN UC 209 (FK - KUTUSUZ) | true | yok (null) |  |
| /ucf-201-fag-yatakli-rulman-17907 | UCF 201 FAG YATAKLI RULMAN | true | var | d,L,J,A,B,S,M |
| /ymn-yatakli-rulman-ucf-206-16736 | YATAKLI RULMAN UCF 206 | true | var | d,L,J,A,B,S,M |
| /ymn-yatakli-rulman-ucf-212-16742 | YATAKLI RULMAN UCF 212 | true | var | d,L,J,A,B,S,M |
| /ymn-yatakli-rulman-ucf-218-16748 | YATAKLI RULMAN UCF 218 | true | var | d,L,J,A,B,S,M |
| /ucf-218-fag-yatakli-rulman-17924 | UCF 218 FAG YATAKLI RULMAN | true | yok (null) |  |
| /ucfa-204-fag-yatakli-rulman-17827 | UCFA 204 FAG YATAKLI RULMAN | true | yok (null) |  |
| /ymn-yatakli-rulman-ucfa-204-16617 | YATAKLI RULMAN UCFA 204 | true | yok (null) |  |
| /ucfa-205-fag-yatakli-rulman-17828 | UCFA 205 FAG YATAKLI RULMAN | true | yok (null) |  |
| /ymn-yatakli-rulman-ucfb-204-16624 | YATAKLI RULMAN UCFB 204 | true | yok (null) |  |
| /ymn-yatakli-rulman-ucfb-205-16625 | YATAKLI RULMAN UCFB 205 | true | yok (null) |  |
| /ymn-yatakli-rulman-ucfb-206-16626 | YATAKLI RULMAN UCFB 206 | true | yok (null) |  |
| /ucfc-204-fag-yatakli-rulman-17834 | UCFC 204 FAG YATAKLI RULMAN | true | var | d,L,J,H3,B,S,M |
| /ucfc-209-fag-yatakli-rulman-17839 | UCFC 209 FAG YATAKLI RULMAN | true | var | d,L,J,H3,B,S,M |
| /ymn-yatakli-rulman-ucfc-213-16640 | YATAKLI RULMAN UCFC 213 | true | var | d,L,J,H3,B,S,M |
| /ymn-yatakli-rulman-ucfc-218-16645 | YATAKLI RULMAN UCFC 218 | true | var | d,L,J,H3,B,S,M |
| /ucfc-205-fag-yatakli-rulman-17835 | UCFC 205 FAG YATAKLI RULMAN | true | yok (null) |  |
| /ucfl-201-fag-yatakli-rulman-17849 | UCFL 201 FAG YATAKLI RULMAN | true | var | d,H,L,J,A,B,S,M |
| /ucfl-207-fag-yatakli-rulman-17855 | UCFL 207 FAG YATAKLI RULMAN | true | var | d,H,L,J,A,B,S,M |
| /ymn-yatakli-rulman-ucfl-210-16659 | YATAKLI RULMAN UCFL 210 | true | var | d,H,L,J,A,B,S,M |
| /ucfl-218-fag-yatakli-rulman-17866 | UCFL 218 FAG YATAKLI RULMAN | true | var | d,H,L,J,A,B,S,M |
| /ucfl-206-fag-yatakli-rulman-17854 | UCFL 206 FAG YATAKLI RULMAN | true | yok (null) |  |
| /ymn-yatakli-rulman-ucha-204-16667 | YATAKLI RULMAN UCHA 204 | true | yok (null) |  |
| /ymn-yatakli-rulman-ucha-205-16668 | YATAKLI RULMAN UCHA 205 | true | yok (null) |  |
| /ymn-yatakli-rulman-ucha-206-16669 | YATAKLI RULMAN UCHA 206 | true | yok (null) |  |
| /ucp-201-fag-yatakli-rulman-17867 | UCP 201 FAG YATAKLI RULMAN | true | var | d,H,H2,L,J,A,N,B,S |
| /ymn-yatakli-rulman-ucp-206-16681 | YATAKLI RULMAN UCP 206 | true | var | d,H,H2,L,J,A,N,B,S |
| /ucp-212-fag-yatakli-rulman-17878 | UCP 212 FAG YATAKLI RULMAN | true | var | d,H,H2,L,J,A,N,B,S |
| /ymn-yatakli-rulman-ucp-218-16693 | YATAKLI RULMAN UCP 218 | true | var | d,H,H2,L,J,A,N,B,S |
| /ucp-218-fag-yatakli-rulman-17884 | UCP 218 FAG YATAKLI RULMAN | true | yok (null) |  |
| /ucpa-204-fag-yatakli-rulman-17885 | UCPA 204 FAG YATAKLI RULMAN | true | yok (null) |  |
| /ymn-yatakli-rulman-ucpa-204-16696 | YATAKLI RULMAN UCPA 204 | true | yok (null) |  |
| /ucpa-205-fag-yatakli-rulman-17886 | UCPA 205 FAG YATAKLI RULMAN | true | yok (null) |  |
| /ymn-yatakli-rulman-ucph-204-16703 | YATAKLI RULMAN UCPH 204 | true | yok (null) |  |
| /ymn-yatakli-rulman-ucph-205-16704 | YATAKLI RULMAN UCPH 205 | true | yok (null) |  |
| /ymn-yatakli-rulman-ucph-206-16705 | YATAKLI RULMAN UCPH 206 | true | yok (null) |  |
| /uct-204-fag-yatakli-rulman-17892 | UCT 204 FAG YATAKLI RULMAN | true | var | d,H,H2,L,L1,A,N,B,S |
| /uct-208-fag-yatakli-rulman-17896 | UCT 208 FAG YATAKLI RULMAN | true | var | d,H,H2,L,L1,A,N,B,S |
| /ymn-yatakli-rulman-uct-212-16718 | YATAKLI RULMAN UCT 212 | true | var | d,H,H2,L,L1,A,N,B,S |
| /ymn-yatakli-rulman-uct-217-16723 | YATAKLI RULMAN UCT 217 | true | var | d,H,H2,L,L1,A,N,B,S |
| /uct-218-fag-yatakli-rulman-17906 | UCT 218 FAG YATAKLI RULMAN | true | yok (null) |  |
