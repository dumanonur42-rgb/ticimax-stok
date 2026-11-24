import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const source = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let effect
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes('dashboardOrders()')) effect = node
  ts.forEachChild(node, visit)
}
visit(ast)
for (const dependency of ['session?.user.id', 'online', 'orderRefresh', 'ordersLoaded']) assert.ok(effect.arguments[1].getText(ast).includes(dependency))
const js = ts.transpileModule(`const effect = ${effect.arguments[0].getText(ast)}; effect()`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
let calls = 0
let value = null
let fail = false
const context = { session: { user: { id: 'one' } }, online: false,
  dashboardOrders: async () => { calls++; if (fail) throw new Error('offline'); return { openOrders: 0 } },
  setHomeOpenOrders: next => { value = next } }
vm.runInNewContext(js, context)
assert.equal(calls, 0)
context.online = true
vm.runInNewContext(js, context)
await new Promise(resolve => setImmediate(resolve))
assert.equal(calls, 1)
assert.equal(value, 0)
fail = true
vm.runInNewContext(js, context)
await new Promise(resolve => setImmediate(resolve))
assert.equal(value, 0)
context.session = null
vm.runInNewContext(js, context)
assert.equal(calls, 2)
assert.ok(source.includes('onLoaded={onOrdersLoaded}'))
assert.ok(source.includes('onLoaded()'))
console.log('Dashboard: ok (offline cold start, reconnect zero, refresh hooks, failure, no session)')
