import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from aile_hazirla import ROOT, compose, identity, product, slug
from denetle import audit_batch
from veri_hazirla import parse_table, selected


class FamilyTests(unittest.TestCase):
    def setUp(self):
        self.raw = [r for f in ['hg', 'hgr', 'pmi'] for r in json.loads((ROOT / f'veri/{f}.json').read_text())]

    def test_scope_and_sources(self):
        self.assertEqual(len(self.raw), 52)
        self.assertEqual(sorted(r['kod'] for r in self.raw), sorted(r['kod'] for r in selected()))
        for raw in self.raw:
            with self.subTest(kod=raw['kod']):
                for value in raw['degerler'].values():
                    self.assertTrue(value['kaynak'].startswith('https://'))
                    self.assertTrue(value['deger'])
                title, _, _ = identity(raw)
                self.assertEqual('GENİŞ' in title, raw['genis'])
                self.assertNotIn('\u0307', slug(title))
                item, ctx = product(raw, {'url': 'https://example.com/photo.jpg', 'seviye': 'ayni_tip'}, 1)
                self.assertLessEqual(len(item['SEO_SAYFABASLIK']), 60)
                self.assertLessEqual(len(item['SEO_SAYFAACIKLAMA']), 155)
                self.assertEqual(ctx['title'], item['URUNADI'])

    def test_empty_and_invalid(self):
        self.assertEqual(parse_table('', 'W H'), {})
        with self.assertRaises(ValueError):
            parse_table('test 1', 'W H')
        with self.assertRaises(KeyError):
            identity({})
        with self.assertRaises(KeyError):
            product(self.raw[0], {}, 0)

    def test_batch_contract(self):
        rows = [json.loads(line) for line in (ROOT / 'urunler.jsonl').read_text().splitlines()]
        self.assertEqual(audit_batch(rows), [])
        self.assertTrue(audit_batch([]))
        self.assertTrue(audit_batch(rows + rows[:1]))

    def test_white_canvas_and_full_box(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            template = Image.new('RGB', (500, 500), '#ddd')
            template.paste('blue', (0, 0, 500, 100))
            template.save(root / 'sablon.png')
            Image.new('RGB', (200, 100), 'black').save(root / 'source.png')
            with patch('aile_hazirla.ROOT', root):
                compose({'dosya': 'source.png'}, 'output.jpg')
            with Image.open(root / 'output.jpg') as output:
                self.assertEqual(output.size, (500, 500))
                self.assertGreater(output.getpixel((250, 50))[2], 245)
                self.assertLess(max(output.getpixel((40, 120))), 10)
                self.assertEqual(output.getpixel((250, 375)), (255, 255, 255))
            Image.new('RGB', (200, 100), 'white').save(root / 'source.png')
            with patch('aile_hazirla.ROOT', root):
                with self.assertRaises(ValueError):
                    compose({'dosya': 'source.png'}, 'output.jpg')
                with self.assertRaises(FileNotFoundError):
                    compose({'dosya': 'missing.png'}, 'output.jpg')


if __name__ == '__main__':
    unittest.main()
