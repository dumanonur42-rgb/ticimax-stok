import argparse
import asyncio
import collections
import gzip
import hashlib
import html
import json
import re
import shutil
import subprocess
from decimal import Decimal
from pathlib import Path

from bs4 import BeautifulSoup
from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path('/home/ubuntu/work/yatak')
REPO = Path('/home/ubuntu/repos/ticimax-stok')
DRAW = Path('/home/ubuntu/work/draw-yatak/site/draw')
OUT = Path('/home/ubuntu/work/orkapt-yatak')
SHA = '1dcb07e3535564b6754fe4000034232360338373'
BASE = 'RULMAN>YATAKLI RULMAN>'
INSERT = BASE + 'RULMAN YATAKLARI VE INSERT'
STAINLESS = BASE + 'PASLANMAZ YATAKLI RULMAN'
KINDS = {'SSUCP':'UCP','SUCP':'UCP','SSUCF':'UCF','SUCF':'UCF','SSUCFL':'UCFL','SUCFL':'UCFL',
         'SSUCFC':'UCFC','SUCFC':'UCFC','SSUCT':'UCT','SUCT':'UCT','SSUCFB':'UCFB','SUCFB':'UCFB',
         'SUCPA':'UCPA','SSBF':'S-SBF','SSBP':'S-SBP','SSBT':'S-SBT','SUC':'INSERT',
         'UC (ETAZON)':'INSERT','SN':'SN','FRB':'FRB','TSN':'TSN'}
SHAPES = {'UCP':('Ayaklı','P ayaklı gövdeyi'),
          'UCF':('Kare Flanşlı','F dört delikli kare flanşı'),
          'UCFL':('Oval Flanşlı','FL iki delikli oval flanşı'),
          'UCFC':('Pilotlu Yuvarlak Flanşlı','FC merkezleme pilotlu yuvarlak flanşı'),
          'UCT':('Gergi Tipi','T kızak üzerinde hareket eden gergi gövdesini'),
          'UCFB':('Üç Delikli Flanşlı','FB üç delikli flanşı'),
          'UCPA':('Üstten Dişli Tabanlı Ayaklı','PA üstten dişli tabanlı ayaklı gövdeyi'),
          'S-SBF':('Kare Flanşlı','SBF dar iç bilezikli insert ile kare flanşı'),
          'S-SBP':('Ayaklı','SBP dar iç bilezikli insert ile ayaklı gövdeyi'),
          'S-SBT':('Gergi Tipi','SBT dar iç bilezikli insert ile gergi gövdesini')}
TOPICS = ['Kod Ne Anlatıyor?','Yapı ve Çalışma','Ölçüler ve Yerleşim','Montaj',
          'Bakım ve Yağlama','Kullanım Alanları','Servis ve Parça Seçimi']
A = [
 'Seri kodunu bakım listesine yazmak, aynı bağlantı biçimindeki parçayı yeniden bulmayı kolaylaştırır.',
 'Yuva yüzeyinin temiz ve düzgün olması, parçanın yerine tam oturmasını sağlar.',
 'Mil hattını ve parçanın oturduğu alanı birlikte incelemek, montajı daha düzenli hale getirir.',
 'Bağlantı elemanlarını uygun el takımıyla sıkmak, sonraki sökümde de rahat çalışmayı sağlar.',
 'Servis sırasında çevredeki kiri almak, açıkta kalan yataklama alanının temiz kalmasını sağlar.',
 'Makine üzerindeki konumu kaydetmek, yedek parçanın doğru yere yönlendirilmesine yardımcı olur.',
 'Sökülen parçaları montaj sırasıyla ayırmak, aynı yataklama düzenini yeniden kurmayı kolaylaştırır.',
 'Düzenli bakım kayıtları, parça değişimi ile makinenin çalışma süresini birlikte izlemeyi sağlar.']
B = [
 'Ölçüleri aynı birimle kaydetmek, atölye kontrolü ile sipariş bilgisini aynı noktada buluşturur.',
 'Temas yüzeyindeki çapakları almak, parçanın yuvasında düzgün bir dayanak bulmasını sağlar.',
 'Montaj sonunda milin elle rahat döndüğünü görmek, servisin son kontrolünü tamamlar.',
 'Bağlantı çevresinde el takımı için çalışma alanı bırakmak, sonraki bakımı kolaylaştırır.',
 'Temiz ve sağlam bağlantı elemanlarıyla çalışmak, yataklama düzeninin korunmasına yardımcı olur.',
 'Söküm öncesi alınan kısa notlar, yeni parçayı aynı yönde yerleştirirken yol gösterir.',
 'Makinenin çalışma şartlarına göre bakım planlamak, servis işinin düzenli ilerlemesini sağlar.',
 'Yedek parçaları koduyla saklamak, bakım rafında aranan ürüne daha hızlı ulaşmayı sağlar.']


def tr_lower(s):
    return s.translate(str.maketrans({'I':'ı','İ':'i'})).casefold()


def ascii_text(s):
    return tr_lower(s).translate(str.maketrans('çğıöşü','cgiosu'))


def ascii_slug(s):
    s = re.sub('[^a-z0-9]+','-',ascii_text(s)).strip('-')
    if not s:
        raise ValueError('empty slug')
    return s


def number(v):
    if v is None or v == '' or isinstance(v,bool):
        raise ValueError('missing numeric value')
    return format(Decimal(str(v)).normalize(),'f').replace('.',',')


