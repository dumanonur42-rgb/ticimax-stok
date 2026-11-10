"""Render three local, static product-page previews and full-page screenshots."""
import html
import json

from playwright.sync_api import sync_playwright

from assemble import ROOT
from denetle import drawings

PRODUCTS = {'btk-16h100f': 'ORK BTK 16H100F',
            'tk-208m20f': 'ORK TK 208M20F',
            'tk-10xl037fal': 'ORK TK 10XL037FAL'}
CSS = '''
*{box-sizing:border-box}body{margin:0;background:#f3f5f8;color:#16203a;font:15px/1.7 Arial,sans-serif}
main{max-width:1040px;margin:24px auto;background:white;padding:28px;border-radius:14px}
nav{font-size:12px;color:#66778b;margin-bottom:24px}.hero{display:grid;grid-template-columns:410px 1fr;gap:28px}
.hero img{width:100%;height:auto}h1{font-size:24px;line-height:1.4;margin:10px 0 20px}h2{font-size:23px;line-height:1.4}
.summary table,.summary tbody{display:block}.summary tbody{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.summary tr{display:contents}.summary td{display:flex;flex-direction:column;padding:9px 11px;border:1px solid #dfe5ed;background:#f8fafc;border-radius:8px;font-size:14px}
.summary strong{font-size:11px;color:#607085}.drawing{width:460px;margin:24px auto;padding:0}
section{border-top:1px solid #e2e7ee;margin-top:28px;padding-top:16px}h3{font-size:18px;margin:24px 0 8px;color:#0a2350}
p{margin:8px 0 16px}a{color:#155c9e}ul{display:grid;grid-template-columns:1fr 1fr;gap:5px 28px;padding-left:22px}
li{padding:2px 0}.note{color:#6b7787;font-size:12px}
'''


def main():
    records = [json.loads(line) for line in (ROOT / 'urunler.jsonl').read_text().splitlines()]
    chosen = [next(record for record in records if record['kod'] == code) for code in PRODUCTS.values()]
    previews = drawings(chosen)
    output = ROOT / 'onizleme'
    output.mkdir(exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=str(ROOT.home() / '.local/bin/google-chrome'),
                                             headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1100, 'height': 900}, device_scale_factor=1)
        for (slug, _), record, drawing in zip(PRODUCTS.items(), chosen, previews):
            title = html.escape(record['URUNADI'])
            document = ('<!doctype html><html lang="tr"><meta charset="utf-8"><title>' + title +
                        '</title><style>' + CSS + '</style><main><nav>Anasayfa / ' +
                        html.escape(record['KATEGORI'].replace('>', ' / ')) + '</nav><div class="hero">' +
                        '<img alt="' + title + '" src="../' + html.escape(record['resim']) + '">' +
                        '<div><h1>' + title + '</h1><div class="summary">' + record['ONYAZI'] +
                        '</div></div></div><section><h2>Teknik Çizim</h2><div class="drawing">' +
                        (drawing['svg'] or '<p>Teknik çizim için ölçü tablosu eksik.</p>') +
                        '</div><p class="note">Şematik gösterim; imalat resmi değildir.</p></section>' +
                        '<section>' + record['ACIKLAMA'] + '</section></main></html>')
            path = output / (slug + '.html')
            path.write_text(document, encoding='utf-8')
            page.goto(path.as_uri(), wait_until='load')
            page.screenshot(path=str(output / (slug + '.png')), full_page=True)
            print('PREVIEW: ' + str(output / (slug + '.png')))
        browser.close()


if __name__ == '__main__':
    main()
