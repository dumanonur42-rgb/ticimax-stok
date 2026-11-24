import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const cloud = await readFile(new URL('../src/lib/cloud.ts', import.meta.url), 'utf8')
const network = await readFile(new URL('../src/lib/networkRequest.ts', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const updates = await readFile(new URL('../src/lib/updates.ts', import.meta.url), 'utf8')
const parse = source => ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const ast = parse(cloud)
const declaration = (ast, name) => ast.statements.find(node => (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name?.text === name).getText(ast).replace(/^export /, '')
const compile = source => ts.transpileModule(source.replace(/^export /gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const functions = ['SessionRestoreTimeoutError', 'InvalidProfileError', 'withTimeout', 'errorMessage', 'isRetryableFailure', 'mapOrder', 'mapProfile', 'mapCustomer', 'loadProfileSession', 'loadSettings', 'listOrders', 'listCustomers', 'dashboardOrders', 'getOrder', 'validateCredentials', 'signIn', 'signUp']
function setup(mode = 'success', stallTable) {
  const signals = [], deadlines = [], writes = []
  let release
  const row = { id: 1, active: true, approved: true, role: 'admin', customer_id: 1, perms: [] }
  const timer = (fn, ms) => { deadlines.push(ms); return setTimeout(fn, 15) }
  const context = { AbortController, URL, Request, Response, setTimeout: timer, clearTimeout,
    window: { setTimeout: timer, clearTimeout }, PERMS: [], SESSION_CACHE: 'session', SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'fake',
    MIN_VERSION_KEYS: [], MIN_VERSION_CACHE: 'versions', DEFAULT_SETTINGS: {}, SHARED_SETTING_KEYS: new Set(),
    localStorage: { getItem: () => null, setItem() {} }, cacheShowPricesToDealers() {},
    secureStorage: { setItem: async () => writes.push('session') }, unlockCatalogStorage: async () => {},
    isAuthRetryableFetchError: () => false, loginEmail: async () => 'test@example.invalid',
    createClient: () => ({ auth: { signUp: async () => mode === 'stall' ? new Promise(() => {}) : { error: null } } }),
    supabase: { auth: { signInWithPassword: async () => mode === 'stall' ? new Promise(() => {}) : { data: { user: { id: 1 } }, error: null } },
      from: table => query(table), rpc: name => query(name) } }
  function query(table) {
    let signal, single = false
    const builder = { abortSignal: value => { signal = value; signals.push(value); return builder },
      maybeSingle: () => { single = true; return builder },
      then: (resolve, reject) => {
        if (mode === 'stall' && (!stallTable || table === stallTable)) return new Promise(done => { release = done }).then(resolve, reject)
        if (mode === 'error') return Promise.resolve({ data: null, error: { message: 'server failed' } }).then(resolve, reject)
        const data = mode === 'empty' ? (single ? null : []) : table === 'dashboard_orders' ? { openOrders: 2, ordersToday: 1 } : single ? row : [row]
        return Promise.resolve({ data, error: null }).then(resolve, reject)
      } }
    for (const method of ['select', 'eq', 'order', 'limit']) builder[method] = () => builder
    return builder
  }
  vm.createContext(context)
  vm.runInContext(compile(network) + '\nglobalThis.authFetch = authFetch;\n' + compile(functions.map(name => declaration(ast, name)).join('\n')), context)
  return { context, signals, deadlines, writes, release: () => release?.({ data: row, error: null }) }
}
for (const name of ['listOrders', 'listCustomers', 'dashboardOrders', 'getOrder', 'loadSettings', 'loadProfileSession']) {
  for (const mode of ['success', 'empty', 'error', 'stall']) {
    const test = setup(mode)
    const result = test.context[name](name === 'loadSettings' ? undefined : 1)
    if (mode === 'error' || mode === 'stall' || (mode === 'empty' && name === 'loadProfileSession')) await assert.rejects(result)
    else await result
    assert.ok(test.signals.length > 0)
    if (mode === 'stall') {
      assert.ok(test.signals.every(signal => signal.aborted))
      assert.equal(test.writes.length, 0)
      test.release()
      await new Promise(resolve => setImmediate(resolve))
      assert.equal(test.writes.length, 0, 'Late profile responses cannot persist a session')
    }
  }
}
for (const [name, table] of [['getOrder', 'order_items'], ['loadProfileSession', 'customers']]) {
  const test = setup('stall', table)
  await assert.rejects(test.context[name](1))
  assert.ok(test.signals.every(signal => signal.aborted), 'Both reads use the same operation deadline')
}
for (const name of ['signIn', 'signUp']) {
  const test = setup('stall')
  await assert.rejects(name === 'signIn' ? test.context.signIn('tester', 'password') : test.context.signUp({ username: 'tester', password: 'password', companyName: 'Test', displayName: '' }), /zaman aşımına/)
  assert.ok(test.deadlines.includes(10_000))
}
// Exercise the real Orders effect, not a duplicated fallback implementation.
const ordersPage = parse(app).statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'OrdersPage')
let effect
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText() === 'useEffect') effect = node.arguments[0].getText()
  ts.forEachChild(node, visit)
}
visit(ordersPage)
for (const cached of [null, { orders: [{ id: 99 }], updatedAt: '2026-01-01' }]) {
  const test = setup('stall')
  let loading, offline, error, orders
  let finished
  const done = new Promise(resolve => { finished = resolve })
  Object.assign(test.context, { online: true, navigator: { onLine: true },
    setLoading: value => { loading = value; if (!value) finished() }, setError: value => { error = value },
    readCachedOrders: async () => cached, setOrders: value => { orders = value }, setCachedAt() {},
    setUsingOfflineCache: value => { offline = value }, userFacingError: error => error.message })
  vm.runInContext(compile(`(${effect})()`), test.context)
  await done
  assert.equal(loading, false)
  assert.ok(test.signals[0].aborted)
  assert.ok(test.deadlines.includes(10_000))
  if (cached) { assert.equal(orders, cached.orders); assert.equal(offline, true) }
  else assert.match(error, /zaman aşımına/)
}
for (const mode of ['headers-stall', 'body-stall', 'success', 'error']) {
  const test = setup()
  let signal, calls = 0
  test.context.fetch = async (url, init) => {
    calls++; signal = init.signal
    if (mode === 'headers-stall') return new Promise(() => {})
    if (mode === 'error') throw new TypeError('Failed to fetch')
    return { status: 200, statusText: 'OK', headers: {}, arrayBuffer: async () => mode === 'body-stall' ? new Promise(() => {}) : new TextEncoder().encode('{}').buffer }
  }
  const result = test.context.authFetch('https://example.invalid/auth/v1/token', {})
  if (mode === 'success') assert.deepEqual(await (await result).json(), {})
  else await assert.rejects(result)
  if (mode.includes('stall')) assert.ok(signal.aborted)
  assert.equal(calls, 1, 'No automatic retry')
  test.context.fetch = async (url, init) => { signal = init.signal; return new Response('{}') }
  await test.context.authFetch('https://example.invalid/rest/v1/rpc/create_order', { signal: 'original' }).catch(() => {})
  assert.equal(signal, 'original', 'Non-auth transport, including order creation, is untouched')
}
for (const mode of ['web-stall', 'native-stall', 'success', 'empty', 'error']) {
  const test = setup()
  let signal
  Object.assign(test.context, { Capacitor: { isNativePlatform: () => mode === 'native-stall' },
    fetch: async (url, init) => { signal = init.signal; if (mode.endsWith('stall')) return new Promise(() => {}); return { ok: mode !== 'error', json: async () => mode === 'empty' ? null : { version: '1.0.9' } } },
    CapacitorHttp: { get: async options => { assert.equal(options.readTimeout, 10_000); return new Promise(() => {}) } } })
  vm.runInContext(compile(declaration(parse(updates), 'fetchChannelJson')), test.context)
  if (['success', 'empty'].includes(mode)) await test.context.fetchChannelJson('https://example.invalid/manifest')
  else { await assert.rejects(test.context.fetchChannelJson('https://example.invalid/manifest')); if (mode.endsWith('stall')) assert.ok(signal.aborted) }
}
const aborted = new AbortController()
aborted.abort()
await assert.rejects(setup().context.networkRequest(() => assert.fail('Must not start'), aborted.signal))
assert.match(declaration(ast, 'createOrder'), /await supabase\.rpc\('create_order'/)
assert.doesNotMatch(declaration(ast, 'createOrder'), /networkRequest|withTimeout|retry/)
console.log('Network deadlines: ok (Orders timeout/cache/no-cache, all UI reads success/empty/error/stall, auth headers/body abort, no retries, late profile response, update fallback; createOrder unchanged)')
