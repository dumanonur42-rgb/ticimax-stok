import type { Product, ProductLocation } from './types'
import { normalize } from './identity'

export function parseProductLocations(value: unknown): ProductLocation[] {
  if (Array.isArray(value)) return value as ProductLocation[]
  if (typeof value !== 'string') return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed as ProductLocation[] : []
  } catch {
    return []
  }
}

export interface ShelfBreakdownItem {
  shelf: string
  qty: number | null
  box: string
}

export interface ShelfQuantitySummary {
  hideQuantityColumn: boolean
  notes: { variantId: Product['id']; label: string }[]
}

const locationNumber = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })

export function locationLabel(loc: Pick<ShelfBreakdownItem, 'shelf' | 'qty'>, unit = 'adet'): string {
  const shelf = loc.shelf.trim()
  const quantity = loc.qty === null ? '' : `${locationNumber.format(loc.qty)} ${unit.trim() || 'adet'}`
  return [shelf, quantity].filter(Boolean).join(' · ')
}

export function shelfQuantitySummary(
  rows: Array<{
    variant: Pick<Product, 'id' | 'box' | 'stock' | 'unit'>
    location: Pick<ShelfBreakdownItem, 'qty'>
  }>
): ShelfQuantitySummary {
  const unknownVariants = new Map<Product['id'], Pick<Product, 'id' | 'box' | 'stock' | 'unit'>>()
  rows.forEach(({ variant, location }) => {
    if (location.qty === null) unknownVariants.set(variant.id, variant)
  })
  const hideQuantityColumn = rows.length > 0 &&
    rows.every(({ location }) => location.qty === null) &&
    new Set(rows.map(({ variant }) => variant.id)).size === 1
  const notes = [...unknownVariants.values()].map((variant) => {
    const box = variant.box.trim()
    const totalLabel = hideQuantityColumn || !box ? 'Toplam' : `${box} toplam`
    return {
      variantId: variant.id,
      label: `${totalLabel} ${locationNumber.format(variant.stock)} ${variant.unit.trim() || 'adet'} · raf dağılımı belli değil`
    }
  })
  return { hideQuantityColumn, notes }
}

export function shelfBreakdown(product: Pick<Product, 'shelf' | 'stock' | 'box' | 'locations'>): ShelfBreakdownItem[] {
  const shelves = product.shelf.split(' / ').map((shelf) => shelf.trim()).filter(Boolean)
  const shelfSet = new Set(shelves.map(normalize))
  const locations = product.locations ?? []
  const locationShelves = new Set(locations.map((location) => normalize(location.shelf)).filter(Boolean))
  const sameShelves = shelfSet.size === locationShelves.size && [...shelfSet].every((shelf) => locationShelves.has(shelf))
  if (locations.length && sameShelves) {
    const quantitiesMatch = locations.reduce((sum, location) => sum + location.qty, 0) === product.stock
    if (quantitiesMatch) return locations.map((location: ProductLocation) => ({ shelf: location.shelf, qty: location.qty, box: location.box }))
    if (shelves.length === 1) return shelves.map((shelf) => ({ shelf, qty: product.stock, box: product.box }))
    return locations.map((location: ProductLocation) => ({ shelf: location.shelf, qty: null, box: location.box }))
  }
  return shelves.map((shelf) => ({ shelf, qty: shelves.length === 1 ? product.stock : null, box: product.box }))
}
