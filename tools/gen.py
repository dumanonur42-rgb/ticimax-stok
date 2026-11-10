# -*- coding: utf-8 -*-
import gzip, json, re, hashlib, unicodedata, sys, os
SRC = 'parca/triger.jsonl.gz'
PITCH = {'XL': '5,08', 'L': '9,525', 'H': '12,7', 'T5': '5', 'T10': '10', '3M': '3', '5M': '5', '8M': '8'}
INCHW = {'025': '6,35', '031': '7,9', '037': '9,5', '050': '12,7', '075': '19,05', '100': '25,4', '150': '38,1', '200': '50,8'}
PROFTXT = {'XL': 'inç hatveli trapez (XL)', 'L': 'inç hatveli trapez (L)', 'H': 'inç hatveli trapez (H)',
           'T5': 'metrik trapez (T5)', 'T10': 'metrik trapez (T10)', '3M': 'HTD yuvarlak diş (3M)',
           '5M': 'HTD yuvarlak diş (5M)', '8M': 'HTD yuvarlak diş (8M)'}
STD = {'XL': 'ISO 5296', 'L': 'ISO 5296', 'H': 'ISO 5296', 'T5': 'DIN 7721', 'T10': 'DIN 7721',
       '3M': 'ISO 13050 (HTD)', '5M': 'ISO 13050 (HTD)', '8M': 'ISO 13050 (HTD)'}
U = 'https://www.yamansarulman.com/'
L_KAS = U + 'kasnaklar'; L_ZK = U + 'zaman-kayislari-747'; L_TK = U + 'triger-kayisi-80'
L_KB = U + 'konik-burclar'; L_BF = U + 'banflex-zaman-kayisi'

def h(s, n):
    return int(hashlib.md5(s.encode()).hexdigest(), 16) % n

def pick(kod, key, opts):
    return opts[h(kod + key, len(opts))]

def clean(v):
    v = (v or '').strip()
    if v in ('', '–', '-', '—'):
        return None
    v = re.sub(r',0+$', '', v)
    return v

def dot(v):
    return v.replace(',', '.')

def slug(s):
    s = s.replace('ı', 'i').replace('İ', 'I').replace('Ø', '')
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def parse(p):
    k = p['kod']; ad = p['ad']; o = p.get('orka_site')
    d = {'kod': k, 'scode': re.sub(r'^ORK\s+', '', k), 'stok': p.get('stok'), 'src': o['url'] if o else None}
    d['fam'] = 'BTK' if ' BTK ' in k else ('TKX' if ' TKX ' in k else 'TK')
    m = re.search(r'(\d+) (XL|L|H|T5|T10|3M|5M|8M) (\d+)', ad)
    d['z'], d['prof'], d['wc'] = m.group(1), m.group(2), m.group(3)
    d['w'] = INCHW.get(d['wc']) if d['prof'] in ('XL', 'L', 'H') else str(int(d['wc']))
    d['flans'] = 'FLANŞLI' in ad
    d['mat'] = 'Alüminyum' if 'ALUMİNYUM' in ad else ('Çelik' if o and 'celik' in o['url'] else None)
    mb = re.search(r'\((\d{4})\)', ad); d['burc'] = mb.group(1) if mb else None
    md = re.search(r'DELİK ÇAPI (\d+) MM', ad); d['d'] = md.group(1) if md else None
    d['tip'] = None; d['maxd'] = None; dims = {}
    if o:
        s = o['satir']; hd = o['baslik'][1]
        d['tip'] = clean(s[2])
        if d['tip']:
            d['flans'] = d['flans'] or 'F' in d['tip']
        if d['fam'] == 'BTK':
            d['burc'] = clean(s[4]) or d['burc']; d['maxd'] = clean(s[5]); zz = clean(s[6])
            names = ['Dp', 'De', 'Df', 'Dm', 'Di', 'F', 'S', 'R']; vals = s[7:15]
        else:
            zz = clean(s[4]); names = ['Dp', 'De', 'Df', 'Dm', 'Di', 'F', 'L', 'd']; vals = s[5:13]
        if zz and zz != d['z']:
            raise SystemExit('Z mismatch ' + k)
        for n, v in zip(names, vals):
            v = clean(v)
            if v: dims[n] = v
        if 'd' in dims: d['d'] = dims.pop('d')
    if not d['flans']: dims.pop('Df', None)
    d['dims'] = dims
    return d

