import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sources = {}


def add(key, file, url, page, note, crop=None, remove_background=False, rotation=0):
    sources[key] = {'file': 'work/gorsel_kaynak/' + file, 'url': url, 'page': page,
                    'note': note, 'crop': crop, 'remove_background': remove_background}
    if rotation:
        sources[key]['rotation'] = rotation


def og(key, lookup, file, note, **kwargs):
    record = json.loads((ROOT / 'gorsel_kaynak' / (lookup + '-images.json')).read_text())
    url = next(i['url'] for i in record['images'] if i['alt'] == 'og:image').replace('http:', 'https:')
    add(key, file, url, record['page'], note, **kwargs)


def usa(key, lookup, index, note, **kwargs):
    record = json.loads((ROOT / 'gorsel_kaynak' / ('usa-select-' + lookup + '.json')).read_text())
    product = record['resources']['results']['products'][index]
    add(key, 'usa-select-' + lookup + '-' + str(index) + '.jpg', product['image'],
        'https://usarollerchain.com' + product['url'].split('?')[0], note, **kwargs)


def candidate(key, lookup, index, note, **kwargs):
    records = json.loads((ROOT / 'gorsel_adaylar.json').read_text())
    record = records[lookup]['candidates'][index]
    add(key, Path(record['local']).name, record['image'], record['page'], note, **kwargs)


def main():
    add('chain1', '06b.jpg', 'https://orkapt.com/wp-content/uploads/2020/03/06B-ZİNCİR.jpg',
        'https://orkapt.com/service/standart-zincirler/', 'Tek sıralı, dolu pimli makaralı zincir; seri fotoğrafı.')
    add('chain2', '08b.jpg', 'https://orkapt.com/wp-content/uploads/2020/03/08B-ZİNCİR-.jpg',
        'https://orkapt.com/service/standart-zincirler/', 'İki sıralı, dolu pimli makaralı zincir; seri fotoğrafı.')
    candidate('chain3', 'chain3', 1, 'Üç sıralı makaralı zincir seri fotoğrafı; yatay çevrildi ve ürün sınırına sıkı kırpıldı.', rotation=-55)
    og('chain4', 'usa-quad', 'quad.jpg', 'Dört sıralı gerçek makaralı zincir fotoğrafı; ortak pimli dört sıra.')
    candidate('sschain1', 'sschain1', 8, 'Parlak paslanmaz tek sıralı makaralı zincir; baskısız plaka yüzü.')
    candidate('sschain2', 'sschain2', 6, 'Parlak paslanmaz çift sıralı makaralı zincir; iki sıra görünür.')
    usa('hpchain', 'hpchain', 0, 'Tek sıralı pim delikli zincir; pimlerdeki delikler açıkça görünür.')
    usa('sshpchain', 'sshpchain', 0, 'Paslanmaz pim delikli zincir; parlak yüzey ve açık pim delikleri.')
    usa('double', 'doublelarge', 1, 'Çift hatveli, düz uzun plakalı ve büyük makaralı konveyör zinciri.')
    usa('hpdouble', 'hpdoublelarge', 0, 'Çift hatveli pim delikli zincir; uzun düz plaka ve büyük makara.')
    add('offset1', 'kilit.jpg', 'https://orkapt.com/wp-content/uploads/2020/04/zincir-kilitleri.jpg',
        'https://orkapt.com/service/zincir-kilitleri/', 'Yalnız sağdaki tek sıralı kranked yarım kilit kırpıldı.', crop=[455, 320, 745, 625])
    og('offset2', 'usa-offset2ok', 'usa-offset2ok.jpg', 'Çift sıralı yarım kilit; kranked plaka, iki makara ve pim ucu.')
    og('offset3', 'usa-offset3ok', 'usa-offset3ok.jpg', 'Üç sıralı yarım kilit; kranked plakalar ve üç makara.')
    usa('ssoffset1', 'ssoffset1', 0, 'Paslanmaz tek sıralı yarım kilit; kranked plaka ve makara.')
    usa('ssoffset2', 'ssoffset2', 0, 'Paslanmaz çift sıralı yarım kilit; kranked plakalar ve iki makara.')
    add('clip1', 'kilit.jpg', 'https://orkapt.com/wp-content/uploads/2020/04/zincir-kilitleri.jpg',
        'https://orkapt.com/service/zincir-kilitleri/', 'Yalnız soldaki tek sıralı, yaylı klipsli tam kilit kırpıldı.', crop=[150, 325, 450, 625])
    og('clip2', 'usa-clip2ok', 'usa-clip2ok.jpg', 'Çift sıralı tam kilit; üç plaka, iki uzun pim ve yaylı klips.')
    og('clip3', 'usa-clip3ok', 'usa-clip3ok.jpg', 'Üç sıralı tam kilit; dört plaka, iki uzun pim ve yaylı klips.')
    usa('ssclip1', 'ssclip1', 0, 'Paslanmaz tek sıralı tam kilit; iki pim, dış plaka ve yaylı klips.')
    usa('ssclip2', 'ssclip2', 0, 'Paslanmaz çift sıralı tam kilit; üç plaka, iki pim ve yaylı klips.')
    usa('hpclip', 'hpclipcarbon', 0, 'Pim delikli tek sıralı tam kilit; iki boş pim ve segmanlar.', remove_background=True)
    usa('sshpclip', 'sshpchain', 1, 'Paslanmaz pim delikli tam kilit; iki boş pim ve segmanlar.', remove_background=True)
    candidate('415hclip', '415h', 9, '415H tipi ince motosiklet/moped zincir kilidi; yaylı klipsli, kod baskısız.')
    add('sprocket2', 'sprocket20.jpg', 'https://orkapt.com/wp-content/uploads/2020/03/20B-ZİNCİR-DİŞLİLER.jpg',
        'https://orkapt.com/service/zincir-disliler/',
        'Çift sıralı, göbekli ve düz pilot delikli dişli seri fotoğrafı; 9 dişli birebir ürün fotoğrafı değildir.')
    (ROOT / 'gorsel_kaynaklar.json').write_text(json.dumps(sources, ensure_ascii=False, indent=2) + '\n')
    print('Selected source variants:', len(sources))


if __name__ == '__main__':
    main()
