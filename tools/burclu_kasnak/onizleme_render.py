"""Yerel sayfaları mevcut headless Chrome ile tam sayfa PNG olarak doğrular."""
import asyncio
import base64
import json
import os
from pathlib import Path
import urllib.request

import websockets

REPO = Path(os.environ.get('BURCLU_REPO', str(Path.home() / 'repos/ticimax-stok')))


async def main():
    request = urllib.request.Request('http://localhost:29230/json/new?about:blank', method='PUT')
    tab = json.load(urllib.request.urlopen(request))
    async with websockets.connect(tab['webSocketDebuggerUrl'], max_size=30_000_000) as ws:
        seq = 0
        async def call(method, params):
            nonlocal seq
            seq += 1
            await ws.send(json.dumps(dict(id=seq, method=method, params=params)))
            while True:
                result = json.loads(await ws.recv())
                if result.get('id') == seq:
                    if 'error' in result:
                        raise RuntimeError(result['error'])
                    return result['result']

        await call('Emulation.setDeviceMetricsOverride', dict(width=1200, height=900, deviceScaleFactor=1, mobile=False))
        root = REPO / 'onizleme'
        manifest = json.loads((root / 'manifest.json').read_text())
        verified = []
        for product in manifest['products']:
            uri = (root / product['html']).as_uri()
            await call('Page.navigate', dict(url=uri))
            for _ in range(150):
                ready = await call('Runtime.evaluate', dict(expression='location.href===' + json.dumps(uri) +
                    " && document.readyState==='complete' && !!document.querySelector('#ygDraw svg') && !!document.querySelector('.yon .oi') && !!document.querySelector('.ya table') && [...document.images].every(i=>i.complete&&i.naturalWidth>0)", returnByValue=True))
                if ready['result'].get('value'):
                    break
                await asyncio.sleep(.05)
            else:
                raise AssertionError('Bileşenler render olmadı: ' + uri)
            await call('Runtime.evaluate', dict(expression='document.fonts.ready', awaitPromise=True))
            stats = await call('Runtime.evaluate', dict(expression="JSON.stringify({cards:document.querySelectorAll('.yon .oi').length,rows:document.querySelectorAll('.ya table tr').length,svg:document.querySelectorAll('#ygDraw svg').length,drawWidth:document.querySelector('#ygDraw svg').getBoundingClientRect().width,drawHeight:document.querySelector('#ygDraw svg').getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>1200})", returnByValue=True))
            stats = json.loads(stats['result']['value'])
            assert stats['cards'] >= 5 and stats['rows'] >= 10 and stats['svg'] == 1, stats
            assert stats['drawWidth'] > 300 and stats['drawHeight'] > 150 and not stats['overflow'], stats
            layout = await call('Page.getLayoutMetrics', {})
            height = layout['cssContentSize']['height']
            shot = await call('Page.captureScreenshot', dict(format='png', captureBeyondViewport=True,
                clip=dict(x=0, y=0, width=1200, height=height, scale=1)))
            (root / product['png']).write_bytes(base64.b64decode(shot['data']))
            verified.append(dict(product, **stats, height=height))
            print(f'PASS: {product["png"]} 1200x{height}; kutu {stats["cards"]}; teknik satır {stats["rows"]}; çizim SVG 1; taşma yok')
        (root / 'kontrol.json').write_text(json.dumps(verified, ensure_ascii=False, indent=2) + '\n')
    urllib.request.urlopen('http://localhost:29230/json/close/' + tab['id']).read()


if __name__ == '__main__':
    asyncio.run(main())
