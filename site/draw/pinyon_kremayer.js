(function () {
  var C = '#16203a', H = '#9aa6bd', PI = Math.PI;
  function norm(s) { return String(s || '').replace(/İ/g, 'i').replace(/I/g, 'i').toLowerCase().replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u'); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function f(n) { return String(Math.round(n * 1000) / 1000).replace('.', ','); }
  function r(n) { return Math.round(n * 100) / 100; }
  function kind(ctx) {
    var t = norm(ctx.title);
    if (/helis|zincir/.test(t)) return null;
    if (/duz pinyon/.test(t)) return 'pinyon';
    if (/duz kremayer/.test(t) || (/kremayer/.test(t) && /duz kremayer/.test(norm((ctx.crumbs || []).join(' / '))))) return 'kremayer';
    return null;
  }
  function dims(ctx) {
    var o = {}, a = (ctx.specs || []).concat(ctx.onyazi || []);
    a.forEach(function (s) {
      var m = String(s.l).match(/\(([A-Za-z][A-Za-z0-9]*)\)\s*$/), n;
      if (!m || o[m[1]] || !/^\s*\d+(?:[.,]\d+)?\s*(?:mm)?\s*$/.test(s.v)) return;
      n = ctx.num ? ctx.num(s.v) : parseFloat(String(s.v).replace(',', '.'));
      if (isFinite(n) && n > 0) o[m[1]] = {n:n, l:s.l, v:s.v};
    });
    return o;
  }
  function has(o, ks) { return ks.every(function (k) { return o[k] && o[k].n > 0; }); }
  function pen(opt) {
    var id = esc((opt && opt.id) || 'pk'), dim = (opt && opt.dim) || '#0a2350', g = [], keys = [];
    function line(x1,y1,x2,y2,extra) { return '<line x1="'+r(x1)+'" y1="'+r(y1)+'" x2="'+r(x2)+'" y2="'+r(y2)+'" '+(extra || '')+'/>'; }
    function text(x,y,s,size,extra) { return '<text x="'+r(x)+'" y="'+r(y)+'" fill="'+dim+'" font-size="'+(size || 12)+'" font-weight="700" text-anchor="middle" '+(extra || '')+'>'+esc(s)+'</text>'; }
    return {
      add:function(s) { g.push(s); },
      text:function(x,y,s,size) { g.push(text(x,y,s,Math.max(12,size || 12))); },
      line:function(x1,y1,x2,y2) { g.push(line(x1,y1,x2,y2,'stroke="'+C+'" stroke-width="1.4"')); },
      axis:function(x1,y1,x2,y2) { g.push(line(x1,y1,x2,y2,'stroke="'+C+'" stroke-width=".7" stroke-dasharray="10 3 2 3"')); },
      path:function(d,fill) { g.push('<path d="'+d+'" stroke="'+C+'" stroke-width="1.4" stroke-linejoin="round" fill="'+(fill ? 'url(#'+id+'-h)' : 'none')+'"/>'); },
      circle:function(x,y,rr,dash) { g.push('<circle cx="'+x+'" cy="'+y+'" r="'+r(rr)+'" fill="none" stroke="'+C+'" stroke-width="1" '+(dash ? 'stroke-dasharray="10 3 2 3"' : '')+'/>'); },
      dim:function(k,s,x1,y1,x2,y2,tx,ty,label,refs) {
        if (!keys.some(function(v) { return v.k === k; })) keys.push({k:k,l:s.l,v:s.v});
        var ext = '';
        if (refs) refs.forEach(function(q,i) { var x=i ? x2 : x1, y=i ? y2 : y1; ext += line(q[0],q[1],x+(x===q[0] ? 0 : (x>q[0] ? 3 : -3)),y+(y===q[1] ? 0 : (y>q[1] ? 3 : -3)),'stroke="'+dim+'" stroke-width=".65"'); });
        g.push('<g class="hl" data-k="'+k+'">'+ext+line(x1,y1,x2,y2,'stroke="'+dim+'" stroke-width="1" marker-start="url(#'+id+'-a)" marker-end="url(#'+id+'-a)"')+text(tx,ty,label || k+' '+f(s.n),12.5)+'</g>');
      },
      meta:function(k,s,x,y,label) { keys.push({k:k,l:s.l,v:s.v}); g.push('<g class="hl" data-k="'+k+'">'+text(x,y,label,12.5)+'</g>'); },
      note:function(k,s,x,y,tx,ty,label) {
        keys.push({k:k,l:s.l,v:s.v});
        g.push('<g class="hl" data-k="'+k+'">'+line(x,y,tx,ty-12,'stroke="'+dim+'" stroke-width="1" marker-start="url(#'+id+'-a)"')+text(tx,ty,label || k+' '+f(s.n),12)+'</g>');
      },
      result:function() { return {keys:keys,svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 260" width="100%" style="display:block;font-family:inherit"><defs><pattern id="'+id+'-h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+H+'" stroke-width="1"/></pattern><marker id="'+id+'-a" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M10 5 L0 1 L0 9 Z" fill="'+dim+'"/></marker></defs>'+g.join('')+'</svg>'}; }
    };
  }
  function gear(o,opt) {
    if (!has(o,['m','Z','De','Dp']) || o.Z.n % 1 || o.Z.n < 6 || o.Z.n > 400 || o.De.n <= o.Dp.n || Math.abs(o.m.n * o.Z.n - o.Dp.n) > .05) return null;
    var p = pen(opt), cx = 125, cy = 132, ra = 65, scale = ra / (o.De.n / 2), rp = o.Dp.n * scale / 2, rb = rp * Math.cos(20 * PI / 180), rf = Math.max(rp - 1.25 * o.m.n * scale, rp * .55), z = o.Z.n, d = '', i, j;
    function inv(rad) { var t = Math.sqrt(Math.max(0,rad * rad / (rb * rb) - 1)); return t - Math.atan(t); }
    function point(rad,angle) { return r(cx + rad * Math.cos(angle))+','+r(cy + rad * Math.sin(angle)); }
    var half = PI / (2 * z), ip = inv(rp), low = Math.max(rb,rf);
    for (i = 0; i < z; i++) {
      var a = 2 * PI * i / z - PI / 2, left = a - half + inv(low) - ip;
      d += (i ? ' L' : 'M') + point(rf,left);
      for (j = 0; j <= 6; j++) { var rr = low + (ra-low)*j/6; d += ' L'+point(rr,a-half+inv(rr)-ip); }
      d += ' L'+point(ra,a);
      for (j = 6; j >= 0; j--) { var rr2 = low + (ra-low)*j/6; d += ' L'+point(rr2,a+half-inv(rr2)+ip); }
      d += ' L'+point(rf,a+half-inv(low)+ip);
    }
    p.text(125,17,'ÖN GÖRÜNÜŞ',10); p.text(342,17,'KESİT A-A',10);
    p.path(d+' Z'); p.circle(cx,cy,rp,true);
    var hub = 33, bore = 13, verified = has(o,['D','d']) && /gobek/.test(norm(o.D.l)) && /delik|ic cap/.test(norm(o.d.l)) && o.D.n > o.d.n && o.D.n < o.Dp.n;
    if (verified) { hub = o.D.n * scale / 2; bore = o.d.n * scale / 2; }
    p.circle(cx,cy,hub); p.circle(cx,cy,bore);
    p.axis(48,cy,202,cy); p.axis(cx,58,cx,207);
    p.path('M280 '+(cy-ra)+' H310 V'+(cy-hub)+' H392 V'+(cy-bore)+' H280 Z M280 '+(cy+bore)+' H392 V'+(cy+hub)+' H310 V'+(cy+ra)+' H280 Z',true);
    p.line(280,cy-rf,310,cy-rf); p.line(280,cy+rf,310,cy+rf); p.axis(265,cy,420,cy);
    p.dim('De',o.De,30,cy-ra,30,cy+ra,39,53,'De Ø'+f(o.De.n),[[cx,cy-ra],[cx,cy+ra]]);
    p.dim('Dp',o.Dp,220,cy-rp,220,cy+rp,212,227,'Dp Ø'+f(o.Dp.n),[[cx,cy-rp],[cx,cy+rp]]);
    p.meta('Z',o.Z,95,41,'z = '+f(o.Z.n));
    p.meta('m',o.m,154,41,'· m = '+f(o.m.n));
    if (verified) {
      p.dim('D',o.D,430,cy-hub,430,cy+hub,407,217,'D Ø'+f(o.D.n),[[392,cy-hub],[392,cy+hub]]);
      p.dim('d',o.d,cx-bore,cy,cx+bore,cy,cx,cy-7,'Ø'+f(o.d.n));
    }
    return p.result();
  }
  function rack(o,opt) {
    if (!has(o,['p','L','hs','he','hp']) || o.hp.n >= o.he.n) return null;
    var p = pen(opt), d = 'M30 178 L30 110', i, x, w = Math.min(82,82*o.hs.n/o.he.n), h = Math.min(82,82*o.he.n/o.hs.n), left = 373-w/2, top = 178-h, pitch = 178-h*o.hp.n/o.he.n;
    p.text(145,17,'YAN GÖRÜNÜŞ',10); p.text(373,17,'KESİT A-A',10);
    for (i=0;i<7;i++) { x=30+i*32; d+=' L'+(x+7)+' 88 L'+(x+18)+' 88 L'+(x+25)+' 110 L'+(x+32)+' 110'; }
    p.path(d+' L254 178 Z'); p.axis(24,99,263,99);
    p.add('<path d="M137 83 L132 108 L144 131 L132 156 L139 184 M146 83 L141 108 L153 131 L141 156 L148 184" fill="none" stroke="white" stroke-width="5"/>');
    p.path('M137 83 L132 108 L144 131 L132 156 L139 184 M146 83 L141 108 L153 131 L141 156 L148 184');
    p.path('M'+left+' '+top+' H'+(left+w)+' V178 H'+left+' Z',true); p.axis(left-10,pitch,left+w+10,pitch);
    p.dim('p',o.p,37,63,69,63,53,51,'p '+f(o.p.n),[[37,88],[69,88]]);
    p.dim('L',o.L,30,214,254,214,142,238,'L '+f(o.L.n),[[30,178],[254,178]]);
    p.dim('hs',o.hs,left,208,left+w,208,373,231,'hs '+f(o.hs.n),[[left,178],[left+w,178]]);
    p.dim('he',o.he,305,top,305,178,301,top-13,'he '+f(o.he.n),[[left,top],[left,178]]);
    p.dim('hp',o.hp,441,pitch,441,178,425,253,'hp '+f(o.hp.n),[[left+w,pitch],[left+w,178]]);
    return p.result();
  }
  (window.YDRAW = window.YDRAW || {}).pinyon_kremayer = {
    match:function(ctx) { return !!kind(ctx); },
    draw:function(ctx,opt) { var k = kind(ctx), o = dims(ctx); return k === 'pinyon' ? gear(o,opt) : k === 'kremayer' ? rack(o,opt) : null; }
  };
}());
