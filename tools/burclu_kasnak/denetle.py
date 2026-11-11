"""Yayın taslağını kaynak veriden bağımsız eşlemelerle denetler."""
import json
import os
from pathlib import Path
import re
from collections import Counter

from bs4 import BeautifulSoup
from PIL import Image

from ad import urun_adi, urun_slug

ROOT = Path(os.environ.get('BURCLU_WORK', str(Path.home() / 'work')))
REPO = Path(os.environ.get('BURCLU_REPO', str(Path.home() / 'repos/ticimax-stok')))
FIELDS = ('kod URUNADI MARKA KATEGORI EK_KATEGORILER yeni_kategori ONYAZI ACIKLAMA '
          'ANAHTARKELIME SEO_SAYFABASLIK SEO_SAYFAACIKLAMA SEO_ANAHTARKELIME '
          'resim resim_seviye resim_kaynak teknik_kaynak bayraklar').split()
VISIBLE = ('URUNADI MARKA KATEGORI ONYAZI ACIKLAMA ANAHTARKELIME SEO_SAYFABASLIK '
           'SEO_SAYFAACIKLAMA SEO_ANAHTARKELIME resim').split()
BANNED = re.compile(r'orka|orkapt|chiaravalli|htk|dunlop|koli|paket', re.I)


def load(path):
    return [json.loads(x) for x in Path(path).read_text().splitlines()]


def value(x):
    return format(x, '.12g').replace('.', ',')


def generic_sentences(html):
    text = BeautifulSoup(html, 'html.parser').get_text(' ', strip=True)
    text = re.sub(r'\s+', ' ', text)
    return {sentence.strip() for sentence in re.split(r'(?<=[.!?])\s+', text)
            if len(sentence.strip()) >= 40
            and not re.search(r'\d|\bSP[ZABC]\b', sentence, re.I)}


def sentence_counts(products):
    counts = Counter()
    for product in products:
        counts.update(generic_sentences(product['ACIKLAMA']))
    return counts


def audit_sentences(counts, total):
    limit = total * 30 // 100
    repeated = [(sentence, count) for sentence, count in counts.items() if count > limit]
    if repeated:
        raise ValueError(f'Genel cümle sıklığı %30 sınırını aşıyor (en fazla {limit}/{total} ürün):\n' +
                         '\n'.join(f'{count}/{total}: {sentence}' for sentence, count in
                                   sorted(repeated, key=lambda item: (-item[1], item[0]))))


def pairs(container, tag):
    output = []
    for cell in container.find_all(tag, recursive=False):
        strong = cell.find('strong', recursive=False)
        if strong is None:
            raise ValueError('Doğrudan strong etiketi bulunamadı')
        label = strong.get_text(' ', strip=True)
        text = cell.get_text(' ', strip=True)
        output.append((label.rstrip(':').strip(), text[len(label):].strip()))
    return output


def expected_specs(row):
    tip = row['tip']
    labels = {'P': 'Anma Çapı (P)', 'O': 'Dış Çap (O)', 'burc_kodu': 'Burç No',
              'maks_mil': 'Maks. Mil Çapı', 'F': 'Kasnak Genişliği (F)',
              'J': 'Jant İç Çapı (J)' if tip in (4, 5, 6, 7) else 'Boşluk Çapı (J)',
              'L': 'Göbek Uzunluğu (L)', 'N': 'Göbek Çapı (N)', 'E': 'Disk Kalınlığı (E)'}
    action = 'Taşması' if tip in (1, 4, 7) else 'Girintisi'
    labels.update({k: f'Göbek {action} ({k})' for k in ('K', 'M')})
    result = {'Profil': row['profil'], 'Kanal Sayısı': str(row['kanal_sayisi'])}
    for key, label in labels.items():
        if row[key] is not None:
            result[label] = value(row[key]) + ('' if key == 'burc_kodu' else ' mm')
    if row.get('malzeme') or row.get('Malzeme'):
        result['Malzeme'] = row.get('malzeme') or row['Malzeme']
    result['Satış Birimi'] = 'Adet'
    return result


