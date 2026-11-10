"""Denetlenmiş kaynak fotoğraflarından kasnak kompozitleri."""
import json
import os
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

from ad import urun_adi, urun_slug

ROOT = Path(os.environ.get('BURCLU_WORK', str(Path.home() / 'work')))
REPO = Path(os.environ.get('BURCLU_REPO', str(Path.home() / 'repos/ticimax-stok')))
GROUPS = ('dolu', 'kollu', 'diskli')


def govde(row):
    tip = row.get('tip')
    if tip in (1, 2, 3, 8, 9):
        return 'dolu'
    if tip in (4, 5):
        return 'kollu'
    if tip in (6, 7):
        return 'diskli'
    return None


def kaynaklar():
    metadata = []
    for name in ('photos/candidates.json', 'photos2/candidates.json', 'photos3/candidates.json',
                 'photos6/candidates.json', 'surplus_photos.json', 'photos/direct.json'):
        metadata.extend(json.loads((ROOT / name).read_text()))
    choices = [
        (1, 'dolu', 'f553de40757c4d88.jpg'),
        (2, 'dolu', 'c958b6bfeab30fe6.jpg'),
        (3, 'dolu', '8445915c8158a946.jpg'),
        (4, 'dolu', '78f39b193eb6ba24.jpg'),
        (4, 'diskli', '512e66d9b36baf10.jpg'),
        (5, 'dolu', '2226e602882ee635.jpg'),
        (5, 'kollu', '84577ce9074b544a.jpg'),
        (6, 'dolu', '5fe38c641a43792a.jpg'),
        (8, 'diskli', 'bf0ba8d805887ddd.jpg'),
        (10, 'diskli', 'c4ddf3ec83f053a4.jpg'),
    ]
    sources = {}
    for channel, body, filename in choices:
        record = next(r for r in metadata if Path(r['path']).name == filename)
        sources[channel, body] = dict(record, kanal_sayisi=channel, govde=body)
        if (channel, body) in ((3, 'dolu'), (5, 'kollu')):
            sources[channel, body]['background'] = 'white'
    sources[1, 'kollu'] = dict(
        url='https://orkapt.com/wp-content/uploads/2020/03/SPA-BURÇLU-V-KASNAKLAR.jpg',
        page='https://orkapt.com/service/spa-burclu-v-kasnaklar/',
        path=str(ROOT / 'm_SPA-BURÇLU-V-KASNAKLAR.jpg'), kanal_sayisi=1, govde='kollu')
    sources[3, 'kollu'] = dict(
        url='https://orkapt.com/wp-content/uploads/2020/04/v-kasnak-ic.jpg',
        page='https://orkapt.com/service/3-kanal-2/', path=str(ROOT / 'v-kasnak-ic.jpg'),
        kanal_sayisi=3, govde='kollu')
    return sources


