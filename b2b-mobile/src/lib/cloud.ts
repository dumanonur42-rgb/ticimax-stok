import { PERMS, type Customer, type Order, type OrderInput, type Settings, type Session, type User } from '@shared/types'
import { createClient } from '@supabase/supabase-js'
import type { Database, CustomerRow, OrderItemRow, OrderRow, ProfileRow } from '@desktopDatabase'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@desktopConfig'
import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js'
import { DEFAULT_SETTINGS, SHARED_SETTING_KEYS } from './defaults'
import { loginEmail } from './loginEmail'
import { clearLocalCatalog, unlockCatalogStorage } from './idb'
import { CART_STORAGE_KEY, secureStorage } from './secureStorage'

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: secureStorage
  },
  realtime: { params: { eventsPerSecond: 5 } }
})

export const SESSION_CACHE = 'yamansa-b2b-session'
export const SUPABASE_AUTH_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
const MIN_VERSION_CACHE = 'yb2b.minimumVersions'
const MIN_VERSION_KEYS = ['min_version_android', 'min_version_ios', 'min_version_windows'] as const

export function cachedMinimumVersion(key: typeof MIN_VERSION_KEYS[number]): string | undefined {
  try {
    const values = JSON.parse(localStorage.getItem(MIN_VERSION_CACHE) ?? '{}') as Partial<Record<typeof MIN_VERSION_KEYS[number], unknown>>
    const value = values[key]
    return typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value) ? value : undefined
  } catch {
    return undefined
  }
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : String(error)
  if (/Invalid login credentials/i.test(message)) return 'Kullanıcı adı veya şifre hatalı.'
  if (/fetch failed|Failed to fetch|network|timeout|ECONN|ENOTFOUND|aborted/i.test(message)) {
    return 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.'
  }
  return message
}

function isRetryableFailure(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  if (isAuthRetryableFetchError(error)) return true
  if (error instanceof TypeError) return true
  const message = errorMessage(error)
  return /fetch failed|Failed to fetch|network|timeout|ECONN|ENOTFOUND|aborted|temporarily unavailable/i.test(message)
}

function isAuthoritativeAuthFailure(error: unknown): boolean {
  return isAuthApiError(error) && [400, 401, 403].includes(error.status)
}

class InvalidProfileError extends Error {
  constructor(public readonly reason: 'missing' | 'inactive' | 'unapproved') {
    super(reason)
    this.name = 'InvalidProfileError'
  }
}

async function wipeLocalUserData(): Promise<void> {
  await clearLocalCatalog()
  await secureStorage.removeItem(SESSION_CACHE)
  await secureStorage.removeItem(CART_STORAGE_KEY)
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
  if (!profile) throw new InvalidProfileError('missing')
  if (!profile.active) throw new InvalidProfileError('inactive')
  if (!profile.approved) throw new InvalidProfileError('unapproved')
  const user = mapProfile(profile)
  let customer: Customer | null = null
  if (user.customer_id !== null) {
    const { data, error: customerError } = await supabase.from('customers').select('*').eq('id', user.customer_id).maybeSingle()
    if (customerError) throw new Error(errorMessage(customerError))
    if (data) customer = mapCustomer(data)
  }
  const session = { user, customer }
  await secureStorage.setItem(SESSION_CACHE, JSON.stringify(session))
  await unlockCatalogStorage()
  return session
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    ...row,
    discount_pct: Number(row.discount_pct),
    active: row.active ? 1 : 0
  }
}

async function cachedSession(): Promise<Session | null> {
  const raw = await secureStorage.getItem(SESSION_CACHE)
  if (!raw) return null
  try {
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
    if (error instanceof InvalidProfileError) {
      await wipeLocalUserData()
    }
    if (error instanceof InvalidProfileError) {
      const message = error.reason === 'inactive'
        ? 'Hesabınız devre dışı bırakılmış.'
        : error.reason === 'unapproved'
          ? 'Hesabınız henüz yönetici tarafından onaylanmadı.'
          : 'Kullanıcı adı veya şifre hatalı.'
      throw new Error(message)
    }
    throw new Error(errorMessage(error))
  }
}

export async function restoreSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    if (isRetryableFailure(error)) {
      const cached = await cachedSession()
      if (cached) {
        await unlockCatalogStorage()
        return cached
      }
      throw new Error(errorMessage(error))
    }
    if (isAuthoritativeAuthFailure(error)) {
      await supabase.auth.signOut({ scope: 'local' })
      await wipeLocalUserData()
      return null
    }
    const cached = await cachedSession()
    if (cached) {
      await unlockCatalogStorage()
      return cached
    }
    throw new Error(errorMessage(error))
  }
  const cached = await cachedSession()
  if (!data.session) {
    if (cached) {
      await unlockCatalogStorage()
      return cached
    }
    await wipeLocalUserData()
    return null
  }
  try {
    return await loadProfileSession(data.session.user.id)
  } catch (error) {
    if (isRetryableFailure(error)) {
      if (cached?.user.id === data.session.user.id) {
        await unlockCatalogStorage()
        return cached
      }
      throw new Error(errorMessage(error))
    }
    if (error instanceof InvalidProfileError) {
      await supabase.auth.signOut({ scope: 'local' })
      await wipeLocalUserData()
      return null
    }
    if (cached?.user.id === data.session.user.id) {
      await unlockCatalogStorage()
      return cached
    }
    throw new Error(errorMessage(error))
  }
}

export async function signOut(): Promise<void> {
  let error: Error | null = null
  try {
    const result = await supabase.auth.signOut({ scope: 'local' })
    error = result.error
  } finally {
    await wipeLocalUserData()
  }
  if (error) throw new Error(errorMessage(error))
}

export async function loadSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('key,value')
  if (error) throw new Error(errorMessage(error))
  const settings: Settings = { ...DEFAULT_SETTINGS }
  const remoteKeys = new Set((data ?? []).map((row) => row.key))
  for (const row of data ?? []) {
    if (SHARED_SETTING_KEYS.has(row.key as keyof Settings)) {
      ;(settings as unknown as Record<string, unknown>)[row.key] = row.value
    }
  }
  try {
    const cached = JSON.parse(localStorage.getItem(MIN_VERSION_CACHE) ?? '{}') as Record<string, unknown>
    for (const key of MIN_VERSION_KEYS) {
      const value = settings[key]
      if (remoteKeys.has(key) && typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value)) cached[key] = value
      else delete cached[key]
    }
    localStorage.setItem(MIN_VERSION_CACHE, JSON.stringify(cached))
  } catch {
    // Local caching is best-effort; settings remain available in memory.
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
  const { data, error } = await supabase.from('orders').select('*, order_items(count)').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(300)
  if (error) throw new Error(errorMessage(error))
  return (data ?? []).map((row) => {
    const itemCount = (row as unknown as { order_items?: { count: number }[] }).order_items?.[0]?.count ?? 0
    return Object.assign(mapOrder(row), { item_count: itemCount })
  })
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
