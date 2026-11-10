"""Görünüşü incelenmiş Aile 4 fotoğrafları; teknik resim kullanılmaz."""
import json

from aile4_veri import ROOT, selected
from gorsel_sec import candidate, photo as source_photo


def main():
    choices = {}
    for row in selected():
        code, model = row['kod'], row['kod'].split()[-1]
        if code.startswith('ORK BMT '):
            if model == 'CY16B2':
                photo = candidate('CY16B-2 ball transfer', 4)
            elif model == 'CY25A':
                photo = candidate('CY25A ball transfer', 4)
            elif model.startswith('IA'):
                photo = candidate('IA19 ball transfer', 3)
            elif model == 'NL8H':
                photo = candidate('NL8H plastic ball transfer', 10)
            elif model in ['SP12AFL', 'SP15AFL']:
                photo = candidate('SP15AFL ball transfer', 0)
            elif model == 'SP12B':
                photo = candidate('SP15B ball transfer', 2)
            elif model.endswith('P'):
                photo = candidate('SP15A ball transfer heavy duty', 5, cutout=True)
            elif model in ['SP12BF', 'SP15B', 'SP25B']:
                photo = candidate('SP15B ball transfer', 0)
            else:
                photo = candidate('SP15A ball transfer heavy duty', 0)
        elif code.startswith('ORK PM '):
            photo = candidate('SSPHS stainless rod end', 4, cutout=True) if model.startswith('SSPHS') else candidate('SSPOS stainless rod end', 11, cutout=True)
            photo['delikleri_koru'] = True
        elif code.startswith('ORK GKT '):
            photo = candidate('SG2 welding wire spool unbranded', 2)
        elif code.startswith('ORK YKKM '):
            photo = candidate('sliding gate motor unbranded', 0)
        else:
            photo = source_photo('veri/aile4-s040-foto.png', 'https://static.ticimax.cloud/79038/uploads/urunresimleri/buyuk/konik-kilit-250-s-tipi-04065-64b-4d.png', crop=[90, 110, 410, 400])
        choices[code] = photo
    (ROOT / 'veri/aile4-gorsel-secimleri.json').write_text(json.dumps(choices, ensure_ascii=False, indent=2) + '\n')
    print(f'Aile 4 görsel: {len(choices)}')


if __name__ == '__main__':
    main()