def kompozit(source, template):
    im = Image.open(source['path']).convert('RGB')
    working = im.copy()
    working.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
    pixels = np.array(working)
    minimum = pixels.min(axis=2)
    mask = minimum < (245 if source.get('background') == 'white' else 135)
    components, count = ndimage.label(mask)
    if not count:
        raise ValueError('Kaynak fotoğraf boş: ' + source['path'])
    sizes = np.bincount(components.ravel())
    sizes[0] = 0
    mask = components == sizes.argmax()
    if source.get('background') != 'white':
        labels = np.full(mask.shape, cv2.GC_PR_BGD, dtype='uint8')
        labels[mask] = cv2.GC_PR_FGD
        labels[minimum > 230] = cv2.GC_BGD
        labels[ndimage.binary_erosion(mask & (minimum < 100), iterations=3)] = cv2.GC_FGD
        cv2.grabCut(pixels, labels, None, np.zeros((1, 65)), np.zeros((1, 65)), 5, cv2.GC_INIT_WITH_MASK)
        mask = (labels == cv2.GC_FGD) | (labels == cv2.GC_PR_FGD)
    components, _ = ndimage.label(mask)
    sizes = np.bincount(components.ravel())
    sizes[0] = 0
    mask = components == sizes.argmax()
    matte = Image.fromarray(mask.astype('uint8') * 255).resize(im.size, Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(.7))
    bbox = matte.getbbox()
    if bbox is None:
        raise ValueError('Kaynak fotoğraf boş: ' + source['path'])
    im = Image.composite(im, Image.new('RGB', im.size, 'white'), matte).crop(bbox)
    im.thumbnail((420, 220), Image.Resampling.LANCZOS)
    out = template.copy()
    ImageDraw.Draw(out).rectangle((0, 100, 499, 349), fill='white')
    out.paste(im, ((500 - im.width) // 2, 100 + (250 - im.height) // 2))
    return out


def main():
    rows = [json.loads(line) for line in (ROOT / 'veri.jsonl').read_text().splitlines()]
    slugs = Counter(urun_slug(row) for row in rows)
    duplicates = {slug: count for slug, count in slugs.items() if count > 1}
    (ROOT / 'slug_cakismalari.json').write_text(json.dumps(duplicates, indent=2))
    if duplicates:
        raise ValueError('Slug çakışması: ' + str(duplicates))
    sources = kaynaklar()
    counts = Counter((row['kanal_sayisi'], govde(row)) for row in rows if govde(row))
    common = {n: max(GROUPS, key=lambda g: counts[n, g]) for n in (1, 2, 3, 4, 5, 6, 8, 10)}
    selected = {}
    for n in common:
        for body in GROUPS:
            key = (n, body)
            selected[key] = key if key in sources else next(k for k in sources if k[0] == n)
    outdir = REPO / 'gorseller'
    outdir.mkdir(exist_ok=True)
    template = Image.open(REPO / 'sablon.png').convert('RGB')
    if template.size != (500, 500):
        raise ValueError('Şablon 500×500 olmalı')
    composites = {key: kompozit(source, template) for key, source in sources.items()}
    mapped = []
    group_rows = defaultdict(list)
    for row in rows:
        n, body = row['kanal_sayisi'], govde(row)
        wanted = body or common[n]
        chosen = selected[n, wanted]
        flags = list(row['bayraklar'])
        if body is None:
            flags.append('gorsel_govde_dogrulanmadi')
        if chosen[1] != wanted:
            flags.append('gorsel_govde_farkli')
        relative = 'gorseller/' + urun_slug(row) + '.jpg'
        composites[chosen].save(REPO / relative, quality=90, subsampling=0)
        mapped.append(dict(kod=row['kod'], resim_yolu=relative, resim_seviye='ayni_tip',
                           resim_kaynak=sources[chosen]['url'], bayraklar=flags))
        group_rows[n, body].append(dict(row, yeni_ad=urun_adi(row), resim_yolu=relative))
    (ROOT / 'gorsel_map.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in mapped))
    manifest = [dict(source, id=f'{n}-{body}') for (n, body), source in sources.items()]
    (ROOT / 'gorsel_kaynaklari.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    visual_flags = [{**r, 'gorsel_bayraklari': [f for f in r['bayraklar'] if f.startswith('gorsel_')]}
                    for r in mapped if any(f.startswith('gorsel_') for f in r['bayraklar'])]
    (ROOT / 'gorsel_bayraklilar.json').write_text(json.dumps(visual_flags, ensure_ascii=False, indent=2))
    examples = []
    for n, body in ((1, 'dolu'), (3, 'kollu'), (4, 'diskli'), (6, 'dolu'), (10, 'kollu')):
        examples.append((f'{n} {body}', group_rows[n, body][0]['resim_yolu']))
    kys = next(r for r in mapped if r['kod'].startswith('KYS '))
    examples.append(('KYS', kys['resim_yolu']))
    report = [
        '# Burçlu V kasnak görselleri', '',
        f'519 ürün; birebir 0; ayni_tip 519; slug çakışması {len(duplicates)}.',
        f'{len(sources)} kaynak grubu; {24 - len(sources)} grup aynı kanallı farklı gövde fallback. Gövde farklı: {sum("gorsel_govde_farkli" in r["bayraklar"] for r in mapped)} ürün. Gövdesi bilinmeyen: 11 ürün.', '',
        '## Kaynak denetimi',
        'Orka: allmedia.txt ve orka_photo_audit.json içindeki 21 seri URL curl -skL ile kontrol edildi; tamamında aynı v-kasnak-ic.jpg + teknik çizim v-kasnak-resim.jpg var. Model bazlı fotoğraf bulunmadı. SPA/SPB/SPC kapakları aynı tek kanallı kollu ürünü gösteriyor (iki jant dudağı arasında tek V oluk); SPA kapak fotoğrafı 1 kollu için seçildi. SPZ kapak fotoğrafında cepheden oluklar sayılamıyor; kullanılmadı. v-kasnak-ic: 3 oluk, delikli/kollu gövde; yazı/logo/ambalaj yok.',
        'KYS resmi sayfada SPB 180-3 tablo satırı var; modele bağlı tekil fotoğraf yok. Genel kategori kolajı birebir sayılmadı. KYS için de 3 dolu ayni_tip kullanıldı.',
        'Bütün seçilen kaynaklar view_image ile incelendi: oluklar sayılabilir, ambalaj/filigran/logo/okunur model kodu yok. Dolu: kapalı, kolsuz kompakt gövde; diskli: kapalı geri konumlu web, ayrı jant ve iç göbek; kollu: açık pencereler/kollar. Bazı bayi fotoğrafları QD burçlu serilerdendir; aynı marka/model/ölçü/burç iddiası yok, yalnız kanal × gövde eşleşmesi kullanıldı. CAD/teknik çizim kullanılmadı. Orka fotoğrafik üretici görsellerinin çekim/render üretim yöntemi bağımsız doğrulanamadı; kullanıcı tarafından fotoğraf olarak verilen bu kaynaklar aynı tip için kabul edildi.',
        'Arama kayıtları photo_pages*.json, photos*/pages.json, candidates.json; Chiaravalli işaretli göbekler, Bearing Revolution/ Bearings R Us filigranları, Metal Rulman renderları, HTK logolu renderları, EMW 8 kollu okunur gövde kodları ve 10 kanal sayfasında 8 oluk gösteren temsili fotoğraflar reddedildi. Ampro, Motion, Purvis, Tristate adayları 403; Kothari ve Blackstar 429. 24 özgün grubun tamamı bulunmuş gibi gösterilmedi.', '',
        '## Grup → orijinal fotoğraf URL', '',
        '| Kanal | İstenen gövde | Kullanılan gövde | Adet | Durum | URL |',
        '|---:|---|---|---:|---|---|',
    ]
    for (n, body), chosen in sorted(selected.items()):
        status = 'aynı grup' if chosen[1] == body else 'gorsel_govde_farkli'
        report.append(f'| {n} | {body} | {chosen[1]} | {counts[n, body]} | {status} | {sources[chosen]["url"]} |')
    report += ['', '11 bilinmeyen gövde kaynak veride null kaldı. Aynı kanalda en yaygın gövde dolu (1/2/3/4) seçildi; yalnız gorsel_govde_dogrulanmadi eklendi. Tüm görsel bayraklı kodlar: gorsel_bayraklilar.json; mevcut teknik bayraklar map içinde korundu.', '',
               '## Kompozitler', '500×500 JPEG kalite 90; şablonun 0–99 ve 350–499 bantları korunur; ürün beyaz 100–349 alanına, en çok 420×220 boyutta ortalanır. Oluk/kol üretme, kod silme veya ürün geometrisi değiştirme yapılmaz.', '',
               '## Altı örnek (repo köküne göre)', '']
    for label, path in examples:
        report.append(f'- {label}: `{path}`')
    report += ['', '10 kollu örneği talep edilen ürün grubudur; fotoğrafı 10 diskli fallback, map içinde gorsel_govde_farkli bayraklıdır.', '',
               '## Yeniden üretim', '`/home/ubuntu/work/photoenv/bin/python /home/ubuntu/work/gorsel_uret.py`',
               'Bağımlılıklar: Pillow, NumPy, SciPy, opencv-python-headless. OpenCV yalnız work/photoenv ortamına kuruldu; repo/shared bağımlılık dosyaları değiştirilmedi. Kaynak dosyalar gorsel_kaynaklari.json içinde.']
    (ROOT / 'gorsel_rapor.md').write_text('\n'.join(report) + '\n')
    print(f'ÜRETİLDİ: {len(mapped)} JPG, {len(sources)} kaynak, {len(duplicates)} slug çakışması')


if __name__ == '__main__':
    main()
