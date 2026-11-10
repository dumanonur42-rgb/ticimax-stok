import copy
import json
import unittest
from collections import Counter

from aile3_hazirla import identity, product
from aile3_veri import ROOT, PINION_LABELS, prepare, selected
from denetle import audit, audit_batch


class ThirdFamilyTests(unittest.TestCase):
    def setUp(self):
        self.raw = [prepare(row) for row in selected()]

    def test_all_54_rows_and_source_alignment(self):
        self.assertEqual(Counter(r['aile'] for r in self.raw), {'PD': 40, 'KR': 7, 'MKI': 7})
        for row in self.raw:
            with self.subTest(kod=row['kod']):
                if row['aile'] == 'PD':
                    expected = dict(zip(PINION_LABELS, row['orka_site']['satir'][2:8]))
                    if row['kod'] in ['ORK PD M532', 'ORK PD M534', 'ORK PD M536']:
                        expected['Diş Sayısı (Z)'] = row['model'][2:]
                        self.assertIn('dis_sayisi_duzeltmesi', row)
                    self.assertEqual({k: v['deger'].split()[0] for k, v in row['degerler'].items()}, expected)
                elif row['aile'] == 'MKI':
                    self.assertEqual([v['deger'].split()[0] for v in row['degerler'].values()], row['orka_site']['satir'][3:15])
                item, ctx = product(row, dict(url='https://example.com/photo.jpg', seviye='ayni_tip'), 0)
                self.assertIsNone(ctx['cizim_modulu'])
                self.assertLessEqual(len(item['SEO_SAYFABASLIK']), 60)
                self.assertLessEqual(len(item['SEO_SAYFAACIKLAMA']), 155)
                self.assertNotIn('\u0307', json.dumps(item, ensure_ascii=False))
                self.assertEqual(item['bayraklar'], row['bayraklar'])

    def test_missing_rack_and_computed_pitch(self):
        rack = next(r for r in self.raw if r['kod'] == 'ORK KRKA M41005308')
        self.assertEqual(set(rack['degerler']), {'Modül (m)', 'Hatve (p)'})
        self.assertEqual(rack['degerler']['Hatve (p)']['deger'], '12,57 mm')
        self.assertTrue(rack['degerler']['Hatve (p)']['kaynak'].startswith('hesap:'))
        missing_units = [r['kod'] for r in self.raw if not r['girdi_birimi']]
        self.assertEqual(missing_units, ['ORK KRKA M410053010', 'ORK KRKA M410053012', 'ORK KRKA M41005308'])
        self.assertTrue(all(r['bayraklar'] for r in self.raw if not r['girdi_birimi']))

    def test_empty_invalid_and_incomplete_source(self):
        with self.assertRaises(KeyError):
            prepare({})
        with self.assertRaises(ValueError):
            prepare({'kod': 'PMI autre'})
        pinion = copy.deepcopy(next(r for r in selected() if r['kod'].startswith('ORK PD ')))
        pinion['orka_site'] = None
        with self.assertRaises(ValueError):
            prepare(pinion)
        with self.assertRaises(KeyError):
            identity({})

    def test_tooth_correction_requires_name_and_pitch_agreement(self):
        source = copy.deepcopy(next(r for r in selected() if r['kod'] == 'ORK PD M532'))
        restored = prepare(source)
        self.assertEqual(restored['degerler']['Diş Sayısı (Z)']['deger'], '32')
        source['orka_site']['satir'][5] = '159'
        rejected = prepare(source)
        self.assertNotIn('Diş Sayısı (Z)', rejected['degerler'])
        self.assertNotIn('dis_sayisi_duzeltmesi', rejected)
        source['orka_site']['satir'][5] = '160'
        source['ad'] = ''
        self.assertNotIn('Diş Sayısı (Z)', prepare(source)['degerler'])

    def test_catalog_and_customer_brand_boundary(self):
        rows = [json.loads(line) for line in (ROOT / 'urunler.jsonl').read_text().splitlines()]
        self.assertEqual(audit_batch(rows), [])
        row = next(r for r in rows if r['kod'] == 'ORK PD M416')
        self.assertEqual(audit([row]), [])
        invalid = copy.deepcopy(row)
        invalid['ACIKLAMA'] += '<p>ORKAPT https://orkapt.com</p>'
        self.assertTrue(any('yasak marka' in e for e in audit([invalid])))
        for record in rows:
            if record['kod'].startswith(('ORK ADM ', 'ORK LR TBR', 'ORK VM ', 'ORK VMS ', 'ETA VMS ', 'ORK VSG ')):
                self.assertTrue(record['yeni_kategori'])
                self.assertIn('LİNEER', record['EK_KATEGORILER'])


if __name__ == '__main__':
    unittest.main()