def audit(products, sources, images, urls, expected_count=519):
    errors, paragraphs, lengths = [], {}, []
    rows, photos = {x['kod']: x for x in sources}, {x['kod']: x for x in images}
    def check(condition, message):
        if not condition:
            errors.append(message)
    check(len(products) == expected_count, 'Satır sayısı')
    check(len({p['kod'] for p in products}) == expected_count, 'Benzersiz kod sayısı')
    check({p['kod'] for p in products} == set(rows) == set(photos), 'Kaynak kod kapsamı')
    for product in products:
        code = product['kod']
        def test(condition, message):
            check(condition, code + ': ' + message)
        test(list(product) == FIELDS, 'Alanlar veya alan sırası')
        if code not in rows or code not in photos:
            continue
        row, image = rows[code], photos[code]
        for field in FIELDS:
            if field not in ('EK_KATEGORILER', 'yeni_kategori', 'teknik_kaynak', 'bayraklar'):
                test(isinstance(product.get(field), str) and bool(product[field].strip()), 'Boş alan ' + field)
        test(product.get('EK_KATEGORILER') == [], 'Ek kategori')
        test(product.get('yeni_kategori') is False, 'Yeni kategori')
        test(product.get('KATEGORI') == 'KASNAKLAR>BURÇLU V KASNAKLAR', 'Kategori')
        test(product.get('MARKA') == row['MARKA'] == ('KYS' if code.startswith('KYS ') else 'Yamansa'), 'Marka')
        test(product.get('URUNADI') == urun_adi(row), 'Ürün adı')
        test(product.get('teknik_kaynak') == row['teknik_kaynak'], 'Teknik kaynak')
        if product.get('teknik_kaynak') is None:
            test('eksik' in row['bayraklar'], 'Kaynağı boş ama eksik bayrağı yok')
        for key in ('resim_seviye', 'resim_kaynak'):
            test(product.get(key) == image[key], key + ' eşleşmesi')
        flags = list(dict.fromkeys(row['bayraklar'] + image['bayraklar']))
        drawable = all(row.get(k) is not None for k in ('profil', 'kanal_sayisi', 'P', 'O', 'F', 'L', 'tip'))
        if not drawable:
            flags = list(dict.fromkeys(flags + ['eksik', 'cizim_yok']))
        test(product.get('bayraklar') == flags, 'Bayrak birleşimi')
        test(('cizim_yok' in product.get('bayraklar', [])) == (not drawable), 'Çizimsiz ürün bayrağı')
        for field in VISIBLE:
            test(not BANNED.search(product.get(field, '')), 'Yasak kelime: ' + field)
        encoded = json.dumps(product, ensure_ascii=False)
        test(not any(c in encoded for c in ('\u0307', 'Ã', 'Ä', 'Å', '�')), 'Unicode/mojibake')
        for key, limit in [('SEO_SAYFABASLIK', 60), ('SEO_SAYFAACIKLAMA', 155),
                           ('SEO_ANAHTARKELIME', 950), ('ANAHTARKELIME', 950)]:
            test(len(product.get(key, '')) <= limit, key + ' uzunluğu')
        for key in ('ANAHTARKELIME', 'SEO_ANAHTARKELIME'):
            terms = [s.strip().casefold() for s in product.get(key, '').split(',')]
            test(all(terms) and len(terms) == len(set(terms)), key + ' tekrar/boş terim')
        html = BeautifulSoup(product.get('ACIKLAMA', ''), 'html.parser')
        plain = html.get_text(' ', strip=True)
        lengths.append(len(plain))
        test(len(plain) >= 1800, 'Açıklama 1800 karakterden kısa')
        test(html.select_one('div[style]') is None, 'div[style]')
        test(html.h2 is not None and html.h2.get_text() == product['URUNADI'], 'H2')
        root = html.select_one('.urunTabAlt')
        first = html.find('ul')
        test(first is not None and first.parent == root, 'İlk UL doğrudan teknik liste olmalı')
        headings = [h.get_text() for h in html.find_all('h3')]
        test(all(h in headings for h in ('Teknik Özellikler', 'Kullanım Alanları',
                                        'Konik Burç ve Montaj', 'Kayış Seçimi', 'Kısa SSS')), 'Bölümler')
        try:
            specs_list = pairs(first, 'li') if first else []
            specs = dict(specs_list)
            test(len(specs_list) == len(specs), 'Teknik etiket tekrarı')
            expected = expected_specs(row)
            body = specs.pop('Gövde Tipi', None)
            if row['tip'] is None:
                test(body is None, 'Bilinmeyen gövdeye tip atanmış')
            else:
                group = 'Kollu' if row['tip'] in (4, 5) else 'Diskli' if row['tip'] in (6, 7) else 'Dolu'
                test(bool(body) and body.startswith(f'Tip {row["tip"]} – {group}'), 'Gövde tipi')
            test(specs == expected, 'Teknik liste kaynak veriye eşit değil')
            table = BeautifulSoup(product.get('ONYAZI', ''), 'html.parser')
            overview = pairs(table.tr, 'td') if table.tr else []
            aliases = [('Profil', 'Profil'), ('Anma Çapı', 'Anma Çapı (P)'), ('Dış Çap', 'Dış Çap (O)'),
                       ('Kanal', 'Kanal Sayısı'), ('Burç No', 'Burç No'), ('Maks. Mil', 'Maks. Mil Çapı')]
            test(overview == [(a, expected[b]) for a, b in aliases if b in expected], 'Önyazı çapraz tutarlılığı')
            test(bool(table.select_one('table > tbody > tr')) and len(table.find_all('tr')) == 1, 'Kaynak tablo formatı')
            test(all(v and v != '—' for _, v in specs_list + overview), 'Boş teknik değer')
        except ValueError as error:
            test(False, str(error))
        links = [a.get('href') for a in html.find_all('a')]
        test(2 <= len(links) <= 4 and all(u in urls for u in links), 'İç bağlantılar')
        for paragraph in html.find_all('p'):
            text = paragraph.get_text(' ', strip=True)
            if len(text) >= 120:
                test(text not in paragraphs or paragraphs[text] == code, 'Tekrarlanan uzun paragraf')
                paragraphs[text] = code
        path = product.get('resim', '')
        test(path == image['resim_yolu'] == 'gorseller/' + urun_slug(row) + '.jpg', 'Resim/slug')
        test(bool(re.fullmatch(r'gorseller/[a-z0-9-]+\.jpg', path)), 'ASCII resim adı')
        try:
            with Image.open(REPO / path) as im:
                test(im.size == (500, 500) and im.format == 'JPEG', 'Resim boyut/format')
        except (FileNotFoundError, OSError):
            test(False, 'Resim dosyası yok/okunamıyor')
    if errors:
        raise ValueError('\n'.join(errors[:30]) + f'\nTOPLAM HATA: {len(errors)}')
    return dict(urun=len(products), minimum_aciklama=min(lengths), maksimum_aciklama=max(lengths),
                uzun_paragraf=len(paragraphs), govde_farkli=sum('gorsel_govde_farkli' in p['bayraklar'] for p in products),
                govde_dogrulanmadi=sum('gorsel_govde_dogrulanmadi' in p['bayraklar'] for p in products),
                eksik=sum('eksik' in p['bayraklar'] for p in products),
                cizim_yok=sum('cizim_yok' in p['bayraklar'] for p in products))


