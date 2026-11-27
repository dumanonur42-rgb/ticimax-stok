export type Site = 'yamansarulman' | 'rulmansitesi' | 'teknikkesici'

export const HOSTS: Record<string, Site> = {
  'yamansarulman.com': 'yamansarulman',
  'www.yamansarulman.com': 'yamansarulman',
  'rulmansitesi.com': 'rulmansitesi',
  'www.rulmansitesi.com': 'rulmansitesi',
  'teknikkesici.com.tr': 'teknikkesici',
  'www.teknikkesici.com.tr': 'teknikkesici'
}

export function parseSiteOrigin(value: string, allowPath = false): { origin: string; site: Site } | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.port || url.username || url.password) return null
    if (!allowPath && url.pathname !== '/' && url.pathname !== '') return null
    const site = HOSTS[url.hostname.toLowerCase()]
    return site ? { origin: url.origin, site } : null
  } catch {
    return null
  }
}
