/* Bağlantı ve tutucu parçalar: manşon somunu (KM), manşon pulu (MB), segman (DIN 471 / 472), konik burç (taper lock), kama (DIN 6885), konik kilit (çizim yok: veri çelişkili) */
(function(){
var LC='#16203a',HC='#9aa6bd',FACE='rgba(154,166,189,.13)',PI=Math.PI;
var TR={'İ':'i','I':'i','ı':'i','Ş':'s','ş':'s','Ğ':'g','ğ':'g','Ü':'u','ü':'u','Ö':'o','ö':'o','Ç':'c','ç':'c'};
function fold(s){return String(s||'').replace(/[İIıŞşĞğÜüÖöÇç]/g,function(c){return TR[c]}).toLowerCase().replace(/\u0307/g,'').replace(/\s+/g,' ').trim()}
function numOf(ctx,v){var n=NaN;if(ctx&&typeof ctx.num=='function')n=ctx.num(v);if(typeof n!='number'||isNaN(n)){var m=String(v).match(/\d+(?:[.,]\d+)?/);n=m?parseFloat(m[0].replace(',','.')):NaN}return n}
function f(n){return String(Math.round(n*100)/100).replace('.',',')}
function r2(n){return Math.round(n*100)/100}
/* sayfa değeri: specs + onyazi; iki kaynak farklı sayı verirse çelişki -> null */
function val(ctx,re,key){var out=null,bad=false;
 [ctx.specs||[],ctx.onyazi||[]].forEach(function(a){for(var i=0;i<a.length;i++){var s=a[i];if(!s||!re.test(fold(s.l)))continue;var n=numOf(ctx,s.v);if(!(n>0))continue;if(out!==null&&Math.abs(out-n)>1e-6)bad=true;if(out===null)out=n}});
 var d=ctx.data;if(d&&key&&typeof d[key]=='number'&&d[key]>0){if(out!==null&&Math.abs(out-d[key])>1e-6)bad=true;if(out===null)out=d[key]}
 return bad?null:out}
function sval(ctx,re){var out=null,bad=false;
 [ctx.specs||[],ctx.onyazi||[]].forEach(function(a){for(var i=0;i<a.length;i++){var s=a[i];if(!s||!re.test(fold(s.l)))continue;var v=String(s.v||'').replace(/\s+/g,'');if(!v)continue;if(out!==null&&fold(out)!=fold(v))bad=true;if(out===null)out=v}});
 return bad?null:out}

/* ---------- alt tip tanıma ---------- */
function sub(ctx){var t=fold(ctx.title),cr=(ctx.crumbs||[]).map(fold),mid=cr.slice();
 if(mid.length&&mid[0]=='anasayfa')mid.shift();if(mid.length&&mid[mid.length-1]==t)mid.pop();
 var cj='|'+mid.join('|')+'|';
 var msp=cj.indexOf('|manson somun ve pul|')>=0;
 if(msp&&cj.indexOf('|somun|')>=0)return 'km';
 if(msp&&cj.indexOf('|pul|')>=0)return 'mb';
 if(cj.indexOf('|471 dis segman|')>=0)return 's471';
 if(cj.indexOf('|472 ic segman|')>=0)return 's472';
 if(cj.indexOf('|konik burclar|')>=0)return 'burc';
 if(cj.indexOf('|konik kilitler|')>=0)return 'kilit';
 if(cj.indexOf('|kama|')>=0)return 'kama';
 if(mid.length>1)return null; /* belirli bir kategorideyse sadece breadcrumb'a güven */
 if(/\bmanson somunu\b/.test(t))return 'km';
 if(/\bmanson pulu\b/.test(t))return 'mb';
 if(/\b471\b.*\bdis segman\b/.test(t))return 's471';
 if(/\b472\b.*\bic segman\b/.test(t))return 's472';
 if(/\bkonik burc\b/.test(t))return 'burc';
 if(/\bkonik kilit\b/.test(t))return 'kilit';
 if(/\bkama\b/.test(t)&&/\bdin ?6885\b/.test(t))return 'kama';
 return null}

/* ---------- çizim kalemi ---------- */
function Pen(opt){opt=opt||{};this.id=String(opt.id||'bg')+'-';this.dim=opt.dim||'#0a2350';this.o=''}
var P=Pen.prototype;
P.add=function(s){this.o+=s;return this};
P.svg=function(h){var id=this.id,dm=this.dim;
 return '<svg viewBox="0 0 460 '+h+'" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;font-family:inherit" font-family="inherit"><defs>'+
 '<pattern id="'+id+'h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+HC+'" stroke-width="1.1"/></pattern>'+
 '<marker id="'+id+'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,1.2 L10,5 L0,8.8z" fill="'+dm+'"/></marker>'+
 '</defs>'+this.o+'</svg>'};
function n1(v){return Math.round(v*100)/100}
P.ln=function(x1,y1,x2,y2,k){var a={v:'stroke="'+LC+'" stroke-width="1.6"',t:'stroke="'+LC+'" stroke-width=".8"',c:'stroke="'+LC+'" stroke-width=".7" stroke-dasharray="12 3 2 3" opacity=".65"',h:'stroke="'+LC+'" stroke-width="1" stroke-dasharray="4 2.5"',p:'stroke="'+LC+'" stroke-width=".8" stroke-dasharray="12 3 2 3 2 3" opacity=".6"',x:'stroke="'+this.dim+'" stroke-width=".6" opacity=".55"',cut:'stroke="'+LC+'" stroke-width="2.4"'}[k||'v'];
 return this.add('<line x1="'+n1(x1)+'" y1="'+n1(y1)+'" x2="'+n1(x2)+'" y2="'+n1(y2)+'" '+a+'/>')};
P.path=function(d,fill,sw,extra){return this.add('<path d="'+d+'" fill="'+(fill||'none')+'" fill-rule="evenodd" stroke="'+LC+'" stroke-width="'+(sw||1.6)+'" stroke-linejoin="round"'+(extra||'')+'/>')};
P.hatch=function(d){return this.path(d,'url(#'+this.id+'h)',1.6)};
P.circ=function(cx,cy,r,k){var a={v:'stroke="'+LC+'" stroke-width="1.6"',t:'stroke="'+LC+'" stroke-width=".8"',p:'stroke="'+LC+'" stroke-width=".8" stroke-dasharray="12 3 2 3 2 3" opacity=".6"',h:'stroke="'+LC+'" stroke-width="1" stroke-dasharray="4 2.5"'}[k||'v'];
 return this.add('<circle cx="'+n1(cx)+'" cy="'+n1(cy)+'" r="'+n1(r)+'" fill="none" '+a+'/>')};
P.cross=function(cx,cy,rx,ry){this.ln(cx-rx,cy,cx+rx,cy,'c');return this.ln(cx,cy-(ry||rx),cx,cy+(ry||rx),'c')};
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}
P.txt=function(x,y,s,o){o=o||{};var tr=o.rot?' transform="rotate('+o.rot+' '+n1(x)+' '+n1(y)+')"':'';
 return '<text x="'+n1(x)+'" y="'+n1(y)+'" fill="'+(o.fill||this.dim)+'" font-size="'+(o.size||12)+'" font-weight="'+(o.w||700)+'" text-anchor="'+(o.a||'middle')+'"'+(o.ls?' letter-spacing="'+o.ls+'"':'')+(o.op?' opacity="'+o.op+'"':'')+' stroke="#fff" stroke-width="3.2" stroke-linejoin="round" paint-order="stroke"'+tr+'>'+esc(s)+'</text>'};
function tw(s,size){return String(s).length*(size||12)*.62}
P.title=function(x,y,s){return this.add('<text x="'+x+'" y="'+y+'" fill="'+this.dim+'" font-size="10" font-weight="700" letter-spacing="1.5" text-anchor="middle" opacity=".7">'+s+'</text>')};
P.arrow=function(x1,y1,x2,y2){return '<line x1="'+n1(x1)+'" y1="'+n1(y1)+'" x2="'+n1(x2)+'" y2="'+n1(y2)+'" stroke="'+this.dim+'" stroke-width="1.1" marker-end="url(#'+this.id+'a)"/>'};
P.arrow2=function(x1,y1,x2,y2){return '<line x1="'+n1(x1)+'" y1="'+n1(y1)+'" x2="'+n1(x2)+'" y2="'+n1(y2)+'" stroke="'+this.dim+'" stroke-width="1.1" marker-start="url(#'+this.id+'a)" marker-end="url(#'+this.id+'a)"/>'};
P.grp=function(k,s){return this.add('<g class="hl" data-k="'+k+'">'+s+'</g>')};
/* yatay ölçü: x1..x2 @ y; yazı üstte; dar ise oklar dışarıdan, yazı yanda (side 1 sağ, -1 sol) */
P.dimH=function(x1,x2,y,lab,k,side){var L=x2-x1,s='';
 if(L>=tw(lab)+22){s+=this.arrow2(x1,y,x2,y)+this.txt((x1+x2)/2,y-5,lab)}
 else{s+='<line x1="'+n1(x1)+'" y1="'+n1(y)+'" x2="'+n1(x2)+'" y2="'+n1(y)+'" stroke="'+this.dim+'" stroke-width="1.1"/>'+this.arrow(x1-13,y,x1,y)+this.arrow(x2+13,y,x2,y);
  if((side||1)>0)s+=this.txt(x2+16,y+4,lab,{a:'start'});else s+=this.txt(x1-16,y+4,lab,{a:'end'})}
 return this.grp(k,s)};
/* dikey ölçü: x @ y1..y2; yazı -90° döndürülmüş, çizginin solunda (side -1) / sağında (1) */
P.dimV=function(x,y1,y2,lab,k,side){var L=y2-y1,s='',sd=side||-1;
 if(L>=tw(lab)+22){var tx=x+(sd<0?-5:13);s+=this.arrow2(x,y1,x,y2)+this.txt(tx,(y1+y2)/2,lab,{rot:-90})}
 else{s+='<line x1="'+n1(x)+'" y1="'+n1(y1)+'" x2="'+n1(x)+'" y2="'+n1(y2)+'" stroke="'+this.dim+'" stroke-width="1.1"/>'+this.arrow(x,y1-13,x,y1)+this.arrow(x,y2+13,x,y2)+this.txt(x+(sd<0?-6:6),(y1+y2)/2+4,lab,{a:sd<0?'end':'start'})}
 return this.grp(k,s)};
/* çap ölçüsü (merkezden geçen, açılı); ang derece, yatayın üstü pozitif */
P.dimD=function(cx,cy,r,ang,lab,k,t){var a=ang*PI/180,c=Math.cos(a),sn=Math.sin(a),x1=cx-r*c,y1=cy+r*sn,x2=cx+r*c,y2=cy-r*sn,p=t==null?.5:t;
 var tx=cx+r*p*c-4*sn,ty=cy-r*p*sn-4*c;
 return this.grp(k,this.arrow2(x1,y1,x2,y2)+this.txt(tx,ty,lab,{rot:-ang}))};
P.ext=function(x1,y1,x2,y2){return this.ln(x1,y1,x2,y2,'x')};
/* kesit düzlemi işareti (dikey düzlem, bakış sağa) */
P.cutV=function(x,yt,yb){var s=this;[[yt-16,yt-5,yt-16],[yb+5,yb+16,yb+16]].forEach(function(q){s.ln(x,q[0],x,q[1],'cut');s.add(s.arrow(x,q[2],x+13,q[2]));s.add(s.txt(x+19,q[2]+(q[2]<yt?3:4),'A',{size:11,a:'start',fill:LC}))});return this};
function pt(cx,cy,r,deg){var a=deg*PI/180;return [cx+r*Math.sin(a),cy-r*Math.cos(a)]} /* 0°=üst, saat yönü */
function P2(p){return n1(p[0])+','+n1(p[1])}
function arc(r,p,large,sweep){return ' A'+n1(r)+','+n1(r)+' 0 '+large+' '+sweep+' '+P2(p)}
function circleD(cx,cy,r){return 'M'+n1(cx-r)+','+n1(cy)+' a'+n1(r)+','+n1(r)+' 0 1 0 '+n1(2*r)+',0 a'+n1(r)+','+n1(r)+' 0 1 0 '+n1(-2*r)+',0z'}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function keyv(k,l,v){return {k:k,l:l,v:v}}

/* ---------- KM manşon somunu ---------- */
function drawKM(ctx,opt){
 var th=sval(ctx,/^ic dis$/),D=val(ctx,/^dis cap( \(d\))?$/,'D'),B=val(ctx,/^genislik( \(b\))?$/,'B');
 if(!th||!D||!B)return null;var m=th.match(/^M(\d+(?:[.,]\d+)?)[x×*](\d+(?:[.,]\d+)?)$/i);if(!m)return null;
 var G=parseFloat(m[1].replace(',','.')),Pt=parseFloat(m[2].replace(',','.'));if(!(G<D&&Pt>0))return null;
 var g=new Pen(opt),sc=Math.min(150/D,100/B),R=D/2*sc,rM=G/2*sc,r1=(G-1.0825*Pt)/2*sc,w=B*sc,fx=120,cy=108;
 var lab='M'+f(G)+'×'+f(Pt);
 /* ön görünüş: 4 kanallı dış kontur (45°'lerde) + diş */
 var bw=.12*D*sc,hd=Math.max(.05*D*sc,2.5),hw=bw/2,d='';
 for(var i=0;i<4;i++){var a=45+i*90,rot=function(x,y){var t=a*PI/180;return [fx+x*Math.cos(t)-y*Math.sin(t),cy+x*Math.sin(t)+y*Math.cos(t)]};
  var yo=-Math.sqrt(R*R-hw*hw),p1=rot(-hw,yo),p2=rot(-hw,-(R-hd)),p3=rot(hw,-(R-hd)),p4=rot(hw,yo);
  d+=(i?' L':'M')+P2(p1)+' L'+P2(p2)+' L'+P2(p3)+' L'+P2(p4);
  var nx=(a+90)*PI/180,q=[fx+(-hw)*Math.cos(nx)-yo*Math.sin(nx),cy+(-hw)*Math.sin(nx)+yo*Math.cos(nx)];d+=arc(R,q,0,1)}
 d+='z '+circleD(fx,cy,r1);
 g.path(d,FACE);
 g.add('<path d="M'+n1(fx+rM)+','+n1(cy)+' A'+n1(rM)+','+n1(rM)+' 0 1 1 '+n1(fx)+','+n1(cy-rM)+'" fill="none" stroke="'+LC+'" stroke-width=".8"/>');
 g.cross(fx,cy,R+9);g.cutV(fx,cy-R,cy+R);
 g.ext(fx,cy-R,fx-R-20,cy-R);g.ext(fx,cy+R,fx-R-20,cy+R);g.dimV(fx-R-14,cy-R,cy+R,'Ø'+f(D),'D',-1);
 /* kesit */
 var sx=clamp(318-w/2,248,392-w);
 g.hatch('M'+n1(sx)+','+n1(cy-R)+'h'+n1(w)+'V'+n1(cy-r1)+'H'+n1(sx)+'z M'+n1(sx)+','+n1(cy+r1)+'h'+n1(w)+'V'+n1(cy+R)+'H'+n1(sx)+'z');
 g.ln(sx,cy-rM,sx+w,cy-rM,'t');g.ln(sx,cy+rM,sx+w,cy+rM,'t');
 g.ln(sx-10,cy,sx+w+10,cy,'c');
 g.ext(sx,cy-R-3,sx,cy-R-19);g.ext(sx+w,cy-R-3,sx+w,cy-R-19);g.dimH(sx,sx+w,cy-R-13,f(B),'B',1);
 g.ext(sx-3,cy-rM,sx-22,cy-rM);g.ext(sx-3,cy+rM,sx-22,cy+rM);g.dimV(sx-16,cy-rM,cy+rM,lab,'G',-1);
 g.ext(sx+w+3,cy-R,sx+w+46,cy-R);g.ext(sx+w+3,cy+R,sx+w+46,cy+R);g.dimV(sx+w+40,cy-R,cy+R,'Ø'+f(D),'D',1);
 g.title(fx,234,'ÖN GÖRÜNÜŞ');g.title(sx+w/2,234,'KESİT A-A');
 return {svg:g.svg(244),keys:[keyv('G','İç Diş',lab),keyv('D','Dış Çap (D)',f(D)+' mm'),keyv('B','Genişlik (B)',f(B)+' mm')]}}

/* ---------- MB manşon pulu ---------- */
function drawMB(ctx,opt){
 var d0=val(ctx,/^ic cap( \(d\))?$/,'d'),D=val(ctx,/^dis cap( \(d\))?$/,'D'),S=val(ctx,/^genislik( \(kalinlik\))?$|^kalinlik$/,'s');
 if(!d0||!D||!S||!(d0<D))return null;
 var g=new Pen(opt),sc=Math.min(150/D,40/S),R=D/2*sc,r=d0/2*sc,rb=r+(R-r)*.45,w=Math.max(S*sc,2),fx=120,cy=108;
 var n=D<40?12:D<100?16:D<200?20:24,hw=rb*Math.sin(PI/n*.5),tw2=Math.min((.1*d0+2)*sc/2,r*.45),dep=Math.min((.04*d0+1)*sc,r*.35),o='';
 for(var i=0;i<n;i++){var a=i*360/n,t=a*PI/180,rot=function(x,y){return [fx+x*Math.cos(t)-y*Math.sin(t),cy+x*Math.sin(t)+y*Math.cos(t)]};
  var yb=-Math.sqrt(rb*rb-hw*hw),yt=-Math.sqrt(R*R-hw*hw),b1=rot(-hw,yb),t1=rot(-hw,yt),t2=rot(hw,yt),b2=rot(hw,yb);
  o+=(i?' L':'M')+P2(b1)+' L'+P2(t1)+arc(R,t2,0,1)+' L'+P2(b2);
  var t3=(a+360/n)*PI/180,nb=[fx+(-hw)*Math.cos(t3)-yb*Math.sin(t3),cy+(-hw)*Math.sin(t3)+yb*Math.cos(t3)];o+=arc(rb,nb,0,1)}
 o+='z';
 var ya=-Math.sqrt(r*r-tw2*tw2);o+=' M'+n1(fx-tw2)+','+n1(cy+ya)+' L'+n1(fx-tw2)+','+n1(cy-r+dep)+' L'+n1(fx+tw2)+','+n1(cy-r+dep)+' L'+n1(fx+tw2)+','+n1(cy+ya)+arc(r,[fx-tw2,cy+ya],1,1)+'z';
 g.path(o,FACE);
 g.circ(fx,cy,rb,'t');
 g.cross(fx,cy,R+9);g.cutV(fx,cy-R,cy+R);
 g.ext(fx,cy-R,fx-R-20,cy-R);g.ext(fx,cy+R,fx-R-20,cy+R);g.dimV(fx-R-14,cy-R,cy+R,'Ø'+f(D),'D',-1);
 g.dimD(fx,cy,r,-32,'Ø'+f(d0),'d',.5);
 var sx=clamp(318-w/2,250,392-w);
 g.hatch('M'+n1(sx)+','+n1(cy-R)+'h'+n1(w)+'V'+n1(cy-r+dep)+'H'+n1(sx)+'z M'+n1(sx)+','+n1(cy+r)+'h'+n1(w)+'V'+n1(cy+R)+'H'+n1(sx)+'z');
 g.ln(sx-14,cy,sx+w+14,cy,'c');
 g.ext(sx,cy-R-3,sx,cy-R-19);g.ext(sx+w,cy-R-3,sx+w,cy-R-19);g.dimH(sx,sx+w,cy-R-13,f(S),'s',1);
 g.ext(sx+w+3,cy-R,sx+w+46,cy-R);g.ext(sx+w+3,cy+R,sx+w+46,cy+R);g.dimV(sx+w+40,cy-R,cy+R,'Ø'+f(D),'D',1);
 g.title(fx,234,'ÖN GÖRÜNÜŞ');g.title(sx+w/2,234,'KESİT A-A');
 return {svg:g.svg(244),keys:[keyv('d','İç Çap (d)',f(d0)+' mm'),keyv('D','Dış Çap (D)',f(D)+' mm'),keyv('s','Kalınlık (s)',f(S)+' mm')]}}

/* ---------- segman DIN 471 (mil) / DIN 472 (delik) ---------- */
function drawSeg(ctx,opt,ext){
 var std=fold(sval(ctx,/^standart$/)||'');if(std&&std.indexOf(ext?'471':'472')<0)return null;
 var es=sval(ctx,/^ebat$/),em=es&&es.match(/^(\d+(?:[.,]\d+)?)(?:[x×*](\d+(?:[.,]\d+)?))?$/);if(!em)return null;
 var E=parseFloat(em[1].replace(',','.')),Sx=em[2]?parseFloat(em[2].replace(',','.')):null;if(!(E>0))return null;
 var sm=String(ctx.title||'').match(/\b(47[12])\s+(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i),S=null;
 if(sm){if(Math.abs(parseFloat(sm[2].replace(',','.'))-E)>1e-6)return null}
 S=val(ctx,/^kalinlik( \(s\))?$/,'s');if(Sx){if(S&&Math.abs(S-Sx)>1e-6)return null;S=Sx}
 if(sm&&sm[3]&&S&&Math.abs(parseFloat(sm[3].replace(',','.'))-S)>1e-6)return null;
 var g=new Pen(opt),fx=120,cy=110,o='',gm=14,lm=30;
 var rs,ri,ro,b,a,sc;
 if(ext){sc=150/(E*1.45);rs=E/2*sc;ri=rs*.925;b=Math.max(E*.13*sc,4);a=Math.max(E*.2*sc,b*1.55);var e=b*.25,rO=ri+b-e;
  var tip=ri+a;
  var p0=pt(fx,cy,ri,gm),p1=pt(fx,cy,tip,gm),p2=pt(fx,cy,tip,gm+lm),q1=[fx+rO*Math.sin((gm+lm+10)*PI/180),cy+e-rO*Math.cos((gm+lm+10)*PI/180)],q2=[fx-rO*Math.sin((gm+lm+10)*PI/180),cy+e-rO*Math.cos((gm+lm+10)*PI/180)],p3=pt(fx,cy,tip,-gm-lm),p4=pt(fx,cy,tip,-gm),p5=pt(fx,cy,ri,-gm);
  o='M'+P2(p0)+' L'+P2(p1)+arc(tip,p2,0,1)+' L'+P2(q1)+arc(rO,q2,1,1)+' L'+P2(p3)+arc(tip,p4,0,1)+' L'+P2(p5)+arc(ri,p0,1,0)+'z';
  var hr=Math.min(a*.24,E*.06*sc+1.2),hc=ri+a*.52;
  o+=' '+circleD(pt(fx,cy,hc,gm+lm/2)[0],pt(fx,cy,hc,gm+lm/2)[1],hr)+' '+circleD(pt(fx,cy,hc,-gm-lm/2)[0],pt(fx,cy,hc,-gm-lm/2)[1],hr);
  ro=tip;
 }else{sc=150/(E*1.12);rs=E/2*sc;ro=rs*1.05;b=Math.max(E*.12*sc,4);a=Math.max(E*.19*sc,b*1.55);var e2=b*.25,rI=ro-b+e2,tin=ro-a;
  var c0=pt(fx,cy,ro,gm),c1=pt(fx,cy,ro,-gm),c2=pt(fx,cy,tin,-gm),c3=pt(fx,cy,tin,-gm-lm),k1=[fx-rI*Math.sin((gm+lm+10)*PI/180),cy-e2-rI*Math.cos((gm+lm+10)*PI/180)],k2=[fx+rI*Math.sin((gm+lm+10)*PI/180),cy-e2-rI*Math.cos((gm+lm+10)*PI/180)],c4=pt(fx,cy,tin,gm+lm),c5=pt(fx,cy,tin,gm);
  o='M'+P2(c0)+arc(ro,c1,1,1)+' L'+P2(c2)+arc(tin,c3,0,0)+' L'+P2(k1)+arc(rI,k2,1,0)+' L'+P2(c4)+arc(tin,c5,0,0)+'z';
  var hr2=Math.min(a*.24,E*.05*sc+1.2),hc2=ro-a*.5;
  o+=' '+circleD(pt(fx,cy,hc2,gm+lm/2)[0],pt(fx,cy,hc2,gm+lm/2)[1],hr2)+' '+circleD(pt(fx,cy,hc2,-gm-lm/2)[0],pt(fx,cy,hc2,-gm-lm/2)[1],hr2);
  ri=rI-e2;
 }
 g.circ(fx,cy,rs,'p');
 g.path(o,FACE);
 g.cross(fx,cy,Math.max(ro,rs)+9);
 g.cutV(fx,cy-Math.max(ro,rs),cy+Math.max(ro,rs));
 var lab='Ø'+f(E);
 g.dimD(fx,cy,rs,-28,lab,'d1',ext?.08:.15);
 g.add(g.txt(fx,cy+rs*(ext?.35:.42)+14,ext?'MİL':'DELİK',{size:9,w:700,fill:LC,op:.6,ls:1.2}));
 /* kesit: alt taraf (arkadaki genişlik), üstte kulaklar */
 var t=S?S*sc:Math.max(E*.06*sc,3),sx=clamp(330-t/2,270,400-t);
 var yb1=ext?cy+ri:cy+ro-b,yb2=ext?cy+ri+b:cy+ro;
 g.hatch('M'+n1(sx)+','+n1(yb1)+'h'+n1(t)+'V'+n1(yb2)+'H'+n1(sx)+'z');
 var ya1=ext?cy-ri*Math.cos(gm*PI/180):cy-ro*Math.cos(gm*PI/180),ya2=ext?cy-(ri+a)*Math.cos((gm)*PI/180):cy-(ro-a)*Math.cos(gm*PI/180);
 g.path('M'+n1(sx)+','+n1(Math.min(ya1,ya2))+'h'+n1(t)+'V'+n1(Math.max(ya1,ya2))+'H'+n1(sx)+'z','none',1.6);
 g.ln(sx-30,cy-rs,sx+t+30,cy-rs,'p');g.ln(sx-30,cy+rs,sx+t+30,cy+rs,'p');
 g.ln(sx-14,cy,sx+t+14,cy,'c');
 if(S){g.ext(sx,yb2+3,sx,yb2+19);g.ext(sx+t,yb2+3,sx+t,yb2+19);g.dimH(sx,sx+t,yb2+13,f(S),'s',1)}
 g.ext(sx+t+33,cy-rs,sx+t+56,cy-rs);g.ext(sx+t+33,cy+rs,sx+t+56,cy+rs);g.dimV(sx+t+50,cy-rs,cy+rs,lab,'d1',1);
 g.title(fx,234,'ÖN GÖRÜNÜŞ');g.title(sx+t/2,234,'KESİT A-A');
 var keys=[keyv('d1',ext?'Mil Çapı (d1)':'Delik Çapı (d1)',f(E)+' mm')];if(S)keys.push(keyv('s','Kalınlık (s)',f(S)+' mm'));
 return {svg:g.svg(244),keys:keys}}

/* ---------- konik burç (taper lock) ---------- */
var TL={1008:[35,22.3],1108:[38,22.3],1210:[47.5,25.4],1215:[47.5,38.1],1610:[57,25.4],1615:[57,38.1],2012:[70,31.8],2517:[85.5,44.5],3020:[108,50.8],3030:[108,76.2],3525:[127,65],3535:[127,88.9],4030:[146,76.2],4040:[146,101.6],4535:[162,88.9],4545:[162,114.3],5040:[177.8,101.6],5050:[177.8,127]};
function drawBurc(ctx,opt){
 var d=val(ctx,/^mil capi$/,'d');if(!d)return null;
 var ty=(sval(ctx,/^burc tipi$/)||'').match(/(\d{4})/),tt=String(ctx.title||'').match(/^(\d{4})\s*[*x×]\s*(\d+(?:[.,]\d+)?)/);
 if(!ty&&!tt)return null;var se=ty?ty[1]:tt[1];if(tt&&(tt[1]!=se||Math.abs(parseFloat(tt[2].replace(',','.'))-d)>1e-6))return null;
 var T=TL[se];if(!T||!(d<T[0]*.75))return null;
 var D=T[0],L=T[1],g=new Pen(opt),sc=Math.min(150/D,130/L),R=D/2*sc,r=d/2*sc,w=L*sc,fx=120,cy=108;
 var Rs0=R-L*sc*Math.tan(4*PI/180),kw=Math.min((.25*d+1)*sc,r*.7),kd=Math.min(kw*.42,(Rs0-r)*.45),ka=Math.asin(kw/2/r)*180/PI,sa=225,gs=Math.max(1.4,.012*D*sc),rn=.065*D*sc;
 var holes=+se<1210?[115,295]:[60,150,300],o,sg=Math.asin(gs/R)*180/PI,sgi=Math.asin(gs/r)*180/PI;
 o='M'+P2(pt(fx,cy,R,sa+sg));var cur=sa+sg;
 holes.map(function(h){return h<sa?h+360:h}).sort(function(x,y){return x-y}).forEach(function(h){var dl=2*Math.asin(rn/(2*R))*180/PI;
  o+=arc(R,pt(fx,cy,R,h-dl),(h-dl-cur)>180?1:0,1)+arc(rn,pt(fx,cy,R,h+dl),0,0);cur=h+dl});
 o+=arc(R,pt(fx,cy,R,sa+360-sg),(sa+360-sg-cur)>180?1:0,1)+' L'+P2(pt(fx,cy,r,sa-sgi));
 o+=arc(r,pt(fx,cy,r,ka),1,0)+' L'+n1(fx+kw/2)+','+n1(cy-r-kd)+' L'+n1(fx-kw/2)+','+n1(cy-r-kd)+' L'+P2(pt(fx,cy,r,-ka))+arc(r,pt(fx,cy,r,sa+sgi-360),0,0)+'z';
 g.path(o,FACE);
 g.cross(fx,cy,R+9);g.cutV(fx,cy-R,cy+R);
 g.dimD(fx,cy,r,-30,'Ø'+f(d),'d',.42);
 var sx=clamp(312-w/2,246,384-w),xe=sx+w,Rs=R-w*Math.tan(4*PI/180);
 g.hatch('M'+n1(sx)+','+n1(cy-R)+'L'+n1(xe)+','+n1(cy-Rs)+'V'+n1(cy-r-kd)+'H'+n1(sx)+'z M'+n1(sx)+','+n1(cy+r)+'H'+n1(xe)+'V'+n1(cy+Rs)+'L'+n1(sx)+','+n1(cy+R)+'z');
 g.ln(sx,cy-r,xe,cy-r,'v');
 g.ln(sx-10,cy,xe+10,cy,'c');
 g.ext(xe+3,cy-r,xe+28,cy-r);g.ext(xe+3,cy+r,xe+28,cy+r);g.dimV(xe+22,cy-r,cy+r,'Ø'+f(d),'d',1);
 g.title(fx,234,'ÖN GÖRÜNÜŞ');g.title(sx+w/2,234,'KESİT A-A');
 return {svg:g.svg(244),keys:[keyv('d','Mil Çapı (d)',f(d)+' mm')]}}

/* ---------- kama DIN 6885 ---------- */
function drawKama(ctx,opt){
 var s=sval(ctx,/^kama olcusu$/);if(!s)return null;var m=s.match(/^(\d+(?:[.,]\d+)?)[*x×](\d+(?:[.,]\d+)?)[*x×](\d+(?:[.,]\d+)?)$/);if(!m)return null;
 var b=parseFloat(m[1].replace(',','.')),h=parseFloat(m[2].replace(',','.')),L=parseFloat(m[3].replace(',','.'));if(!(b>0&&h>0&&L>b))return null;
 var g=new Pen(opt),sc=Math.min(90/b,60/h,270/L),brk=false;if(b*sc<36){sc=44/b;brk=true}
 var bp=b*sc,hp=h*sc,R=bp/2,Lp=brk?270:L*sc,ox=46,cy=88,c=clamp(.05*bp,1.5,3.5),xe=ox+Lp;
 function rr(x0,x1,rad,y){return 'M'+n1(x0+rad)+','+n1(y-rad)+'H'+n1(x1-rad)+arc(rad,[x1-rad,y+rad],0,1)+'H'+n1(x0+rad)+arc(rad,[x0+rad,y-rad],0,1)+'z'}
 if(!brk){g.path(rr(ox,xe,R,cy),FACE);g.path(rr(ox+c,xe-c,R-c,cy),'none',.8)}
 else{var m1=ox+Lp/2-14,m2=ox+Lp/2+14;function wav(x,y1,y2){return ' C'+n1(x+6)+','+n1(y1+(y2-y1)*.33)+' '+n1(x-6)+','+n1(y1+(y2-y1)*.66)+' '+n1(x)+','+n1(y2)}
  g.path('M'+n1(m1)+','+n1(cy-R)+wav(m1,cy-R,cy+R)+'H'+n1(ox+R)+arc(R,[ox+R,cy-R],0,1)+'z',FACE);
  g.path('M'+n1(m2)+','+n1(cy-R)+wav(m2,cy-R,cy+R)+'H'+n1(xe-R)+arc(R,[xe-R,cy-R],0,0)+'z',FACE);
  g.add('<path d="M'+n1(m1)+','+n1(cy-R+c)+'H'+n1(ox+R)+arc(R-c,[ox+c,cy],0,0)+arc(R-c,[ox+R,cy+R-c],0,0)+'H'+n1(m1)+' M'+n1(m2)+','+n1(cy-R+c)+'H'+n1(xe-R)+arc(R-c,[xe-c,cy],0,1)+arc(R-c,[xe-R,cy+R-c],0,1)+'H'+n1(m2)+'" fill="none" stroke="'+LC+'" stroke-width=".8"/>')}
 g.ln(ox-9,cy,xe+9,cy,'c');
 var cxm=brk?ox+R+(Lp/2-14-R)/2:ox+Lp/2;g.cutV(cxm,cy-R,cy+R);
 g.ext(ox+R,cy-R,ox-20,cy-R);g.ext(ox+R,cy+R,ox-20,cy+R);g.dimV(ox-14,cy-R,cy+R,f(b),'b',-1);
 g.ext(ox,cy+3,ox,cy+R+48);g.ext(xe,cy+3,xe,cy+R+48);g.dimH(ox,xe,cy+R+42,f(L),'L',1);
 var sx=clamp(392-hp/2,xe+40,414-hp);
 g.hatch('M'+n1(sx+c)+','+n1(cy-R)+'H'+n1(sx+hp-c)+'L'+n1(sx+hp)+','+n1(cy-R+c)+'V'+n1(cy+R-c)+'L'+n1(sx+hp-c)+','+n1(cy+R)+'H'+n1(sx+c)+'L'+n1(sx)+','+n1(cy+R-c)+'V'+n1(cy-R+c)+'z');
 g.cross(sx+hp/2,cy,hp/2+8,R+8);
 g.ext(sx,cy-R-3,sx,cy-R-19);g.ext(sx+hp,cy-R-3,sx+hp,cy-R-19);g.dimH(sx,sx+hp,cy-R-13,f(h),'h',1);
 g.ext(sx+hp+3,cy-R,sx+hp+26,cy-R);g.ext(sx+hp+3,cy+R,sx+hp+26,cy+R);g.dimV(sx+hp+20,cy-R,cy+R,f(b),'b',1);
 g.title(ox+Lp/2,192,'ÜST GÖRÜNÜŞ');g.title(sx+hp/2,192,'KESİT A-A');
 return {svg:g.svg(204),keys:[keyv('b','Genişlik (b)',f(b)+' mm'),keyv('h','Yükseklik (h)',f(h)+' mm'),keyv('L','Boy (L)',f(L)+' mm')]}}

var DR={km:drawKM,mb:drawMB,s471:function(c,o){return drawSeg(c,o,true)},s472:function(c,o){return drawSeg(c,o,false)},burc:drawBurc,kama:drawKama,
 kilit:function(){return null} /* sayfadaki "Dış Çap (D)" ile 2. fotoğraftaki "L (Boy)" aynı sayı: hangisi doğru belli değil */};
(window.YDRAW=window.YDRAW||{})['baglanti']={
 match:function(ctx){return !!sub(ctx||{})},
 draw:function(ctx,opt){var t=sub(ctx||{});if(!t)return null;try{return DR[t](ctx,opt||{})||null}catch(e){return null}},
 sub:sub
};
})();
