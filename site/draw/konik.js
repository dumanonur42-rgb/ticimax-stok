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
function tw(s){var w=0;for(var i=0;i<s.length;i++)w+=/[0-9]/.test(s[i])?7:(s[i]==','?3.5:8.2);return w}
function P(v){return Math.round(v*10)/10}
// seri -> şekil: g = makara ekseni açısı (°), w = makara çapı / kesit yüksekliği
var SH={'302':{g:9,w:.46,m:.56},'303':{g:10,w:.47,m:.56},'313':{g:21,w:.4,m:.58},'320':{g:8.5,w:.45,m:.56},'322':{g:9,w:.46,m:.56},'323':{g:10,w:.47,m:.56},'329':{g:8,w:.44,m:.56},'330':{g:7.5,w:.45,m:.56},'331':{g:8,w:.46,m:.56},'332':{g:8.5,w:.47,m:.56},'inch':{g:9,w:.46,m:.56}};
function draw(c,opt){
 opt=opt||{};var o=grab(c);if(!o.d||!o.D||!o.B||!o.F)return null;
 var d=o.d.n,D=o.D.n,B=o.B.n,T=o.F.n,hasE=!!o.E,C=hasE?o.E.n:T*.8;
 if(!(D>d&&T>=B&&C<=T&&C>0&&B>0&&T<D))return null;
 var se=series(c),sh=SH[se]||SH['302'],dim=opt.dim||'#0a2350',ln='#16203a',hat='#9aa6bd',id=opt.id||('kn'+Math.random().toString(36).slice(2,7));
 var ri=d/2,ro=D/2,H=ro-ri;
 var s=Math.min(152/D,96/T),R=ro*s,w=T*s,cy=R+50,VH=Math.round(2*R+104);
 var fx=24+R;if(fx<96)fx=96;
 var sx=Math.round(212+(242-(w+66))/2);
 // --- geometri (mm, eksenel x: iç bilezik arka yüzü=0, kap arka yüzü=T)
 var ch=Math.max(H*.045,.6/s*1.2),rib=B*.15,sr=B*.085;
 var x1=rib,x2=Math.min(B-sr-B*.03,T-T*.05),L=x2-x1,g=sh.g*Math.PI/180;
 var Dw1=H*sh.w,Dw2=Dw1*.84,rm1=ri+H*sh.m,drop=L*Math.tan(g);if(drop>H*.27){drop=H*.27}
 var rm2=rm1-drop,ux=L,ur=rm2-rm1,ul=Math.sqrt(ux*ux+ur*ur);ux/=ul;ur/=ul;var nx=-ur,nr=ux;
 function pt(x,r,k,dw){return [x+k*nx*dw/2,r+k*nr*dw/2]}
 var OL=pt(x1,rm1,1,Dw1),OS=pt(x2,rm2,1,Dw2),IS=pt(x2,rm2,-1,Dw2),IL=pt(x1,rm1,-1,Dw1);
 function lin(A,Z){var k=(Z[1]-A[1])/(Z[0]-A[0]);return function(x){return A[1]+(x-A[0])*k}}
 var rc=lin(OL,OS),rn=lin(IL,IS);
 var cF=T-C,rcF=Math.min(rc(cF),ro-H*.09),rcB=rc(T);
 if(rcB<ri+H*.25)return null;
 var lTop=rm1+H*.03,sTop=rn(B)+Dw2*.2;
 // büyük çıkıntı yüzü makara alın yüzüne paralel
 var tR=(lTop-IL[1])/nr,ribX=IL[0]+nx*tR;
 // --- çizim yardımcıları
 function Yu(r){return cy-r*s}function Yl(r){return cy+r*s}function X(x){return sx+x*s}
 function poly(pts,half){var y=half<0?Yu:Yl;return 'M'+pts.map(function(p){return P(X(p[0]))+','+P(y(p[1]))}).join('L')+'Z'}
 var cup=[[cF,rcF],[cF,ro-ch],[cF+ch,ro],[T-ch,ro],[T,ro-ch],[T,rcB+ch*.6],[T-ch*.6,rcB]];
 var cone=[[0,lTop-ch],[0,ri+ch],[ch,ri],[B-ch,ri],[B,ri+ch],[B,sTop-ch*.6],[B-ch*.6,sTop],[B-sr,sTop],[B-sr,rn(B-sr)],[IL[0],IL[1]],[ribX,lTop],[ch,lTop]];
 var rol=[OL,OS,IS,IL];
 var cz=function(k){return [rm1+k*.1*Dw1]};
 var cg=[pt(x1-L*.06,rm1+(-ur)*0,1,Dw1*.16),pt(x2+L*.09,rm2,1,Dw2*.16)];
 var cg2=[cg[1][0]+(-nx)*Dw2*.34,cg[1][1]-nr*Dw2*.34];var cg0=[cg[0][0]+nx*Dw1*.22,cg[0][1]+nr*Dw1*.22];
 var g1='',hs='stroke="'+ln+'" stroke-width="1.4" stroke-linejoin="round"';
 [-1,1].forEach(function(h){var y=h<0?Yu:Yl;
  g1+='<path d="'+poly(cup,h)+'" fill="url(#'+id+'h2)" '+hs+'/>';
  g1+='<path d="'+poly(cone,h)+'" fill="url(#'+id+'h1)" '+hs+'/>';
  g1+='<polyline points="'+[cg0,cg[0],cg[1],cg2].map(function(p){return P(X(p[0]))+','+P(y(p[1]))}).join(' ')+'" fill="none" stroke="'+ln+'" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/>';
  g1+='<path d="'+poly(rol,h)+'" fill="#fff" '+hs+'/>';
  var a0=[x1-L*.12,rm1-ur/ux*(-L*.12)*0+(-L*.12)*(ur/ux)],a1=[x2+L*.12,rm2+L*.12*(ur/ux)];
  g1+='<line x1="'+P(X(a0[0]))+'" y1="'+P(y(a0[1]))+'" x2="'+P(X(a1[0]))+'" y2="'+P(y(a1[1]))+'" stroke="'+ln+'" stroke-width=".6" stroke-dasharray="7 2 1.5 2" opacity=".55"/>';
 });
 // yük hattı (kap yoluna dik, eksende buluşur)
 var mx=(x1+x2)/2,mr=(rm1+rm2)/2,vx=OS[0]-OL[0],vr=OS[1]-OL[1],vl=Math.sqrt(vx*vx+vr*vr),px=vr/vl,pr=-vx/vl;if(pr>0){px=-px;pr=-pr}
 var tA=(mr-(ri+H*.06))/(-pr);[-1,1].forEach(function(h){var y=h<0?Yu:Yl,t0=-(Dw1*.75)/(-pr);g1+='<line x1="'+P(X(mx+px*t0))+'" y1="'+P(y(mr+pr*t0))+'" x2="'+P(X(mx+px*tA))+'" y2="'+P(y(mr+pr*tA))+'" stroke="'+dim+'" stroke-width=".7" stroke-dasharray="6 2 1.5 2" opacity=".55"/>'});
 var ax=0;
 var axL=Math.min(X(ax),sx)-10;
 g1+='<line x1="'+P(axL)+'" y1="'+cy+'" x2="'+P(sx+w+12)+'" y2="'+cy+'" stroke="'+ln+'" stroke-width=".7" stroke-dasharray="12 3 2 3" opacity=".6"/>';
 // --- ön görünüş (iç bilezik arka yüzü tarafından)
 function ring(r1,r2,fill){return '<path d="M'+P(fx-r1)+','+cy+'a'+P(r1)+','+P(r1)+' 0 1,0 '+P(2*r1)+',0a'+P(r1)+','+P(r1)+' 0 1,0 '+P(-2*r1)+',0ZM'+P(fx-r2)+','+cy+'a'+P(r2)+','+P(r2)+' 0 1,0 '+P(2*r2)+',0a'+P(r2)+','+P(r2)+' 0 1,0 '+P(-2*r2)+',0Z" fill="'+fill+'" fill-rule="evenodd" stroke="'+ln+'" stroke-width="1.4"/>'}
 function circ(r,sw,op,da){return '<circle cx="'+fx+'" cy="'+cy+'" r="'+P(r)+'" fill="none" stroke="'+ln+'" stroke-width="'+sw+'"'+(op?' opacity="'+op+'"':'')+(da?' stroke-dasharray="'+da+'"':'')+'/>'}
 var g0=ring(ro*s,rcF*s,'#eef2f8')+circ((ro-ch)*s,.7,.6);
 var pc=rm1*s,rr=Dw1/2*s*.94,Z=Math.max(8,Math.floor(2*Math.PI*rm1/(Dw1*1.22)));
 for(var i=0;i<Z;i++){var a=2*Math.PI*i/Z-Math.PI/2;g0+='<circle cx="'+P(fx+pc*Math.cos(a))+'" cy="'+P(cy+pc*Math.sin(a))+'" r="'+P(rr)+'" fill="#fff" stroke="'+ln+'" stroke-width="1.1"/>'}
 g0+=ring(lTop*s,ri*s,'#eef2f8')+circ((ri+ch)*s,.7,.6)+circ((lTop-ch)*s,.7,.6);
 g0+=circ(pc,.6,.55,'8 2 1.5 2');
 g0+='<g stroke="'+ln+'" stroke-width=".7" stroke-dasharray="12 3 2 3" opacity=".6"><line x1="'+P(fx-R-10)+'" y1="'+cy+'" x2="'+P(fx+R+10)+'" y2="'+cy+'"/><line x1="'+fx+'" y1="'+P(cy-R-10)+'" x2="'+fx+'" y2="'+P(cy+R+8)+'"/></g>';
 // --- ölçüler
 function txt(x,y,t,rot){return '<text x="'+P(x)+'" y="'+P(y)+'" fill="'+dim+'" font-size="12" font-weight="700" text-anchor="middle" font-family="inherit" stroke="#fff" stroke-width="3" stroke-linejoin="round" paint-order="stroke"'+(rot?' transform="rotate(-90 '+P(x)+' '+P(y)+')"':'')+'>'+t+'</text>'}
 function ex(x1,y1,x2,y2){return '<line x1="'+P(x1)+'" y1="'+P(y1)+'" x2="'+P(x2)+'" y2="'+P(y2)+'" stroke="'+dim+'" stroke-width=".6" opacity=".6"/>'}
 function dl(x1,y1,x2,y2){var len=Math.abs(x2-x1)+Math.abs(y2-y1),M='marker-start="url(#'+id+'a)" marker-end="url(#'+id+'a)"';
  if(len>=22)return '<line x1="'+P(x1)+'" y1="'+P(y1)+'" x2="'+P(x2)+'" y2="'+P(y2)+'" stroke="'+dim+'" stroke-width="1.1" '+M+'/>';
  var hz=y1==y2,e=11;return '<line x1="'+P(x1)+'" y1="'+P(y1)+'" x2="'+P(x2)+'" y2="'+P(y2)+'" stroke="'+dim+'" stroke-width="1.1"/><line x1="'+P(hz?x1-e:x1)+'" y1="'+P(hz?y1:y1-e)+'" x2="'+P(x1)+'" y2="'+P(y1)+'" stroke="'+dim+'" stroke-width="1.1" marker-end="url(#'+id+'a)"/><line x1="'+P(hz?x2+e:x2)+'" y1="'+P(hz?y2:y2+e)+'" x2="'+P(x2)+'" y2="'+P(y2)+'" stroke="'+dim+'" stroke-width="1.1" marker-end="url(#'+id+'a)"/>'}
 function G(k,b){return '<g class="hl" data-k="'+k+'">'+b+'</g>'}
 function hdim(k,xa,xb,y,lab,up){var m=(xa+xb)/2,t=tw(lab),ty=up?y-5:y+15;var tx=(up===2||xb-xa>=t+8)?m:(xb+6+t/2+(xb-xa<22?10:0));return dl(xa,y,xb,y)+txt(tx,ty,lab)}
 var ds='',lD='Ø'+f(D),ld='Ø'+f(d);
 // ön görünüş: ØD altta, Ød delikte
 ds+=G('D',ex(fx-R,cy+4,fx-R,cy+R+19)+ex(fx+R,cy+4,fx+R,cy+R+19)+hdim('D',fx-R,fx+R,cy+R+14,lD));
 var yd=cy+ri*s*.42;ds+=G('d',dl(fx-ri*s,yd,fx+ri*s,yd)+txt(fx+Math.max(4,ri*s*.38)+tw(ld)/2-6,yd-5,ld));
 // kesit: F (toplam) ve E (kap) üstte
 var yE=cy-R-13,yF=cy-R-33,xL=X(0),xT=X(T),xC=X(cF);
 ds+=G('F',ex(xL,Yu(lTop)-3,xL,yF-5)+ex(xT,cy-R-3,xT,yF-5)+hdim('F',xL,xT,yF,f(T),2));
 if(hasE)ds+=G('E',ex(xC,cy-R-3,xC,yE-5)+hdim('E',xC,xT,yE,f(C),1));
 // B delikte (yer yoksa altta)
 var xB=X(B);
 if(ri*s>=26){var yb=Yl(ri)-10;ds+=G('B',hdim('B',xL,xB,yb,f(B),1))}
 else{var yb2=cy+R+14;ds+=G('B',ex(xL,Yl(lTop)+3,xL,yb2+5)+ex(xB,Yl(sTop)+3,xB,yb2+5)+hdim('B',xL,xB,yb2,f(B)))}
 // sağda Ød ve ØD
 var xd=sx+w+20,xD=sx+w+46;
 ds+=G('d',ex(xB+3,Yu(ri),xd+5,Yu(ri))+ex(xB+3,Yl(ri),xd+5,Yl(ri))+dl(xd,Yu(ri),xd,Yl(ri))+txt(xd+14,cy,ld,1));
 ds+=G('D',ex(xT+3,cy-R,xD+5,cy-R)+ex(xT+3,cy+R,xD+5,cy+R)+dl(xD,cy-R,xD,cy+R)+txt(xD+14,cy,lD,1));
 var ttl=function(x,t){return '<text x="'+P(x)+'" y="'+(VH-6)+'" fill="'+ln+'" font-size="10" font-weight="700" letter-spacing="1.5" text-anchor="middle" font-family="inherit" opacity=".6">'+t+'</text>'};
 var tS=ri*s>=26?ttl(sx+w/2+20,'KESİT A-A'):'';
 var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 '+VH+'" width="100%" style="display:block;font-family:inherit"><defs>'+
  '<pattern id="'+id+'h1" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+hat+'" stroke-width="1.1"/></pattern>'+
  '<pattern id="'+id+'h2" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+hat+'" stroke-width="1.1"/></pattern>'+
  '<marker id="'+id+'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,1.5 L10,5 L0,8.5z" fill="'+dim+'"/></marker></defs>'+
  g0+g1+ds+ttl(fx,'ÖN GÖRÜNÜŞ')+(tS||ttl(sx+w/2+20,'KESİT A-A'))+'</svg>';
 var keys=[];['d','D','B','E','F'].forEach(function(k){if(o[k])keys.push({k:k,l:o[k].l,v:o[k].v})});
 return {svg:svg,keys:keys};
}
Y.konik={match:match,draw:draw};
})();
