"""Son ürün JPG'lerinden kimlikli kontrol paftası üretir."""
import json

from PIL import Image, ImageDraw, ImageFont

from aile_hazirla import ROOT


def sheet(rows, target, columns=7):
    canvas = Image.new('RGB', (columns * 200, ((len(rows) + columns - 1) // columns) * 225), '#f1f3f6')
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
    for i, row in enumerate(rows):
        image = Image.open(ROOT / row['resim']).convert('RGB')
        image.thumbnail((195, 195))
        x, y = i % columns * 200, i // columns * 225
        canvas.paste(image, (x, y))
        draw.text((x + 4, y + 197), row['kod'], font=font, fill='#102741')
    canvas.save(ROOT / target, quality=95)


def main():
    rows = [json.loads(line) for line in (ROOT / 'urunler.jsonl').read_text().splitlines()]
    extra_codes = {r['kod'] for r in json.loads((ROOT / 'veri/aile2.json').read_text())}
    sheet([r for r in rows if r['kod'] in extra_codes], 'onizleme/aile2-kontak.jpg')
    sheet([r for r in rows if r['kod'].startswith('ORK LA ')], 'onizleme/aile1-araba-kontrol.jpg', columns=4)
    print('Kontak: onizleme/aile2-kontak.jpg (56 ürün)')


if __name__ == '__main__':
    main()
