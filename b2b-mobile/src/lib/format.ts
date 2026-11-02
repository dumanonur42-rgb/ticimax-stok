import type { Currency, OrderStatus, Product } from '@shared/types'

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
  const clean = (value: string): string => value.replace(/[\t\r\n]+/g, ' ').trim()
  const columns: { label: string; value: (product: Product) => string }[] = []
  if (options.canShelf) columns.push({ label: 'Raf', value: (product) => product.shelf })
  columns.push(
    { label: 'Ürün Kodu', value: (product) => product.sku },
    { label: 'Marka', value: (product) => product.brand }
  )
  if (products.some((product) => product.d_inner !== null || product.d_outer !== null || product.width !== null)) {
    columns.push({ label: 'd×D×B', value: (product) => `${num(product.d_inner)}×${num(product.d_outer)}×${num(product.width)}` })
  }
  columns.push(
    { label: 'Stok', value: (product) => num(product.stock) },
    { label: 'Kutu durumu', value: (product) => product.box },
    { label: 'Açıklama', value: (product) => product.description }
  )
  if (options.showPrices) columns.push({ label: 'Fiyat', value: (product) => displayPrice(product.price, product.currency) })
  return [columns.map((column) => column.label), ...products.map((product) => columns.map((column) => clean(column.value(product))))]
    .map((row) => row.join('\t'))
    .join('\r\n')
}
