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
        specs.append(('Standart', 'ISO 606 / ANSI 60 (12A-1)'))
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


def paragraphs(row, ref, pitch, variant):
    code = row['iso_kod']
    strand = {1: 'tek sıralı', 2: 'çift sıralı', 3: 'üç sıralı', 4: 'dört sıralı'}[row['sira']]
    if row['tip'] == 'disli':
        shape = 'Dokuz dişli bu göbekli parça, 1 inç adımlı çift sıralı zincirle çalışacak dişli düzeni içindir. İki diş sırası aynı gövde üzerinde bulunur; tek sıralı bir dişliyle aynı bağlantı düzenine sahip değildir.'
        meaning = '16B-2 zincir ölçüsü, 25,4 mm adımı ve iki sırayı ifade eder; 9 ise diş sayısıdır. Mil deliği, göbek boyu ve kama kanalı için burada ölçü verilmez. Mevcut dişlinin mile bağlanma biçimi ayrıca karşılaştırılmalıdır.'
        fit = 'Zincirin dişlere oturuşu kadar mil bağlantısı da önemlidir. Pilot deliğin bitmiş mil deliği olduğu varsayılmamalıdır. Aynı zincir ölçüsündeki farklı diş sayıları aktarım oranını ve zincir yolunu değiştirir.'
    elif row['iso_kod'] == '415H':
        shape = 'İnce motosiklet ve moped zincirlerinin uçlarını birleştirmek için kullanılan tam kilit tipidir. İki pim, karşı plaka ve tutucu parça bir bağlantı oluşturur; yarım baklanın boy ayarlama görevinden farklıdır.'
        meaning = '415H kodunda bu ürün için kullanılabilen adım 12,7 mm’dir. İç genişlik değeri verilmediği için yalnız 1/2 inç adımla kilit seçmek yeterli olmaz. Sökülen kilidin pim aralığı, plaka geçişi ve tutucu biçimiyle karşılaştırma yapılır.'
        fit = 'Zincirin tam kodu ile kilit tipi birlikte ele alınmalıdır. Aynı adımda daha geniş veya farklı pim yapısında zincirler bulunabilir. Karşı plaka pimlere düzgün oturmalı; tutucu parça kendi yuvasına uygun olmalıdır.'
    elif row['pim_delikli']:
        shape = 'Pimlerin içi boştur; bağlantı düzeninde bu deliklerin konumu ve çapı önem taşır. Dolu pimli zincirle yalnız dış görünüşe göre eşleştirme yapılmaz. ' + ('Bu tam kilit, açık pimli zincirin iki ucunu birleştiren bağlantı elemanıdır.' if row['tip'] == 'kilit' else 'Boş pimler, pim içinden geçen bağlantı elemanları kullanılan düzeneklerde değerlendirilir.')
        meaning = 'HP ifadesi pim delikli yapıyı belirtir. ' + ('Çift hatveli düzende uzun plaka ve makara tipi de kodun parçasıdır. ' if 'cift_hatve' in row['aile'] else '') + 'Adım pim merkezleri arasında ölçülür; delik çapı ve pim dış ölçüsü aynı kavram değildir. Eksik bağlantı ölçülerinin yerine normal dolu pimli zincirin değerleri kullanılmaz.'
        fit = 'Karşılaştırmada zincirin tam kodu, pim deliklerinin biçimi ve bağlantı parçasının geçişi birlikte ele alınır. Aynı adımlı dolu pimli bir kilit bu yapının yerine düşünülmemelidir. İlave bağlantı parçasının pim deliğine oturması ayrıca kontrol edilir.'
    elif row['tip'] == 'bakla':
        shape = 'Yarım kilit veya offset bakla olarak anılan kranked bağlantı elemanıdır. Bir uç makara-burç tarafını, diğer uç pim bağlantısını oluşturur. Zincir boyunu tek adım değiştirmek gereken bağlantılarda değerlendirilir; tam kilitle aynı parça değildir.'
        meaning = 'Kod zincirin ölçü serisini ve sıra sayısını tanımlar. Yarım bakla, zincirin iç ve dış bağlantı düzenleri arasındaki geçişi sağlayan kıvrımlı plakalarıyla ayırt edilir. Adımın aynı olması tek başına yeterli değildir; makara, pim ve iç genişlik de eşleşmelidir.'
        fit = 'Zincir boyu ve uç bağlantılarının dizilişi, yarım baklaya ihtiyaç olup olmadığını belirler. Mevcut uçları birleştiren tam kilit ile tek adımlık boy değişikliği sağlayan yarım bakla karıştırılmamalıdır. Montajda kıvrımlı plakanın yönü ve pim bağlantısının oturuşu kontrol edilir.'
    elif row['tip'] == 'kilit':
        shape = 'Tam kilit, zincirin iki ucunu birleştiren pimli bağlantı elemanıdır. Dış plaka, iki pim ve tutucu parça birlikte çalışır. Yarım bakla gibi zincir boyunu tek adım değiştirmek için değil, uygun iki ucu kapatmak için seçilir.'
        meaning = 'Kod, kullanılacağı makaralı zincirin ölçüsünü ve sıra sayısını belirtir. Kilidin pim aralığı zincirin adımıyla eşleşir; pim çapı ve plaka geçişi de bağlantının parçalarıdır. Farklı serilerin aynı adımlı kilitleri otomatik olarak birbirinin yerine geçmez.'
        fit = 'Kilidi seçerken sökülen parçanın ölçüsünü, zincirin tam kodunu ve tutucu biçimini birlikte karşılaştırın. Plakanın pimlere düzgün yerleşmesi gerekir. Tutucu parçanın türü ve yuvası uyumlu olmalı; yalnız dış plaka uzunluğuna göre seçim yapılmamalıdır.'
    elif 'cift_hatve' in row['aile']:
        shape = 'Uzun düz plakalı çift hatveli makaralı zincirdir. Aktarım ve taşıma düzeninde adımın yanında makara tipi de belirleyicidir. Büyük makaralarla çalışan bir düzen, yalnız aynı adımda küçük makaralı başka bir zincirle eşleştirilmez.'
        meaning = 'A veya C öneki ile devam eden tam seri kodu birlikte okunmalıdır. Bu ölçüdeki plaka aralığı standart kısa adımlı zincirden farklıdır. Makaranın rayla ve dişliyle teması değerlendirilirken kodun son rakamları da korunur; yalnız ilk harften ölçü sonucu çıkarılmaz.'
        fit = 'Taşıma yüzeyi, makara çapı ve dişli profili birlikte seçilir. Mevcut zinciri değiştirirken düz plakanın boyu ve makara yerleşimi karşılaştırılır. Bağlantı kilidi de aynı çift hatveli seri için olmalı; kısa adımlı zincirin kilidiyle yalnız görünüş üzerinden eşleştirilmemelidir.'
    else:
        shape = f'{strand.capitalize()} makaralı transmisyon zinciridir. ' + ('İki veya daha fazla makara sırası ortak pimlerle birlikte ilerler; dişlide aynı sayıda diş sırası gerekir. ' if row['sira'] > 1 else 'Tek makara sırası, uygun tek sıralı dişli üzerinde ilerler. ') + 'Adım, ardışık iki pim merkezinin mesafesidir; zincir seçiminin temel ölçülerinden biridir.'
        meaning = ('ASA 60, ANSI 60 ve 12A-1 bu ürünün ANSI ölçü ailesini tanımlar. B serisi zincirle aynı kod değildir; 3/4 inç adımın ortak olması iç genişlik ve makara ölçülerinin aynı olduğu anlamına gelmez.' if code == '12A-1' else f'{code} kodu B serisi ölçüyü ve son ekte sıra sayısını belirtir. Aynı adımlı tek, çift, üç ve dört sıralı seçenekler birbirinin yerine doğrudan takılmaz. Seçimde B harfi ile sıra eki birlikte korunur; yalnız inç adımına göre karar verilmez.')
        fit = 'Dişlinin diş sayısı aktarım oranını, göbek ve mil deliği ise montaj biçimini belirler. Zincir adımıyla birlikte makara çapı, iç genişlik ve sıra sayısı da dişliye uymalıdır. Çok sıralı düzende sıralar arası mesafe, diş sıralarının konumuyla birlikte değerlendirilir.'
    material = 'Paslanmaz yapı, ortam ve temizlik koşulları dikkate alınarak seçilir. Bu ürün için özel çelik sınıfı veya kopma yükü verilmez; malzeme seçimi yalnız yüzey parlaklığına göre yapılmaz.' if row['paslanmaz'] else 'Pim, burç ve makara bölgelerinin düzenli yağlanması hareketli bağlantılardaki aşınmanın takibini kolaylaştırır. Yağın bağlantı aralıklarına ulaşması ve çalışma ortamına uygun olması önemlidir.'
    joining = ('Zincir uçları için aynı seri ve sıra sayısında tam kilit kullanılır. Boyu tek adım değiştirmek gerektiğinde uygun yarım bakla ayrıca değerlendirilir. Tam kilit ile yarım baklanın görevleri farklıdır; bağlantı biçimi mevcut zincir ucuyla karşılaştırılır.' if row['tip'] in {'zincir', 'disli'} else 'Bağlantı parçasının karşısındaki zincirin pim ve plaka düzeni esas alınır. Aynı adımda farklı seri veya sıra sayısı seçilmesi uygun bağlantı sağlamaz. Sökülen parçanın ölçüsü ile yeni parçanın pim geçişi ve plaka oturuşu birlikte karşılaştırılır.')
    usage = ('Konveyörlerin taşıma ve ek bağlantı düzenleri bu tipin kullanım alanları arasındadır. Ek parçaların geçişi, rayla temas ve bağlantı hareketi birlikte incelenir.' if row['pim_delikli'] or 'cift_hatve' in row['aile'] else 'Konveyör tahrikleri, paketleme makineleri, tarım makinesi aktarmaları ve genel makine transmisyonları bu ölçü ailesinin kullanıldığı alanlardır. Mevcut dişli düzeni, zincir boyu ve bağlantı şekli uygulama seçiminin başlangıç noktalarıdır.')
    maintenance = 'Değişim sırasında zincirin uzamasıyla birlikte diş uçlarının aşınması da incelenir. Millere bağlı dişlilerin aynı düzlemde durması, zincirin yana zorlanmadan ilerlemesine yardımcı olur. Uzama karşılaştırması tek bir pim aralığı yerine birden fazla adım üzerinden yapılır.'
    openings = [f'{ref}, {pitch} mm adımla çalışan bu ölçü ailesinin bir parçasıdır. ', f'{pitch} mm pim merkezi aralığıyla tanımlanan {ref} için bağlantı düzeni de ölçü kadar önemlidir. ', f'{ref} seçilirken ilk karşılaştırma {pitch} mm adım ve mevcut parçanın düzeni üzerinden yapılır. ', f'Mevcut aktarmadaki {pitch} mm adımı eşleştirmek için {ref} kodu tam olarak okunmalıdır. ']
    tags = [f'{ref} için ', f'{ref} ile çalışacak düzende ', f'Bu ölçüdeki {ref} seçilirken ', f'{ref} bağlantısını karşılaştırırken ']
    link = '<a href="https://www.yamansarulman.com/zincirler1">zincir, bakla ve kilit seçenekleri</a>'
    sprockets = '<a href="https://www.yamansarulman.com/' + ('cift-sira-zincir-dislileri' if row['sira'] == 2 else 'tek-sira-zincir-dislileri' if row['sira'] == 1 else 'zincir-dislileri') + '">uygun zincir dişlileri</a>'
    texts = [openings[variant] + shape,
             tags[(variant+1)%4] + 'tam kodun anlamı önemlidir. ' + meaning,
             tags[(variant+2)%4] + 'eşleşecek dişli ve zincir birlikte ele alınır. ' + fit + ' Seçenekler arasında ' + sprockets + ' incelenebilir.',
             tags[(variant+3)%4] + 'bağlantı elemanının görevi belirleyicidir. ' + joining + ' Karşılaştırma için ' + link + ' aynı kod ailesi üzerinden ele alınabilir.',
             tags[variant] + 'kullanım ortamı da seçimde yer alır. ' + usage + ' ' + material,
             tags[(variant+1)%4] + 'bakımda zincir ve dişli bir bütün olarak incelenir. ' + maintenance]
    return ['Ürün Yapısı', 'Kod ve Ölçü', 'Dişli ve Zincir Uyumu', 'Bağlantı Parçaları', 'Kullanım Alanları', 'Bakım ve Ölçü Kontrolü'], texts


