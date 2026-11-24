import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const cloud = await readFile(new URL('../src/lib/cloud.ts', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
const schema = await readFile(new URL('../../b2b-app/supabase/schema.sql', import.meta.url), 'utf8')
const parse = source => ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText
const declaration = (source, name) => { const ast = parse(source); return ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast).replace(/^export /, '') }
const variable = name => {
  const ast = parse(app)
  let result
  const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) result = node.initializer.getText(ast); ts.forEachChild(node, visit) }
  visit(ast)
  return result
}
for (const mode of ['success', 'rpc-error', 'throw', 'cleanup-error']) {
  const calls = []
  const ctx = { supabase: { rpc: async name => { assert.equal(name, 'delete_my_account'); calls.push('rpc'); if (mode === 'throw') throw new Error('network'); return { error: mode === 'rpc-error' ? new Error('denied') : null, data: null } },
    auth: { signOut: async () => { calls.push('signOut'); return { error: mode === 'cleanup-error' ? new Error('cleanup') : null } } } },
    errorMessage: error => error.message, wipeLocalUserData: async () => { calls.push('wipe') } }
  vm.runInNewContext(compile(declaration(cloud, 'signOut') + '\n' + declaration(cloud, 'deleteMyAccount')), ctx)
  if (['rpc-error', 'throw'].includes(mode)) { await assert.rejects(ctx.deleteMyAccount()); assert.deepEqual(calls, ['rpc']) }
  else { await ctx.deleteMyAccount(); assert.deepEqual(calls, ['rpc', 'signOut', 'wipe']) }
}
for (const mode of ['success', 'flush-error', 'rpc-error']) {
  const updates = []
  const ctx = { flushActivity: async () => { if (mode === 'flush-error') throw new Error('flush') }, deleteMyAccount: async () => { if (mode === 'rpc-error') throw new Error('denied') } }
  for (const name of ['setActivitySession', 'setSession', 'setProducts', 'setCustomers', 'clearCart', 'setTab', 'setLoginName', 'setLoginNotice']) ctx[name] = value => updates.push([name, value])
  vm.runInNewContext(compile(`globalThis.remove = ${variable('onDeleteAccount')}`), ctx)
  if (mode === 'rpc-error') { await assert.rejects(ctx.remove()); assert.equal(updates.length, 0) }
  else { await ctx.remove(); assert.ok(updates.some(([name, value]) => name === 'setSession' && value === null)); assert.ok(updates.some(([name]) => name === 'clearCart')); assert.ok(updates.some(([name, value]) => name === 'setLoginNotice' && value === 'Hesabınız silindi.')) }
}
const states = [false, false, false, ''], events = []
let cursor, effect, cleanup, apiCalls = 0, rejectDelete = false
const props = { session: { user: { username: 'mock-user', role: 'dealer' } }, online: true, onLogout: () => {}, onDeleteAccount: async () => { apiCalls++; if (rejectDelete) throw new Error('denied') }, backInterceptRef: { current: null }, themePreference: 'system', onThemeChange: () => {} }
const ctx = { React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
  useState: () => { const index = cursor++; return [states[index], value => { states[index] = value; events.push('state') }] }, useRef: () => ({ current: null }), useEffect: fn => { effect = fn },
  dismissIOSKeyboard: () => events.push('dismiss'), userFacingError: error => error.message, APP_VERSION: 'test', Monitor: 'monitor', Sun: 'sun', Moon: 'moon', PageTitle: 'title', InfoRow: 'info', Sheet: 'sheet', props }
vm.runInNewContext(compile(declaration(app, 'AccountPage')), ctx)
const render = () => { cleanup?.(); cursor = 0; const tree = ctx.AccountPage(props); cleanup = effect(); return tree }
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return
  if (predicate(node)) return node
  for (const child of [node.props?.footer, ...(node.props?.children ?? [])].flat(Infinity)) { const match = find(child, predicate); if (match) return match }
}
let tree = render()
find(tree, node => node.props?.className === 'text-button delete-account-link').props.onClick()
assert.deepEqual(events.slice(0, 2), ['dismiss', 'state'])
tree = render()
assert.equal(typeof props.backInterceptRef.current, 'function')
const confirm = node => node.type === 'button' && node.props.children.includes('Hesabımı kalıcı olarak sil')
assert.equal(find(tree, confirm).props.disabled, true)
find(tree, node => node.type === 'input').props.onChange({ target: { checked: true } })
tree = render()
assert.equal(find(tree, confirm).props.disabled, false)
props.online = false; tree = render(); assert.equal(find(tree, confirm).props.disabled, true)
props.online = true; rejectDelete = true; tree = render(); find(tree, confirm).props.onClick()
await new Promise(resolve => setImmediate(resolve))
assert.equal(states[2], false); assert.equal(states[3], 'denied'); assert.equal(apiCalls, 1)
rejectDelete = false; tree = render(); find(tree, confirm).props.onClick()
await new Promise(resolve => setImmediate(resolve))
tree = render(); props.backInterceptRef.current(); assert.equal(states[0], true)
assert.equal(apiCalls, 2)
states[2] = false; tree = render()
const navigation = []
const back = { backInterceptRef: props.backInterceptRef, copySheetOpenRef: { current: false }, useApp: { getState: () => ({ tab: 'account', setTab: value => navigation.push(value) }) } }
vm.runInNewContext(compile(`globalThis.back = ${variable('goBack')}`), back)
back.back(false); assert.equal(states[0], false); assert.deepEqual(navigation, [])
render(); assert.equal(props.backInterceptRef.current, null)
back.back(false); assert.deepEqual(navigation, ['home'])
assert.match(app, /event\.key === 'Escape'/)
assert.match(css, /\.delete-account-actions[^}]*var\(--safe-bottom\)/)
assert.match(schema, /t\.role = 'admin' and not exists \(select 1 from profiles where role = 'admin' and active and approved and id <> uid\)/)
for (const field of ['tax_no', 'tax_office', 'phone', 'email', 'address', 'city', 'notes']) assert.ok(schema.includes(`c.${field} = ''`))
assert.ok(schema.includes('c.discount_pct = 0'))
console.log('Account deletion: ok (mock-only RPC success/empty/error, local wipe, failure retention, notice, checkbox/offline/busy, dismissal before sheet, Back/Escape, safe bottom, approved-admin/customer-data SQL guards; no SQL executed)')
