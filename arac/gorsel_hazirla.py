"""Onaylı kaynakların arka planını ayırır; ürün üzerindeki yazılara dokunmaz."""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from rembg import new_session, remove
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]


def main():
    photos = json.loads((ROOT / 'veri/gorsel-secimleri.json').read_text())
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
        mask = ndimage.binary_fill_holes(labels == sizes.argmax())
        original.putalpha(Image.fromarray((mask * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.35)))
        original.save(ROOT / photo['dosya'])
        done.add(photo['dosya'])
        print('Arka plan: ' + photo['dosya'], flush=True)


if __name__ == '__main__':
    main()
