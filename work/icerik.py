import argparse
import html
import json
from pathlib import Path
from content_zincir import generate, generate_all, decimal, sales_specs

ROOT = Path(__file__).resolve().parent.parent
SAMPLE = 'ORK ZİN 08B2'
SLUG = '08b-2-cift-sira-makarali-zincir-12-7-mm'
LABELS = [('p', 'Adım (p)'), ('b1', 'İç Genişlik (b1)'),
          ('d3', 'Makara Çapı (d3)'), ('d1', 'Pim Çapı (d1)'),
          ('h', 'Plaka Yüksekliği (h)')]




def preview(record, image_prefix='../'):
    css = (ROOT / 'ornek/yon.css').read_text()
    module = (ROOT.parent / 'ticimax-stok-draw/site/draw/zincir.js').read_text() + '\n' + (ROOT.parent / 'ticimax-stok-draw/site/draw/zincir_disli.js').read_text()
    style = '''body{margin:0;background:#f2f5f9;color:#17304b;font:15px/1.7 Arial,sans-serif}header{background:#102b4c;color:white;padding:16px 5%;font-weight:bold;letter-spacing:1px}main{max-width:1140px;margin:24px auto;padding:0 24px}.crumb{color:#68788d;font-size:12px}h1{font-size:27px;line-height:1.35}h2{font-size:23px;line-height:1.4}h3{font-size:18px;color:#12355a;margin:22px 0 9px}p{margin:0 0 16px}.hero{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin:22px 0}.photo,.drawing{background:white;border:1px solid #dce4ee;border-radius:15px;overflow:hidden}.photo img{display:block;width:100%;max-width:500px;margin:auto}.drawing{padding:18px;display:flex;flex-direction:column;justify-content:center}.drawing h3{margin:0 0 18px}.keys{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}.keys button{border:1px solid #dce4ee;border-radius:6px;background:#f2f6fb;color:#153858;padding:7px;cursor:pointer}.hl.active>*{stroke:#cf1936!important}.hl.active text{fill:#cf1936!important}.ydsc{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px}.ym,.ya{background:white;border:1px solid #dce4ee;border-radius:14px;padding:24px}.ya{align-self:start;padding:0;overflow:hidden}.ya h3{background:#12355a;color:white;margin:0;padding:15px 20px}.ya ul{list-style:none;padding:0;margin:0}.ya li{padding:11px 18px;border-bottom:1px solid #e7edf4;font-size:13px}.ya li strong{display:block;color:#62748a;font-size:12px}.ysc{border-top:1px solid #e7edf4;margin-top:20px}a{color:#005ba6;text-decoration:underline}.yon{--c:5}#onyazi table{display:none}footer{padding:22px;text-align:center;color:#738297;font-size:12px}@media(max-width:760px){main{padding:0 14px}.hero,.ydsc{grid-template-columns:1fr}.yon{--c:2}h1{font-size:23px}}'''
    script = '''var summary=document.querySelector('#onyazi table'),cards=document.createElement('div');cards.className='yon';Array.from(summary.querySelectorAll('td')).forEach(function(td){var strong=td.querySelector('strong'),cell=td.cloneNode(true);cell.querySelector('strong').remove();var card=document.createElement('div');card.className='oi'+(strong.textContent==='Marka'?' m':'');var icon=document.createElement('span');icon.className='ic';icon.textContent='•';icon.style.color='white';var tx=document.createElement('span');tx.className='tx';var label=document.createElement('small');label.textContent=strong.textContent;var value=document.createElement('b');value.textContent=cell.textContent.trim();tx.append(label,value);card.append(icon,tx);cards.appendChild(card)});summary.after(cards);
var specs=Array.from(document.querySelectorAll('#aciklama li')).map(function(li){var label=li.querySelector('strong'),copy=li.cloneNode(true);copy.querySelector('strong').remove();return {l:label.textContent.replace(/:$/,''),v:copy.textContent.trim()}});var ctx={title:document.querySelector('h1').textContent,specs:specs,onyazi:[],crumbs:document.querySelector('.crumb').textContent.split(' / ')};var selected=YDRAW.zincir.match(ctx)?YDRAW.zincir:YDRAW.zincir_disli;var result=selected.draw(ctx,{id:'sample08b2'});window.DRAW_CHECK={match:selected.match(ctx),draw:!!result,keys:result?result.keys.map(function(k){return k.k}):[],specs:specs};if(result){document.querySelector('#svg').innerHTML=result.svg;result.keys.forEach(function(k){var button=document.createElement('button');button.textContent=k.l+': '+k.v;button.dataset.key=k.k;button.onclick=function(){document.querySelectorAll('#svg .hl').forEach(function(g){g.classList.toggle('active',g.dataset.k===k.k)})};document.querySelector('.keys').appendChild(button)})}else{document.querySelector('#svg').textContent='Çizim için gereken teknik ölçüler eksik.'};'''
    return '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + html.escape(record['URUNADI']) + '</title><style>' + css + style + '</style></head><body><header>YAMANSA RULMAN</header><main><div class="crumb">' + html.escape(record['KATEGORI'].replace('>', ' / ')) + '</div><h1>' + html.escape(record['URUNADI']) + '</h1><div id="onyazi">' + record['ONYAZI'] + '</div><div class="hero"><div class="photo"><img alt="' + html.escape(record['URUNADI']) + '" src="' + image_prefix + record['resim'] + '"></div><section class="drawing"><h3>Teknik Çizim</h3><div id="svg"></div><div class="keys"></div></section></div><div id="aciklama">' + record['ACIKLAMA'] + '</div></main><footer>Yamansa Rulman · Ürün içerik ön izlemesi</footer><script>' + module + '</script><script>' + script + '</script></body></html>'


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--kod')
    args = parser.parse_args()
    products = generate_all()
    used_images = {r['resim'] for r in products}
    for path in (ROOT / 'gorseller').glob('*.jpg'):
        if str(path.relative_to(ROOT)) not in used_images:
            path.unlink()
    if args.kod:
        products = [r for r in products if r['kod'] == args.kod]
        if not products:
            raise ValueError('Stok kodu bulunamadı: ' + args.kod)
    (ROOT / 'urunler.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in products))
    out = ROOT / 'work/onizleme'
    out.mkdir(exist_ok=True)
    selected = {'ORK ZK 08B1', 'İWİ ZİN 12B2', 'TMP ZİN 16B4'}
    for product in products:
        if product['kod'] in selected:
            path = out / (Path(product['resim']).stem + '.html')
            path.write_text(preview(product, '../../'))
    sample = next((p for p in products if p['kod'] == SAMPLE), None)
    if sample:
        (ROOT / 'work' / ('onizleme_' + SLUG + '.html')).write_text(preview(sample))
    print('Generated:', len(products), 'products;', sum(r['kod'] in selected for r in products), 'previews')