def specs(d):
    D = d['dims']; s = []
    s.append(('Ürün Tipi', 'Burçlu Triger Kasnak' if d['fam'] == 'BTK' else 'Triger Kasnak'))
    s.append(('Marka', 'Yamansa'))
    s.append(('Satış Birimi', 'Adet'))
    s.append(('Diş Profili', d['prof']))
    s.append(('Hatve', PITCH[d['prof']] + ' mm'))
    s.append(('Diş Sayısı', d['z']))
    if d['w']: s.append(('Kayış Genişliği', d['w'] + ' mm'))
    if d['tip']: s.append(('Tip Kodu', d['tip']))
    s.append(('Flanş', 'Flanşlı' if d['flans'] else 'Flanşsız'))
    for k, l in [('Dp', 'Bölüm Çapı (Dp)'), ('De', 'Dış Çap (De)'), ('Df', 'Flanş Çapı (Df)'), ('Dm', 'Göbek Çapı (Dm)'),
                 ('Di', 'Di Ölçüsü'), ('F', 'Kasnak Genişliği (F)'), ('L', 'Toplam Boy (L)'), ('S', 'S Ölçüsü'), ('R', 'R Ölçüsü')]:
        if k in D: s.append((l, D[k] + ' mm'))
    if d['fam'] != 'BTK' and d['d']: s.append(('Ön Delik (d)', d['d'] + ' mm'))
    if d['burc']: s.append(('Burç Tipi', d['burc']))
    if d['maxd']: s.append(('Maksimum Delik', d['maxd'] + ' mm'))
    if d['mat']: s.append(('Malzeme', d['mat']))
    s.append(('Diş Standardı', STD[d['prof']]))
    return s

def eksik(d):
    e = []
    for k in ['Dp', 'De', 'F']:
        if k not in d['dims']: e.append(k)
    if d['flans'] and 'Df' not in d['dims']: e.append('Df')
    if d['fam'] == 'BTK':
        if not d['burc']: e.append('burc')
        if not d['maxd']: e.append('maks_delik')
    elif not d['d']: e.append('on_delik')
    if not d['mat']: e.append('malzeme')
    return e

def name(d):
    t = 'Burçlu Triger Kasnak' if d['fam'] == 'BTK' else 'Triger Kasnak'
    n = '%s %s %s %s %s Diş %s' % (d['scode'], t, d['prof'], d['wc'], d['z'], 'Flanşlı' if d['flans'] else 'Flanşsız')
    if d['mat'] == 'Alüminyum': n += ' Alüminyum'
    if d['burc']: n += ' %s Burç' % d['burc']
    if 'De' in d['dims']: n += ' Ø%s mm' % d['dims']['De']
    elif d['d']: n += ' Delik %s mm' % d['d']
    return n

def seo_title(d):
    t = 'Burçlu Triger Kasnak' if d['fam'] == 'BTK' else 'Triger Kasnak'
    c = ['%s %s %s%s %s Diş %s' % (d['scode'], t, d['prof'], d['wc'], d['z'], 'Flanşlı' if d['flans'] else 'Flanşsız'),
         '%s %s %s%s %s Diş' % (d['scode'], t, d['prof'], d['wc'], d['z']),
         '%s %s %s%s' % (d['scode'], t, d['prof'], d['wc']), '%s %s' % (d['scode'], t)]
    for x in c:
        if len(x) <= 60: return x
    return c[-1][:60]

def seo_desc(d):
    D = d['dims']
    parts = ['%s %s %s%s' % (d['scode'], d['prof'], d['wc'], ' burçlu triger kasnak' if d['fam'] == 'BTK' else ' triger kasnak'),
             '%s diş' % d['z']]
    if 'Dp' in D: parts.append('Dp %s mm' % D['Dp'])
    if 'De' in D: parts.append('De %s mm' % D['De'])
    parts.append('flanşlı' if d['flans'] else 'flanşsız')
    if d['burc']: parts.append('%s burç' % d['burc'])
    elif d['d']: parts.append('%s mm ön delik' % d['d'])
    if d['mat']: parts.append(d['mat'].lower())
    tail = ' Yamansa, hızlı kargo.'
    s = ', '.join(parts) + '.'
    while len(s + tail) > 155 and len(parts) > 2:
        parts.pop(-1 if len(parts) > 4 else 2); s = ', '.join(parts) + '.'
    s = s[0].upper() + s[1:]
    return (s + tail) if len(s + tail) <= 155 else s[:155]

