"""Parça 5 çıktısı için kendi kendine kontrol."""
import json, os, re, sys
D=os.path.dirname(os.path.abspath(__file__))
inp=sys.argv[1]; kat=sys.argv[2]
I=[json.loads(l) for l in open(inp)]
O=[json.loads(l) for l in open(os.path.join(D,'urunler.jsonl'))]
cats=set(l.strip() for l in open(kat) if l.strip() and not l.startswith('#'))
rapor=open(os.path.join(D,'RAPOR.md')).read() if os.path.exists(os.path.join(D,'RAPOR.md')) else ''
prop=set(re.findall(r'^- `([^`]+)`',rapor,re.M))
err=[]
if len(O)!=len(I): err.append('satır sayısı farklı')
ids=[o['id'] for o in O]
if len(set(ids))!=len(ids): err.append('tekrar eden id')
for a,b in zip(I,O):
    if a['id']!=b['id']: err.append('sıra/id farkı %s'%a['id'])
    if a['stok_kodu']!=b['stok_kodu']: err.append('stok_kodu değişmiş %s'%a['id'])
    for k in ('urun_adi','aciklama_html','seo_baslik','seo_aciklama','seo_kelimeler','url','marka'):
        if not str(b.get(k,'')).strip(): err.append('%s boş %s'%(k,a['id']))
    if len(b['seo_baslik'])>65: err.append('seo_baslik uzun %s'%a['id'])
    if not 140<=len(b['seo_aciklama'])<=160: err.append('seo_aciklama uzunluk %s %d'%(a['id'],len(b['seo_aciklama'])))
    n=len([k for k in b['seo_kelimeler'].split(',') if k.strip()])
    if not 5<=n<=10: err.append('seo_kelimeler sayı %s'%a['id'])
    if not re.fullmatch(r'[a-z0-9-]+',b['url']): err.append('url %s'%a['id'])
    for c in b['kategoriler']:
        if c not in cats and c not in prop: err.append('kategori yok %s %s'%(a['id'],c))
    if b['gorsel'] and not os.path.exists(os.path.join(D,'gorseller',b['gorsel'])): err.append('görsel yok %s'%a['id'])
    if b['gorsel_tur'] not in ('birebir','ayni_tip',''): err.append('gorsel_tur %s'%a['id'])
    if bool(b['gorsel'])!=bool(b['gorsel_tur']): err.append('gorsel/tur uyumsuz %s'%a['id'])
if len(set(o['url'] for o in O))!=len(O): err.append('tekrar eden url')
yasak=re.compile(r'rulman d[üu]nyas[ıi]|b4b\.rulman|eryaz|rulman\.com\.tr|doğrulanmıştır|katalog kaynağıyla',re.I)
for root,_,fs in os.walk(D):
    for f in fs:
        p=os.path.join(root,f)
        if f.endswith(('.jsonl','.md','.py')) and f!='kontrol.py':
            if yasak.search(open(p,encoding='utf-8').read()): err.append('yasaklı ifade: '+f)
        if yasak.search(f): err.append('yasaklı dosya adı: '+f)
print('HATA SAYISI',len(err)); print('\n'.join(err[:50]))
sys.exit(1 if err else 0)
