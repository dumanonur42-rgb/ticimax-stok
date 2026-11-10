"""Çıktı sözleşmesi: python3 arac/denetle.py [urunler.jsonl]."""
import gzip
import json
import re
import sys
from pathlib import Path
from bs4 import BeautifulSoup
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FIELDS = 'kod URUNADI MARKA KATEGORI EK_KATEGORILER yeni_kategori ONYAZI ACIKLAMA ANAHTARKELIME SEO_SAYFABASLIK SEO_SAYFAACIKLAMA SEO_ANAHTARKELIME resim resim_seviye resim_kaynak teknik_kaynak bayraklar'.split()


def audit(rows, root=ROOT):
    errors = []
    paragraphs = {}
    allowed = set((root / 'katurl.txt').read_text().splitlines())
    if not rows:
        errors.append('ürün listesi boş')
    for index, row in enumerate(rows, 1):
        def fail(msg):
            errors.append(f'{index}: {msg}')
        for key in FIELDS:
            if key not in row or row[key] is None or (key not in ['EK_KATEGORILER', 'bayraklar', 'yeni_kategori'] and not row[key]):
                fail(f'boş/eksik alan: {key}')
        for key, value in row.items():
            serialized = json.dumps(value, ensure_ascii=False)
            source_metadata = key in ['resim_kaynak', 'teknik_kaynak'] and row.get('kod', '').startswith(('ORK PD ', 'ORK KR ', 'ORK KRÖ ', 'ORK KRKA ', 'ORK MKİ '))
            if not source_metadata and re.search(r'orka(?:pt)?', serialized, re.I):
                fail(f'yasak marka: {key}')
            if '\u0307' in serialized:
                fail(f'U+0307: {key}')
            if '—' in serialized:
                fail(f'uzun tire: {key}')
        for key, limit in [('SEO_SAYFABASLIK', 60), ('SEO_SAYFAACIKLAMA', 155), ('SEO_ANAHTARKELIME', 950), ('ANAHTARKELIME', 950)]:
            if len(row.get(key, '')) > limit:
                fail(f'uzunluk: {key}')
        if row.get('resim_seviye') not in ['birebir', 'ayni_tip']:
            fail('geçersiz resim_seviye')
        if row.get('kod', '').startswith('ORK ') and row.get('MARKA') != 'Yamansa':
            fail('Yamansa marka kuralı')
        if row.get('kod', '').startswith('PMI ') and row.get('MARKA') != 'PMI':
            fail('PMI marka kuralı')
        if row.get('kod', '').startswith('ETA ') and row.get('MARKA') != 'ETAZON':
            fail('ETAZON marka kuralı')
        if any('HIWIN' in row.get(k, '').upper() for k in ['URUNADI', 'SEO_SAYFABASLIK', 'SEO_SAYFAACIKLAMA', 'SEO_ANAHTARKELIME', 'ANAHTARKELIME']):
            fail('HIWIN ad/SEO kuralı')
        desc = BeautifulSoup(row.get('ACIKLAMA', ''), 'html.parser')
        if len(desc.get_text(' ', strip=True)) < 1800:
            fail('ACIKLAMA <1800 görünür karakter')
        if not desc.find('h2') or not desc.find('h3') or not desc.find('p') or 'Kullanım Alanları' not in desc.get_text():
            fail('ACIKLAMA bölüm yapısı')
        visible_desc = desc.get_text(' ', strip=True)
        if re.search('HIWIN', visible_desc, re.I) and (visible_desc.count('HIWIN') != 1 or 'HIWIN HG serisi ile birebir ölçü uyumlu' not in visible_desc):
            fail('HIWIN uyum ifadesi')
        links = desc.select('a[href]')
        if not 2 <= len(links) <= 4:
            fail('iç link sayısı 2-4 değil')
        for a in links:
            if a['href'] not in allowed:
                fail('katurl dışı link: ' + a['href'])
        for p in desc.select('p'):
            text = p.get_text(' ', strip=True)
            if len(text) >= 120:
                if text in paragraphs:
                    fail(f'120+ karakter paragraf tekrarı: ürün {paragraphs[text]}')
                paragraphs[text] = index
        for key in ['URUNADI', 'ONYAZI', 'ACIKLAMA', 'ANAHTARKELIME', 'SEO_SAYFABASLIK', 'SEO_SAYFAACIKLAMA', 'SEO_ANAHTARKELIME']:
            visible = BeautifulSoup(row.get(key, ''), 'html.parser').get_text(' ', strip=True)
            if re.search(r'\d\.\d', visible):
                fail(f'ondalık nokta: {key}')
        opening = BeautifulSoup(row.get('ONYAZI', ''), 'html.parser')
        if not opening.select('table td') or any(not td.find('strong', recursive=False) or not td.get_text(' ', strip=True).startswith(td.strong.get_text(' ', strip=True)) or not td.strong.next_sibling for td in opening.select('td')):
            fail('ONYAZI table/td/strong yapısı')
        if not desc.select('ul > li > strong'):
            fail('teknik liste yapısı')
        try:
            with Image.open(root / row.get('resim', '')) as im:
                if im.size != (500, 500) or im.format != 'JPEG':
                    fail('görsel 500x500 JPEG değil')
        except (OSError, ValueError):
            fail('görsel yok/okunamıyor')
    return errors


