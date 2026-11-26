import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const source = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const page = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'ProductsPage')
const declarations = page.body.statements.filter(node => ts.isVariableStatement(node) &&
  node.declarationList.declarations.some(declaration => ['getItemKey', 'virtualizer'].includes(declaration.name.getText(ast))))
assert.equal(declarations.length, 2)
assert.match(page.getText(ast), /<ProductTableRow/)
assert.match(page.getText(ast), /<ProductCard/)
const js = ts.transpileModule(`function options(results, view) {
  ${declarations.map(node => node.getText(ast)).join('\n')}
  return virtualizer
}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText

for (const platform of ['ios', 'android', 'web']) {
  let previous
  const scrollElement = {}
  const context = { Capacitor: { getPlatform: () => platform }, scrollRef: { current: scrollElement },
    useCallback: (callback, dependencies) => {
      if (!previous || dependencies.some((value, index) => value !== previous.dependencies[index])) {
        previous = { callback, dependencies }
      }
      return previous.callback
    },
    useVirtualizer: options => options }
  vm.createContext(context)
  vm.runInContext(js, context)
  const results = [{ id: 41 }, { id: 7 }]
  const table = context.options(results, 'table')
  const card = context.options(results, 'card')
  assert.equal(table.getItemKey, card.getItemKey, 'Table/card rerenders retain callback identity')
  assert.equal(context.options(results, 'table').getItemKey, table.getItemKey)
  for (const options of [table, card]) {
    assert.equal(options.count, 2)
    assert.equal(options.overscan, platform === 'ios' ? 10 : 5)
    assert.equal(options.getScrollElement(), scrollElement)
    assert.equal(options.getItemKey(0), 41)
    assert.equal(options.getItemKey(1), 7)
  }
  assert.equal(table.estimateSize(), 66)
  assert.equal(card.estimateSize(), 210)
  const reordered = context.options([...results].reverse(), 'table')
  assert.notEqual(reordered.getItemKey, table.getItemKey)
  assert.equal(reordered.getItemKey(0), 7)
  const replaced = context.options([{ id: 99 }], 'card')
  assert.equal(replaced.getItemKey(0), 99)
  const empty = context.options([], 'table')
  assert.equal(empty.count, 0)
  assert.equal(empty.overscan, platform === 'ios' ? 10 : 5)
  assert.throws(() => empty.getItemKey(0), /id/, 'An out-of-range key still fails rather than reusing stale data')
}
console.log('Catalog virtualization: ok (shared table/card callback stable across rerenders, reordered/replaced/empty results, invalid index, iOS overscan 10; Android/web 5)')