def asc(s):
    return s.translate(str.maketrans('çğıöşüÇĞİÖŞÜ', 'cgiosuCGIOSU'))

def keywords(d, limit, sep, decimal_comma):
    z, p, wc = d['z'], d['prof'], d['wc']; c = d['scode']; cc = c.replace(' ', '')
    raw = re.sub(r'^(BTK|TKX|TK)\s*', '', c)
    base = re.sub(r'(F?AL|F)$', '', raw)
    t = 'burçlu triger kasnak' if d['fam'] == 'BTK' else 'triger kasnak'
    k = [c, cc, raw, base, '%s %s %s' % (z, p, wc), '%s-%s-%s' % (z, p, wc), '%s%s%s' % (z, p, wc),
         '%s %s %s' % (p, wc, t), '%s%s %s' % (p, wc, t), '%s %s' % (p, t), '%s diş %s %s' % (z, p, t),
         '%s %s %s' % (z, p, wc) + ' ' + t]
    if d['flans']: k += ['flanşlı %s %s' % (p, t), 'flanşlı triger kasnak']
    else: k += ['flanşsız %s %s' % (p, t)]
    if d['fam'] == 'BTK':
        k += ['%s burçlu kasnak' % d['burc'] if d['burc'] else 'burçlu kasnak', 'taper burçlu triger kasnak', 'taper bush timing pulley']
    if d['mat'] == 'Alüminyum': k += ['alüminyum triger kasnak', 'aluminyum %s kasnak' % p]
    if p in ('3M', '5M', '8M'): k += ['htd %s kasnak' % p.lower(), 'HTD %s pulley' % p]
    k += ['triger dişli', 'triger dişli kasnak', 'zaman kayışı kasnağı', 'senkron kasnak', 'timing pulley %s' % p,
          '%s timing pulley %s teeth' % (p, z)]
    D = d['dims']
    for key in ('De', 'Dp'):
        if key in D:
            v = D[key]; k += ['%s mm %s' % (v if decimal_comma else dot(v), t), dot(v) + ' mm']
    if d['d']: k.append('%s mm delikli %s' % (d['d'], t))
    out = []; seen = set()
    for x in k + [asc(x) for x in k]:
        if not decimal_comma: x = x.replace(',', '.')
        xl = x.lower()
        if xl in seen: continue
        cand = sep.join(out + [x])
        if len(cand) > limit: continue
        seen.add(xl); out.append(x)
    return sep.join(out)

def onyazi(d):
    D = d['dims']; cells = []
    cells.append(('Profil', '%s (%s mm hatve)' % (d['prof'], PITCH[d['prof']])))
    cells.append(('Diş Sayısı', d['z']))
    if d['w']: cells.append(('Kayış Genişliği', d['w'] + ' mm'))
    for k, l in [('Dp', 'Bölüm Çapı'), ('De', 'Dış Çap'), ('Df', 'Flanş Çapı'), ('F', 'Genişlik (F)'), ('L', 'Toplam Boy')]:
        if k in D: cells.append((l, D[k] + ' mm'))
    if d['fam'] == 'BTK':
        if d['burc']: cells.append(('Burç', d['burc']))
        if d['maxd']: cells.append(('Maks. Delik', d['maxd'] + ' mm'))
    elif d['d']: cells.append(('Ön Delik', d['d'] + ' mm'))
    cells.append(('Flanş', 'Flanşlı' if d['flans'] else 'Flanşsız'))
    if d['mat']: cells.append(('Malzeme', d['mat']))
    cells.append(('Marka', 'Yamansa'))
    rows = [cells[i:i + 4] for i in range(0, len(cells), 4)]
    return '<table><tbody>' + ''.join('<tr>' + ''.join('<td><strong>%s</strong> %s</td>' % c for c in r) + '</tr>' for r in rows) + '</tbody></table>'

def a(u, t): return '<a href="%s">%s</a>' % (u, t)

