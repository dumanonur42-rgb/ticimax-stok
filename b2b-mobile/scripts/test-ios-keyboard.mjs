import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const source = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('main.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const bootstrap = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'bootstrap')
const setup = bootstrap.body.statements[0].getText(ast)
for (const platform of ['ios', 'android']) {
  const values = new Map()
  const listeners = new Map()
  let resize
  let mode
  let scrolled = 0
  const root = { style: { setProperty: (key, value) => values.set(key, value), getPropertyValue: key => values.get(key) }, dataset: {} }
  const context = { root, Capacitor: { getPlatform: () => platform }, KeyboardResize: { None: 'none' },
    Keyboard: { setResizeMode: async value => { mode = value.mode }, addListener: async (name, fn) => listeners.set(name, fn) },
    window: { innerHeight: 667, addEventListener: (_, fn) => { resize = fn } },
    document: { addEventListener: () => {} }, scrollFocusedField: () => { scrolled++ } }
  const js = ts.transpileModule(`(async () => { ${setup} })()`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  await vm.runInNewContext(js, context)
  if (platform === 'android') {
    assert.equal(mode, undefined)
    assert.equal(listeners.size, 0)
    continue
  }
  assert.equal(mode, 'none')
  listeners.get('keyboardWillShow')({ keyboardHeight: 296 })
  assert.equal(values.get('--ios-viewport-height'), '371px')
  assert.equal(root.dataset.keyboardOpen, 'true')
  listeners.get('keyboardDidShow')({ keyboardHeight: 296 })
  assert.equal(scrolled, 2)
  context.window.innerHeight = 736
  resize()
  assert.equal(values.get('--ios-viewport-height'), '440px')
  for (const name of ['keyboardWillHide', 'keyboardDidHide']) listeners.get(name)()
  assert.equal(values.get('--ios-keyboard-height'), '0px')
  assert.equal(values.get('--ios-viewport-height'), '736px')
  assert.equal(root.dataset.keyboardOpen, 'false')
  listeners.get('keyboardDidShow')({ keyboardHeight: -1 })
  assert.equal(values.get('--ios-keyboard-height'), '0px')
}
console.log('iOS keyboard: ok (show, hide, resize, empty height; Android untouched)')
