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

/** Spellings of the same packaging state map to one display label. */
const BOX_ALIASES: ReadonlyArray<[RegExp, string]> = [
  [/^KUTUL[UI]$|^KUTU$/, 'Kutulu'],
  [/^KUTUSUZ$/, 'Kutusuz'],
  [/^OR[IJ]{1,2}(INAL)?KAGIT$/, 'Orjinal Kağıt'],
  [/^POSET(LI)?$/, 'Poşet'],
  [/^KAGIT(LI)?$/, 'Kağıt']
]

/** Words dropped from a packaging label ("3 adet kutulu" → "Kutulu"). */
const BOX_NOISE = /\b(adet|ad\.?|tane|tn\.?)\b/gi

/** Canonical packaging label: known spellings unified, unknown ones tidied ("10'LU  PAKET" → "10'lu Paket"). */
export function canonBox(raw: string): string {
  const text = raw
    .replace(BOX_NOISE, ' ')
    .replace(/[\s\-–—,;/|:=()[\]]+/g, ' ')
    .trim()
  if (!text) return ''
  const key = normalize(text)
  for (const [re, label] of BOX_ALIASES) if (re.test(key)) return label
  return text
    .split(' ')
    .map((w) => {
      const lower = w.toLocaleLowerCase('tr-TR')
      return lower.charAt(0).toLocaleUpperCase('tr-TR') + lower.slice(1)
    })
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
  return `${normalize(sku)}|${normalize(brand)}|${normalize(canonBox(box))}`
}
