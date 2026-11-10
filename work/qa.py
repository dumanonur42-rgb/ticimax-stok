import json,re,os,collections
from PIL import Image
R='/home/ubuntu/repos/ticimax-stok'
o=[json.loads(l) for l in open(R+'/urunler.jsonl')]
F=['kod','URUNADI','MARKA','KATEGORI','EK_KATEGORILER','yeni_kategori','ONYAZI','ACIKLAMA','ANAHTARKELIME','SEO_SAYFABASLIK','SEO_SAYFAACIKLAMA','SEO_ANAHTARKELIME','resim','resim_seviye','resim_kaynak','teknik_kaynak','bayraklar']
kats=set(l.split('\t',1)[1].strip() for l in open(R+'/site_kategoriler.txt') if '\t' in l)
urls=set(l.strip() for l in open(R+'/katurl.txt'))
err=collections.defaultdict(list); paras=collections.Counter()
for x in o:
    k=x['kod']
    for f in F:
        if f not in x: err['alan_yok'].append((k,f))
        elif f not in ('EK_KATEGORILER','bayraklar','yeni_kategori') and not x[f]: err['bos'].append((k,f))
    if set(x)-set(F): err['fazla_alan'].append(k)
    cust=' '.join(str(x[f]) for f in ['URUNADI','MARKA','ONYAZI','ACIKLAMA','ANAHTARKELIME','SEO_SAYFABASLIK','SEO_SAYFAACIKLAMA','SEO_ANAHTARKELIME','resim'])
    if re.search(r'ork',cust,re.I): err['yasak_orka'].append(k)
    if re.search(r'\bkoli\b|\bpaket\b|\bPKT\b',cust,re.I): err['paket'].append(k)
    if '\u0307' in json.dumps(x,ensure_ascii=False): err['U+0307'].append(k)
    if '—' in x['ONYAZI']+x['ACIKLAMA']: err['tire_kutu'].append(k)
    if len(x['SEO_SAYFABASLIK'])>60: err['seo_baslik'].append(k)
    if len(x['SEO_SAYFAACIKLAMA'])>155: err['seo_aciklama'].append(k)
    for f in ('ANAHTARKELIME','SEO_ANAHTARKELIME'):
        if len(x[f])>950: err['kw_uzun'].append(k)
    pl=len(re.sub('<[^>]+>','',x['ACIKLAMA']))
    if pl<1800: err['aciklama_kisa'].append((k,pl))
    if 'Kullanım Alanları' not in x['ACIKLAMA']: err['kullanim_yok'].append(k)
    if not re.search(r'<ul><li><strong>[^<]+:</strong>',x['ACIKLAMA']): err['teknik_liste_yok'].append(k)
    ln=re.findall(r'<a href="([^"]+)"',x['ACIKLAMA'])
    if not 2<=len(ln)<=4: err['link_sayisi'].append((k,len(ln)))
    for u in ln:
        if u not in urls: err['link_gecersiz'].append((k,u))
    if x['KATEGORI'] not in kats and not x['yeni_kategori']: err['kategori_yok'].append(k)
    for e in x['EK_KATEGORILER']:
        if e not in kats: err['ek_kategori_yok'].append((k,e))
    if x['resim_seviye'] not in ('birebir','ayni_tip','gorsel_yok'): err['resim_seviye'].append(k)
    p=R+'/'+x['resim']
    if not os.path.exists(p): err['resim_yok'].append(k)
    else:
        im=Image.open(p)
        if im.size!=(500,500) or im.format!='JPEG': err['resim_boyut'].append(k)
    if not re.fullmatch(r'gorseller/[a-z0-9-]+\.jpg',x['resim']): err['resim_ad'].append(k)
    if not all(u.startswith('http') for u in x['teknik_kaynak']) or not x['teknik_kaynak']: err['teknik_kaynak'].append(k)
    for pp in re.findall(r'<p>(.*?)</p>',x['ACIKLAMA']): paras[pp]+=1
c=collections.Counter(x['kod'] for x in o); dup=[k for k,v in c.items() if v>1]
rn=collections.Counter(x['resim'] for x in o); dupimg=[k for k,v in rn.items() if v>1]
rp=[p[:80] for p,v in paras.items() if v>1]
print('toplam',len(o),'mukerrer_kod',dup,'ayni_resim_adi',dupimg,'tekrar_paragraf',len(rp),rp[:5])
for k,v in err.items(): print('HATA',k,len(v),v[:5])
print('HATA YOK' if not err else 'HATALI')
