/* Konik makaralı rulman teknik çizimi (ön görünüş + kesit A-A). Ekrana yazılan her sayı ürün sayfasındaki ölçülerden gelir. */
(function(){
var Y=window.YDRAW=window.YDRAW||{};
function N(s){return String(s||'').replace(/İ/g,'I').replace(/ı/g,'i').toUpperCase().replace(/Ç/g,'C').replace(/Ş/g,'S').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ö/g,'O').replace(/Â/g,'A').replace(/\s+/g,' ')}
var NEG=/BURC|KILIT|MATKAP|EKSENEL|AKSIYEL|KECE|MANSON|SEGMAN|YATAK|IGNELI|ZINCIR|LINEER|OYNAK|SILINDIRIK|BILYALI|DISLI|PIM|FREZE|RAYBA|HAVSA|TAKIM|PUL\b/;
function series(c){var t=N(c.title),m=t.match(/(?:^|[^0-9])(3[0-3][0-9])[0-9]{2}/);if(m)return m[1];if(/(^|[^A-Z])(LM|HM|JLM|JM|JL|HH|LL|L|M)[0-9]{4,6}/.test(t))return 'inch';return ''}
function match(c){var t=N(c.title),cr=N((c.crumbs||[]).join(' | '));
 if(NEG.test(t))return false;
 if(/KONIK MAKARALI/.test(t))return true;
 return /KONIK MAKARALI RULMAN/.test(cr)&&/RULMAN|^[A-Z]*[0-9]/.test(t)&&!NEG.test(cr.split('|').pop());}
var LB={d:/^IC CAP/,D:/^DIS CAP/,B:/^(KALINLIK|IC BILEZIK GENISLIGI)/,E:/^(E OLCUSU|DIS BILEZIK GENISLIGI)/,F:/^(F OLCUSU|TOPLAM GENISLIK)/};
function grab(c){var o={},num=c.num||function(v){var m=String(v).replace(',','.').match(/[\d.]+/);return m?parseFloat(m[0]):NaN};
 [c.specs||[],c.onyazi||[]].forEach(function(arr){arr.forEach(function(s){for(var k in LB)if(!o[k]&&LB[k].test(N(s.l).trim())){var n=num(s.v);if(n>0)o[k]={n:n,l:String(s.l).trim(),v:String(s.v).trim()}}})});
 var dt=c.data||{};for(var k in LB)if(!o[k]&&dt[k]>0)o[k]={n:+dt[k],l:{d:'İç Çap (d)',D:'Dış Çap (D)',B:'Kalınlık (B)',E:'E Ölçüsü',F:'F Ölçüsü'}[k],v:String(dt[k]).replace('.',',')+' mm'};
 return o}
function f(n){return String(Math.round(n*100)/100).replace('.',',')}
function tw(s){var w=0;for(var i=0;i<s.length;i++)w+=/[0-9]/.test(s[i])?8.2:(s[i]==','?4:11);return w}
function P(v){return Math.round(v*10)/10}
// seri -> şekil (sadece görsel; çizimde sayı olarak yazılmaz): a = dış bilezik yolu açısı (°), w = büyük uç makara çapı / kesit yüksekliği
var SH={'302':{a:13,w:.46},'303':{a:13,w:.47},'313':{a:28,w:.4},'320':{a:15,w:.44},'322':{a:14,w:.46},'323':{a:13,w:.47},'329':{a:12,w:.44},'330':{a:13,w:.45},'331':{a:11,w:.46},'332':{a:14,w:.47},'inch':{a:13,w:.46}};
function geo(ri,ro,B,C,T,sh){
 var H=ro-ri,rad=Math.PI/180,al=sh.a*rad,de=(sh.a>20?2.5:2)*rad,be=al-de,cb=Math.cos(be),sb=Math.sin(be);
 var w=sh.w,rmF=.5,lxF=1,g;
 for(var it=0;it<12;it++){
  var Dw1=H*w,h1=Dw1/2,lx=Math.min(.62*B,.86*C,T*.7)*lxF,l=lx/cb,h2=h1-l*Math.tan(de),wr=.12*B;
  var xa=wr+h1*sb,xb=xa+lx,rmid=ri+H*rmF,ra=rmid+lx/2*Math.tan(be),rb=ra-lx*Math.tan(be);
  var LO=[xa+h1*sb,ra+h1*cb],LI=[xa-h1*sb,ra-h1*cb],SO=[xb+h2*sb,rb+h2*cb],SI=[xb-h2*sb,rb-h2*cb];
  var kc=(SO[1]-LO[1])/(SO[0]-LO[0]),kn=(SI[1]-LI[1])/(SI[0]-LI[0]);
  var rc=function(x){return LO[1]+(x-LO[0])*kc},rn=function(x){return LI[1]+(x-LI[0])*kn};
  var gp=.025*B,S0=[SI[0]+cb*gp,SI[1]-sb*gp],tS=.36*h2,S1=[S0[0]+sb*tS,S0[1]+cb*tS],xs=S0[0],rsm=S1[1],rrib=LI[1]+.38*Dw1;
  var cF=ro-rc(T-C),cBk=ro-rc(T),cnS=rn(xs)-ri,cnL=LI[1]-ri;
  g={S0:S0,S1:S1,H:H,Dw1:Dw1,h1:h1,h2:h2,l:l,lx:lx,xa:xa,xb:xb,ra:ra,rb:rb,LO:LO,LI:LI,SO:SO,SI:SI,rc:rc,rn:rn,xs:xs,rsm:rsm,rrib:rrib,be:be,u:[cb,-sb],n:[sb,cb]};
  var ok=cF>=.1*H&&cBk>=.17*H&&cnS>=.12*H&&SO[0]<=T-.04*T&&S1[0]<=B*.94&&rrib<rc(LI[0])-.1*H;
  if(ok)break;
  if(SO[0]>T-.04*T||S1[0]>B*.94)lxF*=.93;
  if(cF<.1*H||cBk<.17*H){if(cnS>.16*H)rmF-=.025;else w*=.94}
  else if(cnS<.12*H){if(cF>.16*H&&cBk>.24*H)rmF+=.025;else w*=.94}
  else w*=.95;
 }
 return g}
function draw(c,opt){
 opt=opt||{};var o=grab(c);if(!o.d||!o.D||!o.B||!o.F)return null;
 var d=o.d.n,D=o.D.n,B=o.B.n,T=o.F.n,hasE=!!o.E,C=hasE?o.E.n:T*.8;
 if(!(D>d&&T>=B&&C<=T&&C>0&&B>0&&T<D))return null;
 var se=series(c),sh=SH[se]||SH['302'],dim=opt.dim||'#0a2350',ln='#16203a',hat='#9aa6bd',id=opt.id||('kn'+Math.random().toString(36).slice(2,7));
 var ri=d/2,ro=D/2,H=ro-ri,G0=geo(ri,ro,B,C,T,sh);
 // --- yerleşim: ön görünüş ~%40, kesit ~%60
 var TOP=54,SMAX=160,WMAX=184,MINH=54,HT=58,MINGAP=44;
 var s=Math.min(SMAX/D,WMAX/T),gap=d*s,brk=false;
 if(H*s<MINH){s=Math.min(HT/H,WMAX/T,(SMAX-MINGAP)/(2*H));var g2=SMAX-2*H*s;if(g2<d*s-1){gap=g2;brk=true}else gap=d*s}
 var S=2*H*s+gap,cy=TOP+S/2,w=T*s,hb=gap/2;
 var RF=70,sF=RF/ro,fx=92;
 var VH=Math.round(Math.max(TOP+S+42,cy+RF+52));
 var sx=Math.round(196+Math.max(0,(258-(w+74))/2));
 function X(x){return sx+x*s}
 function Yu(r){return cy-hb-(r-ri)*s}function Yl(r){return cy+hb+(r-ri)*s}
 function PT(p,h){return P(X(p[0]))+','+P((h<0?Yu:Yl)(p[1]))}
 function poly(pts,h){return 'M'+pts.map(function(p){return PT(p,h)}).join('L')+'Z'}
 var g=G0,ch=Math.min(H*.05,1.2/s+H*.02),rc=g.rc,rn=g.rn,cFx=T-C;
 var cup=[[cFx,rc(cFx)],[cFx,ro-ch],[cFx+ch,ro],[T-ch,ro],[T,ro-ch],[T,rc(T)+ch*.7],[T-ch*.7,rc(T-ch*.7)]];
 var tR=(g.rrib-g.LI[1])/g.n[1],ribX=g.LI[0]+g.n[0]*tR,ch2=ch*.7;
 var cone=[[0,ri+ch],[ch,ri],[B-ch,ri],[B,ri+ch],[B,g.rsm-ch2],[B-ch2,g.rsm],g.S1,g.S0,g.LI,[ribX,g.rrib],[ch2,g.rrib],[0,g.rrib-ch2]];
 var A=[g.xa,g.ra],Bp=[g.xb,g.rb],u=g.u,n=g.n;
 function ad(p,v,k){return [p[0]+v[0]*k,p[1]+v[1]*k]}
 var c0=ad(ad(A,u,-.1*g.l),n,.55*g.h1),c1=ad(ad(Bp,u,.13*g.l),n,.55*g.h2);
 var cage=[c0,c1,ad(ad(c1,u,.05*g.l),n,-.75*g.h2)];
 var rol=[g.LO,g.SO,g.SI,g.LI];
 var a0=ad(A,u,-.16*g.l),a1=ad(Bp,u,.16*g.l);
 var g1='',hs='stroke="'+ln+'" stroke-width="1.5" stroke-linejoin="round"';
 [-1,1].forEach(function(h){
  g1+='<path d="'+poly(cup,h)+'" fill="url(#'+id+'h2)" '+hs+'/>';
  g1+='<path d="'+poly(cone,h)+'" fill="url(#'+id+'h1)" '+hs+'/>';
  g1+='<path d="'+poly(rol,h)+'" fill="#fff" '+hs+'/>';
  g1+='<polyline points="'+cage.map(function(p){return PT(p,h)}).join(' ')+'" fill="none" stroke="'+ln+'" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"/>';
  g1+='<line x1="'+P(X(a0[0]))+'" y1="'+P((h<0?Yu:Yl)(a0[1]))+'" x2="'+P(X(a1[0]))+'" y2="'+P((h<0?Yu:Yl)(a1[1]))+'" stroke="'+ln+'" stroke-width=".7" stroke-dasharray="8 2 1.5 2" opacity=".6"/>';
 });
 g1+='<line x1="'+P(sx-10)+'" y1="'+P(cy)+'" x2="'+P(sx+w+12)+'" y2="'+P(cy)+'" stroke="'+ln+'" stroke-width=".7" stroke-dasharray="12 3 2 3" opacity=".6"/>';
 // --- ön görünüş (iç bilezik arka yüzü tarafından), kendi ölçeğinde
 function ring(r1,r2,fill){return '<path d="M'+P(fx-r1)+','+P(cy)+'a'+P(r1)+','+P(r1)+' 0 1,0 '+P(2*r1)+',0a'+P(r1)+','+P(r1)+' 0 1,0 '+P(-2*r1)+',0ZM'+P(fx-r2)+','+P(cy)+'a'+P(r2)+','+P(r2)+' 0 1,0 '+P(2*r2)+',0a'+P(r2)+','+P(r2)+' 0 1,0 '+P(-2*r2)+',0Z" fill="'+fill+'" fill-rule="evenodd" stroke="'+ln+'" stroke-width="1.4"/>'}
 function circ(r,sw,op){return '<circle cx="'+fx+'" cy="'+P(cy)+'" r="'+P(r)+'" fill="none" stroke="'+ln+'" stroke-width="'+sw+'" opacity="'+op+'"/>'}
 var g0=ring(ro*sF,rc(cFx)*sF,'#eef2f8')+circ((ro-ch)*sF,.7,.6);
 var pc=g.ra*sF,rr=g.h1*sF*.96,Z=Math.max(8,Math.floor(2*Math.PI*g.ra/(g.Dw1*1.2)));
 for(var i=0;i<Z;i++){var an=2*Math.PI*i/Z-Math.PI/2;g0+='<circle cx="'+P(fx+pc*Math.cos(an))+'" cy="'+P(cy+pc*Math.sin(an))+'" r="'+P(rr)+'" fill="#fff" stroke="'+ln+'" stroke-width="1.1"/>'}
 g0+=ring(g.rrib*sF,ri*sF,'#eef2f8')+circ((ri+ch)*sF,.7,.6)+circ((g.rrib-ch2)*sF,.7,.6);
 g0+='<g stroke="'+ln+'" stroke-width=".7" stroke-dasharray="12 3 2 3" opacity=".6"><line x1="'+P(fx-RF-10)+'" y1="'+P(cy)+'" x2="'+P(fx+RF+10)+'" y2="'+P(cy)+'"/><line x1="'+fx+'" y1="'+P(cy-RF-10)+'" x2="'+fx+'" y2="'+P(cy+RF+8)+'"/></g>';
 // --- ölçüler
 function txt(x,y,t,rot){return '<text x="'+P(x)+'" y="'+P(y)+'" fill="'+dim+'" font-size="14" font-weight="700" text-anchor="middle" font-family="inherit" stroke="#fff" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke"'+(rot?' transform="rotate(-90 '+P(x)+' '+P(y)+')"':'')+'>'+t+'</text>'}
 function ex(x1,y1,x2,y2){return '<line x1="'+P(x1)+'" y1="'+P(y1)+'" x2="'+P(x2)+'" y2="'+P(y2)+'" stroke="'+dim+'" stroke-width=".7" opacity=".7"/>'}
 function seg(x1,y1,x2,y2,m1,m2){return '<line x1="'+P(x1)+'" y1="'+P(y1)+'" x2="'+P(x2)+'" y2="'+P(y2)+'" stroke="'+dim+'" stroke-width="1.1"'+(m1?' marker-start="url(#'+id+'a)"':'')+(m2?' marker-end="url(#'+id+'a)"':'')+'/>'}
 function dl(x1,y1,x2,y2){var len=Math.abs(x2-x1)+Math.abs(y2-y1);
  if(len>=24)return seg(x1,y1,x2,y2,1,1);
  var hz=y1==y2,e=12;return seg(x1,y1,x2,y2)+seg(hz?x1-e:x1,hz?y1:y1-e,x1,y1,0,1)+seg(hz?x2+e:x2,hz?y2:y2+e,x2,y2,0,1)}
 function vbrk(x,y1,y2){var m=(y1+y2)/2;return seg(x,y1,x,m-3,1,0)+seg(x,m+3,x,y2,0,1)+'<path d="M'+P(x-2)+','+P(m-1)+'L'+P(x+8)+','+P(m-6)+'M'+P(x-2)+','+P(m+6)+'L'+P(x+8)+','+P(m+1)+'" stroke="'+dim+'" stroke-width="1.3"/>'}
 function G(k,b){return '<g class="hl" data-k="'+k+'">'+b+'</g>'}
 var ds='',lD='Ø'+f(D),ld='Ø'+f(d);
 // ön görünüş: ØD altta, Ød delikte
 var yDf=cy+RF+16;ds+=G('D',ex(fx-RF,cy+4,fx-RF,yDf+5)+ex(fx+RF,cy+4,fx+RF,yDf+5)+dl(fx-RF,yDf,fx+RF,yDf)+txt(fx,yDf+17,lD));
 var rif=ri*sF,yd=cy+rif*.5,hx=Math.sqrt(rif*rif-(yd-cy)*(yd-cy));ds+=G('d',dl(fx-hx,yd,fx+hx,yd)+txt(fx+Math.min(rif*.35,hx-tw(ld)/2-4),yd-6,ld));
 // kesit üstü: F (iç bilezik arka yüzü -> dış bilezik arka yüzü), E (dış bilezik genişliği)
 var xL=X(0),xT=X(T),xC=X(cFx),xB=X(B),yF=TOP-34,yE=TOP-12,yUp=Yu(ro);
 function htext(xa,xb,y,lab,side){var t=tw(lab);if(xb-xa>=t+10||side==='c')return txt((xa+xb)/2,y,lab);return txt(xb+8+t/2+(xb-xa<24?12:0),y,lab)}
 ds+=G('F',ex(xL,Yu(g.rrib)-4,xL,yF-5)+ex(xT,yUp-4,xT,yF-5)+dl(xL,yF,xT,yF)+htext(xL,xT,yF-6,f(T),'c'));
 if(hasE)ds+=G('E',ex(xC,yUp-4,xC,yE-5)+ex(xT,yUp-4,xT,yE-5)+dl(xC,yE,xT,yE)+htext(xC,xT,yE-6,f(C)));
 // kesit altı: B (iç bilezik genişliği), iç bilezik yüzlerinden uzatma
 var yB=Yl(ro)+16;ds+=G('B',ex(xL,Yl(g.rrib)+4,xL,yB+5)+ex(xB,Yl(g.rsm)+4,xB,yB+5)+dl(xL,yB,xB,yB)+txt((xL+xB)/2,yB+17,f(B)));
 // sağda Ød (delik yüzü ↔ delik yüzü) ve ØD
 var xd=sx+w+26,xD=sx+w+54,vd=brk?vbrk:function(x,a,b){return dl(x,a,x,b)};
 ds+=G('d',ex(xB+4,Yu(ri),xd+5,Yu(ri))+ex(xB+4,Yl(ri),xd+5,Yl(ri))+vd(xd,Yu(ri),Yl(ri))+txt(xd-7,cy,ld,1));
 ds+=G('D',ex(xT+4,Yu(ro),xD+5,Yu(ro))+ex(xT+4,Yl(ro),xD+5,Yl(ro))+vd(xD,Yu(ro),Yl(ro))+txt(xD-7,cy,lD,1));
 var ttl=function(x,t,an){return '<text x="'+P(x)+'" y="'+(VH-6)+'" fill="'+ln+'" font-size="11" font-weight="700" letter-spacing="1.5" text-anchor="'+(an||'middle')+'" font-family="inherit" opacity=".6">'+t+'</text>'};
 var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 '+VH+'" width="100%" style="display:block;font-family:inherit"><defs>'+
  '<pattern id="'+id+'h1" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+hat+'" stroke-width="1.1"/></pattern>'+
  '<pattern id="'+id+'h2" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+hat+'" stroke-width="1.1"/></pattern>'+
  '<marker id="'+id+'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,1.5 L10,5 L0,8.5z" fill="'+dim+'"/></marker></defs>'+
  g0+g1+ds+ttl(fx,'ÖN GÖRÜNÜŞ')+ttl(Math.min(456-50,Math.max(sx+w/2,(sx+w+26+sx+w+54)/2)),'KESİT A-A')+'</svg>';
 var keys=[];['d','D','B','E','F'].forEach(function(k){if(o[k])keys.push({k:k,l:o[k].l,v:o[k].v})});
 return {svg:svg,keys:keys};
}
Y.konik={match:match,draw:draw};
})();
