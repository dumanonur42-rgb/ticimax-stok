import type { Currency, ImportLog, ImportOptions, ImportPreview, ImportResult, ProductInput, ProductLocation } from '@shared/types'
import { readFileSync, statSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { cloud, must, mustVoid } from '../cloud/client'
import type { ProductInsert } from '../cloud/database.types'
import { pullProducts } from '../cloud/sync'
import { boxParts, boxIdentity, brandOrigin, canonBox, canonBrand } from '@shared/identity'
import { parseProductLocations } from '@shared/locations'
import { getDb, normalize, normalizeText, productKey } from '../db'
import { brandSpellings, resolveBrand } from './products'

const PACKAGING_STATE_WORDS = new Set(['KUTULU', 'KUTUSUZ', 'ORJINAL', 'POSET', 'KAGIT', 'LEKELI', 'AMBALAJ', 'SARGI'])

interface Parsed {
  filename: string
  headers: string[]
  rows: string[][]
  createdAt?: number
}

const pending = new Map<string, Parsed>()
const MAX_PENDING_PREVIEWS = 10
const PREVIEW_TTL_MS = 30 * 60_000
const MAX_IMPORT_BYTES = 50 * 1024 * 1024
const UNREADABLE_FILE_ERROR = 'Dosya okunamadı. Lütfen geçerli bir Excel (.xlsx, .xls) ya da CSV dosyası seçin.'

type Field = keyof ProductInput

export function brandCountsFromRows(rows: string[][], skuIndex: number, brandIndex: number, defaultBrand: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const sku = (row[skuIndex] ?? '').trim()
    if (!sku || !normalize(sku)) continue
    const brand = canonBrand((row[brandIndex] ?? '') || defaultBrand)
    if (brand) counts.set(brand, (counts.get(brand) ?? 0) + 1)
  }
  return counts
}

/** Excel headers come in every casing ("ÜRÜN ADI", "FİYAT"); fold them with Turkish rules so İ/I match the hints. */
function headerKey(h: string): string {
  return h.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ')
}

const HEADER_HINTS: [Field, RegExp][] = [
  ['sku', /^(stok ?kodu?|ürün ?kodu?|urun ?kodu?|kod|sku|malzeme ?kodu?|parça ?no|code|no)$/i],
  ['name', /^(ürün ?adı?|urun ?adi?|ad|isim|ürün|malzeme|name|tanım|tanim)$/i],
  ['brand', /^(marka|brand|üretici|uretici)$/i],
  ['category', /^(kategori|grup|ürün ?grubu|kategori ?yolu|category)$/i],
  ['type', /^(tip|tür|tur|rulman ?tipi|type|cins)$/i],
  ['seal', /^(keçe|kece|kapak|seal|kapak ?tipi)$/i],
  ['d_inner', /^(iç ?çap|ic ?cap|d|d ?\(mm\)|inner|delik|mil ?çapı)$/i],
  ['d_outer', /^(dış ?çap|dis ?cap|D|D ?\(mm\)|outer)$/i],
  ['width', /^(genişlik|genislik|b|b ?\(mm\)|kalınlık|kalinlik|width|en)$/i],
  ['stock', /^(stok|stok ?adedi?|stok ?miktarı?|miktar|adet|adedi|mevcut|qty|quantity|stock|bakiye)$/i],
  ['unit', /^(birim|unit)$/i],
  ['price', /^(fiyat|peşin ?fiyatı?|pesin ?fiyati?|peşin|nakit ?fiyatı?|satış ?fiyatı?|satis ?fiyati?|birim ?fiyat|price|cash ?price|bayi ?fiyatı?|fiyat ?\(tl\))$/i],
  ['card_price', /^(kredi ?kartı? ?fiyatı?|kredi ?karti? ?fiyati?|k\.? ?kartı? ?fiyatı?|kk ?fiyatı?|kart ?fiyatı?|kart ?fiyati?|kartlı ?fiyat|taksitli ?fiyat|card ?price|credit ?card)$/i],
  ['list_price', /^(liste ?fiyatı?|liste ?fiyati?|list ?price|perakende)$/i],
  ['currency', /^(para ?birimi|döviz|doviz|currency|pb)$/i],
  ['min_order', /^(min(imum)? ?sipariş|min ?adet|koli ?içi|paket)$/i],
  ['shelf', /^(raf|raf ?no|raf ?kodu|lokasyon|konum|shelf)$/i],
  ['box', /^(durum|kutu ?durumu|kutu|ambalaj|paket ?durumu|packaging|box)$/i],
  ['barcode', /^(barkod|barcode|ean|gtin)$/i],
  ['image', /^(görsel|gorsel|resim|image|foto)$/i],
  ['description', /^(açıklama|aciklama|description|detay|not|notlar|açıklama ?2|uzun ?açıklama|ek ?bilgi)$/i],
  ['equivalents', /^(muadil|muadiller|eşdeğer|esdeger|karşılık|karsilik|equivalent|alternatif)$/i]
]