def clean(v):
    s = re.sub(r'\b(?:FK|PEER|NTN|TOJO|CRAFT|SKF|SNR)\b','',str(v),flags=re.I)
    return re.sub(r'(?<=\d)\.(?=\d)',',',re.sub(r'\s+',' ',s).strip())


def contracts():
    aliases = {'SUC/UC insert':'INSERT','SN — NTN sembolleri':'SN','UCFB / SSUCFB / SUCFB':'UCFB',
               'UCPA / SUCPA / SSUCPA':'UCPA','SSBF / S-SBF':'S-SBF','SSBP / S-SBP':'S-SBP','SSBT / S-SBT':'S-SBT'}
    result = {}
    for line in (DRAW/'rapor/yatak.md').read_text().splitlines():
        cells = [s.strip() for s in line.strip('|').split('|')]
        if not line.startswith('|') or len(cells)!=2:
            continue
        kind = aliases.get(cells[0],cells[0])
        labels = cells[1].split(' — ')[0].split('; ')
        if kind in KINDS.values() and all(re.search(r'\(([A-Za-z0-9]+)\)$',s) for s in labels):
            result[kind] = [(re.search(r'\(([A-Za-z0-9]+)\)$',s)[1],s) for s in labels]
    assert set(result)==set(KINDS.values())
    return result


def model(raw,tech,labels):
    series = tech['seri']
    if series=='FRB':
        m = re.search(r'(\d+(?:[.,]\d+)?)\s*\*\s*(\d+(?:[.,]\d+)?)',raw['ad'])
        num = m[1].replace('.',',')+'x'+m[2].replace('.',',')
        code = 'FRB '+num
    else:
        num = re.search(r'(\d{3})\b',raw['kod'])[1]
        prefix = {'SSBF':'S-SBF','SSBP':'S-SBP','SSBT':'S-SBT','UC (ETAZON)':'UC'}.get(series,series)
        code = prefix+' '+num
    kind = KINDS[series]
    plastic = series in ['SSBF','SSBP','SSBT','SUCF','SUCFB','SUCFC','SUCFL','SUCP','SUCPA','SUCT']
    stainless = series.startswith('SSUC')
    values = {}
    f = tech['alanlar']
    for letter,_ in labels[kind]:
        key = letter+'_mm'
        if kind=='FRB' and letter=='d1':key='d1_ic_cap_mm'
        if kind=='UCFB' and letter=='D':key='D_katalog_mm'
        if kind=='TSN':key='ortak_mil_capi_mm'
        if series=='SSUCFL' and letter in ['H','L']:key='FK_a_mm' if letter=='H' else 'FK_b_mm'
        if isinstance(f.get(key),(int,float)) and f[key]>0:values[letter]=f[key]
    return dict(series=series,num=num,code=code,kind=kind,plastic=plastic,stainless=stainless,
                brand='ETAZON' if series=='UC (ETAZON)' else 'Yamansa',values=values,labels=labels[kind])


def properties(m,f):
    p=[('Seri','UC' if m['series']=='UC (ETAZON)' else m['series']),('Numara',m['num'])]
    p += [(label,number(m['values'][k])+' mm')for k,label in m['labels']if k in m['values']]
    extra=[('civata','Bağlantı Cıvatası'),('insert_kodu','Insert Kodu'),('govde_kodu','Gövde Kodu'),('ds_ayar_vidasi','Setuskur Vidası')]
    if m['kind']=='SN':
        extra += [('rulman_manson_tespit_bilezigi_secimleri','Rulman / Manşon / Bilezik Seçenekleri'),
                  ('NTN_kaucuk_kece','Kauçuk Keçe Kodu'),('NTN_kapali_kapak','Kapalı Kapak Kodu'),
                  ('t_kapak_civatasi','Kapak Cıvatası'),('S_taban_civatasi','Taban Cıvatası'),('yaglama_deligi','Yağlama Deliği')]
    if m['kind']=='FRB':extra += [('katalog_rulman_manson_eslesmeleri','Rulman / Manşon Eşleşmeleri')]
    if m['kind']=='TSN':extra += [('uyumlu_yatak_SKF','Uyumlu Yatak')]
    p += [(label,clean(f[k])) for k,label in extra if f.get(k) not in [None,'']]
    if f.get('agirlik_kg') not in [None,'']:p.append(('Ağırlık',number(f['agirlik_kg'])+' kg'))
    if m['stainless'] or m['series']=='SUC':p.append(('Malzeme','Paslanmaz çelik'))
    if m['plastic']:p.append(('Malzeme','PBT termoplastik gövde, paslanmaz insert' if 'PBT'in f.get('malzeme_govde','') else 'Plastik gövde, paslanmaz insert'))
    if m['series']!='UC (ETAZON)':
        p += [(label,number(f[k])+' kN')for k,label in [('C_dinamik_kN','Dinamik Yük'),('C0_statik_kN','Statik Yük')]if isinstance(f.get(k),(int,float))]
    return p+[('Satış Birimi','Adet'),('Marka',m['brand'])]