def generate(kod, variant=0):
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
    headings, texts = paragraphs(row, ref, pitch, variant)
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
            'SEO_SAYFABASLIK': clip(title, 60), 'SEO_SAYFAACIKLAMA': clip(ref + ': ' + pitch + ' mm adım. Ölçüler, uyumlu bağlantı parçaları ve dişli seçimi için ürün özelliklerini inceleyin.', 155), 'SEO_ANAHTARKELIME': words,
            'resim': IMAGES[kod]['file'], 'resim_seviye': IMAGES[kod]['resim_seviye'], 'resim_kaynak': IMAGES[kod]['resim_kaynak'], 'teknik_kaynak': source, 'bayraklar': sorted(set(flags))}


def generate_all():
    groups = defaultdict(list)
    for row in ROWS:
        groups[IMAGES[row['kod']]['URUNADI']].append(row['kod'])
    records = []
    for row in ROWS:
        name = IMAGES[row['kod']]['URUNADI']
        group = sorted(groups[name])
        variant = (int(hashlib.sha256(name.encode()).hexdigest()[:8], 16) + group.index(row['kod'])) % 4
        record = generate(row['kod'], variant)
        record['bayraklar'] += ['ayni_ad:' + k for k in group if k != row['kod']]
        records.append(record)
    return records
