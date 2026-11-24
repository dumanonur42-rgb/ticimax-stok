import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/bearingCodes.ts', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
const context = { exports: {} }
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context)
const explain = context.exports.explainProductCode
for (const sku of ['', 'not-a-bearing', '????']) assert.equal(explain(sku, ''), null)
const sealed = explain('6205-2RS C3', 'SKF')
assert.equal(sealed.base, '6205')
assert.ok(sealed.size.includes('25'))
assert.ok(sealed.notes.some(note => note.code === '2RS' && note.equivalents.length > 0))
assert.ok(sealed.notes.some(note => note.code === 'C3' && note.sameEverywhere))
assert.equal(explain('6205', '').notes.length, 0)
assert.equal(explain('6205-UNKNOWN', 'unknown').base, '6205')
assert.ok(explain('6205-2RS', 'SKF').notes.some(note => note.code === '2RS'))
assert.match(app, /codeInfo && <section className="code-info"/)
assert.match(app, /<span className="code-chip">/)
assert.match(css, /:root\[data-platform='ios'\] \.code-info \{ -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; \}/)
assert.match(css, /:root\[data-platform='ios'\] \.code-info :is\(\.code-chip, \.code-equivalents li\) \{ -webkit-user-select: text; user-select: text; -webkit-touch-callout: default; \}/)
console.log('Bearing codes: ok (offline base/bore/suffix/equivalents, empty/unknown inputs and unknown brand, conditional section, non-button chips, iOS-only chip selection)')
