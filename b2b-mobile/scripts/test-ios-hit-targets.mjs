import assert from 'node:assert/strict'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import vm from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as icons from 'lucide-react'
import ts from 'typescript'

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
const mark = 'data:image/png;base64,' + (await readFile(new URL('../src/assets/mark.png', import.meta.url))).toString('base64')
const ast = ts.createSourceFile('App.tsx', app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const functions = ['ProductsPage', 'ProductTableRow', 'variantShelfRows', 'shelfRowsLabel', 'ProductAddButton', 'ProductCartActions', 'ProductCard', 'QuantityStepper', 'Sheet'].map(name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast)).join('\n')
let detailHeader, requiredGate
function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(attribute => attribute.name?.getText(ast) === 'className' && attribute.initializer?.getText(ast) === '"detail-product-header"')) detailHeader = node.getText(ast)
  if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(attribute => attribute.name?.getText(ast) === 'className' && attribute.initializer?.getText(ast).includes('`required-update'))) requiredGate = node.getText(ast)
  ts.forEachChild(node, visit)
}
visit(ast)
assert.ok(detailHeader)
assert.ok(requiredGate)
const product = { id: 1, sku: '6205-2RS C3', brand: 'SKF', name: 'Rulman', description: '', stock: 10, unit: 'Adet', price: 125, currency: 'TRY', min_order: 1, box: 'Kutulu', d_inner: 25, d_outer: 52, width: 15, locations: [], shelf: '' }
const state = { catalogBrands: [], catalogDimensions: {}, setSheet() {}, setSelectedProduct() {}, lines: [], add() {}, setQty() {} }
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText
const boxSource = await readFile(new URL('../src/components/BoxBadge.tsx', import.meta.url), 'utf8')
function markup(platform, surface, { empty = false, showPrices = true, canShelf = false } = {}) {
  const dark = surface === 'required-dark'
  const ctx = { React, ...React, ...icons, renderToStaticMarkup, product, dark, mark,
    requiredUpdate: { platform, version: '99.0.0' },
    session: { user: { perms: canShelf ? ['shelf'] : [] } }, settings: { show_prices_to_dealers: showPrices, low_stock_threshold: 5 },
    entries: empty ? [] : [product], variantIndex: new Map(),
    Capacitor: { getPlatform: () => platform }, useApp: select => select(state), useCart: select => select(state),
    useVirtualizer: () => ({ measure() {}, measureElement() {}, getTotalSize: () => 120, getVirtualItems: () => empty ? [] : [{ index: 0, key: 1, start: 0 }] }),
    searchProducts: entries => entries, hasPerm: (user, perm) => user.perms.includes(perm), performance: { now: () => 0 },
    num: value => String(value), displayPrice: () => '₺125,00', brandOrigin: brand => ({ base: brand }), productVariantKey: () => 'key', boxParts: () => null, shelfBreakdown: () => [], locationLabel: () => '',
    localStorage: { getItem: () => null }, onClose() {}, onToast() {}, copy() {}, share() {}, copySheetOpen: false, onCopySheetOpenChange() {}, brand: { base: 'SKF' }
  }
  const expression = surface.startsWith('required-') ? requiredGate : surface === 'catalog'
    ? '<ProductsPage entries={entries} variantIndex={variantIndex} settings={settings} session={session} loading={false} onToast={onToast}/>'
    : surface === 'card'
      ? '<div className="page"><ProductCard product={product} variantIndex={variantIndex} settings={settings} showPrices={true} canShelf={false} onOpen={()=>{}} onToast={onToast}/><div className="cart-line"><div className="cart-line-bottom"><strong>₺125,00</strong><QuantityStepper qty={1} min={1} sku={product.sku} setQty={()=>{}}/></div></div></div>'
      : `<Sheet title="Ürün bilgisi" onClose={onClose}>${detailHeader}<div className="product-actions detail-actions"><ProductCartActions product={product} onToast={onToast}/></div></Sheet>`
  vm.runInNewContext(compile(boxSource.replace(/^import .*$/gm, '').replace(/^export /gm, '') + '\n' + functions + '\nglobalThis.markup=renderToStaticMarkup(' + expression + ')'), ctx)
  if (surface.startsWith('required-')) return ctx.markup + `<div class="app-shell${dark ? ' dark' : ''}" style="position:fixed;left:-10000px;top:0;width:375px"><button id="primary-reference" class="button primary">Primary</button></div>`
  return `<div class="app-shell"><main class="main-content">${ctx.markup}</main></div>`
}

