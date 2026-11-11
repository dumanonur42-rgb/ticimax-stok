(function () {
  var C='#16203a', HC='#9aa6bd', PI=Math.PI;
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function r(n) { return Math.round(n*100)/100; }
  function f(n) { return String(Math.round(n*1000)/1000).replace('.',','); }
  function fold(s) { return String(s || '').replace(/İ/g,'i').replace(/I/g,'i').toLowerCase().replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ç/g,'c').replace(/ö/g,'o').replace(/ü/g,'u'); }
  function match(ctx) { return /bilyali masaustu tasiyici/.test(fold(ctx.title)) && /\b(?:SP|CY|IA|NL)[\s-]*\d/i.test(ctx.title); }
  function values(ctx) {
    var v={},bad=false;
    (ctx.specs || []).concat(ctx.onyazi || []).forEach(function(s) {
      if(s.l==='Montaj Tipi') { if(v.mount && v.mount!==s.v) bad=true; v.mount=s.v; return; }
      var m=String(s.l).match(/\(([A-Za-z][A-Za-z0-9]*)\)\s*$/);
      if(!m || !/^\d+(?:[.,]\d+)?\s*mm$/.test(s.v)) return;
      var n=parseFloat(String(s.v).replace(',','.'));
      if(!(n>0)) return;
      if(v[m[1]] && v[m[1]].v!==s.v) bad=true;
      v[m[1]]={n:n,l:s.l,v:s.v};
    });
    return bad ? null : v;
  }
  function has(v,ks) { return ks.every(function(k) { return v[k] && v[k].n>0; }); }
  function Pen(opt) { this.id=esc(opt.id || 'bt'); this.dim=opt.dim || '#0a2350'; this.g=[]; this.keys=[]; }
  var P=Pen.prototype;
  P.line=function(x1,y1,x2,y2,extra) { return '<line x1="'+r(x1)+'" y1="'+r(y1)+'" x2="'+r(x2)+'" y2="'+r(y2)+'" '+(extra || 'stroke="'+C+'" stroke-width="1.3"')+'/>'; };
  P.text=function(x,y,t,rotate) { return '<text x="'+r(x)+'" y="'+r(y)+'" font-size="12.5" font-weight="700" text-anchor="middle" fill="'+this.dim+'" '+(rotate ? 'transform="rotate(-90 '+r(x)+' '+r(y)+')"' : '')+'>'+esc(t)+'</text>'; };
  P.title=function(x,t) { this.g.push(this.text(x,17,t)); };
  P.path=function(d,hatch) { this.g.push('<path d="'+d+'" fill="'+(hatch ? 'url(#'+this.id+'-h)' : 'none')+'" stroke="'+C+'" stroke-width="1.4" stroke-linejoin="round"/>'); };
  P.circle=function(x,y,rad,hidden) { this.g.push('<circle cx="'+r(x)+'" cy="'+r(y)+'" r="'+r(rad)+'" fill="'+(hidden ? 'none' : 'white')+'" stroke="'+C+'" stroke-width="1.1" '+(hidden ? 'stroke-dasharray="4 2"' : '')+'/>'); };
  P.axis=function(x1,y1,x2,y2) { this.g.push(this.line(x1,y1,x2,y2,'stroke="'+C+'" stroke-width=".7" stroke-dasharray="10 3 2 3"')); };
  P.dimline=function(k,s,a,b,tx,ty,label,refs,rotate) {
    var self=this,ext='';
    if(refs) refs.forEach(function(q,i) { var p=i ? b : a; ext+=self.line(q[0],q[1],p[0]+(p[0]===q[0] ? 0 : p[0]>q[0] ? 3 : -3),p[1]+(p[1]===q[1] ? 0 : p[1]>q[1] ? 3 : -3),'stroke="'+self.dim+'" stroke-width=".65"'); });
    this.keys.push({k:k,l:s.l,v:s.v});
    this.g.push('<g class="hl" data-k="'+k+'">'+ext+this.line(a[0],a[1],b[0],b[1],'stroke="'+this.dim+'" stroke-width="1" marker-start="url(#'+this.id+'-a)" marker-end="url(#'+this.id+'-a)"')+this.text(tx,ty,label,rotate)+'</g>');
  };
  P.result=function() { return {keys:this.keys,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 460 260" style="display:block;font-family:inherit"><defs><pattern id="'+this.id+'-h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+HC+'" stroke-width="1"/></pattern><marker id="'+this.id+'-a" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M10 5 L0 1 L0 9 Z" fill="'+this.dim+'"/></marker></defs>'+this.g.join('')+'</svg>'}; };
  function draw(ctx,opt) {
    var v=values(ctx), mount=v && fold(v.mount), flange=mount && !/flanssiz/.test(mount) && /flans/.test(mount);
    if(!match(ctx) || !v || !mount || !has(v,['Dw','D','h','H'])) return null;
    if(/sap|civata|tabla/.test(mount)) return null;
    if(!/yuvaya oturtmali/.test(mount) || flange && !has(v,['D1','b'])) return null;
    if(v.Dw.n>=v.D.n || v.h.n>=v.Dw.n || v.H.n<=v.Dw.n || flange && (v.D1.n<=v.D.n || v.b.n>=v.h.n)) return null;
    var p=new Pen(opt || {}), outer=flange ? v.D1.n : v.D.n, sc=Math.min(130/outer,140/v.H.n), cx=119,sx=342,cy=127,top=65,ball=v.Dw.n*sc/2,body=v.D.n*sc/2,lip=outer*sc/2,base=top+v.H.n*sc,plane=top+v.h.n*sc,cap=flange ? plane-v.b.n*sc : plane,bc=top+ball;
    var support=ball*.1,race=ball+2*support,opening=Math.sqrt(Math.max(0,ball*ball-Math.pow(cap-bc,2)))+1;
    if(race>=body || bc+race>=base) return null;
    p.title(cx,'ÖN GÖRÜNÜŞ'); p.title(sx,'KESİT A-A');
    if(flange) p.circle(cx,cy,lip);
    p.circle(cx,cy,body); p.circle(cx,cy,ball); p.axis(cx-lip-9,cy,cx+lip+9,cy); p.axis(cx,cy-lip-9,cx,cy+lip+9);
    p.path('M'+r(sx-body)+' '+r(base)+' V'+r(plane)+' H'+r(sx-lip)+' V'+r(plane-2)+' L'+r(sx-opening)+' '+r(cap)+' L'+r(sx-race)+' '+r(bc)+' A'+r(race)+' '+r(race)+' 0 0 0 '+r(sx+race)+' '+r(bc)+' L'+r(sx+opening)+' '+r(cap)+' L'+r(sx+lip)+' '+r(plane-2)+' V'+r(plane)+' H'+r(sx+body)+' V'+r(base)+' Z',true);
    for(var a=0;a<=180;a+=22.5) p.circle(sx+(ball+support)*Math.cos(a*PI/180),bc+(ball+support)*Math.sin(a*PI/180),support);
    p.circle(sx,bc,ball); p.axis(sx-lip-9,bc,sx+lip+9,bc); p.axis(sx,top-10,sx,base+10);
    p.dimline('Dw',v.Dw,[cx-ball,cy],[cx+ball,cy],cx,cy-7,'Dw Ø'+f(v.Dw.n));
    if(flange) {
      p.dimline('D',v.D,[29,cy-body],[29,cy+body],43,48,'D Ø'+f(v.D.n),[[cx,cy-body],[cx,cy+body]]);
      p.dimline('D1',v.D1,[cx-lip,222],[cx+lip,222],cx,245,'D1 Ø'+f(v.D1.n),[[cx-lip,cy],[cx+lip,cy]]);
      p.dimline('b',v.b,[416,cap],[416,plane],430,(cap+plane)/2,'b '+f(v.b.n),[[sx+opening,cap],[sx+lip,plane]],true);
    } else p.dimline('D',v.D,[cx-body,222],[cx+body,222],cx,245,'D Ø'+f(v.D.n),[[cx-body,cy],[cx+body,cy]]);
    p.dimline('H',v.H,[260,top],[260,base],251,(top+base)/2,'H '+f(v.H.n),[[sx,top],[sx-body,base]],true);
    p.dimline('h',v.h,[443,top],[443,plane],455,(top+plane)/2,'h '+f(v.h.n),[[sx,top],[sx+lip,plane]],true);
    return p.result();
  }
  (window.YDRAW=window.YDRAW || {}).tasiyici={match:match,draw:draw};
}());
