import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('App.tsx', app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let callback
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'syncNow') callback = node.initializer.arguments[0].getText(ast)
  ts.forEachChild(node, visit)
}
visit(ast)
const compile = source => ts.transpileModule(source.replace(/^export /gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const storage = await readFile(new URL('../src/lib/catalogStorage.ts', import.meta.url), 'utf8')
const request = await readFile(new URL('../src/lib/catalogRequest.ts', import.meta.url), 'utf8')
for (const mode of ['success', 'quota', 'security', 'read', 'network', 'cancel']) {
  const online = [], busy = [], toasts = [], timers = []
  const context = { navigator: { onLine: true }, useApp: { getState: () => ({ session: {}, products: [] }) },
    syncRetryAt: { current: 0 }, syncRetryCount: { current: 0 }, syncRetryTimer: { current: null }, syncNowRef: { current() {} },
    setHomeCatalogStatus() {}, setOnline: value => online.push(value), setSyncBusy: value => busy.push(value), showToast: value => toasts.push(value),
    refreshSettings: async () => {}, window: { setTimeout: fn => { timers.push(fn); return 1 }, clearTimeout() {} }, console: { warn() {} } }
  vm.createContext(context)
  vm.runInContext(compile(storage) + '\n' + compile(request) + `
    globalThis.syncCatalog = async () => {
      if (${JSON.stringify(mode)} === 'cancel') throw new CatalogSyncAbortedError();
      if (${JSON.stringify(mode)} === 'network') throw new TypeError('Failed to fetch');
      if (${JSON.stringify(mode)} !== 'success') await catalogStorage(async () => { throw new Error('Storage failure'); });
      return { changed: 0, products: [] };
    };
    globalThis.runSync = ${callback};`, context)
  await context.runSync()
  assert.deepEqual(busy, [true, false])
  if (['quota', 'security', 'read'].includes(mode)) {
    assert.deepEqual(online, [], 'Storage failure must preserve connectivity')
    assert.equal(toasts.length, 1)
    assert.match(toasts[0], /Yerel depolama/)
    assert.equal(timers.length, 0, 'Storage errors do not schedule network retries')
  } else if (mode === 'network') {
    assert.deepEqual(online, [false])
    assert.equal(timers.length, 1)
  } else {
    assert.deepEqual(online, mode === 'success' ? [true] : [])
    assert.equal(toasts.length, 0)
  }
}
const context = {}
vm.runInNewContext(compile(storage), context)
assert.equal(await context.catalogStorage(async () => null), null)
console.log('Catalog storage: ok (quota/read/security isolated from connectivity, toast, no network retry; success/network/cancel unchanged)')
