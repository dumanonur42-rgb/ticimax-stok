import type { Order, Product, Settings } from '@shared/types'
import * as XLSX from 'xlsx'
import { PAYMENT_LABEL } from '@shared/price'
import { TEMPLATE_HEADERS } from './importer'

export function productsToXlsx(products: Product[], path: string): void {
  const rows = products.map((p) => ({
    'Stok Kodu': p.sku,
    'Ürün Adı': p.name,
    Marka: p.brand,
    Kategori: p.category,
    Tip: p.type,
    Keçe: p.seal,
    'İç Çap': p.d_inner ?? '',
    'Dış Çap': p.d_outer ?? '',
    Genişlik: p.width ?? '',
    Stok: p.stock,
    Birim: p.unit,
    'Peşin Fiyat': p.price,
    'Kredi Kartı Fiyatı': p.card_price ?? '',
    'Para Birimi': p.currency,
    'Liste Fiyatı': p.list_price ?? '',
    'Min Sipariş': p.min_order,
    Raf: p.shelf,
    'Kutu Durumu': p.box,
    Barkod: p.barcode,
    Muadil: p.equivalents
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ürünler')
  XLSX.writeFile(wb, path)
}

export function templateXlsx(path: string): void {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    ['RAF 1', '6205 2RS', 'SKF', 120, 'KUTULU', 85.5, ''],
    ['RAF 1', '6205 ZZ', 'FAG', 40, 'KUTUSUZ', 79, 'ARKA ŞAFT BİLYESİ'],
    ['RAF 2', '30206', 'ORS', 12, '', 210, '']
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ürünler')
  XLSX.writeFile(wb, path)
}

export function orderToXlsx(order: Order, path: string): void {
  const rows = (order.items ?? []).map((i, n) => ({
    'Sıra': n + 1,
    'Stok Kodu': i.sku,
    'Ürün Adı': i.name,
    Miktar: i.qty,
    'Birim Fiyat': i.unit_price,
    'İskonto %': i.discount_pct,
    Tutar: i.line_total
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.sheet_add_aoa(
    ws,
    [
      [],
      ['Sipariş No', order.order_no],
      ['Müşteri', order.customer_name],
      ['Ödeme', PAYMENT_LABEL[order.payment] ?? order.payment],
      ['Tarih', order.created_at],
      ['Ara Toplam', order.subtotal],
      ['İskonto', order.discount],
      [`KDV %${order.vat_pct}`, order.vat],
      ['Genel Toplam', order.total, order.currency]
    ],
    { origin: -1 }
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, order.order_no)
  XLSX.writeFile(wb, path)
}

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const money = (n: number, cur: string): string =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: cur }).format(n)

export function orderHtml(order: Order, s: Settings): string {
  const items = (order.items ?? [])
    .map(
      (i, n) => `<tr><td>${n + 1}</td><td>${esc(i.sku)}</td><td>${esc(i.name)}</td><td class="r">${i.qty}</td>
      <td class="r">${money(i.unit_price, order.currency)}</td><td class="r">${i.discount_pct ? i.discount_pct + '%' : '-'}</td>
      <td class="r">${money(i.line_total, order.currency)}</td></tr>`
    )
    .join('')
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(order.order_no)}</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:#111;margin:24px}
h1{font-size:20px;margin:0 0 4px}.muted{color:#555}
table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #bbb;padding:6px 8px;text-align:left}
th{background:#f0f0f0}.r{text-align:right}.tot td{font-weight:bold}
.head{display:flex;justify-content:space-between;gap:24px}
</style></head><body>
<div class="head"><div><h1>${esc(s.company_name)}</h1><div class="muted">${esc(s.company_address)}<br>${esc(s.company_phone)} ${esc(s.company_email)}<br>${esc(s.company_web)}</div></div>
<div><h1>Sipariş ${esc(order.order_no)}</h1><div class="muted">Tarih: ${esc(order.created_at)}<br>Durum: ${esc(order.status)}<br>Ödeme: ${esc(PAYMENT_LABEL[order.payment] ?? order.payment)}</div></div></div>
<p><strong>Müşteri:</strong> ${esc(order.customer_name || '-')}<br>${order.note ? `<strong>Not:</strong> ${esc(order.note)}` : ''}</p>
<table><thead><tr><th>#</th><th>Stok Kodu</th><th>Ürün</th><th class="r">Miktar</th><th class="r">Birim Fiyat</th><th class="r">İsk.</th><th class="r">Tutar</th></tr></thead>
<tbody>${items}</tbody>
<tfoot>
<tr><td colspan="6" class="r">Ara Toplam</td><td class="r">${money(order.subtotal + order.discount, order.currency)}</td></tr>
<tr><td colspan="6" class="r">İskonto</td><td class="r">-${money(order.discount, order.currency)}</td></tr>
<tr><td colspan="6" class="r">KDV %${order.vat_pct}</td><td class="r">${money(order.vat, order.currency)}</td></tr>
<tr class="tot"><td colspan="6" class="r">Genel Toplam</td><td class="r">${money(order.total, order.currency)}</td></tr>
</tfoot></table></body></html>`
}
