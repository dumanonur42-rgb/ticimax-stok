import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { GoTrueClient, isAuthApiError, isAuthRetryableFetchError } from '@supabase/auth-js'

const network = await readFile(new URL('../src/lib/networkRequest.ts', import.meta.url), 'utf8')
const cloud = await readFile(new URL('../src/lib/cloud.ts', import.meta.url), 'utf8')
const ast = ts.createSourceFile('cloud.ts', cloud, ts.ScriptTarget.Latest, true)
const compile = source => ts.transpileModule(source.replace(/^export /gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const declarations = ['SessionRestoreTimeoutError', 'InvalidProfileError', 'withTimeout', 'cachedSession', 'errorMessage', 'isRetryableFailure', 'isAuthoritativeAuthFailure', 'restoreSession', 'verifySessionInBackground']
  .map(name => ast.statements.find(node => (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name?.text === name).getText(ast)).join('\n')
const originalNow = Date.now
const user = { id: '00000000-0000-4000-8000-000000000001' }
const cached = { user: { ...user, perms: [] }, customer: null }
let sequence = 0
async function fixture(mode, expired = true) {
  let now = originalNow()
  const values = new Map(), removed = [], events = [], signals = [], deadlines = [], dispatched = []
  let wiped = 0, signedOut = 0, release
  const storageKey = `refresh-safety-${sequence++}`
  const appKey = 'test-app-session'
  const storage = { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => values.set(key, value),
    removeItem: async key => { removed.push(key); values.delete(key) } }
  const context = { AbortController, URL, Request, Response,
    setTimeout: (fn, ms) => {
      deadlines.push(ms)
      return setTimeout(() => { if (mode === 'timeout') now += ms; fn() }, ms / 1000)
    }, clearTimeout,
    fetch: async (url, init) => {
      assert.ok(url.startsWith('https://example.invalid/auth/v1/'), 'Mock transport only')
      signals.push(init.signal)
      if (mode === 'invalid') return new Response(JSON.stringify({ msg: 'Refresh token rejected', code: 'refresh_token_not_found' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
      return new Promise(resolve => { release = resolve })
    } }
  vm.createContext(context)
  vm.runInContext(compile(network) + '\nglobalThis.authFetch = authFetch', context)
  const client = new GoTrueClient({ url: 'https://example.invalid/auth/v1', storageKey, storage,
    persistSession: true, autoRefreshToken: false, detectSessionInUrl: false,
    fetch: (url, init) => {
      if (mode !== 'abort') return context.authFetch(url, init)
      const parent = new AbortController()
      const pending = context.authFetch(url, { ...init, signal: parent.signal })
      setTimeout(() => { now += 15_000; parent.abort() }, 1)
      return pending
    } })
  await client.initialize()
  await new Promise(resolve => client.onAuthStateChange(event => { events.push(event); if (event === 'INITIAL_SESSION') resolve() }))
  const stored = { access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer',
    expires_at: Math.floor(now / 1000) + (expired ? -60 : 60), expires_in: 3600, user }
  const original = JSON.stringify(stored)
  values.set(storageKey, original)
  values.set(appKey, JSON.stringify(cached))
  removed.length = 0
  events.length = 0
  const signOut = client.signOut.bind(client)
  client.signOut = (...args) => { signedOut++; return signOut(...args) }
  Object.assign(context, { SESSION_CACHE: appKey, secureStorage: storage, supabase: { auth: client },
    isAuthApiError, isAuthRetryableFetchError, isNetworkOffline: async () => false,
    window: { setTimeout: (fn, ms) => { deadlines.push(ms); return setTimeout(fn, ms / 1000) }, clearTimeout },
    unlockCatalogStorage: async () => {}, loadProfileSession: async () => cached,
    wipeLocalUserData: async () => { wiped++ }, dispatchRestoredSession: value => dispatched.push(value) })
  vm.runInContext(compile(declarations), context)
  return { client, context, values, removed, events, signals, deadlines, dispatched, storageKey, appKey, original,
    clock: () => now, counts: () => ({ wiped, signedOut }),
    complete: () => release(new Response(JSON.stringify({ ...stored, expires_at: Math.floor(originalNow() / 1000) + 3600, expires_in: 3600 }), { status: 200, headers: { 'Content-Type': 'application/json' } })) }
}
for (const mode of ['timeout', 'abort']) for (const expired of [true, false]) {
  const test = await fixture(mode, expired)
  Date.now = test.clock
  try {
    // Execute the SDK's real background tick and its real shared refresh path.
    await test.client._autoRefreshTokenTick()
    const result = await test.client.refreshSession({ refresh_token: 'test-refresh-token' })
    assert.ok(isAuthRetryableFetchError(result.error), 'SDK must classify timeout/abort as retryable')
    assert.equal(result.error.status, 0)
    assert.ok(test.signals.length >= 1)
    assert.ok(test.signals.every(signal => signal.aborted))
    assert.ok(test.deadlines.includes(15_000))
    assert.equal(test.values.get(test.storageKey), test.original)
    assert.equal(test.events.includes('SIGNED_OUT'), false)
    assert.deepEqual(test.removed, [])
    // The application's restore/revalidation must not mistake session:null + error for logout.
    assert.deepEqual(JSON.parse(JSON.stringify(await test.context.restoreSession())), cached)
    await test.context.verifySessionInBackground()
    assert.deepEqual(test.counts(), { wiped: 0, signedOut: 0 })
    assert.equal(test.dispatched.includes(null), false)
    assert.equal(test.values.get(test.appKey), JSON.stringify(cached))
    assert.equal(test.values.get(test.storageKey), test.original)
    console.log(`Refresh safety: ${mode}, ${expired ? 'expired' : 'still-valid'} access token -> retryable status 0; SDK/app storage retained; no SIGNED_OUT/signOut/wipe`)
  } finally {
    Date.now = originalNow
    await test.client.dispose()
  }
}
// A destructive control proves the storage/event assertions would catch a genuine logout.
const invalid = await fixture('invalid')
try {
  const result = await invalid.client.refreshSession({ refresh_token: 'test-refresh-token' })
  assert.ok(isAuthApiError(result.error))
  assert.equal(isAuthRetryableFetchError(result.error), false)
  assert.equal(invalid.values.has(invalid.storageKey), false)
  assert.ok(invalid.removed.includes(invalid.storageKey))
  assert.ok(invalid.events.includes('SIGNED_OUT'))
  console.log('Refresh control: authoritative rejection + expired access token -> SDK removes session and emits SIGNED_OUT (detection verified)')
} finally { await invalid.client.dispose() }

const slow = await fixture('slow')
try {
  assert.deepEqual(JSON.parse(JSON.stringify(await slow.context.restoreSession())), cached)
  assert.ok(slow.deadlines.includes(4000))
  assert.ok(slow.deadlines.includes(15_000))
  await new Promise(resolve => setTimeout(resolve, 2))
  assert.equal(slow.signals[0].aborted, false, '4-second UI guard must not abort the 15-second auth request')
  slow.complete()
  const result = await slow.client.getSession()
  assert.equal(result.error, null)
  assert.ok(result.data.session)
  assert.deepEqual(slow.counts(), { wiped: 0, signedOut: 0 })
  assert.equal(slow.events.includes('SIGNED_OUT'), false)
  console.log('Session UI guard: cached UI returns at 4s; auth continues past 4s, succeeds before 15s, session retained (accelerated timers)')
} finally { await slow.client.dispose() }
console.log('Refresh session safety: ok (installed Supabase SDK; mock transport only; abort/timeout and authoritative-error control)')
