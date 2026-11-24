const files = import.meta.glob<string>('../assets/brands/*.webp', { eager: true, import: 'default' })

const logos = new Map(
  Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -5), url])
)

const ALIASES: Record<string, string> = { ZVL: 'zkl', BOSCH: 'rexroth' }

// Emblems whose lettering is too small to read: shown with the brand name, never at chip size.
const EMBLEMS = new Set(['zkl', 'ina', 'dkf', 'urb', 'snfa'])

/** Logo of the brand named by the first word, e.g. "SKF", "KYK JAPAN" or "GPZ-ZKL". */
export function brandLogo(brand: string): { src: string; emblem: boolean } | undefined {
  const word = brand
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g, 'I')
    .split(/[^A-Z0-9]+/)
    .find(Boolean)
  if (!word) return undefined
  const key = ALIASES[word] ?? word.toLowerCase()
  const src = logos.get(key)
  return src ? { src, emblem: EMBLEMS.has(key) } : undefined
}
