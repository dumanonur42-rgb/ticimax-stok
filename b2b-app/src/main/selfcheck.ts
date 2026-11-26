import type { ProductInsert, ProductRow } from './cloud/database.types'
import Database from 'better-sqlite3-multiple-ciphers'
import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as XLSX from 'xlsx'
import { classifyCloudError, cloud, getStoredValue, SESSION_CACHE_STORAGE_KEY } from './cloud/client'
import { pullProducts, upsertLocal } from './cloud/sync'
import { dbPath, getDb, normalize, normalizeText, openDatabaseForSelfCheck, productKey, wipeProducts } from './db'
import { createOrder, getOrder, listOrders, setOrderStatus } from './repo/orders'
import { brandCountsFromRows, inferCurrencyFromValues, parseBox, parseNumber, previewFile, runImport, suggestMapping } from './repo/importer'
import { brandSpellings, duplicateGroups, getProduct, productFacets, resolveBrand, saveProduct, searchProducts } from './repo/products'
import { isLocalSetting } from './repo/settings'
import { boxIdentity, boxMentions, boxParts, brandAliasEntries, brandOrigin, canonBrand, canonBox, DEFAULT_BRAND_ALIASES, mergeBrandAliases } from '@shared/identity'
import { locationLabel, shelfBreakdown, shelfQuantitySummary } from '@shared/locations'
import { generateDemoCatalog, seedDemo } from './repo/seed'
import { listUsers, login, logout } from './repo/users'
import { cardPrice, priceFor } from '@shared/price'
import { findRefreshedCartProduct } from '@shared/cart'
import { productsToClipboard } from '@shared/copy'
import type { Product } from '@shared/types'

/**
 * Headless sanity run: `electron . --selfcheck`.
 * Offline part: fills the local mirror with the demo catalogue and times FTS searches.
 * Cloud part (only when B2B_CHECK_USER / B2B_CHECK_PASS are set): signs in, pulls products, lists users/orders.
 * Write part (B2B_CHECK_WRITE=1, admin account): seeds the shared catalogue when empty, round-trips a stock
 * change through the incremental pull, and — with B2B_CHECK_DEALER_USER/PASS — verifies a dealer can order
 * but cannot touch products or other customers' orders.
 */
