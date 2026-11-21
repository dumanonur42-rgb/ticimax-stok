import { brandOrigin, normalize } from './identity'
import { shelfBreakdown } from './locations'
import type { Currency, Product } from './types'

export type CopyColumn = 'shelf' | 'sku' | 'name' | 'brand' | 'size' | 'stock' | 'box' | 'description' | 'price'
export type CopyPreset = 'musteri' | 'depo' | 'ozel'
type ClipboardProductValues = Record<CopyColumn, string> & { shelfLines: string[]; priceText: string }

export const COPY_COLUMN_LABELS: Record<CopyColumn, string> = {
  shelf: 'Raf',
  sku: 'Ürün kodu',
  name: 'Ürün adı',
  brand: 'Marka',
  size: 'Ölçü (d×D×B)',
  stock: 'Stok',
  box: 'Kutu durumu',
  description: 'Açıklama',
  price: 'Fiyat'
}

export const COPY_COLUMNS: CopyColumn[] = ['shelf', 'sku', 'name', 'brand', 'size', 'stock', 'box', 'description', 'price']

export const COPY_COLUMN_PRESETS: Record<Exclude<CopyPreset, 'ozel'>, { label: string; columns: CopyColumn[] }> = {
  musteri: { label: 'Müşteri için', columns: ['sku', 'brand', 'size', 'stock', 'box', 'price'] },
  depo: { label: 'Depo için', columns: ['shelf', 'sku', 'brand', 'stock', 'box'] }
}

export const DEFAULT_COPY_COLUMNS = [...COPY_COLUMN_PRESETS.musteri.columns]
const COPY_STORAGE_PREFIX = 'yb2b.copyColumns.'
const numberFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })
const currencyFormats = new Map<Currency, Intl.NumberFormat>()

export function copyColumnsStorageKey(userId: string): string {
  return `${COPY_STORAGE_PREFIX}${userId}`
}

export function loadCopyColumns(userId: string): CopyColumn[] {
  if (!userId || typeof localStorage === 'undefined') return [...DEFAULT_COPY_COLUMNS]
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(copyColumnsStorageKey(userId)) ?? 'null')
    if (!Array.isArray(parsed)) return [...DEFAULT_COPY_COLUMNS]
    const columns = parsed.filter((column): column is CopyColumn =>
      typeof column === 'string' && COPY_COLUMNS.includes(column as CopyColumn)
    )
    return [...new Set<CopyColumn>(['sku', ...columns])]
  } catch {
    return [...DEFAULT_COPY_COLUMNS]
  }
}

export function saveCopyColumns(userId: string, columns: CopyColumn[]): void {
  if (!userId || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(copyColumnsStorageKey(userId), JSON.stringify([...new Set<CopyColumn>(['sku', ...columns])]))
  } catch {}
}

export function copyPresetFor(columns: CopyColumn[]): CopyPreset {
  const selected = new Set(columns)
  for (const preset of ['musteri', 'depo'] as const) {
    const presetColumns = COPY_COLUMN_PRESETS[preset].columns
    if (selected.size === presetColumns.length && presetColumns.every((column) => selected.has(column))) return preset
  }
  return 'ozel'
}

export function availableCopyColumns(
  products: Product[],
  options: { canShelf: boolean; showPrices: boolean }
): CopyColumn[] {
  const hasDimensions = products.some((product) => product.d_inner !== null || product.d_outer !== null || product.width !== null)
  return COPY_COLUMNS.filter((column) =>
    (column !== 'shelf' || options.canShelf) &&
    (column !== 'price' || options.showPrices) &&
    (column !== 'size' || hasDimensions)
  )
}

export function productsToClipboard(
  products: Product[],
  columns: CopyColumn[],
  options: { canShelf: boolean; showPrices: boolean; date?: Date }
): { html: string; text: string } {
  const allowed = new Set(availableCopyColumns(products, options))
  const selected = [...new Set<CopyColumn>(['sku', ...columns])].filter((column) => allowed.has(column))
  const values = (product: Product): ClipboardProductValues => {
    const shelfLines = shelfBreakdown(product)
      .map(({ shelf, qty, box }) => {
        const label = shelf.trim()
        return label
          ? [label, box.trim(), qty === null ? '' : `${numberFormat.format(qty)} adet`].filter(Boolean).join(' · ')
          : ''
      })
      .filter(Boolean)
    const price = product.price == null || product.price <= 0 ? null : product.price
    return {
      shelf: shelfLines.join('\n'),
      shelfLines,
      sku: product.sku,
      name: product.name,
      brand: brandLabel(product.brand),
      size: sizeLabel(product),
      stock: `${numberFormat.format(product.stock)} adet`,
      box: product.box.trim(),
      description: product.description,
      price: price === null ? '' : formatMoney(price, product.currency),
      priceText: price === null ? '' : formatMoneyText(price, product.currency)
    }
  }
  const productValues = products.map(values)
  const populatedColumns = selected.filter((column) =>
    column === 'sku' || productValues.some((productValue) => productValue[column].trim() !== '')
  )
  const html = htmlTable(productValues, populatedColumns)
  const text = plainText(productValues, populatedColumns)
  return { html, text }
}

function formatMoney(value: number, currency: Currency): string {
  return currencyFormatter(currency).format(value)
}

