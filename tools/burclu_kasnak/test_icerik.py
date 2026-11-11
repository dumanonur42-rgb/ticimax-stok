import unittest

from denetle import ROOT, REPO, audit, audit_sentences, generic_sentences, load, sentence_counts
from icerik import BODY_NOTES, TYPES, build, keywords, overview, technical


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

    def test_generic_sentence_filter(self):
        sentence = 'Mil bağlantısı için uyumlu burcun iç çapı esas alınır.'
        html = '<p>Mil <strong>bağlantısı</strong> için uyumlu burcun iç çapı esas alınır.</p>'
        self.assertEqual(generic_sentences(html), {sentence})
        for prefix in ('42 mm ölçüsünde ', 'SPA profilinde ', 'SPZ profilinde ',
                       'SPB profilinde ', 'SPC profilinde ', 'SPA1003 kodunda '):
            self.assertEqual(generic_sentences('<p>' + prefix + sentence + '</p>'), set())
        self.assertEqual(generic_sentences('x' * 38 + '.'), set())
        self.assertEqual(generic_sentences('x' * 39 + '.'), {'x' * 39 + '.'})
        self.assertEqual(generic_sentences('<p>Kayış &amp; burç uyumu birlikte kontrol edilmelidir.</p>'),
                         {'Kayış & burç uyumu birlikte kontrol edilmelidir.'})

    def test_sentence_products_not_occurrences(self):
        first = 'Mil bağlantısı için uyumlu burcun iç çapı esas alınır.'
        second = 'Kayış uzunluğu ve kanal sayısı ayrı bilgiler olarak değerlendirilir!'
        third = 'Yalnız fotoğrafa göre montaj uyumu varsayılmadan teknik bilgiler kontrol edilir?'
        products = [{'ACIKLAMA': f'<p>{first} {second} {third}</p><p>{first}</p>'},
                    {'ACIKLAMA': f'<p>{first}</p>'}]
        counts = sentence_counts(products)
        self.assertEqual(counts, {first: 2, second: 1, third: 1})

    def test_sentence_empty(self):
        self.assertEqual(generic_sentences(''), set())
        self.assertEqual(generic_sentences('<p> </p>'), set())
        self.assertEqual(sentence_counts([]), {})
        audit_sentences({}, 0)

    def test_sentence_frequency_boundary(self):
        sentence = 'Mil bağlantısı için uyumlu burcun iç çapı esas alınır.'
        products = [{'ACIKLAMA': f'<p>{sentence}</p>' if i < 155 else ''} for i in range(519)]
        audit_sentences(sentence_counts(products), len(products))
        products[155]['ACIKLAMA'] = f'<p>{sentence}</p>'
        with self.assertRaisesRegex(ValueError, 'en fazla 155/519'):
            audit_sentences(sentence_counts(products), len(products))
        audit_sentences({sentence: 3}, 10)
        with self.assertRaisesRegex(ValueError, 'en fazla 3/10'):
            audit_sentences({sentence: 4}, 10)

    def test_generated_sentence_distribution(self):
        self.assertEqual(set(BODY_NOTES), set(TYPES))
        products = [build(row, self.images[row['kod']]) for row in self.rows]
        counts = sentence_counts(products)
        self.assertTrue(counts)
        audit_sentences(counts, len(products))


if __name__ == '__main__':
    unittest.main()
