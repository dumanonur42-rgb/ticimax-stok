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
P.hatch=function(){return 'url(#'+this.id+'h)'};
P.label=function(k){if(this.type==='SN'){var sn={D:'Rulman Yuvası Çapı (D)',d1:'Manşonlu Mil Çapı (d1)',A:'Toplam Genişlik (A)',g:'Kapak Cıvatası Aralığı (g)'};if(sn[k])return sn[k]}
 if(this.type==='FB'&&k==='D')return 'Alt Gövde Genişliği (D)';if(this.type==='FB'&&k==='A')return 'Merkez - Alt Uç (A)';if(this.type==='FRB'&&k==='B')return 'Bilezik Genişliği (B)';if(this.type==='PA'&&k==='N')return 'Dişli Delik Çapı (N)';return LABEL[k]||k};
P.dimension=function(k,x1,y1,x2,y2,vertical,offset){var val=this.d[k],s=this.line(x1,y1,x2,y2,' style="stroke:'+this.dim+'" marker-start="url(#'+this.id+'a)" marker-end="url(#'+this.id+'a)"');
 s+=this.text(vertical?x1-6:(x1+x2)/2,vertical?(y1+y2)/2:y1+(offset||-5),k+' '+f(val),vertical);
 this.s+='<g class="hl" data-k="'+k+'">'+s+'</g>';this.keys.push({k:k,l:this.label(k),v:f(val)+' mm'})};
