"""İkinci aile girdisi ve doğrulanmış, modele bağlı teknik veriler."""
import gzip
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PREFIXES = ('ORK KKM ', 'ORK İM ', 'ORK ADM SAC', 'ORK LR TBR', 'ORK VM ', 'ORK VMS ', 'ETA VMS ', 'ORK VSG ')
TBR_SOURCE = 'https://www.kolmb.com.cn/en/prd-20.html'
DSG_SOURCE = 'https://www.wangong.net/product/coupling-nut-housing/bsg-dsg-series-aluminum-nut-housing.html'
SFU_SOURCE = 'https://www.wfint.com.tw/Ball-Screw-SFU-Series-DIN69051/Ball-Screw-Factory.html'
SFU_LIMON = 'https://www.hannovermesse.de/apollo/hannover_messe_2021/obs/Binary/A1090020/LIMON%20ball%20screw%20catalog-SFU.pdf'
SFU_COMMON = {
    '1605': '28 48 10 38 5.5 40 M6 3.175',
    '2005': '36 58 10 47 6.6 44 M6 3.175',
    '2505': '40 62 10 51 6.6 48 M6 3.175',
    '3210': '50 80 12 65 9 62 M6 6.35',
    '4010': '63 93 14 78 9 70 M8 6.35',
    '5010': '75 110 16 93 11 85 M8 6.35',
}
TBR = {
    16: '62 26 8 42 50 31 30 M5',
    20: '68 31 10 51 54 34 37 M6',
    25: '82 41 12 65 65 41 50 M8',
    30: '91 48 12 75 75 45.5 60 M8',
}
DSG = {
    16: '28 52 40 20 12 40 8 24 40 M5 38 M5',
    20: '36 62 44 22 12 40 8 24 48 M6 47 M6',
    25: '40 66 48 24 13 40 8 24 50 M6 51 M6',
    32: '50 86 62 31 17 40 8 24 66 M8 65 M8',
}


def selected():
    with gzip.open(ROOT / 'parca/lineer_diger.jsonl.gz', 'rt') as stream:
        return [row for line in stream if (row := json.loads(line))['kod'].startswith(PREFIXES)]


def value(number, source, unit='mm'):
    return {'deger': str(number).replace('.', ',') + (' ' + unit if unit else ''), 'kaynak': source}


