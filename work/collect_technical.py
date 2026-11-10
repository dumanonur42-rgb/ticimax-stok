import copy
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / 'work'
IWIS = 'https://iwis.com/antriebssysteme-drive-systems/as-catalogs/ecoplus/ecoplus-catalog-roller-chains-iwis.pdf'
SEDIS = 'https://www.sedis.com/fichiers/uploads/sedis-principal-products-bs-chains-european-series-20-22.pdf'
FIELDS = ['p', 'b1', 'd1', 'd3', 'h', 'pt', 'b2', 'F1', 'kopma_min_kn', 'agirlik_kg_m', 'pim_delik_capi']


def measurement(value, source, page=None, scope='standart_esdeger_olcu'):
    return dict(deger=value, kaynak=source, sayfa=page, kapsam=scope)


def iwis_profiles():
    result = {}
    page = 0
    for line in (WORK / 'kaynaklar/iwis-ecoplus.txt').read_text().splitlines():
        if line.startswith('PAGE '):
            page = int(line.split()[1])
        match = re.match(r'\s*(\d{2}[AB]-[123])\s+(.*)', line)
        if not match or page not in (4, 5, 6, 7):
            continue
        code, tail = match.groups()
        tokens = tail.split()
        if code.endswith('-1') and 'A' in code:
            tokens.pop(0)
        if tokens[0] == '1':
            tokens.pop(0)
        # The plate-thickness cell is a ratio, not a measurement in this schema.
        vals = [float(x.replace(',', '.')) for x in tokens if '/' not in x]
        keys = ['p', 'b1', 'd3', 'd1', 'F1', 'b7', 'b2', 'h']
        if not code.endswith('-1'):
            keys.append('pt')
        keys += ['kopma_min_kn', 'agirlik_kg_m', 'yatak_alani_cm2']
        assert len(vals) == len(keys), (code, vals)
        result[code] = {k: measurement(v, IWIS, page, 'iwis_ecoplus_urun') for k, v in zip(keys, vals)}
    return result


def sedis_profiles():
    result = {}
    text = (WORK / 'kaynaklar/sedis-bs.txt').read_text().split('PAGE 2')[0]
    for code in ['10B-2', '12B-1', '16B-1', '20B-1']:
        line = next(x for x in text.splitlines() if x.startswith(code + ' '))
        tokens = re.sub(r'\([12]\)\*?', '', line).split()
        vals = [float(x.replace(',', '.')) if x != '.' else None for x in tokens[2:] if x != 'x']
        keys = ['p', 'd3', 'b1', 'F1', 'd1', 'h', 'pt', 'b7', 'iso_kopma_min_kn', 'delta_hr_kopma_min_kn', 'delta_hr_kopma_nom_kn', 'titanium_kopma_min_kn', 'lubfree_kopma_min_kn', 'verte_kopma_min_kn', 'agirlik_kg_m']
        assert len(vals) == len(keys), (code, vals)
        result[code] = {k: measurement(v, SEDIS, 'PDF 1 / basılı 20', 'sedis_delta_aralik_seri_dogrulanmadi') for k, v in zip(keys, vals) if v is not None}
        if code == '20B-1':
            result[code].pop('d1')
    return result


