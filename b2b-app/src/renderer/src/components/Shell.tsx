import {
  ClipboardList,
  FileUp,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  ShoppingCart,
  Users
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { UpdateState } from '@shared/types'
import { api, onEvent } from '@/lib/api'
import { ROLE_LABEL } from '@/lib/format'
import { useApp, useCart, type Page } from '@/store/app'
import logo from '@/assets/logo.png'
import mark from '@/assets/mark.png'

interface NavItem {
  page: Page
  label: string
  icon: ReactNode
  key: string
  roles?: Array<'admin' | 'satis' | 'bayi'>
}

const NAV: NavItem[] = [
  { page: 'dashboard', label: 'Özet', icon: <LayoutDashboard size={20} aria-hidden />, key: '1' },
  { page: 'catalog', label: 'Ürünler', icon: <Search size={20} aria-hidden />, key: '2' },
  { page: 'cart', label: 'Sepet', icon: <ShoppingCart size={20} aria-hidden />, key: '3' },
  { page: 'orders', label: 'Siparişler', icon: <ClipboardList size={20} aria-hidden />, key: '4' },
  { page: 'customers', label: 'Bayiler', icon: <Users size={20} aria-hidden />, key: '5', roles: ['admin', 'satis'] },
  { page: 'import', label: 'Stok Aktar', icon: <FileUp size={20} aria-hidden />, key: '6', roles: ['admin', 'satis'] },
  { page: 'settings', label: 'Ayarlar', icon: <SettingsIcon size={20} aria-hidden />, key: '7' },
  { page: 'help', label: 'Yardım', icon: <HelpCircle size={20} aria-hidden />, key: '8' }
]

export const PAGE_TITLE: Record<Page, string> = {
  dashboard: 'Özet',
  catalog: 'Ürün Kataloğu',
  cart: 'Sepet ve Sipariş',
  orders: 'Siparişler',
  customers: 'Bayiler',
  import: 'Stok Aktarımı',
  settings: 'Ayarlar',
  help: 'Yardım ve Kısayollar'
}

/** Subscribes to the main-process updater; returns null until an update is actually downloading/ready. */
export function useUpdateState(): UpdateState | null {
  const [state, setState] = useState<UpdateState | null>(null)
  useEffect(() => {
    const load = (): void => {
      api('update:state', undefined).then(setState).catch(() => undefined)
    }
    load()
    return onEvent('update:changed', load)
  }, [])
  return state
}

function UpdateBanner(): ReactNode {
  const u = useUpdateState()
  if (!u || (u.status !== 'downloading' && u.status !== 'downloaded')) return null
  return (
    <div className="update-banner" role="status" aria-live="polite">
      <RefreshCw size={16} aria-hidden className={u.status === 'downloading' ? 'spin' : undefined} />
      {u.status === 'downloading' ? (
        <span>
          Yeni sürüm {u.version} indiriliyor… {u.percent ?? 0}%
        </span>
      ) : (
        <>
          <span>Sürüm {u.version} hazır.</span>
          <button className="btn primary sm" onClick={() => api('update:install', undefined).catch(() => undefined)}>
            Yeniden başlat ve güncelle
          </button>
        </>
      )}
    </div>
  )
}

export function Shell({ children }: { children: ReactNode }): ReactNode {
  const { page, go, session, setSession, sidebarCollapsed, toggleSidebar, toast } = useApp()
  const cartCount = useCart((s) => s.lines.length)
  const clearCart = useCart((s) => s.clear)
  const role = session?.user.role ?? 'bayi'
  const items = NAV.filter((n) => !n.roles || n.roles.includes(role))

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
    await api('auth:logout', undefined)
    clearCart()
    setSession(null)
    toast('Oturum kapatıldı.')
  }

  const initials = (session?.user.display_name || session?.user.username || '?').slice(0, 1).toUpperCase()

  return (
    <div className={`shell${sidebarCollapsed ? ' collapsed' : ''}`}>
      <a href="#main" className="skip-link">
        İçeriğe geç
      </a>
      <aside className="sidebar" aria-label="Ana menü">
        <div className="brand">
          <img className="brand-mark" src={mark} alt="" />
          <img className="brand-logo" src={logo} alt="Yamansa Rulman" />
          <div>
            <small>{role === 'bayi' ? 'Bayi Portalı' : 'Yönetim Paneli'}</small>
          </div>
        </div>
        <nav className="nav" aria-label="Sayfalar">
          {items.map((n) => (
            <button
              key={n.page}
              className="nav-item"
              aria-current={page === n.page ? 'page' : undefined}
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
              <span>
                {n.label}
                {n.page === 'cart' && cartCount > 0 && <span className="sr-only"> ({cartCount} kalem)</span>}
              </span>
              <kbd className="kbd" aria-hidden>
                Alt+{n.key}
              </kbd>
            </button>
          ))}
        </nav>
        <button className="nav-item" onClick={toggleSidebar} aria-pressed={sidebarCollapsed} aria-label={sidebarCollapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}>
          {sidebarCollapsed ? <PanelLeftOpen size={20} aria-hidden /> : <PanelLeftClose size={20} aria-hidden />}
          <span>Menüyü daralt</span>
        </button>
        <div className="user-box">
          <span className="avatar" aria-hidden>
            {initials}
          </span>
          <div className="truncate" style={{ flex: 1 }}>
            <strong className="truncate" style={{ display: 'block' }}>
              {session?.user.display_name || session?.user.username}
            </strong>
            <span className="muted small">{ROLE_LABEL[role]}</span>
          </div>
          <button className="btn ghost icon sm" onClick={logout} aria-label="Oturumu kapat" title="Oturumu kapat">
            <LogOut size={18} aria-hidden />
          </button>
        </div>
      </aside>
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
          <UpdateBanner />
        </header>
        <main id="main" className={`content${page === 'catalog' ? ' flush' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
