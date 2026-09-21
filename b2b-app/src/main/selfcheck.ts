import type { ProductRow } from './cloud/database.types'
import { pullProducts, upsertLocal } from './cloud/sync'
import { getDb, normalize, normalizeText, productKey } from './db'
import { createOrder, getOrder, listOrders, setOrderStatus } from './repo/orders'
import { parseBox, suggestMapping } from './repo/importer'
import { duplicateGroups, getProduct, productFacets, resolveBrand, saveProduct, searchProducts } from './repo/products'
import { boxMentions, canonBrand } from '@shared/identity'
import { generateDemoCatalog, seedDemo } from './repo/seed'
import { listUsers, login, logout } from './repo/users'

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
      items: [{ product_id: sample.id, sku: sample.sku, name: sample.name, qty: 2, unit_price: sample.price, discount_pct: 0 }]
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

export async function runSelfCheck(): Promise<number> {
  const t0 = performance.now()
  const db = getDb()
  let ok = true

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
    ['3 KUTULU 1 ORJ\nKAĞIT 1\nKUTUSUZ', '3 Kutulu 1 Orj Kağıt 1 Kutusuz'],
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

  console.log(ok ? 'SELFCHECK OK' : 'SELFCHECK FAILED')
  return ok ? 0 : 1
}
