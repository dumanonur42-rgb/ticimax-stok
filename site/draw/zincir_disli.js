/* Zincir dişli + makaralı zincir teknik çizimi. Yazılan her sayı ürün sayfasından ya da
   ürün fotoğrafındaki ölçü tablosundan (ctx.data) gelir; eksikse null. */
(function(){
var C='#16203a',HAT='#9aa6bd',PI=Math.PI;
function norm(s){return String(s||'').replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase().replace(/ı/g,'i').replace(/ş/g,'s').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/\s+/g,' ')}
function f(n){return String(Math.round(n*1000)/1000).replace('.',',')}
function r1(n){return Math.round(n*10)/10}
function spec(ctx,re){var a=(ctx.specs||[]).concat(ctx.onyazi||[]);for(var i=0;i<a.length;i++)if(re.test(norm(a[i].l)))return a[i].v;return null}
function num(ctx,v){if(v==null)return NaN;if(ctx&&ctx.num)return ctx.num(v);var m=String(v).replace(',','.').match(/[\d.]+/);return m?parseFloat(m[0]):NaN}
var EXCL=/kaplin|pinyon|kremayer|sprey|yaglama|halat|frez|rulman|kece|yatak|burc|segman|manson|lineer|kasnak|kayis/;
function kind(ctx){
  var t=norm(ctx.title),c=norm((ctx.crumbs||[]).join(' / '));
  if(EXCL.test(t))return null;
  var cat=/zincir - zincir dislisi|zincir disliler|zincirler/.test(c);
  if(/zincir disli/.test(t)&&(cat||!c)){
    var ty=norm(spec(ctx,/^(urun tipi|tip)$/)||'')+' '+t;
    if(/cift sira/.test(ty))return 'cift';if(/tek sira/.test(ty))return 'tek';return 'disli';}
  if(/\bzincir$/.test(t)&&(/zincirler/.test(c)||(!c&&/^\d{2}[0-9b]-\d/.test(t))))return 'zincir';
  return null;
}
function defs(id,dim){return '<defs><pattern id="'+id+'h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+HAT+'" stroke-width="1.1"/></pattern>'+
 '<pattern id="'+id+'g" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="4" stroke="'+HAT+'" stroke-width="1"/></pattern>'+
 '<marker id="'+id+'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1.5 L10,5 L0,8.5z" fill="'+dim+'"/></marker></defs>'}
function P(x,y){return x.toFixed(1)+','+y.toFixed(1)}
function ln(x1,y1,x2,y2,a){return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" '+(a||'')+'/>'}
function txt(x,y,s,dim,a){return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" fill="'+dim+'" font-size="12" font-weight="700" text-anchor="middle" '+(a||'')+'>'+s+'</text>'}
function ttl(x,y,s,dim){return '<text x="'+x+'" y="'+y+'" fill="'+dim+'" font-size="10" letter-spacing="1.5" text-anchor="middle" opacity=".75">'+s+'</text>'}
function CL(x1,y1,x2,y2){return ln(x1,y1,x2,y2,'stroke="'+C+'" stroke-width=".7" stroke-dasharray="10 3 2 3" opacity=".6"')}
function EXT(x1,y1,x2,y2,dim){return ln(x1,y1,x2,y2,'stroke="'+dim+'" stroke-width=".6" opacity=".55"')}
/* ölçü: iki uç arası oklu çizgi; dar ise oklar dışarıdan */
function dimL(id,dim,x1,y1,x2,y2){var L=Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1)),a='stroke="'+dim+'" stroke-width="1.1"';
  if(L>=26)return ln(x1,y1,x2,y2,a+' marker-start="url(#'+id+'a)" marker-end="url(#'+id+'a)"');
  var ux=(x2-x1)/L,uy=(y2-y1)/L;return ln(x1,y1,x2,y2,'stroke="'+dim+'" stroke-width=".8"')+ln(x1-ux*13,y1-uy*13,x1,y1,a+' marker-end="url(#'+id+'a)"')+ln(x2+ux*13,y2+uy*13,x2,y2,a+' marker-end="url(#'+id+'a)"')}
function svg(h,id,dim,g){return '<svg viewBox="0 0 460 '+h+'" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;font-family:inherit">'+defs(id,dim)+g+'</svg>'}

/* ---------- zincir dişli ---------- */
/* B serisi makaralı zincir [b1, b2] mm — ürün fotoğrafındaki DIN ISO tablosundan (04b-1-14-1-zincir 2. foto); sadece kesit oranı için, yazılmaz */
var BTAB={'0.375':[5.72,8.53],'0.5':[7.75,11.3],'0.625':[9.65,13.28],'0.75':[11.68,15.62],'1':[17.02,25.42],'1.25':[19.56,29.01],'1.5':[25.4,37.92]};
function pitch(v){ // '3/8*1', '(24B) 1"1/2*2', '1*2', '1"1/4*1'
  if(!v)return null;var s=String(v).replace(/\s+/g,' ').trim(),code=null,m=s.match(/^\(([0-9]{2}[AB])\)\s*/i);
  if(m){code=m[1].toUpperCase();s=s.slice(m[0].length)}
  var k=s.lastIndexOf('*');if(k<0)return null;var rows=parseInt(s.slice(k+1),10),ps=s.slice(0,k).replace(/''|"|″/g,' ').replace(/\s+/g,' ').trim();
  m=ps.match(/^(?:(\d+)(?: |$))?(?:(\d+)\/(\d+))?$/);if(!m||(!m[1]&&!m[2])||!(rows>0))return null;
  var inch=(m[1]?+m[1]:0)+(m[2]?m[2]/m[3]:0);if(!(inch>0))return null;
  var lab=(m[1]?m[1]:'')+(m[1]&&m[2]?' ':'')+(m[2]?m[2]+'/'+m[3]:'')+'″';
  return {inch:inch,rows:rows,lab:lab,code:code};
}
function sprocket(ctx,o,ty){
  var z=num(ctx,spec(ctx,/^dis sayisi$/)),pc=pitch(spec(ctx,/^zincir olcusu$/));
  if(!(z>=6&&z<=200&&z==Math.round(z))||!pc)return null;
  if(ty=='tek'&&pc.rows!=1||ty=='cift'&&pc.rows!=2||pc.rows>3)return null;
  var dim=o.dim||'#0a2350',id=o.id||'zd',n=pc.rows;
  /* oranlar ISO 606 profil oranlarıyla (hatve birimi); ekrana yazılmaz */
  var Rp=.5/Math.sin(PI/z),rr=.335,ri=.34,Ra=Rp+.27,Rf=Rp-ri,al=(70-45/z)*PI/180;
  /* diş genişliği: aynı hatvedeki B serisi zincirin b1 (iç genişlik) değerinin %90'ı; sıralar arası adım şematik (tabloda yok) */
  var CT=BTAB[String(pc.inch)],pmm=pc.inch*25.4,bf=CT?.9*CT[0]/pmm:.55,pt=CT?1.22*CT[1]/pmm:1.25;
  var Rh=Math.min(Rf-.36,2.5),Rb=Rh*.42,Lh=n>1?.9:1.05,Wt=Lh+(n-1)*pt+bf;
  var s=84/Ra,fx=128,cy=134,g='';
  function X(r,t){return fx+r*s*Math.cos(t)}function Y(r,t){return cy-r*s*Math.sin(t)}
  /* diş profili */
  var t0=PI/2+PI/z,st=2*PI/z,d='',dl=.06/Ra;
  for(var i=0;i<z;i++){var th=t0+i*st,cx=Rp*Math.cos(th),cyy=Rp*Math.sin(th);
    for(var j=0;j<=6;j++){var ph=th+PI+al-2*al*j/6,x=cx+ri*Math.cos(ph),y=cyy+ri*Math.sin(ph);d+=(i==0&&j==0?'M':'L')+P(fx+x*s,cy-y*s)}
    var ex=cx+ri*Math.cos(th+PI-al),ey=cyy+ri*Math.sin(th+PI-al),rE=Math.sqrt(ex*ex+ey*ey),aE=Math.atan2(ey,ex);
    while(aE<th-1)aE+=2*PI;var aT=th+PI/z-dl,aT2=th+PI/z+dl,nth=th+st;
    var ex2=Rp*Math.cos(nth)+ri*Math.cos(nth+PI+al),ey2=Rp*Math.sin(nth)+ri*Math.sin(nth+PI+al),aE2=Math.atan2(ey2,ex2);while(aE2<aT2-1)aE2+=2*PI;
    var rc=rE+.55*(Ra-rE);
    d+='Q'+P(X(rc,aE+.25*(aT-aE)),Y(rc,aE+.25*(aT-aE)))+' '+P(X(Ra,aT),Y(Ra,aT))+'L'+P(X(Ra,aT2),Y(Ra,aT2))+'Q'+P(X(rc,aE2-.25*(aE2-aT2)),Y(rc,aE2-.25*(aE2-aT2)))+' '+P(fx+ex2*s,cy-ey2*s);}
  g+='<g class="hl" data-k="z"><path d="'+d+'Z" fill="#fff" fill-opacity=".001" stroke="'+C+'" stroke-width="1.4" stroke-linejoin="round"/>';
  /* z etiketi: sağ alttaki bir diş ucuna kılavuz */
  var best=0,bd=9;for(i=0;i<z;i++){var ta=PI/2+i*st,dd=Math.abs(Math.atan2(Math.sin(ta+PI/4),Math.cos(ta+PI/4)));if(dd<bd){bd=dd;best=ta}}
  var tx=X(Ra,best),ty2=Y(Ra,best),lx=Math.max(tx+16,fx+Ra*s*.62+18),ly=Math.min(Math.max(ty2+16,cy+Ra*s*.62+14),236);
  g+='<circle cx="'+tx.toFixed(1)+'" cy="'+ty2.toFixed(1)+'" r="1.8" fill="'+dim+'"/>'+ln(tx,ty2,lx,ly,'stroke="'+dim+'" stroke-width=".9"')+ln(lx,ly,lx+48,ly,'stroke="'+dim+'" stroke-width=".9"')+txt(lx+24,ly-4,'z = '+z,dim)+'</g>';
  /* göbek + delik (ön görünüş, göbek tarafından) */
  g+='<g fill="none" stroke="'+C+'"><circle cx="'+fx+'" cy="'+cy+'" r="'+(Rh*s).toFixed(1)+'" stroke-width="1.4"/><circle cx="'+fx+'" cy="'+cy+'" r="'+((Rh-.08)*s).toFixed(1)+'" stroke-width=".6" opacity=".6"/><circle cx="'+fx+'" cy="'+cy+'" r="'+(Rb*s).toFixed(1)+'" stroke-width="1.4"/><circle cx="'+fx+'" cy="'+cy+'" r="'+((Rb+.06)*s).toFixed(1)+'" stroke-width=".6" opacity=".6"/></g>';
  /* bölüm dairesi + eksenler */
  g+='<circle cx="'+fx+'" cy="'+cy+'" r="'+(Rp*s).toFixed(1)+'" fill="none" stroke="'+C+'" stroke-width=".7" stroke-dasharray="10 3 2 3" opacity=".6"/>'+CL(fx-Ra*s-8,cy,fx+Ra*s+8,cy)+CL(fx,cy-Ra*s-8,fx,cy+Ra*s+8);
  /* p: üstteki iki makara yuvası arası */
  var xa=fx-s/2,xb=fx+s/2,yr=cy-Rp*s*Math.cos(PI/z),yd=cy-Ra*s-12,rp=rr*s;
  g+='<g class="hl" data-k="p"><g fill="none" stroke="'+dim+'" stroke-width=".8" stroke-dasharray="3 2"><circle cx="'+xa.toFixed(1)+'" cy="'+yr.toFixed(1)+'" r="'+rp.toFixed(1)+'"/><circle cx="'+xb.toFixed(1)+'" cy="'+yr.toFixed(1)+'" r="'+rp.toFixed(1)+'"/></g>'+
   EXT(xa,yr,xa,yd-4,dim)+EXT(xb,yr,xb,yd-4,dim)+dimL(id,dim,xa,yd,xb,yd)+txt(fx,yd-6,'p = '+pc.lab+(pc.code?' ('+pc.code+')':''),dim)+'</g>';
  g+=ttl(fx,12,'ÖN GÖRÜNÜŞ',dim);
  /* kesit A-A: B tipi (tek taraflı göbek), gövde + göbek tek parça */
  var full=bf*s>=18&&Wt*s<=150,Ss=s,yA=cy,brk=false,rb1=0,rb2=0,G=14,H=168;
  if(!full){yA=cy+84;Ss=Math.min(150/Wt,Math.max(110/Wt,.75*H/Ra));
    if(Ra*Ss>H){rb1=Rh+.3;rb2=Rf-.5;if(rb2-rb1>.6){brk=true;Ss=Math.min(Ss,(H-G)/(rb1+Ra-rb2))}else Ss=H/Ra}}
  function M(r){return !brk||r<=rb1?r*Ss:rb1*Ss+G+(r-rb2)*Ss}
  var W=Wt*Ss,xs=352-W/2,c=.06;
  function SX(x){return xs+x*Ss}function SY(r,sg){return yA-sg*M(r)}
  function wave(x1,x2,r,sg){var y=SY(r,sg),w=x2-x1;return 'C'+P(SX(x1+w/3),y-4)+' '+P(SX(x1+2*w/3),y+4)+' '+P(SX(x2),y)}
  function teeth(){var a=[],k;for(k=0;k<n;k++){var x0=Lh+k*pt,ch=Math.min(.13,bf*.22);if(k>0)a.push([x0,Rf-.08]);a.push([x0,Rp-.05]);a.push([x0+ch,Ra]);a.push([x0+bf-ch,Ra]);a.push([x0+bf,Rp-.05]);if(k<n-1)a.push([x0+bf,Rf-.08])}return a}
  function pl(a,sg){return a.map(function(q,i){return (i?'L':'M')+P(SX(q[0]),SY(q[1],sg))}).join('')}
  var sec='',sgs=full?[1,-1]:[1];
  sgs.forEach(function(sg){
    var hub=[[0,Rb+c],[0,Rh-c],[c,Rh],[Lh,Rh]];
    if(!brk)sec+=pl(hub.concat(teeth(),[[Wt,Rb+c],[Wt-c,Rb],[c,Rb]]),sg)+'Z';
    else{sec+=pl(hub.concat([[Lh,rb1]]),sg)+wave(Lh,Wt,rb1,sg)+pl([[Wt,Rb+c],[Wt-c,Rb],[c,Rb]],sg).replace('M','L')+'Z';
      sec+=pl([[Lh,rb2]].concat(teeth(),[[Wt,rb2]]),sg)+wave(Wt,Lh,rb2,sg)+'Z';}
  });
  g+='<path d="'+sec+'" fill="url(#'+id+'h)" stroke="'+C+'" stroke-width="1.4" stroke-linejoin="round"/>';
  if(brk)g+='<g fill="none" stroke="'+C+'" stroke-width=".8"><path d="M'+P(SX(Lh-.04),SY(rb1,1))+wave(Lh-.04,Wt+.04,rb1,1)+'"/><path d="M'+P(SX(Lh-.04),SY(rb2,1))+wave(Lh-.04,Wt+.04,rb2,1)+'"/></g>';
  /* delik (eksen boyunca) + eksen çizgileri */
  g+=ln(SX(0),SY(Rb,1),SX(Wt),SY(Rb,1),'stroke="'+C+'" stroke-width="1.4"');
  if(full)g+=ln(SX(0),SY(Rb,-1),SX(Wt),SY(Rb,-1),'stroke="'+C+'" stroke-width="1.4"');
  for(var k=0;k<n;k++){var x0=Lh+k*pt;sgs.forEach(function(sg){g+=CL(SX(x0)-4,SY(Rp,sg),SX(x0+bf)+4,SY(Rp,sg))});
    g+=CL(SX(x0+bf/2),SY(Ra,1)-4,SX(x0+bf/2),SY(full?Rf:(brk?rb2:Rf),1)+6);if(full)g+=CL(SX(x0+bf/2),SY(Ra,-1)+4,SX(x0+bf/2),SY(Rf,-1)-6)}
  g+=CL(xs-10,yA,xs+W+10,yA);
  /* sıra etiketi: kısa kılavuz çizgileri ile */
  var yT=SY(Ra,1),xm=[],lab=n==1?'TEK SIRA':n==2?'ÇİFT SIRA':n+' SIRA';
  for(k=0;k<n;k++)xm.push(SX(Lh+k*pt+bf/2));
  var xc=n>1?(xm[0]+xm[n-1])/2:xm[0]+26,yl=yT-15;
  g+='<g class="hl" data-k="n">';xm.forEach(function(x){g+=ln(n>1?xc:xm[0]+8,yl,x,yT-2,'stroke="'+dim+'" stroke-width=".9"')+'<circle cx="'+x.toFixed(1)+'" cy="'+(yT-2).toFixed(1)+'" r="1.8" fill="'+dim+'"/>'});
  g+=txt(xc,yl-4,lab,dim)+'</g>'+ttl(352,12,'KESİT A-A'+(Ss>s*1.05?' (BÜYÜTÜLMÜŞ)':''),dim);
  var keys=[{k:'z',l:'Diş Sayısı (z)',v:String(z)},{k:'p',l:'Zincir Hatvesi (p)',v:pc.lab+(pc.code?' ('+pc.code+')':'')},{k:'n',l:'Sıra Sayısı',v:n+(n==1?' (Tek sıra)':n==2?' (Çift sıra)':'')}];
  return {svg:svg(250,id,dim,g),keys:keys};
}

/* ---------- makaralı zincir ---------- */
function chain(ctx,o){
  var D=ctx.data||{},p=num(ctx,spec(ctx,/^adim$/)),code=spec(ctx,/^din iso kodu$/);
  var b1=D.b1,b2=D.b2,d1=D.d1,d3=D.d3,F1=D.F1,h=D.h;
  if(!(p>0)||!(b1>0&&b2>b1&&d1>0&&d3>d1&&F1>b2&&h>d3))return null;
  if(D.p&&Math.abs(D.p-p)>.01)return null;
  if(D.code&&code&&norm(D.code)!=norm(code))return null;
  var dim=o.dim||'#0a2350',id=o.id||'zc',g='';
  var s=Math.min(352/(3*p+h+F1),118/h,240/(3*p+h)),cy=98,R=h/2*s,x0=32+R,L=x0+3*p*s+R;
  /* plaka (8 biçimi) */
  function plate(xa,xb,rh,hw){var be=40*PI/180,sx=rh*Math.sin(be),sy=rh*Math.cos(be),m=(xa+xb)/2,qy=2*(cy-hw)-(cy-sy),qy2=2*(cy+hw)-(cy+sy);
    return 'M'+P(xa+sx,cy-sy)+'Q'+P(m,qy)+' '+P(xb-sx,cy-sy)+'A'+rh.toFixed(1)+' '+rh.toFixed(1)+' 0 1 1 '+P(xb-sx,cy+sy)+'Q'+P(m,qy2)+' '+P(xa+sx,cy+sy)+'A'+rh.toFixed(1)+' '+rh.toFixed(1)+' 0 1 1 '+P(xa+sx,cy-sy)+'Z'}
  var px=[0,1,2,3].map(function(k){return x0+k*p*s});
  g+='<path d="'+plate(px[1],px[2],R*.97,R*.74)+'" fill="#f4f6fa" stroke="'+C+'" stroke-width="1.3"/>';
  g+='<path d="'+plate(px[0],px[1],R,R*.78)+plate(px[2],px[3],R,R*.78)+'" fill="#fff" stroke="'+C+'" stroke-width="1.4"/>';
  px.forEach(function(x){g+='<circle cx="'+x.toFixed(1)+'" cy="'+cy+'" r="'+(d3/2*s).toFixed(1)+'" fill="none" stroke="'+C+'" stroke-width=".8" stroke-dasharray="3 2" opacity=".75"/><circle cx="'+x.toFixed(1)+'" cy="'+cy+'" r="'+(d1/2*s).toFixed(1)+'" fill="#fff" stroke="'+C+'" stroke-width="1.4"/>'+CL(x,cy-R-6,x,cy+R+6)});
  g+=CL(x0-R-8,cy,L+8,cy);
  /* p ölçüsü (alt) ve h ölçüsü (sol) */
  var yp=cy+R+16;
  g+='<g class="hl" data-k="p">'+EXT(px[1],cy+d1/2*s+2,px[1],yp+4,dim)+EXT(px[2],cy+d1/2*s+2,px[2],yp+4,dim)+dimL(id,dim,px[1],yp,px[2],yp)+txt((px[1]+px[2])/2,yp+15,'p = '+f(p),dim)+'</g>';
  var xh=x0-R-14;
  g+='<g class="hl" data-k="h">'+EXT(x0,cy-R,xh-4,cy-R,dim)+EXT(x0,cy+R,xh-4,cy+R,dim)+dimL(id,dim,xh,cy-R,xh,cy+R)+txt(xh-6,cy,f(h),dim,'transform="rotate(-90 '+(xh-6).toFixed(1)+' '+cy+')"')+'</g>';
  g+=ttl((x0-R+L)/2,13,'YAN GÖRÜNÜŞ',dim);
  /* kesit (pim ekseninden) */
  var xc=L+(452-L)/2+4,ti=(b2-b1)/2,to=Math.min(ti,.7*(F1-b2)/2),db=d1+.42*(d3-d1),hh=h/2*s;
  function rc(xa,xb,ya,yb,fill){return '<rect x="'+Math.min(xa,xb).toFixed(1)+'" y="'+Math.min(ya,yb).toFixed(1)+'" width="'+Math.abs(xb-xa).toFixed(1)+'" height="'+Math.abs(yb-ya).toFixed(1)+'" fill="'+fill+'" stroke="'+C+'" stroke-width="1.3"/>'}
  var X=function(u){return xc+u*s},hp='url(#'+id+'h)',hg='url(#'+id+'g)';
  [-1,1].forEach(function(sg){
    g+=rc(X(sg*b2/2),X(sg*(b2/2+to)),cy-hh*.97,cy+hh*.97,hp);   /* dış plaka */
    g+=rc(X(sg*b1/2),X(sg*b2/2),cy-hh*.95,cy+hh*.95,hg);        /* iç plaka */
  });
  [-1,1].forEach(function(sg){g+=rc(X(-b1/2+.15),X(b1/2-.15),cy+sg*db/2*s,cy+sg*d3/2*s,hp)}); /* makara */
  [-1,1].forEach(function(sg){g+=rc(X(-b2/2),X(b2/2),cy+sg*d1/2*s,cy+sg*db/2*s,hg)});          /* burç */
  g+=rc(X(-F1/2),X(F1/2),cy-d1/2*s,cy+d1/2*s,'#fff');                                            /* pim (kesilmez) */
  g+=CL(X(-F1/2)-8,cy,X(F1/2)+8,cy)+CL(xc,cy-hh-6,xc,cy+hh+6);
  /* b1 (üst), F1 (alt), d1 (sol), d3 (sağ) */
  var yb=cy-hh-13;
  g+='<g class="hl" data-k="b1">'+EXT(X(-b1/2),cy-d3/2*s-1,X(-b1/2),yb-4,dim)+EXT(X(b1/2),cy-d3/2*s-1,X(b1/2),yb-4,dim)+dimL(id,dim,X(-b1/2),yb,X(b1/2),yb)+txt(xc,yb-5,f(b1),dim)+'</g>';
  var yF=cy+hh+16;
  g+='<g class="hl" data-k="F1">'+EXT(X(-F1/2),cy+d1/2*s+1,X(-F1/2),yF+4,dim)+EXT(X(F1/2),cy+d1/2*s+1,X(F1/2),yF+4,dim)+dimL(id,dim,X(-F1/2),yF,X(F1/2),yF)+txt(xc,yF+15,f(F1),dim)+'</g>';
  var xd=X(-F1/2)-12;
  g+='<g class="hl" data-k="d1">'+EXT(X(-F1/2)-1,cy-d1/2*s,xd-4,cy-d1/2*s,dim)+EXT(X(-F1/2)-1,cy+d1/2*s,xd-4,cy+d1/2*s,dim)+dimL(id,dim,xd,cy-d1/2*s,xd,cy+d1/2*s)+txt(xd-6,cy,'ø'+f(d1),dim,'transform="rotate(-90 '+(xd-6).toFixed(1)+' '+cy+')"')+'</g>';
  var xe=X(F1/2)+12;
  g+='<g class="hl" data-k="d3">'+EXT(X(b1/2-.15)+1,cy-d3/2*s,xe+4,cy-d3/2*s,dim)+EXT(X(b1/2-.15)+1,cy+d3/2*s,xe+4,cy+d3/2*s,dim)+dimL(id,dim,xe,cy-d3/2*s,xe,cy+d3/2*s)+txt(xe+14,cy,'ø'+f(d3),dim,'transform="rotate(-90 '+(xe+14).toFixed(1)+' '+cy+')"')+'</g>';
  g+=ttl(xc,13,'KESİT A-A',dim);
  var keys=[{k:'p',l:'Adım (p)',v:f(p)+' mm'},{k:'b1',l:'İç Genişlik (b1)',v:f(b1)+' mm'},{k:'d3',l:'Makara Çapı (d3)',v:f(d3)+' mm'},{k:'d1',l:'Pim Çapı (d1)',v:f(d1)+' mm'},{k:'h',l:'Plaka Yüksekliği (h)',v:f(h)+' mm'},{k:'F1',l:'Pim Boyu (F1)',v:f(F1)+' mm'}];
  return {svg:svg(200,id,dim,g),keys:keys};
}

(window.YDRAW=window.YDRAW||{})['zincir_disli']={
  match:function(ctx){return !!kind(ctx)},
  kind:kind,
  draw:function(ctx,opt){var k=kind(ctx);opt=opt||{};if(!k)return null;try{return k=='zincir'?chain(ctx,opt):sprocket(ctx,opt,k)}catch(e){return null}}
};
})();
