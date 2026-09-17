import { DEFAULT_ADMIN, DEFAULT_STAFF, getDb } from './db'
import { searchProducts, productFacets } from './repo/products'
import { refreshLegacyDemo, seedDemo } from './repo/seed'
import { listOrders } from './repo/orders'
import { approveUser, deleteUser, ensureDealerCustomers, listUsers, login, registerUser } from './repo/users'

/** Headless sanity run: `electron . --selfcheck`. Seeds demo data, times searches, exits non-zero on failure. */
export function runSelfCheck(): number {
  const t0 = performance.now()
  const db = getDb()
  const refreshed = refreshLegacyDemo()
  ensureDealerCustomers()
  if (refreshed) console.log(`legacy demo catalogue regenerated: ${refreshed} products`)
  const count = (db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c
  const seeded = count < 10000 ? seedDemo(12000) : 0
  const total = (db.prepare('SELECT COUNT(*) AS c FROM products').get() as { c: number }).c
  const fts = (db.prepare('SELECT COUNT(*) AS c FROM products_fts').get() as { c: number }).c
  console.log(`db ready in ${(performance.now() - t0).toFixed(0)} ms; products=${total} (seeded ${seeded}), fts=${fts}`)

  const queries = ['6205', '6205 2rs', 'skf', 'konik', 'keçe', 'ucf', '30x62', '']
  let ok = total >= 10000 && fts === total
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
  const session = login(DEFAULT_ADMIN.username, DEFAULT_ADMIN.password)
  console.log(`login ${DEFAULT_ADMIN.username}: ${session ? 'ok' : 'FAILED'}`)
  if (!session) ok = false
  const staff = login(DEFAULT_STAFF.username, DEFAULT_STAFF.password)
  const staffOk = staff?.user.role === 'bayi' && staff.customer !== null
  console.log(`login ${DEFAULT_STAFF.username}: ${staffOk ? 'ok (bayi, cari #' + staff?.customer?.id + ')' : 'FAILED'}`)
  if (!staffOk) ok = false
  if (staff?.customer) {
    const foreign = listOrders({ customer_id: staff.customer.id }).filter((o) => o.customer_id !== staff.customer!.id)
    console.log(`dealer order scope: ${foreign.length === 0 ? 'ok' : 'LEAK ' + foreign.length}`)
    if (foreign.length) ok = false
  }

  const probe = `selfcheck_${Date.now()}`
  registerUser({ username: probe, display_name: 'Self Check', password: 'test1234' })
  let pendingBlocked = false
  try {
    login(probe, 'test1234')
  } catch {
    pendingBlocked = true
  }
  const pendingUser = listUsers().find((u) => u.username === probe)
  approveUser(pendingUser!.id)
  const approved = login(probe, 'test1234')
  deleteUser(pendingUser!.id)
  const approvedOk = approved?.user.role === 'bayi' && !!approved.user.approved && approved.customer !== null
  console.log(`register/approve flow: pending blocked=${pendingBlocked}, approved dealer login=${approvedOk}`)
  if (!pendingBlocked || !approvedOk) ok = false
  console.log(ok ? 'SELFCHECK OK' : 'SELFCHECK FAILED')
  return ok ? 0 : 1
}
