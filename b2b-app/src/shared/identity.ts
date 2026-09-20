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

/** Product identity: the same code with a different brand or packaging ("Kutulu" / "Kutusuz") is a different product. */
export function productKey(sku: string, brand: string, box: string): string {
  return `${normalize(sku)}|${normalize(brand)}|${normalize(box)}`
}
