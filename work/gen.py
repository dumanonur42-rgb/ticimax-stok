# -*- coding: utf-8 -*-
import json,gzip,re,hashlib,os,unicodedata
R='/home/ubuntu/repos/ticimax-stok'
T=json.load(open(R+'/work/teknik.json'))
KZ=json.load(open(R+'/work/kafes.json'))
BK=json.load(open('/home/ubuntu/work/img/bk_skf.json'))
SITE='https://www.yamansarulman.com/'
BRAND={'SKF':'SKF','ARA':'ARASHİ','BET':'BETE','DYZ':'DYZV','ECO':'ECO','ETE':'ETERNO','JPN':'JPN','KBC':'KBC','KG':'KG','ORB':'ORB','RBE':'RBE','URB':'URB','ZKL':'ZKL'}
TIPAD={'sabit_bilyali':'Sabit Bilyalı Rulman','oynak_makarali':'Oynak Makaralı Rulman','konik_makarali':'Konik Makaralı Rulman','lineer':'Lineer Rulman'}
KAT={'sabit_bilyali':('RULMAN>SABİT BİLYALI RULMANLAR>TEK SIRALI SABİT BİLYALI RULMANLAR',[]),
 'oynak_makarali':('RULMAN>OYNAK MAKARALI RULMANLAR',[]),
 'konik_makarali':('RULMAN>KONİK MAKARALI RULMANLAR>30000 SERİSİ KONİK MAKARALI RULMANLAR',['RULMAN>KONİK MAKARALI RULMANLAR']),
 'lineer':('LİNEER>LİNEER RULMANLAR',[])}
L={'sabit':SITE+'tek-sirali-sabit-bilyali-rulmanlar-60','sabitust':SITE+'sabit-bilyali-rulmanlar','oynak':SITE+'oynak-makarali-rulmanlar',
 'konik':SITE+'30000-serisi-konik-makarali-rulmanlar-151','konikust':SITE+'konik-makarali-rulmanlar-150','lineer':SITE+'lineer-rulmanlar-743',
 'gres':SITE+'gresler-177','manson':SITE+'manson-127','montaj':SITE+'rulman-montaj-ve-bakim-ekipmanlari-738','sentil':SITE+'sentil-filler-cakilari-239',
 'yatakli':SITE+'yatakli-rulman','krom':SITE+'krom-kapli-','miltutucu':SITE+'mil-tutucu'}
def a(u,t): return '<a href="%s">%s</a>'%(u,t)
def tr(x):
    if x is None: return None
    s=('%.3f'%float(x)).rstrip('0').rstrip('.')
    if '.' in s:
        i,f=s.split('.')
    else: i,f=s,''
    i=re.sub(r'(\d)(?=(\d{3})+$)',r'\1.',i)
    return i+(','+f if f else '')
def asc(s):
    m=str.maketrans('çğıöşüÇĞİÖŞÜ','cgiosuCGIOSU'); s=s.translate(m)
    return unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode()
def slug(s): return re.sub(r'-+','-',re.sub(r'[^a-z0-9]+','-',asc(s).lower())).strip('-')
def H(k,n): return int(hashlib.md5(k.encode()).hexdigest(),16)%n
def pick(k,salt,opts): return opts[H(k+salt,len(opts))]
def up(s): return s.replace('i','İ').upper() if False else s

# ---- kod çözümü
def kodyaz(r,t):
    ad=r['ad']; pre=r['kod'].split()[0]
    if pre=='SKF': return t['designation_resmi']
    m=re.search(r'RULMAN\s+(.*)$',ad); c=m.group(1) if m else ad
    c=re.sub(r'\((ÇELİK|SARI) KAFES\)','',c).strip()
    return c
def seal(code):
    u=code.upper().replace(' ','').replace('-','')
    if re.search(r'2RS|RS1|RSH',u): return '2RS'
    if re.search(r'ZZ|2Z',u): return 'ZZ'
    return None
def marka(r):
    pre=r['kod'].split()[0]
    if r['marka']=='SKF' or pre=='SKF': return 'SKF'
    return BRAND.get(pre,'Yamansa')

# ---- görsel seçimi
TIP='/home/ubuntu/work/img/tip/'
SRC={'bkl_6011_2rs':('https://bearing-king.co.uk','https://cdn.shopify.com/s/files/1/0588/9684/2842/files/134354.jpg'),
 'bkl_6204_zz':('https://bearing-king.co.uk','https://cdn.shopify.com/s/files/1/0588/9684/2842/files/134742.jpg'),
 'bkl_6917_2rs':('https://bearing-king.co.uk','https://cdn.shopify.com/s/files/1/0588/9684/2842/files/135854.jpg'),
 'dun_22208cc':('https://bearing-king.co.uk','https://cdn.shopify.com/s/files/1/0588/9684/2842/files/142056.jpg'),
 'dun_22208cck':('https://bearing-king.co.uk','https://cdn.shopify.com/s/files/1/0588/9684/2842/files/142050.jpg'),
 'bd_brass':('https://bearingsdirect.com/22207caw33-spherical-roller-bearing-brass-cage-35x72x23-22207rhrw33/','https://cdn11.bigcommerce.com/s-m2tbfwjufh/products/311/images/32998/Brass_Cage_right__26905.1674686696.1280.1280.jpg'),
 'bkl_32215':('https://bearing-king.co.uk','https://cdn.shopify.com/s/files/1/0588/9684/2842/files/84143.jpg'),
 'bd_kh':('https://bearingsdirect.com/kh1630pp-linear-ball-bushing-bearing-16x24x30/','https://cdn11.bigcommerce.com/s-m2tbfwjufh/products/2123/images/32675/KH1026PP-1__25953.1674594931.1280.1280.jpg')}
