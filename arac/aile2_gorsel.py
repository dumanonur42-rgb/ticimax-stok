"""Aile 2 için görüntülenerek seçilen gerçek fotoğraflar."""
import json

from aile2_veri import ROOT, selected
from gorsel_sec import candidate


def main():
    choices = {}
    for row in selected():
        code = row['kod']
        if code.startswith(('ORK KKM ', 'ORK İM ')):
            photo = candidate('hardened precision shaft rod', 13, cutout=True)
            photo['on_plan'] = [[45, 481], [53, 467], [799, 256], [799, 310], [77, 519], [58, 516]]
        elif ' ADM ' in code:
            photo = candidate('supported shaft SBR photo', 10, cutout=True)
            photo['delikleri_koru'] = True
        elif ' TBR' in code:
            photo = candidate('TBR16UU', 2)
        elif ' VM ' in code:
            photo = candidate('rolled ball screw bar stock', 12)
        elif ' VSG ' in code:
            photo = candidate('DSG16H housing', 1)
        else:
            size = code[-4:]
            query, number = {'1605': ('SFU1605 nut', 9), '2005': ('SFU2005 nut', 0), '2505': ('SFU2505 nut', 0), '3210': ('SFU3210 nut', 10), '4010': ('SFU5010 nut', 1), '5010': ('SFU5010 nut', 1)}[size]
            photo = candidate(query, number, cutout=size == '2005')
            if size == '2505':
                photo['kutu'] = [0, 0, 900, 900]
            if size == '2005':
                photo['delikleri_koru'] = True
        choices[code] = photo
    (ROOT / 'veri/aile2-gorsel-secimleri.json').write_text(json.dumps(choices, ensure_ascii=False, indent=2) + '\n')
    print('Aile 2 görsel seçimi: ' + str(len(choices)))


if __name__ == '__main__':
    main()
