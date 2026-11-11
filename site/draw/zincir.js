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
  var ti=D.n>1?Math.min(D.b1*.15,(D.pt-D.b1)*.2):D.b1*.15,total=D.b1+ti*4+(D.n-1)*(D.pt||0),cols=Math.min(D.n,2),rowWidth=D.b1+ti*4+(cols-1)*(D.pt||0);
  var g='',cy=137,links=1,s=Math.min(176/(D.p+Math.max(D.h,D.d3)),82/Math.max(D.h,D.d3),offset||clip?Infinity:180/rowWidth),R=D.h*s/2,x0=126-D.p*s/2,px=[],i,keys=[];
  function key(name){keys.push({k:name,l:LABELS[name],v:f(D[name])+(name=='n'?'':' mm')})}
  function group(name,body){return '<g class="hl" data-k="'+name+'">'+body+'</g>'}
  function circle(x,y,r,fill,attrs){return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r.toFixed(1)+'" fill="'+fill+'" stroke="'+C+'" stroke-width="1.3" '+(attrs||'')+'/>'}
  function rc(xa,xb,ya,yb,fill){return '<rect x="'+Math.min(xa,xb).toFixed(1)+'" y="'+Math.min(ya,yb).toFixed(1)+'" width="'+Math.abs(xb-xa).toFixed(1)+'" height="'+Math.abs(yb-ya).toFixed(1)+'" fill="'+fill+'" stroke="'+C+'" stroke-width="1.2"/>'}
  function plate(xa,xb,rh,hw){var be=40*PI/180,sx=rh*Math.sin(be),sy=rh*Math.cos(be),m=(xa+xb)/2,qy=2*(cy-hw)-(cy-sy),qy2=2*(cy+hw)-(cy+sy);
    if(doublePitch)return 'M'+P(xa,cy-rh)+'L'+P(xb,cy-rh)+'A'+rh.toFixed(1)+' '+rh.toFixed(1)+' 0 0 1 '+P(xb,cy+rh)+'L'+P(xa,cy+rh)+'A'+rh.toFixed(1)+' '+rh.toFixed(1)+' 0 0 1 '+P(xa,cy-rh)+'Z';
    return 'M'+P(xa+sx,cy-sy)+'Q'+P(m,qy)+' '+P(xb-sx,cy-sy)+'A'+rh.toFixed(1)+' '+rh.toFixed(1)+' 0 1 1 '+P(xb-sx,cy+sy)+'Q'+P(m,qy2)+' '+P(xa+sx,cy+sy)+'A'+rh.toFixed(1)+' '+rh.toFixed(1)+' 0 1 1 '+P(xa+sx,cy-sy)+'Z'}
  g+='<g data-part="side" data-scale="'+s+'">';
  for(i=0;i<=links;i++)px.push(x0+i*D.p*s);
  if(!offset&&!clip)g+='<defs><clipPath id="'+id+'side"><rect x="38" y="85" width="176" height="104"/></clipPath></defs><g clip-path="url(#'+id+'side)"><path d="'+plate(px[0]-D.p*s,px[0],R*.97,R*.74)+plate(px[1],px[1]+D.p*s,R*.97,R*.74)+'" fill="#f4f6fa" stroke="'+C+'" stroke-width="1.3"/></g>';
  for(i=0;i<links;i+=2)g+='<path d="'+plate(px[i],px[i+1],R,R*.78)+'" fill="#fff" stroke="'+C+'" stroke-width="1.4"/>';
  if(offset)g+=ln((px[0]+px[1])/2-3,cy-R*.75,(px[0]+px[1])/2+3,cy+R*.75,'stroke="'+C+'" stroke-width="1"');
  for(i=0;i<px.length;i++){
    if(!offset||i==0)g+=circle(px[i],cy,D.d3*s/2,'none','stroke-dasharray="3 2" opacity=".7"');
    g+=circle(px[i],cy,D.d1*s/2,'#fff');
    if(hp&&D.bore>0)g+=circle(px[i],cy,D.bore*s/2,'#fff');
    g+=CL(px[i],cy-R-5,px[i],cy+R+5);
  }
  if(clip){var ca=px[0],cb=px[1],rr=Math.max(3,D.d1*s*.8);g+='<path data-part="clip" d="M'+P(cb+rr,cy-rr)+'L'+P(ca,cy-rr)+'A'+rr+' '+rr+' 0 0 0 '+P(ca,cy+rr)+'L'+P(cb+rr,cy+rr)+'L'+P(cb+rr,cy+rr*.35)+'L'+P(ca,cy+rr*.35)+'A'+(rr*.35)+' '+(rr*.35)+' 0 0 1 '+P(ca,cy-rr*.35)+'L'+P(cb+rr,cy-rr*.35)+'Z" fill="#e8edf5" stroke="'+C+'" stroke-width="1.2"/>'}
  g+=CL(x0-R-5,cy,px[links]+R+5,cy)+'</g>'+ttl(126,'YAN GÖRÜNÜŞ',dim);
  var yp=45,xa=px[0],xb=px[1],xh=23;
  g+=group('p',EXT(xa,cy-R,xa,yp-4,dim)+EXT(xb,cy-R,xb,yp-4,dim)+dimL(id,dim,xa,yp,xb,yp)+txt((xa+xb)/2,yp-7,'p = '+f(D.p),dim));key('p');
  g+=group('h',EXT(x0,cy-R,xh-4,cy-R,dim)+EXT(x0,cy+R,xh-4,cy+R,dim)+dimL(id,dim,xh,cy-R,xh,cy+R)+txt(xh-7,cy,'h = '+f(D.h),dim,'transform="rotate(-90 '+(xh-7)+' '+cy+')"'));key('h');
  function diameter(name,x,y){var r=D[name]*s/2;return group(name,EXT(x-r,cy,x-r,y+4,dim)+EXT(x+r,cy,x+r,y+4,dim)+dimL(id,dim,x-r,y,x+r,y)+txt(x,y+18,name+' = '+f(D[name]),dim))}
  g+=diameter('d1',px[links],207);key('d1');
  g+=diameter('d3',px[0],207);key('d3');
  /* Kesit oranlarında plaka/burç kalınlığı şematiktir; sayısal etiket üretilmez. */
  var ss=s,left=350-rowWidth*ss/2,hh=D.h*ss/2,centers=[],db=D.d1+.42*(D.d3-D.d1),fill='url(#'+id+'h)',cross='url(#'+id+'g)',section='',rowCy=D.n>2?94:137;
  function X(u){return left+u*ss}
  for(i=0;i<cols;i++)centers.push(ti*2+D.b1/2+i*(D.pt||0));
  if(offset||clip){
    ss=Math.min(s,176/(D.p+D.d3),146/(total+ti*2));
    var lx=350-D.p*ss/2,rx=350+D.p*ss/2,top=137-total*ss/2,pm=D.d1*ss/2;
    var Y=function(u){return top+u*ss};
    for(i=0;i<D.n;i++){
      var ca=ti*2+i*(D.pt||0),cb=ca+D.b1,sg;
      section+='<g data-part="strand">';
      if(offset){
        section+='<g data-part="offset">';
        for(sg=-1;sg<=1;sg+=2){
          var inner=sg<0?ca:cb,outer=inner+sg*ti,crank=sg*ti*1.4,mid=(lx+rx)/2;
          section+='<path d="M'+P(lx-D.d1*ss,Y(inner))+'L'+P(mid-5,Y(inner))+'L'+P(mid+5,Y(inner+crank))+'L'+P(rx+D.d1*ss,Y(inner+crank))+'L'+P(rx+D.d1*ss,Y(outer+crank))+'L'+P(mid+5,Y(outer+crank))+'L'+P(mid-5,Y(outer))+'L'+P(lx-D.d1*ss,Y(outer))+'Z" fill="'+fill+'" stroke="'+C+'" stroke-width="1.2"/>';
        }
        section+='</g>';
        for(sg=-1;sg<=1;sg+=2){section+=rc(lx+sg*db*ss/2,lx+sg*D.d3*ss/2,Y(ca),Y(cb),fill)+rc(lx+sg*D.d1*ss/2,lx+sg*db*ss/2,Y(ca-ti),Y(cb+ti),cross)}
      }else{
        section+=rc(lx-D.d1*ss,rx+D.d1*ss,Y(ca-ti),Y(ca),fill)+rc(lx-D.d1*ss,rx+D.d1*ss,Y(cb),Y(cb+ti),fill);
      }
      section+='</g>';
    }
    section+='<g data-part="link-pins">'+rc(lx-pm,lx+pm,Y(clip?-ti*1.7:0),Y(total),'#fff')+rc(rx-pm,rx+pm,Y(clip?-ti*1.7:0),Y(total),'#fff')+'</g>';
    if(clip)section+='<path data-part="section-clip" d="M'+P(rx+pm*1.5,Y(-ti))+'L'+P(lx-pm*1.5,Y(-ti))+'L'+P(lx-pm*1.5,Y(-ti*1.7))+'L'+P(rx+pm*1.5,Y(-ti*1.7))+'L'+P(rx+pm*1.5,Y(-ti*1.35))+'L'+P(lx+pm*1.5,Y(-ti*1.35))+'" fill="none" stroke="'+C+'" stroke-width="1.8"/>';
    section+=CL(lx-10,137,rx+10,137);
    var bx=255,by1=Y(ti*2),by2=Y(ti*2+D.b1);
    if(clip){
      section='<g transform="rotate(-90 350 137)">'+section+'</g>';
      var bx1=350+by1-137,bx2=350+by2-137,yt=137-(rx+D.d1*ss-350),yb=137-(lx-D.d1*ss-350);
      g+=group('b1',EXT(bx1,yt,bx1,41,dim)+EXT(bx2,yt,bx2,41,dim)+dimL(id,dim,bx1,45,bx2,45)+txt((bx1+bx2)/2,38,'b1 = '+f(D.b1),dim));
      if(D.n>1){var pc1=bx1+D.b1*ss/2,pc2=pc1+D.pt*ss;g+=group('pt',EXT(pc1,yb,pc1,240,dim)+EXT(pc2,yb,pc2,240,dim)+dimL(id,dim,pc1,236,pc2,236)+txt((pc1+pc2)/2,253,'pt = '+f(D.pt),dim))}
    }else{
      g+=group('b1',EXT(lx-D.d3*ss/2,by1,bx-4,by1,dim)+EXT(lx-D.d3*ss/2,by2,bx-4,by2,dim)+dimL(id,dim,bx,by1,bx,by2)+txt(bx-7,(by1+by2)/2,'b1 = '+f(D.b1),dim,'transform="rotate(-90 '+(bx-7)+' '+((by1+by2)/2)+')"'));
      if(D.n>1){var py1=Y(ti*2+D.b1/2),py2=py1+D.pt*ss;g+=group('pt',dimL(id,dim,438,py1,438,py2)+txt(431,(py1+py2)/2,'pt = '+f(D.pt),dim,'transform="rotate(-90 431 '+((py1+py2)/2)+')"'))}
    }
  }else{
  for(i=0;i<D.n;i++){
    var c=centers[i%cols],a=c-D.b1/2,b=c+D.b1/2,y=rowCy+Math.floor(i/cols)*96;
    section+='<g data-part="strand"><g data-part="plates">'+rc(X(a-ti),X(a),y-hh,y+hh,cross)+rc(X(b),X(b+ti),y-hh,y+hh,cross)+rc(X(a-ti*2),X(a-ti),y-hh*.97,y+hh*.97,fill)+rc(X(b+ti),X(b+ti*2),y-hh*.97,y+hh*.97,fill)+'</g>';
    var sg;
    for(sg=-1;sg<=1;sg+=2){section+=rc(X(a),X(b),y+sg*db*ss/2,y+sg*D.d3*ss/2,fill)+rc(X(a-ti),X(b+ti),y+sg*D.d1*ss/2,y+sg*db*ss/2,cross)}
    section+='</g>';
  }
  for(i=0;i<Math.ceil(D.n/cols);i++){
    var yy=rowCy+i*96,endWidth=D.b1+ti*4+(Math.min(cols,D.n-i*cols)-1)*(D.pt||0);
    section+=rc(X(0),X(endWidth),yy-D.d1*ss/2,yy+D.d1*ss/2,'#fff')+CL(X(0)-6,yy,X(endWidth)+6,yy);
    if(hp&&D.bore>0)section+=rc(X(0),X(endWidth),yy-D.bore*ss/2,yy+D.bore*ss/2,'#fff');
    if(D.n>2){var breakX=i==0?X(endWidth)+3:X(0)-3;section+=ln(breakX-3,yy+8,breakX+3,yy-8,'stroke="'+C+'" stroke-width="1.2"')+ln(breakX+1,yy+8,breakX+7,yy-8,'stroke="'+C+'" stroke-width="1.2"')}
  }
  if(D.n>2)section+=txt(350,146,'A-A · DEVAM',dim,'style="font-size:9px"');
  var a0=centers[0]-D.b1/2,b0=centers[0]+D.b1/2,yb=45;
  g+=group('b1',EXT(X(a0),rowCy-hh,X(a0),yb-4,dim)+EXT(X(b0),rowCy-hh,X(b0),yb-4,dim)+dimL(id,dim,X(a0),yb,X(b0),yb)+txt((X(a0)+X(b0))/2,yb-7,'b1 = '+f(D.b1),dim));
  if(D.n>1){var ya=236;g+=group('pt',EXT(X(centers[0]),rowCy+Math.floor((D.n-1)/cols)*96+hh,X(centers[0]),ya+4,dim)+EXT(X(centers[1]),rowCy+Math.floor((D.n-1)/cols)*96+hh,X(centers[1]),ya+4,dim)+dimL(id,dim,X(centers[0]),ya,X(centers[1]),ya)+txt((X(centers[0])+X(centers[1]))/2,ya+17,'pt = '+f(D.pt),dim))}
  }
  g+='<g data-part="section" data-scale="'+ss+'">'+section+'</g>'+ttl(350,'KESİT A-A',dim);key('b1');
  g+=group('n',txt(423,254,'n = '+D.n,dim,'style="font-size:10px"'));key('n');if(D.n>1)key('pt');
  if(hp&&D.bore>0){var br=D.bore*ss/2;g+=group('bore',EXT(X(rowWidth),rowCy-br,425,rowCy-br,dim)+EXT(X(rowWidth),rowCy+br,425,rowCy+br,dim)+dimL(id,dim,421,rowCy-br,421,rowCy+br)+txt(437,rowCy,'Pim deliği = '+f(D.bore),dim,'transform="rotate(-90 437 '+rowCy+')"'));key('bore')}
  return {svg:'<svg viewBox="0 0 460 260" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;font-family:inherit">'+defs(id,dim)+g+'</svg>',keys:keys};
}
(window.YDRAW=window.YDRAW||{}).zincir={match:match,draw:draw};
})();