def prose(m,f):
    c,k=m['code'],m['kind']
    if k in SHAPES:
        shape,meaning=SHAPES[k]
        mat='SS hem gövdenin hem insertin paslanmaz olduğunu gösterir' if m['stainless'] else 'Plastik gövde ile paslanmaz insert birlikte çalışır'
        insert='SB dar iç bilezikli insert tipidir' if k.startswith('S-SB') else 'UC setuskurlu insert tipidir'
        rows=[
         f'{c} kodunda {meaning} belirtir; {insert}. {c} için {tr_lower(mat)}.',
         f'{c} ünitesinde iç bilezik mille döner, bilyeler yükü dış bileziğe taşır ve gövde bu yükü makinenin bağlantı yüzeyine aktarır.',
         '',
         f'{c} takılırken gövde yerine oturtulur, mil hattı hizalanır ve insertin iç bileziği setuskur vidalarıyla mile sabitlenir.',
         f'{c} ünitesinin yağlama yolunu temiz tutmak, gresin rulman bölgesine ulaşmasını sağlar; yağlama sonrası dışarıda kalan fazlalıklar alınır.',
         f'{c}, '+('paslanmaz gövde ve insertiyle' if m['stainless'] else 'beyaz plastik gövdesi ve paslanmaz insertiyle')+' nemli ve yıkamalı gıda, içecek ve paketleme hatlarında kullanılır.',
         f'{c} komple ünite olarak değiştirilebilir; gövde bağlantısı ve insertin mil üzerindeki sabitlemesi aynı servis sırasında ele alınır.']
        dtype=('Komple Paslanmaz 'if m['stainless']else'Plastik Gövdeli Paslanmaz ')+shape+' Yataklı Rulman'
        seo=('Paslanmaz 'if m['stainless']else'Plastik ')+{'UCPA':'Taban Bağlantılı','UCFC':'Yuvarlak Flanşlı'}.get(k,shape)+' Rulman'
    elif k=='INSERT':
        rows=[
         f'{c} kodundaki UC, mile setuskurla bağlanan insert rulmanı belirtir; '+('S öneki paslanmaz yapıyı anlatır.'if m['series']=='SUC'else'bu ürünün markası ETAZON olarak belirtilir.'),
         f'{c} iç bileziği mille birlikte döner, bilyeler yükü dış bileziğe taşır; küresel dış yüzey rulmanın yatak gövdesine oturmasını sağlar.',
         '',
         f'{c} gövdeye yerleştirildikten sonra mil geçirilir ve iç bilezik üzerindeki setuskur vidalarıyla mil bağlantısı tamamlanır.',
         f'{c} için gövdenin gres yolu açık tutulur; rulman çevresindeki eski gres ve biriken kir servis sırasında temizlenerek yağlama düzeni korunur.',
         f'{c}, '+('nemli üretim alanlarında, gıda ve içecek taşıma hatlarının paslanmaz yataklarında kullanılır.'if m['series']=='SUC'else'konveyör, tarım makinesi ve yardımcı tahrik millerinde rulman kısmının yenilenmesi için kullanılır.'),
         f'{c} ile rulman kısmı yenilenirken mevcut gövde serviste kullanılabilir; küresel oturma yüzeyi temizlenerek yeni insert için hazırlanır.']
        dtype=('Paslanmaz 'if m['series']=='SUC'else'ETAZON ')+'Setuskurlu Insert Rulman'
        seo=('Paslanmaz 'if m['series']=='SUC'else'ETAZON ')+'Insert Rulman'
    elif k=='SN':
        rows=[
         f'{c} kodundaki SN iki parçalı ayaklı gövdeyi belirtir; bu gövde ailesi manşonlu rulman montajında kullanılan yataklama düzenidir.',
         f'{c} alt gövdesi tabana bağlanır, üst kapağı rulmanı çevreler; kapağın ayrılması rulmana ve mil çevresine doğrudan erişim sağlar.',
         '',
         f'{c} montajında rulman ve manşon mile alınır, alt gövde üzerine yerleştirilir; üst kapak kendi oturma yüzeyine bağlanarak gövde tamamlanır.',
         f'{c} içindeki gres rulmanın çevresine dağıtılır; yağlama deliğinin temiz ve erişilebilir tutulması periyodik bakım işini kolaylaştırır.',
         f'{c}, konveyör tamburları, fanlar ve uzun millerin yataklanmasında kullanılır; iki parçalı yapı üretim makinelerinin servisinde pratik erişim sağlar.',
         f'{c} için rulman, manşon ve tespit bileziği seçenekleri: '+clean(f.get('rulman_manson_tespit_bilezigi_secimleri',''))+'.']
        dtype='İki Parçalı Ayaklı Rulman Yatağı';seo='İki Parçalı Rulman Yatağı'
    elif k=='FRB':
        rows=[
         f'{c} kodundaki FRB, rulmanı gövde içinde eksenel olarak konumlandıran tespit bileziğini belirtir; kapalı çelik halka biçiminde kullanılır.',
         f'{c}, rulmanın dış bileziği ile gövdenin yuva omzu arasına oturur; sabit yatak tarafında rulmanın eksen doğrultusundaki konumunu belirler.',
         '',
         f'{c} takılırken yatak yuvası temizlenir, rulman yerine alınır ve halka gövdenin yuva omzuna düzgün temas edecek şekilde yerleştirilir.',
         f'{c} dönen bir rulman elemanı değildir; bakımda halka yüzeyleri, yuva omzu ve rulmanın dış bileziğiyle temas eden bölüm gözden geçirilir.',
         f'{c}, iki parçalı yatakların sabit tarafında görev alır; konveyör, fan ve endüstriyel taşıma millerinin eksenel yerleşiminde kullanılır.',
         f'{c} için '+('rulman ve manşon eşleşmeleri: '+clean(f['katalog_rulman_manson_eslesmeleri'])if f.get('katalog_rulman_manson_eslesmeleri')else'parça seçimi, gövde yuvasındaki boşluk ile rulmanın dış bileziği arasındaki yerleşime göre yapılır')+'.']
        dtype='Rulman Tespit Bileziği';seo=dtype
    else:
        rows=[
         f'{c} kodundaki TSN, SN tipi yatak gövdelerinin mil girişinde kullanılan keçe ailesini belirtir; mil çevresindeki sızdırmazlık düzenini tamamlar.',
         f'{c}, mil ile gövde arasındaki geçişte çalışır; dışarıdan gelen kirin yatak bölgesine taşınmasını azaltır ve gresin içeride tutulmasına yardımcı olur.',
         '',
         f'{c} takılmadan önce milin keçe bölgesi ve gövdedeki yuva temizlenir; keçe oturma düzenine yerleştirilerek yatak kapağı bağlanır.',
         f'{c} bakımında milin temas yüzeyi ve keçe çevresi birlikte incelenir; yuva temiz tutulup yatak bölgesindeki yağlama düzeni korunur.',
         f'{c}, SN yataklı konveyörlerin, fanların ve taşıma millerinin girişlerinde kullanılır; tozlu üretim alanlarında yatağın korunmasına katkı sağlar.',
         f'{c} değişiminde eski keçenin yerleşim yönü kaydedilir; mil ve yatak kapağı temizlenerek yeni keçenin oturma alanı hazırlanır.']
        dtype='Kauçuk Yatak Keçesi';seo=dtype
    facts=', '.join(label.split(' (')[0]+' '+number(m['values'][letter])+' mm'for letter,label in m['labels']if letter in m['values'])
    rows[2]=f'{c} ölçüleri: {facts}.'if facts else f'{c} yerleşiminde mil hattı, bağlantı yüzeyi ve komşu parçaların konumu birlikte ele alınır; servis için gereken çalışma alanı bu düzene göre hazırlanır.'
    return dtype,seo,rows


