/* Bilyalı rulman ailesi: sabit bilyalı (açık/Z/ZZ/RS/2RS, N/NR), minyatür, flanşlı, çift sıralı,
   oynak (kendinden ayarlı) bilyalı, açısal temaslı (tek/çift sıra). Ölçüler sadece ürün verisinden. */
(function(){
var Y=(window.YDRAW=window.YDRAW||{});
function nz(s){return String(s==null?'':s).replace(/[İIı]/g,'i').toLowerCase().replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').replace(/â/g,'a').replace(/\s+/g,' ').trim()}
function NUM(v){var m=String(v).replace(/,/g,'.').match(/\d+(?:\.\d+)?/);return m?parseFloat(m[0]):NaN}
function f(n){return String(Math.round(n*100)/100).replace('.',',')}
function fx(n){return Math.round(n*10)/10}

var PDG=/^(6[0-4]\d\d|6[0-4]\d\d\d|16\d\d\d|6[0-9]\d|6[0-4]\/\d+(\.\d+)?|61[89]\d\d|6[789]\d\d|MR\d{2,4}|R\d{1,2}|TMB\d{3})$/,PFL=/^(F|MF|FR|F6\d|F6[0-9]\d|F6[789]\d\d)\d*$/,PSA=/^(1[0-4]\d\d|2[23]\d\d|1[0-3]\d|1[0-3]\d\d\d)K?$/,PAC=/^(7[0-3]\d\d)(B|BE|AC|C|A)?\w*$/,PA2=/^(3[23]\d\d)(A|B)?\w*$/,PDR=/^(4[23]\d\d)(A|B)?\w*$/;
function toks(ctx){var a=[];(ctx.specs||[]).concat(ctx.onyazi||[]).forEach(function(s){if(/^(rulman kodu|model|kod)/.test(nz(s.l)))a.push(s.v)});a.push(ctx.title||'');
 var t=[];a.forEach(function(x){String(x).toUpperCase().replace(/[İ]/g,'I').split(/[^A-Z0-9\/.]+/).forEach(function(y){y=y.replace(/^[.\/]+|[.\/]+$/g,'');if(y)t.push(y)})});return t}
function first(tk,re){for(var i=0;i<tk.length;i++)if(re.test(tk[i]))return tk[i];return null}
function sub(ctx){
 var cr=nz((ctx.crumbs||[]).join(' > ')),ti=nz(ctx.title),all=cr+' | '+ti,tk=toks(ctx);
 if(!/rulman/.test(all))return null;
 if(/eksenel|konik|igneli|makarali|yatak|lineer|tek yonlu|kombine|mafsal|rotil|manson|kece|segman|burc|zincir|disli|gres|kovan|\bpul\b|somun|cektirme|silindirik|masura|kafes rulman/.test(all))return null;
 if(/bilyali/.test(cr)){
  if(/oynak/.test(cr))return 'oynak';
  if(/acisal/.test(cr))return /cift/.test(cr)||first(tk,PA2)?'acisal2':'acisal';
  if(/cift sira/.test(cr))return 'cift';
  if(/flansli/.test(cr))return 'flans';
  if(/sabit/.test(cr))return first(tk,PFL)&&/flansli/.test(ti)?'flans':(/minyatur/.test(all)?'miny':'sabit');
  return null;
 }
 if(/minyatur rulman/.test(cr)){if(/flansli/.test(all)||first(tk,/^(F|MF)\d+/))return 'flans';return first(tk,PDG)?'miny':null}
 if(/flansli/.test(cr)&&first(tk,/^(F|MF)\d+/))return 'flans';
 if(/oynak bilyali/.test(ti)&&first(tk,PSA))return 'oynak';
 if(/acisal temasli/.test(ti))return first(tk,PA2)?'acisal2':first(tk,PAC)?'acisal':null;
 // motosiklet / scooter / teker / krank / şanzıman: kayıtlı rulman kodu sabit bilyalı olmalı
 if(/motosiklet|scooter|bisiklet|teker|krank|sanziman/.test(all)){var k=first(tk,PDG);if(k&&!first(tk,/^((HK|NK|NA|BK|LM|HM|NUP|NJ|NU|NKI|NKIA|RNA)\d\w*|K\d+\w*|3[0-3]\d\d\d\w*)$/))return 'sabit'}
 return null;
}
var CL={d:'İç Çap (d)',D:'Dış Çap (D)',B:'Genişlik (B)',Df:'Flanş Çapı',C:'Flanş Kalınlığı'};
function dims(ctx){
 var src=(ctx.specs||[]).concat(ctx.onyazi||[]),o={},bad=false;
 function put(k,v){if(!(v>0))return;if(o[k]!=null&&Math.abs(o[k]-v)>1e-6)bad=true;else o[k]=v}
 src.forEach(function(s){var l=nz(s.l),v=String(s.v);
  if(/^ic cap/.test(l))put('d',NUM(v));
  else if(/^dis cap/.test(l))put('D',NUM(v));
  else if(/^genislik/.test(l)||/^kalinlik \(b\)/.test(l))put('B',NUM(v));
  else if(/^flans/.test(l)&&/cap/.test(l))put('Df',NUM(v));
  else if(/^flans/.test(l)&&/(kalinl|genisl)/.test(l))put('C',NUM(v));
  else if(/^olcu/.test(l)){var m=v.replace(/,/g,'.').match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
   if(m&&(/ic.*dis.*(en|genislik)|dxdxb|^olcu$/.test(l.replace(/\s/g,'')))){var a=+m[1],b=+m[2],c=+m[3];if(a<b&&c<b){put('d',a);put('D',b);put('B',c)}}}
 });
 var dt=ctx.data||null;if(dt)for(var k in CL)if(dt[k]>0)put(k,+dt[k]);
 if(bad)return null;return o;
}
function cover(ctx){
 // kapak/keçe bilgisi sadece rulman kodunun kendisinden ve ürün özelliklerinden okunur (başlıktaki model adları karışmasın)
 var kod='';(ctx.specs||[]).concat(ctx.onyazi||[]).forEach(function(s){if(!kod&&/^rulman kodu/.test(nz(s.l)))kod=s.v});
 var ti=String(ctx.title||'').toUpperCase().replace(/İ/g,'I'),m=null;
 if(!kod){var tk=toks(ctx),k0=first(tk,PDG)||first(tk,PFL)||first(tk,PSA)||first(tk,PAC)||first(tk,PA2)||first(tk,PDR);
  if(k0){var i=ti.indexOf(k0);kod=i>=0?ti.slice(i).replace(/\b(ORS|SKF|FAG|NSK|NTN|KOYO|NMB|YMN|TIMKEN|INA|ZKL|FBJ|URB|SNR|NACHI|ASAHI|RUL|EKONOMIK|MODEL|RULMAN\w*|MINYATUR|FLANSLI|SABIT|BILYALI|OYNAK|ACISAL|TEMASLI|CIFT|SIRALI|MOTOR|TEKER|ON|ARKA)\b.*$/,''):k0}}
 var t=' '+String(kod).toUpperCase().replace(/[-_()\/]/g,' ').replace(/\s+/g,' ')+' ';
 var sp=(ctx.specs||[]).map(function(s){return String(s.l).toUpperCase().trim()}).join(' | ')+' | '+(ctx.specs||[]).filter(function(s){return /^kapak/.test(nz(s.l))}).map(function(s){return nz(s.v)}).join(' ');
 var two=/ (\d+ ?)?(2RS\w*|RS2|2RU|LLU|LLB|DDU|2RZ|2LS|DD|LL)\b/.test(t)||/(^| )2RS( |$)/.test(sp)||/kaucuk.*(cift|iki)|(cift|iki).*kaucuk/.test(sp);
 var zz=/ (\d+ ?)?(ZZ\w*|2Z\w*)\b/.test(t)||/(^| )(ZZ|2Z)( |$)/.test(sp)||/metal.*(cift|iki)|(cift|iki).*metal/.test(sp);
 var rs=!two&&(/ (\d+ ?)?(RS\w*|RZ|LU|DU)\b/.test(t)||/(^| )RS( |$)/.test(sp));
 var z=!zz&&(/ (\d+ ?)?Z(NR)?\b/.test(t)||/(^| )Z( |$)/.test(sp));
 var nr=/ (\d+ ?)?(Z|ZZ|2RS|2Z)?NR\b/.test(t)||/(^| )NR( |$)/.test(sp),n=!nr&&(/ (\d+ ?)?N\b/.test(t)||/(^| )N( |$)/.test(sp));
 var c=two?'2rs':zz?'zz':rs?'rs':z?'z':'acik';return {c:c,nr:nr,n:n,k:/ \d+ ?K\b| K /.test(t)||/(^| )K( |$)/.test(sp)}}
var NEED={sabit:['d','D','B'],miny:['d','D','B'],flans:['d','D','B','Df','C'],cift:['d','D','B'],oynak:['d','D','B'],acisal:['d','D','B'],acisal2:['d','D','B']};
var TIT={sabit:'Sabit bilyalı',miny:'Minyatür bilyalı',flans:'Flanşlı bilyalı',cift:'Çift sıralı sabit bilyalı',oynak:'Oynak bilyalı',acisal:'Açısal temaslı bilyalı',acisal2:'Çift sıralı açısal temaslı'};
var CVT={acik:'Açık',zz:'ZZ metal kapak',z:'Z tek metal kapak','2rs':'2RS kauçuk keçe',rs:'RS tek keçe'};

function render(t,v,cv,opt){
 var id=(opt&&opt.id)||('yb'+Math.random().toString(36).slice(2,7)),dim=(opt&&opt.dim)||'#0a2350',L='#16203a',HT='#9aa6bd',W=460,H=250,cy=114;
 var fl=t=='flans',Dm=fl?v.Df:v.D;
 var s=Math.min(150/Dm,(fl?118:132)/v.B,24);
 var R=v.D/2*s,r=v.d/2*s,w=v.B*s,Rf=fl?v.Df/2*s:R,C=fl?v.C*s:0,g=R-r,pr=(R+r)/2;
 // yerleşim: ön görünüş + kesit ortalanır
 var lw=2*Rf+24,leftS=fl?44:16,rw=leftS+w+70,gap=Math.max(26,40-Math.max(0,lw+rw+40-W)/2),tot=lw+gap+rw,ox=Math.max(6,(W-tot)/2);
 var FX=ox+lw/2,X0=ox+lw+gap+leftS,X1=X0+w,XC=X0+w/2;
 var out=[];function P(a){out.push(a)}
 function pt(x,rad,k){return fx(x)+','+fx(cy+k*rad)}
 function poly(pts,k,fill,extra){return '<path d="M'+pts.map(function(p){return pt(p[0],p[1],k)}).join(' L')+' Z" fill="'+fill+'" stroke="'+L+'" stroke-width="1.4" stroke-linejoin="round"'+(extra||'')+'/>'}
 function arcPts(cx,cr,rg,a0,a1,sgn,n){var a=[];n=n||14;for(var i=0;i<=n;i++){var th=a0+(a1-a0)*i/n;a.push([cx+rg*Math.sin(th),cr+sgn*rg*Math.cos(th)])}return a}
 function th(land,cr,rg,sgn){var q=(land-cr)*sgn/rg;q=Math.max(-1,Math.min(1,q));return Math.acos(q)}
 function T(x,y,txt,o){o=o||{};return '<text x="'+fx(x)+'" y="'+fx(y)+'" fill="'+(o.c||dim)+'" font-size="'+(o.fs||12)+'" font-weight="'+(o.fw||700)+'" text-anchor="'+(o.a||'middle')+'"'+(o.rot?' transform="rotate(-90 '+fx(x)+' '+fx(y)+')"':'')+(o.ls?' letter-spacing="'+o.ls+'"':'')+' stroke="#fff" stroke-width="3" stroke-linejoin="round" paint-order="stroke" font-family="inherit">'+txt+'</text>'}
 function ln(x1,y1,x2,y2,o){o=o||{};return '<line x1="'+fx(x1)+'" y1="'+fx(y1)+'" x2="'+fx(x2)+'" y2="'+fx(y2)+'" stroke="'+(o.c||dim)+'" stroke-width="'+(o.w||1)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op?' opacity="'+o.op+'"':'')+(o.m?' marker-start="url(#'+id+'a)" marker-end="url(#'+id+'a)"':'')+'/>'}
 function ext(x1,y1,x2,y2){return ln(x1,y1,x2,y2,{w:.6,op:.6})}
 function axis(x1,y1,x2,y2){return ln(x1,y1,x2,y2,{c:L,w:.7,da:'12 3 2 3',op:.65})}
 function dimH(k,x1,x2,y,lab,ly){return '<g class="hl" data-k="'+k+'">'+ln(x1,y,x2,y,{m:1,w:1.1})+T((x1+x2)/2,ly==null?y-5:ly,lab)+'</g>'}
 function dimV(k,x,y1,y2,lab,e){return '<g class="hl" data-k="'+k+'">'+(e||'')+ln(x,y1,x,y2,{m:1,w:1.1})+T(x+(lab.length>5?-5:-5),(y1+y2)/2,lab,{rot:1})+'</g>'}
 var cv0=cv.c,sideL=cv0=='zz'||cv0=='2rs'||cv0=='z'||cv0=='rs',sideR=cv0=='zz'||cv0=='2rs';
 var seal=cv0=='2rs'||cv0=='rs';
 // ---------- KESİT A-A
 var S=[];
 var balls=[],oyn=t=='oynak',two=t=='cift'||t=='oynak'||t=='acisal2';
 var br,a,alpha=0;
 if(oyn){br=Math.min(w*.2,g*.27);a=w*.23}else if(two){br=Math.min(w*.21,g*.3);a=w*.25}else{br=Math.min(w*.34,g*.32)}
 var cr=pr; if(fl)cr=pr;
 var Rs=0;
 if(oyn){Rs=Math.sqrt(pr*pr+a*a)+br;balls=[[XC-a,pr],[XC+a,pr]]}
 else if(two)balls=[[XC-a,pr],[XC+a,pr]];else balls=[[XC,pr]];
 var rg=br*1.04,eL=.62;
 var gs=Math.max(1.5,two?XC-a-br-X0:w/2-br),nd=Math.min(br*.3,(R-(pr+br*eL))*.35),e=Math.min(w*.05,gs*.16),tp=Math.max(.9,Math.min(2.2,(gs*.86-e)/2.2)),ts=(gs*.88-e)/1.55;
 var ch=Math.max(.8,Math.min(2.4,g*.05,w*.06));
 if(t=='acisal'){alpha=40*Math.PI/180}
 [-1,1].forEach(function(k){
  var oL=pr+br*eL,iL=pr-br*eL,o=[],q,i,b;
  // dış bilezik
  if(fl)o.push([X0,Rf-ch],[X0+ch,Rf],[X0+C-ch*.6,Rf],[X0+C,Rf-ch*.6],[X0+C,R],[X1-ch,R],[X1,R-ch]);
  else o.push([X0,R-ch],[X0+ch,R],[X1-ch,R],[X1,R-ch]);
  if(oyn){for(i=14;i>=0;i--){var xx=X0+w*i/14;o.push([xx,Math.sqrt(Rs*Rs-(xx-XC)*(xx-XC))])}}
  else{
   var nR=sideR?nd:0,nL=sideL?nd:0,sx1=X1-e-tp-.8,sx0=X0+e+tp+.8;
   if(nR){o.push([X1,oL+nR],[sx1,oL+nR],[sx1,oL])}else o.push([X1,t=='acisal'?pr+br*.18:oL]);
   for(b=balls.length-1;b>=0;b--){var bx=balls[b][0];
    var lr=(t=='acisal')?pr+br*.18:oL,ll=oL;
    var t1=th(lr,pr,rg,1),t0=th(ll,pr,rg,1);q=arcPts(bx,pr,rg,t1,-t0,1);
    o=o.concat(q);
   }
   if(nL){o.push([sx0,oL],[sx0,oL+nL],[X0,oL+nL])}else o.push([X0,oL]);
  }
  S.push(poly(o,k,'url(#'+id+'h1)'));
  if(cv.nr||cv.n){var gx=X0+Math.max(w*.1,e+tp+2),gw=Math.max(1.6,w*.07),gd=Math.max(1.4,Math.min(3,(R-oL)*.3));
   S.push(poly([[gx,R+.6],[gx,R-gd],[gx+gw,R-gd],[gx+gw,R+.6]],k,'#fff',' stroke-width="1"'));
   if(cv.nr)S.push(poly([[gx+.2,R-gd+.2],[gx+gw-.2,R-gd+.2],[gx+gw-.2,R+gd],[gx+.2,R+gd]],k,L,' stroke-width=".6"'));}
  // iç bilezik
  var ib=[],kc=cv.k?w/24:0;
  ib.push([X0,r+ch],[X0+ch,r]);ib.push([X1-ch,r+kc],[X1,r+kc+ch]);
  var iR=iL,iLf=(t=='acisal')?pr-br*.18:iL;
  if(oyn){ib.push([X1,iL]);for(b=balls.length-1;b>=0;b--){var bx2=balls[b][0];var t1b=th(iL,pr,rg,-1);ib=ib.concat(arcPts(bx2,pr,rg,t1b,-t1b,-1))}ib.push([X0,iL])}
  else{ib.push([X1,iR]);for(b=balls.length-1;b>=0;b--){var bx3=balls[b][0];var a1=th(iR,pr,rg,-1),a0=th(iLf,pr,rg,-1);ib=ib.concat(arcPts(bx3,pr,rg,a1,-a0,-1))}ib.push([X0,iLf])}
  S.push(poly(ib,k,'url(#'+id+'h2)'));
  // bilyeler
  balls.forEach(function(bb){S.push('<circle cx="'+fx(bb[0])+'" cy="'+fx(cy+k*bb[1])+'" r="'+fx(br)+'" fill="#fff" stroke="'+L+'" stroke-width="1.4"/>'+axis(bb[0]-br-3,cy+k*bb[1],bb[0]+br+3,cy+k*bb[1]).replace('opacity=".65"','opacity=".35"'))});
  // kapak / keçe
  [[sideL,X0,1],[sideR,X1,-1]].forEach(function(sd){if(!sd[0])return;var x=sd[1],dx=sd[2],y0=oL+nd,y1=iL+br*.08;
   if(!seal){S.push(poly([[x+dx*e,y0],[x+dx*(e+tp),y0],[x+dx*(e+tp),y1+tp],[x+dx*(e+tp*2.2),y1+tp],[x+dx*(e+tp*2.2),y1],[x+dx*e,y1]],k,L,' stroke-width=".6"'))}
   else{var yl=iL;S.push(poly([[x+dx*e*.6,y0],[x+dx*(e+ts),y0],[x+dx*(e+ts),yl+br*.42],[x+dx*(e+ts*1.55),yl],[x+dx*(e+ts*.95),yl],[x+dx*e,yl+br*.3]],k,'#3b4356',' stroke-width="1"'));
    S.push(ln(x+dx*(e+ts*.5),cy+k*(y0-nd*.2),x+dx*(e+ts*.5),cy+k*(yl+br*.55),{c:'#cfd6e2',w:Math.max(.7,ts*.2)}))}
  });
  // temas çizgileri
  if(t=='acisal'||t=='acisal2'||oyn){balls.forEach(function(bb,bi){var al=t=='acisal'?alpha:(oyn?Math.atan2(bb[0]-XC,bb[1]):(bi==0?-1:1)*30*Math.PI/180);
   if(oyn)al=Math.atan2(bb[0]-XC,bb[1]);var Lx=g*.62;
   S.push(ln(bb[0]-Lx*Math.sin(al)*(t=='acisal'?1:1),cy+k*(bb[1]+Lx*Math.cos(al)),bb[0]+Lx*Math.sin(al),cy+k*(bb[1]-Lx*Math.cos(al)),{c:'#d0101e',w:.8,da:'6 2 1.5 2',op:.85}))})}
 });
 var ax=axis(X0-12,cy,X1+12,cy);
 // ölçüler (kesit)
 var top=cy-Rf,bot=cy+Rf;
 var dS='';
 dS+=ext(X0,top-18,X0,cy-R+(fl?0:0)-(fl?(Rf-R):0))+ext(X1,top-18,X1,cy-R);
 dS+=dimH('B',X0,X1,top-12,f(v.B));
 dS+=dimV('D',X1+50,cy-R,cy+R,'ø'+f(v.D),ext(X1+2,cy-R,X1+56,cy-R)+ext(X1+2,cy+R,X1+56,cy+R));
 dS+=dimV('d',X1+24,cy-r,cy+r,'ø'+f(v.d),ext(X1+2,cy-r,X1+30,cy-r)+ext(X1+2,cy+r,X1+30,cy+r));
 if(fl){dS+=dimV('Df',X0-26,cy-Rf,cy+Rf,'ø'+f(v.Df),ext(X0-2,cy-Rf,X0-32,cy-Rf)+ext(X0-2,cy+Rf,X0-32,cy+Rf));
  dS+='<g class="hl" data-k="C">'+ext(X0,bot+2,X0,bot+18)+ext(X0+C,bot+2,X0+C,bot+18)+ln(X0-14,bot+13,X0,bot+13,{w:1.1})+ln(X0+C,bot+13,X0+C+16,bot+13,{w:1.1})+ln(X0-7,bot+13,X0,bot+13,{w:1.1,m:1}).replace('marker-start="url(#'+id+'a)" ','')+ln(X0+C+7,bot+13,X0+C,bot+13,{w:1.1,m:1}).replace('marker-start="url(#'+id+'a)" ','')+T(X0+C+20,bot+17,f(v.C),{a:'start'})+'</g>'}
 // ---------- ÖN GÖRÜNÜŞ
 var F=[],fy=cy;
 function circ(rr,o){o=o||{};return '<circle cx="'+fx(FX)+'" cy="'+fx(fy)+'" r="'+fx(rr)+'" fill="'+(o.f||'none')+'" stroke="'+(o.c||L)+'" stroke-width="'+(o.w||1.4)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op?' opacity="'+o.op+'"':'')+'/>'}
 var oLf=oyn?R-g*.16:pr+br*eL,iLf2=pr-br*eL;
 if(fl)F.push(circ(Rf),circ(R,{w:.9,da:'4 2.5',op:.8}));
 F.push(circ(R),circ(r));
 if(cv.k)F.push(circ(r+w/24,{w:.8}));
 var fcv=cv0;
 if(fcv=='zz'||fcv=='z'){F.push(circ(oLf,{w:1.2}),'<circle cx="'+fx(FX)+'" cy="'+fx(fy)+'" r="'+fx((oLf+iLf2)/2)+'" fill="none" stroke="#e6eaf1" stroke-width="'+fx(oLf-iLf2-1.6)+'"/>',circ(oLf-Math.max(1.2,(oLf-iLf2)*.12),{w:.7,op:.7}),circ(iLf2,{w:1.2}),circ(iLf2+Math.max(1,(oLf-iLf2)*.1),{w:.6,op:.6}))}
 else if(fcv=='2rs'||fcv=='rs'){F.push('<circle cx="'+fx(FX)+'" cy="'+fx(fy)+'" r="'+fx((oLf+iLf2)/2)+'" fill="none" stroke="#4b5568" stroke-width="'+fx(oLf-iLf2)+'"/>',circ(oLf,{w:1.2}),circ(iLf2,{w:1.2}),circ((oLf+iLf2)/2,{w:.6,c:'#8792a8',op:.9}))}
 else{F.push(circ(oLf,{w:1.1}),circ(iLf2,{w:1.1}));
  var rows=two?2:1,nb=Math.max(6,Math.floor(Math.PI*2*pr/(br*2*(rows==2?1.18:1.32))));
  for(var ro=rows-1;ro>=0;ro--)for(var i=0;i<nb;i++){var an=(i+(ro?0.5:0))/nb*Math.PI*2-Math.PI/2,bx=FX+pr*Math.cos(an),by=fy+pr*Math.sin(an);F.push('<circle cx="'+fx(bx)+'" cy="'+fx(by)+'" r="'+fx(br*(rows==2?.98:1))+'" fill="'+(ro?'#eef1f6':'#fff')+'" stroke="'+L+'" stroke-width="'+(ro?.9:1.2)+'"/>')}
  F.push(circ(pr,{w:.6,da:'2 2.5',op:.6}))}
 if(!fl&&cv.nr)F.push(circ(R+Math.max(1.4,Math.min(3,(R-oLf)*.3)),{w:1.4}));
 F.push(axis(FX-Rf-10,fy,FX+Rf+10,fy),axis(FX,fy-Rf-10,FX,fy+Rf+10));
 // kesit düzlemi A-A
 [[fy-Rf-17,fy-Rf-7,fy-Rf-17],[fy+Rf+7,fy+Rf+15,fy+Rf+15]].forEach(function(q){F.push(ln(FX,q[0],FX,q[1],{c:L,w:2}),'<path d="M'+fx(FX)+','+fx(q[2])+' H'+fx(FX+7)+'" stroke="'+L+'" stroke-width="1" marker-end="url(#'+id+'a)"/>',T(FX+13,q[2]+4,'A',{c:L,fs:10,a:'start'}))});
 var dF='';
 dF+=ext(FX-R,fy+4,FX-R,fy+Rf+22)+ext(FX+R,fy+4,FX+R,fy+Rf+22);
 dF+=dimH('D',FX-R,FX+R,fy+Rf+17,'ø'+f(v.D),fy+Rf+32);
 if(2*r>=40){var yy=fy+Math.min(r*.55,26);dF+=dimH('d',FX-r,FX+r,yy,'ø'+f(v.d),yy-5)}
 var lab='<text x="'+fx(FX)+'" y="'+(H-5)+'" fill="'+L+'" font-size="10" font-weight="700" letter-spacing="1.4" text-anchor="middle" opacity=".7" font-family="inherit">ÖN GÖRÜNÜŞ</text>'+
  '<text x="'+fx((X0-(fl?40:0)+X1+60)/2)+'" y="'+(H-5)+'" fill="'+L+'" font-size="10" font-weight="700" letter-spacing="1.4" text-anchor="middle" opacity=".7" font-family="inherit">KESİT A-A</text>';
 var defs='<defs><pattern id="'+id+'h1" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+HT+'" stroke-width="1.1"/></pattern><pattern id="'+id+'h2" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+HT+'" stroke-width="1.1"/></pattern><marker id="'+id+'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,1.5 L10,5 L0,8.5z" fill="'+dim+'"/></marker></defs>';
 return '<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="display:block" xmlns="http://www.w3.org/2000/svg">'+defs+'<g class="ln">'+F.join('')+'</g>'+dF+'<g class="ln">'+S.join('')+ax+'</g>'+dS+lab+'</svg>';
}
Y['bilyali']={
 sub:sub,
 match:function(ctx){return !!sub(ctx||{})},
 draw:function(ctx,opt){ctx=ctx||{};var t=sub(ctx);if(!t)return null;var v=dims(ctx);if(!v)return null;
  var nd=NEED[t];for(var i=0;i<nd.length;i++)if(!(v[nd[i]]>0))return null;
  if(!(v.D>v.d&&v.B>0&&v.B<v.D*2))return null;if(t=='flans'&&!(v.Df>v.D&&v.C<v.B))return null;
  var cv=cover(ctx),svg=render(t,v,cv,opt||{}),keys=[];
  ['d','D','B','Df','C'].forEach(function(k){if(nd.indexOf(k)>=0)keys.push({k:k,l:CL[k],v:f(v[k])+' mm'})});
  return {svg:svg,keys:keys,type:t,cover:cv.c};
 }
};
})();