def audit_batch(rows, root=ROOT):
    errors = []
    with gzip.open(root / 'parca/lineer_diger.jsonl.gz', 'rt') as stream:
        selected = [json.loads(line)['kod'] for line in stream]
    codes = [r['kod'] for r in rows]
    if len(selected) != len(set(selected)):
        errors.append('girdide yinelenen kod: ' + ', '.join(sorted({c for c in selected if selected.count(c) > 1})))
    if len(codes) != len(set(codes)) or sorted(codes) != sorted(selected) or len(codes) != 208:
        errors.append('aile kapsamı: 208 girdinin tümü birer kez işlenmeli')
    raw = [r for f in ['hg', 'hgr', 'pmi', 'aile2', 'aile3', 'aile4'] for r in json.loads((root / f'veri/{f}.json').read_text())]
    contexts = json.loads((root / 'veri/lineer-ctx.json').read_text())
    drawings = json.loads((root / 'veri/draw-keys.json').read_text())
    for label, records in [('ham veri', raw), ('bağlam', contexts), ('çizim', drawings)]:
        if sorted(r['kod'] for r in records) != sorted(codes):
            errors.append(label + ': kapsam uyumsuz')
    for row in rows:
        record = next((r for r in raw if r['kod'] == row['kod']), None)
        ctx = next((r for r in contexts if r['kod'] == row['kod']), None)
        drawing = next((r for r in drawings if r['kod'] == row['kod']), None)
        if not all([record, ctx, drawing]):
            continue
        family = record.get('aile')
        if family and family not in ['KKM', 'IM']:
            if ctx.get('cizim_modulu', 'eksik') is not None or drawing['sonuc'] != 'modül yok' or drawing.get('cagrildi') is not False or drawing['keys']:
                errors.append(row['kod'] + ': modülsüz ailede çizim çalıştırılmamalı')
        else:
            if not drawing['match'] or drawing['sonuc'] != 'null değil' or drawing.get('eksik_veri') != 'null':
                errors.append(row['kod'] + ': çizim sonucu geçersiz')
            expected = {'dr', 'Lm'} if family in ['KKM', 'IM'] else {'WR', 'HR', 'P'} if record['model'].startswith('HGR') else {'W', 'H', 'H1', 'N', 'B', 'C', 'L1', 'L', 'M'}
            if not expected.issubset(drawing['keys']):
                errors.append(row['kod'] + ': çizim anahtarları eksik')
            if family in ['KKM', 'IM'] and ctx.get('cizim_modulu') != 'mil':
                errors.append(row['kod'] + ': mil çizim politikası geçersiz')
        technical = {li.strong.get_text(strip=True).rstrip(':'): li.get_text(' ', strip=True).split(':', 1)[1].strip() for li in BeautifulSoup(row['ACIKLAMA'], 'html.parser').select('ul > li') if li.find('strong')}
        context_specs = {s['l']: s['v'] for s in ctx['specs']}
        if context_specs != technical or ctx['title'] != row['URUNADI']:
            errors.append(row['kod'] + ': çizim bağlamı satış metniyle farklı')
        for label, value in record['degerler'].items():
            if not value.get('kaynak') or not value.get('deger') or technical.get(label) != value['deger']:
                errors.append(row['kod'] + ': değer/kaynak uyumsuz: ' + label)
        if row['bayraklar'] != record['bayraklar']:
            errors.append(row['kod'] + ': eksik bayrakları korunmadı')
        if family in ['PD', 'KR', 'MKI', 'BMT', 'PM', 'GKT', 'YKKM', 'KK'] and row['teknik_kaynak'] != list(dict.fromkeys(v['kaynak'] for v in record['degerler'].values())):
            errors.append(row['kod'] + ': teknik kaynak metadatası ham veriyle farklı')
        if family in ['SAC', 'TBR', 'VM', 'SFU', 'DSG'] and (row['yeni_kategori'] is not True or 'LİNEER' not in row['EK_KATEGORILER']):
            errors.append(row['kod'] + ': pasif kategori önerisi/ek kategori eksik')
        if family == 'GKT':
            if re.search(r'15\s*KG|PKT|KOL[Iİ]|PAKET', row['URUNADI'], re.I):
                errors.append(row['kod'] + ': ürün adında paket ifadesi')
            if technical.get('Satış Birimi') != 'Adet':
                errors.append(row['kod'] + ': kaynak teli satış birimi Adet olmalı')
            if re.search(r'(?:koli|paket)\s+halinde\s+sat', BeautifulSoup(row['ACIKLAMA'], 'html.parser').get_text(' ', strip=True), re.I):
                errors.append(row['kod'] + ': açıklamada paket halinde satış ifadesi')
    return errors


if __name__ == '__main__':
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'urunler.jsonl'
    try:
        rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
        errors = audit(rows)
        if '--aile' in sys.argv:
            errors.extend(audit_batch(rows))
            with gzip.open(ROOT / 'parca/lineer_diger.jsonl.gz', 'rt') as stream:
                input_codes = [json.loads(line)['kod'] for line in stream]
            output_codes = [row['kod'] for row in rows]
            print(f'Girdi: {len(input_codes)} satır; {len(set(input_codes))} benzersiz kod; yinelenen kod: {len(input_codes) - len(set(input_codes))}')
            print(f'Çıktı: {len(output_codes)} satır; {len(set(output_codes))} benzersiz kod; yinelenen kod: {len(output_codes) - len(set(output_codes))}')
    except (ValueError, OSError) as exc:
        rows, errors = [], [str(exc)]
    print(f'Denetlenen ürün: {len(rows)}')
    for error in errors:
        print('HATA: ' + error)
    print(f'SONUÇ: {len(errors)} hata')
    sys.exit(bool(errors))
