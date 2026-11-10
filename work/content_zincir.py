import hashlib
import html
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROWS = json.loads((ROOT / 'work/urunler_parsed.json').read_text())
TECH = json.loads((ROOT / 'work/teknik.json').read_text())
IMAGES = json.loads((ROOT / 'work/gorsel.json').read_text())
EXISTING = json.loads((ROOT / 'work/existing_zincir_sayfalar.json').read_text())
EXISTING_CODES = {s['v'] for page in EXISTING for s in page['onyazi'] if s['l'] == 'DIN ISO Kodu'}
BASE = 'ZİNCİR - ZİNCİR DİŞLİSİ>'
CHAIN = BASE + 'ZİNCİRLER'
LINK = BASE + 'ZİNCİR KİLİTLERİ VE BAKLALARI'
DRAW_LABELS = [('p', 'Adım (p)'), ('b1', 'İç Genişlik (b1)'), ('d3', 'Makara Çapı (d3)'), ('d1', 'Pim Çapı (d1)'), ('h', 'Plaka Yüksekliği (h)'), ('pt', 'Sıralar Arası Mesafe (pt)'), ('pim_delik_capi', 'Pim Delik Çapı')]
VARIANTS = {row['kod']: i for i, row in enumerate(sorted(ROWS, key=lambda r: hashlib.sha256(r['kod'].encode()).hexdigest()))}


def decimal(value):
    return format(value, 'g').replace('.', ',')


def sales_specs(row, flags):
    unit = (row.get('birim') or '').strip().upper()
    result = []
    if not unit:
        flags.append('birim_yok')
    elif unit in {'METRE', 'ADET', 'PAKET'}:
        result.append(('Satış Birimi', 'Metre' if unit == 'METRE' else 'Adet'))
    else:
        raise ValueError('Tanımsız satış birimi: ' + unit)
    if row.get('paket_adet'):
        result.append(('Ambalaj', format(row['paket_adet'], ',').replace(',', '.') + ' adet/paket'))
    return result


def clip(text, limit):
    return text if len(text) <= limit else text[:limit+1].rsplit(' ', 1)[0].rstrip(' ,;')


def brand_name(row):
    return {'İWİS': 'iwis', 'SEDİS': 'Sedis', 'AYZİN': 'Ayzin', 'CSE (CZECH)': 'CSE'}.get(row['gosterilecek_marka'], row['gosterilecek_marka'])


def technical(row, flags):
    tech = TECH[row['teknik_anahtar']]
    values = dict(tech['olculer'])
    profile = tech.get('marka_verileri', {}).get(row['kod'], {})
    brand = brand_name(row)
    source = values['p'].get('teknik_kaynak', values['p']['kaynak']) if values.get('p') else ''
    if brand in {'iwis', 'Sedis'} and profile.get('olculer'):
        own = profile['olculer']
        for key in ['p', 'b1', 'd1', 'd3', 'h', 'pt']:
            if own.get(key):
                values[key] = own[key]
        source = brand + ' resmi zincir kataloğu (' + own['p']['kaynak'] + ')'
        if brand == 'iwis':
            for key in ['F1', 'agirlik_kg_m', 'kopma_min_kn']:
                if own.get(key):
                    values[key] = own[key]
        else:
            flags.append('seri_belirsiz')
    elif brand != 'Yamansa':
        flags.append('marka_kaynagi_yok')
    required = ['p', 'b1', 'd1', 'd3', 'h'] + (['pt'] if row['sira'] > 1 else [])
    if row['tip'] == 'disli' or any(not values.get(k) for k in required):
        flags.append('eksik')
    specs = [(label, decimal(values[key]['deger']) + ' mm') for key, label in DRAW_LABELS if values.get(key) and (key != 'pt' or row['sira'] > 1)]
    specs.extend([('Sıra Sayısı', str(row['sira'])), ('DIN ISO Kodu', row['iso_kod']), ('Marka', brand)])
    if row['hatve_inc']:
        specs.append(('İnç Kodu', row['hatve_inc'] + '"'))
    if row['aile'] == 'bs':
        specs.append(('Standart', 'ISO 606 / DIN 8187'))
    elif row['iso_kod'] == '12A-1':
        specs.append(('Standart', 'ISO 606 / ANSI 60'))
    if row['tip'] == 'zincir' and not row['paslanmaz'] and not row['pim_delikli'] and values.get('kopma_min_kn'):
        specs.append(('Minimum Kopma Yükü', decimal(values['kopma_min_kn']['deger']) + ' kN'))
    if brand == 'iwis':
        for key, label, unit in [('F1', 'Pim Uzunluğu', 'mm'), ('agirlik_kg_m', 'Birim Uzunluk Ağırlığı', 'kg/m')]:
            if values.get(key):
                specs.append((label, decimal(values[key]['deger']) + ' ' + unit))
    if row['tip'] == 'disli':
        specs.extend([('Diş Sayısı', '9'), ('Zincir Ölçüsü', '1*2'), ('Ürün Tipi', 'ÇİFT SIRA')])
    specs.extend(sales_specs(row, flags))
    return values, specs, source