def gorsel(r,t,code):
    tip=t['tip']; k=r['kod']
    if k in BK and BK[k].get('hits'):
        h=BK[k]['hits'][0]; f='/home/ubuntu/work/img/skf/'+h[0].replace('/','_')+'.jpg'
        if os.path.exists(f): return f,'birebir','https://bearing-king.co.uk'+h[2].split('?')[0]+' | '+h[1].split('?')[0],None
    if marka(r)=='SKF':
        s=seal(code); cand='6205-2Z_C3' if s=='ZZ' else '6205-2RSH_C3'
        f='/home/ubuntu/work/img/skf/%s.jpg'%cand
        return f,'ayni_tip','https://bearing-king.co.uk (SKF %s)'%cand.replace('_','/'),'gorsel_ayni_tip_skf'
    if tip=='sabit_bilyali':
        if t['baz']=='6917': n='bkl_6917_2rs'; lv='birebir'
        else: n='bkl_6204_zz' if seal(code)=='ZZ' else 'bkl_6011_2rs'; lv='ayni_tip'
    elif tip=='oynak_makarali':
        kf=t.get('kafes'); lv='ayni_tip'
        if kf=='sarı': n='bd_brass'
        elif t.get('konik_delik'): n='dun_22208cck'
        else: n='dun_22208cc'
    elif tip=='konik_makarali':
        n='bkl_32215'; lv='birebir' if t['baz']=='32215' else 'ayni_tip'
    else: n='bd_kh'; lv='ayni_tip'
    return TIP+n+'.jpg',lv,SRC[n][0]+' | '+SRC[n][1],None

# ---- sonek açıklamaları (genel, standart anlamlar)
def sonekler(r,t,code):
    u=code.upper().replace(' ',''); out=[]; tip=t['tip']
    if tip=='sabit_bilyali':
        s=seal(code)
        if s=='ZZ': out.append(('ZZ / 2Z','iki tarafta metal toz kapağı; rulman gresli ve kapalı gelir, temassız kapak düşük sürtünme sağlar'))
        if s=='2RS': out.append(('2RS','iki tarafta kauçuk conta; toz ve neme karşı temaslı sızdırmazlık, gres ömür boyu içeride kalır'))
        if 'TN' in u: out.append(('TN','üreticinin kafes tasarımını belirten ekidir; ayrıntı için markanın kendi tanımı esas alınır'))
    if tip=='oynak_makarali':
        kf=t.get('kafes')
        if re.search(r'\d(CC|C)K?(W33|C3|$)',u) or 'CCW' in u or 'CCK' in u: out.append(('CC / C','pres çelik kafesli, simetrik makaralı iç tasarım'))
        if re.search(r'CA|MB',u): out.append(('CA / MB','talaşlı işlenmiş pirinç (sarı) kafes; darbe ve titreşimde dayanıklı'))
        if 'E1' in u or re.search(r'\dE[W1]',u): out.append(('E / E1','yük kapasitesi artırılmış iç tasarım'))
        if 'T41A' in u: out.append(('T41A','titreşimli makineler (elek, vibrasyon) için daraltılmış tolerans ve uygun boşluk'))
        if re.search(r'EW33J',u): out.append(('J','pres çelik kafes'))
        if t.get('konik_delik'): out.append(('K','1:12 konik delik; manşonla mile takılır'))
        if 'W33' in u or 'MB33' in u: out.append(('W33','dış bilezikte yağlama kanalı ve 3 yağlama deliği'))
        if 'P6' in u: out.append(('P6','normalden hassas P6 tolerans sınıfı'))
    if re.search(r'C3',u): out.append(('C3','normalden büyük radyal iç boşluk; ısınan ve sıkı geçmeli yataklarda sıkışmayı önler'))
    if tip=='lineer' and 'PP' in u: out.append(('PP','iki tarafta temaslı conta'))
    return out

def seri(t):
    b=t['baz']
    return b[:-2] if t['tip']!='lineer' and len(b)>=4 else b
def bore(t):
    b=t['baz'][-2:]; return {'00':'10','01':'12','02':'15','03':'17'}.get(b, str(int(b)*5) if b.isdigit() and int(b)>=4 else None)
def olcu(t):
    if t['tip']=='lineer': return '%sx%sx%s'%(tr(t['d']),tr(t['D']),tr(t['L']))
    if t['tip']=='konik_makarali': return '%sx%sx%s'%(tr(t['d']),tr(t['D']),tr(t['T']))
    return '%sx%sx%s'%(tr(t['d']),tr(t['D']),tr(t['B']))