P.h=function(k,x1,x2,y,edge){this.s+=this.line(x1,edge,x1,y+3,' opacity=".4"')+this.line(x2,edge,x2,y+3,' opacity=".4"');this.dimension(k,x1,y,x2,y,false)};
P.v=function(k,x,y1,y2,edge){this.s+=this.line(edge,y1,x+3,y1,' opacity=".4"')+this.line(edge,y2,x+3,y2,' opacity=".4"');this.dimension(k,x,y1,x,y2,true)};
P.leader=function(k,x,y,tx,ty){var s=this.line(tx,ty,x,y,' style="stroke:'+this.dim+'" marker-end="url(#'+this.id+'a)"')+this.text(tx,ty-5,k+' '+f(this.d[k]));this.s+='<g class="hl" data-k="'+k+'">'+s+'</g>';this.keys.push({k:k,l:this.label(k),v:f(this.d[k])+' mm'})};
P.head=function(){this.s+=this.text(125,15,'ÖN GÖRÜNÜŞ',false,10)+this.text(350,15,'KESİT A-A',false,10)};
P.cut=function(x,y,r){this.s+=this.line(x,y-r-7,x,y+r+7,' stroke-dasharray="9 3"')+this.text(x,y-r-11,'A',false,10)+this.text(x,y+r+18,'A',false,10)};
P.svg=function(){return {svg:'<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 460 260" style="display:block;font-family:inherit"><defs><pattern id="'+this.id+'h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#9aa6bd" stroke-width="1"/></pattern><marker id="'+this.id+'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 1 L10 5 L0 9" fill="none" stroke="'+this.dim+'"/></marker></defs>'+this.s+'</svg>',keys:this.keys}};
function face(p,x,y,R,r){p.s+=p.circle(x,y,R,'#fff')+p.circle(x,y,R*.78)+p.circle(x,y,r)+p.axis(x-R-9,y,x+R+9,y)+p.axis(x,y-R-9,x,y+R+9)}
function insert(p){var d=p.d,s=Math.min(140/d.D,82/d.B),R=d.D*s/2,r=d.d*s/2,x=300,y=130,w=d.B*s,c=x+d.S*s,ow=d.C*s;
 var fr=70*d.d/d.D,land=70-fr,pr=fr+land*.54,br=land*.19;
 p.s+=p.circle(119,y,70)+p.circle(119,y,fr)+p.circle(119,y,pr+br*1.1)+p.circle(119,y,pr-br*1.1);
 for(var i=0;i<8;i++){var angle=i*Math.PI/4;p.s+=p.circle(119+pr*Math.cos(angle),y+pr*Math.sin(angle),br,'#fff')}
 p.s+=p.axis(39,y,199,y)+p.axis(119,50,119,210);p.cut(119,y,70);
 var mid=(R+r)/2,ball=(R-r)*.26,inner=r+(R-r)*.3,outer=R-(R-r)*.25;
 [-1,1].forEach(function(sign){var yi=y+sign*r,yo=y+sign*R;
  var innerY=y+sign*inner,outerY=y+sign*outer,groove=ball*.35;
  p.s+=p.path('M'+n(x)+' '+n(yi)+' H'+n(x+w)+' V'+n(innerY)+' H'+n(c+ball)+' Q'+n(c)+' '+n(innerY-sign*groove)+' '+n(c-ball)+' '+n(innerY)+' H'+n(x)+' Z',p.hatch());
  p.s+=p.path('M'+n(c-ow/2)+' '+n(yo+sign*3)+' Q'+n(c)+' '+n(yo-sign*3)+' '+n(c+ow/2)+' '+n(yo+sign*3)+' V'+n(outerY)+' H'+n(c+ball)+' Q'+n(c)+' '+n(outerY+sign*groove)+' '+n(c-ball)+' '+n(outerY)+' H'+n(c-ow/2)+' Z',p.hatch());
  p.s+=p.circle(c,y+sign*mid,ball,'#fff');
 });
 p.s+=p.line(x,y-r,x+w,y-r)+p.line(x,y+r,x+w,y+r)+p.axis(x-12,y,x+w+12,y)+p.axis(c,y-R-8,c,y+R+8);
 p.h('B',x,x+w,35,y-R);p.h('C',c-ow/2,c+ow/2,225,y+R);p.h('S',x,c,248,y);
 p.v('D',416,y-R,y+R,x+w);p.v('d',444,y-r,y+r,x+w);
}
function ring(p){var d=p.d,R=72,r=R*d.d1/d.D,y=131,s=Math.min(144/d.D,70/d.B),x=312,w=d.B*s,rs=d.D*s/2,ri=d.d1*s/2;
 p.s+=p.circle(120,y,R)+p.circle(120,y,r)+p.axis(39,y,201,y)+p.axis(120,50,120,212);p.cut(120,y,R);
 [-1,1].forEach(function(q){p.s+=p.rect(x,q<0?y-rs:y+ri,w,rs-ri,p.hatch())});
 p.s+=p.axis(x-12,y,x+w+10,y);p.h('B',x,x+w,43,y-rs);p.v('D',430,y-rs,y+rs,x+w);p.v('d1',278,y-ri,y+ri,x);
}
function sn(p){var d=p.d,s=Math.min(188/d.L,139/d.H2),x=48,y=198,c=x+d.L*s/2,cy=y-d.H*s,bw=d.L*s,bh=d.H1*s,R=d.D*s/2,sw=Math.min(86/d.A,139/d.H2),sx=302,sc=sx+d.A*sw/2,sy=y-d.H*sw;
 p.s+=p.rect(x,y-bh,bw,bh,p.hatch())+p.path('M'+n(x+18)+' '+n(y-bh)+' L'+n(x+18)+' '+n(cy)+' Q'+n(c)+' '+n(y-d.H2*s-35)+' '+n(x+bw-18)+' '+n(cy)+' L'+n(x+bw-18)+' '+n(y-bh)+' Z',p.hatch())+p.circle(c,cy,R,'#fff');
 p.s+=p.line(x+18,cy,x+bw-18,cy)+p.axis(x-5,cy,x+bw+5,cy)+p.axis(c,y-d.H2*s-5,c,y+7);
 var half=d.J*s/2;[-1,1].forEach(function(q){var bx=c+q*half;p.s+=p.line(bx,y-bh,bx,y,' stroke-dasharray="4 3"')});
 p.s+=p.rect(sx,y-d.H2*sw,d.A*sw,d.H2*sw,p.hatch())+p.rect(sc-d.d1*sw/2,sy-d.d1*sw/2,d.d1*sw,d.d1*sw,'#fff')+p.axis(sx-8,sy,sx+d.A*sw+8,sy)+p.line(sx,sy,sx+d.A*sw,sy);
 p.cut(c,cy,Math.min(35,R));p.h('J',c-half,c+half,219,y);p.h('L',x,x+bw,248,y);p.v('H2',19,y-d.H2*s,y,x);p.v('H',254,cy,y,c);p.leader('H1',x+10,y-bh,61,192);
 p.leader('D',c-R*.7,cy-R*.7,211,36);p.leader('N',c-half,y-bh/2,70,44);p.h('g',c-d.g*s/2,c+d.g*s/2,61,cy);
 p.h('A',sx,sx+d.A*sw,35,y-d.H2*sw);p.h('A1',sc-d.A1*sw/2,sc+d.A1*sw/2,245,y);p.v('d1',431,sy-d.d1*sw/2,sy+d.d1*sw/2,sx+d.A*sw);
}
function bracket(p){var d=p.d,s=Math.min(145/d.w,120/Math.max(d.b,d.D)),cx=135,cy=86,R=d.b*s/2,bottom=cy+d.A*s,holeY=cy+d.h*s,tipY=holeY+d.j*s,hr=d.s*s/2;
 p.s+=p.path('M'+n(cx-R)+' '+n(cy)+' A'+n(R)+' '+n(R)+' 0 0 1 '+n(cx+R)+' '+n(cy)+' L'+n(cx+d.D*s/2)+' '+n(holeY)+' L'+n(cx)+' '+n(bottom)+' L'+n(cx-d.D*s/2)+' '+n(holeY)+' Z','#fff');
 face(p,cx,cy,R*.77,d.d*s/2);[[-d.e*s/2,holeY],[d.e*s/2,holeY],[0,tipY]].forEach(function(a){p.s+=p.circle(cx+a[0],a[1],hr)});p.cut(cx,cy,R*.68);
 var sx=317,sw=Math.min(82/d.Z,3),sy=115,hh=65;
 p.s+=p.rect(sx,sy-hh,d.l*sw,hh*2,p.hatch())+p.rect(sx+d.g*sw,sy-d.d*s/2,d.Z*sw-d.g*sw,d.d*s,'#fff')+p.axis(sx-10,sy,sx+d.Z*sw+12,sy);
 p.h('b',cx-R,cx+R,33,cy);p.h('D',cx-d.D*s/2,cx+d.D*s/2,240,holeY);p.h('e',cx-d.e*s/2,cx+d.e*s/2,218,holeY);
 p.v('w',20,cy-R,cy-R+d.w*s,cx-R);p.v('A',47,cy,bottom,cx);p.v('h',235,cy,holeY,cx+d.e*s/2);p.leader('j',cx,tipY,258,211);p.leader('s',cx+d.e*s/2+hr,holeY,260,174);
 p.h('Z',sx,sx+d.Z*sw,35,sy-hh);p.h('i',sx,sx+d.i*sw,213,sy);p.h('l',sx,sx+d.l*sw,245,sy+hh);p.leader('g',sx+d.g*sw/2,sy+hh-8,418,212);p.v('d',435,sy-d.d*s/2,sy+d.d*s/2,sx+d.Z*sw);
}
function housed(p,t){var d=p.d,cx=128,cy=119,R=42,r=R*d.d/(d.d*1.7),sx=314,sy=125,w=62;
 if(t==='SBF'){
  p.s+=p.rect(53,44,150,150,'#fff');[-1,1].forEach(function(q){[-1,1].forEach(function(z){p.s+=p.circle(cx+q*52,cy+z*52,6)})});
  p.h('L',53,203,239,194);p.h('J',76,180,32,67);
 }else if(t==='SBT'){
  p.s+=p.path('M65 45 H198 V190 H65 V158 H48 V77 H65 Z','#fff')+p.rect(53,98,23,30);
  p.h('L',48,198,244,190);p.h('L1',48,cx,218,cy);p.v('H',20,45,190,65);p.v('H2',225,77,158,65);p.leader('N',64,112,47,37);
 }else{
  p.s+=p.path('M48 198 V174 H72 V119 A56 66 0 0 1 184 119 V174 H208 V198 Z',p.hatch());
  p.h('L',48,208,246,198);p.h('J',68,188,218,198);p.v('H',21,cy,198,72);p.v('H2',235,53,198,184);
  [-1,1].forEach(function(q){var x=cx+q*60;p.s+=p.rect(x-4,175,8,23);if(t==='PA')for(var y=177;y<197;y+=4)p.s+=p.line(x-4,y,x+4,y-3)});p.leader('N',188,180,195,40);
 }
 face(p,cx,cy,R,r);p.cut(cx,cy,R);
 p.s+=p.rect(sx,sy-66,w,132,p.hatch())+p.rect(sx-7,sy-r,w+22,r*2,'#fff')+p.axis(sx-15,sy,sx+w+24,sy);
 p.h('A',sx,sx+w,237,sy+66);p.h('B',sx-7,sx+w+15,36,sy-r);p.v('d',432,sy-r,sy+r,sx+w+15);
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
