import { priceFor } from '@shared/price'
import type { Order, OrderInput, OrderStatus } from '@shared/types'
import { cloud, cloudError, must, mustVoid } from '../cloud/client'
import { toOrder } from '../cloud/map'
import { getSettings } from './settings'

/** RLS already restricts dealers to their own customer; `customer_id` narrows further (admin filter). */
export async function listOrders(opts: { q?: string; status?: OrderStatus; customer_id?: number; limit?: number }): Promise<Order[]> {
  let query = cloud().from('orders').select('*').order('created_at', { ascending: false }).order('id', { ascending: false })
  if (opts.status) query = query.eq('status', opts.status)
  if (opts.customer_id) query = query.eq('customer_id', opts.customer_id)
  const search = opts.q?.trim().toLocaleLowerCase('tr-TR')
  if (search) {
    const like = `%${search.replace(/[%_,()]/g, ' ')}%`
    query = query.or(`order_no.ilike.${like},customer_name.ilike.${like},note.ilike.${like}`)
  }
  return must(await query.limit(opts.limit ?? 500)).map((r) => toOrder(r))
}

export async function getOrder(id: number): Promise<Order | null> {
  const sb = cloud()
  const o = await sb.from('orders').select('*').eq('id', id).maybeSingle()
  if (o.error) throw cloudError(o.error)
  if (!o.data) return null
  const items = must(await sb.from('order_items').select('*').eq('order_id', id).order('id'))
  return toOrder(o.data, items)
}

/** Totals, order number and stock deduction happen atomically inside the `create_order` RPC. */
export async function createOrder(input: OrderInput): Promise<Order> {
  const rawItems = (input.items ?? []).filter((i) => Number.isFinite(Number(i.qty)) && Number(i.qty) > 0 && Number(i.qty) <= 1_000_000)
  if (!rawItems.length) throw new Error('Sipariş en az bir kalem içermeli.')
  const sb = cloud()
  const productIds = [...new Set(rawItems.map((i) => Number(i.product_id)).filter((id) => Number.isFinite(id) && id > 0))]
  if (!productIds.length) throw new Error('Geçersiz ürün seçimi.')
  const pRes = await sb.from('products').select('id, sku, name, price, card_price, currency, active, deleted').in('id', productIds)
  const dbProducts = new Map(must(pRes).filter((p) => p.active && !p.deleted).map((p) => [p.id, p]))
  let discountPct = 0
  if (input.customer_id !== null) {
    const cRes = await sb.from('customers').select('discount_pct').eq('id', input.customer_id).maybeSingle()
    if (cRes.error) throw cloudError(cRes.error)
    discountPct = Math.max(0, Math.min(100, Number(cRes.data?.discount_pct ?? 0)))
  }
  const settings = getSettings()
  const vatPct = Math.max(0, Math.min(100, Number(settings.vat_pct ?? 20)))
  const items = rawItems.map((i) => {
    const p = dbProducts.get(Number(i.product_id))
    if (!p) throw new Error(`Ürün bulunamadı veya pasif: ${i.sku || i.product_id}`)
    const unitPrice = priceFor(input.payment, p.price, p.card_price, settings.card_price_pct)
    if (unitPrice === null || unitPrice <= 0) throw new Error(`Fiyatı olmayan ürün siparişe eklenemez: ${p.sku}`)
    return {
      product_id: p.id,
      sku: p.sku,
      name: p.name,
      qty: Number(i.qty),
      unit_price: unitPrice,
      discount_pct: discountPct
    }
  })
  const id = must(
    await sb.rpc('create_order', {
      p_customer_id: input.customer_id,
      p_note: input.note ?? '',
      p_payment: input.payment,
      p_currency: input.currency,
      p_vat_pct: vatPct,
      p_items: items
    })
  )
  const o = await getOrder(id)
  if (!o) throw new Error('Sipariş kaydedildi ancak okunamadı.')
  return o
}

export async function setOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  mustVoid(await cloud().rpc('set_order_status', { p_id: id, p_status: status }))
  const o = await getOrder(id)
  if (!o) throw new Error('Sipariş bulunamadı.')
  return o
}
