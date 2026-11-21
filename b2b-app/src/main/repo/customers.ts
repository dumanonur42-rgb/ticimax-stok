import type { Customer, CustomerInput, CustomerProfile } from '@shared/types'
import { cloud, cloudError, must, mustVoid } from '../cloud/client'
import { fromCustomer, toCustomer } from '../cloud/map'

export async function listCustomers(q?: string): Promise<Customer[]> {
  let query = cloud().from('customers').select('*').order('name')
  if (q && q.trim()) {
    const like = `%${q.trim().replace(/[%_,()]/g, ' ')}%`
    query = query.or(`name.ilike.${like},code.ilike.${like},city.ilike.${like},contact.ilike.${like},phone.ilike.${like}`)
  }
  return must(await query).map(toCustomer)
}

export async function getCustomer(id: number): Promise<Customer | null> {
  const r = await cloud().from('customers').select('*').eq('id', id).maybeSingle()
  if (r.error) throw cloudError(r.error)
  return r.data ? toCustomer(r.data) : null
}

export async function saveCustomer(c: Partial<Customer> & CustomerInput): Promise<Customer> {
  const sb = cloud()
  const row = fromCustomer({ ...c, code: c.code.trim() })
  if (c.id) {
    if (!row.code) throw new Error('Cari kodu boş olamaz.')
    return toCustomer(must(await sb.from('customers').update(row).eq('id', c.id).select('*').single()))
  }
  const autoCode = !row.code
  for (let attempt = 0; attempt < 3; attempt++) {
    if (autoCode) row.code = await nextCustomerCode(attempt)
    const res = await sb.from('customers').insert(row).select('*').single()
    if (!res.error) return toCustomer(must(res))
    if (!autoCode || !/duplicate key|unique constraint|23505/i.test(res.error.message) || attempt === 2) {
      throw cloudError(res.error)
    }
  }
  throw new Error('Cari kodu oluşturulamadı.')
}

export async function deleteCustomer(id: number): Promise<void> {
  mustVoid(await cloud().from('customers').delete().eq('id', id))
}

/** A dealer completes their own company card (RPC enforces ownership and validation server-side). */
export async function updateMyCompany(p: CustomerProfile): Promise<Customer> {
  return toCustomer(must(await cloud().rpc('update_my_company', { p: { ...p } })))
}

async function nextCustomerCode(offset = 0): Promise<string> {
  const r = await cloud().from('customers').select('code')
  const codes = must(r).map((c) => c.code)
  const taken = new Set(codes)
  let maxNum = codes.length
  for (const c of codes) {
    const m = /^B(\d+)$/i.exec(c.trim())
    if (m) {
      const val = Number.parseInt(m[1], 10)
      if (val > maxNum) maxNum = val
    }
  }
  let n = maxNum + 1 + offset
  let code = `B${String(n).padStart(4, '0')}`
  while (taken.has(code)) code = `B${String(++n).padStart(4, '0')}`
  return code
}
