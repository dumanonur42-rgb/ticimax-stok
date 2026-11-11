(function(){
var COLOR='#16203a',LETTER=/\(([A-Za-z0-9]+)\)\s*$/;
var SERIES='SSUCP SUCP SSUCF SUCF SSUCFL SUCFL SSUCFC SUCFC SSUCT SUCT SSUCFB SUCFB SSUCPA SUCPA UCFB UCPA SN FRB TSN SUC UC SSBF SSBP SSBT S-SBF S-SBP S-SBT';
var DELEGATE={SSUCP:'UCP',SUCP:'UCP',SSUCF:'UCF',SUCF:'UCF',SSUCFL:'UCFL',SUCFL:'UCFL',SSUCFC:'UCFC',SUCFC:'UCFC',SSUCT:'UCT',SUCT:'UCT'};
var REQUIRED={UCP:'d H H2 L J A N B',UCF:'d L J A B',UCFL:'d H L J A B',UCFC:'d L J H3 B',UCT:'d A H H2 L L1 N B',
 FB:'d w A b D i l s g h j e Z',PA:'d H H2 L J A N B',SN:'d1 D H H1 H2 J L A A1 N g',FRB:'D d1 B',INSERT:'d D B C S',SBF:'d L J A B',SBP:'d H H2 L J A N B',SBT:'d A H H2 L L1 N B'};
var LABEL={d:'Mil Çapı (d)',D:'Dış Çap (D)',d1:'İç Çap (d1)',B:'Mil Bil. Genişliği (B)',C:'Yuva Bil. Genişliği (C)',S:'Mil Bil. Ucu - Merkez (S)',
 w:'Toplam Boy (w)',A:'Gövde Genişliği (A)',b:'Üst Gövde Genişliği (b)',i:'Montaj Yüzeyi - Merkez (i)',l:'Gövde Derinliği (l)',s:'Cıvata Deliği (s)',g:'Taban Kalınlığı (g)',h:'Merkez - Delik Hattı (h)',j:'Delik Hatları Arası (j)',e:'Cıvata Aralığı (e)',Z:'Montaj Derinliği (Z)',
 H:'Merkez Yüksekliği (H)',H1:'Taban Yüksekliği (H1)',H2:'Toplam Yükseklik (H2)',J:'Cıvata Aralığı (J)',L:'Taban Uzunluğu (L)',A1:'Taban Genişliği (A1)',N:'Cıvata Deliği (N)',L1:'Kızak Ucu - Merkez (L1)'};
function trim(s){return String(s==null?'':s).replace(/^\s+|\s+$/g,'')}
function field(c,name){var value=null,a=c&&c.specs||[];for(var i=0;i<a.length;i++)if(trim(a[i].l)===name){var v=trim(a[i].v);if(value!==null&&value!==v)return null;value=v}return value}
function serie(c){var s=field(c,'Seri');return s&&SERIES.split(' ').indexOf(s)!==-1?s:null}
function match(c){if(!serie(c))return false;var a=c.specs||[];for(var i=0;i<a.length;i++)if(LETTER.test(trim(a[i].l)))return true;return false}
function dimensions(c){var d={},a=c.specs||[],m,n,i,v;for(i=0;i<a.length;i++){
 m=LETTER.exec(trim(a[i].l));if(!m)continue;
 v=trim(a[i].v);if(!/^\+?(?:\d+(?:[.,]\d+)?|[.,]\d+)\s*(?:mm)?$/i.test(v))return null;
 n=Number(v.replace(/\s*mm$/i,'').replace(',','.'));if(!(n>0)||!isFinite(n))return null;
 if(Object.prototype.hasOwnProperty.call(d,m[1])&&d[m[1]]!==n)return null;d[m[1]]=n;
 }return d}
function has(d,kind){var a=REQUIRED[kind].split(' ');for(var i=0;i<a.length;i++)if(!(d[a[i]]>0))return false;return true}
function kind(s){if(/UCFB$/.test(s))return 'FB';if(/UCPA$/.test(s))return 'PA';if(s==='SUC'||s==='UC')return 'INSERT';return s.replace(/^S-SB/,'SB').replace(/^SSB/,'SB')}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
function n(v){return Math.round(v*100)/100}
function f(v){return String(v).replace('.',',')}
function Pen(d,opt,type){this.d=d;this.type=type;this.id=trim(opt.id||'yatak').replace(/[^A-Za-z0-9_-]/g,'_')+'-';this.dim=/^#[0-9a-f]{3,8}$/i.test(opt.dim||'')?opt.dim:'#0a2350';this.s='';this.keys=[]}
var P=Pen.prototype;
P.line=function(x,y,x2,y2,extra){return '<line x1="'+n(x)+'" y1="'+n(y)+'" x2="'+n(x2)+'" y2="'+n(y2)+'" stroke="'+COLOR+'" stroke-width="1.3"'+(extra||'')+'/>'};
P.path=function(d,fill){return '<path d="'+d+'" fill="'+(fill||'none')+'" fill-rule="evenodd" stroke="'+COLOR+'" stroke-width="1.5" stroke-linejoin="round"/>'};
P.rect=function(x,y,w,h,fill){return '<rect x="'+n(x)+'" y="'+n(y)+'" width="'+n(w)+'" height="'+n(h)+'" fill="'+(fill||'none')+'" stroke="'+COLOR+'" stroke-width="1.4"/>'};
P.circle=function(x,y,r,fill){return '<circle cx="'+n(x)+'" cy="'+n(y)+'" r="'+n(r)+'" fill="'+(fill||'none')+'" stroke="'+COLOR+'" stroke-width="1.3"/>'};
P.text=function(x,y,s,rot,size){return '<text x="'+n(x)+'" y="'+n(y)+'" text-anchor="middle" font-family="inherit" font-size="'+(size||12)+'" font-weight="700" fill="'+this.dim+'" stroke="#fff" stroke-width="3" paint-order="stroke"'+(rot?' transform="rotate(-90 '+n(x)+' '+n(y)+')"':'')+'>'+esc(s)+'</text>'};
P.axis=function(x,y,x2,y2){return this.line(x,y,x2,y2,' stroke-dasharray="12 3 2 3" opacity=".55"')};
P.hatch=function(reverse){return 'url(#'+this.id+(reverse?'h2':'h')+')'};
P.label=function(k){if(this.type==='SN'){var sn={D:'Rulman Yuvası Çapı (D)',d1:'Manşonlu Mil Çapı (d1)',A:'Toplam Genişlik (A)',g:'Kapak Cıvatası Aralığı (g)'};if(sn[k])return sn[k]}
 if(this.type==='FB'&&k==='D')return 'Alt Gövde Genişliği (D)';if(this.type==='FB'&&k==='A')return 'Merkez - Alt Uç (A)';if(this.type==='FRB'&&k==='B')return 'Bilezik Genişliği (B)';if(this.type==='PA'&&k==='N')return 'Dişli Delik Çapı (N)';return LABEL[k]||k};
P.value=function(k){return ((k==='d'||k==='d1'||(k==='D'&&this.type!=='FB')||(k==='s'&&this.type==='FB')||(k==='N'&&this.type==='PA'))?'ø':'')+f(this.d[k])};
P.dimension=function(k,x1,y1,x2,y2,vertical,offset){var val=this.d[k],s=this.line(x1,y1,x2,y2,' style="stroke:'+this.dim+'" marker-start="url(#'+this.id+'a)" marker-end="url(#'+this.id+'a)"');
 s+=this.text(vertical?x1-6:(x1+x2)/2,vertical?(y1+y2)/2:y1+(offset||-5),this.value(k),vertical);
 this.s+='<g class="hl" data-k="'+k+'">'+s+'</g>';this.keys.push({k:k,l:this.label(k),v:f(val)+' mm'})};
P.h=function(k,x1,x2,y,edge){this.s+=this.line(x1,edge,x1,y+3,' opacity=".4"')+this.line(x2,edge,x2,y+3,' opacity=".4"');this.dimension(k,x1,y,x2,y,false)};
P.v=function(k,x,y1,y2,edge){this.s+=this.line(edge,y1,x+3,y1,' opacity=".4"')+this.line(edge,y2,x+3,y2,' opacity=".4"');this.dimension(k,x,y1,x,y2,true)};
P.leader=function(k,x,y,tx,ty){var s=this.line(tx,ty,x,y,' style="stroke:'+this.dim+'" marker-end="url(#'+this.id+'a)"')+this.text(tx,ty-5,this.value(k));this.s+='<g class="hl" data-k="'+k+'">'+s+'</g>';this.keys.push({k:k,l:this.label(k),v:f(this.d[k])+' mm'})};
P.head=function(){this.s+=this.text(125,15,'ÖN GÖRÜNÜŞ',false,10)+this.text(350,15,'KESİT A-A',false,10)};
P.cut=function(x,y,r){this.s+=this.line(x,y-r-7,x,y+r+7,' stroke-dasharray="9 3"')+this.text(x,y-r-11,'A',false,10)+this.text(x,y+r+18,'A',false,10)};
P.svg=function(){return {svg:'<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 460 260" style="display:block;font-family:inherit"><defs><pattern id="'+this.id+'h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#9aa6bd" stroke-width="1"/></pattern><pattern id="'+this.id+'h2" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="4" stroke="#9aa6bd" stroke-width="1.1"/></pattern><marker id="'+this.id+'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 1 L10 5 L0 9" fill="none" stroke="'+this.dim+'"/></marker></defs>'+this.s+'</svg>',keys:this.keys}};
function hidden(p,x1,y1,x2,y2){return p.line(x1,y1,x2,y2,' stroke-dasharray="4 3" style="stroke-width:.8"')}
function frontInsert(p,x,y,R,r){
 var gap=R-r,ri=r+gap*.28,ro=r+gap*.7,pr=(ri+ro)/2,ball=(ro-ri)*.42;
 p.s+=p.circle(x,y,R,'#fff')+p.circle(x,y,ro)+p.circle(x,y,ri)+p.circle(x,y,r);
 for(var i=0;i<10;i++){var a=i*Math.PI/5;p.s+=p.circle(x+pr*Math.cos(a),y+pr*Math.sin(a),ball,'#fff')}
 var q=(ri+r)/2*.7071;
 p.s+='<g data-part="set-screw">'+p.circle(x+q,y-q,Math.max(1.6,(ri-r)*.24),'#fff')+p.line(x+q-1,y-q+1,x+q+1,y-q-1)+'</g>';
 p.s+=p.axis(x-R-8,y,x+R+8,y)+p.axis(x,y-R-8,x,y+R+8);
}
function seat(p,x0,x1,c,y,R,r,half){
 var edge=Math.sqrt(Math.max(R*R-half*half,R*R*.75)),neck=r+(R-r)*.41;
 p.s+=p.path('M'+n(c-half)+','+n(y-edge)+' Q'+n(c)+','+n(y-(2*R-edge))+' '+n(c+half)+','+n(y-edge)+' V'+n(y+edge)+' Q'+n(c)+','+n(y+(2*R-edge))+' '+n(c-half)+','+n(y+edge)+' Z','#fff');
 p.s+=p.rect(x0-1,y-neck,x1-x0+2,neck*2,'#fff').replace('stroke="'+COLOR+'"','stroke="none"');
}
function bearing(p,x0,x1,c,y,R,r,half,screw){
 var gap=R-r,pr=r+gap*.52,br=gap*.235,il=pr-br*.64,ol=pr+br*.64,gr=br*1.04;
 half=Math.max(half,br*1.2);
 var arc=Math.sqrt(Math.max(0,gr*gr-(pr-il)*(pr-il)));
 [-1,1].forEach(function(sign){
  function pts(a){return a.map(function(v){return n(v[0])+','+n(y+sign*v[1])}).join(' L')}
  var inner=[[x0+1,r],[x1-1,r],[x1,r+1],[x1,il],[c+arc,il]];
  for(var i=0;i<=12;i++){var theta=Math.acos((pr-il)/gr),angle=theta-2*theta*i/12;inner.push([c+gr*Math.sin(angle),pr-gr*Math.cos(angle)])}
  inner.push([x0,il],[x0,r+1]);
  p.s+='<g data-part="inner-race">'+p.path('M'+pts(inner)+' Z',p.hatch(true))+'</g>';
  var edge=Math.sqrt(Math.max(R*R-half*half,R*R*.75)),outer='M'+n(c-half)+','+n(y+sign*edge)+' Q'+n(c)+','+n(y+sign*(2*R-edge))+' '+n(c+half)+','+n(y+sign*edge)+' L'+n(c+half)+','+n(y+sign*ol)+' L'+n(c+arc)+','+n(y+sign*ol);
  for(i=0;i<=12;i++){var th=Math.acos((ol-pr)/gr),an=th-2*th*i/12;outer+=' L'+n(c+gr*Math.sin(an))+','+n(y+sign*(pr+gr*Math.cos(an)))}
  outer+=' L'+n(c-half)+','+n(y+sign*ol)+' Z';
  p.s+='<g data-part="outer-race">'+p.path(outer,p.hatch(true))+'</g><g data-part="ball">'+p.circle(c,y+sign*pr,br,'#fff')+'</g>';
  p.s+=p.line(c-half+1,y+sign*il,c-half+1,y+sign*ol)+p.line(c+half-1,y+sign*il,c+half-1,y+sign*ol);
 });
 var sw=Math.max(3,Math.min(5,(x1-x0)*.085)),top=y-il-2;
 p.s+=p.rect(screw-sw/2,top,sw,il-r+2,'#fff');
 p.s+=p.line(screw-sw/2,top+2,screw+sw/2,top+2)+p.line(screw-sw/2,top+4,screw+sw/2,top+4);
 p.s+=p.axis(x0-9,y,x1+9,y)+p.axis(c,y-R-8,c,y+R+8);
}
function insert(p){
 var d=p.d,s=Math.min(146/d.D,90/d.B),R=d.D*s/2,r=d.d*s/2,x=294,y=134,w=d.B*s,c=x+d.S*s,half=d.C*s/2;
 frontInsert(p,122,y,70,70*d.d/d.D);p.cut(122,y,70);
 var screw=x+w-d.S*s;
 bearing(p,x,x+w,c,y,R,r,half,screw);
 p.h('B',x,x+w,35,y-R-4);p.h('S',screw,x+w,56,y-r-9);
 p.h('C',c-half,c+half,239,y+R+3);
 p.v('D',435,y-R,y+R,x+w+4);p.v('d',411,y-r,y+r,x+w+4);
}
function ring(p){var d=p.d,R=72,r=R*d.d1/d.D,y=131,s=Math.min(144/d.D,70/d.B),x=312,w=d.B*s,rs=d.D*s/2,ri=d.d1*s/2;
 p.s+=p.circle(120,y,R)+p.circle(120,y,r)+p.axis(39,y,201,y)+p.axis(120,50,120,212);p.cut(120,y,R);
 [-1,1].forEach(function(q){p.s+=p.rect(x,q<0?y-rs:y+ri,w,rs-ri,p.hatch())});
 p.s+=p.axis(x-12,y,x+w+10,y);p.h('B',x,x+w,43,y-rs);p.v('D',430,y-rs,y+rs,x+w);p.v('d1',278,y-ri,y+ri,x);
}
function sn(p){
 var d=p.d,s=Math.min(188/d.L,132/d.H2),cx=137,y=196,cy=y-d.H*s,top=y-d.H2*s,base=y-d.H1*s,x=cx-d.L*s/2,right=cx+d.L*s/2,R=d.D*s/2,body=R+15,lug=body+9,foot=base;
 var cap='M'+n(cx-lug)+','+n(cy)+' L'+n(cx-lug)+','+n(top+14)+' L'+n(cx-body)+','+n(top+14)+' Q'+n(cx-body)+','+n(top)+' '+n(cx-body+13)+','+n(top)+' L'+n(cx+body-13)+','+n(top)+' Q'+n(cx+body)+','+n(top)+' '+n(cx+body)+','+n(top+14)+' L'+n(cx+lug)+','+n(top+14)+' L'+n(cx+lug)+','+n(cy)+' Z';
 p.s+=p.path('M'+n(x+3)+','+n(y)+' H'+n(right-3)+' Q'+n(right)+','+n(y)+' '+n(right)+','+n(y-3)+' V'+n(foot)+' H'+n(cx+body)+' L'+n(cx+lug)+','+n(cy)+' H'+n(cx-lug)+' L'+n(cx-body)+','+n(foot)+' H'+n(x)+' V'+n(y-3)+' Z','#fff')+p.path(cap,'#fff');
 p.s+=p.circle(cx,cy,R).replace('stroke-width="1.3"','stroke-width=".8" stroke-dasharray="4 3"')+p.circle(cx,cy,d.d1*s/2,'#fff');
 [-1,1].forEach(function(q){
  var bolt=cx+q*(body+2),hx=cx+q*d.J*s/2,hw=d.N*s/2;
  p.s+=p.rect(bolt-4,top+7,8,6,'#fff')+hidden(p,bolt-2,top+13,bolt-2,base)+hidden(p,bolt+2,top+13,bolt+2,base);
  p.s+=hidden(p,hx-hw,base,hx-hw,y)+hidden(p,hx+hw,base,hx+hw,y)+p.axis(hx,base-3,hx,y+4);
 });
 p.s+=p.line(cx-lug,cy,cx-d.d1*s/2,cy)+p.line(cx+d.d1*s/2,cy,cx+lug,cy)+p.axis(x-3,cy,right+3,cy)+p.axis(cx,top-8,cx,y+5);
 var ss=Math.min(90/d.A,132/d.H2),sc=350,sx=sc-d.A*ss/2,ex=sc+d.A*ss/2,sy=y-d.H*ss,st=y-d.H2*ss,b=d.A1*ss/2,rr=d.D*ss/2,r=d.d1*ss/2,cavity=d.A*ss*.24,seal=5;
 var outline='M'+n(sx+4)+','+n(st)+' H'+n(ex-4)+' Q'+n(ex)+','+n(st)+' '+n(ex)+','+n(st+4)+' V'+n(base)+' H'+n(sc+b)+' V'+n(y)+' H'+n(sc-b)+' V'+n(base)+' H'+n(sx)+' V'+n(st+4)+' Q'+n(sx)+','+n(st)+' '+n(sx+4)+','+n(st)+' Z';
 p.s+=p.path(outline,p.hatch());
 var voidPath='M'+n(sx-1)+','+n(sy-r)+' H'+n(sc-cavity-seal)+' V'+n(sy-r-4)+' H'+n(sc-cavity)+' V'+n(sy-rr)+' H'+n(sc+cavity)+' V'+n(sy-r-4)+' H'+n(sc+cavity+seal)+' V'+n(sy-r)+' H'+n(ex+1)+' V'+n(sy+r)+' H'+n(sc+cavity+seal)+' V'+n(sy+r+4)+' H'+n(sc+cavity)+' V'+n(sy+rr)+' H'+n(sc-cavity)+' V'+n(sy+r+4)+' H'+n(sc-cavity-seal)+' V'+n(sy+r)+' H'+n(sx-1)+' Z';
 p.s+=p.path(voidPath,'#fff')+p.line(sx,sy,sc-cavity,sy)+p.line(sc+cavity,sy,ex,sy)+p.axis(sx-9,sy,ex+9,sy);
 [-1,1].forEach(function(q){var bx=sc+q*d.g*ss/2;p.s+=p.rect(bx-3,st-5,6,5,'#fff')+hidden(p,bx-1.5,st,bx-1.5,sy-rr-2)+hidden(p,bx+1.5,st,bx+1.5,sy-rr-2)});
 p.h('g',sc-d.g*ss/2,sc+d.g*ss/2,60,st-7);
 p.h('A',sx,ex,36,st-7);p.h('A1',sc-b,sc+b,243,y+2);
 p.dimension('D',sc,sy-rr,sc,sy+rr,true);
 p.v('d1',435,sy-r,sy+r,ex+3);
 p.h('J',cx-d.J*s/2,cx+d.J*s/2,219,y+3);p.h('L',x,right,244,y+3);
 p.v('H',28,cy,y,x-2);p.v('H2',259,top,y,right+3);
 p.v('H1',10,base,y,x-2);
 var hx=cx+d.J*s/2;p.h('N',hx-d.N*s/2,hx+d.N*s/2,base-9,base-2);
}
function bracket(p){
 var d=p.d,s=Math.min(143/d.w,112/Math.max(d.b,d.D)),cx=127,cy=87,R=d.b*s/2,bottom=cy+d.A*s,holeY=cy+d.h*s,tipY=holeY+d.j*s,hr=d.s*s/2;
 p.s+=p.path('M'+n(cx-R)+','+n(cy)+' A'+n(R)+','+n(R)+' 0 0 1 '+n(cx+R)+','+n(cy)+' L'+n(cx+d.D*s/2)+','+n(holeY)+' Q'+n(cx+d.D*s/2)+','+n(holeY+7)+' '+n(cx+8)+','+n(bottom-3)+' Q'+n(cx)+','+n(bottom+4)+' '+n(cx-8)+','+n(bottom-3)+' L'+n(cx-d.D*s/2)+','+n(holeY)+' Z','#fff');
 frontInsert(p,cx,cy,R*.83,d.d*s/2);
 [[-d.e*s/2,holeY],[d.e*s/2,holeY],[0,tipY]].forEach(function(a){p.s+=p.circle(cx+a[0],a[1],hr)+p.axis(cx+a[0]-hr-3,a[1],cx+a[0]+hr+3,a[1])});
 var scale=Math.min(88/d.Z,3),sx=303,ex=sx+d.Z*scale,sy=128,rr=Math.min(44,d.b*s*.44),r=d.d*s/2,cc=sx+d.i*scale,x0=cc-d.Z*scale*.32,x1=ex,half=(x1-x0)*.29,roof=sy-rr-15;
 p.s+=p.path('M'+n(sx)+','+n(roof)+' H'+n(sx+d.l*scale-4)+' Q'+n(sx+d.l*scale)+','+n(roof)+' '+n(sx+d.l*scale)+','+n(roof+5)+' V'+n(sy+rr)+' L'+n(sx+d.g*scale)+','+n(sy+rr+26)+' H'+n(sx)+' Z',p.hatch());
 seat(p,x0,x1,cc,sy,rr,r,half);
 bearing(p,x0,x1,cc,sy,rr,r,half,x1-5);
 p.h('b',cx-R,cx+R,32,cy-R-2);p.h('D',cx-d.D*s/2,cx+d.D*s/2,241,bottom+5);
 p.h('e',cx-d.e*s/2,cx+d.e*s/2,219,bottom+5);
 p.v('w',17,cy-R,cy-R+d.w*s,cx-R-3);p.v('A',42,cy,bottom,cx-R-3);
 p.v('h',222,cy,holeY,cx+R+3);
 p.dimension('j',245,holeY,245,tipY,true);
 p.s+=p.line(cx+d.D*s/2+3,tipY,248,tipY,' opacity=".35"')+p.line(cx+d.D*s/2+3,holeY,248,holeY,' opacity=".35"');
 p.leader('s',cx-d.e*s/2-hr,holeY+hr*.3,60,holeY+21);
 p.h('Z',sx,ex,36,roof-3);p.h('i',sx,cc,59,roof-3);
 p.h('l',sx,sx+d.l*scale,241,sy+rr+28);p.h('g',sx,sx+d.g*scale,219,sy+rr+28);
 p.v('d',435,sy-r,sy+r,ex+3);
}
function housed(p,t){
 var d=p.d,cx=128,cy=119,R=42,r=R*.57,sx=314,sy=125,w=62;
 if(t==='SBF'){
  p.s+=p.path('M60 44 H196 Q203 44 203 51 V187 Q203 194 196 194 H60 Q53 194 53 187 V51 Q53 44 60 44 Z','#fff');
  [-1,1].forEach(function(q){[-1,1].forEach(function(z){p.s+=p.circle(cx+q*52,cy+z*52,6)})});
  p.h('L',53,203,239,197);p.h('J',76,180,32,41);
 }else if(t==='SBT'){
  p.s+=p.path('M69 45 H190 Q198 45 198 53 V182 Q198 190 190 190 H69 V158 H48 V77 H69 Z','#fff')+p.rect(53,98,23,30);
  p.h('L',48,198,244,193);p.h('L1',48,cx,218,193);p.v('H',20,45,190,45);p.v('H2',225,77,158,201);p.leader('N',53,112,30,61);
 }else{
  p.s+=p.path('M51 198 H205 Q208 198 208 195 V177 Q208 174 205 174 H184 V119 A56 66 0 0 0 72 119 V174 H51 Q48 174 48 177 V195 Q48 198 51 198 Z','#fff');
  p.h('L',48,208,246,201);p.h('J',68,188,218,201);p.v('H',21,cy,198,45);p.v('H2',235,53,198,211);
  [-1,1].forEach(function(q){var x=cx+q*60;p.s+=hidden(p,x-4,175,x-4,198)+hidden(p,x+4,175,x+4,198);
   if(t==='PA')for(var y=177;y<197;y+=4)p.s+=p.line(x-4,y,x+4,y-3)});
  p.h('N',184,192,161,171);
 }
 frontInsert(p,cx,cy,R,r);p.cut(cx,cy,R);
 p.s+=p.path('M314 59 H371 Q376 59 376 65 V177 H386 V191 H304 V177 H314 Z',p.hatch());
 seat(p,sx-7,sx+w+15,sx+w*.4,sy,46,r,23);
 bearing(p,sx-7,sx+w+15,sx+w*.4,sy,46,r,23,sx+w+8);
 p.h('A',sx,sx+w,237,194);p.h('B',sx-7,sx+w+15,36,55);p.v('d',432,sy-r,sy+r,sx+w+18);
}
(window.YDRAW=window.YDRAW||{}).yatak={
 match:match,
 draw:function(ctx,opt){
  if(!match(ctx))return null;var s=serie(ctx),d=dimensions(ctx),g=DELEGATE[s],t=kind(s),c,k;if(!d||s==='TSN')return null;
  if(g){if(!has(d,g)||!window.YDRAW.yatakli||typeof window.YDRAW.yatakli.draw!=='function')return null;
   c={};for(k in ctx)if(Object.prototype.hasOwnProperty.call(ctx,k))c[k]=ctx[k];c.title=g+' '+(field(ctx,'Numara')||'')+' Yataklı Rulman';c.specs=[];c.onyazi=[];c.data=d;
   return window.YDRAW.yatakli.draw(c,opt);
  }
  if(!REQUIRED[t]||!has(d,t))return null;
  if((t==='INSERT'&&(!(d.D>d.d)||d.C>d.B||d.S>=d.B||d.S<d.C/2||d.B-d.S<d.C/2))||(t==='FRB'&&!(d.D>d.d1)))return null;
  if(t==='SN'&&(!(d.D>d.d1)||d.H2<=d.H||d.H<=d.H1||d.J>=d.L||d.A1>d.A))return null;
  if((t==='PA'||t==='SBP')&&(d.H>=d.H2||d.J>=d.L))return null;
  var p=new Pen(d,opt||{},t);p.head();if(t==='INSERT')insert(p);else if(t==='FRB')ring(p);else if(t==='SN')sn(p);else if(t==='FB')bracket(p);else housed(p,t);return p.svg();
 }
};
})();
