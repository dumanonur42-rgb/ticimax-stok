import type { Currency, ImportLog, ImportOptions, ImportPreview, ImportResult, ProductInput } from '@shared/types'
import { readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { getDb, normalize, normalizeText } from '../db'

interface Parsed {
  filename: string
  headers: string[]
  rows: string[][]
}

const pending = new Map<string, Parsed>()

type Field = keyof ProductInput

const HEADER_HINTS: [Field, RegExp][] = [
  ['sku', /^(stok ?kodu?|ürün ?kodu?|urun ?kodu?|kod|sku|malzeme ?kodu?|parça ?no|code|no)$/i],
  ['name', /^(ürün ?adı?|urun ?adi?|ad|isim|açıklama|aciklama|ürün|malzeme|name|description|tanım|tanim)$/i],
  ['brand', /^(marka|brand|üretici|uretici)$/i],
  ['category', /^(kategori|grup|ürün ?grubu|kategori ?yolu|category)$/i],
  ['type', /^(tip|tür|tur|rulman ?tipi|type|cins)$/i],
  ['seal', /^(keçe|kece|kapak|seal|kapak ?tipi)$/i],
  ['d_inner', /^(iç ?çap|ic ?cap|d|d ?\(mm\)|inner|delik|mil ?çapı)$/i],
  ['d_outer', /^(dış ?çap|dis ?cap|D|D ?\(mm\)|outer)$/i],
  ['width', /^(genişlik|genislik|b|b ?\(mm\)|kalınlık|kalinlik|width|en)$/i],
  ['stock', /^(stok|stok ?adedi?|stok ?miktarı?|miktar|adet|mevcut|qty|quantity|stock|bakiye)$/i],
  ['unit', /^(birim|unit)$/i],
  ['price', /^(fiyat|peşin ?fiyatı?|pesin ?fiyati?|peşin|nakit ?fiyatı?|satış ?fiyatı?|satis ?fiyati?|birim ?fiyat|price|cash ?price|bayi ?fiyatı?|fiyat ?\(tl\))$/i],
  ['card_price', /^(kredi ?kartı? ?fiyatı?|kredi ?karti? ?fiyati?|k\.? ?kartı? ?fiyatı?|kk ?fiyatı?|kart ?fiyatı?|kart ?fiyati?|kartlı ?fiyat|taksitli ?fiyat|card ?price|credit ?card)$/i],
  ['list_price', /^(liste ?fiyatı?|liste ?fiyati?|list ?price|perakende)$/i],
  ['currency', /^(para ?birimi|döviz|doviz|currency|pb)$/i],
  ['min_order', /^(min(imum)? ?sipariş|min ?adet|koli ?içi|paket)$/i],
  ['shelf', /^(raf|raf ?no|raf ?kodu|lokasyon|konum|shelf)$/i],
  ['barcode', /^(barkod|barcode|ean|gtin)$/i],
  ['image', /^(görsel|gorsel|resim|image|foto)$/i],
  ['description', /^(detay|not|notlar|açıklama ?2|uzun ?açıklama)$/i],
  ['equivalents', /^(muadil|muadiller|eşdeğer|esdeger|karşılık|karsilik|equivalent|alternatif)$/i]
]

export function suggestMapping(headers: string[]): Partial<Record<Field, string>> {
  const map: Partial<Record<Field, string>> = {}
  const used = new Set<string>()
  for (const [field, re] of HEADER_HINTS) {
    if (map[field]) continue
    const h = headers.find((x) => !used.has(x) && re.test(x.trim()))
    if (h) {
      map[field] = h
      used.add(h)
    }
  }
  return map
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
    const ws = wb.Sheets[wb.SheetNames[0]]
    matrix = (XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as unknown[][]).map((r) =>
      r.map((c) => String(c ?? '').trim())
    )
  }
  matrix = matrix.filter((r) => r.some((c) => c !== ''))
  if (!matrix.length) throw new Error('Dosya boş görünüyor.')
  const headers = matrix[0].map((h, i) => h || `Sütun ${i + 1}`)
  return { filename, headers, rows: matrix.slice(1) }
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

export function runImport(opts: ImportOptions): ImportResult {
  const parsed = pending.get(opts.token)
  if (!parsed) throw new Error('İçe aktarma oturumu bulunamadı, dosyayı yeniden seçin.')
  const db = getDb()
  const idx = (f: Field): number => {
    const h = opts.mapping[f]
    return h ? parsed.headers.indexOf(h) : -1
  }
  const col = (row: string[], f: Field): string | undefined => {
    const i = idx(f)
    return i >= 0 ? row[i] : undefined
  }
  if (idx('sku') < 0) throw new Error('"Stok Kodu" sütunu eşlenmeli.')

  const errors: string[] = []
  let inserted = 0
  let updated = 0
  let unchanged = 0
  let deactivated = 0

  const existing = new Map<string, { id: number; stock: number; price: number; name: string }>()
  for (const r of db.prepare('SELECT id, sku_norm, stock, price, name FROM products').all() as {
    id: number
    sku_norm: string
    stock: number
    price: number
    name: string
  }[]) {
    existing.set(r.sku_norm, r)
  }

  const insertStmt = db.prepare(
    `INSERT INTO products(sku, sku_norm, name, name_norm, brand, category, type, seal, d_inner, d_outer, width, stock, unit,
     price, currency, list_price, card_price, min_order, shelf, barcode, image, description, equivalents, active)
     VALUES (@sku,@sku_norm,@name,@name_norm,@brand,@category,@type,@seal,@d_inner,@d_outer,@width,@stock,@unit,@price,
     @currency,@list_price,@card_price,@min_order,@shelf,@barcode,@image,@description,@equivalents,1)`
  )
  const stockOnlyStmt = db.prepare(
    `UPDATE products SET stock=@stock, price=COALESCE(@price, price), card_price=COALESCE(@card_price, card_price), active=1, updated_at=datetime('now','localtime') WHERE id=@id`
  )

  const seen = new Set<string>()

  const tx = db.transaction(() => {
    if (opts.mode === 'replace') {
      db.exec('DELETE FROM products')
      existing.clear()
    }
    parsed.rows.forEach((row, i) => {
      const skuRaw = (col(row, 'sku') ?? '').trim()
      if (!skuRaw) return
      const sku_norm = normalize(skuRaw)
      if (!sku_norm || seen.has(sku_norm)) return
      seen.add(sku_norm)

      const stockVal = parseNumber(col(row, 'stock'))
      const priceVal = parseNumber(col(row, 'price'))
      const cardVal = parseNumber(col(row, 'card_price'))
      const ex = existing.get(sku_norm)

      if (opts.mode === 'stock_only') {
        if (!ex) {
          errors.push(`Satır ${i + 2}: ${skuRaw} bulunamadı (yalnızca stok modu).`)
          return
        }
        const newStock = stockVal ?? ex.stock
        if (newStock === ex.stock && (priceVal == null || priceVal === ex.price) && cardVal == null) {
          unchanged++
          return
        }
        stockOnlyStmt.run({ id: ex.id, stock: newStock, price: priceVal, card_price: cardVal })
        updated++
        return
      }

      const name = (col(row, 'name') ?? '').trim() || ex?.name || skuRaw
      const record = {
        sku: skuRaw,
        sku_norm,
        name,
        name_norm: normalizeText(name),
        brand: (col(row, 'brand') ?? '').trim() || opts.defaultBrand,
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
        shelf: (col(row, 'shelf') ?? '').trim(),
        barcode: (col(row, 'barcode') ?? '').trim(),
        image: (col(row, 'image') ?? '').trim(),
        description: (col(row, 'description') ?? '').trim(),
        equivalents: (col(row, 'equivalents') ?? '').trim()
      }

      if (ex) {
        const sets: string[] = ['sku=@sku', 'name=@name', 'name_norm=@name_norm', 'stock=@stock', 'price=@price', 'currency=@currency', 'active=1']
        const optional: [Field, string][] = [
          ['brand', 'brand=@brand'],
          ['category', 'category=@category'],
          ['type', 'type=@type'],
          ['seal', 'seal=@seal'],
          ['d_inner', 'd_inner=@d_inner'],
          ['d_outer', 'd_outer=@d_outer'],
          ['width', 'width=@width'],
          ['unit', 'unit=@unit'],
          ['list_price', 'list_price=@list_price'],
          ['card_price', 'card_price=@card_price'],
          ['min_order', 'min_order=@min_order'],
          ['shelf', 'shelf=@shelf'],
          ['barcode', 'barcode=@barcode'],
          ['image', 'image=@image'],
          ['description', 'description=@description'],
          ['equivalents', 'equivalents=@equivalents']
        ]
        for (const [f, set] of optional) if (idx(f) >= 0) sets.push(set)
        db.prepare(`UPDATE products SET ${sets.join(', ')}, updated_at=datetime('now','localtime') WHERE id=@id`).run({
          ...record,
          id: ex.id
        })
        if (ex.stock === record.stock && ex.price === record.price && ex.name === record.name) unchanged++
        else updated++
      } else {
        insertStmt.run(record)
        inserted++
      }
    })

    if (opts.deactivateMissing && opts.mode !== 'replace') {
      const missing = [...existing.keys()].filter((k) => !seen.has(k))
      const st = db.prepare(`UPDATE products SET active=0, updated_at=datetime('now','localtime') WHERE sku_norm=? AND active=1`)
      for (const k of missing) deactivated += st.run(k).changes
    }

    const r = db
      .prepare('INSERT INTO import_logs(filename, inserted, updated, unchanged, deactivated, mode) VALUES (?,?,?,?,?,?)')
      .run(parsed.filename, inserted, updated, unchanged, deactivated, opts.mode)
    return Number(r.lastInsertRowid)
  })
  const logId = tx()
  pending.delete(opts.token)
  db.exec("INSERT INTO products_fts(products_fts) VALUES('optimize')")
  const log = db.prepare('SELECT * FROM import_logs WHERE id = ?').get(logId) as ImportLog
  return { ...log, errors: errors.slice(0, 200) }
}

export function importLogs(): ImportLog[] {
  return getDb().prepare('SELECT * FROM import_logs ORDER BY id DESC LIMIT 50').all() as ImportLog[]
}

export const TEMPLATE_HEADERS = [
  'Stok Kodu',
  'Ürün Adı',
  'Marka',
  'Kategori',
  'Tip',
  'Keçe',
  'İç Çap',
  'Dış Çap',
  'Genişlik',
  'Stok',
  'Birim',
  'Peşin Fiyat',
  'Kredi Kartı Fiyatı',
  'Para Birimi',
  'Liste Fiyatı',
  'Min Sipariş',
  'Raf',
  'Barkod',
  'Muadil'
]
