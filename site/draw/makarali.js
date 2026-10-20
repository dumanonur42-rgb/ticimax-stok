/* Teknik çizim: makaralı rulmanlar (iğneli, kombine iğneli, silindirik makaralı, oynak makaralı) */
(function(){
var C='#16203a',HAT='#9aa6bd',ROLL='#eef2f8';
function up(s){return String(s||'').replace(/i̇/g,'i').replace(/İ/g,'I').replace(/ı/g,'I').replace(/ş/gi,'S').replace(/ğ/gi,'G').replace(/ü/gi,'U').replace(/ö/gi,'O').replace(/ç/gi,'C').toUpperCase().replace(/\s+/g,' ')}
function numf(ctx,v){if(ctx&&ctx.num)return ctx.num(v);var m=String(v||'').replace(',','.').match(/-?\d+(\.\d+)?/);return m?parseFloat(m[0]):NaN}
function ok(x){return typeof x=='number'&&isFinite(x)&&x>0}
function fmt(x){return String(Math.round(x*100)/100).replace('.',',')}
/* ürün sayfasından ölçü: önce Ürün Özellikleri, sonra ön yazı; iki kaynak çelişirse ölçü yok sayılır */
function pick(ctx,res){var out=NaN,bad=false;[ctx.specs||[],ctx.onyazi||[]].forEach(function(list){list.forEach(function(it){var l=up(it.l);for(var i=0;i<res.length;i++){if(res[i].test(l)){var n=numf(ctx,it.v);if(ok(n)){if(ok(out)&&Math.abs(out-n)>1e-6)bad=true;else out=n}return}}})});return bad?NaN:out}
function triple(ctx){var t=null;[ctx.specs||[],ctx.onyazi||[]].forEach(function(list){list.forEach(function(it){if(/OLCU/.test(up(it.l))&&!t){var m=String(it.v).replace(/,/g,'.').match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);if(m)t=[+m[1],+m[2],+m[3]]}})});return t}
var RE_d=[/^IC CAP/,/^MIL CAP/,/^DELIK CAP/,/^\(?D\)?$/],RE_D=[/^DIS CAP/],RE_B=[/^GENISLIK/,/^EN \(B\)/,/^YUKSEKLIK/];
function basic(ctx){
 var dt=ctx.data||{};
 var d=pick(ctx,RE_d),D=pick(ctx,RE_D),B=pick(ctx,RE_B),t=triple(ctx);
 if(t){if(!ok(d))d=t[0];else if(Math.abs(d-t[0])>1e-6)return null;
  if(!ok(D))D=t[1];else if(Math.abs(D-t[1])>1e-6)return null;
  if(!ok(B))B=t[2];else if(Math.abs(B-t[2])>1e-6)return null}
 if(!ok(d)&&ok(dt.d))d=dt.d;if(!ok(D)&&ok(dt.D))D=dt.D;if(!ok(B)&&ok(dt.B))B=dt.B;
 if(!ok(d)||!ok(D)||!ok(B)||D<=d)return null;return {d:d,D:D,B:B}}
function lab(ctx,res,def){var r=def;[ctx.specs||[],ctx.onyazi||[]].forEach(function(list){list.forEach(function(it){var l=up(it.l);for(var i=0;i<res.length;i++)if(res[i].test(l)&&r===def)r=String(it.l).trim()})});return r}

/* --- alt tip tanıma --- */
function model(ctx){var t=up(ctx.title)+' '+up((ctx.path||'').replace(/[-\/]/g,' '));var m='';(ctx.specs||[]).forEach(function(s){if(up(s.l)=='MODEL')m=up(s.v)});return m+' | '+t}
function subtype(ctx){
 var all=up((ctx.crumbs||[]).join(' / ')+' '+ctx.title),m=model(ctx);
 if(/KONIK|KAM MAKARA|KECE|ZINCIR|LINEER|YATAKLI|KAPLIN|TANE BILYA|BILYA\b|MANSON|SEGMAN|BURC|SOMUN|PUL\b/.test(all))return null;
 if(/OYNAK MAKARALI/.test(all)){if(/\b(222|223|230|231|232|240|241)\d{2}\b/.test(m))return 'sf';return null}
 if(/SILINDIRIK MAKARALI/.test(all)){var s=m.match(/\b(NUP|NJ|NU|NN|N)\s?-?\d{3,5}/);return s?('cy_'+s[1].toLowerCase()):null}
 if(/IGNELI/.test(all)){
  if(/\bRAXP?Z?\s?-?\d{3}/.test(m)||/\bRAXPZ\b/.test(m))return 'rax';
  if(/\bNKXR\s?\d/.test(m))return 'nkxr';
  if(/\bNKX\s?\d/.test(m))return 'nkx';
  if(/\bNX\s?\d/.test(m))return 'nx';
  if(/\bNKIA\s?\d/.test(m))return 'nkia';
  if(/\bNKIB\s?\d/.test(m))return 'nkib';
  if(/\bNKIS\s?\d/.test(m)||/\bNKI\s?\d/.test(m)||/\bNA\s?-?\d{4}/.test(m))return 'ir';
  if(/\bRNA\s?-?\d{4}/.test(m)||/\bNKS\s?\d/.test(m)||/\bNK\s?\d/.test(m))return 'nk';
  if(/\bHK\s?-?\d{4}/.test(m))return 'hk';
  if(/\bBK\s?-?\d{4}/.test(m))return 'bk';
 }
 return null}

/* --- SVG yardımcıları --- */
function mk(opt,H,kf){
 var id=(opt&&opt.id)||'mk',dim=(opt&&opt.dim)||'#0a2350',g=[],ex=[],F=null;
 function a(x){return Math.round(x*100)/100}
 function M(x,y){return F?[F.x+(x-F.x)*F.k,F.y+(y-F.y)*F.k]:[x,y]}
 var o={id:id,dim:dim,H:H,kf:kf||1,
  fon:function(x,y){F={x:x,y:y,k:o.kf}},foff:function(){F=null},
  add:function(s){g.push(s)},
  poly:function(pts,fill,sw,extra){pts=pts.map(function(p){return M(p[0],p[1])});var d='M'+pts.map(function(p){return a(p[0])+','+a(p[1])}).join('L')+'Z';g.push('<path d="'+d+'" fill="'+fill+'" stroke="'+C+'" stroke-width="'+(sw||1.3)+'" stroke-linejoin="round"'+(extra||'')+'/>')},
  line:function(x1,y1,x2,y2,sw,extra){var q1=M(x1,y1),q2=M(x2,y2);x1=q1[0];y1=q1[1];x2=q2[0];y2=q2[1];g.push('<line x1="'+a(x1)+'" y1="'+a(y1)+'" x2="'+a(x2)+'" y2="'+a(y2)+'" stroke="'+C+'" stroke-width="'+(sw||1.3)+'"'+(extra||'')+'/>')},
  circ:function(cx,cy,r,fill,sw,extra){var q=M(cx,cy);cx=q[0];cy=q[1];if(F)r*=F.k;g.push('<circle cx="'+a(cx)+'" cy="'+a(cy)+'" r="'+a(r)+'" fill="'+(fill||'none')+'" stroke="'+C+'" stroke-width="'+(sw||1.3)+'"'+(extra||'')+'/>')},
  axis:function(x1,y1,x2,y2){var q1=M(x1,y1),q2=M(x2,y2);x1=q1[0];y1=q1[1];x2=q2[0];y2=q2[1];g.push('<line x1="'+a(x1)+'" y1="'+a(y1)+'" x2="'+a(x2)+'" y2="'+a(y2)+'" stroke="'+C+'" stroke-width=".7" stroke-dasharray="12 3 2 3" opacity=".65"/>')},
  ext:function(x1,y1,x2,y2){ex.push('<line x1="'+a(x1)+'" y1="'+a(y1)+'" x2="'+a(x2)+'" y2="'+a(y2)+'" stroke="'+dim+'" stroke-width=".6" opacity=".55"/>')},
  /* ölçü çizgisi: oklar iki uçta; yazı (lx,ly) */
  dimn:function(k,x1,y1,x2,y2,txt,lx,ly,rot,anchor){
   var t='<text x="'+a(lx)+'" y="'+a(ly)+'" fill="'+dim+'" font-size="17" font-weight="700" text-anchor="'+(anchor||'middle')+'" stroke="#fbfcfe" stroke-width="3" paint-order="stroke" stroke-linejoin="round"'+(rot?' transform="rotate(-90 '+a(lx)+' '+a(ly)+')"':'')+'>'+txt+'</text>';
   g.push('<g class="hl '+k+'" data-k="'+k+'"><line x1="'+a(x1)+'" y1="'+a(y1)+'" x2="'+a(x2)+'" y2="'+a(y2)+'" stroke="'+dim+'" stroke-width="1.1" marker-start="url(#'+id+'a)" marker-end="url(#'+id+'a)"/>'+t+'</g>')},
  title:function(x,y,t){g.push('<text x="'+a(x)+'" y="'+a(y)+'" fill="'+dim+'" font-size="10" font-weight="700" letter-spacing="1.5" text-anchor="middle" opacity=".7">'+t+'</text>')},
  note:function(x,y,t,anc){g.push('<text x="'+a(x)+'" y="'+a(y)+'" fill="#5a6481" font-size="9.5" font-weight="600" text-anchor="'+(anc||'middle')+'" stroke="#fbfcfe" stroke-width="3" paint-order="stroke">'+t+'</text>')},
  out:function(){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 '+H+'" width="100%" style="display:block;font-family:inherit"><defs><pattern id="'+id+'h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+HAT+'" stroke-width="1.1"/></pattern><marker id="'+id+'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,1.2 L10,5 L0,8.8z" fill="'+dim+'"/></marker></defs>'+ex.join('')+g.join('')+'</svg>'}};
 o.hat='url(#'+id+'h)';return o}
/* kesit: (x eksenel, r eksenden uzaklık) -> üst ve alt yarı */
function sec(S,sx,cy){return {P:function(pts,sg){return pts.map(function(p){return [sx+p[0],cy-sg*p[1]]})}}}
function both(f){f(1);f(-1)}
function rrect(x0,r0,x1,r1,c){c=Math.min(c,(x1-x0)/2,(r1-r0)/2);return [[x0+c,r0],[x1-c,r0],[x1,r0+c],[x1,r1-c],[x1-c,r1],[x0+c,r1],[x0,r1-c],[x0,r0+c]]}
function chamf(x0,r0,x1,r1,c){c=Math.min(c,(x1-x0)/3,(r1-r0)/3);return [[x0,r0],[x1,r0],[x1,r1-c],[x1-c,r1],[x0+c,r1],[x0,r1-c]]}
function chamfIn(x0,r0,x1,r1,c){c=Math.min(c,(x1-x0)/3,(r1-r0)/3);return [[x0,r0+c],[x0+c,r0],[x1-c,r0],[x1,r0+c],[x1,r1],[x0,r1]]}

/* --- ön görünüş: halkalar + yuvarlanma elemanı uçları --- */
function front(S,fx,cy,R,rings,rollR,rollPitch,n,opt){
 S.fon(fx,cy);
 rings.forEach(function(r){S.circ(fx,cy,r[0],r[1]||'none',r[2]||1.4,r[3])});
 for(var i=0;i<n;i++){var t=2*Math.PI*i/n-Math.PI/2;S.circ(fx+rollPitch*Math.cos(t),cy+rollPitch*Math.sin(t),rollR,ROLL,1)}
 S.axis(fx-R-12/S.kf,cy,fx+R+12/S.kf,cy);S.axis(fx,cy-R-12/S.kf,fx,cy+R+12/S.kf);S.foff()}

/* ortak yerleşim: ön görünüş solda, kesit sağda, sağda dikey ölçüler */
function layout(Dmax,W,nRight,mR,o){
 o=o||{};var H=260,cy=o.cy||136,hS=o.hS||200,maxR=mR||84;
 var avail=460-206-14-nRight*24-8;            /* kesit kendi ölçeğinde: yükseklik ~%80 */
 var s=Math.min(hS/Dmax,avail/W),sF=2*maxR/Dmax;
 var R=Dmax/2*s,w=W*s,fx=108,sx=206+(avail-w)/2+4;if(sx<214)sx=214;
 return {s:s,sF:sF,kf:sF/s,H:H,cy:cy,R:R,w:w,fx:fx,sx:sx}}

/* standart ölçü seti: ön görünüşte d ve D, kesitte B üstte, D ve d sağda */
function stdDims(S,L,k,v,Rt){
 var cy=L.cy,fx=L.fx,sx=L.sx,w=L.w,R=v.D/2*L.s,r=v.d/2*L.s,dim=S.dim,Rt=Rt||R;
 /* ön görünüş */
 var RF=v.D/2*L.sF,rF=v.d/2*L.sF,yd=cy+Math.min(rF*0.55,rF-8);if(rF<16)yd=cy;
 S.dimn('d',fx-rF,yd,fx+rF,yd,'ø'+fmt(v.d),fx,yd-5);
 S.ext(fx-RF,cy+4,fx-RF,cy+RF+20);S.ext(fx+RF,cy+4,fx+RF,cy+RF+20);
 S.dimn('D',fx-RF,cy+RF+15,fx+RF,cy+RF+15,'ø'+fmt(v.D),fx,cy+RF+30>L.H-3?cy+RF+11:cy+RF+30);
 /* kesit */
 var xr=sx+w;
 S.ext(sx,cy-Rt-20,sx,cy-Rt-2);S.ext(xr,cy-Rt-20,xr,cy-R-2);
 S.dimn('B',sx,cy-Rt-14,xr,cy-Rt-14,fmt(v.B),sx+w/2,cy-Rt-19);
 S.ext(xr+2,cy-r,xr+30,cy-r);S.ext(xr+2,cy+r,xr+30,cy+r);
 S.ext(xr+2,cy-R,xr+54,cy-R);S.ext(xr+2,cy+R,xr+54,cy+R);
 S.dimn('d',xr+24,cy-r,xr+24,cy+r,'ø'+fmt(v.d),xr+20,cy,1);
 S.dimn('D',xr+48,cy-R,xr+48,cy+R,'ø'+fmt(v.D),xr+44,cy,1);
}
function titles(S,L,secTitle){S.title(L.fx,13,'ÖN GÖRÜNÜŞ');S.title(L.sx+L.w/2,L.H-6,secTitle||'KESİT A-A')}
/* yazıların küçük ölçülerde içe sığmaması: d için dikey ölçü çok kısaysa yazıyı dışarı al */

/* ========== İğneli: NK / RNA (iç bileziksiz), NKI / NA / NKIS (iç bilezikli), HK / BK (kovan) ========== */
function needle(ctx,opt,kind){
 var v=basic(ctx);if(!v)return null;
 var L=layout(v.D,v.B,2),S=mk(opt,L.H,L.kf),s=L.s,cy=L.cy,R=v.D/2*s,r=v.d/2*s,w=L.w,T=R-r,X=sec(S,L.sx,cy);
 var inner=kind=='ir',cup=kind=='hk'||kind=='bk';
 var ti=inner?T*0.30:0, ri=r+ti;
 var ts=cup?Math.max(1.6,T*0.2):0;
 var dw=cup?(R-ts-ri):(T-ti)*0.48;
 var rb=ri+dw;                    /* iğne üstü = dış bilezik yuvarlanma yolu */
 var seal=!cup&&/\b2RS[R]?\b|\b2RSX\b/.test(up(ctx.title)+' '+model(ctx));
 var lw=cup?ts:Math.max(1.8,Math.min(w*0.075,T*0.5)), rl=seal?rb:ri+dw*0.5, sw=seal?Math.max(1.8,Math.min(w*0.09,4)):0;
 var cw=Math.max(1.2,Math.min(w*0.05,3));
 both(function(g){
  /* dış bilezik / kovan */
  if(cup){
   var lip=ri+dw*0.45;
   var pts=[[0,R],[w,R],[w,lip],[w-ts,lip],[w-ts,R-ts],[ts,R-ts],[ts,lip],[0,lip]];
   if(kind=='bk')pts=[[0,R],[w,R],[w,lip],[w-ts,lip],[w-ts,R-ts],[ts,R-ts],[ts,0.0001],[0,0.0001]];
   S.poly(X.P(pts,g),'#2b3550',1.1);
  }else{
   var hw=Math.max(1.6,Math.min(w*0.07,T*0.35)),m=w/2;
   var gd=Math.max(0.8,(R-rb)*0.28);
   S.poly(X.P([[0,R-0.8],[0.8,R],[m-hw,R],[m-hw,R-gd],[m+hw,R-gd],[m+hw,R],[w-0.8,R],[w,R-0.8],[w,rl],[w-lw,rl],[w-lw,rb],[lw,rb],[lw,rl],[0,rl]],g),S.hat);
  }
  /* iç bilezik */
  if(inner)S.poly(X.P(chamfIn(0,r,w,ri,1.2).map(function(p){return p}),g),S.hat);
  /* kafes yan halkaları + iğne */
  if(seal){S.poly(X.P([[0.5,rb],[sw,rb],[sw,ri+dw*0.35],[sw*0.55,ri+0.35],[0.5,ri+0.35]],g),'#3a4258',0.9);S.poly(X.P([[w-0.5,rb],[w-sw,rb],[w-sw,ri+dw*0.35],[w-sw*0.55,ri+0.35],[w-0.5,ri+0.35]],g),'#3a4258',0.9)}
  var x0=(seal?sw:lw)+0.6,x1=w-(seal?sw:lw)-0.6;
  S.poly(X.P([[x0,ri+dw*0.18],[x0+cw,ri+dw*0.18],[x0+cw,ri+dw*0.86],[x0,ri+dw*0.86]],g),'#5b6680',0.8);
  S.poly(X.P([[x1-cw,ri+dw*0.18],[x1,ri+dw*0.18],[x1,ri+dw*0.86],[x1-cw,ri+dw*0.86]],g),'#5b6680',0.8);
  S.poly(X.P(rrect(x0+cw+0.6,ri+0.25,x1-cw-0.6,rb-0.25,dw*0.32),g),ROLL,1.1);
 });
 if(!inner){S.line(L.sx-6,cy-r,L.sx+w+6,cy-r,0.7,' stroke-dasharray="3 2" opacity=".6"');S.line(L.sx-6,cy+r,L.sx+w+6,cy+r,0.7,' stroke-dasharray="3 2" opacity=".6"')}
 S.axis(L.sx-12,cy,L.sx+w+12,cy);
 /* ön görünüş */
 var fx=L.fx,pitch=ri+dw/2,rr=dw/2*0.92,n=Math.max(8,Math.min(48,Math.floor(2*Math.PI*pitch/(dw*1.18))));
 var rings=cup?[[R,'none',1.5],[R-ts,'none',1]]:[[R,'none',1.5],[rb,'none',1.1]];
 if(inner)rings.push([ri,'none',1.1],[r,'none',1.5]);else rings.push([r,'none',0.8,' stroke-dasharray="3 2"']);
 front(S,fx,cy,R,rings,rr,pitch,n);
 if(cup){S.fon(fx,cy);S.circ(fx,cy,R-ts*0.5,'none',ts*0.9*S.kf,' stroke="#2b3550" opacity=".35"');S.foff()}
 stdDims(S,L,ctx,v);titles(S,L);
 var lD=lab(ctx,RE_D,'Dış Çap (D)'),ld=lab(ctx,RE_d,inner?'İç Çap (d)':'Mil Çapı (Fw)'),lB=lab(ctx,RE_B,'Genişlik (B)');
 return {svg:S.out(),keys:[{k:'d',l:ld,v:fmt(v.d)+' mm'},{k:'D',l:lD,v:fmt(v.D)+' mm'},{k:'B',l:lB,v:fmt(v.B)+' mm'}]}}

/* ========== Oynak makaralı: 222xx / 223xx / 230xx / 231xx / 232xx / 240xx ========== */
function barrel(cx,cy,L2,R2,ang,bul){ /* fıçı makara: merkez, yarı uzunluk, yarı çap, açı (rad) */
 var pts=[],N=10,i,ca=Math.cos(ang),sa=Math.sin(ang);
 function T(u,v){return [cx+u*ca-v*sa,cy+u*sa+v*ca]}
 for(i=0;i<=N;i++){var u=-L2*0.86+1.72*L2*i/N;pts.push(T(u,-(R2*(1-bul*(u*u)/(L2*L2)))))}
 pts.push(T(L2,-R2*(1-bul)*0.9),T(L2,R2*(1-bul)*0.9));
 for(i=N;i>=0;i--){var u2=-L2*0.86+1.72*L2*i/N;pts.push(T(u2,R2*(1-bul*(u2*u2)/(L2*L2))))}
 pts.push(T(-L2,R2*(1-bul)*0.9),T(-L2,-R2*(1-bul)*0.9));return pts}
function spherical(ctx,opt){
 var v=basic(ctx);if(!v)return null;
 var L=layout(v.D,v.B,2),S=mk(opt,L.H,L.kf),s=L.s,cy=L.cy,R=v.D/2*s,r=v.d/2*s,w=L.w,T=R-r,sx=L.sx,m=w/2,c=Math.max(0.8,T*0.03);
 var tag=up(ctx.title)+' '+model(ctx),taper=/\b(2[234]\d{3}|2[34][01]\d{2})\s?-?[A-Z0-9.]*K\b/.test(tag)||/\b(CCK|CAK|EK|CK|K30)\b/.test(tag)||/\d(CCK|CAK|EK)/.test(tag);
 var w33=/W33/.test(tag),ca=/\b2[234]\d{3}\s?-?CA/.test(tag);
 var To=T*0.24,Rs=R-To;if(Rs<=m*1.05)Rs=m*1.1;          /* dış bilezik: tek küresel yol, merkez eksende (m,0) */
 var dr=T*0.38,Rm=Rs-dr/2,g0=Math.max(1.6,w*0.045);
 var L2=Math.min(dr*1.25,(m-0.8-g0)/2);
 var a=g0+L2,th=Math.asin(Math.min(0.6,a/Rm)),rho=Math.min(Rs,L2*2.3);
 function hh(u){return Math.sqrt(rho*rho-u*u)-(rho-dr/2)}
 var cxL=m-Rm*Math.sin(th),crL=Rm*Math.cos(th),Ux=Math.cos(th),Ur=Math.sin(th),Vx=-Math.sin(th),Vr=Math.cos(th);
 function rp(u,k,cl){var q=hh(u)*k+(cl||0)*k;return [cxL+u*Ux+q*Vx,crL+u*Ur+q*Vr]}
 function arcR(x){var dx=x-m;return Math.sqrt(Math.max(0,Rs*Rs-dx*dx))}
 var gw=Math.max(3,w*0.16),gd=Math.max(1.2,To*0.26),hw=Math.max(1.1,gw*0.3);
 var N=12,i,ue=L2*1.05,race=[];for(i=0;i<=N;i++){race.push(rp(-ue+2*ue*i/N,-1,0.3))}  /* sol yol: dış uçtan iç uca */
 var xo=Math.max(0.6,race[0][0]),rIn=race[N][1],ribR=race[0][1]+dr*(ca?0.16:0.06);
 var bore1=taper?r+w/24:r,rf=rIn+dr*0.34;
 both(function(g){
  function P(pts){return pts.map(function(p){return [sx+p[0],cy-g*p[1]]})}
  function Mx(pts){return pts.map(function(p){return [w-p[0],p[1]]})}
  /* dış bilezik */
  var o=[];
  if(w33){o=[[0,R-c],[c,R],[m-gw/2,R],[m-gw/2,R-gd],[m-hw,R-gd]];for(i=0;i<=N;i++){var x=(m-hw)*(1-i/N);o.push([x,arcR(x)])}
   S.poly(P(o),S.hat);S.poly(P(Mx(o)),S.hat);
   S.line(sx+m,cy-g*(R-gd+0.5),sx+m,cy-g*(arcR(m)-0.5),0.6,' stroke-dasharray="2 1.5" opacity=".7"')}
  else{o=[[0,R-c],[c,R],[w-c,R],[w,R-c]];for(i=0;i<=2*N;i++){var xa=w*(1-i/(2*N));o.push([xa,arcR(xa)])}S.poly(P(o),S.hat)}
  /* iç bilezik: iki yollu */
  var inn=[[0,r+c],[c,r],[w-c,bore1],[w,bore1+c],[w,ribR],[w-xo,ribR]].concat(Mx(race));
  if(ca)inn.push([m+g0*0.8,rIn],[m+g0*0.8,rf],[m-g0*0.8,rf],[m-g0*0.8,rIn]);
  inn=inn.concat(race.slice().reverse());inn.push([xo,ribR],[0,ribR]);
  S.poly(P(inn),S.hat);
  /* ara halka (CC/E) */
  var top=rf;
  if(!ca){top=rIn+dr*0.42;S.poly(P([[m-g0+0.35,rIn+0.3],[m+g0-0.35,rIn+0.3],[m+g0-0.35,top],[m-g0+0.35,top]]),'#dde2ec',0.9)}
  /* fıçı makaralar (bombeli, simetrik açılı) */
  var rl=[];for(i=0;i<=N;i++)rl.push(rp(-L2+2*L2*i/N,1));for(i=N;i>=0;i--)rl.push(rp(-L2+2*L2*i/N,-1));
  S.poly(P(rl),ROLL,1.25);S.poly(P(Mx(rl)),ROLL,1.25);
  /* makara eksenleri */
  var e0=rp(-L2*1.15,0),e1=rp(L2*1.15,0);
  S.line(sx+e0[0],cy-g*e0[1],sx+e1[0],cy-g*e1[1],0.5,' stroke-dasharray="6 2 1.5 2" opacity=".55"');
  S.line(sx+w-e0[0],cy-g*e0[1],sx+w-e1[0],cy-g*e1[1],0.5,' stroke-dasharray="6 2 1.5 2" opacity=".55"');
  /* kafes köprüsü */
  var kt=crL+dr*0.22;if(kt>top+1.4)S.poly(P([[m-g0*0.55,top+0.5],[m+g0*0.55,top+0.5],[m+g0*0.55,kt],[m-g0*0.55,kt]]),'#5b6680',0.7);
 });
 S.axis(sx-12,cy,sx+w+12,cy);S.axis(sx+m,cy-R-8,sx+m,cy+R+8);
 S.add('<circle cx="'+(sx+m)+'" cy="'+cy+'" r="1.8" fill="'+C+'"/>');
 /* ön görünüş */
 var fx=L.fx,pitch=crL,n=Math.max(10,Math.min(30,Math.floor(2*Math.PI*pitch/(dr*1.25))));
 front(S,fx,cy,R,[[R,'none',1.5],[arcR(0)+0.5,'none',1],[ribR,'none',1],[r,'none',1.5]],dr/2*0.95,pitch,n);
 stdDims(S,L,ctx,v);titles(S,L);
 if(taper)S.note(sx+w/2,cy+R+14,'Konik delik 1:12');
 var lD=lab(ctx,RE_D,'Dış Çap (D)'),ld=lab(ctx,RE_d,'İç Çap (d)'),lB=lab(ctx,RE_B,'Genişlik (B)');
 return {svg:S.out(),keys:[{k:'d',l:ld,v:fmt(v.d)+' mm'},{k:'D',l:lD,v:fmt(v.D)+' mm'},{k:'B',l:lB,v:fmt(v.B)+' mm'}]}}

/* ========== Silindirik makaralı: NU / NJ / NUP / N (tek sıra), NN (çift sıra) ========== */
function cylindrical(ctx,opt,t){
 var v=basic(ctx);if(!v)return null;
 var L=layout(v.D,v.B,2),S=mk(opt,L.H,L.kf),s=L.s,cy=L.cy,R=v.D/2*s,r=v.d/2*s,w=L.w,T=R-r,X=sec(S,L.sx,cy);
 var to=T*0.30,ti=T*0.30,dr=T-to-ti,ro=R-to,ri=r+ti,fh=dr*0.42,fw=Math.max(2,w*0.12),c=1;
 var rows=t=='nn'?2:1;
 both(function(g){
  /* dış bilezik */
  var oFl=(t=='nu'||t=='nj'||t=='nup'||t=='nn'),iFl2=(t=='nj'||t=='nup'),iFl1=(t=='n');
  var o=[[0,R-c],[c,R],[w-c,R],[w,R-c]];
  if(oFl)o.push([w,ro-fh],[w-fw,ro-fh],[w-fw,ro],[fw,ro],[fw,ro-fh],[0,ro-fh]);else o.push([w,ro],[0,ro]);
  S.poly(X.P(o,g),S.hat);
  /* iç bilezik */
  var i=[[0,r+c],[c,r],[w-c,r],[w,r+c]];
  if(t=='n'){i.push([w,ri+fh],[w-fw,ri+fh],[w-fw,ri],[fw,ri],[fw,ri+fh],[0,ri+fh])}
  else if(t=='nj'||t=='nup'){i.push([w,ri],[fw,ri],[fw,ri+fh],[0,ri+fh])}
  else i.push([w,ri],[0,ri]);
  S.poly(X.P(i,g),S.hat);
  if(t=='nup'){var pw=fw*0.9;S.poly(X.P([[w-pw,r+0.6],[w,r+0.6],[w,ri+fh],[w-pw,ri+fh]],g),S.hat,1.2)}
  /* makaralar */
  var x0=fw+0.8,x1=w-fw-0.8;if(t=='nup')x1=w-fw*0.9-0.8;
  if(rows==1)S.poly(X.P(rrect(x0,ri+0.3,x1,ro-0.3,1.2),g),ROLL,1.1);
  else{var mid=(x0+x1)/2;S.poly(X.P(rrect(x0,ri+0.3,mid-1.5,ro-0.3,1.2),g),ROLL,1.1);S.poly(X.P(rrect(mid+1.5,ri+0.3,x1,ro-0.3,1.2),g),ROLL,1.1)}
 });
 S.axis(L.sx-12,cy,L.sx+w+12,cy);
 var fx=L.fx,pitch=(ri+ro)/2,n=Math.max(10,Math.min(28,Math.floor(2*Math.PI*pitch/(dr*1.3))));
 front(S,fx,cy,R,[[R,'none',1.5],[ro,'none',1],[ri,'none',1],[r,'none',1.5]],dr/2*0.92,pitch,n);
 stdDims(S,L,ctx,v);titles(S,L);
 var lD=lab(ctx,RE_D,'Dış Çap (D)'),ld=lab(ctx,RE_d,'İç Çap (d)'),lB=lab(ctx,RE_B,'Genişlik (B)');
 return {svg:S.out(),keys:[{k:'d',l:ld,v:fmt(v.d)+' mm'},{k:'D',l:lD,v:fmt(v.D)+' mm'},{k:'B',l:lB,v:fmt(v.B)+' mm'}]}}


/* ========== Kombine iğneli: RAX / RAXPZ (radyal iğne kovanı + eksenel iğne kafesi) ========== */
function dget(ctx,k){var dt=ctx.data||{};return ok(dt[k])?dt[k]:NaN}
function rax(ctx,opt){
 var Ci=dget(ctx,'Ci'),D1=dget(ctx,'D1'),D2=dget(ctx,'D2'),L0=dget(ctx,'L'),h=dget(ctx,'h'),d1=dget(ctx,'d1'),d2=dget(ctx,'d2');
 if(!ok(Ci)||!ok(D1)||!ok(D2)||!ok(L0)||!ok(h)||!ok(d1)||!ok(d2))return null;
 if(!(D1>Ci&&D2>D1&&L0>h&&d1>Ci&&d2>d1&&D2>d2))return null;
 var L=layout(D2,L0,3,76,{hS:188,cy:146}),S=mk(opt,L.H,L.kf),s=L.s,cy=L.cy,sx=L.sx,X=sec(S,sx,cy);
 var rC=Ci/2*s,r1=D1/2*s,r2=D2/2*s,a1=d1/2*s,a2=d2/2*s,w=L0*s,hp=h*s;
 var ts=Math.max(1.3,Math.min((r1-rC)*0.16,2.4)),dw=r1-ts-rC,tw=Math.max(1.4,hp*0.3),fl=Math.min(a2+ts,r2-1.5);
 both(function(g){
  /* eksenel pul */
  S.poly(X.P([[0,a1+0.6],[0.6,a1],[tw,a1],[tw,r2],[0.6,r2],[0,r2-0.6]],g),S.hat,1.2);
  /* kovan: flanş + gövde + iç dudak */
  var c0=hp-ts,lip=rC+dw*0.5;
  S.poly(X.P([[c0,lip],[hp,lip],[hp,r1-ts],[w-ts,r1-ts],[w-ts,lip],[w,lip],[w,r1],[hp,r1],[hp,fl],[c0,fl]],g),'#2b3550',1);
  /* eksenel iğne + kafes */
  var gx0=tw+0.5,gx1=c0-0.5,kw=Math.max(1,(gx1-gx0)*0.18);
  S.poly(X.P([[gx0+kw*0.6,a1+0.4],[gx1-kw*0.6,a1+0.4],[gx1-kw*0.6,a2-0.4],[gx0+kw*0.6,a2-0.4]],g),'#5b6680',0.7);
  S.poly(X.P(rrect(gx0,a1+(a2-a1)*0.12,gx1,a2-(a2-a1)*0.12,Math.min(1,(gx1-gx0)*0.2)),g),ROLL,1.1);
  /* radyal iğne + kafes */
  var x0=hp+0.8,x1=w-ts-0.8,cw=Math.max(1.1,Math.min(w*0.05,2.6));
  S.poly(X.P([[x0,rC+dw*0.2],[x0+cw,rC+dw*0.2],[x0+cw,rC+dw*0.85],[x0,rC+dw*0.85]],g),'#5b6680',0.8);
  S.poly(X.P([[x1-cw,rC+dw*0.2],[x1,rC+dw*0.2],[x1,rC+dw*0.85],[x1-cw,rC+dw*0.85]],g),'#5b6680',0.8);
  S.poly(X.P(rrect(x0+cw+0.6,rC+0.25,x1-cw-0.6,r1-ts-0.25,dw*0.32),g),ROLL,1.1);
 });
 S.line(sx+hp-2,cy-rC,sx+w+6,cy-rC,0.7,' stroke-dasharray="3 2" opacity=".6"');S.line(sx+hp-2,cy+rC,sx+w+6,cy+rC,0.7,' stroke-dasharray="3 2" opacity=".6"');
 S.axis(sx-12,cy,sx+w+12,cy);
 /* ön görünüş (eksenel taraftan, pul çıkarılmış): eksenel iğneler ışınsal */
 var fx=L.fx,R=r2,n=Math.max(14,Math.min(48,Math.floor(2*Math.PI*(a1+a2)/2/Math.max(2.4,gx1w()*1.6))));
 function gx1w(){return Math.max(2,(hp-ts-tw-1)*0.9)}
 S.fon(fx,cy);S.circ(fx,cy,r2,'none',1.5);S.circ(fx,cy,fl,'none',0.9,' stroke-dasharray="4 2"');
 S.circ(fx,cy,a2,'none',1);S.circ(fx,cy,a1,'none',1);
 var nw=Math.max(0.9,Math.min(gx1w()*0.42,(a1+a2)/2*Math.PI/n*0.32)),i;
 for(i=0;i<n;i++){var t=2*Math.PI*i/n,ct=Math.cos(t),st=Math.sin(t),ra=a1+(a2-a1)*0.12,rb=a2-(a2-a1)*0.12;
  S.poly([[fx+ra*ct-nw*st,cy+ra*st+nw*ct],[fx+rb*ct-nw*st,cy+rb*st+nw*ct],[fx+rb*ct+nw*st,cy+rb*st-nw*ct],[fx+ra*ct+nw*st,cy+ra*st-nw*ct]],ROLL,0.8)}
 S.circ(fx,cy,rC+dw*0.5,'none',1.2);
 S.circ(fx,cy,rC,'none',0.8,' stroke-dasharray="3 2"');
 S.axis(fx-R-12/S.kf,cy,fx+R+12/S.kf,cy);S.axis(fx,cy-R-12/S.kf,fx,cy+R+12/S.kf);S.foff();
 /* ölçüler */
 var rCF=rC*L.kf,RF=R*L.kf,yd=rCF<16?cy:cy+Math.min(rCF*0.55,rCF-8);
 S.dimn('d',fx-rCF,yd,fx+rCF,yd,'ø'+fmt(Ci),fx,yd-5);
 S.ext(fx-RF,cy+4,fx-RF,cy+RF+20);S.ext(fx+RF,cy+4,fx+RF,cy+RF+20);
 S.dimn('D2',fx-RF,cy+RF+15,fx+RF,cy+RF+15,'ø'+fmt(D2),fx,cy+RF+30>L.H-3?cy+RF+11:cy+RF+30);
 var xr=sx+w,top=cy-r2;
 S.ext(sx,top-36,sx,top-2);S.ext(xr,cy-r1-36+(r2-r1),xr,cy-r1-2);S.ext(sx+hp,top-16,sx+hp,cy-fl-2);
 S.dimn('h',sx,top-10,sx+hp,top-10,fmt(h),sx+hp+4,top-14,0,'start');
 S.dimn('L',sx,top-28,xr,top-28,fmt(L0),sx+w/2,top-33);
 S.ext(xr+2,cy-rC,xr+30,cy-rC);S.ext(xr+2,cy+rC,xr+30,cy+rC);
 S.ext(xr+2,cy-r1,xr+54,cy-r1);S.ext(xr+2,cy+r1,xr+54,cy+r1);
 S.ext(sx+tw+2,cy-r2,xr+78,cy-r2);S.ext(sx+tw+2,cy+r2,xr+78,cy+r2);
 S.dimn('d',xr+24,cy-rC,xr+24,cy+rC,'ø'+fmt(Ci),xr+20,cy,1);
 S.dimn('D',xr+48,cy-r1,xr+48,cy+r1,'ø'+fmt(D1),xr+44,cy,1);
 S.dimn('D2',xr+72,cy-r2,xr+72,cy+r2,'ø'+fmt(D2),xr+68,cy,1);
 S.title(fx,13,'ÖN GÖRÜNÜŞ');S.title(sx+w/2+20,L.H-6,'KESİT A-A');
 return {svg:S.out(),keys:[{k:'d',l:'Mil Çapı (Ci)',v:fmt(Ci)+' mm'},{k:'D',l:'Dış Çap (D1)',v:fmt(D1)+' mm'},{k:'D2',l:'Eksenel Dış Çap (D2 max)',v:fmt(D2)+' mm'},{k:'L',l:'Toplam Genişlik (L)',v:fmt(L0)+' mm'},{k:'h',l:'Eksenel Kısım (h)',v:fmt(h)+' mm'}]}}

/* ========== Kombine iğneli: NKIA / NKIB (iç bilezikli iğne + eğik bilyalı eksenel kısım) ========== */
function arcP(cx,cr,rad,a0,a1,n,down){var o=[],i;for(i=0;i<=n;i++){var t=a0+(a1-a0)*i/n;o.push([cx+rad*Math.sin(t),down?cr-rad*Math.cos(t):cr+rad*Math.cos(t)])}return o}
function clamp1(x){return Math.max(-1,Math.min(1,x))}
function nkia(ctx,opt,kind){
 var v=basic(ctx);if(!v)return null;
 var L=layout(v.D,v.B,2),S=mk(opt,L.H,L.kf),s=L.s,cy=L.cy,R=v.D/2*s,r=v.d/2*s,w=L.w,T=R-r,X=sec(S,L.sx,cy);
 var to=T*0.27,ti=T*0.27,ro=R-to,ri=r+ti,g=ro-ri,cr=(ri+ro)/2,c=1,q=Math.PI/4;
 var rb=Math.min(g*0.74,T*0.37,w*0.17),rg=rb*1.03,cx=w-Math.max(rb*1.3,rb+1.8);
 var t1=Math.acos(clamp1((ro-cr)/rg)),u2=Math.acos(clamp1((cr-ri)/rg));
 var lw=Math.max(1.6,Math.min(w*0.06,3)),gl=g*0.36,cw=Math.max(1.1,Math.min(w*0.045,2.6));
 var xs=cx-rb-Math.max(1.4,rb*0.25);
 both(function(gg){
  var a=arcP(cx,cr,rg,-q,t1,12,false),lo=[[0,ro-gl],[lw,ro-gl],[lw,ro],[a[0][0],ro]].concat(a);
  S.poly(X.P([[0,R-c],[c,R],[w-c,R],[w,R-c],[w,ro]].concat(lo.slice().reverse()),gg),S.hat);
  var b=arcP(cx,cr,rg,-u2,q,12,true),bl=b[b.length-1];
  if(kind=='nkib'){
   S.poly(X.P(chamfIn(0,r,xs,ri,1.1),gg),S.hat);
   S.poly(X.P([[xs+0.7,r],[w-c,r],[w,r+c],[w,bl[1]]].concat(b.slice().reverse(),[[xs+0.7,ri]]),gg),S.hat);
  }else{
   S.poly(X.P([[c,r],[w-c,r],[w,r+c],[w,bl[1]]].concat(b.slice().reverse(),[[0,ri],[0,r+c]]),gg),S.hat);
  }
  var x0=lw+0.6,x1=xs-0.8;
  S.poly(X.P([[x0,ri+g*0.18],[x0+cw,ri+g*0.18],[x0+cw,ri+g*0.86],[x0,ri+g*0.86]],gg),'#5b6680',0.8);
  S.poly(X.P([[x1-cw,ri+g*0.18],[x1,ri+g*0.18],[x1,ri+g*0.86],[x1-cw,ri+g*0.86]],gg),'#5b6680',0.8);
  S.poly(X.P(rrect(x0+cw+0.6,ri+0.25,x1-cw-0.6,ro-0.25,g*0.32),gg),ROLL,1.1);
  var P0=X.P([[cx,cr],[cx+rb*1.55*Math.sin(q),cr+rb*1.55*Math.cos(q)],[cx-rb*1.55*Math.sin(q),cr-rb*1.55*Math.cos(q)]],gg);
  S.circ(P0[0][0],P0[0][1],rb,ROLL,1.1);
  S.line(P0[1][0],P0[1][1],P0[2][0],P0[2][1],0.7,' stroke-dasharray="6 2 1.5 2" opacity=".7"');
 });
 S.axis(L.sx-12,cy,L.sx+w+12,cy);
 var fx=L.fx,n=Math.max(8,Math.min(48,Math.floor(2*Math.PI*cr/(g*1.18))));
 front(S,fx,cy,R,[[R,'none',1.5],[ro,'none',1.1],[ri,'none',1.1],[r,'none',1.5]],g/2*0.92,cr,n);
 stdDims(S,L,ctx,v);titles(S,L);
 return {svg:S.out(),keys:[{k:'d',l:lab(ctx,RE_d,'İç Çap (d)'),v:fmt(v.d)+' mm'},{k:'D',l:lab(ctx,RE_D,'Dış Çap (D)'),v:fmt(v.D)+' mm'},{k:'B',l:lab(ctx,RE_B,'Genişlik (B)'),v:fmt(v.B)+' mm'}]}}

/* ========== Kombine iğneli: NKX (iğne + eksenel bilya, kapaklı Z) / NX (kapaksız) / NKXR (iğne + eksenel silindirik makara) ========== */
function grooveV(bx,rc,rg,xf,toRight){var dx=Math.abs(xf-bx);if(dx>=rg)return [];var t0=Math.acos(dx/rg),o=[],i,N=10;for(i=0;i<=N;i++){var t=-t0+2*t0*i/N;o.push([toRight?bx+rg*Math.cos(t):bx-rg*Math.cos(t),rc+rg*Math.sin(t)])}return o}
function nkx(ctx,opt,kind){
 var v=basic(ctx);if(!v)return null;
 var k2=1.24,L=layout(v.D*k2,v.B,2,80),S=mk(opt,L.H,L.kf),s=L.s,cy=L.cy,R=v.D/2*s,r=v.d/2*s,w=L.w,T=R-r,X=sec(S,L.sx,cy),sx=L.sx,c=1;
 var R2=R*k2,to=Math.max(1.8,T*0.3),ro=R-to,dw=ro-r,cov=kind!='nx'||/\bZ\b/.test(up(ctx.title)+' '+model(ctx)),rol=kind=='nkxr';
 var ax=Math.min(w*0.44,Math.max(w*0.3,(R2-r)*0.62)),ts=cov?Math.max(0.9,Math.min(1.4,ax*0.08)):0;
 var tw=Math.max(1.6,ax*0.24),tf=Math.max(1.6,ax*0.2),xw0=cov?ts+0.6:0,xw1=xw0+tw,xf0=ax-tf,xf1=ax;
 var gapx=xf0-xw1,rb=rol?gapx/2:gapx/2*1.08,bx=(xw1+xf0)/2,rc=(r+R2-ts)/2,rg=rb*1.03;
 var hr=rol?Math.min(rb*1.7,(R2-ts-r)*0.3):rb*1.3;
 var rw=Math.min(rc-hr-0.6,ro),rtop=rc+hr+0.4,lw=Math.max(1.6,Math.min(w*0.06,3)),gl=dw*0.38,cw=Math.max(1.1,Math.min(w*0.045,2.6));
 both(function(g){
  /* dış bilezik + eksenel yatak flanşı */
  var o=[[xf0,R2-ts-0.4],[xf1,R2-ts-0.4],[xf1,R],[w-c,R],[w,R-c],[w,ro-gl],[w-lw,ro-gl],[w-lw,ro],[xf1,ro],[xf1,rw],[xf0,rw]];
  if(!rol)o=o.concat(grooveV(bx,rc,rg,xf0,true));
  S.poly(X.P(o,g),S.hat);
  /* mil pulu */
  var sw=[[xw0,r+0.3],[xw1,r+0.3]];if(!rol)sw=sw.concat(grooveV(bx,rc,rg,xw1,false));sw.push([xw1,rtop],[xw0,rtop]);
  S.poly(X.P(sw,g),S.hat);
  /* kapak (Z) */
  if(cov)S.poly(X.P([[0,rc-rb*0.2],[ts,rc-rb*0.2],[ts,R2-ts],[xf0+tf*0.55,R2-ts],[xf0+tf*0.55,R2],[0,R2]],g),'#2b3550',0.9);
  /* eksenel yuvarlanma elemanı */
  if(rol){S.poly(X.P([[xw1+gapx*0.5-0.5,rc-hr-0.3],[xw1+gapx*0.5+0.5,rc-hr-0.3],[xw1+gapx*0.5+0.5,rc+hr+0.3],[xw1+gapx*0.5-0.5,rc+hr+0.3]],g),'#5b6680',0.6);
   S.poly(X.P(rrect(xw1+0.25,rc-hr*0.86,xf0-0.25,rc+hr*0.86,Math.min(0.8,gapx*0.15)),g),ROLL,1.1)}
  else{var B0=X.P([[bx,rc]],g)[0];S.circ(B0[0],B0[1],rb,ROLL,1.1)}
  /* radyal iğne + kafes */
  var x0=xf1+0.8,x1=w-lw-0.6;
  S.poly(X.P([[x0,r+dw*0.18],[x0+cw,r+dw*0.18],[x0+cw,r+dw*0.86],[x0,r+dw*0.86]],g),'#5b6680',0.8);
  S.poly(X.P([[x1-cw,r+dw*0.18],[x1,r+dw*0.18],[x1,r+dw*0.86],[x1-cw,r+dw*0.86]],g),'#5b6680',0.8);
  S.poly(X.P(rrect(x0+cw+0.6,r+0.25,x1-cw-0.6,ro-0.25,dw*0.32),g),ROLL,1.1);
 });
 S.line(sx+xw1,cy-r,sx+w+6,cy-r,0.7,' stroke-dasharray="3 2" opacity=".6"');S.line(sx+xw1,cy+r,sx+w+6,cy+r,0.7,' stroke-dasharray="3 2" opacity=".6"');
 S.axis(sx-12,cy,sx+w+12,cy);
 /* ön görünüş (iğneli taraftan) */
 var fx=L.fx,pitch=r+dw/2,n=Math.max(8,Math.min(48,Math.floor(2*Math.PI*pitch/(dw*1.18))));
 S.fon(fx,cy);S.circ(fx,cy,R2,'none',1);S.foff();
 front(S,fx,cy,R2,[[R,'none',1.5],[ro,'none',1.1],[r,'none',0.8,' stroke-dasharray="3 2"']],dw/2*0.92,pitch,n);
 stdDims(S,L,ctx,v,R2);titles(S,L);
 return {svg:S.out(),keys:[{k:'d',l:lab(ctx,RE_d,'İç Çap (d)'),v:fmt(v.d)+' mm'},{k:'D',l:lab(ctx,RE_D,'Dış Çap (D)'),v:fmt(v.D)+' mm'},{k:'B',l:lab(ctx,RE_B,'Genişlik (B)'),v:fmt(v.B)+' mm'}]}}

var DRAW={rax:rax,nkx:function(c,o){return nkx(c,o,'nkx')},nx:function(c,o){return nkx(c,o,'nx')},nkxr:function(c,o){return nkx(c,o,'nkxr')},nkia:function(c,o){return nkia(c,o,'nkia')},nkib:function(c,o){return nkia(c,o,'nkib')},nk:function(c,o){return needle(c,o,'nk')},ir:function(c,o){return needle(c,o,'ir')},hk:function(c,o){return needle(c,o,'hk')},bk:function(c,o){return needle(c,o,'bk')},
 sf:spherical,cy_nu:function(c,o){return cylindrical(c,o,'nu')},cy_nj:function(c,o){return cylindrical(c,o,'nj')},cy_nup:function(c,o){return cylindrical(c,o,'nup')},cy_n:function(c,o){return cylindrical(c,o,'n')},cy_nn:function(c,o){return cylindrical(c,o,'nn')}};
var API={
 match:function(ctx){return !!subtype(ctx)},
 subtype:subtype,
 draw:function(ctx,opt){var t=subtype(ctx);if(!t||!DRAW[t])return null;try{return DRAW[t](ctx,opt||{})}catch(e){return null}}
};
(window.YDRAW=window.YDRAW||{})['makarali']=API;
})();