function formatMoneyText(value: number, currency: Currency): string {
  const parts = currencyFormatter(currency).formatToParts(value)
  const amount = parts.filter((part) => part.type !== 'currency' && part.type !== 'literal').map((part) => part.value).join('')
  const symbol = parts.find((part) => part.type === 'currency')?.value ?? currency
  return `${amount} ${symbol}`
}

function currencyFormatter(currency: Currency): Intl.NumberFormat {
  let formatter = currencyFormats.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 })
    currencyFormats.set(currency, formatter)
  }
  return formatter
}

function sizeLabel(product: Product): string {
  if (product.d_inner === null || product.d_outer === null || product.width === null) return ''
  return `${[product.d_inner, product.d_outer, product.width].map((value) => numberFormat.format(value)).join(' × ')} mm`
}

function brandLabel(brand: string): string {
  const { base, origin } = brandOrigin(brand)
  return `${base}${origin ? ` (${origin})` : ''}`
}

function htmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]!)
}

function valueForHtml(value: string): string {
  return htmlEscape(value.trim())
}

function cleanWhatsAppValue(value: string, sku = false): string {
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(sku ? /[*_~`]/g : /[*_~`]/g, sku ? ' ' : '')
    .replace(/\s+/g, ' ')
    .trim()
}

function wrapField(label: string, rawValue: string, limit = 60): string[] {
  const value = cleanWhatsAppValue(rawValue)
  if (!value) return []
  const prefix = `${label}: `
  const lines: string[] = []
  let current = prefix
  for (const word of value.split(' ')) {
    if (current !== prefix && current.length + word.length + 1 > limit) {
      lines.push(current.trimEnd())
      current = `  ${word}`
    } else if (current === prefix) {
      current += word
    } else {
      current += ` ${word}`
    }
  }
  if (current.trim()) lines.push(current.trimEnd())
  return lines
}

function plainText(
  products: ClipboardProductValues[],
  columns: CopyColumn[],
): string {
  const detailColumns: CopyColumn[] = ['name', 'size', 'stock', 'box', 'shelf', 'description', 'price']
  const blocks: string[] = []
  for (const productValues of products) {
    const sku = cleanWhatsAppValue(productValues.sku, true)
    const brand = columns.includes('brand') ? cleanWhatsAppValue(productValues.brand) : ''
    const lines = sku ? [`*${sku}*${brand ? ` · ${brand}` : ''}`] : []
    for (const column of detailColumns) {
      if (column === 'stock') {
        const stock = columns.includes('stock') ? productValues.stock : ''
        const box = columns.includes('box') ? productValues.box : ''
        if (stock && box) lines.push(...wrapField('Stok', `${stock} · ${box}`))
        else if (stock) lines.push(...wrapField('Stok', stock))
        else if (box) lines.push(...wrapField('Kutu durumu', box))
        continue
      }
      if (column === 'box' || !columns.includes(column)) continue
      if (column === 'name' && normalize(productValues.name) === normalize(productValues.sku)) continue
      if (column === 'shelf') {
        const shelves = productValues.shelfLines.map((line) => cleanWhatsAppValue(line)).filter(Boolean)
        if (shelves.length === 1) lines.push(`Raf: ${shelves[0]}`)
        else if (shelves.length > 1) lines.push('Raf:', ...shelves.map((line) => `- ${line}`))
        continue
      }
      const label = column === 'size' ? 'Ölçü' : COPY_COLUMN_LABELS[column]
      const value = column === 'price' ? productValues.priceText : productValues[column]
      lines.push(...wrapField(label, value))
    }
    if (lines.length) blocks.push(lines.join('\n'))
  }
  return `${blocks.join('\n\n')}${blocks.length ? '\n\n' : ''}${products.length} ürün`
}

function htmlTable(
  products: ClipboardProductValues[],
  columns: CopyColumn[]
): string {
  const tableStyle = 'border-collapse:collapse;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#17243a;'
  const cellStyle = 'border:1px solid #D5DCE6;padding:6px 10px;vertical-align:top;'
  const headers = columns.map((column) =>
    `<th scope="col" style="${cellStyle}background:#0B2A55;color:#fff;font-weight:700;text-align:left;">${htmlEscape(COPY_COLUMN_LABELS[column])}</th>`
  ).join('')
  const rows = products.map((productValues, index) => {
    const cells = columns.map((column) => {
      const numeric = column === 'stock' || column === 'price'
      const bold = column === 'sku' ? 'font-weight:700;' : ''
      const align = numeric ? 'text-align:right;' : ''
      const value = column === 'shelf'
        ? productValues.shelfLines.map(valueForHtml).join('<br style="mso-data-placement:same-cell">')
        : valueForHtml(productValues[column])
      return `<td style="${cellStyle}${bold}${align}">${value}</td>`
    }).join('')
    return `<tr style="background:${index % 2 ? '#F4F7FB' : '#fff'};">${cells}</tr>`
  }).join('')
  return `<html><head><meta charset="utf-8"></head><body><table style="${tableStyle}"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table><p style="margin:7px 0 0;font-family:Segoe UI,Arial,sans-serif;font-size:11px;color:#68758a;">${products.length} ürün</p></body></html>`
}
