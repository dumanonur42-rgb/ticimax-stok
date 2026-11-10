var fs=require('fs'), path=require('path'), vm=require('vm'), assert=require('assert');
var root=__dirname, sandbox={window:{}}, totals={};
fs.readdirSync(root).filter(function(f) { return /\.js$/.test(f) && f.charAt(0)!=='_'; }).sort().forEach(function(f) { vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),sandbox,{filename:f}); });
['pinyon_kremayer','vidali_mil'].forEach(function(name) {
  var source=fs.readFileSync(path.join(root,name+'.js'),'utf8');
  assert(!/\b(?:let|const)\b|=>|`/.test(source),'ES5: '+name);
  var fixtures=JSON.parse(fs.readFileSync(path.join(root,'fixtures',name+'.json'),'utf8')), api=sandbox.window.YDRAW[name], results=[], positive=0, empty=0, negative=0;
  fixtures.forEach(function(f,i) {
    var ctx=f.ctx, id=name+'-'+i, out;
    ctx.num=function(v) { var m=String(v).replace(',','.').match(/[\d.]+/); return m ? Number(m[0]) : NaN; };
    assert.strictEqual(api.match(ctx),f.expect.match,f.kod+': match');
    out=api.draw(ctx,{id:id,dim:'#0a2350'});
    assert.strictEqual(!!out,f.expect.draw,f.kod+': draw');
    if(f.negative) negative++;
    else if(out) positive++;
    else empty++;
    var selected=null;
    if(!f.negative) {
      selected=Object.keys(sandbox.window.YDRAW).sort().find(function(k) { return sandbox.window.YDRAW[k].match(ctx); });
      assert.strictEqual(sandbox.window.YDRAW[selected],api,f.kod+': unreachable through loader ('+selected+')');
    }
    if(out) {
      assert(/viewBox="0 0 460 260"/.test(out.svg));
      assert(!/NaN|undefined|Infinity/.test(out.svg));
      assert(!/şematik|bilinmiyor|verilmemiş|gösterilmiştir|Destek kesiti/.test(out.svg),'SVG açıklama notu içermemeli');
      assert(out.svg.indexOf('refX="10"')>=0,'Ok ucu ölçü sınırında olmalı');
      Array.from(out.svg.matchAll(/font-size="([\d.]+)"/g)).forEach(function(x) { assert(Number(x[1])>=12 && Number(x[1])<=13); });
      var dimensionGroups={};
      Array.from(out.svg.matchAll(/<g class="hl" data-k="([^"]+)">([\s\S]*?)<\/g>/g)).forEach(function(x) { dimensionGroups[x[1]]=x[2]; });
      function endpoints(k) {
        var line=dimensionGroups[k].match(/<line\b[^>]*marker-end[^>]*>/)[0], coords={};
        Array.from(line.matchAll(/\b(x1|x2|y1|y2)="([\d.-]+)"/g)).forEach(function(a) { coords[a[1]]=Number(a[2]); });
        return coords;
      }
      function close(a,b) { assert(Math.abs(a-b)<.02,f.kod+': ölçü sınırı '+a+' != '+b); }
      function number(k) { return out.keys.find(function(x) { return x.k===k; }).v.match(/[\d,]+/)[0].replace(',','.')*1; }
      if(dimensionGroups.De) {
        close(endpoints('De').y1,67); close(endpoints('De').y2,197);
        close(endpoints('Dp').y1,132-65*number('Dp')/number('De'));
        close(endpoints('Dp').y2,132+65*number('Dp')/number('De'));
        assert(!/<line|marker/.test(dimensionGroups.Z+dimensionGroups.m));
      }
      if(dimensionGroups.A && dimensionGroups.Ph) {
        close(endpoints('A').y1,72); close(endpoints('A').y2,192);
        close(endpoints('W').x1,119-60*number('W')/number('A'));
        close(endpoints('W').x2,119+60*number('W')/number('A'));
        close(endpoints('B').x2-endpoints('B').x1,120*number('B')/number('A'));
        close(endpoints('D').y1,132-60*number('D')/number('A'));
        close(endpoints('D').y2,132+60*number('D')/number('A'));
      }
      var ids=Array.from(out.svg.matchAll(/\bid="([^"]+)"/g)).map(function(x) { return x[1]; });
      assert(ids.every(function(x) { return x.indexOf(id)===0; }));
      var groups=Array.from(out.svg.matchAll(/data-k="([^"]+)"/g)).map(function(x) { return x[1]; });
      out.keys.forEach(function(k) {
        assert(groups.indexOf(k.k)>=0,f.kod+': missing data-k '+k.k);
        assert(ctx.specs.concat(ctx.onyazi).some(function(s) { return s.l===k.l && s.v===k.v; }),f.kod+': unsourced key '+k.k);
      });
      assert(groups.every(function(k) { return out.keys.some(function(s) { return s.k===k; }); }));
      if(name==='pinyon_kremayer' && /ORK PD /.test(f.kod)) assert(!out.keys.some(function(k) { return k.k==='d' || k.k==='D'; }),'Belirsiz d/D anlamı uydurulmamalı');
      var red=api.draw(ctx,{id:id+'-red',dim:'#d0101e'});
      assert(red.svg.indexOf('#d0101e')>=0);
      assert(red.svg.indexOf('id="'+id+'-red-h"')>=0);
    }
    results.push({kod:f.kod,negative:!!f.negative,selected:selected,reason:f.expect.reason||'',keys:out ? out.keys : [],svg:out ? out.svg : null});
  });
  fs.writeFileSync(path.join(root,'preview',name+'-results.json'),JSON.stringify(results,null,2)+'\n');
  totals[name]={positive:positive,null:empty,negative:negative};
  console.log(name+': '+positive+' başarılı; '+empty+' null; '+negative+' negatif başarılı');
});
var loader=fs.readFileSync(path.join(root,'..','yg.js'),'utf8');
assert(loader.indexOf('Object.keys(drawModules).sort().some(')>=0);
assert(loader.indexOf('if(moduleMatched){hasDraw=false;')>=0);
assert.strictEqual(sandbox.window.YDRAW['0_vidali_mil'],sandbox.window.YDRAW.vidali_mil);
assert.strictEqual(sandbox.window.YDRAW.lineer.match({title:'SFU1605 Bilyalı Vidalı Mil Somunu',crumbs:['LİNEER'],specs:[],onyazi:[]}),true);
console.log('Loader: ilk match; null fallback yok; 0_vidali_mil öncelik kaydı doğrulandı');
if(process.argv[2]) {
  var contexts=JSON.parse(fs.readFileSync(process.argv[2],'utf8')), own=0;
  contexts.forEach(function(ctx) {
    var matches=sandbox.window.YDRAW.vidali_mil.match(ctx)||sandbox.window.YDRAW.pinyon_kremayer.match(ctx);
    if(matches) own++;
    else assert(!sandbox.window.YDRAW['0_vidali_mil'].match(ctx));
  });
  assert.strictEqual(own,78);
  console.log('Kapsam: 208 bağlamda yalnız 78 hedef ürün yeni modüllere ait');
}
fs.writeFileSync(path.join(root,'preview','lineer_diger-summary.json'),JSON.stringify(totals,null,2)+'\n');
