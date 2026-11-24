/** Uppercase, Turkish-aware, strip everything except letters/digits. Used for SKU/brand/box matching. */
export function normalize(s: string): string {
  return s
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]+/g, '')
}

/**
 * Display spelling of a brand: trimmed, single-spaced, Turkish uppercase ("skf" → "SKF", "çin" → "ÇİN").
 * Dotted/dotless i are the same brand for identity (`normalize`); the stored spelling is unified against the
 * catalogue by `resolveBrand` in the main process so "INA" and "İNA" never appear as two brands.
 */
export function canonBrand(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().toLocaleUpperCase('tr-TR')
}

const KUTULU_ALIASES = new Set(['KUTULU', 'KUTULI', 'KUTU', 'KUTULLU'])
const KUTUSUZ_ALIASES = new Set(['KUTUSUZ', 'KUTUSZ', 'KUTSUZ', 'KUTUUSZ', 'KUTUUSUZ'])
const BOX_NOISE = /\b(adet|ad\.?|tane|tn\.?)\b/gi
const BOX_STATE_ALIASES = new Map<string, string>([
  ['ORJ', 'Orjinal'],
  ['ORJINAL', 'Orjinal'],
  ['ORIGINAL', 'Orjinal'],
  ['ORJKAGIT', 'Orjinal Kağıt'],
  ['ORJINALKAGIT', 'Orjinal Kağıt'],
  ['ORIGINALKAGIT', 'Orjinal Kağıt'],
  ['POSET', 'Poşet'],
  ['POSETLI', 'Poşet'],
  ['KAGIT', 'Kağıt'],
  ['KAGITLI', 'Kağıt']
])

function canonicalBoxText(raw: string): string {
  const text = raw
    .replace(BOX_NOISE, ' ')
    .replace(/(\d)([A-Za-zÇĞİÖŞÜçğıöşü])/g, '$1 $2')
    .replace(/[\s\-–—,;/|:=()[\]]+/g, ' ')
    .trim()
  if (!text) return ''
  return text.split(' ').map((word) => {
    const key = normalize(word)
    if (KUTULU_ALIASES.has(key)) return 'Kutulu'
    if (KUTUSUZ_ALIASES.has(key)) return 'Kutusuz'
    return BOX_STATE_ALIASES.get(key) ?? titleWord(word)
  }).join(' ')
}

function titleWord(word: string): string {
  const lower = word.toLocaleLowerCase('tr-TR')
  return lower.charAt(0).toLocaleUpperCase('tr-TR') + lower.slice(1)
}

function parseCanonicalBox(text: string): { count: number | null; state: string }[] | null {
  if (!text) return null
  const tokens = text.split(' ')
  const countToken = (value: string): boolean => /^\d+(?:[.,]\d+)?$/.test(value)
  const packSizeNumber = (index: number): boolean => countToken(tokens[index]) && ['LU', 'LI'].includes(normalize(tokens[index + 1] ?? ''))
  const isCount = (index: number): boolean => countToken(tokens[index]) && !packSizeNumber(index)
  const knownStateToken = (value: string): boolean => value === 'Kutulu' || value === 'Kutusuz'
  const countIndexes = tokens.map((_, index) => isCount(index) ? index : -1).filter((index) => index >= 0)
  if (countIndexes.length) {
    const parts: { count: number | null; state: string }[] = []
    let i = 0
    while (i < tokens.length) {
      let count: number | null = null
      if (isCount(i)) {
        count = Number(tokens[i++].replace(',', '.'))
        if (!Number.isFinite(count)) return null
      }
      const state: string[] = []
      while (i < tokens.length && !isCount(i)) state.push(tokens[i++])
      if (!state.length || state.some((word) => knownStateToken(word) && state.length > 1)) return null
      parts.push({ count, state: state.join(' ') })
    }
    return parts.length ? parts : null
  }
  if (tokens.every(knownStateToken)) return tokens.map((state) => ({ count: null, state }))
  if (tokens.some(knownStateToken)) return null
  return [{ count: null, state: text }]
}