def keywords(m,f):
    c,n,k,s=m['code'],m['num'],m['kind'],m['series']
    words=[tr_lower(c),tr_lower(c.replace(' ','')),tr_lower(c.replace(' ','-'))]
    if k=='FRB':
        b,d=n.split('x');words += [f'frb {b}/{d}',f'frb{b}/{d}',f'frb {b}*{d}','rulman tespit halkası','yatak tespit bileziği','kapalı çelik halka']
        if'D'in m['values']and'B'in m['values']:words += [number(m['values']['D'])+'x'+number(m['values']['B'])+' tespit bileziği']
        words += re.findall(r'\b\d{4,5}\s*[A-Z][A-Z0-9]*',f.get('katalog_rulman_manson_eslesmeleri',''))
    elif k=='SN':
        words += ['rulman yatak gövdesi','ayaklı yatak gövdesi','iki parçalı rulman yatağı','manşonlu rulman yatağı','split plummer block housing']
        words += [x+' yatağı'for x in re.findall(r'\b\d{4,5}[A-Z][A-Z0-9]*',f.get('rulman_manson_tespit_bilezigi_secimleri',''))]
    elif k=='TSN':
        words += [f'sn {n} keçesi',f'snh {n} keçe','yatak keçesi','kauçuk yatak keçesi','rulman yatağı sızdırmazlık','bearing housing seal']
    elif m['plastic']:
        words += ['plastik gövdeli paslanmaz rulman','termoplastik yatak','beyaz plastik yataklı rulman',
                  tr_lower(SHAPES[k][0])+' plastik rulman','plastik rulman yatağı','plastic housing stainless insert bearing']
    elif m['stainless']:
        bare=tr_lower(s[2:]);words += [f'ss {bare} {n}',f'ss-{bare}{n}',f'{bare} {n} paslanmaz',f'{bare}{n} inox',
                  'paslanmaz yataklı rulman','inox rulman yatağı','stainless pillow block bearing'if k=='UCP'else'stainless flange bearing']
        if k not in ['UCP','UCT']:words += ['paslanmaz flanşlı rulman']
        if f.get('insert_kodu'):words += [f'ssuc{n}',f'ss-uc{n}',f'uc{n} paslanmaz insert']
        if f.get('govde_kodu'):words += [tr_lower(f['govde_kodu'])+' paslanmaz gövde']
    else:words += ['setuskurlu insert rulman','küresel dış bilezikli rulman','insert bearing','paslanmaz insert'if s=='SUC'else'etazon insert rulman']
    main='D'if k=='FRB'else'd1'if k=='SN'else'd'
    if main in m['values']:
        d=number(m['values'][main]);words += [d+' mm',d+'mm',d+'lik',d+' lik']
        words += [d+' mm '+('plastik gövdeli paslanmaz yatak'if m['plastic']else'mil paslanmaz yatak'if m['stainless']else'yatak keçesi'if k=='TSN'else'rulman yatağı')]
        if m['stainless']and k not in ['UCP','UCT']:words += [d+' lik paslanmaz flanşlı rulman']
        if k=='TSN':words += ['yatak keçesi '+d+' mm']
    words += [m['brand']]
    result=[];seen=set()
    for word in words:
        for v in [tr_lower(clean(word)),ascii_text(clean(word))]:
            if v not in seen and v and len(', '.join(result+[v]))<=950:result.append(v);seen.add(v)
    return ', '.join(result)