def prepare(row):
    code = row['kod']
    if not code.startswith(PREFIXES):
        raise ValueError('Aile 2 dışında kod: ' + code)
    source = 'girdi:parca/lineer_diger.jsonl.gz#' + code
    model = code.split()[-1]
    size = int(re.search(r'\d+', model).group())
    group = 'KKM' if code.startswith('ORK KKM') else 'IM' if code.startswith('ORK İM') else 'SAC' if ' ADM ' in code else 'TBR' if ' TBR' in code else 'SFU' if ' VMS ' in code else 'DSG' if ' VSG ' in code else 'VM'
    raw = dict(kod=code, model=model, aile=group, marka='ETAZON' if code.startswith('ETA ') else 'Yamansa', degerler={}, bayraklar=[])
    values = raw['degerler']
    if group in ['KKM', 'IM']:
        values.update({'Mil Çapı (dr)': value(size, source), 'Boy (Lm)': value(4000, source)})
        raw['bayraklar'].append('eksik: ürüne özgü tolerans, HRC sertlik, malzeme, krom kalınlığı ve kg/m kanıtı yok; yalnız çap/boy kullanıldı')
        raw['bayraklar'].append('eksik: ' + ('ilave indüksiyon işlemi doğrulanmadı' if group == 'KKM' else 'krom kaplama uygulanıp uygulanmadığı doğrulanmadı'))
    elif group == 'SAC':
        match = re.fullmatch(r'SAC(\d{2})(\d{4})', model)
        size, length = map(int, match.groups())
        values.update({'Mil Çapı (d)': value(size, source), 'Boy (L)': value(length, source)})
        raw['bayraklar'].append('eksik: aynı SAC boyunda katalog kesitleri farklı; Yamansa kesit ve delik düzeni doğrulanmadı, SBR ölçüleri aktarılmadı')
        raw['referans_kaynaklar'] = ['https://www.ersarulman.com/tr-TR/sac/3/15/97', 'https://fycrulman.com/wp-content/uploads/2021/09/katalog.pdf']
    elif group == 'VM':
        size, pitch = int(model[:2]), int(model[2:])
        length = int(re.search(r'\*(\d+)\s*MM', row['ad']).group(1))
        values.update({'Mil Çapı (d)': value(size, source), 'Vida Adımı (Ph)': value(pitch, source), 'Boy (L)': value(length, source)})
        raw['bayraklar'].append('eksik: hassasiyet, ön yük, malzeme, bilya çapı ve yük kapasitesi ürüne özgü kaynakla doğrulanmadı')
    elif group == 'SFU':
        size, pitch = int(model[3:5]), int(model[5:])
        values.update({'Mil Çapı (d)': value(size, source), 'Vida Adımı (Ph)': value(pitch, source)})
        labels = ['Somun Gövde Çapı (D)', 'Flanş Çapı (A)', 'Flanş Kalınlığı (B)', 'Delik Dairesi Çapı (W)', 'Bağlantı Delik Çapı (X)', 'Flanş Yüksekliği (H)', 'Yağlama Dişi (Q)', 'Bilya Çapı (Da)']
        for label, n in zip(labels, SFU_COMMON[model[3:]].split(), strict=True):
            values[label] = value(n, SFU_SOURCE + '; ortak ölçü karşılaştırması:' + SFU_LIMON, '' if n.startswith('M') else 'mm')
        raw['bayraklar'].append('eksik: sirkülasyon eki belirtilmemiş; bulunan kaynak satırlarının ortak montaj ölçüleri kullanıldı; varyanta bağlı L, sirkülasyon sayısı ve yükler aktarılmadı')
        if model == 'SFU5010':
            raw['bayraklar'].append('eksik: iki katalogda da yalnız SFU5010-4 satırı bulundu; -3 boyu varsayılmadı, yalnız iki kaynakta eşleşen kesit/montaj ölçüleri kullanıldı')
        if raw['marka'] == 'ETAZON':
            raw['bayraklar'].append('eksik: ETAZON resmi katalog bulunamadı; kullanıcı onayıyla aynı SFU baz kodunun ortak geometrisi alındı, marka yükü/ağırlığı aktarılmadı')
        raw['referans_kaynaklar'] = [SFU_SOURCE, SFU_LIMON]
    elif group == 'TBR':
        labels = ['Gövde Ölçüsü (W)', 'Gövde Ölçüsü (G)', 'Gövde Ölçüsü (A)', 'Gövde Ölçüsü (L)', 'Gövde Ölçüsü (B)', 'Gövde Ölçüsü (D)', 'Gövde Ölçüsü (C)', 'Bağlantı Dişi (S1)']
        values['Mil Çapı (d)'] = value(size, source)
        for label, number in zip(labels, TBR[size].split(), strict=True):
            values[label] = value(number, TBR_SOURCE, '' if number.startswith('M') else 'mm')
        raw['bayraklar'].append('eksik: Yamansa yük ve ağırlık kanıtı yok; eş kodlu katalogdan yalnız montaj geometrisi kullanıldı')
    elif group == 'DSG':
        values['Uyumlu Mil Çapı (d)'] = value(size, DSG_SOURCE)
        values['Malzeme'] = value('Alüminyum', source, '')
        if size in DSG:
            labels = ['Somun Yuva Çapı (D)', 'Gövde Genişliği (B)', 'Gövde Yüksekliği (H)', 'Eksen Yüksekliği (h)', 'Gövde Ölçüsü (E)', 'Gövde Uzunluğu (L)', 'Gövde Ölçüsü (C1)', 'Gövde Ölçüsü (C2)', 'Bağlantı Aralığı (P)', 'Bağlantı Dişi (X)', 'Bağlantı Aralığı (W)', 'Bağlantı Dişi (Y)']
            for label, number in zip(labels, DSG[size].split(), strict=True):
                values[label] = value(number, DSG_SOURCE, '' if number.startswith('M') else 'mm')
        else:
            raw['bayraklar'].append('eksik: DSG40H için üretici katalogları arasında H/h/L/C2/P farkı var; kesit ölçüsü doğrulanana kadar aktarılmadı')
            raw['referans_kaynaklar'] = [DSG_SOURCE, 'https://www.powerbelt.hu/uploads/source/Lintech/katalog/Limon_DSG.pdf']
    raw['nominal'] = size
    raw['girdi_kaynagi'] = source
    return raw


def main():
    records = [prepare(row) for row in selected()]
    (ROOT / 'veri/aile2.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    print('Aile 2 ham veri: ' + str(len(records)))


if __name__ == '__main__':
    main()