/** Secondary note columns that are folded into the description when a primary one is already mapped. */
const EXTRA_DESCRIPTION = /^(ek ?bilgi|not|notlar|açıklama ?2|ek ?açıklama|detay)$/i

/** Currency named in a price header ("FİYAT (€)", "USD FİYAT"). */
export function headerCurrency(h: string | undefined): Currency | null {
  const s = (h ?? '').toUpperCase()
  if (/€|EUR/.test(s)) return 'EUR'
  if (/\$|USD|DOLAR/.test(s)) return 'USD'
  if (/₺|\bTL\b|TRY/.test(s)) return 'TRY'
  return null
}

function cellCurrency(value: string): Currency | null {
  const s = value.toUpperCase()
  if (/€|\bEUR\b|\bEURO\b/.test(s)) return 'EUR'
  if (/\$|\bUSD\b|\bDOLAR\b/.test(s)) return 'USD'
  if (/₺|\bTL\b|\bTRY\b/.test(s)) return 'TRY'
  return null
}

export function inferCurrencyFromValues(values: string[]): Currency | null {
  const nonEmpty = values.map((value) => value.trim()).filter(Boolean)
  if (!nonEmpty.length) return null
  const counts = new Map<Currency, number>()
  for (const value of nonEmpty) {
    const currency = cellCurrency(value)
    if (currency) counts.set(currency, (counts.get(currency) ?? 0) + 1)
  }
  const [currency, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
  return currency && count * 5 >= nonEmpty.length * 4 ? currency : null
}

export function suggestMapping(headers: string[]): Partial<Record<Field, string>> {
  const map: Partial<Record<Field, string>> = {}
  const used = new Set<string>()
  for (const [field, re] of HEADER_HINTS) {
    if (map[field]) continue
    const h = headers.find((x) => !used.has(x) && re.test(headerKey(x).replace(/\s*\((tl|₺|€|eur|euro|usd|\$)\)$/, '')))
    if (h) {
      map[field] = h
      used.add(h)
    }
  }
  // Shop lists title the designation column "ÜRÜN ADI" with no separate code column: that column is the code.
  if (!map.sku && map.name) {
    map.sku = map.name
    delete map.name
  }
  return map
}

/**
 * "Kutu durumu" cells are free text ("KUTULU", "3 KUTULU 1 ORJ KAĞIT 1 KUTUSUZ"); the whole cell is kept as the
 * product's single packaging label, tidied with `canonBox` (line breaks collapsed, known spellings unified).
 */
export function parseBox(raw: string | undefined): string {
  return canonBox((raw ?? '').replace(/\s+/g, ' ').trim())
}

function parseFile(path: string): Parsed {
  const stat = statSync(path)
  if (stat.size > MAX_IMPORT_BYTES) {
    throw new Error('Dosya boyutu çok büyük (maksimum 50 MB).')
  }
  const ext = extname(path).toLowerCase()
  const filename = basename(path)
  let matrix: string[][]
  if (ext === '.csv' || ext === '.txt') {
    let text = readFileSync(path, 'utf8')
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
    const res = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy', delimitersToGuess: [';', ',', '\t', '|'] })
    matrix = res.data.map((r) => r.map((c) => String(c ?? '').trim()))
  } else {
    const file = readFileSync(path)
    const zipWorkbook = file[0] === 0x50 && file[1] === 0x4b && [0x03, 0x05, 0x07].includes(file[2])
    const compoundWorkbook = file.subarray(0, 8).equals(Buffer.from('D0CF11E0A1B11AE1', 'hex'))
    const xml = file.toString('utf8', 0, 512)
    const xmlWorkbook = ext === '.xls' && /^\uFEFF?\s*<\?xml\b/i.test(xml) && /<(?:\w+:)?Workbook(?:\s|>)/i.test(xml)
    if (!['.xlsx', '.xls'].includes(ext) || (ext === '.xlsx' ? !zipWorkbook : !compoundWorkbook && !xmlWorkbook)) {
      throw new Error(UNREADABLE_FILE_ERROR)
    }
    let wb: XLSX.WorkBook
    try {
      wb = XLSX.read(file, { type: 'buffer', cellDates: false })
    } catch {
      throw new Error(UNREADABLE_FILE_ERROR)
    }
    const sheets = wb.SheetNames.map((n) =>
      (XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' }) as unknown[][])
        .map((r) => r.map((c) => String(c ?? '').trim()))
        .filter((r) => r.some((c) => c !== ''))
    ).filter((m) => m.length)
    if (!sheets.length) throw new Error('Dosyada ürün satırı yok.')
    // The product table is the sheet whose header row names a code column (a summary sheet may come first);
    // further sheets with the same header row (one sheet per shelf/depot) are appended to it.
    const score = (m: string[][]): number => {
      const map = suggestMapping(m[0])
      return (map.sku ? 100 : 0) + Object.keys(map).length + Math.min(m.length, 50) / 100
    }
    let main = 0
    sheets.forEach((m, i) => {
      if (score(m) > score(sheets[main])) main = i
    })
    const headerOf = (m: string[][]): string => m[0].map(headerKey).join('|')
    matrix = [...sheets[main]]
    sheets.forEach((m, i) => {
      if (i !== main && headerOf(m) === headerOf(sheets[main])) matrix.push(...m.slice(1))
    })
  }
  matrix = matrix.filter((r) => r.some((c) => c !== ''))
  if (!matrix.length) throw new Error('Dosyada ürün satırı yok.')
  const width = Math.max(...matrix.map((r) => r.length))
  const headers = Array.from({ length: width }, (_, i) => matrix[0][i] || `Sütun ${i + 1}`)
  const rows = matrix.slice(1).map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ''))
  if (!headers.some((header) => header.trim())) throw new Error(UNREADABLE_FILE_ERROR)
  if (!rows.length) throw new Error('Dosyada ürün satırı yok.')
  return { filename, headers, rows }
}

