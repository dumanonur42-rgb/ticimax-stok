import unittest

from denetle import ROOT, REPO, audit, load
from icerik import build, keywords, overview, technical


class ContentTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = load(ROOT / 'veri.jsonl')
        cls.images = {r['kod']: r for r in load(ROOT / 'gorsel_map.jsonl')}
        cls.urls = set((REPO / 'katurl.txt').read_text().splitlines())

    def check_row(self, row, mutate=None):
        image = self.images[row['kod']]
        product = build(row, image)
        if mutate:
            mutate(product)
        return audit([product], [row], [image], self.urls, expected_count=1)

    def test_normal_and_internal_exemption(self):
        row = next(r for r in self.rows if r['tip'] == 8)
        self.assertEqual(self.check_row(row)['urun'], 1)
        self.assertIn('orkapt', row['teknik_kaynak'])

    def test_missing_and_kys(self):
        row = next(r for r in self.rows if r['tip'] is None)
        self.assertEqual(self.check_row(row)['eksik'], 1)
        self.assertNotIn('Burç No', dict(technical(row)))
        self.assertEqual(self.check_row(self.rows[0])['urun'], 1)
        self.assertIn('kys spb 180x3', keywords(self.rows[0]))
        for code in ('ORK BK SPB1064', 'ORK BK SPC1403'):
            row = next(r for r in self.rows if r['kod'] == code)
            product = build(row, self.images[code])
            self.assertIn('eksik', product['bayraklar'])
            self.assertIn('cizim_yok', product['bayraklar'])
            self.assertEqual(self.check_row(row)['cizim_yok'], 1)

    def test_empty_overview(self):
        self.assertEqual(overview([]), '<table><tbody><tr></tr></tbody></table>')

    def test_empty_dataset(self):
        with self.assertRaisesRegex(ValueError, 'Satır sayısı'):
            audit([], [], [], self.urls)

    def test_bad_visible_and_seo(self):
        for mutate in [lambda p: p.update(SEO_SAYFAACIKLAMA='Dunlop kasnak'),
                       lambda p: p.update(SEO_SAYFABASLIK='a' * 61),
                       lambda p: p.update(ACIKLAMA=''),
                       lambda p: p.update(ONYAZI=p['ONYAZI'].replace('SPB', 'SPZ')),
                       lambda p: p.update(ANAHTARKELIME='kasnak, kasnak')]:
            with self.assertRaises(ValueError):
                self.check_row(self.rows[0], mutate)

    def test_duplicate_paragraph(self):
        rows = self.rows[:2]
        images = [self.images[r['kod']] for r in rows]
        products = [build(r, im) for r, im in zip(rows, images)]
        repeated = '<p>' + 'Bu metin tekrar kontrolü için kullanılan uzun bir açıklamadır. ' * 3 + '</p>'
        for product in products:
            product['ACIKLAMA'] += repeated
        with self.assertRaisesRegex(ValueError, 'Tekrarlanan uzun paragraf'):
            audit(products, rows, images, self.urls, expected_count=2)


if __name__ == '__main__':
    unittest.main()
