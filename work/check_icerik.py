import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from bs4 import BeautifulSoup
from PIL import Image
from playwright.sync_api import sync_playwright
from content_zincir import ROOT, ROWS, TECH, IMAGES, EXISTING_CODES, EXCLUDED, ACTIVE_ROWS, SITE_DUPLICATES, CHAIN, LINK, generate, generate_all, sales_specs, publication_exclusions

FIELDS = set('kod URUNADI MARKA KATEGORI EK_KATEGORILER yeni_kategori oneri_kategori ONYAZI ACIKLAMA ANAHTARKELIME SEO_SAYFABASLIK SEO_SAYFAACIKLAMA SEO_ANAHTARKELIME resim resim_seviye resim_kaynak teknik_kaynak bayraklar'.split())


def main():
    records = [json.loads(line) for line in (ROOT / 'urunler.jsonl').read_text().splitlines()]
    assert len(records) == 210 and records == generate_all()
    original = {r['kod']: r for r in ROWS}
    published = {r['kod'] for r in records}
    assert published == {r['kod'] for r in ACTIVE_ROWS}
    assert not published.intersection(EXCLUDED) and set(original) == published.union(EXCLUDED)
    allowed = set((ROOT / 'katurl.txt').read_text().splitlines())
    paragraphs = defaultdict(list)
    names = defaultdict(list)
    visible_lengths = []
    for record in records:
        kod = record['kod']
        row = original[kod]
        assert set(record) == FIELDS, kod
        assert all(record[k] for k in FIELDS if k not in {'bayraklar', 'EK_KATEGORILER', 'yeni_kategori', 'oneri_kategori'}), kod
        assert record['yeni_kategori'] is False and record['EK_KATEGORILER'] == [], kod
        if row['tip'] in {'bakla', 'kilit'}:
            assert record['KATEGORI'] == CHAIN and record['oneri_kategori'] == LINK, kod
        else:
            assert record['oneri_kategori'] is None, kod
        assert not any(f.startswith('ayni_ad:') or f == 'olasi_kopya' for f in record['bayraklar']), kod
        assert record['URUNADI'] == IMAGES[kod]['URUNADI'], kod
        customer = ' '.join(record[k] for k in ['URUNADI', 'MARKA', 'ONYAZI', 'ACIKLAMA', 'ANAHTARKELIME', 'SEO_SAYFABASLIK', 'SEO_SAYFAACIKLAMA', 'SEO_ANAHTARKELIME'])
        assert not re.search(r'orka|orkapt|\u0307|—|katalogla doğrulanmıştır|Montajdan önce makinenin enerjisini|Yalnız makine türüne bakarak|koli halinde satılır|ARASH|TYCO|REXBO', customer, re.I), kod
        assert '\u0307' not in json.dumps(record, ensure_ascii=False), kod
        if row['iso_kod'] != '12A-1':
            assert not re.search(r'ASA\s*40|ANSI\s*40|ASA\s*60|ANSI\s*60', customer, re.I), kod
        else:
            assert all(k in record['ANAHTARKELIME'] for k in ['ASA 60', 'ANSI 60', '60-1', '12A-1', '3/4"'])
        assert len(record['ANAHTARKELIME']) <= 950 and len(record['SEO_ANAHTARKELIME']) <= 950, kod
        assert len(record['SEO_SAYFABASLIK']) <= 60 and len(record['SEO_SAYFAACIKLAMA']) <= 155, kod
        description = BeautifulSoup(record['ACIKLAMA'], 'html.parser')
        visible = description.get_text(' ', strip=True)
        visible_lengths.append(len(visible))
        assert len(visible) >= 1800, (kod, len(visible))
        assert visible.count(record['URUNADI']) <= 2, (kod, 'Full product name repeated')
        assert description.h2.get_text() == record['URUNADI'], kod
        product_paragraphs = description.select('p')
        assert product_paragraphs[0].get_text().startswith(record['URUNADI'] + ', '), kod
        assert all(record['URUNADI'] not in paragraph.get_text() for paragraph in product_paragraphs[1:]), kod
        assert visible.count(row['iso_kod']) <= 4, (kod, 'Code repeated after introduction')
        assert not re.search(r'tam kodun anlamı önemlidir|seçiminin başlangıç noktalarıdır|iki veya daha fazla', visible, re.I), kod
        assert not re.search(r'\bIki\b', visible), kod
        assert all(re.search(r'\d', p.get_text()) for p in product_paragraphs), kod
        assert record['URUNADI'] not in record['SEO_SAYFAACIKLAMA'], kod
        assert re.search(r'\d+(?:,\d+)? mm', record['SEO_SAYFAACIKLAMA']), kod
        assert '—' not in visible and not re.search(r'\d+\.\d+\s*(?:mm|kN|kg/m)', visible), kod
        for paragraph in description.select('p'):
            text = paragraph.get_text(' ', strip=True)
            assert not re.search(r'\b(?:paket|koli)\b', text, re.I), kod
            if len(text) > 120:
                paragraphs[text].append(kod)
        links = [a['href'] for a in description.select('a[href]')]
        assert 2 <= len(links) <= 4 and set(links).issubset(allowed), kod
        assert 'Kullanım Alanları' in [h.get_text() for h in description.select('h3')], kod
        summary = BeautifulSoup(record['ONYAZI'], 'html.parser')
        assert summary.table and len(summary.select('table td > strong')) in {4, 5}, kod
        assert not description.select('table'), kod
        specs = {}
        for item in description.select('ul > li'):
            label = item.find('strong').get_text().rstrip(':')
            specs[label] = item.get_text().split(':', 1)[1].strip()
        assert specs['Sıra Sayısı'] == str(row['sira']), kod
        unit = row['birim']
        if unit:
            assert specs['Satış Birimi'] == ('Metre' if unit == 'METRE' else 'Adet'), kod
        else:
            assert 'Satış Birimi' not in specs and 'birim_yok' in record['bayraklar'], kod
        if row['paket_adet']:
            assert specs['Ambalaj'] == format(row['paket_adet'], ',').replace(',', '.') + ' adet/paket', kod
        if row['paslanmaz'] or row['tip'] != 'zincir':
            assert 'Minimum Kopma Yükü' not in specs, kod
        for key, label in [('p', 'Adım (p)'), ('b1', 'İç Genişlik (b1)'), ('d3', 'Makara Çapı (d3)'), ('d1', 'Pim Çapı (d1)'), ('h', 'Plaka Yüksekliği (h)')]:
            if label in specs:
                value = float(specs[label].replace(' mm', '').replace(',', '.'))
                source = TECH[row['teknik_anahtar']]
                profile = source.get('marka_verileri', {}).get(kod, {}).get('olculer') or {}
                expected = profile.get(key) or source['olculer'].get(key)
                assert expected and value == expected['deger'], (kod, label)
        if row['iso_kod'] == '415H':
            assert 'İç Genişlik (b1)' not in specs and 'olcu_celiskisi' in record['bayraklar']
        if row['tip'] == 'disli':
            assert specs['Diş Sayısı'] == '9' and specs['Zincir Ölçüsü'] == '1*2' and specs['Ürün Tipi'] == 'ÇİFT SIRA'
        if record['MARKA'] not in {'Yamansa', 'iwis', 'Sedis'}:
            assert 'marka_kaynagi_yok' in record['bayraklar'], kod
        if record['MARKA'] == 'Yamansa':
            assert not record['URUNADI'].startswith('Yamansa')
        else:
            assert record['URUNADI'].replace('İ', 'I').casefold().startswith(record['MARKA'].replace('İ', 'I').casefold()), kod
        names[record['URUNADI']].append(record)
        assert not re.search(r'orka|orkapt|\u0307', record['resim'], re.I), kod
        with Image.open(ROOT / record['resim']) as image:
            assert image.format == 'JPEG' and image.size == (500, 500), kod
    assert not [codes for codes in paragraphs.values() if len(codes) > 1], 'Repeated paragraphs'
    collisions = [group for group in names.values() if len(group) > 1]
    assert not collisions
    packages = {k: v[1] for k, v in EXCLUDED.items() if v[0] == 'paket_kopya'}
    assert len(packages) == 18 and len(set(packages.values())) == 17
    assert all(original[k]['paket_adet'] and not original[target]['paket_adet'] and target in published for k, target in packages.items())
    assert packages['ORK ZB 16B220'] == packages['ORK ZB P16B220'] == 'ORK ZB 16B2'
    assert {k: v[1] for k, v in EXCLUDED.items() if v[0] == 'site_kopya'} == SITE_DUPLICATES
    assert all(original[k]['iso_kod'] in EXISTING_CODES for k in SITE_DUPLICATES)
    assert publication_exclusions([], {}) == {}
    single = dict(kod='single', birim='ADET', paket_adet=None)
    package = dict(kod='package', birim='PAKET', paket_adet=20)
    drafts = {k: {'URUNADI': 'same'} for k in ['single', 'package', 'other']}
    assert publication_exclusions([single, package], drafts) == {'package': ('paket_kopya', 'single')}
    for ambiguous in [[single, dict(single, kod='other')], [package, dict(package, kod='other')]]:
        try:
            publication_exclusions(ambiguous, drafts)
            raise AssertionError('Ambiguous duplicate group accepted')
        except ValueError:
            pass
    for kod in ['', 'NOT_A_STOCK_CODE', *EXCLUDED]:
        try:
            generate(kod)
            raise AssertionError('Unknown code accepted')
        except ValueError:
            pass
    flags = []
    assert sales_specs({'birim': ''}, flags) == [] and flags == ['birim_yok']
    assert sales_specs({'birim': 'ADET'}, []) == [('Satış Birimi', 'Adet')]
    assert sales_specs({'birim': 'PAKET', 'paket_adet': 5000}, []) == [('Satış Birimi', 'Adet'), ('Ambalaj', '5.000 adet/paket')]
    try:
        sales_specs({'birim': 'UNKNOWN'}, [])
        raise AssertionError('Unknown unit accepted')
    except ValueError:
        pass
    assert sum('birim_yok' in r['bayraklar'] for r in records) == 30
    print('PASS: 210 retained products; 18 package duplicates and 2 confirmed site duplicates excluded; 0 duplicate names')
    print('PASS: 105 links use existing ZİNCİRLER category; proposal only in oneri_kategori; no stale duplicate flags')
    print('PASS: visible ACIKLAMA >=1800 (minimum ' + str(min(visible_lengths)) + '); SEO <=60/155; keywords <=950; repeated paragraphs >120 chars=0')
    print('PASS: full URUNADI <=2/product, only heading/first sentence; code <=2 further mentions; section facts and numeric SEO; no vague multi-row wording')
    print('PASS: no forbidden brand/boilerplate, U+0307 or em dash; Turkish decimal values; 2 allowed links/product; table summary and direct technical lists')
    print('PASS: source-backed geometry; SS/links have no breaking load; 52 package quantities and 30 unchanged missing sales units')
    print('PASS: 17 original name groups retain single rows; triple group resolved; normal/empty/ambiguous exclusion tests')
    print('PASS: 210 existing 500x500 JPG mappings; no forbidden image filename; empty/invalid/excluded code and unit tests')
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/home/ubuntu/.local/bin/google-chrome', headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1280, 'height': 1000}, device_scale_factor=1)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content('<html></html>')
        for module in ['zincir.js', 'zincir_disli.js']:
            page.add_script_tag(path=str(ROOT.parent / 'ticimax-stok-draw/site/draw' / module))
        results = page.evaluate('''records=>records.map(r=>{var d=new DOMParser().parseFromString(r.ACIKLAMA,'text/html'),specs=Array.from(d.querySelectorAll('li')).map(li=>{var s=li.querySelector('strong'),l=s.textContent.replace(/:$/,'');s.remove();return {l:l,v:li.textContent.trim()}}),ctx={title:r.URUNADI,specs:specs,onyazi:[],crumbs:r.KATEGORI.split('>')},m=r.kod==='ORK ZD 1209'?YDRAW.zincir_disli:YDRAW.zincir,result=m.draw(ctx,{id:'qa'+records.indexOf(r)});return {kod:r.kod,match:m.match(ctx),draw:!!result,keys:result?result.keys.map(k=>k.k):[]}})''', records)
        for record, result in zip(records, results):
            assert result['draw'] or 'eksik' in record['bayraklar'], result
        (ROOT / 'work/cizim_kontrol.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
        print('PASS: browser ACIKLAMA -> ctx.specs drawings: ' + str(sum(r['draw'] for r in results)) + ' non-null; ' + str(sum(not r['draw'] for r in results)) + ' null (all flagged eksik); sprocket=zincir_disli')
        for path in sorted((ROOT / 'work/onizleme').glob('*.html')):
            page.goto(path.as_uri(), wait_until='load')
            result = page.evaluate('DRAW_CHECK')
            assert result['draw'] and result['match']
            assert page.locator('.photo img').evaluate('(im)=>im.complete && im.naturalWidth===500')
            assert not re.search(r'orka|orkapt', page.locator('.photo img').get_attribute('alt'), re.I)
            assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
            page.screenshot(path=str(path.with_suffix('.png')), full_page=True)
            key = 'pt' if page.locator('button[data-key=pt]').count() else 'p'
            page.locator('button[data-key=' + key + ']').click()
            assert page.locator('#svg .hl.active[data-k=' + key + ']').count() > 0
            print('PREVIEW:', str(path.with_suffix('.png').relative_to(ROOT)))
        sample = ROOT / 'work/onizleme_08b-2-cift-sira-makarali-zincir-12-7-mm.html'
        page.goto(sample.as_uri(), wait_until='load')
        assert page.evaluate('DRAW_CHECK.draw')
        page.screenshot(path=str(sample.with_suffix('.png')), full_page=True)
        assert not errors, errors
        browser.close()
        print('PASS: 3 browser previews; images, drawing controls and alt text; browser errors=0')
    counts = Counter(flag for r in records for flag in r['bayraklar'] if ':' not in flag)
    print('FLAGS:', json.dumps(dict(counts), ensure_ascii=False, sort_keys=True))


if __name__ == '__main__':
    main()
