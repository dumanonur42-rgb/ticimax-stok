import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
const ast = ts.createSourceFile('app.tsx', app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'focusOnEnter').getText(ast)
const code = ts.transpileModule(declaration, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
for (const platform of ['ios', 'android', 'web']) for (const mode of ['empty-words', 'empty-sentences', 'populated', 'none', 'characters', 'missing']) for (const previousCapitalization of ['none', 'words']) {
  const events = []
  const timers = []
  const body = {}
  const document = { activeElement: null, visibilityState: 'visible' }
  class Element { autocapitalize = previousCapitalization; blur() { events.push('blur'); document.activeElement = body } }
  class Input extends Element { value = mode === 'populated' ? 'Existing' : ''; autocapitalize = mode === 'empty-sentences' ? 'sentences' : ['none', 'characters'].includes(mode) ? mode : 'words'; isConnected = true; disabled = false; focus() { events.push('focus'); document.activeElement = this } }
  const next = mode === 'missing' ? null : new Input()
  document.activeElement = new Element()
  document.getElementById = () => next
  const ctx = { Capacitor: { getPlatform: () => platform }, HTMLElement: Element, HTMLInputElement: Input, document,
    window: { setTimeout: (callback, delay) => { assert.equal(delay, 75); timers.push(callback) } } }
  vm.runInNewContext(code, ctx)
  ctx.focusOnEnter('next')({ key: 'Tab', preventDefault: () => assert.fail('Tab intercepted') })
  assert.deepEqual(events, [])
  ctx.focusOnEnter('next')({ key: 'Enter', preventDefault: () => events.push('prevent') })
  const deferred = platform === 'ios' && ['empty-words', 'empty-sentences'].includes(mode)
  assert.deepEqual(events, mode === 'missing' ? ['prevent'] : deferred ? ['prevent', 'blur'] : ['prevent', 'focus'])
  assert.equal(timers.length, deferred ? 1 : 0)
  for (const callback of timers) callback()
  assert.deepEqual(events, mode === 'missing' ? ['prevent'] : deferred ? ['prevent', 'blur', 'focus'] : ['prevent', 'focus'])
  if (deferred) {
    const callback = timers[0]
    for (const cancellation of ['other-focus', 'removed', 'disabled', 'filled', 'background']) {
      document.activeElement = body; document.visibilityState = 'visible'; next.isConnected = true; next.disabled = false; next.value = ''
      if (cancellation === 'other-focus') document.activeElement = new Element()
      if (cancellation === 'removed') next.isConnected = false
      if (cancellation === 'disabled') next.disabled = true
      if (cancellation === 'filled') next.value = 'Changed'
      if (cancellation === 'background') document.visibilityState = 'hidden'
      const count = events.length
      callback()
      assert.equal(events.length, count, cancellation)
    }
  }
}
assert.match(css, /:root\[data-platform='ios'\]\[data-keyboard-open='true'\] \.login-screen\[data-mode='login'\] \.login-logo \{ display: none; \}/)
assert.match(css, /:root\[data-platform='ios'\]\[data-keyboard-open='true'\] \.login-screen\[data-mode='login'\] \.login-hero \{ padding-bottom: 28px; \}/)
assert.match(app, /id="username"\s+autoComplete="username"\s+autoCapitalize="none"/)
for (const id of ['company-name', 'display-name']) assert.match(app, new RegExp(`id="${id}"\\s+autoComplete="[^"]+"\\s+autoCapitalize="words"`))
console.log('iOS login: ok (75ms Next blur/refocus for empty words/sentences, username/name source states, no early focus, cancelled stale/background targets, populated/password/missing targets and Android/web unchanged; hero safeguard retained)')
