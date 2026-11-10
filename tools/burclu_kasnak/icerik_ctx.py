"""Çizim ctx verisini üretilmiş açıklamaların ilk UL listesinden çıkarır."""
import json
import os
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(os.environ.get('BURCLU_WORK', str(Path.home() / 'work')))
REPO = Path(os.environ.get('BURCLU_REPO', str(Path.home() / 'repos/ticimax-stok')))
rows = [json.loads(x) for x in (REPO / 'urunler.jsonl').read_text().splitlines()]
contexts = []
for row in rows:
    html = BeautifulSoup(row['ACIKLAMA'], 'html.parser')
    specs = []
    for li in html.find('ul').find_all('li', recursive=False):
        label = li.strong.get_text(' ', strip=True)
        specs.append(dict(l=label.rstrip(':'), v=li.get_text(' ', strip=True)[len(label):].strip()))
    tip = next((int(s['v'].split()[1]) for s in specs if s['l'] == 'Gövde Tipi'), None)
    contexts.append(dict(kod=row['kod'], title=row['URUNADI'], crumbs=row['KATEGORI'].split('>'),
                         path='/' + Path(row['resim']).stem, tip=tip, specs=specs, onyazi=[]))
(ROOT / 'icerik_ctx.json').write_text(json.dumps(contexts, ensure_ascii=False, indent=2))
sample = next(r for r in rows if r['URUNADI'].startswith('SPA 100x3 '))
(ROOT / 'icerik_ornek.json').write_text(json.dumps(sample, ensure_ascii=False, indent=2))
print('CTX: 519 açıklamanın ilk teknik UL listesinden üretildi; örnek icerik_ornek.json')