export function previewFile(path: string): ImportPreview {
  const parsed = parseFile(path)
  const now = Date.now()
  for (const [k, v] of pending) {
    if (now - (v.createdAt ?? 0) > PREVIEW_TTL_MS) pending.delete(k)
  }
  while (pending.size >= MAX_PENDING_PREVIEWS) {
    const oldest = pending.keys().next().value
    if (oldest) pending.delete(oldest)
    else break
  }
  const token = randomUUID()
  pending.set(token, { ...parsed, createdAt: now })
  const suggestedMapping = suggestMapping(parsed.headers)
  const priceCurrencyHints = Object.fromEntries(parsed.headers.map((header, index) => [
    header,
    headerCurrency(header) ?? inferCurrencyFromValues(parsed.rows.map((row) => row[index] ?? ''))
  ]))
  return {
    filename: parsed.filename,
    headers: parsed.headers,
    rows: parsed.rows.slice(0, 15),
    totalRows: parsed.rows.length,
    suggestedMapping,
    suggestedCurrency: suggestedMapping.currency ? null : suggestedMapping.price ? priceCurrencyHints[suggestedMapping.price] ?? null : null,
    priceCurrencyHints,
    token
  }
}

export function parseNumber(v: string | undefined): number | null {
  if (v == null) return null
  let s = String(v).trim().replace(/[^\d.,-]/g, '')
  if (!s) return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (lastComma > -1) {
    const dec = s.length - lastComma - 1
    s = dec === 3 && s.split(',').length === 2 && !/^0/.test(s) ? s.replace(',', '') : s.replace(',', '.')
  } else if (lastDot > -1) {
    const parts = s.split('.')
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3 && parts[0] !== '0')) {
      s = parts.join('')
    }
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function parseCurrency(v: string | undefined, fallback: Currency): Currency {
  const s = (v ?? '').toUpperCase()
  if (/USD|\$|DOLAR/.test(s)) return 'USD'
  if (/EUR|€|EURO/.test(s)) return 'EUR'
  if (/TRY|TL|₺/.test(s)) return 'TRY'
  return fallback
}

type LocalRow = Omit<ProductInsert, 'active' | 'deleted' | 'locations'> & { id: number; active: number; locations: string | ProductLocation[] }

const BATCH = 500

