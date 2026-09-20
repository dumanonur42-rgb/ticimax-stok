import type {
  BulkProductPatch,
  DuplicateGroup,
  Facets,
  FacetValue,
  MergeInput,
  Product,
  ProductFilter,
  ProductInput,
  ProductPage,
  QuickEntryResult,
  QuickEntryRow
} from '@shared/types'
import { cloud, must, mustVoid } from '../cloud/client'
import type { ProductInsert } from '../cloud/database.types'
import { toProduct } from '../cloud/map'
import { upsertLocal } from '../cloud/sync'
import { getDb, normalize, normalizeText, productKey } from '../db'
import { getSettings } from './settings'

const COLS = `id, sku, name, brand, category, type, seal, d_inner, d_outer, width, stock, unit, price, currency,
  list_price, card_price, min_order, shelf, box, barcode, image, description, equivalents, active, updated_at`

interface Where {
  sql: string
  params: unknown[]
  rank: string
  rankParams: unknown[]
}

function ftsQuery(q: string): string | null {
  const tokens = normalizeText(q)
    .split(' ')
    .filter((t) => t.length >= 3)
  if (tokens.length === 0) return null
  const joined = normalize(q)
  const and = tokens.map((t) => `"${t}"`).join(' AND ')
  return joined.length >= 3 && tokens.length > 1 ? `(${and}) OR "${joined}"` : and
}

function buildWhere(f: ProductFilter, exclude?: keyof ProductFilter): Where {
  const clauses: string[] = f.includeInactive ? ['1 = 1'] : ['p.active = 1']
  const params: unknown[] = []
  let rank = ''
  const rankParams: unknown[] = []

  const q = (f.q ?? '').trim()
  if (q) {
    const qn = normalize(q)
    const fts = ftsQuery(q)
    const parts: string[] = []
    if (qn) {
      parts.push('p.sku_norm LIKE ?')
      params.push(`%${qn}%`)
    }
    if (fts) {
      parts.push('p.id IN (SELECT rowid FROM products_fts WHERE products_fts MATCH ?)')
      params.push(fts)
    } else {
      const tn = normalizeText(q)
      if (tn) {
        parts.push('p.name_norm LIKE ?')
        params.push(`%${tn}%`)
      }
    }
    if (parts.length) clauses.push(`(${parts.join(' OR ')})`)
    if (qn) {
      rank = 'CASE WHEN p.sku_norm = ? THEN 0 WHEN p.sku_norm LIKE ? THEN 1 WHEN p.sku_norm LIKE ? THEN 2 ELSE 3 END'
      rankParams.push(qn, `${qn}%`, `%${qn}%`)
    }
  }

  const inList = (col: string, key: 'brand' | 'category' | 'type' | 'seal'): void => {
    if (exclude === key) return
    const vals = f[key]
    if (vals && vals.length) {
      clauses.push(`p.${col} IN (${vals.map(() => '?').join(',')})`)
      params.push(...vals)
    }
  }
  inList('brand', 'brand')
  inList('category', 'category')
  inList('type', 'type')
  inList('seal', 'seal')

  if (f.inStock && exclude !== 'inStock') clauses.push('p.stock > 0')

  const range = (col: string, key: 'dInner' | 'dOuter' | 'width'): void => {
    if (exclude === key) return
    const r = f[key]
    if (!r) return
    const [min, max] = r
    if (min != null) {
      clauses.push(`p.${col} >= ?`)
      params.push(min)
    }
    if (max != null) {
      clauses.push(`p.${col} <= ?`)
      params.push(max)
    }
  }
  range('d_inner', 'dInner')
  range('d_outer', 'dOuter')
  range('width', 'width')

  return { sql: clauses.join(' AND '), params, rank, rankParams }
}

