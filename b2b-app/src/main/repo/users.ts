import type { Customer, CustomerInput, DealerLogin, Session, User, UserRole } from '@shared/types'
import { createHash } from 'node:crypto'
import { cloud, cloudError, ephemeralCloud, must, mustVoid } from '../cloud/client'
import { fromCustomer, toCustomer, toUser } from '../cloud/map'

const LOGIN_DOMAIN = 'login.yamansab2b.app'

/** Accounts are username-based; Supabase Auth needs an e-mail, so we derive a stable synthetic one. */
export function loginEmail(username: string): string {
  const lower = username.trim().toLocaleLowerCase('tr-TR')
  const slug = lower
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9._-]/g, '')
  const tag = createHash('sha1').update(lower).digest('hex').slice(0, 8)
  return `${slug || 'u'}-${tag}@${LOGIN_DOMAIN}`
}

function validateUsername(username: string): string {
  const u = username.trim()
  if (u.length < 3) throw new Error('Kullanıcı adı en az 3 karakter olmalı.')
  if (!/^[\p{L}\p{N}._-]+$/u.test(u)) throw new Error('Kullanıcı adı yalnızca harf, rakam, nokta, alt çizgi ve tire içerebilir.')
  return u
}

function validatePassword(p: string): void {
  if (p.length < 6) throw new Error('Şifre en az 6 karakter olmalı.')
}

async function profileOf(userId: string): Promise<User | null> {
  const r = await cloud().from('profiles').select('*').eq('id', userId).maybeSingle()
  if (r.error) throw cloudError(r.error)
  return r.data ? toUser(r.data) : null
}

async function sessionOf(user: User): Promise<Session> {
  if (user.customer_id === null) return { user, customer: null }
  const r = await cloud().from('customers').select('*').eq('id', user.customer_id).maybeSingle()
  if (r.error) throw cloudError(r.error)
  return { user, customer: r.data ? toCustomer(r.data) : null }
}

export async function login(username: string, password: string): Promise<Session> {
  const sb = cloud()
  const auth = await sb.auth.signInWithPassword({ email: loginEmail(username), password })
  if (auth.error) throw cloudError(auth.error)
  const user = await profileOf(auth.data.user.id)
  if (!user || !user.active) {
    await sb.auth.signOut()
    throw new Error(user ? 'Hesabınız devre dışı bırakılmış.' : 'Kullanıcı adı veya şifre hatalı.')
  }
  if (!user.approved) {
    await sb.auth.signOut()
    throw new Error('Hesabınız henüz yönetici tarafından onaylanmadı.')
  }
  return sessionOf(user)
}

export async function logout(): Promise<void> {
  const r = await cloud().auth.signOut()
  if (r.error) console.error('signOut failed', r.error)
}

/** The remembered Supabase session (refresh token on disk), or null when nobody is signed in. */
export async function currentSession(): Promise<Session | null> {
  const r = await cloud().auth.getSession()
  if (r.error || !r.data.session) return null
  const user = await profileOf(r.data.session.user.id)
  if (!user || !user.active || !user.approved) return null
  return sessionOf(user)
}

export function currentUserId(): Promise<string | null> {
  return cloud()
    .auth.getSession()
    .then((r) => r.data.session?.user.id ?? null)
}

export async function changePassword(username: string, current: string, next: string): Promise<void> {
  validatePassword(next)
  const sb = cloud()
  const check = await ephemeralCloud().auth.signInWithPassword({ email: loginEmail(username), password: current })
  if (check.error) throw new Error('Mevcut şifre hatalı.')
  mustVoid(await sb.auth.updateUser({ password: next }))
}

/** Self-service sign-up: a dealer account with its own company card, locked until an administrator approves it. */
export async function registerUser(input: { username: string; display_name: string; company_name: string; password: string }): Promise<void> {
  const username = validateUsername(input.username)
  validatePassword(input.password)
  const company = input.company_name.trim()
  if (company.length < 2) throw new Error('İşletme adı girilmelidir.')
  const display = input.display_name.trim() || company
  const r = await ephemeralCloud().auth.signUp({
    email: loginEmail(username),
    password: input.password,
    options: { data: { username, display_name: display, company_name: company } }
  })
  if (r.error) throw cloudError(r.error)
}

/**
 * Administrator opens a dealer together with its login: the sign-up trigger creates the profile and a company
 * card (name = firm), the profile is approved on the spot and the card is completed with the form fields.
 */
export async function createDealerAccount(customer: CustomerInput, login: DealerLogin): Promise<Customer> {
  const username = validateUsername(login.username)
  validatePassword(login.password)
  const name = customer.name.trim()
  if (name.length < 2) throw new Error('Firma adı girilmelidir.')
  const display = login.display_name.trim() || customer.contact.trim() || name
  const created = await ephemeralCloud().auth.signUp({
    email: loginEmail(username),
    password: login.password,
    options: { data: { username, display_name: display, company_name: name } }
  })
  if (created.error) throw cloudError(created.error)
  const id = created.data.user?.id
  if (!id) throw new Error('Kullanıcı oluşturulamadı.')
  const sb = cloud()
  const profile = toUser(must(await sb.from('profiles').update({ role: 'bayi', active: true, approved: true }).eq('id', id).select('*').single()))
  if (profile.customer_id === null) throw new Error('Cari kart oluşturulamadı.')
  const { code, ...rest } = fromCustomer({ ...customer, name, code: customer.code.trim() })
  const patch = code ? { code, ...rest } : rest
  return toCustomer(must(await sb.from('customers').update(patch).eq('id', profile.customer_id).select('*').single()))
}

export async function listUsers(): Promise<User[]> {
  const r = await cloud().from('profiles').select('*').order('approved').order('username')
  return must(r).map(toUser)
}

export async function saveUser(u: {
  id?: string
  username: string
  display_name: string
  role: UserRole
  customer_id: number | null
  password?: string
  active: number
}): Promise<User> {
  const sb = cloud()
  const username = validateUsername(u.username)
  if (u.id) {
    const r = await sb
      .from('profiles')
      .update({ username, display_name: u.display_name.trim(), role: u.role, customer_id: u.customer_id, active: !!u.active })
      .eq('id', u.id)
      .select('*')
      .single()
    const user = toUser(must(r))
    if (u.password) mustVoid(await sb.rpc('admin_set_password', { p_user: u.id, p_password: u.password }))
    return user
  }
  if (!u.password) throw new Error('Yeni kullanıcı için şifre girin.')
  validatePassword(u.password)
  const created = await ephemeralCloud().auth.signUp({
    email: loginEmail(username),
    password: u.password,
    options: { data: { username, display_name: u.display_name.trim() || username } }
  })
  if (created.error) throw cloudError(created.error)
  const id = created.data.user?.id
  if (!id) throw new Error('Kullanıcı oluşturulamadı.')
  const r = await sb
    .from('profiles')
    .update({ role: u.role, customer_id: u.customer_id ?? undefined, active: !!u.active, approved: true })
    .eq('id', id)
    .select('*')
    .single()
  return toUser(must(r))
}

export async function approveUser(id: string): Promise<User> {
  const r = await cloud().from('profiles').update({ approved: true, active: true }).eq('id', id).select('*').single()
  return toUser(must(r))
}

export async function deleteUser(id: string): Promise<void> {
  mustVoid(await cloud().rpc('admin_delete_user', { p_user: id }))
}
