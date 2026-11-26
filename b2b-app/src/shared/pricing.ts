import type { Currency } from './types'

export interface PriceLike {
  price: number | null
  currency?: Currency
  auto_price?: number | null
  price_source?: string
}

export interface PriceSettings {
  show_auto_prices?: boolean
  price_preference?: 'manual' | 'auto'
  auto_disable_on_manual?: boolean
}

export interface EffectivePrice {
  price: number | null
  source: 'manual' | 'auto' | null
  currency: Currency
}

/** Bayiye gösterilen fiyat: ürün bazlı tercih yoksa genel tercih; seçilen kaynak yoksa ötekine düşer.
 *  Otomatik fiyatlar kapalıysa yalnızca manuel döner. auto_disable_on_manual açıkken manuel fiyatı olan üründe otomatik kullanılmaz. */
export function effectivePrice(p: PriceLike, settings: PriceSettings): EffectivePrice {
  const cur: Currency = p.currency ?? 'EUR'
  const manual = p.price != null && p.price > 0 ? p.price : null
  let auto = settings.show_auto_prices !== false && p.auto_price != null && p.auto_price > 0 ? p.auto_price : null
  if (auto != null && settings.auto_disable_on_manual && manual != null) auto = null
  const pref = p.price_source === 'manual' || p.price_source === 'auto' ? p.price_source : settings.price_preference === 'auto' ? 'auto' : 'manual'
  if (pref === 'auto') {
    if (auto != null) return { price: auto, source: 'auto', currency: 'EUR' }
    if (manual != null) return { price: manual, source: 'manual', currency: cur }
  } else {
    if (manual != null) return { price: manual, source: 'manual', currency: cur }
    if (auto != null) return { price: auto, source: 'auto', currency: 'EUR' }
  }
  return { price: null, source: null, currency: cur }
}