def aciklama(d, nm):
    k = d['kod']; D = d['dims']; z, p, wc = d['z'], d['prof'], d['wc']; btk = d['fam'] == 'BTK'; c = d['scode']
    t = 'burçlu triger kasnak' if btk else 'triger kasnak'
    fl = 'flanşlı' if d['flans'] else 'flanşsız'
    dim = []
    if 'Dp' in D: dim.append('%s mm bölüm çapı (Dp)' % D['Dp'])
    if 'De' in D: dim.append('%s mm dış çap (De)' % D['De'])
    if 'F' in D: dim.append('%s mm kasnak genişliği (F)' % D['F'])
    dims = ', '.join(dim) if dim else 'kaynakta yayımlanan ölçüleri sınırlı'
    intro = pick(k, 'i', [
        '%s, %s profilli zaman kayışlarıyla çalışan %s dişli %s bir %sdır. %s mm kayış genişliğine göre işlenmiştir; %s değerlerine sahiptir.',
        '%s kodlu ürün, %s profil zaman kayışları için üretilmiş, %s dişe sahip %s bir %stır. Uyumlu kayış genişliği %s mm olup ölçüleri %s şeklindedir.',
        '%s; %s profilde, %s dişli ve %s yapıda bir %stır. %s mm genişlikteki kayışlar için tasarlanan kasnağın ana ölçüleri: %s.'])
    intro = intro % (c, p, z, fl, t, d['w'] or wc, dims)
    intro = intro.replace('kasnakdır', 'kasnaktır').replace('kasnaktır', 'kasnaktır')
    if d['mat']: intro += ' Gövde malzemesi %s.' % d['mat'].lower()
    intro += ' Ürün Yamansa güvencesiyle stoktan tedarik edilir.' if (d['stok'] or '0') not in ('0', '') else ' Ürün Yamansa güvencesiyle tedarik edilir.'
    s = []
    code_p = '<b>%s</b> ürün kodunda <b>%s</b> diş sayısını, <b>%s</b> diş profilini, <b>%s</b> ise kayış genişliğini gösterir' % (c, z, p, wc)
    if p in ('XL', 'L', 'H'): code_p += ' (inç cinsinden yüzde birlik değer: %s = %s mm)' % (wc, d['w'])
    else: code_p += ' (%s mm)' % d['w']
    code_p += '. '
    if d['flans']: code_p += 'Koddaki <b>F</b> harfi kasnağın flanşlı olduğunu belirtir. '
    if d['mat'] == 'Alüminyum': code_p += '<b>AL</b> eki alüminyum gövdeyi ifade eder. '
    if d['tip']: code_p += 'Üretici tablosunda tip kodu <b>%s</b> olarak verilmiştir.' % d['tip']
    s.append(('Ürün Kodu Ne Anlatıyor?', code_p))
    if p in ('XL', 'L', 'H'):
        pr = '%s profili, %s standardında tanımlı %s; diş hatvesi %s mm\'dir. Bu kasnak yalnızca %s profilli trapez dişli zaman kayışlarıyla eşleşir; T5/T10 veya HTD kayışlarla hatve farklı olduğundan birlikte kullanılamaz.' % (p, STD[p], PROFTXT[p], PITCH[p], p)
    elif p in ('T5', 'T10'):
        pr = '%s, %s standardındaki %s profilidir ve hatvesi %s mm\'dir. Metrik trapez dişler, kayışın kasnakta kaymadan senkron dönmesini sağlar; %s kasnağa yalnızca %s profilli kayış takılmalıdır.' % (p, STD[p], PROFTXT[p], PITCH[p], c, p)
    else:
        pr = '%s, yuvarlak (HTD) diş formuna sahip ve hatvesi %s mm olan bir profildir. Yuvarlak diş yapısı, kayış dişine geniş temas yüzeyi sağlayarak trapez profillere göre daha yüksek tork iletimine elverişlidir. %s kasnak, %s HTD zaman kayışlarıyla birlikte kullanılır.' % (p, PITCH[p], c, p)
    if 'Dp' in D: pr += ' Hesaplamalarda esas alınan bölüm çapı %s mm\'dir; kayışın hatve hattı bu çap üzerinde döner.' % D['Dp']
    s.append(('%s Diş Profili ve Hatve' % p, pr))
    if btk:
        bp = 'Bu kasnak konik burç (taper bush) ile mile bağlanır. '
        if d['burc']: bp += 'Kullanılacak burç tipi <b>%s</b>' % d['burc'] + (" olup bu burçla elde edilebilecek maksimum delik ölçüsü %s mm'dir. " % d['maxd'] if d['maxd'] else ' olarak belirtilmiştir. ')
        bp += 'Burç ayrı olarak seçilir; mil çapınıza uygun delikli burç ile kasnak, kama kanalı açmaya veya tornalamaya gerek kalmadan mile sıkıca oturur. Uygun burçlar için %s sayfasına bakabilirsiniz.' % a(L_KB, 'konik burçlar')
        s.append(('Konik Burç ile Bağlantı', bp))
    else:
        bp = ''
        if d['d']: bp += 'Kasnak %s mm ön delikli (pilot delik) olarak gelir; mil çapınıza göre delik büyütülüp kama kanalı ve vida deliği açılabilir. ' % d['d']
        else: bp += 'Ön delik ölçüsü kaynak tabloda belirtilmemiştir; sipariş öncesi mil bağlantısını teyit ediniz. '
        if 'Dm' in D: bp += 'Göbek çapı (Dm) %s mm' % D['Dm'] + (', toplam boy (L) %s mm' % D['L'] if 'L' in D else '') + ' olduğundan delik işlenirken et kalınlığı korunmalıdır.'
        s.append(('Mil Bağlantısı ve Delik', bp))
    if d['flans']:
        fp = 'Kasnağın iki yanındaki flanşlar, kayışın çalışma sırasında yana kaçmasını önler.'
        if 'Df' in D: fp += ' Flanş çapı (Df) %s mm\'dir; montaj alanında bu çap kadar boşluk bırakılmalıdır.' % D['Df']
        fp += pick(k, 'f', [' Genellikle iki kasnaklı sistemde en az bir kasnağın flanşlı olması önerilir.',
                            ' Özellikle dikey eksenli veya uzun mesafeli tahriklerde flanşlı kasnak kayışı yerinde tutar.',
                            ' Flanşlı yapı, hizalama toleransı dar olan sistemlerde kayış ömrünü korur.'])
        s.append(('Flanş Yapısı', fp))
    else:
        s.append(('Flanşsız Yapı', 'Flanşsız kasnaklar, aynı tahrikteki diğer kasnak flanşlı olduğunda ya da kayış yan kılavuzlarla yönlendirildiğinde tercih edilir. %s kasnağı kullanırken kayışın yana kaçmaması için karşı kasnağın flanşlı seçilmesi veya hizalamanın hassas yapılması gerekir.' % c))
    ua = {'XL': 'ofis makineleri, küçük ambalajlama üniteleri, yazıcı ve etiketleme mekanizmaları, hafif konveyörler ve otomatik kapı tahrikleri',
          'L': 'ambalajlama makineleri, tekstil makineleri, orta yüklü konveyörler, ağaç işleme makineleri ve gıda işleme hatları',
          'H': 'ağır konveyörler, ağaç işleme ve kesim makineleri, kompresörler, pompa tahrikleri ve endüstriyel otomasyon hatları',
          'T5': 'CNC eksenleri, lineer hareket sistemleri, 3D yazıcı ve plotter mekanizmaları, ölçüm cihazları ve hafif otomasyon',
          'T10': 'lineer eksenler, portal robotlar, ambalajlama makineleri, konveyör tahrikleri ve CNC tezgâh mekanizmaları',
          '3M': 'hassas konumlama sistemleri, küçük servo ve step motor tahrikleri, ofis ve tıbbi cihazlar, 3D yazıcılar',
          '5M': 'CNC ve takım tezgâhı eksenleri, servo motor tahrikleri, tekstil ve ambalajlama makineleri, otomasyon sistemleri',
          '8M': 'yüksek torklu güç aktarımı, takım tezgâhı iş milleri, pompa ve kompresör tahrikleri, ağır konveyörler ve tarım makineleri'}[p]
    up = pick(k, 'u', ['%s dişli bu %s; %s gibi alanlarda kullanılır.', 'Bu ölçüdeki %s dişli %s başlıca %s için tercih edilir.',
                       '%s dişe sahip %s, %s gibi uygulamalarda güç ve hareket aktarır.']) % (z, t, ua)
    up += ' Kaymasız ve senkron dönüş gereken her tahrikte V kayışa göre daha hassas zamanlama sağlar. Uyumlu kayışlar için %s ve %s kategorilerine, diğer ölçüler için %s sayfasına göz atabilirsiniz.' % (a(L_ZK, 'zaman kayışları'), a(L_TK, 'triger kayışı'), a(L_KAS, 'kasnaklar'))
    s.append(('Kullanım Alanları', up))
    mp = 'Kasnak seçerken diş profili ve hatvenin kayışla aynı olduğundan, kayış genişliğinin (%s mm) kasnak diş genişliğini aşmadığından emin olun.' % (d['w'] or wc)
    if 'Dp' in D: mp += ' Çevrim oranı, iki kasnağın diş sayıları oranına eşittir; %s dişli kasnak ile 2 kat devir düşürmek için %d dişli karşı kasnak gerekir.' % (z, int(z) * 2)
    mp += pick(k, 'm', [' Montajda iki kasnağın aynı düzlemde olmasına dikkat edin; eksen kaçıklığı kayışın kenarından aşınmasına yol açar.',
                        ' Kayışı kasnağa zorla, levyeyle geçirmeyin; motor tablasını gevşetip kayışı yerleştirdikten sonra gerginliği ayarlayın.',
                        ' Kayış gerginliğini üretici değerine göre ayarlayın; aşırı gerginlik rulmanları, yetersiz gerginlik diş atlamasını artırır.'])
    s.append(('Seçim ve Montaj İpuçları', mp))
    spec = specs(d)
    html = '<div class="urunTabAlt"><div class="ydsc"><div class="ym"><h2>%s</h2><p>%s</p>' % (nm, intro)
    html += ''.join('<div class="ysc"><h3>%s</h3><p>%s</p></div>' % x for x in s)
    html += '<h3>Teknik Özellikler</h3><ul>' + ''.join('<li><strong>%s:</strong> %s</li>' % x for x in spec) + '</ul>'
    html += '</div></div><div class="teknikDetay"></div></div>'
    return html

