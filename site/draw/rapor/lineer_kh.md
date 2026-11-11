# lineer_kh — kapalı kompakt KH lineer bilyalı burç

## Arayüz ve kapsam

- `window.YDRAW.lineer_kh.match(ctx)` / `draw(ctx,opt)`; saf ES5, dış kütüphane yok.
- Başlıkta bağımsız KH + rakam veya `LİNEER RULMANLAR` breadcrumb'ı ile başlıkta bağımsız KH aranır. KH1630PP, KH 1630 PP, INA KH16-PP desteklenir; LM/SCE yakalanmaz.
- Yalnız `ctx.specs` içindeki tam etiketler: `İç Çap (d)`, `Dış Çap (D)`, `Uzunluk (L)`.
- Eksik, geçersiz, sıfır/negatif veya çelişen ölçülerde null; d < D gerekir. Başlıktan, `onyazi` veya `data` alanından ölçü tamamlama yok. Virgüllü ondalık ve mm değerleri desteklenir.
- Fixture'lar görevde verilen 16×24×30 ctx'i ve türetilmiş pozitif/negatif arayüz testleridir; canlı siteden yeni ctx toplandığı iddia edilmez. Fotoğraf ölçümü yapılmadığından `data/lineer_kh.json` yok.

## Çizim

460×230 viewBox, %100 genişlik, şeffaf arka plan; ön görünüş ve kesit A-A yan yana. Ölçüler d/D/L ile orantılıdır. İç yapı, bilye adedi ve gövde kalınlığı şematiktir; bunlar teknik ölçü olarak sunulmaz. Ekrana yazılan sayılar yalnız teknik listedendir.

Çizgi #16203a, 45° tarama #9aa6bd; ölçü rengi `opt.dim`, yazı 12px bold, font inherit. Pattern/marker id'leri `opt.id` öneklidir. Her ölçü ok/yazı/uzatma çizgileri kendi `.hl[data-k]` grubundadır. Önizleme kartları bu grupları kırmızı vurgular.

## Kontroller

Node v24.22.2: `node --check site/draw/lineer_kh.js` başarılı (çıktı yok). Modüller `vm` içinde yüklenerek fixture `expected` değerleri assert edildi; her ctx için doğrudan match ve draw çağrıldı:

```text
KH1630PP Lineer Rulman 16x24x30 mm | match=true | draw=["d","D","L"]
KH1630PP eksik L | match=true | draw=null
LM16UU Lineer Rulman | match=false | draw=null
INA KH16-PP | match=true | draw=["d","D","L"]
KH 1630 PP | match=true | draw=["d","D","L"]
INA KH kompakt burç | match=true | draw=["d","D","L"]
KH1630PP boş teknik liste | match=true | draw=null
KH1630PP geçersiz çap | match=true | draw=null
SCE16UU Lineer Rulman | match=false | draw=null
existing lineer.js KH | match=true | draw=null
PASS: fixtures, each missing dimension, no fallback, conflicting specs, old module null
```

Ek assert'ler: d/D/L tek tek çıkarılınca, `data`/`onyazi` dolu olsa da null; çelişen L tekrarında null; SVG'de beklenen viewBox ve tüm data-k grupları var, NaN/Infinity yok. Mevcut `lineer.js` KH ctx'inde match=true fakat draw=null: `sub()` KH alt tipi döndürmüyor. Mevcut modüller değiştirilmedi.

## Görsel doğrulama

Yerel HTTP sunucusu ve Playwright headless Chrome kullanıldı; canlı siteye erişim veya yayınlama yok. 460/360 genişliklerde render alındı, D kartına tıklanarak ilgili ölçü grubunun kırmızıya geçtiği kontrol edildi. 460 normal ve 360 kırmızı D ekran görüntüleri açılıp incelendi: yazı çakışması/kırpılma yok, iki görünüş ve üç ölçü okunuyor. Yatay taşma assert'i başarılı.

```text
Rendered 460 normal + D-highlight; no horizontal overflow
Rendered 360 normal + D-highlight; no horizontal overflow
```

- `site/draw/preview/lineer_kh/460.png`
- `site/draw/preview/lineer_kh/460-D.png`
- `site/draw/preview/lineer_kh/360.png`
- `site/draw/preview/lineer_kh/360-D.png`

Önizlemeyi açmak için repo kökünde `python3 -m http.server 8767 --bind 127.0.0.1`; ardından `http://127.0.0.1:8767/site/draw/preview/lineer_kh.html`. JSON fetch nedeniyle file:// yerine HTTP gerekir.

## Entegrasyon sınırı

Bu teslim yalnız yeni modül/fixture/önizleme/rapordur; birleştiriciye kayıt veya mevcut modüllerde değişiklik yapılmadı. Dal `origin/site-assets` tabanlı `draw/rulman`, ayrı worktree `/home/ubuntu/work/wt-draw`. Ana checkout `orkapt/rulman` üzerinde bırakıldı. PR açılmadı.
