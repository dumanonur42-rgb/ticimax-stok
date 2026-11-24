import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const main = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
const parse = source => ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const ast = parse(app)
const fields = new Map()
function visit(node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'input') {
    const attrs = new Map(node.attributes.properties.map(prop => [prop.name?.getText(ast), prop.initializer?.getText(ast)]))
    const id = attrs.get('id')?.replaceAll('"', '')
    if (id) fields.set(id, attrs)
  }
  ts.forEachChild(node, visit)
}
visit(ast)
assert.equal(fields.get('username').get('autoCapitalize'), '"none"')
for (const id of ['company-name', 'display-name']) assert.equal(fields.get(id).get('autoCapitalize'), '"words"')
assert.equal(fields.get('username').has('maxLength'), false)
assert.match(app, /className=\{`login-screen[^\n]+data-mode=\{loginMode\}/)
assert.match(app, /className="login-hero"/)
assert.match(app, /className="button primary wide login-submit"/)
assert.doesNotMatch(css, /--login-top|\.password-wrap/)
assert.match(css, /:root\[data-platform='ios'\] \.login-screen \{ padding-bottom: 0; \}/)
for (const id of ['username', 'company-name', 'display-name']) assert.equal(fields.get(id).get('enterKeyHint'), '"next"')
assert.equal(fields.get('password').get('autoComplete'), "{registering ? 'new-password' : 'current-password'}")
assert.equal(fields.get('password2').get('autoComplete'), '"new-password"')
assert.equal(fields.get('password').get('enterKeyHint'), "{registering ? 'next' : 'go'}")
assert.equal(fields.get('password2').get('enterKeyHint'), '"go"')
assert.match(fields.get('username').get('onKeyDown'), /registering \? 'company-name' : 'password'/)
for (const [from, to] of [['company-name', 'display-name'], ['display-name', 'password'], ['password', 'password2']]) assert.ok(fields.get(from).get('onKeyDown').includes(`focusOnEnter('${to}')`))
const declaration = (ast, name) => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast)
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
let focused
let prevented = false
const context = { document: { getElementById: id => ({ focus: () => { focused = id } }) } }
vm.runInNewContext(compile(declaration(ast, 'focusOnEnter')), context)
for (const id of ['company-name', 'display-name', 'password', 'password2']) {
  context.focusOnEnter(id)({ key: 'Enter', preventDefault: () => { prevented = true } })
  assert.equal(focused, id)
  assert.equal(prevented, true)
}
context.focusOnEnter('ignored')({ key: 'Tab', preventDefault: () => assert.fail('Tab must keep normal navigation') })
assert.equal(focused, 'password2')
for (const [height, keyboard] of [[667, 296], [956, 346]]) {
  for (let fieldIndex = 0; fieldIndex < 5; fieldIndex++) {
    let scroll = 0
    const submit = { top: height - keyboard - 68, bottom: height - keyboard - 16 }
    const hero = {}
    const login = { dataset: { mode: 'register' }, getBoundingClientRect: () => ({ top: 0 }),
      querySelector: selector => selector === '.login-hero' ? hero : ({ getBoundingClientRect: () => submit }), scrollBy: ({ top }) => { scroll += top } }
    class Field {
      matches() { return true }
      closest() { return login }
      getBoundingClientRect() { return { top: 200 + fieldIndex * 108 - scroll, bottom: 248 + fieldIndex * 108 - scroll } }
    }
    const field = new Field()
    const context = { root: {}, Capacitor: { getPlatform: () => 'ios' }, HTMLElement: Field, document: { activeElement: field },
      window: { innerHeight: height }, requestAnimationFrame: fn => fn(),
      getComputedStyle: element => element === hero ? { paddingTop: '22px' } : { getPropertyValue: () => `${keyboard}px` } }
    vm.runInNewContext(compile(declaration(parse(main), 'scrollFocusedField')) + '\nscrollFocusedField()', context)
    assert.ok(field.getBoundingClientRect().top >= 34)
    assert.ok(field.getBoundingClientRect().bottom <= submit.top - 12)
    assert.ok(submit.bottom < height - keyboard)
  }
}
assert.match(css, /:root\[data-platform='ios'\]\[data-keyboard-open='true'\] \.login-screen\[data-mode='register'\] button\[type='submit'\][\s\S]*?position: sticky/)
console.log('iOS register: ok (redesigned hero/fields, 5-field SE/Pro Max geometry, pinned submit, Next chain, capitalization/autocomplete, unlimited username; iOS-only layout adaptation)')