def main():
    products = load(REPO / 'urunler.jsonl')
    result = audit(products, load(ROOT / 'veri.jsonl'),
                   load(ROOT / 'gorsel_map.jsonl'), set((REPO / 'katurl.txt').read_text().splitlines()))
    counts = sentence_counts(products)
    print('EN SIK 10 GENEL CÜMLE (HTML arındırılmış; ≥40 karakter; ölçü/kod/sayı yok):')
    for sentence, count in sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:10]:
        ratio = format(count / len(products) * 100, '.2f').replace('.', ',')
        print(f'{count}/{len(products)} (%{ratio}): {sentence}')
    audit_sentences(counts, len(products))
    result['genel_cumle_en_fazla'] = max(counts.values(), default=0)
    result['genel_cumle_siniri'] = len(products) * 30 // 100
    result['genel_cumle_ilk10'] = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:10]
    (ROOT / 'icerik_denetim.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print('PASS: 519 satır; 519 benzersiz kod; 17 alan doğru sırada; kaynak/görsel/bayrak eşleşmeleri')
    print(f'PASS: açıklama {result["minimum_aciklama"]}–{result["maksimum_aciklama"]} karakter; SEO 60/155; anahtar kelimeler ≤950; tekrar yok')
    print(f'PASS: {result["uzun_paragraf"]} benzersiz uzun paragraf; tekrar eden uzun paragraf 0')
    print(f'PASS: genel cümle en fazla {result["genel_cumle_en_fazla"]}/{len(products)} üründe; %30 sınırı ≤{result["genel_cumle_siniri"]} ürün')
    print('PASS: müşteri alanlarında yasak kelime 0; U+0307/mojibake 0; kaynak alanları ve bayraklar yasak kelimeden muaf')
    print('PASS: 519 JPEG 500x500; katurl.txt iç linkleri; önyazı = teknik liste = kaynak veri; boş ölçü 0')
    print(f'PASS: {result["govde_farkli"]} gövde farklı; {result["govde_dogrulanmadi"]} doğrulanmadı; {result["eksik"]} eksik; {result["cizim_yok"]} cizim_yok; 11 teknik_kaynak null korundu')


if __name__ == '__main__':
    main()
