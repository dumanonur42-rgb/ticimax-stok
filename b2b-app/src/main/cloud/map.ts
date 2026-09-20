import type { Customer, CustomerInput, ImportLog, Order, OrderItem, Product, User } from '@shared/types'
import type { CustomerInsert, CustomerRow, ImportLogRow, OrderItemRow, OrderRow, ProductRow, ProfileRow } from './database.types'

const num = (v: number | string | null): number => (v === null ? 0 : Number(v))
const opt = (v: number | string | null): number | null => (v === null ? null : Number(v))

/** PostgREST returns `numeric` columns as strings; the app works with numbers and 0/1 flags. */
export function toProduct(r: ProductRow): Product {
  return {
    id: r.id,
    sku: r.sku,
    name: r.name,
    brand: r.brand,
    category: r.category,
    type: r.type,
    seal: r.seal,
    d_inner: opt(r.d_inner),
    d_outer: opt(r.d_outer),
    width: opt(r.width),
    stock: num(r.stock),
    unit: r.unit,
    price: num(r.price),
    currency: r.currency,
    list_price: opt(r.list_price),
    card_price: opt(r.card_price),
    min_order: num(r.min_order),
    shelf: r.shelf,
    box: r.box,
    barcode: r.barcode,
    image: r.image,
    description: r.description,
    equivalents: r.equivalents,
    active: r.active ? 1 : 0,
    updated_at: r.updated_at
  }
}

export function toCustomer(r: CustomerRow): Customer {
  return { ...r, discount_pct: num(r.discount_pct), active: r.active ? 1 : 0 }
}

export function fromCustomer(c: Partial<Customer> & CustomerInput): CustomerInsert {
  return {
    ...(c.id ? { id: c.id } : {}),
    code: c.code,
    name: c.name,
    contact: c.contact,
    phone: c.phone,
    email: c.email,
    address: c.address,
    city: c.city,
    tax_no: c.tax_no,
    tax_office: c.tax_office,
    discount_pct: c.discount_pct,
    currency: c.currency,
    notes: c.notes,
    active: !!c.active
  }
}

export function toUser(r: ProfileRow): User {
  return {
    id: r.id,
    username: r.username,
    display_name: r.display_name,
    role: r.role,
    customer_id: r.customer_id,
    active: r.active ? 1 : 0,
    approved: r.approved ? 1 : 0,
    created_at: r.created_at
  }
}

export function toOrder(r: OrderRow, items?: OrderItemRow[]): Order {
  const o: Order = {
    id: r.id,
    order_no: r.order_no,
    customer_id: r.customer_id,
    customer_name: r.customer_name,
    status: r.status,
    note: r.note,
    payment: r.payment,
    currency: r.currency,
    subtotal: num(r.subtotal),
    discount: num(r.discount),
    vat_pct: num(r.vat_pct),
    vat: num(r.vat),
    total: num(r.total),
    created_by: r.created_by,
    created_at: r.created_at,
    updated_at: r.updated_at
  }
  if (items) o.items = items.map(toOrderItem)
  return o
}

export function toOrderItem(r: OrderItemRow): OrderItem {
  return {
    id: r.id,
    order_id: r.order_id,
    product_id: r.product_id,
    sku: r.sku,
    name: r.name,
    qty: num(r.qty),
    unit_price: num(r.unit_price),
    discount_pct: num(r.discount_pct),
    line_total: num(r.line_total)
  }
}

export function toImportLog(r: ImportLogRow): ImportLog {
  return { ...r }
}
