var fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
var base=path.resolve(__dirname,'..'),sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(base,'v_kasnak.js'),'utf8'),sandbox);
var mod=sandbox.window.YDRAW.v_kasnak,fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'v_kasnak.json'),'utf8'));
fixtures.forEach(function(ctx,i){
 var result=mod.draw(ctx,{id:'test'+i,dim:'#d0101e'});
 if(i===4){assert.strictEqual(result,null);console.log('PASS missing Kasnak Çapı -> null');return}
 assert(mod.match(ctx));assert(result);assert.strictEqual(result.keys.length,3);
 result.keys.forEach(function(key){assert(result.svg.indexOf('data-k="'+key.k+'"')>=0)});
 assert(result.svg.indexOf('viewBox="0 0 460 250"')>=0);
 assert(result.svg.indexOf('#d0101e')>=0);
 assert(result.svg.indexOf('id="test'+i+'h"')>=0);
 console.log('PASS fixture '+i+' -> '+result.keys.map(function(k){return k.l+'='+k.v}).join(', '));
});
assert.strictEqual(mod.draw({}),null);
['Triger Kasnak','Burçlu V Kasnak','Sabit Bilyalı Rulman'].forEach(function(title){assert.strictEqual(mod.match({title:title,crumbs:[]}),false)});
var conflict=JSON.parse(JSON.stringify(fixtures[0]));conflict.specs.push({l:'Kasnak Çapı',v:'999 mm'});assert.strictEqual(mod.draw(conflict),null);
var invalid=JSON.parse(JSON.stringify(fixtures[0]));invalid.specs[0].v='bilinmiyor';assert.strictEqual(mod.draw(invalid),null);
var descriptionOnly=JSON.parse(JSON.stringify(fixtures[1]));descriptionOnly.onyazi=[];assert(mod.draw(descriptionOnly));
assert.deepStrictEqual(JSON.parse(JSON.stringify(mod.draw(descriptionOnly).keys)),JSON.parse(JSON.stringify(mod.draw(fixtures[1]).keys)));
console.log('PASS empty, conflicting, invalid values and excluded families');
console.log('PASS sample ACIKLAMA labels alone feed module');
