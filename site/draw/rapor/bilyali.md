# Bilyalı rulman ailesi — teknik çizim modülü raporu

Modül: `site/draw/bilyali.js` (`window.YDRAW.bilyali`, README arayüzü). Önizleme: `site/draw/preview/bilyali.html`, ekran görüntüleri `site/draw/preview/bilyali/w460-c*.png` ve `w360-c*.png` (kart numarası = fixture sırası; c55–c59 kod testi kartları).

## Alt tipler ve çizimler

| alt tip (`sub`) | nasıl tanınır | çizim |
|---|---|---|
| `sabit` | breadcrumb `SABİT BİLYALI RULMANLAR` veya motosiklet/scooter sayfasında `Rulman Kodu` sabit bilyalı kodu (60xx/62xx/63xx/68xx/69xx/16xxx/6xx/MR) | ön görünüş (bilye dizisi veya kapak/keçe halkası) + A-A kesiti, derin oluklu yuvalar |
| `miny` | breadcrumb `MİNYATÜR RULMANLAR` + 6xx/68xx/69xx/MR kodu | sabit ile aynı geometri, küçük ölçüler için ölçek sınırı |
| `flans` | `MİNYATÜR RULMANLAR` + başlıkta FLANŞLI / F6xx kodu | dış bilezikte flanş; flanş çapı ve flanş kalınlığı ölçüsü ayrıca çizilir |
| `cift` | breadcrumb `ÇİFT SIRALI ... BİLYALI` (42xx/43xx) | iki sıra bilye, iki oluk |
| `oynak` | breadcrumb `OYNAK BİLYALI` / başlık `OYNAK BİLYALI` + 12xx/13xx/22xx/23xx | küresel dış bilezik yüzeyi, iki sıra bilye, temas çizgileri |
| `acisal` | breadcrumb/başlık `AÇISAL TEMASLI` + 72xx/73xx | tek tarafı alçak omuzlu bilezikler, 40° eğik temas çizgisi |
| `acisal2` | `AÇISAL TEMASLI` + 32xx/33xx veya `ÇİFT SIRALI` | iki sıra, O düzeninde ±30° temas çizgileri |

Kapak tipi (`cover`): rulman kodu (`Rulman Kodu` özelliği ya da başlıktaki kod) + `Kapak Tipi` özelliği + özellik etiketleri (ZZ, Z, RS, 2RS, NR, N, K). Kesitte: açık = kapaksız; Z/ZZ = ince metal kalkan (tek/çift taraf); RS/2RS = koyu kauçuk keçe + çelik takviye + dudak; NR/N = dış bilezikte segman kanalı (NR’de segman); K = 1:12 konik delik. Kalkan/keçe kalınlığı bilye ile yan yüz arasındaki boşluğa sığacak şekilde hesaplanır.

## Kullanılan ölçü etiketleri (sadece ürün sayfasından)

- `İç Çap`, `İç Çap (d)` → d
- `Dış Çap`, `Dış Çap (D)` → D
- `Genişlik`, `Genişlik (B)`, `Kalınlık (B)` → B
- `Flanş Çapı (C)` → flanş çapı (anahtar `Df`, etiket "Flanş Çapı")
- `Flanş Kalınlığı (E)` → flanş kalınlığı (anahtar `C`, etiket "Flanş Kalınlığı")
- `Ölçüler (iç çap x dış çap x genişlik)`, `Ölçü (dxDxB)` → "25x52x15 mm" biçiminden d, D, B
- Aynı ölçü iki kaynakta farklıysa (özellik ↔ ön yazı) çizim çıkmaz (`null`). Başlık/URL’deki ölçü hiç kullanılmaz.
- Zorunlu: d, D, B (flanşlıda + flanş çapı ve kalınlığı). Biri yoksa veya tutarsızsa (D≤d, flanş ≤ D, flanş kalınlığı ≥ B) `draw` → `null`.

## Fotoğraftan okunan ölçüler

Yok. Açılan aile ürünlerinin hiçbirinde 2./3. fotoğraf yok (ailede birden fazla fotoğraflı sayfa: 0). Bu yüzden `site/draw/data/bilyali.json` boş (`{}`); hiçbir ölçü fotoğraftan alınmadı.

## Kapsam sayıları (ölçülen)

`products.json` içinde slug’ında `rulman` geçen 4.379 URL aday; bunların **1380** tanesi tarayıcıyla açıldı (tarama ~1 istek/sn, tamamı bitmedi — sayılar sadece açılan sayfalar içindir, oran tahmini yapılmadı).

