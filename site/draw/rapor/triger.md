# Triger kasnak teknik çizimi

- Dal: `draw/triger` (başlangıç `origin/site-assets`, `844a0f4`).
- Uygulama, fixture ve PNG commit'i: `55a77c51ca45f07a0255ba43b01004ceacf5769a`.
- Ayrı worktree: `/home/ubuntu/w/draw`. Girdi worktree'si salt okunur kullanıldı; assets değiştirilmedi.
- Ticimax/site yüklemesi ve PR yok.

## Veri ve sonuç

`/home/ubuntu/w/girdi/parca/triger.jsonl.gz` içindeki 915 kayıttan ctx üretildi.
`orka_site.satir` TK için 5., BTK için 7. indexten başlayan ölçü kolonlarıyla okundu.
Boş, `–`, `-` değerler specs'e alınmadı. Ürün tipi, profil, diş sayısı ve flanş bilgisi kaynak ürün adından;
ölçüler yalnız üretici satırından alındı. Çelik malzeme, kaynak URL'de açıkça `celik` yazan sayfalarda da kullanıldı.
Tip/Flanş Kodu çizim geometrisine etki etmez. Di, S, R fixture içinde kaynak bilgisi olarak bulunabilir,
modül bunları okumaz, keys'e veya çizime eklemez.

**908 / 915 çizim, 7 null.** Bu yedi ürünün tamamında `orka_site` null; De ve Dp yok.
Başlık veya burç kodundan çap türetilmedi:

1. ORKA BURÇLU TRİGER KASNAK 112 8M 50 (3020)
2. ORKA BURÇLU TRİGER KASNAK 42 8M 50 FLANŞLI (2012)
3. ORKA BURÇLU TRİGER KASNAK 60 8M 20 FLANŞLI (2012)
4. ORKA BURÇLU TRİGER KASNAK 60 8M 30 FLANŞLI (2012)
5. ORKA BURÇLU TRİGER KASNAK 60 8M 50 FLANŞLI (2517)
6. ORKA TRİGER KASNAK 39 H 075 FLANŞLI
7. ÖZEL TRİGER KASNAK 60 T10 25 ALUMİNYUM (DELİK ÇAPI 50 MM)

Fixture: 40 çizilebilir gerçek ürün + 112 dişli eksik kaynak örneği + 3 negatif = 44 ctx.
Kaynakta mevcut profil × TK/BTK × flanş × (L>F ve Dm mevcut) göbek × d mevcut kombinasyonlarının
26'sı temsil edildi; kaynakta bulunmayan çapraz kombinasyonlar uydurulmadı.
Negatifler: triger kayışı, V kasnak, rulman (profil ve z verilse de eşleşmez).

## Çizimin kapsamı

Saf ES5, tek global `window.YDRAW.triger`, 460 × 252 viewBox.
z adet diş çizilir; trapez profiller düz kenarlı, HTD profilleri quadratic yuvarlak olukludur.
Diş yüksekliği/oluk oranları, BTK konik yuva açısı ve flanş kalınlığı **şematiktir**;
imalat resmi veya standart profil toleransı iddiası yoktur. Ön görünüş ve kesit farklı eksenel ölçek kullanabilir.
BTK maksimum delik yalnız veri etiketi olarak gösterilir; mevcut burç deliği çapı değildir.
Eksik d çizilmez; eksik F/L şekli şematik oranla gösterilebilir ama ölçü etiketi ve keys oluşturulmaz.
Ölçü liderleri/okları ve etiketleri data-k gruplarında; preview kartları tıklanarak grup vurgulanabilir.

## Kontroller

Node ortamı `source /home/ubuntu/.nvm/nvm.sh` ile yüklendi (başlangıç shell PATH'inde node yoktu).
`node --check site/draw/triger.js` exit 0.
Node vm üzerinde tüm 915 ctx için match/draw çağrıldı; SVG'de NaN/undefined yokluğu,
keys/data-k eşliği, yasak ölçü anahtarlarının yokluğu, boş ctx ve gerekli çapın eksikliği kontrol edildi.

```text
ALL: 908/915 draw; 7 null
PASS: keys, finite SVG, forbidden dimensions, 3 negatives, empty, missing diameter
PASS: 44 fixtures = 40 draw + 1 missing-source null + 3 negatives
PNG: 8 generated (final fixture indexes)
```

Headless Chrome ile 460 ve 360 px ekran görüntüleri üretildi.
Dört 360px PNG dosyası açılarak incelendi: çizilebilir üç örnekte yazı çakışması görülmedi.
**112 dişli ürünün gerçek çizimi doğrulanamadı: kaynak ölçüleri yok, beklenen sonuç `Çizim yok`.**
Bu ürün için sayısal ölçü uydurulmadı. 80 dişli 8M örneğinde gerçek dişler ve küçük boyda okunurluk kontrol edildi.
460px PNG'ler üretildi, ayrıca gözle incelenmedi. Canlı sayfa entegrasyonu/yükleme yapılmadı.

## Önizleme ve kanıtlar

`site/draw/preview/triger.html?i=9&w=360` XL çelik 6F;
`?i=24&w=360` 8M flanşsız göbekli;
`?i=0&w=360` BTK 5F;
`?i=26&w=360` 112 dişli eksik kaynak.
`w=460` ile geniş boyut açılır. JSON fixture HTML içinde gömülü, sunucu gerekmez.

- `site/draw/preview/triger/xl-6f-460.png`
- `site/draw/preview/triger/xl-6f-360.png`
- `site/draw/preview/triger/8m-gobek-460.png`
- `site/draw/preview/triger/8m-gobek-360.png`
- `site/draw/preview/triger/btk-5f-460.png`
- `site/draw/preview/triger/btk-5f-360.png`
- `site/draw/preview/triger/112-dis-460.png`
- `site/draw/preview/triger/112-dis-360.png`