def main():
    rows = json.loads((WORK / 'urunler_parsed.json').read_text())
    profiles = iwis_profiles()
    sedis = sedis_profiles()
    extra = {
        '04B-1': ('https://www.iwis.com/en-en/products-services/roller-chain-04b-1-elite~p3210', [6, 2.8, 1.85, 4, 5, None, 4.15, 6.8, 3, .12]),
        '05B-1': ('https://www.iwis.com/en-en/products-services/roller-chain-05b-1-elite~p3212', [8, 3, 2.31, 5, 7.11, None, 4.77, 8.6, 4.4, .20]),
        '05B-2': ('https://www.iwis.com/en-en/products-services/roller-chain-05b-2-elite~p3240', [8, 3, 2.31, 5, 7.11, 5.64, 4.77, 14.3, 7.8, .33]),
    }
    for code, (url, values) in extra.items():
        profiles[code] = {k: measurement(v, url, scope='iwis_ELITE_katalog_referansi') for k, v in zip(FIELDS, values) if v is not None}
    technical = {}
    for key in sorted(set(r['teknik_anahtar'] for r in rows)):
        products = [r for r in rows if r['teknik_anahtar'] == key]
        row = products[0]
        code = row['iso_kod']
        fields = dict.fromkeys(FIELDS)
        notes = []
        refs = {}
        profile = profiles.get(code)
        if row['tip'] == 'disli':
            fields['p'] = measurement(25.4, 'parca/zincir.jsonl.gz#ORK ZD 1209', scope='ham_ad_1_inc; ISO_eslesmesi_onaysiz')
            notes.append('Dişli dış çapı, bölüm çapı, delik, göbek ve kalınlık yok. 16B-2 eşlemesi yalnız 1 inç/çift sıra adına dayanır; üretici kod satırı bulunamadı.')
        elif row['pim_delikli']:
            if profile:
                fields['p'] = copy.deepcopy(profile['p'])
                fields['p']['kapsam'] = 'ayni_kod_hatve; HP_pim_olculeri_degildir'
            else:
                pitches = {'A2052': 31.75, 'C2042': 25.4, 'C2052': 31.75, 'C2062': 38.1, 'C2082': 50.8, 'C2102': 63.5}
                fields['p'] = measurement(pitches[code], 'https://chains.ustsubaki.com/viewitems/hollow-pin-chain/double-pitch-type-hollow-pin-chain', scope='C2042HPB-C2082HPB_hatve') if code in ['C2042', 'C2052', 'C2062', 'C2082'] else measurement(pitches[code], 'parca/zincir.jsonl.gz#' + row['kod'], scope='kullanici_karari_koddan_hatve')
            notes.append('HP adı pim iç/dış çapını tek başına tanımlamaz. Standart dolu pim çapı HP ürününe aktarılmadı; farklı üretici HP serisi ölçüleri yayınlanamaz.')
            refs['karsilastirma_url'] = ['https://www.beltingonline.com/product/wippermann-08b-1-bs-hollow-pin-chain/', 'http://www.beijingthc.com/stainless_steel_chain/bsdin_ansi_short_stainless_hollow_pin_chains.html', 'https://chains.ustsubaki.com/viewitems/hollow-pin-chain/double-pitch-type-hollow-pin-chain']
            hp_reference = {
                'C2042': [25.4, 7.95, 5.68, 15.88, 12, 19.10, 4, .82],
                'C2052': [31.75, 9.53, 7.22, 19.05, 15, 23.40, 5.12, 1.21],
                'C2062': [38.1, 12.70, 8.38, 22.23, 17.20, 28.70, 5.99, 2.06],
                'C2082': [50.8, 15.88, 11.38, 28.58, 23, 35.70, 8.02, 2.81],
            }.get(code)
            if hp_reference:
                hp_url = 'https://tsubaki.eu/products/chain/attachment-chain/ansi-standard-attachment-chain/ansi-double-pitch-hp/'
                refs['Tsubaki_RF_HP_R_uyumluluk_dogrulanmadi'] = {k: measurement(v, hp_url, scope='yalniz_Tsubaki_RF_HP_R; Yamansa_olcusu_degildir') for k, v in zip(['p', 'b1', 'd1', 'd3', 'h', 'F1', 'pim_delik_capi', 'agirlik_kg_m'], hp_reference)}
        elif profile:
            for field in ['p', 'b1', 'd1', 'd3', 'h', 'pt']:
                if field in profile:
                    fields[field] = copy.deepcopy(profile[field])
                    fields[field]['kapsam'] = 'ISO606_DIN8187_ayni_kod_esdeger_olcu' if 'B' in code else 'ISO606_DIN8188_ANSI60_ayni_kod_esdeger_olcu'
            refs['iwis'] = profile
            notes.append('Kullanıcı kararı: aynı ISO kodda h dahil standart geometri uygulanır. b2, F1 ve kg/m yalnız üretici profilinde; zincir pim boyu kilit boyu değildir.')
        elif code.endswith('-4'):
            base = profiles[code[:-1] + '3']
            for field in ['p', 'b1', 'd1', 'd3', 'h', 'pt']:
                fields[field] = copy.deepcopy(base[field])
                fields[field]['kapsam'] = 'ayni_B_serisi_temel_bakla_olcusu; 4_sira_toplam_olcusu_degildir'
            notes.append('Dört sıralı tam katalog satırı bulunamadı; toplam pim boyu, dayanım ve ağırlık hesaplanmadı.')
        elif code == '415H':
            fields['p'] = measurement(12.7, 'https://www.kmc-international.com/motorcycle.html', scope='415H_kod_hatvesi')
            refs['KMC_415H_yayinlanamaz'] = {k: measurement(v, 'https://www.kmc-international.com/motorcycle.html', scope='yalniz_KMC; girdi_genisligi_celisiyor') for k, v in {'p': 12.7, 'b1': 4.7, 'd3': 7.77, 'd1': 3.97, 'h': 12, 'F1': 13.10}.items()}
            notes.append('Girdi 1/2 x 1/8, resmi KMC 415H 12,7 x 4,7 (3/16) mm. Paket kodu 20, ad 100. Yalnız hatve kullanılabilir; uyumluluk iddiası yasak.')
        elif code in ['A2052', 'C2052', 'C2062']:
            url = 'http://www.beijingthc.com/transmission_drive_chain/ansi_double_pitch_transmission_roller_chains.html' if code.startswith('A') else 'https://www.donghua.co.uk/downloads/doublepitchconveyorchains.pdf'
            vals = {'A2052': [31.75, 9.4, 5.08, 19.05, 15.0], 'C2052': [31.75, 9.4, 5.08, 19.05, 15.0], 'C2062': [38.1, 12.57, 5.94, 22.23, 18.0]}[code]
            for field, value in zip(['p', 'b1', 'd1', 'd3', 'h'], vals):
                fields[field] = measurement(value, url, 31 if code.startswith('C') else None, 'ayni_ANSI_kod_ISO1275_esdeger_geometri')
            ref_values = {'A2052': {'F1': 20.5, 'Lc': 21.9, 'kopma_min_kn': 21.8, 'agirlik_kg_m': 1.14}, 'C2052': {'F1': 20.7, 'Lc': 22.2, 'kopma_min_kn': 22.2, 'agirlik_kg_m': 1.27}, 'C2062': {'F1': 25.9, 'Lc': 27.7, 'kopma_min_kn': 31.8, 'agirlik_kg_m': 1.61}}[code]
            refs['katalog_ureticisine_ozel'] = {k: measurement(v, url, 31 if code.startswith('C') else None, 'yalniz_kaynak_uretici; Yamansa_performansi_degildir') for k, v in ref_values.items()}
            notes.append('Son rakam 2: büyük makara. A2052 küçük makaralı A2050 ile karıştırılmamalı. Bu kaynakta A2052 de 19,05 mm büyük makara; A/C farkını küçük/büyük makara diye yazmak hatalı.')
        if not row['paslanmaz'] and not row['pim_delikli'] and row['tip'] == 'zincir' and profile:
            fields['kopma_min_kn'] = copy.deepcopy(profile['kopma_min_kn'])
            fields['kopma_min_kn']['kapsam'] = 'ISO606_minimum; uretici_ortalama_kopma_degeri_degildir'
        for value in fields.values():
            if value and value['kapsam'].startswith(('ISO606_', 'ayni_B_serisi_')):
                value['teknik_kaynak'] = 'ISO 606 standard tablosu (' + value['kaynak'] + ')'
        brand_specific = {}
        for product in products:
            if product['marka'] == 'İWİS':
                brand_specific[product['kod']] = dict(durum='resmi_marka_seri', olculer=profiles[code])
            elif product['marka'] == 'SEDİS':
                brand_specific[product['kod']] = dict(durum='resmi_marka_seri_belirsiz', olculer=sedis[code], notlar='Girdi DELTA/ALPHA/VERTE serisini belirtmiyor. Referans DELTA. Seri doğrulanmadan h, pim boyu, ağırlık, kopma yayımlanamaz.')
            elif product['gosterilecek_marka'] != 'Yamansa':
                brand_specific[product['kod']] = dict(durum='resmi_marka_kaynagi_bulunamadi', olculer=None, notlar='ISO kod eşdeğer geometrisi araştırma fallbackidir; kullanıcı gerçek marka için resmi kaynak istiyor. Yayın öncesi eksik işaretle, marka performansı diye kullanma.')
        technical[key] = dict(iso_kod=code, sira=row['sira'], paslanmaz=row['paslanmaz'], pim_delikli=row['pim_delikli'], olculer=fields, uygulanmaz=['pt'] if row['sira'] == 1 else [], urun_kodlari=[r['kod'] for r in products], marka_verileri=brand_specific, katalog_referanslari=refs, notlar=notes, bayraklar=['eksik'] if row['pim_delikli'] or code == '415H' else [])
    site = json.loads(subprocess.check_output(['git', 'show', 'origin/site-assets:site/draw/data/zincir_disli.json'], cwd=ROOT))
    comparisons = []
    for path, dims in site.items():
        match = re.match(r'/(\d{2}b)-1-', path)
        code = match[1].upper() + '-1' if match else None
        if code not in profiles:
            continue
        diffs = {k: {'site': dims[k], 'iwis': profiles[code][k]['deger']} for k in ['p', 'b1', 'd1', 'd3', 'h', 'b2', 'F1'] if k in profiles[code] and dims[k] != profiles[code][k]['deger']}
        comparisons.append(dict(iso_kod=code, farklar=diffs))
    (WORK / 'teknik.json').write_text(json.dumps(technical, ensure_ascii=False, indent=2) + '\n')
    (WORK / 'kaynak_karsilastirma.json').write_text(json.dumps(comparisons, ensure_ascii=False, indent=2) + '\n')
    print('Technical variant records:', len(technical))
    print('Official brand products: iwis', sum(r['marka'] == 'İWİS' for r in rows), '/ Sedis (series unresolved)', sum(r['marka'] == 'SEDİS' for r in rows))
    print('Site-vs-iwis differences:', [x for x in comparisons if x['farklar']])


if __name__ == '__main__':
    main()
