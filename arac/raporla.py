"""Yerel çıktıların sayısal ve kaynak izleme raporu."""
import json
from collections import Counter
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]


def main():
    if (ROOT / 'veri/aile2.json').exists():
        from aile2_raporla import main as report_combined
        report_combined()
        return
    rows = [json.loads(line) for line in (ROOT / 'urunler.jsonl').read_text().splitlines()]
    draws = json.loads((ROOT / 'veri/draw-keys.json').read_text())
    raw = [r for f in ['hg', 'hgr', 'pmi'] for r in json.loads((ROOT / f'veri/{f}.json').read_text())]
    photos = json.loads((ROOT / 'veri/gorsel-secimleri.json').read_text())
    levels = Counter(r['resim_seviye'] for r in rows)
    lengths = [len(BeautifulSoup(r['ACIKLAMA'], 'html.parser').get_text(' ', strip=True)) for r in rows]
    report = f'''# Aile 1 teslimi: 52 ürün

Girdideki 16 HGH/HGW araba (pilot dahil), 6 HGR ray ve 30 PMI MSA/MSB arabanın tamamı işlendi. Hiçbiri atlanmadı. Panel erişimi, ürün yükleme ve push yapılmadı. Bu teslim 208 kaydın 52 tanesidir; diğer 156 ürün bu adımın kapsamında değildir.

## Çıktılar

- `urunler.jsonl`: {len(rows)} satır, istenen tüm alanlar.
- `gorseller/`: {len(rows)} ürün için 500×500 JPG. Seviye: **birebir {levels['birebir']}, ayni_tip {levels['ayni_tip']}**.
- Ham değer/kaynaklar: `veri/hg.json` (16), `veri/hgr.json` (6), `veri/pmi.json` (30).
- Görsel seçimleri, ham dosya ve kesim bilgileri: `veri/gorsel-secimleri.json`.
- Her ürünün gerçek başlığı, kırıntıları, ürün kimliği, teknik listesi ve ön yazısı: `veri/lineer-ctx.json`.
- Her ürünün match/draw sonucu ve anahtarları: `veri/draw-keys.json`.
- Yerel önizleme dizini: `onizleme/index.html`; her ürüne ait HTML ve SVG aynı dizinde.
- Görünür açıklama uzunluğu: {min(lengths)}–{max(lengths)} karakter. İç linkler yalnız `katurl.txt` içindeki lineer araba ve ray kategorileridir.

## Kaynak ve teknik sınırlar

'''
    for source in sorted(set(r['kaynak'] for r in raw)):
        report += '- ' + source + '\n'
    report += '''
Resmi PDF kopyaları `veri/hg-resmi-katalog.pdf` ve `veri/pmi-resmi-katalog.pdf` içindedir. İlgili sayfaların metin dökümleri `veri/*sayfa-*.txt` dosyalarında saklanır.

- HGH: HG PDF sayfa 41; HGW: sayfa 45. Her ham kayıtta model satırı bulunur. Yamansa blokları için yalnız ölçüsel geometri kullanıldı. Eşdeğer markanın dinamik/statik yükü ve ağırlığı ayrı `referans_degerler` içinde tutuldu, satış alanlarına aktarılmadı.
- HGR: üstten havşalı delikli ray ölçüleri HG araba tablolarındaki ray kesitinden alındı. **HGR-T alttan dişli rayın h/ ağırlık değerleri kullanılmadı.** WR, HR, D, h, d, P, E ve girdideki 4000 mm boy ham veride bulunur. E standart katalog uç mesafesidir; 4 metre kesimin iki ucunda kesin E eşitliği iddia edilmez. Yamansa kg/m doğrulanamadığı için referans ağırlık müşteri alanına yazılmadı.
- PMI A/LA, E/LE ve S/LS tabloları PDF sayfa 30–32; MSB E ve S sayfa 41–42. A/LA üstten, E/LE üstten veya alttan montajdır. LS/LA/LE uzun gövdeyi ayırt eder. MSB E/S ağır yük gövdeleri TE/TS kısa gövdeyle karıştırılmadı.
- PMI FC hafif ön yük, N normal hassasiyet sınıfıdır (kod açıklamaları sayfa 25/36). SS iki yönlü uç keçesi + alt keçe; ZZ bunlara ek metal sıyırıcıdır (sayfa 122). ZZ toplam L ölçüleri sayfa 125 uzunluk farkıyla güncellendi. Ayrı ZZ ağırlığı verilmediğinden 4 varyantta ağırlık aktarılmadı; kapasite resmi markanın kendi değeridir. Dinamik kapasiteler 50 km nominal ömür esasıyla verilir, doğrudan güvenli çalışma yükü olarak sunulmaz.
- Çizim etiketleri için PMI H2 → H1 (alt açıklık), W2 → N (yanal taşma), ray W1 → WR ve ray H1 → HR eşlemesi yapıldı. Özgün PMI etiketleri de `katalog_etiketleri` içinde korunur. `arac/lineer.js` değiştirilmedi; geometrik şema üretir, üretim/tolerans resmi değildir.
- Pilotun kamuya açık CA karşılaştırması `veri/lineer.json` içinde korunur: https://www.yamansarulman.com/hgh-20-ca-lineer-araba-18295 . CA'nın C/L/L1 değerleri HA'ya aktarılmadı.

## Görsel seçimi ve kontrol

Önce aynı kod arandı; bulunamayanlarda gövde formu aynı, okunur farklı kodu ve yasak logosu olmayan gerçek fotoğraflar seçildi. `birebir`, aynı model kodunun fotoğrafını ifade eder; gerçek Yamansa stok çekimi olduğu iddia edilmez. PMI'nin kendi logosu yalnız PMI ürünlerinde serbesttir. Teknik çizimler, renderlar, filigranlı fotoğraflar ve ambalajlar ürün görseli olarak kullanılmadı.

FOnlineGuide 45HA/45CC/45HC sayfalarının bazı fotoğraflarında 35 kodu görüldüğünden bu fotoğraflar reddedildi. 45HA ve 45HC için kodu görünmeyen aynı tip alt görünüş; 45CC için kodsuz kısa flanş alt görünüş kullanıldı. PMI'de geniş/dar, normal/uzun ve MSB alçak tip fotoğrafları ayrı seçildi. SS/ZZ varyantlarda seviye `ayni_tip` olup fotoğraf conta/sıyırıcı seçeneğinin birebir kanıtı değildir; doğru conta teknik listede yazılıdır.

Ürün dışındaki montaj parçaları satışa dahil değildir. Uzun ray kuyrukları ve diğer ürünler kadraj dışında tutuldu. Renkli/gri zeminlerde rembg `isnet-general-use` kullanıldı. HGW25CC'nin parlak orta yüzeyinde ilk maskenin kestiği alan, kaynak fotoğrafın gerçek pikselleri korunarak geri alındı; ürün yazısı/logo silinmedi ve yeni ürün detayı çizilmedi.

Tuval saf beyazdan kurulur, `sablon.png` dosyasından **yalnız üst 100 px** kopyalanır. Alt panelin tamamı beyazdır. Ürün oranı korunarak yaklaşık 440×240 kutuyu mümkün olduğunca dolduracak şekilde ölçeklenir. Pilotun açık gri şeridi kaldırıldı, aynı HGH20HA kodlu logosuz fotoğrafı `birebir` yapıldı.

Seçilen bütün kaynak fotoğraflar ve bitmiş ürünlerin 4 kontrol paftası açılarak incelendi: `onizleme/gorsel-kontrol-1.jpg` … `onizleme/gorsel-kontrol-4.jpg`. Ayrıca tekil bitmiş örnekler bizzat açıldı:

'''
    examples = ['ORK LA HGH20HA', 'ORK LR HGR25', 'PMI MSA30LE', 'PMI MSB15S', 'ORK LA HGW25CC']
    for code in examples:
        report += '- `' + next(r['resim'] for r in rows if r['kod'] == code) + '`\n'
    report += '\n### Ürün bazında görsel kaynakları\n\n| Kod | Seviye | Kaynak |\n|---|---|---|\n'
    for row in rows:
        report += f"| {row['kod']} | {row['resim_seviye']} | {row['resim_kaynak']} |\n"
    report += '\n## Eksik bayraklı ürünler\n\n'
    for row in rows:
        if row['bayraklar']:
            report += '- **' + row['kod'] + '**: ' + '; '.join(row['bayraklar']) + '\n'
    report += '\n## Çizim tablosu\n\nHer bağlamda `window.YDRAW.lineer.match(ctx)` ve `draw(ctx, options)` çağrıldı. Hepsi eşleşti ve null olmayan SVG üretti. Her üründe zorunlu bir ölçü kaldırıldığında null döndüğü de kontrol edildi.\n\n| Kod | match | draw() | keys |\n|---|---|---|---|\n'
    for result in draws:
        report += f"| {result['kod']} | {str(result['match']).lower()} | {result['sonuc']} | {', '.join(result['keys'])} |\n"
    report += '''
## Denetim ve önizleme

`arac/denetle.py` zorunlu alanları, boş değerleri, marka yasağını (URL ve dosya adı dahil), U+0307/uzun tire/ondalık noktayı, SEO sınırlarını, açıklama uzunluğunu/bölümlerini, izinli iç linkleri, 120+ karakter paragraf tekrarlarını, ONYAZI ve teknik liste yapısını ve 500×500 JPEG dosyalarını kontrol eder. `--aile` ayrıca 52 girdinin tümünün birer kez işlenmesini, ham değer/kaynakları, çizim bağlamı/sonuç kapsamını ve satış metniyle ölçü eşitliğini denetler.

'''
    for file, command in [('denetim.txt', 'python3 arac/denetle.py urunler.jsonl --aile'), ('testler.txt', "python3 -m unittest discover -s arac -p 'test_*.py'")]:
        report += f'```text\n$ {command}\n' + (ROOT / 'veri' / file).read_text().rstrip() + '\n```\n\n'
    report += '''
Örnek masaüstü/mobil PNG'ler:

- `onizleme/ORK_LA_HGH20HA.png`, `onizleme/ORK_LA_HGH20HA_mobil.png`
- `onizleme/ORK_LR_HGR25.png`, `onizleme/ORK_LR_HGR25_mobil.png`
- `onizleme/PMI_MSA30LE.png`, `onizleme/PMI_MSA30LE_mobil.png`
- `onizleme/PMI_MSB15S.png`, `onizleme/PMI_MSB15S_mobil.png`
- `onizleme/hgh20ha-cizim.png`

52 HTML, 1280 ve 390 px genişlikte yerel Chrome ile render edildi; ön yazı kutuları ve yatay taşma kontrol edildi. Örneklerin görsel+ön yazı+çizim kesitleri `onizleme/kontrol-*.png` içinde ayrıca görüntülendi. Canlı mağaza entegrasyonu denenmedi.

## Yeniden üretim

```sh
python3 arac/veri_hazirla.py
python3 arac/gorsel_sec.py
OMP_NUM_THREADS=2 python3 arac/gorsel_hazirla.py
python3 arac/aile_hazirla.py
/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node arac/ciz.js
python3 arac/onizle.py
python3 arac/denetle.py urunler.jsonl --aile
python3 -m unittest discover -s arac -p 'test_*.py'
python3 arac/raporla.py
```

Görsel arama aracı `arac/gorsel_ara.py` yalnız aday indirir; kendiliğinden ürüne atamaz. Yerel ham fotoğraflar saklandığından yeniden üretimde kaynak sitelere erişim gerekmez. Python: Pillow, beautifulsoup4, numpy, scipy, rembg[cpu], playwright; PDF dökümleri için pypdf kullanıldı. Chrome `/home/ubuntu/.local/bin/google-chrome`, Node mevcut nvm dizinindedir; PATH yerine mutlak yolu kullanıldı. `arac/hazirla.py` eski tek ürün pilot aracıdır; 52'li teslim için `arac/aile_hazirla.py` kullanılır.

## Sonraki ürünler için ek satış birimi kuralı

Paket/koli ürünleri sitede ADET olarak satılır. Gelecek `ORK GKT MG2xx` kaynak tellerinin adına `(15 KG/PKT)` veya `5.000 Adet Koli` gibi paket bilgisi eklenmeyecek; açıklamada paket/koli halinde satış iddia edilmeyecek. Teknik listede `Satış Birimi: Adet`, gerekiyorsa `Ambalaj: 15 kg/paket` yazılacak. 4 metre ve 5700 mm gibi ürün boyları paket sayılmaz ve ad içinde korunur. Bu 52 kaydın dışında kalan kaynak telleri bu adımda değiştirilmedi.
'''
    (ROOT / 'rapor.md').write_text(report)
    print(f'Rapor: {len(rows)} ürün; {sum(bool(r["bayraklar"]) for r in rows)} eksik; {dict(levels)}')


if __name__ == '__main__':
    main()
