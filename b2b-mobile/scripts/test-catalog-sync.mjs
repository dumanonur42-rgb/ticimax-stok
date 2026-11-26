import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const request = await readFile(new URL('../src/lib/catalogRequest.ts', import.meta.url), 'utf8')
const sync = await readFile(new URL('../src/lib/sync.ts', import.meta.url), 'utf8')
const storage = await readFile(new URL('../src/lib/catalogStorage.ts', import.meta.url), 'utf8')
const compile = source => ts.transpileModule(source.replace(/^import .*$/gm, '').replace(/^export /gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const tick = () => new Promise(resolve => setImmediate(resolve))
function setup(delta, initialStall, fail = false) {
  let stall = initialStall
  let release
  let pages = 0
  const writes = []
  const signals = []
  const settings = { show_prices_to_dealers: true }
  const product = { id: 1, updated_at: '2026-01-01T00:00:00Z', active: true, deleted: false }
  const state = { session: { user: { role: 'admin' } }, settings, setSettings: value => { state.settings = value } }
  async function response(stage, signal) {
    signals.push(signal)
    if (fail) throw new Error('network failure')
    if (stage === stall) return new Promise(resolve => { release = resolve })
    if (stage === 'generation') return { data: { value: '1' }, error: null }
    if (stage === 'page') return { data: pages++ === 0 ? [product] : [], error: null }
    return settings
  }
  const context = { AbortController, setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 30)), clearTimeout,
    hasPerm: () => true, useApp: { getState: () => state },
    loadSettings: signal => response('settings', signal),
    getState: async key => ({ catalog_generation: '1', products_cursor_time: delta ? '2025-01-01T00:00:00Z' : null,
      product_storage_policy: JSON.stringify({ role: 'admin', shelf: true, prices: true, showPricesToDealers: true }) })[key],
    setState: async (key, value) => writes.push([key, value]),
    replaceProducts: async rows => writes.push(['replace', rows.length]), putProducts: async rows => writes.push(['put', rows.length]),
    removeProducts: async ids => writes.push(['remove', ids.length]), readProducts: async () => [],
    supabase: { from: table => {
      let signal
      const query = { then: (resolve, reject) => response(table === 'settings' ? 'generation' : 'page', signal).then(resolve, reject) }
      for (const method of ['select', 'eq', 'maybeSingle', 'gt', 'order', 'limit', 'or']) query[method] = () => query
      query.abortSignal = value => { signal = value; return query }
      return query
    } } }
  vm.createContext(context)
  vm.runInContext(compile(request) + '\nglobalThis.Cancelled = CatalogSyncAbortedError;\n' + compile(storage) + '\nglobalThis.StorageError = CatalogStorageError;\n' + compile(sync), context)
  return { context, writes, signals, restart: () => { stall = null; pages = 0 }, release: () => release?.({ data: [product], error: null }) }
}
for (const delta of [false, true]) {
  const normal = setup(delta)
  const first = normal.context.syncCatalog()
  assert.equal(first, normal.context.syncCatalog(), 'Concurrent callers share exactly one promise')
  await first
  assert.ok(normal.writes.some(([key]) => key === 'products_cursor_time'))
  assert.ok(normal.signals.every(signal => signal instanceof AbortSignal))
  for (const stage of ['settings', 'generation', 'page']) for (const cancel of [true, false]) {
    const test = setup(delta, stage)
    const pending = test.context.syncCatalog()
    const rejected = assert.rejects(pending, cancel ? /iptal edildi/ : /zaman aşımına/)
    await tick()
    if (cancel) test.context.abortCatalogSync()
    await rejected
    assert.ok(test.signals.at(-1).aborted)
    assert.equal(test.writes.length, 0, 'No partial pages or cursor commit after cancelled request')
    test.restart()
    await test.context.syncCatalog()
    const written = test.writes.length
    test.release()
    await tick()
    assert.equal(test.writes.length, written, 'Late response cannot write stale products/cursors')
  }
}
const failed = setup(false, null, true)
await assert.rejects(failed.context.syncCatalog(), /network failure/)
for (const method of ['getState', 'replaceProducts', 'putProducts', 'removeProducts', 'setState', 'readProducts']) {
  const test = setup(['putProducts', 'removeProducts'].includes(method))
  test.context[method] = async () => { throw new DOMException('Disk full', 'QuotaExceededError') }
  await assert.rejects(test.context.syncCatalog(), error => error instanceof test.context.StorageError && error.originalError.name === 'QuotaExceededError')
}
const emptyContext = { AbortController, setTimeout, clearTimeout }
vm.runInNewContext(compile(request), emptyContext)
assert.equal(await emptyContext.catalogRequest(async () => null), null)
const aborted = new AbortController()
aborted.abort()
await assert.rejects(emptyContext.catalogRequest(() => assert.fail('Pre-aborted request must not start'), aborted.signal), /iptal edildi/)
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
assert.match(app, /const onOffline[^\n]+abortCatalogSync\(\)/)
assert.match(app, /if \(error instanceof CatalogSyncAbortedError\) return/)
console.log('Catalog sync: ok (full/delta, coalescing, per-request deadlines, offline abort/restart, late response, empty/error)')