- `match = evet`: **1011** sayfa; bunların **1011** tanesinde gerekli ölçülerin hepsi sayfada var ve çizim çıktı (ölçü eksik olduğu için çizimi çıkmayan aile ürünü: 0).
- Kategoriye göre eşleşen: RULMAN > SABİT BİLYALI RULMANLAR: 695, MOTOSİKLET VE SCOOTER RULMANLARI > MOTOSİKLET RULMANLARI: 273, RULMAN > MİNYATÜR RULMANLAR: 33, MOTOSİKLET VE SCOOTER RULMANLARI > SCOOTER VE ELEKTRİKLİ BİSİKLET RULMANLARI: 10
- Alt tip / kapak: Sabit bilyalı (tek sıra) zz: 296, Sabit bilyalı (tek sıra) 2rs: 263, Sabit bilyalı (tek sıra) acik: 241, Sabit bilyalı (tek sıra) z: 127, Sabit bilyalı (tek sıra) rs: 51, Minyatür zz: 15, Flanşlı minyatür zz: 9, Minyatür 2rs: 8, Flanşlı minyatür 2rs: 1
- Eşleşmeyen (diğer aileler, doğru şekilde reddedildi): RULMAN > KONİK MAKARALI RULMANLAR: 189, RULMAN > YATAKLI RULMAN: 102, RULMAN > OYNAK MAKARALI RULMANLAR: 19, RULMAN > İĞNELİ RULMANLAR: 19, RULMAN > TEK YÖNLÜ RULMANLAR: 10, RULMAN > KAM MAKARALARI VE RULMANLARI: 10, RULMAN > EKSENEL BİLYALI RULMANLAR (BÜTE): 10, RULMAN > MANŞON SOMUN VE PUL: 2, MOTOSİKLET VE SCOOTER RULMANLARI > MOTOSİKLET RULMANLARI: 1, YAĞ KEÇESİ > NBR YAĞ KEÇELERİ: 1, TANE BİLYA - MASURA > TANE BİLYA: 1, ZİNCİR - ZİNCİR DİŞLİSİ > ZİNCİR DİŞLİLERİ: 1, LİNEER > LİNEER ARABALAR: 1, SEGMAN > 471 DIŞ SEGMAN: 1, RULMAN > KAFES VE BURÇLAR: 1, U MAFSAL > ÇİFTLİ U MAFSAL: 1
- Tüm çizimlerde `keys[].k` ↔ `data-k` uyuşmazlığı: 0.

`products.json` içinde açısal temaslı (72xx/73xx/32xx/33xx), oynak bilyalı (12xx/13xx/22xx/23xx) ve çift sıralı sabit bilyalı (42xx/43xx) **ürün yok** (slug araması 0; 32xx/33xx eşleşen 6 URL “kama DIN 6885”, 12xx/22xx eşleşenler konik burç/bilya). Bu alt tiplerin çizim kodu hazır; önizlemede en altta 5 ayrı “kod testi” kartında ISO katalog ölçüleriyle (1205, 2205, 7205 B, 3205 A, 4205) gösterildi — bunlar ürün verisi değildir, fixture’a konmadı.

## Fixture’lar ve match sonuçları

`site/draw/fixtures/bilyali.json`: 55 gerçek ürün sayfası (ctx: path, title, crumbs, specs, onyazi, photos + `grup`).

