import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
const ast = ts.createSourceFile('app.tsx', app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'focusOnEnter').getText(ast)
const code = ts.transpileModule(declaration, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
for (const platform of ['ios', 'android', 'web']) for (const mode of ['empty-words', 'populated', 'none', 'missing']) {
  const events = []
  class Element { blur() { events.push('blur') } }
  class Input extends Element { value = mode === 'populated' ? 'Existing' : ''; autocapitalize = mode === 'none' ? 'none' : 'words'; focus() { events.push('focus') } }
  const ctx = { Capacitor: { getPlatform: () => platform }, HTMLElement: Element, HTMLInputElement: Input, document: { activeElement: new Element(), getElementById: () => mode === 'missing' ? null : new Input() } }
  vm.runInNewContext(code, ctx)
  ctx.focusOnEnter('next')({ key: 'Tab', preventDefault: () => assert.fail('Tab intercepted') })
  assert.deepEqual(events, [])
  ctx.focusOnEnter('next')({ key: 'Enter', preventDefault: () => events.push('prevent') })
  assert.deepEqual(events, mode === 'missing' ? ['prevent'] : platform === 'ios' && mode === 'empty-words' ? ['prevent', 'blur', 'focus'] : ['prevent', 'focus'])
}
assert.match(css, /:root\[data-platform='ios'\]\[data-keyboard-open='true'\] \.login-screen\[data-mode='login'\] \.login-logo \{ display: none; \}/)
assert.match(css, /:root\[data-platform='ios'\]\[data-keyboard-open='true'\] \.login-screen\[data-mode='login'\] \.login-hero \{ padding-bottom: 28px; \}/)
console.log('iOS login: ok (keyboard-open login hides logo and reduces hero, iOS-only synchronous Next blur/focus for empty words fields, populated/password/missing targets and Android/web unchanged)')
