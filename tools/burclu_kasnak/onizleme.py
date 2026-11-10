"""Site varlıklarının yerel kopyalarıyla üç ürün sayfası hazırlar."""
import hashlib
from html import escape
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(os.environ.get('BURCLU_WORK', str(Path.home() / 'work')))
REPO = Path(os.environ.get('BURCLU_REPO', str(Path.home() / 'repos/ticimax-stok')))


def git(*args):
    return subprocess.check_output(['git', *args], cwd=REPO)


def main():
    out = REPO / 'onizleme'
    out.mkdir(exist_ok=True)
    assets = out / 'assets'
    names = ['site/build.py', 'site/yg.js', 'site/desc.js', 'site/onyazi.js',
             'site/fiyat.js', 'site/min.js', 'site/draw/README.md']
    draw_files = git('ls-tree', '-r', '--name-only', 'origin/site-assets', 'site/draw').decode().splitlines()
    names += [p for p in draw_files if (p.count('/') == 2 and p.endswith('.js'))
              or (p.startswith('site/draw/data/') and p.endswith('.json'))]
    for name in names:
        path = assets / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(git('show', 'origin/site-assets:' + name))
    (assets / 'site/draw/burclu_kasnak.js').write_bytes(git('show', 'draw/burclu_kasnak:site/draw/burclu_kasnak.js'))
    (assets / 'yon.css').write_bytes((REPO / 'ornek/yon.css').read_bytes())
    subprocess.run(['python3', str(assets / 'site/build.py')], check=True)
    products = [json.loads(x) for x in (REPO / 'urunler.jsonl').read_text().splitlines()]
    samples = [('spa-100x3', 'ORK BK SPA1003'), ('spb-400x5-kollu', 'ORK BK SPB4005'),
               ('kys-spb-180x3', 'KYS BK SPB1803')]
    css = '''*{box-sizing:border-box}body{margin:0;font:15px/1.6 Arial,sans-serif;color:#16203a;background:#f4f6f9}
header{background:#102747;color:white;padding:16px 32px;font-size:20px;font-weight:bold}header small{float:right;font-size:12px;font-weight:normal;padding-top:7px}
main{max-width:1160px;margin:auto;padding:20px 14px 40px}.breadcrumb{list-style:none;display:flex;gap:12px;padding:0;margin:0 0 20px;font-size:12px;color:#64748b}
.product-main{display:grid;grid-template-columns:minmax(0,500px) minmax(0,1fr);gap:28px;align-items:start}.leftImage{min-width:0}.leftImage>img{width:100%}
.ProductName h1{font-size:27px;line-height:1.3;margin:0 0 14px}.right-info{padding:12px 0}.brand{font-weight:bold;color:#64748b;font-size:13px}
.summary-note{border-top:1px solid #e3e8ef;margin-top:25px;padding-top:16px;color:#64748b;font-size:13px}
#divTabOzellikler{background:white;border:1px solid #e3e8ef;border-radius:16px;padding:24px;margin-top:26px}
.section-title{font-size:17px;margin:0 0 18px}footer{font-size:12px;color:#64748b;margin-top:26px}
@media(max-width:800px){.product-main{grid-template-columns:1fr}.ProductName h1{font-size:22px}}
'''
    manifest = []
    for stem, code in samples:
        p = next(r for r in products if r['kod'] == code)
        page = f'''<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(p['URUNADI'])} – Yerel Ön İzleme</title><link rel="stylesheet" href="assets/yon.css"><style>{css}</style></head>
<body><header>YAMANSA RULMAN<small>Yerel içerik ön izlemesi · Satış ekranı değildir</small></header><main>
<ul class="breadcrumb"><li><span itemprop="name">KASNAKLAR</span></li><li>›</li><li><span itemprop="name">BURÇLU V KASNAKLAR</span></li></ul>
<section class="product-main"><div class="leftImage"><img id="imgUrunResim" data-cloudzoom="{{}}" src="../{p['resim']}" alt="{escape(p['URUNADI'])}"></div>
<div class="right-info"><div class="brand">{escape(p['MARKA'])}</div><div class="ProductName"><h1>{escape(p['URUNADI'])}</h1></div>
<div id="divOnyazi">{p['ONYAZI']}</div><p class="summary-note">Profil, çap, kanal ve burç bilgileri aşağıdaki teknik liste ile birlikte değerlendirilmelidir. Satış birimi: Adet.</p></div></section>
<section id="divTabOzellikler">{p['ACIKLAMA']}</section><footer>Yerel taslak · Fiyat ve satın alma işlemi içermez.</footer></main>
<script src="assets/site/yamansa-urun.js"></script></body></html>'''
        (out / (stem + '.html')).write_text(page)
        manifest.append(dict(kod=code, html=stem + '.html', png=stem + '.png'))
    (out / 'manifest.json').write_text(json.dumps(dict(
        site_assets=git('rev-parse', 'origin/site-assets').decode().strip(),
        draw=git('rev-parse', 'draw/burclu_kasnak').decode().strip(),
        module_sha256=hashlib.sha256((assets / 'site/draw/burclu_kasnak.js').read_bytes()).hexdigest(),
        products=manifest), ensure_ascii=False, indent=2) + '\n')
    print('ÖNİZLEME: 3 yerel HTML; origin/site-assets JS + güncel draw modülü; build.py paketi')


if __name__ == '__main__':
    main()
