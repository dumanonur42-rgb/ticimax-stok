import type { Settings } from '@shared/types'
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
  theme: 'system',
  font_scale: 1,
  reduce_motion: false,
  density: 'comfortable'
}

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

export function setSettings(patch: Partial<Settings>): Settings {
  const db = getDb()
  const up = db.prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(patch)) {
      if (k in DEFAULT_SETTINGS) up.run(k, JSON.stringify(v))
    }
  })
  tx()
  return getSettings()
}
