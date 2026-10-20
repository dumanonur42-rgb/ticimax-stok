yg=open('yg.js').read(); d=open('desc.js').read(); o=open('onyazi.js').read()+'\n'+open('fiyat.js').read()
d=d.replace("(function(){\nvar A=document.querySelector('#divTabOzellikler .urunTabAlt');","function YD(){\nvar A=document.querySelector('.urunTabAlt');",1)
d=d.rstrip()[:-5]+'}'
d=d.replace("if(!A||A.__yd)return;A.__yd=1;","if(!A||A.__yd)return false;A.__yd=1;")
out="/* Yamansa urun sayfasi: galeri + teknik cizim + aciklama duzeni. Sag kolon/Sepete Ekle degismez. */\n(function(){\nfunction YG(){\n"+yg+"\n}\n"+d+"\n"+o+"\n"+"""var t0=Date.now();(function w(){if(document.querySelector('.leftImage #imgUrunResim, .leftImage #divThumbList img')){try{YG()}catch(e){}}else if(Date.now()-t0<15000)return setTimeout(w,300)})();
function tryD(){try{YD()}catch(e){}try{YO()}catch(e){}try{YF()}catch(e){}}tryD();var mo=new MutationObserver(tryD);mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(function(){mo.disconnect()},60000);
})();
"""
open('yamansa-urun.js','w').write(out)
