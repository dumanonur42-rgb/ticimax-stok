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

/** Product identity: the same code with a different brand or packaging ("Kutulu" / "Kutusuz") is a different product. */
export function productKey(sku: string, brand: string, box: string): string {
  return `${normalize(sku)}|${normalize(brand)}|${normalize(canonBox(box))}`
}
