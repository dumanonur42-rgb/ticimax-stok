"""Çıktı sözleşmesi: python3 arac/denetle.py [urunler.jsonl]."""
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
            if re.search(r'orka(?:pt)?', serialized, re.I):
                fail(f'yasak marka: {key}')
            if '\u0307' in serialized:
                fail(f'U+0307: {key}')
            if '—' in serialized:
                fail(f'uzun tire: {key}')
        for key, limit in [('SEO_SAYFABASLIK', 60), ('SEO_SAYFAACIKLAMA', 155), ('SEO_ANAHTARKELIME', 950), ('ANAHTARKELIME', 950)]:
            if len(row.get(key, '')) > limit:
                fail(f'uzunluk: {key}')
        desc = BeautifulSoup(row.get('ACIKLAMA', ''), 'html.parser')
        if len(desc.get_text(' ', strip=True)) < 1800:
            fail('ACIKLAMA <1800 görünür karakter')
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
        if not opening.select('table td') or any(not td.find('strong') for td in opening.select('td')):
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


if __name__ == '__main__':
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'urunler.jsonl'
    try:
        rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
        errors = audit(rows)
    except (ValueError, OSError) as exc:
        rows, errors = [], [str(exc)]
    print(f'Denetlenen ürün: {len(rows)}')
    for error in errors:
        print('HATA: ' + error)
    print(f'SONUÇ: {len(errors)} hata')
    sys.exit(bool(errors))
