from pathlib import Path
import json

ROOT=Path(__file__).resolve().parent
def read(name):
    return (ROOT/name).read_text()

draw_data={}
data_files=sorted((ROOT/'draw'/'data').glob('*.json'))
for p in data_files:
    draw_data.update(json.loads(p.read_text()))
draw_files=[p for p in sorted((ROOT/'draw').glob('*.js')) if not p.name.startswith('_')]
draw_prefix=''
if data_files:
    draw_prefix='window.YDRAW_DATA=Object.assign(window.YDRAW_DATA||{}, '+json.dumps(draw_data,ensure_ascii=False)+');\n'
draw_prefix+=''.join(p.read_text()+'\n' for p in draw_files)
yg=read('yg.js'); d=read('desc.js'); o=read('onyazi.js')+'\n'+read('fiyat.js')
d=d.replace("(function(){\nvar A=document.querySelector('#divTabOzellikler .urunTabAlt');","function YD(){\nvar A=document.querySelector('.urunTabAlt');",1)
d=d.rstrip()[:-5]+'}'
d=d.replace("if(!A||A.__yd)return;A.__yd=1;","if(!A||A.__yd)return false;A.__yd=1;")
out="/* Yamansa urun sayfasi: galeri + teknik cizim + aciklama duzeni. Sag kolon/Sepete Ekle degismez. */\n(function(){\nfunction YG(){\n"+yg+"\n}\n"+d+"\n"+o+"\n"+"""var t0=Date.now();(function w(){if(document.querySelector('.leftImage #imgUrunResim, .leftImage #divThumbList img')){try{YG()}catch(e){}}else if(Date.now()-t0<15000)return setTimeout(w,300)})();
function tryD(){try{YD()}catch(e){}try{YO()}catch(e){}try{YF()}catch(e){}}tryD();var mo=new MutationObserver(tryD);mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(function(){mo.disconnect()},60000);
})();
"""
(ROOT/'yamansa-urun.js').write_text(draw_prefix+out)
