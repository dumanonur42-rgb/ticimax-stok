import copy
import json
import shutil
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from aile2_hazirla import identity, product
from aile2_veri import ROOT, prepare, selected
from denetle import audit_batch


class SecondFamilyTests(unittest.TestCase):
    def setUp(self):
        self.raw = [prepare(row) for row in selected()]

    def test_scope_and_input_values(self):
        self.assertEqual(len(self.raw), 56)
        self.assertEqual(Counter(r['aile'] for r in self.raw), dict(KKM=12, IM=13, SAC=7, TBR=4, VM=6, SFU=9, DSG=5))
        self.assertEqual(len({r['kod'] for r in self.raw}), 56)
        for row in self.raw:
            self.assertTrue(row['degerler'])
            for value in row['degerler'].values():
                self.assertTrue(value['kaynak'])
                self.assertTrue(value['deger'])

    def test_titles_content_and_drawing_policy(self):
        for index, row in enumerate(self.raw):
            with self.subTest(kod=row['kod']):
                item, ctx = product(row, dict(url='https://example.com/photo.jpg', seviye='ayni_tip'), index)
                self.assertLessEqual(len(item['SEO_SAYFABASLIK']), 60)
                self.assertLessEqual(len(item['SEO_SAYFAACIKLAMA']), 155)
                self.assertNotIn('\u0307', json.dumps(item, ensure_ascii=False))
                self.assertNotIn('Yamansa', item['URUNADI'])
                self.assertEqual(ctx['cizim_modulu'], 'mil' if row['aile'] in ['KKM', 'IM'] else None)
                self.assertEqual(item['bayraklar'], row['bayraklar'])
                if row['aile'] in ['KKM', 'IM', 'SAC', 'VM']:
                    self.assertTrue('Metre' in item['URUNADI'] or 'mm - ' in item['URUNADI'])

    def test_unsupported_variant_and_capacity_not_invented(self):
        for row in self.raw:
            labels = row['degerler']
            self.assertFalse(any('Kapasite' in label or label in ['Ca', 'Coa'] for label in labels))
            if row['aile'] == 'SFU':
                self.assertEqual(set(labels), {'Mil Çapı (d)', 'Vida Adımı (Ph)'})
                self.assertTrue(row['bayraklar'])
            if row['marka'] == 'ETAZON':
                self.assertTrue(any('ETAZON resmi' in flag for flag in row['bayraklar']))
            if row['model'] == 'DSG40H':
                self.assertNotIn('Gövde Uzunluğu (L)', labels)
                self.assertTrue(row['bayraklar'])
            if row['aile'] in ['KKM', 'IM']:
                self.assertEqual(set(labels), {'Mil Çapı (dr)', 'Boy (Lm)'})

    def test_empty_and_invalid_inputs(self):
        with self.assertRaises(KeyError):
            prepare({})
        with self.assertRaises(ValueError):
            prepare({'kod': 'başka ürün 20'})
        with self.assertRaises(KeyError):
            identity({})
        invalid = copy.deepcopy(self.raw[0])
        invalid['aile'] = 'tanımsız'
        with self.assertRaises(ValueError):
            identity(invalid)
        with self.assertRaises(KeyError):
            product(self.raw[0], {}, 0)

    def test_missing_and_forbidden_draw_results_rejected(self):
        rows = [json.loads(line) for line in (ROOT / 'urunler.jsonl').read_text().splitlines()]
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'veri').mkdir()
            (root / 'parca').mkdir()
            shutil.copy(ROOT / 'parca/lineer_diger.jsonl.gz', root / 'parca/lineer_diger.jsonl.gz')
            for name in ['hg', 'hgr', 'pmi', 'aile2', 'aile3', 'aile4', 'lineer-ctx', 'draw-keys']:
                shutil.copy(ROOT / f'veri/{name}.json', root / f'veri/{name}.json')
            self.assertEqual(audit_batch(rows, root), [])
            drawings = json.loads((root / 'veri/draw-keys.json').read_text())
            shaft = next(d for d in drawings if d['kod'] == 'ORK KKM 20')
            shaft['keys'].remove('Lm')
            unit = next(d for d in drawings if d['kod'] == 'ORK VMS SFU1605')
            unit['cagrildi'] = True
            (root / 'veri/draw-keys.json').write_text(json.dumps(drawings))
            errors = audit_batch(rows, root)
            self.assertTrue(any('ORK KKM 20: çizim anahtarları eksik' in e for e in errors))
            self.assertTrue(any('ORK VMS SFU1605: modülsüz' in e for e in errors))


if __name__ == '__main__':
    unittest.main()
