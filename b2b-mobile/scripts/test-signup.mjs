import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const cloud = await readFile(new URL('../src/lib/cloud.ts', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const parse = source => ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const ast = parse(cloud)
const declaration = name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast).replace(/^export /, '')
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
for (const mode of ['success', 'empty-name', 'username', 'company', 'password', 'mismatch', 'api-error']) {
  const created = []
  const context = { SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'fake-key',
    loginEmail: async username => `${username}@example.invalid`, errorMessage: error => error.message,
    createClient: (url, key, options) => {
      assert.equal(options.auth.persistSession, false)
      assert.equal(options.auth.autoRefreshToken, false)
      assert.equal(options.auth.detectSessionInUrl, false)
      return { auth: { signUp: async input => { created.push(input); return { error: mode === 'api-error' ? new Error('Sign-up failed') : null } } } }
    } }
  vm.runInNewContext(compile(declaration('validateCredentials') + '\n' + declaration('signUp')), context)
  const input = { username: mode === 'username' ? '' : ' İpek   Usta ', companyName: mode === 'company' ? '' : ' Test Bayi ',
    displayName: mode === 'empty-name' ? '' : ' İpek Usta ', password: mode === 'password' ? '123' : 'test-only-password' }
  if (['username', 'company', 'password', 'api-error'].includes(mode)) await assert.rejects(context.signUp(input))
  else await context.signUp(input)
  assert.equal(created.length, ['username', 'company', 'password'].includes(mode) ? 0 : 1)
  if (created.length) {
    assert.equal(created[0].options.data.username, 'İpek Usta')
    assert.equal(created[0].options.data.company_name, 'Test Bayi')
    assert.equal(created[0].options.data.display_name, mode === 'empty-name' ? 'Test Bayi' : 'İpek Usta')
  }
}
const appAst = parse(app)
let onLogin
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(appAst) === 'onLogin') onLogin = node.initializer.getText(appAst)
  ts.forEachChild(node, visit)
}
visit(appAst)
for (const mode of ['success', 'username', 'company', 'password', 'password2', 'api-error']) {
  let calls = 0, error, notice, focused, switched
  const busy = []
  const context = { loginMode: 'register', loginName: mode === 'username' ? '' : 'test-user', companyName: mode === 'company' ? '' : 'Test Bayi',
    displayName: '', password: mode === 'password' ? 'x' : 'test-only-password', password2: mode === 'password2' ? 'different' : 'test-only-password',
    setLoginError: value => { error = value }, setLoginNotice: value => { notice = value }, setLoginFieldError() {},
    setLoginBusy: value => busy.push(value), setCompanyName() {}, setDisplayName() {},
    switchLoginMode: value => { switched = value }, document: { getElementById: id => ({ focus: () => { focused = id } }) },
    signUp: async () => { calls++; if (mode === 'api-error') throw new Error('Sign-up failed') },
    signIn: () => assert.fail('Registration must not sign in'), userFacingError: error => error.message }
  vm.runInNewContext(compile(`globalThis.onLogin = ${onLogin}`), context)
  await context.onLogin({ preventDefault() {} })
  if (['username', 'company', 'password', 'password2'].includes(mode)) {
    assert.equal(calls, 0)
    assert.equal(focused, mode === 'company' ? 'company-name' : mode)
    assert.deepEqual(busy, [])
  } else {
    assert.equal(calls, 1)
    assert.deepEqual(busy, [true, false])
    if (mode === 'success') { assert.equal(switched, 'login'); assert.match(notice, /yönetici/); assert.equal(error, '') }
    else assert.equal(error, 'Sign-up failed')
  }
}
console.log('Sign-up: ok (mock-only API, validation, metadata, empty optional name, approval notice, API error, no automatic sign-in)')
