import type { Currency, OrderStatus, Product } from '@shared/types'

const fmtCache = new Map<string, Intl.NumberFormat>()

export function money(n: number | null | undefined, cur: Currency = 'TRY'): string {
  if (n == null) return 'Fiyat sorunuz'
  let f = fmtCache.get(cur)
  if (!f) {
    f = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: cur, maximumFractionDigits: 2 })
    fmtCache.set(cur, f)
  }
  return f.format(n)
}

const numFmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })
export const num = (n: number | null | undefined): string => (n == null ? '-' : numFmt.format(n))

export const mm = (n: number | null | undefined): string => (n == null ? '-' : `${numFmt.format(n)} mm`)

export function date(s: string): string {
  const d = new Date(s.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  taslak: 'Taslak',
  beklemede: 'Beklemede',
  onaylandi: 'Onaylandı',
  hazirlaniyor: 'Hazırlanıyor',
  teslim: 'Teslim Edildi',
  iptal: 'İptal'
}

export const STATUS_CLASS: Record<OrderStatus, string> = {
  taslak: 'neutral',
  beklemede: 'low',
  onaylandi: 'info',
  hazirlaniyor: 'info',
  teslim: 'ok',
  iptal: 'out'
}

export const ROLE_LABEL = { admin: 'Yönetici', ara: 'Ara kullanıcı', bayi: 'Bayi' } as const
export const ROLE_HINT = {
  admin: 'Tüm yetkiler: ürün ekleme/düzenleme, stok aktarma, Excel indirme, bayi ve kullanıcı yönetimi.',
  ara: 'Bayi ile aynı; ek olarak ürünlerin raf konumunu görür. Aşağıdan başka özellikler de verilebilir.',
  bayi: 'Müşteri hesabı: katalogda arama, kendi cari kartıyla sipariş oluşturma ve yalnızca kendi siparişlerini takip.'
} as const

export function productsToTsv(products: Product[], opts: { canShelf: boolean; showPrices: boolean }): string {
  const clean = (value: string): string => value.replace(/[\t\r\n]+/g, ' ').trim()
  const columns: { label: string; value: (product: Product) => string }[] = []
  if (opts.canShelf) columns.push({ label: 'Raf', value: (p) => p.shelf })
  columns.push(
    { label: 'Ürün Kodu', value: (p) => p.sku },
    { label: 'Marka', value: (p) => p.brand }
  )
  if (products.some((p) => p.d_inner != null || p.d_outer != null || p.width != null))
    columns.push({ label: 'd×D×B', value: (p) => `${num(p.d_inner)}×${num(p.d_outer)}×${num(p.width)}` })
  columns.push(
    { label: 'Stok', value: (p) => num(p.stock) },
    { label: 'Kutu durumu', value: (p) => p.box },
    { label: 'Açıklama', value: (p) => p.description }
  )
  if (opts.showPrices) columns.push({ label: 'Fiyat', value: (p) => money(p.price, p.currency) })
  return [columns.map((c) => c.label), ...products.map((p) => columns.map((c) => clean(c.value(p))))].map((row) => row.join('\t')).join('\r\n')
}

export function stockLevel(stock: number, threshold: number): { cls: 'ok' | 'low' | 'out'; label: string } {
  if (stock <= 0) return { cls: 'out', label: 'Stok yok' }
  if (stock <= threshold) return { cls: 'low', label: `Az: ${num(stock)}` }
  return { cls: 'ok', label: num(stock) }
}
