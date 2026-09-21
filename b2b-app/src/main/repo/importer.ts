import type { Currency, ImportLog, ImportOptions, ImportPreview, ImportResult, ProductInput } from '@shared/types'
import { readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { cloud, must, mustVoid } from '../cloud/client'
import type { ProductInsert } from '../cloud/database.types'
import { pullProducts } from '../cloud/sync'
import { canonBox } from '@shared/identity'
import { getDb, normalize, normalizeText, productKey } from '../db'
import { brandSpellings, resolveBrand } from './products'

interface Parsed {
  filename: string
  headers: string[]
  rows: string[][]
}

const pending = new Map<string, Parsed>()

type Field = keyof ProductInput

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
  ['box', /^(kutu ?durumu|kutu|ambalaj|paket ?durumu|packaging|box)$/i],
  ['barcode', /^(barkod|barcode|ean|gtin)$/i],
  ['image', /^(görsel|gorsel|resim|image|foto)$/i],
  ['description', /^(açıklama|aciklama|description|detay|not|notlar|açıklama ?2|uzun ?açıklama|durum)$/i],
  ['equivalents', /^(muadil|muadiller|eşdeğer|esdeger|karşılık|karsilik|equivalent|alternatif)$/i]
]

export function suggestMapping(headers: string[]): Partial<Record<Field, string>> {
  const map: Partial<Record<Field, string>> = {}
  const used = new Set<string>()
  for (const [field, re] of HEADER_HINTS) {
    if (map[field]) continue
    const h = headers.find((x) => !used.has(x) && re.test(headerKey(x)))
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
  const ext = extname(path).toLowerCase()
  const filename = basename(path)
  let matrix: string[][]
  if (ext === '.csv' || ext === '.txt') {
    let text = readFileSync(path, 'utf8')
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
    const res = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy', delimitersToGuess: [';', ',', '\t', '|'] })
    matrix = res.data.map((r) => r.map((c) => String(c ?? '').trim()))
  } else {
    const wb = XLSX.read(readFileSync(path), { type: 'buffer', cellDates: false })
    const sheets = wb.SheetNames.map((n) =>
      (XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' }) as unknown[][])
        .map((r) => r.map((c) => String(c ?? '').trim()))
        .filter((r) => r.some((c) => c !== ''))
    ).filter((m) => m.length)
    if (!sheets.length) throw new Error('Dosya boş görünüyor.')
    // Further sheets with the same header row (one sheet per shelf/depot) are appended to the first one.
    const headerOf = (m: string[][]): string => m[0].map(headerKey).join('|')
    matrix = [...sheets[0]]
    for (const m of sheets.slice(1)) if (headerOf(m) === headerOf(sheets[0])) matrix.push(...m.slice(1))
  }
  matrix = matrix.filter((r) => r.some((c) => c !== ''))
  if (!matrix.length) throw new Error('Dosya boş görünüyor.')
  const width = Math.max(...matrix.map((r) => r.length))
  const headers = Array.from({ length: width }, (_, i) => matrix[0][i] || `Sütun ${i + 1}`)
  return { filename, headers, rows: matrix.slice(1).map((r) => Array.from({ length: width }, (_, i) => r[i] ?? '')) }
}

export function previewFile(path: string): ImportPreview {
  const parsed = parseFile(path)
  const token = randomUUID()
  pending.set(token, parsed)
  return {
    filename: parsed.filename,
    headers: parsed.headers,
    rows: parsed.rows.slice(0, 15),
    totalRows: parsed.rows.length,
    suggestedMapping: suggestMapping(parsed.headers),
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

type LocalRow = Omit<ProductInsert, 'active' | 'deleted'> & { id: number; active: number }

const BATCH = 500

export async function runImport(opts: ImportOptions): Promise<ImportResult> {
  const parsed = pending.get(opts.token)
  if (!parsed) throw new Error('İçe aktarma oturumu bulunamadı, dosyayı yeniden seçin.')
  const idx = (f: Field): number => {
    const h = opts.mapping[f]
    return h ? parsed.headers.indexOf(h) : -1
  }
  const col = (row: string[], f: Field): string | undefined => {
    const i = idx(f)
    return i >= 0 ? row[i] : undefined
  }
  if (idx('sku') < 0) throw new Error('"Stok Kodu" sütunu eşlenmeli.')

  await pullProducts()
  const db = getDb()
  const existing = new Map<string, LocalRow>()
  const bySku = new Map<string, LocalRow[]>()
  for (const r of db.prepare('SELECT * FROM products').all() as LocalRow[]) {
    existing.set(r.key_norm, r)
    bySku.set(r.sku_norm, [...(bySku.get(r.sku_norm) ?? []), r])
  }
  const has = (f: Field): boolean => idx(f) >= 0
  // Without brand/box columns in the file a code that exists as exactly one item still refers to that item.
  const lookup = (key: string, sku_norm: string): LocalRow | undefined => {
    const hit = existing.get(key)
    if (hit || has('brand') || has('box')) return hit
    const variants = bySku.get(sku_norm)
    return variants?.length === 1 ? variants[0] : undefined
  }

  const errors: string[] = []
  let inserted = 0
  let updated = 0
  let unchanged = 0
  let deactivated = 0
  const seen = new Set<string>()
  const batch: ProductInsert[] = []
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
    if (rec.shelf && prev.shelf && normalize(rec.shelf) !== normalize(prev.shelf)) prev.shelf = `${prev.shelf} / ${rec.shelf}`
    else if (rec.shelf && !prev.shelf) prev.shelf = rec.shelf
    if (rec.description && !prev.description) prev.description = rec.description
    if (rec.price && !prev.price) prev.price = rec.price
    return true
  }
  let lastShelf = ''
  const spellings = brandSpellings()

  const fromLocal = (ex: LocalRow): ProductInsert => ({
    sku: ex.sku,
    sku_norm: ex.sku_norm,
    key_norm: ex.key_norm,
    name: ex.name,
    name_norm: ex.name_norm,
    brand: ex.brand,
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
    const stockVal = parseNumber(col(row, 'stock'))
    lines.push({ i, skuRaw, sku_norm, brand, box: parseBox(col(row, 'box')), shelf: has('shelf') ? shelfCell || lastShelf : '', stockVal })
  })

  for (const line of lines) {
    const { i, skuRaw, sku_norm, brand, box, stockVal } = line
    const row = parsed.rows[i]
    const ex = opts.mode === 'replace' ? undefined : lookup(productKey(skuRaw, brand, box), sku_norm)
    const key_norm = ex ? ex.key_norm : productKey(skuRaw, brand, box)
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
        if (prev) prev.stock += stockVal ?? 0
        else {
          fold({ ...fromLocal(ex), stock: ex.stock + (stockVal ?? 0) })
          updated++
        }
        continue
      }
      const newStock = stockVal ?? ex.stock
      if (newStock === ex.stock && (priceVal == null || priceVal === ex.price) && cardVal == null && ex.active) {
        unchanged++
        continue
      }
      fold({ ...fromLocal(ex), stock: newStock, price: priceVal ?? ex.price, card_price: cardVal ?? ex.card_price })
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
      stock: stockVal ?? 0,
      unit: (col(row, 'unit') ?? '').trim() || 'Adet',
      price: priceVal ?? 0,
      currency: parseCurrency(col(row, 'currency'), opts.defaultCurrency),
      list_price: parseNumber(col(row, 'list_price')),
      card_price: cardVal,
      min_order: parseNumber(col(row, 'min_order')) ?? 1,
      shelf: line.shelf,
      box,
      barcode: (col(row, 'barcode') ?? '').trim(),
      image: (col(row, 'image') ?? '').trim(),
      description: (col(row, 'description') ?? '').trim(),
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
        ...(has('box') ? { box: record.box } : {}),
        ...(has('barcode') ? { barcode: record.barcode } : {}),
        ...(has('image') ? { image: record.image } : {}),
        ...(has('description') ? { description: record.description } : {}),
        ...(has('equivalents') ? { equivalents: record.equivalents } : {})
      }
      out.key_norm = productKey(out.sku, out.brand, out.box)
      seen.add(out.key_norm)
      if (fold(out)) continue
      if (ex.stock === out.stock && ex.price === out.price && ex.name === out.name && ex.active) unchanged++
      else updated++
    } else {
      if (fold(record)) continue
      inserted++
    }
  }

  const sb = cloud()
  if (opts.mode === 'replace') mustVoid(await sb.rpc('soft_delete_all_products'))
  for (let i = 0; i < batch.length; i += BATCH) {
    mustVoid(await sb.from('products').upsert(batch.slice(i, i + BATCH), { onConflict: 'key_norm' }))
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
  await pullProducts(opts.mode === 'replace')
  return { ...log, errors: errors.slice(0, 200) }
}

export async function importLogs(): Promise<ImportLog[]> {
  return must(await cloud().from('import_logs').select('*').order('id', { ascending: false }).limit(50))
}

/** Same column order as the shop's own stock sheets and the quick-entry grid. */
export const TEMPLATE_HEADERS = ['RAF', 'ÜRÜN ADI', 'MARKA', 'ADET', 'KUTU DURUMU', 'FİYAT', 'AÇIKLAMA']
