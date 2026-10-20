/* Yataklı rulman (UCP, UCF, UCFL, UCFC, UCT, KFL, KP ...) ölçülü teknik çizim modülü.
   Ekrana yazılan her sayı ürünün sayfasından (ctx.specs / ctx.onyazi) ya da ürünün kendi
   fotoğrafındaki ölçü tablosundan okunup site/draw/data/yatakli.json'a yazılmış değerden (ctx.data) gelir.
   Gerekli ölçü yoksa draw() null döner. */
(function(){
var C='#16203a',VW=460,VH=250,ID,DIM,HA1,HA2;
function r1(v){return Math.round(v*10)/10}
function f(n){return String(Math.round(n*100)/100).replace('.',',')}
function norm(s){return String(s||'').replace(/[ıİi]/g,'I').replace(/[şŞ]/g,'S').replace(/[ğĞ]/g,'G').replace(/[üÜ]/g,'U').replace(/[öÖ]/g,'O').replace(/[çÇ]/g,'C').toUpperCase()}
var SER='UCPA|UCPH|UCFL|UCFC|UCFA|UCFB|UCHA|UCP|UCF|UCT|UKFL|UKFC|UKP|UKF|UKT|SSKFL|SSKP|KFL|KP|SNH|SNL|SN|SBPFL|SBPFT|SBPF|SBPP|UC|UK';
var SRE=new RegExp('(?:^|[^A-Z])('+SER+')\\s*-?\\s*(\\d{3,4})(?![0-9])');
function sv(list,re){for(var i=0;i<(list||[]).length;i++)if(re.test(norm(list[i].l)))return list[i].v;return null}
function spec(ctx,re){return sv(ctx.specs,re)||sv(ctx.onyazi,re)}
function series(ctx){
  var s=spec(ctx,/^SERI$/),n=spec(ctx,/^NUMARA$/);
  if(s){s=norm(s).replace(/[^A-Z]/g,'');if(new RegExp('^('+SER+')$').test(s)&&n&&/^\d{3,4}$/.test(String(n).trim()))return {s:s,n:String(n).trim()}}
  var m=SRE.exec(norm(ctx.title))||SRE.exec(norm(ctx.path).replace(/[-_\/]/g,' '));
  return m?{s:m[1],n:m[2]}:null;
}
function isFam(ctx){
  var t=norm(ctx.title),cr=norm((ctx.crumbs||[]).join(' | '));
  if(/V[ -]?YATAK|MANYETIK|LINEER|KAPLIN|KECE|KONIK|IGNELI|EKSENEL|ZINCIR|BURC|SEGMAN|MANSON/.test(t))return false;
  return /YATAKLI RULMAN|RULMAN YATAG/.test(t+' | '+cr);
}
var TIP={UCP:'pil',KP:'pil',SSKP:'pil',UCPA:'pil',UCPH:'pil',UKP:'pil',UCF:'fsq',UKF:'fsq',UCFL:'fov',KFL:'fov',SSKFL:'fov',UKFL:'fov',UCFC:'frd',UKFC:'frd',UCT:'tak',UKT:'tak'};
/* her alt tip için gerekli ölçüler (yoksa çizim yok) */
var REQ={UCP:['d','H','H2','L','J','A','N','B'],KP:['d','H','L','J'],UCF:['d','L','J','A','B'],UCFL:['d','H','L','J','A','B'],KFL:['d','H','J','L'],UCFC:['d','L','J','H3','B'],UCT:['d','A','H','H2','L','L1','N','B']};
var LBL={
 UCP:{d:'Mil Çapı (d)',H:'Merkez Yüksekliği (H)',H2:'Toplam Yükseklik (H2)',L:'Taban Uzunluğu (L)',J:'Cıvata Aralığı (J)',A:'Taban Genişliği (A)',N:'Cıvata Deliği (N)',B:'İç Bilezik Genişliği (B)',S:'Vida - Bilezik Ucu (S)'},
 KP:{d:'Mil Çapı (d)',H:'Merkez Yüksekliği (H)',L:'Taban Uzunluğu (L)',J:'Cıvata Aralığı (J)'},
 UCF:{d:'Mil Çapı (d)',L:'Flanş Kenarı (L)',J:'Cıvata Aralığı (J)',A:'Gövde Genişliği (A)',B:'İç Bilezik Genişliği (B)',M:'Cıvata',S:'Vida - Bilezik Ucu (S)'},
 UCFL:{d:'Mil Çapı (d)',H:'Flanş Boyu (H)',L:'Flanş Genişliği (L)',J:'Cıvata Aralığı (J)',A:'Gövde Genişliği (A)',B:'İç Bilezik Genişliği (B)',M:'Cıvata',S:'Vida - Bilezik Ucu (S)'},
 KFL:{d:'Mil Çapı (d)',H:'Flanş Boyu (H)',L:'Flanş Genişliği (L)',J:'Cıvata Aralığı (J)',M:'Cıvata'},
 UCFC:{d:'Mil Çapı (d)',L:'Flanş Dış Çapı (L)',J:'Cıvata Dairesi (J)',H3:'Pilot Çapı (H3)',B:'İç Bilezik Genişliği (B)',M:'Cıvata',S:'Vida - Bilezik Ucu (S)'},
 UCT:{d:'Mil Çapı (d)',H:'Gövde Yüksekliği (H)',L:'Toplam Uzunluk (L)',L1:'Kızak Ucu - Merkez (L1)',H2:'Kızak Yüksekliği (H2)',N:'Gergi Deliği (N)',A:'Gövde Genişliği (A)',B:'İç Bilezik Genişliği (B)',S:'Vida - Bilezik Ucu (S)'}
};
function grp(ctx){var s=series(ctx);if(!s)return null;var g=s.s;
  if(g==='SSKP'||g==='UKP')g=null;if(g==='SSKFL'||g==='UKFL')g=null; /* tablo yok */
  return g&&REQ[g]?g:null}
/* ölçüleri topla: data (fotoğraf tablosu) + sayfa özelliği "Mil Çapı"; çelişki varsa çizim yok */
function dims(ctx,g){
  var D={},src=ctx.data||{},k,num=ctx.num||function(v){return parseFloat(String(v).replace(',','.'))};
  for(k in src)if(typeof src[k]==='number'&&isFinite(src[k])&&src[k]>0)D[k]=src[k];
  var md=spec(ctx,/^MIL CAPI|^IC CAP/);if(md!=null){var v=num(md);if(isFinite(v)&&v>0){if(D.d!=null&&Math.abs(D.d-v)>.01)return null;D.d=v}}
  var q=REQ[g];for(var i=0;i<q.length;i++)if(!(D[q[i]]>0))return null;
  return D;
}
/* ---- çizim yardımcıları ---- */
function a(v){return r1(v)}
function ln(x1,y1,x2,y2,w,ex){return '<line x1="'+a(x1)+'" y1="'+a(y1)+'" x2="'+a(x2)+'" y2="'+a(y2)+'" stroke="'+C+'" stroke-width="'+(w||1.4)+'"'+(ex||'')+'/>'}
function pa(d,fill,w,ex){return '<path d="'+d+'" fill="'+(fill||'none')+'" stroke="'+C+'" stroke-width="'+(w||1.5)+'" stroke-linejoin="round"'+(ex||'')+'/>'}
function ci(x,y,r,fill,w,ex){return '<circle cx="'+a(x)+'" cy="'+a(y)+'" r="'+a(Math.max(r,.5))+'" fill="'+(fill||'none')+'" stroke="'+C+'" stroke-width="'+(w||1.4)+'"'+(ex||'')+'/>'}
function cl(x1,y1,x2,y2){return ln(x1,y1,x2,y2,.6,' stroke-dasharray="12 3 2 3" opacity=".75"')}
function hid(x1,y1,x2,y2){return ln(x1,y1,x2,y2,.8,' stroke-dasharray="4 2.5" opacity=".8"')}
function P(){var s='',i,v;for(i=0;i<arguments.length;i++){v=arguments[i];s+=(typeof v==='number')?a(v)+' ':v+' '}return s}
function tx(x,y,t,anc,rot){return '<text x="'+a(x)+'" y="'+a(y)+'" fill="'+DIM+'" font-size="12" font-weight="700" font-family="inherit" text-anchor="'+(anc||'middle')+'" paint-order="stroke" stroke="#fff" stroke-width="3" stroke-linejoin="round"'+(rot?' transform="rotate(-90 '+a(x)+' '+a(y)+')"':'')+'>'+t+'</text>'}
function ttl(x,y,t){return '<text x="'+a(x)+'" y="'+a(y)+'" fill="'+DIM+'" font-size="10" font-family="inherit" letter-spacing="1.5" text-anchor="middle" opacity=".75">'+t+'</text>'}
function ex(x1,y1,x2,y2){return '<line x1="'+a(x1)+'" y1="'+a(y1)+'" x2="'+a(x2)+'" y2="'+a(y2)+'" stroke="'+DIM+'" stroke-width=".6" opacity=".6"/>'}
function tw(t){return String(t).replace(/<[^>]+>/g,'').length*7}
function arr(x1,y1,x2,y2){return '<line x1="'+a(x1)+'" y1="'+a(y1)+'" x2="'+a(x2)+'" y2="'+a(y2)+'" stroke="'+DIM+'" stroke-width="1" marker-start="url(#'+ID+'a)" marker-end="url(#'+ID+'a)"/>'}
function arr1(x1,y1,x2,y2){return '<line x1="'+a(x1)+'" y1="'+a(y1)+'" x2="'+a(x2)+'" y2="'+a(y2)+'" stroke="'+DIM+'" stroke-width="1" marker-end="url(#'+ID+'a)"/>'}
function G(k,s){return '<g class="hl" data-k="'+k+'">'+s+'</g>'}
/* yatay ölçü: x1..x2, y'de; e1/e2 = uzatma çizgilerinin başladığı y (null: yok) */
function dH(k,x1,x2,y,lab,e1,e2,below){
  var s='',w=x2-x1,t=tw(lab);
  if(e1!=null)s+=ex(x1,e1,x1,y+(y>e1?3:-3));if(e2!=null)s+=ex(x2,e2,x2,y+(y>e2?3:-3));
  if(w<16){s+=arr1(x1-11,y,x1,y)+arr1(x2+11,y,x2,y)+ex(x1-11,y,x2+11,y)}else s+=arr(x1,y,x2,y);
  if(w>=t+8)s+=tx((x1+x2)/2,below?y+13:y-4,lab);else s+=tx(x2+(w<16?14:5),y+4,lab,'start');
  return G(k,s);
}
/* dikey ölçü: y1..y2, x'te; side -1: yazı solda, 1: sağda */
function dV(k,x,y1,y2,lab,side,e1,e2){
  var s='',h=Math.abs(y2-y1),t=tw(lab),ym=(y1+y2)/2;
  if(e1!=null)s+=ex(e1,y1,x+(x>e1?3:-3),y1);if(e2!=null)s+=ex(e2,y2,x+(x>e2?3:-3),y2);
  if(h<16){var yt=Math.min(y1,y2),yb=Math.max(y1,y2);s+=arr1(x,yt-11,x,yt)+arr1(x,yb+11,x,yb)+ex(x,yt-11,x,yb+11)}else s+=arr(x,y1,x,y2);
  if(h>=t+8)s+=tx(side<0?x-4:x+13,ym,lab,'middle',1);else s+=tx(side<0?x-5:x+5,ym+4,lab,side<0?'end':'start');
  return G(k,s);
}
/* kılavuz çizgili not */
function ldr(k,x1,y1,x2,y2,lab,dir){var x3=x2+dir*8;return G(k,arr1(x2,y2,x1,y1)+'<line x1="'+a(x2)+'" y1="'+a(y2)+'" x2="'+a(x3)+'" y2="'+a(y2)+'" stroke="'+DIM+'" stroke-width="1"/>'+tx(x3+dir*3,y2+4,lab,dir>0?'start':'end'))}
function defs(){return '<defs><pattern id="'+ID+'h1" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#9aa6bd" stroke-width="1.1"/></pattern><pattern id="'+ID+'h2" width="3.6" height="3.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="3.6" stroke="#9aa6bd" stroke-width=".9"/></pattern><marker id="'+ID+'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,1.2 L10,5 L0,8.8z" fill="'+DIM+'"/></marker></defs>'}
function svg(body){return '<svg viewBox="0 0 '+VW+' '+Math.round(VH)+'" width="100%" style="display:block" xmlns="http://www.w3.org/2000/svg" font-family="inherit">'+defs()+body+'</svg>'}
/* yataklı rulman insert'i: küre dış çap ölçüde verilmez -> oran (çizim şekli, yazılmaz) */
function geo(dmm,Bmm,lim,s){var Do=Math.min(Math.max(dmm+30,dmm*1.72),lim);return {r:dmm/2*s,R:Do/2*s,B:Bmm*s}}
/* ön görünüşte rulman: gövde ağzı + bilezikler + mil deliği */
function insF(x,y,g){var sp=g.R-g.r,rr1=g.r+sp*.3,rr2=g.r+sp*.64,ro=g.R*.93;
  return ci(x,y,ro,'#fff',1.3)+ci(x,y,rr2,'none',1)+ci(x,y,(rr1+rr2)/2,'none',.6,' opacity=".55"')+ci(x,y,rr1,'none',1.3)+ci(x,y,g.r,'#fff',1.6)
   +ci(x+(rr1+g.r)/2*.7071,y-(rr1+g.r)/2*.7071,Math.max(1.4,(rr1-g.r)*.22),'none',.9)}
/* kesitte rulman insert (eksen yatay, y=cy): dış bilezik gövde yüzüne (xh1) dayalı küresel yuvada,
   sıkma vidası yüzün hemen dışında, iç bilezik sağ ucu vidadan Sp uzakta (tablodaki yan görünüş gibi) */
function insS(xh1,cy,g,Sp){
  var sp=g.R-g.r,ra=g.r+sp*.3,rb=g.r+sp*.64,sw=Math.min(Math.max(g.B*.08,3),6),xsc=xh1+sw/2+.6,x1=xsc+Sp,x0=x1-g.B,
    hm=Math.sqrt(Math.max(1,g.R*g.R-Math.pow(rb+(g.R-rb)*.4,2))),h=Math.min(g.B*.31,(xh1-x0)*.45,hm),xb=xh1-h,yE=Math.sqrt(g.R*g.R-h*h),s='';
  [-1,1].forEach(function(k){
    var or=P('M',xb-h,cy+k*rb,'L',xb-h,cy+k*yE,'A',g.R,g.R,0,0,k<0?1:0,xb+h,cy+k*yE,'L',xb+h,cy+k*rb,'Z'),
      bz=P('M',xb-h,cy+k*ra,'L',xb+h,cy+k*ra,'L',xb+h,cy+k*rb,'L',xb-h,cy+k*rb,'Z'),
      ir=P('M',x0,cy+k*g.r,'L',x1,cy+k*g.r,'L',x1,cy+k*ra,'L',x0,cy+k*ra,'Z');
    s+=pa(bz,'#fff',.01)+pa(or,'#fff',.01)+pa(or,HA2,1.3)+pa(ir,'#fff',.01)+pa(ir,HA2,1.3);
    s+=ci(xb,cy+k*(ra+rb)/2,(rb-ra)/2*.9,'#fff',1.2);
    s+=ln(xb-h+1.3,cy+k*ra,xb-h+1.3,cy+k*rb,1.2)+ln(xb+h-1.3,cy+k*ra,xb+h-1.3,cy+k*rb,1.2);
  });
  var yt=cy-ra-sw*.45,q=ra-g.r;
  s+=pa(P('M',xsc-sw/2,yt,'L',xsc+sw/2,yt,'L',xsc+sw/2,cy-g.r,'L',xsc-sw/2,cy-g.r,'Z'),'#fff',1.1)+ln(xsc-sw/2,cy-ra+q*.33,xsc+sw/2,cy-ra+q*.33,.6)+ln(xsc-sw/2,cy-ra+q*.66,xsc+sw/2,cy-ra+q*.66,.6);
  return {s:s,x0:x0,x1:x1,xb:xb,h:h,ra:ra,xsc:xsc,yt:yt};
}
/* kesit üstü: B (iç bilezik) ve S (vida ekseni - iç bilezik ucu) */
function bsD(I,cy,top,D,k,useS){var o=dH('B',I.x0,I.x1,top-28,f(D.B),cy-I.ra,cy-I.ra);k.B=1;
  if(useS){o+=dH('S',I.xsc,I.x1,top-12,f(D.S),I.yt,null);k.S=1}return o}
var FCX=138,SCX=372;
function nip(x,y){return pa(P('M',x-2,y,'L',x-2,y-3,'L',x-3.5,y-3,'L',x-3.5,y-7,'L',x+3.5,y-7,'L',x+3.5,y-3,'L',x+2,y-3,'L',x+2,y),'#fff',1.1)+ci(x,y-8.6,1.8,'#fff',1)}
function tang(cx,cy,R,px,py){var dx=px-cx,dy=py-cy,q=Math.sqrt(dx*dx+dy*dy),ph=Math.atan2(dy,dx),b=Math.acos(Math.min(1,R/q)),t=ph-b;return {x:cx+R*Math.cos(t),y:cy+R*Math.sin(t),t:t}}
function axes(x0,x1,y,xc,y0,y1){return cl(x0,y,x1,y)+(xc!=null?cl(xc,y0,xc,y1):'')}
/* ---- ayaklı yatak (UCP / KP) ---- */
function pil(g,D){
  var K=g==='KP',H=D.H,L=D.L,J=D.J,Rh=D.H2?D.H2-H:H*.85,tb=H*(K?.36:.4),hd=(D.N||((D.M||L*.08)+1)),
    A=D.A||Rh*1.3,Bm=K?Rh*1.15:D.B,Wh=Math.min(Bm,A*.8),Sm=K?Bm*.3:(D.S||Bm*.3),
    x1m=Sm+1.5,lm=Math.min(x1m-Bm,-Wh/2-A/2),rm=Math.max(x1m,-Wh/2+A/2),
    s=Math.min(200/L,142/(H+Rh),132/(rm-lm)),yb=Math.max(154,72+(H+Rh)*s);VH=yb+46;
  var gI=geo(D.d,Bm,Rh*1.62,s),yc=yb-H*s,R=Rh*s,cx=FCX,xl=cx-L*s/2,xr=cx+L*s/2,bt=yb-tb*s,re=Math.min(tb*s*.45,6),wb=Math.max((J-1.7*hd)/2*s,Math.sqrt(Math.max(0,R*R-(bt-yc)*(bt-yc)))+R*.25),
    T=tang(cx,yc,R,cx+wb,bt),top=yc-R,o='',k={};
  /* ön görünüş */
  var big=(Math.PI-2*T.t)>Math.PI?1:0;
  o+=pa(P('M',xl+re,yb,'L',xr-re,yb,'Q',xr,yb,xr,yb-re,'L',xr,bt+re,'Q',xr,bt,xr-re,bt,'L',cx+wb,bt,'L',T.x,T.y,'A',R,R,'0',big,'0',2*cx-T.x,T.y,'L',cx-wb,bt,'L',xl+re,bt,'Q',xl,bt,xl,bt+re,'L',xl,yb-re,'Q',xl,yb,xl+re,yb,'Z'),'#fff',1.6);
  o+=ci(cx,yc,R*.9,'none',.7,' opacity=".6"')+insF(cx,yc,gI)+nip(cx,top);
  [-1,1].forEach(function(q){var hx=cx+q*J/2*s,hw=hd/2*s;o+=hid(hx-hw,bt,hx-hw,yb)+hid(hx+hw,bt,hx+hw,yb)+cl(hx,bt-6,hx,yb+5)});
  o+=axes(xl-16,cx+R+8,yc,cx,top-12,yb+6);
  /* kesit A-A */
  var xh1=286+(132-(rm-lm)*s)/2-lm*s,xh0=xh1-Wh*s,xm=(xh0+xh1)/2,ba=A/2*s,I=insS(xh1,yc,gI,Sm*s),cr=Math.min(5,Wh*s*.15);
  o+=pa(P('M',xh0+cr,top,'L',xh1-cr,top,'Q',xh1,top,xh1,top+cr,'L',xh1,bt,'L',xm+ba,bt,'L',xm+ba,yb,'L',xm-ba,yb,'L',xm-ba,bt,'L',xh0,bt,'L',xh0,top+cr,'Q',xh0,top,xh0+cr,top,'Z'),HA1,1.6);
  o+=I.s+nip(I.xb,top)+axes(Math.min(I.x0,xm-ba)-8,I.x1+8,yc,I.xb,top-12,yb+6);
  o+=ttl(cx,14,'ÖN GÖRÜNÜŞ')+ttl(SCX,14,'KESİT A-A');
  /* ölçüler */
  o+=dH('J',cx-J/2*s,cx+J/2*s,yb+17,f(J),yb+5,yb+5);k.J=1;
  o+=dH('L',xl,xr,yb+35,f(L),yb,yb);k.L=1;
  o+=dV('H',xl-12,yb,yc,f(H),-1,xl,null);k.H=1;
  if(!K){o+=dV('H2',xr+12,yb,top,f(D.H2),1,xr,cx);k.H2=1;
    var nx=cx+J/2*s;o+=dH('N',nx-hd/2*s,nx+hd/2*s,bt-7,f(D.N),bt,bt);k.N=1;
    o+=dH('A',xm-ba,xm+ba,yb+17,f(A),yb,yb);k.A=1;
    o+=bsD(I,yc,top,D,k,!!D.S);}
  o+=dV('d',I.x1+13,yc-gI.r,yc+gI.r,f(D.d),1,I.x1,I.x1);k.d=1;
  return {o:o,k:k};
}
/* ---- germe yatağı (UCT) ---- */
function tak(g,D){
  var H=D.H,L=D.L,L1=D.L1,Wt=2*(L-L1),Sm=D.S||D.B*.3,x1m=Sm+1.5,lm=Math.min(x1m-D.B,-D.A),s=Math.min(205/L,150/H,132/(x1m-lm));
  VH=Math.max(200,H*s+110);var cy=64+H/2*s+(VH-110-H*s)/2,yb=cy+H/2*s,top=cy-H/2*s,cx=FCX+(L1-L/2)*s,xa=cx-L1*s,xbL=cx-Wt/2*s,xbR=cx+Wt/2*s,h2=D.H2/2*s,n=D.N/2*s,rc=Math.min(8,Wt*s*.08),o='',k={};
  var gI=geo(D.d,D.B,Math.min(H,Wt)*.72,s);
  o+=pa(P('M',xbL+2,cy-h2,'L',xa+2,cy-h2,'L',xa,cy-h2+2,'L',xa,cy+h2-2,'L',xa+2,cy+h2,'L',xbL+2,cy+h2),'#fff',1.6);
  o+=hid(xa,cy-n,xbL-2,cy-n)+hid(xa,cy+n,xbL-2,cy+n);
  o+=pa(P('M',xbL+rc,top,'L',xbR-rc,top,'Q',xbR,top,xbR,top+rc,'L',xbR,yb-rc,'Q',xbR,yb,xbR-rc,yb,'L',xbL+rc,yb,'Q',xbL,yb,xbL,yb-rc,'L',xbL,top+rc,'Q',xbL,top,xbL+rc,top,'Z'),'#fff',1.6);
  o+=ln(xbL+4,top+7,xbR-4,top+7,.8)+ln(xbL+4,yb-7,xbR-4,yb-7,.8);
  o+=insF(cx,cy,gI)+nip(cx,top)+axes(xa-8,xbR+8,cy,cx,top-12,yb+6);
  var hx1=286+(132-(x1m-lm)*s)/2-lm*s,hx0=hx1-D.A*s,I=insS(hx1,cy,gI,Sm*s),q=rc*.6;
  o+=pa(P('M',hx0+q,top,'L',hx1-q,top,'Q',hx1,top,hx1,top+q,'L',hx1,yb-q,'Q',hx1,yb,hx1-q,yb,'L',hx0+q,yb,'Q',hx0,yb,hx0,yb-q,'L',hx0,top+q,'Q',hx0,top,hx0+q,top,'Z'),HA1,1.6);
  o+=I.s+nip(I.xb,top)+axes(Math.min(I.x0,hx0)-8,I.x1+8,cy,I.xb,top-12,yb+6);
  o+=ttl(FCX,14,'ÖN GÖRÜNÜŞ')+ttl(SCX,14,'KESİT A-A');
  o+=dH('L1',xa,cx,yb+17,f(L1),cy+h2,yb+6);k.L1=1;
  o+=dH('L',xa,xbR,yb+35,f(L),cy+h2,yb);k.L=1;
  o+=dV('H2',xa-12,cy-h2,cy+h2,f(D.H2),-1,xa,xa);k.H2=1;
  o+=dV('N',(xa+xbL)/2,cy-n,cy+n,f(D.N),-1,null,null);k.N=1;
  o+=dV('H',xbR+12,top,yb,f(H),1,xbR,xbR);k.H=1;
  o+=dH('A',hx0,hx1,yb+17,f(D.A),yb,yb);k.A=1;
  o+=bsD(I,cy,top,D,k,!!D.S);
  o+=dV('d',I.x1+13,cy-gI.r,cy+gI.r,f(D.d),1,I.x1,I.x1);k.d=1;
  return {o:o,k:k};
}
/* ---- flanş kesiti (ortak gövde profili, ölçüleri tipe göre) ---- */
function flS(cy,xh1,F,gI,s,Sp){
  var t=F.t*s,Aw=F.Aw*s,Lp=F.Lp*s,Rb=F.Rb*s,p=(F.p||0)*s,rp=(F.rp||0)*s,xf=xh1-Aw,o='';
  o+=pa(P('M',xf,cy-Lp,'L',xf+t,cy-Lp,'L',xf+t,cy-Rb,'L',xh1,cy-Rb,'L',xh1,cy+Rb,'L',xf+t,cy+Rb,'L',xf+t,cy+Lp,'L',xf,cy+Lp)+(p?P('L',xf,cy+rp,'L',xf-p,cy+rp,'L',xf-p,cy-rp,'L',xf,cy-rp):'')+'Z',HA1,1.6);
  var I=insS(xh1,cy,gI,Sp);
  o+=I.s+axes(Math.min(I.x0,xf-p)-8,I.x1+8,cy,I.xb,cy-Rb-8,cy+Rb+8);
  return {o:o,I:I,xf:xf,Aw:Aw,Lp:Lp,Rb:Rb,p:p,rp:rp};
}
function bolt(D,n){return D.M?n+' × M'+f(D.M):null}
/* ---- 4 delikli kare flanş (UCF) ---- */
function fsq(g,D){
  var L=D.L,J=D.J,hr=((D.M||L*.1)+1.5)/2,Rb=Math.min(.4*L,J*.7071-hr-.03*L),Aw=D.A,F={t:Aw*.2,Aw:Aw,Lp:L/2,Rb:Rb};
  var Sm=D.S||D.B*.3,x1m=Sm+1.5,lm=Math.min(x1m-D.B,-Aw),s=Math.min(167/L,132/(x1m-lm));VH=Math.max(200,L*s+93);var cy=64+L/2*s+(VH-93-L*s)/2,cx=FCX,h=L/2*s,rc=L*.14*s,j=J/2*s,o='',k={};
  var gI=geo(D.d,D.B,1.7*Rb,s);
  o+=pa(P('M',cx-h+rc,cy-h,'L',cx+h-rc,cy-h,'Q',cx+h,cy-h,cx+h,cy-h+rc,'L',cx+h,cy+h-rc,'Q',cx+h,cy+h,cx+h-rc,cy+h,'L',cx-h+rc,cy+h,'Q',cx-h,cy+h,cx-h,cy+h-rc,'L',cx-h,cy-h+rc,'Q',cx-h,cy-h,cx-h+rc,cy-h,'Z'),'#fff',1.6);
  o+=ci(cx,cy,Rb*s,'none',1.2)+ci(cx,cy,Rb*s+2.5,'none',.6,' opacity=".6"');
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(q){var x=cx+q[0]*j,y=cy+q[1]*j;o+=ci(x,y,hr*s,'#fff',1.3)+cl(x-hr*s-4,y,x+hr*s+4,y)+cl(x,y-hr*s-4,x,y+hr*s+4)});
  o+=insF(cx,cy,gI)+axes(cx-h-8,cx+h+8,cy,cx,cy-h-8,cy+h+8);
  var S=flS(cy,286+(132-(x1m-lm)*s)/2-lm*s,F,gI,s,Sm*s),I=S.I,xf=S.xf;o+=S.o;
  o+=ttl(cx,14,'ÖN GÖRÜNÜŞ')+ttl(SCX,14,'KESİT A-A');
  o+=dH('L',cx-h,cx+h,cy-h-13,f(L),cy-h+rc,cy-h+rc);k.L=1;
  o+=dH('J',cx-j,cx+j,cy+h+15,f(J),cy+j+hr*s+1,cy+j+hr*s+1);k.J=1;
  var bl=bolt(D,4);if(bl){o+=ldr('M',cx+j+hr*s*.71,cy-j-hr*s*.71,cx+h+8,cy-j-15,bl,1);k.M=1;k.Mv=bl}
  o+=dH('A',xf,xf+Aw*s,cy+h+15,f(Aw),cy+h,cy+S.Rb);k.A=1;
  o+=bsD(I,cy,cy-h,D,k,!!D.S);
  o+=dV('d',I.x1+13,cy-gI.r,cy+gI.r,f(D.d),1,I.x1,I.x1);k.d=1;
  return {o:o,k:k};
}
/* ---- 2 delikli oval flanş (UCFL, KFL) ---- */
function fov(g,D){
  var K=g==='KFL',H=D.H,L=D.L,J=D.J,hr=((D.M||L*.1)+(K?1:1.5))/2,Rc=L/2,rl=(H-J)/2,Rb=Rc*(K?.84:.8),
    Aw=K?(D.A2||D.B*.45):D.A,F={t:Aw*(K?.45:.2),Aw:Aw,Lp:L/2,Rb:Rb};
  var Bi=K?Aw*1.7:D.B,Sm=(!K&&D.S)||Bi*.3,x1m=Sm+1.5,lm=Math.min(x1m-Bi,-Aw),s=Math.min(200/H,157/L,132/(x1m-lm));VH=Math.max(200,L*s+103);var cy=64+L/2*s+(VH-103-L*s)/2,cx=FCX,o='',k={};
  var gI=geo(D.d,Bi,1.7*Rb,s),R=Rc*s,r=rl*s,j=J/2*s,c=Math.min(.999,(Rc-rl)/(J/2)),al=Math.acos(c),ca=Math.cos(al),sa=Math.sin(al);
  o+=pa(P('M',cx+R*ca,cy-R*sa,'L',cx+j+r*ca,cy-r*sa,'A',r,r,'0 0 1',cx+j+r*ca,cy+r*sa,'L',cx+R*ca,cy+R*sa,'A',R,R,'0 0 1',cx-R*ca,cy+R*sa,'L',cx-j-r*ca,cy+r*sa,'A',r,r,'0 0 1',cx-j-r*ca,cy-r*sa,'L',cx-R*ca,cy-R*sa,'A',R,R,'0 0 1',cx+R*ca,cy-R*sa,'Z'),'#fff',1.6);
  o+=ci(cx,cy,Rb*s,'none',1.2)+ci(cx,cy,Rb*s+2.5,'none',.6,' opacity=".6"');
  [-1,1].forEach(function(q){var x=cx+q*j;o+=ci(x,cy,hr*s,'#fff',1.3)+cl(x,cy-hr*s-5,x,cy+hr*s+5)});
  o+=insF(cx,cy,gI)+axes(cx-j-r-8,cx+j+r+8,cy,cx,cy-R-8,cy+R+8);
  var S=flS(cy,286+(132-(x1m-lm)*s)/2-lm*s,F,gI,s,Sm*s),I=S.I,xf=S.xf,yb=cy+R;o+=S.o;
  o+=ttl(cx,14,'ÖN GÖRÜNÜŞ')+ttl(SCX,14,'KESİT A-A');
  o+=dH('J',cx-j,cx+j,yb+15,f(J),cy+hr*s+1,cy+hr*s+1);k.J=1;
  o+=dH('H',cx-j-r,cx+j+r,yb+33,f(H),cy,cy);k.H=1;
  o+=dV('L',cx-j-r-12,cy-R,cy+R,f(L),-1,cx,cx);k.L=1;
  var bl=bolt(D,2);if(bl){o+=ldr('M',cx+j+hr*s*.71,cy-hr*s*.71,cx+j+r*.5+6,cy-r-14,bl,1);k.M=1;k.Mv=bl}
  if(!K){o+=dH('A',xf,xf+Aw*s,yb+15,f(Aw),yb,cy+S.Rb);k.A=1;
    o+=bsD(I,cy,cy-R,D,k,!!D.S)}
  o+=dV('d',I.x1+13,cy-gI.r,cy+gI.r,f(D.d),1,I.x1,I.x1);k.d=1;
  return {o:o,k:k};
}
/* ---- yuvarlak pilotlu flanş (UCFC) ---- */
function frd(g,D){
  var L=D.L,J=D.J,hr=((D.M||L*.1)+1.5)/2,Rb=Math.min(J/2-hr-.03*L,.4*L),Aw=D.A1||L*.2,rp=D.H3/2,F={t:Aw*.25,Aw:Aw,Lp:L/2,Rb:Rb,p:Aw*.14,rp:rp};
  var Sm=D.S||D.B*.3,x1m=Sm+1.5,lm=Math.min(x1m-D.B,-Aw*1.14),s=Math.min(167/L,108/(x1m-lm));VH=Math.max(200,L*s+93);var cy=64+L/2*s+(VH-93-L*s)/2,cx=FCX,h=L/2*s,j=J/2*s,o='',k={},q7=.7071;
  var gI=geo(D.d,D.B,1.7*Math.min(Rb,rp),s);
  o+=ci(cx,cy,h,'#fff',1.6)+ci(cx,cy,Rb*s,'none',1.2)+ci(cx,cy,Rb*s+2.5,'none',.6,' opacity=".6"')+ci(cx,cy,j,'none',.6,' stroke-dasharray="12 3 2 3" opacity=".75"');
  [[1,-1],[1,1],[-1,1],[-1,-1]].forEach(function(z){var x=cx+z[0]*j*q7,y=cy+z[1]*j*q7;o+=ci(x,y,hr*s,'#fff',1.3)});
  o+=insF(cx,cy,gI)+axes(cx-h-8,cx+h+8,cy,cx,cy-h-8,cy+h+8);
  var S=flS(cy,310+(108-(x1m-lm)*s)/2-lm*s,F,gI,s,Sm*s),I=S.I,xf=S.xf;o+=S.o;
  o+=ttl(cx,14,'ÖN GÖRÜNÜŞ')+ttl(SCX,14,'KESİT A-A');
  o+=dH('L',cx-h,cx+h,cy-h-13,'ø'+f(L),cy,cy);k.L=1;
  var rk=h+12;o+=G('J',arr(cx-j*q7,cy+j*q7,cx+j*q7,cy-j*q7)+'<line x1="'+a(cx+j*q7)+'" y1="'+a(cy-j*q7)+'" x2="'+a(cx+rk*q7)+'" y2="'+a(cy-rk*q7)+'" stroke="'+DIM+'" stroke-width="1"/><line x1="'+a(cx+rk*q7)+'" y1="'+a(cy-rk*q7)+'" x2="'+a(cx+rk*q7+8)+'" y2="'+a(cy-rk*q7)+'" stroke="'+DIM+'" stroke-width="1"/>'+tx(cx+rk*q7+11,cy-rk*q7+4,'ø'+f(J),'start'));k.J=1;
  var bl=bolt(D,4);if(bl){o+=ldr('M',cx-j*q7-hr*s*q7,cy-j*q7-hr*s*q7,cx-rk*q7,cy-rk*q7,bl,-1);k.M=1;k.Mv=bl}
  o+=dV('H3',xf-S.p-12,cy-S.rp,cy+S.rp,'ø'+f(D.H3),-1,xf-S.p,xf-S.p);k.H3=1;
  o+=bsD(I,cy,cy-h,D,k,!!D.S);
  o+=dV('d',I.x1+13,cy-gI.r,cy+gI.r,'ø'+f(D.d),1,I.x1,I.x1);k.d=1;
  return {o:o,k:k};
}
var DR={pil:pil,tak:tak,fsq:fsq,fov:fov,frd:frd},ORD=['d','H','H2','L','L1','J','A','N','H3','B','S','M'];
(window.YDRAW=window.YDRAW||{}).yatakli={
  match:function(ctx){return isFam(ctx)},
  draw:function(ctx,opt){
    if(!ctx||!isFam(ctx))return null;var g=grp(ctx);if(!g)return null;var D=dims(ctx,g);if(!D)return null;
    opt=opt||{};VH=250;ID=String(opt.id||'yt')+'-';DIM=opt.dim||'#0a2350';HA1='url(#'+ID+'h1)';HA2='url(#'+ID+'h2)';
    var r=DR[TIP[g]](g,D),keys=[],i,q;
    for(i=0;i<ORD.length;i++){q=ORD[i];if(r.k[q])keys.push({k:q,l:LBL[g][q],v:q==='M'?r.k.Mv:f(D[q])+' mm'})}
    return {svg:svg(r.o),keys:keys};
  }
};
})();
