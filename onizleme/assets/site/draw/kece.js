/* Yağ keçesi (simering) teknik çizimi: ön görünüş + kesit A-A. Ölçüler yalnız ürün sayfasından. */
(function(){
var W=window;W.YDRAW=W.YDRAW||{};
var C='#16203a',HAT='#9aa6bd';
function low(s){return String(s==null?'':s).replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase().replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'')}
function num(ctx,v){if(ctx&&typeof ctx.num=='function')return ctx.num(v);var m=String(v==null?'':v).match(/-?\d+(?:[.,]\d+)?/);return m?parseFloat(m[0].replace(',','.')):NaN}
function isMM(v){var s=low(v);return !/inc|inch|"|''|cm\b/.test(s)}
var LAB={d:/^(ic cap|ic capi|mil capi|ic cap \(d\)|d)$/,D:/^(dis cap|dis capi|yuva capi|dis cap \(d\)|d)$/,B:/^(kalinlik|genislik|yukseklik|kalinlik \(b\)|genislik \(b\)|b|h)$/};
function keyOf(l){var raw=String(l||'').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'').replace(/:$/,'');if(raw==='d')return 'd';if(raw==='D')return 'D';if(raw==='B'||raw==='b'||raw==='H')return 'B';var n=low(raw);if(n==='d'||n==='b'||n==='h')return null;
 if(LAB.d.test(n))return 'd';if(LAB.D.test(n))return 'D';if(LAB.B.test(n))return 'B';return null}
function grab(ctx,list){var o={},bad=false;for(var i=0;i<(list||[]).length;i++){var it=list[i],k=keyOf(it&&it.l);if(!k)continue;if(!isMM(it.v)){bad=true;continue}var n=num(ctx,it.v);if(!(n>0))continue;if(o[k]!=null&&Math.abs(o[k]-n)>1e-6)bad=true;o[k]=n}return bad?null:o}
function field(ctx,re){var L=[].concat(ctx.specs||[],ctx.onyazi||[]);for(var i=0;i<L.length;i++){if(re.test(low(L[i].l)))return String(L[i].v||'')}return ''}
var TIPS={TC:{c:'Çift dudaklı, yaylı',od:'r',lips:2,spr:1,t:'Çift dudaklı, yaylı, kauçuk dış yüzey'},SC:{c:'Tek dudaklı, yaylı',od:'r',lips:1,spr:1,t:'Tek dudaklı, yaylı, kauçuk dış yüzey'},
 TB:{c:'Çift dudaklı, metal dış',od:'m',lips:2,spr:1,t:'Çift dudaklı, yaylı, metal dış yüzey'},SB:{c:'Tek dudaklı, metal dış',od:'m',lips:1,spr:1,t:'Tek dudaklı, yaylı, metal dış yüzey'},
 VC:{c:'Tek dudaklı, yaysız',od:'r',lips:1,spr:0,t:'Tek dudaklı, yaysız, kauçuk dış yüzey'},VB:{c:'Yaysız, metal dış',od:'m',lips:1,spr:0,t:'Tek dudaklı, yaysız, metal dış yüzey'},
 TCV:{c:'Basınca dayanıklı',od:'r',lips:2,spr:1,hp:1,t:'Yüksek basınç, çift dudaklı, yaylı'}};
function tipOf(ctx){var a=field(ctx,/^(tip|tipi|profil|profil tipi|keçe tipi|kece tipi)$/),m=a.toUpperCase().match(/^\s*([A-Z]{2,4})\b/),t1=m&&TIPS[m[1]]?m[1]:null;
 var tm=String(ctx.title||'').toUpperCase().match(/[-(\s](TCV|TC|SC|TB|SB|VC|VB)(?=[-)\s]|$)/),t2=tm?tm[1]:null;
 if(m&&!t1)return null; if(t1&&t2&&t1!==t2)return null; return t1||t2||null}
function dims(ctx){var a=grab(ctx,ctx.specs),b=grab(ctx,ctx.onyazi);if(!a||!b)return null;var o={},k,ks=['d','D','B'],dt=ctx.data||null;
 for(var i=0;i<3;i++){k=ks[i];var v=a[k]!=null?a[k]:b[k];if(a[k]!=null&&b[k]!=null&&Math.abs(a[k]-b[k])>1e-6)return null;
  if(dt&&dt[k]>0){if(v!=null&&Math.abs(v-dt[k])>1e-6)return null;if(v==null)v=dt[k]}if(!(v>0))return null;o[k]=v}
 if(!(o.D>o.d)||o.B>=o.D)return null;
 var tm=(String(ctx.title||'')+' '+String(ctx.path||'')).match(/(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/i);
 if(tm){var t=[tm[1],tm[2],tm[3]].map(function(s){return parseFloat(s.replace(',','.'))});if(Math.abs(t[0]-o.d)>1e-6||Math.abs(t[1]-o.D)>1e-6||Math.abs(t[2]-o.B)>1e-6)return null}
 return o}
function f(v){return String(Math.round(v*100)/100).replace('.',',')}
function P(x,y){return (Math.round(x*10)/10)+','+(Math.round(y*10)/10)}
function match(ctx){ctx=ctx||{};var cr=low((ctx.crumbs||[]).join(' | ')),ti=low(ctx.title),pa=low(ctx.path);
 if(/rulman|segman|manson|burc|zincir|disli|kasnak|yatak/.test(ti)&&!/yag kece|simering/.test(ti))return false;
 if(/yag kece|simering|oil seal|radyal mil kece/.test(cr))return true;
 return /yag kece|simering|oil seal/.test(ti)||/(^|\/)(nbr|viton|fkm)-yag-kecesi-/.test(pa)}
function draw(ctx,opt){ctx=ctx||{};opt=opt||{};if(!match(ctx))return null;var o=dims(ctx);if(!o)return null;
 var tip=tipOf(ctx),T=tip?TIPS[tip]:null,dim=opt.dim||'#0a2350',id=String(opt.id||'kc')+'k',d=o.d,D=o.D,B=o.B,h=(D-d)/2;
 var mat=field(ctx,/^malzeme/),mt=/viton|fkm/i.test(mat)?'FKM (Viton)':/nbr|nitril/i.test(mat)?'NBR':'';
 var g='',cy=128;
 function txt(x,y,s,rot,cls){return '<text x="'+x+'" y="'+y+'" fill="'+dim+'" font-size="12" font-weight="700" text-anchor="middle" font-family="inherit" stroke="#fff" stroke-width="3" stroke-linejoin="round" paint-order="stroke"'+(rot?' transform="rotate(-90 '+x+' '+y+')"':'')+'>'+s+'</text>'}
 function dl(x1,y1,x2,y2){return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+dim+'" stroke-width="1.1" marker-start="url(#'+id+'a)" marker-end="url(#'+id+'a)"/>'}
 function ex(x1,y1,x2,y2){return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+dim+'" stroke-width=".6" opacity=".6"/>'}
 function cl(x1,y1,x2,y2){return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+C+'" stroke-width=".7" stroke-dasharray="12 3 2 3" opacity=".65"/>'}
 function hd(k,s){return '<g class="hl" data-k="'+k+'">'+s+'</g>'}
 function cap(x,y,s){return '<text x="'+x+'" y="'+y+'" fill="'+dim+'" font-size="10" font-weight="700" letter-spacing="1.4" text-anchor="middle" font-family="inherit" opacity=".75">'+s+'</text>'}
 /* profil: u 0 hava tarafı -> 1 yağ tarafı, v 0 mil -> 1 dış çap */
 var sp=Math.min(66/h,92/B);if(B*sp<24)sp=Math.min(24/B,76/h);var Ah=80,brk=false;
 if((d/2+h)*sp>Ah){var s2=Ah/(D/2);if(s2>=0.72*sp&&B*s2>=22&&h*s2>=24)sp=s2;else{brk=true;if(h*sp>Ah-22)sp=(Ah-22)/h}}
 var wp=B*sp,hp=h*sp,yO=brk?cy-Ah:cy-D/2*sp,yI=yO+hp;
 var sx=Math.round(248+(204-(wp+66))/2+6);
 var m=Math.max(1.6,Math.min(3.2,Math.min(wp,hp)*0.075)),mu=m/wp,mv=m/hp,rs=Math.max(2,Math.min(5.5,Math.min(wp,hp)*0.085));
 var prof=[],rub=null,met=null,spr=null,env=false;
 if(!T){env=true}else{
  var hp1=T.hp?1:0,lipTop=hp1?[[0.32,0.50],[0.52,0.42],[0.92,0.33],[0.94,0.24]]:[[0.32,0.52],[0.50,0.46],[0.94,0.36],[0.95,0.27]];
  var main=hp1?[[0.74,0],[0.56,0.17],[0.44,0.20]]:[[0.68,0],[0.48,0.15],[0.42,0.20]];
  var dust=T.lips>1?[[0.36,0.21],[0.08,0.015],[0.05,0.05],[0.18,0.19],[0.06,0.31],[0,0.34]]:[[0.30,0.25],[0.06,0.28],[0,0.31]];
  if(T.od=='r'){rub=[[0,0.95],[0.03,1],[0.88,1],[1,0.90],[1,0.70],[0.96,0.66],[0.37,0.66],[0.32,0.61]].concat(lipTop,main,dust);
   met=[[0.07,0.90],[0.86,0.90],[0.86,0.90-mv],[0.07+mu,0.90-mv],[0.07+mu,0.42],[0.07,0.42]]}
  else{met=[[0,1],[1,1],[1,1-mv],[mu,1-mv],[mu,0.38],[0,0.38]];
   rub=[[mu,1-mv],[0.22,1-mv],[0.32,0.78]].concat(lipTop,main,dust,[[0,0.38],[mu,0.38]])}
  if(T.spr){var a=lipTop[1],b=lipTop[2],uc=0.71,vl=a[1]+(b[1]-a[1])*(uc-a[0])/(b[0]-a[0]);spr=[uc,vl];
   var gr=[];for(var q=0;q<=6;q++){var an=Math.PI+q*Math.PI/6;gr.push([uc,vl,Math.cos(an)*(rs+0.6),Math.sin(an)*(rs+0.6)])}
   var gi=rub.indexOf(lipTop[1])+1;rub=rub.slice(0,gi).concat(gr,rub.slice(gi))}}

 function side(top){var yo=top?yO:2*cy-yO,yi=top?yI:2*cy-yI;function X(u){return sx+u*wp}function Y(v){return yi+(yo-yi)*v}
  function poly(L,fill,st){var s='';for(var i=0;i<L.length;i++){var q=L[i];s+=(i?' ':'')+P(X(q[0])+(q[2]||0),Y(q[1])+(q[3]||0)*(top?-1:1))}return '<polygon points="'+s+'" fill="'+fill+'" stroke="'+C+'" stroke-width="'+(st||1.3)+'" stroke-linejoin="round"/>'}
  var s='';if(env){s+='<rect x="'+sx+'" y="'+(Math.round(Math.min(yo,yi)*10)/10)+'" width="'+wp+'" height="'+hp+'" fill="none" stroke="'+C+'" stroke-width="1.2" stroke-dasharray="6 3"/>';return s}
  s+=poly(rub,'url(#'+id+'h)');s+=poly(met,C,0.8);
  if(spr){var px=Math.round(X(spr[0])*10)/10,py=Math.round(Y(spr[1])*10)/10;s+='<circle cx="'+px+'" cy="'+py+'" r="'+rs+'" fill="#fff" stroke="'+C+'" stroke-width="1.2"/><circle cx="'+px+'" cy="'+py+'" r="'+(rs*0.45)+'" fill="none" stroke="'+C+'" stroke-width=".8"/>'}
  return s}
 /* KESİT A-A */
 g+=side(true)+side(false);
 var xr=sx+wp,xd=xr+22,xD=xr+52,yoB=2*cy-yO,yiB=2*cy-yI,ucont=env?1:(T.hp?0.70:0.66);
 g+=cl(sx-12,cy,xr+12,cy);
 g+=ex(sx,yO-2,sx,yO-18)+ex(xr,yO-2,xr,yO-18);
 g+=hd('B',dl(sx,yO-12,xr,yO-12)+txt(sx+wp/2,yO-17,f(B)));
 var bm=function(x){return brk?'<path d="M'+(x-5)+','+(cy+1)+' l10,-6 M'+(x-5)+','+(cy+5)+' l10,-6" stroke="'+dim+'" stroke-width="1.1" fill="none"/>':''};
 g+=ex(sx+ucont*wp+2,yI,xd+6,yI)+ex(sx+ucont*wp+2,yiB,xd+6,yiB)+ex(xr+2,yO,xD+6,yO)+ex(xr+2,yoB,xD+6,yoB);
 g+=hd('d',dl(xd,yI,xd,yiB)+bm(xd)+txt(xd+(brk?15:13),cy,'ø'+f(d),1));
 g+=hd('D',dl(xD,yO,xD,yoB)+bm(xD)+txt(xD+(brk?15:13),cy,'ø'+f(D),1));
 var scx=sx+wp/2+30;g+=cap(scx,16,'KESİT A-A');
 var capt=T?(tip+' · '+T.c+(mt?' · '+mt:'')):'Profil tipi belirtilmemiş · ölçü zarfı';
 g+='<text x="'+scx+'" y="243" fill="#64748b" font-size="10.5" font-weight="600" text-anchor="middle" font-family="inherit">'+capt+'</text>';
 /* ÖN GÖRÜNÜŞ */
 var fx=112,Rf=80,sf=Rf/(D/2),rf=d/2*sf,ring=Rf-rf;
 function circ(r,dash,w){return '<circle cx="'+fx+'" cy="'+cy+'" r="'+(Math.round(r*10)/10)+'" fill="none" stroke="'+C+'" stroke-width="'+(w||1.4)+'"'+(dash?' stroke-dasharray="4 2.5" opacity=".7"':'')+'/>'}
 function rv(v){return (d/2+v*h)*sf}
 var fr='<circle cx="'+fx+'" cy="'+cy+'" r="'+Rf+'" fill="#f3f5f9" stroke="none"/><circle cx="'+fx+'" cy="'+cy+'" r="'+rf+'" fill="#fff"/>';
 fr+=circ(Rf,0,1.6)+circ(rf,0,1.4);
 if(T){if(T.od=='m'){fr+=circ(rv(0.38),0,1.1);if(ring>=12)fr+=circ(rv(1-mv),1,.8)}else{fr+=circ(Rf-1.6,0,.6);fr+=circ(rv(T.lips>1?0.32:0.30),0,1.1);if(ring>=14){fr+=circ(rv(0.90),1,.8);fr+=circ(rv(0.42),1,.8)}}
  if(T.spr&&ring>=14)fr+=circ(rv(spr[1]),1,.8)}
 g+=fr+cl(fx-Rf-10,cy,fx+Rf+10,cy)+cl(fx,cy-Rf-10,fx,cy+Rf+10);
 g+=ex(fx-Rf,cy+4,fx-Rf,cy+Rf+19)+ex(fx+Rf,cy+4,fx+Rf,cy+Rf+19);
 g+=hd('D',dl(fx-Rf,cy+Rf+14,fx+Rf,cy+Rf+14)+txt(fx,cy+Rf+30,'ø'+f(D)));
 if(rf>=30){var an=-35*Math.PI/180,ca=Math.cos(an),sa=Math.sin(an),tx=fx+ca*rf*0.52,ty=cy+sa*rf*0.52;
  g+=hd('d',dl(fx-ca*rf,cy-sa*rf,fx+ca*rf,cy+sa*rf)+'<text x="'+(Math.round(tx*10)/10)+'" y="'+(Math.round((ty-5)*10)/10)+'" fill="'+dim+'" font-size="12" font-weight="700" text-anchor="middle" font-family="inherit" stroke="#fff" stroke-width="3" stroke-linejoin="round" paint-order="stroke" transform="rotate(-35 '+(Math.round(tx*10)/10)+' '+(Math.round(ty*10)/10)+')">ø'+f(d)+'</text>')}
 g+=cap(fx,16,'ÖN GÖRÜNÜŞ');
 var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 250" width="100%" style="display:block;font-family:inherit"><defs><pattern id="'+id+'h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+HAT+'" stroke-width="1.1"/></pattern><marker id="'+id+'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0,1.5 L10,5 L0,8.5z" fill="'+dim+'"/></marker></defs>'+g+'</svg>';
 return {svg:svg,keys:[{k:'d',l:'İç Çap (d)',v:f(d)+' mm'},{k:'D',l:'Dış Çap (D)',v:f(D)+' mm'},{k:'B',l:'Kalınlık (B)',v:f(B)+' mm'}]}}
W.YDRAW['kece']={match:match,draw:draw};
})();
