"""Yerel önizleme; mağaza/panel erişimi veya yükleme içermez."""
import json
import re
from html import escape
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def main():
    items = [json.loads(line) for line in (ROOT / 'urunler.jsonl').read_text().splitlines() if line.strip()]
    css = (ROOT / 'ornek/yon.css').read_text()
    js = (ROOT / 'arac/onyazi.js').read_text()
    html = '''<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HGH 20HA ürün önizleme</title><style>
body{margin:0;background:#f4f6f9;color:#16203a;font:16px/1.75 Arial,sans-serif}header{background:#102741;color:white;padding:16px 5%;font-weight:bold}main{max-width:1160px;margin:24px auto;background:white;padding:28px;border-radius:16px}nav{font-size:12px;color:#607085}h1{font-size:28px;line-height:1.3}h2{font-size:24px}h3{font-size:19px;color:#12345a}.hero{display:grid;grid-template-columns:1fr 1fr;gap:32px}.photo{width:100%;max-width:500px}.draw{max-width:740px;margin:32px auto;border:1px solid #e3e8ef;border-radius:12px;padding:20px}.ysc{margin:24px 0}a{color:#b3132d}li{padding:4px 0}#divTabOzellikler ul{display:grid;grid-template-columns:1fr 1fr;gap:0 30px;padding-left:24px}footer{font-size:12px;color:#607085}''' + css + '''@media(max-width:700px){main{margin:8px;padding:16px}.hero{grid-template-columns:1fr;gap:8px}h1{font-size:23px}.draw{padding:4px}#divTabOzellikler ul{grid-template-columns:1fr}.yon{grid-template-columns:repeat(2,minmax(0,1fr))!important}.yon .oi{grid-column:auto!important}}</style><header>YAMANSA RULMAN · Yerel ürün önizleme</header><main><nav>Anasayfa / LİNEER / LİNEER ARABALAR</nav>'''
    targets = []
    for item in items:
        name = re.sub('[^A-Za-z0-9]', '_', item['kod'])
        svg = (ROOT / f'onizleme/{name}.svg').read_text()
        content = html.replace('HGH 20HA ürün önizleme', escape(item['URUNADI'])).replace('Anasayfa / LİNEER / LİNEER ARABALAR', escape('Anasayfa / ' + item['KATEGORI'].replace('>', ' / ')))
        content += '<h1>' + escape(item['URUNADI']) + '</h1><div class="hero"><img class="photo" src="../' + item['resim'] + '" alt="' + escape(item['URUNADI']) + '"><section><h3>Öne Çıkan Ölçüler</h3><div id="divOnyazi">' + item['ONYAZI'] + '</div></section></div><section class="draw"><h3>Teknik Çizim (mm)</h3>' + svg + '</section><div id="divTabOzellikler">' + item['ACIKLAMA'] + '</div><footer>Önizlemedir. Fiyat, stok veya yükleme işlemi içermez.</footer></main><script>' + js + ';YO();</script></html>'
        target = ROOT / f'onizleme/{name}.html'
        target.write_text(content)
        targets.append((name, target))
    index = '<!doctype html><html lang="tr"><meta charset="utf-8"><title>Aile 1 önizlemeleri</title><h1>52 ürün</h1><ul>' + ''.join('<li><a href="' + name + '.html">' + escape(item['URUNADI']) + '</a></li>' for (name, _), item in zip(targets, items)) + '</ul></html>'
    (ROOT / 'onizleme/index.html').write_text(index)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/home/ubuntu/.local/bin/google-chrome', headless=True, args=['--no-sandbox'])
        page = browser.new_page(device_scale_factor=1)
        examples = ['ORK_LA_HGH20HA', 'ORK_LR_HGR25_4', 'PMI_MSA30LE', 'PMI_MSB15S']
        for name, target in targets:
            for width in [1280, 390]:
                page.set_viewport_size({'width': width, 'height': 900})
                page.goto(target.as_uri())
                assert page.locator('.yon .oi').count() > 0, name
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), name
                if name in examples or name.startswith('ORK_LR_HGR25'):
                    filename = name + ('_mobil' if width == 390 else '') + '.png'
                    page.screenshot(path=str(ROOT / 'onizleme' / filename), full_page=True)
                    print(f'Önizleme: onizleme/{filename} ({width}px)')
            if name == 'ORK_LA_HGH20HA':
                page.set_viewport_size({'width': 900, 'height': 500})
                svg = (ROOT / f'onizleme/{name}.svg').read_text()
                page.set_content('<html><body style="margin:0;background:white">' + svg + '</body></html>')
                page.locator('svg').screenshot(path=str(ROOT / 'onizleme/hgh20ha-cizim.png'))
        print(f'HTML: {len(targets)} ürün; 1280/390 px taşma kontrolleri tamamlandı')
        browser.close()


if __name__ == '__main__':
    main()