/** Parse a label only when it is a complete sequence of count/state groups. */
export function boxParts(label: string): { count: number | null; state: string }[] | null {
  return parseCanonicalBox(canonicalBoxText(label))
}

function canonicalParts(parts: { count: number | null; state: string }[]): { count: number | null; state: string }[] {
  const merged: { count: number | null; state: string }[] = []
  const indexByState = new Map<string, number>()
  for (const part of parts) {
    const key = normalize(part.state)
    const index = indexByState.get(key)
    if (index === undefined) {
      indexByState.set(key, merged.length)
      merged.push({ ...part })
    } else {
      const previous = merged[index]
      previous.count = previous.count === null && part.count === null
        ? null
        : (previous.count ?? 0) + (part.count ?? 0)
    }
  }
  const known = (state: string): number => state === 'Kutulu' ? 0 : state === 'Kutusuz' ? 1 : 2
  return merged.map((part, index) => ({ part, index }))
    .sort((a, b) => known(a.part.state) - known(b.part.state) || a.index - b.index)
    .map(({ part }) => part)
}

function renderParts(parts: { count: number | null; state: string }[]): string {
  if (parts.length === 1) return parts[0].state
  return parts.map(({ count, state }) => `${count === null ? '' : `${count} `}${state}`).join(' ')
}

/** Canonical packaging label: known spellings unified and parseable state groups ordered and combined. */
export function canonBox(raw: string): string {
  const text = canonicalBoxText(raw)
  if (!text) return ''
  const parts = parseCanonicalBox(text)
  return parts ? renderParts(canonicalParts(parts)) : text
}

/** Product identity ignores quantities in parseable packaging labels but preserves the full unparsed label. */
export function boxIdentity(label: string): string {
  const canonical = canonBox(label)
  const parts = parseCanonicalBox(canonical)
  if (!parts) return canonical
  const seen = new Set<string>()
  return canonicalParts(parts)
    .filter(({ state }) => {
      const key = normalize(state)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(({ state }) => state)
    .join(' ')
}

/**
 * True when a combined packaging label ("4 Kutulu 2 Kutusuz", "3 Kutulu 1 Orj Kağıt") mentions the packaging state
 * `word` ("kutulu", "orjinal kağıt"); a bare match of the whole label is not a mention.
 */
export function boxMentions(label: string, word: string): boolean {
  const want = normalize(canonBox(word))
  if (!want) return false
  const tokens = canonBox(label).split(' ').filter(Boolean)
  if (tokens.length < 2) return false
  for (let i = 0; i < tokens.length; i++) {
    for (let n = 1; n <= 3 && i + n <= tokens.length; n++) {
      if (normalize(canonBox(tokens.slice(i, i + n).join(' '))) === want) return true
    }
  }
  return false
}

/** Product identity: the same code with a different brand or packaging ("Kutulu" / "Kutusuz") is a different product. */
export function productKey(sku: string, brand: string, box: string): string {
  return `${normalize(sku)}|${normalize(brand)}|${normalize(boxIdentity(box))}`
}

export const DEFAULT_BRAND_ALIASES: Record<string, string> = {
  HOFFMAN: 'HOFFMANN',
  DURKOOP: 'DURKOPP',
  DURBALL: 'DURBAL',
  KYO: 'KOYO',
  DTEC: 'D-TECH',
  'D-TEC': 'D-TECH',
  'GNUTTI ILTAY': 'GNUTTI İTALY',
  'HIC JAPON': 'HIC JAPAN',
  'JAF JAPON': 'JAF JAPAN',
  'JBS JAPON': 'JBS JAPAN',
  'GMB KORE': 'GMB KOREA'
}

export function mergeBrandAliases(value: unknown): Record<string, string> {
  const defaults = Object.fromEntries(Object.entries(DEFAULT_BRAND_ALIASES).map(([from, to]) => [normalize(from), to]))
  const aliases = { ...defaults }
  const saved = new Map<string, string>()
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [from, to] of Object.entries(value)) {
      const key = normalize(from)
      if (!key || typeof to !== 'string') continue
      if (!to.trim()) {
        delete aliases[key]
        saved.delete(key)
      } else {
        const target = canonBrand(to)
        aliases[key] = target
        saved.set(key, target)
      }
    }
  }
  for (const [key, target] of Object.entries(aliases)) {
    const targetKey = normalize(target)
    if (targetKey === key) {
      delete aliases[key]
      continue
    }
    const reverse = saved.get(targetKey)
    if (defaults[key] !== undefined && !saved.has(key) && reverse && normalize(reverse) === key) {
      delete aliases[key]
    }
  }
  return aliases
}