| # | ürün | grup | match | alt tip | kapak | çizim |
|---|---|---|---|---|---|---|
| 0 | [6026 ORS Rulman (ORS 6026)](https://www.yamansarulman.com/6026-ors-rulman-11866) | sabit-acik | evet | sabit | acik | var |
| 1 | [6011 ORS Rulman (ORS 6011)](https://www.yamansarulman.com/6011-ors-rulman-11726) | sabit-acik | evet | sabit | acik | var |
| 2 | [6030 ORS Rulman (ORS 6030)](https://www.yamansarulman.com/6030-ors-rulman-11915) | sabit-acik | evet | sabit | acik | var |
| 3 | [6222 ORS Rulman (ORS 6222)](https://www.yamansarulman.com/6222-ors-rulman-12131) | sabit-acik | evet | sabit | acik | var |
| 4 | [6005 ZZ ORS Rulman (ORS 6005 ZZ)](https://www.yamansarulman.com/6005-zz-ors-rulman-11657) | sabit-zz | evet | sabit | zz | var |
| 5 | [6009 ZZ ORS Rulman (ORS 6009 ZZ)](https://www.yamansarulman.com/6009-zz-ors-rulman-11658) | sabit-zz | evet | sabit | zz | var |
| 6 | [6210 ZZ ORS Rulman (ORS 6210 ZZ)](https://www.yamansarulman.com/6210-zz-ors-rulman-12032) | sabit-zz | evet | sabit | zz | var |
| 7 | [6010 ZZ ORS Rulman (ORS 6010 ZZ)](https://www.yamansarulman.com/6010-zz-ors-rulman-11697) | sabit-zz | evet | sabit | zz | var |
| 8 | [6019 2RS ORS Rulman (ORS 6019 2RS)](https://www.yamansarulman.com/6019-2rs-ors-rulman-11874) | sabit-2rs | evet | sabit | 2rs | var |
| 9 | [6202 2RS NR ORS Rulman (ORS 6202 2RS NR)](https://www.yamansarulman.com/6202-2rs-nr-ors-rulman-12036) | sabit-2rs | evet | sabit | 2rs | var |
| 10 | [6000 2RS NR ORS Rulman (ORS 6000 2RS NR)](https://www.yamansarulman.com/6000-2rs-nr-ors-rulman-11644) | sabit-2rs | evet | sabit | 2rs | var |
| 11 | [6205 2RS ORS Rulman (ORS 6205 2RS)](https://www.yamansarulman.com/6205-2rs-ors-rulman-11985) | sabit-2rs | evet | sabit | 2rs | var |
| 12 | [6002 RS ORS Rulman (ORS 6002 RS)](https://www.yamansarulman.com/6002-rs-ors-rulman-11713) | sabit-z-rs | evet | sabit | rs | var |
| 13 | [6000 Z ORS Rulman (ORS 6000 Z)](https://www.yamansarulman.com/6000-z-ors-rulman-11620) | sabit-z-rs | evet | sabit | z | var |
| 14 | [6005 Z C3 ORS Rulman (ORS 6005 Z C3)](https://www.yamansarulman.com/6005-z-c3-ors-rulman-11654) | sabit-z-rs | evet | sabit | z | var |
| 15 | [6024 Z ORS Rulman (ORS 6024 Z)](https://www.yamansarulman.com/6024-z-ors-rulman-11839) | sabit-z-rs | evet | sabit | z | var |
| 16 | [6200 NR ORS Rulman (ORS 6200 NR)](https://www.yamansarulman.com/6200-nr-ors-rulman-11956) | sabit-nr | evet | sabit | acik | var |
| 17 | [6005 NR ORS Rulman (ORS 6005 NR)](https://www.yamansarulman.com/6005-nr-ors-rulman-11684) | sabit-nr | evet | sabit | acik | var |
| 18 | [6017 NR ORS Rulman (ORS 6017 NR)](https://www.yamansarulman.com/6017-nr-ors-rulman-11811) | sabit-nr | evet | sabit | acik | var |
| 19 | [6001 NR ORS Rulman (ORS 6001 NR)](https://www.yamansarulman.com/6001-nr-ors-rulman-11687) | sabit-nr | evet | sabit | acik | var |
| 20 | [6210 K ORS Rulman (ORS 6210 K)](https://www.yamansarulman.com/6210-k-ors-rulman-12023) | sabit-k | evet | sabit | acik | var |
| 21 | [6209 K 2RS ORS Rulman (ORS 6209 K 2RS)](https://www.yamansarulman.com/6209-k-2rs-ors-rulman-12004) | sabit-k | evet | sabit | 2rs | var |
| 22 | [6010 K 2RS ORS Rulman (ORS 6010 K 2RS)](https://www.yamansarulman.com/6010-k-2rs-ors-rulman-11715) | sabit-k | evet | sabit | 2rs | var |
| 23 | [6206 K 2RS ORS Rulman (ORS 6206 K 2RS)](https://www.yamansarulman.com/6206-k-2rs-ors-rulman-12043) | sabit-k | evet | sabit | 2rs | var |
| 24 | [637 ZZ MİNYATÜR RULMAN (YMN 637 ZZ)](https://www.yamansarulman.com/637-zz-minyatur-rulman-18150) | minyatur | evet | miny | zz | var |
| 25 | [MR52 ZZ MİNYATÜR RULMAN (YMN MR52 ZZ)](https://www.yamansarulman.com/mr52-zz-minyatur-rulman-18274) | minyatur | evet | miny | zz | var |
| 26 | [694 ZZ MİNYATÜR RULMAN (YMN 694 ZZ)](https://www.yamansarulman.com/694-zz-minyatur-rulman-18184) | minyatur | evet | miny | zz | var |
| 27 | [695 2RS MİNYATÜR RULMAN (YMN 695 2RS)](https://www.yamansarulman.com/695-2rs-minyatur-rulman-18187) | minyatur | evet | miny | 2rs | var |
| 28 | [F625 ZZ FLANŞLI MİNYATÜR RULMAN (YMN F625 ZZ)](https://www.yamansarulman.com/f625-zz-flansli-minyatur-rulman-18212) | flansli | evet | flans | zz | var |
| 29 | [F606 ZZ FLANŞLI MİNYATÜR RULMAN (YMN F606 ZZ)](https://www.yamansarulman.com/f606-zz-flansli-minyatur-rulman-18200) | flansli | evet | flans | zz | var |
| 30 | [F682 ZZ FLANŞLI MİNYATÜR RULMAN (YMN F682 ZZ)](https://www.yamansarulman.com/f682-zz-flansli-minyatur-rulman-18222) | flansli | evet | flans | zz | var |
| 31 | [F688 2RS FLANŞLI MİNYATÜR RULMAN (YMN F688 2RS)](https://www.yamansarulman.com/f688-2rs-flansli-minyatur-rulman-18235) | flansli | evet | flans | 2rs | var |
| 32 | [Bajaj Pulsar 180 Ön Teker Rulmanı 6301-2RS - Ekonomik Model ](https://www.yamansarulman.com/bajaj-pulsar-180-on-teker-rulmani-6301-2rs-ekonomik-model-22878) | teker-scooter | evet | sabit | 2rs | var |
| 33 | [Bajaj Pulsar 150 Arka Teker Rulmanı 6302-2RS - SKF (MTR0035S](https://www.yamansarulman.com/bajaj-pulsar-150-arka-teker-rulmani-6302-2rs-skf-22847) | teker-scooter | evet | sabit | 2rs | var |
| 34 | [RKS Spontini 110 Ön Teker Rulmanı 6301-2RS - ORS (MTR0259ORS](https://www.yamansarulman.com/rks-spontini-110-on-teker-rulmani-6301-2rs-ors-23724) | teker-scooter | evet | sabit | 2rs | var |
| 35 | [Bajaj Pulsar 180 Arka Teker Rulmanı 6302-2RS - SKF (MTR0039S](https://www.yamansarulman.com/bajaj-pulsar-180-arka-teker-rulmani-6302-2rs-skf-22863) | teker-scooter | evet | sabit | 2rs | var |
| 36 | [Falcon Angel 50 Şanzıman Rulmanı 6301-ZZ - Ekonomik Model (M](https://www.yamansarulman.com/falcon-angel-50-sanziman-rulmani-6301-zz-ekonomik-model-22921) | motor-krank-sanziman | evet | sabit | zz | var |
| 37 | [RKS Spontini 110 Motor Rulmanı 6301-ZZ - SKF (MTR0258SKF)](https://www.yamansarulman.com/rks-spontini-110-motor-rulmani-6301-zz-skf-23718) | motor-krank-sanziman | evet | sabit | zz | var |
| 38 | [Benelli TRK 502 / 502X Motor Rulmanı 6904-ZZ - FAG (MTR0045F](https://www.yamansarulman.com/benelli-trk-502-502x-motor-rulmani-6904-zz-fag-22888) | motor-krank-sanziman | evet | sabit | zz | var |
| 39 | [Arora CG 50 / CG 50 Modifiye Motor Rulmanı 6202 C3 - FAG (MT](https://www.yamansarulman.com/arora-cg-50-cg-50-modifiye-motor-rulmani-6202-c3-fag-22745) | motor-krank-sanziman | evet | sabit | acik | var |
| 40 | [Segway-Ninebot F2 Arka Teker Rulmanı 6203-2RS - SKF (SCT0046](https://www.yamansarulman.com/segway-ninebot-f2-arka-teker-rulmani-6203-2rs-skf-22584) | teker-scooter | evet | sabit | 2rs | var |
| 41 | [Arora Beatrix 50 Krank Rulmanı 6204-ZZ - SKF (MTR0001SKF)](https://www.yamansarulman.com/arora-beatrix-50-krank-rulmani-6204-zz-skf-22714) | motor-krank-sanziman | evet | sabit | zz | var |
| 42 | [Bood B1 Ön Teker Rulmanı 608-2RS - FAG (SCT0001FAG)](https://www.yamansarulman.com/bood-b1-on-teker-rulmani-608-2rs-fag-22482) | teker-scooter | evet | sabit | 2rs | var |
| 43 | [UCFL 201 FAG YATAKLI RULMAN (FAG YR UCFL201)](https://www.yamansarulman.com/ucfl-201-fag-yatakli-rulman-17849) | negatif | hayır | - | - | yok |
| 44 | [30312 KONİK MAKARALI RULMAN (YMN KMR 30312)](https://www.yamansarulman.com/30312-konik-makarali-rulman-17961) | negatif | hayır | - | - | yok |
| 45 | [RULMAN MANŞONU H 311 (ORK RM H311)](https://www.yamansarulman.com/ymn-rulman-mansonu-h-311-15840) | negatif | hayır | - | - | yok |
| 46 | [DC 4445 C Stieber Tek Yönlü Rulman (44,45 X 61,11 X 25,4) (S](https://www.yamansarulman.com/dc-4445-c-stieber-tek-yonlu-rulman-4445-x-6111-x-254-13986) | negatif | hayır | - | - | yok |
| 47 | [22236 CAKW33C3 OYNAK MAKARALI RULMAN (SARI KAFES) (ORK RUL 2](https://www.yamansarulman.com/22236-cakw33c3-oynak-makarali-rulman-sari-kafes-17375) | negatif | hayır | - | - | yok |
| 48 | [NKIA 5903 KOMBİNE İĞNELİ RULMAN (YMN NKIA 5903)](https://www.yamansarulman.com/nkia-5903-kombine-igneli-rulman-18715) | negatif | hayır | - | - | yok |
| 49 | [51338 EKSENEL BİLYALI RULMAN (YMN 51338)](https://www.yamansarulman.com/51338-eksenel-bilyali-rulman-18439) | negatif | hayır | - | - | yok |
| 50 | [NBR Yağ keçesi 5x16x7 (YK00501607-TC-MEL)](https://www.yamansarulman.com/nbr-yag-kecesi-5x16x7-5906) | negatif | hayır | - | - | yok |
| 51 | [2 MM TANE BİLYA (ORK TB 52100G1000 02)](https://www.yamansarulman.com/2-mm-tane-bilya-15941) | negatif | hayır | - | - | yok |
| 52 | [ZİNCİR DİŞLİ TEK SIRA 3/8*1*10 (ORK ZD 38110)](https://www.yamansarulman.com/ymn-zincir-disli-tek-sira-38110-14776) | negatif | hayır | - | - | yok |
| 53 | [Hiwin HGH15 CA ZAC Dar Araba (Lineer Araba) (HIW HGH15 CA ZA](https://www.yamansarulman.com/hiwin-hgh15-ca-zac-dar-araba-lineer-araba-15555) | negatif | hayır | - | - | yok |
| 54 | [471 4 Beneri Dış Segman (BNR 471 4)](https://www.yamansarulman.com/471-4-beneri-dis-segman-13314) | negatif | hayır | - | - | yok |

## Emin olunamayanlar / notlar

- Açısal, oynak bilyalı ve çift sıralı alt tipler sitede olmadığı için gerçek ürün sayfasıyla doğrulanamadı; ileride bu kategoriler açılırsa breadcrumb adları kontrol edilmeli (`match` şu an `OYNAK BİLYALI`, `AÇISAL TEMASLI`, `ÇİFT SIRA` kelimelerini arıyor).
- Kesitteki iç geometri (bilye çapı, oluk, omuz yüksekliği, kalkan/keçe biçimi) ölçü değil, d/D/B’den orantılı çizilen şematik ayrıntıdır; ekranda sayı olarak yazılmaz.
- Motosiklet/scooter sayfalarında kapak tipi `Rulman Kodu` alanından okunur; kod alanı olmayan ve başlığında birden fazla rulman kodu olan sayfalar ilk koda göre sınıflanır.
- `OYNAK MAKARALI`, `KONİK`, `YATAKLI`, `İĞNELİ`, `EKSENEL`, `TEK YÖNLÜ`, `KAM MAKARALARI`, keçe, bilya, zincir dişli, lineer, segman, manşon, burç, mafsal sayfaları reddedilir; motosiklet sayfasında iğneli kod (HK, NK, NA… + rakam) varsa reddedilir.
