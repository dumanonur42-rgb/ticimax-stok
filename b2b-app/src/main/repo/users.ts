import type { Session, User, UserRole } from '@shared/types'
import { hashPassword, verifyPassword } from '../auth'
import { getDb } from '../db'
import { getCustomer } from './customers'

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
  if (u.id) {
    db.prepare('UPDATE users SET username=?, display_name=?, role=?, customer_id=?, active=? WHERE id=?').run(
      username,
      u.display_name,
      u.role,
      u.customer_id,
      u.active,
      u.id
    )
    if (u.password) db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(u.password), u.id)
    return getUser(u.id)!
  }
  if (!u.password || u.password.length < 4) throw new Error('Şifre en az 4 karakter olmalı.')
  const r = db
    .prepare("INSERT INTO users(username, password_hash, display_name, role, customer_id, active, created_at) VALUES (?,?,?,?,?,?,datetime('now','localtime'))")
    .run(username, hashPassword(u.password), u.display_name, u.role, u.customer_id, u.active)
  return getUser(Number(r.lastInsertRowid))!
}

/** Self-service sign-up: always a standard (non-admin) account that stays locked until an administrator approves it. */
export function registerUser(input: { username: string; display_name: string; password: string }): void {
  const db = getDb()
  const username = input.username.trim()
  if (username.length < 3) throw new Error('Kullanıcı adı en az 3 karakter olmalı.')
  if (!/^[\p{L}\p{N}._-]+$/u.test(username)) throw new Error('Kullanıcı adı yalnızca harf, rakam, nokta, alt çizgi ve tire içerebilir.')
  if (input.password.length < 4) throw new Error('Şifre en az 4 karakter olmalı.')
  if (db.prepare('SELECT 1 FROM users WHERE username = ? COLLATE NOCASE').get(username)) throw new Error('Bu kullanıcı adı zaten alınmış.')
  db.prepare(
    "INSERT INTO users(username, password_hash, display_name, role, customer_id, active, approved, created_at) VALUES (?,?,?,?,?,1,0,datetime('now','localtime'))"
  ).run(username, hashPassword(input.password), input.display_name.trim() || username, 'satis', null)
}

export function approveUser(id: number): User {
  const db = getDb()
  if (!getUser(id)) throw new Error('Kullanıcı bulunamadı.')
  db.prepare('UPDATE users SET approved = 1, active = 1 WHERE id = ?').run(id)
  return getUser(id)!
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
}
