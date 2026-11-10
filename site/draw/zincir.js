(function(){
var C='#16203a',HAT='#9aa6bd',PI=Math.PI;
function norm(s){return String(s||'').replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase().replace(/ı/g,'i').replace(/ş/g,'s').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/\s+/g,' ').replace(/:$/,'').replace(/^\s+|\s+$/g,'')}
function f(n){return String(Math.round(n*1000)/1000).replace('.',',')}
function P(x,y){return x.toFixed(1)+','+y.toFixed(1)}
function ln(x1,y1,x2,y2,a){return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" '+(a||'')+'/>'}
function txt(x,y,s,dim,a){return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" fill="'+dim+'" font-size="12" font-weight="700" text-anchor="middle" '+(a||'')+'>'+s+'</text>'}
function ttl(x,s,dim){return '<text x="'+x+'" y="17" fill="'+dim+'" font-size="10" letter-spacing="1.2" text-anchor="middle">'+s+'</text>'}
function CL(x1,y1,x2,y2){return ln(x1,y1,x2,y2,'stroke="'+C+'" stroke-width=".7" stroke-dasharray="10 3 2 3" opacity=".6"')}
function EXT(x1,y1,x2,y2,dim){return ln(x1,y1,x2,y2,'stroke="'+dim+'" stroke-width=".6" opacity=".55"')}
function dimL(id,dim,x1,y1,x2,y2){var L=Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1)),a='stroke="'+dim+'" stroke-width="1.1"';
  if(L>=26)return ln(x1,y1,x2,y2,a+' marker-start="url(#'+id+'a)" marker-end="url(#'+id+'a)"');
  var ux=(x2-x1)/L,uy=(y2-y1)/L;return ln(x1,y1,x2,y2,'stroke="'+dim+'" stroke-width=".8"')+ln(x1-ux*13,y1-uy*13,x1,y1,a+' marker-end="url(#'+id+'a)"')+ln(x2+ux*13,y2+uy*13,x2,y2,a+' marker-end="url(#'+id+'a)"')}
function defs(id,dim){return '<defs><pattern id="'+id+'h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+HAT+'" stroke-width="1.1"/></pattern><pattern id="'+id+'g" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="4" stroke="'+HAT+'" stroke-width="1"/></pattern><marker id="'+id+'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1.5 L10,5 L0,8.5z" fill="'+dim+'"/></marker></defs>'}
var LABELS={p:'Adım (p)',b1:'İç Genişlik (b1)',d3:'Makara Çapı (d3)',d1:'Pim Çapı (d1)',h:'Plaka Yüksekliği (h)',n:'Sıra Sayısı',pt:'Sıralar Arası Mesafe (pt)',bore:'Pim Delik Çapı'};
function raw(ctx,label){var a=(ctx.specs||[]).concat(ctx.onyazi||[]),i;for(i=0;i<a.length;i++)if(norm(a[i].l)==norm(label))return a[i].v;return null}
function has(ctx,label){var a=(ctx.specs||[]).concat(ctx.onyazi||[]),i;for(i=0;i<a.length;i++)if(norm(a[i].l)==norm(label))return true;return false}
function number(ctx,label){var v=raw(ctx,label),s,m;if(v==null)return NaN;s=String(v).replace(/^\s+|\s+$/g,'');m=s.match(/^[+]?(\d+(?:[.,]\d+)?)\s*(?:mm)?$/i);return m?parseFloat(m[1].replace(',','.')):NaN}
function match(ctx){var t=norm(ctx.title);return /\b(zincir|bakla|kilit)/.test(t)&&!/disli|kaplin|sprey|yag|kasnak|kayis|rulman|halat|frez|pinyon|kremayer/.test(t)&&has(ctx,LABELS.p)&&has(ctx,LABELS.b1)}
function draw(ctx,opt){
  if(!match(ctx))return null;
  var o=opt||{},D={},k,dim=o.dim||'#0a2350',id=String(o.id||'zc').replace(/[^a-zA-Z0-9_-]/g,'_'),t=norm(ctx.title)+' '+norm(raw(ctx,'Ürün Tipi')),offset=/yarim|offset|bakla/.test(t)&&!/tam kilit/.test(t),clip=!offset&&/tam kilit|connecting|zincir kilidi/.test(t),hp=/pim delikli|hollow|\bhp\b/.test(t),doublePitch=/cift hatve|[ac]2\d{3}/.test(t);
  for(k in LABELS)if(Object.prototype.hasOwnProperty.call(LABELS,k))D[k]=number(ctx,LABELS[k]);
  if(!(D.p>0&&D.b1>0&&D.d1>0&&D.d3>D.d1&&D.h>D.d1&&D.n>=1&&D.n<=4&&D.n==Math.round(D.n)))return null;
  if(D.n>1&&!(D.pt>D.b1))return null;
  if(has(ctx,LABELS.bore)&&raw(ctx,LABELS.bore)!==''&&!(D.bore>0&&D.bore<D.d1))return null;
  if(D.p<=D.d3)return null;
  var g='',cy=115,links=offset||clip?1:3,s=Math.min(148/(links*D.p+Math.max(D.h,D.d3)),56/Math.max(D.h,D.d3)),R=D.h*s/2,x0=43+R,px=[],i,keys=[];
  function key(name){keys.push({k:name,l:LABELS[name],v:f(D[name])+(name=='n'?'':' mm')})}
  function group(name,body){return '<g class="hl" data-k="'+name+'">'+body+'</g>'}
  function circle(x,y,r,fill,attrs){return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r.toFixed(1)+'" fill="'+fill+'" stroke="'+C+'" stroke-width="1.3" '+(attrs||'')+'/>'}
  function rc(xa,xb,ya,yb,fill){return '<rect x="'+Math.min(xa,xb).toFixed(1)+'" y="'+Math.min(ya,yb).toFixed(1)+'" width="'+Math.abs(xb-xa).toFixed(1)+'" height="'+Math.abs(yb-ya).toFixed(1)+'" fill="'+fill+'" stroke="'+C+'" stroke-width="1.2"/>'}
  function plate(xa,xb,rh,hw){var be=40*PI/180,sx=rh*Math.sin(be),sy=rh*Math.cos(be),m=(xa+xb)/2,qy=2*(cy-hw)-(cy-sy),qy2=2*(cy+hw)-(cy+sy);
    if(doublePitch)return 'M'+P(xa,cy-rh)+'L'+P(xb,cy-rh)+'A'+rh.toFixed(1)+' '+rh.toFixed(1)+' 0 0 1 '+P(xb,cy+rh)+'L'+P(xa,cy+rh)+'A'+rh.toFixed(1)+' '+rh.toFixed(1)+' 0 0 1 '+P(xa,cy-rh)+'Z';
    return 'M'+P(xa+sx,cy-sy)+'Q'+P(m,qy)+' '+P(xb-sx,cy-sy)+'A'+rh.toFixed(1)+' '+rh.toFixed(1)+' 0 1 1 '+P(xb-sx,cy+sy)+'Q'+P(m,qy2)+' '+P(xa+sx,cy+sy)+'A'+rh.toFixed(1)+' '+rh.toFixed(1)+' 0 1 1 '+P(xa+sx,cy-sy)+'Z'}
  for(i=0;i<=links;i++)px.push(x0+i*D.p*s);
  if(links==3)g+='<path d="'+plate(px[1],px[2],R*.97,R*.74)+'" fill="#f4f6fa" stroke="'+C+'" stroke-width="1.3"/>';
  for(i=0;i<links;i+=2)g+='<path d="'+plate(px[i],px[i+1],R,R*.78)+'" fill="#fff" stroke="'+C+'" stroke-width="1.4"/>';
  if(offset)g+=ln((px[0]+px[1])/2-3,cy-R*.75,(px[0]+px[1])/2+3,cy+R*.75,'stroke="'+C+'" stroke-width="1"');
  for(i=0;i<px.length;i++){
    g+=circle(px[i],cy,D.d3*s/2,'none','stroke-dasharray="3 2" opacity=".7"')+circle(px[i],cy,D.d1*s/2,'#fff');
    if(hp&&D.bore>0)g+=circle(px[i],cy,D.bore*s/2,'#fff');
    g+=CL(px[i],cy-R-5,px[i],cy+R+5);
  }
  if(clip){var ca=px[0],cb=px[1],rr=Math.max(3,D.d1*s*.8);g+='<path data-part="clip" d="M'+P(cb+rr,cy-rr)+'L'+P(ca,cy-rr)+'A'+rr+' '+rr+' 0 0 0 '+P(ca,cy+rr)+'L'+P(cb+rr,cy+rr)+'L'+P(cb+rr,cy+rr*.35)+'L'+P(ca,cy+rr*.35)+'A'+(rr*.35)+' '+(rr*.35)+' 0 0 1 '+P(ca,cy-rr*.35)+'L'+P(cb+rr,cy-rr*.35)+'Z" fill="#e8edf5" stroke="'+C+'" stroke-width="1.2"/>'}
  g+=CL(x0-R-5,cy,px[links]+R+5,cy)+ttl(123,'YAN GÖRÜNÜŞ',dim);
  var yp=177,xa=px[0],xb=px[1],xh=23;
  g+=group('p',EXT(xa,cy+R,xa,yp+4,dim)+EXT(xb,cy+R,xb,yp+4,dim)+dimL(id,dim,xa,yp,xb,yp)+txt((xa+xb)/2,yp+17,'p = '+f(D.p),dim));key('p');
  g+=group('h',EXT(x0,cy-R,xh-4,cy-R,dim)+EXT(x0,cy+R,xh-4,cy+R,dim)+dimL(id,dim,xh,cy-R,xh,cy+R)+txt(xh-7,cy,'h = '+f(D.h),dim,'transform="rotate(-90 '+(xh-7)+' '+cy+')"'));key('h');
  g+=group('d1',dimL(id,dim,px[0],cy-D.d1*s/2,px[0],cy+D.d1*s/2)+ln(px[0],cy-D.d1*s/2,70,51,'stroke="'+dim+'" stroke-width=".8"')+txt(72,43,'d1 = '+f(D.d1),dim));key('d1');
  g+=group('d3',dimL(id,dim,px[1],cy-D.d3*s/2,px[1],cy+D.d3*s/2)+ln(px[1],cy-D.d3*s/2,166,72,'stroke="'+dim+'" stroke-width=".8"')+txt(169,64,'d3 = '+f(D.d3),dim));key('d3');
  /* Kesit oranlarında plaka/burç kalınlığı şematiktir; sayısal etiket üretilmez. */
  var ti=D.n>1?Math.min(D.b1*.15,(D.pt-D.b1)*.2):D.b1*.15,total=D.b1+ti*4+(D.n-1)*(D.pt||0),ss=Math.min(142/total,59/Math.max(D.h,D.d3)),left=347-total*ss/2,hh=D.h*ss/2,centers=[],db=D.d1+.42*(D.d3-D.d1),fill='url(#'+id+'h)',cross='url(#'+id+'g)';
  function X(u){return left+u*ss}
  for(i=0;i<D.n;i++)centers.push(ti*2+D.b1/2+i*(D.pt||0));
  g+=rc(X(0),X(total),cy-D.d1*ss/2,cy+D.d1*ss/2,'#fff');
  for(i=0;i<D.n;i++){
    var c=centers[i],a=c-D.b1/2,b=c+D.b1/2;
    g+='<g data-part="strand">';
    if(offset){
      g+='<path data-part="offset" d="M'+P(X(a-ti*2),cy-hh)+'L'+P(X(a-ti),cy-hh)+'L'+P(X(a+ti*.2),cy+hh)+'L'+P(X(a-ti*.8),cy+hh)+'Z M'+P(X(b+ti),cy-hh)+'L'+P(X(b+ti*2),cy-hh)+'L'+P(X(b+ti*.8),cy+hh)+'L'+P(X(b-ti*.2),cy+hh)+'Z" fill="'+fill+'" stroke="'+C+'" stroke-width="1.2"/>';
    }else{
      g+=rc(X(a-ti),X(a),cy-hh,cy+hh,cross)+rc(X(b),X(b+ti),cy-hh,cy+hh,cross)+rc(X(a-ti*2),X(a-ti),cy-hh*.97,cy+hh*.97,fill)+rc(X(b+ti),X(b+ti*2),cy-hh*.97,cy+hh*.97,fill);
    }
    var sg;
    for(sg=-1;sg<=1;sg+=2){g+=rc(X(a),X(b),cy+sg*db*ss/2,cy+sg*D.d3*ss/2,fill)+rc(X(a-ti),X(b+ti),cy+sg*D.d1*ss/2,cy+sg*db*ss/2,cross)}
    g+='</g>';
  }
  g+=rc(X(0),X(total),cy-D.d1*ss/2,cy+D.d1*ss/2,'#fff');
  if(hp&&D.bore>0)g+=rc(X(0),X(total),cy-D.bore*ss/2,cy+D.bore*ss/2,'#fff')+ln(X(0),cy-D.bore*ss/2,X(total),cy-D.bore*ss/2,'stroke="'+C+'" stroke-dasharray="3 2"')+ln(X(0),cy+D.bore*ss/2,X(total),cy+D.bore*ss/2,'stroke="'+C+'" stroke-dasharray="3 2"');
  if(clip)g+=rc(X(total-ti*.4),X(total+ti*.4),cy-D.d1*ss*.9,cy+D.d1*ss*.9,'#e8edf5');
  g+=CL(X(0)-6,cy,X(total)+6,cy)+ttl(347,'KESİT A-A',dim);
  var a0=centers[0]-D.b1/2,b0=centers[0]+D.b1/2,yb=58;
  g+=group('b1',EXT(X(a0),cy-hh,X(a0),yb-4,dim)+EXT(X(b0),cy-hh,X(b0),yb-4,dim)+dimL(id,dim,X(a0),yb,X(b0),yb)+txt((X(a0)+X(b0))/2,yb-7,'b1 = '+f(D.b1),dim));key('b1');
  var nBody=txt(347,191,'n = '+D.n,dim);
  for(i=0;i<centers.length;i++)nBody+=ln(347,176,X(centers[i]),cy+hh+3,'stroke="'+dim+'" stroke-width=".7"');
  g+=group('n',nBody);key('n');
  if(D.n>1){var ya=211;g+=group('pt',EXT(X(centers[0]),cy+hh,X(centers[0]),ya+4,dim)+EXT(X(centers[1]),cy+hh,X(centers[1]),ya+4,dim)+dimL(id,dim,X(centers[0]),ya,X(centers[1]),ya)+txt((X(centers[0])+X(centers[1]))/2,ya+17,'pt = '+f(D.pt),dim));key('pt')}
  if(hp&&D.bore>0){g+=group('bore',ln(X(total),cy,412,242,'stroke="'+dim+'" stroke-width=".8"')+txt(353,251,'Pim deliği = '+f(D.bore),dim));key('bore')}
  g+=txt(121,229,offset?'YARIM KİLİT':clip?'TAM KİLİT':doublePitch?'ÇİFT HATVE':'MAKARALI ZİNCİR',dim);
  return {svg:'<svg viewBox="0 0 460 260" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;font-family:inherit">'+defs(id,dim)+g+'</svg>',keys:keys};
}
(window.YDRAW=window.YDRAW||{}).zincir={match:match,draw:draw};
})();
