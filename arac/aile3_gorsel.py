"""Gözle incelenmiş kodsuz seri fotoğrafları; çizim fotoğraf yerine kullanılmaz."""
import json

from aile3_veri import ROOT, selected
from gorsel_sec import candidate, photo


def main():
    choices = {}
    for row in selected():
        code = row['kod']
        if code.startswith('ORK PD '):
            image = photo('veri/aile3-pinyon-foto.jpg', 'https://orkapt.com/wp-content/uploads/2020/03/1.9.jpg')
        elif code.startswith('ORK MKİ '):
            image = candidate('sheet steel motor slide base', 8)
        else:
            image = photo('veri/aile3-kremayer-foto.jpg', 'https://orkapt.com/wp-content/uploads/2020/03/DÜZ-KREMAYER-RAYLAR.jpg')
        choices[code] = image
    (ROOT / 'veri/aile3-gorsel-secimleri.json').write_text(json.dumps(choices, ensure_ascii=False, indent=2) + '\n')
    print(f'Aile 3 görsel: {len(choices)}')


if __name__ == '__main__':
    main()
