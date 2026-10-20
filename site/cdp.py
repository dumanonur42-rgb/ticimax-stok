import asyncio,json,sys,websockets,urllib.request,base64
async def run(url,js_list,shots=None,w=1280,h=900,mobile=False,wait=5):
    t=json.loads(urllib.request.urlopen(urllib.request.Request('http://localhost:29229/json/new?about:blank',method='PUT')).read())
    async with websockets.connect(t['webSocketDebuggerUrl'],max_size=2**28) as ws:
        n=0
        async def c(m,p={}):
            nonlocal n;n+=1;i=n;await ws.send(json.dumps({'id':i,'method':m,'params':p}))
            while True:
                r=json.loads(await ws.recv())
                if r.get('id')==i:return r
        await c('Emulation.setDeviceMetricsOverride',{'width':w,'height':h,'deviceScaleFactor':1 if not mobile else 2,'mobile':mobile})
        if mobile:await c('Emulation.setUserAgentOverride',{'userAgent':'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'})
        await c('Page.enable');await c('Page.navigate',{'url':url});await asyncio.sleep(wait)
        out=[]
        for js in js_list:
            if isinstance(js,tuple):
                r=await c('Page.captureScreenshot',{'format':'png'});open(js[1],'wb').write(base64.b64decode(r['result']['data']));continue
            r=await c('Runtime.evaluate',{'expression':js,'returnByValue':True,'awaitPromise':True});out.append(r['result'].get('result',{}).get('value',r))
            await asyncio.sleep(1.5)
        for name,full in (shots or []):
            r=await c('Page.captureScreenshot',{'format':'png','captureBeyondViewport':full})
            open(name,'wb').write(base64.b64decode(r['result']['data']))
    urllib.request.urlopen('http://localhost:29229/json/close/'+t['id'])
    return out
if __name__=='__main__':
    print(json.dumps(asyncio.run(run(sys.argv[1],[sys.argv[2]],[('s.png',False)])),ensure_ascii=False)[:4000])