def keywords(row, brand, ref, pitch):
    code = row['iso_kod']
    forms = [code, code.replace('-', ''), code.replace('-', ' '), re.sub(r'(?<=\d)(?=[AB])', ' ', code.replace('-', ' '))]
    if code == '12A-1':
        forms += ['ASA 60', 'ANSI 60', '60-1', '12A-1', '3/4" zincir']
    terms = forms + [c + ' zincir' for c in forms] + [ref]
    kind = {'zincir': 'zincir', 'bakla': 'yarım kilit', 'kilit': 'tam kilit', 'disli': 'zincir dişlisi'}[row['tip']]
    strand = {1: 'tek sıra', 2: 'çift sıra', 3: 'üç sıra', 4: 'dört sıra'}[row['sira']]
    if row['hatve_inc']:
        terms += [row['hatve_inc'] + '" ' + kind, row['hatve_inc'] + ' ' + strand + ' ' + kind]
    terms += [pitch + ' mm ' + kind, pitch.replace(',', '.') + ' mm ' + kind, pitch + 'mm ' + kind, pitch.replace(',', '.') + 'mm ' + kind]
    terms += {1: ['simplex zincir'], 2: ['duplex zincir', 'iki sıra zincir'], 3: ['triplex zincir', 'üç sıralı zincir'], 4: ['quadruplex zincir', 'dört sıralı zincir']}[row['sira']]
    terms += {'zincir': ['makaralı zincir', 'transmisyon zinciri', 'roller chain'], 'bakla': ['zincir baklası', 'yarım bakla', 'offset link'], 'kilit': ['zincir kilidi', 'tam kilit', 'connecting link', 'master link'], 'disli': ['9 diş zincir dişlisi', '16B-2 dişli', 'duplex sprocket']}[row['tip']]
    if row['paslanmaz']:
        terms += ['paslanmaz ' + kind, 'stainless steel ' + kind, 'SS ' + code]
    if row['pim_delikli']:
        terms += ['HP' + code, 'pim delikli ' + kind, 'içi boş pimli ' + kind, 'hollow pin chain']
    if 'cift_hatve' in row['aile']:
        terms += ['çift hatveli zincir', 'uzun adımlı zincir', 'double pitch chain']
    if code == '415H':
        terms += ['415 H kilit', '415H zincir kilidi', 'moped zincir kilidi', 'motosiklet zincir kilidi']
    if row['aile'] == 'bs':
        terms += ['DIN 8187', 'ISO 606']
    if brand != 'Yamansa':
        terms += [brand + ' ' + code]
    terms += [unicodedata.normalize('NFKD', t.replace('ı', 'i').replace('İ', 'I')).encode('ascii', 'ignore').decode() for t in terms]
    result = []
    for term in terms:
        if term not in result and len(', '.join(result + [term])) <= 950:
            result.append(term)
    return ', '.join(result)