function localCount(): number {
  return (getDb().prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c
}

async function expectRejected(label: string, run: () => Promise<unknown>): Promise<boolean> {
  try {
    await run()
    console.error(`${label}: izin verildi (beklenmiyordu)`)
    return false
  } catch (e) {
    console.log(`${label}: reddedildi (${e instanceof Error ? e.message : String(e)})`)
    return true
  }
}

async function writeCheck(): Promise<boolean> {
  let ok = true
  if (localCount() < 100) {
    const t = performance.now()
    const n = await seedDemo(12000)
    console.log(`cloud seed: ${n} products in ${(performance.now() - t).toFixed(0)} ms`)
  }
  const sample = searchProducts({ q: '6205', limit: 1, offset: 0, sort: 'sku' }).items[0]
  if (!sample) throw new Error('örnek ürün bulunamadı')
  const before = sample.stock
  await saveProduct({ ...sample, stock: before + 5 })
  const changed = await pullProducts()
  const after = getProduct(sample.id)?.stock
  console.log(`incremental pull after stock edit: ${changed} row(s), stock ${before} -> ${after}`)
  if (after !== before + 5) ok = false

  const dealer = process.env.B2B_CHECK_DEALER_USER
  const dealerPass = process.env.B2B_CHECK_DEALER_PASS
  if (dealer && dealerPass) {
    await logout()
    const ds = await login(dealer, dealerPass)
    console.log(`cloud login ${dealer}: ok (${ds.user.role}, customer ${ds.customer?.code ?? '-'})`)
    if (ds.user.role === 'admin') throw new Error('B2B_CHECK_DEALER_USER bir bayi hesabı olmalı')
    ok = (await expectRejected('dealer product edit', () => saveProduct({ ...sample, stock: 0 }))) && ok
    const users = await listUsers()
    console.log(`dealer visible profiles: ${users.length}`)
    if (users.length > 1) ok = false
    const order = await createOrder({
      customer_id: null,
      note: 'selfcheck',
      payment: 'pesin',
      currency: 'TRY',
      vat_pct: 20,
      items: [{ product_id: sample.id, sku: sample.sku, name: sample.name, qty: 2, unit_price: sample.price ?? 0, discount_pct: 0 }]
    })
    console.log(`dealer order ${order.order_no}: total ${order.total}, customer ${order.customer_id}`)
    if (order.customer_id !== ds.customer?.id) ok = false
    const mine = await listOrders({})
    if (mine.some((o) => o.customer_id !== ds.customer?.id)) {
      console.error('dealer sees foreign orders')
      ok = false
    }
    await logout()
    const admin = process.env.B2B_CHECK_USER!
    await login(admin, process.env.B2B_CHECK_PASS!)
    await pullProducts()
    const afterOrder = getProduct(sample.id)?.stock
    console.log(`stock after dealer order: ${afterOrder}`)
    if (afterOrder !== before + 3) ok = false
    const seen = await getOrder(order.id)
    if (!seen || seen.items?.length !== 1) {
      console.error('admin cannot read dealer order')
      ok = false
    }
    await setOrderStatus(order.id, 'iptal')
    await pullProducts()
    const restored = getProduct(sample.id)?.stock
    console.log(`stock after cancel: ${restored}`)
    if (restored !== before + 5) ok = false
  }
  await saveProduct({ ...sample, stock: before })
  await pullProducts()
  return ok
}

async function storageSelfCheck(): Promise<boolean> {
  let ok = true
  const dir = join(app.getPath('userData'), 'security-selfcheck', String(Date.now()))
  mkdirSync(dir, { recursive: true })
  const legacyPath = join(dir, 'legacy.sqlite')
  const keyPath = join(dir, 'db.key')
  const legacy = new Database(legacyPath)
  legacy.exec(`
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0, error TEXT);
    CREATE TABLE sync_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT INTO settings VALUES ('company_name', 'Yamansa');
    INSERT INTO outbox VALUES (1, 'selfcheck-outbox', 'user-1', 'order', '{}', '2026-01-01T00:00:00Z', 2, 0, NULL);
    INSERT INTO sync_state VALUES ('products_cursor', 'stale');
    INSERT INTO sync_state VALUES ('catalog_generation', 'stale');
    INSERT INTO sync_state VALUES ('session_cache', '{\"user\":{\"id\":\"legacy-user\",\"perms\":[]},\"customer\":null}');
  `)
  legacy.close()

  const migrated = openDatabaseForSelfCheck(legacyPath, keyPath)
  const headerIsPlaintext = readFileSync(legacyPath).subarray(0, 16).toString('binary') === 'SQLite format 3\0'
  const settings = migrated.prepare("SELECT value FROM settings WHERE key = 'company_name'").get() as { value: string } | undefined
  const outbox = migrated.prepare("SELECT id, attempts FROM outbox").get() as { id: string; attempts: number } | undefined
  const productCount = (migrated.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c
  const staleState = migrated.prepare("SELECT COUNT(*) AS c FROM sync_state WHERE key IN ('products_cursor', 'catalog_generation', 'session_cache')").get() as { c: number }
  migrated.close()
  const migratedSession = getStoredValue(SESSION_CACHE_STORAGE_KEY)
  if (headerIsPlaintext || settings?.value !== 'Yamansa' || outbox?.id !== 'selfcheck-outbox' || outbox.attempts !== 2 || productCount !== 0 || staleState.c !== 0 || !migratedSession) ok = false
  console.log(`plaintext migration: ${ok ? 'ok' : 'failed'} (encrypted header, settings/outbox preserved, products/sync state reset)`)

  const sessionFile = join(app.getPath('userData'), 'data', 'cloud-session.json')
  const sessionDir = join(app.getPath('userData'), 'data')
  writeFileSync(sessionFile, '{garbage session data')
  const corruptSessionRecovered = getStoredValue(SESSION_CACHE_STORAGE_KEY) === null
    && !existsSync(sessionFile)
    && readdirSync(sessionDir).some((name) => name.startsWith('cloud-session.json.unreadable.'))
  if (!corruptSessionRecovered) ok = false
  console.log(`corrupt session recovery: ${corruptSessionRecovered ? 'ok' : 'failed'}`)

  const authKey = 'sb-wxcbajukvxmerdjaikuw-auth-token'
  const fixtureSession = {
    access_token: 'selfcheck-access-token',
    refresh_token: 'selfcheck-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'selfcheck@example.com',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      created_at: new Date().toISOString()
    }
  }
  const profileCache = getStoredValue(SESSION_CACHE_STORAGE_KEY) ?? ''
  writeFileSync(sessionFile, JSON.stringify({ [authKey]: JSON.stringify(fixtureSession), [SESSION_CACHE_STORAGE_KEY]: profileCache }))
  const restored = await cloud().auth.getSession()
  const storedAfterRestore = readFileSync(sessionFile, 'utf8')
  const sessionRestored = !restored.error && restored.data.session?.refresh_token === fixtureSession.refresh_token
  const fileMigrated = storedAfterRestore.startsWith('safe:') || storedAfterRestore.startsWith('dev-plain:')
  if (!sessionRestored || !fileMigrated) ok = false
  console.log(`session-file migration: ${sessionRestored && fileMigrated ? 'ok' : 'failed'} (stored session restored after legacy-file migration)`)
  const auth = cloud().auth
  const signOut = auth.signOut
  let signOutScope: string | undefined
  auth.signOut = async (options) => {
    signOutScope = options?.scope
    return { error: null }
  }
  try {
    await logout()
  } finally {
    auth.signOut = signOut
  }
  if (signOutScope !== 'local') ok = false
  console.log(`logout sign-out scope: ${signOutScope === 'local' ? 'ok' : 'failed'} (local)`)
  await auth.signOut({ scope: 'local' })

  const dbHeaderPlaintext = readFileSync(dbPath()).subarray(0, 16).toString('binary') === 'SQLite format 3\0'
  if (dbHeaderPlaintext) ok = false
  console.log(`database encryption header: ${dbHeaderPlaintext ? 'failed' : 'ok'}`)
  return ok
}

export async function runSelfCheck(): Promise<number> {
  if (process.env.B2B_OFFLINE_IMPORT_FILE) {
    app.setPath('userData', join(app.getPath('temp'), `yamansa-import-plan-${Date.now()}`))
    const path = process.env.B2B_OFFLINE_IMPORT_FILE
    const reportPath = process.env.B2B_OFFLINE_IMPORT_REPORT ?? '/home/ubuntu/pw/yeni_liste_dryrun.txt'
    const preview = previewFile(path)
    if (!preview.suggestedMapping.sku) throw new Error('Dosyada ürün kodu / adı kolonu eşlenemedi.')
    const result = await runImport({
      token: preview.token,
      mapping: preview.suggestedMapping,
      mode: 'replace',
      deactivateMissing: false,
      defaultCurrency: preview.suggestedCurrency ?? 'TRY',
      defaultBrand: '',
      defaultCategory: '',
      dryRun: true
    }, { pullProducts: async () => 0 })
    const summary = result.dryRunSummary
    if (!summary) throw new Error('Deneme planı özeti oluşturulamadı.')
    const lines = [
      `Dosya: ${result.filename}`,
      `Satır sayısı: ${preview.totalRows}`,
      `Ürün: ${summary.products}`,
      `Birden fazla rafı olan ürün: ${summary.multiLocationProducts}`,
      `Farklı raflarda bulunan varyant: ${summary.variantsWithDifferentShelves}`,
      `Uyarı türleri: kutu/adet=${summary.warningsByType.boxCountMismatch}, boş DURUM=${summary.warningsByType.missingBoxState}, benzer marka=${summary.warningsByType.similarBrands}`,
      '',
      `Kontrol edilmesi gerekenler (${result.warnings.length}):`,
      ...result.warnings.map((warning) => `- ${warning}`),
      '',
      `Hatalar (${result.errors.length}):`,
      ...result.errors.map((error) => `- ${error}`)
    ]
    writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8')
    console.log(lines.join('\n'))
    console.log(`offline import report: ${reportPath}`)
    return 0
  }
  const t0 = performance.now()
  const db = getDb()
  let ok = await storageSelfCheck()
  const copyProduct = (overrides: Partial<Product>): Product => ({
    id: 1,
    sku: '6205 2RS',
    name: '6205 2RS',
    brand: 'SKF',
    category: '',
    type: '',
    seal: '',
    d_inner: 25,
    d_outer: 52,
    width: 15,
    stock: 12,
    unit: 'adet',
    price: 3.2,
    auto_price: null,
    auto_price_source: '',
    auto_price_at: '',
    price_source: 'default',
    currency: 'EUR',
    list_price: null,
    card_price: null,
    min_order: 1,
    shelf: 'D7 / D8',
    locations: [
      { shelf: 'D7', qty: 4, box: 'Kutulu' },
      { shelf: 'D8', qty: 8, box: 'Kutusuz' }
    ],
    box: 'Kutulu',
    barcode: '',
    image: '',
    description: 'Deep groove & <sealed> bearing',
    equivalents: '',
    active: 1,
    updated_at: '2026-11-21T00:00:00.000Z',
    ...overrides
  })
  const copySamples = [
    copyProduct({
      stock: 14,
      box: 'Kutulu Kutusuz',
      locations: [
        { shelf: 'D7', qty: 4, box: 'Kutulu' },
        { shelf: 'D7', qty: 2, box: 'Kutusuz' },
        { shelf: 'D8', qty: 8, box: 'Kutusuz' }
      ]
    }),
    copyProduct({
      id: 2,
      sku: '1209',
      name: 'Konik makaralı rulman',
      brand: 'FAG GERMANY',
      d_inner: 45,
      d_outer: 85,
      width: 19,
      stock: 6,
      price: 8.7,
      shelf: 'E4 / E5',
      locations: [
        { shelf: 'E4', qty: 2, box: 'Kutulu' },
        { shelf: 'E5', qty: 3, box: 'Kutulu' }
      ]
    }),
    copyProduct({
      id: 3,
      sku: '6203',
      name: '6203',
      brand: 'FAG',
      d_inner: null,
      d_outer: null,
      width: null,
      stock: 2,
      price: null,
      shelf: '',
      locations: [],
      box: '',
      description: ''
    })
  ]
  const copyColumns = ['shelf', 'sku', 'name', 'brand', 'size', 'stock', 'box', 'description', 'price'] as const
  const clipboardOutput = productsToClipboard(copySamples, [...copyColumns], {
    canShelf: true,
    showPrices: true,
    date: new Date(2026, 10, 21)
  })
  const permissionOutput = productsToClipboard([copySamples[0]], ['shelf', 'sku', 'price'], {
    canShelf: false,
    showPrices: false,
    date: new Date(2026, 10, 21)
  })
  const markupOutput = productsToClipboard([copyProduct({
    sku: ' 6205 *2RS*_ ',
    description: 'A*_~`B'
  })], ['sku', 'description'], {
    canShelf: true,
    showPrices: true,
    date: new Date(2026, 10, 21)
  })
  const normalizedNameOutput = productsToClipboard([copyProduct({
    sku: '6205-2RS',
    name: '6205 2RS'
  })], ['sku', 'name'], {
    canShelf: true,
    showPrices: true
  })
  const mixedNameOutput = productsToClipboard(copySamples.slice(0, 2), ['sku', 'name'], {
    canShelf: true,
    showPrices: true
  })
  const firstNameRow = mixedNameOutput.html.match(/<tr style="background:#fff;">([\s\S]*?)<\/tr>/)?.[1] ?? ''
  const emptyColumnsOutput = productsToClipboard([copySamples[2]], ['sku', 'shelf', 'box', 'price', 'stock'], {
    canShelf: true,
    showPrices: true
  })
  const zeroStockOutput = productsToClipboard([copyProduct({
    stock: 0,
    unit: '  ',
    shelf: '',
    locations: [],
    box: '',
    price: null
  })], ['sku', 'shelf', 'stock', 'box', 'price'], {
    canShelf: true,
    showPrices: true
  })
  const singleShelfOutput = productsToClipboard([copyProduct({
    stock: 3,
    shelf: 'A1',
    locations: [{ shelf: 'A1', qty: 3, box: '' }],
    box: ''
  })], ['sku', 'shelf'], {
    canShelf: true,
    showPrices: true
  })
  const stockOnlyOutput = productsToClipboard([copySamples[0]], ['sku', 'stock'], {
    canShelf: true,
    showPrices: true
  })
  const boxOnlyOutput = productsToClipboard([copySamples[0]], ['sku', 'box'], {
    canShelf: true,
    showPrices: true
  })
  const unitOutput = productsToClipboard([copyProduct({
    unit: 'Kutu',
    stock: 3,
    box: 'Kutulu',
    shelf: 'A1',
    locations: [{ shelf: 'A1', qty: 3, box: 'Kutulu' }]
  })], ['sku', 'shelf', 'stock', 'box'], {
    canShelf: true,
    showPrices: true
  })
  const partialDimensionsOutput = productsToClipboard([copyProduct({
    d_inner: 25,
    d_outer: null,
    width: null
  })], ['sku', 'size'], {
    canShelf: true,
    showPrices: true
  })
  const sizesOmitted = !productsToClipboard([copySamples[2]], ['sku', 'size'], {
    canShelf: true,
    showPrices: true
  }).html.includes('Ölçü (d×D×B)')
  const boldTokens = clipboardOutput.text.match(/\*[^*\n]+\*/g) ?? []
  const thirdProductText = clipboardOutput.text.split('\n\n')[2] ?? ''
  const copySelfcheckOk =
    clipboardOutput.text.startsWith('*6205 2RS* · SKF') &&
    !clipboardOutput.text.includes('Yamansa Rulman · Ürün listesi') &&
    !clipboardOutput.text.includes('21.11.2026') &&
    !clipboardOutput.text.includes('Ürün adı: 6205 2RS') &&
    !normalizedNameOutput.text.includes('Ürün adı:') &&
    !normalizedNameOutput.html.includes('Ürün adı') &&
    mixedNameOutput.html.includes('>Ürün adı</th>') &&
    /<td[^>]*>6205 2RS<\/td><td[^>]*><\/td>/.test(firstNameRow) &&
    !clipboardOutput.html.includes('Yamansa Rulman · Ürün listesi') &&
    !clipboardOutput.html.includes('21.11.2026') &&
    clipboardOutput.text.includes('Raf:\n- D7 · Kutulu · 4 adet\n- D7 · Kutusuz · 2 adet\n- D8 · Kutusuz · 8 adet') &&
    clipboardOutput.html.includes('D7 · Kutulu · 4 adet<br style="mso-data-placement:same-cell">D7 · Kutusuz · 2 adet<br style="mso-data-placement:same-cell">D8 · Kutusuz · 8 adet') &&
    singleShelfOutput.text.includes('Raf: A1 · 3 adet') &&
    stockOnlyOutput.text.includes('Stok: 14 adet') &&
    !stockOnlyOutput.text.includes('Kutu durumu:') &&
    boxOnlyOutput.text.includes('Kutu durumu: Kutulu Kutusuz') &&
    !boxOnlyOutput.text.includes('Stok:') &&
    unitOutput.text.includes('Stok: 3 Kutu · Kutulu') &&
    unitOutput.text.includes('Raf: A1 · Kutulu · 3 Kutu') &&
    unitOutput.html.includes('A1 · Kutulu · 3 Kutu') &&
    unitOutput.html.includes('>3 Kutu</td>') &&
    partialDimensionsOutput.text.includes('Ölçü: 25 × — × — mm') &&
    partialDimensionsOutput.html.includes('25 × — × — mm') &&
    thirdProductText.startsWith('*6203* · FAG') &&
    thirdProductText.includes('Stok: 2 adet') &&
    !thirdProductText.includes('Raf:') &&
    !thirdProductText.includes('Kutu durumu:') &&
    !thirdProductText.includes('Fiyat:') &&
    !thirdProductText.includes('—') &&
    clipboardOutput.text.includes('Fiyat: 3,20 €') &&
    clipboardOutput.text.includes('Ölçü: 25 × 52 × 15 mm') &&
    clipboardOutput.text.includes('Stok: 14 adet · Kutulu Kutusuz') &&
    clipboardOutput.html.includes('3,20 €') &&
    !clipboardOutput.html.includes('€3,20') &&
    !clipboardOutput.text.includes('Fiyat sorunuz') &&
    zeroStockOutput.text.includes('Stok: 0 adet') &&
    emptyColumnsOutput.html.includes('Ürün kodu') &&
    emptyColumnsOutput.html.includes('Stok') &&
    !emptyColumnsOutput.html.includes('Raf') &&
    !emptyColumnsOutput.html.includes('Kutu durumu') &&
    !emptyColumnsOutput.html.includes('Fiyat') &&
    !emptyColumnsOutput.text.includes('Raf:') &&
    !emptyColumnsOutput.text.includes('Kutu durumu:') &&
    !emptyColumnsOutput.text.includes('Fiyat:') &&
    clipboardOutput.text.includes('Raf:\n- E4 · Kutulu\n- E5 · Kutulu') &&
    clipboardOutput.text.includes('FAG (Almanya)') &&
    clipboardOutput.text.includes('*6205 2RS*') &&
    clipboardOutput.text.includes('Açıklama: Deep groove & <sealed> bearing') &&
    markupOutput.text.includes('*6205 2RS*') &&
    markupOutput.text.includes('Açıklama: AB') &&
    boldTokens.every((token) => token[1] !== ' ' && token[token.length - 2] !== ' ') &&
    !permissionOutput.text.includes('Raf:') &&
    !permissionOutput.text.includes('Fiyat:') &&
    !permissionOutput.text.includes('Marka:') &&
    permissionOutput.html.includes('Ürün kodu') &&
    !permissionOutput.html.includes('Raf') &&
    !permissionOutput.html.includes('Fiyat') &&
    clipboardOutput.html.includes('&lt;sealed&gt;') &&
    !clipboardOutput.html.includes('<sealed>') &&
    !clipboardOutput.html.includes('Fiyat sorunuz') &&
    !clipboardOutput.html.includes('—') &&
    /<td style="[^"]*text-align:right;"><\/td>/.test(clipboardOutput.html) &&
    !clipboardOutput.text.includes('\t') &&
    clipboardOutput.text.split('\n').every((line) => line === line.trimEnd()) &&
    sizesOmitted
  if (!copySelfcheckOk) {
    console.error('clipboard column, formatting or escaping failed')
    ok = false
  }
  console.log(`clipboard table/text generation: ${copySelfcheckOk ? 'ok' : 'failed'}`)
  if (process.env.B2B_COPY_PREVIEW === '1') {
    const preview = productsToClipboard(copySamples, [...copyColumns], {
      canShelf: true,
      showPrices: true,
      date: new Date(2026, 10, 21)
    })
    writeFileSync('/home/ubuntu/pw/copy_preview.html', preview.html, 'utf8')
    writeFileSync('/home/ubuntu/pw/copy_preview.txt', preview.text, 'utf8')
    const escapePreviewText = (value: string): string =>
      value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      })[character]!)
    const whatsappLines = preview.text.split('\n').map((line) =>
      escapePreviewText(line).replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    ).join('<br>')
    writeFileSync('/home/ubuntu/pw/copy_preview_whatsapp.html',
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WhatsApp kopyalama önizlemesi</title></head><body style="margin:0;background:#efeae2;font-family:Arial,sans-serif;color:#111b21"><main style="box-sizing:border-box;width:390px;max-width:100%;min-height:100vh;margin:0 auto;padding:20px 0;background:#efeae2"><div style="box-sizing:border-box;width:100%;padding:10px 12px;border-radius:10px 0 10px 10px;background:#d9fdd3;box-shadow:0 1px 1px #0002;font-size:14px;line-height:1.42;overflow-wrap:anywhere">${whatsappLines}</div></main></body></html>`,
      'utf8')
    console.log('clipboard previews: /home/ubuntu/pw/copy_preview.html, /home/ubuntu/pw/copy_preview.txt, /home/ubuntu/pw/copy_preview_whatsapp.html')
  }
  const cardPricingOk =
    cardPrice(null, 1, 5) === null &&
    cardPrice(0, 1, 5) === null &&
    cardPrice(-1, 1, 5) === null &&
    cardPrice(10, 0, 5) === null &&
    cardPrice(10, null, 0) === null &&
    cardPrice(10, null, 5) === 10.5 &&
    priceFor('kart', 10, null, 0) === 10 &&
    priceFor('kart', null, null, 5) === null
  if (!cardPricingOk) {
    console.error('card price visibility or payment fallback failed')
    ok = false
  }
  console.log(`card price visibility: ${cardPricingOk ? 'ok' : 'failed'}`)
  const cartLine = { id: 10, sku: ' 6205 ', brand: 'FAG', box: 'Kutulu' }
  const cartProducts = [
    { id: 11, sku: '6205', brand: 'SKF', box: 'Kutulu' },
    { id: 12, sku: '6205', brand: 'FAG', box: 'Kutusuz' },
    { id: 13, sku: '6205', brand: 'FAG', box: 'Kutulu' }
  ]
  const cartRefreshOk = findRefreshedCartProduct(cartLine, cartProducts)?.id === 13 &&
    findRefreshedCartProduct(cartLine, cartProducts.slice(0, 2)) === undefined &&
    findRefreshedCartProduct(cartLine, [{ ...cartProducts[0], id: 10 }])?.id === 10
  if (!cartRefreshOk) {
    console.error('cart refresh matched the wrong product identity')
    ok = false
  }
  console.log(`cart refresh product identity: ${cartRefreshOk ? 'ok' : 'failed'}`)

  const currencyFixture = join(app.getPath('temp'), `selfcheck-import-${Date.now()}.csv`)
  let previewCurrencyOk = false
  try {
    writeFileSync(currencyFixture, 'Stok Kodu;Adet;Fiyat\nSKU-1;1;15,00 €\nSKU-2;1;€15.00\nSKU-3;1;12,5 EUR\nSKU-4;1;15 EUR\nSKU-5;1;15\n')
    const preview = previewFile(currencyFixture)
    previewCurrencyOk = preview.suggestedCurrency === 'EUR' && preview.priceCurrencyHints?.Fiyat === 'EUR'
  } finally {
    if (existsSync(currencyFixture)) unlinkSync(currencyFixture)
  }
  const numberCases: [string, number][] = [['15,00 €', 15], ['€15.00', 15], ['12,5 EUR', 12.5], ['$3', 3], ['10 TL', 10]]
  const currencyParsingOk =
    previewCurrencyOk &&
    numberCases.every(([value, want]) => parseNumber(value) === want) &&
    inferCurrencyFromValues(['15,00 €', '€15.00', '12,5 EUR', '15 EUR', '15']) === 'EUR' &&
    inferCurrencyFromValues(['15,00 €', '€15.00', '$3', '10 TL', '15']) === null &&
    isLocalSetting('default_currency')
  if (!currencyParsingOk) {
    console.error('import currency detection, price parsing, or local preference failed')
    ok = false
  }
  console.log(`import currency detection and parsing: ${currencyParsingOk ? 'ok' : 'failed'}`)
  const cloudErrorCases = [
    [503, undefined, 'retryable'],
    [undefined, 'PGRST002', 'retryable'],
    [400, undefined, 'rejected'],
    [undefined, '23505', 'rejected'],
    [undefined, '42501', 'rejected']
  ] as const
  const cloudErrorsOk = cloudErrorCases.every(([status, code, want]) => classifyCloudError({ status, code }, status) === want) &&
    classifyCloudError({ code: '', message: '<html>gateway unavailable</html>' }, 503) === 'retryable'
  if (!cloudErrorsOk) {
    console.error('cloud outage classification failed')
    ok = false
  }
  console.log(`cloud error retry classification: ${cloudErrorsOk ? 'ok' : 'failed'}`)
  const warningFixture = join(app.getPath('temp'), `selfcheck-warnings-${Date.now()}.xlsx`)
  const rekeyFixture = join(app.getPath('temp'), `selfcheck-rekey-${Date.now()}.xlsx`)
  const replaceFixture = join(app.getPath('temp'), `selfcheck-replace-${Date.now()}.xlsx`)
  let importWarningsOk = false
  let importerRekeyOk = false
  let releaseDeletedKeysOk = false
  let replaceOrderOk = false
  try {
    const warningRows: string[][] = [
      ['Stok Kodu', 'Marka', 'Adet', 'Kutu Durumu', 'Raf'],
      ['QA-WARN-A', 'RODAMAX', '4', '2 KUTULU', 'A'],
      ['QA-WARN-A', 'RODAMAX', '2', '', 'B'],
      ['QA-WARN-B', 'RODAMAXX', '1', 'Kutusuz', 'C'],
      ['QA-WARN-C', 'SKF', '2184', '273 KOLİ ADEDİ', 'D']
    ]
    for (let i = 0; i < 55; i++) {
      warningRows.push([`QA-WARN-M${i}`, 'RODAMAX', '4', '1 Kutulu', 'M'])
      warningRows.push([`QA-WARN-E${i}`, 'RODAMAX', '1', 'Kutulu', 'E'])
      warningRows.push([`QA-WARN-E${i}`, 'RODAMAX', '1', '', 'F'])
    }
    const sheet = XLSX.utils.aoa_to_sheet(warningRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sayfa1')
    XLSX.writeFile(workbook, warningFixture)
    const preview = previewFile(warningFixture)
    const planned = await runImport({
      token: preview.token, mapping: preview.suggestedMapping, mode: 'upsert', deactivateMissing: false,
      defaultCurrency: 'TRY', defaultBrand: '', defaultCategory: '', dryRun: true
    }, { pullProducts: async () => 0 })
    importWarningsOk = planned.dryRunSummary?.warningsByType.boxCountMismatch === 56 &&
      planned.dryRunSummary.warningsByType.missingBoxState === 56 &&
      planned.dryRunSummary.warningsByType.similarBrands <= 50 &&
      planned.warnings.some((warning) => warning.includes('"2 KUTULU"') && warning.includes('toplamı 2, ADET 4')) &&
      planned.warnings.some((warning) => warning.includes('kutu durumu boş') && warning.includes('Satır 2')) &&
      planned.warnings.some((warning) => warning.includes('Benzer markalar') && warning.includes('RODAMAXX')) &&
      !planned.warnings.some((warning) => warning.includes('QA-WARN-C'))

    const rekeyId = 8_765_432
    const rekeySku = 'QA-REKEY'
    const rekeyBrand = 'SKF'
    const rekeyKey = `${normalize(rekeySku)}|${normalize(rekeyBrand)}|${normalize('4 Kutulu 4 Kutusuz')}`
    db.prepare('DELETE FROM products WHERE id = ?').run(rekeyId)
    upsertLocal([{
      id: rekeyId, sku: rekeySku, sku_norm: normalize(rekeySku), key_norm: rekeyKey,
      name: rekeySku, name_norm: normalizeText(rekeySku), brand: rekeyBrand, category: '', type: '', seal: '',
      d_inner: null, d_outer: null, width: null, stock: 8, unit: 'Adet', price: 0, currency: 'TRY',
      list_price: null, card_price: null, min_order: 1, shelf: '', locations: [], box: '',
      barcode: '', image: '', description: '', equivalents: '', active: true, deleted: false,
      updated_at: new Date().toISOString()
    }])
    const rekeySheet = XLSX.utils.aoa_to_sheet([
      ['Stok Kodu', 'Marka', 'Adet', 'Kutu Durumu', 'Raf'],
      [rekeySku, rekeyBrand, '8', '4 Kutulu 4 Kutusuz', 'R']
    ])
    const rekeyWorkbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(rekeyWorkbook, rekeySheet, 'Sayfa1')
    XLSX.writeFile(rekeyWorkbook, rekeyFixture)
    const rekeyPreview = previewFile(rekeyFixture)
    const rekeyResult = await runImport({
      token: rekeyPreview.token, mapping: rekeyPreview.suggestedMapping, mode: 'upsert', deactivateMissing: false,
      defaultCurrency: 'TRY', defaultBrand: '', defaultCategory: '', dryRun: true
    }, { pullProducts: async () => 0 })
    importerRekeyOk = rekeyResult.updated === 1 && !rekeyResult.errors.some((error) => error.includes('zaten ayrı bir ürün'))
    const releaseCalls: string[] = []
    const releasedNorms: string[][] = []
    const releaseCloud = (() => ({
      from: (table: string) => ({
        upsert: (rows: ProductInsert[], options: { onConflict?: string }) => {
          releaseCalls.push(`upsert:${table}:${options.onConflict}`)
          const data = rows.map((row) => ({ id: row.id ?? rekeyId }))
          return {
            data, error: null, status: 200,
            select: async () => ({ data, error: null, status: 200 })
          }
        },
        insert: (row: Record<string, unknown>) => ({
          select: () => ({
            single: async () => ({ data: { id: 1, ...row }, error: null, status: 201 })
          })
        })
      }),
      rpc: async (name: string, args: { p_norms?: string[] }) => {
        releaseCalls.push(`rpc:${name}`)
        if (name === 'release_deleted_keys') releasedNorms.push(args.p_norms ?? [])
        return { data: 0, error: null, status: 200 }
      }
    })) as unknown as typeof cloud
    const expectedRekeyNorm = productKey(rekeySku, rekeyBrand, canonBox('4 Kutulu 4 Kutusuz'))
    const releasePrecedesIdUpsert = (calls: string[]): boolean => {
      const releaseIndex = calls.indexOf('rpc:release_deleted_keys')
      const idUpsertIndex = calls.indexOf('upsert:products:id')
      return releaseIndex >= 0 && idUpsertIndex > releaseIndex
    }
    let callStart = releaseCalls.length
    const mergeRekeyPreview = previewFile(rekeyFixture)
    await runImport({
      token: mergeRekeyPreview.token, mapping: mergeRekeyPreview.suggestedMapping, mode: 'upsert', deactivateMissing: false,
      defaultCurrency: 'TRY', defaultBrand: '', defaultCategory: '', dryRun: false
    }, { cloud: releaseCloud, pullProducts: async () => 0 })
    const mergeReleaseOk = releasePrecedesIdUpsert(releaseCalls.slice(callStart)) &&
      releasedNorms[0]?.length === 1 && releasedNorms[0][0] === expectedRekeyNorm
    callStart = releaseCalls.length
    const replaceRekeyPreview = previewFile(rekeyFixture)
    await runImport({
      token: replaceRekeyPreview.token, mapping: replaceRekeyPreview.suggestedMapping, mode: 'replace', deactivateMissing: false,
      defaultCurrency: 'TRY', defaultBrand: '', defaultCategory: '', dryRun: false
    }, { cloud: releaseCloud, pullProducts: async () => 0 })
    const replaceReleaseOk = releasePrecedesIdUpsert(releaseCalls.slice(callStart)) &&
      releasedNorms[1]?.length === 1 && releasedNorms[1][0] === expectedRekeyNorm
    releaseDeletedKeysOk = mergeReleaseOk && replaceReleaseOk
    db.prepare('DELETE FROM products WHERE id = ?').run(rekeyId)

    const replaceUnchangedId = 8_765_433
    const replaceChangedId = 8_765_434
    const replaceAbsentId = 8_765_435
    const replaceBrand = 'SKF'
    const replaceUnchangedSku = 'QA-REPLACE-UNCHANGED'
    const replaceChangedSku = 'QA-REPLACE-CHANGED'
    const replaceAbsentSku = 'QA-REPLACE-ABSENT'
    const replaceUnchangedKey = productKey(replaceUnchangedSku, replaceBrand, 'Kutulu')
    const replaceChangedKey = productKey(replaceChangedSku, replaceBrand, 'Kutulu')
    const replaceIdsByKey = new Map([[replaceUnchangedKey, replaceUnchangedId], [replaceChangedKey, replaceChangedId]])
    const replaceRows: ProductRow[] = [
      [replaceUnchangedId, replaceUnchangedSku, 1],
      [replaceChangedId, replaceChangedSku, 1],
      [replaceAbsentId, replaceAbsentSku, 1]
    ].map(([id, sku, stock]) => ({
      id: Number(id), sku: String(sku), sku_norm: normalize(String(sku)),
      key_norm: productKey(String(sku), replaceBrand, 'Kutulu'),
      name: String(sku), name_norm: normalizeText(String(sku)), brand: replaceBrand, category: '', type: '', seal: '',
      d_inner: null, d_outer: null, width: null, stock: Number(stock), unit: 'Adet', price: 1, currency: 'TRY',
      list_price: null, card_price: null, min_order: 1, shelf: '', locations: [], box: 'Kutulu',
      barcode: '', image: '', description: '', equivalents: '', active: true, deleted: false,
      updated_at: new Date().toISOString()
    }))
    upsertLocal(replaceRows)
    const replaceWorkbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(replaceWorkbook, XLSX.utils.aoa_to_sheet([
      ['Stok Kodu', 'Marka', 'Adet', 'Kutu Durumu'],
      [replaceUnchangedSku, replaceBrand, '1', 'Kutulu'],
      [replaceChangedSku, replaceBrand, '2', 'Kutulu']
    ]), 'Sayfa1')
    XLSX.writeFile(replaceWorkbook, replaceFixture)
    const replacePreview = previewFile(replaceFixture)
    const replaceCalls: string[] = []
    let purgeKeep: number[] = []
    const fakeCloud = (() => ({
      from: (table: string) => ({
        upsert: (rows: ProductInsert[], options: { onConflict?: string }) => ({
          select: async () => {
            replaceCalls.push(`upsert:${table}:${options.onConflict}`)
            const data = rows
              .map((row) => ({ id: row.id ?? replaceIdsByKey.get(row.key_norm) ?? 99 }))
              .filter((row) => row.id !== replaceUnchangedId)
            return { data, error: null, status: 200 }
          }
        }),
        insert: (row: Record<string, unknown>) => ({
          select: () => ({
            single: async () => {
              replaceCalls.push(`insert:${table}`)
              return { data: { id: 1, ...row }, error: null, status: 201 }
            }
          })
        })
      }),
      rpc: async (name: string, args: { p_keep?: number[] }) => {
        replaceCalls.push(`rpc:${name}`)
        if (name === 'purge_products_except') purgeKeep = args.p_keep ?? []
        return { data: 0, error: null, status: 200 }
      }
    })) as unknown as typeof cloud
    await runImport({
      token: replacePreview.token, mapping: replacePreview.suggestedMapping, mode: 'replace', deactivateMissing: false,
      defaultCurrency: 'TRY', defaultBrand: '', defaultCategory: '', dryRun: false
    }, {
      cloud: fakeCloud,
      pullProducts: async (full) => {
        replaceCalls.push(`pull:${full === true}`)
        return 0
      }
    })
    replaceOrderOk = replaceCalls.indexOf('upsert:products:key_norm') < replaceCalls.indexOf('rpc:purge_products_except') &&
      replaceCalls.indexOf('rpc:purge_products_except') < replaceCalls.indexOf('pull:true') &&
      purgeKeep.includes(replaceUnchangedId) &&
      purgeKeep.includes(replaceChangedId) &&
      !purgeKeep.includes(replaceAbsentId)
    db.prepare('DELETE FROM products WHERE id IN (?, ?, ?)').run(replaceUnchangedId, replaceChangedId, replaceAbsentId)
  } catch (error) {
    console.error('import warning fixture failed', error)
  } finally {
    if (existsSync(warningFixture)) unlinkSync(warningFixture)
    if (existsSync(rekeyFixture)) unlinkSync(rekeyFixture)
    if (existsSync(replaceFixture)) unlinkSync(replaceFixture)
    db.prepare('DELETE FROM products WHERE sku = ?').run('QA-REKEY')
    db.prepare("DELETE FROM products WHERE sku LIKE 'QA-REPLACE-%'").run()
  }
  if (!importWarningsOk) {
    console.error('import warning generation failed')
    ok = false
  }
  console.log(`import warning generation: ${importWarningsOk ? 'ok' : 'failed'}`)
  if (!importerRekeyOk) {
    console.error('importer rekey planning failed')
    ok = false
  }
  console.log(`importer rekey planning: ${importerRekeyOk ? 'ok' : 'failed'}`)
  if (!releaseDeletedKeysOk) {
    console.error('importer did not release rekey targets before ID upserts')
    ok = false
  }
  console.log(`release deleted product keys before rekey: ${releaseDeletedKeysOk ? 'ok' : 'failed'}`)
  if (!replaceOrderOk) {
    console.error('replace import did not upload and preserve ids before purging')
    ok = false
  }
  console.log(`replace import upload-before-purge: ${replaceOrderOk ? 'ok' : 'failed'}`)

  const count = (db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c
  if (count < 10000) {
    const now = new Date().toISOString()
    const rows: ProductRow[] = generateDemoCatalog(12000).map((r, i) => ({
      id: 1_000_000 + i,
      sku: r.sku,
      sku_norm: normalize(r.sku),
      key_norm: productKey(r.sku, r.brand, ''),
      name: r.name,
      name_norm: normalizeText(r.name),
      brand: r.brand,
      category: r.category,
      type: r.type,
      seal: r.seal,
      d_inner: r.d_inner,
      d_outer: r.d_outer,
      width: r.width,
      stock: (i * 7) % 50,
      unit: 'Adet',
      price: 10 + (i % 300),
      currency: 'TRY',
      list_price: null,
      card_price: null,
      min_order: 1,
      shelf: `A-${(i % 40) + 1}`,
      locations: [],
      box: '',
      barcode: '',
      image: '',
      description: '',
      equivalents: r.equivalents,
      active: true,
      deleted: false,
      updated_at: now
    }))
    upsertLocal(rows)
    db.exec("INSERT INTO products_fts(products_fts) VALUES('optimize')")
  }
  const total = (db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c
  const fts = (db.prepare('SELECT COUNT(*) AS c FROM products_fts').get() as { c: number }).c
  console.log(`db ready in ${(performance.now() - t0).toFixed(0)} ms; products=${total}, fts=${fts}`)
  if (total < 10000 || fts !== total) ok = false

  const queries = ['6205', '6205 2rs', 'skf', 'konik', 'keçe', 'ucf', '30x62', '']
  for (const q of queries) {
    const t = performance.now()
    const page = searchProducts({ q, limit: 200, offset: 0, sort: 'relevance' })
    const ms = performance.now() - t
    console.log(`search "${q}": ${page.total} hits in ${ms.toFixed(1)} ms`)
    if (ms > 250) ok = false
  }
  const t1 = performance.now()
  const dim = searchProducts({ q: '', dInner: [25, 25], dOuter: [52, 52], limit: 50, offset: 0, sort: 'sku' })
  console.log(`dimension 25x52: ${dim.total} hits in ${(performance.now() - t1).toFixed(1)} ms`)
  const facets = productFacets({ q: '' })
  console.log(`facets: ${facets.brand.length} brands, ${facets.category.length} categories`)

  // Shop stock sheet layout: every column must land on the right field, including Turkish upper-case İ.
  const map = suggestMapping(['RAF', 'ÜRÜN ADI', 'MARKA', 'ADET', 'KUTU DURUMU', 'FİYAT', 'AÇIKLAMA'])
  const want: Record<string, string> = { shelf: 'RAF', sku: 'ÜRÜN ADI', brand: 'MARKA', stock: 'ADET', box: 'KUTU DURUMU', price: 'FİYAT', description: 'AÇIKLAMA' }
  for (const [f, h] of Object.entries(want)) {
    if (map[f as keyof typeof map] !== h) {
      console.error(`import mapping: ${f} -> ${map[f as keyof typeof map] ?? '-'} (expected ${h})`)
      ok = false
    }
  }
  if (map.name) {
    console.error(`import mapping: name unexpectedly mapped to ${map.name}`)
    ok = false
  }
  // The cell is one label; it is never split into several products.
  const boxCases: [string, string][] = [
    ['kutusuz', 'Kutusuz'],
    ['KUTULU', 'Kutulu'],
    ['orj kağıt', 'Orjinal Kağıt'],
    ['3 KUTULU 1 ORJ\nKAĞIT 1\nKUTUSUZ', '3 Kutulu 1 Kutusuz 1 Orjinal Kağıt'],
    ['2KUTULU 1KUTUSZ', '2 Kutulu 1 Kutusuz'],
    ['33 KUTULU – 1 KUTUSUZ', '33 Kutulu 1 Kutusuz'],
    ['', '']
  ]
  for (const [input, want] of boxCases) {
    const got = parseBox(input)
    if (got !== want) {
      console.error('import box parsing failed', JSON.stringify(input), got, want)
      ok = false
    }
  }
  const boxIdentityOk =
    ['KUTULU', 'KUTULI', 'KUTU', 'KUTULLU'].every((value) => canonBox(value) === 'Kutulu') &&
    ['KUTUSUZ', 'KUTUSZ', 'KUTSUZ', 'KUTUUSZ', 'KUTUUSUZ'].every((value) => canonBox(value) === 'Kutusuz') &&
    canonBox('2 KUTULU 1 KUTUSUZ 3 KUTULU') === '5 Kutulu 1 Kutusuz' &&
    canonBox('2 KUTULU') === 'Kutulu' &&
    boxIdentity('4 Kutulu 2 Kutusuz') === boxIdentity('1 Kutusuz 2 Kutulu') &&
    boxIdentity('ORJ 10 LU PAKET') !== boxIdentity('ORJ 20 LU PAKET') &&
    boxIdentity("10'LU PAKET") !== boxIdentity("20'LU PAKET") &&
    boxParts('ORJ 10 LU PAKET')?.[0]?.count === null &&
    productKey('A', 'SKF', 'Kutulu') !== productKey('A', 'SKF', 'Kutulu ve Kutusuz')
  const brandAliasRows = brandAliasEntries({
    GMBKORE: 'GMB KOREA',
    HICJAPON: 'HIC JAPAN',
    GNUTTIILTAY: 'GNUTTI İTALY',
    UNKNOWNKEY: 'TARGET',
    'MiXeD Source': 'Target'
  })
  const savedHoffmanAliases = { HOFFMANN: 'HOFFMAN' }
  const savedHoffman = resolveBrand('HOFFMAN', new Map<string, string>(), savedHoffmanAliases)
  const savedHoffmann = resolveBrand('HOFFMANN', new Map<string, string>(), savedHoffmanAliases)
  const brandIdentityOk =
    brandOrigin('FAG GERMANY').base === 'FAG' && brandOrigin('FAG GERMANY').origin === 'Almanya' &&
    brandOrigin('GERMANY').origin === '' &&
    brandOrigin('ÇİN').base === 'ÇİN' && brandOrigin('ÇİN').origin === '' &&
    brandOrigin('SKF(ÇIKMA)').base === 'SKF' && brandOrigin('SKF(ÇIKMA)').condition === 'Çıkma' &&
    brandOrigin('NMB ÇIKMA').base === 'NMB' && brandOrigin('NMB ÇIKMA').origin === '' &&
    brandOrigin('NB ( JAPAN )').base === 'NB' && brandOrigin('NB ( JAPAN )').origin === 'Japonya' &&
    brandOrigin('USA MCGILL').base === 'MCGILL' && brandOrigin('USA MCGILL').origin === 'ABD' &&
    brandOrigin('GERMANY/İNA').base === 'İNA' && brandOrigin('ÇİN ÇIKMA').base === 'ÇİN' &&
    brandOrigin('ÇIKMA/ÇİN').base === 'ÇİN' && brandOrigin('ÇIKMA/ÇİN').condition === 'Çıkma' && brandOrigin('ÇIKMA/ÇİN').origin === '' &&
    brandOrigin('SKF GERMANY ÇIKMA').base === 'SKF' && brandOrigin('SKF GERMANY ÇIKMA').origin === 'Almanya' && brandOrigin('SKF GERMANY ÇIKMA').condition === 'Çıkma' &&
    brandOrigin('SKF GERMAN').base === 'SKF' && brandOrigin('RHP UK').origin === 'İngiltere' &&
    brandOrigin('GPZ-ZKL').base === 'GPZ-ZKL' && brandOrigin('D-TECH').base === 'D-TECH' && brandOrigin('').base === '' &&
    mergeBrandAliases({}).HOFFMAN === 'HOFFMANN' &&
    mergeBrandAliases({}).HOFFMAN === DEFAULT_BRAND_ALIASES.HOFFMAN &&
    !('HOFFMANN' in mergeBrandAliases({})) &&
    mergeBrandAliases(savedHoffmanAliases).HOFFMANN === 'HOFFMAN' &&
    mergeBrandAliases(savedHoffmanAliases).HOFFMAN === undefined &&
    savedHoffman === 'HOFFMAN' &&
    savedHoffmann === 'HOFFMAN' &&
    resolveBrand(savedHoffman, new Map<string, string>(), savedHoffmanAliases) === savedHoffman &&
    resolveBrand('HOFFMAN', new Map<string, string>(), {}) === 'HOFFMANN' &&
    resolveBrand('HOFFMANN', new Map<string, string>(), {}) === 'HOFFMANN' &&
    !('SELF' in mergeBrandAliases({ SELF: 'SELF' })) &&
    brandAliasRows.find(({ key }) => key === 'GMBKORE')?.source === 'GMB KORE' &&
    brandAliasRows.find(({ key }) => key === 'HICJAPON')?.source === 'HIC JAPON' &&
    brandAliasRows.find(({ key }) => key === 'GNUTTIILTAY')?.source === 'GNUTTI ILTAY' &&
    brandAliasRows.find(({ key }) => key === 'UNKNOWNKEY')?.source === 'UNKNOWNKEY' &&
    brandAliasRows.find(({ key }) => key === 'MIXEDSOURCE')?.source === 'MiXeD Source'
  const shelfFallbackOk = shelfBreakdown({
    shelf: 'A / B', stock: 7, box: 'Kutulu',
    locations: [{ shelf: 'A', qty: 2, box: 'Kutulu' }, { shelf: 'B', qty: 3, box: 'Kutusuz' }]
  }).length === 2 && shelfBreakdown({
    shelf: 'A / B', stock: 7, box: 'Kutulu',
    locations: [{ shelf: 'A', qty: 2, box: 'Kutulu' }, { shelf: 'B', qty: 3, box: 'Kutusuz' }]
  }).every((location) => location.qty === null) && shelfBreakdown({
    shelf: 'A / B', stock: 7, box: 'Kutulu',
    locations: [{ shelf: 'X', qty: 7, box: 'Kutusuz' }]
  }).every((location) => location.qty === null) && shelfBreakdown({
    shelf: 'A', stock: 7, box: 'Kutulu', locations: []
  })[0]?.qty === 7 && shelfBreakdown({
    shelf: 'C', stock: 20, box: 'Kutusuz',
    locations: [{ shelf: 'C', qty: 19, box: 'Kutusuz' }]
  })[0]?.qty === 20
  const kutulu = { id: 1, box: 'Kutulu', stock: 10, unit: 'adet', shelf: 'A / B', locations: [] }
  const kutusuz = { id: 2, box: 'Kutusuz', stock: 20, unit: 'adet', shelf: 'C', locations: [] }
  const variantShelfRows = [kutulu, kutusuz].flatMap((variant) =>
    shelfBreakdown(variant).map((location) => ({ variant, location }))
  )
  const variantShelfSummary = shelfQuantitySummary(variantShelfRows)
  const variantShelfSummaryOk = variantShelfRows.find(({ location }) => location.shelf === 'C')?.location.qty === 20 &&
    variantShelfRows.filter(({ variant }) => variant.id === kutulu.id).every(({ location }) => location.qty === null) &&
    !variantShelfSummary.hideQuantityColumn &&
    variantShelfSummary.notes.length === 1 &&
    variantShelfSummary.notes[0]?.label === 'Kutulu toplam 10 adet · raf dağılımı belli değil'
  const singleVariant = { id: 3, box: 'Kutulu', stock: 2, unit: 'adet', shelf: 'K1 / YENİ DEPO TAHTA RAF', locations: [] }
  const singleVariantRows = shelfBreakdown(singleVariant).map((location) => ({ variant: singleVariant, location }))
  const singleVariantSummary = shelfQuantitySummary(singleVariantRows)
  const singleVariantSummaryOk = singleVariantRows.length === 2 &&
    singleVariantRows.every(({ location }) => location.qty === null) &&
    singleVariantSummary.hideQuantityColumn &&
    singleVariantSummary.notes.length === 1 &&
    singleVariantSummary.notes[0]?.label === 'Toplam 2 adet · raf dağılımı belli değil'
  const locationLabelOk = locationLabel({ shelf: 'D7', qty: 1 }) === 'D7 · 1 adet' &&
    locationLabel({ shelf: 'D7', qty: null }, 'kutu') === 'D7'
  if (!boxIdentityOk || !brandIdentityOk || !shelfFallbackOk || !variantShelfSummaryOk || !singleVariantSummaryOk || !locationLabelOk) {
    console.error('box identity, brand-origin/alias identity, shelf fallback, or shelf quantity summary failed')
    ok = false
  }
  console.log(`box identity, brand origin, shelf fallback, shelf quantity summary, location label: ${boxIdentityOk && brandIdentityOk && shelfFallbackOk && variantShelfSummaryOk && singleVariantSummaryOk && locationLabelOk ? 'ok' : 'failed'}`)
  if (productKey('51120', 'SKF', 'ORJ KAGIT') !== productKey('51120', 'SKF', 'Orjinal Kağıt')) {
    console.error('box canonicalisation not part of productKey')
    ok = false
  }
  console.log('import mapping: ok')

  // Brand spelling variants (Turkish dotted/dotless i, case, spacing) are one brand.
  for (const v of ['INA', 'İNA', 'ina', 'ına', ' Ina ', 'I N A']) {
    if (normalize(canonBrand(v)) !== 'INA' || productKey('6205', v, '') !== productKey('6205', 'INA', '')) {
      console.error('brand identity differs for', JSON.stringify(v), canonBrand(v))
      ok = false
    }
  }
  const importBrandCases: [string[][], string][] = [
    [
      [['6205-1', 'INA'], ['6205-2', 'INA'], ['6205-3', 'İNA'], ['6205-4', 'ına'], ['', 'İNA']],
      'INA'
    ],
    [
      [['6205-1', 'TİMKEN'], ['6205-2', 'TIMKEN'], ['6205-3', 'TIMKEN']],
      'TIMKEN'
    ]
  ]
  for (const [rows, want] of importBrandCases) {
    const spellings = brandSpellings(brandCountsFromRows(rows, 0, 1, ''), false)
    const resolved = new Set(
      rows
        .filter(([sku]) => !!sku?.trim() && !!normalize(sku))
        .map(([, brand]) => resolveBrand(brand ?? '', spellings))
    )
    if (resolved.size !== 1 || !resolved.has(want)) {
      console.error('import brand spelling mismatch', [...resolved], want)
      ok = false
    }
  }
  console.log('import brand spellings: ok')
  if (normalize(canonBrand('ÇİN')) === normalize(canonBrand('INA')) || normalize('SKF') === normalize('SNR')) {
    console.error('distinct brands collapsed')
    ok = false
  }
  const mentionCases: [string, string, boolean][] = [
    ['4 Kutulu 2 Kutusuz', 'Kutulu', true],
    ['4 Kutulu 2 Kutusuz', 'kutusuz', true],
    ['3 KUTULU 1 ORJ KAĞIT', 'Orjinal Kağıt', true],
    ['3 Kutulu 1 Orj Kağıt', 'Poşet', false],
    ['Kutulu', 'Kutulu', false],
    ['Kutusuz', 'Kutulu', false],
    ['', 'Kutulu', false],
    ['4 Kutulu 2 Kutusuz', '', false]
  ]
  for (const [label, word, want] of mentionCases) {
    if (boxMentions(label, word) !== want) {
      console.error('boxMentions', JSON.stringify(label), JSON.stringify(word), 'expected', want)
      ok = false
    }
  }

  // Duplicate scan: exact twins, packaging variants, blank-brand rows and distinct brands, on temporary local rows.
  const fx = (id: number, sku: string, brand: string, box: string): ProductRow => ({
    id,
    sku,
    sku_norm: normalize(sku),
    key_norm: `${productKey(sku, brand, box)}#${id}`,
    name: '',
    name_norm: '',
    brand,
    category: '',
    type: '',
    seal: '',
    d_inner: null,
    d_outer: null,
    width: null,
    stock: 1,
    unit: 'Adet',
    price: 0,
    currency: 'TRY',
    list_price: null,
    card_price: null,
    min_order: 1,
    shelf: '',
    locations: [],
    box,
    barcode: '',
    image: '',
    description: '',
    equivalents: '',
    active: true,
    deleted: false,
    updated_at: new Date().toISOString()
  })
  const fixtures = [
    fx(9_000_001, 'ZZ-DUP-1', 'INA', 'Kutulu'),
    fx(9_000_002, 'ZZ DUP 1', 'İNA', 'KUTULU'),
    fx(9_000_003, 'ZZ-DUP-2', 'INA', 'Kutulu'),
    fx(9_000_004, 'ZZ-DUP-2', 'INA', 'Kutusuz'),
    fx(9_000_005, 'ZZ-DUP-2', '', '4 Kutulu 2 Kutusuz'),
    fx(9_000_006, 'ZZ-DUP-3', 'SKF', 'Kutulu'),
    fx(9_000_007, 'ZZ-DUP-3', 'FAG', 'Kutulu')
  ]
  try {
    upsertLocal(fixtures)
    if (resolveBrand('ına') !== 'INA') {
      console.error('resolveBrand', resolveBrand('ına'))
      ok = false
    }
    const groups = duplicateGroups(10_000).filter((g) => g.items.some((p) => p.id >= 9_000_000))
    const g1 = groups.find((g) => g.items.some((p) => p.id === 9_000_001))
    const g2 = groups.find((g) => g.items.some((p) => p.id === 9_000_003))
    const g3 = groups.find((g) => g.items.some((p) => p.id === 9_000_006))
    if (!g1 || g1.kind !== 'exact' || g1.items.length !== 2) {
      console.error('exact duplicate group missing', g1)
      ok = false
    }
    if (!g2 || g2.kind !== 'box' || g2.items.length !== 3 || g2.boxes.length !== 3) {
      console.error('box duplicate group missing', g2)
      ok = false
    }
    if (g3) {
      console.error('distinct brands grouped', g3)
      ok = false
    }
    console.log(`duplicate scan: ok (${groups.length} fixture groups)`)
  } finally {
    db.prepare('DELETE FROM products WHERE id >= 9000000').run()
  }

  const user = process.env.B2B_CHECK_USER
  const pass = process.env.B2B_CHECK_PASS
  if (user && pass) {
    try {
      const s = await login(user, pass)
      console.log(`cloud login ${user}: ok (${s.user.role})`)
      const t2 = performance.now()
      const n = await pullProducts(true)
      console.log(`cloud pull: ${n} products in ${(performance.now() - t2).toFixed(0)} ms`)
      const orders = await listOrders({ limit: 5 })
      console.log(`cloud orders visible: ${orders.length}`)
      if (s.user.role === 'admin') console.log(`cloud users: ${(await listUsers()).length}`)
      if (process.env.B2B_CHECK_WRITE === '1' && s.user.role === 'admin') ok = (await writeCheck()) && ok
      await logout()
    } catch (e) {
      console.error('cloud check failed', e)
      ok = false
    }
  } else console.log('cloud check skipped (B2B_CHECK_USER/B2B_CHECK_PASS not set)')

  const outboxBeforeWipe = (db.prepare('SELECT COUNT(*) AS c FROM outbox').get() as { c: number }).c
  db.prepare("INSERT OR REPLACE INTO sync_state(key, value) VALUES ('products_cursor', 'stale'), ('catalog_generation', 'stale')").run()
  wipeProducts()
  const productsAfterWipe = (db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c
  const ftsAfterWipe = (db.prepare('SELECT COUNT(*) AS c FROM products_fts').get() as { c: number }).c
  const stateAfterWipe = (db.prepare("SELECT COUNT(*) AS c FROM sync_state WHERE key IN ('products_cursor', 'catalog_generation')").get() as { c: number }).c
  const outboxAfterWipe = (db.prepare('SELECT COUNT(*) AS c FROM outbox').get() as { c: number }).c
  const wipeOk = productsAfterWipe === 0 && ftsAfterWipe === 0 && stateAfterWipe === 0 && outboxAfterWipe === outboxBeforeWipe
  console.log(`logout product wipe: ${wipeOk ? 'ok' : 'failed'} (products/FTS/cursors cleared; outbox retained)`)
  ok = wipeOk && ok

  console.log(ok ? 'SELFCHECK OK' : 'SELFCHECK FAILED')
  return ok ? 0 : 1
}
