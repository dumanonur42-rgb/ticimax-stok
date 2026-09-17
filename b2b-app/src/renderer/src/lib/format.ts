import type { Currency, OrderStatus } from '@shared/types'

const fmtCache = new Map<string, Intl.NumberFormat>()

export function money(n: number, cur: Currency = 'TRY'): string {
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

export const ROLE_LABEL = { admin: 'Yönetici', satis: 'Satış', bayi: 'Bayi' } as const

export function stockLevel(stock: number, threshold: number): { cls: 'ok' | 'low' | 'out'; label: string } {
  if (stock <= 0) return { cls: 'out', label: 'Stok yok' }
  if (stock <= threshold) return { cls: 'low', label: `Az: ${num(stock)}` }
  return { cls: 'ok', label: num(stock) }
}
