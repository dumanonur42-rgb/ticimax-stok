import type { DashboardStats } from '@shared/types'
import { AlertTriangle, Boxes, ClipboardList, PackageCheck, PackageX, Search, ShoppingCart, Users } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Empty, Spinner } from '@/components/ui'
import { api, onEvent } from '@/lib/api'
import { date, money, num, STATUS_CLASS, STATUS_LABEL } from '@/lib/format'
import { useApp, useCart } from '@/store/app'

export function Dashboard(): ReactNode {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const { go, session, toast, settings } = useApp()
  const isAdmin = session?.user.role === 'admin'
  const isDealer = session?.user.role === 'bayi'
  const cartCount = useCart((s) => s.lines.length)
  const showPrices = settings?.show_prices_to_dealers !== false || !isDealer

  const load = (): void => {
    api('dashboard:stats', undefined).then(setStats).catch((e) => toast(e.message, 'error'))
  }
  useEffect(() => {
    load()
    const a = onEvent('products:changed', load)
    const b = onEvent('orders:changed', load)
    return () => {
      a()
      b()
    }
  }, [])

  if (!stats) return <Spinner />

  const Stat = ({ icon, label, value, onClick }: { icon: ReactNode; label: string; value: string | number; onClick?: () => void }): ReactNode => (
    <button className="card stat" onClick={onClick} disabled={!onClick} style={{ textAlign: 'left', cursor: onClick ? 'pointer' : 'default' }}>
      <span className="row muted">
        {icon} <span className="label">{label}</span>
      </span>
      <span className="value">{value}</span>
    </button>
  )

  if (isDealer)
    return (
      <div className="grid" style={{ gap: 18 }}>
        <section className="hero card" aria-labelledby="welcome">
          <div>
            <h2 id="welcome">Hoş geldiniz{session?.customer ? `, ${session.customer.name}` : ''}</h2>
            <p className="muted">Stok kodu, ölçü (örn. 25x52x15) veya marka ile arayın; ürünü sepete ekleyip sipariş oluşturun.</p>
            <div className="row wrap">
              <button className="btn primary lg" onClick={() => go('catalog')}>
                <Search size={18} aria-hidden /> Ürün ara <kbd className="kbd">Ctrl+K</kbd>
              </button>
              <button className="btn lg" onClick={() => go('cart')}>
                <ShoppingCart size={18} aria-hidden /> Sepet{cartCount > 0 ? ` (${cartCount})` : ''}
              </button>
            </div>
          </div>
          <div className="hero-art" aria-hidden />
        </section>
        <div className="grid g4">
          <Stat icon={<Boxes size={18} aria-hidden />} label="Katalogdaki ürün" value={num(stats.productCount)} onClick={() => go('catalog')} />
          <Stat icon={<PackageCheck size={18} aria-hidden />} label="Stokta" value={num(stats.inStockCount)} />
          <Stat icon={<ClipboardList size={18} aria-hidden />} label="Açık siparişim" value={num(stats.openOrders)} onClick={() => go('orders')} />
          <Stat icon={<ShoppingCart size={18} aria-hidden />} label="Sepetteki kalem" value={num(cartCount)} onClick={() => go('cart')} />
        </div>
        <section className="card" aria-labelledby="recent-orders">
          <h2 id="recent-orders">Son siparişlerim</h2>
          {stats.recentOrders.length === 0 ? (
            <Empty title="Henüz sipariş yok" hint="Ürünler sayfasından sepete ekleyip ilk siparişinizi oluşturun." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tarih</th>
                  <th>Durum</th>
                  {showPrices && <th className="right">Tutar</th>}
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o) => (
                  <tr key={o.id} className="clickable" onClick={() => go('orders', o.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go('orders', o.id)}>
                    <td className="mono">{o.order_no}</td>
                    <td className="nowrap">{date(o.created_at)}</td>
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
      </div>
    )

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="grid g4">
        <Stat icon={<Boxes size={18} aria-hidden />} label="Toplam ürün" value={num(stats.productCount)} onClick={() => go('catalog')} />
        <Stat icon={<PackageCheck size={18} aria-hidden />} label="Stokta" value={num(stats.inStockCount)} />
        <Stat icon={<AlertTriangle size={18} aria-hidden />} label="Kritik stok" value={num(stats.lowStockCount)} />
        <Stat icon={<PackageX size={18} aria-hidden />} label="Stok yok" value={num(stats.outOfStockCount)} />
        <Stat icon={<ClipboardList size={18} aria-hidden />} label="Açık sipariş" value={num(stats.openOrders)} onClick={() => go('orders')} />
        <Stat icon={<ClipboardList size={18} aria-hidden />} label="Bugünkü sipariş" value={num(stats.ordersToday)} onClick={() => go('orders')} />
        {isAdmin && <Stat icon={<Users size={18} aria-hidden />} label="Bayi" value={num(stats.customerCount)} onClick={() => go('customers')} />}
        <div className="card stat">
          <span className="muted label">Son stok aktarımı</span>
          {stats.lastImport ? (
            <span className="small">
              <strong>{date(stats.lastImport.created_at)}</strong>
              <br />
              {stats.lastImport.filename} · +{stats.lastImport.inserted} / ~{stats.lastImport.updated}
            </span>
          ) : (
            <span className="small muted">Henüz aktarım yapılmadı</span>
          )}
        </div>
      </div>

      {stats.productCount === 0 && (
        <div className="card">
          <Empty title="Henüz ürün yok" hint="Stok listenizi Excel/CSV olarak aktarın veya denemek için örnek rulman kataloğunu yükleyin.">
            <div className="row" style={{ justifyContent: 'center' }}>
              {isAdmin && (
                <button className="btn primary" onClick={() => go('import')}>
                  Stok listesi aktar
                </button>
              )}
              {isAdmin && (
                <button
                  className="btn"
                  onClick={async () => {
                    toast('Örnek katalog oluşturuluyor…')
                    const n = await api('app:seedDemo', 12000)
                    toast(`${num(n)} örnek ürün eklendi.`, 'success')
                  }}
                >
                  Örnek veri yükle (12.000 ürün)
                </button>
              )}
            </div>
          </Empty>
        </div>
      )}

      <div className="grid g2">
        <section className="card" aria-labelledby="recent-orders">
          <h2 id="recent-orders">Son siparişler</h2>
          {stats.recentOrders.length === 0 ? (
            <p className="muted">Sipariş yok.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Müşteri</th>
                  <th>Durum</th>
                  <th className="right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o) => (
                  <tr key={o.id} className="clickable" onClick={() => go('orders', o.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go('orders', o.id)}>
                    <td className="mono">{o.order_no}</td>
                    <td className="truncate">{o.customer_name || '-'}</td>
                    <td>
                      <span className={`badge ${STATUS_CLASS[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                    </td>
                    <td className="right nowrap">{money(o.total, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="card" aria-labelledby="low-stock">
          <h2 id="low-stock">Kritik stoktaki ürünler</h2>
          {stats.lowStock.length === 0 ? (
            <p className="muted">Kritik stokta ürün yok.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Stok Kodu</th>
                  <th>Ürün</th>
                  <th className="right">Stok</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStock.map((p) => (
                  <tr key={p.id}>
                    <td className="mono">{p.sku}</td>
                    <td className="truncate" style={{ maxWidth: 260 }}>
                      {p.name}
                    </td>
                    <td className="right">
                      <span className="badge low">{num(p.stock)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {stats.brands.length > 0 && (
        <section className="card" aria-labelledby="brands">
          <h2 id="brands">Markalar</h2>
          <div className="chips">
            {stats.brands.map((b) => (
              <span key={b.value} className="chip" style={{ padding: '4px 12px' }}>
                {b.value} <span className="muted">· {num(b.count)}</span>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
