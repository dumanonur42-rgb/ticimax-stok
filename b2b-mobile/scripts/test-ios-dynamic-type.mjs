import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/iosDynamicType.ts', import.meta.url), 'utf8')
const swift = await readFile(new URL('../ios/App/App/DynamicTypeViewController.swift', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
const storyboard = await readFile(new URL('../ios/App/App/Base.lproj/Main.storyboard', import.meta.url), 'utf8')
const expected = { extraLarge: 1.05, extraExtraLarge: 1.10, extraExtraExtraLarge: 1.15,
  accessibilityMedium: 1.20, accessibilityLarge: 1.225, accessibilityExtraLarge: 1.25,
  accessibilityExtraExtraLarge: 1.275, accessibilityExtraExtraExtraLarge: 1.30 }
assert.deepEqual(Object.fromEntries([...swift.matchAll(/case \.(\w+): return ([\d.]+)/g)].map(([, key, value]) => [key, Number(value)])), expected)
assert.match(swift, /default: return 1\.0/)
assert.match(swift, /UIContentSizeCategory\.didChangeNotification, UIApplication\.didBecomeActiveNotification/)
assert.match(swift, /registerPluginInstance\(DynamicTypePlugin\(\)\)/)
assert.match(swift, /deinit[\s\S]*?removeObserver/)
assert.match(storyboard, /customClass="DynamicTypeViewController" customModule="App"/)
const js = ts.transpileModule(source.replace(/^import .*$/gm, '').replace(/^export /gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
function setup(platform = 'ios', reject = false) {
  const values = new Map(), dataset = {}
  let listener, complete, changed = 0, calls = 0
  const plugin = { addListener: async (_, fn) => { calls++; if (reject) throw Error('missing'); listener = fn; return { remove() {} } },
    getCurrent: () => { calls++; return reject ? Promise.reject(Error('missing')) : new Promise(resolve => { complete = resolve }) } }
  const context = { Capacitor: { getPlatform: () => platform }, registerPlugin: () => plugin,
    document: { documentElement: { dataset, style: { setProperty: (key, value) => values.set(key, value) } } },
    requestAnimationFrame: fn => fn() }
  vm.runInNewContext(js, context)
  assert.equal(context.initializeIOSDynamicType(() => changed++), undefined, 'Initialization must never block rendering')
  return { values, dataset, send: value => listener(value), complete: value => complete(value), counts: () => ({ changed, calls }) }
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }
const normal = setup()
normal.complete({ scale: 1 })
await flush()
assert.equal(normal.values.get('--ios-font-size'), '16px')
assert.equal(normal.dataset.iosTextEnlarged, 'false')
for (const scale of Object.values(expected)) {
  normal.send({ scale })
  assert.equal(normal.values.get('--ios-font-size'), `${16 * scale}px`)
  assert.equal(normal.dataset.iosTextEnlarged, 'true')
}
normal.send({ scale: 99 })
assert.equal(normal.values.get('--ios-font-size'), '20.8px')
normal.send({ scale: -2 })
assert.equal(normal.values.get('--ios-font-size'), '16px')
const before = normal.counts().changed
for (const value of [null, {}, { scale: NaN }, { scale: Infinity }, { scale: '1.3' }]) normal.send(value)
assert.equal(normal.counts().changed, before)
const raced = setup()
raced.send({ scale: 1.3 })
raced.complete({ scale: 1 })
await flush()
assert.equal(raced.values.get('--ios-font-size'), '20.8px', 'Stale startup reply must not overwrite a newer notification')
const missing = setup('ios', true)
await flush()
assert.equal(missing.values.size, 0)
const android = setup('android')
assert.deepEqual(android.counts(), { changed: 0, calls: 0 })
assert.equal(android.values.size, 0)
const styles = css.slice(css.indexOf(':root[data-platform=\'ios\'] { font-size: var(--ios-font-size'))
assert.ok(styles.length > 0)
for (const selector of ['.tab {', '.catalog-scroll.table-view {', '.cart-sticky-summary {', '.cart-page {', '.login-screen']) assert.ok(styles.includes(selector))
assert.match(styles, /max\(16px, 1rem\)/)
assert.match(styles, /overflow-x: auto/)
assert.match(styles, /var\(--cart-summary-height\)/)
assert.match(styles, /@media \(min-width: 560px\)/)
for (const variant of ['has-shelf:not(.no-price)', ':not(.has-shelf):not(.no-price)', 'no-price.has-shelf', 'no-price:not(.has-shelf)']) assert.ok(styles.includes(variant))
console.log('iOS Dynamic Type: ok (native category map 1.0–1.3, startup/change/foreground wiring, stale reply, empty/invalid/error, nonblocking init, Android inert; tab/table/form/cart safeguards)')