def speclist(r,t,code,mk):
    tip=t['tip']; S=[('Ürün Kodu',code)]
    if mk!='Yamansa': S.append(('Marka',mk))
    S.append(('Tip',{'sabit_bilyali':'Tek sıralı sabit bilyalı rulman','oynak_makarali':'Oynak makaralı rulman (2 sıra)','konik_makarali':'Tek sıralı konik makaralı rulman','lineer':'Kapalı tip lineer bilyalı rulman (KH)'}[tip]))
    S.append(('Seri',seri(t) if t['tip']!='lineer' else 'KH'))
    S.append(('İç Çap (d)',tr(t['d'])+' mm')); S.append(('Dış Çap (D)',tr(t['D'])+' mm'))
    if tip=='konik_makarali':
        S.append(('İç Bilezik Genişliği (B)',tr(t['B'])+' mm')); S.append(('Dış Bilezik Genişliği (C)',tr(t['C'])+' mm')); S.append(('Toplam Genişlik (T)',tr(t['T'])+' mm'))
    elif tip=='lineer': S.append(('Uzunluk (L)',tr(t['L'])+' mm'))
    else: S.append(('Genişlik (B)',tr(t['B'])+' mm'))
    if mk=='SKF':
        if t.get('Cr_kN'): S.append(('Dinamik Yük (C)',tr(t['Cr_kN'])+' kN'))
        if t.get('C0r_kN'): S.append(('Statik Yük (C0)',tr(t['C0r_kN'])+' kN'))
        if t.get('ref_speed'): S.append(('Referans Devir',tr(t['ref_speed'])+' d/dk'))
        if t.get('limit_speed'): S.append(('Limit Devir',tr(t['limit_speed'])+' d/dk'))
        if t.get('mass_kg'): S.append(('Ağırlık',tr(t['mass_kg'])+' kg'))
    if tip=='oynak_makarali':
        S.append(('Delik','Konik 1:12 (K)' if t.get('konik_delik') else 'Silindirik'))
        kf=t.get('kafes')
        if kf: S.append(('Kafes','Pirinç (sarı kafes)' if kf=='sarı' else 'Pres çelik'))
    s=seal(code) if tip=='sabit_bilyali' else None
    if s: S.append(('Kapak / Conta','İki tarafı metal kapaklı (ZZ)' if s=='ZZ' else 'İki tarafı kauçuk contalı (2RS)'))
    if re.search(r'C3',code.replace(' ','')): S.append(('Radyal Boşluk','C3 (normalden büyük)'))
    if tip=='oynak_makarali' and ('W33' in code.replace(' ','') or 'MB33' in code): S.append(('Yağlama','W33: dış bilezikte kanal ve 3 delik'))
    if tip=='lineer': S.append(('Conta','İki tarafı contalı (PP)'))
    S.append(('Satış Birimi','Adet'))
    return S

# ---- metin
def kullanim(tip,k):
    if tip=='sabit_bilyali': base=['elektrik motorları','pompalar ve fanlar','redüktör ve dişli kutuları','konveyör tamburları','tarım makineleri','tekstil ve ambalaj makineleri','kompresörler','ev ve beyaz eşya motorları']
    elif tip=='oynak_makarali': base=['konveyör ve bant tamburları','kırıcılar ve değirmenler','titreşimli elekler','fan ve aspiratör milleri','redüktörler','kağıt ve çelik sanayi makineleri','pompa milleri','SN/SNL ayaklı yatak gövdeleri']
    elif tip=='konik_makarali': base=['dişli kutuları ve redüktörler','tarım makinesi aksları','vinç ve kaldırma ekipmanları','ağır iş makineleri','pinyon milleri','tekerlek göbekleri']
    else: base=['CNC tezgahları','3D yazıcılar','pick-and-place sistemleri','ambalaj makineleri','otomasyon kızakları','ölçüm ve test düzenekleri']
    i=H(k,len(base)); return base[i:]+base[:i]

