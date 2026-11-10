import unittest

from ad import slug, urun_adi, urun_slug


class AdTest(unittest.TestCase):
    def setUp(self):
        self.row = dict(profil='SPA', P=100, kanal_sayisi=3, burc_kodu=1610)

    def test_name(self):
        self.assertEqual(urun_adi(self.row), 'SPA 100x3 Burçlu V Kasnak 3 Kanallı 1610 Burç Ø100 mm')
        self.assertEqual(urun_slug(self.row), 'spa-100x3-burclu-v-kasnak-3-kanalli-1610-burc-100-mm')

    def test_brand_and_missing_bush(self):
        self.row.update(MARKA='KYS', burc_kodu=None)
        self.assertEqual(urun_adi(self.row), 'KYS SPA 100x3 Burçlu V Kasnak 3 Kanallı Ø100 mm')

    def test_turkish_ascii(self):
        self.assertEqual(slug('İĞŞÇÖÜ ı Ø75,5 mm'), 'igscou-i-75-5-mm')

    def test_empty_and_invalid(self):
        for name in ('', ' ', 'Ø'):
            with self.assertRaises(ValueError):
                slug(name)
        with self.assertRaises(ValueError):
            urun_adi(dict(self.row, profil=''))
        for number in (0, -1, float('nan'), float('inf')):
            with self.assertRaises(ValueError):
                urun_adi(dict(self.row, P=number))
        with self.assertRaises(ValueError):
            urun_adi(dict(self.row, kanal_sayisi=1.5))


if __name__ == '__main__':
    unittest.main()
