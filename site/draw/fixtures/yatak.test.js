'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), cp = require('child_process');
const root = path.resolve(__dirname, '..'), window = {};
fs.readdirSync(root).filter(f => f.endsWith('.js')).forEach(f => vm.runInNewContext(fs.readFileSync(path.join(root, f), 'utf8'), {window}, {filename: f}));
const mod = window.YDRAW.yatak, fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'yatak.json')));
assert(!/\b(?:const|let)\b|=>/.test(fs.readFileSync(path.join(root,'yatak.js'),'utf8')), 'ES5 module');
const clone = c => JSON.parse(JSON.stringify(c));
const compound=clone(fixtures.find(c=>c.expected.draw));compound.specs[0].v='SSUCP SUCP';assert.strictEqual(mod.match(compound),false);
let old = 0, rendered = 0, checks = 0;
const svgs = [];
function check(result, id) {
  if (!result) return;
  assert(!/NaN|undefined|Infinity/.test(result.svg));
  assert(/viewBox="0 0 460 (2[0-5]\d|260)"/.test(result.svg));
  result.keys.forEach(k => {
    const group = result.svg.match(new RegExp('<g class="hl" data-k="' + k.k + '">([\\s\\S]*?)</g>'));
    assert(group && group[1].includes('<text') && group[1].includes('<line'), k.k);
    [...group[1].matchAll(/<text[^>]*>([^<]+)<\/text>/g)].forEach(m=>assert(/^(?:ø)?\d+(?:,\d+)?$/.test(m[1]),'numeric dimension only: '+m[1]));
  });
  [...result.svg.matchAll(/\bid="([^"]+)"/g)].forEach(m => assert(m[1].startsWith(id)));
  svgs.push(result.svg); checks++;
}
fs.readdirSync(__dirname).filter(f => f.endsWith('.json') && f !== 'yatak.json').forEach(f => {
  JSON.parse(fs.readFileSync(path.join(__dirname, f))).forEach(c => {assert.strictEqual(mod.match(c), false, f + ':' + c.path);assert.strictEqual(mod.draw(c,{}),null); old++});
});
const conflicts = {};
['baglanti','bilyali','eksenel','kece','konik','lineer','makarali'].forEach(k => conflicts[k] = []);
fixtures.forEach((c,i) => {
  const before = JSON.stringify(c), id = 'fixture' + i;
  assert.strictEqual(mod.match(c), c.expected.match, c.path + ' match');
  const r = mod.draw(c, {id, dim:'#0a2350'});
  assert.strictEqual(!!r, c.expected.draw, c.path + ' draw');
  assert.strictEqual(JSON.stringify(c), before);
  Object.keys(conflicts).forEach(k => {if(window.YDRAW[k].match(c))conflicts[k].push(c.path)});
  if(!r)return;
  rendered++; check(r,id);
  const series=c.specs[0].v;
  if(['SUC','UC','SSUCFB','SUCFB'].includes(series)){
    assert(r.svg.includes('data-part="inner-race"')&&r.svg.includes('data-part="outer-race"')&&r.svg.includes('data-part="ball"')&&r.svg.includes('data-part="set-screw"'));
    assert((r.svg.match(/fill="url\(#/g)||[]).length>=4,'solid hatched races');
  }
  if(['SSUCFB','SUCFB'].includes(series))assert(r.svg.includes('>'+ 'ø'+c.specs.find(s=>s.l.endsWith('(s)')).v.replace(' mm','')+'</text>'),'flange hole diameter');
  if(['SUC','UC','SN','FRB'].includes(series)){
    assert(new RegExp('data-k="D">[\\s\\S]*?<text[^>]*>ø'+c.specs.find(s=>s.l.endsWith('(D)')).v.replace(' mm','')+'</text>').test(r.svg),'diameter prefix');
  }
  assert(mod.draw(c,{id:'red'+i,dim:'#d0101e'}).svg.includes('#d0101e'));
  r.keys.forEach(k => assert(c.specs.some(s => s.v === k.v), c.path + ' non-spec value ' + k.v));
  const letters = r.keys.map(k => k.k);
  letters.forEach(k => {
    const missing = clone(c); missing.specs = missing.specs.filter(s => !s.l.endsWith('(' + k + ')'));
    assert.strictEqual(mod.draw(missing, {}), null, c.path + ' missing ' + k);
  });
  ['-1 mm','0 mm','NaN','12 cm','10; 12','12 mm trailing'].forEach(value => {
    const bad=clone(c);bad.specs[2].v=value;assert.strictEqual(mod.draw(bad,{}),null);
  });
  const duplicate=clone(c);duplicate.specs.push(clone(duplicate.specs[2]));assert(mod.draw(duplicate,{}));
});
// Renderer contracts only: these are not product dimensions or source fixtures.
const synthetic = {UCPA:{d:25,H:36,H2:70,L:140,J:105,A:38,N:10,B:34.1},SSBF:{d:25,L:95,J:70,A:30,B:34.1},SSBP:{d:25,H:36,H2:70,L:140,J:105,A:38,N:10,B:34.1},SSBT:{d:25,A:30,H:95,H2:51,L:97,L1:56,N:16,B:34.1}};
Object.entries(synthetic).forEach(([s,d])=>{
  const c={title:s+' 205 Yataklı Rulman',specs:[{l:'Seri',v:s},{l:'Numara',v:'205'}].concat(Object.keys(d).map(k=>({l:'Ölçü ('+k+')',v:d[k]+' mm'})))};
  assert(mod.match(c));const r=mod.draw(c,{id:'contract'+s});assert(r);check(r,'contract'+s);
  Object.keys(d).forEach(k=>{const bad=clone(c);bad.specs=bad.specs.filter(x=>!x.l.endsWith('('+k+')'));assert.strictEqual(mod.draw(bad,{}),null)});
});
const delegated=fixtures.find(c=>c.specs[0].v==='SSUCF');
const original=window.YDRAW.yatakli, snapshot=JSON.stringify(delegated);
window.YDRAW.yatakli={draw:(c,opt)=>{assert.strictEqual(c.title,'UCF 205 Yataklı Rulman');assert.deepStrictEqual(c.specs.length,0);assert.strictEqual(c.onyazi.length,0);assert.strictEqual(c.data.d,25);assert.notStrictEqual(c,delegated);return 'sentinel'}};
assert.strictEqual(mod.draw(delegated,{}),'sentinel');assert.strictEqual(JSON.stringify(delegated),snapshot);
delete window.YDRAW.yatakli;assert.strictEqual(mod.draw(delegated,{}),null);window.YDRAW.yatakli=original;
const xml=cp.spawnSync('python3',['-c','import sys,json,xml.etree.ElementTree as E; [E.fromstring(s) for s in json.load(sys.stdin)]; print("PASS: SVG XML valid")'],{input:JSON.stringify(svgs),encoding:'utf8'});
assert.strictEqual(xml.status,0,xml.stderr);
Object.keys(conflicts).forEach(k=>assert.strictEqual(conflicts[k].length,0,k+': '+conflicts[k].join(', ')));
console.log('PASS: legacy fixtures '+old+'; yatak.match=true: 0');
console.log('PASS: yatak fixtures '+fixtures.length+'; drawings '+rendered+'; null '+(fixtures.length-rendered));
console.log('PASS: competing modules '+Object.keys(conflicts).map(k=>k+'=0').join(', '));
console.log('PASS: '+checks+' SVG contracts; keys/data-k, prefix IDs, missing/error/duplicate cases, immutable delegation');
console.log(xml.stdout.trim());
console.log('PASS: numeric-only dimensions, diameter prefixes, filled hatched races, balls and set screws');
