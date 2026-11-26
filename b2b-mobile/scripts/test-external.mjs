import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/external.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source.replace(/^import .*$/gm, '').replace(/^export /gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
for (const native of [true, false]) for (const mode of ['success', 'false', 'reject', 'empty']) {
  const opened = []
  const context = { Capacitor: { isNativePlatform: () => native },
    AppLauncher: { openUrl: async ({ url }) => { opened.push(url); if (mode === 'reject') throw new Error('No handler'); return { completed: mode === 'success' } } },
    window: { open: (...args) => opened.push(args) } }
  vm.runInNewContext(js, context)
  const url = mode === 'empty' ? '' : 'tel:+901234567890'
  if (native && mode !== 'success') await assert.rejects(context.openExternal(url))
  else await context.openExternal(url)
  assert.equal(opened.length, 1)
  if (!native) assert.deepEqual(opened[0], [url, '_blank', 'noopener,noreferrer'])
}
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('App.tsx', app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const wrapper = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'external')
const context = { openExternal: async () => { throw new Error('No handler') }, useApp: { getState: () => ({ showToast: text => { context.toast = text } }) } }
vm.runInNewContext(ts.transpileModule(wrapper.getText(ast), {}).outputText, context)
context.external('tel:')
await new Promise(resolve => setImmediate(resolve))
assert.equal(context.toast, 'Bağlantı açılamadı.')
console.log('External links: ok (native success/false/rejection/empty, web unchanged, failure toast)')
