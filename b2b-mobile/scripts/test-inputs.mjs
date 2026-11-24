import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const source = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const stepper = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'QuantityStepper')
let draft
let committed
let qty = 1
let min = 1
const context = {
  React: { createElement: (type, props, ...children) => ({ type, props, children }) },
  Minus: 'minus', Plus: 'plus',
  useState: initial => { draft ??= initial; return [draft, value => { draft = value }] },
  useEffect: () => {},
  props: () => ({ qty, min, sku: '6205', setQty: value => { committed = value } })
}
vm.createContext(context)
vm.runInContext(ts.transpileModule(stepper.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, context)
const render = () => vm.runInContext('QuantityStepper(props())', context)
const input = () => render().children[1].props
assert.equal(input().value, '1')
input().onChange({ target: { value: '' } })
assert.equal(input().value, '')
assert.equal(committed, undefined)
input().onChange({ target: { value: '2' } })
input().onBlur()
assert.equal(committed, 2)
input().onChange({ target: { value: '' } })
input().onBlur()
assert.equal(committed, 1)
min = 5
input().onChange({ target: { value: '2' } })
input().onBlur()
assert.equal(committed, 5)
input().onChange({ target: { value: '10' } })
render().children[2].props.onClick()
assert.equal(committed, 15)
render().children[0].props.onClick()
assert.equal(committed, 10)
input().onChange({ target: { value: 'abc' } })
assert.equal(input().value, '')
input().onBlur()
assert.equal(committed, 5)
let blurred = false
input().onKeyDown({ key: 'Enter', preventDefault() {}, currentTarget: { blur() { blurred = true } } })
assert.equal(blurred, true)
const searches = []
function visit(node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'input' &&
    node.attributes.properties.some(p => p.name?.text === 'data-dismiss-on-enter')) searches.push(node.getText(ast))
  ts.forEachChild(node, visit)
}
visit(ast)
assert.equal(searches.length, 2)
for (const search of searches) for (const attribute of ['autoCapitalize="none"', 'autoCorrect="off"', 'spellCheck={false}', 'inputMode="text"']) assert.ok(search.includes(attribute))
console.log('Inputs: ok (quantity empty/edit/commit/min/step/error; both searches disable correction)')
