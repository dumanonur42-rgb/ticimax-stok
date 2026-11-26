import type { Currency, OrderStatus, Product } from '@shared/types'
import { DEFAULT_COPY_COLUMNS, productsToClipboard } from '@shared/copy'

const currencyFormatters = new Map<Currency, Intl.NumberFormat>()
export function money(value: number | null, currency: Currency = 'TRY'): string {
  if (value == null) return 'Fiyat gizli'
  let formatter = currencyFormatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 })
    currencyFormatters.set(currency, formatter)
  }
  return formatter.format(value)
}

export function displayPrice(value: number | null, currency: Currency = 'TRY'): string {
  return value == null ? 'Fiyat gizli' : value === 0 ? 'Fiyat sorunuz' : money(value, currency)
}

const numberFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })
export const num = (value: number | null | undefined): string => value == null ? '-' : numberFormatter.format(value)

export const STATUS_LABEL: Record<OrderStatus, string> = {
  taslak: 'Taslak',
  beklemede: 'Beklemede',
  onaylandi: 'Onaylandı',
  hazirlaniyor: 'Hazırlanıyor',
  teslim: 'Teslim Edildi',
  iptal: 'İptal'
}

export function productsToTsv(products: Product[], options: { canShelf: boolean; showPrices: boolean }): string {
  return productsToClipboard(products, DEFAULT_COPY_COLUMNS, options).text
}
