import argparse
import copy
import html
import json
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
NAMES = ['pinyon_kremayer', 'vidali_mil', 'mafsal', 'tasiyici']


def fixtures(catalog):
    contexts = json.loads((catalog / 'veri/lineer-ctx.json').read_text())
    for name, prefixes in [('pinyon_kremayer', ('ORK PD ', 'ORK KR ', 'ORK KRÖ ', 'ORK KRKA ')), ('vidali_mil', ('ORK VM ', 'ORK VMS ', 'ETA VMS ', 'ORK VSG ', 'ORK ADM ', 'ORK LR TBR')), ('mafsal', ('ORK PM ',)), ('tasiyici', ('ORK BMT ',))]:
        cases = []
        for ctx in contexts:
            if not ctx['kod'].startswith(prefixes):
                continue
            labels = {s['l'] for s in ctx['specs']}
            ok, reason = True, ''
            if ctx['kod'].startswith(('ORK KR ', 'ORK KRÖ ', 'ORK KRKA ')) and not {'Ölçü (hp)', 'Ölçü (he)', 'Ölçü (hs)', 'Boy (L)'}.issubset(labels):
                ok, reason = False, 'hp/he/hs kesit ölçüleri eksik; bazı kodlarda L de yok'
            elif ctx['kod'].startswith('ORK ADM '):
                ok, reason = False, 'SAC destek kesitinin B/H/h ölçüleri yok; SBR geometrisi varsayılmadı'
            elif ctx['kod'] == 'ORK VSG DSG40H':
                ok, reason = False, 'DSG40H H/h/L kaynakları çelişkili, kesit verisi eksik'
            elif ctx['kod'] == 'ORK VMS SFU5010':
                ok, reason = False, 'Yalnız -4 kaynakları bulundu; ikinci varyantta ortak montaj ölçüleri kanıtlanamadı'
            elif name == 'mafsal' and 'İç Çap (d)' not in labels:
                ok, reason = False, '14/18 boyutlarında SSPHS/SSPOS baz seri katalog satırı yok'
            elif name == 'tasiyici' and ctx['kod'].split()[-1] not in ['SP12B', 'SP15A', 'SP22C', 'SP25B', 'SP30C', 'SP60B']:
                ok, reason = False, 'Dw/D/h/H veya flanşlı tipte D1/b eksik; montaj kesiti belirlenemiyor'
            cases.append(dict(kod=ctx['kod'], ctx=ctx, expect=dict(match=True, draw=ok, reason=reason)))
        foreign = copy.deepcopy(contexts[0])
        cases.append(dict(kod='NEG yabancı aile', ctx=foreign, negative=True, expect=dict(match=False, draw=False)))
        missing = copy.deepcopy(cases[0]['ctx'])
        required = 'Dış Çap (De)' if name == 'pinyon_kremayer' else 'Mil Çapı (d)'
        if name == 'vidali_mil':
            missing = copy.deepcopy(next(c['ctx'] for c in cases if c['kod'].startswith('ORK VM ')))
        elif name in ['mafsal', 'tasiyici']:
            missing = copy.deepcopy(next(c['ctx'] for c in cases if c['expect']['draw']))
            required = 'İç Çap (d)' if name == 'mafsal' else 'Ana Bilya Çapı (Dw)'
        for section in ['specs', 'onyazi']:
            missing[section] = [s for s in missing[section] if s['l'] != required]
        cases.append(dict(kod='NEG gerekli ölçü eksik', ctx=missing, negative=True, expect=dict(match=True, draw=False)))
        empty = dict(title=cases[0]['ctx']['title'], path='/empty', crumbs=[], specs=[], onyazi=[])
        cases.append(dict(kod='NEG boş ölçüler', ctx=empty, negative=True, expect=dict(match=True, draw=False)))
        (ROOT / 'fixtures' / (name + '.json')).write_text(json.dumps(cases, ensure_ascii=False, indent=2) + '\n')
    print('Fixture: 47 + 31 + 16 + 22 gerçek ürün; her modülde 3 negatif')