function orderBy(f: ProductFilter, w: Where): { sql: string; params: unknown[] } {
  const dir = f.sortDir === 'desc' ? 'DESC' : 'ASC'
  switch (f.sort) {
    case 'sku':
      return { sql: `p.sku ${dir}`, params: [] }
    case 'name':
      return { sql: `p.name COLLATE NOCASE ${dir}`, params: [] }
    case 'stock':
      return { sql: `p.stock ${dir}, p.sku`, params: [] }
    case 'shelf':
      return { sql: `(p.shelf = '') ASC, p.shelf ${dir}, p.sku`, params: [] }
    case 'price':
      return { sql: `p.price ${dir}, p.sku`, params: [] }
    case 'updated':
      return { sql: `p.updated_at ${dir}, p.sku`, params: [] }
    default:
      return { sql: `${w.rank ? `${w.rank}, ` : ''}(p.stock > 0) DESC, p.sku`, params: w.rankParams }
  }
}

export function searchProducts(f: ProductFilter): ProductPage {
  const db = getDb()
  const w = buildWhere(f)
  const limit = Math.min(Math.max(f.limit ?? 100, 1), 2000)
  const offset = Math.max(f.offset ?? 0, 0)
  const total = (
    db.prepare(`SELECT COUNT(*) c FROM products p WHERE ${w.sql}`).get(...w.params) as { c: number }
  ).c
  const o = orderBy(f, w)
  const items = db
    .prepare(`SELECT ${COLS} FROM products p WHERE ${w.sql} ORDER BY ${o.sql} LIMIT ? OFFSET ?`)
    .all(...w.params, ...o.params, limit, offset) as Product[]
  return { items, total }
}

export function productFacets(f: ProductFilter): Facets {
  const db = getDb()
  const facet = (col: 'brand' | 'category' | 'type' | 'seal'): FacetValue[] => {
    const w = buildWhere(f, col)
    return db
      .prepare(
        `SELECT p.${col} value, COUNT(*) count FROM products p WHERE ${w.sql} AND p.${col} <> ''
         GROUP BY p.${col} ORDER BY count DESC, value LIMIT 60`
      )
      .all(...w.params) as FacetValue[]
  }
  return { brand: facet('brand'), category: facet('category'), type: facet('type'), seal: facet('seal') }
}

export function getProduct(id: number): Product | null {
  return (getDb().prepare(`SELECT ${COLS} FROM products p WHERE id = ?`).get(id) as Product) ?? null
}

/** Every product carrying one of the codes, whatever the brand or packaging. */
export function productsBySkus(skus: string[]): Product[] {
  if (!skus.length) return []
  const norms = skus.map(normalize)
  return getDb()
    .prepare(`SELECT ${COLS} FROM products p WHERE sku_norm IN (${norms.map(() => '?').join(',')})`)
    .all(...norms) as Product[]
}

/** Exact identity lookup (code + brand + box), keyed by `productKey`. */
export function productsByKeys(keys: string[]): Map<string, Product> {
  if (!keys.length) return new Map()
  const rows = getDb()
    .prepare(`SELECT ${COLS} FROM products p WHERE key_norm IN (${keys.map(() => '?').join(',')})`)
    .all(...keys) as Product[]
  return new Map(rows.map((p) => [productKey(p.sku, p.brand, p.box), p]))
}

/** Writes go to the cloud; the returned row is mirrored into the local cache right away. */
export async function saveProduct(p: Partial<Product> & ProductInput): Promise<Product> {
  const sku = p.sku.trim()
  if (!sku) throw new Error('Ürün kodu boş olamaz.')
  const row: ProductInsert = {
    ...(p.id ? { id: p.id } : {}),
    sku,
    sku_norm: normalize(sku),
    key_norm: productKey(sku, p.brand, p.box),
    name: p.name,
    name_norm: normalizeText(p.name),
    brand: p.brand,
    category: p.category,
    type: p.type,
    seal: p.seal,
    d_inner: p.d_inner ?? null,
    d_outer: p.d_outer ?? null,
    width: p.width ?? null,
    stock: p.stock,
    unit: p.unit,
    price: p.price,
    currency: p.currency,
    list_price: p.list_price ?? null,
    card_price: p.card_price ?? null,
    min_order: p.min_order,
    shelf: p.shelf,
    box: p.box,
    barcode: p.barcode,
    image: p.image,
    description: p.description,
    equivalents: p.equivalents,
    active: !!p.active,
    deleted: false
  }
  const clash = productsByKeys([row.key_norm]).get(row.key_norm)
  if (clash && clash.id !== p.id)
    throw new Error(`"${clash.sku}" (${clash.brand || 'markasız'}${clash.box ? `, ${clash.box}` : ''}) zaten kayıtlı. Mevcut ürünü düzenleyin veya birleştirin.`)
  const sb = cloud()
  const saved = p.id
    ? must(await sb.from('products').update(row).eq('id', p.id).select('*').single())
    : must(await sb.from('products').upsert(row, { onConflict: 'key_norm' }).select('*').single())
  upsertLocal([saved])
  return toProduct(saved)
}

