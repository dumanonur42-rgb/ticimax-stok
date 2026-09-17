import type { PaymentType } from './types'

export const PAYMENT_LABEL: Record<PaymentType, string> = { pesin: 'Peşin', kart: 'Kredi Kartı' }

/** Credit-card price: the product's own value, else cash price marked up by `pct` (settings), else null. */
export function cardPrice(price: number, card_price: number | null | undefined, pct: number): number | null {
  if (card_price != null) return card_price
  if (pct > 0) return Math.round(price * (1 + pct / 100) * 100) / 100
  return null
}

export function priceFor(payment: PaymentType, price: number, card_price: number | null | undefined, pct: number): number {
  return payment === 'kart' ? (cardPrice(price, card_price, pct) ?? price) : price
}
