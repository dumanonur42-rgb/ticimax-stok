import copy
import json
import io
import unittest
from collections import Counter
from unittest.mock import patch

from bs4 import BeautifulSoup

from aile4_hazirla import identity, product
from aile4_veri import ROOT, prepare, selected
from denetle import audit, audit_batch


class FourthFamilyTests(unittest.TestCase):
    def setUp(self):
        self.source = selected()
        self.raw = [prepare(r) for r in self.source]
        self.rows = [json.loads(line) for line in (ROOT / 'urunler.jsonl').read_text().splitlines()]

    def test_scope_and_source_contract(self):
        self.assertEqual(Counter(r['aile'] for r in self.raw), {'BMT': 22, 'PM': 16, 'GKT': 3, 'YKKM': 4, 'KK': 1})
        for r in self.raw:
            with self.subTest(kod=r['kod']):
                item, ctx = product(r, dict(url='https://example.com/photo.jpg', seviye='ayni_tip'), 0)
                self.assertIsNone(ctx['cizim_modulu'])
                self.assertTrue(all(x['kaynak'] and x['deger'] for x in r['degerler'].values()))
                self.assertNotIn('\u0307', json.dumps(item, ensure_ascii=False))
                self.assertEqual(item['bayraklar'], r['bayraklar'])
                self.assertLessEqual(len(item['SEO_SAYFABASLIK']), 60)
                self.assertLessEqual(len(item['SEO_SAYFAACIKLAMA']), 155)
                self.assertGreaterEqual(len(BeautifulSoup(item['ACIKLAMA'], 'html.parser').get_text(' ', strip=True)), 1800)

    def test_missing_and_ambiguous_sources(self):
        for r in self.raw:
            if r['aile'] == 'PM':
                if r['model'][5:7] in ['14', '18']:
                    self.assertEqual(set(r['degerler']), {'Malzeme', 'Diş Tipi'})
                else:
                    self.assertIn('İç Çap (d)', r['degerler'])
                    self.assertIn('Dinamik Yük (C)', r['degerler'])
                    self.assertIn('Bağlantı Dişi (G)', r['degerler'])
                self.assertTrue(r['model'].endswith('R'))
                self.assertTrue(any('diş yönü' in f for f in r['bayraklar']))
            elif r['aile'] == 'YKKM':
                self.assertEqual(set(r['degerler']), {'Kapı Ağırlığı Kapasitesi'})
        by_model = {r['model']: r for r in self.raw}
        self.assertNotIn('Toplam Yükseklik (H)', by_model['SP22B']['degerler'])
        self.assertNotIn('Ana Bilya Çapı (Dw)', by_model['SP15B']['degerler'])
        self.assertEqual(by_model['SP12BF']['degerler']['Montaj Tipi']['deger'], 'Flanşlı')
        lock = by_model['S060']['degerler']
        self.assertEqual(lock['Dış Çap (D)']['deger'], '90 mm')
        self.assertNotIn('Boy (L)', lock)

    def test_welding_sales_unit_and_standard(self):
        for r in self.raw:
            if r['aile'] != 'GKT':
                continue
            item, _ = product(r, dict(url='https://example.com/photo.jpg', seviye='ayni_tip'), 0)
            self.assertNotIn('15', item['URUNADI'])
            self.assertNotIn('PKT', item['URUNADI'])
            v = r['degerler']
            self.assertEqual(v['Satış Birimi']['deger'], 'Adet')
            self.assertEqual(v['Ambalaj']['deger'], '15 kg/paket')
            self.assertIn('ER70S-6', v['Standart Sınıf Eşdeğerliği']['deger'])
            self.assertNotIn('paket halinde', item['ACIKLAMA'])
        invalid = copy.deepcopy(self.rows)
        wire = next(r for r in invalid if r['kod'] == 'ORK GKT MG208')
        wire['URUNADI'] += ' (15 KG/PKT)'
        self.assertTrue(any('ürün adında paket' in e for e in audit_batch(invalid)))
        wire['URUNADI'] = wire['URUNADI'].replace(' (15 KG/PKT)', '')
        wire['ACIKLAMA'] += '<p>Paket halinde satılır.</p>'
        self.assertTrue(any('paket halinde satış' in e for e in audit_batch(invalid)))

    def test_normal_empty_and_invalid(self):
        self.assertEqual(audit(self.rows), [])
        self.assertEqual(audit_batch(self.rows), [])
        with self.assertRaises(KeyError):
            prepare({})
        with self.assertRaises(ValueError):
            prepare({'kod': 'bilinmeyen'})
        with self.assertRaises(ValueError):
            identity(dict(model='X', aile='bilinmeyen', degerler={}))
        with patch('aile4_veri.gzip.open') as stream:
            stream.return_value.__enter__.return_value = iter([])
            self.assertEqual(selected(), [])
        incomplete = copy.deepcopy(next(r for r in self.source if r['kod'].startswith('ORK GKT ')))
        incomplete['ad'] = ''
        with self.assertRaises(AttributeError):
            prepare(incomplete)
        self.assertTrue(audit_batch(self.rows + [self.rows[-1]]))

    def test_duplicate_input_codes_reported(self):
        data = '\n'.join(json.dumps({'kod': r['kod']}) for r in self.rows + [self.rows[0]])
        with patch('denetle.gzip.open', return_value=io.StringIO(data)):
            errors = audit_batch(self.rows)
        self.assertTrue(any('girdide yinelenen kod: ' + self.rows[0]['kod'] in e for e in errors))


if __name__ == '__main__':
    unittest.main()