def create_record(raw,tech,image,labels,index):
    m=model(raw,tech,labels);f=tech['alanlar'];k=m['kind'];c=m['code'];vals=m['values']
    dtype,seo,paragraphs=prose(m,f)
    main='D'if k=='FRB'else'd1'if k=='SN'else'd'
    suffix=' '+number(vals[main])+' mm'if main in vals else''
    title=c+' '+dtype+suffix
    p=properties(m,f)
    overview=[(label,number(vals[letter])+' mm')for letter,label in m['labels']if letter in vals][:5]
    if not overview:overview=[('Ürün Kodu',c),('Tip',dtype)]
    overview += [('Marka',m['brand'])]
    cells=['<td><strong>'+html.escape(label)+'</strong> '+html.escape(value)+'</td>'for label,value in overview]
    intro='<table><tbody>'+''.join('<tr>'+''.join(cells[i:i+3])+'</tr>'for i in range(0,len(cells),3))+'</tbody></table>'
    lead=f'{title}, '+('milin dönme hareketini taşıyan insert ile bağlantı gövdesini bir araya getirir.'if k in SHAPES else'makinenin yataklama düzeninde görev alan bir parçadır.')
    if main in vals:lead+=f' {c} için ana ölçü {number(vals[main])} mm olarak belirtilir.'
    lead+=f' {c} yapısı, montaj biçimi ve servis sırasında kullanılan ölçüler aşağıda birlikte ele alınmıştır.'
    for t in range(7):paragraphs[t]+=' '+A[(index+t)%8]+' '+B[(index//8+t)%8]
    if k in SHAPES:links=[('paslanmaz-plastik-yatakli-rulman'if m['plastic']else'paslanmaz-yatakli-rulman','aynı ailedeki yataklı rulmanlar'),('yatakli-rulman','yataklı rulmanlar')]
    elif k=='INSERT':links=[('rulman-yataklari-ve-insert-737','rulman yatakları ve insertler'),('yatakli-rulman','yataklı rulman çeşitleri')]
    elif k=='SN':links=[('dokum-yataklari','döküm yatakları'),('oynak-makarali-rulmanlar','oynak makaralı rulmanlar')]
    elif k=='FRB':links=[('rulman-ve-yatak-aksesuarlari-735','rulman ve yatak aksesuarları'),('dokum-yataklari','yatak gövdeleri')]
    else:links=[('rulman-keceleri-ve-yatak-keceleri-736','rulman ve yatak keçeleri'),('dokum-yataklari','yatak gövdeleri')]
    links += [('gresler-177','rulman gresleri')]
    for t,(url,anchor)in zip([1,5,4],links):paragraphs[t]+=f' {c} ile birlikte değerlendirilebilecek <a href="https://www.yamansarulman.com/{url}">{anchor}</a> bu bölümde yer alır.'
    description='<div class="urunTabAlt"><div class="ydsc"><div class="ym"><h2>'+html.escape(title)+'</h2><p>'+lead+'</p>'
    description+=''.join('<div class="ysc"><h3>'+h+'</h3><p>'+v+'</p></div>'for h,v in zip(TOPICS,paragraphs))
    description+='</div><aside class="ya"><h3>Ürün Özellikleri</h3><ul>'+''.join('<li><strong>'+html.escape(a)+':</strong> '+html.escape(b)+'</li>'for a,b in p)+'</ul></aside></div></div>'
    sd=c+' '+tr_lower(seo)+'.'
    for letter,label in m['labels'][:3]:
        if letter in vals:
            fact=' '+number(vals[letter])+' mm '+tr_lower(label.split(' (')[0])+'.'
            if len(sd+fact+' '+m['brand']+'.')<=155:sd+=fact
    sd+=' '+m['brand']+'.'
    cat={'SN':BASE+'DÖKÜM YATAKLARI','FRB':'RULMAN>MANŞON SOMUN VE PUL>TESPİT BİLEZİKLERİ','TSN':'RULMAN>RULMAN KEÇELERİ VE YATAK KEÇELERİ'}.get(k,INSERT if m['plastic']or k=='INSERT'else STAINLESS)
    missing=len(vals)!=len(m['labels'])or k=='TSN'
    kw=keywords(m,f)
    r=dict(kod=raw['kod'],URUNADI=title,MARKA=m['brand'],KATEGORI=cat,EK_KATEGORILER=[],yeni_kategori=False,
           ONYAZI=intro,ACIKLAMA=description,ANAHTARKELIME=kw,SEO_SAYFABASLIK=c+' '+seo+suffix,SEO_SAYFAACIKLAMA=sd,
           SEO_ANAHTARKELIME=kw,resim='gorseller/'+ascii_slug(title)+'.jpg',resim_seviye=image['resim_seviye'],
           resim_kaynak=image['resim_kaynak'],teknik_kaynak=tech['kaynak'],bayraklar=['eksik','cizim_yok']if missing else[])
    return r,m


def context(r):
    soup=BeautifulSoup(r['ACIKLAMA'],'html.parser');specs=[]
    for li in soup.select('li'):
        s=li.find('strong',recursive=False);specs.append(dict(l=s.get_text().rstrip(':'),v=''.join(str(x)for x in s.next_siblings).strip()))
    return dict(kod=r['kod'],path='/'+ascii_slug(r['URUNADI']),title=r['URUNADI'],crumbs=r['KATEGORI'].split('>'),specs=specs,onyazi=[])


NODE="""
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),window={};
for(const n of ['yatakli','yatak'])vm.runInNewContext(fs.readFileSync(path.join(process.argv[3],n+'.js'),'utf8'),{window});
const a=JSON.parse(fs.readFileSync(process.argv[1],'utf8')),out=[];
a.forEach((c,i)=>{const before=JSON.stringify(c),match=window.YDRAW.yatak.match(c),r=window.YDRAW.yatak.draw(c,{id:'bearing'+i,dim:'#17365d'});
assert.equal(JSON.stringify(c),before);if(r){assert(!/NaN|undefined|Infinity/.test(r.svg));r.keys.forEach(k=>assert(r.svg.includes('data-k="'+k.k+'"')));fs.writeFileSync(path.join(process.argv[2],i+'.svg'),r.svg);}
out.push({kod:c.kod,match,draw:!!r,keys:r?r.keys.map(k=>k.k):[]});});console.log(JSON.stringify(out));
"""


def audit(records,models,drawings,output):
    assert len(records)==len({r['kod']for r in records})==len({r['URUNADI']for r in records})==len({r['resim']for r in records})==281
    allowed=set((REPO/'katurl.txt').read_text().splitlines());known=set()
    for line in (REPO/'site_kategoriler.txt').read_text().splitlines():
        p=line.split('\t',1)[-1].strip().split('>');known.update('>'.join(p[:i])for i in range(1,len(p)+1))
    ps={};ss={};sizes=[]
    for r,m,d in zip(records,models,drawings):
        c=r['kod'];text=json.dumps(r,ensure_ascii=False)
        for key in ['kod','URUNADI','MARKA','KATEGORI','ONYAZI','ACIKLAMA','ANAHTARKELIME','SEO_SAYFABASLIK','SEO_SAYFAACIKLAMA','SEO_ANAHTARKELIME','resim','resim_seviye','resim_kaynak']:assert isinstance(r[key],str)and r[key].strip(),(c,key)
        assert r['KATEGORI']in known and not r['yeni_kategori']
        assert not re.search('orka(?:pt)?',ascii_text(text))and '\u0307'not in text and '—'not in text,c
        customer=' '.join(str(v)for k,v in r.items()if k not in ['kod','teknik_kaynak','resim_kaynak'])
        assert not re.search(r'\b(?:FK|PEER|NTN|TOJO|CRAFT|SKF|SNR)\b|tek başına|anlamına gelmez|katalogla doğrulan|Görsel aynı tip',customer,re.I),c
        soup=BeautifulSoup(r['ACIKLAMA'],'html.parser');size=len(soup.get_text(' ',strip=True));sizes.append(size);assert size>=1800,(c,size)
        links=[a['href']for a in soup.select('a[href]')];assert 2<=len(links)<=4 and all(u in allowed for u in links),(c,links)
        for key,limit in [('SEO_SAYFABASLIK',60),('SEO_SAYFAACIKLAMA',155),('ANAHTARKELIME',950),('SEO_ANAHTARKELIME',950)]:assert len(r[key])<=limit,(c,key,len(r[key]))
        intro=BeautifulSoup(r['ONYAZI'],'html.parser');assert intro.find('table')and not intro.find('br')and not intro.select('[style]')
        assert all(t.find('strong')and t.get_text(strip=True)!=t.strong.get_text(strip=True)for t in intro.select('td'))
        for p in soup.select('p'):
            paragraph=re.sub(r'\s+',' ',p.get_text(' ',strip=True)).strip()
            for item,seen in [(paragraph,ps)]+[(s,ss)for s in re.split(r'(?<=[.!?])\s+',paragraph)]:
                v=tr_lower(item)
                if len(v)>120:assert v not in seen or seen[v]==c,('duplicate prose',c,seen.get(v),v);seen[v]=c
        specs={s['l']:s['v']for s in context(r)['specs']}
        for letter,label in m['labels']:
            if letter in m['values']:assert specs[label]==number(m['values'][letter])+' mm'
        assert specs['Satış Birimi']=='Adet'and specs['Marka']==r['MARKA']
        assert d['kod']==c and d['match']==bool(m['values'])
        assert d['draw']==('cizim_yok'not in r['bayraklar']),(c,d,r['bayraklar'])
        assert ('eksik'in r['bayraklar'])==(len(m['values'])<len(m['labels'])or m['kind']=='TSN')
        assert r['resim_seviye']in ['birebir','ayni_tip']
        with Image.open(output/r['resim'])as im:assert im.size==(500,500)and im.format=='JPEG'
        if not r['teknik_kaynak']:assert 'eksik'in r['bayraklar']
    assert len(list((output/'gorseller').glob('*.jpg')))==281
    return dict(products=281,plain_text_min=min(sizes),plain_text_max=max(sizes),
                seo_title_max=max(len(r['SEO_SAYFABASLIK'])for r in records),
                seo_description_max=max(len(r['SEO_SAYFAACIKLAMA'])for r in records),
                keywords_max=max(len(r['ANAHTARKELIME'])for r in records),
                duplicate_long_paragraphs=0,duplicate_long_sentences=0,forbidden_words=0,
                combining_dot=0,em_dash=0,drawings=sum(d['draw']for d in drawings),
                no_drawing=sum(not d['draw']for d in drawings),missing_technical=sum('eksik'in r['bayraklar']for r in records))


def report(records,models,drawings,result,out):
    groups=collections.defaultdict(collections.Counter)
    for r,m,d in zip(records,models,drawings):
        v=groups[m['series']];v['toplam']+=1;v['cizim']+=d['draw'];v['cizim_yok']+=not d['draw'];v['eksik']+='eksik'in r['bayraklar']
    imgs=collections.Counter(r['resim_seviye']for r in records)
    lines=['# Yatak ürünleri teslim raporu','','281 benzersiz ürün kodu, 281 benzersiz ürün adı. Kopya kod yok.',
           f"Görseller: birebir {imgs['birebir']}, aynı tip {imgs['ayni_tip']}, görsel yok 0.",
           'Fotoğraflar kabul edilen içerikleri değiştirilmeden ürün adı ASCII slug biçimine kopyalandı.','',
           '## Denetim','','~~~json',json.dumps(result,ensure_ascii=False,indent=2),'~~~','',
           'Eksik: çizim geometrisi tamamlanmamış ürünler ve tam kesit ölçüsü bulunmayan TSN keçeleridir.',
           'İsteğe bağlı yük/ağırlık verisinin yokluğu tek başına eksik bayrağı oluşturmaz.',
           'Doğrulanmış kaynağı hiç olmayan ürünlerde teknik_kaynak boş listedir; kaynak uydurulmadı.','',
           '| Seri | Toplam | Çizim | Çizim yok | Eksik |','|---|---:|---:|---:|---:|']
    lines += [f"| {s} | {v['toplam']} | {v['cizim']} | {v['cizim_yok']} | {v['eksik']} |"for s,v in sorted(groups.items())]
    lines += ['','## Eksik teknik listesi','']+['- '+r['kod']+': '+r['URUNADI']for r in records if 'eksik'in r['bayraklar']]
    lines += ['','## Kategori dağılımı','']+['- '+k+': '+str(v)for k,v in sorted(collections.Counter(r['KATEGORI']for r in records).items())]
    lines += ['','Yeni kategori önerisi yok. Komple paslanmaz ürünler mevcut PASLANMAZ YATAKLI RULMAN üst yolundadır.',
      'Kategori doğrulama sınırlaması: HTTP ve Chrome kategori istekleri HTTP403/bot kontrolü verdi; web metin servisi breadcrumb yerine ana sayfa döndürdü.',
      'Plastik kategori URLsi ve paslanmaz-rulmanlar URLsi katurl.txt içinde mevcut; ancak tam breadcrumb doğrulanamadı.',
      'Yol uydurulmadı: plastik üniteler ve SUC insertler mevcut RULMAN>YATAKLI RULMAN>RULMAN YATAKLARI VE INSERT yolunda.',
      'SUC ikinci paslanmaz kategori yolu doğrulanamadığından EK_KATEGORILER boş bırakıldı. Özel plastik breadcrumb ve SUC ikinci kategori yolu teyit bekler.',
      '','## Uygulama notları','',
      '- TSN girdisindeki TAKIM birimi istenen biçimde Satış Birimi: Adet olarak yazıldı.',
      '- TSN son eki, genişliği ve dış çapı türetilmedi; yalnız kaynakta bulunan ortak mil çapı yazıldı.',
      '- ETAZON insertlere yalnız standart geometri aktarıldı; markaya özel yük değerleri yazılmadı.',
      '- SN geometrisi tek tablodan alındı. Rulman/manşon/SR ve keçe eşleşmeleri bu gövdenin satırlarından.',
      '- SNL karşılaştırmasının FRB seçenekleri SN gövdesinin kanıtlı uyumluluğu gibi sunulmadı.',
      '- SSUCFL çizim etiketleri H=FK_a_mm, L=FK_b_mm olacak şekilde düzeltildi; kaynak sayılar değiştirilmedi.',
      '- FRB adındaki ölçü dizisi özgün ürün kodudur. Teknik ölçüsü bulunmayan ürüne ayrıca mm değeri eklenmedi.',
      '- SSBP/SSBT fotoğrafları kabul edilen en yakın görünüşlerdir; SB insert eşitliği doğrulanmamış görsel istisnası korunmuştur.',
      '- Müşteri metnine kaynak üretici adı yazılmadı; teknik_kaynak/resim_kaynak URLleri korunmuştur.',
      '- 120 karakteri geçen normalleştirilmiş tam paragraf ve cümlelerin ürünler arası birebir tekrar sayısı sıfırdır.',
      '','## Çizim modülü','', 'draw/yatak commit: '+SHA,
      'draw/yatak dalının site-assets dalına merge edilmesi gerekir. Çizim modülü bu dala kopyalanmadı.',
      'Gerçek ACIKLAMA li listelerinden ctx.specs çıkarıldı; yatak.js ve yatakli.js ile Node içinde işlendi.',
      '','## Ön izlemeler','','- onizleme/sn-517.png','- onizleme/frb-10x110.png','- onizleme/sucf-205.png',
      '','## Teknik kaynaklar','']
    lines += ['- '+u for u in sorted({u for r in records for u in r['teknik_kaynak']})]
    lines += ['','## Tekrar üretim','',
      'Mevcut image-env içinde beautifulsoup4, Pillow ve playwright kullanılır; Node NVM yolundan bulunur.',
      'python icerik.py --output /home/ubuntu/work/orkapt-yatak','python icerik_test.py',
      'Girdiler /home/ubuntu/work/yatak içindedir. Teknik araştırma ve çizim dosyaları değiştirilmedi; ana checkout orkapt-girdi olarak korundu.']
    (out/'rapor.md').write_text('\n'.join(lines)+'\n')


async def previews(records,artifacts,out):
    folder=out/'onizleme';folder.mkdir(exist_ok=True)
    css="""body{margin:0;background:#f3f6fa;color:#24354a;font:15px/1.65 Arial,sans-serif}
    header{background:#102d50;color:white;padding:18px 40px;font-weight:bold}main{max-width:1200px;margin:28px auto}
    h1{font-size:27px;line-height:1.35;color:#102d50}h2{font-size:22px;color:#102d50}h3{font-size:18px;color:#102d50}
    .hero{display:grid;grid-template-columns:500px 1fr;gap:32px;background:white;border-radius:16px;padding:24px}
    .hero img{width:500px;height:500px;object-fit:contain}.hero table{width:100%;border-spacing:6px}
    .hero td{background:#f3f6fa;border-radius:8px;padding:14px;font-size:19px;font-weight:bold}
    .hero td strong{display:block;font-size:12px;font-weight:normal;color:#64748b}
    .drawing{background:white;border-radius:16px;padding:22px;margin:24px 0}.drawing svg{display:block;width:460px;height:auto;margin:auto}
    .urunTabAlt{background:white;padding:28px;border-radius:16px}.ydsc{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:30px}
    .ysc{border-top:1px solid #e2e8f0;margin-top:22px;padding-top:15px}.ya{align-self:start;background:#f3f6fa;border-radius:12px;overflow:hidden}
    .ya h3{background:#102d50;color:white;padding:16px;margin:0}.ya ul{list-style:none;padding:0;margin:0}
    .ya li{padding:10px 14px;border-bottom:1px solid #dfe6ef;overflow-wrap:anywhere}.ya li strong{display:block;font-size:12px;color:#64748b}a{color:#175b94}"""
    async with async_playwright()as p:
        browser=await p.chromium.connect_over_cdp('http://127.0.0.1:9333')
        ctx=await browser.new_context(viewport={'width':1365,'height':900},device_scale_factor=1);page=await ctx.new_page()
        for code,name in [('ORK RY SN 517','sn-517'),('ORK FRB 10110','frb-10x110'),('ORK YR SUCF205','sucf-205')]:
            i=next(i for i,r in enumerate(records)if r['kod']==code);r=records[i];svg=(artifacts/(str(i)+'.svg')).read_text()
            doc='<!doctype html><html lang="tr"><meta charset="utf-8"><title>'+html.escape(r['URUNADI'])+'</title><style>'+css+'</style><header>'+r['MARKA']+'</header><main><section class="hero"><img src="../'+r['resim']+'" alt="'+html.escape(r['URUNADI'])+'"><div><h1>'+html.escape(r['URUNADI'])+'</h1>'+r['ONYAZI']+'</div></section><section class="drawing"><h2>Teknik Çizim</h2>'+svg+'</section>'+r['ACIKLAMA']+'</main></html>'
            file=folder/(name+'.html');file.write_text(doc);await page.goto(file.as_uri());await page.evaluate('document.fonts.ready')
            assert await page.locator('.hero img').evaluate('(im)=>im.complete&&im.naturalWidth===500')
            assert await page.evaluate('document.documentElement.scrollWidth<=1365')
            await page.screenshot(path=str(folder/(name+'.png')),full_page=True)
        await ctx.close();await browser.close()


def generate(out):
    products=[json.loads(s)for s in gzip.open(REPO/'parca/yatak.jsonl.gz','rt')]
    tech=json.loads((ROOT/'teknik.json').read_text());images=json.loads((ROOT/'gorsel.json').read_text());labels=contracts()
    records=[];models=[]
    for index,raw in enumerate(products):
        r,m=create_record(raw,tech[raw['kod']],images[raw['kod']],labels,index);records.append(r);models.append(m)
    assert set(tech)==set(images)=={r['kod']for r in records}
    artifacts=ROOT/'icerik-denetim';artifacts.mkdir(exist_ok=True)
    (artifacts/'contexts.json').write_text(json.dumps([context(r)for r in records],ensure_ascii=False))
    node=shutil.which('node')or str(Path.home()/'.nvm/versions/node/v24.22.2/bin/node')
    p=subprocess.run([node,'-e',NODE,str(artifacts/'contexts.json'),str(artifacts),str(DRAW)],capture_output=True,text=True,check=True)
    drawings=json.loads(p.stdout);(artifacts/'drawings.json').write_text(json.dumps(drawings,ensure_ascii=False,indent=2))
    (out/'gorseller').mkdir(exist_ok=True)
    for r in records:
        source=ROOT/images[r['kod']]['dosya'];dest=out/r['resim'];shutil.copyfile(source,dest)
        assert hashlib.sha256(source.read_bytes()).digest()==hashlib.sha256(dest.read_bytes()).digest()
    result=audit(records,models,drawings,out)
    (out/'urunler.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n'for r in records))
    (artifacts/'denetim.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    report(records,models,drawings,result,out);asyncio.run(previews(records,artifacts,out))
    print('PASS:',json.dumps(result,ensure_ascii=False))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=OUT);args=parser.parse_args();generate(args.output.resolve())
