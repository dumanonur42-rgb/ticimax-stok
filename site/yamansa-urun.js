window.YDRAW_DATA=Object.assign(window.YDRAW_DATA||{}, {});
/* Eksenel (aksiyel / büte) rulman teknik çizimi.
   Alt tipler: tek yönlü bilyalı (511/512/513/514), çift yönlü bilyalı (522/523/524), minyatür (AKL / F..M).
   Ekrana yazılan her ölçü sayfadaki Ürün Özellikleri / ön yazı / doğrulanmış foto verisinden gelir. */
(function(){
function N(s){return String(s||'').replace(/İ/g,'i').replace(/I/g,'i').toLowerCase().replace(/\u0307/g,'')
 .replace(/ı/g,'i').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u').replace(/\s+/g,' ').trim()}
function numOf(c,v){if(c&&c.num)return c.num(v);var m=String(v).replace(',','.').match(/\d+(\.\d+)?/);return m?parseFloat(m[0]):NaN}
function txt(c){return N((c.crumbs||[]).join(' | ')+' | '+(c.title||''))}
var NEG=/kombine|kece|segman|burc|manson|lineer|zincir|kaplin|tek yonlu|kam makara|mafsal|yatakli/;
var CODE=/^(axk|axw|51[1-4]\d\d|52[2-4]\d\d|5[34][1-4]\d\d|81[12]\d\d|89[34]\d\d|29[234]\d\d)\b/;
function match(c){var t=txt(c);if(NEG.test(t))return false;if(/eksenel|aksiyel|axial|thrust|\bbute\b/.test(t))return true;
 return /rulman|bearing/.test(t)&&CODE.test(N(c.title))}
function sub(c){var t=txt(c),ti=N(c.title);
 if(/^(axk|axw|81[12]|89[34]|29[234])/.test(ti)||/(eksenel|aksiyel)[a-z ]*(makarali|igneli)/.test(t))return 'makara';
 if(/^5[34]\d{3}/.test(ti))return null;
 if(/cift yonlu/.test(t)||/^52[2-4]\d\d\b/.test(ti))return 'cift';
 if(/minyatur/.test(t)||/^akl\b/.test(ti)||/^f\d+-\d+m\b/.test(ti))return 'mini';
 if(/^51[1-4]\d\d\b/.test(ti)||/eksenel bilyali/.test(t))return 'tek';
 return null}
var RX={d:/^ic cap/,D:/^dis cap/,H:/^(yukseklik|genislik)/,K:/^k$/,M:/^m$/,B:/^b$/};
var LBL={d:'İç Çap (d)',D:'Dış Çap (D)',H:'Yükseklik (H)',K:'Yuva Bileziği İç Çapı (K)',M:'Mil Bileziği Dış Çapı (M)',B:'Mil Bileziği Yüksekliği (B)'};
function pick(c,k){var hit=null,bad=false;
 [c.specs||[],c.onyazi||[]].forEach(function(L){L.forEach(function(s){if(!RX[k].test(N(s.l).replace(/\s*\(.*\)$/,'')))return;var n=numOf(c,s.v);if(!(n>0))return;
  if(!hit)hit={k:k,l:s.l,v:String(s.v).trim(),n:n};else if(Math.abs(hit.n-n)>1e-6)bad=true})});
 if(!hit&&c.data&&c.data[k]>0)hit={k:k,l:LBL[k],v:F(c.data[k])+' mm',n:+c.data[k]};
 if(hit&&(k=='K'||k=='M'||k=='B'))hit.l=LBL[k];
 return bad?false:hit}
function F(n){return String(Math.round(n*100)/100).replace('.',',')}
function R(n){return Math.round(n*100)/100}
function draw(c,opt){opt=opt||{};var st=sub(c);if(st!='tek'&&st!='cift'&&st!='mini')return null;
 var v={},ks=['d','D','H','K','M','B'];for(var i=0;i<ks.length;i++){var p=pick(c,ks[i]);if(p===false)return null;if(p)v[ks[i]]=p}
 if(!v.d||!v.D||!v.H)return null;var d=v.d.n,D=v.D.n,H=v.H.n;if(!(D>d))return null;
 var tm=String(c.title||'').match(/(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+(?:[.,]\d+)?)/);
 if(tm){var q=[tm[1],tm[2],tm[3]].map(function(x){return parseFloat(x.replace(',','.'))});if(q[0]!=d||q[1]!=D||q[2]!=H)return null}
 if(v.K&&!(v.K.n>d&&v.K.n<D))delete v.K;if(v.M&&!(v.M.n>(v.K?v.K.n:d)&&v.M.n<=D))delete v.M;
 if(st=='cift'){if(!v.B||!v.K||!(v.B.n<H*0.6))return null;delete v.M}
 if(st=='mini'){delete v.K;delete v.M;delete v.B}
 if(st=='tek')delete v.B;
 return render(st,v,opt)}
function render(st,v,opt){
 var id=opt.id||('ek'+Math.random().toString(36).slice(2,7)),dim=opt.dim||'#0a2350',C='#16203a',HAT='#9aa6bd';
 var d=v.d.n,D=v.D.n,H=v.H.n,B=v.B?v.B.n:0;
 var K=v.K?v.K.n:(st=='mini'?d:d+0.06*(D-d)),M=v.M?v.M.n:(st=='mini'?D:D-0.012*D);
 var rp=st=='cift'?(K+D)/4:(d+D)/4,room=Math.min(rp-(st=='cift'?K:Math.max(d,K))/2,(st=='cift'?D:Math.min(M,D))/2-rp);
 var hs=st=='cift'?(H-B)/2:H,rb=Math.min(0.3*hs,0.8*room);if(st=='cift')rb=Math.min(rb,(hs-0.3*hs)/1.48);
 var g=1.48*rb,t=st=='cift'?(hs-g):(H-g)/2,rS=D/2-0.02*D;
 var mEq=!!(v.M&&Math.abs(v.M.n-D)<1e-6),nt=st=='cift'?2:(v.M&&!mEq?2:1),nb=st=='tek'&&v.K?2:1;
 var s=Math.min((st=='cift'?128:144)/D,(st=='cift'?96:84)/H),fx=100,sx=316;
 var y0=30+nt*19+8,h=H*s,y1=y0+h,RD=D/2*s,cy=Math.max((y0+y1)/2,RD+28);
 var vbH=Math.max(cy+RD+34,y1+nb*19+26)+6;vbH=Math.max(200,Math.min(260,Math.ceil(vbH)));
 var o=[];function A(x){o.push(x)}
 var TS='font-size="13" font-weight="700" font-family="inherit" fill="'+dim+'" stroke="#fff" stroke-width="3" stroke-linejoin="round" paint-order="stroke"';
 function T(x,y,s2,anc){return '<text x="'+R(x)+'" y="'+R(y)+'" text-anchor="'+(anc||'middle')+'" '+TS+'>'+s2+'</text>'}
 function L(x1,y1,x2,y2,w,col,da){return '<line x1="'+R(x1)+'" y1="'+R(y1)+'" x2="'+R(x2)+'" y2="'+R(y2)+'" stroke="'+(col||C)+'" stroke-width="'+(w||1)+'"'+(da?' stroke-dasharray="'+da+'"':'')+'/>'}
 var CL='9 2.5 1.5 2.5',HID='3.5 2.2';
 function ext(x1,y1,x2,y2){return L(x1,y1,x2,y2,0.6,dim)}
 function arrow(x1,y1,x2,y2){return '<line x1="'+R(x1)+'" y1="'+R(y1)+'" x2="'+R(x2)+'" y2="'+R(y2)+'" stroke="'+dim+'" stroke-width="1" marker-start="url(#'+id+'a)" marker-end="url(#'+id+'a)"/>'}
 function grp(k,inner){return '<g class="hl" data-k="'+k+'">'+inner+'</g>'}
 // yatay ölçü: xa<xb, çizgi y'de, uzatma çizgileri ya/yb'den
 function dimX(k,xa,xb,y,ya,yb,lab,below){var u=y<ya?-1:1;return grp(k,ext(xa,ya+u*2,xa,y+u*3)+ext(xb,yb+u*2,xb,y+u*3)+arrow(xa,y,xb,y)+T((xa+xb)/2,below?y+14:y-4,lab))}
 function dimY(k,x,ya,yb,xf,lab,left){var u=x<xf?-1:1;return grp(k,ext(xf+u*2,ya,x+u*3,ya)+ext(xf+u*2,yb,x+u*3,yb)+arrow(x,ya,x,yb)+T(left?x-5:x+5,(ya+yb)/2+4,lab,left?'end':'start'))}
 function P2(a,r){var t2=a*Math.PI/180;return [fx+r*Math.cos(t2),cy+r*Math.sin(t2)]}
 function arc(r,a1,a2){var p=P2(a1,r),q=P2(a2,r),big=((a2-a1+360)%360)>180?1:0;return 'M'+R(p[0])+' '+R(p[1])+'A'+R(r)+' '+R(r)+' 0 '+big+' 1 '+R(q[0])+' '+R(q[1])}
 function ring(r1,r2,a1,a2){var p=P2(a1,r2),q=P2(a2,r2),m=P2(a2,r1),n=P2(a1,r1),big=((a2-a1+360)%360)>180?1:0;
  return 'M'+R(p[0])+' '+R(p[1])+'A'+R(r2)+' '+R(r2)+' 0 '+big+' 1 '+R(q[0])+' '+R(q[1])+'L'+R(m[0])+' '+R(m[1])+'A'+R(r1)+' '+R(r1)+' 0 '+big+' 0 '+R(n[0])+' '+R(n[1])+'Z'}
 function brk(a,r1,r2){var pts='',n=7;for(var i=0;i<=n;i++){var r=r1+(r2-r1)*i/n,off=(i%2?1:-1)*(i>0&&i<n?1.3:0),t2=a*Math.PI/180;
  pts+=(i?' ':'')+R(fx+r*Math.cos(t2)-off*Math.sin(t2))+','+R(cy+r*Math.sin(t2)+off*Math.cos(t2))}return '<polyline points="'+pts+'" fill="none" stroke="'+C+'" stroke-width=".8"/>'}
 function path(dd,fill,w){return '<path d="'+dd+'" fill="'+(fill||'none')+'" stroke="'+C+'" stroke-width="'+(w||1.4)+'"/>'}
 // ---------- ÖN GÖRÜNÜŞ (eksen yönünden, sağ üst çeyrekte kısmi kesik: bilyeler görünür)
 var a1=-80,a2=-10,rK=K/2*s,rM=M/2*s,rd=d/2*s,rP=rp*s,rB=rb*s,rSp=rS*s;
 var topIn=st=='cift'?rK:rd,topOut=st=='cift'?RD:rM;
 A(L(fx-RD-10,cy,fx+RD+10,cy,0.7,C,CL)+L(fx,cy-RD-10,fx,cy+RD+10,0.7,C,CL));
 if(st=='cift'){A(path(ring(rd,rSp,a1,a2),'#e3e8f1',0));A(path(arc(rSp,a1,a2),'none',1.2));if(RD-rSp>=3)A(path(arc(rSp,a2,a1+360),'none',.9).replace('/>',' stroke-dasharray="'+HID+'"/>'))}
 else{A(path(ring(rK,RD,a1,a2),'#e3e8f1',0));if(st=='tek'){A(path(arc(rK,a1,a2),'none',1.2));if(rK-rd>=3)A(path(arc(rK,a2,a1+360),'none',.9).replace('/>',' stroke-dasharray="'+HID+'"/>'))}}
 var cw=st=='mini'?Math.min(rB*1.5,(rP-rd)*0.85,(RD-rP)*0.85):rB*1.2;
 A(path(ring(rP-cw,rP+cw,a1+1,a2-1),st=='mini'?'#f2e8cc':'#c9d2e1',.9));
 var n=Math.max(3,Math.floor(2*Math.PI*rP/(2*rB*(st=='mini'?1.6:1.3)))),da=360/n,half=Math.asin(Math.min(1,rB/rP))*180/Math.PI;
 for(var j=-n;j<=n;j++){var aa=-45+j*da;if(aa-half<a1+2||aa+half>a2-2)continue;var bp=P2(aa,rP);A('<circle cx="'+R(bp[0])+'" cy="'+R(bp[1])+'" r="'+R(rB)+'" fill="#fff" stroke="'+C+'" stroke-width="1.2"/>')}
 A('<circle cx="'+fx+'" cy="'+R(cy)+'" r="'+R(rP)+'" fill="none" stroke="'+C+'" stroke-width=".6" stroke-dasharray="'+CL+'"/>');
 A('<circle cx="'+fx+'" cy="'+R(cy)+'" r="'+R(RD)+'" fill="none" stroke="'+C+'" stroke-width="1.5"/>');
 if(topOut<RD-0.3)A(path(arc(topOut,a2,a1+360),'none',1.5));
 A(path(arc(topIn,a2,a1+360),'none',1.5));
 if(st=='mini'||st=='cift')A('<circle cx="'+fx+'" cy="'+R(cy)+'" r="'+R(rd)+'" fill="none" stroke="'+C+'" stroke-width="1.5"/>');
 A(brk(a1,topIn,topOut)+brk(a2,topIn,topOut));
 A(dimX('D',fx-RD,fx+RD,cy+RD+14,cy,cy,'ø'+F(D),true));
 // ---------- KESİT A-A (eksen dikey)
 function washer(xa,xb,ya,yb,gr){var x1=Math.min(xa,xb),x2=Math.max(xa,xb),ch=Math.min(1.2,(x2-x1)/6,(yb-ya)/5),p='M'+R(x1+ch)+' '+R(ya);
  function face(top){var list=gr.filter(function(q){return q.top==top}).sort(function(a2,b2){return top?a2.x-b2.x:b2.x-a2.x}),s2='',y=top?ya:yb;
   list.forEach(function(q){var hc=Math.sqrt(Math.max(0,q.r*q.r-q.dy*q.dy));s2+=top?'L'+R(q.x-hc)+' '+R(y)+'A'+R(q.r)+' '+R(q.r)+' 0 0 0 '+R(q.x+hc)+' '+R(y):'L'+R(q.x+hc)+' '+R(y)+'A'+R(q.r)+' '+R(q.r)+' 0 0 0 '+R(q.x-hc)+' '+R(y)});return s2}
  p+=face(true)+'L'+R(x2-ch)+' '+R(ya)+'L'+R(x2)+' '+R(ya+ch)+'L'+R(x2)+' '+R(yb-ch)+'L'+R(x2-ch)+' '+R(yb)+face(false)+'L'+R(x1+ch)+' '+R(yb)+'L'+R(x1)+' '+R(yb-ch)+'L'+R(x1)+' '+R(ya+ch)+'Z';return p}
 var tP=t*s,gP=g*s,rg=rb*1.04*s,dy=gP/2;
 [-1,1].forEach(function(k){var xb=sx+k*rP;
  function ball(yc){var cwp=Math.min(rB*1.25,(st=='cift'?rP-rK:rP-rd)*0.9);
   if(st=='mini'){var c1=Math.max(rd+1,rP-cw),c2=Math.min(RD-1,rP+cw),th=Math.min(rB*0.55,gP*0.42);A('<rect x="'+R(sx+k*(k<0?c2:c1))+'" y="'+R(yc-th/2)+'" width="'+R(c2-c1)+'" height="'+R(th)+'" fill="url(#'+id+'c)" stroke="'+C+'" stroke-width=".9"/>')}
   else A('<rect x="'+R(xb-cwp)+'" y="'+R(yc-0.9)+'" width="'+R(2*cwp)+'" height="1.8" fill="'+C+'"/>');
   A('<circle cx="'+R(xb)+'" cy="'+R(yc)+'" r="'+R(rB)+'" fill="#fff" stroke="'+C+'" stroke-width="1.3"/>')}
  if(st=='cift'){var yA=y0+tP,yB=yA+gP,yC=yB+B*s,yD=yC+gP;
   A(path(washer(sx+k*rK,sx+k*RD,y0,yA,[{top:false,x:xb,r:rg,dy:dy}]),'url(#'+id+'h2)'));
   A(path(washer(sx+k*rd,sx+k*rSp,yB,yC,[{top:true,x:xb,r:rg,dy:dy},{top:false,x:xb,r:rg,dy:dy}]),'url(#'+id+'h1)'));
   A(path(washer(sx+k*rK,sx+k*RD,yD,y1,[{top:true,x:xb,r:rg,dy:dy}]),'url(#'+id+'h2)'));
   ball(yA+gP/2);ball(yC+gP/2)}
  else{A(path(washer(sx+k*rd,sx+k*rM,y0,y0+tP,[{top:false,x:xb,r:rg,dy:dy}]),'url(#'+id+'h1)'));
   A(path(washer(sx+k*rK,sx+k*RD,y1-tP,y1,[{top:true,x:xb,r:rg,dy:dy}]),'url(#'+id+'h2)'));
   ball((y0+y1)/2)}});
 A(L(sx,y0-10,sx,y1+10,0.7,C,CL));
 var rowT=function(i){return y0-12-19*i},rowB=function(i){return y1+12+19*i};
 if(st=='cift'){var yA2=y0+tP,yB2=yA2+gP,yC2=yB2+B*s;
  A(dimX('d',sx-rd,sx+rd,rowT(0),yB2,yB2,'ø'+F(d)));A(dimX('K',sx-rK,sx+rK,rowT(1),y0,y0,'ø'+F(v.K.n)));
  A(dimX('D',sx-RD,sx+RD,rowB(0),y1,y1,'ø'+F(D),true));
  A(dimY('B',sx-RD-12,yB2,yC2,sx-rSp,F(B),true))}
 else{A(dimX('d',sx-rd,sx+rd,rowT(0),y0,y0,'ø'+F(d)));if(v.M&&!mEq)A(dimX('M',sx-rM,sx+rM,rowT(1),y0,y0,'ø'+F(M)));
  if(v.K){A(dimX('K',sx-rK,sx+rK,rowB(0),y1,y1,'ø'+F(K),true));var dD=dimX('D',sx-RD,sx+RD,rowB(1),y1,y1,'ø'+F(D),true);A(mEq?grp('M',dD):dD)}
  else{var dD2=dimX('D',sx-RD,sx+RD,rowB(0),y1,y1,'ø'+F(D),true);A(mEq?grp('M',dD2):dD2)}}
 if(st=='mini')A(dimY('H',sx+RD+16,y0,y1,sx+RD,F(H)));else A(dimY('H',sx-RD-(st=='cift'?40:16),y0,y1,sx-RD,F(H),true));
 var lb=[];if(st=='tek')lb=[{y:y0+tP/2,x:sx+rM,t:'mil bil.'},{y:y1-tP/2,x:sx+RD,t:'yuva bil.'}];
 if(st=='cift'){var yD2=yC2+gP;lb=[{y:y0+tP/2,x:sx+RD,t:'yuva bil.'},{y:(yB2+yC2)/2,x:sx+rSp,t:'mil bil.'},{y:(yD2+y1)/2,x:sx+RD,t:'yuva bil.'}]}
 var lx=sx+RD+9,LS='font-size="10.5" font-weight="600" font-family="inherit" fill="'+dim+'" opacity=".85"',prev=-1e9;
 lb.forEach(function(q){var ty=Math.max(q.y+3.5,prev+12);prev=ty;A(L(q.x+1.5,q.y,lx-2.5,ty-3.5,0.6,dim)+'<circle cx="'+R(q.x+1.5)+'" cy="'+R(q.y)+'" r="1.1" fill="'+dim+'"/><text x="'+R(lx)+'" y="'+R(ty)+'" '+LS+'>'+q.t+'</text>')});
 var TT='font-size="10" font-weight="700" letter-spacing="1.5" font-family="inherit" fill="'+dim+'" opacity=".75" text-anchor="middle"';
 A('<text x="'+fx+'" y="14" '+TT+'>ÖN GÖRÜNÜŞ</text><text x="'+sx+'" y="14" '+TT+'>KESİT A-A</text>');
 var defs='<defs><pattern id="'+id+'h1" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+HAT+'" stroke-width="1.1"/></pattern>'+
  '<pattern id="'+id+'h2" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+HAT+'" stroke-width="1.1"/></pattern>'+
  '<pattern id="'+id+'c" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="3" fill="#f2e8cc"/><line x1="0" y1="0" x2="0" y2="3" stroke="#b39a5c" stroke-width=".8"/></pattern>'+
  '<marker id="'+id+'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,1.5 L10,5 L0,8.5z" fill="'+dim+'"/></marker></defs>';
 var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 '+vbH+'" width="100%" style="display:block;font-family:inherit">'+defs+o.join('')+'</svg>';
 var keys=[];['d','D','H','B','K','M'].forEach(function(k){if(v[k])keys.push({k:k,l:v[k].l,v:v[k].v})});
 return {svg:svg,keys:keys,sub:st}}
(window.YDRAW=window.YDRAW||{})['eksenel']={match:match,draw:draw};
})();

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
var rawSpecs=specs.map(function(s){return{l:s.l,v:s.v}});
var onyazi=[];[].forEach.call(document.querySelectorAll('#divOnyazi table td'),function(td){var st=td.querySelector('strong');if(!st)return;var l=st.textContent.replace(/:\s*$/,'').trim(),v=td.textContent.replace(st.textContent,'').trim();if(l&&v)onyazi.push({l:l,v:v})});
var crumbs=[];[].forEach.call(document.querySelectorAll('.breadcrumb li [itemprop="name"]'),function(e){var s=e.textContent.trim();if(s&&s.toLowerCase()!='anasayfa')crumbs.push(s)});
function num(v){var m=String(v).replace(',','.').match(/[\d.]+/);return m?parseFloat(m[0]):NaN}
var path=location.pathname,ctx={path:path,title:title,crumbs:crumbs,specs:rawSpecs,onyazi:onyazi,num:num,data:(window.YDRAW_DATA||{})[path]||null};
var K={d:/^[İiI]ç\s*çap/i,D:/^dış\s*çap/i,B:/^(genişlik|yükseklik|kalınlık)/i},dims={};
specs.forEach(function(s){for(var k in K)if(K[k].test(s.l)&&!dims[k]&&!isNaN(num(s.v))){dims[k]=num(s.v);s.k=k;s.n=num(s.v);s.u=/mm/i.test(s.v)?'mm':''}});
var genericHasDraw=!specs.some(function(s){return s.k=='B'&&/^kalınlık/i.test(s.l)})&&dims.d>0&&dims.D>dims.d&&dims.B>0,hasDraw=genericHasDraw,ydrawMod=null,ydrawResult=null,ydrawBig='';
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
var drawModules=window.YDRAW||{},moduleMatched=false;
Object.keys(drawModules).sort().some(function(k){var m=drawModules[k];if(!m||typeof m.match!='function')return false;try{if(m.match(ctx)){ydrawMod=m;moduleMatched=true;return true}}catch(e){}return false});
if(moduleMatched){hasDraw=false;try{ydrawResult=ydrawMod.draw(ctx,{dim:'#0a2350',id:'yd1'});if(ydrawResult&&ydrawResult.svg){var red=ydrawMod.draw(ctx,{dim:'#d0101e',id:'yd2'});if(red&&red.svg){ydrawBig=red.svg;hasDraw=true}}}catch(e){ydrawResult=null;hasDraw=false}
 if(!hasDraw)ydrawResult=null;
 if(ydrawResult){var keyLabels={};var moduleKeys=(ydrawResult.keys||[]).filter(function(s){return s&&s.k&&s.l&&s.v!=null}).map(function(s){keyLabels[String(s.l).trim().toLowerCase()]=true;var n=num(s.v);return{k:s.k,l:s.l,v:s.v,n:n,u:/mm/i.test(String(s.v))?'mm':'',moduleKey:true}});
  var extraSpecs=specs.filter(function(s){return !s.k&&!keyLabels[String(s.l).trim().toLowerCase()]});
  order=moduleKeys.concat(extraSpecs);
 }else if(moduleMatched){order=specs.filter(function(s){return !s.k})}
}else{ydrawMod=null;hasDraw=genericHasDraw}
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
function icon(s){if(s.k)return IC[s.k]||IC.olcu;var l=s.l.toLowerCase();if(/marka/.test(l))return IC.marka;if(/tip|tür/.test(l))return IC.tip;if(/zz|2rs|rs|kapak|conta/.test(l))return IC.kapak;if(/^c\d|boşluk/.test(l))return IC.bosluk;if(/model|seri|kod/.test(l))return IC.model;if(/ölçü|mm/.test(l))return IC.olcu;return IC.gen}
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
'.ymg .hl{transition:opacity .25s}.ymg [data-h] .hl{opacity:.15}.ymg [data-h=d] .hl.d,.ymg [data-h=D] .hl.D,.ymg [data-h=B] .hl.B,.yglb [data-h=d] .hl.d,.yglb [data-h=D] .hl.D,.yglb [data-h=B] .hl.B{opacity:1}.yglb [data-h] .hl{opacity:.15}.ymg [data-h] .hl.on,.yglb [data-h] .hl.on{opacity:1}'+
'.hl.on line,.hl.on path,.hl.on polyline{stroke:#d0101e!important}.hl.on text{fill:#d0101e!important}'+
'.ymg.ydmod .seg{display:none}'+
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
if(order.length){var extra=order.length-3;var kc=order.filter(function(s){return s.k}).length;h+='<div class="specs v2 kc'+kc+(extra>0?' hasx':'')+'" id="ygSpecs">'+order.map(function(s,i){var val=s.moduleKey?(isNaN(s.n)?s.v:f(s.n)+(s.u?'<em>'+s.u+'</em>':'')):s.k?f(s.n)+(s.u?'<em>'+s.u+'</em>':''):s.v;return '<div class="sp'+(!s.k&&i==order.length-1&&(order.length-kc)%2?' wl':'')+(s.k?' k" data-k="'+s.k:'')+'" title="'+s.l+': '+s.v+'">'+icon(s)+'<div style="min-width:0"><small>'+s.l+'</small><b>'+val+'</b></div></div>'}).join('')+(extra>0?'<button class="more" id="ygMore">+'+extra+I('<path d="m6 9 6 6 6-6"/>',11)+'</button>':'')+'</div>'+(extra>0?'<div class="xtra" id="ygX2">'+order.slice(3).map(function(s){return '<span><small>'+s.l+'</small>'+s.v+'</span>'}).join('')+'</div>':'');
 if(0)h+='<div class="mfoot">'+(hasDraw?'<span>'+I('<path d="M9 11V5a2 2 0 0 1 4 0v5l4.5 1a2 2 0 0 1 1.5 2.3L18 19a3 3 0 0 1-3 2h-3.5a3 3 0 0 1-2.4-1.2L5.5 15a1.6 1.6 0 0 1 2.4-2.1L9 14"/>',12)+'Ölçüye dokun, çizimde göster</span>':'<span></span>')+(extra>0?'<button class="more" id="ygMore">+'+extra+' özellik '+I('<path d="m6 9 6 6 6-6"/>',10)+'</button>':'')+'</div>';}
h+='</div>';
var box=document.createElement('div');box.className='ymg'+(ydrawResult?' ydmod':'');box.innerHTML=h;
[].forEach.call(L.children,function(c){c.style.setProperty('display','none','important')});st.textContent+='.leftImage>:not(.ymg){display:none!important}';L.appendChild(box);L.style.width=L.style.width||'';
Q2(box);var mk=document.createElement('div');mk.innerHTML='<svg width="0" height="0" style="position:absolute"><defs><marker id="ygRed" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9z" fill="#d0101e"/></marker></defs></svg>';document.body.appendChild(mk.firstChild);
// --- davranış
function $(i){return document.getElementById(i)}function Q(s,r){return [].slice.call((r||box).querySelectorAll(s))}
var card=$('ygCard'),photo=$('ygPhoto'),cur=0,drawOn=false;
function isMob(){return window.innerWidth<=767}
function marker(line,name,on){var d='data-yd-'+name;if(on){if(line.hasAttribute(name)&&!line.hasAttribute(d))line.setAttribute(d,line.getAttribute(name));if(line.hasAttribute(d))line.setAttribute(name,'url(#ygRed)')}else if(line.hasAttribute(d)){line.setAttribute(name,line.getAttribute(d));line.removeAttribute(d)}}
function syncModuleHighlights(root,k){if(!root)return;[].forEach.call(root.querySelectorAll('.hl[data-k]'),function(g){var on=k!=null&&g.getAttribute('data-k')===String(k);g.classList.toggle('on',on);[].forEach.call(g.querySelectorAll('line'),function(line){marker(line,'marker-start',on);marker(line,'marker-end',on)})})}
if(hasDraw){$('ygDraw').innerHTML=ydrawResult?ydrawResult.svg:draw({});$('ygBig').innerHTML=ydrawResult?ydrawBig:draw({dim:'#d0101e'});}
function render(){Q('.view.ph').forEach(function(v){v.classList.toggle('off',drawOn||+v.dataset.i!=cur)});if(hasDraw){$('ygBig').classList.toggle('off',!drawOn);$('ygMsw').classList.toggle('t1',drawOn);box.classList.toggle('dr',drawOn);if(drawOn){var n=box.querySelector('.msw .nudge');n&&n.classList.remove('nudge')}}
 Q('.thumbs button').forEach(function(b){b.classList.toggle('on',+b.dataset.i==cur)});Q('.dots i').forEach(function(d,i){d.classList.toggle('on',i==cur&&!drawOn)});var c=$('ygCnt');if(c)c.textContent=(cur+1)+' / '+photos.length;}
function go(i){cur=(i+photos.length)%photos.length;drawOn=false;render()}
function setDraw(t){drawOn=!!t&&hasDraw&&isMob();render()}
Q('.thumbs button').forEach(function(b){b.onclick=function(e){e.stopPropagation();go(+b.dataset.i)}});
Q('[data-nav]').forEach(function(b){b.onclick=function(e){e.stopPropagation();go(cur+ +b.dataset.nav)}});
Q('.msw button').forEach(function(b){b.onclick=function(){setDraw(b.dataset.t=='1')}});
Q('.seg button').forEach(function(b){b.onclick=function(){if(ydrawResult)return;Q('.seg button').forEach(function(x){x.classList.toggle('on',x==b)});$('ygDraw').innerHTML=draw({m:b.dataset.m})}});
Q('.sp.k').forEach(function(c){c.onclick=function(){var same=card.dataset.h==c.dataset.k;if(same)delete card.dataset.h;else card.dataset.h=c.dataset.k;Q('.sp').forEach(function(x){x.classList.toggle('on',!same&&x==c)});if(ydrawResult){syncModuleHighlights(box,same?null:c.dataset.k);if(lbT){if(same)delete cnt.dataset.h;else cnt.dataset.h=c.dataset.k;syncModuleHighlights(cnt,same?null:c.dataset.k)}}else if(lbT){if(same)delete cnt.dataset.h;else cnt.dataset.h=c.dataset.k}if(isMob()&&!same)setDraw(true)}});
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
function fill(t,i){lbT=t&&hasDraw;if(i!=null)lbI=(i+photos.length)%photos.length;cnt.innerHTML=lbT?(ydrawResult?ydrawResult.svg:draw({})):'<img src="'+photos[lbI].zoom+'" alt="">';if(lbT&&card.dataset.h)cnt.dataset.h=card.dataset.h;else delete cnt.dataset.h;if(ydrawResult)syncModuleHighlights(cnt,lbT?card.dataset.h:null);
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
var ns='http://www.w3.org/2000/svg';
var R=' stroke="#ff6b7d"';
var I={
d:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5" stroke-opacity=".55"/><path d="M8.6 12h6.8M10 10.6L8.6 12l1.4 1.4M14 10.6l1.4 1.4-1.4 1.4"'+R+'/>',
D:'<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3.6" stroke-opacity=".55"/><path d="M2.6 12h18.8M4 10.6L2.6 12 4 13.4M20 10.6l1.4 1.4-1.4 1.4"'+R+'/>',
B:'<rect x="6.5" y="8" width="11" height="13" rx="1.6"/><circle cx="12" cy="14.5" r="2.3" stroke-opacity=".7"/><path d="M6.5 4h11M8 2.6L6.5 4 8 5.4M16 2.6L17.5 4 16 5.4"'+R+'/>',
m:'<path d="M12 2.8l7.2 3v5.4c0 4.6-3.1 8.2-7.2 10-4.1-1.8-7.2-5.4-7.2-10V5.8z"/><path d="M8.8 12.2l2.2 2.2 4.4-4.6"'+R+'/>',
n:'<path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l9 9a1.4 1.4 0 0 1 0 2l-6.8 6.8a1.4 1.4 0 0 1-2 0z"/><circle cx="8.2" cy="8.2" r="1.6"'+R+'/>',
k:'<circle cx="12" cy="12" r="8.8"/><circle cx="12" cy="12" r="5.6" stroke-dasharray="2.2 1.8"'+R+'/><circle cx="12" cy="12" r="2.4" stroke-opacity=".55"/>',
s:'<path d="M12 3l9 4.8-9 4.8-9-4.8z"/><path d="M3 12.2l9 4.8 9-4.8M3 16.6l9 4.8 9-4.8" stroke-opacity=".75"/><circle cx="12" cy="7.8" r="1.2"'+R+'/>',
w:'<path d="M8.5 8.5a3.5 3.5 0 1 1 7 0"/><path d="M6 9h12l2.2 11.2H3.8z"/><path d="M10 15h4"'+R+'/>',
t:'<path d="M14 14.6V5a2 2 0 1 0-4 0v9.6a4.2 4.2 0 1 0 4 0z"/><path d="M12 9v8"'+R+'/><circle cx="12" cy="17.6" r="1.4"'+R+'/>',
x:'<path d="M3 5.5h18v3.5H3z"/><path d="M5.5 9v10l2.5-2V9M15 9v5"/><path d="M9 5.5v2M12 5.5v2M15 5.5v2M18 5.5v2"'+R+'/>'};
function ic(l){return /^(iç|İç)\s*çap/i.test(l)?'d':/^dış\s*çap/i.test(l)?'D':/^(genişlik|kalınlık|yükseklik)/i.test(l)?'B':/marka/i.test(l)?'m':/kapak|keçe|conta|sızdırmaz/i.test(l)?'k':/seri|tip|tür|model/i.test(l)?'s':/yük|ağırlık/i.test(l)?'w':/sıcaklık/i.test(l)?'t':/(no|kod|numara)$/i.test(l)?'n':'x'}
if(!document.getElementById('yonCss')){var st=document.createElement('style');st.id='yonCss';st.textContent=
'.yon{display:grid;grid-template-columns:repeat(var(--c),minmax(0,1fr));gap:1px;background:#e3e8ef;border:1px solid #e3e8ef;border-radius:14px;overflow:hidden;margin:14px 0 4px;box-shadow:0 4px 14px rgba(15,39,66,.05);font-family:inherit}'+
'.yon .oi{background:linear-gradient(180deg,#fff,#f8fafc);padding:11px 12px;display:flex;align-items:center;gap:10px;min-width:0;transition:background .15s}'+
'.yon .oi:hover{background:#fff}'+
'.yon .ic{flex:0 0 34px;width:34px;height:34px;border-radius:10px;background:linear-gradient(140deg,#16365f,#0f2742 60%,#0a1d33);box-shadow:0 3px 8px rgba(15,39,66,.22),inset 0 1px 0 rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s}.yon .oi:hover .ic{transform:translateY(-1px) rotate(-4deg);box-shadow:0 5px 12px rgba(15,39,66,.3)}.yon .oi.m .ic{background:linear-gradient(140deg,#e0263f,#c8102e 60%,#a50d26)}.yon .oi.m .ic [stroke]{stroke:#fff}'+
'.yon .ic svg{width:21px;height:21px;fill:none;stroke:#fff;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}'+
'.yon .tx{display:flex;flex-direction:column;min-width:0;gap:1px}'+
'.yon small{font-size:10.5px;font-weight:600;color:#64748b;letter-spacing:.4px;text-transform:uppercase;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
'.yon b{font-size:16px;font-weight:800;color:#0f2742;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
'@media(min-width:992px){.RightDetail{padding-left:36px!important}}.yon b .u{font-family:inherit!important;font-style:normal;font-size:11.5px;font-weight:600;color:#64748b;margin-left:2px}'+
'.yon .oi.m b{color:#c8102e}'+'.yon.cmp .oi{display:grid;grid-template-columns:20px minmax(0,1fr);column-gap:6px;row-gap:3px;align-items:center;padding:9px 10px}.yon.cmp .tx{display:contents}.yon.cmp .ic{width:20px;height:20px;border-radius:6px;box-shadow:0 2px 5px rgba(15,39,66,.2)}.yon.cmp .ic svg{width:14px;height:14px;stroke-width:1.9}.yon.cmp b{grid-column:1/-1}.yon.cmp small{letter-spacing:.1px}'+
'@media(max-width:767px){.yon{margin:10px 0 2px;border-radius:12px}.yon .oi{padding:9px 10px;gap:8px}.yon .ic{flex-basis:28px;width:28px;height:28px;border-radius:8px}.yon .ic svg{width:18px;height:18px}.yon small{font-size:9.5px;letter-spacing:.2px}.yon b{font-size:14.5px;white-space:normal;overflow-wrap:anywhere}}';
document.head.appendChild(st)}
var n=c.length,mob=matchMedia('(max-width:767px)').matches,col=mob?(n<=3?n:n==4?2:3):(n<=5?n:Math.ceil(n/2));
var d=document.createElement('div');d.className='yon'+((!mob&&col>=5)||(mob&&col==3)?' cmp':'');d.style.setProperty('--c',col);
c.forEach(function(x,i){var k=ic(x.l),e=document.createElement('div');e.className='oi '+k;e.title=x.l+': '+x.v;
var g=document.createElement('span');g.className='ic';var sv=document.createElementNS(ns,'svg');sv.setAttribute('viewBox','0 0 24 24');sv.innerHTML=I[k];g.appendChild(sv);
var t=document.createElement('span');t.className='tx';var a=document.createElement('small');a.textContent=x.l;var b=document.createElement('b');
var mm=x.v.match(/^([\d.,]+)\s*(mm|cm|kg|gr|g|kN|N)$/);if(mm){b.textContent=mm[1];var u=document.createElement('span');u.className='u';u.textContent=mm[2];b.appendChild(u)}else b.textContent=x.v;
t.appendChild(a);t.appendChild(b);e.appendChild(g);e.appendChild(t);
var r=n%col;if(r&&i==n-1)e.style.gridColumn='span '+(col-r+1);d.appendChild(e)});
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
