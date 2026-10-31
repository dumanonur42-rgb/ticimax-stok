import type { Currency, OrderStatus, Product } from '@shared/types'
import { useApp } from '@/store/app'

const eurFmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const liveRates = { eur: 38.5, usd: 35.5 }

async function pullLiveRatesInRenderer(): Promise<void> {
  const urls = [
    'https://open.er-api.com/v6/latest/EUR',
    'https://api.frankfurter.app/latest?from=EUR&to=TRY,USD'
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const data = (await res.json()) as { rates?: { TRY?: unknown; USD?: unknown } }
      const tryRate = Number(data?.rates?.TRY)
      const usdRate = Number(data?.rates?.USD)
      if (Number.isFinite(tryRate) && tryRate > 1 && Number.isFinite(usdRate) && usdRate > 0.1) {
        liveRates.eur = tryRate
        liveRates.usd = tryRate / usdRate
        return
      }
    } catch {
      // ignore
    }
  }
}

if (typeof window !== 'undefined') {
  void pullLiveRatesInRenderer()
  setInterval(() => void pullLiveRatesInRenderer(), 30 * 60_000)
}

export function toEur(n: number | null | undefined, cur: Currency = 'EUR'): number | null {
  if (n == null || !Number.isFinite(Number(n))) return null
  const val = Number(n)
  if (cur === 'EUR') return val
  const st = useApp.getState?.()?.settings
  const rEur = Number(st?.rate_eur) > 0 ? Number(st?.rate_eur) : liveRates.eur
  const rUsd = Number(st?.rate_usd) > 0 ? Number(st?.rate_usd) : liveRates.usd
  if (cur === 'TRY') return rEur > 0 ? val / rEur : val
  if (cur === 'USD') return rEur > 0 ? (val * rUsd) / rEur : val
  return val
}

export function money(n: number | null | undefined, cur: Currency = 'EUR'): string {
  const eurVal = toEur(n, cur)
  if (eurVal == null) return 'Fiyat sorunuz'
  return eurFmt.format(eurVal)
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