function locationBox(raw: string): string {
  const parts = boxParts(raw)
  if (!parts) return canonBox(raw)
  const merged = new Map<string, { count: number | null; state: string; index: number }>()
  for (const part of parts) {
    const key = normalize(part.state)
    const previous = merged.get(key)
    if (previous) previous.count = previous.count === null && part.count === null ? null : (previous.count ?? 0) + (part.count ?? 0)
    else merged.set(key, { ...part, index: merged.size })
  }
  return [...merged.values()]
    .sort((a, b) => (a.state === 'Kutulu' ? 0 : a.state === 'Kutusuz' ? 1 : 2) - (b.state === 'Kutulu' ? 0 : b.state === 'Kutusuz' ? 1 : 2) || a.index - b.index)
    .map(({ count, state }) => `${count === null ? '' : `${count} `}${state}`)
    .join(' ')
}

function mergeLocations(current: ProductLocation[], incoming: ProductLocation[]): ProductLocation[] {
  const result = [...current]
  for (const location of incoming) {
    const existing = result.find((item) =>
      normalize(item.shelf) === normalize(location.shelf) &&
      normalize(boxIdentity(item.box)) === normalize(boxIdentity(location.box))
    )
    if (existing) {
      existing.qty += location.qty
      existing.box = locationBox(`${existing.box} ${location.box}`)
    } else result.push({ ...location })
  }
  return result
}

function joinedShelves(locations: ProductLocation[]): string {
  const seen = new Set<string>()
  return locations.map((location) => location.shelf.trim()).filter((shelf) => {
    const key = normalize(shelf)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  }).join(' / ')
}

function editDistanceOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else { i++; j++ }
  }
  if (i < a.length || j < b.length) edits++
  return edits === 1
}

