import gzip
import json
import re
from collections import Counter

from aile_hazirla import ROOT


def main():
    rows = [json.loads(line) for line in (ROOT / 'urunler.jsonl').read_text().splitlines()]
    raw = [r for name in ['hg', 'hgr', 'pmi', 'aile2', 'aile3', 'aile4'] for r in json.loads((ROOT / f'veri/{name}.json').read_text())]
    family = json.loads((ROOT / 'veri/aile4.json').read_text())
    photos = json.loads((ROOT / 'veri/aile4-gorsel-secimleri.json').read_text())
    drawings = json.loads((ROOT / 'veri/draw-keys.json').read_text())
    extra_file = ROOT / 'veri/ek-cizim-sonuclari.json'
    if extra_file.exists():
        extra = {r['kod']: r for r in json.loads(extra_file.read_text())}
        drawings = [extra.get(r['kod'], r) for r in drawings]
    with gzip.open(ROOT / 'parca/lineer_diger.jsonl.gz', 'rt') as stream:
        codes = [json.loads(line)['kod'] for line in stream]
    levels = Counter(r['resim_seviye'] for r in rows)
    missing = [r for r in rows if any(f.startswith('eksik:') for f in r['bayraklar'])]
    out = ['# Lineer ve diğer ürünler: 208 kayıt, Aile 4 son teslim', '',
           f'- Girdi: {len(codes)} satır, {len(set(codes))} benzersiz kod; yinelenen girdi kodu: {len(codes) - len(set(codes))}.',
           f'- Çıktı: {len(rows)} satır, {len(set(r["kod"] for r in rows))} benzersiz kod; atlanan veya fazladan ürün yok.',
           '- Aile 4: 22 BMT + 16 SSPHS/SSPOS + 3 GKT + 4 YKKM + 1 S060 = 46 ürün. Brief dışında kalan ek aile yok.',
           f'- Toplam görsel: {levels["birebir"]} birebir, {levels["ayni_tip"]} aynı tip. Aile 4 görsellerinin tamamı aynı tip; kesin kod/boy fotoğrafı iddiası yok.',
           f'- Eksik bayraklı toplam {len(missing)} ürün; Aile 4 içinde {sum(bool(r["bayraklar"]) for r in family)} ürün. Eksik ölçüler/yükler doldurulmadı.',
           '- Panel erişimi, mağazaya yükleme ve push yapılmadı. Bu paket yerel inceleme içindir; eksik bayrakları yayın öncesi onay gerektirir.',
           '- Önceki teslim raporları: `veri/aile1-rapor.md`, `veri/aile2-rapor.md`, `veri/aile3-rapor.md`. Eski M532/534/536 diş sayısı kararını aşağıdaki düzeltme geçersiz kılar.', '',
           '## Pinyon M532 / M534 / M536 düzeltmesi', '',
           '| Kod | Kaynak tablo hücresi (hatalı) | B2B addaki z | m | Dp | Müşteriye verilen z |',
           '|---|---:|---:|---:|---:|---:|']
    for r in raw:
        if 'dis_sayisi_duzeltmesi' in r:
            cells = r['orka_site']['satir']
            z = r['degerler']['Diş Sayısı (Z)']['deger']
            out.append(f'| {r["kod"]} | {cells[3]} | {z} | {cells[2]} | {cells[5]} | {z} |')
    out += ['', 'Her üçünde m×z=Dp: 5×32=160, 5×34=170, 5×36=180 mm. Diş sayısı boyutsuzdur. Ham hatalı hücreler ve B2B adları korundu; kaynak düzeltmesi ham kayıtta `dis_sayisi_duzeltmesi` alanındadır. Ad/modül/Dp eşleşmezse sayı geri konmaz; bu olumsuz durum test kapsamındadır.', '',
            '## Aile 4 kaynak kararları ve sınırlar', '',
            '- **BMT:** CY/IA/NL ve SP kodları için üretici/aynı kod katalogları incelendi. New Ball ve Techprim bazı SP bilya çapı, yük ve yüksekliklerinde ayrışıyor; çelişkili değerler aktarılmadı. SP12B ve NL8H için doğrudan kendi kod sayfasındaki yük bilgisi verildi. Kod kaynağı bulunmayan varyantlarda yalnız adın kesin malzeme/montaj bilgisi kullanıldı.',
            '- **SSPHS/SSPOS güncellemesi:** B2B adındaki R (A) eşlemesi kullanıcı tarafından onaylandı; Finer/SDTZ aynı SSPHS/SSPOS baz kodunun 6/8/10/12/16/20 boyutları ve kendi kod yükleri 12 ürüne aktarıldı. Harfler katalogdaki d/B/dk/C1/d2/h1/L3/L4/L5/W/d3/d4 veya h/L1/L2/L7 olarak korunur; farklı bir D/d1 uydurulmadı. 14 ve 18 satırı bulunmadığı için dört ürüne ölçü/yük verilmedi. SSPHS-6 diş hücresi M6*10 şüpheli olduğundan yalnız M6 nominali yazıldı. Sağ/sol diş iddiası yoktur.',
            '- **GKT:** Gedik SG2 belgesi G3Si1 / ER70S-6 eşdeğerliğini, 0,8/1,0/1,2 mm çapları destekliyor. Yamansa parti kimyası, mekanik deney değerleri ve makara ölçüleri aktarılmadı. Adlarda paket miktarı yok; teknik listede `Satış Birimi: Adet`, `Ambalaj: 15 kg/paket` var. Açıklama paket halinde satıldığı iddiasını içermiyor.',
            '- **YKKM:** Tam kodlu güvenilir teknik kaynak bulunamadı. Yalnız girdi adlarındaki 800/1000/1500/2000 kg kapasite yayınlandı; voltaj, güç, hız, kremayer modülü, uzaktan kumanda, çalışma oranı ve dişli bilgisi verilmedi.',
            '- **SFU güncellemesi:** Sekiz ORK/ETA somununda Wei-Fong ve Limon aynı kod tablolarının ortak D/A/B/W/X/H/Q/Da montaj geometrisi yayınlandı. 1605/2005/2505/3210/4010 için -3/-4 satırları karşılaştırıldı. Dokuzuncu ürün SFU5010 iki katalogda da yalnız -4: ikinci varyantın ortak geometrisi kanıtlanamadığından d/Ph dışında ölçü verilmedi. Hiçbirinde L, yük ve sirkülasyon sayısı verilmedi. Q yalnız ortak nominal M6/M8; Limon’daki adım tek kaynaktan eklenmedi. ETAZON resmi kaynak eksikliği korunur; ortak geometri kullanıcı onayıyla alınmıştır. VM zaten kaynak adının d/Ph/L değerlerini içerir; başka somunun bilya çapı mile kopyalanmadı. DSG16–32 ortak geometriyi zaten içerir; DSG40 için tam kodlu ikinci güvenilir tablo bulunmadığından çelişkili ölçüler eklenmedi. Limon PDF ve okunmuş pafta: veri/sfu-limon-katalog.pdf, veri/sfu-limon-tablo.png.',
            '- **S060 ve D/L tuzağı:** CTL 250 resmi tablo PDF’sinde CTL250-60 için d=60, D=90; bu kaynakta 60×90 dış çaplı d×D ölçüsüdür. Sitedeki S040 alanı d/D derken ek JPEG aynı 40×65 adını d/L diye etiketliyor. Bu JPEG çelişkisi göz ardı edilmedi: üretici tablosundaki 38/40/42/45/48/50 çiftleri site adlarıyla d×D olarak eşleşiyor; 65/75/80 değerleri üreticinin L değerleri değil. Bu nedenle müşteri alanında `İç Çap (d): 60 mm`, `Dış Çap (D): 90 mm` kullanıldı; 90 mm boy denmedi. Site JPEG’i `veri/aile4-s040-ek.jpeg` içinde saklandı. L/L1, vida, tork ve yük verileri aktarılmadı. S040 ürün fotoğrafı kodsuz aynı tip kaynak olarak kullanıldı; S060’a birebir fotoğraf denmedi.', '',
            '## Kategori kararları', '',
            '| Aile | Yol | Yeni kategori | Ek kategori |', '|---|---|---|---|']
    for f in ['BMT', 'PM', 'GKT', 'YKKM', 'KK']:
        record = next(r for r in family if r['aile'] == f)
        item = next(r for r in rows if r['kod'] == record['kod'])
        out.append(f'| {f} | {item["KATEGORI"]} | {item["yeni_kategori"]} | {", ".join(item["EK_KATEGORILER"]) or "Yok"} |')
    out += ['', 'BMT, kaynak sarf ve kapı otomasyonu için mevcut uygun yol bulunmadığından öneri yeni kategori olarak işaretlendi. Alakasız bir ek kategori atanmadı. PM mevcut RULMAN>MAFSAL RULMANLARI yolunda, S060 istenen mevcut S tipi (250 tipi) yolundadır.', '',
            'Önceki SAC/TBR/VM/SFU/DSG düzeltmesi korunur: katurl\'da URL var ama sayfa ana sayfaya yönleniyor; kategori boş/pasif olabilir, kullanıcı onaylayacak. 31 kayıtta `yeni_kategori:true`, `EK_KATEGORILER:["LİNEER"]` vardır.', '',
            '## Teknik etiketler ve çizim politikası', '',
            'Aile 4 için yeni çizim modülü yazılmadı; 46 bağlamın tamamında `cizim_modulu:null`, sonuç `modül yok`, `keys:[]`, `cagrildi:false`. Etiketler ön yazı ve doğrudan ul/li/strong teknik listesinde aynıdır; Marka ayrıca eklenir.', '',
            '| Alt aile | Kullanılan etiketler |', '|---|---|']
    for f in ['BMT', 'PM', 'GKT', 'YKKM', 'KK']:
        labels = list(dict.fromkeys(k for r in family if r['aile'] == f for k in r['degerler']))
        out.append(f'| {f} | {"; ".join(labels)} |')
    out += ['', '## Görsel ve sayfa kontrolü', '',
            '- `onizleme/aile4-kontak.jpg`: 46 son ürün görseli açılarak kontrol edildi.',
            '- `onizleme/aile4-kaynak-kontrol.jpg`: seçili kaynak fotoğraflar açılarak kontrol edildi; farklı montajlı, logolu/kodlu ve uygun olmayan adaylar kullanılmadı.',
            '- `onizleme/aile4-sayfa-kontrol.jpg`: altı mobil sayfanın gerçek Chromium ekran görüntülerinden kontrol levhası.',
            '- Tam masaüstü/mobil örnekler: `onizleme/ORK_BMT_SP12AFL.png`, `ORK_BMT_NL8H.png`, `ORK_PM_SSPHS06R.png`, `ORK_GKT_MG208.png`, `ORK_YKKM_800.png`, `ORK_KK_S060.png` ve aynı dizindeki `_mobil.png` karşılıkları. `onizleme/index.html` tüm 208 ürünü açar.',
            '- SAC düzeltme kanıtı korunur: `onizleme/sac-yeni-kontrol.jpg`. HGH45HA, HGW30CC, HGW45HC, HGW30HC: rayla birlikte görünüyor; önceki kaynak/alternatif sınırı değişmedi.',
            '- Yalnız üst 100 px Yamansa bandı korunur; kalan 500×500 tuval saf beyazdan kurulur. Ürün oranı korunarak 440×240 alana yerleşir. Fotoğraf içindeki gölge/metal yansıması fiziksel yüzeydir; eski şablon paneli değildir.',
            '- Kullanılmayan yeni araştırma adayları teslimden ayrıldı: `/home/ubuntu/lineer-diger-aile4-arastirma`. Seçili ham/işlenmiş dosyalar ve gerekli arama manifestleri `veri/` içinde kalır.', '',
            '## Denetim çıktıları', '', '```text', (ROOT / 'veri/aile4-denetim.txt').read_text().strip(), '```', '',
            '```text', (ROOT / 'veri/aile4-testler.txt').read_text().strip(), '```', '',
            '```text', (ROOT / 'veri/aile4-cizim-kontrol.txt').read_text().splitlines()[-1], (ROOT / 'veri/aile4-onizleme-kontrol.txt').read_text().splitlines()[-1], '```', '',
            'İlk denetimde standart adındaki nokta sayısal ondalık kontrolüne takıldı; müşteri adlandırması kaynakla uyumlu AWS ER70S-6 olarak sadeleştirildi. Yeni diş sayısı düzeltmesindeki yanlış mm birimi testte yakalanıp kaldırıldı; 208 kapsamına geçen eski test fikstürüne Aile 4 ham dosyası eklendi. Yukarıdaki sonuçlar bu düzeltmelerden sonradır.',
            'Node PATH üzerinde tanımlı olmadığından ortam kontrol edildi: Python bağımlılıkları yüklü, nvm Node v24.22.2 mevcut. Çizim kontrolü kurulu `/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node` ile yapıldı; bağımlılık veya ortak ortam ayarı değiştirilmedi.', '',
            '## Yeniden üretim', '', '```sh', 'python3 arac/aile3_veri.py', 'python3 arac/aile4_veri.py', 'python3 arac/aile4_gorsel.py', 'python3 arac/gorsel_hazirla.py veri/aile4-gorsel-secimleri.json', 'python3 arac/aile_hazirla.py', '/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node arac/ciz.js', 'python3 arac/kontak.py', 'python3 arac/onizle.py', 'python3 arac/denetle.py urunler.jsonl --aile', "python3 -m unittest discover -s arac -p 'test_*.py'", 'git diff --check', '```', '',
            '## Teknik kaynak URL’leri (tüm teslim)', '']
    urls = sorted({url for r in raw for v in r['degerler'].values() for url in re.findall(r'https?://[^\s;]+', v['kaynak'])} | {u for r in family for u in r['incelenen_kaynaklar']})
    out += ['- ' + u for u in urls]
    out += ['', 'B2B adından alınan kesin bilgiler için kaynak izi `parca/lineer_diger.jsonl.gz` ve `veri/*.json` içindedir; hesaplar ayrıca etiketlenir. Müşteri alanlarına kaynak domaini veya rakip marka adı eklenmedi.', '',
            '## Aile 4 fotoğraf kaynakları', '', '| Ürün kodları | Seviye | URL |', '|---|---|---|']
    for url in dict.fromkeys(p['url'] for p in photos.values()):
        out.append('| ' + ', '.join(c for c, p in photos.items() if p['url'] == url) + ' | aynı tip | ' + url + ' |')
    out += ['', '## Eksik ürünlerin tamamı', '', '| Kod | Gerekçe |', '|---|---|']
    out += [f'| {r["kod"]} | {"; ".join(r["bayraklar"])} |' for r in missing]
    out += ['', '## Yeni iki modül: draw/lineer_diger', '',
            'Ayrı worktree: `/home/ubuntu/repos/ticimax-stok-draw`, dal `draw/lineer_diger`, site-assets tabanlı. Yeni kod yalnız draw dalında; ürün dalındaki bu tablo, `veri/ek-cizim-sonuclari.json` ile doğrulanmış ek sonuçları birleştirir. `veri/draw-keys.json` ve eski lineer kontrol logu yalnız mevcut lineer.js testidir; yeni modülleri ölçmez.', '',
            '| Modül | Ürün | SVG | null |', '|---|---:|---:|---:|',
            '| pinyon_kremayer | 47 | 41 | 6 |', '| vidali_mil | 31 | 22 | 9 |', '',
            'Birleşik kapsam: **140 SVG, 15 eksik veriden null, 53 modül yok = 208 ürün.** Düz pinyon 40/40, kremayer 1/7; VM 6/6, SFU 8/9, DSG 4/5, TBR 4/4, SAC 0/7.', '',
            '**Loader:** `site/yg.js:26–29` alfabetik ilk match ile durur; draw null sonucunda devam etmez. LİNEER breadcrumb eski lineer.match’i tetikler ve yeni vidalı mil modülünü gölgeler. Başka dosya değiştirmeden, vidali_mil aynı API’yi canonical `vidali_mil` yanında sıralamada önce gelen `0_vidali_mil` anahtarına da kaydeder. Match yalnız beş hedef alt tip içindir. 208 gerçek ctx üzerinde yalnız 78 hedefin yeni ailelere girdiği, 78’inin de loader’da doğru yeni API’yi seçtiği test edildi. Build.py yeni dosyaları otomatik içerir; bundle kopya dizinde üretildi, repo loader/build/bundle dosyalarına dokunulmadı.', '',
            '**Tamamlanamayan ölçülendirme:** Pinyon kaynağındaki küçük d/büyük D çizim harfleriyle eşleşmediğinden bunları ters çevirip delik/göbek sayısı yazmadık. 40 pinyonda De/Dp/m/Z gerçek, göbek/delik ve eksenel kesit boyları açıkça şematiktir. Tam göbek D / delik d ölçülendirmesi kaynak eşlemesi bekler. Altı kremayerde hp/he/hs, yedi SAC’ta B/H/h yok; DSG40H kesiti çelişkili; SFU5010 ikinci varyant kanıtı yok. Bu 15 ürün null; eksik kesitler çizilmedi. Diğer SFU’da bilinmeyen L yerine boyu kırık ve açıkça şematik kesit var. TBR’nin anlamı doğrulanmamış G/A/B/D/C harfleri yeni yükseklik anlamlarıyla kullanılmadı.', '',
            'Modül raporları: draw worktree içinde `site/draw/rapor/pinyon_kremayer.md`, `vidali_mil.md`. Fixture, sonuç JSON, önizleme HTML ve her başarılı üründe 460/360 PNG aynı aile dizinlerindedir. Açılarak kontrol edilen 360 px PNG’ler: `pinyon_kremayer/ORK_PD_M416-360.png`, `pinyon_kremayer/ORK_KR__M225251000-360.png`, `vidali_mil/ORK_VM_1605-360.png`, `vidali_mil/ORK_VMS_SFU1605-360.png`, `vidali_mil/ORK_VSG_DSG16H-360.png`, `vidali_mil/ORK_LR_TBR16UU-360.png`. Metin çakışması yok; altı görüntüde tarama, eksen ve kaynak ölçü etiketleri kontrol edildi. Önizlemede ölçü grubunun tıklanıp kırmızı olması Chromium’da test edildi.', '',
            '```text', 'pinyon_kremayer: 41 başarılı; 6 null; 3 negatif başarılı', 'vidali_mil: 22 başarılı; 9 null; 3 negatif başarılı', 'Loader: ilk match; null fallback yok; 0_vidali_mil öncelik kaydı doğrulandı', 'Kapsam: 208 bağlamda yalnız 78 hedef ürün yeni modüllere ait', '```', '',
            '## 208 ürün çizim sonuçları (yeni modüller dahil)', '', '| Kod | Modül | Sonuç | keys | draw çağrıldı | Null nedeni |', '|---|---|---|---|---|---|']
    for d in drawings:
        module = d.get('modul', 'lineer' if d['sonuc'] == 'null değil' else 'Yok')
        out.append(f'| {d["kod"]} | {module} | {d["sonuc"]} | {", ".join(d["keys"]) or "[]"} | {d.get("cagrildi", True)} | {d.get("neden", "")} |')
    (ROOT / 'rapor.md').write_text('\n'.join(out) + '\n')
    print('Rapor: rapor.md (208 ürün; Aile 4 ve pinyon düzeltmesi)')


if __name__ == '__main__':
    main()
