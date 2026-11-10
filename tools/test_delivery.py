import contextlib
import copy
import gzip
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import assemble
import denetle


class DeliveryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sample = json.loads((assemble.ROOT / 'urunler.jsonl').read_text().splitlines()[0])

    def check(self, records, expected):
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()), \
                patch.object(denetle, 'drawings', return_value=[]):
            self.assertEqual(denetle.audit(records), expected)

    def test_normal_empty_and_required(self):
        self.check([self.sample], True)
        self.check([], False)
        for field in assemble.FIELDS:
            record = copy.deepcopy(self.sample)
            record.pop(field)
            with self.subTest(field=field):
                self.check([record], False)
        record = copy.deepcopy(self.sample)
        record['URUNADI'] = ''
        self.check([record], False)

    def test_limits_supplier_unicode_and_html(self):
        mutations = [('SEO_SAYFABASLIK', 'x' * 61), ('SEO_SAYFAACIKLAMA', 'x' * 156),
                     ('ANAHTARKELIME', 'x' * 251), ('SEO_ANAHTARKELIME', 'x' * 951),
                     ('ACIKLAMA', '<p>kısa</p>'), ('MARKA', 'Başka'),
                     ('URUNADI', 'I\u0307'), ('URUNADI', 'e\u0301'),
                     ('URUNADI', 'Ã'), ('URUNADI', 'Ä±'), ('URUNADI', 'Å')]
        mutations += [(field, ('<p>' + term + '</p>' + self.sample[field]) if field == 'ACIKLAMA' else term)
                      for field in ('URUNADI', 'ACIKLAMA') for term in ('koli', 'paket', 'PKT', '10 AD')]
        mutations += [(field, 'ORKAPT') for field in denetle.FACING]
        mutations += [(field, self.sample[field] + value)
                      for field in ('ONYAZI', 'ACIKLAMA') for value in ('—', '–')]
        for field, value in mutations:
            record = copy.deepcopy(self.sample)
            record[field] = value
            with self.subTest(field=field, value=value[:15]):
                self.check([record], False)

    def test_links_categories_images_and_duplicates(self):
        record = copy.deepcopy(self.sample)
        record['yeni_kategori'] = False
        self.check([record], False)
        record = copy.deepcopy(self.sample)
        record['resim'] = 'gorseller/not-present.jpg'
        self.check([record], False)
        self.check([self.sample, self.sample], False)
        for links in ('', '<a href="/not-present">hata</a>',
                      '<a href="https://www.yamansarulman.com/kasnaklar">kasnak</a>' * 5):
            record = copy.deepcopy(self.sample)
            record['ACIKLAMA'] = '<p>' + 'ürün ' * 500 + '</p>' + links
            self.check([record], False)
        for size, format_ in [((10, 10), 'JPEG'), ((500, 500), 'PNG')]:
            with patch('denetle.Image.open') as image:
                image.return_value.__enter__.return_value.size = size
                image.return_value.__enter__.return_value.format = format_
                self.check([self.sample], False)

    def test_context_labels(self):
        record = copy.deepcopy(self.sample)
        record['ACIKLAMA'] = '<ul><li><strong>Diş Sayısı:</strong> 16</li></ul>'
        self.assertEqual(denetle.contexts([record])[0]['specs'], [{'l': 'Diş Sayısı', 'v': '16'}])

    def test_assembly_collision_suffix_and_field_order(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'tools').mkdir()
            (root / 'tmp_master').mkdir()
            (root / 'tools/gorsel_gruplar.json').write_text('{"G1":{"url":"https://example.com/photo.jpg"}}')
            (root / 'tmp_master/G1.jpg').write_bytes(b'master')
            with gzip.open(root / 'input.gz', 'wt') as output:
                output.write('{}\n{}\n')
            record = dict(self.sample, grup='G1', _d={}, resim='gorseller/same.jpg')
            with patch.object(assemble, 'ROOT', root), patch.object(assemble.gen, 'SRC', 'input.gz'), \
                    patch.object(assemble.gen, 'build', side_effect=[copy.deepcopy(record), copy.deepcopy(record)]), \
                    contextlib.redirect_stdout(io.StringIO()):
                assemble.main()
            rows = [json.loads(line) for line in (root / 'urunler.jsonl').read_text().splitlines()]
            self.assertEqual([r['resim'] for r in rows], ['gorseller/same.jpg', 'gorseller/same-2.jpg'])
            self.assertEqual(list(rows[0]), assemble.FIELDS)
            self.assertEqual((root / rows[1]['resim']).read_bytes(), b'master')


if __name__ == '__main__':
    unittest.main()
