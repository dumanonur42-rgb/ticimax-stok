import type { Facets, FacetValue, Product, ProductFilter, ProductInput, ProductPage } from '@shared/types'
import { getDb, normalize, normalizeText } from '../db'

const COLS = `id, sku, name, brand, category, type, seal, d_inner, d_outer, width, stock, unit, price, currency,
  list_price, min_order, shelf, barcode, image, description, equivalents, active, updated_at`

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

export function saveProduct(p: Partial<Product> & ProductInput): Product {
  const db = getDb()
  const row = {
    ...p,
    sku: p.sku.trim(),
    sku_norm: normalize(p.sku),
    name_norm: normalizeText(p.name),
    d_inner: p.d_inner ?? null,
    d_outer: p.d_outer ?? null,
    width: p.width ?? null,
    list_price: p.list_price ?? null
  }
  if (p.id) {
    db.prepare(
      `UPDATE products SET sku=@sku, sku_norm=@sku_norm, name=@name, name_norm=@name_norm, brand=@brand, category=@category,
       type=@type, seal=@seal, d_inner=@d_inner, d_outer=@d_outer, width=@width, stock=@stock, unit=@unit, price=@price,
       currency=@currency, list_price=@list_price, min_order=@min_order, shelf=@shelf, barcode=@barcode, image=@image,
       description=@description, equivalents=@equivalents, active=@active, updated_at=datetime('now','localtime') WHERE id=@id`
    ).run(row)
    return getProduct(p.id)!
  }
  const r = db
    .prepare(
      `INSERT INTO products(sku, sku_norm, name, name_norm, brand, category, type, seal, d_inner, d_outer, width, stock, unit,
       price, currency, list_price, min_order, shelf, barcode, image, description, equivalents, active)
       VALUES (@sku,@sku_norm,@name,@name_norm,@brand,@category,@type,@seal,@d_inner,@d_outer,@width,@stock,@unit,@price,
       @currency,@list_price,@min_order,@shelf,@barcode,@image,@description,@equivalents,@active)`
    )
    .run(row)
  return getProduct(Number(r.lastInsertRowid))!
}

export function deleteProduct(id: number): void {
  getDb().prepare('DELETE FROM products WHERE id = ?').run(id)
}

export function allProductsForExport(f: ProductFilter): Product[] {
  const w = buildWhere(f)
  const o = orderBy(f, w)
  return getDb()
    .prepare(`SELECT ${COLS} FROM products p WHERE ${w.sql} ORDER BY ${o.sql}`)
    .all(...w.params, ...o.params) as Product[]
}

export function adjustStock(productId: number, delta: number): void {
  getDb()
    .prepare(`UPDATE products SET stock = MAX(0, stock + ?), updated_at=datetime('now','localtime') WHERE id = ?`)
    .run(delta, productId)
}