def preview():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/home/ubuntu/.local/bin/google-chrome', headless=True, args=['--no-sandbox'])
        for name in NAMES:
            results = json.loads((ROOT / 'preview' / (name + '-results.json')).read_text())
            folder = ROOT / 'preview' / name
            folder.mkdir(exist_ok=True)
            cards = []
            for i, result in enumerate(results):
                if result['negative']:
                    continue
                slug = ''.join(c if c.isascii() and c.isalnum() else '_' for c in result['kod'])
                content = result['svg'] or '<p>Çizim yok: ' + html.escape(result['reason']) + '</p>'
                cards.append('<section><h2>' + html.escape(result['kod']) + '</h2>' + content + '</section>')
                if result['svg']:
                    single = '<!doctype html><meta charset="utf-8"><style>body{margin:0;font:14px Arial;color:#16203a}svg{display:block}</style>' + result['svg']
                    page = browser.new_page()
                    for width in [460, 360]:
                        page.set_viewport_size(dict(width=width, height=round(width*260/460)))
                        page.set_content(single)
                        page.screenshot(path=str(folder / (slug + '-' + str(width) + '.png')))
                        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                        boxes = page.locator('svg text').evaluate_all('''(nodes)=>nodes.map(n=>{let b=n.getBBox(),m=n.ownerSVGElement.getCTM().inverse().multiply(n.getCTM()),p=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(q=>new DOMPoint(q[0],q[1]).matrixTransform(m)),x=Math.min(...p.map(q=>q.x)),y=Math.min(...p.map(q=>q.y));return {x,y,w:Math.max(...p.map(q=>q.x))-x,h:Math.max(...p.map(q=>q.y))-y}})''')
                        assert all(b['x'] >= -1 and b['y'] >= -1 and b['x']+b['w'] <= 461 and b['y']+b['h'] <= 261 for b in boxes), result['kod']
                        for a, first in enumerate(boxes):
                            for second in boxes[a+1:]:
                                assert min(first['x']+first['w'], second['x']+second['w']) - max(first['x'], second['x']) <= .5 or min(first['y']+first['h'], second['y']+second['h']) - max(first['y'], second['y']) <= .5, result['kod'] + ': metin çakışması'
                    page.close()
            doc = '<!doctype html><meta charset="utf-8"><title>' + name + '</title><style>body{font:14px Arial;background:#eef1f5}section{background:white;max-width:460px;padding:12px;margin:16px auto}h2{font-size:14px}.hl{cursor:pointer}.hl.active line,.hl.active path{stroke:#d0101e}.hl.active text{fill:#d0101e}</style>' + ''.join(cards)
            doc += '<script>document.addEventListener("click",function(e){var g=e.target.closest(".hl");if(g)g.classList.toggle("active")});</script>'
            (ROOT / 'preview' / (name + '.html')).write_text(doc)
            page = browser.new_page(viewport=dict(width=490, height=350))
            page.goto((ROOT / 'preview' / (name + '.html')).as_uri())
            page.locator('.hl text').first.click()
            assert page.locator('.hl.active').count() == 1
            assert page.locator('.hl.active text').first.evaluate('(n)=>getComputedStyle(n).fill') == 'rgb(208, 16, 30)'
            page.close()
            print(name + ': 460/360 PNG ve metin sınır kontrolleri tamamlandı')
        browser.close()


