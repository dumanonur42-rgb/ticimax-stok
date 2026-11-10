const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'veri/lineer-ctx.json'), 'utf8'));
const contexts = Array.isArray(data) ? data : [data];
const sandbox = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'lineer.js'), 'utf8'), sandbox);
const moduleDraw = sandbox.window.YDRAW.lineer;
const results = [];
for (const ctx of contexts) {
  ctx.num = function(v) { const m = String(v).replace(',', '.').match(/[\d.]+/); return m ? Number(m[0]) : NaN; };
  const id = ctx.kod ? ctx.kod.replace(/[^A-Za-z0-9]/g, '_') : 'ORK_LA_HGH20HA';
  const match = moduleDraw.match(ctx);
  const out = match ? moduleDraw.draw(ctx, {id, dim: '#0a2350'}) : null;
  const isRail = ctx.crumbs.some(x => x.includes('RAYLAR'));
  const expected = isRail ? ['WR', 'HR', 'P'] : ['W', 'H', 'H1', 'N', 'B', 'C', 'L1', 'L', 'M'];
  if (!out) throw Error(id + ': match/draw null');
  for (const key of expected) if (!out.keys.some(x => x.k === key)) throw Error(id + ': eksik çizim anahtarı: ' + key);
  fs.writeFileSync(path.join(root, 'onizleme/' + id + '.svg'), out.svg);
  const missingKey = isRail ? 'P' : 'H1';
  const missing = {...ctx, specs: ctx.specs.filter(x => x.l !== missingKey), onyazi: ctx.onyazi.filter(x => x.l !== missingKey)};
  if (moduleDraw.draw(missing) !== null) throw Error(id + ': eksik veri null dönmedi');
  const keys = Array.from(out.keys, x => x.k);
  results.push({kod: ctx.kod || id, match, sonuc: 'null değil', keys, svg: 'onizleme/' + id + '.svg', eksik_veri: 'null'});
  console.log((ctx.kod || id) + ': match=' + match + '; draw() null değil; keys: ' + keys.join(', '));
}
fs.writeFileSync(path.join(root, 'veri/draw-keys.json'), JSON.stringify(results, null, 2) + '\n');
console.log('Çizim: ' + results.length + ' başarılı; eksik veri kontrolleri: null');
