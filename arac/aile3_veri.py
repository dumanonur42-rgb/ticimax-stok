"""Güç aktarım ailesi: kaynak satırları korunur, boş ölçü türetilmez."""
import gzip
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PREFIXES = ('ORK PD ', 'ORK KR ', 'ORK KRÖ ', 'ORK KRKA ', 'ORK MKİ ')
RACK_URL = 'https://orkapt.com/service/kremayer-raylar/'
MOTOR_LABELS = [f'Ölçü ({letter})' for letter in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'M', 'N', 'O', 'S']]
PINION_LABELS = ['Modül (m)', 'Diş Sayısı (Z)', 'Dış Çap (De)', 'Bölüm Dairesi Çapı (Dp)', 'Ölçü (d)', 'Ölçü (D)']


def selected():
    with gzip.open(ROOT / 'parca/lineer_diger.jsonl.gz', 'rt') as stream:
        return [row for line in stream if (row := json.loads(line))['kod'].startswith(PREFIXES)]


def value(text, source, unit='mm'):
    return {'deger': str(text).replace('.', ',') + (' ' + unit if unit else ''), 'kaynak': source}


def prepare(row):
    code = row['kod']
    if not code.startswith(PREFIXES):
        raise ValueError('Aile 3 dışında kod: ' + code)
    origin = 'girdi:parca/lineer_diger.jsonl.gz#' + code
    site = row.get('orka_site')
    raw = dict(kod=code, model=code.split()[-1], marka='Yamansa', degerler={}, bayraklar=[], girdi_birimi=row['birim'], girdi_kaynagi=origin, orka_site=site)
    values, flags = raw['degerler'], raw['bayraklar']
    if code.startswith('ORK PD '):
        raw['aile'] = 'PD'
        if not site or len(site['satir']) != 9:
            raise ValueError('Pinyon kaynak satırı eksik: ' + code)
        for label, number in zip(PINION_LABELS, site['satir'][2:8], strict=True):
            values[label] = value(number, site['url'], '' if label in PINION_LABELS[:2] else 'mm')
        module, teeth, _, pitch_diameter = [float(s.replace(',', '.')) for s in site['satir'][2:6]]
        if not math.isclose(module * teeth, pitch_diameter):
            named = re.search(r'M\s*(\d+)\s*\*\s*(\d+)', row['ad'])
            if named and math.isclose(float(named[1]), module) and math.isclose(module * int(named[2]), pitch_diameter):
                values['Diş Sayısı (Z)'] = value(named[2], origin + '; doğrulama:' + site['url'] + '#Dp=m×z', '')
                raw['dis_sayisi_duzeltmesi'] = f'Tablo hücresi {site["satir"][3]} hatalı; B2B adındaki {named[2]} diş, Dp={site["satir"][5]} ve m={site["satir"][2]} ile tutarlı.'
            else:
                flags.append(f'eksik: kaynak diş sayısı {site["satir"][3]}, ad ve Dp/modül oranıyla çelişkili; diş sayısı yayınlanmadı, üretici teyidi gerekiyor')
                del values['Diş Sayısı (Z)']
        flags.append('eksik: diş genişliği, göbek boyu ve malzeme kaynak satırında yok; d/D için çizim harfleri tabloyla eşleşmediğinden anlam atanmadı')
        raw['nominal'] = int(site['satir'][2])
    elif code.startswith('ORK MKİ '):
        raw['aile'] = 'MKI'
        if not site or len(site['satir']) != 16:
            raise ValueError('Motor kızağı kaynak satırı eksik: ' + code)
        for label, number in zip(MOTOR_LABELS, site['satir'][3:15], strict=True):
            values[label] = value(number, site['url'])
        raw['nominal'] = int(raw['model'])
        flags.append('eksik: kaynak motor-teknik.png, motor kızağı yerine ilgisiz araç çizimi; A…S harflerine ölçü anlamı atanmadı, sadece tablo değerleri kullanıldı')
    else:
        raw['aile'] = 'KR'
        module = int(re.search(r'\bM\s*(\d)', row['ad']).group(1))
        raw['nominal'] = module
        raw['kapi_alti'] = 'KRKA' in code
        if site:
            labels = ['Modül (m)', 'Diş Sayısı (Z)', 'Hatve (p)', 'Ölçü (hp)', 'Ölçü (he)', 'Ölçü (hs)', 'Boy (L)']
            for label, number in zip(labels, site['satir'][2:9], strict=True):
                values[label] = value(number, site['url'], '' if label in labels[:2] else 'mm')
            raw['kod_eslemesi'] = 'Girdi KRÖ, kaynak KR; açıklama M2 25*25*1000 aynıdır. Girdi kodu değiştirilmedi.'
        else:
            values['Modül (m)'] = value(module, origin, '')
            values['Hatve (p)'] = value(f'{math.pi * module:.2f}', 'hesap:p=π·m; ' + origin)
            dimensions = re.search(r'(\d+)\s*\*\s*(\d+)\s*\*\s*(\d+)', row['ad'])
            if dimensions:
                for label, number in zip(['Kesit Ölçüsü (a)', 'Kesit Ölçüsü (b)', 'Boy (L)'], dimensions.groups(), strict=True):
                    values[label] = value(number, origin)
            else:
                flags.append('eksik: ürün adında kesit ve boy ölçüsü yok; kod rakamlarından ölçü türetilmedi')
            flags.append('eksik: canlı kremayer tablosunda tam kod yok; diş sayısı, malzeme, hp/he/hs ve bağlantı delikleri aktarılmadı')
            raw['yeniden_arama'] = [RACK_URL, 'https://orkapt.com/service-cat/kremayer-raylar-pinyon-disliler/', 'https://orkapt.com/?s=kap%C4%B1']
            if raw['kapi_alti']:
                flags.append('eksik: KRKA kapı altı koduna özel üretici fotoğrafı/diş geometrisi bulunamadı; düz kremayer sınıflaması aynı tip kapı kremayeri görünüşüne dayanır')
        if not row['birim']:
            flags.append('eksik: girdide satış birimi boş; birim varsayılmadı')
    return raw


def main():
    records = [prepare(row) for row in selected()]
    (ROOT / 'veri/aile3.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    print(f'Aile 3 ham veri: {len(records)}')


if __name__ == '__main__':
    main()