def aciklama(r,t,code,mk,name,links):
    tip=t['tip']; k=r['kod']; d,D=tr(t['d']),tr(t['D']); ol=olcu(t); mkt='' if mk=='Yamansa' else mk+' '
    B=tr(t.get('B')) if t.get('B') else None
    P=[]
    h2='<h2>%s</h2>'%name
    if tip=='sabit_bilyali':
        s=seal(code)
        intro=pick(k,'i',['%s%s, %s serisinden tek sıralı bir sabit bilyalı rulmandır. %s mm iç çap, %s mm dış çap ve %s mm genişliğe sahiptir; radyal yükü ve her iki yönde orta seviye eksenel yükü birlikte taşır.',
            '%s%s; %s serisine ait, %s mm mil çapına oturan, %s mm dış çaplı ve %s mm genişliğinde tek sıralı sabit bilyalı rulmandır. Hem radyal hem iki yönlü eksenel yükleri düşük sürtünmeyle karşılar.',
            '%s mm iç çaplı %s%s, %s serisi tek sıralı sabit bilyalı rulmanlar arasında yer alır. %s mm dış çap ve %s mm genişlikle, radyal ve iki yönlü eksenel yükü aynı anda taşıyabilir.'])
        if intro.startswith('%s mm'): intro=intro%(d,mkt,code,seri(t),D,B)
        else: intro=intro%(mkt,code,seri(t),d,D,B)
        P.append(h2+'<p>'+intro+(' %s tarafında %s.'%(('İki','metal toz kapağı bulunur, rulman gresli ve bakım gerektirmeden kullanılır') if s=='ZZ' else ('İki','kauçuk conta bulunur; toz, su sıçraması ve kire karşı korunur, içindeki gres ömür boyu yeterlidir')) if s else '')+'</p>')
    elif tip=='oynak_makarali':
        kf=t.get('kafes'); kft={'sarı':'pirinç (sarı) kafesli','çelik':'çelik kafesli'}.get(kf,'')
        intro=pick(k,'i',['%s%s, %s serisinden iki sıra fıçı makaralı, kendinden ayarlı %s oynak makaralı rulmandır. %s mm iç çap, %s mm dış çap ve %s mm genişliğe sahiptir.',
            '%s%s; %s serisine ait, %s, iki sıra küresel makaralı bir oynak makaralı rulmandır. Ölçüleri %s mm iç çap, %s mm dış çap ve %s mm genişliktir.',
            '%s%s, %s serisi %s oynak makaralı rulmanlardandır; %s mm mil çapına, %s mm yatak deliğine uyar ve %s mm genişliğindedir.'])%(mkt,code,seri(t),kft or 'yüksek yük kapasiteli',d,D,B)
        intro=intro.replace('  ',' ').replace(', ,',',')
        P.append(h2+'<p>'+intro+' %s.</p>'%('Delik 1:12 koniktir; rulman mile gergi ya da çektirme manşonuyla takılır' if t.get('konik_delik') else 'Delik silindiriktir; rulman mile doğrudan geçme ile takılır'))
    elif tip=='konik_makarali':
        P.append(h2+'<p>%s%s, %s serisinden tek sıralı konik makaralı rulmandır. %s mm iç çap, %s mm dış çap ve %s mm toplam genişliğe sahiptir; iç bilezik genişliği %s mm, dış bilezik (kep) genişliği %s mm\'dir. Konik makaralar sayesinde yüksek radyal yükle birlikte tek yönde güçlü eksenel yük taşır.</p>'%(mkt,code,seri(t),d,D,tr(t['T']),tr(t['B']),tr(t['C'])))
    else:
        P.append(h2+'<p>%s, %s mm mile uyan, %s mm dış çaplı ve %s mm uzunluğunda kapalı tip kompakt lineer bilyalı rulmandır (KH serisi). Sertleştirilmiş, delikli ince dış gömlek ve plastik bilya kafesi sayesinde mil üzerinde sınırsız boyda doğrusal hareket sağlar; iki ucundaki PP contalar tozu dışarıda tutar.</p>'%(code,d,D,tr(t['L'])))
    # kod
    sk=sonekler(r,t,code)
    if sk:
        txt=' '.join('<b>%s</b>: %s.'%(a_,b_) for a_,b_ in sk)
        P.append('<h3>%s Kodu Ne Anlatıyor?</h3><p>%s %s</p>'%(code,
            (('<b>%s</b> seri numarasıdır, <b>%s</b> ise %s mm iç çapı verir.'%(seri(t),t['baz'][-2:],bore(t)) if bore(t)==tr(t['d']) else '<b>%s</b> seri numarasıdır.'%seri(t)) if tip!='lineer' else '<b>KH</b> kompakt kapalı lineer burç serisini, <b>16</b> mm mil çapını, <b>30</b> mm uzunluğu gösterir.'),txt))
    # prensip
    if tip=='sabit_bilyali':
        P.append('<h3>Çalışma Prensibi ve Avantajları</h3><p>'+pick(k,'p',[
         'Derin oluklu yuvarlanma yolları bilyaların bileziklerle geniş bir temas yayı oluşturmasını sağlar. Bu yapı %s mm\'lik mil üzerinde yüksek devirde sessiz ve titreşimsiz dönüş verir; sürtünme düşük olduğundan ısınma ve enerji kaybı azdır.'%d,
         'Bu rulmanda bilyalar iç ve dış bilezikteki derin oluklarda döner. Sade yapısı sayesinde %sx%s mm yatak ölçüsünde hem yüksek hıza çıkabilir hem de bakım ihtiyacı azdır; yerine birebir aynı ölçüdeki rulman takıldığında makine ayarı değişmez.'%(d,D),
         'Tek sıralı sabit bilyalı rulmanlar en yaygın rulman tipidir; %s mm genişlikteki bu modelde de iki bilezik arasındaki bilyalar radyal yükü taşırken eksenel yönde de belirli bir kuvveti karşılar. Düşük sürtünme, yüksek devir ve uzun ömür bu tipin öne çıkan özellikleridir.'%B])+'</p>')
    elif tip=='oynak_makarali':
        P.append('<h3>Çalışma Prensibi ve Avantajları</h3><p>'+pick(k,'p',[
         'Dış bileziğin iç yüzeyi küresel olduğu için iç bilezik, makaralar ve kafes birlikte dış bilezik içinde açısal olarak salınabilir. Böylece mil eğilmesi ve yataklar arası eksen kaçıklığı rulmana zarar vermeden karşılanır. İki sıra makara, %s mm genişlik boyunca yükü geniş bir temas hattına yayar.'%B,
         'Kendinden ayarlı yapı, montaj hatalarını ve çalışma sırasında oluşan mil sehimini telafi eder. %s mm dış çaplı bu rulmanda iki sıra fıçı makara ağır radyal yükü ve her iki yöndeki eksenel yükü birlikte taşır; darbeli ve titreşimli işletmede de düzgün döner.'%D,
         'Küresel dış bilezik yolu sayesinde rulman, %s mm\'lik milin hafif açısal sapmalarına uyum sağlar. Bu nedenle uzun millerde, ayrı gövdelere oturan yataklarda ve şok yüklü makinelerde sabit bilyalı rulmanlara göre çok daha uzun ömür verir.'%d])+'</p>')
        if t.get('konik_delik'):
            P.append('<h3>Konik Delik ve Manşonla Montaj</h3><p>1:12 konik delikli rulman, düz mil üzerinde uygun bir %s ile kullanılır. Somun sıkıldıkça rulman konik yüzeyde ilerler, iç bilezik genişler ve radyal boşluk azalır. Doğru sıkılık, montaj öncesi ve sonrası %s ile ölçülen boşluk farkına göre ayarlanmalıdır.</p>'%(a(L['manson'],'gergi manşonu'),a(L['sentil'],'sentil (filler)')))
    elif tip=='konik_makarali':
        P.append('<h3>Çalışma Prensibi ve Avantajları</h3><p>Konik makaralar ile iç ve dış bilezik yolları tek bir noktada kesişecek şekilde tasarlanmıştır. Bu geometri %s mm iç çaplı rulmanda yüksek radyal yükle birlikte tek yönde eksenel yükü de taşır. İç bilezik, makaralar ve kafes bir grup oluşturur; dış bilezik (kep) ayrı takılır. Genellikle karşılıklı iki rulman olarak kullanılır ve boşluk montajda ayarlanır.</p>'%d)
    else:
        P.append('<h3>Çalışma Prensibi ve Avantajları</h3><p>Bilyalar kafes içinde kapalı sıralar halinde döner; yük taşıyan sıradan çıkan bilya geri dönüş kanalından tekrar başa gelir. Bu sayede %s mm\'lik sertleştirilmiş ve taşlanmış mil üzerinde düşük sürtünmeli, sessiz ve hassas doğrusal hareket elde edilir. Kompakt yapısı dar alanlara sığar; gövde deliğine sıkı geçme ile takılır.</p>'%d)
    # kullanım
    ku=kullanim(tip,k)
    P.append('<h3>Kullanım Alanları</h3><p>%s%s; %s, %s, %s ve %s gibi uygulamalarda kullanılır. %s</p>'%(mkt,code,ku[0],ku[1],ku[2],ku[3],
        {'sabit_bilyali':'Diğer ölçüler için %s kategorisine, yataklı uygulamalar için %s ürünlerine göz atabilirsiniz.'%(a(L['sabit'],'tek sıralı sabit bilyalı rulmanlar'),a(L['yatakli'],'yataklı rulman')),
         'oynak_makarali':'Diğer ölçü ve markalar için %s kategorisine göz atabilirsiniz.'%a(L['oynak'],'oynak makaralı rulmanlar'),
         'konik_makarali':'Diğer ölçüler için %s kategorisine göz atabilirsiniz.'%a(L['konik'],'30000 serisi konik makaralı rulmanlar'),
         'lineer':'Uygun mil ve diğer burçlar için %s kategorisine, mil sabitleme için %s ürünlerine bakabilirsiniz.'%(a(L['lineer'],'lineer rulmanlar'),a(L['miltutucu'],'mil tutucu'))}[tip]))
    # bakım
    if tip=='lineer':
        P.append('<h3>Montaj ve Bakım</h3><p>Rulman yalnız sertleştirilmiş ve taşlanmış (en az 670 HV) mil üzerinde çalıştırılmalıdır; yumuşak milde bilyalar iz açar. Mil temiz tutulmalı, belirli aralıklarla ince yağ ya da gres ile yağlanmalıdır. Uygun yağlayıcılar için %s kategorisine bakabilirsiniz.</p>'%a(L['gres'],'gresler'))
    else:
        P.append('<h3>Seçim, Montaj ve Bakım</h3><p>'+pick(k,'m',[
         'Değiştireceğiniz rulmanın kodundaki tüm eklerin (kapak/conta, boşluk, kafes) aynı olduğundan emin olun. Montajda kuvvet sadece geçme yapılan bileziğe uygulanmalı, çekiçle doğrudan darbe vurulmamalıdır. Uygun aparatlar için %s, yeniden yağlama için %s kategorilerine bakabilirsiniz.',
         'Takmadan önce %s mm\'lik mil ve %s mm\'lik yatak yuvası temizlenmeli, ölçüleri kontrol edilmelidir. Bileziklere eğik baskı uygulamayın; %s ile rulman zarar görmeden yerine oturtulur. Açık tip rulmanlarda uygun gresi %s arasından seçebilirsiniz.'])%((a(L['montaj'],'rulman montaj ve bakım ekipmanları'),a(L['gres'],'gresler')) if H(k+'m',2)==0 else (d,D,a(L['montaj'],'montaj ekipmanları'),a(L['gres'],'gresler')))+'</p>')
    return P

