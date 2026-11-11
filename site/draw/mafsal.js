(function () {
  var C='#16203a', HC='#9aa6bd';
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function r(n) { return Math.round(n*100)/100; }
  function f(n) { return String(Math.round(n*1000)/1000).replace('.',','); }
  function kind(ctx) { var t=String(ctx.title || '').toUpperCase(); return /\bSSPHS\s*\d/.test(t) ? 'ic' : /\bSSPOS\s*\d/.test(t) ? 'dis' : null; }
  function values(ctx) {
    var out={}, bad=false;
    (ctx.specs || []).concat(ctx.onyazi || []).forEach(function(s) {
      var m=String(s.l).match(/\(([A-Za-z][A-Za-z0-9]*)\)\s*$/), n;
      if(!m) return;
      if(m[1]==='G') { if(!/^M\d+(?:[.,]\d+)?(?:[×x*]\d+(?:[.,]\d+)?)?$/.test(s.v)) return; n=parseFloat(String(s.v).slice(1).replace(',','.')); }
      else { if(!/^\d+(?:[.,]\d+)?\s*mm$/.test(s.v)) return; n=parseFloat(String(s.v).replace(',','.')); }
      if(!(n>0)) return;
      if(out[m[1]] && out[m[1]].v!==s.v) bad=true;
      out[m[1]]={n:n,l:s.l,v:s.v};
    });
    return bad ? null : out;
  }
  function has(v,ks) { return ks.every(function(k) { return v[k] && v[k].n>0; }); }
  function Pen(opt) { this.id=esc(opt.id || 'mf'); this.dim=opt.dim || '#0a2350'; this.g=[]; this.keys=[]; }
  var P=Pen.prototype;
  P.line=function(x1,y1,x2,y2,extra) { return '<line x1="'+r(x1)+'" y1="'+r(y1)+'" x2="'+r(x2)+'" y2="'+r(y2)+'" '+(extra || 'stroke="'+C+'" stroke-width="1.3"')+'/>'; };
  P.text=function(x,y,t) { return '<text x="'+r(x)+'" y="'+r(y)+'" font-size="12.5" font-weight="700" text-anchor="middle" fill="'+this.dim+'">'+esc(t)+'</text>'; };
  P.title=function(x,t) { this.g.push(this.text(x,17,t)); };
  P.path=function(d,fill) { this.g.push('<path d="'+d+'" fill="'+(fill ? 'url(#'+this.id+'-h)' : 'none')+'" stroke="'+C+'" stroke-width="1.4" stroke-linejoin="round"/>'); };
  P.hidden=function(d,fill) { this.g.push('<path d="'+d+'" fill="'+(fill || 'none')+'" stroke="'+C+'" stroke-width=".85" stroke-dasharray="4 2"/>'); };
  P.circle=function(x,y,rad) { this.g.push('<circle cx="'+r(x)+'" cy="'+r(y)+'" r="'+r(rad)+'" fill="none" stroke="'+C+'" stroke-width="1.2"/>'); };
  P.axis=function(x1,y1,x2,y2) { this.g.push(this.line(x1,y1,x2,y2,'stroke="'+C+'" stroke-width=".7" stroke-dasharray="10 3 2 3"')); };
  P.group=function(k,s,body) { this.keys.push({k:k,l:s.l,v:s.v}); this.g.push('<g class="hl" data-k="'+k+'">'+body+'</g>'); };
  P.dimline=function(k,s,a,b,tx,ty,label,refs) {
    var self=this, ext='';
    if(refs) refs.forEach(function(q,i) { var p=i ? b : a; ext+=self.line(q[0],q[1],p[0]+(p[0]===q[0] ? 0 : p[0]>q[0] ? 3 : -3),p[1]+(p[1]===q[1] ? 0 : p[1]>q[1] ? 3 : -3),'stroke="'+self.dim+'" stroke-width=".65"'); });
    this.group(k,s,ext+this.line(a[0],a[1],b[0],b[1],'stroke="'+this.dim+'" stroke-width="1" marker-start="url(#'+this.id+'-a)" marker-end="url(#'+this.id+'-a)"')+this.text(tx,ty,label));
  };
  P.lead=function(k,s,x,y,tx,ty,label) { this.group(k,s,this.line(x,y,tx,ty-12,'stroke="'+this.dim+'" stroke-width="1" marker-start="url(#'+this.id+'-a)"')+this.text(tx,ty,label)); };
  P.result=function() { return {keys:this.keys,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 460 260" style="display:block;font-family:inherit"><defs><pattern id="'+this.id+'-h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+HC+'" stroke-width="1"/></pattern><marker id="'+this.id+'-a" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M10 5 L0 1 L0 9 Z" fill="'+this.dim+'"/></marker></defs>'+this.g.join('')+'</svg>'}; };
  function draw(ctx,opt) {
    var type=kind(ctx), v=values(ctx), female=type==='ic', height=female ? 'L4' : 'L2', center=female ? 'h1' : 'h', thread=female ? 'L3' : 'L1';
    if(!type || !v || !has(v,['d','dk','d2','B','C1','G',height,center,thread]) || (female && !has(v,['d3','d4']))) return null;
    if(v.d.n>=v.dk.n || v.dk.n>=v.d2.n || v.B.n>=v.dk.n || v.C1.n>=v.B.n || Math.abs(v[height].n-v[center].n-v.d2.n/2)>.05 || v[thread].n>=v[center].n) return null;
    var p=new Pen(opt || {}), sc=148/v[height].n, cx=120, sx=342, top=57, bottom=205, head=v.d2.n*sc/2, ball=v.dk.n*sc/2, bore=v.d.n*sc/2, cy=top+head, halfB=v.B.n*sc/2, halfC=v.C1.n*sc/2;
    var neck=(female ? v.d3.n : v.G.n)*sc/2, foot=(female ? v.d4.n : v.G.n)*sc/2, join=cy+Math.sqrt(Math.max(0,head*head-neck*neck)), start=bottom-v[thread].n*sc, mouth=v.G.n*sc/2;
    if(neck>=head || foot>=head || mouth>=foot && female) return null;
    p.title(cx,'ÖN GÖRÜNÜŞ'); p.title(sx,'KESİT A-A');
    p.path('M'+r(cx+neck)+' '+r(join)+' A'+r(head)+' '+r(head)+' 0 1 0 '+r(cx-neck)+' '+r(join)+' L'+r(cx-foot)+' '+bottom+' H'+r(cx+foot)+' Z');
    p.circle(cx,cy,ball); p.circle(cx,cy,bore); p.axis(cx-head-10,cy,cx+head+10,cy); p.axis(cx,top-8,cx,214);
    var inter=Math.sqrt(ball*ball-halfC*halfC), edge=Math.sqrt(ball*ball-halfB*halfB);
    p.path('M'+r(sx-halfC)+' '+top+' H'+r(sx+halfC)+' V'+r(cy-inter)+' A'+r(ball)+' '+r(ball)+' 0 0 0 '+r(sx-halfC)+' '+r(cy-inter)+' Z',true);
    p.path('M'+r(sx-halfC)+' '+r(cy+inter)+' A'+r(ball)+' '+r(ball)+' 0 0 0 '+r(sx+halfC)+' '+r(cy+inter)+' V'+r(cy+head)+' L'+r(sx+foot)+' '+bottom+' H'+r(sx-foot)+' L'+r(sx-halfC)+' '+r(cy+head)+' Z',true);
    p.path('M'+r(sx-halfB)+' '+r(cy-edge)+' A'+r(ball)+' '+r(ball)+' 0 0 1 '+r(sx+halfB)+' '+r(cy-edge)+' V'+r(cy-bore)+' H'+r(sx-halfB)+' Z',true);
    p.path('M'+r(sx-halfB)+' '+r(cy+bore)+' H'+r(sx+halfB)+' V'+r(cy+edge)+' A'+r(ball)+' '+r(ball)+' 0 0 1 '+r(sx-halfB)+' '+r(cy+edge)+' Z',true);
    if(female) {
      [cx,sx].forEach(function(x) {
        p.hidden('M'+r(x-mouth)+' '+(bottom+1)+' V'+r(start)+' H'+r(x+mouth)+' V'+(bottom+1),x===sx ? 'white' : 'none');
        for(var y=start+4;y<bottom-2;y+=6) p.hidden('M'+r(x-mouth)+' '+r(y)+' l3 -2 M'+r(x+mouth)+' '+r(y)+' l-3 2');
      });
    } else {
      [cx,sx].forEach(function(x) { for(var y=start;y<bottom-4;y+=6) { p.path('M'+r(x-foot)+' '+r(y)+' l3 2 l-3 2 M'+r(x+foot)+' '+r(y)+' l-3 2 l3 2'); p.path('M'+r(x-foot+3)+' '+r(y+2)+' L'+r(x+foot-3)+' '+r(y+4)); } });
    }
    p.axis(sx-halfB-12,cy,sx+halfB+12,cy); p.axis(sx,top-8,sx,214);
    p.dimline('d2',v.d2,[cx-head,43],[cx+head,43],cx,33,'d2 Ø'+f(v.d2.n),[[cx-head,cy],[cx+head,cy]]);
    p.dimline('d',v.d,[cx-bore,cy],[cx+bore,cy],cx,cy-7,'Ø'+f(v.d.n));
    p.lead('dk',v.dk,cx+ball*.707,cy-ball*.707,217,59,'dk Ø'+f(v.dk.n));
    p.dimline(height,v[height],[30,top],[30,bottom],36,236,height+' '+f(v[height].n),[[cx,top],[cx-foot,bottom]]);
    p.dimline(center,v[center],[220,cy],[220,bottom],215,236,center+' '+f(v[center].n),[[cx+head,cy],[cx+foot,bottom]]);
    p.lead('G',v.G,cx+mouth,bottom-12,133,253,v.G.v);
    p.dimline('B',v.B,[sx-halfB,226],[sx+halfB,226],sx,249,'B '+f(v.B.n),[[sx-halfB,cy-bore-2],[sx+halfB,cy-bore-2]]);
    p.dimline('C1',v.C1,[sx-halfC,top+6],[sx+halfC,top+6],sx,top-6,'C1 '+f(v.C1.n));
    p.dimline(thread,v[thread],[420,start],[420,bottom],419,237,thread+' '+f(v[thread].n),[[sx+foot,start],[sx+foot,bottom]]);
    return p.result();
  }
  (window.YDRAW=window.YDRAW || {}).mafsal={match:function(ctx) { return !!kind(ctx); },draw:draw};
}());