def report(catalog=None):
    overlay = []
    for name in NAMES:
        results = [r for r in json.loads((ROOT / 'preview' / (name + '-results.json')).read_text()) if not r['negative']]
        if name in ['mafsal', 'tasiyici']:
            out = ['# ' + name, '', f'{len(results)} gerçek ürün; {sum(bool(r["svg"]) for r in results)} SVG; {sum(not bool(r["svg"]) for r in results)} null.', '',
                   '## Sözleşme ve loader', '',
                   'ES5; yalnız window.YDRAW kaydı; 460×260 viewBox; 12,5 px bold metin; opt.id önekli marker ve hatch; keys/data-k eşliği. Gerekli ölçü yoksa veya kaynak değerleri çelişirse null. Üç negatif fixture: yabancı aile, gerekli ölçü eksik, boş ölçüler; ek test boş ctx ve çelişkili ölçüyü denetler.', '',
                   'Loader alfabetik ilk match sonucunda durur ve null sonucunda başka modüle geçmez. 16 mafsal ve 22 taşıyıcı ctx ile mevcut modüller arasında ilk-match çakışması yoktur. bilyali.js mafsal ailesini açıkça dışlar; yeni modüllerde alias gerekmez. Loader/build dosyaları değiştirilmedi.', '',
                   '## Alt tipler ve ölçü anlamları', '']
            if name == 'mafsal':
                out += ['SSPHS iç dişli: 6 SVG / 2 null; SSPOS dış dişli: 6 SVG / 2 null. 14/18 boyutlarında katalog satırı olmadığı için dört null. Sağ/sol diş iddiası yoktur.', '',
                        'Ön görünüşte dış başlık d2, küre dk ve delik d; şaftlı gövde ve G dişi. Kesitte C1 gövde genişliği, B bilya genişliği, küresel temas yüzeyleri ve açık delik; SSPHS iç dişi kesik çizgili, SSPOS dış dişi profilli. L4/L2 toplam boy; h1/h göz merkezinden tabana; L3 iç diş derinliği / L1 dış diş boyu. G kaynaktaki diş metnini aynen korur; SSPHS06R için M6 adımı tahmin edilmez.', '',
                        'Etiketler: İç Çap (d), Küre Çapı (dk), Başlık Çapı (d2), Bilezik Genişliği (B), Gövde Genişliği (C1), Bağlantı Dişi (G), Ölçü (h1)/(h), Ölçü (L4)/(L2), Ölçü (L3)/(L1). Diğer teknik liste alanları anlamı doğrulanmadan yeni geometrik ölçüye çevrilmedi.', '',
                        'Geometri kaynağı: ürün dalındaki veri/aile4-mafsal-sdtz.pdf; URL her ürünün teknik_kaynak alanında korunur. Kaynak şekli ve aynı kod satırları incelendi. Dış başlık d2 ile küre dk birbirine karıştırılmadı.', '',
                        'Açılan PNG’ler: preview/mafsal/ORK_PM_SSPHS06R-360.png ve preview/mafsal/ORK_PM_SSPOS20R-360.png.']
            else:
                out += ['Flanşlı yuvaya oturtmalı: SP15A, SP22C, SP25B, SP30C, SP60B (5 SVG). Flanşsız yuvaya oturtmalı: SP12B (1 SVG). Diğer 16 ürün null.', '',
                        'Saplı / saplamalı kesit için kaynaklı sap dişi, sap boyu ve gövde yüksekliği gerekir; bu girdilerde böyle eksiksiz kaynaklı saplı ürün yoktur ve saplı geometri çizilmez. Cıvatalı flanş / tabla tipleri delik yerleşimi ve gövde ölçüleri eksik olduğu için null; tahmini cıvata veya delik adedi eklenmez. CY16B2 yalnız Dp ve yuvarlak gövde bilgisi taşır; montaj biçimi türetilmez.', '',
                        'Ön görünüşte Dw ana bilya, D gövde, flanşlıda D1. Kesitte ana bilya, destek bilyaları, taralı gövde ve flanş dudağı. Destek bilyalarının sayısı ve çapı temsili; sayısal ölçü olarak yayınlanmaz.', '',
                        'New Ball kesitindeki H tabandan ana bilya tepesine, h montaj düzleminden bilya tepesine; flanşlı tipte b montaj düzleminden üst bilezik yüzeyine ölçülür. Dolayısıyla üst bilezik yüzeyi bilya tepesinden h−b aşağıdadır. Flanşsız SP12B’de h üst gövde yüzeyinden bilya tepesine; olmayan b alanı üretilmez.', '',
                        'Şekil referansı: https://www.newball.it/wp-content/uploads/2021/11/ball-transfer-units.pdf (flanşsız ve flanşlı sayfalar). Yeni sayısal değer aktarılmadı; yalnız urunler.jsonl ctx değerleri kullanılır. Örneğin SP15B/C Dw kaynakları çeliştiği için Dw yoktur ve iki ürün de null kalır.', '',
                        'Etiketler: Ana Bilya Çapı (Dw), Gövde Çapı (D), Flanş Çapı (D1), Ölçü (h), Toplam Yükseklik (H), Ölçü (b). Montaj Tipi alt tipi belirler; kapasite ve malzeme geometri ölçüsü yapılmaz.', '',
                        'Açılan PNG’ler: preview/tasiyici/ORK_BMT_SP12B-360.png ve preview/tasiyici/ORK_BMT_SP60B-360.png.']
            out += ['', '## Gerçek ürün sonuçları', '', '| Kod | Sonuç | Loader | Keys / neden |', '|---|---|---|---|']
            for item in results:
                keys = ', '.join(k['k'] for k in item['keys'])
                out.append(f'| {item["kod"]} | {"SVG" if item["svg"] else "null"} | {item["selected"]} | {keys or item["reason"]} |')
                overlay.append(dict(kod=item['kod'], modul=name, sonuc='null değil' if item['svg'] else 'null', keys=[k['k'] for k in item['keys']], cagrildi=True, neden=item['reason']))
            out += ['', 'Tüm başarılı gerçek ürünler 460/360 px PNG olarak yeniden üretildi; metin kutuları (dönüşümler dahil) çakışma/taşma için denetlendi; ölçü grubunun tıklanıp kırmızı olması Chromium’da doğrulandı. Canlı site entegrasyonu denenmedi.', '',
                    'Yeniden üretim: _lineer_diger.py --catalog /home/ubuntu/repos/ticimax-stok; node _test_lineer_diger.js /home/ubuntu/repos/ticimax-stok/veri/lineer-ctx.json; _lineer_diger.py --preview --report-draw.']
            (ROOT / 'rapor' / (name + '.md')).write_text('\n'.join(out) + '\n')
            continue
        out = ['# ' + name, '', '## Sözleşme ve loader', '',
               '`site/yg.js:26–29` alfabetik ilk match sonucunda durur; draw null döndüğünde sıradaki modüle geçmez. `site/build.py` alt çizgiyle başlamayan draw/*.js dosyalarını otomatik birleştirir. lineer.match, LİNEER breadcrumb için koşulsuz true olabilir; SFU/DSG/SAC/TBR/VM böylece gölgelenir.',
               'Mevcut dosyalara dokunulmadı. vidali_mil.js aynı API nesnesini hem `vidali_mil` hem öncelik anahtarı `0_vidali_mil` olarak kaydeder. İlk anahtar sıralamada lineer’den önce gelir; match yalnız beş hedef alt tiptedir. İlgisiz ürünlerde false döner. Canonical arayüz korunur. Loader değişikliği gerekmez; ileride loader açık öncelik/fallback desteklerse alias kaldırılabilir.', '',
               '## Kapsam', '', f'{len(results)} gerçek ürün: {sum(bool(r["svg"]) for r in results)} SVG, {sum(not bool(r["svg"]) for r in results)} null. Üç negatif: yabancı aile, gerekli ölçü iki veri alanında eksik, boş ölçü listeleri.', '',
               'ES5, bağımsız modül; yalnız window.YDRAW kaydı, data-k/keys eşliği, opt.id önekli marker/pattern, iki renk, 460×260 viewBox. Yazılan sayılar yalnız kaynak ctx ölçüleridir. Boyu bilinmeyen kesit şematiktir; bilinmeyen boy yazılmaz.', '',
               '## Alt tipler ve ölçü sınırları', '']
        if name == 'pinyon_kremayer':
            out += ['- 40 düz pinyonda Z adet involüt benzeri diş, De ve Dp, m ve Z vardır. Kesit taramalıdır; diş genişliği/göbek boyu yazılmaz.',
                    '- **Önemli sınır:** ürünlerde `Ölçü (d)` genellikle 50 mm, `Ölçü (D)` 15 mm gibi gelir; kaynak çizim D/D1/D2/D3/D4 kullanır. Bunları ters çevirip delik/göbek diye adlandırmadık. Bu 40 SVG’de iç halkalar ve göbek kesiti açıkça şematik, d/D sayısal ölçüleri yoktur. Kaynakta anlamı açık `Göbek Çapı (D)` ve `Delik/İç Çap (d)` bulunursa modül bunları ölçülendirir. Bu karar istenen tam göbek/delik ölçülendirmesinin henüz tamamlanmadığı anlamına gelir.',
                    '- Tam hp/he/hs/p/L bulunan tek kremayer çizilir: yan diş profili, p, L kırık gösterim, hs×he kesit ve hp ekseni. Diğer altı kremayerde he/hs/hp bilinmiyor; a/b alanları bunların yerine geçirilmez. KRKA profil teyidi de hâlâ eksiktir.', '',
                    'Etiketler: Modül (m), Diş Sayısı (Z), Dış Çap (De), Bölüm Dairesi Çapı (Dp), Hatve (p), Boy (L), Ölçü (hs), Ölçü (he), Ölçü (hp). Belirsiz Ölçü (d)/(D) çizim keys listesine alınmaz.']
        else:
            out += ['- VM: 6/6; Mil Çapı (d), Vida Adımı (Ph), Boy (L). Kırık gövde, bir adımlık Ph, katı mil kesiti.',
                    '- SFU: 8/9; d/Ph/D/A/B/W/X ve Q varsa. SFU5010 yalnız -4 kaynaklı olduğundan ortak varyant montaj ölçüleri henüz yayınlanmaz ve null döner. Ön görünüşte flanş, delikler, delik dairesi; kesitte vida kanalı ve kırık gövde. L verilmediği için L ölçüsü yoktur. Altı/sekiz delik yerleşimi kaynak SFU katalog şeklinin şematik geometrisidir; ekrana delik adedi yazılmaz. Flanş H, Da gibi kullanılmayan değerler sayfada kalır fakat keys içine eklenmez.',
                    '- DSG: 4/5; D/B/H/h/L gerekli. Delikli ön görünüş ve boyuna taramalı kesit. DSG40H çelişkili kesit nedeniyle null.',
                    '- TBR: 4/4; d/W/L gerekli, S1 varsa gösterilir. Açık rulman kesiti; genel G/A/B/D/C harflerine kanıtlanmamış yükseklik/merkez anlamı atanmaz ve bu ölçüler keys listesine alınmaz.',
                    '- SAC: 0/7; renderer d/B/H/h/L ile destekli milin ön görünüşünü ve kesitini destekler, fakat gerçek 7 girdide yalnız d/L vardır. B/H/h tahmin edilmedi; tümü null. Tam destek kesiti olmadan sıradan mil resmi çizilmez.']
        out += ['', '## Ölçülendirme ve kesit kalite düzeltmesi', '',
                'Referans olarak `preview/bilyali/w360-c0.png` ve `preview/lineer/00-460.png` açıldı. Aynı ince uzatma çizgisi, sınırda ok ucu, tarama ve eksen çizgisi dili kullanıldı.',
                'Ölçü oklarının referansı marker ucudur (refX=10); uzatma çizgileri ölçülen kontur veya eksen noktasından başlar. Çaplarda Ø vardır. Yazılar 12–12,5 px bold; 460/360 px tüm SVG metin kutuları taşma ve birbirleriyle çakışma için denetlendi. SVG’de açıklama notu yoktur: yalnız görünüş başlıkları, ölçüler ve pinyon z/m bilgisi bulunur.',
                'Pinyonda De dış diş ucu zarfına, Dp bölüm dairesi kutuplarına bağlıdır. z ve m başlık altında oklu olmayan ayrı data-k gruplarıdır. Kesitte diş bölgesi, kök çizgisi, göbek, açık delik ve eksen bulunur. Diş genişliği ve anlamı belirsiz d/D sayıları eklenmedi; bu eksikler yalnız rapordadır.',
                'SFU kesitindeki A/D çapları ve B kalınlığı ön görünüşle aynı ölçeğe bağlıdır. W uzatmaları delik dairesinin çap uçlarından çıkar. İç bilya kanalı profilleri kesik çizgilidir; Ph aynı profilde iki komşu diş tepesi arasında ölçülür. Q oku çizilmiş radyal yağlama deliğinin ağzına gider. Eksenel L hâlâ kaynakta bilinmediğinden boy ölçüsü verilmez; kesit uzunluğu temsili kalır.',
                'VM diş profili ve helisel izleri ile bir adımlık Ph gösterilir. DSG kesitinde açık iç delik ve kaynak L/B/H oranları korunur. TBR kesitine yuvarlanma elemanları eklendi; d çap çizgisi delik merkezinden geçer, S1 oku çizilmiş bağlantı deliğine gider. SAC sayısal destek kesiti yokken yine null döner; tam verili renderer da uzatma/çap çizgileri kullanır.', '',
                '## Gerçek ürün sonuçları', '', '| Kod | Sonuç | Loader seçimi | Keys / null nedeni |', '|---|---|---|---|']
        for r in results:
            keys = ', '.join(k['k'] for k in r['keys'])
            out.append(f'| {r["kod"]} | {"SVG" if r["svg"] else "null"} | {r["selected"]} | {keys or r["reason"]} |')
            overlay.append(dict(kod=r['kod'], modul=name, sonuc='null değil' if r['svg'] else 'null', keys=[k['k'] for k in r['keys']], cagrildi=True, neden=r['reason']))
        out += ['', '## Kontrol ve yeniden üretim', '',
                '```sh', 'python3 site/draw/_lineer_diger.py --catalog /home/ubuntu/repos/ticimax-stok', '/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node site/draw/_test_lineer_diger.js /home/ubuntu/repos/ticimax-stok/veri/lineer-ctx.json', 'python3 site/draw/_lineer_diger.py --preview', '```', '',
                '460 ve 360 px tüm başarılı ürün PNG’leri `site/draw/preview/' + name + '/` içinde; HTML null nedenleri dahil tüm gerçek ürünleri içerir. Metin sınırları ve tıklanan data-k grubunun kırmızı olması Chromium’da test edildi.',
                'Görsel olarak açılan 360 px PNG’ler: pinyon_kremayer/ORK_PD_M416-360.png, pinyon_kremayer/ORK_KR__M225251000-360.png, vidali_mil/ORK_VM_1605-360.png, vidali_mil/ORK_VMS_SFU1605-360.png, vidali_mil/ORK_VSG_DSG16H-360.png, vidali_mil/ORK_LR_TBR16UU-360.png. Ölçü yazıları çakışmıyor; tarama ve eksen çizgileri okunur. Göbek/delik ve boy eksikliği yalnız raporda belirtilir. Canlı siteye yüklenmedi.',
                'PDF raster aracı pdftoppm ortamda yoktu; Python bağımlılıkları kontrol edildi ve kurulu pypdfium2 ile kaynak PDF açıldı. Ortam/bağımlılık ayarı değiştirilmedi.']
        (ROOT / 'rapor' / (name + '.md')).write_text('\n'.join(out) + '\n')
    if catalog:
        (catalog / 'veri/ek-cizim-sonuclari.json').write_text(json.dumps(overlay, ensure_ascii=False, indent=2) + '\n')
    print('Rapor: dört modül; 116 ürün; ürün dalına ' + ('yazıldı' if catalog else 'yazılmadı'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--catalog', type=Path)
    parser.add_argument('--preview', action='store_true')
    parser.add_argument('--report', type=Path)
    parser.add_argument('--report-draw', action='store_true')
    args = parser.parse_args()
    if args.catalog:
        fixtures(args.catalog)
    if args.preview:
        preview()
    if args.report:
        report(args.report)
    elif args.report_draw:
        report()
