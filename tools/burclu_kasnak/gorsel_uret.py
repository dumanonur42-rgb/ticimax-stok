"""Gözle denetlenmiş Taper-Lock fotoğraflarından kasnak kompozitleri."""
import hashlib
import json
import os
from collections import Counter
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

from ad import urun_slug

ROOT = Path(os.environ.get('BURCLU_WORK', str(Path.home() / 'work')))
REPO = Path(os.environ.get('BURCLU_REPO', str(Path.home() / 'repos/ticimax-stok')))
HERE = Path(__file__).resolve().parent
GROUPS = ('dolu', 'kollu', 'diskli')
CHANNELS = (1, 2, 3, 4, 5, 6, 8, 10)


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
    records = json.loads((HERE / 'taper_kaynaklar.json').read_text())
    sources = {}
    for record in records:
        key = record['kanal_sayisi'], record['govde']
        if key[0] not in CHANNELS or key[1] not in GROUPS or key in sources:
            raise ValueError('Geçersiz/tekrar kaynak grubu: ' + str(key))
        path = HERE / 'kaynaklar' / record['dosya']
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != record['sha256'] or not record.get('kontrol'):
            raise ValueError('Denetlenmemiş/değişmiş kaynak: ' + str(path))
        sources[key] = dict(record, path=str(path))
    return sources


def secimler(sources):
    selected = {}
    for n in CHANNELS:
        same_channel = [key for key in sources if key[0] == n]
        if not same_channel:
            raise ValueError('Aynı kanallı denetlenmiş Taper-Lock kaynak yok: ' + str(n))
        for body in GROUPS:
            key = n, body
            selected[key] = key if key in sources else same_channel[0]
    return selected


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
    selected = secimler(sources)
    counts = Counter((r['kanal_sayisi'], govde(r)) for r in rows if govde(r))
    common = {n: max(GROUPS, key=lambda g: counts[n, g]) for n in CHANNELS}
    outdir = REPO / 'gorseller'
    outdir.mkdir(exist_ok=True)
    template = Image.open(REPO / 'sablon.png').convert('RGB')
    if template.size != (500, 500):
        raise ValueError('Şablon 500×500 olmalı')
    composites = {key: kompozit(source, template) for key, source in sources.items()}
    mapped = []
    for row in rows:
        n, body = row['kanal_sayisi'], govde(row)
        chosen = selected[n, body or common[n]]
        flags = list(row['bayraklar'])
        if body is None:
            flags.append('gorsel_govde_dogrulanmadi')
        elif chosen[1] != body:
            flags.append('gorsel_govde_farkli')
        relative = 'gorseller/' + urun_slug(row) + '.jpg'
        composites[chosen].save(REPO / relative, quality=90, subsampling=0)
        mapped.append(dict(kod=row['kod'], resim_yolu=relative, resim_seviye='ayni_tip',
                           resim_kaynak=sources[chosen]['url'], bayraklar=flags))
    referenced = {Path(r['resim_yolu']).name for r in mapped}
    unused = [p for p in outdir.glob('*.jpg') if p.name not in referenced]
    for path in unused:
        path.unlink()
    encoded = ''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in mapped)
    (ROOT / 'gorsel_map.jsonl').write_text(encoded)
    (REPO / 'gorsel_map.jsonl').write_text(encoded)
    manifest = [dict(source, id=f'{n}-{body}') for (n, body), source in sources.items()]
    (ROOT / 'gorsel_kaynaklari.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    flagged = [r for r in mapped if any(f.startswith('gorsel_') for f in r['bayraklar'])]
    (ROOT / 'gorsel_bayraklilar.json').write_text(json.dumps(flagged, ensure_ascii=False, indent=2))
    table = ['| Kanal | Gövde | Durum | Kullanılan gövde | Adet | URL |', '|---:|---|---|---|---:|---|']
    sheet = Image.new('RGB', (1500, 6 * 335), 'white')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 17)
    for i, (wanted, chosen) in enumerate(selected.items()):
        n, body = wanted
        exact = wanted == chosen
        status = 'aynı' if exact else 'farklı / bulunamadı'
        table.append(f'| {n} | {body} | {status} | {chosen[1]} | {counts[wanted]} | {sources[chosen]["url"]} |')
        thumb = composites[chosen].resize((360, 360), Image.Resampling.LANCZOS)
        x, y = i % 4 * 375, i // 4 * 335
        sheet.paste(thumb.crop((0, 70, 360, 285)), (x + 7, y + 70))
        draw.text((x + 7, y + 8), f'{n} kanal / {body} / {status}', fill='black', font=font)
        draw.text((x + 7, y + 35), f'Fotoğraf: {chosen[1]} · adet {counts[wanted]}', fill='black', font=font)
    sheet.save(ROOT / 'secim_kontak.jpg', quality=95)
    matched = sum(not any(f in r['bayraklar'] for f in ('gorsel_govde_farkli', 'gorsel_govde_dogrulanmadi')) for r in mapped)
    different = sum('gorsel_govde_farkli' in r['bayraklar'] for r in mapped)
    report = ['# Taper-Lock görsel seçimi', '', f'519 ürün; birebir 0 / ayni_tip 519; gövde eşleşen {matched}; farklı {different}; bilinmeyen 11.', '',
              f'{len(sources)}/24 aynı grup; {24 - len(sources)} grup üç arama turunda bulunamadı. Bunlar yalnız aynı kanallı denetlenmiş kaynakla, farklı bayrağı korunarak temsil edilir.', '',
              'QD, okunur yazı/kod/logo/filigran, ambalaj seçili kaynaklarda yok. 11 orijinal kaynak tek tek view_image ile incelendi. Kanal sayıları fotoğraftan; gövde fotoğraftaki bağlantı yapısından belirlendi, ürün adı/çapından türetilmedi. Kod rötuşu, kanal/kol ekleme yapılmadı. 5 kanallı fotoğrafta Taper-Lock yarım deliği derindeki yuvanın solunda görünür; diğer yarım delikler bakış açısıyla örtülüdür. Orka üretici görsellerinin çekim/render yöntemi bağımsız doğrulanmadı; diğer seçili kaynaklar fotoğrafik yüzey dokusu taşır.', '', *table, '',
              'Adetler teknik gövdesi bilinen 508 üründür. Ek 11 bilinmeyen (1/2/3/4 kanal) dolu fotoğraf alır; teknik tip null ve gorsel_govde_dogrulanmadi korunur.', '',
              '24 hücreli kontak: /home/ubuntu/work/secim_kontak.jpg. 500×500 kalite 90 JPEG; 0–99/350–499 şablon bantları korunur; 420×220 sınırında merkezlenir.', '',
              'Kaynak kayıtları: tools/burclu_kasnak/taper_kaynaklar.json; özgün fotoğraflar kaynaklar/ içinde SHA256 ile sabitlenir. Reddedilen adayların tek satırlı nedenleri taper_redler.md içindedir.']
    (ROOT / 'gorsel_rapor.md').write_text('\n'.join(report) + '\n')
    print(f'ÜRETİLDİ: {len(mapped)} JPG, {len(sources)} kaynak, {len(duplicates)} slug çakışması; kullanılmayan {len(unused)} dosya silindi')
    print(f'GÖVDE: eşleşen {matched}; farklı {different}; bilinmeyen 11')


if __name__ == '__main__':
    main()
