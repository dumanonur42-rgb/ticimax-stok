import type { Order, OrderInput, OrderStatus } from '@shared/types'
import { cloud, cloudError, must, mustVoid } from '../cloud/client'
import { toOrder } from '../cloud/map'

/** RLS already restricts dealers to their own customer; `customer_id` narrows further (admin filter). */
export async function listOrders(opts: { q?: string; status?: OrderStatus; customer_id?: number; limit?: number }): Promise<Order[]> {
  let query = cloud().from('orders').select('*').order('created_at', { ascending: false }).order('id', { ascending: false })
  if (opts.status) query = query.eq('status', opts.status)
  if (opts.customer_id) query = query.eq('customer_id', opts.customer_id)
  if (opts.q && opts.q.trim()) {
    const like = `%${opts.q.trim().replace(/[%_,()]/g, ' ')}%`
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
  const items = input.items.filter((i) => i.qty > 0)
  if (!items.length) throw new Error('Sipariş en az bir kalem içermeli.')
  const id = must(
    await cloud().rpc('create_order', {
      p_customer_id: input.customer_id,
      p_note: input.note ?? '',
      p_payment: input.payment,
      p_currency: input.currency,
      p_vat_pct: input.vat_pct,
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
