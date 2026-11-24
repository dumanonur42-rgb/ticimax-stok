(function(){
var C='#16203a',PI=Math.PI;
function norm(s){return String(s||'').replace(/İ/g,'i').replace(/ı/g,'i').toLowerCase().replace(/ş/g,'s').replace(/ü/g,'u').replace(/ç/g,'c').replace(/ö/g,'o').replace(/ğ/g,'g')}
function val(c,l){var a=(c.specs||[]).concat(c.onyazi||[]),i;for(i=0;i<a.length;i++)if(norm(a[i].l)===norm(l))return a[i].v;return null}
function n(v){var m=String(v||'').replace(',','.').match(/\d+(?:\.\d+)?/);return m?Number(m[0]):NaN}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
function match(c){return /triger kasnak/.test(norm(c.title)+' '+norm(val(c,'Ürün Tipi')))&&!!val(c,'Diş Profili')&&n(val(c,'Diş Sayısı'))>0}
function draw(c,o){
 o=o||{};if(!match(c))return null;
 var z=n(val(c,'Diş Sayısı')),pr=String(val(c,'Diş Profili')).toUpperCase(),labels={Dp:'Bölüm Çapı (Dp)',De:'Dış Çap (De)',Df:'Flanş Çapı (Df)',Dm:'Göbek Çapı (Dm)',F:'Kasnak Genişliği (F)',L:'Toplam Boy (L)',d:'Ön Delik (d)'},v={},k;
 for(k in labels)if(labels.hasOwnProperty(k))v[k]=n(val(c,labels[k]));
 if(z!==Math.floor(z)||z<3||z>1000||!/^(XL|L|H|T5|T10|3M|5M|8M)$/.test(pr)||!(v.De>0||v.Dp>0))return null;
 var bt=/burclu triger kasnak/.test(norm(c.title)+' '+norm(val(c,'Ürün Tipi'))),fl=norm(val(c,'Flanş'))==='flansli',dim=o.dim||'#0a2350',id=esc(o.id||'triger'),g='',keys=[],de=v.De||v.Dp*.98,outer=Math.max(de,v.Dp||0,fl&&v.Df>0?v.Df:de),s=57/(outer/2),cx=82,cy=129,rr=de*s/2,root=rr-Math.min(5,rr*PI/z*.55),dr=v.d>0?v.d*s/2:0;
 function p(x,y){return x.toFixed(2)+','+y.toFixed(2)}
 function line(x,y,a,b,attr){return '<line x1="'+x+'" y1="'+y+'" x2="'+a+'" y2="'+b+'" '+(attr||'')+'/>'}
 function text(x,y,t){return '<text x="'+x+'" y="'+y+'" fill="'+dim+'" stroke="none" font-size="12" font-weight="700" text-anchor="middle">'+esc(t)+'</text>'}
 function circle(r,attr){return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+C+'" '+(attr||'')+'/>'}
 function group(key,label,value,body){keys.push({k:key,l:label,v:String(value)});g+='<g class="hl" data-k="'+key+'" stroke="'+dim+'">'+body+'</g>'}
 function arrows(x,y,a,b){var len=Math.sqrt((a-x)*(a-x)+(b-y)*(b-y)),ux=(a-x)/len,uy=(b-y)/len;if(len>=20)return line(x,y,a,b,'marker-start="url(#'+id+'a)" marker-end="url(#'+id+'a)"');return line(x,y,a,b)+line(x-ux*10,y-uy*10,x,y,'marker-end="url(#'+id+'a)"')+line(a+ux*10,b+uy*10,a,b,'marker-end="url(#'+id+'a)"')}
 var path='',i,t,step=2*PI/z;
 function point(r,a){return p(cx+r*Math.cos(a),cy+r*Math.sin(a))}
 for(i=0;i<z;i++){t=i*step;path+=(i?'L':'M')+point(rr,t);if(/M$/.test(pr)){path+='L'+point(rr,t+step*.22)+'Q'+point(root,t+step*.30)+' '+point(root,t+step*.50)+'Q'+point(root,t+step*.70)+' '+point(rr,t+step*.78)}else{path+='L'+point(rr,t+step*.22)+'L'+point(root,t+step*.40)+'L'+point(root,t+step*.60)+'L'+point(rr,t+step*.78)}}
 g+='<path d="'+path+'Z" fill="none" stroke="'+C+'" stroke-width="1.1"/>';
 if(v.De>0)g+=circle(rr,'stroke-width=".4"');
 if(v.Dp>0)g+=circle(v.Dp*s/2,'stroke-dasharray="9 3 2 3" stroke-width=".8"');
 if(fl&&v.Df>0)g+=circle(v.Df*s/2);
 if(v.Dm>0)g+=circle(v.Dm*s/2);
 if(!bt&&dr>0)g+=circle(dr);
 if(bt)g+=circle(rr*.29)+circle(rr*.33,'stroke-width=".6"');
 g+=line(16,cy,148,cy,'stroke="'+C+'" stroke-dasharray="9 3 2 3"')+line(cx,63,cx,195,'stroke="'+C+'" stroke-dasharray="9 3 2 3"');
 group('z','Diş Sayısı',val(c,'Diş Sayısı'),text(cx,43,'z = '+val(c,'Diş Sayısı'))+line(cx,47,cx,cy-rr));
 var fw=v.F>0?v.F:de*.35,full=v.L>fw?v.L:fw,ss=Math.min(66/full,s),x=224,w=fw*ss,total=full*ss,h=de*s/2,hub=v.Dm>0?v.Dm*s/2:h*.5,bore=bt?h*.25:dr,ft=fl?2.5:0,fh=fl&&v.Df>0?v.Df*s/2:h+(fl?3:0),left=x-ft,right=x+total+ft;
 function poly(a,fill){return '<path d="'+a+'Z" fill="'+fill+'" stroke="'+C+'" stroke-width="1.2"/>'}
 for(i=-1;i<=1;i+=2){var a=cy+i*bore,b=cy+i*h,hb=cy+i*hub,end=cy+i*(bt?bore*1.35:bore),outline='M'+p(left,a)+'L'+p(left,cy+i*fh)+'L'+p(x,cy+i*fh)+'L'+p(x,b)+'L'+p(x+w,b)+'L'+p(x+w,cy+i*fh)+'L'+p(x+w+ft,cy+i*fh);
  if(total>w)outline+='L'+p(x+w+ft,hb)+'L'+p(right,hb);else outline+='L'+p(right,cy+i*fh);
  outline+='L'+p(right,end);
  g+=poly(outline,i===-1?'url(#'+id+'h)':'none');
  g+=line(x,cy+i*root,x+w,cy+i*root,'stroke="'+C+'" stroke-width=".6"');
 }
 g+=line(left-10,cy,right+10,cy,'stroke="'+C+'" stroke-dasharray="9 3 2 3"');
 function width(key,y,xa,xb){if(!(v[key]>0))return;var edge=y<cy?cy-fh:cy+fh;group(key,labels[key],val(c,labels[key]),line(xa,edge,xa,y+4)+line(xb,edge,xb,y+4)+arrows(xa,y,xb,y)+text((xa+xb)/2,y-7,key+' '+String(val(c,labels[key])).replace(/ mm$/,'')))}
 width('F',51,x,x+w);width('L',214,left,right);
 function diameter(key,xx,r,edge){if(!(v[key]>0))return;var tx=xx+13,ty=cy;group(key,labels[key],val(c,labels[key]),line(edge,cy-r,xx+3,cy-r,'stroke-width=".6"')+line(edge,cy+r,xx+3,cy+r,'stroke-width=".6"')+arrows(xx,cy-r,xx,cy+r)+'<g transform="rotate(-90 '+tx+' '+ty+')">'+text(tx,ty,key+' Ø'+String(val(c,labels[key])).replace(/ mm$/,''))+'</g>')}
 if(v.Dm>0)diameter('Dm',177,hub,left);
 diameter('Dp',316,v.Dp*s/2,right);diameter('De',350,h,right);if(fl)diameter('Df',384,fh,right);if(!bt)diameter('d',418,dr,right);
 if(bt){var code=val(c,'Burç Tipi'),max=val(c,'Maksimum Delik');if(code)group('burc','Burç Tipi',code,text(256,236,'Burç '+code));if(n(max)>0)group('max','Maksimum Delik',max,text(383,236,'Maks. Ø'+String(max).replace(/ mm$/,'')))}
 return {svg:'<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 460 252" style="display:block;font-family:inherit"><defs><pattern id="'+id+'h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#9aa6bd"/></pattern><marker id="'+id+'a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10z" fill="'+dim+'"/></marker></defs><text x="82" y="16" text-anchor="middle" fill="'+C+'" font-size="10">ÖN GÖRÜNÜŞ</text><text x="256" y="16" text-anchor="middle" fill="'+C+'" font-size="10">KESİT A-A</text>'+g+'</svg>',keys:keys};
}
(window.YDRAW=window.YDRAW||{}).triger={match:match,draw:draw};
})();
