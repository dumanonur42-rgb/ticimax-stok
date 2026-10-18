import {
  ClipboardList,
  Activity,
  FileUp,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Search,
  Settings as SettingsIcon,
  ShoppingCart,
  Users,
  Warehouse
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { api, beginLogout, endLogout } from '@/lib/api'
import { ConnectionPill } from '@/components/SyncBanner'
import { useUpdateState } from '@/components/UpdateDialog'
import { Confirm } from '@/components/ui'
import { ROLE_LABEL } from '@/lib/format'
import type { UserRole } from '@shared/types'
import { useApp, useCart, type Page } from '@/store/app'
import logo from '@/assets/logo.png'
import mark from '@/assets/mark.png'

interface NavItem {
  page: Page
  label: string
  icon: ReactNode
  key: string
  roles?: Array<UserRole>
}

const NAV: NavItem[] = [
  { page: 'dashboard', label: 'Ana Sayfa', icon: <LayoutDashboard size={20} aria-hidden />, key: '1' },
  { page: 'catalog', label: 'Ürünler', icon: <Search size={20} aria-hidden />, key: '2' },
  { page: 'cart', label: 'Sepet', icon: <ShoppingCart size={20} aria-hidden />, key: '3' },
  { page: 'orders', label: 'Siparişler', icon: <ClipboardList size={20} aria-hidden />, key: '4' },
  { page: 'stock', label: 'Stok Yönetimi', icon: <Warehouse size={20} aria-hidden />, key: '5', roles: ['admin'] },
  { page: 'customers', label: 'Bayiler', icon: <Users size={20} aria-hidden />, key: '6', roles: ['admin'] },
  { page: 'import', label: 'Stok Aktar', icon: <FileUp size={20} aria-hidden />, key: '7', roles: ['admin'] },
  { page: 'activity', label: 'Hareketler', icon: <Activity size={20} aria-hidden />, key: '0', roles: ['admin'] },
  { page: 'settings', label: 'Ayarlar', icon: <SettingsIcon size={20} aria-hidden />, key: '8' },
  { page: 'help', label: 'Yardım', icon: <HelpCircle size={20} aria-hidden />, key: '9' }
]

export const PAGE_TITLE: Record<Page, string> = {
  dashboard: 'Ana Sayfa',
  catalog: 'Ürün Kataloğu',
  cart: 'Sepet ve Sipariş',
  orders: 'Siparişler',
  stock: 'Stok Yönetimi',
  customers: 'Bayiler',
  import: 'Stok Aktarımı',
  settings: 'Ayarlar',
  help: 'Yardım ve Kısayollar',
  activity: 'Hareketler'
}

export { useUpdateState }

export function Shell({ children }: { children: ReactNode }): ReactNode {
  const { page, go, session, setSession, toast } = useApp()
  const cartCount = useCart((s) => s.lines.length)
  const clearCart = useCart((s) => s.clear)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [compactNav, setCompactNav] = useState(true)
  const navRef = useRef<HTMLElement>(null)
  const logoutOpener = useRef<HTMLButtonElement>(null)
  const role = session?.user.role ?? 'bayi'
  const items = NAV.filter((n) => !n.roles || n.roles.includes(role))

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const measure = (): void => {
      const wasCompact = nav.classList.contains('compact')
      nav.classList.remove('compact')
      const needsCompact = nav.scrollWidth > nav.clientWidth + 1
      if (wasCompact) nav.classList.add('compact')
      setCompactNav(needsCompact)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(nav)
    if (nav.parentElement) observer.observe(nav.parentElement)
    window.addEventListener('resize', measure)
    requestAnimationFrame(measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [items.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const item = items.find((n) => n.key === e.key)
        if (item) {
          e.preventDefault()
          go(item.page)
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (page !== 'catalog') go('catalog')
        requestAnimationFrame(() => document.getElementById('product-search')?.focus())
      }
      if (e.key === 'F3') {
        e.preventDefault()
        if (page !== 'catalog') go('catalog')
        requestAnimationFrame(() => document.getElementById('product-search')?.focus())
      }
      if (e.key === 'F2') {
        e.preventDefault()
        go('cart')
      }
      if (e.key === 'F1') {
        e.preventDefault()
        go('help')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items, page, go])

  useEffect(() => {
    document.title = `${PAGE_TITLE[page]} – Yamansa Rulman B2B`
    const h = document.getElementById('page-title')
    h?.focus({ preventScroll: true })
  }, [page])

  const logout = async (): Promise<void> => {
    beginLogout()
    try {
      await api('auth:logout', undefined)
      clearCart()
      setSession(null)
      go('dashboard')
      document.title = 'Yamansa Rulman B2B'
      toast('Oturum kapatıldı.')
    } catch (error) {
      toast((error as Error).message || 'Oturum kapatılamadı.', 'error')
    } finally {
      endLogout()
    }
  }

  const initials = (session?.user.display_name || session?.user.username || '?').slice(0, 1).toUpperCase()
  const update = useUpdateState()

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        İçeriğe geç
      </a>
      <header className={`topnav${compactNav ? ' nav-compact' : ''}`} aria-label="Ana menü">
        <div className="brand">
          <img className="brand-mark" src={mark} alt="" />
          <img className="brand-logo" src={logo} alt="Yamansa Rulman" />
          <small>{role === 'admin' ? 'Yönetim Paneli' : role === 'bayi' ? 'Bayi Portalı' : 'Kullanıcı Paneli'}</small>
        </div>
        <nav ref={navRef} className={`nav${compactNav ? ' compact' : ''}`} aria-label="Sayfalar">
          {items.map((n) => (
            <button
              key={n.page}
              className="nav-item"
              aria-current={page === n.page ? 'page' : undefined}
              aria-label={n.label}
              onClick={() => go(n.page)}
              title={`${n.label} (Alt+${n.key})`}
            >
              <span className={n.page === 'cart' ? 'cart-fab' : undefined} style={{ display: 'inline-flex' }}>
                {n.icon}
                {n.page === 'cart' && cartCount > 0 && (
                  <span className="cart-count" aria-hidden>
                    {cartCount}
                  </span>
                )}
              </span>
              <span className="nav-label">
                {n.label}
                {n.page === 'cart' && cartCount > 0 && <span className="sr-only"> ({cartCount} kalem)</span>}
              </span>
            </button>
          ))}
        </nav>
        <div className="user-box">
          <span className="avatar" aria-hidden>
            {initials}
          </span>
          <div className="user-details truncate" style={{ flex: 1 }}>
            <strong className="truncate" style={{ display: 'block' }}>
              {session?.user.display_name || session?.user.username}
            </strong>
            <span className="muted small">
              {ROLE_LABEL[role]}
              {update && <span className="app-version"> · v{update.current}</span>}
            </span>
          </div>
          <button ref={logoutOpener} className="btn ghost icon sm" onClick={() => setConfirmLogout(true)} aria-label="Oturumu kapat" title="Oturumu kapat">
            <LogOut size={18} aria-hidden />
          </button>
        </div>
      </header>
      <div className="main">
        <header className="topbar">
          <h1 id="page-title" tabIndex={-1}>
            {PAGE_TITLE[page]}
          </h1>
          {session?.customer && (
            <span className="badge info" title="Bağlı bayi">
              {session.customer.name}
            </span>
          )}
          <ConnectionPill />
        </header>
        <main id="main" className={`content${page === 'catalog' || page === 'stock' ? ' flush' : ''}`}>
          {children}
        </main>
      </div>
      <Confirm
        open={confirmLogout}
        title="Oturumu kapat"
        text="Oturumu kapatmak istiyor musunuz?"
        confirmLabel="Oturumu kapat"
        onCancel={() => {
          setConfirmLogout(false)
          logoutOpener.current?.focus()
        }}
        onConfirm={() => {
          setConfirmLogout(false)
          void logout()
        }}
      />
    </div>
  )
}
