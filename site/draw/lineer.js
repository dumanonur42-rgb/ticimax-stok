/* Lineer ailesi teknik çizimleri: lineer araba (dar/geniş), ray, LM rulmanlar (düz/yuvarlak flanş/kare flanş),
   SCE/SBR yataklı lineer rulman, SK/SHF mil tutucu, BK/BF vidalı mil yatağı, krom mil.
   Ekrana yazılan her sayı ürün sayfasından (specs/onyazi) veya fotoğraftan okunmuş ctx.data'dan gelir; eksikse null. */
(function(){
var C='#16203a',HAT='#9aa6bd';
function N(s){return String(s||'').replace(/İ/g,'I').replace(/ı/g,'I').replace(/i/g,'I').toUpperCase()}
function f(n){return String(Math.round(n*100)/100).replace('.',',')}
function num(ctx,v){if(ctx&&typeof ctx.num=='function')return ctx.num(v);var m=String(v).replace(',','.').match(/[\d.]+/);return m?parseFloat(m[0]):NaN}
/* --- ölçüleri topla: sayfa etiketleri -> anahtar, sonra fotoğraftan okunan ctx.data */
function dims(ctx){
  var o={},lab={},src=(ctx.specs||[]).concat(ctx.onyazi||[]);
  src.forEach(function(s){
    var l=String(s.l||'').trim(),v=String(s.v||'').trim(),k=null,m;
    if(/^vida\s*\(m\s*x\s*l\)$/i.test(l)||/^vida\s*\(m\)$/i.test(l)){m=v.match(/^M\s*(\d+(?:[.,]\d+)?)(?:\s*[x×]\s*(\d+(?:[.,]\d+)?))?$/i);if(m&&o.Md==null){o.Md=num(ctx,m[1]);if(m[2])o.Ml=num(ctx,m[2]);o.Mtxt='M'+m[1]+(m[2]?'×'+m[2]:'');lab.M=l}return}
    if(/^mil\s*çap/i.test(l))k='dr';
    else if(m=l.match(/\(([A-Za-z][A-Za-z0-9]{0,2})\)\s*$/))k=m[1];
    else if(/^[A-Z][A-Za-z0-9]{0,2}$/.test(l))k=l;
    if(!k||o[k]!=null)return;
    if(!/^[\d.,]+\s*mm$/i.test(v)&&!(/^[\d.,]+$/.test(v)))return;
    var n=num(ctx,v);if(!(n>0))return;o[k]=n;lab[k]=l;
  });
  var d=ctx.data||{};for(var k in d)if(o[k]==null&&typeof d[k]=='number'&&d[k]>0){o[k]=d[k];lab[k]=null}
  o._lab=lab;return o;
}
function has(o,ks){for(var i=0;i<ks.length;i++)if(!(o[ks[i]]>0))return false;return true}
/* --- alt tip */
function sub(ctx){
  var t=N(ctx.title),cr=(ctx.crumbs||[]).map(N),c=cr.join(' | ');
  if(/LINEER ARABA/.test(c)||/LINEER ARABA/.test(t))return /GENIŞ|\b[A-Z]{2}W\s?\d/.test(t)?'arabaW':'arabaH';
  if(/LINEER RAY/.test(c)||/LINEER RAY\b/.test(t))return 'ray';
  if(/VIDALI MIL/.test(c)||/VIDALI MIL (UÇ )?YATA/.test(t))return 'bkbf';
  if(/KROM KAPLI/.test(c)||/KROM KAPLI.*MIL/.test(t))return 'mil';
  if(/MIL TUTUCU/.test(c)||/MIL TUTUCU/.test(t))return /\bSHF\b/.test(t)?'shf':(/\bSK\b/.test(t)?'sk':null);
  if(/\bSBR\b/.test(t))return 'sbr';
  if(/\bSC[ESV]?\s?\d/.test(t)||/SCE SERI/.test(c))return 'sce';
  if(/\bLM[E]?F\s?\d/.test(t)||/LMEF SERI/.test(c))return 'lmf';
  if(/\bLM[E]?K\s?\d/.test(t)||/LMEK SERI/.test(c))return 'lmk';
  if(/\bLM[E]?\s?\d/.test(t))return 'lm';
  return null;
}
function inFamily(ctx){
  var cr=(ctx.crumbs||[]).map(N);
  for(var i=0;i<cr.length;i++)if(cr[i]=='LINEER')return true;
  if(cr.length>1)return false;
  var t=N(ctx.title);
  return /LINEER (RULMAN|ARABA|RAY\b)|MIL TUTUCU (SK|SHF)|VIDALI MIL (UÇ )?YATA|KROM KAPLI INDÜKSIYONLU MIL|\bHIWIN\b.*\b(HG|QH|EG|MG)[HWLR]\s?\d/.test(t);
}
/* --- çizim yardımcıları */
function K(opt){
  var id=(opt&&opt.id)||'yl',dim=(opt&&opt.dim)||'#0a2350',A='url(#'+id+'a)',g=[];
  function tw(s,fs){return String(s).length*(fs||12)*.6}
  function txt(x,y,s,anc,rot,fs){return '<text x="'+r(x)+'" y="'+r(y)+'" fill="'+dim+'" font-size="'+(fs||12)+'" font-weight="700" text-anchor="'+(anc||'middle')+'"'+(rot?' transform="rotate(-90 '+r(x)+' '+r(y)+')"':'')+'>'+s+'</text>'}
  function r(n){return Math.round(n*10)/10}
  function ln(x1,y1,x2,y2,st){return '<line x1="'+r(x1)+'" y1="'+r(y1)+'" x2="'+r(x2)+'" y2="'+r(y2)+'" '+(st||'')+'/>'}
  var DL='stroke="'+dim+'" stroke-width="1"';
  var api={r:r,tw:tw,id:id,dim:dim,
    add:function(s){g.push(s)},
    path:function(d,fill,w,extra){g.push('<path d="'+d+'" fill="'+(fill||'none')+'" stroke="'+C+'" stroke-width="'+(w||1.5)+'" stroke-linejoin="round" '+(extra||'')+'/>')},
    rect:function(x,y,w,h,fill,sw,extra){g.push('<rect x="'+r(x)+'" y="'+r(y)+'" width="'+r(w)+'" height="'+r(h)+'" fill="'+(fill||'none')+'" stroke="'+C+'" stroke-width="'+(sw==null?1.5:sw)+'" '+(extra||'')+'/>')},
    circ:function(x,y,rr,fill,sw,extra){g.push('<circle cx="'+r(x)+'" cy="'+r(y)+'" r="'+r(rr)+'" fill="'+(fill||'none')+'" stroke="'+C+'" stroke-width="'+(sw==null?1.5:sw)+'" '+(extra||'')+'/>')},
    line:function(x1,y1,x2,y2,w){g.push(ln(x1,y1,x2,y2,'stroke="'+C+'" stroke-width="'+(w||1.5)+'"'))},
    hid:function(x1,y1,x2,y2){g.push(ln(x1,y1,x2,y2,'stroke="'+C+'" stroke-width=".8" stroke-dasharray="4 2.5"'))},
    axis:function(x1,y1,x2,y2){g.push(ln(x1,y1,x2,y2,'stroke="'+C+'" stroke-width=".6" stroke-dasharray="12 3 2 3" opacity=".75"'))},
    ext:function(x1,y1,x2,y2){g.push(ln(x1,y1,x2,y2,'stroke="'+dim+'" stroke-width=".6" opacity=".6"'))},
    hatch:function(){return 'url(#'+id+'h)'},hatch2:function(){return 'url(#'+id+'g)'},
    title:function(x,y,s){g.push('<text x="'+r(x)+'" y="'+r(y)+'" fill="'+dim+'" font-size="10" letter-spacing="1.5" text-anchor="middle" opacity=".75">'+s+'</text>')},
    /* yatay ölçü: x1<x2, çizgi y'de; yazı üstte. Dar ise oklar dışarıda, yazı yanda (side 'l'/'r') */
    h:function(k,x1,x2,y,lab,side,below){var w=x2-x1,t=tw(lab),s='<g class="hl" data-k="'+k+'">',ty=below?y+13:y-4;
      if(w>=t+14)s+=ln(x1,y,x2,y,DL+' marker-start="'+A+'" marker-end="'+A+'"')+txt((x1+x2)/2,ty,lab);
      else{s+=ln(x1,y,x2,y,DL)+ln(x1-11,y,x1,y,DL+' marker-end="'+A+'"')+ln(x2+11,y,x2,y,DL+' marker-end="'+A+'"');
        s+=side=='l'?txt(x1-14,y+4,lab,'end'):(side=='c'?txt((x1+x2)/2,ty,lab):txt(x2+14,y+4,lab,'start'))}
      g.push(s+'</g>')},
    /* dikey ölçü: y1<y2, çizgi x'te; yazı döndürülmüş (side 'l' solda, 'r' sağda); dar ise yatay yazı */
    v:function(k,y1,y2,x,lab,side){var hh=y2-y1,t=tw(lab),s='<g class="hl" data-k="'+k+'">';
      if(hh>=t+14)s+=ln(x,y1,x,y2,DL+' marker-start="'+A+'" marker-end="'+A+'"')+(side=='r'?txt(x+13,(y1+y2)/2,lab,'middle',1):txt(x-5,(y1+y2)/2,lab,'middle',1));
      else{s+=ln(x,y1,x,y2,DL)+ln(x,y1-11,x,y1,DL+' marker-end="'+A+'"')+ln(x,y2+11,x,y2,DL+' marker-end="'+A+'"');
        s+=side=='r'?txt(x+5,(y1+y2)/2+4,lab,'start'):txt(x-5,(y1+y2)/2+4,lab,'end')}
      g.push(s+'</g>')},
    /* çap ölçüsü (yatay, daire içinden) */
    note:function(k,x1,y1,x2,y2,lab,anc){g.push('<g class="hl" data-k="'+k+'">'+ln(x1,y1,x2,y2,DL+' marker-start="'+A+'"')+ln(x2,y2,x2+(anc=='end'?-tw(lab)-4:tw(lab)+4),y2,DL)+txt(anc=='end'?x2-2:x2+2,y2-4,lab,anc||'start')+'</g>')},
    svg:function(h){return '<svg viewBox="0 0 460 '+Math.round(h)+'" width="100%" style="display:block;font-family:inherit" xmlns="http://www.w3.org/2000/svg"><defs>'+
      '<pattern id="'+id+'h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+HAT+'" stroke-width="1.1"/></pattern>'+
      '<pattern id="'+id+'g" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+HAT+'" stroke-width="1.1"/></pattern>'+
      '<marker id="'+id+'a" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,1.5 L10,5 L0,8.5z" fill="'+dim+'"/></marker>'+
      '</defs>'+g.join('')+'</svg>'}
  };
  return api;
}
function keyList(o,ks,def){var out=[];ks.forEach(function(k){if(k=='M'){if(o.Mtxt)out.push({k:'M',l:o._lab.M||'Bağlantı vidası',v:o.Mtxt});return}
  if(o[k]>0)out.push({k:k,l:o._lab[k]||def[k]||k,v:f(o[k])+' mm'})});return out}
function dia(n){return 'ø'+f(n)}

/* ===== LİNEER ARABA (dar HGH tipi / geniş flanşlı HGW tipi) ===== */
function araba(o,opt,wide){
  var W=o.W,H=o.H,H1=o.H1,Nn=o.N,B=o.B,Cc=o.C,L=o.L,L1=o.L1,G=o.G||0;
  if(!(W>B&&H>H1&&W>2*Nn&&L>L1&&L1>Cc))return null;
  var WR=W-2*Nn;
  var s=Math.min(330/(W+L+G),150/H,5);
  var tot=36+W*s+58+(G*s+12)+L*s+16,ox=(460-tot)/2,y0=66;
  var k=K(opt),fl=ox+36,fx=fl+W*s/2,fr=fl+W*s;
  var rb=y0+H*s,HR=(wide?.6:.55)*H,rt=rb-HR*s,bb=rb-H1*s,cw=WR/2*1.06,ct=rt-.035*H*s;
  var Md=o.Md||Math.max(2.5,W*.1),Ml=o.Ml||(wide?0:H*.22),T1=wide?Math.min(o.T1||((H-H1)*.38),(H-H1)*.5):0;
  /* --- KESİT A-A (ön) */
  var xL=fx-W*s/2,xR=fx+W*s/2,bw=wide?Math.max(Math.min(B-2.6*Md,W-4*Md),WR*2.05):W,bl=fx-bw*s/2,br=fx+bw*s/2,ft=y0+T1*s,cl=fx-cw*s,cr=fx+cw*s;
  var p=wide?('M'+k.r(xL)+','+y0+'H'+k.r(xR)+'V'+k.r(ft-2)+'Q'+k.r(xR)+','+k.r(ft)+' '+k.r(xR-2)+','+k.r(ft)+'H'+k.r(br+3)+'Q'+k.r(br)+','+k.r(ft)+' '+k.r(br)+','+k.r(ft+3)+'V'+k.r(bb)+'H'+k.r(cr)+'V'+k.r(ct)+'H'+k.r(cl)+'V'+k.r(bb)+'H'+k.r(bl)+'V'+k.r(ft+3)+'Q'+k.r(bl)+','+k.r(ft)+' '+k.r(bl-3)+','+k.r(ft)+'H'+k.r(xL+2)+'Q'+k.r(xL)+','+k.r(ft)+' '+k.r(xL)+','+k.r(ft-2)+'Z')
    :('M'+k.r(xL)+','+y0+'H'+k.r(xR)+'V'+k.r(bb)+'H'+k.r(cr)+'V'+k.r(ct)+'H'+k.r(cl)+'V'+k.r(bb)+'H'+k.r(xL)+'Z');
  k.path(p,k.hatch());
  /* ray kesiti (boyunlu profil) */
  var rw=WR*s/2,nk=rw*.18,ny=rt+HR*s*.42;
  k.path('M'+k.r(fx-rw)+','+k.r(rt)+'H'+k.r(fx+rw)+'V'+k.r(ny-HR*s*.1)+'L'+k.r(fx+rw-nk)+','+k.r(ny)+'V'+k.r(ny+HR*s*.12)+'L'+k.r(fx+rw)+','+k.r(ny+HR*s*.22)+'V'+k.r(rb)+'H'+k.r(fx-rw)+'V'+k.r(ny+HR*s*.22)+'L'+k.r(fx-rw+nk)+','+k.r(ny+HR*s*.12)+'V'+k.r(ny)+'L'+k.r(fx-rw)+','+k.r(ny-HR*s*.1)+'Z',k.hatch2());
  /* ray civata deliği (havşa) - gizli */
  var hd=WR*s*.22,hD=WR*s*.38,hh=HR*s*.32;
  k.add('<rect x="'+k.r(fx-hD/2)+'" y="'+k.r(rt)+'" width="'+k.r(hD)+'" height="'+k.r(hh)+'" fill="#fff" stroke="none"/><rect x="'+k.r(fx-hd/2)+'" y="'+k.r(rt+hh)+'" width="'+k.r(hd)+'" height="'+k.r(rb-rt-hh)+'" fill="#fff" stroke="none"/>');
  k.path('M'+k.r(fx-hD/2)+','+k.r(rt)+'V'+k.r(rt+hh)+'H'+k.r(fx-hd/2)+'V'+k.r(rb)+'M'+k.r(fx+hD/2)+','+k.r(rt)+'V'+k.r(rt+hh)+'H'+k.r(fx+hd/2)+'V'+k.r(rb),'none',1);
  /* bilyalar (4 sıra) ve dönüş kanalları */
  var rbl=Math.max(2,WR*s*.075);
  [[-1,rt+rbl*.9],[1,rt+rbl*.9],[-1,ny+HR*s*.06],[1,ny+HR*s*.06]].forEach(function(q,i){var bx=fx+q[0]*(i<2?rw-rbl*.9:rw-nk*.4);k.circ(bx,q[1],rbl,'#fff',1.1)});
  var rx=(wide?bw/2:W/2)*s,rcx=cw*s+(rx-cw*s)*.45;
  if(rx-cw*s>rbl*3)[-1,1].forEach(function(q){k.circ(fx+q*rcx,rt+rbl*.9,rbl*.95,'#fff',1);k.circ(fx+q*rcx,ny+HR*s*.06,rbl*.95,'#fff',1)});
  /* üst bağlantı delikleri (diş: iç çap dolu, dış çap ince) */
  var hdep=wide?T1*s:Ml*s,md=Md*s,mi=md*.82;
  [-1,1].forEach(function(q){var hx=fx+q*B*s/2;
    k.add('<rect x="'+k.r(hx-mi/2)+'" y="'+y0+'" width="'+k.r(mi)+'" height="'+k.r(hdep)+'" fill="#fff" stroke="none"/>');
    k.line(hx-mi/2,y0,hx-mi/2,y0+hdep,1.1);k.line(hx+mi/2,y0,hx+mi/2,y0+hdep,1.1);
    k.line(hx-md/2,y0,hx-md/2,y0+hdep,.6);k.line(hx+md/2,y0,hx+md/2,y0+hdep,.6);
    if(!wide)k.line(hx-mi/2,y0+hdep,hx+mi/2,y0+hdep,1.1);
    k.axis(hx,y0-5,hx,y0+hdep+5)});
  k.axis(fx,y0-8,fx,rb+8);
  /* ölçüler: W, B üstte; H solda; H1 sağda; N altta */
  k.ext(xL,y0-2,xL,y0-34);k.ext(xR,y0-2,xR,y0-34);k.h('W',xL,xR,y0-30,f(W));
  k.ext(fx-B*s/2,y0-6,fx-B*s/2,y0-16);k.ext(fx+B*s/2,y0-6,fx+B*s/2,y0-16);k.h('B',fx-B*s/2,fx+B*s/2,y0-12,f(B),'l');
  k.ext(xL-2,y0,xL-24,y0);k.ext(fx-rw-2,rb,xL-24,rb);k.v('H',y0,rb,xL-18,f(H),'l');
  k.ext(br+2,bb,fr+18,bb);k.ext(fx+rw+2,rb,fr+18,rb);k.v('H1',bb,rb,fr+12,f(H1),'r');
  k.ext(bl,bb+2,bl,rb+24);k.ext(fx-rw,rb+2,fx-rw,rb+24);
  if(wide){k.ext(xL,ft+2,xL,rb+24)}
  k.h('N',wide?xL:bl,fx-rw,rb+18,f(Nn),'c',true);
  if(o.Mtxt){var nx=fx+B*s/2+md/2,ny2=y0+Math.min(hdep*.5,8);k.note('M',nx,ny2,fr+10,y0-6,(wide?'4-':'4-')+o.Mtxt,'start')}
  k.title(fx,rb+50,'KESİT A-A');
  /* --- YAN GÖRÜNÜŞ */
  var sx=fr+58+G*s+12,se=sx+L*s,b1=sx+(L-L1)/2*s,b2=sx+(L+L1)/2*s,ec=y0+.07*(H-H1)*s,mid=(sx+se)/2;
  var rs=sx-G*s-12,re=se+14;
  /* ray (kırık uçlu) */
  function brk(x,y1,y2,d){var m=(y1+y2)/2;return 'L'+k.r(x)+','+k.r(y1)+' '+k.r(x+3*d)+','+k.r(m-3)+' '+k.r(x-3*d)+','+k.r(m+3)+' '+k.r(x)+','+k.r(y2)}
  k.path('M'+k.r(rs)+','+k.r(rt)+'H'+k.r(re)+brk(re,rt,rb,1).replace(/^L[^ ]+ /,'L')+'H'+k.r(rs)+brk(rs,rb,rt,-1).replace(/^L[^ ]+ /,'L')+'Z','#f3f5f9',1.2);
  k.line(rs,ny,re,ny,.7);k.line(rs,ny+HR*s*.22,re,ny+HR*s*.22,.7);
  /* gövde, kapaklar, keçeler */
  k.rect(b1,y0,b2-b1,bb-y0,'#fff');
  var cap=(b1-sx);k.rect(sx,ec,cap,bb-ec,'#fff',1.3);k.rect(b2,ec,cap,bb-ec,'#fff',1.3);
  k.line(sx+cap*.38,ec,sx+cap*.38,bb,.8);k.line(se-cap*.38,ec,se-cap*.38,bb,.8);
  /* bilya dönüş hattı - gizli */
  k.hid(b1+3,rt+rbl,b2-3,rt+rbl);
  /* gres nipeli */
  if(G>0){var gy=ec+(bb-ec)*.42,gl=G*s;k.path('M'+k.r(sx)+','+k.r(gy-gl*.18)+'H'+k.r(sx-gl*.45)+'V'+k.r(gy+gl*.18)+'H'+k.r(sx)+'Z','#fff',1.1);k.circ(sx-gl*.72,gy,gl*.26,'#fff',1.1)}
  /* üst delikler (gizli) */
  [-1,1].forEach(function(q){var hx=mid+q*Cc*s/2,dd=wide?Math.min(H-H1,T1*1.6)*s*.55:Ml*s;k.hid(hx-md/2,y0,hx-md/2,y0+dd);k.hid(hx+md/2,y0,hx+md/2,y0+dd);k.axis(hx,y0-5,hx,y0+dd+5)});
  /* kesit izi A-A */
  k.add('<g stroke="'+C+'" stroke-width="2.2"><line x1="'+k.r(mid)+'" y1="'+k.r(rb+5)+'" x2="'+k.r(mid)+'" y2="'+k.r(rb+14)+'"/></g>');
  k.add('<path d="M'+k.r(mid)+','+k.r(rb+14)+'H'+k.r(mid-12)+'" stroke="'+C+'" stroke-width="1.1" marker-end="url(#'+k.id+'a)"/><text x="'+k.r(mid-18)+'" y="'+k.r(rb+18)+'" font-size="10" font-weight="700" fill="'+C+'" text-anchor="end">A</text>');
  /* ölçüler: C, L1, L üstte */
  k.ext(mid-Cc*s/2,y0-6,mid-Cc*s/2,y0-16);k.ext(mid+Cc*s/2,y0-6,mid+Cc*s/2,y0-16);k.h('C',mid-Cc*s/2,mid+Cc*s/2,y0-12,f(Cc));
  k.ext(b1,y0-2,b1,y0-32);k.ext(b2,y0-2,b2,y0-32);k.h('L1',b1,b2,y0-28,f(L1));
  k.ext(sx,ec-2,sx,y0-48);k.ext(se,ec-2,se,y0-48);k.h('L',sx,se,y0-44,f(L));
  k.title(mid,rb+50,'YAN GÖRÜNÜŞ');
  return {svg:k.svg(Math.max(200,rb+58)),keys:keyList(o,['W','H','L','B','C','L1','H1','N','M'],{W:'Genişlik (W)',H:'Yükseklik (H)',L:'Uzunluk (L)'})};
}

/* ===== LM lineer rulman: düz / yuvarlak flanşlı / kare flanşlı ===== */
function lm(o,opt,kind){
  var dr=o.dr,D=o.D,L=o.L,F=kind=='lmf'?o.Df:(kind=='lmk'?o.K:0),t=kind=='lm'?0:o.t;
  if(!(D>dr&&L>0)||(kind!='lm'&&!(F>D&&t>0&&t<L)))return null;
  var OD=F||D,s=Math.min(150/OD,240/L,4.5),k=K(opt),cy=26+OD*s/2+14,fx=24+OD*s/2+18,R=D*s/2,r=dr*s/2,Fr=OD*s/2;
  /* ÖN GÖRÜNÜŞ */
  if(kind=='lmk')k.rect(fx-Fr,cy-Fr,2*Fr,2*Fr,'none',1.5,'rx="'+k.r(Fr*.12)+'"');else if(kind=='lmf')k.circ(fx,cy,Fr);
  k.circ(fx,cy,R);k.circ(fx,cy,r+(R-r)*.32,'none',1);k.circ(fx,cy,r);
  for(var i=0;i<8;i++){var a=i*Math.PI/4,pr=r+(R-r)*.16;k.circ(fx+pr*Math.cos(a),cy+pr*Math.sin(a),Math.max(1.2,(R-r)*.09),'#fff',.9)}
  if(kind!='lm'){var pc=kind=='lmk'?(Fr*.72):(R+Fr)/2,hr=Math.max(2,(Fr-R)*.22);[0,1,2,3].forEach(function(i){var a=Math.PI/4+i*Math.PI/2;var hx=fx+pc*Math.cos(a),hy=cy+pc*Math.sin(a);k.circ(hx,hy,hr,'none',1.2)});
    if(kind=='lmf')k.add('<circle cx="'+fx+'" cy="'+cy+'" r="'+k.r(pc)+'" fill="none" stroke="'+C+'" stroke-width=".6" stroke-dasharray="12 3 2 3" opacity=".75"/>')}
  k.axis(fx-Fr-8,cy,fx+Fr+8,cy);k.axis(fx,cy-Fr-8,fx,cy+Fr+8);
  k.h('dr',fx-r,fx+r,cy+Math.min(r*.55,14),dia(dr));
  k.ext(fx-R,cy,fx-R,cy+Fr+22);k.ext(fx+R,cy,fx+R,cy+Fr+22);k.h('D',fx-R,fx+R,cy+Fr+18,dia(D));
  if(F){k.ext(fx-Fr,cy-(kind=='lmk'?Fr:0),fx-Fr,cy-Fr-20);k.ext(fx+Fr,cy-(kind=='lmk'?Fr:0),fx+Fr,cy-Fr-20);k.h(kind=='lmk'?'K':'Df',fx-Fr,fx+Fr,cy-Fr-14,kind=='lmk'?f(F):dia(F))}
  k.title(fx,cy+Fr+42,'ÖN GÖRÜNÜŞ');
  /* KESİT A-A */
  var sx=fx+Fr+70,se=sx+L*s,tw=t*s;
  [-1,1].forEach(function(q){var yo=cy+q*R,yi=cy+q*r,yf=cy+q*Fr;
    var ri=cy+q*(r+(R-r)*.32);
    k.path('M'+k.r(sx)+','+k.r(yo)+'H'+k.r(se)+'V'+k.r(ri)+'H'+k.r(sx)+'Z',k.hatch());
    if(tw)k.path('M'+k.r(sx)+','+k.r(yf)+'H'+k.r(sx+tw)+'V'+k.r(yo)+'H'+k.r(sx)+'Z',k.hatch());
    k.rect(sx+2,Math.min(ri,yi),L*s-4,Math.abs(ri-yi),'#fff',1);
    for(var j=1;j<6;j++)k.circ(sx+L*s*j/6,(ri+yi)/2,Math.max(1.2,Math.abs(ri-yi)*.32),'#fff',.9);
    k.line(sx+L*s*.12,yo,sx+L*s*.12,yo-q*(R-r)*.12,1);k.line(se-L*s*.12,yo,se-L*s*.12,yo-q*(R-r)*.12,1)});
  k.axis(sx-10,cy,se+10,cy);
  k.ext(sx,cy-Fr-2,sx,cy-Fr-20);k.ext(se,cy-R-2,se,cy-Fr-20);k.h('L',sx,se,cy-Fr-14,f(L));
  k.ext(se+2,cy-R,se+48,cy-R);k.ext(se+2,cy+R,se+48,cy+R);k.v('D',cy-R,cy+R,se+42,dia(D),'r');
  k.ext(se+2,cy-r,se+22,cy-r);k.ext(se+2,cy+r,se+22,cy+r);k.v('dr',cy-r,cy+r,se+18,dia(dr),'r');
  if(tw){k.ext(sx,cy+Fr+2,sx,cy+Fr+22);k.ext(sx+tw,cy+R+2,sx+tw,cy+Fr+22);k.h('t',sx,sx+tw,cy+Fr+18,f(t),'r')}
  k.title((sx+se)/2,cy+Fr+42,'KESİT A-A');
  return {svg:k.svg(cy+Fr+50),keys:keyList(o,['dr','D','L','Df','K','t'],{dr:'Mil Çapı (dr)',D:'Dış Çap (D)',L:'Uzunluk (L)',Df:'Flanş Çapı',K:'Flanş Ölçüsü',t:'Flanş Kalınlığı'})};
}
/* ===== SCE (kapalı) / SBR (açık) yataklı lineer rulman ===== */
function blok(o,opt,open){
  var dr=o.dr,W=o.W,H=o.H,h=o.h,L=o.L;if(!(W>dr&&H>h&&h>dr/2&&L>0))return null;
  var s=Math.min(150/W,170/H,200/L,4),k=K(opt),y0=40,yb=y0+H*s,fx=40+W*s/2,cy=yb-h*s,r=dr*s/2,R=r*1.45,xL=fx-W*s/2,xR=fx+W*s/2;
  var p=open?('M'+k.r(xL)+','+k.r(yb)+'V'+k.r(yb-H*s*.22)+'H'+k.r(xL+W*s*.16)+'V'+k.r(y0+H*s*.12)+'Q'+k.r(xL+W*s*.16)+','+y0+' '+k.r(xL+W*s*.28)+','+y0+'H'+k.r(xR-W*s*.28)+'Q'+k.r(xR-W*s*.16)+','+y0+' '+k.r(xR-W*s*.16)+','+k.r(y0+H*s*.12)+'V'+k.r(yb-H*s*.22)+'H'+k.r(xR)+'V'+k.r(yb)+'H'+k.r(fx+r*.7)+'L'+k.r(fx+r*.7)+','+k.r(cy)+'H'+k.r(fx-r*.7)+'L'+k.r(fx-r*.7)+','+k.r(yb)+'Z'):('M'+k.r(xL)+','+k.r(y0)+'H'+k.r(xR)+'V'+k.r(yb)+'H'+k.r(xL)+'Z');
  k.path(p,'#fff');k.circ(fx,cy,R,'#fff',1.2);k.circ(fx,cy,r);
  if(!open)[-1,1].forEach(function(q){k.circ(fx+q*W*s*.36,y0+H*s*.18,Math.max(2,W*s*.035),'none',1.1)});
  k.axis(fx-R-10,cy,fx+R+10,cy);k.axis(fx,y0-6,fx,yb+6);
  k.h('dr',fx-r,fx+r,cy-r*.3,dia(dr));
  k.ext(xL,y0-2,xL,y0-26);k.ext(xR,y0-2,xR,y0-26);k.h('W',xL,xR,y0-20,f(W));
  k.ext(xL-2,y0,xL-26,y0);k.ext(xL-2,yb,xL-26,yb);k.v('H',y0,yb,xL-20,f(H),'l');
  k.ext(xR+2,cy,xR+24,cy);k.ext(xR+2,yb,xR+24,yb);k.v('h',cy,yb,xR+18,f(h),'r');
  k.title(fx,yb+22,'ÖN GÖRÜNÜŞ');
  var sx=xR+80,se=sx+L*s;k.path('M'+k.r(sx)+','+k.r(open?y0+H*s*.0:y0)+'H'+k.r(se)+'V'+k.r(cy-R)+'H'+k.r(sx)+'Z',k.hatch());
  k.path('M'+k.r(sx)+','+k.r(cy+R)+'H'+k.r(se)+'V'+k.r(yb)+'H'+k.r(sx)+'Z',open?'#fff':k.hatch());
  k.rect(sx,cy-R,L*s,R-r,'#fff',1);k.rect(sx,cy+r,L*s,R-r,'#fff',1);k.axis(sx-10,cy,se+10,cy);
  k.ext(sx,y0-2,sx,y0-26);k.ext(se,y0-2,se,y0-26);k.h('L',sx,se,y0-20,f(L));
  k.title((sx+se)/2,yb+22,'KESİT A-A');
  return {svg:k.svg(yb+30),keys:keyList(o,['dr','W','H','h','L'],{dr:'Mil Çapı (dr)',W:'Genişlik (W)',H:'Yükseklik (H)',h:'Eksen Yüksekliği (h)',L:'Uzunluk (L)'})};
}
/* ===== SK dikey mil tutucu ===== */
function sk(o,opt){
  var dr=o.dr,W=o.W,H=o.H,h=o.h,T=o.T;if(!(W>dr*1.2&&H>h+dr/2&&T>0))return null;
  var s=Math.min(160/W,170/H,4),k=K(opt),y0=40,yb=y0+H*s,fx=40+W*s/2,cy=yb-h*s,r=dr*s/2,xL=fx-W*s/2,xR=fx+W*s/2,ub=Math.max(dr*1.7,W*.42)*s/2,bh=Math.min(h*.35,H*.25)*s;
  k.path('M'+k.r(xL)+','+k.r(yb)+'V'+k.r(yb-bh)+'H'+k.r(fx-ub)+'V'+k.r(y0)+'H'+k.r(fx+ub)+'V'+k.r(yb-bh)+'H'+k.r(xR)+'V'+k.r(yb)+'Z','#fff');
  k.circ(fx,cy,r);k.line(fx,y0,fx,cy-r,1.2);k.hid(fx-ub,y0+(cy-r-y0)*.5,fx+ub,y0+(cy-r-y0)*.5);
  [-1,1].forEach(function(q){var hx=fx+q*(ub+(W*s/2-ub)/2);k.hid(hx-3,yb-bh,hx-3,yb);k.hid(hx+3,yb-bh,hx+3,yb);k.axis(hx,yb-bh-4,hx,yb+4)});
  k.axis(fx-r-10,cy,fx+r+10,cy);k.axis(fx,y0-6,fx,yb+6);k.h('dr',fx-r,fx+r,cy+r*.35,dia(dr));
  k.ext(xL,yb-bh-2,xL,y0-26);k.ext(xR,yb-bh-2,xR,y0-26);k.h('W',xL,xR,y0-20,f(W));
  k.ext(fx-ub-2,y0,xL-26,y0);k.ext(xL-2,yb,xL-26,yb);k.v('H',y0,yb,xL-20,f(H),'l');
  k.ext(xR+2,cy,xR+24,cy);k.ext(xR+2,yb,xR+24,yb);k.v('h',cy,yb,xR+18,f(h),'r');k.title(fx,yb+22,'ÖN GÖRÜNÜŞ');
  var sx=xR+90,tw=T*s;k.path('M'+k.r(sx)+','+k.r(y0)+'H'+k.r(sx+tw)+'V'+k.r(yb)+'H'+k.r(sx)+'Z',k.hatch());k.rect(sx,cy-r,tw,2*r,'#fff',1.2);k.axis(sx-10,cy,sx+tw+10,cy);
  k.ext(sx,y0-2,sx,y0-26);k.ext(sx+tw,y0-2,sx+tw,y0-26);k.h('T',sx,sx+tw,y0-20,f(T),'r');k.title(sx+tw/2,yb+22,'KESİT A-A');
  return {svg:k.svg(yb+30),keys:keyList(o,['dr','W','H','h','T'],{dr:'Mil Çapı (dr)',W:'Genişlik (W)',H:'Yükseklik (H)',h:'Eksen Yüksekliği (h)',T:'Kalınlık (T)'})};
}
/* ===== SHF flanşlı mil tutucu ===== */
function shf(o,opt){
  var dr=o.dr,W=o.W,H=o.H,T=o.T,D=o.D;if(!(W>D&&D>dr&&H>T&&T>0))return null;
  var s=Math.min(170/W,150/D*1.6,120/H,4),k=K(opt),cy=40+W*s*.3+10,fx=30+W*s/2,r=dr*s/2,R=D*s/2,fh=Math.max(R*1.1,W*s*.3);
  k.path('M'+k.r(fx-W*s/2+fh)+','+k.r(cy-fh)+'H'+k.r(fx+W*s/2-fh)+'A'+k.r(fh)+','+k.r(fh)+' 0 0 1 '+k.r(fx+W*s/2-fh)+','+k.r(cy+fh)+'H'+k.r(fx-W*s/2+fh)+'A'+k.r(fh)+','+k.r(fh)+' 0 0 1 '+k.r(fx-W*s/2+fh)+','+k.r(cy-fh)+'Z','#fff');
  k.circ(fx,cy,R);k.circ(fx,cy,r);[-1,1].forEach(function(q){k.circ(fx+q*(W*s/2-fh),cy,fh*.32,'none',1.2)});
  k.axis(fx-W*s/2-8,cy,fx+W*s/2+8,cy);k.axis(fx,cy-fh-8,fx,cy+fh+8);k.h('dr',fx-r,fx+r,cy+r*.4,dia(dr));
  k.ext(fx-W*s/2,cy,fx-W*s/2,cy-fh-26);k.ext(fx+W*s/2,cy,fx+W*s/2,cy-fh-26);k.h('W',fx-W*s/2,fx+W*s/2,cy-fh-20,f(W));
  k.ext(fx-R,cy,fx-R,cy+fh+22);k.ext(fx+R,cy,fx+R,cy+fh+22);k.h('D',fx-R,fx+R,cy+fh+18,dia(D));k.title(fx,cy+fh+42,'ÜST GÖRÜNÜŞ');
  var sx=fx+W*s/2+60,yt=cy-H*s/2,yb=cy+H*s/2;k.path('M'+k.r(sx)+','+k.r(yb)+'V'+k.r(yb-T*s)+'H'+k.r(sx+(W-D)/2*s*.5)+'V'+k.r(yt)+'H'+k.r(sx+(W-D)/2*s*.5+(D-dr)/2*s)+'V'+k.r(yb)+'Z',k.hatch());
  k.axis(sx+(W-D)/2*s*.5+(D-dr)/2*s+r,yt-6,sx+(W-D)/2*s*.5+(D-dr)/2*s+r,yb+6);
  k.ext(sx-2,yt,sx-24,yt);k.ext(sx-2,yb,sx-24,yb);k.v('H',yt,yb,sx-18,f(H),'l');k.ext(sx+2,yb-T*s,sx+(W-D)/2*s*.5+30,yb-T*s);k.v('T',yb-T*s,yb,sx+(W-D)/2*s*.5+24,f(T),'r');
  k.title(sx+30,cy+fh+42,'KESİT (YARIM)');
  return {svg:k.svg(cy+fh+50),keys:keyList(o,['dr','D','W','H','T'],{dr:'Mil Çapı (dr)',D:'Gövde Çapı (D)',W:'Flanş Boyu (W)',H:'Yükseklik (H)',T:'Flanş Kalınlığı (T)'})};
}
/* ===== Lineer ray (profil + yan görünüş) ===== */
function ray(o,opt){
  var WR=o.WR,HR=o.HR,P=o.P;if(!(WR>0&&HR>0&&P>WR*.8))return null;
  var s=Math.min(110/WR,140/HR,4),k=K(opt),y0=44,yb=y0+HR*s,fx=50+WR*s/2,rw=WR*s/2,ny=y0+HR*s*.42,nk=rw*.18;
  k.path('M'+k.r(fx-rw)+','+y0+'H'+k.r(fx+rw)+'V'+k.r(ny-HR*s*.1)+'L'+k.r(fx+rw-nk)+','+k.r(ny)+'V'+k.r(ny+HR*s*.12)+'L'+k.r(fx+rw)+','+k.r(ny+HR*s*.22)+'V'+k.r(yb)+'H'+k.r(fx-rw)+'V'+k.r(ny+HR*s*.22)+'L'+k.r(fx-rw+nk)+','+k.r(ny+HR*s*.12)+'V'+k.r(ny)+'L'+k.r(fx-rw)+','+k.r(ny-HR*s*.1)+'Z',k.hatch2());
  k.axis(fx,y0-6,fx,yb+6);k.ext(fx-rw,y0-2,fx-rw,y0-26);k.ext(fx+rw,y0-2,fx+rw,y0-26);k.h('WR',fx-rw,fx+rw,y0-20,f(WR));
  k.ext(fx-rw-2,y0,fx-rw-26,y0);k.ext(fx-rw-2,yb,fx-rw-26,yb);k.v('HR',y0,yb,fx-rw-20,f(HR),'l');k.title(fx,yb+22,'PROFİL');
  var sx=fx+rw+60,se=440,n=Math.max(2,Math.floor((se-sx-20)/(P*Math.min(s,(se-sx-40)/P/1.6)))),ps=Math.min(P*s,(se-sx-40)/1.6),x1=sx+20;
  k.path('M'+k.r(sx)+','+y0+'H'+k.r(se)+'L'+k.r(se+3)+','+k.r((y0+yb)/2-3)+' '+k.r(se-3)+','+k.r((y0+yb)/2+3)+' '+k.r(se)+','+k.r(yb)+'H'+k.r(sx)+'L'+k.r(sx+3)+','+k.r((y0+yb)/2+3)+' '+k.r(sx-3)+','+k.r((y0+yb)/2-3)+'Z','#fff');
  for(var x=x1;x<se-10;x+=ps){k.hid(x-WR*s*.19,y0,x-WR*s*.19,y0+HR*s*.32);k.hid(x+WR*s*.19,y0,x+WR*s*.19,y0+HR*s*.32);k.hid(x-WR*s*.11,y0+HR*s*.32,x-WR*s*.11,yb);k.hid(x+WR*s*.11,y0+HR*s*.32,x+WR*s*.11,yb);k.axis(x,y0-5,x,yb+5)}
  k.ext(x1,y0-2,x1,y0-26);k.ext(x1+ps,y0-2,x1+ps,y0-26);k.h('P',x1,x1+ps,y0-20,f(P),'r');k.title((sx+se)/2,yb+22,'YAN GÖRÜNÜŞ');
  return {svg:k.svg(Math.max(200,yb+30)),keys:keyList(o,['WR','HR','P'],{WR:'Ray Genişliği (WR)',HR:'Ray Yüksekliği (HR)',P:'Delik Aralığı (P)'})};
}
/* ===== BK/BF vidalı mil uç yatağı ===== */
function bkbf(o,opt,fixed){
  var dr=o.dr,W=o.W,H=o.H,h=o.h,B=o.B;if(!(W>dr*1.5&&H>h&&h>dr/2&&B>0))return null;
  var s=Math.min(170/W,160/H,140/B,4),k=K(opt),y0=40,yb=y0+H*s,fx=40+W*s/2,cy=yb-h*s,r=dr*s/2,R=r*1.9,xL=fx-W*s/2,xR=fx+W*s/2;
  k.path('M'+k.r(xL)+','+k.r(yb)+'V'+k.r(cy)+'A'+k.r(W*s/2)+','+k.r(cy-y0)+' 0 0 1 '+k.r(xR)+','+k.r(cy)+'V'+k.r(yb)+'Z','#fff');
  k.circ(fx,cy,R,'none',1.2);k.circ(fx,cy,(R+r)/2,'none',.8,'stroke-dasharray="2 2"');k.circ(fx,cy,r);
  [-1,1].forEach(function(q){k.circ(fx+q*W*s*.36,yb-(yb-cy)*.45,Math.max(2,W*s*.04),'none',1.1)});
  k.axis(fx-R-10,cy,fx+R+10,cy);k.axis(fx,y0-6,fx,yb+6);k.h('dr',fx-r,fx+r,cy+r*.35,dia(dr));
  k.ext(xL,cy,xL,y0-26);k.ext(xR,cy,xR,y0-26);k.h('W',xL,xR,y0-20,f(W));k.ext(fx-2,y0,xL-26,y0);k.ext(xL-2,yb,xL-26,yb);k.v('H',y0,yb,xL-20,f(H),'l');
  k.ext(xR+2,cy,xR+24,cy);k.ext(xR+2,yb,xR+24,yb);k.v('h',cy,yb,xR+18,f(h),'r');k.title(fx,yb+22,'ÖN GÖRÜNÜŞ');
  var sx=xR+80,se=sx+B*s;k.path('M'+k.r(sx)+','+k.r(y0)+'H'+k.r(se)+'V'+k.r(cy-R)+'H'+k.r(sx)+'Z',k.hatch());k.path('M'+k.r(sx)+','+k.r(cy+R)+'H'+k.r(se)+'V'+k.r(yb)+'H'+k.r(sx)+'Z',k.hatch());
  var bw=Math.min(B*s*(fixed?.8:.45),B*s-4);[-1,1].forEach(function(q){k.rect(sx+(B*s-bw)/2,q<0?cy-R:cy+r,bw,R-r,'#fff',1);if(fixed){k.line(sx+B*s/2,cy-R,sx+B*s/2,cy-r,.8);k.line(sx+B*s/2,cy+r,sx+B*s/2,cy+R,.8)}});
  k.axis(sx-10,cy,se+10,cy);k.ext(sx,y0-2,sx,y0-26);k.ext(se,y0-2,se,y0-26);k.h('B',sx,se,y0-20,f(B),'r');k.title((sx+se)/2,yb+22,'KESİT A-A');
  return {svg:k.svg(yb+30),keys:keyList(o,['dr','W','H','h','B'],{dr:'Mil Çapı (d)',W:'Genişlik (W)',H:'Yükseklik (H)',h:'Eksen Yüksekliği (h)',B:'Kalınlık (B)'})};
}
/* ===== Krom kaplı mil ===== */
function mil(o,opt){
  var d=o.dr,Lm=o.Lm;if(!(d>0&&Lm>d))return null;
  var k=K(opt),cy=110,r=Math.min(40,Math.max(10,d*2))/2,x1=60,x2=400,c=Math.min(3,r*.25);
  k.path('M'+(x1+c)+','+(cy-r)+'H'+(x2-c)+'L'+x2+','+(cy-r+c)+'V'+(cy+r-c)+'L'+(x2-c)+','+(cy+r)+'H'+(x1+c)+'L'+x1+','+(cy+r-c)+'V'+(cy-r+c)+'Z','#fff');
  var m=(x1+x2)/2;k.add('<rect x="'+(m-6)+'" y="'+(cy-r-3)+'" width="12" height="'+(2*r+6)+'" fill="#fbfcfe"/>');k.path('M'+(m-6)+','+(cy-r-3)+'q4,'+(r+3)+' 0,'+(2*r+6)+'M'+(m+6)+','+(cy-r-3)+'q4,'+(r+3)+' 0,'+(2*r+6),'none',1.2);
  k.axis(x1-10,cy,x2+10,cy);k.ext(x1,cy-r-2,x1,cy-r-28);k.ext(x2,cy-r-2,x2,cy-r-28);k.h('Lm',x1,x2,cy-r-22,f(Lm));
  k.ext(x2+2,cy-r,x2+30,cy-r);k.ext(x2+2,cy+r,x2+30,cy+r);k.v('dr',cy-r,cy+r,x2+24,dia(d),'r');k.title(230,cy+r+30,'GÖRÜNÜŞ (ÖLÇEKSİZ)');
  return {svg:k.svg(Math.max(200,cy+r+40)),keys:keyList(o,['dr','Lm'],{dr:'Mil Çapı (d)',Lm:'Boy (L)'})};
}

(window.YDRAW=window.YDRAW||{})['lineer']={
  sub:sub,
  match:function(ctx){try{return inFamily(ctx)}catch(e){return false}},
  draw:function(ctx,opt){try{
    var t=sub(ctx);if(!t)return null;var o=dims(ctx);opt=opt||{};
    if(t=='arabaH'||t=='arabaW')return has(o,['W','H','H1','N','B','C','L','L1'])?araba(o,opt,t=='arabaW'):null;
    if(t=='lm'||t=='lmf'||t=='lmk')return has(o,['dr','D','L'])?lm(o,opt,t):null;
    if(t=='sce'||t=='sbr')return has(o,['dr','W','H','h','L'])?blok(o,opt,t=='sbr'):null;
    if(t=='sk')return has(o,['dr','W','H','h','T'])?sk(o,opt):null;
    if(t=='shf')return has(o,['dr','D','W','H','T'])?shf(o,opt):null;
    if(t=='ray')return has(o,['WR','HR','P'])?ray(o,opt):null;
    if(t=='bkbf')return has(o,['dr','W','H','h','B'])?bkbf(o,opt,/\bBK\b/.test(N(ctx.title))):null;
    if(t=='mil')return has(o,['dr','Lm'])?mil(o,opt):null;
    return null}catch(e){return null}}
};
})();
