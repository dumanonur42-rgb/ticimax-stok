"""Assemble the triger delivery without changing the content generator."""
import gzip
import json
import shutil
from pathlib import Path

import gen

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ('kod URUNADI MARKA KATEGORI EK_KATEGORILER yeni_kategori ONYAZI ACIKLAMA '
          'ANAHTARKELIME SEO_SAYFABASLIK SEO_SAYFAACIKLAMA SEO_ANAHTARKELIME '
          'resim resim_seviye resim_kaynak gorsel_grup teknik_kaynak bayraklar').split()


def main():
    groups = json.loads((ROOT / 'tools/gorsel_gruplar.json').read_text())
    records, used = [], set()
    (ROOT / 'gorseller').mkdir(exist_ok=True)
    with gzip.open(ROOT / gen.SRC, 'rt', encoding='utf-8') as source:
        for line in source:
            record = gen.build(json.loads(line))
            group = record.pop('grup')
            record.pop('_d')
            record['gorsel_grup'] = group
            record['resim_kaynak'] = groups[group]['url']
            original = Path(record['resim'])
            image, suffix = original, 2
            while image.as_posix() in used:
                image = original.with_name(original.stem + '-' + str(suffix) + original.suffix)
                suffix += 1
            record['resim'] = image.as_posix()
            used.add(record['resim'])
            shutil.copyfile(ROOT / 'tmp_master' / (group + '.jpg'), ROOT / image)
            records.append({field: record[field] for field in FIELDS})
    with (ROOT / 'urunler.jsonl').open('w', encoding='utf-8') as output:
        for record in records:
            output.write(json.dumps(record, ensure_ascii=False) + '\n')
    print(f'ASSEMBLE: {len(records)} records, {len(used)} unique image paths')


if __name__ == '__main__':
    main()
