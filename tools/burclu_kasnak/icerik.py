"""Kaynak teknik veri ve görsel eşlemesinden yayın taslakları üretir."""
import json
import os
from html import escape
from pathlib import Path
import unicodedata

from ad import urun_adi

ROOT = Path(os.environ.get('BURCLU_WORK', str(Path.home() / 'work')))
REPO = Path(os.environ.get('BURCLU_REPO', str(Path.home() / 'repos/ticimax-stok')))
FIELDS = ('kod URUNADI MARKA KATEGORI EK_KATEGORILER yeni_kategori ONYAZI ACIKLAMA '
          'ANAHTARKELIME SEO_SAYFABASLIK SEO_SAYFAACIKLAMA SEO_ANAHTARKELIME '
          'resim resim_seviye resim_kaynak teknik_kaynak bayraklar').split()
LINKS = {key: 'https://www.yamansarulman.com/' + path for key, path in (
    ('burc', 'konik-burclar'), ('dar', 'dar-v-kayisi-spz-spa-spb-spc-750'),
    ('kasnak', 'kasnaklar'))}
TYPES = {
    1: 'Dolu gövde, göbek bir yana taşar',
    2: 'Dolu gövde, göbek bir yanda içeride',
    3: 'Dolu gövde, göbek iki yanda içeride',
    4: 'Kollu gövde, göbek iki yana taşar',
    5: 'Kollu gövde, göbek iki yanda içeride',
    6: 'Diskli gövde, göbek iki yanda içeride',
    7: 'Diskli gövde, göbek iki yana taşar',
    8: 'Dolu gövde, göbek bir yanda içeride',
    9: 'Dolu gövde, kanallı kısım ile göbek toplamı kasnak genişliğidir',
}


def number(value):
    return format(value, '.12g').replace('.', ',')


def technical(row):
    tip = row['tip']
    result = [('Profil', row['profil']), ('Kanal Sayısı', str(row['kanal_sayisi']))]
    for label, key in [('Anma Çapı (P)', 'P'), ('Dış Çap (O)', 'O')]:
        if row[key] is not None:
            result.append((label, number(row[key]) + ' mm'))
    if tip is not None:
        result.append(('Gövde Tipi', f'Tip {tip} – {TYPES[tip]}'))
    if row['burc_kodu'] is not None:
        result.append(('Burç No', number(row['burc_kodu'])))
    dimensions = [
        ('Maks. Mil Çapı', 'maks_mil'), ('Kasnak Genişliği (F)', 'F'),
        ('Jant İç Çapı (J)' if tip in (4, 5, 6, 7) else 'Boşluk Çapı (J)', 'J'),
        ('Göbek Uzunluğu (L)', 'L'), ('Göbek Çapı (N)', 'N'), ('Disk Kalınlığı (E)', 'E'),
    ]
    for key in ('K', 'M'):
        action = 'Taşması' if tip in (1, 4, 7) else 'Girintisi'
        dimensions.append((f'Göbek {action} ({key})', key))
    for label, key in dimensions:
        if row[key] is not None:
            result.append((label, number(row[key]) + ' mm'))
    if row.get('malzeme') or row.get('Malzeme'):
        result.append(('Malzeme', row.get('malzeme') or row['Malzeme']))
    return result + [('Satış Birimi', 'Adet')]


def overview(specs):
    labels = [('Profil', 'Profil'), ('Anma Çapı', 'Anma Çapı (P)'),
              ('Dış Çap', 'Dış Çap (O)'), ('Kanal', 'Kanal Sayısı'),
              ('Burç No', 'Burç No'), ('Maks. Mil', 'Maks. Mil Çapı')]
    values = dict(specs)
    cells = ''.join(f'<td><strong>{label}</strong> {escape(values[key])}</td>'
                    for label, key in labels if key in values)
    return '<table><tbody><tr>' + cells + '</tr></tbody></table>'


