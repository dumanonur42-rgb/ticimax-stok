/* KH kapalı kompakt lineer bilyalı burç; yalnız teknik listedeki d/D/L. */
(function(){
var labels={d:'İç Çap (d)',D:'Dış Çap (D)',L:'Uzunluk (L)'};
function norm(s){return String(s||'').replace(/[İı]/g,'i').toLowerCase().replace(/\s+/g,' ').trim()}
function match(ctx){
  var t=String(ctx.title||'').toUpperCase(),kh=/(^|[^A-Z0-9])KH(?=\s*\d|[^A-Z0-9]|$)/.test(t);
  return /(^|[^A-Z0-9])KH\s*\d/.test(t)||(kh&&(ctx.crumbs||[]).some(function(c){return norm(c)=='lineer rulmanlar'}));
}
function dims(ctx){
  var o={},bad=false;
  (ctx.specs||[]).forEach(function(s){
    var k,m,n;
    for(k in labels)if(s.l===labels[k]){
      m=String(s.v||'').trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:mm)?$/i);
      n=m?Number(m[1].replace(',','.')):NaN;
      if(!isFinite(n)||!(n>0)||(o[k]!=null&&o[k]!==n))bad=true;
      else o[k]=n;
    }
  });
  return !bad&&o.d>0&&o.D>o.d&&o.L>0?o:null;
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function f(n){return String(n).replace('.',',')}
function r(n){return Math.round(n*100)/100}
function draw(ctx,opt){
  if(!match(ctx))return null;
  var v=dims(ctx);if(!v)return null;
  opt=opt||{};
  var id=esc(opt.id||'lineer-kh'),dim=esc(opt.dim||'#0a2350'),s=Math.min(124/v.D,152/v.L),R=v.D*s/2,b=v.d*s/2,w=v.L*s;
  var cx=111,cy=122,x=254,xe=x+w,top=cy-R,bot=cy+R,wall=R-b,ball=wall*.27,S=[];
  function line(x1,y1,x2,y2,extra){return '<line x1="'+r(x1)+'" y1="'+r(y1)+'" x2="'+r(x2)+'" y2="'+r(y2)+'" '+(extra||'')+'/>'}
  function text(x1,y1,t,extra){return '<text x="'+r(x1)+'" y="'+r(y1)+'" '+(extra||'')+'>'+esc(t)+'</text>'}
  function circle(x1,y1,rr){return '<circle cx="'+r(x1)+'" cy="'+r(y1)+'" r="'+r(rr)+'"/>'}
  function rect(x1,y1,ww,hh,fill){return '<rect x="'+r(x1)+'" y="'+r(y1)+'" width="'+r(ww)+'" height="'+r(hh)+'" fill="'+fill+'"/>'}
  function group(k,body){return '<g class="hl" data-k="'+k+'" style="color:'+dim+'" stroke="currentColor" fill="none">'+body+'</g>'}
  function arrows(x1,y1,x2,y2){return line(x1,y1,x2,y2,'marker-start="url(#'+id+'-arrow)" marker-end="url(#'+id+'-arrow)"')}
  S.push('<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 460 230" role="img" aria-label="KH lineer rulman ön görünüş ve kesit" style="font-family:inherit">');
  S.push('<defs><pattern id="'+id+'-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#9aa6bd" stroke-width="1"/></pattern><marker id="'+id+'-arrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M8 4L0 1V7Z" fill="context-stroke"/></marker></defs>');
  S.push('<g stroke="#16203a" stroke-width="1.4" fill="none">',circle(cx,cy,R),circle(cx,cy,b),circle(cx,cy,(R+b)/2));
  S.push(rect(x,top,w,wall*.26,'url(#'+id+'-hatch)'),rect(x,bot-wall*.26,w,wall*.26,'url(#'+id+'-hatch)'));
  [-1,1].forEach(function(q){
    var yy=cy+q*(b+wall*.38);
    S.push(line(x,cy+q*b,xe,cy+q*b),line(x,top,x,bot),line(xe,top,xe,bot));
    for(var i=1;i<=6;i++)S.push(circle(x+w*i/7,yy,Math.min(ball,w/20)));
  });
  S.push('<g stroke="#9aa6bd" stroke-width=".8" stroke-dasharray="8 3 2 3">',line(cx-R-12,cy,cx+R+12,cy),line(cx,top-8,cx,bot+8),line(x-12,cy,xe+12,cy),'</g></g>');
  S.push('<g font-size="12" font-weight="bold" text-anchor="middle" stroke-width="1">');
  S.push(group('d',arrows(cx-b,cy,cx+b,cy)+text(cx,cy-9,'ø'+f(v.d),'fill="currentColor" stroke="none"')));
  S.push(group('L',line(x,top-3,x,30)+line(xe,top-3,xe,30)+arrows(x,36,xe,36)+text((x+xe)/2,26,f(v.L),'fill="currentColor" stroke="none"')));
  S.push(group('D',line(xe+3,top,434,top)+line(xe+3,bot,434,bot)+arrows(428,top,428,bot)+text(444,cy,'ø'+f(v.D),'fill="currentColor" stroke="none" transform="rotate(-90 444 '+cy+')"')));
  S.push('</g><g fill="#16203a" font-size="11" font-weight="bold" text-anchor="middle">',text(cx,214,'ÖN GÖRÜNÜŞ'),text((x+xe)/2,214,'KESİT A-A'),'</g></svg>');
  return {svg:S.join(''),keys:['d','D','L'].map(function(k){return {k:k,l:labels[k],v:f(v[k])+' mm'}})};
}
(window.YDRAW=window.YDRAW||{})["0_lineer_kh"]={match:match,draw:draw};
})();
