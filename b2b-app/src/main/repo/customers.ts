import type { Customer, CustomerInput, CustomerProfile } from '@shared/types'
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

/** Minimal company card for a self-registered dealer; they complete the details after approval. */
export function createCustomerShell(name: string): Customer {
  return saveCustomer({
    code: '',
    name: name.trim() || 'Yeni bayi',
    contact: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    tax_no: '',
    tax_office: '',
    discount_pct: 0,
    currency: 'TRY',
    notes: '',
    active: 1
  })
}

export function updateCustomerProfile(id: number, p: CustomerProfile): Customer {
  const name = p.name.trim()
  if (!name) throw new Error('Firma / ünvan boş olamaz.')
  if (p.tax_no && !/^\d{10,11}$/.test(p.tax_no.trim())) throw new Error('Vergi no 10 haneli (VKN) veya TC kimlik no 11 haneli olmalı.')
  getDb()
    .prepare(
      `UPDATE customers SET name=@name, contact=@contact, phone=@phone, email=@email, address=@address,
       city=@city, tax_no=@tax_no, tax_office=@tax_office WHERE id=@id`
    )
    .run({
      id,
      name,
      contact: p.contact.trim(),
      phone: p.phone.trim(),
      email: p.email.trim(),
      address: p.address.trim(),
      city: p.city.trim(),
      tax_no: p.tax_no.trim(),
      tax_office: p.tax_office.trim()
    })
  const c = getCustomer(id)
  if (!c) throw new Error('Bayi kaydı bulunamadı.')
  return c
}

function nextCustomerCode(): string {
  const db = getDb()
  const exists = db.prepare('SELECT 1 FROM customers WHERE code = ?')
  let n = (db.prepare('SELECT COUNT(*) c FROM customers').get() as { c: number }).c + 1
  let code = `B${String(n).padStart(4, '0')}`
  while (exists.get(code)) code = `B${String(++n).padStart(4, '0')}`
  return code
}
