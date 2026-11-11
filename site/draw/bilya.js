/* Tane bilya (rulman bilyası, çelik bilya) ailesi: ÖN GÖRÜNÜŞ + KESİT A-A (dolu küre).
   Tek ölçü bilya çapı (Dw); sadece ürün verisinden okunur, yoksa null. */
(function(){
var Y=(window.YDRAW=window.YDRAW||{});
function nz(s){return String(s==null?'':s).replace(/[İIı]/g,'i').toLowerCase().replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').replace(/â/g,'a').replace(/\s+/g,' ').trim()}
function NUM(v){var m=String(v).replace(/(\d)\.(\d{3})(?!\d)/g,'$1$2').replace(/,/g,'.').match(/\d+(?:\.\d+)?/);return m?parseFloat(m[0]):NaN}
function f(n){return String(Math.round(n*1000)/1000).replace('.',',')}
function r1(n){return Math.round(n*10)/10}
function isBall(ctx){
 var cr=nz((ctx.crumbs||[]).join(' > ')),ti=nz(ctx.title);
 if(/rulman|teker|somun|mafsal|vida|kizak/.test(ti)&&!/tane bilya|rulman bilyasi|celik bilya/.test(ti))return false;
 return /tane bilya/.test(cr)||/tane bily[ae]/.test(ti)||/(celik|rulman) bilyasi/.test(ti);
}
function dims(ctx){
 var src=(ctx.specs||[]).concat(ctx.onyazi||[]),o={},bad=false;
 function put(k,v){if(!(v>0))return;if(o[k]!=null&&Math.abs(o[k]-v)>1e-6)bad=true;else o[k]=v}
 src.forEach(function(s){var l=nz(s.l),v=String(s.v);
  if(/^(bilya capi|bilye capi|cap)( \(dw\))?$/.test(l)||/^cap \(mm\)$/.test(l)){if(/mm|^\s*[\d.,]+\s*$/i.test(v))put('Dw',NUM(v))}
  else if(/^(inc|inch) olcusu/.test(l)||/^olcu \(inc/.test(l)){var m=v.match(/\d+(?:-\d+)?\/\d+|\d+(?=\s*["″])/);if(m&&!o.inc)o.inc=m[0]}
 });
 var dt=ctx.data||null;if(dt&&dt.Dw>0)put('Dw',+dt.Dw);
 return bad?null:o;
}
Y['bilya']={
 match:function(ctx){return isBall(ctx)},
 draw:function(ctx,opt){
  if(!isBall(ctx))return null;
  var o=dims(ctx);if(!o||!(o.Dw>0))return null;
  opt=opt||{};var dim=opt.dim||'#0a2350',id=opt.id||'yb',L='#16203a',HT='#9aa6bd';
  var W=460,H=230,R=70,CY=100,FX=118,SX=342;
  function ln(x1,y1,x2,y2,a){a=a||{};return '<line x1="'+r1(x1)+'" y1="'+r1(y1)+'" x2="'+r1(x2)+'" y2="'+r1(y2)+'" stroke="'+(a.c||L)+'" stroke-width="'+(a.w||1.4)+'"'+(a.d?' stroke-dasharray="'+a.d+'"':'')+(a.m?' marker-start="url(#'+id+'a)" marker-end="url(#'+id+'a)"':'')+'/>'}
  function T(x,y,s,a){a=a||{};return '<text x="'+r1(x)+'" y="'+r1(y)+'" fill="'+(a.c||dim)+'" font-size="'+(a.fs||12)+'" font-weight="700" text-anchor="'+(a.an||'middle')+'" font-family="inherit"'+(a.op?' opacity="'+a.op+'"':'')+'>'+s+'</text>'}
  var lab='Ø'+f(o.Dw)+(o.inc?' ('+o.inc+'″)':'');
  var s='<svg viewBox="0 0 '+W+' '+H+'" width="100%" style="display:block" xmlns="http://www.w3.org/2000/svg"><defs>'+
   '<pattern id="'+id+'h1" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+HT+'" stroke-width="1.1"/></pattern>'+
   '<radialGradient id="'+id+'g" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#dfe4ec"/><stop offset="1" stop-color="#aab3c3"/></radialGradient>'+
   '<marker id="'+id+'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,1.5 L10,5 L0,8.5z" fill="'+dim+'"/></marker></defs>';
  // ÖN GÖRÜNÜŞ
  s+='<circle cx="'+FX+'" cy="'+CY+'" r="'+R+'" fill="url(#'+id+'g)" stroke="'+L+'" stroke-width="1.6"/>';
  s+=ln(FX-R-10,CY,FX+R+10,CY,{w:.8,d:'10 3 2 3'})+ln(FX,CY-R-12,FX,CY+R+12,{w:.8,d:'10 3 2 3'});
  // kesit düzlemi A-A (yatay)
  s+=ln(FX-R-24,CY,FX-R-14,CY,{w:2.2})+ln(FX+R+14,CY,FX+R+24,CY,{w:2.2});
  s+=T(FX-R-19,CY-7,'A',{c:L,fs:11})+T(FX+R+19,CY-7,'A',{c:L,fs:11});
  var dy=CY+R+24;
  s+='<g class="hl" data-k="Dw">'+T(FX,dy-5,lab)+ln(FX-R,CY+4,FX-R,dy+5,{w:.8,c:dim})+ln(FX+R,CY+4,FX+R,dy+5,{w:.8,c:dim})+ln(FX-R,dy,FX+R,dy,{m:1,w:1.1,c:dim})+'</g>';
  // KESİT A-A: dolu küre, taralı
  s+='<circle cx="'+SX+'" cy="'+CY+'" r="'+R+'" fill="url(#'+id+'h1)" stroke="'+L+'" stroke-width="1.6"/>';
  s+=ln(SX-R-12,CY,SX+R+12,CY,{w:.8,d:'10 3 2 3'})+ln(SX,CY-R-12,SX,CY+R+12,{w:.8,d:'10 3 2 3'});
  s+='<text x="'+FX+'" y="'+(H-5)+'" fill="'+L+'" font-size="10" font-weight="700" letter-spacing="1.4" text-anchor="middle" opacity=".7" font-family="inherit">ÖN GÖRÜNÜŞ</text>';
  s+='<text x="'+SX+'" y="'+(H-5)+'" fill="'+L+'" font-size="10" font-weight="700" letter-spacing="1.4" text-anchor="middle" opacity=".7" font-family="inherit">KESİT A-A</text>';
  s+='</svg>';
  return {svg:s,keys:[{k:'Dw',l:'Bilya Çapı (Dw)',v:f(o.Dw)+' mm'+(o.inc?' ('+o.inc+'″)':'')}]};
 }
};
})();
