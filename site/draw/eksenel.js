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
