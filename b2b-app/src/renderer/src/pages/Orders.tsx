import type { Order, OrderStatus } from '@shared/types'
import { Download, Printer, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Empty, Spinner } from '@/components/ui'
import { api, onEvent } from '@/lib/api'
import { date, money, num, STATUS_CLASS, STATUS_LABEL } from '@/lib/format'
import { useApp } from '@/store/app'

const FLOW: OrderStatus[] = ['beklemede', 'onaylandi', 'hazirlaniyor', 'teslim']

export function Orders(): ReactNode {
  const { pageParam, session, toast, settings } = useApp()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [selectedId, setSelectedId] = useState<number | null>(pageParam)
  const [detail, setDetail] = useState<Order | null>(null)
  const isDealer = session?.user.role === 'bayi'
  const isAdmin = session?.user.role === 'admin'
  const showPrices = settings?.show_prices_to_dealers !== false || !isDealer

  const load = (): void => {
    api('orders:list', { q, status: status || undefined }).then(setOrders).catch((e) => toast(e.message, 'error'))
  }
  useEffect(load, [q, status])
  useEffect(() => onEvent('orders:changed', load), [q, status])
  useEffect(() => {
    if (selectedId == null) return setDetail(null)
    api('orders:get', selectedId).then(setDetail).catch((e) => toast(e.message, 'error'))
  }, [selectedId, orders])

  const setOrderStatus = async (s: OrderStatus): Promise<void> => {
    if (!detail) return
    try {
      const o = await api('orders:setStatus', { id: detail.id, status: s })
      setDetail(o)
      toast(`Durum güncellendi: ${STATUS_LABEL[s]}`, 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: detail ? '1fr 460px' : '1fr', alignItems: 'start', gap: 18 }}>
      <section className="card" style={{ padding: 0, overflow: 'hidden' }} aria-labelledby="orders-title">
        <div className="toolbar">
          <h2 id="orders-title" className="sr-only">
            Sipariş listesi
          </h2>
          <input className="input" style={{ maxWidth: 320 }} type="search" placeholder="Sipariş no, müşteri, not ara…" aria-label="Sipariş ara" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="select" style={{ width: 180 }} value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | '')} aria-label="Durum filtresi">
            <option value="">Tüm durumlar</option>
            {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <span className="spacer" />
          <span className="muted small" aria-live="polite">
            {orders ? `${num(orders.length)} sipariş` : ''}
          </span>
        </div>
        {!orders ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <Empty title="Sipariş bulunamadı" />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Sipariş No</th>
                <th>Tarih</th>
                <th>Müşteri</th>
                <th>Durum</th>
                {showPrices && <th className="right">Tutar</th>}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="clickable"
                  aria-selected={o.id === selectedId}
                  tabIndex={0}
                  onClick={() => setSelectedId(o.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedId(o.id)}
                >
                  <td className="mono">{o.order_no}</td>
                  <td className="nowrap small">{date(o.created_at)}</td>
                  <td>{o.customer_name || '-'}</td>
                  <td>
                    <span className={`badge ${STATUS_CLASS[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                  </td>
                  {showPrices && <td className="right nowrap">{money(o.total, o.currency)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {detail && (
        <aside className="card grid" aria-labelledby="od-title" style={{ gap: 14 }}>
          <div className="row">
            <h2 id="od-title" className="mono" style={{ margin: 0, flex: 1 }}>
              {detail.order_no}
            </h2>
            <button className="btn ghost icon sm" onClick={() => setSelectedId(null)} aria-label="Sipariş ayrıntısını kapat">
              <X size={18} aria-hidden />
            </button>
          </div>
          <div className="row wrap">
            <span className={`badge ${STATUS_CLASS[detail.status]}`}>{STATUS_LABEL[detail.status]}</span>
            <span className="muted small">{date(detail.created_at)}</span>
            <span className="muted small">· {detail.created_by}</span>
          </div>
          <dl className="dl">
            <dt>Müşteri</dt>
            <dd>{detail.customer_name || '-'}</dd>
            {detail.note && (
              <>
                <dt>Not</dt>
                <dd>{detail.note}</dd>
              </>
            )}
          </dl>
          <table className="table small">
            <thead>
              <tr>
                <th>Stok Kodu</th>
                <th className="right">Miktar</th>
                {showPrices && <th className="right">Tutar</th>}
              </tr>
            </thead>
            <tbody>
              {detail.items?.map((i) => (
                <tr key={i.id}>
                  <td>
                    <div className="mono">{i.sku}</div>
                    <div className="muted truncate" style={{ maxWidth: 260 }}>
                      {i.name}
                    </div>
                  </td>
                  <td className="right">{num(i.qty)}</td>
                  {showPrices && <td className="right nowrap">{money(i.line_total, detail.currency)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {showPrices && (
            <dl className="dl">
              <dt>Ara toplam</dt>
              <dd>{money(detail.subtotal + detail.discount, detail.currency)}</dd>
              {detail.discount > 0 && (
                <>
                  <dt>İskonto</dt>
                  <dd>-{money(detail.discount, detail.currency)}</dd>
                </>
              )}
              <dt>KDV %{detail.vat_pct}</dt>
              <dd>{money(detail.vat, detail.currency)}</dd>
              <dt>
                <strong>Toplam</strong>
              </dt>
              <dd>
                <strong>{money(detail.total, detail.currency)}</strong>
              </dd>
            </dl>
          )}
          <div className="row wrap">
            <button className="btn sm" onClick={() => api('orders:print', detail.id).catch((e) => toast(e.message, 'error'))}>
              <Printer size={14} aria-hidden /> Yazdır
            </button>
            {isAdmin && (
              <button className="btn sm" onClick={() => api('orders:exportExcel', detail.id).then((p) => p && toast(`Kaydedildi: ${p}`, 'success')).catch((e) => toast(e.message, 'error'))}>
                <Download size={14} aria-hidden /> Excel
              </button>
            )}
          </div>
          {!isDealer && detail.status !== 'iptal' && detail.status !== 'teslim' && (
            <div className="row wrap" role="group" aria-label="Durum değiştir">
              {FLOW.filter((s) => FLOW.indexOf(s) > FLOW.indexOf(detail.status)).map((s) => (
                <button key={s} className="btn sm primary" onClick={() => setOrderStatus(s)}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          )}
          {detail.status !== 'iptal' && detail.status !== 'teslim' && (
            <button className="btn sm danger" onClick={() => setOrderStatus('iptal')}>
              Siparişi iptal et
            </button>
          )}
          {!isDealer && detail.status === 'iptal' && (
            <button className="btn sm" onClick={() => setOrderStatus('beklemede')}>
              İptali geri al
            </button>
          )}
        </aside>
      )}
    </div>
  )
}
