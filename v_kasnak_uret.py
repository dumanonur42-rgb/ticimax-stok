import gzip
import hashlib
import json
import re
import argparse
import collections
import subprocess
from pathlib import Path

from bs4 import BeautifulSoup
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent


def tr_lower(value):
    return value.translate(str.maketrans('Iİ', 'ıi')).lower()


def ascii_text(value):
    return tr_lower(value).translate(str.maketrans('çğıöşüø', 'cgiosuo'))


def variant(model, name, choices):
    seed = hashlib.sha256((model + name).encode()).digest()
    return choices[int.from_bytes(seed[:4], 'big') % len(choices)]


def product(row, image):
    p, z, diameter = map(int, re.search(r'(13|17|22)\*(\d+)\*(\d+)', row['ad']).groups())
    model = f'{p}x{z}x{diameter}'
    profile = {13: 'A', 17: 'B', 22: 'C'}[p]
    dolu = 'VKD' in row['kod']
    kind = 'Dolu' if dolu else 'Kör'
    title = f'{model} {kind} V Kasnak {z} Kanallı {p} mm {profile} Kayış Ø{diameter} mm'
    labels = [('Kayış Genişliği', f'{p} mm'), ('Kanal Sayısı', str(z)), ('Kasnak Çapı', f'{diameter} mm'), ('Tip' if dolu else 'Göbek', kind), ('Kayış Profili', profile)]
    onyazi = '<table><tbody><tr>' + ''.join(f'<td><strong>{l}</strong> {v}</td>' for l, v in labels) + '</tr></tbody></table>'
    intro = variant(model, 'intro', [
        f'{model} {kind.lower()} V kasnak, {p} mm üst genişliğe sahip klasik {profile} kesit V kayışlarla kullanılan {z} kanallı modeldir. {diameter} mm kasnak çapıyla V kayışlı güç aktarım düzeneklerinde yer alır. Model adı, kayış genişliğini, kanal sayısını ve kasnak çapını bir arada gösterir.',
        f'{p} mm klasik {profile} kesit kayışlar için sunulan {model} {kind.lower()} V kasnak, {z} kanala ve {diameter} mm kasnak çapına sahiptir. V kayışlı makine tahriklerinde kullanılan bu modelin ölçü adlandırması, kayış genişliği ile kanal sayısını ve çapı birlikte ifade eder.',
        f'{model} {kind.lower()} V kasnak; {diameter} mm kasnak çapı, {z} kanal ve {p} mm klasik {profile} kayış kesitiyle tanımlanır. V kayış kullanılan aktarma düzenekleri için hazırlanan ürün bilgisinde model ve kayış kesiti birlikte yer alır.'
    ])
    code = variant(model, 'code', [
        f'{model} modelindeki ilk sayı {p} mm kayış genişliğini, ikinci sayı {z} kanalı, son sayı ise {diameter} mm kasnak çapını anlatır. {profile} harfi klasik V kayış kesitidir; DIN 2215 / ISO 4184 kapsamında {p} mm üst genişlik {profile} profiline karşılık gelir.',
        f'{model} ölçüsünü okurken {p} mm kayış genişliği, {z} kanal ve {diameter} mm kasnak çapı sırasını izleyebilirsiniz. Klasik V kayışlarda {profile} kesiti {p} mm üst genişliği ifade eder; bu kesit eşleştirmesi DIN 2215 / ISO 4184 adlandırmasına dayanır.'
    ])
    hub = variant(model, 'hub', [
        f'{model} Dolu V Kasnak, {p} mm {profile} kesit kayışa uygun {z} kanallı seçenektir. Ürün tipi Dolu V Kasnak olarak adlandırılır; {diameter} mm kasnak çapı ve {z} kanal bilgisiyle bu ölçüde bir kasnak arayanlar için model kolayca ayırt edilir.' if dolu else
        f'{model} kör V kasnağın göbeği, mil deliği açılmamış ve kullanılacak mile göre işlenecek yapıdadır. {p} mm {profile} kayış kesiti, {z} kanal ve {diameter} mm kasnak çapıyla tanımlanan bu modelde mil bağlantısı, göbeğin kullanılacak mile göre işlenmesiyle hazırlanır.',
        f'{model} modelinin ürün tipi Dolu V Kasnak olarak geçer. {diameter} mm kasnak çapı ile {p} mm {profile} kayış kesitini bir araya getiren {z} kanallı bu seçenek, model numarası ve ölçü bilgileriyle ürün listesinde bulunabilir.' if dolu else
        f'{model} kör V kasnak, mil deliği kullanılacak mile göre açılacak bir göbeğe sahiptir. {diameter} mm çapındaki {z} kanallı model, {p} mm {profile} kesit kayışla kullanılır; kör göbek, montaj için gereken mil deliğinin işlenmesine olanak verir.'
    ])
    use = variant(model, 'use', [
        f'{model}, {p} mm {profile} kayış kesiti ve {z} kanal kullanan düzenekler için {diameter} mm çaplı bir seçenektir. V kayış kasnaklarının yaygın kullanım alanları şunlardır:',
        f'{model} ölçüsündeki {diameter} mm kasnak, {p} mm {profile} kayış ve {z} kanal gerektiren aktarma düzenlerinde değerlendirilir. V kayışlı tahriklerin kullanıldığı başlıca makine grupları:'
    ])
    selection = variant(model, 'selection', [
        f'{model} ararken {p} mm {profile} kayış kesiti, {z} kanal ve {diameter} mm kasnak çapını birlikte kullanabilirsiniz. Aynı ölçü, {p}*{z}*{diameter} veya {p}-{z}-{diameter} biçiminde de yazılır. Kayış üzerindeki {profile} kesit işareti ile kasnağın model bilgisi, eşleşen ürünleri bulmayı kolaylaştırır.',
        f'{model} modelini kayış genişliği, kanal sayısı ve çap sırasıyla okuyabilirsiniz: {p} mm {profile} kayış, {z} kanal, {diameter} mm kasnak çapı. Aramalarda kullanılan {p}*{z}*{diameter} ve {p} {z} {diameter} yazımları da aynı ölçü sırasını izler.'
    ])
    links = f'{model} ile birlikte değerlendirilecek {p} mm {profile} kesit kayışlar için <a href="https://www.yamansarulman.com/duz-v-kayis">düz V kayış</a> seçeneklerine bakabilirsiniz. {z} kanallı, {diameter} mm çaplı bu modelle karşılaştırılacak diğer ürünler <a href="https://www.yamansarulman.com/kasnaklar">kasnaklar</a> bölümündedir.'
    links = variant(model, 'links', [links,
        f'{model} için {p} mm {profile} kesit kayış arıyorsanız <a href="https://www.yamansarulman.com/duz-v-kayis">düz V kayışlar</a> bölümünü inceleyebilirsiniz. {diameter} mm çap ve {z} kanal dışındaki seçenekleri karşılaştırmak için <a href="https://www.yamansarulman.com/kasnaklar">kasnak çeşitlerine</a> göz atabilirsiniz.'
    ])
    code, use, selection, links = [text.replace(model, f'{model} {kind.lower()} V kasnak') for text in (code, use, selection, links)]
    body = f'<h2>{title}</h2><p>{intro}</p>'
    uses = ['Elektrik motoru tahrikleri', 'Fan ve aspiratör tahrikleri', 'Kompresör tahrik sistemleri', 'Pompa tahrikleri', 'Tarım makinelerindeki V kayışlı düzenekler', 'Ağaç işleme ve atölye makineleri', 'Konveyör tahrikleri']
    order = int.from_bytes(hashlib.sha256((model + kind).encode()).digest()[:2], 'big') % len(uses)
    uses = uses[order:] + uses[:order]
    for heading, paragraph in [('Model ve Kayış Kesiti', code), ('Ürün Tipi' if dolu else 'Kör Göbek', hub), ('Kullanım Alanları', use), ('Model Ölçüsünün Yazımı', selection), ('İlgili Ürünler', links)]:
        extra = '<ul>' + ''.join(f'<li>{text}</li>' for text in uses) + '</ul>' if heading == 'Kullanım Alanları' else ''
        body += f'<div class="ysc"><h3>{heading}</h3><p>{paragraph}</p>{extra}</div>'
    technical = '<ul><li><strong>Model:</strong> ' + model + '</li>' + ''.join(f'<li><strong>{l}:</strong> {v}</li>' for l, v in labels) + '<li><strong>Satış Birimi:</strong> Adet</li></ul>'
    description = '<div class="urunTabAlt"><div class="ydsc"><div class="ym">' + body + '</div><aside class="ya"><h3>Ürün Özellikleri</h3>' + technical + '</aside></div></div>'
    words = [model, f'{p}*{z}*{diameter}', f'{p} {z} {diameter}', f'{p}-{z}-{diameter}', f'{model} kasnak', f'{diameter} mm kasnak', f'{diameter}mm v kasnak', f'Ø{diameter} kasnak', f'{profile} kanal kasnak', f'{profile} kesit kasnak', f"{p}'lük kasnak", f'{p} lük kasnak', f'{p} mm kayış kasnağı', f'{z} kanallı kasnak', f'{kind.lower()} kasnak', 'v kayış kasnağı', 'kanallı kasnak']
    if not dolu:
        words += ['delinmemiş kasnak', 'işlenecek göbek']
    words += [f'{ {1:"tek",2:"iki",3:"üç",4:"dört",5:"beş",6:"altı"}[z]} kanallı kasnak']
    words += [f'{model} v kasnak', f'kasnak {diameter}', 'v kasnağı', f'{profile} tipi kasnak', f'{z} kanal {profile} kasnak']
    keywords = ', '.join(dict.fromkeys(words + [ascii_text(w) for w in words]))
    slug = re.sub('[^a-z0-9]+', '-', ascii_text(title)).strip('-')
    return dict(kod=row['kod'], URUNADI=title, MARKA='Yamansa', KATEGORI='KASNAKLAR>KÖR V KASNAKLAR', EK_KATEGORILER=[], yeni_kategori=False, ONYAZI=onyazi, ACIKLAMA=description, ANAHTARKELIME=keywords, SEO_SAYFABASLIK=f'{model} {kind} V Kasnak {z} Kanallı {p} mm {profile} Kayış', SEO_SAYFAACIKLAMA=f'{model} {kind.lower()} V kasnak: {z} kanal, {p} mm {profile} kayış, Ø{diameter} mm kasnak çapı. Hızlı kargo.', SEO_ANAHTARKELIME=keywords, resim=f'gorseller/{slug}.jpg', resim_seviye=image['seviye'], resim_kaynak=image['page_url'], teknik_kaynak=[row['orka_site']['url'], 'DIN 2215 / ISO 4184: klasik V kayış üst genişliği 13 mm = A, 17 mm = B, 22 mm = C.'], bayraklar=['eksik: delik çapı, toplam genişlik, göbek ölçüleri, ağırlık', 'cap_tipi_belirsiz'])


