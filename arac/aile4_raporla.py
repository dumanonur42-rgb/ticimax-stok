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
            '- **SSPHS/SSPOS:** Finer/SDTZ paslanmaz katalog iç/dış diş tipini destekliyor, fakat istenen R son ekini tanımlamıyor. R=sağ diş bağı ve tam R varyantının ölçü/yük tablosu doğrulanamadı. 16 kodun R eki korundu; A ile değiştirilmedi, baz seri ölçüleri kopyalanmadı. 14 ve 18 ölçüleri bulunan tabloda yok. Müşteriye sağ diş iddiası veya tahmini ölçü yazılmadı.',
            '- **GKT:** Gedik SG2 belgesi G3Si1 / ER70S-6 eşdeğerliğini, 0,8/1,0/1,2 mm çapları destekliyor. Yamansa parti kimyası, mekanik deney değerleri ve makara ölçüleri aktarılmadı. Adlarda paket miktarı yok; teknik listede `Satış Birimi: Adet`, `Ambalaj: 15 kg/paket` var. Açıklama paket halinde satıldığı iddiasını içermiyor.',
            '- **YKKM:** Tam kodlu güvenilir teknik kaynak bulunamadı. Yalnız girdi adlarındaki 800/1000/1500/2000 kg kapasite yayınlandı; voltaj, güç, hız, kremayer modülü, uzaktan kumanda, çalışma oranı ve dişli bilgisi verilmedi.',
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
    out += ['', '## 208 ürün çizim sonuçları', '', '| Kod | Sonuç | keys | draw çağrıldı |', '|---|---|---|---|']
    for d in drawings:
        out.append(f'| {d["kod"]} | {d["sonuc"]} | {", ".join(d["keys"]) or "[]"} | {d.get("cagrildi", True)} |')
    (ROOT / 'rapor.md').write_text('\n'.join(out) + '\n')
    print('Rapor: rapor.md (208 ürün; Aile 4 ve pinyon düzeltmesi)')


if __name__ == '__main__':
    main()
