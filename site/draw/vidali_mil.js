(function () {
  var C = '#16203a', H = '#9aa6bd', PI = Math.PI;
  function norm(s) { return String(s || '').replace(/İ/g,'i').replace(/I/g,'i').toLowerCase().replace(/ı/g,'i').replace(/ş/g,'s').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ö/g,'o').replace(/ü/g,'u'); }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function r(n) { return Math.round(n * 100) / 100; }
  function f(n) { return String(Math.round(n * 1000) / 1000).replace('.',','); }
  function kind(ctx) {
    var t = norm(ctx.title);
    if (/\bsfu\s*\d/.test(t)) return 'SFU';
    if (/\bdsg\s*\d/.test(t)) return 'DSG';
    if (/\bsac\s*\d|alt destekli mil/.test(t)) return 'SAC';
    if (/\btbr\s*\d/.test(t)) return 'TBR';
    if (/bilyali vidali mil/.test(t) && !/somun|yatak|kaplin/.test(t)) return 'VM';
    return null;
  }
  function dims(ctx) {
    var o = {};
    (ctx.specs || []).concat(ctx.onyazi || []).forEach(function(s) {
      var m = String(s.l).match(/\(([A-Za-z][A-Za-z0-9]*)\)\s*$/), n;
      if (!m || o[m[1]]) return;
      if (!/^\s*(?:M\s*)?\d+(?:[.,]\d+)?\s*(?:mm)?\s*$/.test(s.v)) return;
      n = ctx.num ? ctx.num(s.v) : parseFloat(String(s.v).replace(/^M\s*/i,'').replace(',','.'));
      if (isFinite(n) && n > 0) o[m[1]] = {n:n,l:s.l,v:s.v};
    });
    return o;
  }
  function has(o,ks) { return ks.every(function(k) { return o[k] && o[k].n > 0; }); }
  function pen(opt) {
    var id = esc((opt && opt.id) || 'vm'), dim = (opt && opt.dim) || '#0a2350', g = [], keys = [];
    function ln(x1,y1,x2,y2,a) { return '<line x1="'+r(x1)+'" y1="'+r(y1)+'" x2="'+r(x2)+'" y2="'+r(y2)+'" '+a+'/>'; }
    function txt(x,y,s,size) { return '<text x="'+r(x)+'" y="'+r(y)+'" fill="'+dim+'" font-size="'+(size || 12)+'" font-weight="700" text-anchor="middle">'+esc(s)+'</text>'; }
    function group(k,s,body) { if (!keys.some(function(x) { return x.k === k; })) keys.push({k:k,l:s.l,v:s.v}); g.push('<g class="hl" data-k="'+k+'">'+body+'</g>'); }
    return {
      add:function(s) { g.push(s); },
      text:function(x,y,s,size) { g.push(txt(x,y,s,size)); },
      rect:function(x,y,w,h,hatch) { g.push('<rect x="'+r(x)+'" y="'+r(y)+'" width="'+r(w)+'" height="'+r(h)+'" fill="'+(hatch ? 'url(#'+id+'-h)' : 'white')+'" stroke="'+C+'" stroke-width="1.4"/>'); },
      path:function(d,hatch) { g.push('<path d="'+d+'" fill="'+(hatch ? 'url(#'+id+'-h)' : 'none')+'" stroke="'+C+'" stroke-width="1.4" stroke-linejoin="round"/>'); },
      circle:function(x,y,rad,hatch,dash) { g.push('<circle cx="'+r(x)+'" cy="'+r(y)+'" r="'+r(rad)+'" fill="'+(hatch ? 'url(#'+id+'-h)' : 'white')+'" stroke="'+C+'" stroke-width="1.2" '+(dash ? 'fill-opacity="0" stroke-dasharray="10 3 2 3"' : '')+'/>'); },
      axis:function(x1,y1,x2,y2) { g.push(ln(x1,y1,x2,y2,'stroke="'+C+'" stroke-width=".7" stroke-dasharray="10 3 2 3"')); },
      line:function(x1,y1,x2,y2) { g.push(ln(x1,y1,x2,y2,'stroke="'+C+'" stroke-width="1.3"')); },
      dim:function(k,s,x1,y1,x2,y2,tx,ty,label) { group(k,s,ln(x1,y1,x2,y2,'stroke="'+dim+'" stroke-width="1" marker-start="url(#'+id+'-a)" marker-end="url(#'+id+'-a)"')+txt(tx,ty,label || k+' '+f(s.n))); },
      lead:function(k,s,x,y,tx,ty,label) { group(k,s,ln(x,y,tx,ty-12,'stroke="'+dim+'" stroke-width="1" marker-start="url(#'+id+'-a)"')+txt(tx,ty,label || k+' '+f(s.n))); },
      result:function() { return {keys:keys,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 460 260" style="display:block;font-family:inherit"><defs><pattern id="'+id+'-h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+H+'" stroke-width="1"/></pattern><marker id="'+id+'-a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M10 5 L0 1 L0 9 Z" fill="'+dim+'"/></marker></defs>'+g.join('')+'</svg>'}; }
    };
  }
  function shaft(o,opt) {
    if (!has(o,['d','Ph','L'])) return null;
    var p = pen(opt), i;
    p.text(145,17,'ÖN GÖRÜNÜŞ',10); p.text(367,17,'KESİT A-A',10);
    p.rect(46,100,210,46,false);
    for (i=50;i<245;i+=16) p.path('M'+i+' 100 Q'+(i+6)+' 124 '+(i+15)+' 146');
    p.add('<path d="M140 94 L134 110 L146 134 L140 153 M149 94 L143 110 L155 134 L149 153" stroke="white" stroke-width="7" fill="none"/>');
    p.path('M140 94 L134 110 L146 134 L140 153 M149 94 L143 110 L155 134 L149 153');
    p.circle(367,123,38,true); p.axis(37,123,267,123); p.axis(319,123,415,123); p.axis(367,75,367,171);
    p.dim('d',o.d,30,100,30,146,35,84,'Ød '+f(o.d.n));
    p.dim('Ph',o.Ph,66,67,82,67,74,51,'Ph '+f(o.Ph.n));
    p.dim('L',o.L,46,195,256,195,151,217,'L '+f(o.L.n));
    p.text(151,244,'Boy kırık gösterilmiştir',10);
    return p.result();
  }
  function nut(o,opt) {
    if (!has(o,['d','Ph','D','A','B','W','X']) || o.d.n >= o.D.n || o.D.n >= o.A.n || o.W.n >= o.A.n || o.X.n >= o.A.n-o.D.n) return null;
    var p = pen(opt), cx=119,cy=122,sc=66/o.A.n, rr=o.A.n*sc, body=o.D.n*sc, bore=o.d.n*sc, pitch=o.W.n*sc, hole=o.X.n*sc, i;
    p.text(119,17,'ÖN GÖRÜNÜŞ',10); p.text(345,17,'KESİT A-A',10);
    p.circle(cx,cy,rr,false); p.circle(cx,cy,body,false); p.circle(cx,cy,bore,false);
    p.circle(cx,cy,pitch,false,true);
    var angles = o.d.n <= 32 ? [45,90,135,225,270,315] : [30,60,120,150,210,240,300,330];
    for (i=0;i<angles.length;i++) { var a=angles[i]*PI/180; p.circle(cx+pitch*Math.cos(a),cy+pitch*Math.sin(a),hole,false); }
    p.axis(39,cy,202,cy); p.axis(cx,42,cx,202);
    p.path('M278 65 H295 V88 H406 V108 H278 Z M278 136 H406 V156 H295 V179 H278 Z',true);
    for (i=301;i<395;i+=15) { p.line(i,108,i+10,100); p.line(i,136,i+10,144); }
    p.axis(266,122,423,122);
    p.path('M374 82 L368 105 M382 82 L376 105 M374 139 L368 162 M382 139 L376 162');
    p.dim('A',o.A,26,56,26,188,36,43,'A '+f(o.A.n));
    p.dim('W',o.W,cx-pitch,215,cx+pitch,215,119,237,'W '+f(o.W.n));
    p.lead('X',o.X,cx+pitch*.707,cy-pitch*.707,207,51,'X '+f(o.X.n));
    p.lead('d',o.d,119,123,206,193,'Ød '+f(o.d.n));
    p.dim('B',o.B,278,46,295,46,288,32,'B '+f(o.B.n));
    p.lead('D',o.D,403,87,411,57,'D '+f(o.D.n));
    p.lead('Ph',o.Ph,321,108,321,211,'Ph '+f(o.Ph.n));
    if (o.Q) p.lead('Q',o.Q,341,88,405,236,'Q '+o.Q.v);
    p.text(346,256,'L bilinmiyor: kesit boyu şematik',10);
    return p.result();
  }
  function housing(o,opt) {
    if (!has(o,['D','B','H','h','L']) || o.D.n >= o.H.n || o.D.n >= o.B.n || o.h.n <= o.D.n/2 || o.h.n+o.D.n/2 >= o.H.n) return null;
    var p=pen(opt), sc=Math.min(135/o.B.n,100/o.H.n), w=o.B.n*sc,h=o.H.n*sc,x=125-w/2,y=178-h,axis=178-o.h.n*sc,rad=o.D.n*sc/2;
    p.text(125,17,'ÖN GÖRÜNÜŞ',10); p.text(345,17,'KESİT A-A',10);
    p.rect(x,y,w,h,false); p.circle(125,axis,rad,false); p.axis(x-9,axis,x+w+9,axis); p.axis(125,y-12,125,188);
    p.rect(288,y,110,h,true); p.rect(288,axis-rad,110,rad*2,false); p.axis(275,axis,412,axis);
    p.dim('B',o.B,x,211,x+w,211,125,234,'B '+f(o.B.n));
    p.dim('H',o.H,30,y,30,178,35,y-13,'H '+f(o.H.n));
    p.lead('D',o.D,125,axis-rad,204,57,'D '+f(o.D.n));
    p.dim('h',o.h,235,axis,235,178,237,202,'h '+f(o.h.n));
    p.dim('L',o.L,288,211,398,211,343,234,'L '+f(o.L.n));
    return p.result();
  }
  function support(o,opt) {
    if (!has(o,['d','B','H','h','L']) || o.h.n >= o.H.n) return null;
    var p=pen(opt);
    p.text(125,17,'ÖN GÖRÜNÜŞ',10); p.text(345,17,'KESİT A-A',10);
    p.path('M58 178 H192 V163 H155 L143 118 H107 L95 163 H58 Z'); p.circle(125,93,30,false); p.axis(125,49,125,190); p.axis(80,93,171,93);
    p.path('M285 178 H405 V161 H372 V108 H318 V161 H285 Z',true); p.circle(345,83,30,true);
    p.dim('B',o.B,58,210,192,210,125,232,'B '+f(o.B.n));
    p.dim('H',o.H,30,63,30,178,34,46,'H '+f(o.H.n));
    p.lead('d',o.d,125,63,220,57,'Ød '+f(o.d.n));
    p.dim('h',o.h,240,93,240,178,237,202,'h '+f(o.h.n));
    p.text(345,241,'Destek kesiti',10);
    return p.result();
  }
  function bearing(o,opt) {
    if (!has(o,['d','W','L'])) return null;
    var p=pen(opt);
    p.text(125,17,'ÖN GÖRÜNÜŞ',10); p.text(345,17,'KESİT A-A',10);
    var rad=146*o.d.n/o.W.n/2, dx=rad*.52, bottom=123+rad*.854;
    p.path('M52 75 H198 V178 H151 L'+r(125+dx)+' '+r(bottom)+' A'+r(rad)+' '+r(rad)+' 0 1 0 '+r(125-dx)+' '+r(bottom)+' L99 178 H52 Z');
    p.path('M279 76 H411 V177 H383 V150 H307 V177 H279 Z',true);
    p.rect(279,109,132,27,false); p.line(282,103,408,103); p.line(282,142,408,142); p.axis(40,123,210,123); p.axis(267,123,424,123);
    p.dim('W',o.W,52,212,198,212,125,235,'W '+f(o.W.n));
    p.lead('d',o.d,124,91,207,52,'Ød '+f(o.d.n));
    p.dim('L',o.L,279,212,411,212,345,235,'L '+f(o.L.n));
    if (o.S1) p.lead('S1',o.S1,71,76,72,52,'S1 '+o.S1.v);
    return p.result();
  }
  var api={match:function(ctx) { return !!kind(ctx); },draw:function(ctx,opt) { var k=kind(ctx),o=dims(ctx); return k==='VM' ? shaft(o,opt) : k==='SFU' ? nut(o,opt) : k==='DSG' ? housing(o,opt) : k==='SAC' ? support(o,opt) : k==='TBR' ? bearing(o,opt) : null; }};
  var y=window.YDRAW=window.YDRAW||{};
  y.vidali_mil=api;
  y['0_vidali_mil']=api;
}());
