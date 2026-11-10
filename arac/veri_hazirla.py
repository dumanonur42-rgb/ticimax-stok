"""Resmi HG / PMI satırlarını satış ve çizim etiketlerine dönüştürür."""
import gzip
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HG = 'https://hiwin.com/wp-content/uploads/2026/08/HIWIN-Linear-Guideway-Catalog-1.pdf'
PMI = 'https://www.pmi-amt.com/en/supports/7Z/2022MD09%E8%8B%B1%E6%96%87%28%E8%B7%A8%E9%A0%81P159-300%29%20%282%29.pdf'


def fmt(value):
    return str(value).replace('.', ',')


def selected():
    with gzip.open(ROOT / 'parca/lineer_diger.jsonl.gz', 'rt') as stream:
        return [r for line in stream if (r := json.loads(line))['kod'].startswith(
            ('ORK LA HGH', 'ORK LA HGW', 'ORK LR HGR', 'PMI MSA', 'PMI MSB'))]


def parse_table(text, labels):
    return {parts[0]: dict(zip(labels.split(), parts[1:], strict=True))
            for line in text.strip().splitlines() if (parts := line.split())}


RAIL = parse_table('''
15 15 15 7.5 5.3 4.5 60 20 1.45
20 20 17.5 9.5 8.5 6 60 20 2.21
25 23 22 11 9 7 60 20 3.21
30 28 26 14 12 9 80 20 4.47
35 34 29 14 12 9 80 20 6.30
45 45 38 20 17 14 105 22.5 10.41
''', 'WR HR D h d P E kgm')

HGH = parse_table('''
20 30 4.6 12 44 32 6 50 65.2 92.2 12.6 6 12 M5x6 8 6 6 32.7 47.96 0.39
25 40 5.5 12.5 48 35 6.5 50 78.6 104.6 18.5 6 12 M6x8 8 10 9 42.2 69.07 0.69
30 45 6 16 60 40 10 60 93 120.4 21.75 6 12 M8x10 8.5 9.5 13.8 58.6 93.99 1.16
35 55 7.5 18 70 50 10 72 105.8 138.2 22.5 7 12 M8x12 10.2 16 19.6 77.9 122.77 1.92
45 70 9.5 20.5 86 60 13 80 128.8 171.2 28.9 10 12.9 M10x17 16 18.5 30.5 125.3 191.85 3.61
''', 'H H1 N W B B1 C L1 L K1 K2 G M T H2 H3 Cd C0 kg')

HGW = parse_table('''
15CC 24 4.3 16 47 38 4.5 30 39.4 61.4 8 4.85 5.3 M5 6 8.9 6.95 3.95 3.7 14.7 23.47 0.17
20CC 30 4.6 21.5 63 53 5 40 50.5 77.5 10.25 6 12 M6 8 10 9.5 6 6 27.1 36.68 0.40
20HC 30 4.6 21.5 63 53 5 40 65.2 92.2 17.6 6 12 M6 8 10 9.5 6 6 32.7 47.96 0.52
25CC 36 5.5 23.5 70 57 6.5 45 58 84 10.7 6 12 M8 8 14 10 6 5 34.9 52.82 0.59
25HC 36 5.5 23.5 70 57 6.5 45 78.6 104.6 21 6 12 M8 8 14 10 6 5 42.2 69.07 0.80
30CC 42 6 31 90 72 9 52 70 97.4 14.25 6 12 M10 8.5 16 10 6.5 10.8 48.5 71.87 1.09
30HC 42 6 31 90 72 9 52 93 120.4 25.75 6 12 M10 8.5 16 10 6.5 10.8 58.6 93.99 1.44
35CC 48 7.5 33 100 82 9 62 80 112.4 14.6 7 12 M10 10.1 18 13 9 12.6 64.6 93.88 1.56
35HC 48 7.5 33 100 82 9 62 105.8 138.2 27.5 7 12 M10 10.1 18 13 9 12.6 77.9 122.77 2.06
45CC 60 9.5 37.5 120 100 10 80 97 139.4 13 10 12.9 M12 15.1 22 15 8.5 20.5 103.8 146.71 2.79
45HC 60 9.5 37.5 120 100 10 80 128.8 171.2 28.9 10 12.9 M12 15.1 22 15 8.5 20.5 125.3 191.85 3.69
''', 'H H1 N W B B1 C L1 L K1 K2 G M T T1 T2 H2 H3 Cd C0 kg')