/** Words that describe packaging/condition rather than the bearing itself; ignored when matching duplicates. */
const NOISE = new Set([
  'KUTULU', 'KUTUSUZ', 'KUTU', 'KUTULI', 'ORJINAL', 'ORIJINAL', 'ORJ', 'ORG', 'ORIGINAL', 'YENI', 'ESKI', 'SIFIR',
  'ADET', 'AD', 'ADT', 'PCS', 'PC', 'TAKIM', 'TK', 'SET', 'PAKET', 'PKT', 'RULMAN', 'BILYA', 'BILYALI', 'BEARING',
  'MUADIL', 'MUADILI', 'ITHAL', 'YERLI', 'KALITELI', 'STOK', 'STOKTA', 'VAR', 'YOK', 'INDIRIMLI', 'KAMPANYA'
])

/**
 * Designation key: the SKU with the brand word, packaging words and punctuation stripped.
 * "6002 FAG kutulu" (FAG) and "6002" (FAG) collapse to the same key → certain duplicates.
 */
function designationTokens(sku: string, brand: string, brands: Set<string>): string[] {
  const b = normalize(brand)
  return normalizeText(sku)
    .split(' ')
    .filter((t) => t && t !== b && !brands.has(t) && !NOISE.has(t))
}

export function designationKey(sku: string, brand: string, brands: Set<string>): string {
  return designationTokens(sku, brand, brands).join('')
}

/** Brand column when filled, otherwise a known brand word found inside the code ("6002 FAG" with empty brand). */
function effectiveBrand(sku: string, brand: string, brands: Set<string>): string {
  const b = normalize(brand)
  if (b) return b
  return normalizeText(sku).split(' ').find((t) => brands.has(t)) ?? ''
}

const BOX_WORDS = new Map([
  ['KUTULU', 'KUTULU'],
  ['KUTULI', 'KUTULU'],
  ['KUTUSUZ', 'KUTUSUZ']
])

/** Box column when filled, otherwise a packaging word found inside the code ("6002 FAG kutulu"). */
function effectiveBox(sku: string, box: string): string {
  const b = normalize(box)
  if (b) return BOX_WORDS.get(b) ?? b
  for (const t of normalizeText(sku).split(' ')) {
    const w = BOX_WORDS.get(t)
    if (w) return w
  }
  return ''
}

function knownBrands(): Set<string> {
  const rows = getDb().prepare(`SELECT DISTINCT brand FROM products WHERE brand <> ''`).all() as { brand: string }[]
  return new Set(rows.map((r) => normalize(r.brand)).filter((b) => b.length >= 2))
}

