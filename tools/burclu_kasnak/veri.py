import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path

import pymupdf
import requests
from bs4 import BeautifulSoup

ROOT = Path(os.environ.get('BURCLU_WORK', str(Path.home() / 'work')))
URL = 'https://www.tecnicaindustriale.it/chiaravalli_catalogues/PULEGGE_GOLA.pdf'
FIELDS = ['P', 'O', 'tip', 'burc_kodu', 'maks_mil', 'E', 'F', 'J', 'K', 'L', 'M', 'N']


def number(value):
    value = str(value).strip().replace(',', '.')
    if value in ('', '-', '–', '/', '—'):
        return None
    result = float(value)
    return int(result) if result.is_integer() else result


def catalog_rows():
    rows = {}
    with pymupdf.open(ROOT / 'chi.pdf') as doc:
        for page in doc:
            text = page.get_text()
            if 'BUSSOLA TAPER LOCK' not in text:
                continue
            lines = [s.strip() for s in text.splitlines() if s.strip()]
            for i, line in enumerate(lines):
                match = re.fullmatch(r'(SP[ZABC])(\d+)-(\d{2})', line)
                if not match:
                    continue
                values = [number(s) for s in lines[i + 1:i + 15]]
                profile, diameter, channels = match.groups()
                assert values[1] == int(diameter), line
                key = (profile, int(diameter), int(channels))
                assert key not in rows, key
                rows[key] = (dict(zip(FIELDS, values[1:13])), page.number + 1)
    return rows


def main():
    catalog = catalog_rows()
    source = [json.loads(line) for line in (ROOT / 'bk.jsonl').read_text().splitlines()]
    products, differences, missing_catalog = [], [], []
    exact = supplemented = 0
    kys_url = 'https://www.kys.com.tr/tr/urunler/burclu-v-kasnaklar?tablo=spb-3'
    response = requests.get(kys_url, timeout=30)
    response.raise_for_status()
    kys_rows = [[td.get_text(' ', strip=True) for td in tr.select('th,td')] for tr in BeautifulSoup(response.text, 'html.parser').select('tr')]
    kys_row = next((r for r in kys_rows if r and r[0] == 'SPB 180-3' and r[6] == '2517'), None)
    for item in source:
        site = item.get('orka_site')
        name = re.search(r'(SP[ZABC])\s*(\d+)\s*\*\s*(\d+)', item['ad'])
        bush = re.search(r'(?:\(|-)\s*(\d{4})\)?\s*$', item['ad'])
        flags = []
        if site:
            row = site['satir']
            name = re.search(r'(SP[ZABC])\s*(\d+)\s*\*\s*(\d+)', row[1])
            assert name, item['kod']
        assert name, item['kod']
        profile, diameter, channels = name.groups()
        key = (profile, int(diameter), int(channels))
        cat = catalog.get(key)
        values = dict.fromkeys(FIELDS)
        values.update(P=int(diameter), burc_kodu=int(bush[1]) if bush else None)
        technical_source = None
        if site:
            values = dict(zip(FIELDS, [number(s) for s in row[2:14]]))
            technical_source = site['url']
            if cat:
                delta = {k: {'orka': values[k], 'katalog': cat[0][k]} for k in FIELDS if values[k] != cat[0][k]}
                if delta:
                    flags.append('katalog_uyusmazligi')
                    differences.append({'kod': item['kod'], 'sayfa': cat[1], 'farklar': delta})
                else:
                    exact += 1
            else:
                flags.append('katalog_satiri_yok')
                missing_catalog.append(item['kod'])
        elif item['kod'].startswith('KYS '):
            if kys_row:
                for key, index in [('P', 3), ('O', 4), ('tip', 5), ('burc_kodu', 6), ('F', 7), ('J', 8), ('K', 9), ('L', 10), ('M', 11), ('N', 12)]:
                    values[key] = number(kys_row[index])
                technical_source = kys_url
                flags.append('KYS_resmi_site')
            else:
                flags.append('eksik')
        elif cat and bush and cat[0]['burc_kodu'] == int(bush[1]):
            values = cat[0].copy()
            technical_source = f'{URL}#page={cat[1]}'
            supplemented += 1
            flags.append('katalogdan_tamamlandi')
        else:
            flags.append('eksik')
        if item['kod'] == 'ORK BK SPB8005':
            flags.append('ad_belirsiz_orka_satirindan_cozuldu')
        if item['kod'].startswith('KYS '):
            flags.append('kaynak_marka_KYS')
        products.append(dict(kod=item['kod'], ad=item['ad'], profil=profile,
                             MARKA='KYS' if item['kod'].startswith('KYS ') else 'Yamansa',
                             kanal_sayisi=int(channels), **values,
                             teknik_kaynak=technical_source, bayraklar=flags))
    counts = Counter(p['kod'] for p in products)
    groups = defaultdict(Counter)
    for p in products:
        tip = p['tip']
        group = 'dolu' if tip in (1, 2, 3, 8, 9) else 'kollu' if tip in (4, 5) else 'diskli' if tip in (6, 7) else 'bilinmiyor'
        groups[p['kanal_sayisi']][group] += 1
    report = dict(toplam=len(products), orka=sum(bool(x.get('orka_site')) for x in source),
                  birebir=exact, katalogdan_tamamlanan=supplemented,
                  eksik=[p['kod'] for p in products if 'eksik' in p['bayraklar']],
                  tekrar_kodlar={k: v for k, v in counts.items() if v > 1},
                  katalog_satiri_yok=missing_catalog, uyusmazliklar=differences,
                  kanal_govde={k: dict(v) for k, v in sorted(groups.items())})
    (ROOT / 'veri.jsonl').write_text(''.join(json.dumps(p, ensure_ascii=False) + '\n' for p in products))
    (ROOT / 'veri_kontrol.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
