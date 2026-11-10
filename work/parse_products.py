import collections
import gzip
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def parse(row):
    code, name, brand = row['kod'], row['ad'], row['marka']
    kind = 'bakla' if 'ZİNCİR BAKLASI' in name else 'kilit' if 'ZİNCİR KİLİDİ' in name else 'disli' if 'ZİNCİR DİŞLİ' in name else 'zincir'
    match = re.search(r'\((\d{2}B)\*(\d)\)', name)
    iso, strands = (f'{match[1]}-{match[2]}', int(match[2])) if match else (None, 1)
    if not iso:
        match = re.search(r'([AC]2\d{3})', name)
        if match:
            iso = match[1]
        elif 'ASA 60*1' in name:
            iso = '12A-1'
        elif '415H' in name:
            iso = '415H'
        elif kind == 'disli':
            iso, strands = '16B-2', 2
    assert iso, code
    hp, ss = 'PİM DELİKLİ' in name, 'PASLANMAZ' in name
    family = 'disli' if kind == 'disli' else 'cift_hatve_hp' if hp and re.match('[AC]', iso) else 'cift_hatve' if re.match('[AC]', iso) else 'pim_delikli' if hp else '415H' if iso == '415H' else 'ansi' if 'A-' in iso else 'bs'
    package = re.search(r'\((\d+) AD/1 PKT\)', name)
    flags = []
    shown = 'Yamansa' if brand == 'ORKAPT' else brand
    if brand == 'SARI KUTU':
        shown = 'Natural'
        flags.append('marka_uyusmazligi:SARI KUTU/NATURAL')
    if code == 'NAT ZİN HP08B':
        shown = 'Natural'
        flags.append('marka_uyusmazligi:DECKEL/NATURAL; kullanici karari Natural')
    if code == 'CSE ZİN 06B2':
        shown = 'CSE'
        flags.append('marka_uyusmazligi:CSE (CZECH)/ARASHİ-TYCO-REXBO; kullanici karari CSE')
    if not brand:
        shown = 'Yamansa' if name.startswith('ORKA ') else None
        flags.append('ham_marka_bos')
    if code == 'AYZ ZİN 16B2':
        flags.append('ad_sira_celiskisi:1-1 SIRA fakat 16B*2')
    if code == 'ORK ZK P415H20':
        flags.extend(['paket_kod_ad_celiskisi:kod20/ad100; ad korunur', 'olcu_celiskisi:415H resmi KMC 3/16; ad 1/8; genislik yayinlanamaz'])
    if kind == 'disli':
        flags.append('disli_eslesmesi_dogrulanmadi:ad 1*2*09; kod icin uretici satiri bulunamadi')
    pitch = {'04B': None, '05B': None, '06B': '3/8', '08B': '1/2', '10B': '5/8', '12B': '3/4', '16B': '1', '20B': '1 1/4', '24B': '1 1/2', '28B': '1 3/4', '32B': '2', '12A': '3/4', '415H': '1/2', 'A2052': '1 1/4', 'C2042': '1', 'C2052': '1 1/4', 'C2062': '1 1/2', 'C2082': '2', 'C2102': '2 1/2'}[iso.split('-')[0]]
    return dict(kod=code, ad=name, marka=brand, birim=row['birim'], tip=kind, aile=family, iso_kod=iso, hatve_inc=pitch, sira=strands, paslanmaz=ss, pim_delikli=hp, paket_adet=int(package[1]) if package else None, gosterilecek_marka=shown, teknik_anahtar=('SS-' if ss else '') + ('HP-' if hp else '') + ('DISLI-' if kind == 'disli' else '') + iso, bayraklar=flags)


def main():
    rows = [json.loads(line) for line in gzip.open(ROOT / 'parca/zincir.jsonl.gz', 'rt')]
    result = [parse(row) for row in rows]
    duplicates = [k for k, n in collections.Counter(r['kod'] for r in result).items() if n > 1]
    for row in result:
        if row['kod'] in duplicates:
            row['bayraklar'].append('kopya_kod')
    (ROOT / 'work/urunler_parsed.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print('Parsed:', len(result), 'Duplicates:', duplicates)
    print('Tip:', dict(collections.Counter(r['tip'] for r in result)))
    print('Aile:', dict(collections.Counter(r['aile'] for r in result)))
    for row in result:
        if row['bayraklar']:
            print(row['kod'], '|', '; '.join(row['bayraklar']))


if __name__ == '__main__':
    main()
