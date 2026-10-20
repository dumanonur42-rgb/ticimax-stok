# Teknik çizim modülleri (ürün ailesine göre)

Her aile kendi dosyasını yazar: `site/draw/<aile>.js`. Başka dosyaya dokunulmaz.

## Arayüz (sabit, değiştirme)
```js
(window.YDRAW=window.YDRAW||{})['<aile>']={
  match:function(ctx){ return true|false },          // ürün bu aileye mi ait
  draw:function(ctx,opt){ return {svg:'<svg..>', keys:[{k:'d',l:'İç Çap (d)',v:'20 mm'}]} || null }
};
```
- Saf ES5 (const/let/arrow yok), dış kütüphane yok, global sadece `window.YDRAW`.
- `ctx` (birleştirici doldurur):
  - `path`: location.pathname, `title`: h1 metni, `crumbs`: breadcrumb metinleri dizisi
  - `specs`: `[{l,v}]` — `#divTabOzellikler li` içindeki `<strong>Etiket:</strong> değer`
  - `onyazi`: `[{l,v}]` — `#divOnyazi table td` içindeki `<strong>Etiket:</strong> değer`
  - `num(v)`: "11,75 mm" -> 11.75 (sayı yoksa NaN)
  - `data`: `(window.YDRAW_DATA||{})[path]` — fotoğraftan okunmuş doğrulanmış ölçüler `{anahtar: sayı_mm}` veya null
- `opt`: `{dim:'#0a2350' veya '#d0101e', id:'benzersiz-önek'}` — SVG içindeki pattern/marker id'leri `opt.id` ile başlamalı.
- **Gerekli ölçülerden biri eksikse `null` dön. Asla tahmin/varsayılan ölçü yok.** Oran/şekil için sabit oran kullanılabilir ama ekrana yazılan her sayı ürün verisinden gelmeli.
- Her ölçü çizgisi + okları + yazısı tek grupta: `<g class="hl" data-k="<anahtar>">…</g>`; `keys` içindeki `k` aynı anahtar. Kart tıklanınca o grup kırmızı yapılır.
- Görünüm: `viewBox` genişliği 460, yükseklik 200–260; `width="100%"`; çizgi `#16203a`, tarama `#9aa6bd` 45° desen, ölçü rengi `opt.dim`, ölçü yazısı 12px bold, `font-family:inherit`. Arka plan şeffaf. Gerekiyorsa ön görünüş + kesit yan yana, küçük başlıklar ("ÖN GÖRÜNÜŞ", "KESİT A-A").
- 360px genişlikte de okunur olmalı (yazılar üst üste binmemeli).

## Teslim
- `site/draw/<aile>.js`, `site/draw/fixtures/<aile>.json` (gerçek sayfalardan toplanan ctx örnekleri),
  `site/draw/data/<aile>.json` (fotoğraftan okunan ölçüler, varsa), `site/draw/preview/<aile>.html` + `site/draw/preview/<aile>/*.png`,
  `site/draw/rapor/<aile>.md`.
- Dal: `draw/<aile>` (site-assets'ten), PR açma.
