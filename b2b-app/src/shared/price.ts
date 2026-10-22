import type { PaymentType } from './types'

export const PAYMENT_LABEL: Record<PaymentType, string> = { pesin: 'Peşin', kart: 'Kredi Kartı' }

/** Credit-card price: the product's own value, else cash price marked up by `pct` (settings), else null. */
export function cardPrice(price: number | null, card_price: number | null | undefined, pct: number): number | null {
  if (price == null || price <= 0) return null
  if (card_price != null) return card_price > 0 ? card_price : null
  if (pct > 0) {
    const derived = Math.round(price * (1 + pct / 100) * 100) / 100
    return derived > 0 ? derived : null
  }
  return null
}

export function priceFor(payment: PaymentType, price: number | null, card_price: number | null | undefined, pct: number): number | null {
  return payment === 'kart' ? (cardPrice(price, card_price, pct) ?? price) : price
}