/** Groups of products that are certainly the same item (same designation key, brand and packaging). */
export function duplicateGroups(limit = 400): DuplicateGroup[] {
  const brands = knownBrands()
  const rows = getDb().prepare(`SELECT ${COLS} FROM products p ORDER BY p.id`).all() as Product[]
  const buckets = new Map<string, Product[]>()
  for (const p of rows) {
    const key = designationKey(p.sku, p.brand, brands)
    if (key.length < 3) continue
    const k = `${key}|${effectiveBrand(p.sku, p.brand, brands)}|${effectiveBox(p.sku, p.box)}`
    const list = buckets.get(k)
    if (list) list.push(p)
    else buckets.set(k, [p])
  }
  const out: DuplicateGroup[] = []
  for (const [k, items] of buckets) {
    if (items.length < 2) continue
    out.push({ key: k, designation: k.split('|')[0], brand: items.find((p) => p.brand)?.brand ?? '', items })
    if (out.length >= limit) break
  }
  return out.sort((a, b) => b.items.length - a.items.length || a.designation.localeCompare(b.designation, 'tr'))
}

/**
 * Products that look like the one being typed in the editor: the identical item (code + brand + box) first,
 * then other brands/packagings of the same code, then same designation (brand-agnostic so a missing brand still warns).
 */
export function similarProducts(sku: string, brand: string, box: string, excludeId: number | null): Product[] {
  const s = sku.trim()
  if (normalize(s).length < 3) return []
  const brands = knownBrands()
  const tokens = designationTokens(s, brand, brands)
  const key = tokens.join('')
  const exact = productsBySkus([s]).filter((p) => p.id !== excludeId)
  const anchor = tokens.reduce((a, t) => (t.length > a.length ? t : a), '')
  const rows =
    key.length < 3 ? [] : (getDb().prepare(`SELECT ${COLS} FROM products p WHERE p.sku_norm LIKE ? LIMIT 500`).all(`%${anchor}%`) as Product[])
  const same = rows.filter((p) => p.id !== excludeId && designationKey(p.sku, p.brand, brands) === key)
  const seen = new Set<number>()
  const me = productKey(s, brand, box)
  const b = normalize(brand)
  const rank = (p: Product): number => (productKey(p.sku, p.brand, p.box) === me ? 0 : normalize(p.brand) === b ? 1 : 2)
  return [...exact, ...same]
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .sort((x, y) => rank(x) - rank(y) || x.id - y.id)
    .slice(0, 8)
}

/** Row-level edits from the stock screen (stock / shelf / prices / active) in a single round trip. */
export async function bulkUpdateProducts(rows: BulkProductPatch[]): Promise<Product[]> {
  if (!rows.length) return []
  const saved = must(await cloud().rpc('bulk_update_products', { p_rows: rows }))
  upsertLocal(saved)
  return saved.map(toProduct)
}

/**
 * Spreadsheet-style quick entry: unknown items become new products, known items (same code + brand + box) get
 * the quantity added to (or their stock replaced by) the typed amount; shelf/price are updated only when typed.
 * Rows with the same identity inside one batch are folded together first.
 */
export async function quickEntry(rows: QuickEntryRow[]): Promise<QuickEntryResult> {
  const result: QuickEntryResult = { created: 0, updated: 0, errors: [] }
  const folded = new Map<string, QuickEntryRow>()
  for (const r of rows) {
    const sku = r.sku.trim()
    if (!sku) continue
    const key = productKey(sku, r.brand, r.box)
    const prev = folded.get(key)
    if (!prev) folded.set(key, { ...r, sku, brand: r.brand.trim(), box: r.box.trim() })
    else {
      prev.stock += r.stock
      if (r.shelf.trim()) prev.shelf = r.shelf
      if (r.price != null) prev.price = r.price
      if (r.description.trim()) prev.description = [prev.description, r.description].filter((s) => s.trim()).join(' | ')
    }
  }
  if (!folded.size) return result
  const existing = productsByKeys([...folded.keys()])
  const currency = getSettings().default_currency
  const inserts: ProductInsert[] = []
  const patches: { sku: string; patch: BulkProductPatch }[] = []
  for (const [key, r] of folded) {
    const cur = existing.get(key)
    if (cur) {
      const patch: BulkProductPatch = { id: cur.id, stock: r.existing === 'set' ? r.stock : Number(cur.stock) + r.stock }
      if (r.shelf.trim()) patch.shelf = r.shelf.trim()
      if (r.price != null) patch.price = r.price
      patches.push({ sku: cur.sku, patch })
      continue
    }
    inserts.push({
      sku: r.sku,
      sku_norm: normalize(r.sku),
      key_norm: key,
      name: r.sku,
      name_norm: normalizeText(r.sku),
      brand: r.brand,
      category: '',
      type: '',
      seal: '',
      d_inner: null,
      d_outer: null,
      width: null,
      stock: r.stock,
      unit: 'Adet',
      price: r.price ?? 0,
      currency,
      list_price: null,
      card_price: null,
      min_order: 1,
      shelf: r.shelf.trim(),
      box: r.box,
      barcode: '',
      image: '',
      description: r.description.trim(),
      equivalents: '',
      active: true,
      deleted: false
    })
  }
  const sb = cloud()
  if (inserts.length) {
    try {
      const saved = must(await sb.from('products').insert(inserts).select('*'))
      upsertLocal(saved)
      result.created = saved.length
    } catch (e) {
      inserts.forEach((i) => result.errors.push({ sku: i.sku, message: (e as Error).message }))
    }
  }
  if (patches.length) {
    try {
      result.updated = (await bulkUpdateProducts(patches.map((p) => p.patch))).length
    } catch (e) {
      patches.forEach((p) => result.errors.push({ sku: p.sku, message: (e as Error).message }))
    }
  }
  return result
}