export interface BrandAliasEntry {
  key: string
  source: string
  target: string
}

export function brandAliasEntries(value: unknown): BrandAliasEntry[] {
  const aliases = mergeBrandAliases(value)
  const sourceLabels = new Map<string, string>()
  for (const source of Object.keys(DEFAULT_BRAND_ALIASES)) {
    const key = normalize(source)
    if (!sourceLabels.has(key) || source.length > sourceLabels.get(key)!.length) sourceLabels.set(key, source)
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [source, target] of Object.entries(value)) {
      const key = normalize(source)
      if (!key || !aliases[key] || typeof target !== 'string') continue
      const original = source.trim()
      if (original && original !== key) sourceLabels.set(key, original)
    }
  }
  return Object.entries(aliases)
    .map(([key, target]) => ({ key, source: sourceLabels.get(key) ?? key, target }))
    .sort((a, b) => a.source.localeCompare(b.source) || a.key.localeCompare(b.key))
}

const ORIGIN_NAMES = new Map<string, string>([
  ['GERMANY', 'Almanya'],
  ['JAPAN', 'Japonya'],
  ['JAPON', 'Japonya'],
  ['ITALY', 'İtalya'],
  ['ITALYA', 'İtalya'],
  ['USA', 'ABD'],
  ['ENGLAND', 'İngiltere'],
  ['CIN', 'Çin'],
  ['CHINA', 'Çin'],
  ['KORE', 'Kore'],
  ['KOREA', 'Kore'],
  ['INDIA', 'Hindistan'],
  ['ROMANYA', 'Romanya'],
  ['TURK', 'Türkiye'],
  ['TURKEY', 'Türkiye'],
  ['FRANCE', 'Fransa'],
  ['SWEDEN', 'İsveç'],
  ['ISPANYA', 'İspanya'],
  ['SPAIN', 'İspanya'],
  ['RUS', 'Rusya'],
  ['RUSYA', 'Rusya'],
  ['SWISS', 'İsviçre'],
  ['AVUSTURYA', 'Avusturya'],
  ['AUSTRIA', 'Avusturya'],
  ['YUGOSLAVIA', 'Yugoslavya'],
  ['EU', 'Avrupa'],
  ['AVRUPA', 'Avrupa'],
  ['ALMANYA', 'Almanya'],
  ['GERMAN', 'Almanya'],
  ['UK', 'İngiltere'],
  ['JAPONYA', 'Japonya'],
  ['ITALIA', 'İtalya'],
  ['AMERIKA', 'ABD'],
  ['ABD', 'ABD'],
  ['INGILTERE', 'İngiltere'],
  ['FRANSA', 'Fransa'],
  ['HINDISTAN', 'Hindistan'],
  ['TURKIYE', 'Türkiye'],
  ['RUSSIA', 'Rusya'],
  ['USSR', 'SSCB'],
  ['SSCB', 'SSCB'],
  ['TAYVAN', 'Tayvan'],
  ['TAIWAN', 'Tayvan'],
  ['ISVEC', 'İsveç'],
  ['ISVICRE', 'İsviçre'],
  ['SWITZERLAND', 'İsviçre'],
  ['POLONYA', 'Polonya'],
  ['POLAND', 'Polonya'],
  ['CEKYA', 'Çekya'],
  ['CEK', 'Çekya'],
  ['CZECH', 'Çekya'],
  ['SLOVAKYA', 'Slovakya'],
  ['SLOVAKIA', 'Slovakya'],
  ['ROMANIA', 'Romanya'],
  ['BULGARISTAN', 'Bulgaristan'],
  ['BULGARIA', 'Bulgaristan'],
  ['MACARISTAN', 'Macaristan'],
  ['HUNGARY', 'Macaristan'],
  ['YUGOSLAVYA', 'Yugoslavya'],
  ['SIRBISTAN', 'Sırbistan'],
  ['SERBIA', 'Sırbistan'],
  ['UKRAYNA', 'Ukrayna'],
  ['UKRAINE', 'Ukrayna'],
  ['PORTEKIZ', 'Portekiz'],
  ['PORTUGAL', 'Portekiz'],
  ['HOLLANDA', 'Hollanda'],
  ['HOLLAND', 'Hollanda'],
  ['NETHERLANDS', 'Hollanda'],
  ['BELCIKA', 'Belçika'],
  ['BELGIUM', 'Belçika'],
  ['BREZILYA', 'Brezilya'],
  ['BRAZIL', 'Brezilya'],
  ['TAYLAND', 'Tayland'],
  ['THAILAND', 'Tayland'],
  ['MALEZYA', 'Malezya'],
  ['MALAYSIA', 'Malezya'],
  ['SINGAPUR', 'Singapur'],
  ['SINGAPORE', 'Singapur'],
  ['ENDONEZYA', 'Endonezya'],
  ['INDONESIA', 'Endonezya'],
  ['VIETNAM', 'Vietnam']
])