def paragraphs(row, title, values, variant):
    def pick(options, slot):
        return options[(variant // (4 ** slot)) % 4]

    def mm(key):
        return decimal(values[key]['deger']) if values.get(key) else None

    p, b, d, pin, h, pt = [mm(k) for k in ['p', 'b1', 'd3', 'd1', 'h', 'pt']]
    span = decimal(values['p']['deger'] * 10)
    n = row['sira']
    count = {1: 'bir', 2: 'iki', 3: 'üç', 4: 'dört'}[n]
    strand = {1: 'tek', 2: 'çift', 3: 'üç', 4: 'dört'}[n]
    count_title = count[0].replace('i', 'İ').upper() + count[1:]
    code = row['iso_kod']
    hp = row['pim_delikli']
    double = 'cift_hatve' in row['aile']
    ss = row['paslanmaz']
    kind = row['tip']
    material = 'paslanmaz çelik' if ss else 'çelik'
    if kind == 'bakla':
        role = ['zincir boyunu bir adım değiştiren yarım bakladır', 'tek adımlık boy ayarı için kullanılan kıvrımlı bakladır', 'iç ve dış bağlantı arasında geçiş sağlayan yarım kilittir', 'zincire bir adımlık uzunluk kazandıran offset bakladır']
    elif kind == 'kilit':
        role = ['zincirin iki ucunu birleştiren tam kilittir', 'açık zincir uçlarını kapatan bağlantı kilididir', 'iki zincir ucunu pimli bağlantıyla birleştiren parçadır', 'uç bağlantısını tamamlamak için kullanılan tam kilittir']
    elif kind == 'disli':
        role = ['iki diş sırası bulunan 9 dişli zincir dişlisidir', 'çift sıralı zincir için 9 dişli aktarım parçasıdır', 'iki sıralı zinciri kavrayan 9 dişli dişlidir', '9 dişiyle çift sıralı zincire hareket veren dişlidir']
    elif hp:
        role = ['taşıyıcı bağlantıları için içi boş pimleri bulunan zincirdir', 'pim deliklerinden ek parça geçirilebilen makaralı zincirdir', 'çubuk ve taşıyıcı bağlantısına uygun delikli pim yapısındadır', 'pimlerinin içinden bağlantı çubuğu geçirilebilen zincirdir']
    elif double:
        role = ['uzun plakalı, çift hatveli bir taşıma zinciridir', 'konveyör düzenlerinde kullanılan uzun adımlı zincirdir', 'uzun düz plakalarıyla ayrılan çift hatveli zincirdir', 'yavaş çalışan taşıma düzenleri için çift hatveli zincirdir']
    else:
        role = [f'{strand} sıralı makaralı transmisyon zinciridir', f'hareketi {count} makara sırasıyla aktaran zincirdir', f'{count} sıra makaradan oluşan tahrik zinciridir', f'{strand} sıralı dişliyle çalışan makaralı zincirdir']
    intro = title + ', ' + pick(role, 0) + '. '
    intro += pick([f'Pim merkezleri arasındaki nominal mesafe {p} mm’dir.', f'Bir adımın uzunluğu, iki komşu pim merkezi arasında {p} mm’dir.', f'Adım ölçüsü {p} mm olup komşu pimlerin merkezinden alınır.', f'Yan yana iki pim merkezi {p} mm aralıklıdır.'], 1) + ' '
    if kind == 'disli':
        intro = title + ', ' + pick(role, 0) + '. ' + pick([f'Eşleştiği zincirin pim adımı {p} mm’dir.', f'Bu dişliye takılan zincirde pim merkezleri {p} mm aralıklıdır.', f'Dişlinin çalışacağı zincirin nominal adımı {p} mm’dir.', f'Karşılık gelen zincir ölçüsünde bir adım {p} mm’dir.'], 1) + ' '
    if n > 1:
        arrangement = [f'Yan yana {count} makara sırası ortak pimlerle birbirine bağlanır.', f'{count_title} makara sırası yan yana ilerler ve aynı pimleri paylaşır.', f'Ortak pimler {count} sırayı birlikte taşır; sıralar yan yana hareket eder.', f'{count_title} sıradaki makaralar aynı pimler üzerinden birlikte ilerler.']
    else:
        arrangement = ['Tek makara sırasında iç ve dış baklalar dönüşümlü olarak birbirine bağlanır.', 'İç ve dış baklalar dönüşümlü dizilir; makaralar tek sıra halinde ilerler.', 'Tek sıralı zincirde iç baklayı dış bakla izler; pimler bu bağlantıyı taşır.', 'Bir sıra halinde ilerleyen makaralar, dönüşümlü iç ve dış baklalarla bağlanır.']
    if kind == 'disli':
        arrangement = ['İki diş sırası, çift sıralı zincirin iki makara yoluna karşılık gelir.', 'Yan yana iki diş sırası aynı gövdede zinciri kavrar.', 'Çift sıralı zincir, gövde üzerindeki iki diş sırasına birlikte oturur.', 'Dişli üzerinde iki paralel diş sırası bulunur; her biri bir makara yolunu karşılar.']
    intro += pick(arrangement, 2) + ' '
    if kind == 'bakla':
        detail = [f'Kıvrımlı {material} plakalar bir uçtaki iç bağlantıyı diğer uçtaki dış bağlantıya taşır.', f'{material.capitalize()} plaka çifti, makara-burç ucuyla pim ucunu birbirine bağlar.', f'Bir uçta makara ve burç, diğer uçta pim bağlantısı bulunur; plakalar {material} yapıdadır.', f'Bu {material} parçada iç ve dış bağlantı uçları aynı baklada birleşir.']
    elif hp:
        detail = [f'{material.capitalize()} yapıdaki delikli pimler ek parçaların geçiş yoludur.', f'Pimler {material} yapıdadır; ortalarındaki delik bağlantı çubuğuna yer açar.', f'Ek taşıyıcılar {material} pimlerin içinden geçen çubuklarla bağlanır.', f'Dolu pim yerine içi boş {material} pim kullanılır; geçiş deliği ek bağlantı içindir.']
    elif double:
        detail = [f'Uzun {material} plakalar ardışık makaraların arasını açar.', f'{material.capitalize()} yan plakalar, çift hatveli uzun bağlantı düzenini oluşturur.', f'Birbirini izleyen makaralar uzun {material} plakalarla bağlanır.', f'Plakalar {material} yapıdadır ve uzun adımlı taşıma düzenine sahiptir.']
    else:
        detail = [f'Pim ve plakalar {material} yapıdadır; pim-burç bağlantısı hareket sırasında mafsallanır.', f'{material.capitalize()} bağlantıların pim-burç bölgesi, dişli etrafında dönmeye izin verir.', f'Hareketli bağlantılar {material} pim ve plakalardan oluşur; mafsal pim-burç bölgesindedir.', f'Bu {material} yapıda pim-burç bağlantısı, zincirin dişli çevresinde bükülmesini sağlar.']
    if kind == 'disli':
        detail = ['Diş sayısı 9’dur; mil deliği ve kama kanalı ölçüsü ayrıca belirlenir.', 'İki diş sırası aynı gövde üzerindedir; bitmiş mil deliği ölçüsü verilmemiştir.', 'Dokuz diş aynı gövdede iki sıra halinde çalışır; göbek ölçüleri listelenmemiştir.', 'Mil bağlantısı için delik çapı, göbek boyu ve kama kanalı ölçülür; burada bu ölçüler yoktur.']
    intro += pick(detail, 3)
    brand = brand_name(row)
    profile = TECH[row['teknik_anahtar']].get('marka_verileri', {}).get(row['kod'], {})
    if brand == 'iwis' and profile.get('olculer'):
        intro += f' iwis’in ECOPLUS serisindeki bu zincirin pim uzunluğu {mm("F1")} mm, metre ağırlığı {mm("agirlik_kg_m")} kg’dır.'
    elif brand == 'Sedis' and profile.get('olculer'):
        intro += f' Sedis’in bu zincirinde iç genişlik {b} mm, makara çapı {d} mm’dir.'

    if row['aile'] == 'bs':
        meaning = [f'B serisi ölçüler ISO 606 / DIN 8187 kapsamındadır; -{n} eki {n} sırayı gösterir.', f'Kodun sonundaki -{n}, {count} makara sırasını belirtir; ölçü ailesi ISO 606 / DIN 8187 B serisidir.', f'Ölçü kodundaki B harfi seriyi, -{n} eki ise {strand} sıralı yapıyı anlatır.', f'ISO 606 / DIN 8187 B serisinde sıra eki bu ürün için -{n}’dir; bu ek {count} sırayı tanımlar.']
    elif code == '12A-1':
        meaning = ['ASA 60 ile ANSI 60 aynı ölçü ailesini anlatır; -1 eki tek sırayı belirtir.', 'Bu ürün ANSI ölçü ailesindedir; ASA 60 yazımı da kullanılır ve son ek tek sırayı gösterir.', 'ASA ve ANSI adlandırması bu ölçüde aynıdır; 60 serisi tek makara sırasıyla çalışır.', 'ANSI 60 ölçüsü tek sıralıdır; ASA adı da aynı zincir serisi için kullanılır.']
    elif double:
        meaning = ['Çift hatveli yapıda uzun plaka kullanılır; makara tipi kodun son rakamlarıyla birlikte seçilir.', 'Bu seri uzun adımlıdır; A/C harfiyle birlikte son rakamlar da makara tipini ayırt eder.', 'Uzun plaka ve makara düzeni birlikte eşleşir; çift hatve için tam seri korunur.', 'Çift hatve yalnız daha uzun bir zincir anlamına gelmez; plaka ve makara düzeni de farklıdır.']
    elif code == '415H':
        meaning = ['Bu kilit ince moped ve motosiklet zincirlerine ait bağlantı tipidir.', 'Bu kilit moped zinciri ailesindedir; adımı 12,7 mm’dir.', 'Moped tipi bu bağlantıda pim aralığı 12,7 mm’dir.', 'Bu ince zincir tipi için verilen adım 12,7 mm’dir; kilit de aynı aileden seçilir.']
    else:
        meaning = ['Bu dişli iki sıra zincir için 1 inç, yani 25,4 mm adımla çalışır.', 'Zincir ölçüsü 1 inç çift sıradır; pim adımı 25,4 mm’dir.', 'İki diş sırasına oturan zincirin adımı 25,4 mm, yani 1 inçtir.', 'Bir inçlik 25,4 mm adım, çift sıralı zincirin dişlere oturma aralığını tanımlar.']
    geometry = pick(meaning, 0) + ' '
    if b and d:
        geometry += pick([f'İç genişlik {b} mm, makara çapı {d} mm’dir.', f'Makaranın çapı {d} mm, iç plakalar arasındaki açıklık {b} mm’dir.', f'İki iç plakanın arası {b} mm’dir; makara çapı {d} mm olarak eşleşir.', f'Dişli boşluğuna oturan makara {d} mm çapındadır; iç açıklık {b} mm’dir.'], 1) + ' '
        geometry += pick([f'Pim çapı {pin} mm, plaka yüksekliği {h} mm’dir.', f'Plakalar {h} mm yüksekliğindedir; pimler {pin} mm çapındadır.', f'Bağlantı piminde {pin} mm çap ve plakada {h} mm yükseklik ölçüsü kullanılır.', f'{h} mm yüksekliğindeki plakalar {pin} mm çaplı pimlerle eşleşir.'], 2) + ' '
    else:
        geometry += pick([f'{p} mm adım, pim delik çapını veya iç genişliği tanımlamaz.', f'Pim aralığının {p} mm olması iç açıklığı belirlemez.', f'{p} mm’lik merkez mesafesinden pim dış çapı çıkarılamaz.', f'Bilinen {p} mm adım dışında pim ve plaka ölçüleri ayrıca ölçülür.'], 1) + ' '
        geometry += pick(['İç genişlik, makara çapı ve pim ölçüsü verilmemiştir.', 'Pim, makara ve plaka ölçüleri için sayısal değer yoktur.', 'Bağlantının iç açıklığı ile pim ve makara çapı listelenmemiştir.', 'İç açıklık, plaka yüksekliği ve pim çapı bu üründe belirtilmemiştir.'], 2) + ' '
    if pt:
        geometry += pick([f'Sıra merkezleri arasındaki mesafe {pt} mm’dir.', f'Yan yana sıraların merkezleri {pt} mm aralıklıdır.', f'Çok sıralı düzenin merkez aralığı {pt} mm’dir.', f'Diş sıraları zincirin {pt} mm sıra aralığına uymalıdır.'], 3)
    elif kind == 'disli':
        geometry += pick(['Delik ve kama kanalı, takılacağı mil üzerinden ölçülür.', 'Mil deliği ölçüsü bu dişlinin adından çıkarılmaz.', 'Mil çapı ve kama ölçüsü işlenecek bağlantıyı belirler.', 'Göbek boyu da mil üzerindeki yerleşimle birlikte ölçülür.'], 3)
    else:
        geometry += pick([f'{strand.capitalize()} sıralı bağlantıda dişli de {n} diş sırası taşımalıdır.', f'Bu {strand} sıralı ölçü için aynı sıra sayısında zincir ve dişli kullanılır.', f'Karşı dişli ve zincirin sıra sayısı {n} olarak eşleşir.', f'Montajdaki zincir ve dişli {strand} sıralı yapıya uygun seçilir.'], 3)

    sprockets = '<a href="https://www.yamansarulman.com/' + ('cift-sira-zincir-dislileri' if n == 2 else 'tek-sira-zincir-dislileri' if n == 1 else 'zincir-dislileri') + '">zincir dişlileri</a>'
    if kind == 'disli':
        geometry = pick([f'Zincir adımı {p} mm’dir; çift sıralı bağlantı düzeni kullanılır.', f'Çift sıralı zincir, {p} mm adımla dişlere oturur.', f'Bu çift sıralı düzenin zincir adımı {p} mm olarak eşleşir.', f'{p} mm adımlı zincir iki diş sırasına birlikte takılır.'], 0) + ' '
        geometry += pick(['Dişli üzerinde 9 diş bulunur; bu sayı zincirin adım ölçüsü değildir.', 'Diş sayısı 9’dur; adım ile diş sayısı ayrı seçim bilgileridir.', 'Dokuz dişli bu parçada diş sayısı, karşı milin dişlisiyle birlikte aktarım oranını belirler.', 'Aktarım oranı hesabında bu dişlinin 9 dişi esas alınır.'], 1) + ' '
        geometry += pick(['Mil deliği çapı ve göbek boyu için sayısal ölçü verilmemiştir.', 'Bitmiş delik çapı ile göbek uzunluğu bu üründe belirtilmemiştir.', 'Göbek ve delik ölçüleri listede yoktur; mevcut montajdan ölçülür.', 'Delik çapı, göbek boyu ve kama kanalı ölçüsü mevcut mil üzerinden alınır.'], 2) + ' '
        geometry += pick(['Kama genişliği ile mil çapı birlikte ölçülür; diş sayısından delik ölçüsü çıkarılmaz.', 'Kama kanalı mildeki kamaya uymalıdır; diş sayısı mil bağlantısını tanımlamaz.', 'Montaj için mil çapı, kama genişliği ve göbeğin kaplayacağı boy ayrı ayrı alınır.', 'Mil bağlantısı işlenirken kama kanalı genişliği ve göbekteki yerleşim ölçülür.'], 3)
    sprockets_start = sprockets.replace('>zincir', '>Zincir')
    fit = pick([f'{strand.capitalize()} sıralı {sprockets} içinden {p} mm adımla çalışan ölçü seçilir.', f'{p} mm adımlı zincir için {strand} sıralı {sprockets} kullanılır.', f'Dişli seçiminde {p} mm adım ve {count} sıra birlikte eşleştirilir; seçenekler {sprockets} bölümündedir.', f'{sprockets_start} arasında aranan düzen {p} mm adımlı ve {strand} sıralıdır.'], 0) + ' '
    if b and d:
        fit += pick([f'Dişler {b} mm iç açıklığa girmeli, {d} mm çaplı makaralar diş boşluklarına oturmalıdır.', f'{d} mm makara çapı diş profilini, {b} mm iç genişlik dişin gireceği açıklığı belirler.', f'Makara cepleri {d} mm çapı karşılamalı; diş genişliği {b} mm iç açıklığa sığmalıdır.', f'Dişli genişliği {b} mm iç açıklıkla, diş boşluğu da {d} mm makarayla uyumlu olmalıdır.'], 1) + ' '
    else:
        fit += pick(['Mevcut zincirin makara çapı ve iç açıklığı ölçülerek diş profiliyle karşılaştırılır.', 'Dişli dişinin gireceği iç açıklık ve makara çapı sökülen zincirden ölçülür.', 'Makara çapı ile iç genişlik bilinmeden mevcut dişli profili değiştirilmez.', 'Yeni dişli için mevcut zincirin iç açıklığı ve makaraların dişlere oturuşu ölçülür.'], 1) + ' '
    if pt:
        fit += pick([f'İki komşu diş sırasının merkez aralığı {pt} mm olmalıdır.', f'{pt} mm sıra aralığı, dişlerin zincire yandan baskı yapmadan girmesini sağlar.', f'Diş sıraları {pt} mm merkez aralığıyla zincirin sıra düzenini karşılamalıdır.', f'Yan yana diş sıralarında {pt} mm merkez mesafesi aranır.'], 2) + ' '
    elif double:
        fit += pick(['Uzun plakalı konveyör zincirinde dişli, çift hatveli makara düzenine göre seçilir.', 'Çift hatve için kısa adımlı zincir dişlisi yerine seriye uygun dişli profili kullanılır.', 'Dişlinin makara cepleri, uzun adımlı zincirin makara tipine göre eşleşir.', 'Konveyör rayı ile dişlinin makara tipine uygunluğu birlikte kontrol edilir.'], 2) + ' '
    else:
        fit += pick([f'{strand.capitalize()} sıralı yapıda makara yolu ile dişli aynı düzlemde tutulur.', f'Dişli hizası {strand} sıralı zincirin yana sürtünmeden ilerlemesini sağlar.', f'{strand.capitalize()} sıralı zincirin izlediği yol dişli hattıyla aynı düzlemde olmalıdır.', f'Montajda {count} sıra makaraya karşılık gelen diş yolu hizalanır.'], 2) + ' '
    fit += pick(['Diş sayısı aktarım oranını belirler; mil deliği ve kama kanalı mevcut mile göre seçilir.', 'Aktarım oranı için diş sayısı korunur; göbek ve delik ölçüsü mile göre karşılaştırılır.', 'Dişli değişiminde diş sayısı ile mil bağlantısı ayrı ölçülür; adım bunların yerine geçmez.', 'Mil çapı, kama kanalı ve göbek boyu montajı; diş sayısı ise aktarım oranını belirler.'], 3)

    link = '<a href="https://www.yamansarulman.com/zincirler1">zincir kilitleri ve baklalar</a>'
    link_start = link.replace('>zincir', '>Zincir')
    match_code = ('HP ' if hp else '') + code
    qualifier = 'paslanmaz ' if ss else ''
    if kind == 'bakla':
        join_first = [f'Eşleşen zincir ölçüsü {qualifier}{match_code}’dir; yarım bakla çevrim boyunu {p} mm değiştirir.', f'Bu yarım bakla {qualifier}{match_code} zincire takılır ve boyu bir adım, yani {p} mm değiştirir.', f'{qualifier.capitalize()}{match_code} zincirde bir adımlık boy farkı {p} mm’dir; yarım baklanın görevi bu farkı karşılamaktır.', f'{qualifier.capitalize()}{match_code} için yarım bakla, zincire {p} mm’lik tek adım ekler.']
        join_second = ['Çift sayıda adımla kurulan çevrimde tek sayıya geçmek için kıvrımlı bağlantı kullanılır.', 'Tek sayıda zincir adımı gerektiğinde iç ve dış uçlar bu kıvrımlı parçada birleşir.', 'Yarım bakla adı adımın yarısı anlamına gelmez; çevrimi tek sayıda adımla kapatmayı sağlar.', 'Kıvrımlı plakalar, tek sayıda adımlı çevrimde farklı uç bağlantılarını birbirine geçirir.']
        join_third = [f'Makara-burç ucu ile pim ucu {strand} sıralı zincirin uçlarına yerleşir.', f'Bu parçada bir uç iç, diğer uç dış bağlantıdır; her ikisi de {n} sırayı karşılar.', f'{strand.capitalize()} sıralı yapıda kıvrımlı plakanın yönü zincirin iç ve dış uçlarına göre yerleştirilir.', f'İç ve dış bağlantı uçları {count} sıra boyunca karşılıklı oturmalıdır.']
    elif kind == 'kilit':
        join_first = [f'{qualifier.capitalize()}{match_code} zincirin iki ucu bu tam kilitle birleştirilir.', f'Bu kilit {qualifier}{match_code} zincirin açık uçlarını kapatır.', f'Eşleşeceği zincir {qualifier}{match_code}’dir; tam kilit uç bağlantısını tamamlar.', f'Tam kilit, {qualifier}{match_code} zincirde karşılıklı iki iç bağlantıyı birleştirir.']
        join_second = ['Pimler iki uçtaki burçlardan geçer; dış plaka ve yaylı tutucu pimleri yerinde tutar.', 'İki pim uçlardaki burçlara girer; karşı plaka yaylı tutucuyla kilitlenir.', 'Uçlar iki pim üzerinde birleşir; dış plaka takıldıktan sonra yaylı tutucu yuvasına oturur.', 'Pimli plaka iki ucu taşır; karşı plaka ve yaylı klips bağlantıyı kapatır.']
        join_third = [f'Kilit {strand} sıralıdır; yarım bakla gibi tek adımlık boy ayarı yapmaz.', f'{strand.capitalize()} sıralı bu tam kilit, tek adımlık boy değişikliği için kullanılan yarım bakladan farklıdır.', f'{count} sıra için uçları kapatır; zinciri tek adım değiştirmek yarım baklanın işidir.', f'Tam kilidin görevi {n} sıradaki uçları birleştirmektir; kıvrımlı yarım baklayla karıştırılmaz.']
    else:
        join_first = [f'Birleştirme için {qualifier}{match_code} tam kilit seçilir; sıra sayısı {n} olarak korunur.', f'{qualifier.capitalize()}{match_code} tam kilit, {strand} sıralı zincirin iki ucunu kapatır.', f'Zincir uçlarında {qualifier}{match_code} tam kilit kullanılır; bağlantı {n} sırayı karşılamalıdır.', f'Uçları kapatacak bağlantı {qualifier}{match_code} tam kilittir; {n} sıraya uygun seçilir.']
        join_second = ['Tam kilidin pimleri burçlardan geçer; karşı plaka ve yaylı tutucu uçları bir arada tutar.', 'İki pimli tam kilit uçları birleştirir; tutucu parça dış plakanın çıkmasını önler.', 'Uç bağlantısında pimli plaka, karşı plaka ve yaylı tutucu birlikte yerleşir.', 'Tam kilitte iki pim, zincir uçlarını taşır; dış plaka ve tutucu bağlantıyı kapatır.']
        join_third = [f'Tek adımlık boy farkı {p} mm’dir; bu ayar için aynı ölçünün yarım baklası kullanılır.', f'Boyu tek adım değiştirmek {p} mm fark yaratır; yarım bakla bunun için seçilir.', f'Yarım bakla ile bir adımlık, yani {p} mm’lik boy değişikliği yapılır.', f'{p} mm’lik tek adım ayarı, uç kapatan tam kilit yerine uygun yarım baklayla yapılır.']
    if hp:
        join_second = ['Delikli pimlerin içindeki geçiş açık kalmalıdır; dolu pimli kilit bu geçişi kapatır.', 'Bağlantı kilidinde de içi boş pim gerekir; taşıyıcı çubuğun geçişi kesilmez.', 'Kilit pimlerinin deliği, ek çubuğun geçişini sürdürmelidir; dolu pimli bağlantı kullanılmaz.', 'Uç birleştirmede pim delikleri korunur; karşı plaka ve tutucu delikli pimle uyumlu olur.']
        join_third = ['Kilit üzerindeki tutucu, pim ucunun yuvasına oturur; pim deliğine taşmamalıdır.', 'Çubuğun geçeceği iç çap ile tutucu yuvası ayrı ayrı ölçülür.', 'Ek bağlantının çubuğu, kilit dahil tüm geçiş deliklerinden serbestçe geçmelidir.', 'Taşıyıcı çubuk için kilit pimlerinin iç çapı da zincirdeki delikle eşleştirilir.']
    joining = pick(join_first, 0) + ' ' + pick(join_second, 1) + ' ' + pick(join_third, 2) + ' '
    joining += pick([f'{link_start} arasında seçim yaparken pim geçişini ve plaka aralığını karşılaştırın.', f'{link_start} için ölçü karşılaştırmasını sökülen parça üzerinden yapın.', f'Sökülen parçanın pim ve plaka ölçülerini {link} ile karşılaştırın.', f'{link_start} arasında aynı ölçünün bağlantı biçimini seçin; pim yuvası ve plaka aralığı eşleşmelidir.'], 3)

    if ss:
        use_first = [f'Paslanmaz çelik yapı, {p} mm adımlı zincirin nemli veya sık temizlenen hatlarda kullanılması içindir.', f'Nemli konveyör ve temizlik yapılan makine hatlarında {p} mm adımlı paslanmaz bağlantı kullanılır.', f'{p} mm adımlı paslanmaz düzen, nem ve suyla temas eden taşıma hatlarında tercih edilir.', f'Temizlik yapılan taşıma düzenlerinde {p} mm adım korunurken paslanmaz çelik yapı seçilir.']
        use_second = ['Paslanmaz çeliğin korozyon direnci, ıslak ortamda yüzey paslanmasını sınırlar.', 'Korozyon direnci, sık ıslanan bağlantılarda paslanmaz çelik seçiminin temel nedenidir.', 'Paslanmaz yapı, nemli ortamda yüzey korozyonuna karşı direnç sağlar.', 'Su ve nemle temasta yüzeyin korozyona direnci paslanmaz yapının avantajıdır.']
    elif hp:
        use_first = [f'{p} mm adımlı delikli pimler, konveyör taşıyıcılarına çubuk bağlamak için kullanılır.', f'Konveyörde ek taşıyıcı çubukları {p} mm adımla ilerleyen pim deliklerinden geçirilir.', f'Taşıma hattında ek çubukların bağlantı noktaları {p} mm adımlı pimler üzerindedir.', f'İçi boş pimler, {p} mm adımlı konveyöre taşıyıcı çubuk eklemek için geçiş sağlar.']
        use_second = ['Çubuğun dış çapı pim deliğine göre seçilir; delik çapı bu ürün için listelenmemiştir.', 'Takılacak çubuğun çapı, ölçülen pim iç çapına göre belirlenir.', 'Taşıyıcı çubuğun geçişi için pim iç çapı ayrıca ölçülür.', 'Pim dış çapı çubuk ölçüsü değildir; geçiş için iç delik çapı ölçülür.']
    elif double:
        use_first = [f'{p} mm uzun adım, yavaş çalışan konveyörlerde taşıma elemanlarını birbirinden ayırır.', f'Yavaş konveyör düzeninde uzun plakalar {p} mm aralıkla hareket eder.', f'Uzun düz plakalı bu {p} mm adımlı zincir, düşük hızlı taşıma hatlarında kullanılır.', f'Düşük hızlı konveyör tahrikinde makara merkezleri {p} mm arayla ilerler.']
        use_second = ['Uzun plakalar taşıyıcılar arasında yer bırakır; makara tipi rayın temas yüzeyiyle eşleşir.', 'Konveyör rayıyla temas eden makara ve uzun plaka düzeni birlikte seçilir.', 'Uzun bağlantılar taşıyıcı aralığını oluşturur; makara-ray teması ayrıca kontrol edilir.', 'Taşıma düzeninde makara çapı rayı, uzun plakalar ise bağlantı aralığını belirler.']
    else:
        use_first = [f'{p} mm adımlı {strand} sıralı zincir, konveyör tahriki ve makine aktarmalarında kullanılır.', f'Makine ve konveyör tahrikinde {p} mm adım ile {count} sıra mevcut aktarmayla eşleşir.', f'Paketleme makineleri ve konveyör tahriklerinde {p} mm adımlı {strand} sıralı düzen kullanılır.', f'{strand.capitalize()} sıralı aktarımda {p} mm adım, makine üzerindeki zincir-dişli ölçüsünü korur.']
        load = values.get('kopma_min_kn') if kind == 'zincir' else None
        if load:
            f = decimal(load['deger'])
            use_second = [f'Minimum kopma yükü {f} kN’dir; bu değer sürekli çalışma yükü değildir.', f'{f} kN minimum kopma yükü, izin verilen devamlı çekme yükünden farklıdır.', f'Kopma yükünün alt sınırı {f} kN’dir; aktarma hesabında sürekli yük olarak kullanılmaz.', f'{f} kN değeri minimum kopma yükünü belirtir, sürekli taşıma kapasitesini değil.']
        else:
            use_second = ['Kilit ve bakla, mevcut zincirin iç-dış bağlantı dizilişini tamamlar.', 'Bağlantı elemanı, mevcut zincirin pim ve burç düzenini korur.', 'Uç bağlantısında pim ile burç arasındaki hareketli geçiş korunur.', 'Zincirle birlikte çalışan parça, pim-burç mafsalının hareketine izin verir.']
    usage = pick(use_first, 0) + ' ' + pick(use_second, 1) + ' '
    if double and hp:
        usage += pick(['Uzun plakalı çift hatve, düşük hızlı konveyör taşıyıcılarının aralığını oluşturur.', 'Çift hatveli uzun plakalar, yavaş çalışan taşıma düzenindeki ek parçalara yer açar.', 'Düşük hızlı taşıma hattında uzun plakalar taşıyıcılar arasındaki mesafeyi sağlar.', 'Uzun düz plaka düzeni düşük hızlı konveyördeki taşıyıcı yerleşimine uygundur.'], 2) + ' '
    elif hp:
        usage += pick(['Pim deliklerinin hizası, taşıyıcı çubuğun iki yandaki zincirden geçmesini sağlar.', 'Karşılıklı taşıyıcı bağlantılarda pim deliklerinin aynı hizada olması gerekir.', 'Taşıyıcı çubuk iki zinciri bağlıyorsa karşılıklı delikler hizalanır.', 'Ek parçalar zinciri yandan zorlamadan, pim delikleriyle aynı eksende yerleştirilir.'], 2) + ' '
    elif ss:
        usage += pick(['Temizlik kimyasalı ile çelik sınıfının uyumu ayrıca kontrol edilir; çelik sınıfı belirtilmemiştir.', 'Çelik sınıfı listelenmediğinden temizleme kimyasalıyla uyumu ürün malzemesi üzerinden kontrol edilir.', 'Yıkamada kullanılan kimyasalın malzemeyle uyumu kontrol edilir; burada çelik sınıfı verilmez.', 'Paslanmaz çelik sınıfı belirtilmemiştir; kimyasal temizlik için malzeme uyumu ayrıca sorgulanır.'], 2) + ' '
    else:
        usage += pick([f'{count} sıra boyunca dişlere oturuş eşit olmalı; zincir bir yana çekmemelidir.', f'{strand.capitalize()} sıralı düzen dişli üzerinde yana sürtmeden ilerlemelidir.', f'{strand.capitalize()} sıralı zincir hattı, iki milin dişlileriyle aynı düzlemde tutulur.', f'Mil hizası {n} sıranın dişlerle aynı yönde çalışmasını sağlar.'], 2) + ' '
    usage += pick(['Yağ, dış yüzeye değil pim-burç arasındaki hareketli bağlantıya ulaşmalıdır.', 'Yağlama bağlantı aralığına yapılır; yağın pim-burç bölgesine girmesi gerekir.', 'Pim-burç mafsalına ulaşan yağ, bağlantının sürtünen yüzeylerini yağlar.', 'Bağlantıların yağlanmasında pim ile burç arasındaki aralığa ulaşılır.'], 3)

    measuring = pick([f'Eşleşen zincirde 10 adımın nominal boyu {span} mm’dir; bu uzunluk 11 pim merkezi arasında ölçülür.', f'Adımı kontrol etmek için 11 ardışık pim merkezi alınır; 10 aralığın nominal toplamı {span} mm’dir.', f'İlk pim merkeziyle 11. pim merkezi arasındaki nominal mesafe {span} mm’dir; arada 10 adım vardır.', f'10 pim aralığını birlikte ölçün; ilk ve 11. pim merkezi arasında nominal {span} mm bulunur.'], 0) + ' '
    measuring += pick([f'Ölçülen toplamı 10’a bölmek bir adımı verir; nominal sonuç {p} mm’dir.', f'Toplam mesafe 10’a bölünerek {p} mm nominal adımla karşılaştırılır.', f'Toplamı 10’a bölün; bir adımın nominal uzunluğu {p} mm’dir.', f'{p} mm adımı kontrol ederken toplam uzunluğu pim sayısına değil 10 aralığa bölün.'], 1) + ' '
    measuring += pick(['Zincir düz tutulur, boşluğu alınır; cetvel pimlerin kenarına değil merkezlerine hizalanır.', 'Ölçümde zincir düz bir hatta tutulur; pim dış kenarları yerine merkezler esas alınır.', 'Boşluğu alınmış zincirde cetvel pim merkezlerine paralel yerleştirilir.', 'Pim merkezlerini ölçerken zincir düzleştirilir ve bağlantılardaki boşluk alınır.'], 2) + ' '
    measuring += pick(['Bakımda aynı aralık yeniden ölçülerek uzama izlenir; kanca biçiminde aşınmış dişler de kontrol edilir.', 'Uzama takibi aynı pim aralığından yapılır; zincirle birlikte dişlerin kanca biçimli aşınmasına bakılır.', 'Sonraki ölçüm aynı 10 adım üzerinden yapılır; diş uçlarının aşınması zincir değişimiyle birlikte incelenir.', 'Karşılaştırma aynı 11 pim merkezi arasında tekrarlanır; aşınmış diş uçları yeni zincirle birlikte değerlendirilir.'], 3)
    return ['Ürün Yapısı', 'Ölçüler ve Sıra Düzeni', 'Dişli Seçimi', 'Kilit ve Bakla Seçimi', 'Kullanım Alanları', 'Adım Ölçümü ve Bakım'], [intro, geometry, fit, joining, usage, measuring]


def seo_description(row, values):
    p = decimal(values['p']['deger'])
    n = row['sira']
    strand = {1: 'tek', 2: 'çift', 3: 'üç', 4: 'dört'}[n]
    if row['tip'] == 'disli':
        return '25,4 mm adımlı çift sıralı zincir için 9 dişli dişli. Mil bağlantısı ve ölçü bilgilerini inceleyin.'
    subject = {'zincir': 'zincir', 'bakla': 'yarım bakla', 'kilit': 'bağlantı kilidi'}[row['tip']]
    material = 'Paslanmaz çelik' if row['paslanmaz'] else 'Pim delikli' if row['pim_delikli'] else 'Çift hatveli' if 'cift_hatve' in row['aile'] else 'Makaralı'
    text = f'{material} {subject}, {p} mm adımlı {strand} sıralı düzene uyar.'
    if values.get('b1') and values.get('d3'):
        text += f' İç genişliği {decimal(values["b1"]["deger"])} mm, makara çapı {decimal(values["d3"]["deger"])} mm’dir.'
    elif row['pim_delikli']:
        text += ' Delikli pimler, konveyör taşıyıcılarının çubuk bağlantısı için geçiş sağlar.'
    else:
        text += ' Zincir uçlarını birleştirmek için pim ve tutucu ölçülerini karşılaştırın.'
    return clip(text, 155)


def generate(kod, variant=None):
    row = next((r for r in ROWS if r['kod'] == kod), None)
    if row is None:
        raise ValueError('Stok kodu bulunamadı: ' + kod)
    brand = brand_name(row)
    flags = list(row['bayraklar'])
    if any('marka_uyusmazligi' in f for f in flags):
        flags.append('marka_celiskisi')
    if kod == 'AYZ ZİN 16B2':
        flags.append('sira_celiskisi')
    if row['iso_kod'] == '415H':
        flags.append('olcu_celiskisi')
    if row['tip'] == 'disli':
        flags.append('gorsel_seri_fotografi:9_dis_birebir_degil')
    if brand == 'Yamansa' and row['tip'] == 'zincir' and row['sira'] == 1 and not row['paslanmaz'] and not row['pim_delikli'] and row['iso_kod'] in EXISTING_CODES:
        flags.append('olasi_kopya')
    values, specs, source = technical(row, flags)
    pitch = decimal(values['p']['deger'])
    title = IMAGES[kod]['URUNADI']
    ref = title.removesuffix(' ' + pitch + ' mm')
    headings, texts = paragraphs(row, title, values, VARIANTS[kod] if variant is None else variant)
    technical_html = '<ul>' + ''.join('<li><strong>' + html.escape(k) + ':</strong> ' + html.escape(v) + '</li>' for k, v in specs) + '</ul>'
    description = '<div class="urunTabAlt"><div class="ydsc"><div class="ym"><h2>' + html.escape(title) + '</h2><p>' + texts[0] + '</p>'
    description += ''.join('<div class="ysc"><h3>' + h + '</h3><p>' + p + '</p></div>' for h, p in zip(headings[1:], texts[1:]))
    description += '</div><aside class="ya"><h3>Teknik Özellikler</h3>' + technical_html + '</aside></div></div>'
    summary = [('DIN ISO Kodu', row['iso_kod']), ('Adım', pitch + ' mm'), ('Sıra Sayısı', str(row['sira'])), ('Marka', brand)]
    if row['hatve_inc']:
        summary.insert(1, ('İnç Kodu', row['hatve_inc'] + '"'))
    onyazi = '<table><tbody><tr>' + ''.join('<td><strong>' + html.escape(k) + '</strong> ' + html.escape(v) + '</td>' for k, v in summary) + '</tr></tbody></table>'
    category = BASE + 'ÇİFT SIRA ZİNCİR DİŞLİLERİ' if row['tip'] == 'disli' else LINK if row['tip'] in {'bakla', 'kilit'} else CHAIN
    words = keywords(row, brand, ref, pitch)
    return {'kod': kod, 'URUNADI': title, 'MARKA': brand, 'KATEGORI': category, 'EK_KATEGORILER': [CHAIN] if category == LINK else [], 'yeni_kategori': category == LINK,
            'ONYAZI': onyazi, 'ACIKLAMA': description, 'ANAHTARKELIME': words,
            'SEO_SAYFABASLIK': clip(title, 60), 'SEO_SAYFAACIKLAMA': seo_description(row, values), 'SEO_ANAHTARKELIME': words,
            'resim': IMAGES[kod]['file'], 'resim_seviye': IMAGES[kod]['resim_seviye'], 'resim_kaynak': IMAGES[kod]['resim_kaynak'], 'teknik_kaynak': source, 'bayraklar': sorted(set(flags))}


def generate_all():
    groups = defaultdict(list)
    for row in ROWS:
        groups[IMAGES[row['kod']]['URUNADI']].append(row['kod'])
    records = []
    for row in ROWS:
        name = IMAGES[row['kod']]['URUNADI']
        group = sorted(groups[name])
        record = generate(row['kod'])
        record['bayraklar'] += ['ayni_ad:' + k for k in group if k != row['kod']]
        records.append(record)
    return records
