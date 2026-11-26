import { SUPPORT_PHONE, type Settings } from '@shared/types'

const SHOW_PRICES_CACHE = 'yb2b.showPricesToDealers'

export function cachedShowPricesToDealers(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(SHOW_PRICES_CACHE) === 'true'
  } catch {
    return false
  }
}

export function cacheShowPricesToDealers(value: boolean): void {
  try {
    localStorage.setItem(SHOW_PRICES_CACHE, String(value))
  } catch {}
}

export const DEFAULT_SETTINGS: Settings = {
  company_name: 'Yamansa Rulman',
  company_phone: SUPPORT_PHONE,
  company_email: '',
  company_address: '',
  company_web: 'yamansarulman.com',
  default_currency: 'TRY',
  brand_aliases: {},
  rate_usd: 0,
  rate_eur: 0,
  vat_pct: 20,
  low_stock_threshold: 5,
  show_prices_to_dealers: true,
  restrict_shelf: false,
  restrict_description: false,
  card_price_pct: 5,
  theme: 'system',
  font_scale: 1,
  reduce_motion: false,
  density: 'comfortable',
  background_notifications: true
}

export const SHARED_SETTING_KEYS = new Set<keyof Settings>([
  'company_name',
  'company_phone',
  'company_email',
  'company_address',
  'company_web',
  'default_currency',
  'rate_usd',
  'rate_eur',
  'vat_pct',
  'low_stock_threshold',
  'show_prices_to_dealers',
  'card_price_pct',
  'min_version_android',
  'min_version_ios',
  'min_version_windows'
])