const candidates = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', `${process.env.HOME}/.local/bin/google-chrome`].filter(Boolean)
let executable
for (const candidate of candidates) { try { await access(candidate); executable = candidate; break } catch {} }
assert.ok(executable, 'Headless Chrome required; set CHROME_BIN to its executable')
const profile = await mkdtemp(join(tmpdir(), 'yamansa-hit-targets-'))
const chrome = spawn(executable, ['--headless', '--disable-gpu', '--no-sandbox', '--no-first-run', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
const exit = new Promise(resolve => chrome.once('exit', resolve))
let socket
const watchdog = setTimeout(() => chrome.kill(), 90000)
try {
  const url = await new Promise((resolve, reject) => {
    let output = ''
    chrome.stderr.on('data', data => { output += data; const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) resolve(match[1]) })
    chrome.once('error', reject)
    chrome.once('exit', () => reject(new Error('Chrome exited before ready')))
  })
  socket = new WebSocket(url)
  await new Promise(resolve => { socket.onopen = resolve })
  let sequence = 0
  const pending = new Map()
  socket.onmessage = event => { const data = JSON.parse(event.data); if (!data.id) return; const handler = pending.get(data.id); pending.delete(data.id); data.error ? handler.reject(new Error(JSON.stringify(data.error))) : handler.resolve(data.result) }
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, sessionId })) })
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const cdp = (method, params = {}) => send(method, params, sessionId)
  const evaluate = async expression => {
    const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const measurements = []
  for (const platform of ['ios', 'android']) for (const [width, height] of [[375, 812], [430, 812], [667, 375]]) for (const scale of [1, 1.3]) for (const [surface, options] of [['catalog', {}], ['catalog', { showPrices: false, canShelf: true }], ['catalog', { empty: true }], ['card', {}], ['detail', {}], ['required-light', {}], ['required-dark', {}]]) {
    if (height < 520 && surface !== 'catalog') continue
    const label = `${platform}/${width}/${scale}/${surface}/${JSON.stringify(options)}`
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true })
    const { frameTree } = await cdp('Page.getFrameTree')
    await cdp('Page.setDocumentContent', { frameId: frameTree.frame.id, html: `<!doctype html><html data-platform="${platform}" data-ios-text-enlarged="${scale > 1}" style="--ios-font-size:${16 * scale}px;--ios-viewport-height:${height}px"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style id="app-styles">${css}</style><style>*{animation:none!important;transition:none!important}</style></head><body>${markup(platform, surface, options)}</body></html>` })
    const result = await evaluate(`(() => {
      const rect = element => { const r=element.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height} }
      const selector='.view-toggle button,.quantity-stepper button,.quantity-stepper input,.catalog-table-header button,.detail-copy-actions button,.required-update .button'
      const buttons=[...document.querySelectorAll(selector)]
      const snapshot = () => ({rows:[...document.querySelectorAll('.catalog-table-row')].map(el=>el.getBoundingClientRect().height),columns:[...document.querySelectorAll('.catalog-table-row > [role=cell],.catalog-table-header > [role=columnheader]')].filter(el=>getComputedStyle(el).display!=='none').map(el=>[rect(el).left,rect(el).width]),buttons:buttons.map(el=>({rect:rect(el),background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).border,padding:getComputedStyle(el).padding})),scrollWidth:document.querySelector('.catalog-scroll')?.scrollWidth})
      const current=snapshot()
      const targetFor=el=>({el,hit:rect(el),label:el.getAttribute('aria-label')||el.textContent.trim()})
      const targets=buttons.map(targetFor)
      const layout=()=>[...document.querySelectorAll('.view-toggle,.detail-copy-actions,.detail-heading,.page-heading')].map(rect)
      const currentLayout=layout()
      const legacyButtons=document.createElement('style')
      legacyButtons.textContent=":root[data-platform='ios'] .view-toggle button{min-height:36px!important;margin-block:0!important}:root[data-platform='ios'] .detail-copy-actions .button{min-height:38px!important}@media(max-height:520px){:root[data-platform='ios'] .products-page .view-toggle button{min-height:40px!important}}"
      document.head.append(legacyButtons)
      const previousLayout=layout()
      legacyButtons.remove()
      const overlaps=[]
      for(let i=0;i<targets.length;i++)for(let j=i+1;j<targets.length;j++){
        const a=targets[i].hit,b=targets[j].hit
        if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>.1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>.1)overlaps.push([targets[i].label,targets[j].label])
      }
      for(const target of targets)for(const neighbor of document.querySelectorAll('button,input')){
        if(buttons.includes(neighbor)||target.el.contains(neighbor)||neighbor.contains(target.el))continue
        const a=target.hit,b=rect(neighbor)
        if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>.1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>.1)overlaps.push([target.label,neighbor.getAttribute('aria-label')||neighbor.textContent.trim()])
      }
      const misses=[]
      for(const el of buttons){
        el.scrollIntoView({block:'nearest',inline:'nearest'})
        const {hit:r,label}=targetFor(el)
        for(const [x,y] of [[(r.left+r.right)/2,r.top+1],[(r.left+r.right)/2,r.bottom-1],[r.left+1,(r.top+r.bottom)/2],[r.right-1,(r.top+r.bottom)/2],[(r.left+r.right)/2,(r.top+r.bottom)/2]]){
        if(x<0||x>=innerWidth||y<0||y>=innerHeight)continue
        const owner=document.elementFromPoint(x,y)?.closest('button,input')
        if(owner!==el)misses.push({label,x,y,owner:owner?.outerHTML})
        }
      }
      document.querySelector('.catalog-scroll')?.scrollTo({left:0,top:0})
      const overflow=[document.documentElement,...document.querySelectorAll('.products-page,.product-card,.cart-line,.sheet-body,.detail-product-header,.detail-copy-actions,.product-actions')].filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.className||el.tagName)
      const colours=el=>({foreground:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor})
      const updateButton=document.querySelector('.required-update .button')
      const update=updateButton?{actual:colours(updateButton),reference:colours(document.getElementById('primary-reference'))}:null
      const sheets=document.getElementById('app-styles').sheet
      for(let i=sheets.cssRules.length-1;i>=0;i--){const rule=sheets.cssRules[i];if(rule.selectorText?.includes('data-platform="ios"')&&!rule.selectorText.includes('data-ios-text-enlarged')&&/quantity-stepper|view-toggle|detail-copy-actions|catalog-table-header|detail-heading/.test(rule.selectorText))sheets.deleteRule(i)}
      return {current,baseline:snapshot(),targets:targets.map(({hit,label})=>({hit,label})),overlaps,misses,overflow,update,currentLayout,previousLayout}
    })()`)
    if (platform === 'ios') {
      for (const { hit, label: control } of result.targets) { assert.ok(hit.width >= 43.99, `${label}: ${control} own box width ${hit.width}`); assert.ok(hit.height >= 43.99, `${label}: ${control} own box height ${hit.height}`) }
      assert.deepEqual(result.currentLayout, result.previousLayout, label + ' toggle/detail/header layout unchanged from pre-accessibility-box sizing')
      assert.deepEqual(result.overlaps, [], label + ' overlapping targets')
      assert.deepEqual(result.misses, [], label + ' clipped/intercepted targets')
      assert.deepEqual(result.overflow, [], label + ' page/sheet overflow')
      assert.deepEqual(result.current.rows, result.baseline.rows, label + ' table row heights')
      assert.deepEqual(result.current.columns, result.baseline.columns, label + ' table columns')
      assert.equal(result.current.scrollWidth, result.baseline.scrollWidth, label + ' table scroll extent')
    } else assert.deepEqual(result.current, result.baseline, label + ' Android geometry/style unchanged')
    if (result.update) {
      assert.deepEqual(result.update.actual, result.update.reference, label + ' matches normal primary button colours')
      const luminance = colour => colour.match(/[\d.]+/g).slice(0, 3).map(value => { const c = Number(value) / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4 }).reduce((sum, c, index) => sum + c * [.2126, .7152, .0722][index], 0)
      const a = luminance(result.update.actual.foreground), b = luminance(result.update.actual.background)
      const contrast = (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
      assert.ok(contrast >= 4.5, label + ' label contrast ' + contrast)
      console.log(`Required-update contrast: ${label} ${contrast.toFixed(2)}:1; matches primary button`)
    }
    measurements.push({label,...result})
    console.log(`Hit targets: ${label} ok (${result.targets.length} controls)`)
    if (platform === 'ios' && options.empty !== true && options.showPrices !== false && process.env.HIT_TARGET_EVIDENCE_DIR) {
      await evaluate(`document.getElementById('app-styles').textContent=${JSON.stringify(css)}`)
      const screenshot = await cdp('Page.captureScreenshot', { format: 'png' })
      await writeFile(join(process.env.HIT_TARGET_EVIDENCE_DIR, `hit-targets-${width}-${scale}-${surface}.png`), Buffer.from(screenshot.data, 'base64'))
    }
  }
  if(process.env.HIT_TARGET_EVIDENCE_DIR)await writeFile(join(process.env.HIT_TARGET_EVIDENCE_DIR,'hit-targets-results.json'),JSON.stringify(measurements,null,2))
  console.log('iOS hit targets: ok (375/430px and compact landscape, 1.0/1.3; real JSX/CSS; own element rects >=44px, hit-tested boxes, no overlaps/page overflow; toggle/detail/header layout stable; normal/empty/hidden-price catalog, card/cart/detail; table columns/row heights and Android unchanged)')
  console.log('Required-update colours: ok (real gate JSX/CSS; iOS/Android, light/dark, 375/430px, 1.0/1.3; label contrast >=4.5:1 and same colours as normal primary buttons)')
} finally {
  clearTimeout(watchdog)
  socket?.close()
  chrome.kill()
  await exit
  await rm(profile, { recursive: true, force: true, maxRetries: 5 })
}
