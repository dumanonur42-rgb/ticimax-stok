import { SUPPORT_CONTACTS, type DashboardStats, type Product } from '@shared/types'
import { AlertTriangle, Boxes, ClipboardList, Headset, PackageCheck, PackageX, Phone, Search, ShoppingCart, UserCheck, Users } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { ProductDrawer } from '@/components/ProductDrawer'
import { ProductEditor } from '@/components/ProductEditor'
import { Empty, Spinner } from '@/components/ui'
import { api, onEvent } from '@/lib/api'
import { date, money, num, STATUS_CLASS, STATUS_LABEL } from '@/lib/format'
import { SETTINGS_TAB_USERS } from '@/pages/Settings'
import { useApp, useCart } from '@/store/app'

export function Dashboard(): ReactNode {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [editing, setEditing] = useState<Product | null>(null)
  const { go, session, toast, settings } = useApp()
  const threshold = settings?.low_stock_threshold ?? 5
  const isAdmin = session?.user.role === 'admin'
  const isDealer = session?.user.role === 'bayi'
  const cartCount = useCart((s) => s.lines.length)
  const showPrices = settings?.show_prices_to_dealers !== false || !isDealer

  const load = (): void => {
    api('dashboard:stats', undefined)
      .then(setStats)
      .catch((e) => toast(e.message, 'error'))
  }
  useEffect(() => {
    load()
    const a = onEvent('products:changed', load)
    const b = onEvent('orders:changed', load)
    const c = onEvent('users:changed', load)
    return () => {
      a()
      b()
      c()
    }
  }, [])

  if (!stats) return <Spinner />

  const open = (url: string): void => {
    api('app:openExternal', url).catch((e) => toast(e.message, 'error'))
  }
  const contact = (
    <section className="card contact" aria-labelledby="contact-title">
      <header className="contact-head">
        <span className="contact-head-icon" aria-hidden>
          <Headset size={22} />
        </span>
        <span>
          <h3 id="contact-title">Bize ulaşın</h3>
          <span className="muted small">Sipariş, stok ve fiyat sorularınız için WhatsApp'tan yazın veya doğrudan arayın</span>
        </span>
      </header>
      <ul className="contact-list">
        {SUPPORT_CONTACTS.map((c) => {
          const digits = c.phone.replace(/\D/g, '')
          return (
            <li key={c.phone} className="contact-row">
              <span className="contact-avatar" aria-hidden>
                {c.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')}
              </span>
              <span className="contact-text">
                <strong>{c.name}</strong>
                <span className="contact-number mono">{c.phone}</span>
              </span>
              <span className="contact-actions">
                <button className="contact-btn whatsapp" onClick={() => open(`https://wa.me/${digits}`)} aria-label={`${c.name} · WhatsApp'tan yaz: ${c.phone}`}>
                  <WhatsAppIcon size={20} />
                  <span>WhatsApp</span>
                </button>
                <button className="contact-btn call" onClick={() => open(`tel:+${digits}`)} aria-label={`${c.name} · Hemen ara: ${c.phone}`}>
                  <Phone size={18} />
                  <span>Ara</span>
                </button>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )

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
        {contact}
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
        {isAdmin && stats.pendingUsers > 0 && (
          <Stat icon={<UserCheck size={18} aria-hidden />} label="Onay bekleyen kayıt" value={num(stats.pendingUsers)} onClick={() => go('settings', SETTINGS_TAB_USERS)} />
        )}
        {isAdmin && (
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
        )}
      </div>

      {contact}

      {stats.productCount === 0 && (
        <div className="card">
          <Empty
            title="Henüz ürün yok"
            hint={isAdmin ? 'Stok listenizi Excel/CSV olarak aktarın veya Stok Yönetimi › Hızlı giriş ile ürün ekleyin.' : 'Ürünler yüklendiğinde burada görünecek.'}
          >
            <div className="row" style={{ justifyContent: 'center' }}>
              {isAdmin && (
                <button className="btn primary" onClick={() => go('import')}>
                  Stok listesi aktar
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
                  <th>Ürün Kodu</th>
                  <th>Marka</th>
                  {isAdmin && <th>Raf</th>}
                  <th className="right">Stok</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStock.map((p) => (
                  <tr
                    key={p.id}
                    className="clickable"
                    tabIndex={0}
                    role="button"
                    aria-label={`${p.sku} ürününü aç`}
                    onClick={() => setSelected(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelected(p)
                      }
                    }}
                  >
                    <td className="mono">{p.sku}</td>
                    <td className="truncate" style={{ maxWidth: 160 }}>
                      {p.brand}
                    </td>
                    {isAdmin && <td>{p.shelf ? <span className="shelf-tag sm">{p.shelf}</span> : <span className="faint">—</span>}</td>}
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

      {selected && (
        <ProductDrawer
          product={selected}
          onClose={() => setSelected(null)}
          onEdit={isAdmin ? () => setEditing(selected) : undefined}
          showPrices={showPrices}
          threshold={threshold}
        />
      )}
      {editing && (
        <ProductEditor
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={(p) => {
            setEditing(null)
            setSelected(p)
          }}
        />
      )}
    </div>
  )
}

/** WhatsApp brand glyph (speech bubble with handset), filled with the current color. */
function WhatsAppIcon({ size }: { size: number }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  )
}
