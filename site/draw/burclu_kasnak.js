(function(){
var C='#16203a';
function norm(s){return String(s==null?'':s).replace(/[İIı]/g,'i').toLowerCase().replace(/ş/g,'s').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/\s+/g,' ').trim()}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
function num(s){var m=String(s).replace(/,/g,'.').match(/-?\d+(?:\.\d+)?/);return m?+m[0]:NaN}
function f(n){return String(Math.round(n*100)/100).replace('.',',')}
function q(n){return Math.round(n*100)/100}
function match(c){var t=norm((c.title||'')+' '+(c.crumbs||[]).join(' '));return !/triger|zaman|\bkor\b|dolu[ -]delikli/.test(t)&&/burclu/.test(t)&&/kasnak/.test(t)}
var labels={profil:'Profil',kanal:'Kanal Sayısı',P:'Anma Çapı (P)',O:'Dış Çap (O)',tip:'Gövde Tipi',burc:'Burç No',mil:'Maks. Mil Çapı',F:'Kasnak Genişliği (F)',J:'J Çapı',L:'Göbek Uzunluğu (L)',N:'Göbek Çapı (N)',E:'Disk Kalınlığı (E)',K:'K Ölçüsü',M:'M Ölçüsü'};
function read(c){var d={},bad=false;
 (c.specs||[]).concat(c.onyazi||[]).forEach(function(s){var l=norm(s.l).replace(/:\s*$/,''),k=null,v;
  if(/^(kanal )?profil(i)?$/.test(l))k='profil';
  else if(/^kanal( sayisi)?$/.test(l))k='kanal';
  else if(/^(anma|hatve) capi?\b|^cap \(p\)$/.test(l))k='P';
  else if(/^dis cap/.test(l))k='O';
  else if(/^(govde tipi|tipi|tip)$/.test(l))k='tip';
  else if(/^burc (no|kodu)$/.test(l))k='burc';
  else if(/^maks.*mil|^maksimum delik$/.test(l))k='mil';
  else {var m=l.match(/\(([efjklmn])\)$/)||l.match(/^([efjklmn])$/);if(m)k=m[1].toUpperCase()}
  if(!k)return;v=k=='profil'?String(s.v).toUpperCase().trim():num(s.v);
  if(k=='profil'?!/^SP[ZABC]$/.test(v):!isFinite(v)||v<0){if(!/^(?:\s*|[-–—/])$/.test(String(s.v)))bad=true;return}
  if(d[k]!=null&&d[k]!==v)bad=true;else d[k]=v;
 });return bad?null:d;
}
function draw(c,opt){
 if(!match(c))return null;
 var d=read(c),req=['profil','kanal','P','O','F','L','tip'],i;
 if(!d)return null;
 for(i=0;i<req.length;i++)if(!d[req[i]]||typeof d[req[i]]=='number'&&!isFinite(d[req[i]]))return null;
 if(d.kanal%1||d.kanal>40||d.tip%1||d.tip<1||d.tip>9||d.O<d.P)return null;
 var t=d.tip,arm=t==4||t==5,disk=t==6||t==7,recess=t==2||t==3||t==5||t==6||t==8||t==9;
 var h0=0;
 if(t==3||t==5||t==6||t==8||t==9)h0=d.K!=null?d.K:(d.M!=null?d.F-d.L-d.M:(d.F-d.L)/2);
 if(t==4||t==7)h0=d.K!=null?-d.K:(d.M!=null?d.F+d.M-d.L:(d.F-d.L)/2);
 var h1=h0+d.L,expectedM=recess?d.F-h1:h1-d.F;
 if(d.M!=null&&Math.abs(expectedM-d.M)>.11)return null;
 if(recess&&(h0<-.11||h1>d.F+.11)||!recess&&(h0>.11||h1<d.F-.11))return null;
 opt=opt||{};var id=esc(String(opt.id||'bk').replace(/[^a-zA-Z0-9_-]/g,'_')),dim=esc(opt.dim||'#0a2350'),g='',keys=[];
 function line(a,b,x,y,attr){return '<line x1="'+q(a)+'" y1="'+q(b)+'" x2="'+q(x)+'" y2="'+q(y)+'" '+(attr||'')+'/>'}
 function text(x,y,s,attr){return '<text x="'+q(x)+'" y="'+q(y)+'" fill="'+dim+'" font-size="12" font-weight="700" text-anchor="middle" '+(attr||'')+'>'+esc(s)+'</text>'}
 function group(k,s){var v=d[k];if(v==null)return '';keys.push({k:k,l:labels[k],v:k=='profil'?v:k=='tip'?'Tip '+v:k=='kanal'||k=='burc'?String(v):f(v)+' mm'});return '<g class="hl" data-k="'+k+'">'+s+'</g>'}
 function arrow(a,b,x,y){return line(a,b,x,y,'stroke="'+dim+'" stroke-width=".8" marker-start="url(#'+id+'a)" marker-end="url(#'+id+'a)"')}
 function hd(k,a,b,y,label){return group(k,line(a,174,a,y+3,'stroke="'+dim+'" stroke-width=".5"')+line(b,174,b,y+3,'stroke="'+dim+'" stroke-width=".5"')+arrow(a,y,b,y)+text((a+b)/2,y-4,label+' '+f(d[k])))}
 function leader(k,x,y,tx,ty,label){return group(k,line(tx,ty,x,y-4,'stroke="'+dim+'" stroke-width=".7" marker-start="url(#'+id+'a)"')+text(x,y-7,label+' '+f(d[k])))}
 function circle(x,y,r,attr){return '<circle cx="'+q(x)+'" cy="'+q(y)+'" r="'+q(r)+'" '+(attr||'')+'/>'}
 var cx=113,cy=112,R=59,rad=R*2/d.O,j=d.J!=null?d.J*rad/2:R*.73,n=d.N!=null?d.N*rad/2:R*.43,b=d.mil!=null?d.mil*rad/2:n*.43;
 j=Math.max(12,Math.min(R-5,j));n=Math.max(9,Math.min(j-3,n));b=Math.max(4,Math.min(n-3,b));
 var inner=arm||disk?j:Math.max(n,j),front='';
 front+=circle(cx,cy,R,'fill="none" stroke="'+C+'" stroke-width="1.4"');
 if(disk)front+=circle(cx,cy,inner,'fill="#9aa6bd" fill-opacity=".12" stroke="'+C+'" stroke-width=".8"');
 if(arm){for(i=0;i<6;i++){var a=i*Math.PI/3,x1=cx+n*Math.cos(a),y1=cy+n*Math.sin(a),x2=cx+inner*Math.cos(a),y2=cy+inner*Math.sin(a);front+=line(x1,y1,x2,y2,'stroke="'+C+'" stroke-width="7"')}front+=circle(cx,cy,inner,'fill="none" stroke="'+C+'" stroke-width="1"')}
 for(i=0;i<d.kanal;i++)front+=circle(cx,cy,R-2-i*Math.min(2,13/d.kanal),'fill="none" stroke="'+C+'" stroke-width=".55"');
 front+=circle(cx,cy,n,'fill="none" stroke="'+C+'" stroke-width="1.2"')+circle(cx,cy,b,'fill="none" stroke="'+C+'" stroke-width="1.3"');
 front+=circle(cx,cy,d.P*rad/2,'fill="none" stroke="'+C+'" stroke-width=".6" stroke-dasharray="5 3"');
 g+=front+line(cx-R-6,cy,cx+R+6,cy,'stroke="'+C+'" stroke-width=".5" stroke-dasharray="8 3 2 3"')+line(cx,cy-R-6,cx,cy+R+6,'stroke="'+C+'" stroke-width=".5" stroke-dasharray="8 3 2 3"');
 g+='<g fill="'+C+'" font-size="10" text-anchor="middle"><text x="113" y="13">ÖN GÖRÜNÜŞ</text><text x="345" y="13">KESİT A-A</text></g>';
 g+=group('profil',text(87,31,d.profil))+group('kanal',text(153,31,d.kanal+' kanal'))+group('tip',text(345,257,'Tip '+t));
 var lo=Math.min(0,h0),hi=Math.max(d.F,h1),scale=Math.min(100/(hi-lo),2.5),base=345-(hi+lo)*scale/2;
 function X(x){return base+x*scale}function Y(r,sign){return cy-sign*r}
 var w=d.E!=null?Math.min(d.F,d.E):Math.min(d.F,d.L)*.32,w0=(d.F-w)/2,w1=w0+w;
 if(arm){w0=Math.max(0,h0);w1=Math.min(d.F,h1)}
 var depth=Math.min(8,Math.max(3,scale*d.F/d.kanal*.32));
 for(var sign=-1;sign<=1;sign+=2){var points=[[X(0),Y(R,sign)]];
  for(i=0;i<d.kanal;i++){var pitch=(t==9?h0:d.F)/d.kanal;points.push([X((i+.18)*pitch),Y(R,sign)],[X((i+.42)*pitch),Y(R-depth,sign)],[X((i+.58)*pitch),Y(R-depth,sign)],[X((i+.82)*pitch),Y(R,sign)])}
  points.push([X(d.F),Y(R,sign)]);
  if(arm||disk)points=points.concat([[X(d.F),Y(inner,sign)],[X(w1),Y(inner,sign)],[X(w1),Y(n,sign)],[X(h1),Y(n,sign)],[X(h1),Y(b*.88,sign)],[X(h0),Y(b,sign)],[X(h0),Y(n,sign)],[X(w0),Y(n,sign)],[X(w0),Y(inner,sign)],[X(0),Y(inner,sign)]]);
  else points=points.concat([[X(d.F),Y(inner,sign)],[X(h1),Y(inner,sign)],[X(h1),Y(b*.88,sign)],[X(h0),Y(b,sign)],[X(h0),Y(inner,sign)],[X(0),Y(inner,sign)]]);
  g+='<path d="'+points.map(function(p,ix){return (ix?'L':'M')+q(p[0])+','+q(p[1])}).join('')+'Z" fill="url(#'+id+'h)" stroke="'+C+'" stroke-width="1.2" stroke-linejoin="round"/>';
  if(arm)g+='<rect x="'+q(X(w0))+'" y="'+q(sign>0?cy-inner:cy+n)+'" width="'+q((w1-w0)*scale)+'" height="'+q(inner-n)+'" fill="white" stroke="'+C+'" stroke-width=".7"/>';
 }
 g+=line(X(lo)-8,cy,X(hi)+8,cy,'stroke="'+C+'" stroke-width=".5" stroke-dasharray="8 3 2 3"');
 g+=group('O',line(29,cy-R,cx,cy-R,'stroke="'+dim+'" stroke-width=".5"')+line(29,cy+R,cx,cy+R,'stroke="'+dim+'" stroke-width=".5"')+arrow(33,cy-R,33,cy+R)+text(23,cy,'O '+f(d.O),'transform="rotate(-90 23 '+cy+')"'));
 g+=group('P',line(cx-d.P*rad/2,cy,cx-d.P*rad/2,193,'stroke="'+dim+'" stroke-width=".4" opacity=".5"')+line(cx+d.P*rad/2,cy,cx+d.P*rad/2,193,'stroke="'+dim+'" stroke-width=".4" opacity=".5"')+arrow(cx-d.P*rad/2,190,cx+d.P*rad/2,190)+text(cx,186,'P '+f(d.P)));
 g+=group('F',line(X(0),cy-R,X(0),44,'stroke="'+dim+'" stroke-width=".5"')+line(X(d.F),cy-R,X(d.F),44,'stroke="'+dim+'" stroke-width=".5"')+arrow(X(0),45,X(d.F),45)+text(345,41,'F '+f(d.F)));
 g+=hd('L',X(h0),X(h1),192,'L');
 if(d.K!=null)g+=t==2?leader('K',210,210,X(0),cy+inner,'K'):hd('K',X(t==4||t==7?h0:0),X(t==4||t==7?0:h0),215,'K');
 if(d.M!=null)g+=hd('M',X(Math.min(h1,d.F)),X(Math.max(h1,d.F)),236,'M');
 if(d.J!=null)g+=leader('J',206,59,cx+inner*.7,cy-inner*.7,'J');
 if(d.N!=null)g+=leader('N',210,169,cx+n*.7,cy+n*.7,'N');
 if(d.mil!=null)g+=leader('mil',208,123,cx+b,cy,'Mil ≤');
 if(d.E!=null)g+=leader('E',433,78,X(w1),cy-(inner+n)/2,'E');
 if(d.burc!=null)g+=group('burc',text(113,237,'Burç '+d.burc));
 var defs='<defs><pattern id="'+id+'h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#9aa6bd" stroke-width="1"/></pattern><marker id="'+id+'a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M10 5L0 1L0 9Z" fill="'+dim+'"/></marker></defs>';
 return {svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 260" width="100%" style="font-family:inherit">'+defs+g+'</svg>',keys:keys};
}
(window.YDRAW=window.YDRAW||{}).burclu_kasnak={match:match,draw:draw};
})();
