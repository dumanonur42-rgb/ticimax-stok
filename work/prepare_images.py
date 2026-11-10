import json
import re
import unicodedata
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parent.parent
ROWS = json.loads((ROOT / 'work/urunler_parsed.json').read_text())
TECH = json.loads((ROOT / 'work/teknik.json').read_text())


def name(row):
    brand = row['gosterilecek_marka']
    brand = {'İWİS': 'iwis ECOPLUS', 'SEDİS': 'Sedis', 'CSE (CZECH)': 'CSE'}.get(brand, brand)
    parts = [] if brand == 'Yamansa' else [brand]
    parts.append(row['iso_kod'])
    if row['paslanmaz']:
        parts.append('Paslanmaz')
    if row['pim_delikli']:
        parts.append('Pim Delikli')
    parts.append({1: 'Tek Sıra', 2: 'Çift Sıra', 3: 'Üç Sıra', 4: 'Dört Sıra'}[row['sira']])
    parts.append({'zincir': 'Çift Hatveli Makaralı Zincir' if row['aile'] in ['cift_hatve', 'cift_hatve_hp'] else 'Makaralı Zincir', 'bakla': 'Zincir Baklası Yarım Kilit', 'kilit': 'Zincir Kilidi Tam Kilit', 'disli': '9 Diş Zincir Dişlisi'}[row['tip']])
    p = TECH[row['teknik_anahtar']]['olculer']['p']
    if p:
        parts.append(str(p['deger']).rstrip('0').rstrip('.') .replace('.', ',') + ' mm')
    return ' '.join(parts)


def slug(text):
    text = text.replace('ı', 'i').replace('İ', 'I')
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().lower()
    return re.sub('[^a-z0-9]+', '-', text).strip('-')


def compose(source, destination, crop=None, rotation=0):
    source = Image.open(source).convert('RGBA')
    background = Image.new('RGBA', source.size, 'white')
    background.alpha_composite(source)
    source = background.convert('RGB')
    if crop:
        source = source.crop(tuple(crop))
    if rotation:
        source = source.rotate(rotation, resample=Image.Resampling.BICUBIC, expand=True, fillcolor='white')
    mask = ImageChops.difference(source, Image.new('RGB', source.size, 'white')).convert('L').point(lambda v: 255 if v > 22 else 0)
    bbox = mask.getbbox()
    if not bbox:
        raise ValueError('Empty product photograph')
    product = source.crop(bbox)
    if rotation:
        scale = min(460/product.width, 230/product.height)
        product = product.resize((round(product.width*scale), round(product.height*scale)), Image.Resampling.LANCZOS)
    else:
        product.thumbnail((460, 230), Image.Resampling.LANCZOS)
    result = Image.new('RGB', (500, 500), 'white')
    result.paste(Image.open(ROOT / 'sablon.png').convert('RGB').crop((0, 0, 500, 100)), (0, 0))
    result.paste(product, ((500-product.width)//2, 110+(230-product.height)//2))
    result.save(destination, quality=95, subsampling=0)


def source_key(row):
    if row['tip'] == 'disli':
        return 'sprocket2'
    if row['iso_kod'] == '415H':
        return '415hclip'
    prefix = 'ss' if row['paslanmaz'] else ''
    if row['tip'] == 'zincir':
        if row['aile'] == 'cift_hatve_hp':
            return 'hpdouble'
        if row['aile'] == 'cift_hatve':
            return 'double'
        if row['pim_delikli']:
            return prefix + 'hpchain'
        return prefix + 'chain' + str(row['sira'])
    if row['tip'] == 'bakla':
        return prefix + 'offset' + str(row['sira'])
    if row['pim_delikli']:
        return prefix + 'hpclip'
    return prefix + 'clip' + str(row['sira'])


def contact_sheets(records):
    out = ROOT / 'work/gorsel_onizleme'
    out.mkdir(exist_ok=True)
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
    rows = list(records.items())
    overview = Image.new('RGB', (1600, 4140), '#e6e6e6')
    overview_draw = ImageDraw.Draw(overview)
    for page, start in enumerate(range(0, len(rows), 40), 1):
        sheet = Image.new('RGB', (1000, 1776), '#e6e6e6')
        draw = ImageDraw.Draw(sheet)
        for n, (code, record) in enumerate(rows[start:start+40]):
            x, y = (n % 5)*200, (n // 5)*222
            photo = Image.open(ROOT / record['file'])
            photo.thumbnail((198, 198), Image.Resampling.LANCZOS)
            sheet.paste(photo, (x+1, y+1))
            draw.text((x+4, y+201), code, fill='black', font=font)
            index = start + n
            ox, oy = (index % 10)*160, (index // 10)*180
            photo.thumbnail((158, 158), Image.Resampling.LANCZOS)
            overview.paste(photo, (ox+1, oy+1))
            overview_draw.text((ox+3, oy+160), code, fill='black', font=font)
        sheet.save(out / ('tum-urunler-' + str(page) + '.png'))
    overview.save(out / 'tum-230-urun.png')


if __name__ == '__main__':
    sources = json.loads((ROOT / 'work/gorsel_kaynaklar.json').read_text())
    searches = json.loads((ROOT / 'work/gorsel_arama.json').read_text())
    records = {}
    outputs = {}
    session = None
    for row in ROWS:
        key = source_key(row)
        source = sources[key]
        photo = ROOT / source['file']
        if source['remove_background']:
            cleaned = photo.with_name(photo.stem + '-isnet.png')
            if not cleaned.exists():
                if session is None:
                    session = new_session('isnet-general-use', providers=['CPUExecutionProvider'])
                cleaned.write_bytes(remove(photo.read_bytes(), session=session))
            photo = cleaned
        title = name(row)
        path = 'gorseller/' + slug(title) + '.jpg'
        if path in outputs:
            assert outputs[path] == key, 'Conflicting image types for identical title: ' + title
        else:
            compose(photo, ROOT / path, source['crop'], source.get('rotation', 0))
            outputs[path] = key
        records[row['kod']] = {
            'URUNADI': title, 'file': path, 'resim_seviye': 'ayni_tip',
            'resim_kaynak': source['url'], 'resim_kaynak_sayfa': source['page'],
            'kaynak_tip': key,
            'notes': [source['note'], 'Aynı marka ve tam ölçüyü kanıtlayan fotoğraf olarak sunulmaz.',
                      'Yamansa üst şablonu; beyaz zemin; alt bant logosuz.',
                      'Adet satışı: ürün adında paket/koli miktarı yok.'],
            'arama': searches.get(row['kod'], {}),
        }
    (ROOT / 'work/gorsel.json').write_text(json.dumps(records, ensure_ascii=False, indent=2)+'\n')
    contact_sheets(records)
    print('Prepared:', len(records), 'stock codes;', len(outputs), 'distinct name-based 500x500 JPGs;', len({r['kaynak_tip'] for r in records.values()}), 'photo variants')