const CONDITION_NAMES = new Map<string, string>([['CIKMA', 'Çıkma']])

/**
 * Splits what is typed into the brand field into the maker, the country of origin and the condition of the part:
 * "FAG GERMANY", "NB ( JAPAN )", "USA MCGILL" and "SKF(ÇIKMA)" are FAG, NB, MCGILL and SKF. A country on its own
 * ("ÇİN") stays the brand, because nothing else names the maker.
 */
export function brandOrigin(brand: string): { base: string; origin: string; condition: string } {
  let base = brand.replace(/\s+/g, ' ').trim()
  let origin = ''
  let condition = ''
  for (let pass = 0; pass < 3; pass++) {
    const last = /^(.*?)[\s/]*(?:\(\s*([^()]+?)\s*\)|([^\s()/]+))$/.exec(base)
    const first = /^(?:\(\s*([^()]+?)\s*\)|([^\s()/]+))[\s/]+(.+)$/.exec(base)
    const candidates: Array<[string, string]> = []
    if (last) candidates.push([last[2] ?? last[3] ?? '', last[1].trim()])
    if (first) candidates.push([first[1] ?? first[2] ?? '', first[3].trim()])
    // The condition goes first: in "ÇIKMA/ÇİN" the country is the only word left that can name the maker.
    const found = candidates.find(([word, rest]) => rest && !condition && CONDITION_NAMES.has(normalize(word)))
      ?? candidates.find(([word, rest]) => rest && !origin && ORIGIN_NAMES.has(normalize(word)))
    if (!found) break
    const key = normalize(found[0])
    if (CONDITION_NAMES.has(key)) condition = CONDITION_NAMES.get(key) ?? ''
    else origin = ORIGIN_NAMES.get(key) ?? ''
    base = found[1]
  }
  // "ÇİN (NATURAL)": what is left may still be wrapped in the brackets it was typed with.
  const wrapped = /^\(\s*([^()]+?)\s*\)$/.exec(base)
  return { base: wrapped ? wrapped[1] : base, origin, condition }
}

/** A brand as one line of text, with its origin and condition spelled out: "FAG (Almanya)", "NMB (Çıkma)". */
export function brandLabel(brand: string): string {
  const { base, origin, condition } = brandOrigin(brand)
  const extra = [origin, condition].filter(Boolean).join(', ')
  return `${base}${extra ? ` (${extra})` : ''}`
}
