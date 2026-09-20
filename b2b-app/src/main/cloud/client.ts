import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'
import type { Database } from './database.types'

export type Cloud = SupabaseClient<Database, 'public'>

let client: Cloud | null = null

/** Auth tokens live next to the SQLite cache so a signed-in user stays signed in across restarts. */
function tokenFile(): string {
  return join(app.getPath('userData'), 'data', 'cloud-session.json')
}

const fileStorage = {
  getItem(key: string): string | null {
    try {
      const f = tokenFile()
      if (!existsSync(f)) return null
      const all = JSON.parse(readFileSync(f, 'utf8')) as Record<string, string>
      return all[key] ?? null
    } catch {
      return null
    }
  },
  setItem(key: string, value: string): void {
    const f = tokenFile()
    mkdirSync(dirname(f), { recursive: true })
    let all: Record<string, string> = {}
    try {
      if (existsSync(f)) all = JSON.parse(readFileSync(f, 'utf8')) as Record<string, string>
    } catch {
      all = {}
    }
    all[key] = value
    writeFileSync(f, JSON.stringify(all), 'utf8')
  },
  removeItem(key: string): void {
    const f = tokenFile()
    try {
      if (!existsSync(f)) return
      const all = JSON.parse(readFileSync(f, 'utf8')) as Record<string, string>
      delete all[key]
      if (Object.keys(all).length === 0) rmSync(f, { force: true })
      else writeFileSync(f, JSON.stringify(all), 'utf8')
    } catch {
      rmSync(f, { force: true })
    }
  }
}

export function cloud(): Cloud {
  if (client) return client
  client = createClient<Database, 'public'>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { storage: fileStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 5 } },
    global: { headers: { 'x-client-info': `yamansa-b2b/${app.getVersion()}` } }
  })
  return client
}

/** A throw-away client (no persisted session) used when an administrator creates another account. */
export function ephemeralCloud(): Cloud {
  return createClient<Database, 'public'>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  })
}

/** Translate PostgREST/GoTrue failures into the Turkish messages the UI shows. */
export function cloudError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e)
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network|Failed to fetch/i.test(msg)) {
    return new Error('Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.')
  }
  if (/Invalid login credentials/i.test(msg)) return new Error('Kullanıcı adı veya şifre hatalı.')
  if (/already registered|already been registered|duplicate key value.*profiles_username/i.test(msg)) {
    return new Error('Bu kullanıcı adı zaten alınmış.')
  }
  if (/Password should be at least/i.test(msg)) return new Error('Şifre en az 6 karakter olmalı.')
  if (/JWT expired|invalid claim|refresh_token_not_found/i.test(msg)) return new Error('Oturum süresi doldu, lütfen yeniden giriş yapın.')
  if (/violates row-level security|permission denied/i.test(msg)) return new Error('Bu işlem için yetkiniz yok.')
  // `.single()` on a write that RLS filtered down to zero rows.
  if (/Cannot coerce the result to a single JSON object/i.test(msg)) return new Error('Kayıt bulunamadı veya bu işlem için yetkiniz yok.')
  return new Error(msg)
}

/** Unwrap a supabase-js response, throwing a user-facing error on failure. */
export function must<R extends { data: unknown; error: { message: string } | null }>(r: R): NonNullable<R['data']> {
  if (r.error) throw cloudError(r.error)
  if (r.data === null || r.data === undefined) throw new Error('Kayıt bulunamadı.')
  return r.data as NonNullable<R['data']>
}

export function mustVoid(r: { error: { message: string } | null }): void {
  if (r.error) throw cloudError(r.error)
}
