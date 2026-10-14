import { normalize } from '@shared/identity'
import type { Product } from '@shared/types'

export interface SearchEntry {
  product: Product
  sku: string
  haystack: string
  brand: string
}

export interface DimensionFilters {
  dMin: number | null
  dMax: number | null
  DMin: number | null
  DMax: number | null
  bMin: number | null
  bMax: number | null
}

export function indexProducts(products: Product[]): SearchEntry[] {
  return products.map((product) => ({
    product,
    sku: normalize(product.sku),
    brand: normalize(product.brand),
    haystack: normalize(
      [
        product.sku,
        product.brand,
        product.name,
        product.description,
        product.equivalents,
        product.box,
        product.barcode,
        product.category,
        product.type,
        product.seal
      ].join(' ')
    )
  }))
}

export function searchProducts(
  entries: SearchEntry[],
  query: string,
  options: {
    inStock?: boolean
    brands?: Set<string>
    dimensions?: DimensionFilters
  } = {}
): Product[] {
  const normalizedQuery = normalize(query.trim())
  const tokens = query.trim().split(/\s+/).filter(Boolean).map(normalize)
  const exact: Product[] = []
  const prefix: Product[] = []
  const contains: Product[] = []
  const other: Product[] = []
  const d = options.dimensions
  for (const entry of entries) {
    const p = entry.product
    if (options.inStock && p.stock <= 0) continue
    if (options.brands?.size && !options.brands.has(entry.brand)) continue
    if (d && ((d.dMin !== null && (p.d_inner === null || p.d_inner < d.dMin)) ||
      (d.dMax !== null && (p.d_inner === null || p.d_inner > d.dMax)) ||
      (d.DMin !== null && (p.d_outer === null || p.d_outer < d.DMin)) ||
      (d.DMax !== null && (p.d_outer === null || p.d_outer > d.DMax)) ||
      (d.bMin !== null && (p.width === null || p.width < d.bMin)) ||
      (d.bMax !== null && (p.width === null || p.width > d.bMax)))) continue
    if (tokens.some((token) => !entry.haystack.includes(token))) continue
    if (!tokens.length) {
      other.push(p)
    } else if (entry.sku === normalizedQuery) {
      exact.push(p)
    } else if (entry.sku.startsWith(normalizedQuery)) {
      prefix.push(p)
    } else {
      contains.push(p)
    }
  }
  return [...exact, ...prefix, ...contains, ...other]
}
