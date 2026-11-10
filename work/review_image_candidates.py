import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
PHOTO = ROOT / 'gorsel_kaynak'


def download(item):
    key, n, candidate = item
    path = PHOTO / ('candidate-' + key + '-' + str(n) + '.jpg')
    candidate['local'] = str(path.relative_to(ROOT.parent))
    if path.exists():
        return
    try:
        subprocess.run(['curl', '-sL', '--max-time', '18', '--max-filesize', '8000000', candidate['image'], '-o', str(path)], check=True, capture_output=True)
        with Image.open(path) as im:
            if min(im.size) < 100:
                candidate['error'] = 'small image'
    except Exception as e:
        candidate['error'] = str(e).splitlines()[0][:150]


def main():
    records = json.loads((ROOT / 'gorsel_tip_arama.json').read_text())
    jobs = [(key, n, c) for key, r in records.items() for n, c in enumerate(r.get('candidates', [])[:12]) if c.get('image')]
    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(download, jobs))
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
    for key, record in records.items():
        sheet = Image.new('RGB', (1000, 690), '#eeeeee')
        draw = ImageDraw.Draw(sheet)
        for n, candidate in enumerate(record.get('candidates', [])[:12]):
            x, y = (n % 4) * 250, (n // 4) * 230
            try:
                im = Image.open(ROOT.parent / candidate['local']).convert('RGBA')
                white = Image.new('RGBA', im.size, 'white')
                white.alpha_composite(im)
                im = white.convert('RGB')
                im.thumbnail((240, 190))
                sheet.paste(im, (x+(250-im.width)//2, y+(190-im.height)//2))
            except Exception:
                draw.text((x+5, y+80), 'unavailable', fill='red', font=font)
            draw.text((x+5, y+190), key + ' #' + str(n), fill='black', font=font)
            draw.text((x+5, y+207), candidate.get('title', '')[:32], fill='black', font=font)
        sheet.save(PHOTO / ('candidates-' + key + '.png'))
    (ROOT / 'gorsel_adaylar.json').write_text(json.dumps(records, ensure_ascii=False, indent=2)+'\n')
    print('Candidate sheets:', len(records), 'types;', len(jobs), 'source photographs attempted')


if __name__ == '__main__':
    main()