def onyazi(t,mk):
    cells=[('İç Çap',tr(t['d'])+' mm'),('Dış Çap',tr(t['D'])+' mm')]
    if t['tip']=='konik_makarali': cells.append(('Genişlik',tr(t['T'])+' mm'))
    elif t['tip']=='lineer': cells.append(('Uzunluk',tr(t['L'])+' mm'))
    else: cells.append(('Genişlik',tr(t['B'])+' mm'))
    cells.append(('Marka',mk))
    st='border:1px solid #ddd;padding:8px;text-align:center;background:#f5f5f5;'
    return '<table style="width: 100%; border-collapse: collapse; margin: 10px 0px; display: none;"><tbody><tr>'+''.join('<td style="%s"><strong>%s</strong><br>%s</td>'%(st,l,v) for l,v in cells)+'</tr></tbody></table>'

def ekpar(r,t,code,mk):
    tip=t['tip']; k=r['kod']; d,D=tr(t['d']),tr(t['D']); mkt='' if mk=='Yamansa' else mk+' '; P=[]
    if mk=='SKF' and t.get('Cr_kN'):
        sp='; referans devir %s d/dk, limit devir %s d/dk'%(tr(t['ref_speed']),tr(t['limit_speed'])) if t.get('ref_speed') and t.get('limit_speed') else (', limit devir %s d/dk'%tr(t['limit_speed']) if t.get('limit_speed') else '')
        P.append('<h3>Yük ve Devir Değerleri</h3><p>SKF kataloğuna göre %s için dinamik yük sayısı %s kN, statik yük sayısı %s kN%s%s. Dinamik yük sayısı rulman ömrü hesabında, statik yük sayısı ise duran ya da çok yavaş dönen rulmanda kalıcı iz oluşmadan taşınabilecek yükün kontrolünde kullanılır. Gerçek çalışma devri; yağlama, sıcaklık, yük ve contaların sürtünmesine göre bu değerlerin altında seçilmelidir.</p>'%(code,tr(t['Cr_kN']),tr(t['C0r_kN']),sp,(', ağırlığı %s kg'%tr(t['mass_kg'])) if t.get('mass_kg') else ''))
    if tip!='lineer':
        std='ISO 355' if tip=='konik_makarali' else 'ISO 15'
        P.append('<h3>Ölçü Standardı ve Muadiller</h3><p>'+pick(k,'s',[
         '%s ölçüleri %s sınır ölçü standardına uygundur; bu nedenle aynı %s baz koduna sahip farklı markaların rulmanları %s x %s mm yuvada ölçü olarak birbirinin yerine takılabilir. Değişimde yalnızca ölçüye değil, kapak/conta, kafes, iç boşluk ve delik tipini belirten eklerin de aynı olmasına dikkat edilmelidir.',
         '%s, %s standardındaki sınır ölçülerle üretilir. Aynı %s numaralı rulmanlar markadan bağımsız olarak %s mm iç çap ve %s mm dış çapa sahiptir; ancak ekler (boşluk sınıfı, kafes, conta, yağlama kanalı) farklıysa rulmanın davranışı değişir. Muadil seçerken kodun tamamını karşılaştırın.'])%(code,std,t['baz'],d,D)+'</p>')
    if tip=='oynak_makarali':
        w='W33' in code.replace(' ','') or 'MB33' in code
        P.append('<h3>Yağlama</h3><p>%s</p>'%(('Dış bilezikteki W33 kanalı ve yağlama delikleri sayesinde gres, iki makara sırasının tam ortasına verilir; rulman sökülmeden yatak gövdesindeki gresörlükten yeniden yağlanabilir. %s mm dış çaplı bu rulmanda yağlama aralığı devir, sıcaklık ve kirlilik koşullarına göre belirlenmelidir.'%D) if w else ('Bu rulman kodunda W33 eki yazılmamıştır; yeniden yağlama, yatak gövdesinin yapısına göre rulmanın yan tarafından yapılır. %s mm iç çaplı rulmanda gres miktarı ve yağlama aralığı çalışma koşullarına göre belirlenmelidir.'%d)))
        if not t.get('kafes') and not __import__('re').search(r'E1|EW|CC|CA|MB',code.replace(' ','')):
            P.append('<p>Not: %s kodunda kafes tipi belirtilmemiştir; çelik ya da pirinç kafes ihtiyacınız varsa sipariş öncesi bizimle iletişime geçin.</p>'%code)
    if tip=='sabit_bilyali':
        s=seal(code)
        P.append('<h3>Yağlama ve Sızdırmazlık</h3><p>%s</p>'%(('%s fabrikada gresle doldurulmuş ve iki tarafı kapatılmış olarak gelir; normal koşullarda yeniden yağlama gerekmez. Kapaklar %s mm\'lik milin etrafında temassız çalıştığından sürtünme düşüktür, ancak suya ve ince toza karşı contalı (2RS) tip daha iyi koruma sağlar.'%(code,d)) if s=='ZZ' else ('%s iki tarafı kauçuk contalı ve gresli olarak gelir; conta dudakları iç bileziğe temas ederek toz ve nemi dışarıda tutar. Temaslı conta nedeniyle limit devir, aynı ölçüdeki metal kapaklı (ZZ) tipe göre bir miktar düşüktür; %s mm iç çaplı bu rulman kirli ve nemli ortamlar için uygundur.'%(code,d)) if s=='2RS' else 'Açık tip rulman, çalıştığı yerdeki gres ya da yağ ile yağlanır.'))
    if tip=='konik_makarali':
        P.append('<h3>Boşluk Ayarı ve Yağlama</h3><p>Konik makaralı rulmanlarda eksenel boşluk montaj sırasında somun ya da ara pullarla ayarlanır. Fazla sıkı ayar ısınmaya, fazla gevşek ayar darbe ve gürültüye yol açar. %s mm iç çaplı %s için uygun gres seçimi ve düzenli kontrol, rulmanın ömrünü doğrudan etkiler.</p>'%(d,code))
    if tip=='lineer':
        P.append('<h3>Mil ve Gövde Seçimi</h3><p>KH 1630 PP, 16 mm çaplı h6 toleranslı sertleştirilmiş mil ile çalışacak şekilde tasarlanmıştır. Gövde deliği 24 mm olmalı ve rulman bu deliğe sıkı geçme ile takılmalıdır. İki uçtaki PP contalar tozun bilya sıralarına girmesini engeller; talaşlı ortamlarda ek koruma körüğü kullanılabilir. Doğru mil için %s kategorisine bakabilirsiniz.</p>'%a(L['krom'],'krom kaplı mil'))
    return P