def description(row, name, specs):
    p, diameter, n = row['profil'], number(row['P']), row['kanal_sayisi']
    ref = ('KYS ' if row['MARKA'] == 'KYS' else '') + f'{p} {diameter}x{n}'
    bush = number(row['burc_kodu']) if row['burc_kodu'] is not None else None
    profile_notes = {
        'SPZ': 'SPZ kesitini kullanan dar V kayışlı aktarmalarda kasnak ve kayış profili birlikte kontrol edilir.',
        'SPA': 'SPA dar V kayışı için seçilen kasnakta profilin yanı sıra kanal adedi ve çap da eşleştirilir.',
        'SPB': 'SPB profilinde mevcut kayışın kesit kodu, kasnak seçiminde ilk kontrol noktasıdır.',
        'SPC': 'SPC dar V kayışlı bir düzende kanal profili tek başına ölçü eşleşmesi anlamına gelmez.',
    }
    cap_notes = (
        'Kısıtlı yerleşim alanında dış çap kadar kasnağın eksenel yer ihtiyacı ve burca erişim mesafesi de önemlidir.'
        if row['P'] < 125 else
        'Mevcut bir kasnağın yerine seçim yapılırken yalnız dış görünüşe bakmak yerine anma çapı ve bağlantı ölçüleri karşılaştırılmalıdır.'
        if row['P'] < 500 else
        'Bu çap aralığında koruyucu muhafazanın boşluğu, montaj yolu ve sökme sırasında gerekli erişim alanı ayrıca gözden geçirilmelidir.'
    )
    channel_notes = (
        'Tek kanallı düzen için karşı kasnağın profilinin ve kayış hattının aynı doğrultuda olması kontrol edilir.'
        if n == 1 else
        'İki kanallı yerleşimde iki kayış hattının da karşı kasnakla hizalanması ve birlikte değerlendirilmesi gerekir.'
        if n == 2 else
        f'{n} kanallı yerleşimde paralel kayışların kanal hizaları birlikte kontrol edilir; yalnız bir kanalı ölçmek yeterli değildir.'
    )
    body = TYPES.get(row['tip'])
    body_note = (f'{ref} için gövde tanımı Tip {row["tip"]}: {body[0].lower() + body[1:]}. '
                 'Göbek konumu, kasnak yüzleriyle mil üzerindeki diğer parçalar arasındaki yerleşim açısından değerlendirilir.'
                 if body else
                 f'{ref} için gövde tipi doğrulanmış değildir. Fotoğraftan gövde tipi veya eksik teknik ölçü çıkarılmamalı; '
                 'yerleşim kararı verilmeden önce bu bilgiler ayrıca doğrulanmalıdır.')
    outside = (f'Dış çapı {number(row["O"])} mm olan {ref} için P anma çapı ile O dış çapı farklı ölçülerdir.'
               if row['O'] is not None else
               f'{ref} için doğrulanan çap bilgisi {diameter} mm anma çapıdır; dış çap bilgisi henüz belirtilmemiştir.')
    bush_note = (f'Uyumlu burç: {bush}. {ref} kasnağında burç modelinin yanı sıra seçilen burcun iç çapı da mil ile eşleştirilmelidir.'
                 if bush else
                 f'{ref} için uyumlu burç kodu henüz doğrulanmamıştır. Burç modeli ve mil ölçüsü kontrol edilmeden bağlantı elemanı seçilmemelidir.')
    shaft = (f'Bu {ref} ölçüsünde belirtilen maksimum mil çapı {number(row["maks_mil"])} mm sınırıdır; '
             'bu değer, her burcun bu iç çapta olduğu anlamına gelmez.' if row['maks_mil'] is not None else
             f'{ref} için maksimum mil çapı kaynak teknik bilgide belirtilmemiştir; bu sınır burç kodundan veya fotoğraftan tahmin edilmez.')
    paragraphs = [
        f'{ref} Burçlu V Kasnak, {diameter} mm anma çapında ve {n} kanallı bir kayış aktarma elemanıdır. '
        f'{profile_notes[p]} Seçimde kasnağın karşı elemanla geometrik uyumu ve mile bağlantısı birlikte ele alınır. '
        'Anma çapı, milin gireceği deliğin çapı değildir.',
        f'{outside} {cap_notes} {body_note}',
    ]
    sections = [
        ('Kullanım Alanları', f'{ref}; fan, pompa, konveyör ve benzeri kayışla hareket iletilen makine düzenlerinde, '
         f'ölçüleri mevcut sisteme uyuyorsa değerlendirilebilir. {channel_notes} '
         'Uygunluk, yalnız makinenin adına göre değil karşı kasnak, kayış kesiti, mil bağlantısı ve montaj alanı birlikte incelenerek belirlenir. '
         f'Diğer ölçüler için {link("kasnak", "kasnaklar")} kategorisi karşılaştırmaya yardımcı olur.'),
        ('Konik Burç ve Montaj', f'{bush_note} Konik burç, sıkma sırasında konik yüzeyler üzerinden kasnak ile mil arasında bağlantı kurar. '
         f'{ref} montajından önce temas yüzeyleri, kama bağlantısı ve hizalama kontrol edilmelidir; sıkma işlemi kullanılan burcun üretici talimatına göre yapılır. '
         f'Burç kendi model ve iç çapıyla tanımlanan ayrı bir bağlantı elemanıdır. {link("burc", "Konik burçlar")} içinden seçim yaparken bu iki bilgi birlikte okunmalıdır.'),
        ('Kayış Seçimi', f'{ref} için {p} dar V kayışı seçilirken profil, kayış uzunluğundan ayrı değerlendirilir. '
         f'{n} kanal bilgisi kayışın uzunluğunu belirlemez; uzunluk seçimi karşı kasnağın çapına ve iki mil arasındaki mesafeye de bağlıdır. '
         'Mevcut bir sistemde kayış üzerindeki kesit ve uzunluk işareti kontrol edilmeli, gerginlik yalnız elle hissedilerek ayarlanmamalıdır. '
         f'{link("dar", "SPZ, SPA, SPB ve SPC dar V kayışları")} arasından doğru kesitle ilerlenebilir.'),
        ('Kısa SSS', f'<strong>Anma çapı mil çapı mıdır?</strong> Hayır; {ref} üzerindeki {diameter} mm değeri kasnağın anma çapını belirtir. '
         f'{shaft} Mil bağlantısı için uyumlu burcun iç çapı esas alınır.'),
        (None, f'<strong>Yalnız fotoğrafa göre seçim yapılır mı?</strong> {ref} için seçimde teknik ölçüler esas alınmalıdır. '
         'Fotoğraf temsilî olabilir; kanal adedi, gövde biçimi ve burç kodu teknik listeyle karşılaştırılmadan montaj uyumu varsayılmamalıdır. '
         'Satış birimi adettir.'),
    ]
    html = '<div class="urunTabAlt"><h2>' + escape(name) + '</h2>'
    html += ''.join('<p>' + escape(p) + '</p>' for p in paragraphs)
    html += '<h3>Teknik Özellikler</h3><ul>'
    html += ''.join(f'<li><strong>{escape(label)}:</strong> {escape(value)}</li>' for label, value in specs)
    html += '</ul>'
    for heading, paragraph in sections:
        if heading:
            html += '<h3>' + heading + '</h3>'
        html += '<p>' + paragraph + '</p>'
    return html + '<div class="teknikDetay"></div></div>'