def group(d):
    if d['fam'] == 'BTK': return 'G9' if d['flans'] else 'G10'
    if d['mat'] == 'Alüminyum':
        if not d['flans']: return 'G4'
        return {'XL': 'G1', 'T5': 'G2', 'T10': 'G2', '3M': 'G3a', '5M': 'G3b'}[d['prof']]
    if d['tip'] and 'A' in d['tip']: return 'G8'
    if d['flans']: return 'G5' if d['prof'] in ('3M', '5M', '8M') else 'G6'
    return 'G7'

def build(p):
    d = parse(p); nm = name(d)
    t = 'BURÇLU TRİGER KASNAKLAR' if d['fam'] == 'BTK' else 'TRİGER KASNAKLAR'
    fl = []
    e = eksik(d)
    if e: fl.append('eksik:' + ','.join(e))
    if not d['src']: fl.append('kaynak_yok')
    tk = [d['src']] if d['src'] else []
    tk.append('Diş hatvesi/kayış genişliği: %s' % STD[d['prof']])
    if not d['src']: tk.insert(0, 'B2B ürün adı (ölçü tablosu yok)')
    r = {'kod': d['kod'], 'URUNADI': nm, 'MARKA': 'Yamansa', 'KATEGORI': 'KASNAKLAR>' + t, 'EK_KATEGORILER': ['KASNAKLAR'],
         'yeni_kategori': True, 'ONYAZI': onyazi(d), 'ACIKLAMA': aciklama(d, nm),
         'ANAHTARKELIME': keywords(d, 250, ',', False), 'SEO_SAYFABASLIK': seo_title(d), 'SEO_SAYFAACIKLAMA': seo_desc(d),
         'SEO_ANAHTARKELIME': keywords(d, 950, ', ', True), 'resim': 'gorseller/%s.jpg' % slug(nm),
         'resim_seviye': 'ayni_tip', 'resim_kaynak': None, 'grup': None, 'teknik_kaynak': ' | '.join(tk), 'bayraklar': fl, '_d': d}
    r['grup'] = group(d)
    if d['fam'] == 'TKX': fl.append('gorsel_flans_dogrulanmadi')
    return r

if __name__ == '__main__':
    out = [build(json.loads(l)) for l in gzip.open(SRC, 'rt')]
    json.dump([{k: v for k, v in r.items()} for r in out], open('/home/ubuntu/w/tmp/gen_all.json', 'w'), ensure_ascii=False)
    print(len(out))
