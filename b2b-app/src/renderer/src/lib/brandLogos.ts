const files = import.meta.glob<string>('../assets/brands/*.webp', { eager: true, import: 'default' })

const logos = new Map(
  Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -5), url])
)

const ALIASES: Record<string, string> = {
  ZVL: 'zkl',
  BOSCH: 'rexroth',
  STAR: 'rexroth',
  ASKUBAL: 'ask',
  STEYER: 'steyr',
  STYER: 'steyr'
}

// Emblems whose lettering is too small to read: never shown at chip size.
const EMBLEMS = new Set(['zkl', 'ina', 'dkf', 'urb', 'snfa', 'bpw', 'hth'])

// Marks that are readable in the drawer but not at list-row height.
const TINY = new Set(['ask', 'sbc', 'slf', 'zf', 'eurosnodi', 'nb', 'schneeberger'])

/**
 * Logo of the brand named by the first word, e.g. "SKF", "KYK JAPAN" or "GPZ-ZKL".
 * `named` is false when the logo alone does not say the whole brand, so the name must stay visible.
 * `label` is the text a list row shows beside the logo: the part of the name the logo does not say.
 */
export function brandLogo(brand: string): { src: string; emblem: boolean; named: boolean; label: string } | undefined {
  const text = brand.trim()
  const upper = text.toLocaleUpperCase('tr-TR').replace(/İ/g, 'I')
  const words = upper.split(/[^A-Z0-9]+/).filter(Boolean)
  if (!words.length) return undefined
  const alias = ALIASES[words[0]]
  const key = alias ?? words[0].toLowerCase()
  const src = logos.get(key)
  if (!src) return undefined
  const emblem = EMBLEMS.has(key)
  const whole = emblem || alias !== undefined || TINY.has(key)
  // "SKF(ÇIKMA)", "GPZ-ZKL": everything but the word the logo stands for; upper-casing must not have moved it.
  const start = upper.length === text.length ? upper.indexOf(words[0]) : -1
  const label = whole || start < 0 ? text : `${text.slice(0, start)}${text.slice(start + words[0].length)}`.replace(/^[\s\-/.,]+/, '')
  return { src, emblem, named: !emblem && !alias && words.length === 1, label }
}
