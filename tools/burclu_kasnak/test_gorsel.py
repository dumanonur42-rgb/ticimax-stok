import json
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from PIL import Image, ImageDraw

from ad import urun_slug
from gorsel_uret import REPO, ROOT, govde, kaynaklar, kompozit


class GorselTest(unittest.TestCase):
    def test_empty(self):
        with patch('gorsel_uret.Image.open', return_value=Image.new('RGB', (100, 100), 'white')):
            with self.assertRaises(ValueError):
                kompozit({'path': 'empty'}, Image.new('RGB', (500, 500), 'white'))

    def test_shadow_and_center(self):
        source = Image.new('RGB', (200, 150), 'white')
        pen = ImageDraw.Draw(source)
        pen.ellipse((0, 90, 150, 140), fill=(180, 180, 180))
        pen.rectangle((70, 20, 130, 120), fill='black')
        with patch('gorsel_uret.Image.open', return_value=source):
            result = np.array(kompozit({'path': 'synthetic'}, Image.new('RGB', (500, 500), 'white')))
        y, x = np.where(result.min(axis=2) < 130)
        self.assertLess(abs((x.min() + x.max()) / 2 - 250), 2)
        self.assertLess(abs((y.min() + y.max()) / 2 - 225), 2)

    def test_missing_file(self):
        with self.assertRaises(FileNotFoundError):
            kompozit({'path': '/home/ubuntu/work/nonexistent-source.jpg'}, Image.new('RGB', (500, 500), 'white'))

    def test_white_background(self):
        source = Image.new('RGB', (200, 150), 'white')
        ImageDraw.Draw(source).rectangle((70, 20, 130, 120), fill=(220, 220, 220))
        with patch('gorsel_uret.Image.open', return_value=source):
            result = np.array(kompozit({'path': 'light', 'background': 'white'},
                                      Image.new('RGB', (500, 500), 'white')))
        y, x = np.where(result.min(axis=2) < 230)
        self.assertLess(abs((x.min() + x.max()) / 2 - 250), 2)
        self.assertLess(abs((y.min() + y.max()) / 2 - 225), 2)
        with patch('gorsel_uret.Image.open', return_value=Image.new('RGB', (100, 100), 'white')):
            with self.assertRaises(ValueError):
                kompozit({'path': 'empty', 'background': 'white'},
                         Image.new('RGB', (500, 500), 'white'))

    def test_all_outputs(self):
        rows = [json.loads(x) for x in (ROOT / 'veri.jsonl').read_text().splitlines()]
        mapped = [json.loads(x) for x in (ROOT / 'gorsel_map.jsonl').read_text().splitlines()]
        self.assertEqual(len(rows), 519)
        self.assertEqual(len(mapped), 519)
        self.assertEqual(len({r['kod'] for r in mapped}), 519)
        self.assertEqual(len({r['resim_yolu'] for r in mapped}), 519)
        self.assertEqual({r['kod'] for r in rows}, {r['kod'] for r in mapped})
        self.assertEqual(sum('gorsel_govde_dogrulanmadi' in r['bayraklar'] for r in mapped), 11)
        by_code = {r['kod']: r for r in rows}
        sources = {s['url']: (n, body) for (n, body), s in kaynaklar().items()}
        template = np.array(Image.open(REPO / 'sablon.png').convert('RGB')).astype(float)
        for item in mapped:
            row = by_code[item['kod']]
            self.assertEqual(item['resim_yolu'], 'gorseller/' + urun_slug(row) + '.jpg')
            self.assertEqual(item['resim_seviye'], 'ayni_tip')
            channel, body = sources[item['resim_kaynak']]
            self.assertEqual(channel, row['kanal_sayisi'])
            if govde(row):
                self.assertEqual('gorsel_govde_farkli' in item['bayraklar'], body != govde(row))
            else:
                self.assertIsNone(row['tip'])
                self.assertEqual(body, 'dolu')
            with Image.open(REPO / item['resim_yolu']) as im:
                self.assertEqual(im.size, (500, 500))
                self.assertEqual(im.format, 'JPEG')
                pixels = np.array(im).astype(float)
                self.assertLess(np.abs(pixels[:100] - template[:100]).mean(), 2)
                self.assertLess(np.abs(pixels[350:] - template[350:]).mean(), 2)
                y, x = np.where(pixels[100:350].min(axis=2) < 130)
                self.assertGreaterEqual(x.min(), 40)
                self.assertLessEqual(x.max(), 459)
                self.assertGreaterEqual(y.min(), 15)
                self.assertLessEqual(y.max(), 234)
        self.assertEqual(len(list((REPO / 'gorseller').glob('*.jpg'))), 519)
        print('PASS: 519 JPEG 500x500; 519 benzersiz kod/slug; kanal, gövde bayrakları, 11 bilinmeyen, bantlar ve kenar boşlukları')


if __name__ == '__main__':
    unittest.main()