def kodekle(html,code,key):
    def f(m):
        p=m.group(1)
        if key in re.sub('<[^>]+>','',p): return m.group(0)
        segs=re.split(r'(<[^>]+>)',p); done=False
        for n,sg in enumerate(segs):
            if sg.startswith('<') or done: continue
            if code in sg: segs[n]=sg.replace(code,key,1); done=True
        if not done:
            for n,sg in enumerate(segs):
                if sg.startswith('<'): continue
                q=re.search(r'\brulman(?!lar)',sg)
                if q and (n>0 or q.start()>0): segs[n]=sg[:q.start()]+key+' '+sg[q.start():]; done=True; break
        p=''.join(segs)
        if not done: p=key+' için: '+p
        return '<p>'+p+'</p>'
    return re.sub(r'<p>(.*?)</p>',f,html)

TIPK={'sabit_bilyali':'Rulman','oynak_makarali':'Oynak Makaralı Rulman','konik_makarali':'Konik Makaralı Rulman','lineer':'Lineer Rulman'}
def keywords(r,t,code,mk):
    tip=t['tip']; base=t['baz']; ol=olcu(t).replace(',','.')
    raw=code.replace('/',' ').replace('-',' ')
    parts=raw.split(); joined=''.join(parts)
    kws=[joined,' '.join(parts),'-'.join(parts),code,r['kod'].split(' ',1)[1] if ' ' in r['kod'] and not r['kod'].startswith('ORK') and not r['kod'].startswith('RUL') else joined,
         base+' rulman',joined+' rulman',ol,ol+' rulman',ol.replace('x','*'),ol.replace('x',' '),ol.replace('x','x')+' mm']
    if mk not in ('Yamansa',): kws+=[mk+' '+base,mk+' '+joined,mk+' '+' '.join(parts),mk+' rulman']
    tw={'sabit_bilyali':['sabit bilyalı rulman','bilyalı rulman','sabit bilyali rulman','bilyali rulman','deep groove ball bearing'],
        'oynak_makarali':['oynak makaralı rulman','oynak makarali rulman','küresel makaralı rulman','kuresel makarali rulman','spherical roller bearing'],
        'konik_makarali':['konik makaralı rulman','konik makarali rulman','konik rulman','tapered roller bearing'],
        'lineer':['lineer rulman','lineer burç','lineer burc','lineer bilyalı rulman','linear ball bearing','KH16','KH16PP','KH16-PP','KH 16 PP','16 mm lineer rulman','16mm lineer rulman']}[tip]
    kws+=tw+[base+' '+w for w in tw[:2]]
    s=seal(code)
    if s=='ZZ': kws+=[base+'ZZ',base+' ZZ',base+'-2Z',base+' 2Z',base+'Z','metal kapaklı rulman','metal kapakli rulman']
    if s=='2RS': kws+=[base+'2RS',base+' 2RS',base+'-2RS',base+' 2RS1',base+'-2RSH',base+' DDU',base+' LLU','lastik kapaklı rulman','lastik kapakli rulman','contalı rulman']
    if 'C3' in code.replace(' ',''): kws+=[base+' C3','C3 boşluklu rulman']
    if tip=='oynak_makarali':
        if t.get('konik_delik'): kws+=[base+'K',base+' K','konik delikli oynak rulman']
        if t.get('kafes')=='sarı': kws+=[base+' CA',base+' MB','pirinç kafesli rulman','sarı kafes rulman','sari kafes rulman']
        if t.get('kafes')=='çelik': kws+=[base+' CC','çelik kafesli rulman','celik kafes rulman']
        if 'W33' in code: kws+=[base+' W33']
    kws+=[asc(x) for x in kws]
    out=[];seen=set();n=0
    for x in kws:
        x=x.strip().lower() if False else x.strip()
        kx=x.lower()
        if not x or kx in seen: continue
        if n+len(x)+2>950: break
        seen.add(kx); out.append(x); n+=len(x)+2
    return ', '.join(out)

