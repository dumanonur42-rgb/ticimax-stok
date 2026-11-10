import copy
import json
import unittest
from denetle import ROOT, audit


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.row = json.loads((ROOT / 'urunler.jsonl').read_text())

    def test_normal(self):
        self.assertEqual(audit([self.row]), [])

    def test_empty(self):
        self.assertTrue(audit([]))
        self.assertTrue(audit([{}]))

    def test_errors(self):
        cases = [('URUNADI', 'OrKaPt'), ('SEO_SAYFABASLIK', 'x' * 61),
                 ('SEO_SAYFAACIKLAMA', 'x' * 156), ('ANAHTARKELIME', 'x' * 951),
                 ('SEO_ANAHTARKELIME', 'x' * 951), ('URUNADI', 'İ\u0307'),
                 ('URUNADI', '0.52 mm'), ('URUNADI', '—'),
                 ('resim', 'gorseller/yok.jpg'), ('ACIKLAMA', '<p>kısa</p>'),
                 ('resim_kaynak', 'https://orkapt.com/a.jpg'), ('ONYAZI', '<p>yok</p>')]
        for key, value in cases:
            with self.subTest(key=key, value=value):
                row = copy.deepcopy(self.row)
                row[key] = value
                self.assertTrue(audit([row]))
        row = copy.deepcopy(self.row)
        row['ACIKLAMA'] = row['ACIKLAMA'].replace('https://www.yamansarulman.com/lineer-arabalar', 'https://example.com')
        self.assertTrue(audit([row]))
        self.assertTrue(any('paragraf tekrarı' in e for e in audit([self.row, self.row])))


if __name__ == '__main__':
    unittest.main()
