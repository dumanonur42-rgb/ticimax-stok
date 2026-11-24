import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const source = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('main.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const bootstrap = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'bootstrap')
const setup = bootstrap.body.statements[0].getText(ast)
const scrollField = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'scrollFocusedField')
let scrollAmount = 0
const hero = {}
const login = { dataset: {}, getBoundingClientRect: () => ({ top: 0 }), querySelector: selector => selector === '.login-hero' ? hero : ({ getBoundingClientRect: () => ({ top: 250, bottom: 300 }) }), scrollBy: ({ top }) => { scrollAmount += top } }
class Field {
  matches() { return true }
  closest() { return login }
  getBoundingClientRect() { return { top: 40, bottom: 80 } }
}
const safeAreaContext = { root: {}, Capacitor: { getPlatform: () => 'ios' }, HTMLElement: Field,
  document: { activeElement: new Field() }, window: { innerHeight: 667 }, requestAnimationFrame: fn => fn(),
  getComputedStyle: element => element === hero ? { paddingTop: '62px' } : { getPropertyValue: key => key === '--ios-keyboard-height' ? '300px' : 'max(62px, 0px)' } }
vm.runInNewContext(ts.transpileModule(scrollField.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText + '\nscrollFocusedField()', safeAreaContext)
assert.equal(scrollAmount, -34)
safeAreaContext.document.activeElement = null
vm.runInNewContext('scrollFocusedField()', safeAreaContext)
assert.equal(scrollAmount, -34)
for (const platform of ['ios', 'android', 'error', 'timeout']) {
  const values = new Map()
  const listeners = new Map()
  let resize
  let mode
  let scrolled = 0
  const root = { style: { setProperty: (key, value) => values.set(key, value), getPropertyValue: key => values.get(key) }, dataset: {} }
  let accessory
  let warnings = 0
  const context = { root, Capacitor: { getPlatform: () => platform === 'android' ? platform : 'ios' }, KeyboardResize: { None: 'none' },
    installIOSKeyboardDismissal: () => {}, initializeIOSDynamicType: () => {}, console: { warn: () => { warnings++ } },
    Keyboard: { setResizeMode: async value => {
      if (platform === 'error') throw new Error('Bridge unavailable')
      if (platform === 'timeout') await new Promise(() => {})
      mode = value.mode
    }, setAccessoryBarVisible: async value => { accessory = value.isVisible }, addListener: async (name, fn) => {
      listeners.set(name, fn)
      return { remove: async () => listeners.delete(name) }
    } },
    window: { innerHeight: 667, setTimeout: fn => setTimeout(fn, 20), clearTimeout, addEventListener: (_, fn) => { resize = fn } },
    document: { addEventListener: () => {} }, scrollFocusedField: () => { scrolled++ } }
  const js = ts.transpileModule(`(async () => { ${setup} })()`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  await vm.runInNewContext(js, context)
  if (platform === 'android') {
    assert.equal(mode, undefined)
    assert.equal(listeners.size, 0)
    continue
  }
  if (platform === 'error' || platform === 'timeout') {
    assert.equal(warnings, 1)
    assert.equal(root.dataset.keyboardOpen, 'false')
    assert.equal(listeners.size, 0)
    continue
  }
  assert.equal(mode, 'none')
  assert.equal(accessory, true)
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
const dismissalSource = await readFile(new URL('../src/lib/iosKeyboard.ts', import.meta.url), 'utf8')
const dismissalJS = ts.transpileModule(dismissalSource.replace(/^import .*$/gm, '').replace(/^export /gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
for (const platform of ['ios', 'android']) {
  const events = new Map()
  const options = new Map()
  const pending = []
  let hidden = 0
  let blurred = 0
  class Element {
    constructor(selectors = [], parent = null) { this.selectors = selectors; this.parent = parent }
    matches(selector) { return selector.split(',').some(s => this.selectors.includes(s.trim())) }
    closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector) }
    blur() { blurred++ }
  }
  const input = new Element(['input', 'input[data-dismiss-on-enter]'])
  const context = { Capacitor: { getPlatform: () => platform }, Keyboard: { hide: async () => { hidden++ } },
    document: { activeElement: input, addEventListener: (name, fn, option) => { events.set(name, fn); options.set(name, option) } },
    window: { setTimeout: fn => pending.push(fn) }, Element, HTMLElement: Element }
  vm.runInNewContext(dismissalJS + '\ninstallIOSKeyboardDismissal()', context)
  if (platform === 'android') { assert.equal(events.size, 0); continue }
  const click = (event, action = () => {}) => {
    events.get('click')(event)
    action()
    while (pending.length) pending.shift()()
  }
  let prevented = 0
  events.get('keydown')({ key: 'Enter', target: input, preventDefault: () => { prevented++ } })
  assert.equal(hidden, 1)
  assert.equal(blurred, 1)
  assert.equal(prevented, 1)
  events.get('keydown')({ key: 'Enter', target: new Element(['textarea']) })
  events.get('keydown')({ key: 'Enter', target: input, isComposing: true })
  assert.equal(hidden, 1)
  for (const selector of ['input', 'textarea', 'select', '.quantity-stepper', '.search-clear']) {
    click({ target: new Element([selector]) })
  }
  assert.equal(hidden, 1)
  assert.equal(events.has('pointerdown'), false)
  assert.equal(options.get('click'), true, 'Capture observes controls that stop click propagation')
  assert.equal(events.has('touchend'), true)
  for (const selector of ['.catalog-table-row', 'button', '.tab', '.filter-chip']) {
    const target = new Element([], new Element([selector]))
    const before = hidden
    events.get('touchstart')({ target, touches: [{ clientX: 0, clientY: 0 }] })
    events.get('touchend')({ target })
    assert.equal(hidden, before, `${selector}: no layout-changing dismissal before click`)
    let actions = 0
    click({ target, preventDefault: () => assert.fail('Outside dismissal must not cancel clicks'), stopPropagation: () => assert.fail('Outside dismissal must not stop propagation') }, () => {
      assert.equal(hidden, before, `${selector}: action runs before keyboard dismissal`)
      actions++
    })
    assert.equal(actions, 1)
    assert.equal(hidden, before + 1, `${selector}: one click both acts and dismisses`)
  }
  const invalid = new Element(['input', '[aria-invalid="true"]'])
  const beforeInvalid = { hidden, blurred }
  click({ target: new Element(['button']) }, () => { context.document.activeElement = invalid })
  assert.equal(hidden, beforeInvalid.hidden, 'Submit validation keeps the keyboard open for the invalid field')
  assert.equal(blurred, beforeInvalid.blurred, 'Deferred dismissal must not blur the newly focused invalid field')
  context.document.activeElement = null
  click({ target: new Element() })
  assert.equal(hidden, beforeInvalid.hidden + 1, 'Dismissal tolerates no active field')
  context.document.activeElement = input
  hidden = 1
  click({ target: new Element() })
  assert.equal(hidden, 2)
  assert.equal(events.has('scroll'), false)
  const surface = new Element(['.catalog-scroll'])
  events.get('touchstart')({ target: surface, touches: [{ clientX: 0, clientY: 0 }] })
  events.get('touchmove')({ touches: [{ clientX: 0, clientY: 3 }] })
  assert.equal(hidden, 2)
  events.get('touchmove')({ touches: [{ clientX: 0, clientY: 30 }] })
  assert.equal(hidden, 3)
  events.get('touchmove')({ touches: [{ clientX: 0, clientY: 60 }] })
  assert.equal(hidden, 3)
  events.get('touchstart')({ target: null, touches: [] })
  events.get('touchmove')({ touches: [] })
  assert.equal(hidden, 3)
}
const storeSource = await readFile(new URL('../src/store/app.ts', import.meta.url), 'utf8')
const storeAst = ts.createSourceFile('app.ts', storeSource, ts.ScriptTarget.Latest, true)
const transitions = []
function visit(node) {
  if (ts.isPropertyAssignment(node) && ['setTab', 'setSheet'].includes(node.name.getText(storeAst))) transitions.push(node.initializer.getText(storeAst))
  ts.forEachChild(node, visit)
}
visit(storeAst)
assert.equal(transitions.length, 2)
for (const transition of transitions) {
  const order = []
  const js = ts.transpileModule(`(${transition})(null)`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(js, { dismissIOSKeyboard: () => order.push('dismiss'), set: () => order.push('transition') })
  assert.deepEqual(order, ['dismiss', 'transition'])
}
console.log('iOS keyboard: ok (geometry, Done, Return, tap, single-tap actions, invalid submit focus retained, no active field, user drag, transitions, init rejection/timeout; Android untouched)')