MSA_FLANGE = parse_table('''
15 24 47 56.3 16 4.2 38 30 39.3 7 11 7 M5x11 M5x7
20 30 63 72.9 21.5 5 53 40 51.3 7 10 12 M6x10 M6x10
25 36 70 81.6 23.5 6.5 57 45 59 11 16 12 M8x16 M8x10
30 42 90 97 31 8 72 52 71.4 11 18 12 M10x18 M10x10
35 48 100 111.2 33 9.5 82 62 81 13 21 11.5 M10x21 M10x13
45 60 120 137.7 37.5 10 100 80 102.5 13 25 13.5 M12x25 M12x15
''', 'H W L W2 H2 B C L1 T T1 G MA ME')
MSA_SQUARE = parse_table('''
15 28 34 56.3 9.5 4.2 26 26 39.3 7.2 7 M4x5
20 30 44 72.9 12 5 32 36 51.3 8 12 M5x6
25 40 48 81.6 12.5 6.5 35 35 59 10 12 M6x8
30 45 60 97 16 8 40 40 71.4 11.7 12 M8x10
35 55 70 111.2 18 9.5 50 50 81 12.7 11.5 M8x12
45 70 86 137.7 20.5 10 60 60 102.5 16 13.5 M10x17
''', 'H W L W2 H2 B C L1 T G M')
MSA_LONG = parse_table('''
20 88.8 67.2 50
25 100.6 78 50
30 119.2 93.6 60
35 136.6 106.4 72
45 169.5 134.3 80
''', 'L L1 C')
MSA_LOAD = parse_table('''
15 11.8 18.9 0.18 0.18
20 19.2 29.5 0.4 0.3
25 28.1 42.4 0.62 0.52
30 39.2 57.8 1.09 0.86
35 52.0 75.5 1.61 1.45
45 83.8 117.9 2.98 2.83
''', 'Cd C0 kgF kgS')
MSA_LONG_LOAD = parse_table('''
20 23.3 39.3 0.52 0.39
25 34.4 56.6 0.82 0.68
30 47.9 77.0 1.43 1.12
35 63.6 100.6 2.11 1.9
45 102.4 157.3 3.9 3.7
''', 'Cd C0 kgF kgS')
MSA_RAIL = parse_table('''
15 15 15 7.5 5.3 4.5 60 20 1.5
20 20 18 9.5 8.5 6 60 20 2.4
25 23 22 11 9 7 60 20 3.4
30 28 26 14 12 9 80 20 4.8
35 34 29 14 12 9 80 20 6.6
45 45 38 20 17 14 105 22.5 11.5
''', 'WR HR D h d P E kgm')
MSB_FLANGE = parse_table('''
15 24 52 57.2 18.5 4.5 41 26 40.5 5 7 5.5 M5x7
20 28 59 67 19.5 6 49 32 48 5 9 12 M6x9
25 33 73 82 25 7 60 35 60.5 7 10 12 M8x10
30 42 90 96.7 31 9.5 72 40 72 7 10 12 M10x10
35 48 100 112 33 9.5 82 50 80 9 13 12 M10x13
''', 'H W L W2 H2 B C L1 T T1 G M')
MSB_SQUARE = parse_table('''
15 24 34 57.2 9.5 4.5 26 26 40.5 6 5.5 M4x6
20 28 42 67 11 6 32 32 48 6 12 M5x7
25 33 48 82 12.5 7 35 35 60.5 8 12 M6x9
30 42 60 96.7 16 9.5 40 40 72 8 12 M8x12
35 48 70 112 18 9.5 50 50 80 12.5 11.5 M8x12
''', 'H W L W2 H2 B C L1 T G M')
MSB_LOAD = parse_table('''
15 10.0 16.9 0.21 0.16
20 13.9 23.6 0.34 0.26
25 22.3 36.9 0.60 0.45
30 32.9 53.1 1.08 0.82
35 52.0 75.5 1.61 1.13
''', 'Cd C0 kgF kgS')
MSB_RAIL = parse_table('''
15 15 12.5 6 4.5 3.5 60 20 1.2
20 20 15 9.5 8.5 6 60 20 2
25 23 18 11 9 7 60 20 3
30 28 23 11 9 7 80 20 4.4
35 34 27.5 14 12 9 80 20 6.2
''', 'WR HR D h d P E kgm')

LABELS = {'W': 'Genişlik (W)', 'H': 'Yükseklik (H)', 'L': 'Uzunluk (L)',
          'M': 'Vida (M x l)', 'WR': 'Ray Genişliği (WR)', 'HR': 'Ray Yüksekliği (HR)',
          'Cd': 'Dinamik Yük Kapasitesi', 'C0': 'Statik Yük Kapasitesi',
          'kg': 'Araba Ağırlığı', 'kgm': 'Ray Ağırlığı', 'boy': 'Boy'}


def values(dim, source):
    out = {}
    for key, value in dim.items():
        unit = ' kN' if key in ('Cd', 'C0') else ' kg' if key == 'kg' else ' kg/m' if key == 'kgm' else '' if key == 'M' else ' mm'
        out[LABELS.get(key, key)] = {'deger': fmt(value).replace('x', ' x ') + unit,
                                   'kaynak': source}
    return out


