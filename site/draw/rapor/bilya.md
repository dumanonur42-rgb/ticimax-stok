# Tane bilya ailesi — teknik çizim modülü raporu

Modül: `site/draw/bilya.js` (`window.YDRAW.bilya`, README arayüzü, ES5, dış kütüphane yok). Önizleme: `site/draw/preview/bilya.html`, ekran görüntüleri `site/draw/preview/bilya/w460-c*.png` ve `w360-c*.png` (kart numarası = fixture sırası).

## Ne zaman eşleşir (`match`)

- Breadcrumb'da `TANE BİLYA` geçiyorsa veya başlıkta `tane bilya/bilye`, `çelik bilyası`, `rulman bilyası` geçiyorsa.
- Başlıkta rulman/teker/somun/mafsal/vida/kızak geçip tane bilya ifadesi yoksa eşleşmez (rulman sayfaları `bilyali.js`'de kalır).

## Çizim

- **ÖN GÖRÜNÜŞ**: küre (gölgeli daire), eksen çizgileri, yatay A–A kesit düzlemi işaretleri, alt tarafta Ø çap ölçüsü (`data-k="Dw"`).
- **KESİT A-A**: dolu küre; tamamı taralı (içi boş değil), eksen çizgileri. Aynı ölçü ikinci kez yazılmaz.
- viewBox 460×230; 360 px genişlikte okunuyor (bkz. `w360-c*.png`).

## Okunan ölçü etiketleri (sadece ürün verisinden)

- `Bilya Çapı (Dw)`, `Bilya Çapı`, `Bilye Çapı`, `Çap`, `Çap (mm)` → Dw (değerde mm ya da sadece sayı olmalı)
- `İnç Ölçüsü` / `Ölçü (İnch)` → sadece etiket metninde gösterilir (ölçü olarak çizilmez)
- Özellik ile ön yazı aynı etikette farklı çap verirse `null` (çelişki testi: c7).
- Çap yoksa `null` (c6). Başlık/URL'deki ölçü kullanılmaz. `data/bilya.json` boş (`{}`), fotoğraftan ölçü alınmadı.

## Fixture'lar (`fixtures/bilya.json`)

| kart | kaynak | sonuç |
|---|---|---|
| c0 | sitedeki mevcut `/6-mm-tane-bilya-15958` (özellik `Çap: 6 MM`) | çizim, Ø6 |
| c1–c5 | orkapt/bilya yeni ürünlerinin teknik listesi (1010, 316, 1010 soft, 52100 G100, 316 inç) | çizim, Ø + inç |
| c6 | çap yok | null |
| c7 | özellik 8 mm / ön yazı 8,5 mm | null |
| c8 | 6307 ZZ C3 rulman | match = hayır |

## Kapsam

orkapt/bilya branch'indeki 220 yeni ürünün hepsinin ACIKLAMA teknik listesinde `Bilya Çapı (Dw)` var; 220/220 çizim çıkar. Sitedeki mevcut TANE BİLYA kategorisi (92 ürün) `Çap` etiketiyle eşleşir; mevcut ürünlerin hepsi tek tek açılıp sayılmadı.