def link(key, label):
    return f'<a href="{LINKS[key]}">{label}</a>'


def keywords(row):
    p, d, n = row['profil'].lower(), number(row['P']), row['kanal_sayisi']
    variants = [f'{p} {d}x{n}', f'{p}{d}x{n}', f'{p} {d}*{n}', f'{p}-{d}-{n}',
                f'{p}{d}-{n}', f'{p} {d} {n} kanal']
    terms = variants + [f'{d} mm {p} kasnak', f'{n} kanallı {p} kasnak', 'burçlu kasnak',
                       'taper kasnak', 'taper bush kasnak', 'taperlock kasnak',
                       'konik burçlu kasnak', 'v kasnak', 'dar v kasnak', f'{p} kayış kasnağı']
    if row['burc_kodu'] is not None:
        terms.append(number(row['burc_kodu']) + ' burçlu kasnak')
    terms += [unicodedata.normalize('NFKD', t.replace('ı', 'i')).encode('ascii', 'ignore').decode()
              for t in list(terms)]
    if row['MARKA'] == 'KYS':
        terms += ['kys ' + t for t in variants] + ['kys burçlu kasnak', 'kys burclu kasnak']
    return ', '.join(dict.fromkeys(terms))


def build(row, image):
    name, specs = urun_adi(row), technical(row)
    d, p, n = number(row['P']), row['profil'], row['kanal_sayisi']
    bush = number(row['burc_kodu']) + ' Burç ' if row['burc_kodu'] is not None else ''
    title = ('KYS ' if row['MARKA'] == 'KYS' else '') + f'{p} {d}x{n} Burçlu V Kasnak {bush}Ø{d} mm'
    seo = f'{p} {d}x{n} burçlu V kasnak: {d} mm anma çapı, {n} kanal. '
    if row['burc_kodu'] is not None:
        seo += f'Uyumlu burç {number(row["burc_kodu"])}. '
    seo += 'Teknik ölçüleri inceleyin, kayış ve mil uyumunu karşılaştırın.'
    data = dict(kod=row['kod'], URUNADI=name, MARKA=row['MARKA'],
                KATEGORI='KASNAKLAR>BURÇLU V KASNAKLAR', EK_KATEGORILER=[], yeni_kategori=False,
                ONYAZI=overview(specs), ACIKLAMA=description(row, name, specs),
                ANAHTARKELIME=keywords(row), SEO_SAYFABASLIK=title,
                SEO_SAYFAACIKLAMA=seo, SEO_ANAHTARKELIME=keywords(row),
                resim=image['resim_yolu'], resim_seviye=image['resim_seviye'],
                resim_kaynak=image['resim_kaynak'], teknik_kaynak=row['teknik_kaynak'],
                bayraklar=flags(row, image))
    assert list(data) == FIELDS
    return data


def flags(row, image):
    result = list(dict.fromkeys(row['bayraklar'] + image['bayraklar']))
    required = ('profil', 'kanal_sayisi', 'P', 'O', 'F', 'L', 'tip')
    if any(row.get(key) is None for key in required):
        result = list(dict.fromkeys(result + ['eksik', 'cizim_yok']))
    return result


def main():
    valid = set((REPO / 'katurl.txt').read_text().splitlines())
    if not set(LINKS.values()) <= valid:
        raise ValueError('Doğrulanmamış kategori bağlantısı')
    rows = [json.loads(x) for x in (ROOT / 'veri.jsonl').read_text().splitlines()]
    images = [json.loads(x) for x in (ROOT / 'gorsel_map.jsonl').read_text().splitlines()]
    by_code = {x['kod']: x for x in images}
    if len(by_code) != len(images) or set(by_code) != {r['kod'] for r in rows}:
        raise ValueError('Görsel ve teknik veri kodları eşleşmiyor')
    products = [build(r, by_code[r['kod']]) for r in rows]
    (REPO / 'urunler.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in products))
    print(f'ÜRETİLDİ: {len(products)} ürün; alan sırası korundu; 3 iç bağlantı katurl.txt ile doğrulandı')


if __name__ == '__main__':
    main()