def composite(source, target):
    photo = Image.open(source).convert('RGB')
    channels = photo.split()
    light = ImageChops.darker(ImageChops.darker(channels[0], channels[1]), channels[2]).point(lambda x: 255 if x > 210 else 0)
    photo.paste('white', mask=light)
    difference = ImageChops.difference(photo, Image.new('RGB', photo.size, 'white')).convert('L')
    bbox = difference.point(lambda x: 255 if x > 35 else 0).getbbox()
    photo = photo.crop(bbox)
    scale = min(480 / photo.width, 250 / photo.height)
    photo = photo.resize((round(photo.width * scale), round(photo.height * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new('RGB', (500, 500), 'white')
    canvas.paste(Image.open(ROOT / 'sablon.png').convert('RGB').crop((0, 0, 500, 100)), (0, 0))
    canvas.paste(photo, ((500 - photo.width) // 2, 100 + (250 - photo.height) // 2))
    canvas.save(target, quality=95, subsampling=0)


def audit(draw_module, node):
    items = [json.loads(line) for line in (ROOT / 'urunler.jsonl').read_text().splitlines()]
    rows = [json.loads(line) for line in gzip.open(ROOT / 'parca/v_kasnak.jsonl.gz', 'rt')]
    assert len(items) == len(rows) == 372
    source = {row['kod']: row for row in rows}
    assert {item['kod'] for item in items} == set(source)
    for key in ['kod', 'URUNADI', 'resim']:
        assert len({item[key] for item in items}) == len(items), key
    customer = ['URUNADI', 'MARKA', 'KATEGORI', 'ONYAZI', 'ACIKLAMA', 'ANAHTARKELIME', 'SEO_SAYFABASLIK', 'SEO_SAYFAACIKLAMA', 'SEO_ANAHTARKELIME', 'resim']
    paragraphs, contexts = [], []
    valid_links = set((ROOT / 'katurl.txt').read_text().splitlines())
    for item in items:
        code = item['kod']
        assert all(value not in (None, '') for value in item.values()), code
        assert item['EK_KATEGORILER'] == [] and item['yeni_kategori'] is False
        assert all(item[key] for key in customer)
        assert item['MARKA'] == 'Yamansa' and item['KATEGORI'] == 'KASNAKLAR>KÖR V KASNAKLAR'
        assert all(not re.search('ork', item[key], re.I) for key in customer), code
        assert all('\u0307' not in item[key] and '—' not in item[key] for key in customer), code
        assert '\u0307' not in json.dumps(item, ensure_ascii=False) and '—' not in json.dumps(item, ensure_ascii=False)
        for key, limit in [('SEO_SAYFABASLIK', 60), ('SEO_SAYFAACIKLAMA', 155), ('ANAHTARKELIME', 950), ('SEO_ANAHTARKELIME', 950)]:
            assert len(item[key]) <= limit, (code, key, len(item[key]))
        assert '| Yamansa' not in item['SEO_SAYFABASLIK'] and 'Yamansa’da' not in item['SEO_SAYFAACIKLAMA']
        assert len(item['ACIKLAMA']) >= 1800, code
        assert '<li><strong>Satış Birimi:</strong> Adet</li>' in item['ACIKLAMA']
        assert not re.search(r'koli|paket|pkt|\d+\s*adet', item['URUNADI'], re.I)
        assert not re.search(r'belirtilmemiş|verilmemiş|genişlik çıkarmayın|güç ya da devir|delik ölçüsü olarak|koli halinde satılır', item['ACIKLAMA'], re.I)
        assert re.fullmatch(r'gorseller/[a-z0-9-]+\.jpg', item['resim'])
        with Image.open(ROOT / item['resim']) as im:
            assert im.size == (500, 500) and im.format == 'JPEG', code
            assert im.convert('RGB').crop((0, 355, 500, 500)).getextrema() == ((255, 255),) * 3, code
        soup = BeautifulSoup(item['ACIKLAMA'], 'html.parser')
        links = [link['href'] for link in soup.select('a[href]')]
        assert 2 <= len(links) <= 4 and all(link in valid_links for link in links), code
        p, z, diameter = map(int, re.search(r'(13|17|22)\*(\d+)\*(\d+)', source[code]['ad']).groups())
        model = f'{p}x{z}x{diameter}'
        assert f'<li><strong>Model:</strong> {model}</li>' in item['ACIKLAMA']
        for para in soup.select('p'):
            text = para.get_text(' ', strip=True)
            if len(text) > 120:
                assert model in text, code
                paragraphs.append(text)
        specs = []
        for li in soup.select('aside > ul > li'):
            label = li.find('strong')
            key = label.get_text().rstrip(':')
            label.extract()
            specs.append(dict(l=key, v=li.get_text(' ', strip=True)))
        contexts.append(dict(title=item['URUNADI'], crumbs=['KASNAKLAR', 'KÖR V KASNAKLAR'], specs=specs, expected=[diameter, p, z]))
    assert len(paragraphs) == len(set(paragraphs)), 'duplicate long paragraphs'
    assert len(list((ROOT / 'gorseller').glob('*.jpg'))) == 372
    js = """var fs=require('fs'),vm=require('vm'),assert=require('assert');
var box={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),box);
var mod=box.window.YDRAW.v_kasnak,all=JSON.parse(fs.readFileSync(0,'utf8'));
all.forEach(function(ctx,i){var r=mod.draw(ctx,{id:'audit'+i});assert(r,ctx.title);
assert.deepStrictEqual(Array.from(r.keys,function(k){return parseFloat(k.v.replace(',','.'))}),ctx.expected);
assert(!/oranlar|dış|bölüm|dis cap|bolum cap/i.test(r.svg));});
console.log('PASS DRAWING 372/372: ACIKLAMA labels -> non-null, correct D/w/z; no schematic/diameter caption in SVG');"""
    result = subprocess.run([node, '-e', js, str(draw_module)], input=json.dumps(contexts), text=True, capture_output=True, check=True)
    package = re.compile(r'\d[\d.,]*\s*(?:adet|ad\b|pkt\b|paket|koli)', re.I)
    package_count = sum(any(package.search(row[field]) for field in ['ad', 'birim']) for row in rows)
    levels = collections.Counter(item['resim_seviye'] for item in items)
    print('PASS PRODUCTS 372; empty fields 0; duplicate kod/title/image filename 0')
    print('PASS SEO title <=60; description <=155; keywords <=950; ACIKLAMA >=1800')
    print('PASS forbidden customer names/filenames 0; U+0307 0; em dash 0; invalid links 0')
    print(f'PASS LONG PARAGRAPHS {len(paragraphs)} unique; repeated >120-char paragraphs 0')
    print('PASS Model + Satış Birimi: Adet 372/372; package wording in titles 0; warning/missing-data prose 0')
    print(f'PASS PACKAGE_QTY_IN_AD_OR_BIRIM {package_count}; BIRIM {dict(collections.Counter(row["birim"] for row in rows))}')
    print(f'PASS IMAGES 372/372 JPEG 500x500; bottom band y355-499 pure white; birebir {levels["birebir"]}; ayni_tip {levels["ayni_tip"]}')
    print(result.stdout.strip())
    print('AUDIT OK')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--image-map', type=Path, default=Path.home() / 'vk-research/img_map.json')
    parser.add_argument('--audit', action='store_true')
    parser.add_argument('--draw-module', type=Path, default=ROOT.parent / 'ticimax-stok-draw/site/draw/v_kasnak.js')
    parser.add_argument('--node', default='node')
    args = parser.parse_args()
    if args.audit:
        audit(args.draw_module, args.node)
        raise SystemExit
    rows = [json.loads(line) for line in gzip.open(ROOT / 'parca/v_kasnak.jsonl.gz', 'rt')]
    images = json.loads(args.image_map.read_text())
    (ROOT / 'gorseller').mkdir(exist_ok=True)
    products = []
    for row in rows:
        item = product(row, images[row['kod']])
        image_file = Path(images[row['kod']]['file'])
        if not image_file.exists():
            image_file = args.image_map.parent / 'originals' / image_file.name
        composite(image_file, ROOT / item['resim'])
        products.append(item)
    (ROOT / 'urunler.jsonl').write_text(''.join(json.dumps(item, ensure_ascii=False) + '\n' for item in products))
    print(f'Üretildi: {len(products)} ürün, {len(products)} görsel')
