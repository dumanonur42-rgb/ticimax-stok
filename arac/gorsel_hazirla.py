"""Onaylı kaynakların arka planını ayırır; ürün üzerindeki yazılara dokunmaz."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from rembg import new_session, remove
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]


def main(manifest='veri/gorsel-secimleri.json'):
    photos = json.loads((ROOT / manifest).read_text())
    session = new_session('isnet-general-use')
    done = set()
    for photo in photos.values():
        if not photo.get('arka_plan_ayir') or photo['dosya'] in done:
            continue
        original = Image.open(ROOT / photo['ham_dosya']).convert('RGBA')
        if photo.get('ham_kutu'):
            original = original.crop(photo['ham_kutu'])
        mask = np.asarray(remove(original, session=session).getchannel('A')) > 127
        if photo.get('on_plan'):
            foreground = Image.fromarray((mask * 255).astype('uint8'))
            x, y = photo.get('ham_kutu', [0, 0])[:2]
            ImageDraw.Draw(foreground).polygon([(px - x, py - y) for px, py in photo['on_plan']], fill=255)
            mask = np.asarray(foreground) > 127
        labels, _ = ndimage.label(mask)
        sizes = np.bincount(labels.ravel())
        sizes[0] = 0
        if sizes.max() == 0:
            raise ValueError('Ürün ayrılamadı: ' + photo['ham_dosya'])
        mask = labels == sizes.argmax()
        if not photo.get('delikleri_koru'):
            mask = ndimage.binary_fill_holes(mask)
        original.putalpha(Image.fromarray((mask * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.35)))
        original.save(ROOT / photo['dosya'])
        done.add(photo['dosya'])
        print('Arka plan: ' + photo['dosya'], flush=True)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'veri/gorsel-secimleri.json')
