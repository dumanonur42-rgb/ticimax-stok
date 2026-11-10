"""Görüntülenerek onaylanan fotoğrafların model bazında seçim kaydı."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CROPS = {
    'HGH30HA': [245, 230, 525, 450],
    'HGW15CC': [250, 220, 480, 430],
    'HGW20CC': [245, 220, 500, 440],
    'HGW20HC': [230, 200, 520, 460],
    'HGW25CC': [240, 190, 650, 530],
    'HGW25HC': [255, 210, 515, 455],
    'HGW30CC': [220, 125, 660, 535],
    'HGW30HC': [245, 210, 515, 450],
    'HGW35CC': [255, 225, 520, 470],
    'HGW35HC': [170, 150, 590, 550],
}


def candidate(query, number, *, cutout=False, crop=None, level='ayni_tip'):
    file = f'veri/arama-{query.replace(" ", "-")}-{number}.jpg'
    rows = json.loads((ROOT / f'veri/arama-{query.replace(" ", "-")}.json').read_text())
    url = next(r['url'] for r in rows if r['dosya'] == file)
    return photo(file, url, level, cutout, crop)


def photo(file, url, level='ayni_tip', cutout=False, crop=None):
    out = dict(dosya=file, url=url, seviye=level, incelendi=True)
    if cutout:
        out.update(ham_dosya=file, dosya=file.rsplit('.', 1)[0] + '-kesim.png', arka_plan_ayir=True)
        if crop:
            out['ham_kutu'] = crop
    elif crop:
        out['kutu'] = crop
    return out


def main():
    sources = json.loads((ROOT / 'veri/gorsel-adaylari.json').read_text())
    raw = [r for f in ['hg', 'hgr', 'pmi'] for r in json.loads((ROOT / f'veri/{f}.json').read_text())]
    choices = {}
    for record in raw:
        model = record['model']
        if model.startswith(('HGH', 'HGW')):
            index = 1 if model in ['HGH20HA', 'HGH25HA', 'HGH35HA', 'HGH45HA', 'HGW45HC'] else 0
            key = f'{model}-{index}'
            if model == 'HGW45CC':
                choices[model] = candidate('HGW CC bottom green', 0, cutout=True, crop=[480, 225, 800, 550])
                continue
            # 45 sayfalarının üst fotoğraflarında 35 kodu okunuyor; bunlar kullanılmaz.
            level = 'ayni_tip' if model in ['HGH45HA', 'HGW45HC'] else 'birebir'
            choices[model] = photo(f'veri/{key}.jpg', sources[key], level, index == 0, CROPS.get(model))
            if model == 'HGW25CC':
                choices[model]['on_plan'] = [[300, 285], [450, 200], [612, 287], [600, 311], [619, 333], [455, 451], [386, 488], [286, 384], [281, 334]]
        elif model.startswith('HGR'):
            choices[model] = candidate('HGR15 HGR20 rail', 0)
        elif record['seri'] == 'MSB':
            if record['genis']:
                choices[model] = candidate('PMI MSB15E', 0, cutout=True, crop=[165, 70, 580, 385])
            elif model == 'MSB15S':
                choices[model] = candidate('PMI MSB15S', 1, level='birebir')
            else:
                choices[model] = candidate('PMI MSB20S', 8, cutout=True)
        elif record['uzun']:
            choices[model] = candidate('PMI MSA30LE', 10, cutout=True) if record['genis'] else candidate('PMI MSA45LS block', 8, cutout=True)
        elif record['genis']:
            choices[model] = candidate('PMI MSA15E', 13, cutout=True)
        else:
            choices[model] = candidate('PMI MSA15S', 0)
    (ROOT / 'veri/gorsel-secimleri.json').write_text(json.dumps(choices, ensure_ascii=False, indent=2) + '\n')
    print('Görsel seçimi: ' + str(len(choices)))


if __name__ == '__main__':
    main()
