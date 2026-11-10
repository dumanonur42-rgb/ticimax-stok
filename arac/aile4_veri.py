"""Son 46 girdinin kaynakları; benzer kodların ölçüleri satışa aktarılmaz."""
import gzip
import json
import re
from pathlib import Path

from aile3_veri import value

ROOT = Path(__file__).resolve().parents[1]
PREFIXES = ('ORK BMT ', 'ORK PM ', 'ORK GKT ', 'ORK YKKM ', 'ORK KK ')
ROD = 'https://www.finerpt.com/site/DefaultSite/filesystem/documents/Finer%20Catalogue%20Files/Bearings%20-%20Rod%20Ends/Stainless%20Steel%20Rod%20Ends/SS%20Rod%20Ends.pdf'
TECHPRIM = 'https://www.en.techprim.pl/offer/ball-transfer-units-omni-wheels-rack-multi-directional-transfer-units/ball-transfer-units-series-ef/ball-transfer-units-with-solid-body-and-flange/'
WIRE = 'https://file.gedik.com.tr/portal/approval_documents/geka-sg-2-tr_6278a8d8217cb.pdf?v=1652074703'
LOCK = 'https://www.konikkilit.com/_ekler/122-1583389614-ctl-250-tablo.pdf'
SITE_LOCK = 'https://www.yamansarulman.com/konik-kilit-250-s-tipi-04065-17617'
NL = 'https://www.transferunits.com/product/NL-8H-Drop-in-Plastic-Nylon-Ball-Roller.html'
BALL_LABELS = ['Ana Bilya Çapı (Dw)', 'Gövde Çapı (D)', 'Flanş Çapı (D1)', 'Ölçü (h)', 'Toplam Yükseklik (H)', 'Ölçü (b)']


def selected():
    with gzip.open(ROOT / 'parca/lineer_diger.jsonl.gz', 'rt') as stream:
        return [r for line in stream if (r := json.loads(line))['kod'].startswith(PREFIXES)]


