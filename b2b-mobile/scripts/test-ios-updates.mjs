import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/updates.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source.replace(/^import .*\n/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText
for (const platform of ['ios', 'web', 'android']) {
  let calls = 0
  let manifest = { version: '1.0.9', versionCode: 10, apkUrl: 'https://github.com/dumanonur42-rgb/ticimax-stok/releases/download/test/app.apk', sha256: 'a'.repeat(64) }
  const api = {}
  const context = vm.createContext({
    exports: api, __APP_VERSION__: '1.0.8', console, Date,
    Capacitor: { getPlatform: () => platform },
    localStorage: { getItem: () => null, setItem: () => {} },
    navigator: { onLine: true },
    fetch: async () => { calls++; return { ok: true, json: async () => manifest } },
    compareVersions: (a, b) => a.localeCompare(b),
    AppUpdate: new Proxy({}, { get: () => () => { throw new Error('Unexpected native call') } }),
    CapacitorUpdater: new Proxy({}, { get: () => () => { throw new Error('Unexpected updater call') } })
  })
  vm.runInContext(js, context)
  if (platform === 'android') {
    assert.equal((await api.checkAndroidUpdate()).version, '1.0.9')
    manifest = { ...manifest, version: '1.0.8' }
    assert.equal(await api.checkAndroidUpdate(), null)
    manifest = {}
    await assert.rejects(api.checkAndroidUpdate(), /Invalid Android update manifest/)
    assert.equal(calls, 3)
  } else {
    assert.equal(await api.checkAndroidUpdate(), null)
    await api.checkLiveUpdate()
    await api.completePendingFlexibleUpdate()
    await (await api.startFlexibleUpdateListener()).remove()
    assert.equal(calls, 0)
  }
}
console.log('Update platform gates: ok (iOS/web inert; Android update, empty, invalid manifest)')
