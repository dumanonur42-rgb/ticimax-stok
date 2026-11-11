(function(){
var Y=(window.YDRAW=window.YDRAW||{});
function nz(s){return String(s==null?'':s).replace(/[İIı]/g,'i').toLowerCase().replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').replace(/\s+/g,' ').trim()}
function match(ctx){
 var s=nz((ctx.title||'')+' '+(ctx.crumbs||[]).join(' '));
 return /kasnak/.test(s)&&/(kor|dolu) v kasnak/.test(s)&&!/triger|burclu|rulman|gergi|alternator/.test(s);
}
function dimensions(ctx){
 var o={},bad=false;
 (ctx.specs||[]).concat(ctx.onyazi||[]).forEach(function(s){
  var l=nz(s.l).replace(/:$/,''),k=l==='kasnak capi'?'D':l==='kayis genisligi'?'w':l==='kanal sayisi'?'z':null;
  if(!k)return;
  var m=String(s.v).replace(',','.').match(/^\s*(\d+(?:\.\d+)?)\s*(?:mm)?\s*$/i),v=m?+m[1]:NaN;
  if(!(v>0)){bad=true;return}
  if(o[k]!=null&&o[k]!==v)bad=true;
  o[k]=v;
 });
 return !bad&&o.D>0&&o.w>0&&o.z>=1&&o.z<=6&&o.z===Math.floor(o.z)?o:null;
}
function number(n){return String(n).replace('.',',')}
function draw(ctx,opt){
 ctx=ctx||{};opt=opt||{};
 if(!match(ctx))return null;
 var v=dimensions(ctx);if(!v)return null;
 var id=String(opt.id||'yvk').replace(/[^a-zA-Z0-9_-]/g,''),dim=opt.dim||'#0a2350',line='#16203a',hatch='#9aa6bd';
 var out=[],cy=115,R=68,fx=94,x0=246,width=54+v.z*12,x1=x0+width,pitch=width/v.z,depth=20,top=cy-R,bot=cy+R;
 function P(s){out.push(s)}
 function f(x){return Math.round(x*10)/10}
 function ln(a,b,c,d,style){return '<line x1="'+f(a)+'" y1="'+f(b)+'" x2="'+f(c)+'" y2="'+f(d)+'" '+(style||'')+'/>'}
 function text(x,y,s,extra){return '<text x="'+f(x)+'" y="'+f(y)+'" text-anchor="middle" fill="'+dim+'" font-size="12" font-weight="700" stroke="#fff" stroke-width="3" paint-order="stroke" '+(extra||'')+'>'+s+'</text>'}
 function ext(a,b,c,d){return ln(a,b,c,d,'stroke="'+dim+'" stroke-width=".6" opacity=".65"')}
 function dimline(a,b,c,d){return ln(a,b,c,d,'stroke="'+dim+'" stroke-width="1.1" marker-start="url(#'+id+'a)" marker-end="url(#'+id+'a)"')}
 P('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 250" width="100%" style="display:block;font-family:inherit"><defs><pattern id="'+id+'h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+hatch+'" stroke-width="1.1"/></pattern><marker id="'+id+'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 1.5 L10 5 L0 8.5 Z" fill="'+dim+'"/></marker></defs>');
 P('<g fill="none" stroke="'+line+'" stroke-width="1.4"><circle cx="'+fx+'" cy="'+cy+'" r="'+R+'"/><circle cx="'+fx+'" cy="'+cy+'" r="24"/><circle cx="'+fx+'" cy="'+cy+'" r="54" stroke-width=".8"/>');
 P(ln(fx-R-10,cy,fx+R+10,cy,'stroke-dasharray="12 3 2 3" stroke-width=".7"'));
 P(ln(fx,top-12,fx,bot+12,'stroke-dasharray="12 3 2 3" stroke-width=".7"')+'</g>');
 var pts=[[x0,top]];
 for(var i=0;i<v.z;i++){
  var a=x0+i*pitch;
  pts.push([a+pitch*.12,top],[a+pitch*.38,top+depth],[a+pitch*.62,top+depth],[a+pitch*.88,top],[a+pitch,top]);
 }
 pts.push([x1,bot]);
 for(var j=v.z-1;j>=0;j--){
  var b=x0+j*pitch;
  pts.push([b+pitch*.88,bot],[b+pitch*.62,bot-depth],[b+pitch*.38,bot-depth],[b+pitch*.12,bot],[b,bot]);
 }
 P('<path d="M'+pts.map(function(p){return f(p[0])+','+f(p[1])}).join(' L')+' Z" fill="url(#'+id+'h)" stroke="'+line+'" stroke-width="1.4" stroke-linejoin="round"/>');
 P(ln(x0-12,cy,x1+12,cy,'stroke="'+line+'" stroke-dasharray="12 3 2 3" stroke-width=".7"'));
 P('<g class="hl" data-k="D">'+ext(fx-R,cy,fx-R,211)+ext(fx+R,cy,fx+R,211)+dimline(fx-R,205,fx+R,205)+text(fx,222,'Ø'+number(v.D))+'</g>');
 var left=x0+pitch*.12,right=x0+pitch*.88;
 P('<g class="hl" data-k="w">'+ext(left,top,left,19)+ext(right,top,right,19)+dimline(left,23,right,23)+text((left+right)/2,13,number(v.w))+'</g>');
 P('<g class="hl" data-k="z">'+ln(x1-3,top+depth,x1+15,top-8,'stroke="'+dim+'" stroke-width="1.1"')+text(x1+16,top-17,'z='+v.z)+'</g>');
 P('<g fill="'+line+'" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="1.2"><text x="94" y="243">ÖN GÖRÜNÜŞ</text><text x="'+f((x0+x1)/2)+'" y="243">KESİT A-A</text></g></svg>');
 return {svg:out.join(''),keys:[{k:'D',l:'Kasnak Çapı',v:number(v.D)+' mm'},{k:'w',l:'Kayış Genişliği',v:number(v.w)+' mm'},{k:'z',l:'Kanal Sayısı',v:String(v.z)}]};
}
Y['v_kasnak']={match:function(ctx){return match(ctx||{})},draw:draw};
})();
