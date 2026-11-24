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
const ast = ts.createSourceFile('App.tsx', app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const functions = ['ProductsPage', 'ProductTableRow', 'variantShelfRows', 'shelfRowsLabel', 'ProductAddButton', 'ProductCartActions', 'ProductCard', 'QuantityStepper', 'Sheet'].map(name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast)).join('\n')
let detailHeader
function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(attribute => attribute.name?.getText(ast) === 'className' && attribute.initializer?.getText(ast) === '"detail-product-header"')) detailHeader = node.getText(ast)
  ts.forEachChild(node, visit)
}
visit(ast)
assert.ok(detailHeader)
const product = { id: 1, sku: '6205-2RS C3', brand: 'SKF', name: 'Rulman', description: '', stock: 10, unit: 'Adet', price: 125, currency: 'TRY', min_order: 1, box: 'Kutulu', d_inner: 25, d_outer: 52, width: 15, locations: [], shelf: '' }
const state = { catalogBrands: [], catalogDimensions: {}, setSheet() {}, setSelectedProduct() {}, lines: [], add() {}, setQty() {} }
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText
const boxSource = await readFile(new URL('../src/components/BoxBadge.tsx', import.meta.url), 'utf8')
function markup(platform, surface, { empty = false, showPrices = true, canShelf = false } = {}) {
  const ctx = { React, ...React, ...icons, renderToStaticMarkup, product,
    session: { user: { perms: canShelf ? ['shelf'] : [] } }, settings: { show_prices_to_dealers: showPrices, low_stock_threshold: 5 },
    entries: empty ? [] : [product], variantIndex: new Map(),
    Capacitor: { getPlatform: () => platform }, useApp: select => select(state), useCart: select => select(state),
    useVirtualizer: () => ({ measure() {}, measureElement() {}, getTotalSize: () => 120, getVirtualItems: () => empty ? [] : [{ index: 0, key: 1, start: 0 }] }),
    searchProducts: entries => entries, hasPerm: (user, perm) => user.perms.includes(perm), performance: { now: () => 0 },
    num: value => String(value), displayPrice: () => '₺125,00', brandOrigin: brand => ({ base: brand }), productVariantKey: () => 'key', boxParts: () => null, shelfBreakdown: () => [], locationLabel: () => '',
    localStorage: { getItem: () => null }, onClose() {}, onToast() {}, copy() {}, share() {}, copySheetOpen: false, onCopySheetOpenChange() {}, brand: { base: 'SKF' }
  }
  const expression = surface === 'catalog'
    ? '<ProductsPage entries={entries} variantIndex={variantIndex} settings={settings} session={session} loading={false} onToast={onToast}/>'
    : surface === 'card'
      ? '<div className="page"><ProductCard product={product} variantIndex={variantIndex} settings={settings} showPrices={true} canShelf={false} onOpen={()=>{}} onToast={onToast}/><div className="cart-line"><div className="cart-line-bottom"><strong>₺125,00</strong><QuantityStepper qty={1} min={1} sku={product.sku} setQty={()=>{}}/></div></div></div>'
      : `<Sheet title="Ürün bilgisi" onClose={onClose}>${detailHeader}<div className="product-actions detail-actions"><ProductCartActions product={product} onToast={onToast}/></div></Sheet>`
  vm.runInNewContext(compile(boxSource.replace(/^import .*$/gm, '').replace(/^export /gm, '') + '\n' + functions + '\nglobalThis.markup=renderToStaticMarkup(' + expression + ')'), ctx)
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
  for (const platform of ['ios', 'android']) for (const width of [375, 430]) for (const scale of [1, 1.3]) for (const [surface, options] of [['catalog', {}], ['catalog', { showPrices: false, canShelf: true }], ['catalog', { empty: true }], ['card', {}], ['detail', {}]]) {
    const label = `${platform}/${width}/${scale}/${surface}/${JSON.stringify(options)}`
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 812, deviceScaleFactor: 1, mobile: true })
    const { frameTree } = await cdp('Page.getFrameTree')
    await cdp('Page.setDocumentContent', { frameId: frameTree.frame.id, html: `<!doctype html><html data-platform="${platform}" data-ios-text-enlarged="${scale > 1}" style="--ios-font-size:${16 * scale}px;--ios-viewport-height:812px"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style id="app-styles">${css}</style><style>*{animation:none!important;transition:none!important}</style></head><body>${markup(platform, surface, options)}</body></html>` })
    const result = await evaluate(`(() => {
      const rect = element => { const r=element.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height} }
      const selector='.view-toggle button,.quantity-stepper button,.quantity-stepper input,.catalog-table-header button,.detail-copy-actions button'
      const buttons=[...document.querySelectorAll(selector)]
      const snapshot = () => ({rows:[...document.querySelectorAll('.catalog-table-row')].map(el=>el.getBoundingClientRect().height),columns:[...document.querySelectorAll('.catalog-table-row > [role=cell],.catalog-table-header > [role=columnheader]')].filter(el=>getComputedStyle(el).display!=='none').map(el=>[rect(el).left,rect(el).width]),buttons:buttons.map(el=>({rect:rect(el),background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).border,padding:getComputedStyle(el).padding})),scrollWidth:document.querySelector('.catalog-scroll')?.scrollWidth})
      const current=snapshot()
      const targetFor=el=>{
        const r=rect(el),pseudo=getComputedStyle(el,'::after'),style=getComputedStyle(el)
        const leftBorder=parseFloat(style.borderLeftWidth),rightBorder=parseFloat(style.borderRightWidth)
        const hit=pseudo.content!=='none'&&pseudo.position==='absolute'?{...r,left:r.left+leftBorder,right:r.right-rightBorder,width:r.width-leftBorder-rightBorder,top:r.top+(r.height-parseFloat(pseudo.height))/2,bottom:r.top+(r.height+parseFloat(pseudo.height))/2,height:parseFloat(pseudo.height)}:r
        return {el,hit,label:el.getAttribute('aria-label')||el.textContent.trim()}
      }
      const targets=buttons.map(targetFor)
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
      const sheets=document.getElementById('app-styles').sheet
      for(let i=sheets.cssRules.length-1;i>=0;i--){const rule=sheets.cssRules[i];if(rule.selectorText?.includes('data-platform="ios"')&&!rule.selectorText.includes('data-ios-text-enlarged')&&/quantity-stepper|view-toggle|detail-copy-actions|catalog-table-header|detail-heading/.test(rule.selectorText))sheets.deleteRule(i)}
      return {current,baseline:snapshot(),targets:targets.map(({hit,label})=>({hit,label})),overlaps,misses,overflow}
    })()`)
    if (platform === 'ios') {
      for (const { hit, label: control } of result.targets) { assert.ok(hit.width >= 43.99, `${label}: ${control} width ${hit.width}`); assert.ok(hit.height >= 43.99, `${label}: ${control} height ${hit.height}`) }
      assert.deepEqual(result.overlaps, [], label + ' overlapping targets')
      assert.deepEqual(result.misses, [], label + ' clipped/intercepted targets')
      assert.deepEqual(result.overflow, [], label + ' page/sheet overflow')
      assert.deepEqual(result.current.rows, result.baseline.rows, label + ' table row heights')
      assert.deepEqual(result.current.columns, result.baseline.columns, label + ' table columns')
      assert.equal(result.current.scrollWidth, result.baseline.scrollWidth, label + ' table scroll extent')
    } else assert.deepEqual(result.current, result.baseline, label + ' Android geometry/style unchanged')
    measurements.push({label,...result})
    console.log(`Hit targets: ${label} ok (${result.targets.length} controls)`)
    if (platform === 'ios' && options.empty !== true && options.showPrices !== false && process.env.HIT_TARGET_EVIDENCE_DIR) {
      await evaluate(`document.getElementById('app-styles').textContent=${JSON.stringify(css)}`)
      const screenshot = await cdp('Page.captureScreenshot', { format: 'png' })
      await writeFile(join(process.env.HIT_TARGET_EVIDENCE_DIR, `hit-targets-${width}-${scale}-${surface}.png`), Buffer.from(screenshot.data, 'base64'))
    }
  }
  if(process.env.HIT_TARGET_EVIDENCE_DIR)await writeFile(join(process.env.HIT_TARGET_EVIDENCE_DIR,'hit-targets-results.json'),JSON.stringify(measurements,null,2))
  console.log('iOS hit targets: ok (375/430px, 1.0/1.3; real JSX/CSS; all targets >=44px, hit-tested slop, no overlaps/page overflow; normal/empty/hidden-price catalog, card/cart/detail; table columns/row heights and Android unchanged)')
} finally {
  clearTimeout(watchdog)
  socket?.close()
  chrome.kill()
  await exit
  await rm(profile, { recursive: true, force: true })
}
