/* Yamansa urun sayfasi: galeri + teknik cizim + aciklama duzeni. Sag kolon/Sepete Ekle degismez. */
(function(){
function YG(){
/* Yamansa ürün galerisi + teknik çizim. Sadece .leftImage alanını değiştirir; sağ kolon, fiyat ve Sepete Ekle'ye dokunmaz. */
(function(){
if(window.__YG)return;window.__YG=1;
var L=document.querySelector('.leftImage');if(!L)return;
function Q2(r){[].forEach.call(r.querySelectorAll('button'),function(b){b.type='button'})}function J(s){try{return JSON.parse(s)}catch(e){return{}}}
// --- görseller
var photos=[];[].forEach.call(document.querySelectorAll('#divThumbList img'),function(i){var c=J(i.getAttribute('data-cloudzoom'));var src=c.image||i.src,z=c.zoomImage||src;if(photos.every(function(p){return p.src!=src}))photos.push({src:src,zoom:z});});
if(!photos.length){var m=document.querySelector('#imgUrunResim');if(m){var c=J(m.getAttribute('data-cloudzoom'));photos.push({src:m.src,zoom:c.zoomImage||m.src});}}
if(window.YG_PHOTOS)photos=window.YG_PHOTOS;
var title=(document.querySelector('.ProductName h1, h1')||{}).textContent||'';title=title.trim();
// --- özellikler (sayfadaki Ürün Özellikleri listesinden; tahmin yok)
var specs=[];[].forEach.call(document.querySelectorAll('#divTabOzellikler li'),function(li){var st=li.querySelector('strong');if(!st)return;var l=st.textContent.replace(/:\s*$/,'').trim();var v=li.textContent.replace(st.textContent,'').trim();if(l&&v)specs.push({l:l,v:v});});
if(window.YG_SPECS)specs=window.YG_SPECS;
function num(v){var m=String(v).replace(',','.').match(/[\d.]+/);return m?parseFloat(m[0]):NaN}
var K={d:/^[İiI]ç\s*çap/i,D:/^dış\s*çap/i,B:/^(genişlik|yükseklik|kalınlık)/i},dims={};
specs.forEach(function(s){for(var k in K)if(K[k].test(s.l)&&!dims[k]&&!isNaN(num(s.v))){dims[k]=num(s.v);s.k=k;s.n=num(s.v);s.u=/mm/i.test(s.v)?'mm':''}});
var hasDraw=!specs.some(function(s){return s.k=='B'&&/^kalınlık/i.test(s.l)})&&dims.d>0&&dims.D>dims.d&&dims.B>0;
var TECH=/\d\s*(mm|cm|kg|gr?|kn|n|rpm|d\/dk|°c|bar|nm)\b/i;specs=specs.filter(function(s){return s.k||(TECH.test(s.v)&&!(hasDims()&&/^ölçü(\s|$)|dxdx/i.test(s.l)))});function hasDims(){return dims.d&&dims.D&&dims.B}
var order=specs.filter(function(s){return s.k}).sort(function(a,b){return 'dDB'.indexOf(a.k)-'dDB'.indexOf(b.k)}).concat(specs.filter(function(s){return !s.k}));
function f(n){return String(n).replace('.',',')}
// --- teknik çizim (ölçüler sayfadaki değerlerden)
function draw(o){var D=dims.D,d=dims.d,B=dims.B,s=Math.min(160/D,95/B),c='#16203a',dim=o.dim||'#0a2350',hat='#9aa6bd',m=o.m||'all';
 var R=D/2*s,r=d/2*s,w=B*s,ring=(D-d)/2*s,t=ring*.3,bt=ring*.3,pr=(D+d)/4*s,br=Math.min(ring*.29,w/2-2);
 var fx=100,sx=275,vw=445,cy=110;if(m=='f')fx=222;if(m=='s')sx=190;
 var id='yg'+Math.random().toString(36).slice(2,7);
 function ar(x1,y1,x2,y2,k,lab,lx,ly,rot){return '<g class="hl '+k+'"><line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+dim+'" stroke-width="1.1" marker-start="url(#a'+id+')" marker-end="url(#a'+id+')"/><text x="'+lx+'" y="'+ly+'" fill="'+dim+'" font-size="12" font-weight="700" text-anchor="middle" '+(rot?'transform="rotate(-90 '+lx+' '+ly+')"':'')+'>'+lab+'</text></g>'}
 function ext(x1,y1,x2,y2){return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+dim+'" stroke-width=".6" opacity=".55"/>'}
 var g='',ld='ø'+f(d),lD='ø'+f(D),lB=f(B);
 if(m!='s'){g+='<g fill="none" stroke="'+c+'" stroke-width="1.5" class="ln"><circle cx="'+fx+'" cy="'+cy+'" r="'+R+'"/><circle cx="'+fx+'" cy="'+cy+'" r="'+(R-t)+'"/><circle cx="'+fx+'" cy="'+cy+'" r="'+(r+bt)+'"/><circle cx="'+fx+'" cy="'+cy+'" r="'+r+'"/></g><circle cx="'+fx+'" cy="'+cy+'" r="'+pr+'" fill="none" stroke="'+c+'" stroke-dasharray="2 3" stroke-width=".8" opacity=".7"/><g stroke="'+c+'" stroke-width=".7" stroke-dasharray="10 3 2 3" opacity=".6"><line x1="'+(fx-R-10)+'" y1="'+cy+'" x2="'+(fx+R+10)+'" y2="'+cy+'"/><line x1="'+fx+'" y1="'+(cy-R-10)+'" x2="'+fx+'" y2="'+(cy+R+10)+'"/></g>'+ar(fx-r,cy+Math.min(30,r*.8),fx+r,cy+Math.min(30,r*.8),'d',ld,fx+Math.max(18,r*.5),cy+Math.min(30,r*.8)-5)+ext(fx-R,cy,fx-R,cy+R+18)+ext(fx+R,cy,fx+R,cy+R+18)+ar(fx-R,cy+R+14,fx+R,cy+R+14,'D',lD,fx,cy+R+29)+'<text x="'+fx+'" y="12" fill="'+dim+'" font-size="10" letter-spacing="1.5" text-anchor="middle" opacity=".75">ÖN GÖRÜNÜŞ</text>'}
 if(m!='f'){[-1,1].forEach(function(k){var yo=k<0?cy-R:cy+R-t,yi=k<0?cy-r-bt:cy+r,yb=cy+k*pr,ys=k<0?cy-R+t:cy+r+bt,ye=k<0?cy-r-bt:cy+R-t;
  g+='<rect x="'+sx+'" y="'+yo+'" width="'+w+'" height="'+t+'" fill="url(#'+id+')" stroke="'+c+'" stroke-width="1.5"/><rect x="'+sx+'" y="'+yi+'" width="'+w+'" height="'+bt+'" fill="url(#'+id+')" stroke="'+c+'" stroke-width="1.5"/><circle class="ln" cx="'+(sx+w/2)+'" cy="'+yb+'" r="'+br+'" fill="none" stroke="'+c+'" stroke-width="1.5"/><line x1="'+(sx+2)+'" y1="'+ys+'" x2="'+(sx+2)+'" y2="'+ye+'" stroke="'+c+'" stroke-width="2.4"/><line x1="'+(sx+w-2)+'" y1="'+ys+'" x2="'+(sx+w-2)+'" y2="'+ye+'" stroke="'+c+'" stroke-width="2.4"/>'});
  g+='<line x1="'+(sx-12)+'" y1="'+cy+'" x2="'+(sx+w+12)+'" y2="'+cy+'" stroke="'+c+'" stroke-width=".7" stroke-dasharray="10 3 2 3" opacity=".6"/>'+ext(sx,cy-R-18,sx,cy-R)+ext(sx+w,cy-R-18,sx+w,cy-R)+ext(sx+w,cy-R,sx+w+50,cy-R)+ext(sx+w,cy+R,sx+w+50,cy+R)+ext(sx+w,cy-r,sx+w+26,cy-r)+ext(sx+w,cy+r,sx+w+26,cy+r)+ar(sx,cy-R-12,sx+w,cy-R-12,'B',lB,sx+w/2,cy-R-17)+ar(sx+w+44,cy-R,sx+w+44,cy+R,'D',lD,sx+w+58,cy,1)+ar(sx+w+20,cy-r,sx+w+20,cy+r,'d',ld,sx+w+34,cy,1)+'<text x="'+(sx+w/2)+'" y="'+(cy+R+29)+'" fill="'+dim+'" font-size="10" letter-spacing="1.5" text-anchor="middle" opacity=".75">KESİT A-A</text>'}
 return '<svg viewBox="0 0 '+vw+' 225" width="100%" style="display:block"><defs><pattern id="'+id+'" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+hat+'" stroke-width="1.1"/></pattern><marker id="a'+id+'" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9z" fill="'+dim+'"/></marker></defs>'+g+'</svg>'}
// --- ikonlar
function S(p,w){w=w||40;return '<svg width="'+w+'" height="'+w+'" viewBox="0 0 40 40" fill="none" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'}
var IC={d:S('<circle cx="20" cy="20" r="16" stroke="#c9d1df" stroke-width="2"/><circle cx="20" cy="20" r="7.5" stroke="#d0101e" stroke-width="2.4"/><path d="M14.5 20h11" stroke="#0a2350" stroke-width="1.6"/><path d="m16.5 18-2 2 2 2M23.5 18l2 2-2 2" stroke="#0a2350" stroke-width="1.6"/>'),
D:S('<circle cx="20" cy="20" r="16" stroke="#d0101e" stroke-width="2.4"/><circle cx="20" cy="20" r="7.5" stroke="#c9d1df" stroke-width="2"/><path d="M6 20h28" stroke="#0a2350" stroke-width="1.6"/><path d="m8 18-2 2 2 2M32 18l2 2-2 2" stroke="#0a2350" stroke-width="1.6"/>'),
B:S('<rect x="13" y="9" width="14" height="27" rx="2.5" stroke="#d0101e" stroke-width="2.4"/><path d="M13 17h14M13 28h14" stroke="#c9d1df" stroke-width="1.6"/><path d="M13 4h14" stroke="#0a2350" stroke-width="1.6"/><path d="m15 2-2 2 2 2M25 2l2 2-2 2" stroke="#0a2350" stroke-width="1.6"/>'),
marka:S('<path d="m20 5 4.3 9 9.7 1.2-7.1 6.7 1.8 9.6L20 26.8l-8.7 4.7 1.8-9.6L6 15.2l9.7-1.2z" stroke="#0a2350" stroke-width="2"/>'),
tip:S('<circle cx="20" cy="20" r="15" stroke="#0a2350" stroke-width="2"/><circle cx="20" cy="20" r="6" stroke="#0a2350" stroke-width="2"/><g fill="#d0101e"><circle cx="20" cy="10.5" r="2.4"/><circle cx="29.5" cy="20" r="2.4"/><circle cx="20" cy="29.5" r="2.4"/><circle cx="10.5" cy="20" r="2.4"/></g>'),
kapak:S('<circle cx="20" cy="20" r="15" stroke="#c9d1df" stroke-width="2"/><circle cx="20" cy="20" r="11" stroke="#0a2350" stroke-width="3.2" stroke-dasharray="3 2.2"/><circle cx="20" cy="20" r="5.5" stroke="#d0101e" stroke-width="2.2"/>'),
bosluk:S('<circle cx="20" cy="20" r="15" stroke="#0a2350" stroke-width="2"/><circle cx="20" cy="20" r="8" stroke="#0a2350" stroke-width="2"/><path d="M20 5v4M20 31v4" stroke="#d0101e" stroke-width="2.4"/>'),
model:S('<path d="M6 20.5V8a2 2 0 0 1 2-2h12.5l13 13-14.5 14.5z" stroke="#0a2350" stroke-width="2"/><circle cx="13" cy="13" r="2.4" stroke="#d0101e" stroke-width="2.2"/>'),
olcu:S('<rect x="5" y="13" width="30" height="14" rx="2" stroke="#0a2350" stroke-width="2"/><path d="M11 13v5M17 13v7M23 13v5M29 13v7" stroke="#d0101e" stroke-width="1.8"/>'),
gen:S('<circle cx="20" cy="20" r="14" stroke="#0a2350" stroke-width="2"/><path d="M20 13v8l5 3" stroke="#d0101e" stroke-width="2.2"/>')};
function icon(s){if(s.k)return IC[s.k];var l=s.l.toLowerCase();if(/marka/.test(l))return IC.marka;if(/tip|tür/.test(l))return IC.tip;if(/zz|2rs|rs|kapak|conta/.test(l))return IC.kapak;if(/^c\d|boşluk/.test(l))return IC.bosluk;if(/model|seri|kod/.test(l))return IC.model;if(/ölçü|mm/.test(l))return IC.olcu;return IC.gen}
var I=function(p,w){return '<svg width="'+(w||19)+'" height="'+(w||19)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'};
var miniDraw='<svg viewBox="0 0 54 54" fill="none" stroke-linecap="round"><rect width="54" height="54" fill="#f4f7fc"/><g stroke="#0a2350" stroke-width="1.8"><circle cx="22" cy="27" r="14"/><circle cx="22" cy="27" r="6"/></g><circle cx="22" cy="27" r="10" stroke="#0a2350" stroke-width="1" stroke-dasharray="2 2"/><rect x="41" y="13" width="6" height="28" stroke="#0a2350" stroke-width="1.8"/><path d="M16 27h12" stroke="#d0101e" stroke-width="1.8"/></svg>';
// --- CSS
var css='.ymg{--n:#0a2350;--r:#d0101e;font-family:inherit;color:#16203a;position:relative;width:100%}.ymg *{box-sizing:border-box}.ymg svg text{font-family:Arial,sans-serif}'+
'.ymg .card{border-radius:24px;overflow:hidden;background:#fff;box-shadow:0 0 0 1px #e3e8f1,0 22px 46px -20px rgba(10,35,80,.28)}'+
'.ymg .photo{position:relative;aspect-ratio:1/.7;background:radial-gradient(ellipse 65% 55% at 50% 42%,#fff 0,#f2f5fa 55%,#e2e8f2 100%);overflow:hidden;cursor:zoom-in;touch-action:pan-y}'+
'.ymg .view{position:absolute;inset:0;transition:opacity .35s,transform .35s}.ymg .view.off{opacity:0;transform:scale(.97);pointer-events:none}'+
'.ymg .view img{position:absolute;left:15%;top:5%;width:70%;height:84%;object-fit:contain;mix-blend-mode:multiply}'+
'.ymg .floor{position:absolute;left:25%;right:25%;bottom:6%;height:16px;border-radius:50%;background:radial-gradient(closest-side,rgba(10,35,80,.2),transparent)}'+
'.ymg .bigdraw{display:flex;align-items:center;justify-content:center;padding:6% 4%;background:#fbfcfe;background-image:radial-gradient(#dfe5ef 1px,transparent 1px);background-size:14px 14px}'+
'.ymg .tags{position:absolute;top:14px;left:14px;display:flex;gap:6px;z-index:3}.ymg .tags span{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;padding:6px 11px;border-radius:999px;background:rgba(255,255,255,.9);box-shadow:0 2px 10px rgba(10,35,80,.08);color:var(--n)}'+
'.ymg .dot{width:7px;height:7px;border-radius:50%;background:#18a957;animation:ygp 1.6s infinite}@keyframes ygp{0%{box-shadow:0 0 0 0 rgba(24,169,87,.5)}100%{box-shadow:0 0 0 7px rgba(24,169,87,0)}}'+
'.ymg .tools{position:absolute;right:14px;top:14px;display:flex;gap:8px;z-index:3}.ymg .tools button{width:38px;height:38px;border:0;border-radius:50%;background:rgba(255,255,255,.94);box-shadow:0 3px 12px rgba(10,35,80,.14);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--n);padding:0}.ymg .tools button:hover{background:var(--n);color:#fff}'+
'.ymg .thumbs{position:absolute;left:12px;bottom:12px;display:flex;gap:7px;padding:5px;border-radius:16px;background:rgba(255,255,255,.8);backdrop-filter:blur(10px);box-shadow:0 6px 20px rgba(10,35,80,.14);z-index:3}'+
'.ymg .thumbs button{width:50px;height:50px;border-radius:12px;border:2px solid transparent;background:#fff center/86% no-repeat;cursor:pointer;padding:0}.ymg .thumbs button.on{border-color:var(--n);box-shadow:0 3px 10px rgba(10,35,80,.25)}'+
'.ymg .count{position:absolute;right:14px;bottom:16px;font-size:11px;font-weight:700;color:#5a6481;background:rgba(255,255,255,.88);padding:5px 10px;border-radius:999px;z-index:3}'+
'.ymg .nav{position:absolute;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.92);box-shadow:0 3px 12px rgba(10,35,80,.15);color:var(--n);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:3;padding:0;opacity:0;transition:.2s}.ymg .photo:hover .nav{opacity:1}.ymg .nav.p{left:12px}.ymg .nav.n{right:12px}'+
'.ymg .dots{display:none}'+
'.ymg .seam{position:relative;height:12px;background:linear-gradient(#e2e8f2,#fff);border-top:1px solid #dfe5ef}.ymg .seam:before{content:"";position:absolute;left:22px;right:22px;top:0;height:8px;background:repeating-linear-gradient(90deg,#9aa6bd 0 1px,transparent 1px 8px);opacity:.55}'+
'.ymg .tech{padding:0 14px 0}.ymg .th{display:flex;justify-content:space-between;align-items:center;gap:8px}.ymg .th h3{margin:0;font-size:14px;font-weight:700;display:flex;align-items:center;gap:9px;white-space:nowrap}'+
'.ymg .th .ic{width:28px;height:28px;border-radius:10px;background:linear-gradient(135deg,#123a80,#0a2350);display:flex;align-items:center;justify-content:center;color:#fff}.ymg .th small{display:block;font-size:10.5px;color:#8a93a6;font-weight:600}'+
'.ymg .seg{display:flex;background:#f1f4fa;border-radius:11px;padding:3px}.ymg .seg button{border:0;background:none;font-size:11.5px;font-weight:600;padding:6px 10px;border-radius:8px;cursor:pointer;color:#5a6481}.ymg .seg button.on{background:#fff;color:var(--n);box-shadow:0 1px 4px rgba(0,0,0,.08)}'+
'.ymg .draw{margin:8px 0 0;padding:2px 8px;border-radius:16px;background:#fbfcfe;background-image:radial-gradient(#dfe5ef 1px,transparent 1px);background-size:14px 14px;box-shadow:inset 0 0 0 1px #edf0f6;cursor:zoom-in}'+
'.ymg .specs{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px;padding:10px 14px 14px}'+
'.ymg .sp{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:14px;background:#f6f8fc;border:1.5px solid transparent;min-width:0}.ymg .sp svg{flex:none;width:30px;height:30px}'+
'.ymg .sp small{display:block;font-size:9.5px;color:#8a93a6;font-weight:700;letter-spacing:.3px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ymg .sp:not(.k) small{white-space:normal}.ymg .sp b{display:block;font-size:13px;color:var(--n);line-height:1.2}.ymg .sp b em{font-style:normal;font-size:10px;color:#8a93a6;margin-left:2px}'+
'.ymg .sp.k{cursor:pointer}.ymg .sp.k b{font-size:18px}.ymg .sp.k:hover,.ymg .sp.on{background:#fff;border-color:var(--r);box-shadow:0 8px 18px rgba(208,16,30,.1)}'+
'.ymg .hl{transition:opacity .25s}.ymg [data-h] .hl{opacity:.15}.ymg [data-h=d] .hl.d,.ymg [data-h=D] .hl.D,.ymg [data-h=B] .hl.B,.yglb [data-h=d] .hl.d,.yglb [data-h=D] .hl.D,.yglb [data-h=B] .hl.B{opacity:1}.yglb [data-h] .hl{opacity:.15}'+
'.ymg [data-h=d] .hl.d line,.ymg [data-h=D] .hl.D line,.ymg [data-h=B] .hl.B line,.yglb [data-h=d] .hl.d line,.yglb [data-h=D] .hl.D line,.yglb [data-h=B] .hl.B line{stroke:#d0101e!important;stroke-width:2;marker-start:url(#ygRed);marker-end:url(#ygRed)}'+
'.ymg [data-h=d] .hl.d text,.ymg [data-h=D] .hl.D text,.ymg [data-h=B] .hl.B text,.yglb [data-h=d] .hl.d text,.yglb [data-h=D] .hl.D text,.yglb [data-h=B] .hl.B text{fill:#d0101e!important;font-size:14px}'+
'.ymg .anim .ln{stroke-dasharray:900;animation:ygd 2.2s ease forwards}@keyframes ygd{from{stroke-dashoffset:900}to{stroke-dashoffset:0}}'+
'.ymg .lens{position:absolute;width:170px;height:170px;border-radius:50%;pointer-events:none;z-index:5;border:3px solid #fff;box-shadow:0 10px 30px rgba(10,35,80,.35);background:#fff no-repeat;opacity:0;transform:scale(.6);transition:opacity .2s,transform .2s}.ymg .lens.on{opacity:1;transform:scale(1)}'+
'.ymg .msw,.ymg .mfoot{display:none}'+
'@media (max-width:767px){.ymg .card{border-radius:18px;box-shadow:0 0 0 1px #e3e8f1}.ymg .photo{aspect-ratio:1/.47}.ymg .view img{left:15%;top:5%;width:70%;height:90%}.ymg .floor{display:none}'+
'.ymg .tags{top:9px;left:9px}.ymg .tags span{font-size:10px;padding:5px 9px}.ymg .tags span+span{display:none}.ymg .tools{top:9px;right:9px}.ymg .tools button{width:34px;height:34px}.ymg .tools button+button{display:none}'+
'.ymg .thumbs,.ymg .count,.ymg .nav,.ymg .seam,.ymg .tech{display:none}'+
'.ymg .dots{display:flex;position:absolute;left:50%;bottom:8px;transform:translateX(-50%);gap:5px;z-index:3}.ymg .dots i{width:6px;height:6px;border-radius:3px;background:#c3cbd9;transition:.25s}.ymg .dots i.on{width:16px;background:var(--n)}'+
'.ymg .msw{display:grid;grid-template-columns:1fr 1fr;position:relative;margin:7px 7px 0;padding:3px;background:#f1f4fa;border-radius:14px}'+
'.ymg .msw .ind{position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);background:#fff;border-radius:11px;box-shadow:0 2px 10px rgba(10,35,80,.12),inset 0 -2px 0 var(--n);transition:transform .35s cubic-bezier(.3,.8,.3,1)}.ymg .msw.t1 .ind{transform:translateX(100%);box-shadow:0 2px 10px rgba(10,35,80,.12),inset 0 -2px 0 var(--r)}'+
'.ymg .msw button{position:relative;z-index:1;display:flex;align-items:center;gap:7px;border:0;background:none;padding:3px 7px;white-space:nowrap;border-radius:11px;cursor:pointer;text-align:left}'+
'.ymg .msw .pv{width:26px;height:26px;flex:none;border-radius:8px;background:#fff center/cover no-repeat;box-shadow:0 0 0 1px #e3e8f1;overflow:hidden;display:block}.ymg .msw .pv svg{width:100%;height:100%;display:block}'+
'.ymg .msw b{display:block;font-size:12px;color:#16203a}.ymg .msw small{display:block;font-size:9.5px;color:#8a93a6;font-weight:600}.ymg .msw .nudge .pv{animation:ygn 1.4s 4}@keyframes ygn{0%,100%{box-shadow:0 0 0 0 rgba(208,16,30,.55)}50%{box-shadow:0 0 0 6px rgba(208,16,30,0)}}'+
'.ymg .specs{gap:0;padding:0;margin-top:7px;border-top:1px solid #edf0f6}.ymg .sp{border-radius:0;background:#fff;border:0;border-right:1px solid #edf0f6;justify-content:center;padding:7px 4px;gap:5px}.ymg .sp:nth-child(3n){border-right:0}.ymg .sp:nth-child(n+4){border-top:1px solid #edf0f6}.ymg .specs:not(.open) .sp:nth-child(n+4){display:none}'+
'.ymg .sp svg{width:20px;height:20px}.ymg .sp small{font-size:8.5px}.ymg .sp b,.ymg .sp.k b{font-size:13.5px}.ymg .sp.k:hover{background:#fff;border-color:#edf0f6;box-shadow:none}.ymg .sp.on{box-shadow:inset 0 -2px 0 var(--r)}'+
'.ymg .mfoot{display:flex;justify-content:space-between;align-items:center;padding:4px 10px 6px;border-top:1px solid #edf0f6;font-size:10px;font-weight:600;color:var(--r)}.ymg .mfoot span{display:flex;align-items:center;gap:4px}'+
'.ymg .more{display:flex;align-items:center;gap:4px;border:0;background:#f1f4fa;color:var(--n);font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px;cursor:pointer}.ymg .more svg{transition:transform .2s}.ymg .more.open svg{transform:rotate(180deg)}}'+
'.ymg .more,.ymg .xtra{display:none}'+'@media (max-width:767px){.ymg .specs.hasx{grid-template-columns:repeat(3,1fr) 40px}.ymg .sp:nth-child(3):last-child{border-right:0}.ymg.dr .tags{display:none}.ymg .sp:nth-child(n+4){display:none!important}.ymg .sp:nth-child(3){border-right:1px solid #edf0f6}.ymg .more{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;border:0;background:#f6f8fc;color:#0a2350;font-size:11px;font-weight:800;cursor:pointer;padding:0}.ymg .more svg{transition:transform .2s}.ymg .more.open svg{transform:rotate(180deg)}.ymg.xopen .xtra{display:flex;flex-wrap:wrap;gap:5px;padding:7px 8px 8px;border-top:1px solid #edf0f6}.ymg .xtra span{font-size:11px;font-weight:700;color:#0a2350;background:#f1f4fa;border-radius:8px;padding:4px 8px}.ymg .xtra small{color:#8a93a6;font-weight:600;margin-right:4px}}'+'@media (min-width:768px){.ymg .specs.v2{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px 10px;padding:10px 14px 14px}.ymg .specs.v2 .sp.k{grid-column:span 2}.ymg .specs.kc2 .sp.k{grid-column:span 3}.ymg .specs.kc1 .sp.k{grid-column:span 6}.ymg .specs.v2 .sp:not(.k){grid-column:span 3;background:none;border:0;border-bottom:1px dashed #dfe4ee;border-radius:0;padding:6px 2px;gap:0}.ymg .specs.v2 .sp:not(.k) svg{display:none}.ymg .specs.v2 .sp:not(.k)>div{display:flex;align-items:baseline;justify-content:space-between;gap:8px;width:100%}.ymg .specs.v2 .sp:not(.k) small{font-size:11px;text-transform:none;letter-spacing:0;color:#64748b;font-weight:600;white-space:normal;line-height:1.3}.ymg .specs.v2 .sp:not(.k) b{font-size:13px;white-space:nowrap}.ymg .specs.v2 .sp.wl{grid-column:span 6}.ymg .specs.v2 .sp.k+.sp:not(.k),.ymg .specs.v2 .sp.k+.sp:not(.k)+.sp:not(.k){margin-top:2px}}'+'.yglb{position:fixed;inset:0;z-index:2147483000;background:rgba(8,18,40,.93);display:none;font-family:Arial,sans-serif}.yglb.on{display:block}'+
'.yglb .stg{position:absolute;inset:116px 0 92px;overflow:hidden;touch-action:none;cursor:grab}.yglb .cnt{position:absolute;transform-origin:0 0;background:#fff;border-radius:18px;display:flex;align-items:center;justify-content:center;overflow:hidden}'+
'.yglb .cnt img{width:100%;height:100%;object-fit:contain;pointer-events:none;-webkit-user-drag:none}.yglb .cnt svg{width:96%}'+
'.yglb .tb{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);padding:6px;border-radius:999px}'+
'.yglb button{border:0;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;padding:0}.yglb .tb button{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.14)}.yglb .tb button:hover{background:#fff;color:#0a2350}'+
'.yglb .tb span{min-width:50px;text-align:center;color:#fff;font-size:13px;font-weight:700}.yglb .x{position:absolute;top:14px;right:14px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.14)}.yglb .x:hover{background:#d0101e}'+
'.yglb .hint{position:absolute;top:24px;left:0;right:0;text-align:center;color:rgba(255,255,255,.75);font-size:12px;font-weight:600}'+
'.yglb .sw{position:absolute;top:62px;left:50%;transform:translateX(-50%);display:flex;gap:4px;background:rgba(255,255,255,.12);padding:4px;border-radius:999px}.yglb .sw button{font-size:12px;font-weight:700;padding:7px 14px;border-radius:999px;background:none}.yglb .sw button.on{background:#fff;color:#0a2350}'+
'.yglb .ar{position:absolute;top:50%;width:44px;height:44px;margin-top:-22px;border-radius:50%;background:rgba(255,255,255,.14);z-index:2}.yglb .ar.p{left:14px}.yglb .ar.n{right:14px}.yglb .ar:hover{background:#fff;color:#0a2350}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
// --- HTML
var multi=photos.length>1;
var stock=(document.querySelector('.stokMiktari, [class*=Stok]')||{}).textContent||'';
var h='<div class="card" id="ygCard"><div class="photo" id="ygPhoto"><div class="lens" id="ygLens"></div>';
photos.forEach(function(p,i){h+='<div class="view ph'+(i?' off':'')+'" data-i="'+i+'"><div class="floor"></div><img src="'+p.src+'" alt="'+title.replace(/"/g,'')+'"></div>'});
if(hasDraw)h+='<div class="view bigdraw off anim" id="ygBig"></div>';
var sm=(document.body.innerText.match(/Stok Miktar[ıi]\s*:\s*(\d+)/)||[])[1];if(sm&&+sm>0)h+='<div class="tags"><span><i class="dot"></i>Stokta</span></div>';
h+='<div class="tools"><button title="Yakınlaştır" data-z>'+I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6M11 8v6M8 11h6"/>')+'</button><button title="Tam ekran" data-z>'+I('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',18)+'</button></div>';
if(multi){h+='<div class="thumbs">'+photos.map(function(p,i){return '<button data-i="'+i+'" class="'+(i?'':'on')+'" style="background-image:url(\''+p.src+'\')" title="Fotoğraf '+(i+1)+'"></button>'}).join('')+'</div><div class="count" id="ygCnt">1 / '+photos.length+'</div>';
 h+='<button class="nav p" data-nav="-1">'+I('<path d="m15 18-6-6 6-6"/>')+'</button><button class="nav n" data-nav="1">'+I('<path d="m9 18 6-6-6-6"/>')+'</button><div class="dots">'+photos.map(function(p,i){return '<i class="'+(i?'':'on')+'"></i>'}).join('')+'</div>';}
h+='</div>';
if(hasDraw){h+='<div class="msw" id="ygMsw"><span class="ind"></span><button data-t="0"><span class="pv" style="background-image:url(\''+photos[0].src+'\')"></span><span><b>Fotoğraf'+(multi?' ('+photos.length+')':'')+'</b><small>Ürünün görünümü</small></span></button><button class="nudge" data-t="1"><span class="pv">'+miniDraw+'</span><span><b>Teknik Çizim</b><small>Ölçülü çizim</small></span></button></div>';
 h+='<div class="seam"></div><div class="tech"><div class="th"><h3><span class="ic">'+I('<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>',17)+'</span><span>Teknik Çizim <small style="display:inline;margin-left:4px">(mm)</small></span></h3><div class="seg"><button class="on" data-m="all">İkisi</button><button data-m="f">Ön</button><button data-m="s">Kesit</button></div></div><div class="draw anim" id="ygDraw"></div></div>';}
if(order.length){var extra=order.length-3;var kc=order.filter(function(s){return s.k}).length;h+='<div class="specs v2 kc'+kc+(extra>0?' hasx':'')+'" id="ygSpecs">'+order.map(function(s,i){return '<div class="sp'+(!s.k&&i==order.length-1&&(order.length-kc)%2?' wl':'')+(s.k?' k" data-k="'+s.k:'')+'" title="'+s.l+': '+s.v+'">'+icon(s)+'<div style="min-width:0"><small>'+s.l+'</small><b>'+(s.k?f(s.n)+(s.u?'<em>'+s.u+'</em>':''):s.v)+'</b></div></div>'}).join('')+(extra>0?'<button class="more" id="ygMore">+'+extra+I('<path d="m6 9 6 6 6-6"/>',11)+'</button>':'')+'</div>'+(extra>0?'<div class="xtra" id="ygX2">'+order.slice(3).map(function(s){return '<span><small>'+s.l+'</small>'+s.v+'</span>'}).join('')+'</div>':'');
 if(0)h+='<div class="mfoot">'+(hasDraw?'<span>'+I('<path d="M9 11V5a2 2 0 0 1 4 0v5l4.5 1a2 2 0 0 1 1.5 2.3L18 19a3 3 0 0 1-3 2h-3.5a3 3 0 0 1-2.4-1.2L5.5 15a1.6 1.6 0 0 1 2.4-2.1L9 14"/>',12)+'Ölçüye dokun, çizimde göster</span>':'<span></span>')+(extra>0?'<button class="more" id="ygMore">+'+extra+' özellik '+I('<path d="m6 9 6 6 6-6"/>',10)+'</button>':'')+'</div>';}
h+='</div>';
var box=document.createElement('div');box.className='ymg';box.innerHTML=h;
[].forEach.call(L.children,function(c){c.style.setProperty('display','none','important')});st.textContent+='.leftImage>:not(.ymg){display:none!important}';L.appendChild(box);L.style.width=L.style.width||'';
Q2(box);var mk=document.createElement('div');mk.innerHTML='<svg width="0" height="0" style="position:absolute"><defs><marker id="ygRed" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9z" fill="#d0101e"/></marker></defs></svg>';document.body.appendChild(mk.firstChild);
// --- davranış
function $(i){return document.getElementById(i)}function Q(s,r){return [].slice.call((r||box).querySelectorAll(s))}
var card=$('ygCard'),photo=$('ygPhoto'),cur=0,drawOn=false;
function isMob(){return window.innerWidth<=767}
if(hasDraw){$('ygDraw').innerHTML=draw({});$('ygBig').innerHTML=draw({dim:'#d0101e'});}
function render(){Q('.view.ph').forEach(function(v){v.classList.toggle('off',drawOn||+v.dataset.i!=cur)});if(hasDraw){$('ygBig').classList.toggle('off',!drawOn);$('ygMsw').classList.toggle('t1',drawOn);box.classList.toggle('dr',drawOn);if(drawOn){var n=box.querySelector('.msw .nudge');n&&n.classList.remove('nudge')}}
 Q('.thumbs button').forEach(function(b){b.classList.toggle('on',+b.dataset.i==cur)});Q('.dots i').forEach(function(d,i){d.classList.toggle('on',i==cur&&!drawOn)});var c=$('ygCnt');if(c)c.textContent=(cur+1)+' / '+photos.length;}
function go(i){cur=(i+photos.length)%photos.length;drawOn=false;render()}
function setDraw(t){drawOn=!!t&&hasDraw&&isMob();render()}
Q('.thumbs button').forEach(function(b){b.onclick=function(e){e.stopPropagation();go(+b.dataset.i)}});
Q('[data-nav]').forEach(function(b){b.onclick=function(e){e.stopPropagation();go(cur+ +b.dataset.nav)}});
Q('.msw button').forEach(function(b){b.onclick=function(){setDraw(b.dataset.t=='1')}});
Q('.seg button').forEach(function(b){b.onclick=function(){Q('.seg button').forEach(function(x){x.classList.toggle('on',x==b)});$('ygDraw').innerHTML=draw({m:b.dataset.m})}});
Q('.sp.k').forEach(function(c){c.onclick=function(){var same=card.dataset.h==c.dataset.k;if(same)delete card.dataset.h;else card.dataset.h=c.dataset.k;Q('.sp').forEach(function(x){x.classList.toggle('on',!same&&x==c)});if(isMob()&&!same)setDraw(true)}});
var more=$('ygMore');if(more)more.onclick=function(e){e.stopPropagation();box.classList.toggle('xopen');more.classList.toggle('open')};
window.addEventListener('resize',function(){if(!isMob()&&drawOn){drawOn=false;render()}});
// kaydırma (mobil): fotoğraflar arasında, sonuncudan sonra teknik çizim
var sx=null,swiped=false;photo.addEventListener('touchstart',function(e){sx=e.touches[0].clientX},{passive:true});
photo.addEventListener('touchend',function(e){if(sx==null)return;var dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)<40)return;swiped=true;
 if(dx<0){if(drawOn)return;if(cur<photos.length-1)go(cur+1);else setDraw(true)}else{if(drawOn){drawOn=false;render()}else if(cur>0)go(cur-1)}});
// büyüteç (masaüstü)
var lens=$('ygLens'),ZL=2.5;
photo.addEventListener('mousemove',function(e){var img=box.querySelector('.view.ph[data-i="'+cur+'"] img');if(isMob()||drawOn||!img||e.target.closest('button,.tags,.thumbs,.tools,.count')){lens.classList.remove('on');return}
 var pr=photo.getBoundingClientRect(),ir=img.getBoundingClientRect(),nw=img.naturalWidth||1,nh=img.naturalHeight||1,w=ir.width,hh=ir.height,ox=0,oy=0;if(nw/nh>w/hh){hh=w*nh/nw;oy=(ir.height-hh)/2}else{w=hh*nw/nh;ox=(ir.width-w)/2}
 var ix=e.clientX-ir.left-ox,iy=e.clientY-ir.top-oy;if(ix<0||iy<0||ix>w||iy>hh){lens.classList.remove('on');return}
 lens.classList.add('on');lens.style.left=(e.clientX-pr.left-85)+'px';lens.style.top=(e.clientY-pr.top-85)+'px';lens.style.backgroundImage='url("'+photos[cur].zoom+'")';lens.style.backgroundSize=(w*ZL)+'px '+(hh*ZL)+'px';lens.style.backgroundPosition=(85-ix*ZL)+'px '+(85-iy*ZL)+'px'});
photo.addEventListener('mouseleave',function(){lens.classList.remove('on')});
// tam ekran yakınlaştırma
var lb=document.createElement('div');lb.className='yglb';lb.innerHTML='<div class="hint" id="ygHint"></div>'+(hasDraw?'<div class="sw"><button data-lt="0">Fotoğraf</button><button data-lt="1">Teknik Çizim</button></div>':'')+'<button class="x" id="ygX" title="Kapat">'+I('<path d="M18 6 6 18M6 6l12 12"/>',20)+'</button><div class="stg" id="ygStg"><div class="cnt" id="ygCnt2"></div></div>'+(multi?'<button class="ar p" data-a="-1">'+I('<path d="m15 18-6-6 6-6"/>',22)+'</button><button class="ar n" data-a="1">'+I('<path d="m9 18 6-6-6-6"/>',22)+'</button>':'')+'<div class="tb"><button id="ygZo" title="Uzaklaştır">'+I('<path d="M5 12h14"/>',20)+'</button><span id="ygZp">100%</span><button id="ygZi" title="Yakınlaştır">'+I('<path d="M12 5v14M5 12h14"/>',20)+'</button><button id="ygZr" title="Sıfırla">'+I('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',20)+'</button></div>';document.body.appendChild(lb);
Q2(lb);var stg=$('ygStg'),cnt=$('ygCnt2'),Sc=1,TX=0,TY=0,lbT=0,lbI=0;
function size(){var r=stg.getBoundingClientRect(),z=Math.min(r.width*.92,r.height);cnt.style.width=z+'px';cnt.style.height=z+'px';return{r:r,w:z,x:(r.width-z)/2,y:(r.height-z)/2}}
function apply(an){var b=size();if(Sc<=1){Sc=1;TX=TY=0}else{var mx=Math.max(0,(b.w*Sc-b.r.width)/2+40),my=Math.max(0,(b.w*Sc-b.r.height)/2+40),cx=b.w*(Sc-1)/2;TX=Math.min(mx-cx,Math.max(-mx-cx,TX));TY=Math.min(my-cx,Math.max(-my-cx,TY))}
 cnt.style.transition=an?'transform .25s ease':'none';cnt.style.left=b.x+'px';cnt.style.top=b.y+'px';cnt.style.transform='translate('+TX+'px,'+TY+'px) scale('+Sc+')';$('ygZp').textContent=Math.round(Sc*100)+'%'}
function zoomAt(ns,px,py,an){ns=Math.min(5,Math.max(1,ns));var b=size(),lx=px-b.r.left-b.x,ly=py-b.r.top-b.y;TX=lx-(lx-TX)*ns/Sc;TY=ly-(ly-TY)*ns/Sc;Sc=ns;apply(an)}
function ctr(){var r=stg.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2]}
function fill(t,i){lbT=t&&hasDraw;if(i!=null)lbI=(i+photos.length)%photos.length;cnt.innerHTML=lbT?draw({}):'<img src="'+photos[lbI].zoom+'" alt="">';if(lbT&&card.dataset.h)cnt.dataset.h=card.dataset.h;else delete cnt.dataset.h;
 Q('.sw button',lb).forEach(function(b){b.classList.toggle('on',(b.dataset.lt=='1')==lbT)});Q('.ar',lb).forEach(function(a){a.style.display=lbT?'none':''});Sc=1;apply()}
function open(t){$('ygHint').textContent=isMob()?'İki parmakla büyüt · çift dokun':'Fare tekerleğiyle büyüt · sürükleyerek gez · çift tıkla';lb.classList.add('on');document.documentElement.style.overflow='hidden';fill(t,cur)}
function close(){lb.classList.remove('on');document.documentElement.style.overflow=''}
Q('[data-z]').forEach(function(b){b.onclick=function(e){e.stopPropagation();open(drawOn)}});
photo.addEventListener('click',function(e){if(e.target.closest('button'))return;if(swiped){swiped=false;return}open(drawOn)});
if(hasDraw)$('ygDraw').addEventListener('click',function(){open(true)});
$('ygX').onclick=close;document.addEventListener('keydown',function(e){if(!lb.classList.contains('on'))return;if(e.key=='Escape')close();if(e.key=='ArrowRight'&&!lbT)fill(false,lbI+1);if(e.key=='ArrowLeft'&&!lbT)fill(false,lbI-1)});
Q('.sw button',lb).forEach(function(b){b.onclick=function(){fill(b.dataset.lt=='1')}});Q('.ar',lb).forEach(function(a){a.onclick=function(){fill(false,lbI+ +a.dataset.a)}});
$('ygZi').onclick=function(){zoomAt(Sc*1.5,ctr()[0],ctr()[1],1)};$('ygZo').onclick=function(){zoomAt(Sc/1.5,ctr()[0],ctr()[1],1)};$('ygZr').onclick=function(){Sc=1;apply(1)};
stg.addEventListener('wheel',function(e){e.preventDefault();zoomAt(Sc*Math.exp(-e.deltaY*.0018),e.clientX,e.clientY)},{passive:false});
var pts={},np=0,last=null,pinch=null,tap=0,moved=0;
stg.addEventListener('pointerdown',function(e){stg.setPointerCapture(e.pointerId);pts[e.pointerId]={x:e.clientX,y:e.clientY};np=Object.keys(pts).length;moved=0;
 if(np==1){last={x:e.clientX,y:e.clientY};var n=Date.now();if(n-tap<300){zoomAt(Sc>1.2?1:2.5,e.clientX,e.clientY,1);tap=0}else tap=n}
 if(np==2){var v=Object.values(pts);pinch={d:Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y),s:Sc}}});
stg.addEventListener('pointermove',function(e){if(!pts[e.pointerId])return;pts[e.pointerId]={x:e.clientX,y:e.clientY};var v=Object.values(pts);
 if(v.length==2&&pinch)zoomAt(pinch.s*Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y)/pinch.d,(v[0].x+v[1].x)/2,(v[0].y+v[1].y)/2);
 else if(v.length==1&&last){var dx=e.clientX-last.x,dy=e.clientY-last.y;moved+=Math.abs(dx);if(Sc>1){TX+=dx;TY+=dy;apply()}last={x:e.clientX,y:e.clientY}}});
function up(e){var v=pts[e.pointerId];delete pts[e.pointerId];if(Object.keys(pts).length<2)pinch=null;
 if(!Object.keys(pts).length){if(Sc==1&&multi&&!lbT&&moved>60&&v){fill(false,lbI+(v.x<last.x?1:-1))}last=null}else{var p=Object.values(pts)[0];last={x:p.x,y:p.y}}}
stg.addEventListener('pointerup',up);stg.addEventListener('pointercancel',up);
window.addEventListener('resize',function(){if(lb.classList.contains('on'))apply()});
window.__YGAPI={open:open,setDraw:setDraw,go:go,hl:function(k){var c=box.querySelector('.sp[data-k="'+k+'"]');c&&c.click()},more:function(){more&&more.click()}};
})();

}
/* Açıklama sekmesi düzeni: metin aynı kalır, sadece görünüm. */
function YD(){
var A=document.querySelector('.urunTabAlt');if(!A||A.__yd)return false;A.__yd=1;
if(A.querySelector('div[style]'))return;
var st=document.createElement('style');st.textContent='\
.ydsc{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:28px;align-items:start;color:#334155;font-size:14.5px;line-height:1.7}\
.ydsc.one{grid-template-columns:minmax(0,1fr)}\
.ydsc .ym>h2{font-size:20px;line-height:1.35;color:#0f2742;margin:0 0 6px;font-weight:700;padding-left:12px;border-left:4px solid #c8102e}\
.ydsc .ym>p{margin:0 0 10px}\
.ydsc .ysc{padding:14px 0 0;margin-top:14px;border-top:1px solid #e6ebf2}\
.ydsc .ysc h3{font-size:15px;color:#0f2742;margin:0 0 6px;font-weight:700}\
.ydsc .ysc p{margin:0 0 8px}.ydsc .ysc p:last-child{margin:0}\
.ydsc .ysc ul{margin:0;padding-left:18px}\
.ydsc .ya{background:#fff;border:1px solid #e3e8ef;border-radius:14px;overflow:hidden;position:sticky;top:90px;box-shadow:0 6px 18px rgba(15,39,66,.06)}\
.urunTabAlt .ydsc .ya h3,.ydsc .ya h3{margin:0;padding:12px 16px;font-size:14px;font-weight:700;color:#fff!important;background:#0f2742;letter-spacing:.2px}\
.ydsc .ya table{width:100%;border-collapse:collapse;font-size:13.5px}\
.ydsc .ya td{padding:9px 16px;border-top:1px solid #edf0f6;vertical-align:top}\
.ydsc .ya tr:nth-child(even) td{background:#f7f9fc}\
.ydsc .ya td:first-child{color:#64748b;width:46%}\
.ydsc .ya td:last-child{color:#0f2742;font-weight:700}\
@media(max-width:991px){.ydsc{grid-template-columns:minmax(0,1fr);gap:16px}.ydsc .ya{position:static;order:-1}.ydsc .ym>h2{font-size:17px}}';
document.head.appendChild(st);
var w=document.createElement('div');w.className='ydsc';var m=document.createElement('div');m.className='ym';var a=null,cur=null;
[].slice.call(A.childNodes).forEach(function(n){
  if(n.nodeType==3&&!n.textContent.trim())return;
  if(n.nodeType==1&&n.classList.contains('teknikDetay'))return;
  if(n.nodeType==1&&n.tagName=='H3'){cur=document.createElement('div');cur.className='ysc';cur.appendChild(n);m.appendChild(cur);return}
  if(n.nodeType==1&&n.tagName=='UL'&&!a){var li=n.querySelectorAll(':scope>li');
    if(li.length&&[].every.call(li,function(l){return l.querySelector('strong')})){
      a=document.createElement('aside');a.className='ya';var h=cur&&cur.querySelector('h3');
      var t=document.createElement('h3');t.textContent=h?h.textContent:'Özellikler';t.style.setProperty('color','#fff','important');a.appendChild(t);
      if(h&&cur.childNodes.length==1){cur.remove()}
      var tb=document.createElement('table');
      [].forEach.call(li,function(l){var s=l.querySelector('strong'),v=l.textContent.replace(s.textContent,'').trim();if(!v)return;
        var tr=tb.insertRow(),c1=tr.insertCell(),c2=tr.insertCell();c1.textContent=s.textContent.replace(/:\s*$/,'').trim();c2.textContent=v});
      a.appendChild(tb);n.remove();return}}
  (cur||m).appendChild(n);
});
w.appendChild(m);if(a)w.appendChild(a);else w.classList.add('one');
A.insertBefore(w,A.firstChild);
}
function YO(){
var T=document.querySelector('#divOnyazi table');if(!T||T.__yo)return;
var c=[].slice.call(T.querySelectorAll('td')).map(function(td){var s=td.querySelector('strong,b');if(!s)return null;var l=s.textContent.replace(/:\s*$/,'').trim(),v=td.textContent.replace(s.textContent,'').trim();return l&&v?{l:l,v:v}:null});
if(!c.length||c.indexOf(null)>-1)return;T.__yo=1;
if(!document.getElementById('yonCss')){var st=document.createElement('style');st.id='yonCss';st.textContent=
'.yon{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 4px;font-family:inherit}'+
'.yon .oi{flex:1 1 0;min-width:0;background:#f7f9fc;border:1px solid #e3e8ef;border-radius:12px;padding:9px 12px;display:flex;flex-direction:column;gap:2px;position:relative}'+
'.yon .oi:before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:#c8102e;opacity:.85}'+
'.yon .oi small{font-size:11px;font-weight:600;color:#64748b;letter-spacing:.3px;text-transform:uppercase;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
'.yon .oi b{font-size:15px;font-weight:700;color:#0f2742;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
'@media(max-width:767px){.yon{gap:6px;margin:10px 0 2px}.yon .oi{flex:1 1 calc(100%/var(--c) - 6px);padding:7px 10px;border-radius:10px}.yon .oi small{font-size:10px}.yon .oi b{font-size:14px}}';
document.head.appendChild(st)}
var n=c.length,mc=n==4?2:Math.min(n,3);
var d=document.createElement('div');d.className='yon';d.style.setProperty('--c',mc);
c.forEach(function(x){var e=document.createElement('div');e.className='oi';e.title=x.l+': '+x.v;var a=document.createElement('small');a.textContent=x.l;var b=document.createElement('b');b.textContent=x.v;e.appendChild(a);e.appendChild(b);d.appendChild(e)});
T.style.display='none';T.parentNode.insertBefore(d,T);
}

function YF(){
if(document.getElementById('yfCss')||!document.querySelector('.RightDetail .PriceList')||!document.querySelector('.RightDetail .MiddleList'))return;
var cart="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230f2742' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='9' cy='20' r='1.4'/%3E%3Ccircle cx='18' cy='20' r='1.4'/%3E%3Cpath d='M2.5 3.5h2.6l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2l1.6-7.3H6.1'/%3E%3C/svg%3E\")";
var R='.RightDetail ';
var st=document.createElement('style');st.id='yfCss';st.textContent=
R+'.PriceList{display:flex!important;align-items:center;gap:14px;background:#fff;border:1px solid #e3e8ef;border-bottom:0;border-radius:14px 14px 0 0;padding:16px 18px!important;margin:14px 0 0!important;box-sizing:border-box;box-shadow:0 6px 18px rgba(15,39,66,.05)}'+
R+'.MiddleList{background:#f7f9fc;border:1px solid #e3e8ef;border-top:1px dashed #d5dde8;border-radius:0 0 14px 14px;padding:14px 18px!important;box-sizing:border-box;box-shadow:0 6px 18px rgba(15,39,66,.05);height:auto!important}'+
R+'#divIndirimOrani{order:2;width:auto!important;height:auto!important;min-width:0!important;border-radius:8px!important;background:#c8102e!important;padding:5px 9px!important;margin:0 0 0 auto!important;align-self:flex-start;float:none!important;position:static!important}'+
R+'#divIndirimOrani>*:not(.yfB){display:none!important}'+R+'#divIndirimOrani .yfB{display:inline-block;font-size:14px;font-weight:700;color:#fff;line-height:1.2;white-space:nowrap}'+
R+'#pnlFiyatlar{order:1;width:auto!important;float:none!important;margin:0!important}'+
R+'#divIndirimliFiyat{display:flex;flex-direction:column;gap:2px;height:auto!important}'+
R+'.PiyasafiyatiContent .spanFiyat{font-size:14px!important;color:#94a3b8!important;font-weight:500!important;text-decoration:line-through}'+
R+'.IndirimliFiyatContent .spanFiyat,'+R+'#divIndirimliFiyat>.Formline:only-child .spanFiyat{font-size:30px!important;color:#0f2742!important;font-weight:800!important;letter-spacing:-.5px;line-height:1.15!important}'+
R+'#divKDVDahilFiyat{display:flex!important;align-items:baseline;gap:6px;margin-top:4px!important;height:auto!important}'+
R+'#divKDVDahilFiyat .lineTitle{white-space:nowrap;font-size:12px!important;color:#64748b!important;font-weight:600;width:auto!important}'+
R+'#divKDVDahilFiyat .spanFiyat{font-size:17px!important;color:#334155!important;font-weight:700!important}'+
R+'.MiddleList>*,'+R+'.MiddleList .buybutton{margin:0!important;padding:0!important;height:auto!important;min-height:0!important}'+R+'.BasketBtn{height:auto!important;margin:0!important;display:flex!important;gap:10px;align-items:stretch}'+
R+'.Basketinp{flex:0 0 132px;width:132px!important;margin:0!important}'+
R+'.Basketinp .RadInput{display:flex!important;width:100%!important;height:52px!important;border:1px solid #d5dde8;border-radius:12px;overflow:hidden;background:#fff}'+
R+'.Basketinp .qtyMinus{order:1}'+R+'.Basketinp input{order:2;flex:1;min-width:0;width:auto!important;border:0!important;font-size:18px!important;font-weight:700;color:#0f2742;text-align:center;height:100%!important;padding:0!important}'+R+'.Basketinp .qtyPlus{order:3}'+
R+'.Basketinp a{flex:0 0 40px;width:40px!important;height:100%!important;display:flex!important;align-items:center;justify-content:center;background:#f1f5f9!important;color:#0f2742!important;position:static!important;transition:background .15s}'+
R+'.Basketinp a:hover{background:#0f2742!important;color:#fff!important}'+R+'.Basketinp a i{line-height:1!important;font-size:13px!important}'+
R+'.basketBtn{flex:1;width:auto!important;margin:0!important}'+
R+'.btnAddBasketOnDetail{width:100%!important;height:52px!important;border:0!important;border-radius:12px!important;background:#ffca00 '+cart+' no-repeat calc(50% - 72px) 50%/22px!important;color:#0f2742!important;font-size:18px!important;font-weight:700!important;padding:0 0 0 30px!important;box-shadow:0 6px 16px rgba(255,202,0,.35);transition:transform .15s,box-shadow .15s,background-color .15s;cursor:pointer}'+
R+'.btnAddBasketOnDetail:hover{background-color:#ffd633!important;box-shadow:0 8px 20px rgba(255,202,0,.45);transform:translateY(-1px)}'+
R+'.btnAddBasketOnDetail:active{transform:translateY(0)}'+
'@media(max-width:767px){'+R+'#divIndirimOrani .yfB{font-size:13px}'+R+'#divIndirimOrani .yfB i{display:none}'+R+'.PriceList,'+R+'.MiddleList{max-width:none;padding:12px 14px!important}'+R+'.PriceList{margin-top:10px!important}'+R+'.IndirimliFiyatContent .spanFiyat,'+R+'#divIndirimliFiyat>.Formline:only-child .spanFiyat{font-size:26px!important}'+R+'.Basketinp{flex-basis:112px;width:112px!important}'+R+'.Basketinp a{flex-basis:34px;width:34px!important}'+R+'.btnAddBasketOnDetail{font-size:17px!important;height:48px!important;background-position:calc(50% - 64px) 50%!important}'+R+'.Basketinp .RadInput{height:48px!important}}';
document.head.appendChild(st);
var io=document.getElementById('ltrIndirimOrani'),di=document.getElementById('divIndirimOrani');if(io&&di&&/\d/.test(io.textContent)){var bb=document.createElement('span');bb.className='yfB';bb.innerHTML='%'+io.textContent.trim().replace(/[<>&]/g,'')+'<i style="font-style:normal"> indirim</i>';di.appendChild(bb)}
}

var t0=Date.now();(function w(){if(document.querySelector('.leftImage #imgUrunResim, .leftImage #divThumbList img')){try{YG()}catch(e){}}else if(Date.now()-t0<15000)return setTimeout(w,300)})();
function tryD(){try{YD()}catch(e){}try{YO()}catch(e){}try{YF()}catch(e){}}tryD();var mo=new MutationObserver(tryD);mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(function(){mo.disconnect()},60000);
})();
