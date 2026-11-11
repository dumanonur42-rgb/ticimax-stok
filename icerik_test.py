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

    def test_category_decisions(self):
        expected = {c.PLASTIC:72, c.STAINLESS:79, c.INSERT:13,
                    c.BASE+'DÖKÜM YATAKLARI':20,
                    'RULMAN>MANŞON SOMUN VE PUL>TESPİT BİLEZİKLERİ':62,
                    'RULMAN>RULMAN KEÇELERİ VE YATAK KEÇELERİ':35}
        self.assertEqual(dict(c.collections.Counter(r['KATEGORI'] for r in self.records)), expected)
        for raw in self.products:
            m = c.model(raw, self.tech[raw['kod']], self.labels)
            record = next(r for r in self.records if r['kod'] == raw['kod'])
            self.assertEqual((record['KATEGORI'],record['EK_KATEGORILER']),c.categories(m))
            self.assertFalse(record['yeni_kategori'])

    def test_no_generic_sections(self):
        for raw in self.products:
            m = c.model(raw, self.tech[raw['kod']], self.labels)
            _, _, paragraphs = c.prose(m, self.tech[raw['kod']]['alanlar'])
            if m['kind'] in ['TSN','FRB']:
                self.assertFalse(paragraphs[3])
                self.assertFalse(paragraphs[4])
            if m['kind'] == 'SN':
                self.assertIn(self.tech[raw['kod']]['alanlar']['yaglama_deligi'],paragraphs[4])
        raw = next(p for p in self.products if p['kod']=='ORK TSN 508')
        r, _ = c.create_record(raw,self.tech[raw['kod']],self.images[raw['kod']],self.labels,0)
        text = c.BeautifulSoup(r['ACIKLAMA'],'html.parser').get_text()
        self.assertLess(len(text),1800)
        self.assertIn('35 mm',text)
        self.assertNotIn('<h3>Montaj</h3>',r['ACIKLAMA'])

    def test_sentence_repetitions(self):
        self.assertEqual(c.sentence_repetitions([]),{'exact':[],'masked':[]})
        sentence = 'SUCF 205 için mil çapı 25 mm ve gövde genişliği 28 mm olan bu veri cümlesi yalnız denetim örneğidir.'
        a = dict(kod='A',URUNADI='SUCF 205 Plastik Test',ACIKLAMA='<p>'+sentence+'</p>')
        b = dict(kod='B',URUNADI='SUCF 206 Plastik Test',ACIKLAMA='<p>'+sentence.replace('205','206').replace('25 mm','30 mm')+'</p>')
        result=c.sentence_repetitions([a,b])
        self.assertEqual(len(result['exact']),0)
        self.assertEqual(len(result['masked']),1)
        b['ACIKLAMA']=a['ACIKLAMA']
        self.assertEqual(len(c.sentence_repetitions([a,b])['exact']),1)

    def test_natural_sections_and_wording(self):
        for record in self.records:
            soup=c.BeautifulSoup(record['ACIKLAMA'],'html.parser')
            self.assertEqual(c.wording_issues(soup),[])
            self.assertNotIn('olarak verilir',soup.get_text())
            sections=soup.select('.ysc')
            self.assertLessEqual(len(sections),4)
            self.assertGreaterEqual(len(sections),2)
            usage=next(s for s in sections if s.h3.get_text()=='Kullanım Alanları')
            self.assertEqual(len(c.re.split(r'(?<=[.!?])\s+',usage.p.get_text(' ',strip=True))),3)
        raw=next(p for p in self.products if p['kod']=='ORK YR SUCF205')
        m=c.model(raw,self.tech[raw['kod']],self.labels)
        sentence=c.measurement_sentence(m)
        self.assertIn('25 mm mile takılan SUCF 205',sentence)
        self.assertIn("34,1 mm'dir",sentence)
        self.assertEqual(c.measurement_sentence(dict(m,values={})), '')

    def test_wording_errors(self):
        for text in ['rulman rulman','rulmanlar ve yataklı rulmanlar']:
            soup=c.BeautifulSoup('<p>'+text+'</p>','html.parser')
            self.assertIn('word_repetition',c.wording_issues(soup))
        soup=c.BeautifulSoup('<p>Ölçüsü olarak verilir.</p>','html.parser')
        self.assertIn('as_given',c.wording_issues(soup))
        anchor='<a href="https://www.yamansarulman.com/dokum-yataklari">döküm yatakları</a>'
        self.assertIn('duplicate_link_text',c.wording_issues(c.BeautifulSoup(anchor+anchor,'html.parser')))
        self.assertEqual(c.wording_issues(c.BeautifulSoup('<p><a href="https://www.yamansarulman.com/rulman-keceleri-ve-yatak-keceleri-736">rulman keçeleri ve yatak keçeleri</a></p>','html.parser')),[])

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
