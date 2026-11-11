import copy
import gzip
import hashlib
import io
import json
import unittest
import xml.etree.ElementTree as ET

import icerik as c
from PIL import Image, ImageChops


class Catalogue(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.products = [json.loads(x) for x in gzip.open(c.REPO / 'parca/yatak.jsonl.gz', 'rt')]
        cls.tech = json.loads((c.ROOT / 'teknik.json').read_text())
        cls.images = json.loads((c.ROOT / 'gorsel.json').read_text())
        cls.labels = c.contracts()
        cls.records = [json.loads(x) for x in (c.OUT / 'urunler.jsonl').read_text().splitlines()]

    def test_turkish_helpers(self):
        self.assertEqual(c.tr_lower('İÇ ÇAP IŞIK'), 'iç çap ışık')
        self.assertEqual(c.ascii_slug('İç Çapı 25 mm'), 'ic-capi-25-mm')
        self.assertEqual(c.number(34.1), '34,1')
        with self.assertRaises(ValueError):
            c.number(None)
        with self.assertRaises(ValueError):
            c.ascii_slug('!!!')

    def test_missing_data(self):
        raw = next(p for p in self.products if p['kod'] == 'ORK YR SSUCF205')
        tech = copy.deepcopy(self.tech[raw['kod']])
        del tech['alanlar']['L_mm']
        record, model = c.create_record(raw, tech, self.images[raw['kod']], self.labels, 0)
        self.assertIn('eksik', record['bayraklar'])
        self.assertIn('cizim_yok', record['bayraklar'])
        self.assertNotIn('L', model['values'])
        with self.assertRaises(KeyError):
            c.create_record({}, {}, {}, self.labels, 0)

    def test_complete_audit(self):
        models = [c.model(p, self.tech[p['kod']], self.labels) for p in self.products]
        drawings = json.loads((c.ROOT / 'icerik-denetim/drawings.json').read_text())
        result = c.audit(self.records, models, drawings, c.OUT)
        self.assertEqual(result['products'], 281)
        self.assertEqual(result['drawings'], 165)
        self.assertEqual(result['no_drawing'], 116)

    def test_svg_xml(self):
        drawings = json.loads((c.ROOT / 'icerik-denetim/drawings.json').read_text())
        for i, item in enumerate(drawings):
            if item['draw']:
                root = ET.parse(c.ROOT / 'icerik-denetim' / (str(i) + '.svg')).getroot()
                keys = {n.attrib['data-k'] for n in root.iter() if 'data-k' in n.attrib}
                self.assertEqual(keys, set(item['keys']))

    def test_etazon_and_tsn(self):
        for record in self.records:
            specs = {s['l']: s['v'] for s in c.context(record)['specs']}
            if record['kod'].startswith('RUL '):
                self.assertEqual(record['MARKA'], 'ETAZON')
                self.assertNotIn('Dinamik Yük', specs)
            self.assertEqual(specs['Satış Birimi'], 'Adet')

    def test_image_bands(self):
        baseline = Image.open(c.REPO / 'sablon.png').convert('RGB')
        baseline.paste('white', (0, 100, 500, 350))
        buffer = io.BytesIO()
        baseline.save(buffer, format='JPEG', quality=90, subsampling=0)
        buffer.seek(0)
        reference = Image.open(buffer).convert('RGB')
        for record in self.records:
            path = c.OUT / record['resim']
            source = c.ROOT / self.images[record['kod']]['dosya']
            self.assertEqual(hashlib.sha256(path.read_bytes()).digest(),
                             hashlib.sha256(source.read_bytes()).digest())
            with Image.open(path) as image:
                for box in [(0, 0, 500, 100), (0, 350, 500, 500)]:
                    self.assertIsNone(ImageChops.difference(image.crop(box), reference.crop(box)).getbbox())


if __name__ == '__main__':
    unittest.main(verbosity=2)
