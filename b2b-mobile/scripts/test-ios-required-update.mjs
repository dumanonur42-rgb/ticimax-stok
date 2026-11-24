import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const updates = await readFile(new URL('../src/lib/updates.ts', import.meta.url), 'utf8')
const cloud = await readFile(new URL('../src/lib/cloud.ts', import.meta.url), 'utf8')
const version = await readFile(new URL('../../b2b-app/src/shared/version.ts', import.meta.url), 'utf8')
const parse = (name, source) => ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const ast = parse('App.tsx', app)
const appNode = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'App')
const effects = appNode.body.statements.filter(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(ast) === 'useEffect').map(node => node.expression)
const effect = effects.find(node => node.arguments[0].getText(ast).includes("minimumVersionFor('ios', settings)"))
assert.ok(effect, 'separate iOS update effect')
assert.equal(effect.arguments[1].getText(ast), '[platform, settings.min_version_ios]')
const android = effects.find(node => node.arguments[0].getText(ast).includes('AppUpdate.getAppUpdateInfo()'))
assert.ok(android.arguments[0].getText(ast).includes("Capacitor.getPlatform() !== 'android' || platform !== 'android'"))
assert.doesNotMatch(effect.getText(ast), /AppUpdate\.|checkLiveUpdate\(|checkAndroidUpdate\(/)
assert.doesNotMatch(app, /AppUpdate\.openAppStore/)

const declaration = (source, name) => {
  const tree = parse('helper.ts', source)
  return tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(tree)
}
const cacheKey = cloud.match(/const MIN_VERSION_CACHE = ('[^']+')/)[1]
const helpers = `${declaration(cloud, 'cachedMinimumVersion')}\n${declaration(updates, 'minimumVersionFor')}\n${declaration(version, 'compareVersions')}`
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const compiled = compile(`const MIN_VERSION_CACHE = ${cacheKey};\n${helpers}\nexports.install = ${effect.arguments[0].getText(ast)}`)
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function setup({ platform = 'ios', nativePlatform = platform, current = '1.0.10', minimum, cached, offline = false, infoError = false, listenerError = false, infoDeferred, listenerDeferred, storageError = false } = {}) {
  const settings = { min_version_ios: minimum }
  const storage = new Map(cached === undefined ? [] : [['yb2b.minimumVersions', JSON.stringify(cached)]])
  const calls = { info: 0, listener: 0, removed: 0, states: [], warnings: [] }
  let resume
  const handle = { remove: async () => { calls.removed++ } }
  const context = vm.createContext({
    exports: {}, APP_VERSION: '1.0.10', platform, settings,
    Capacitor: { getPlatform: () => nativePlatform },
    CapacitorApp: {
      getInfo: async () => {
        calls.info++
        if (infoError) throw new Error('info unavailable')
        if (infoDeferred) return infoDeferred.promise
        return { version: current }
      },
      addListener: (event, callback) => {
        calls.listener++
        assert.equal(event, 'resume')
        resume = callback
        return listenerError ? Promise.reject(new Error('listener unavailable')) : listenerDeferred ? listenerDeferred.promise : Promise.resolve(handle)
      }
    },
    setRequiredUpdate: state => calls.states.push(state === null ? null : { ...state }),
    localStorage: { getItem: key => { if (storageError) throw new Error('storage unavailable'); return storage.get(key) ?? null } },
    navigator: { onLine: !offline }, console: { warn: (...args) => calls.warnings.push(args) },
    AppUpdate: new Proxy({}, { get: () => { assert.fail('iOS must not access AppUpdate') } })
  })
  vm.runInContext(compiled, context)
  return { calls, storage, settings, handle, install: () => context.exports.install(), resume: () => resume() }
}

for (const [current, minimum, required] of [
  ['1.0.9', '1.0.10', true], ['1.0.10', '1.0.10', false], ['1.1.0', '1.0.10', false], ['1.0.10', undefined, false], ['1.0.10', '', false]
]) {
  const test = setup({ current, minimum })
  const cleanup = test.install()
  await flush()
  assert.deepEqual(test.calls.states, [required ? { platform: 'ios', version: minimum } : null])
  assert.equal(test.calls.info, 1)
  assert.equal(test.calls.listener, 1)
  cleanup()
  assert.equal(test.calls.removed, 1)
}

for (const [cached, required] of [
  [{ min_version_ios: '1.0.11' }, '1.0.11'], [{ min_version_ios: '1.0.10' }, null], [{ min_version_ios: '0.9.0' }, null],
  [{ min_version_android: '99.0.0' }, null], [{ min_version_ios: 'invalid' }, null], [{ min_version_ios: 99 }, null], [null, null]
]) {
  const test = setup({ cached, offline: true })
  const cleanup = test.install()
  await flush()
  assert.deepEqual(test.calls.states, [required ? { platform: 'ios', version: required } : null])
  cleanup()
}
for (const badCache of ['{', '[]']) {
  const test = setup({ offline: true })
  test.storage.set('yb2b.minimumVersions', badCache)
  const cleanup = test.install()
  await flush()
  assert.deepEqual(test.calls.states, [null], 'malformed cached minimum does not block')
  cleanup()
}
for (const options of [{ infoError: true }, { current: '' }, { storageError: true, cached: { min_version_ios: '99.0.0' } }]) {
  const test = setup({ ...options, minimum: options.storageError ? undefined : '1.0.11' })
  const cleanup = test.install()
  await flush()
  assert.deepEqual(test.calls.states, [options.storageError ? null : { platform: 'ios', version: '1.0.11' }])
  cleanup()
}

const resume = setup({ offline: true, cached: { min_version_ios: '1.0.11' } })
const cleanupResume = resume.install()
await flush()
resume.storage.set('yb2b.minimumVersions', JSON.stringify({ min_version_ios: '1.0.10' }))
await resume.resume()
assert.deepEqual(resume.calls.states.at(-1), null, 'resume clears the gate when no longer required')
resume.settings.min_version_ios = '1.0.12'
await resume.resume()
assert.deepEqual(resume.calls.states.at(-1), { platform: 'ios', version: '1.0.12' }, 'settings take priority over cached minimum')
assert.equal(resume.calls.info, 3)
cleanupResume()
await resume.resume()
assert.equal(resume.calls.states.length, 3, 'disposed resume cannot update state')

for (const [platform, nativePlatform] of [['android', 'android'], ['web', 'web'], ['ios', 'android'], ['android', 'ios']]) {
  const test = setup({ platform, nativePlatform, minimum: '99.0.0' })
  assert.equal(test.install(), undefined)
  await flush()
  assert.equal(test.calls.info, 0)
  assert.equal(test.calls.listener, 0)
  assert.deepEqual(test.calls.states, [])
}

const pendingListener = deferred()
const late = setup({ listenerDeferred: pendingListener })
const cleanupLate = late.install()
await flush()
cleanupLate()
pendingListener.resolve(late.handle)
await flush()
assert.equal(late.calls.removed, 1, 'late listener registration is cleaned up')
const failed = setup({ listenerError: true })
const cleanupFailed = failed.install()
await flush()
assert.equal(failed.calls.warnings.length, 1)
cleanupFailed()

const pendingInfo = deferred()
const stale = setup({ infoDeferred: pendingInfo, minimum: '99.0.0' })
const cleanupStale = stale.install()
const recheck = stale.resume()
pendingInfo.resolve({ version: '1.0.10' })
await recheck
await flush()
assert.equal(stale.calls.states.length, 1, 'only the latest overlapping check can update state')
cleanupStale()

let button
function visit(node) {
  if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'onClick' && node.initializer?.expression?.getText(ast).includes("requiredUpdate.platform === 'ios'")) button = node.initializer.expression
  ts.forEachChild(node, visit)
}
visit(ast)
assert.ok(button, 'required-update button handler')
const opened = []
const buttonContext = { exports: {}, requiredUpdate: { platform: 'ios', version: '99.0.0' }, external: url => opened.push(url), androidReleasesPage: () => 'android-release-page' }
vm.runInNewContext(compile(`exports.click = ${button.getText(ast)}`), buttonContext)
buttonContext.exports.click()
assert.deepEqual(opened, ['https://apps.apple.com/tr/app/yamansa-rulman-b2b/id6832507420'])
buttonContext.requiredUpdate = { platform: 'android', url: 'android-apk-url' }
buttonContext.exports.click()
assert.equal(opened.at(-1), 'android-apk-url')
buttonContext.requiredUpdate = { platform: 'android' }
buttonContext.exports.click()
assert.equal(opened.at(-1), 'android-release-page')
console.log('iOS required update: ok (below/equal/above/empty minimum, native-version fallback, offline cached minimum, resume set/clear, stale checks/listener cleanup, Android/web inert, external App Store URL; no AppUpdate calls)')
