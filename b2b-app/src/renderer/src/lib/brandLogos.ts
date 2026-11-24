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

// A country written where the maker should be: shown as a mark in the flag's colours that fills the plate.
// Keys are `normalize`d spellings; the marks are assets/brands/flag-<name>.webp.
const COUNTRIES: Record<string, string> = Object.fromEntries(
  Object.entries({
    cin: 'CIN CHINA',
    usa: 'USA AMERIKA ABD',
    germany: 'GERMANY GERMAN ALMANYA',
    avrupa: 'AVRUPA EU',
    ussr: 'USSR SSCB',
    rus: 'RUS RUSYA RUSSIA',
    england: 'ENGLAND INGILTERE UK',
    italy: 'ITALY ITALYA ITALIA',
    france: 'FRANCE FRANSA',
    austria: 'AUSTRIA AVUSTURYA',
    india: 'INDIA HINDISTAN',
    kore: 'KORE KOREA',
    japan: 'JAPAN JAPON JAPONYA',
    turkiye: 'TURK TURKIYE TURKEY',
    tayvan: 'TAYVAN TAIWAN',
    ispanya: 'ISPANYA SPAIN',
    isvec: 'ISVEC SWEDEN',
    swiss: 'SWISS ISVICRE SWITZERLAND',
    polonya: 'POLONYA POLAND',
    cekya: 'CEKYA CEK CZECH',
    slovakya: 'SLOVAKYA SLOVAKIA',
    romanya: 'ROMANYA ROMANIA',
    bulgaristan: 'BULGARISTAN BULGARIA',
    macaristan: 'MACARISTAN HUNGARY',
    yugoslavia: 'YUGOSLAVIA YUGOSLAVYA',
    sirbistan: 'SIRBISTAN SERBIA',
    ukrayna: 'UKRAYNA UKRAINE',
    portekiz: 'PORTEKIZ PORTUGAL',
    hollanda: 'HOLLANDA HOLLAND NETHERLANDS',
    belcika: 'BELCIKA BELGIUM',
    brezilya: 'BREZILYA BRAZIL',
    tayland: 'TAYLAND THAILAND',
    malezya: 'MALEZYA MALAYSIA',
    singapur: 'SINGAPUR SINGAPORE',
    endonezya: 'ENDONEZYA INDONESIA',
    vietnam: 'VIETNAM'
  }).flatMap(([mark, spellings]) => spellings.split(' ').map((word) => [word, `flag-${mark}`]))
)

export interface BrandLogo {
  src: string
  /** Size inside a logo plate, as CSS percentages of its inner box; see scripts/brand-logo-fit.py. */
  size: { width: string; height: string }
  /** An emblem without readable lettering. */
  emblem: boolean
  /** The logo alone says the whole brand, so the name need not be written next to it. */
  named: boolean
  /** A country mark, drawn edge to edge instead of inside a white plate. */
  flag: boolean
}

/** Logo of the maker named by the first word of a brand, e.g. "SKF", "İNA" or "GPZ-ZKL". */
export function brandLogo(brand: string): BrandLogo | undefined {
  const words = brand.split(/[\s\-/().,&]+/).map(normalize).filter(Boolean)
  if (!words.length) return undefined
  const country = words.length === 1 ? logos.get(COUNTRIES[words[0]] ?? '') : undefined
  if (country) return { src: country, size: { width: '100%', height: '100%' }, emblem: false, named: true, flag: true }
  const key = (SPELLINGS[words[0]] ?? OWNERS[words[0]] ?? words[0]).toLowerCase()
  const src = logos.get(key)
  const box = (fit as Record<string, number[]>)[key]
  if (!src || !box) return undefined
  const emblem = EMBLEMS.has(key)
  return {
    src,
    size: { width: `${box[0]}%`, height: `${box[1]}%` },
    emblem,
    named: !emblem && !UNREADABLE.has(key) && !(words[0] in OWNERS) && words.length === 1,
    flag: false
  }
}
