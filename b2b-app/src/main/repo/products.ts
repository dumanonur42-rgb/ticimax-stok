import type { Facets, FacetValue, Product, ProductFilter, ProductInput, ProductPage } from '@shared/types'
import { cloud, must, mustVoid } from '../cloud/client'
import type { ProductInsert } from '../cloud/database.types'
import { toProduct } from '../cloud/map'
import { upsertLocal } from '../cloud/sync'
import { getDb, normalize, normalizeText } from '../db'

const COLS = `id, sku, name, brand, category, type, seal, d_inner, d_outer, width, stock, unit, price, currency,
  list_price, card_price, min_order, shelf, barcode, image, description, equivalents, active, updated_at`

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
  const clauses: string[] = ['p.active = 1']
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

export function productsBySkus(skus: string[]): Product[] {
  if (!skus.length) return []
  const norms = skus.map(normalize)
  return getDb()
    .prepare(`SELECT ${COLS} FROM products p WHERE sku_norm IN (${norms.map(() => '?').join(',')})`)
    .all(...norms) as Product[]
}

/** Writes go to the cloud; the returned row is mirrored into the local cache right away. */
export async function saveProduct(p: Partial<Product> & ProductInput): Promise<Product> {
  const sku = p.sku.trim()
  if (!sku) throw new Error('Ürün kodu boş olamaz.')
  const row: ProductInsert = {
    ...(p.id ? { id: p.id } : {}),
    sku,
    sku_norm: normalize(sku),
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
    barcode: p.barcode,
    image: p.image,
    description: p.description,
    equivalents: p.equivalents,
    active: !!p.active,
    deleted: false
  }
  const sb = cloud()
  const saved = p.id
    ? must(await sb.from('products').update(row).eq('id', p.id).select('*').single())
    : must(await sb.from('products').upsert(row, { onConflict: 'sku_norm' }).select('*').single())
  upsertLocal([saved])
  return toProduct(saved)
}

export async function deleteProduct(id: number): Promise<void> {
  mustVoid(await cloud().from('products').update({ deleted: true, active: false }).eq('id', id))
  getDb().prepare('DELETE FROM products WHERE id = ?').run(id)
}

export function allProductsForExport(f: ProductFilter): Product[] {
  const w = buildWhere(f)
  const o = orderBy(f, w)
  return getDb()
    .prepare(`SELECT ${COLS} FROM products p WHERE ${w.sql} ORDER BY ${o.sql}`)
    .all(...w.params, ...o.params) as Product[]
}
