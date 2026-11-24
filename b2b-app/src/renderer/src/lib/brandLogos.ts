import { normalize } from '@shared/identity'
import fit from './brandLogoFit.json'

const files = import.meta.glob<string>('../assets/brands/*.webp', { eager: true, import: 'default' })

const logos = new Map(
  Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -5), url])
)

// Other spellings of the name the logo itself shows.
const SPELLINGS: Record<string, string> = { ASKUBAL: 'ask', STEYER: 'steyr', STYER: 'steyr' }

// Brands sold under the logo of the group that owns them; the logo does not say their name.
const OWNERS: Record<string, string> = { BOSCH: 'rexroth', STAR: 'rexroth' }

// Emblems whose lettering is too small to read at plate size: the name is printed beside them.
const EMBLEMS = new Set(['zkl', 'ina', 'dkf', 'urb', 'snfa', 'bpw', 'hth', 'slf'])

// Wordmarks that do not show the brand's short name legibly ("Nippon Bearing" for NB).
const UNREADABLE = new Set(['eurosnodi', 'nb', 'schneeberger'])

export interface BrandLogo {
  src: string
  /** Size inside a logo plate, as CSS percentages of its inner box; see scripts/brand-logo-fit.py. */
  size: { width: string; height: string }
  /** An emblem without readable lettering. */
  emblem: boolean
  /** The logo alone says the whole brand, so the name need not be written next to it. */
  named: boolean
}

/** Logo of the maker named by the first word of a brand, e.g. "SKF", "İNA" or "GPZ-ZKL". */
export function brandLogo(brand: string): BrandLogo | undefined {
  const words = brand.split(/[\s\-/().,&]+/).map(normalize).filter(Boolean)
  if (!words.length) return undefined
  const key = (SPELLINGS[words[0]] ?? OWNERS[words[0]] ?? words[0]).toLowerCase()
  const src = logos.get(key)
  const box = (fit as Record<string, number[]>)[key]
  if (!src || !box) return undefined
  const emblem = EMBLEMS.has(key)
  return {
    src,
    size: { width: `${box[0]}%`, height: `${box[1]}%` },
    emblem,
    named: !emblem && !UNREADABLE.has(key) && !(words[0] in OWNERS) && words.length === 1
  }
}
