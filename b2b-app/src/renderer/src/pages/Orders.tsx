import type { Order, OrderStatus } from '@shared/types'
import { hasPerm } from '@shared/perms'
import { Download, Printer, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Confirm, Empty, LoadError, Spinner } from '@/components/ui'
import { api, onEvent } from '@/lib/api'
import { date, money, num, STATUS_CLASS, STATUS_LABEL } from '@/lib/format'
import { useApp } from '@/store/app'
import { PAYMENT_LABEL } from '@shared/price'

const FLOW: OrderStatus[] = ['beklemede', 'onaylandi', 'hazirlaniyor', 'teslim']

export function Orders(): ReactNode {
  const { pageParam, session, toast, settings } = useApp()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [ordersError, setOrdersError] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [selectedId, setSelectedId] = useState<number | null>(pageParam)
  const [detail, setDetail] = useState<Order | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailRefresh, setDetailRefresh] = useState(0)
  const selectedOpener = useRef<HTMLElement | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const cancelOpener = useRef<HTMLButtonElement | null>(null)
  const isDealer = session?.user.role !== 'admin'
  const isAdmin = session?.user.role === 'admin'
  const showPrices = settings?.show_prices_to_dealers !== false || hasPerm(session?.user, 'prices')

  const load = useCallback((): void => {
    setOrdersError('')
    api('orders:list', { q, status: status || undefined })
      .then(setOrders)
      .catch((e) => setOrdersError((e as Error).message || 'Siparişler alınamadı.'))
  }, [q, status])
  useEffect(load, [load])
  useEffect(() => onEvent('orders:changed', load), [load])
  useEffect(() => {
    window.addEventListener('online', load)
    return () => window.removeEventListener('online', load)
  }, [load])
  useEffect(() => {
    if (selectedId == null) {
      setDetail(null)
      setDetailError('')
      setDetailLoading(false)
      requestAnimationFrame(() => {
        if (selectedOpener.current?.isConnected) selectedOpener.current.focus()
      })
      return
    }
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)
    api('orders:get', selectedId)
      .then(setDetail)
      .catch((e) => setDetailError((e as Error).message || 'Sipariş ayrıntısı alınamadı.'))
      .finally(() => setDetailLoading(false))
  }, [selectedId, detailRefresh])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && selectedId !== null && !document.querySelector('dialog[open]')) setSelectedId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId])

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
    <div className="grid orders-layout" style={{ gridTemplateColumns: detail ? '1fr 460px' : '1fr', alignItems: 'start', gap: 18 }}>
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
        {ordersError ? (
          <LoadError message={ordersError} onRetry={load} />
        ) : !orders ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <Empty title="Sipariş bulunamadı" />
        ) : (
          <table className="table orders-list-table">
            <colgroup>
              <col className="order-number-column" />
              <col className="order-date-column" />
              <col className="order-customer-column" />
              <col className="order-status-column" />
              {showPrices && <col className="order-total-column" />}
            </colgroup>
            <thead>
              <tr>
                <th className="nowrap">Sipariş No</th>
                <th className="nowrap">Tarih</th>
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
                  onClick={(e) => {
                    selectedOpener.current = e.currentTarget
                    setSelectedId(o.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      selectedOpener.current = e.currentTarget
                      setSelectedId(o.id)
                    }
                  }}
                >
                  <td className="mono nowrap order-number-cell">{o.order_no}</td>
                  <td className="nowrap small order-date-cell">{date(o.created_at)}</td>
                  <td>
                    <span className="truncate order-customer-name" title={o.customer_name || '-'}>
                      {o.customer_name || '-'}
                    </span>
                  </td>
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

      {selectedId !== null && (
        <aside className="card grid" aria-labelledby="od-title" style={{ gap: 14 }}>
          {detailLoading ? <Spinner /> : detailError ? <LoadError message={detailError} onRetry={() => setDetailRefresh((value) => value + 1)} /> : detail && (
            <>
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
            <dt>Ödeme</dt>
            <dd>{PAYMENT_LABEL[detail.payment] ?? detail.payment}</dd>
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
          {isAdmin && detail.status !== 'iptal' && detail.status !== 'teslim' && (
            <div className="row wrap" role="group" aria-label="Durum değiştir">
              {FLOW.filter((s) => FLOW.indexOf(s) > FLOW.indexOf(detail.status)).map((s) => (
                <button key={s} className="btn sm primary" onClick={() => setOrderStatus(s)}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          )}
          {isAdmin && detail.status !== 'iptal' && detail.status !== 'teslim' && (
            <button className="btn sm danger" onClick={(event) => {
              cancelOpener.current = event.currentTarget
              setConfirmCancel(true)
            }}>
              Siparişi iptal et
            </button>
          )}
          {isDealer && detail.status === 'beklemede' && detail.customer_id === session?.user.customer_id && (
            <button
              ref={cancelOpener}
              className="btn sm danger"
              onClick={() => setConfirmCancel(true)}
            >
              Siparişi iptal et
            </button>
          )}
          {isAdmin && detail.status === 'iptal' && (
            <button className="btn sm" onClick={() => setOrderStatus('beklemede')}>
              İptali geri al
            </button>
          )}
            </>
          )}
        </aside>
      )}
      <Confirm
        open={confirmCancel}
        title="Siparişi iptal et"
        text={isAdmin ? 'Sipariş iptal edilsin mi? Yönetici, iptal edilen siparişi daha sonra yeniden açabilir.' : 'Sipariş iptal edilsin mi? Bu işlem bayi panelinden geri alınamaz.'}
        danger
        confirmLabel="İptal et"
        onCancel={() => {
          setConfirmCancel(false)
          cancelOpener.current?.focus()
        }}
        onConfirm={() => {
          setConfirmCancel(false)
          void setOrderStatus('iptal').finally(() => cancelOpener.current?.focus())
        }}
      />
    </div>
  )
}
