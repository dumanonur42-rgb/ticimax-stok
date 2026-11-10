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
      text:function(x,y,s,size) { g.push(txt(x,y,s,Math.max(12,size || 12))); },
      rect:function(x,y,w,h,hatch) { g.push('<rect x="'+r(x)+'" y="'+r(y)+'" width="'+r(w)+'" height="'+r(h)+'" fill="'+(hatch ? 'url(#'+id+'-h)' : 'white')+'" stroke="'+C+'" stroke-width="1.4"/>'); },
      path:function(d,hatch) { g.push('<path d="'+d+'" fill="'+(hatch ? 'url(#'+id+'-h)' : 'none')+'" stroke="'+C+'" stroke-width="1.4" stroke-linejoin="round"/>'); },
      circle:function(x,y,rad,hatch,dash) { g.push('<circle cx="'+r(x)+'" cy="'+r(y)+'" r="'+r(rad)+'" fill="'+(hatch ? 'url(#'+id+'-h)' : 'white')+'" stroke="'+C+'" stroke-width="1.2" '+(dash ? 'fill-opacity="0" stroke-dasharray="10 3 2 3"' : '')+'/>'); },
      axis:function(x1,y1,x2,y2) { g.push(ln(x1,y1,x2,y2,'stroke="'+C+'" stroke-width=".7" stroke-dasharray="10 3 2 3"')); },
      line:function(x1,y1,x2,y2) { g.push(ln(x1,y1,x2,y2,'stroke="'+C+'" stroke-width="1.3"')); },
      dim:function(k,s,x1,y1,x2,y2,tx,ty,label,refs) {
        var ext='';
        if(refs) refs.forEach(function(q,i) { var x=i ? x2 : x1,y=i ? y2 : y1; ext+=ln(q[0],q[1],x+(x===q[0] ? 0 : (x>q[0] ? 3 : -3)),y+(y===q[1] ? 0 : (y>q[1] ? 3 : -3)),'stroke="'+dim+'" stroke-width=".65"'); });
        group(k,s,ext+ln(x1,y1,x2,y2,'stroke="'+dim+'" stroke-width="1" marker-start="url(#'+id+'-a)" marker-end="url(#'+id+'-a)"')+txt(tx,ty,label || k+' '+f(s.n),12.5));
      },
      lead:function(k,s,x,y,tx,ty,label) { group(k,s,ln(x,y,tx,ty-12,'stroke="'+dim+'" stroke-width="1" marker-start="url(#'+id+'-a)"')+txt(tx,ty,label || k+' '+f(s.n),12.5)); },
      hidden:function(d) { g.push('<path d="'+d+'" fill="none" stroke="'+C+'" stroke-width=".9" stroke-dasharray="4 2"/>'); },
      result:function() { return {keys:keys,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 460 260" style="display:block;font-family:inherit"><defs><pattern id="'+id+'-h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="'+H+'" stroke-width="1"/></pattern><marker id="'+id+'-a" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M10 5 L0 1 L0 9 Z" fill="'+dim+'"/></marker></defs>'+g.join('')+'</svg>'}; }
    };
  }
  function shaft(o,opt) {
    if (!has(o,['d','Ph','L'])) return null;
    var p = pen(opt), i, profile='M46 100';
    p.text(145,17,'ÖN GÖRÜNÜŞ',10); p.text(367,17,'KESİT A-A',10);
    for(i=46;i<244;i+=18) profile+=' L'+(i+4)+' 100 Q'+(i+9)+' 110 '+(i+14)+' 100 L'+(i+18)+' 100';
    profile+=' V146';
    for(i=244;i>46;i-=18) profile+=' L'+(i-4)+' 146 Q'+(i-9)+' 136 '+(i-14)+' 146 L'+(i-18)+' 146';
    p.path(profile+' Z');
    for (i=55;i<230;i+=18) p.path('M'+i+' 105 Q'+(i+9)+' 123 '+(i+18)+' 141');
    p.add('<path d="M140 94 L134 110 L146 134 L140 153 M149 94 L143 110 L155 134 L149 153" stroke="white" stroke-width="7" fill="none"/>');
    p.path('M140 94 L134 110 L146 134 L140 153 M149 94 L143 110 L155 134 L149 153');
    p.circle(367,123,38,true); p.axis(37,123,267,123); p.axis(319,123,415,123); p.axis(367,75,367,171);
    p.dim('d',o.d,25,100,25,146,35,84,'d Ø'+f(o.d.n),[[46,100],[46,146]]);
    p.dim('Ph',o.Ph,46,64,64,64,64,48,'Ph '+f(o.Ph.n),[[46,100],[64,100]]);
    p.dim('L',o.L,46,195,244,195,145,217,'L '+f(o.L.n),[[46,146],[244,146]]);
    return p.result();
  }
  function nut(o,opt) {
    if (!has(o,['d','Ph','D','A','B','W','X']) || o.d.n >= o.D.n || o.D.n >= o.A.n || o.W.n >= o.A.n || o.X.n >= o.A.n-o.D.n) return null;
    var p = pen(opt), cx=119,cy=132,sc=60/o.A.n, rr=o.A.n*sc, body=o.D.n*sc, bore=o.d.n*sc, pitch=o.W.n*sc, hole=o.X.n*sc, flange=276, shoulder=flange+2*sc*o.B.n, end=402, i;
    p.text(119,17,'ÖN GÖRÜNÜŞ',10); p.text(345,17,'KESİT A-A',10);
    p.circle(cx,cy,rr,false); p.circle(cx,cy,body,false); p.circle(cx,cy,bore,false);
    p.circle(cx,cy,pitch,false,true);
    var angles = o.d.n <= 32 ? [45,90,135,225,270,315] : [30,60,120,150,210,240,300,330];
    for (i=0;i<angles.length;i++) { var a=angles[i]*PI/180; p.circle(cx+pitch*Math.cos(a),cy+pitch*Math.sin(a),hole,false); }
    p.axis(48,cy,190,cy); p.axis(cx,62,cx,202);
    p.path('M'+flange+' '+(cy-rr)+' H'+shoulder+' V'+(cy-body)+' H'+end+' V'+(cy-bore)+' H'+flange+' Z M'+flange+' '+(cy+bore)+' H'+end+' V'+(cy+body)+' H'+shoulder+' V'+(cy+rr)+' H'+flange+' Z',true);
    for (i=304;i<391;i+=16) {
      p.hidden('M'+i+' '+(cy-bore)+' Q'+(i+8)+' '+(cy-bore-8)+' '+(i+16)+' '+(cy-bore));
      p.hidden('M'+i+' '+(cy+bore)+' Q'+(i+8)+' '+(cy+bore+8)+' '+(i+16)+' '+(cy+bore));
    }
    p.rect(367,cy-body,4,body-bore,false);
    p.line(367,cy-body+4,371,cy-body+1); p.line(367,cy-body+9,371,cy-body+6);
    p.axis(265,cy,417,cy);
    p.hidden('M382 '+(cy-body-3)+' l-4 12 M389 '+(cy-body-3)+' l-4 12 M382 '+(cy+body-9)+' l-4 12 M389 '+(cy+body-9)+' l-4 12');
    p.dim('A',o.A,22,cy-rr,22,cy+rr,37,52,'A Ø'+f(o.A.n),[[cx,cy-rr],[cx,cy+rr]]);
    p.dim('W',o.W,cx-pitch,216,cx+pitch,216,119,240,'W Ø'+f(o.W.n),[[cx-pitch,cy],[cx+pitch,cy]]);
    p.lead('X',o.X,cx+(pitch+hole)*.707,cy-(pitch+hole)*.707,208,54,'X Ø'+f(o.X.n));
    p.dim('d',o.d,cx-bore,cy,cx+bore,cy,cx,cy-7,'Ø'+f(o.d.n));
    p.dim('B',o.B,flange,47,shoulder,47,(flange+shoulder)/2,33,'B '+f(o.B.n),[[flange,cy-rr],[shoulder,cy-rr]]);
    p.dim('D',o.D,430,cy-body,430,cy+body,421,219,'D Ø'+f(o.D.n),[[end,cy-body],[end,cy+body]]);
    p.dim('Ph',o.Ph,312,218,328,218,320,241,'Ph '+f(o.Ph.n),[[312,cy+bore+4],[328,cy+bore+4]]);
    if (o.Q) p.lead('Q',o.Q,369,cy-body,401,66,'Q '+o.Q.v);
    return p.result();
  }
  function housing(o,opt) {
    if (!has(o,['D','B','H','h','L']) || o.D.n >= o.H.n || o.D.n >= o.B.n || o.h.n <= o.D.n/2 || o.h.n+o.D.n/2 >= o.H.n) return null;
    var p=pen(opt), sc=Math.min(135/o.B.n,100/o.H.n), w=o.B.n*sc,h=o.H.n*sc,x=125-w/2,y=178-h,axis=178-o.h.n*sc,rad=o.D.n*sc/2,len=o.L.n*sc,sx=345-len/2,ex=345+len/2;
    p.text(125,17,'ÖN GÖRÜNÜŞ',10); p.text(345,17,'KESİT A-A',10);
    p.rect(x,y,w,h,false); p.circle(125,axis,rad,false); p.axis(x-9,axis,x+w+9,axis); p.axis(125,y-12,125,188);
    p.path('M'+sx+' '+y+' H'+ex+' V'+(axis-rad)+' H'+sx+' Z M'+sx+' '+(axis+rad)+' H'+ex+' V178 H'+sx+' Z',true); p.axis(sx-12,axis,ex+12,axis);
    p.dim('B',o.B,x,211,x+w,211,125,234,'B '+f(o.B.n),[[x,178],[x+w,178]]);
    p.dim('H',o.H,30,y,30,178,35,y-13,'H '+f(o.H.n),[[x,y],[x,178]]);
    p.dim('D',o.D,125-rad,axis,125+rad,axis,125,axis-7,'D Ø'+f(o.D.n));
    p.dim('h',o.h,235,axis,235,178,237,202,'h '+f(o.h.n),[[x+w,axis],[x+w,178]]);
    p.dim('L',o.L,sx,211,ex,211,345,234,'L '+f(o.L.n),[[sx,178],[ex,178]]);
    return p.result();
  }
  function support(o,opt) {
    if (!has(o,['d','B','H','h','L']) || o.h.n >= o.H.n) return null;
    var p=pen(opt),sc=Math.min(130/o.B.n,110/o.H.n),w=o.B.n*sc,left=125-w/2,axis=178-o.h.n*sc,rad=o.d.n*sc/2,top=axis-rad,neck=rad*.65,foot=178-10;
    p.text(125,17,'ÖN GÖRÜNÜŞ',10); p.text(345,17,'KESİT A-A',10);
    function base(cx) { return 'M'+(cx-w/2)+' 178 H'+(cx+w/2)+' V'+foot+' H'+(cx+neck*1.6)+' L'+(cx+neck)+' '+(axis+rad*.7)+' H'+(cx-neck)+' L'+(cx-neck*1.6)+' '+foot+' H'+(cx-w/2)+' Z'; }
    p.path(base(125)); p.circle(125,axis,rad,false); p.axis(125,top-12,125,190); p.axis(left-8,axis,left+w+8,axis);
    p.path(base(345),true); p.circle(345,axis,rad,true); p.axis(345,top-12,345,190); p.axis(345-w/2-8,axis,345+w/2+8,axis);
    p.dim('B',o.B,left,210,left+w,210,125,232,'B '+f(o.B.n),[[left,178],[left+w,178]]);
    p.dim('H',o.H,30,top,30,178,38,top-14,'H '+f(o.H.n),[[125,top],[left,178]]);
    p.dim('d',o.d,125-rad,axis,125+rad,axis,125,axis-7,'Ø'+f(o.d.n));
    p.dim('h',o.h,240,axis,240,178,237,202,'h '+f(o.h.n),[[left+w,axis],[left+w,178]]);
    return p.result();
  }
  function bearing(o,opt) {
    if (!has(o,['d','W','L'])) return null;
    var p=pen(opt),len=146*o.L.n/o.W.n,sx=345-len/2,ex=345+len/2;
    p.text(125,17,'ÖN GÖRÜNÜŞ',10); p.text(345,17,'KESİT A-A',10);
    var rad=146*o.d.n/o.W.n/2, dx=rad*.52, bottom=123+rad*.854;
    p.path('M52 75 H198 V178 H151 L'+r(125+dx)+' '+r(bottom)+' A'+r(rad)+' '+r(rad)+' 0 1 0 '+r(125-dx)+' '+r(bottom)+' L99 178 H52 Z');
    p.path('M'+sx+' 75 H'+ex+' V'+(123-rad-6)+' H'+sx+' Z M'+sx+' '+(123+rad+6)+' H'+ex+' V178 H'+(ex-18)+' V165 H'+(sx+18)+' V178 H'+sx+' Z',true);
    p.line(sx,123-rad,ex,123-rad); p.line(sx,123+rad,ex,123+rad);
    for(var bx=sx+9;bx<ex-4;bx+=15) { p.circle(bx,123-rad-3,3,false); p.circle(bx,123+rad+3,3,false); }
    p.axis(40,123,210,123); p.axis(sx-12,123,ex+12,123);
    p.path('M68 75 V90 H75 V75'); p.hidden('M69 78 L74 81 M69 82 L74 85');
    p.dim('W',o.W,52,212,198,212,125,235,'W '+f(o.W.n),[[52,178],[198,178]]);
    p.dim('d',o.d,125-rad,123,125+rad,123,125,116,'Ø'+f(o.d.n));
    p.dim('L',o.L,sx,212,ex,212,345,235,'L '+f(o.L.n),[[sx,178],[ex,178]]);
    if (o.S1) p.lead('S1',o.S1,71,76,72,52,'S1 '+o.S1.v);
    return p.result();
  }
  var api={match:function(ctx) { return !!kind(ctx); },draw:function(ctx,opt) { var k=kind(ctx),o=dims(ctx); return k==='VM' ? shaft(o,opt) : k==='SFU' ? nut(o,opt) : k==='DSG' ? housing(o,opt) : k==='SAC' ? support(o,opt) : k==='TBR' ? bearing(o,opt) : null; }};
  var y=window.YDRAW=window.YDRAW||{};
  y.vidali_mil=api;
  y['0_vidali_mil']=api;
}());
