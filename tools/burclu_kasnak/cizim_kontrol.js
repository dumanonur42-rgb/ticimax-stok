const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const assert = require('assert');
const {execFileSync} = require('child_process');
const repo = process.env.BURCLU_REPO || path.resolve(__dirname, '../..');
const work = process.env.BURCLU_WORK || path.join(os.homedir(), 'work');
const contexts = JSON.parse(fs.readFileSync(path.join(work, 'icerik_ctx.json'), 'utf8'));
const products = fs.readFileSync(path.join(repo, 'urunler.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const code = execFileSync('git', ['show', 'draw/burclu_kasnak:site/draw/burclu_kasnak.js'], {cwd: repo, encoding: 'utf8'});
const sandbox = {window: {}};
vm.runInNewContext(code, sandbox);
const drawing = sandbox.window.YDRAW.burclu_kasnak;
const results = contexts.map(ctx => {
  const out = drawing.draw(ctx, {id: ctx.kod});
  const product = products.find(p => p.kod === ctx.kod);
  assert(product && drawing.match(ctx), ctx.kod);
  assert.strictEqual(product.bayraklar.includes('cizim_yok'), out === null, ctx.kod);
  if (out) {
    assert(out.svg.includes('<svg') && !/NaN|Infinity|undefined/.test(out.svg), ctx.kod);
    for (const key of out.keys.filter(k => k.k === 'K' || k.k === 'M' || k.k === 'L')) {
      const spec = ctx.specs.find(s => s.l.endsWith('(' + key.k + ')'));
      assert.strictEqual(key.v, spec.v, ctx.kod + ' ' + key.k);
    }
  }
  return {kod: ctx.kod, tip: ctx.tip, result: out ? 'SVG' : 'null', error: null};
});
const svg = results.filter(r => r.result === 'SVG');
const missing = results.filter(r => r.result === 'null');
assert.strictEqual(results.length, 519);
assert.strictEqual(svg.length, 507);
assert.strictEqual(missing.length, 12);
for (const code of ['ORK BK SPC4256', 'ORK BK SPC5306']) {
  assert.strictEqual(results.find(r => r.kod === code).result, 'SVG');
  console.log('SVG:', code, 'kaynak K/L/M yazıları korundu');
}
for (const row of missing) console.log('NULL:', row.kod);
fs.writeFileSync(path.join(work, 'icerik_cizim_sonuclari.json'), JSON.stringify(results, null, 2) + '\n');
console.log('PASS: 519 ctx; 507 SVG; 12 null; 0 error; cizim_yok bayrakları eşleşiyor; K/L/M kaynaktan');
