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

const locationNumber = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })

export function locationLabel(loc: Pick<ShelfBreakdownItem, 'shelf' | 'qty'>, unit = 'adet'): string {
  const shelf = loc.shelf.trim()
  const quantity = loc.qty === null ? '' : `${locationNumber.format(loc.qty)} ${unit.trim() || 'adet'}`
  return [shelf, quantity].filter(Boolean).join(' · ')
}

export function shelfBreakdown(product: Pick<Product, 'shelf' | 'stock' | 'box' | 'locations'>): ShelfBreakdownItem[] {
  const shelves = product.shelf.split(' / ').map((shelf) => shelf.trim()).filter(Boolean)
  const shelfSet = new Set(shelves.map(normalize))
  const locations = product.locations ?? []
  const locationShelves = new Set(locations.map((location) => normalize(location.shelf)).filter(Boolean))
  const sameShelves = shelfSet.size === locationShelves.size && [...shelfSet].every((shelf) => locationShelves.has(shelf))
  if (locations.length && sameShelves) {
    const quantitiesMatch = locations.reduce((sum, location) => sum + location.qty, 0) === product.stock
    return locations.map((location: ProductLocation) => ({ shelf: location.shelf, qty: quantitiesMatch ? location.qty : null, box: location.box }))
  }
  return shelves.map((shelf) => ({ shelf, qty: shelves.length === 1 ? product.stock : null, box: product.box }))
}
