import type { Customer } from '@shared/types'
import { Minus, Plus, Send, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Confirm, Empty, Field } from '@/components/ui'
import { api } from '@/lib/api'
import { money, num } from '@/lib/format'
import { useApp, useCart } from '@/store/app'

export function Cart(): ReactNode {
  const { settings, session, toast, go } = useApp()
  const cart = useCart()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [busy, setBusy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const isDealer = session?.user.role === 'bayi'
  const showPrices = settings?.show_prices_to_dealers !== false || !isDealer

  useEffect(() => {
    api('customers:list', {}).then(setCustomers).catch(() => setCustomers([]))
    if (cart.lines.length) api('products:bySkus', cart.lines.map((l) => l.sku)).then(cart.refreshFrom).catch(() => undefined)
  }, [])

  const customer = isDealer ? session?.customer ?? null : customers.find((c) => c.id === cart.customerId) ?? null
  const discountPct = customer?.discount_pct ?? 0
  const vatPct = settings?.vat_pct ?? 20
  const currency = cart.lines[0]?.currency ?? settings?.default_currency ?? 'TRY'
  const mixedCurrency = cart.lines.some((l) => l.currency !== currency)

  const totals = useMemo(() => {
    const gross = cart.lines.reduce((s, l) => s + l.qty * l.unit_price, 0)
    const subtotal = gross * (1 - discountPct / 100)
    const vat = subtotal * (vatPct / 100)
    return { gross, discount: gross - subtotal, subtotal, vat, total: subtotal + vat }
  }, [cart.lines, discountPct, vatPct])

  const overStock = cart.lines.filter((l) => l.qty > l.stock)

  const submit = async (): Promise<void> => {
    if (!cart.lines.length) return
    if (!isDealer && !cart.customerId) return toast('Lütfen bir bayi/müşteri seçin.', 'error')
    if (mixedCurrency) return toast('Sepette farklı para birimleri var; tek para birimiyle sipariş oluşturun.', 'error')
    setBusy(true)
    try {
      const o = await api('orders:create', {
        customer_id: cart.customerId,
        note: cart.note,
        currency,
        vat_pct: vatPct,
        items: cart.lines.map((l) => ({ product_id: l.product_id, sku: l.sku, name: l.name, qty: l.qty, unit_price: l.unit_price, discount_pct: discountPct }))
      })
      cart.clear()
      toast(`Sipariş oluşturuldu: ${o.order_no}`, 'success')
      go('orders', o.id)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!cart.lines.length)
    return (
      <div className="card">
        <Empty title="Sepetiniz boş" hint="Ürünler sayfasından ürün ekleyin. Listede + tuşu ile hızlıca ekleyebilirsiniz.">
          <button className="btn primary" onClick={() => go('catalog')}>
            Ürünlere git
          </button>
        </Empty>
      </div>
    )

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', alignItems: 'start', gap: 18 }}>
      <section className="card" aria-labelledby="cart-items" style={{ padding: 0, overflow: 'hidden' }}>
        <h2 id="cart-items" className="sr-only">
          Sepet kalemleri
        </h2>
        <table className="table">
          <thead>
            <tr>
              <th className="nowrap">Stok Kodu</th>
              <th>Ürün</th>
              <th style={{ width: 150 }}>Miktar</th>
              {showPrices && <th className="right">Birim</th>}
              {showPrices && <th className="right">Tutar</th>}
              <th style={{ width: 44 }}>
                <span className="sr-only">İşlem</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cart.lines.map((l) => (
              <tr key={l.product_id}>
                <td className="mono nowrap">
                  {l.sku}
                  {l.qty > l.stock && (
                    <div className="badge low" style={{ marginTop: 2 }}>
                      Stok: {num(l.stock)}
                    </div>
                  )}
                </td>
                <td>
                  <div className="truncate" style={{ maxWidth: 360 }} title={l.name}>
                    {l.name}
                  </div>
                  <div className="small muted">{l.brand}</div>
                </td>
                <td>
                  <div className="row" style={{ gap: 4 }} role="group" aria-label={`${l.sku} miktarı`}>
                    <button className="btn icon sm" onClick={() => cart.setQty(l.product_id, l.qty - l.min_order)} aria-label="Azalt">
                      <Minus size={14} aria-hidden />
                    </button>
                    <input className="qty-input" inputMode="numeric" aria-label="Miktar" value={l.qty} onChange={(e) => cart.setQty(l.product_id, Number(e.target.value.replace(/\D/g, '')) || 0)} />
                    <button className="btn icon sm" onClick={() => cart.setQty(l.product_id, l.qty + l.min_order)} aria-label="Artır">
                      <Plus size={14} aria-hidden />
                    </button>
                  </div>
                </td>
                {showPrices && <td className="right nowrap">{money(l.unit_price, l.currency)}</td>}
                {showPrices && <td className="right nowrap">{money(l.unit_price * l.qty, l.currency)}</td>}
                <td>
                  <button className="btn ghost icon sm" onClick={() => cart.remove(l.product_id)} aria-label={`${l.sku} sepetten çıkar`}>
                    <Trash2 size={16} aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <aside className="card grid" aria-labelledby="summary" style={{ gap: 14 }}>
        <h2 id="summary">Sipariş özeti</h2>
        {!isDealer && (
          <Field label="Bayi / Müşteri *">
            {(id) => (
              <select id={id} className="select" value={cart.customerId ?? ''} onChange={(e) => cart.setCustomer(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Seçin…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.discount_pct ? `(%${c.discount_pct})` : ''}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        <Field label="Sipariş notu">{(id) => <textarea id={id} className="input" rows={3} value={cart.note} onChange={(e) => cart.setNote(e.target.value)} placeholder="Teslimat, kargo, özel istekler…" />}</Field>
        {showPrices && (
          <dl className="dl" aria-live="polite">
            <dt>Kalem</dt>
            <dd>{cart.lines.length}</dd>
            <dt>Ara toplam</dt>
            <dd>{money(totals.gross, currency)}</dd>
            {discountPct > 0 && (
              <>
                <dt>İskonto %{discountPct}</dt>
                <dd>-{money(totals.discount, currency)}</dd>
              </>
            )}
            <dt>KDV %{vatPct}</dt>
            <dd>{money(totals.vat, currency)}</dd>
            <dt>
              <strong>Genel toplam</strong>
            </dt>
            <dd>
              <strong style={{ fontSize: '1.15rem' }}>{money(totals.total, currency)}</strong>
            </dd>
          </dl>
        )}
        {mixedCurrency && (
          <p className="badge low" role="alert" style={{ padding: 8, borderRadius: 8, whiteSpace: 'normal' }}>
            Sepette farklı para birimleri var.
          </p>
        )}
        {overStock.length > 0 && (
          <p className="badge low" style={{ padding: 8, borderRadius: 8, whiteSpace: 'normal' }}>
            {overStock.length} kalemde miktar stoktan fazla; sipariş yine oluşturulur, tedarik süresi değişebilir.
          </p>
        )}
        <button className="btn primary" style={{ height: 46 }} onClick={submit} disabled={busy}>
          <Send size={18} aria-hidden /> Siparişi oluştur
        </button>
        <button className="btn ghost" onClick={() => setConfirmClear(true)}>
          Sepeti boşalt
        </button>
      </aside>
      <Confirm open={confirmClear} title="Sepeti boşalt" text="Sepetteki tüm kalemler silinecek." danger confirmLabel="Boşalt" onCancel={() => setConfirmClear(false)} onConfirm={() => { cart.clear(); setConfirmClear(false) }} />
    </div>
  )
}