export async function runImport(opts: ImportOptions, testDeps: { pullProducts?: typeof pullProducts; cloud?: typeof cloud } = {}): Promise<ImportResult> {
  const parsed = pending.get(opts.token)
  if (!parsed) throw new Error('İçe aktarma oturumu bulunamadı, dosyayı yeniden seçin.')
  if (!parsed.rows.length) throw new Error('Dosya okunamadı. Lütfen Excel (.xlsx) ya da CSV dosyası seçin.')
  if (opts.mode === 'replace' && !opts.dryRun && parsed.rows.length === 0) throw new Error('Değiştirilecek ürün satırı bulunamadı.')
  const idx = (f: Field): number => {
    const h = opts.mapping[f]
    return h ? parsed.headers.indexOf(h) : -1
  }
  const col = (row: string[], f: Field): string | undefined => {
    const i = idx(f)
    return i >= 0 ? row[i] : undefined
  }
  if (idx('sku') < 0) throw new Error('"Stok Kodu" sütunu eşlenmeli.')

  const fileBrandCounts = brandCountsFromRows(parsed.rows, idx('sku'), idx('brand'), opts.defaultBrand)
  const spellings = brandSpellings(fileBrandCounts, opts.mode !== 'replace')
  await (testDeps.pullProducts ?? pullProducts)()
  const db = getDb()
  const existing = new Map<string, LocalRow>()
  const bySku = new Map<string, LocalRow[]>()
  for (const r of db.prepare('SELECT * FROM products').all() as LocalRow[]) {
    existing.set(productKey(r.sku, resolveBrand(r.brand, spellings), r.box), r)
    bySku.set(r.sku_norm, [...(bySku.get(r.sku_norm) ?? []), r])
  }
  const has = (f: Field): boolean => idx(f) >= 0
  const mappedHeaders = new Set(Object.values(opts.mapping).filter((h): h is string => !!h))
  const extraDescIdx = parsed.headers
    .map((h, i) => (!mappedHeaders.has(h) && EXTRA_DESCRIPTION.test(headerKey(h)) ? i : -1))
    .filter((i) => i >= 0)
  const descriptionOf = (row: string[]): string =>
    [col(row, 'description') ?? '', ...extraDescIdx.map((i) => row[i] ?? '')].map((s) => s.trim()).filter(Boolean).join(' · ')

  // Products matched by a looser rule than the full key take the file's brand/box: their row is re-keyed in place.
  const claimed = new Set<number>()
  // Without brand/box columns in the file a code that exists as exactly one item still refers to that item; a
  // catalogue item with no packaging yet is the same product as the file's single "Kutulu"/"Kutusuz" line for it.
  const lookup = (key: string, sku_norm: string, brand: string): LocalRow | undefined => {
    const hit = existing.get(key)
    if (hit) return hit
    const variants = bySku.get(sku_norm)
    if (!variants?.length) return undefined
    if (!has('brand') && !has('box')) return variants.length === 1 ? variants[0] : undefined
    const free = variants.filter((v) => !claimed.has(v.id) && !v.box && (!has('brand') || normalize(resolveBrand(v.brand, spellings)) === normalize(brand)))
    if (free.length !== 1) return undefined
    claimed.add(free[0].id)
    return free[0]
  }

  const errors: string[] = []
  const warnings: string[] = []
  let inserted = 0
  let updated = 0
  let unchanged = 0
  let deactivated = 0
  const seen = new Set<string>()
  const batch: ProductInsert[] = []
  const rekeyed: ProductInsert[] = []
  const inBatch = new Map<string, ProductInsert>()
  // The same product listed twice in one file (two shelves, two lines) is one product: quantities add up.
  const fold = (rec: ProductInsert): boolean => {
    const prev = inBatch.get(rec.key_norm)
    if (!prev) {
      inBatch.set(rec.key_norm, rec)
      batch.push(rec)
      return false
    }
    prev.stock += rec.stock
    prev.locations = mergeLocations(parseProductLocations(prev.locations), parseProductLocations(rec.locations))
    prev.shelf = joinedShelves(prev.locations) || prev.shelf
    const locationBoxes = prev.locations.map((location) => location.box).filter(Boolean)
    if (locationBoxes.length) prev.box = canonBox(locationBoxes.join(' '))
    if (rec.description && !prev.description) prev.description = rec.description
    if (rec.price && !prev.price) prev.price = rec.price
    return true
  }
  let lastShelf = ''
  const fromLocal = (ex: LocalRow): ProductInsert => ({
    sku: ex.sku,
    sku_norm: ex.sku_norm,
    key_norm: productKey(ex.sku, resolveBrand(ex.brand, spellings), ex.box),
    name: ex.name,
    name_norm: ex.name_norm,
    brand: resolveBrand(ex.brand, spellings),
    category: ex.category,
    type: ex.type,
    seal: ex.seal,
    d_inner: ex.d_inner,
    d_outer: ex.d_outer,
    width: ex.width,
    stock: ex.stock,
    unit: ex.unit,
    price: ex.price,
    currency: ex.currency,
    list_price: ex.list_price,
    card_price: ex.card_price,
    min_order: ex.min_order,
    shelf: ex.shelf,
    locations: parseProductLocations(ex.locations),
    box: ex.box,
    barcode: ex.barcode,
    image: ex.image,
    description: ex.description,
    equivalents: ex.equivalents,
    active: true,
    deleted: false
  })

  interface Line {
    i: number
    skuRaw: string
    sku_norm: string
    brand: string
    box: string
    rawBox: string
    locationBox: string
    shelf: string
    stockVal: number | null
  }
  const lines: Line[] = []
  parsed.rows.forEach((row, i) => {
    // A row carrying only a shelf name is a section header: the shelf applies to the rows below it.
    const shelfCell = (col(row, 'shelf') ?? '').trim()
    if (shelfCell) lastShelf = shelfCell
    const skuRaw = (col(row, 'sku') ?? '').trim()
    if (!skuRaw) return
    const sku_norm = normalize(skuRaw)
    if (!sku_norm) return
    const brand = resolveBrand((col(row, 'brand') ?? '') || opts.defaultBrand, spellings)
    const stockRaw = (col(row, 'stock') ?? '').trim()
    const stockVal = parseNumber(stockRaw)
    if (stockRaw && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(stockRaw)) {
      errors.push(`Satır ${i + 2}: ${skuRaw} adet hücresi "${stockRaw}" sayı değil, ${stockVal ?? 'mevcut/0'} alındı.`)
    }
    const boxRaw = col(row, 'box') ?? ''
    lines.push({ i, skuRaw, sku_norm, brand, box: parseBox(boxRaw), rawBox: boxRaw, locationBox: locationBox(boxRaw), shelf: has('shelf') ? shelfCell || lastShelf : '', stockVal })
  })

  const bySkuBrand = new Map<string, Line[]>()
  const boxWarnings: string[] = []
  const emptyStateWarnings: string[] = []
  const similarBrandWarnings: string[] = []
  for (const line of lines) {
    const key = `${line.sku_norm}|${normalize(line.brand)}`
    bySkuBrand.set(key, [...(bySkuBrand.get(key) ?? []), line])
    const parts = boxParts(parsed.rows[line.i] ? col(parsed.rows[line.i], 'box') ?? '' : '')
    const hasPackagingState = line.rawBox.split(/[^A-Za-zÇĞİÖŞÜçğıöşü0-9]+/).some((word) => PACKAGING_STATE_WORDS.has(normalize(word)))
    if (line.stockVal !== null && parts?.length && parts.every((part) => part.count !== null) && hasPackagingState) {
      const total = parts.reduce((sum, part) => sum + (part.count ?? 0), 0)
      if (total !== line.stockVal) boxWarnings.push(`Satır ${line.i + 2}: ${line.skuRaw} · ${line.brand || 'markasız'} — kutu durumu "${line.rawBox}" toplamı ${total}, ADET ${line.stockVal}.`)
    }
  }
  for (const grouped of bySkuBrand.values()) {
    const labelled = grouped.filter((line) => line.box)
    if (!labelled.length) continue
    for (const empty of grouped.filter((line) => !line.box)) {
      const labels = [...new Set(labelled.map((line) => line.box))]
      const refs = [...new Set(labelled.map((line) => line.i + 2))]
      emptyStateWarnings.push(`Satır ${empty.i + 2}: ${empty.skuRaw} · ${empty.brand || 'markasız'} — kutu durumu boş; aynı ürünün "${labels.join(' / ')}" satırı da var (${refs.map((row) => `Satır ${row}`).join(', ')}). Ayrı ürün olarak kaydedilecek.`)
    }
  }
  const brandCounts = new Map<string, { label: string; count: number }>()
  for (const line of lines) if (line.brand) {
    const key = normalize(line.brand)
    const entry = brandCounts.get(key)
    if (entry) entry.count++
    else brandCounts.set(key, { label: line.brand, count: 1 })
  }
  const brands = [...brandCounts.entries()].filter(([key]) => key.length >= 5)
  for (let i = 0; i < brands.length && similarBrandWarnings.length < 50; i++) {
    for (let j = i + 1; j < brands.length && similarBrandWarnings.length < 50; j++) {
      const [aKey, a] = brands[i]
      const [bKey, b] = brands[j]
      if (!editDistanceOne(aKey, bKey)) continue
      const aOrigin = brandOrigin(a.label)
      const bOrigin = brandOrigin(b.label)
      if (normalize(aOrigin.base) === normalize(bOrigin.base) && (aOrigin.origin || bOrigin.origin)) continue
      similarBrandWarnings.push(`Benzer markalar: "${a.label}" (${a.count} satır) ve "${b.label}" (${b.count} satır). Aynıysa Ayarlar › Marka eşleştirme'den birleştirin.`)
    }
  }
  warnings.push(...boxWarnings, ...emptyStateWarnings, ...similarBrandWarnings)

  for (const line of lines) {
    const { i, skuRaw, sku_norm, brand, box, locationBox: boxForShelf, shelf, stockVal } = line
    const row = parsed.rows[i]
    const ex = lookup(productKey(skuRaw, brand, box), sku_norm, brand)
    const key_norm = productKey(skuRaw, brand, box)
    const repeat = seen.has(key_norm)
    seen.add(key_norm)

    const priceVal = parseNumber(col(row, 'price'))
    const cardVal = parseNumber(col(row, 'card_price'))

    if (opts.mode === 'stock_only') {
      if (!ex) {
        errors.push(`Satır ${i + 2}: ${skuRaw} bulunamadı (yalnızca stok modu).`)
        continue
      }
      if (repeat) {
        const prev = inBatch.get(key_norm)
        if (prev) {
          prev.stock += stockVal ?? 0
          const location = { shelf: has('shelf') ? shelf || ex.shelf : ex.shelf, qty: stockVal ?? 0, box: has('box') ? boxForShelf : ex.box }
          prev.locations = mergeLocations(prev.locations, [location])
          prev.shelf = joinedShelves(prev.locations) || prev.shelf
          prev.box = canonBox(prev.locations.map((item) => item.box).filter(Boolean).join(' ')) || prev.box
        }
        else {
          const location = { shelf: has('shelf') ? shelf || ex.shelf : ex.shelf, qty: stockVal ?? 0, box: has('box') ? boxForShelf : ex.box }
          fold({ ...fromLocal(ex), stock: ex.stock + (stockVal ?? 0), shelf: location.shelf, locations: [location] })
          updated++
        }
        continue
      }
      const newStock = stockVal ?? ex.stock
      const location = { shelf: has('shelf') ? shelf || ex.shelf : ex.shelf, qty: stockVal ?? 0, box: has('box') ? boxForShelf : ex.box }
      if (newStock === ex.stock && (priceVal == null || priceVal === ex.price) && (cardVal == null || cardVal === ex.card_price) && normalize(location.shelf) === normalize(ex.shelf) && ex.active) {
        unchanged++
        continue
      }
      fold({ ...fromLocal(ex), stock: newStock, shelf: location.shelf, locations: [location], price: priceVal ?? ex.price, card_price: cardVal ?? ex.card_price })
      updated++
      continue
    }

    const name = (col(row, 'name') ?? '').trim() || ex?.name || skuRaw
    const record: ProductInsert = {
      sku: skuRaw,
      sku_norm,
      key_norm,
      name,
      name_norm: normalizeText(name),
      brand,
      category: (col(row, 'category') ?? '').trim() || opts.defaultCategory,
      type: (col(row, 'type') ?? '').trim(),
      seal: (col(row, 'seal') ?? '').trim().toUpperCase(),
      d_inner: parseNumber(col(row, 'd_inner')),
      d_outer: parseNumber(col(row, 'd_outer')),
      width: parseNumber(col(row, 'width')),
      stock: stockVal ?? ex?.stock ?? 0,
      unit: (col(row, 'unit') ?? '').trim() || 'Adet',
      price: priceVal ?? ex?.price ?? 0,
      currency: priceVal == null && ex && !has('currency') ? ex.currency : parseCurrency(col(row, 'currency'), opts.defaultCurrency),
      list_price: parseNumber(col(row, 'list_price')),
      card_price: cardVal,
      min_order: parseNumber(col(row, 'min_order')) ?? 1,
      shelf: line.shelf,
      locations: [{ shelf: line.shelf, qty: stockVal ?? 0, box: boxForShelf }],
      box,
      barcode: (col(row, 'barcode') ?? '').trim(),
      image: (col(row, 'image') ?? '').trim(),
      description: descriptionOf(row),
      equivalents: (col(row, 'equivalents') ?? '').trim(),
      active: true,
      deleted: false
    }

    if (ex) {
      // Columns that were not mapped in the file keep their current values.
      const out: ProductInsert = {
        ...fromLocal(ex),
        sku: record.sku,
        name: record.name,
        name_norm: record.name_norm,
        stock: record.stock,
        price: record.price,
        currency: record.currency,
        ...(has('brand') ? { brand: record.brand } : {}),
        ...(has('category') ? { category: record.category } : {}),
        ...(has('type') ? { type: record.type } : {}),
        ...(has('seal') ? { seal: record.seal } : {}),
        ...(has('d_inner') ? { d_inner: record.d_inner } : {}),
        ...(has('d_outer') ? { d_outer: record.d_outer } : {}),
        ...(has('width') ? { width: record.width } : {}),
        ...(has('unit') ? { unit: record.unit } : {}),
        ...(has('list_price') ? { list_price: record.list_price } : {}),
        ...(has('card_price') ? { card_price: record.card_price } : {}),
        ...(has('min_order') ? { min_order: record.min_order } : {}),
        ...(has('shelf') ? { shelf: record.shelf } : {}),
        ...(has('shelf') ? { locations: record.locations } : {}),
        ...(has('box') ? { box: record.box } : {}),
        ...(has('barcode') ? { barcode: record.barcode } : {}),
        ...(has('image') ? { image: record.image } : {}),
        ...(has('description') ? { description: record.description } : {}),
        ...(has('equivalents') ? { equivalents: record.equivalents } : {})
      }
      out.key_norm = productKey(out.sku, out.brand, out.box)
      seen.add(out.key_norm)
      if (out.key_norm !== ex.key_norm) {
        // Brand/box changed: update the same cloud row instead of inserting a sibling under the new key.
        const other = existing.get(out.key_norm)
        if (other && other.id !== ex.id) {
          errors.push(`Satır ${i + 2}: ${skuRaw} (${out.brand} / ${out.box}) zaten ayrı bir ürün olarak kayıtlı, satır atlandı.`)
          continue
        }
        const rec: ProductInsert = { ...out, id: ex.id }
        rekeyed.push(rec)
        inBatch.set(rec.key_norm, rec)
        existing.set(rec.key_norm, { ...ex, key_norm: rec.key_norm, brand: rec.brand, box: rec.box })
        updated++
        continue
      }
      if (fold(out)) continue
      if (ex.stock === out.stock && ex.price === out.price && ex.name === out.name && ex.active) unchanged++
      else updated++
    } else {
      if (fold(record)) continue
      inserted++
    }
  }

  if (opts.dryRun) {
    const plannedProducts = [...rekeyed, ...batch]
    const variantGroups = new Map<string, ProductInsert[]>()
    for (const product of plannedProducts) {
      const key = `${product.sku_norm}|${normalize(product.brand)}`
      variantGroups.set(key, [...(variantGroups.get(key) ?? []), product])
    }
    const variantsWithDifferentShelves = [...variantGroups.values()]
      .filter((products) => new Set(products.map((product) => boxIdentity(product.box))).size > 1 &&
        new Set(products.flatMap((product) => product.locations.map((location) => normalize(location.shelf))).filter(Boolean)).size > 1)
      .reduce((total, products) => total + products.length, 0)
    return {
      id: 0,
      filename: parsed.filename,
      inserted,
      updated,
      unchanged,
      deactivated: 0,
      mode: opts.mode,
      created_at: new Date().toISOString(),
      errors: errors.slice(0, 200),
      warnings,
      dryRunSummary: {
        products: inserted + updated + unchanged,
        multiLocationProducts: plannedProducts.filter((product) => product.locations.length > 1).length,
        variantsWithDifferentShelves,
        warningsByType: {
          boxCountMismatch: boxWarnings.length,
          missingBoxState: emptyStateWarnings.length,
          similarBrands: similarBrandWarnings.length
        }
      }
    }
  }
  const sb = (testDeps.cloud ?? cloud)()
  if (opts.mode === 'replace') {
    if (batch.length + rekeyed.length === 0) {
      throw new Error('Dosyada içe aktarılacak geçerli stok kodlu ürün bulunamadı. Mevcut katalog korunarak işlem iptal edildi.')
    }
    const ids: number[] = []
    try {
      for (let i = 0; i < rekeyed.length; i += BATCH) {
        const rows = must(await sb.from('products').upsert(rekeyed.slice(i, i + BATCH), { onConflict: 'id' }).select('id'))
        ids.push(...rows.map((row) => row.id))
      }
      for (let i = 0; i < batch.length; i += BATCH) {
        const rows = must(await sb.from('products').upsert(batch.slice(i, i + BATCH), { onConflict: 'key_norm' }).select('id'))
        ids.push(...rows.map((row) => row.id))
      }
    } catch (error) {
      const failure = new Error('Yükleme yarıda kesildi; eski katalog silinmedi. Tekrar deneyin.')
      failure.name = error instanceof Error ? error.name : 'Error'
      Object.defineProperty(failure, 'cause', { value: error })
      throw failure
    }
    must(await sb.rpc('purge_products_except', { p_keep: [...new Set(ids)] }))
    await (testDeps.pullProducts ?? pullProducts)(true)
  } else {
    for (let i = 0; i < rekeyed.length; i += BATCH) {
      mustVoid(await sb.from('products').upsert(rekeyed.slice(i, i + BATCH), { onConflict: 'id' }))
    }
    for (let i = 0; i < batch.length; i += BATCH) {
      mustVoid(await sb.from('products').upsert(batch.slice(i, i + BATCH), { onConflict: 'key_norm' }))
    }
  }
  if (opts.deactivateMissing && opts.mode !== 'replace') {
    deactivated = must(await sb.rpc('deactivate_products_not_in', { p_norms: [...seen] }))
  }
  const log = must(
    await sb
      .from('import_logs')
      .insert({ filename: parsed.filename, inserted, updated, unchanged, deactivated, mode: opts.mode })
      .select('*')
      .single()
  )
  pending.delete(opts.token)
  if (opts.mode !== 'replace') await (testDeps.pullProducts ?? pullProducts)()
  return { ...log, errors: errors.slice(0, 200), warnings }
}

export async function importLogs(): Promise<ImportLog[]> {
  return must(await cloud().from('import_logs').select('*').order('id', { ascending: false }).limit(50))
}

/** Same column order as the shop's own stock sheets and the quick-entry grid. */
export const TEMPLATE_HEADERS = ['RAF', 'ÜRÜN ADI', 'MARKA', 'ADET', 'KUTU DURUMU', 'FİYAT', 'AÇIKLAMA']
