import type { Settings } from '@shared/types'
import { cloud, must, mustVoid } from '../cloud/client'
import { getDb } from '../db'

export const DEFAULT_SETTINGS: Settings = {
  company_name: 'Yamansa Rulman',
  company_phone: '',
  company_email: '',
  company_address: '',
  company_web: 'yamansarulman.com',
  default_currency: 'TRY',
  rate_usd: 0,
  rate_eur: 0,
  vat_pct: 20,
  low_stock_threshold: 5,
  show_prices_to_dealers: true,
  card_price_pct: 5,
  theme: 'system',
  font_scale: 1,
  reduce_motion: false,
  density: 'comfortable',
  background_notifications: true
}

/** Per-device preferences; everything else is shared company-wide through the cloud `settings` table. */
const LOCAL_KEYS: ReadonlySet<keyof Settings> = new Set<keyof Settings>([
  'theme',
  'font_scale',
  'reduce_motion',
  'density',
  'background_notifications'
])

export function isLocalSetting(key: string): boolean {
  return LOCAL_KEYS.has(key as keyof Settings)
}

/** Reads the local table, which doubles as the cache of the shared settings (see `pullSettings`). */
export function getSettings(): Settings {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS }
  for (const r of rows) {
    if (r.key in DEFAULT_SETTINGS) {
      try {
        out[r.key] = JSON.parse(r.value)
      } catch {
        out[r.key] = r.value
      }
    }
  }
  return out as unknown as Settings
}

function writeLocal(patch: Record<string, unknown>): void {
  const db = getDb()
  const up = db.prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  db.transaction(() => {
    for (const [k, v] of Object.entries(patch)) if (k in DEFAULT_SETTINGS) up.run(k, JSON.stringify(v))
  })()
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const shared: { key: string; value: unknown }[] = []
  for (const [k, v] of Object.entries(patch)) {
    if (k in DEFAULT_SETTINGS && !isLocalSetting(k)) shared.push({ key: k, value: v })
  }
  if (shared.length) mustVoid(await cloud().from('settings').upsert(shared))
  writeLocal(patch)
  return getSettings()
}

export function setLocalSettings(patch: Partial<Settings>): Settings {
  const local: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) if (isLocalSetting(k)) local[k] = v
  writeLocal(local)
  return getSettings()
}

export async function pullSettings(): Promise<void> {
  const rows = must(await cloud().from('settings').select('*'))
  const patch: Record<string, unknown> = {}
  for (const r of rows) if (r.key in DEFAULT_SETTINGS && !isLocalSetting(r.key)) patch[r.key] = r.value
  writeLocal(patch)
}
