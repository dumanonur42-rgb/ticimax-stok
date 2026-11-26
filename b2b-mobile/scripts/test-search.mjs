import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const searchPath = new URL('../src/lib/search.ts', import.meta.url)
const source = await readFile(searchPath, 'utf8')
const identityPath = pathToFileURL(resolve(new URL('../..', import.meta.url).pathname, 'b2b-app/src/shared/identity.ts')).href
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText.replace(/from ["']@shared\/identity["']/, `from '${identityPath}'`)
const { indexProducts, searchProducts } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

function product(sku, brand, name = '') {
  return { sku, brand, name, description: '', equivalents: '', box: '', barcode: '', category: '', type: '', seal: '', stock: 1 }
}

const entries = indexProducts([
  product('6205', 'SKF', 'Deep groove ball bearing'),
  product('16205', 'SKF'),
  product('NU 1052 M', 'SKF'),
  product('NUP 1052', 'FAG'),
  product('6205 ZZ', 'ÇİN'),
  product('6205-2RS', 'SKF')
])
const skus = (query) => searchProducts(entries, query).map((item) => item.sku)

assert.equal(skus('SKF 6205')[0], '6205')
assert.equal(skus('6205 SKF')[0], '6205')
for (const query of ['NU 1052', 'NU1052', 'nu-1052']) {
  assert.equal(skus(query)[0], 'NU 1052 M')
}
assert.deepEqual(skus('205S'), [])
assert.deepEqual(skus('5SKF'), [])
assert.deepEqual(skus('ÇİN'), skus('çin'))
assert.deepEqual(skus('ÇİN'), skus('cin'))
for (const query of ['6205-ZZ', '6205.ZZ', '6205 ZZ']) {
  assert.equal(skus(query)[0], '6205 ZZ')
}

console.log('Search regression tests passed.')