export async function deleteProducts(ids: number[]): Promise<void> {
  if (!ids.length) return
  mustVoid(await cloud().from('products').update({ deleted: true, active: false }).in('id', ids))
  const db = getDb()
  const del = db.prepare('DELETE FROM products WHERE id = ?')
  db.transaction(() => ids.forEach((id) => del.run(id)))()
}

/** Cloud-side merge (order lines re-pointed, stock summed, sources soft-deleted); mirror follows. */
export async function mergeProducts(input: MergeInput): Promise<Product> {
  const sources = input.sourceIds.filter((id) => id !== input.targetId)
  if (!sources.length) throw new Error('Birleştirilecek en az bir kaynak ürün seçin.')
  const patch: Record<string, unknown> = { ...input.patch }
  if (typeof patch.sku === 'string') {
    const sku = patch.sku.trim()
    if (!sku) throw new Error('Ürün kodu boş olamaz.')
    patch.sku = sku
    patch.sku_norm = normalize(sku)
  }
  if (typeof patch.name === 'string') patch.name_norm = normalizeText(patch.name)
  const target = getProduct(input.targetId)
  if (target) {
    const sku = typeof patch.sku === 'string' ? patch.sku : target.sku
    const brand = typeof patch.brand === 'string' ? patch.brand : target.brand
    const box = typeof patch.box === 'string' ? patch.box : target.box
    patch.key_norm = productKey(sku, brand, box)
  }
  const saved = must(await cloud().rpc('merge_products', { p_target: input.targetId, p_sources: sources, p_patch: patch }))
  const db = getDb()
  const del = db.prepare('DELETE FROM products WHERE id = ?')
  db.transaction(() => sources.forEach((id) => del.run(id)))()
  upsertLocal([saved])
  return toProduct(saved)
}

export async function deleteProduct(id: number): Promise<void> {
  mustVoid(await cloud().from('products').update({ deleted: true, active: false }).eq('id', id))
  getDb().prepare('DELETE FROM products WHERE id = ?').run(id)
}

/** Clean start: hard-deletes every product in the shared catalogue; every installation re-pulls an empty list. */
export async function purgeAllProducts(): Promise<number> {
  const n = must(await cloud().rpc('purge_all_products'))
  getDb().exec('DELETE FROM products')
  return n
}

export function allProductsForExport(f: ProductFilter): Product[] {
  const w = buildWhere(f)
  const o = orderBy(f, w)
  return getDb()
    .prepare(`SELECT ${COLS} FROM products p WHERE ${w.sql} ORDER BY ${o.sql}`)
    .all(...w.params, ...o.params) as Product[]
}
