"""İki ailenin ortak teslim raporu; önceki teslimin raporu arşivde korunur."""
import json
from collections import Counter

from bs4 import BeautifulSoup

from aile2_hazirla import CATEGORIES
from aile_hazirla import ROOT


def main():
    rows = [json.loads(line) for line in (ROOT / 'urunler.jsonl').read_text().splitlines()]
    raw = json.loads((ROOT / 'veri/aile2.json').read_text())
    codes = {r['kod'] for r in raw}
    extra = [r for r in rows if r['kod'] in codes]
    draws = json.loads((ROOT / 'veri/draw-keys.json').read_text())
    levels = Counter(r['resim_seviye'] for r in rows)
    extra_levels = Counter(r['resim_seviye'] for r in extra)
    lengths = [len(BeautifulSoup(r['ACIKLAMA'], 'html.parser').get_text(' ', strip=True)) for r in extra]
    report = f'''# Aile 1 + Aile 2 teslimi: {len(rows)} ürün

Önceki **52 ürün aynen korundu**, ikinci ailenin **56 girdisinin tamamı** eklendi. Kapsam: 12 KKM, 13 İM, 7 SAC, 4 TBR, 6 VM, 6 Yamansa SFU, 3 ETAZON SFU, 5 DSG. SAC25/30'un 3 ve 4 metre varyantları ayrı kayıttır. 208 girdiden kalan 100 ürün bu teslimde işlenmedi. **Panele girilmedi, yükleme ve push yapılmadı.**

## Önemli teknik sınırlar

- KKM/İM için yalnız girdideki çap ve 4000 mm boy kesin bilgi kabul edildi. h6/g6, HRC, krom kalınlığı, CF53/Ck45 ve kg/m bulunamadı; başka markadan aktarılmadı. KKM'ye ek indüksiyon, İM'ye ek krom kaplama yakıştırılmadı. Krom kaplama ile indüksiyon ayrı işlemler olarak anlatıldı, ürünlerin birlikte her iki işlemi gördüğü iddia edilmedi.
- **ETAZON resmi kaynak bulunamadı.** Üç ETAZON ürününün markası korundu; başka markanın ölçü/yükleri aktarılmadı. Yalnız girdi/modeldeki çap ve adım kullanıldı.
- **SFU tam sirkülasyon eki belirsiz.** Resmi katalog SFU1605-3 için L40, -4 için L50 veriyor. Girdi SFU1605 diyor; keyfi -4 seçilmedi. Diğer SFU varyantlarında da tam ek yok. D/A/L/B/W/X/Q ve bilya çapı, eşleşmeyen tam varyanttan satış metnine aktarılmadı. Nominal çap/adım dışında kesin gövde değerleri eksik işaretlendi. Yamansa Ca/Coa yazılmadı.
- **SAC kesiti belirsiz.** ERSA SAC16 ile FYC SAC16-1000 kesit tabloları aynı değil; FYC bir tedarikçi, birebir Yamansa üretici kaynağı değil. Örneğin taban genişlikleri kataloglar arasında değişiyor. SAC40 için ERSA tablosu boş. Boyu ve çapı girdiden alındı; SBR araba ölçüleri destekli mile aktarılmadı.
- TBR16/20/25/30UU montaj ölçüleri, aynı model kodlarını yayımlayan üretici KOLMB/Ningbo Baoding tablosundan alındı. Yük ve ağırlık Yamansa'ya aktarılmadı.
- DSG16H/20H/25H/32H montaj geometrisi, eş kodlu Wangong tablosundan alındı. **DSG40H katalogları çelişkili** (H/h/L/C2/P); bu gövdeye nominal uyumlu mil çapı ve girdideki alüminyum dışında değer atanmadı. DSG bir gövdedir; bilya çapı/adım/Ca/Coa ona ait ölçüler değildir.
- Eksik teknik alanlar tire, boş kutu veya tahminle doldurulmadı. Yeni 56 kaydın {sum(bool(r['bayraklar']) for r in extra)} tanesinde, toplam {len(rows)} kaydın {sum(bool(r['bayraklar']) for r in rows)} tanesinde eksik bayrağı var. Ayrıntılar aşağıdadır.

## Dosyalar ve yeniden üretim

- Ürünler: `urunler.jsonl`; açıklamaların yeni ailede görünür uzunluğu {min(lengths)}–{max(lengths)} karakter.
- Ham değer/kaynak: `veri/aile2.json`; eski aile `veri/hg.json`, `hgr.json`, `pmi.json`.
- Yeni araçlar: `arac/aile2_veri.py`, `aile2_gorsel.py`, `aile2_hazirla.py`, `aile2_raporla.py`, `kontak.py`, `test_aile2.py`.
- Görsel seçimleri: `veri/aile2-gorsel-secimleri.json`; her seçimde kaynak URL, ham fotoğraf, seviye ve kesim bilgisi var.
- Bağlam/çizim: `veri/lineer-ctx.json`, `veri/draw-keys.json`, `veri/cizim.txt`.
- Yerel HTML dizini: `onizleme/index.html` (108 ürün). Modülsüz üründe boş/yanlış çizim bölümü gösterilmez.
- Önceki Aile 1 tesliminin raporu kaybolmadı: `veri/aile1-rapor.md`. Oradaki 52 ürünlük denetim çıktıları tarihsel teslimdir; güncel toplam çıktılar bu rapordadır.

```sh
python3 arac/veri_hazirla.py
python3 arac/aile2_veri.py
python3 arac/gorsel_sec.py
python3 arac/aile2_gorsel.py
OMP_NUM_THREADS=2 python3 arac/gorsel_hazirla.py
OMP_NUM_THREADS=2 python3 arac/gorsel_hazirla.py veri/aile2-gorsel-secimleri.json
python3 arac/aile_hazirla.py
/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node arac/ciz.js
python3 arac/kontak.py
python3 arac/onizle.py
python3 arac/denetle.py urunler.jsonl --aile
python3 -m unittest discover -s arac -p 'test_*.py'
python3 arac/raporla.py
```

## Kaynaklar

Nominal çap/boy ve ürün tipi: `parca/lineer_diger.jsonl.gz`. URL bulunmayan kesin girdi bilgisi ham veride `girdi:parca/...#kod` olarak açıkça gösterildi; uydurma kaynak URL yazılmadı. `teknik_kaynak` alanındaki yerel girdi referansı bir katalog bağlantısı değildir. Yalnız araştırma için bakılan, satış alanına değer aktarılmayan URL'ler ham kaydın `referans_kaynaklar` alanında tutulur.

- TBR resmi üretici: https://www.kolmb.com.cn/en/prd-20.html — yerel kopya `veri/tbr-resmi-sayfa.html`.
- DSG resmi üretici: https://www.wangong.net/product/coupling-nut-housing/bsg-dsg-series-aluminum-nut-housing.html — içerik dökümü `veri/dsg-resmi-tablo.txt`. Doğrudan HTTP 403 verdi, kamu içerik aracıyla tablo okundu.
- SFU resmi üretici (varyant referansı, satış gövde değeri değil): https://www.wfint.com.tw/Ball-Screw-SFU-Series-DIN69051/Ball-Screw-Factory.html — `veri/sfu-resmi-sayfa.html`, `veri/sfu-resmi-cizim.jpg`.
- SAC karşılaştırması: https://www.ersarulman.com/tr-TR/sac/3/15/97 ve https://fycrulman.com/wp-content/uploads/2021/09/katalog.pdf — `veri/fyc-lineer-katalog.pdf`, `veri/fyc-sayfa-5.txt`.
- DSG40 karşılaştırması: https://saivsautomatic.com/ball-screw/dsg-series-ball-nut-housing-178.html ve indekslenmiş Limon tablosu https://www.powerbelt.hu/uploads/source/Lintech/katalog/Limon_DSG.pdf (doğrudan PDF 404; canlı dosya doğrulanmış gibi sunulmadı).
- Orkapt kamu sitesi ve model aramalarında yeni aileye ait ürün özelinde teknik satır bulunamadı. Girdide tüm 56 `orka_site` alanı null. `ETAZON`, `ETAZON SFU somun katalog`, `ETAZON official linear ball screw` aramalarında resmi kaynak bulunamadı.

Eski ailenin resmi HG/PMI kaynakları ve yük/ağırlık sınırları `veri/aile1-rapor.md` içinde aynen korunmuştur.

## Kategoriler ve iç linkler

`veri/kategori-aile2.json` kategori kararlarını ve kamu URL kontrolünü saklar. KKM/İM için `site_kategoriler.txt` içindeki ortak kategori ve onun `/krom-kapli-` breadcrumb'ı doğrulandı. Ortak kategori adında krom geçmesi, İM ürününün ayrıca krom kaplı olduğuna ilişkin ürün iddiası değildir.

Diğer beş alt yol `site_kategoriler.txt` içinde yok; **katurl.txt içindeki URL adından LİNEER altında türetildi**, bu yüzden brief doğrultusunda `yeni_kategori:false`. Ancak bu beş kamu URL'si kontrol sırasında `/?c=1` ana sayfasına yönlendi; canlı kategori kimliği/breadcrumb doğrulanamadı. Yüklemeden önce bu kimliklerin teyidi gerekir. Bu adım yükleme içermez. Aynı URL'ler açıklamaya iç link yapılmadı; açıklamalarda yalnız katurl'da bulunan ve kamu sayfası açılan `krom-kapli-`, `sbr-serisi`, `lIneer`, `vidali-mil-uc-yatagi` kullanıldı (ürün başına iki link).

| Alt tip | Kategori | Dayanak |
|---|---|---|
'''
    for family, (category, url) in CATEGORIES.items():
        report += f'| {family} | LİNEER>{category} | katurl: /{url}; ' + ('mevcut yol' if family in ['KKM', 'IM'] else 'URL adından türetildi, canlı kimlik teyidi gerekli') + ' |\n'
    report += '\n## Teknik etiket listeleri\n\nÖlçü etiketleri `Etiket (Harf)` biçimindedir. Marka ve malzeme sayısal ölçü olmadığı için harf almaz. Eksik ölçü etiketi müşteri listesine boş olarak eklenmedi. TBR gövde harfleri, farklı çizim standardına dönüştürülmeden üreticinin harfleriyle korundu.\n\n'
    for family in CATEGORIES:
        labels = list(dict.fromkeys(label for r in raw if r['aile'] == family for label in r['degerler']))
        report += '- **' + family + '**: ' + ', '.join('`' + label + '`' for label in labels) + '; `Marka`.\n'
    report += '''
## Görseller ve görme kontrolü

Üst 100 px şablon bandı korunur, tuvalin kalanı saf beyazdan kurulur. Ürün 440×240 kutuya oranı korunarak sığdırılır; önceki gri şerit geri gelmedi. Yeni mil, destekli mil ve gri zeminli SFU2005 fotoğraflarında rembg isnet-general-use uygulandı; delik boşlukları korunur. Milin parlak yüzeyi gerçek kaynak pikselleriyle maskede korundu. Ürün yazısı/logo silinmedi. SFU2505 fotoğrafındaki ürün dışı model yazısı kadraj dışında tutuldu.

Yeni görüntüler birebir Yamansa/ETAZON stok varyantı olarak doğrulanmadığından **aynı tip** seviyesinde tutuldu. Mil fotoğrafı tek, dolu ve işlenmemiş düz mili; VM fotoğrafı somunsuz bilyalı vidalı mil yüzeyini; TBR açık flanşı; DSG alüminyum gövdeyi gösterir. SFU1605/2005/2505/3210 için altı delikli, 4010/5010 için sekiz delikli flanş görünüşü kullanıldı. Büyük iki SFU için aynı logosuz/kodsuz sekiz delikli gerçek fotoğraf kullanıldı; fotoğraf devre sayısı veya ölçü kanıtı sayılmaz. Kutu, kablo bağı, filigran, okunur farklı kod veya başka marka logosu gösteren adaylar seçilmedi. Bir kısım somundaki bilya tutma aktarım kovanı montaj yardımcısıdır; mil veya somun gövdesi değildir.

Seçilen her benzersiz kaynak fotoğraf açılarak incelendi. Bitmiş **56 görselin tümü** `onizleme/aile2-kontak.jpg` paftasında açılarak kontrol edildi. Yeni düz mil fotoğrafında ilk kontrolde görülen soluk zemin, tek milin arka planı ayrılarak giderildi. Son kontrol paftası ve tekil örnekler bu düzeltmeden sonradır.

'''
    report += f"- Aile 2: **birebir {extra_levels['birebir']}, ayni_tip {extra_levels['ayni_tip']}**.\n- Toplam: **birebir {levels['birebir']}, ayni_tip {levels['ayni_tip']}**.\n"
    report += '''
### Aile 1: ray üzerinde görünen arabalar

`onizleme/aile1-araba-kontrol.jpg` ile 16 araba yeniden gözden geçirildi. HGH45HA, HGW30CC, HGW45HC için raysız alternatif arandı. Bulunanlar farklı kod, rakip logo, filigran veya yanlış kısa/uzun gövde nedeniyle reddedildi. Mevcut fotoğraflar korunmuştur:

- **HGH45HA: rayla birlikte görünüyor.** Ürün yalnız arabadır.
- **HGW30CC: rayla birlikte görünüyor.** Ürün yalnız arabadır.
- **HGW45HC: rayla birlikte görünüyor.** Ürün yalnız arabadır.
- Ek kontrolde **HGW30HC: rayla birlikte görünüyor.** Ürün yalnız arabadır; aynı uzun flanş formunda kurala uygun raysız alternatif bulunamadı.

Ray dahil set olarak sunulmaz; araba adları/kategorileri değişmedi.

### Aile 2 ürün bazında görsel kaynağı

| Kod | Seviye | Fotoğraf |
|---|---|---|
'''
    for row in extra:
        report += f"| {row['kod']} | {row['resim_seviye']} | {row['resim_kaynak']} |\n"
    report += '\n## Eksik bayraklı ürünler (toplam)\n\n'
    for row in rows:
        if row['bayraklar']:
            report += '- **' + row['kod'] + '**: ' + '; '.join(row['bayraklar']) + '\n'
    report += '''
## Çizim sonuçları (toplam)

Mevcut `arac/lineer.js` değiştirilmedi. 52 eski ürüne ek olarak 25 KKM/İM mil bağlamı mevcut `mil` alt tipiyle çizilir; `dr`, `Lm` anahtarları aranır. Boy kaldırıldığında null dönmesi de kontrol edilir. SAC/TBR/VM/SFU/DSG için yeni modül yazılmadı: 31 bağlam `cizim_modulu:null` taşır. Bu ailelerde genel lineer match=true olabilse de yanlış BK/BF veya SBR çizimi çağrılmaz; sonuç **modül yok / çağrılmadı** olarak ayrı kaydedilir. Bu, başarısız bir çizimi başarılı sayma değildir.

| Kod | match | Sonuç | Anahtarlar |
|---|---|---|---|
'''
    for drawing in draws:
        report += f"| {drawing['kod']} | {str(drawing['match']).lower()} | {drawing['sonuc']} | {', '.join(drawing['keys']) or 'uygulanmaz'} |\n"
    report += '\n## Denetim ve yerel önizleme\n\n'
    for file, command in [('denetim.txt', 'python3 arac/denetle.py urunler.jsonl --aile'), ('testler.txt', "python3 -m unittest discover -s arac -p 'test_*.py'")]:
        report += f'```text\n$ {command}\n' + (ROOT / 'veri' / file).read_text().rstrip() + '\n```\n\n'
    report += '```text\n' + (ROOT / 'veri/cizim.txt').read_text().splitlines()[-1] + '\n' + (ROOT / 'veri/onizleme.txt').read_text().splitlines()[-1] + '\n```\n\n'
    report += '''Örnekler: `onizleme/ORK_KKM_20.png` ve `_mobil.png`, `onizleme/ORK__M_20.png` ve `_mobil.png`, `onizleme/ORK_ADM_SAC204000.png`, `onizleme/ORK_LR_TBR20UU.png`, `onizleme/ORK_VM_2505.png`, `onizleme/ORK_VMS_SFU3210.png`, `onizleme/ETA_VMS_SFU2005.png`, `onizleme/ORK_VSG_DSG40H.png`. İlgili HTML'ler aynı dizinde. Seçilmiş sayfaların görsel/ön yazı/çizim yüzeyi `onizleme/aile2-sayfa-kontrol.jpg` içinde açılarak kontrol edildi. Canlı mağaza entegrasyonu denenmedi.

Paket/Adet kuralı korunur: ileride GKT kaynak teli ürünleri adet olarak sunulacak, adlarında paket/koli ifadesi kullanılmayacak. Bu ailedeki 4 metre, 3 metre, 4000 mm ve 5700 mm değerleri paket değil ürün boyudur; adlarda tutulmuştur.
'''
    (ROOT / 'rapor.md').write_text(report)
    print(f'Rapor: {len(rows)} ürün; {len(extra)} yeni; {sum(bool(r["bayraklar"]) for r in rows)} eksik; {dict(levels)}')


if __name__ == '__main__':
    main()
