import { PERMS, type Customer, type Order, type OrderInput, type Settings, type Session, type User } from '@shared/types'
import { createClient } from '@supabase/supabase-js'
import type { Database, CustomerRow, OrderItemRow, OrderRow, ProfileRow } from '@desktopDatabase'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@desktopConfig'
import { DEFAULT_SETTINGS, SHARED_SETTING_KEYS } from './defaults'
import { loginEmail } from './loginEmail'

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  realtime: { params: { eventsPerSecond: 5 } }
})

const SESSION_CACHE = 'yamansa-b2b-session'

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/Invalid login credentials/i.test(message)) return 'Kullanıcı adı veya şifre hatalı.'
  if (/fetch failed|Failed to fetch|network|timeout|ECONN|ENOTFOUND|aborted/i.test(message)) {
    return 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.'
  }
  return message
}

function mapProfile(profile: ProfileRow): User {
  return {
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    role: profile.role,
    perms: (profile.perms ?? []).filter((perm): perm is User['perms'][number] => (PERMS as readonly string[]).includes(perm)),
    customer_id: profile.customer_id,
    active: profile.active ? 1 : 0,
    approved: profile.approved ? 1 : 0,
    created_at: profile.created_at
  }
}

async function loadProfileSession(userId: string): Promise<Session> {
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw new Error(errorMessage(error))
  if (!profile || !profile.active) {
    await supabase.auth.signOut()
    throw new Error(profile ? 'Hesabınız devre dışı bırakılmış.' : 'Kullanıcı adı veya şifre hatalı.')
  }
  if (!profile.approved) {
    await supabase.auth.signOut()
    throw new Error('Hesabınız henüz yönetici tarafından onaylanmadı.')
  }
  const user = mapProfile(profile)
  let customer: Customer | null = null
  if (user.customer_id !== null) {
    const { data, error: customerError } = await supabase.from('customers').select('*').eq('id', user.customer_id).maybeSingle()
    if (customerError) throw new Error(errorMessage(customerError))
    if (data) customer = mapCustomer(data)
  }
  const session = { user, customer }
  localStorage.setItem(SESSION_CACHE, JSON.stringify(session))
  return session
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    ...row,
    discount_pct: Number(row.discount_pct),
    active: row.active ? 1 : 0
  }
}

function cachedSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_CACHE)
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    session.user.perms ??= []
    return session
  } catch {
    return null
  }
}

export async function signIn(username: string, password: string): Promise<Session> {
  try {
    const cleanUsername = username.trim().replace(/\s+/g, ' ')
    if (cleanUsername.length < 3) throw new Error('Kullanıcı adı en az 3 karakter olmalı.')
    if (!/^[\p{L}\p{N} ._-]+$/u.test(cleanUsername)) throw new Error('Kullanıcı adı yalnızca harf, rakam, boşluk, nokta, alt çizgi ve tire içerebilir.')
    if (password.length < 6) throw new Error('Şifre en az 6 karakter olmalı.')
    const email = await loginEmail(cleanUsername)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(errorMessage(error))
    return await loadProfileSession(data.user.id)
  } catch (error) {
    throw new Error(errorMessage(error))
  }
}

export async function restoreSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    const cached = cachedSession()
    if (cached) return cached
    throw new Error(errorMessage(error))
  }
  if (!data.session) return null
  try {
    return await loadProfileSession(data.session.user.id)
  } catch (error) {
    if (/Sunucuya ulaşılamıyor/.test(errorMessage(error))) {
      const cached = cachedSession()
      if (cached) return cached
    }
    throw error
  }
}

export async function signOut(): Promise<void> {
  localStorage.removeItem(SESSION_CACHE)
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(errorMessage(error))
}

export async function loadSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('key,value')
  if (error) throw new Error(errorMessage(error))
  const settings: Settings = { ...DEFAULT_SETTINGS }
  for (const row of data ?? []) {
    if (SHARED_SETTING_KEYS.has(row.key as keyof Settings)) {
      ;(settings as unknown as Record<string, unknown>)[row.key] = row.value
    }
  }
  return settings
}

export async function listCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from('customers').select('*').eq('active', true).order('name')
  if (error) throw new Error(errorMessage(error))
  return (data ?? []).map(mapCustomer)
}

export async function dashboardOrders(): Promise<{ openOrders: number; ordersToday: number }> {
  const { data, error } = await supabase.rpc('dashboard_orders', { p_customer: null })
  if (error) throw new Error(errorMessage(error))
  const stats = data as unknown as { openOrders?: number; ordersToday?: number } | null
  return { openOrders: Number(stats?.openOrders ?? 0), ordersToday: Number(stats?.ordersToday ?? 0) }
}

export async function listOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(300)
  if (error) throw new Error(errorMessage(error))
  return (data ?? []).map((row) => mapOrder(row))
}

export async function getOrder(id: number): Promise<Order | null> {
  const { data, error } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(errorMessage(error))
  if (!data) return null
  const { data: items, error: itemError } = await supabase.from('order_items').select('*').eq('order_id', id).order('id')
  if (itemError) throw new Error(errorMessage(itemError))
  return mapOrder(data, items ?? [])
}

function mapOrder(row: OrderRow, items?: OrderItemRow[]): Order {
  const order: Order = {
    id: row.id,
    order_no: row.order_no,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    status: row.status,
    note: row.note,
    payment: row.payment,
    currency: row.currency,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    vat_pct: Number(row.vat_pct),
    vat: Number(row.vat),
    total: Number(row.total),
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
  if (items) {
    order.items = items.map((item) => ({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      sku: item.sku,
      name: item.name,
      qty: Number(item.qty),
      unit_price: Number(item.unit_price),
      discount_pct: Number(item.discount_pct),
      line_total: Number(item.line_total)
    }))
  }
  return order
}

export async function createOrder(input: OrderInput): Promise<Order> {
  if (!navigator.onLine) throw new Error('Sipariş oluşturmak için internet bağlantısı gerekir.')
  const items = input.items.filter((item) => item.qty > 0)
  if (!items.length) throw new Error('Sipariş en az bir kalem içermeli.')
  const { data: id, error } = await supabase.rpc('create_order', {
    p_customer_id: input.customer_id,
    p_note: input.note ?? '',
    p_payment: input.payment,
    p_currency: input.currency,
    p_vat_pct: input.vat_pct,
    p_items: items
  })
  if (error) {
    const message = errorMessage(error)
    if (/Sunucuya ulaşılamıyor/.test(message)) throw new Error('Sipariş oluşturmak için internet bağlantısı gerekir.')
    throw new Error(message)
  }
  const order = await getOrder(Number(id))
  if (!order) throw new Error('Sipariş kaydedildi ancak okunamadı.')
  return order
}
