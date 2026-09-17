import { getDb } from './db'
import { searchProducts, productFacets } from './repo/products'
import { seedDemo } from './repo/seed'
import { login } from './repo/users'

/** Headless sanity run: `electron . --selfcheck`. Seeds demo data, times searches, exits non-zero on failure. */
export function runSelfCheck(): number {
  const t0 = performance.now()
  const db = getDb()
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
  const session = login('admin', 'admin')
  console.log(`login admin: ${session ? 'ok' : 'FAILED'}`)
  if (!session) ok = false
  console.log(ok ? 'SELFCHECK OK' : 'SELFCHECK FAILED')
  return ok ? 0 : 1
}
