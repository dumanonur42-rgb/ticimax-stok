const files = import.meta.glob<string>('../assets/brands/*.webp', { eager: true, import: 'default' })

const logos = new Map(
  Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -5), url])
)

const ALIASES: Record<string, string> = { ZVL: 'zkl', BOSCH: 'rexroth' }

// Emblems whose lettering is too small to read: never shown at chip size.
const EMBLEMS = new Set(['zkl', 'ina', 'dkf', 'urb', 'snfa'])

/**
 * Logo of the brand named by the first word, e.g. "SKF", "KYK JAPAN" or "GPZ-ZKL".
 * `named` is false when the logo alone does not say the whole brand, so the name must stay visible.
 */
export function brandLogo(brand: string): { src: string; emblem: boolean; named: boolean } | undefined {
  const words = brand
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g, 'I')
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
  if (!words.length) return undefined
  const key = ALIASES[words[0]] ?? words[0].toLowerCase()
  const src = logos.get(key)
  if (!src) return undefined
  const emblem = EMBLEMS.has(key)
  return { src, emblem, named: !emblem && words.length === 1 }
}
