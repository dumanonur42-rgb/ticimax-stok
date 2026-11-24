import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

async function load(path, context) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  vm.runInNewContext(ts.transpileModule(source.replace(/^export /gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context)
}
const context = {}
await load('../src/lib/cleanup.ts', context)
await context.attemptAll([])
let completed = 0
await context.attemptAll([() => { completed++ }, async () => { completed++ }])
assert.equal(completed, 2)
for (let failed = 0; failed < 4; failed++) {
  const visited = []
  await assert.rejects(context.attemptAll(Array.from({ length: 4 }, (_, i) => async () => {
    visited.push(i)
    if (i === failed) throw new Error('store failed')
  })), /store failed/)
  assert.deepEqual(visited, [0, 1, 2, 3])
}
for (const mode of ['rich', 'plain', 'legacy', 'denied', 'throw']) {
  let removed = 0
  let selected = 0
  const context = { Blob, ClipboardItem: class {}, navigator: { clipboard: {
    write: async () => { if (mode !== 'rich') throw new Error('denied') },
    writeText: async () => { if (mode !== 'plain') throw new Error('denied') }
  } }, document: {
    createElement: () => ({ style: {}, select: () => { selected++ }, remove: () => { removed++ } }),
    body: { append() {} }, execCommand: () => { if (mode === 'throw') throw new Error('denied'); return mode === 'legacy' }
  } }
  await load('../src/lib/clipboard.ts', context)
  const result = await context.copyToClipboard({ html: '<b>test</b>', text: '' })
  assert.equal(result, ['rich', 'plain', 'legacy'].includes(mode))
  assert.equal(removed, ['legacy', 'denied', 'throw'].includes(mode) ? 1 : 0)
  assert.equal(selected, removed)
}
// Exercise the actual logout orchestration with each independently failing store.
const cloud = await readFile(new URL('../src/lib/cloud.ts', import.meta.url), 'utf8')
const idb = await readFile(new URL('../src/lib/idb.ts', import.meta.url), 'utf8')
function declaration(source, name) {
  const ast = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest, true)
  return ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === name).getText(ast).replace(/^export /, '')
}
for (const platform of ['ios', 'android']) for (const failed of ['catalog', 'session', 'cart', 'auth', 'local', 'browser', 'cache:a', null]) {
  const visited = []
  const step = name => { visited.push(name); if (name === failed) throw new Error(name) }
  const stored = new Map([['yamansa.theme', 'dark'], ['yb2b.productView', 'card'], ['yamansa.cart', 'private']])
  const context = { attemptAll: contextForAttemptAll(), Capacitor: { getPlatform: () => platform },
    SESSION_CACHE: 'session', CART_STORAGE_KEY: 'cart', SUPABASE_AUTH_STORAGE_KEY: 'auth',
    clearLocalCatalog: () => step('catalog'), secureStorage: { removeItem: key => step(key) },
    DEVICE_PREFERENCE_KEYS: ['yamansa.theme', 'yb2b.productView'],
    localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), clear: () => { step('local'); stored.clear() } },
    sessionStorage: { clear: () => step('browser') },
    window: { caches: {} }, caches: { keys: async () => ['a', 'b'], delete: key => step(`cache:${key}`) } }
  vm.runInNewContext(ts.transpileModule(declaration(cloud, 'wipeLocalUserData'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context)
  await context.wipeLocalUserData().catch(() => {})
  assert.deepEqual(visited, platform === 'ios' ? ['catalog', 'session', 'cart', 'auth', 'local', 'browser', 'cache:a', 'cache:b'] : ['catalog', 'session', 'cart'])
  if (platform === 'ios' && failed !== 'local') assert.deepEqual([...stored], [['yamansa.theme', 'dark'], ['yb2b.productView', 'card']])
}
function contextForAttemptAll() { return context.attemptAll }
assert.ok(declaration(idb, 'clearLocalCatalog').includes('await attemptAll(['))
console.log('Cleanup/clipboard: ok (all stores attempted on failure, Android scope, copy fallback true/false/throw, cleanup)')