def seo(t,code,mk,name):
    ol=olcu(t); mkt='' if mk=='Yamansa' else mk+' '
    for c in ['%s%s %s %s'%(mkt,code,TIPAD[t['tip']],ol),'%s%s %s %s'%(mkt,code,TIPK[t['tip']],ol),'%s%s Rulman %s'%(mkt,code,ol),'%s%s %s'%(mkt,code,ol)]:
        if len(c)<=60: title=c;break
    else: title=(mkt+code)[:60]
    dsc='%s%s %s: %s mm.'%(mkt,code,TIPAD[t['tip']].lower(),ol)
    ext=[' Orijinal ürün.' if mk not in ('Yamansa',) else '',' Stokta, hızlı kargo.',' Teknik çizim ve ölçüler sayfada.']
    for e in ext:
        if len(dsc+e)<=155: dsc+=e
    return title,dsc.replace('  ',' ')

def run(only=None):
    rows=[json.loads(l) for l in gzip.open(R+'/parca/rulman.jsonl.gz','rt')]
    out=[];seen={}
    for r in rows:
        k=r['kod']
        if only and k not in only: continue
        t=dict(T[k]); code=kodyaz(r,t); mk=marka(r)
        if t.get('kafes')=='pirinç': t['kafes']='sarı'
        kz=KZ.get(k)
        if kz and kz['kafes']=='pirinç': t['kafes']='sarı'; t['kaynak_kafes']=kz['url']
        ol=olcu(t); name=('%s %s %s %s mm'%('' if mk=='Yamansa' else mk,code,TIPAD[t['tip']],ol)).strip()
        if t['tip']=='oynak_makarali' and t.get('konik_delik'): name+=' Konik Delik'
        P=aciklama(r,t,code,mk,name,None)
        S=speclist(r,t,code,mk)
        tek='<h3>Teknik Özellikler</h3><ul>'+''.join('<li><strong>%s:</strong> %s</li>'%(l,v) for l,v in S)+'</ul>'
        P.insert(min(3,len(P)),tek)
        E=ekpar(r,t,code,mk); P[-1:-1]=E
        html=kodekle(''.join(P),code,(('' if mk=='Yamansa' else mk+' ')+code))
        while len(re.findall('<a ',html))>4:
            m=list(re.finditer(r'<a href="[^"]+">([^<]+)</a>',html))[-1]; html=html[:m.start()]+m.group(1)+html[m.end():]
        kw=keywords(r,t,code,mk); st,sd=seo(t,code,mk,name)
        img,lv,src,fl=gorsel(r,t,code)
        fn='gorseller/'+slug(name)+'.jpg'
        bay=[]
        if fl: bay.append(fl)
        if mk!='SKF' and t['tip']!='lineer': bay.append('eksik_yuk_devir')
        if t['tip']=='oynak_makarali' and not t.get('kafes') and not re.search(r'E1|EW|CC|CA|MB',code.replace(' ','')): bay.append('kafes_belirsiz')
        if 'C3' in (t.get('not') or '') and 'çelişki' in (t.get('not') or ''): bay.append('kod_ad_celiski')
        if 'alternatif' in json.dumps(t,ensure_ascii=False) and t.get('SKF_alternatif_resmi'): bay.append('skf_varyant_belirsiz')
        if k in seen: bay.append('mukerrer_kod')
        seen[k]=1
        kat,ek=KAT[t['tip']]
        tk=[u for u in [t.get('kaynak_olcu'),t.get('kaynak_marka'),t.get('kaynak_olcu_B_C'),t.get('kaynak_esdegerlik'),t.get('kaynak_kafes')] if u]
        tk=list(dict.fromkeys(tk))
        out.append(dict(kod=k,URUNADI=name,MARKA=mk,KATEGORI=kat,EK_KATEGORILER=ek,yeni_kategori=False,ONYAZI=onyazi(t,mk),ACIKLAMA=html,
            ANAHTARKELIME=kw,SEO_SAYFABASLIK=st,SEO_SAYFAACIKLAMA=sd,SEO_ANAHTARKELIME=kw,resim=fn,resim_seviye=lv,resim_kaynak=src,
            teknik_kaynak=tk,bayraklar=bay,_img_src=img))
    return out
if __name__=='__main__':
    import sys
    o=run(set(sys.argv[1:]) or None)
    with open('/home/ubuntu/work/urunler_raw.jsonl','w') as f:
        for x in o: f.write(json.dumps(x,ensure_ascii=False)+'\n')
    print(len(o))
