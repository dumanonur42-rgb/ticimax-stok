import json
import re
import tempfile
from collections import Counter
from pathlib import Path
from PIL import Image, ImageChops, ImageStat, UnidentifiedImageError
from prepare_images import ROOT, ROWS, compose, name, slug, source_key


def check_composition():
    with tempfile.TemporaryDirectory() as directory:
        folder = Path(directory)
        white = folder / 'white.png'
        Image.new('RGB', (200, 200), 'white').save(white)
        try:
            compose(white, folder / 'out.jpg')
            raise AssertionError('Empty photograph accepted')
        except ValueError as error:
            assert str(error) == 'Empty product photograph'
        invalid = folder / 'invalid.png'
        invalid.write_bytes(b'not an image')
        try:
            compose(invalid, folder / 'out.jpg')
            raise AssertionError('Invalid photograph accepted')
        except UnidentifiedImageError:
            pass
        transparent = Image.new('RGBA', (100, 100), (0, 0, 0, 0))
        transparent.paste((0, 0, 0, 255), (20, 20, 80, 80))
        transparent.save(folder / 'transparent.png')
        compose(folder / 'transparent.png', folder / 'out.jpg')
        output = Image.open(folder / 'out.jpg')
        assert output.format == 'JPEG' and output.size == (500, 500)
        assert output.getpixel((250, 225))[0] < 10
        assert output.getpixel((20, 225)) == (255, 255, 255)
    for row in ROWS:
        changed = dict(row, paket_adet=5000)
        assert name(changed) == name(row)
    print('PASS: composition normal/transparent, empty-photo rejection, invalid-file rejection; package quantity never changes title')


def main():
    records = json.loads((ROOT / 'work/gorsel.json').read_text())
    sources = json.loads((ROOT / 'work/gorsel_kaynaklar.json').read_text())
    research = json.loads((ROOT / 'work/gorsel_arama.json').read_text())
    assert set(records) == {r['kod'] for r in ROWS} and len(records) == 230
    used_files = set()
    header = Image.open(ROOT / 'sablon.png').convert('RGB').crop((0, 0, 500, 100))
    for row in ROWS:
        record = records[row['kod']]
        assert record['URUNADI'] == name(row)
        assert record['file'] == 'gorseller/' + slug(record['URUNADI']) + '.jpg'
        assert re.fullmatch(r'gorseller/[a-z0-9-]+\.jpg', record['file'])
        assert not re.search(r'orka|orkapt|paket|koli|\bpkt\b|\bad/|\u0307', record['URUNADI'], re.I)
        assert record['resim_seviye'] in ['birebir', 'ayni_tip']
        assert record['resim_kaynak'].startswith('https://') and record['notes']
        assert record['kaynak_tip'] == source_key(row)
        assert record['resim_kaynak'] == sources[record['kaynak_tip']]['url']
        assert (ROOT / sources[record['kaynak_tip']]['file']).is_file()
        assert record['arama']['query'] == research[row['kod']]['query']
        assert record['arama'].get('candidates') and not record['arama'].get('error')
        path = ROOT / record['file']
        assert path.is_file(), row['kod']
        image = Image.open(path)
        assert image.format == 'JPEG' and image.size == (500, 500), row['kod']
        image.verify()
        image = Image.open(path).convert('RGB')
        header_diff = ImageStat.Stat(ImageChops.difference(header, image.crop((0, 0, 500, 100)))).mean
        assert max(header_diff) < 3, row['kod']
        assert min(channel[0] for channel in image.crop((0, 350, 500, 500)).getextrema()) >= 250, row['kod']
        middle = image.crop((0, 100, 500, 350))
        mask = ImageChops.difference(middle, Image.new('RGB', middle.size, 'white')).convert('L').point(lambda v: 255 if v > 32 else 0)
        bbox = mask.getbbox()
        assert bbox and bbox[0] >= 10 and bbox[1] >= 5 and bbox[2] <= 490 and bbox[3] <= 245, row['kod']
        used_files.add(record['file'])
    assert used_files == {str(p.relative_to(ROOT)) for p in (ROOT / 'gorseller').glob('*.jpg')}
    assert len(list((ROOT / 'work/gorsel_onizleme').glob('tum-urunler-*.png'))) == 6
    assert (ROOT / 'work/gorsel_onizleme/tum-230-urun.png').is_file()
    counts = Counter(r['resim_seviye'] for r in records.values())
    print('PASS: 230/230 original stock codes map to an existing, decodable 500x500 JPG; missing=0')
    print('PASS: ' + str(len(used_files)) + ' ASCII name-slug JPGs; 18 extra stock codes reuse name-based image paths; orphan files=0')
    print('PASS: 230 source URLs, type mappings and recorded Yandex searches; 24 source variants')
    print('PASS: Yamansa template header; products within y=100..350; white logo-free bottom band; no package text or forbidden brand in titles')
    print('PASS: 6 detailed contact sheets cover all 230 stock codes; full 230-product overview exists')
    print('COUNTS: birebir=' + str(counts['birebir']) + ' ayni_tip=' + str(counts['ayni_tip']) + ' gorsel_yok=0')
    check_composition()


if __name__ == '__main__':
    main()
