# Burçlu V kasnak hazırlama araçları

Panel veya yükleme işlemi yapmaz. Ana araçlar: `veri.py`, `ad.py`, `gorsel_uret.py`, `icerik.py`, `denetle.py`.

## Girdiler ve ortam

- `BURCLU_WORK`: çalışma veri dizini; varsayılan `~/work`. `bk.jsonl`, `chi.pdf`, `veri.jsonl`, fotoğraf aday manifestleri/kaynak fotoğrafları ve `gorsel_map.jsonl` burada tutulur. Bunlar mevcut hazırlama çalışmasının girdileridir; tüm ham kaynak arşivi bu araç klasörüne kopyalanmamıştır.
- `BURCLU_REPO`: ana checkout; varsayılan `~/repos/ticimax-stok`.
- Bağımlılıklar: requests, beautifulsoup4, PyMuPDF, Pillow, NumPy, SciPy, opencv-python-headless; ön izleme için websockets ve Node.
- Bu teslimde görüntü işleme ortamı `~/work/photoenv/bin/python`; diğer araçlar `python3` ile çalışır. Node gerekiyorsa mevcut `~/.nvm/nvm.sh` yüklenir.

## Üretim sırası

```sh
python3 tools/burclu_kasnak/veri.py
~/work/photoenv/bin/python tools/burclu_kasnak/gorsel_uret.py
python3 tools/burclu_kasnak/icerik.py
python3 tools/burclu_kasnak/denetle.py
python3 tools/burclu_kasnak/icerik_ctx.py
node tools/burclu_kasnak/cizim_kontrol.js
```

`veri.py` resmi KYS sayfasını yeniden okur; yeniden üretim kaynak güncellemelerini yansıtabilir. Kabul edilmiş veri değiştirilmek istenmiyorsa ilk iki adımı atlayıp mevcut teknik/görsel girdileri kullanın. Fotoğraf eşleşmeleri elle görsel denetlenmiş manifest seçimleridir; otomatik yeni kaynak araması yapılmaz.

`icerik.py` zorunlu çizim alanı bulunmayan 12 ürüne `eksik` ve `cizim_yok` ekler. Kaynak/görsel bayraklarını korur. Denetimde müşteri alanları yasak kelimelerden arındırılır; onayla iç kaynak URL'leri ve bayraklar muaftır. Eksik 11 teknik kaynak URL'si null kalır.

## Kontroller ve yerel ön izleme

```sh
python3 tools/burclu_kasnak/test_ad.py
python3 tools/burclu_kasnak/test_icerik.py
~/work/photoenv/bin/python tools/burclu_kasnak/test_gorsel.py
python3 tools/burclu_kasnak/onizleme.py
python3 tools/burclu_kasnak/onizleme_render.py
```

Ön izleme üreticisi `origin/site-assets` varlıklarını ve `draw/burclu_kasnak` modülünü yerel `onizleme/assets` altına alır; gerçek `site/build.py` ile site paketini üretir. `origin/site-assets` ayrı bir yon.css içermediği için temel CSS `ornek/yon.css` dosyasından alınır; gerçek kutu CSS'si ayrıca değişmeden kullanılan `onyazi.js` tarafından eklenir. Hiçbir uzak ürün sayfası veya panel açılmaz. Render aracı localhost:29230 üzerindeki mevcut headless Chrome CDP bağlantısına ihtiyaç duyar.