def prepare(row):
    code = row['kod']
    if not code.startswith(PREFIXES):
        raise ValueError('Aile 4 dışında kod: ' + code)
    origin = 'girdi:parca/lineer_diger.jsonl.gz#' + code
    raw = dict(kod=code, model=code.split()[-1], marka='Yamansa', girdi_adi=row['ad'], girdi_birimi=row['birim'], girdi_kaynagi=origin, degerler={}, bayraklar=[], incelenen_kaynaklar=[])
    v, flags = raw['degerler'], raw['bayraklar']
    model = raw['model']
    if code.startswith('ORK BMT '):
        raw['aile'] = 'BMT'
        if 'PASLANMAZ BİLYALI' in row['ad']:
            v['Ana Bilya Malzemesi'] = value('Paslanmaz', origin, '')
        elif 'PLASTİK BİLYALI' in row['ad']:
            v['Ana Bilya Malzemesi'] = value('Plastik', origin, '')
        if model == 'CY16B2':
            v['Ölçü (Dp)'] = value('5/8 inç', origin, '')
            v['Gövde Tipi'] = value('Yuvarlak model', origin, '')
        elif model == 'CY25A':
            source = 'https://www.slidingbearings.com/Product/5147985851.html'
            v['Ana Bilya Çapı (Dw)'] = value('25.4', source)
            v['Montaj Tipi'] = value('İki cıvata bağlantılı flanş', origin, '')
            v['Bilya Malzemesi'] = value('Karbon çeliği', source, '')
            v['Önerilen Yük Kapasitesi'] = value('25', source, 'kg')
            raw['incelenen_kaynaklar'].append(source)
        elif model in ['IA19', 'IA25']:
            source = 'https://www.slidingbearings.com/Product/' + ('4967821313' if model == 'IA19' else '1896301434') + '.html'
            if model == 'IA19':
                v['Ana Bilya Çapı (Dw)'] = value('19', source)
            v['Montaj Tipi'] = value('Tabla bağlantılı', origin, '')
            v['Yük Kapasitesi'] = value('80' if model == 'IA19' else '130', source, 'kg')
            raw['incelenen_kaynaklar'].append(source)
        elif model == 'NL8H':
            v['Malzeme'] = value('Komple plastik', origin, '')
            v['Ana Bilya Çapı (Dw)'] = value('8', NL)
            v['Montaj Tipi'] = value('Yuvaya oturtmalı', NL, '')
            v['Önerilen Yük Kapasitesi'] = value('2', NL, 'kg')
            raw['incelenen_kaynaklar'].append(NL)
        elif model in ['SP12AFL', 'SP15AFL']:
            v['Montaj Tipi'] = value('Cıvata bağlantılı flanş', origin, '')
        elif model == 'SP12BF':
            v['Montaj Tipi'] = value('Flanşlı', origin, '')
            flags.append('eksik: girdi kodu SP12BF fakat adı SP12B flanşlı; flanşsız SP12B katalog ölçüleri bu varyanta aktarılmadı')
        elif model == 'SP12B':
            source = 'https://www.newball.it/en/prodotto/sp12b/'
            for label, number in zip([BALL_LABELS[i] for i in [0, 1, 3, 4]], ['12.700', '22', '5.5', '17.5'], strict=True):
                v[label] = value(number, source)
            v['Montaj Tipi'] = value('Flanşsız, yuvaya oturtmalı', source, '')
            v['Yük Kapasitesi'] = value('10', source, 'kg')
            raw['incelenen_kaynaklar'].append(source)
        elif model in ['SP15B', 'SP15C', 'SP22B', 'SP30B', 'SP45B']:
            source = 'https://www.newball.it/en/prodotto/' + model.lower() + '/'
            dimensions = {'SP15B': ['24', '31', '9.5', '21', '5.5'], 'SP15C': ['24', '31', '9.5', '21', '5.5'], 'SP22B': ['36', '45', '9.8', None, None], 'SP30B': ['45', '55', None, None, '8'], 'SP45B': ['62', '75', '19', None, '10']}[model]
            for label, number in zip(BALL_LABELS[1:], dimensions, strict=True):
                if number is not None:
                    v[label] = value(number, source)
            v['Montaj Tipi'] = value('Flanşlı, yuvaya oturtmalı', source, '')
            raw['incelenen_kaynaklar'] += [source, TECHPRIM]
            flags.append('eksik: aynı kodda New Ball ve Techprim bilya çapı/yük değerleri farklı; çelişen değerler ve yuvarlaması farklı H/h/b hücreleri aktarılmadı, ortak geometrik ölçüler korundu')
        elif model in ['SP15A', 'SP22C', 'SP25B', 'SP30C', 'SP60B']:
            dimensions = {'SP15A': ['15', '24', '31', '9.5', '21', '5.5'], 'SP22C': ['22', '36', '45', '9.8', '31', '6'], 'SP25B': ['25', '38', '46', '13', '31', '7'], 'SP30C': ['30', '45', '55', '14', '37', '8'], 'SP60B': ['60', '100', '117', '30', '78', '15']}[model]
            for label, number in zip(BALL_LABELS, dimensions, strict=True):
                v[label] = value(number, TECHPRIM)
            v['Montaj Tipi'] = value('Flanşlı, yuvaya oturtmalı', TECHPRIM, '')
            raw['incelenen_kaynaklar'].append(TECHPRIM)
            flags.append('eksik: ölçüler tam kodlu Techprim SP tablosundan; yük ve malzeme kalitesi için Yamansa varyant teyidi yok, aktarılmadı')
        if not v:
            v['Seri'] = value(model, origin, '')
        flags.append('eksik: tam varyantın tüm gövde, montaj ve malzeme detayları doğrulanamadı; listede bulunmayan ölçü/yük varsayılmadı')
    elif code.startswith('ORK PM '):
        raw['aile'] = 'PM'
        female = model.startswith('SSPHS')
        v['Malzeme'] = value('Paslanmaz', origin, '')
        v['Diş Tipi'] = value('İç dişli' if female else 'Dış dişli', ROD, '')
        raw['incelenen_kaynaklar'].append(ROD)
        flags.append('eksik: bulunan SSPHS/SSPOS kataloğu R/A eklerini tanımlamıyor; R sağ diş eşlemesi ve tam varyant doğrulanamadı, baz seri ölçüleri/yükleri aktarılmadı; R kodu A ile değiştirilmedi')
        if re.search(r'(14|18)R$', model):
            flags.append('eksik: bulunan paslanmaz seri tablosunda 14/18 satırı da yok; ara ölçü hesaplanmadı')
    elif code.startswith('ORK GKT '):
        raw['aile'] = 'GKT'
        diameter = re.search(r'-\s*([\d,]+)\s*MM', row['ad']).group(1)
        v['Tel Çapı (d)'] = value(diameter, origin)
        v['Tel Sınıfı'] = value('SG2 / MG2', origin, '')
        v['Standart Sınıf Eşdeğerliği'] = value('EN ISO 14341-A G3Si1 / AWS ER70S-6', WIRE, '')
        v['Satış Birimi'] = value('Adet', origin + '; kullanıcı paket/Adet kuralı', '')
        v['Ambalaj'] = value('15 kg/paket', origin, '')
        raw['incelenen_kaynaklar'].append(WIRE)
        flags.append('eksik: SG2 sınıf eşdeğerliği Gedik teknik föyünden; Yamansa parti sertifikası, akım aralığı ve kimyasal/mekanik değerleri yok, aktarılmadı')
    elif code.startswith('ORK YKKM '):
        raw['aile'] = 'YKKM'
        v['Kapı Ağırlığı Kapasitesi'] = value(model, origin, 'kg')
        flags.append('eksik: tam kodlu üretici kaynağı bulunamadı; voltaj, güç, hız, modül, kumanda, görev çevrimi ve dişli verileri yazılmadı')
    else:
        if model != 'S060':
            raise ValueError('Beklenmeyen konik kilit: ' + model)
        raw['aile'] = 'KK'
        v['İç Çap (d)'] = value('60', origin + '; çap sırası doğrulaması:' + LOCK + '; ' + SITE_LOCK)
        v['Dış Çap (D)'] = value('90', origin + '; çap sırası doğrulaması:' + LOCK + '; ' + SITE_LOCK)
        v['Tip'] = value('S tipi (250 tipi)', origin, '')
        raw['incelenen_kaynaklar'] += [LOCK, SITE_LOCK]
        flags.append('eksik: site S040 metni 40×65 için d×D, ek JPEG ise aynı 65 değerini L diye adlandırıyor; 250 üretici tablosunda 38/40/42/45/48/50 modelleri site adlarıyla d×D olarak eşleşiyor ve CTL250-60 satırı d=60 D=90 veriyor; bu nedenle 60×90 d×D alındı, çelişkili site L etiketi kullanılmadı; diğer boylar ve Yamansa tork/yük değerleri aktarılmadı')
    return raw


def main():
    rows = [prepare(r) for r in selected()]
    (ROOT / 'veri/aile4.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
    print(f'Aile 4 ham veri: {len(rows)}')


if __name__ == '__main__':
    main()
