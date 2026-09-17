import type { Session, User, UserRole } from '@shared/types'
import { hashPassword, verifyPassword } from '../auth'
import { getDb } from '../db'
import { createCustomerShell, getCustomer } from './customers'

const USER_COLS = 'id, username, display_name, role, customer_id, active, approved, created_at'

export function listUsers(): User[] {
  return getDb().prepare(`SELECT ${USER_COLS} FROM users ORDER BY approved, username`).all() as User[]
}

export function getUser(id: number): User | null {
  return (getDb().prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).get(id) as User) ?? null
}

export function login(username: string, password: string): Session | null {
  const row = getDb()
    .prepare(`SELECT ${USER_COLS}, password_hash FROM users WHERE username = ? COLLATE NOCASE AND active = 1`)
    .get(username.trim()) as (User & { password_hash: string }) | undefined
  if (!row || !verifyPassword(password, row.password_hash)) return null
  if (!row.approved) throw new Error('Hesabınız henüz yönetici tarafından onaylanmadı.')
  const { password_hash: _ignored, ...user } = row
  void _ignored
  return { user, customer: user.customer_id ? getCustomer(user.customer_id) : null }
}

export function sessionFor(userId: number): Session | null {
  const user = getUser(userId)
  if (!user || !user.active || !user.approved) return null
  return { user, customer: user.customer_id ? getCustomer(user.customer_id) : null }
}

export function changePassword(userId: number, current: string, next: string): void {
  const db = getDb()
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as { password_hash: string } | undefined
  if (!row || !verifyPassword(current, row.password_hash)) throw new Error('Mevcut şifre hatalı.')
  if (next.length < 4) throw new Error('Yeni şifre en az 4 karakter olmalı.')
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next), userId)
}

export function saveUser(u: {
  id?: number
  username: string
  display_name: string
  role: UserRole
  customer_id: number | null
  password?: string
  active: number
}): User {
  const db = getDb()
  const username = u.username.trim()
  if (!username) throw new Error('Kullanıcı adı boş olamaz.')
  const customer_id = u.role === 'bayi' ? (u.customer_id ?? createCustomerShell(u.display_name || username).id) : null
  if (u.id) {
    db.prepare('UPDATE users SET username=?, display_name=?, role=?, customer_id=?, active=? WHERE id=?').run(
      username,
      u.display_name,
      u.role,
      customer_id,
      u.active,
      u.id
    )
    if (u.password) db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(u.password), u.id)
    return getUser(u.id)!
  }
  if (!u.password || u.password.length < 4) throw new Error('Şifre en az 4 karakter olmalı.')
  const r = db
    .prepare("INSERT INTO users(username, password_hash, display_name, role, customer_id, active, created_at) VALUES (?,?,?,?,?,?,datetime('now','localtime'))")
    .run(username, hashPassword(u.password), u.display_name, u.role, customer_id, u.active)
  return getUser(Number(r.lastInsertRowid))!
}

/** Self-service sign-up: a dealer account with its own company card, locked until an administrator approves it. */
export function registerUser(input: { username: string; display_name: string; password: string }): void {
  const db = getDb()
  const username = input.username.trim()
  if (username.length < 3) throw new Error('Kullanıcı adı en az 3 karakter olmalı.')
  if (!/^[\p{L}\p{N}._-]+$/u.test(username)) throw new Error('Kullanıcı adı yalnızca harf, rakam, nokta, alt çizgi ve tire içerebilir.')
  if (input.password.length < 4) throw new Error('Şifre en az 4 karakter olmalı.')
  if (db.prepare('SELECT 1 FROM users WHERE username = ? COLLATE NOCASE').get(username)) throw new Error('Bu kullanıcı adı zaten alınmış.')
  const display = input.display_name.trim() || username
  const customer = createCustomerShell(display)
  db.prepare(
    "INSERT INTO users(username, password_hash, display_name, role, customer_id, active, approved, created_at) VALUES (?,?,?,?,?,1,0,datetime('now','localtime'))"
  ).run(username, hashPassword(input.password), display, 'bayi', customer.id)
}

export function approveUser(id: number): User {
  const db = getDb()
  const u = getUser(id)
  if (!u) throw new Error('Kullanıcı bulunamadı.')
  const customer_id = u.role === 'bayi' ? (u.customer_id ?? createCustomerShell(u.display_name || u.username).id) : u.customer_id
  db.prepare('UPDATE users SET approved = 1, active = 1, customer_id = ? WHERE id = ?').run(customer_id, id)
  return getUser(id)!
}

/** Every non-admin is a dealer with a company card; older databases may still have 'satis' users or dealers without one. */
export function ensureDealerCustomers(): void {
  const db = getDb()
  db.prepare("UPDATE users SET role = 'bayi' WHERE role <> 'admin'").run()
  const orphans = db.prepare("SELECT id, username, display_name FROM users WHERE role = 'bayi' AND (customer_id IS NULL OR customer_id NOT IN (SELECT id FROM customers))").all() as Pick<User, 'id' | 'username' | 'display_name'>[]
  const link = db.prepare('UPDATE users SET customer_id = ? WHERE id = ?')
  for (const u of orphans) link.run(createCustomerShell(u.display_name || u.username).id, u.id)
}

export function pendingUserCount(): number {
  return (getDb().prepare('SELECT COUNT(*) c FROM users WHERE approved = 0').get() as { c: number }).c
}

export function deleteUser(id: number): void {
  const db = getDb()
  const admins = (db.prepare(`SELECT COUNT(*) c FROM users WHERE role='admin' AND active=1 AND id <> ?`).get(id) as { c: number }).c
  const target = getUser(id)
  if (target?.role === 'admin' && admins === 0) throw new Error('Son yönetici silinemez.')
  db.prepare('DELETE FROM users WHERE id = ?').run(id)
  if (target?.customer_id) {
    db.prepare(
      `DELETE FROM customers WHERE id = ? AND code = ''
         AND NOT EXISTS (SELECT 1 FROM orders WHERE customer_id = customers.id)
         AND NOT EXISTS (SELECT 1 FROM users WHERE customer_id = customers.id)`
    ).run(target.customer_id)
  }
}