def main():
    families = {'hg': [], 'hgr': [], 'pmi': []}
    for row in selected():
        model = row['kod'].split()[-1]
        size = re.search(r'\d+', model)[0]
        raw = {'kod': row['kod'], 'model': model, 'nominal': size, 'bayraklar': []}
        if model.startswith(('HGH', 'HGW', 'HGR')):
            source = HG
            is_rail = model.startswith('HGR')
            dim = dict(RAIL[size]) if is_rail else dict(HGH[size] if model.startswith('HGH') else HGW[model[3:]])
            if not is_rail:
                dim.update({k: v for k, v in RAIL[size].items() if k in ('WR', 'HR')})
            raw['referans_degerler'] = values({k: dim.pop(k) for k in list(dim) if k in ('Cd', 'C0', 'kg', 'kgm')}, source)
            raw['bayraklar'].append('eksik: Yamansa ' + ('ray ağırlığı (kg/m)' if is_rail else 'dinamik/statik yük kapasitesi ve araba ağırlığı') + ' için üretici verisi yok; eşdeğer marka değerleri satış metnine aktarılmadı')
            if is_rail:
                dim['boy'] = '4000'
                raw['boy_kaynagi'] = 'parca/lineer_diger.jsonl.gz: ' + row['kod'] + ', 4 METRE'
            raw['pdf_sayfa'] = 41 if model.startswith('HGH') or is_rail else 45
            raw['satir'] = model if not is_rail else 'HGH' + size + 'CA: üstten havşalı HGR ray; HGR-T tablosu kullanılmaz'
            family = 'hgr' if is_rail else 'hg'
            raw['genis'] = model.startswith('HGW')
            raw['uzun'] = model.endswith(('HA', 'HC'))
        else:
            source = PMI
            series, suffix = re.fullmatch(r'(MSA|MSB)\d+(LA|LE|LS|A|E|S)(?:ZZ)?', model).groups()
            wide = suffix.endswith(('A', 'E'))
            long = suffix.startswith('L')
            seal = 'ZZ' if model.endswith('ZZ') else 'SS'
            geometry = MSA_FLANGE if series == 'MSA' and wide else MSA_SQUARE if series == 'MSA' else MSB_FLANGE if wide else MSB_SQUARE
            native = dict(geometry[size])
            if long:
                native.update({k: v for k, v in MSA_LONG[size].items() if k != 'C' or not wide})
            if 'MA' in native:
                native['M'] = native['MA' if suffix.endswith('A') else 'ME']
                del native['MA'], native['ME']
            load = (MSA_LONG_LOAD if long else MSA_LOAD)[size] if series == 'MSA' else MSB_LOAD[size]
            rail = MSA_RAIL[size] if series == 'MSA' else MSB_RAIL[size]
            raw['katalog_etiketleri'] = dict(native, **{'ray_' + k: v for k, v in rail.items()})
            # PMI H2: alt açıklık; W2: yanal taşma. PMI H1 ise ray yüksekliğidir.
            dim = {('H1' if k == 'H2' else 'N' if k == 'W2' else k): v for k, v in native.items()}
            dim.update({k: v for k, v in rail.items() if k in ('WR', 'HR', 'P', 'E')})
            dim.update({k: v for k, v in load.items() if k in ('Cd', 'C0')})
            if seal == 'ZZ':
                extra = {'15': 6, '25': 7, '30': 7, '35': 7.8}[size]
                dim['L'] = fmt(float(native['L']) + extra).replace(',', '.')
                raw['ZZ_boy_farki_mm'] = str(extra)
                raw['ZZ_boy_kaynagi'] = source + '#page=125'
                raw['referans_degerler'] = values({'kg': load['kgF' if wide else 'kgS']}, source)
                raw['bayraklar'].append('eksik: ZZ metal sıyırıcılı varyantın ayrı ağırlığı resmi tabloda yok; standart gövde ağırlığı satış metnine aktarılmadı')
            else:
                dim['kg'] = load['kgF' if wide else 'kgS']
            raw.update(genis=wide, uzun=long, seri=series, govde=suffix, conta=seal,
                       on_yuk='FC: hafif ön yük', hassasiyet='N: normal hassasiyet',
                       kod_kaynagi=source + ('#page=25' if series == 'MSA' else '#page=36'),
                       conta_kaynagi=source + '#page=122',
                       cizim_esleme={'H1': 'PMI H2 (alt açıklık)', 'N': 'PMI W2 (yanal taşma)', 'HR': 'PMI ray H1', 'WR': 'PMI ray W1'})
            raw['pdf_sayfa'] = (30 if suffix.endswith('A') else 31 if wide else 32) if series == 'MSA' else (41 if wide else 42)
            raw['satir'] = series + ' ' + size + ' ' + suffix
            family = 'pmi'
        raw['degerler'] = values(dim, source)
        if model.startswith('HGW'):
            raw['degerler']['Vida (M)'] = raw['degerler'].pop('Vida (M x l)')
        raw['kaynak'] = source
        families[family].append(raw)
    for family, records in families.items():
        (ROOT / f'veri/{family}.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    print('Ham veri: ' + ', '.join(f'{k}={len(v)}' for k, v in families.items()))


if __name__ == '__main__':
    main()
