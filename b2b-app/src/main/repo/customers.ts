import type { Customer, CustomerInput } from '@shared/types'
import { getDb } from '../db'

export function listCustomers(q?: string): Customer[] {
  const db = getDb()
  if (q && q.trim()) {
    const like = `%${q.trim()}%`
    return db
      .prepare(
        `SELECT * FROM customers WHERE name LIKE ? OR code LIKE ? OR city LIKE ? OR contact LIKE ? OR phone LIKE ?
         ORDER BY name COLLATE NOCASE`
      )
      .all(like, like, like, like, like) as Customer[]
  }
  return db.prepare('SELECT * FROM customers ORDER BY name COLLATE NOCASE').all() as Customer[]
}

export function getCustomer(id: number): Customer | null {
  return (getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer) ?? null
}

export function saveCustomer(c: Partial<Customer> & CustomerInput): Customer {
  const db = getDb()
  const row = { ...c, code: c.code.trim() || nextCustomerCode() }
  if (c.id) {
    db.prepare(
      `UPDATE customers SET code=@code, name=@name, contact=@contact, phone=@phone, email=@email, address=@address,
       city=@city, tax_no=@tax_no, tax_office=@tax_office, discount_pct=@discount_pct, currency=@currency, notes=@notes,
       active=@active WHERE id=@id`
    ).run(row)
    return getCustomer(c.id)!
  }
  const r = db
    .prepare(
      `INSERT INTO customers(code, name, contact, phone, email, address, city, tax_no, tax_office, discount_pct, currency, notes, active)
       VALUES (@code,@name,@contact,@phone,@email,@address,@city,@tax_no,@tax_office,@discount_pct,@currency,@notes,@active)`
    )
    .run(row)
  return getCustomer(Number(r.lastInsertRowid))!
}

export function deleteCustomer(id: number): void {
  getDb().prepare('DELETE FROM customers WHERE id = ?').run(id)
}

function nextCustomerCode(): string {
  const n = (getDb().prepare('SELECT COUNT(*) c FROM customers').get() as { c: number }).c + 1
  return `B${String(n).padStart(4, '0')}`
}
