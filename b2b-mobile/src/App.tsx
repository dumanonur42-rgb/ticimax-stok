import { App as CapacitorApp } from '@capacitor/app'
import { AppLauncher } from '@capacitor/app-launcher'
import { AppUpdate, AppUpdateAvailability } from '@capawesome/capacitor-app-update'
import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Check, ClipboardList, Copy, Home, Minus,
  PackageSearch, Plus, RefreshCw, Search, Send, ShoppingCart, SlidersHorizontal,
  Trash2, UserRound, X, Eye, EyeOff, WifiOff, Phone, MessageCircle, Download,
  Package, Table2, LayoutGrid, ArrowUp, ArrowDown, ArrowUpDown, Box, Sparkles
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { normalize } from '@shared/identity'
import { hasPerm } from '@shared/perms'
import { priceFor } from '@shared/price'
import { SUPPORT_CONTACTS, type Customer, type Order, type Product, type Settings, type Session } from '@shared/types'
import { compareVersions } from '@shared/version'
import { dashboardOrders, createOrder, getOrder, listCustomers, listOrders, loadSettings, restoreSession, signIn, signOut } from './lib/cloud'
import { displayPrice, money, num, productsToTsv, STATUS_LABEL } from './lib/format'
import { readProducts } from './lib/idb'
import { indexProducts, searchProducts, type DimensionFilters, type SearchEntry } from './lib/search'
import { debounceSync, startRealtime, syncCatalog } from './lib/sync'
import { androidReleasesPage, checkAndroidUpdate, checkLiveUpdate, completePendingFlexibleUpdate, minimumVersionFor, startFlexibleUpdateListener, type AndroidUpdate } from './lib/updates'
import { useApp, useCart, type Tab } from './store/app'
import mark from './assets/mark.png'

const APP_VERSION = __APP_VERSION__

function userFacingError(error: unknown): string {
  return error instanceof Error ? error.message : 'Bir sorun oluştu. Yeniden deneyin.'
}

function external(url: string): void {
  if (Capacitor.isNativePlatform()) {
    void AppLauncher.openUrl({ url }).catch(() => { window.open(url, '_system') })
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function App(): ReactNode {
  const platform = Capacitor.getPlatform()
  const state = useApp()
  const refreshCart = useCart((cartState) => cartState.refresh)
  const clearCart = useCart((cartState) => cartState.clear)
  const cartCount = useCart((cartState) => cartState.lines.reduce((sum, line) => sum + line.qty, 0))
  const {
    tab, session, settings, customers, products, online, syncBusy,
    toast, sheet, selectedProduct, selectedOrderId, setTab, setSession, setSettings,
    setCustomers, setProducts, setOnline, setSyncBusy,
    showToast, setSheet, setSelectedOrderId
  } = state
  const [booting, setBooting] = useState(true)
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [homeOpenOrders, setHomeOpenOrders] = useState<number | null>(null)
  const [update, setUpdate] = useState<AndroidUpdate | null>(null)
  const [requiredUpdate, setRequiredUpdate] = useState<{ platform: 'android' | 'ios'; version: string; url?: string } | null>(null)
  const [orderRefresh, setOrderRefresh] = useState(0)
  const [dark, setDark] = useState(false)
  const syncRetryCount = useRef(0)
  const syncRetryAt = useRef(0)
  const syncRetryTimer = useRef<number | null>(null)
  const syncNowRef = useRef<() => Promise<void>>(async () => undefined)
  const searchIndex = useMemo(() => indexProducts(products), [products])

  const syncNow = useCallback(async () => {
    if (!useApp.getState().session) return
    if (navigator.onLine === false) {
      setOnline(false)
      return
    }
    if (Date.now() < syncRetryAt.current) return
    setSyncBusy(true)
    try {
      const result = await syncCatalog()
      syncRetryCount.current = 0
      syncRetryAt.current = 0
      if (syncRetryTimer.current !== null) window.clearTimeout(syncRetryTimer.current)
      syncRetryTimer.current = null
      if (result.changed > 0) {
        const scrollElement = document.querySelector<HTMLElement>('.catalog-scroll')
        const scrollTop = scrollElement?.scrollTop
        setProducts(result.products)
        refreshCart(result.products)
        if (scrollElement && scrollTop !== undefined) {
          requestAnimationFrame(() => { scrollElement.scrollTop = scrollTop })
        }
      }
      setOnline(true)
      try {
        setSettings(await loadSettings())
      } catch {
        if (!navigator.onLine) setOnline(false)
      }
    } catch (error) {
      setOnline(false)
      console.warn('Catalog sync failed', error)
      syncRetryCount.current += 1
      const delay = Math.min(5 * 60_000, 15_000 * 2 ** Math.min(syncRetryCount.current - 1, 5))
      syncRetryAt.current = Date.now() + delay
      if (syncRetryTimer.current !== null) window.clearTimeout(syncRetryTimer.current)
      syncRetryTimer.current = window.setTimeout(() => {
        syncRetryTimer.current = null
        if (navigator.onLine) void syncNowRef.current()
      }, delay)
    } finally {
      setSyncBusy(false)
    }
  }, [refreshCart, setOnline, setProducts, setSettings, setSyncBusy])
  syncNowRef.current = syncNow

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const cached = await readProducts()
        if (active && cached.length) setProducts(cached)
      } catch {
        if (active) showToast('Yerel katalog açılamadı.')
      }
      try {
        const restored = await restoreSession()
        if (active && restored) setSession(restored)
      } catch {
        if (active && navigator.onLine) showToast('Oturum bilgisi yenilenemedi. Yeniden giriş yapın.')
      } finally {
        if (active) setBooting(false)
      }
    })()
    const onOnline = (): void => { setOnline(true); void syncNow() }
    const onOffline = (): void => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      active = false
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [platform, setProducts, setSession, setOnline, showToast, setSheet, syncNow])

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || (platform !== 'android' && platform !== 'ios')) return
    let active = true
    let resumeHandle: { remove: () => Promise<void> } | undefined
    let pauseHandle: { remove: () => Promise<void> } | undefined
    let flexibleHandle: { remove: () => Promise<void> } | undefined
    const checkUpdates = async (): Promise<void> => {
      if (document.visibilityState !== 'visible') return
      void checkLiveUpdate()
      await completePendingFlexibleUpdate()
      let currentVersion = APP_VERSION
      try {
        currentVersion = (await CapacitorApp.getInfo()).version || APP_VERSION
      } catch (error) {
        console.warn(`${platform} version lookup failed`, error)
      }
      const minimum = minimumVersionFor(platform, settings)
      const forced = !!minimum && compareVersions(currentVersion, minimum) < 0
      if (forced && active) setRequiredUpdate({ platform, version: minimum, ...(platform === 'android' ? { url: androidReleasesPage() } : {}) })
      if (navigator.onLine === false) return
      if (platform === 'ios') {
        try { await AppUpdate.getAppUpdateInfo({ country: 'TR' }) } catch { /* Store lookup is unavailable until release. */ }
        return
      }
      try {
        const info = await AppUpdate.getAppUpdateInfo()
        const storeCurrentVersion = info.currentVersionName || currentVersion
        const storeForced = !!minimum && compareVersions(storeCurrentVersion, minimum) < 0
        if (storeForced && active) setRequiredUpdate({ platform, version: minimum, url: androidReleasesPage() })
        if (info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
          if (storeForced) await AppUpdate.performImmediateUpdate()
          else await AppUpdate.startFlexibleUpdate()
          return
        }
      } catch (error) {
        console.warn('Play update lookup failed; checking GitHub APK releases', error)
        try {
          const available = await checkAndroidUpdate()
          if (!active) return
          if (forced) setRequiredUpdate({ platform, version: minimum, url: available?.url ?? androidReleasesPage() })
          else if (available) {
            setUpdate(available)
            setSheet('update')
          }
        } catch (fallbackError) {
          console.warn('GitHub APK update lookup failed', fallbackError)
        }
      }
    }
    const runLiveCheck = (): void => { if (document.visibilityState === 'visible') void checkLiveUpdate() }
    void CapacitorUpdater.notifyAppReady().catch((error) => console.warn('Updater startup failed', error))
    void checkLiveUpdate()
    void checkUpdates()
    void startFlexibleUpdateListener().then((handle) => { flexibleHandle = handle }).catch((error) => console.warn('Flexible update listener failed', error))
    void CapacitorApp.addListener('resume', checkUpdates).then((handle) => { resumeHandle = handle })
    void CapacitorApp.addListener('pause', () => { void completePendingFlexibleUpdate() }).then((handle) => { pauseHandle = handle })
    const interval = window.setInterval(runLiveCheck, 30 * 60_000)
    return () => {
      active = false
      window.clearInterval(interval)
      void resumeHandle?.remove()
      void pauseHandle?.remove()
      void flexibleHandle?.remove()
    }
  }, [platform, settings.min_version_android, settings.min_version_ios, setSheet])

  useEffect(() => {
    if (!session) return
    void syncNow()
    if (session.user.role === 'admin') void listCustomers().then(setCustomers).catch(() => setCustomers([]))
    void dashboardOrders().then((data) => setHomeOpenOrders(data.openOrders)).catch(() => setHomeOpenOrders(null))
    const syncDebounced = (): void => debounceSync(() => {
      if (document.visibilityState === 'visible') void syncNow()
    })
    const stopRealtime = startRealtime(syncDebounced)
    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') void syncNow()
    }, 60_000)
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') void syncNow()
    }
    document.addEventListener('visibilitychange', onVisible)
    let resumeHandle: { remove: () => Promise<void> } | undefined
    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.addListener('resume', () => { void syncNow() }).then((handle) => { resumeHandle = handle })
    }
    return () => {
      stopRealtime()
      window.clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      void resumeHandle?.remove()
    }
  }, [session?.user.id, session?.user.role, syncNow, setCustomers])

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const updateTheme = (): void => setDark(settings.theme === 'dark' || (settings.theme === 'system' && query.matches))
    updateTheme()
    query.addEventListener('change', updateTheme)
    return () => query.removeEventListener('change', updateTheme)
  }, [settings.theme])

  useEffect(() => {
    let handle: { remove: () => Promise<void> } | undefined
    const goBack = (): void => {
      const current = useApp.getState()
      if (current.sheet) current.setSheet(null)
      else if (current.tab !== 'home') current.setTab('home')
    }
    if (platform === 'android') {
      void CapacitorApp.addListener('backButton', goBack).then((listener) => { handle = listener })
      return () => { void handle?.remove() }
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') goBack()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [platform])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => showToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast, showToast])

  const onLogin = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setLoginError('')
    setLoginBusy(true)
    try {
      const signedIn = await signIn(loginName, password)
      setSession(signedIn)
      setSettings(await loadSettings())
      setPassword('')
      setTab('home')
    } catch (error) {
      setLoginError(userFacingError(error))
    } finally {
      setLoginBusy(false)
    }
  }

  const onLogout = async (): Promise<void> => {
    try {
      await signOut()
    } catch {
      showToast('Oturum kapatılamadı. İnternet bağlantınızı kontrol edin.')
    } finally {
      setSession(null)
      setProducts([])
      setCustomers([])
      clearCart()
      setTab('home')
    }
  }

  if (requiredUpdate) return (
    <main className={`required-update${dark ? ' dark' : ''}`}>
      <img className="login-mark" src={mark} alt="Yamansa Rulman" />
      <h1>Güncelleme gerekli</h1>
      <p>Uygulamayı kullanmaya devam etmek için {requiredUpdate.version} sürümünü yükleyin.</p>
      <button className="button primary wide" onClick={() => {
        if (requiredUpdate.platform === 'ios') void AppUpdate.openAppStore().catch((error) => console.warn('App Store could not be opened', error))
        else external(requiredUpdate.url ?? androidReleasesPage())
      }}>
        {requiredUpdate.platform === 'ios' ? 'App Store’u aç' : 'APK güncellemesini indir'}
      </button>
    </main>
  )
  if (booting) return <div className="boot-screen"><img src={mark} alt="" /><span>Yamansa Rulman</span></div>
  if (!session) {
    return (
      <main className={`login-screen${dark ? ' dark' : ''}`}>
        <section className="login-card">
          <img className="login-mark" src={mark} alt="Yamansa Rulman" />
          <p className="eyebrow">BAYİ UYGULAMASI</p>
          <h1>Hoş geldiniz</h1>
          <p className="muted">Hesabınızla giriş yapın.</p>
          <form className="login-form" onSubmit={(event) => void onLogin(event)}>
            <label htmlFor="username">Kullanıcı adı</label>
            <input id="username" autoComplete="username" value={loginName} onChange={(event) => setLoginName(event.target.value)} required />
            <label htmlFor="password">Şifre</label>
            <div className="password-wrap">
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button type="button" className="icon-button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}>
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            {loginError && <p className="error-text" role="alert">{loginError}</p>}
            {!online && <p className="error-text" role="status">Giriş yapmak için internet bağlantısı gerekir.</p>}
            <button className="button primary wide" type="submit" disabled={loginBusy || !online}>
              {loginBusy ? 'Giriş yapılıyor…' : 'Giriş yap'}
            </button>
          </form>
          <p className="login-foot">Yardım için <a href={`tel:${SUPPORT_CONTACTS[0].phone.replace(/\D/g, '')}`} onClick={(event) => { event.preventDefault(); external(`tel:${SUPPORT_CONTACTS[0].phone.replace(/\D/g, '')}`) }}>bizi arayın</a>.</p>
        </section>
      </main>
    )
  }

  return (
    <div className={`app-shell${dark ? ' dark' : ''}`} data-theme={dark ? 'dark' : 'light'}>
      <header className="app-header">
        <div className="brand-lockup">
          <img src={mark} alt="" />
          <div><strong>{settings.company_name}</strong><span>B2B Uygulaması</span></div>
        </div>
        {!online && <div className="connection-chip" role="status"><WifiOff size={15} /><span>Çevrimdışı</span></div>}
      </header>
      <main className="main-content" key={tab}>
        {tab === 'home' && <HomePage session={session} settings={settings} openOrders={homeOpenOrders} products={products} onNavigate={setTab} onToast={showToast} />}
        {tab === 'products' && <ProductsPage entries={searchIndex} settings={settings} session={session} loading={syncBusy && products.length === 0} onToast={showToast} />}
        {tab === 'cart' && <CartPage session={session} settings={settings} customers={customers} products={products} online={online} onToast={showToast} onOrderCreated={() => setOrderRefresh((n) => n + 1)} onViewOrders={() => setTab('orders')} />}
        {tab === 'orders' && <OrdersPage settings={settings} refreshKey={orderRefresh} selectedOrderId={selectedOrderId} onSelectOrder={(id) => { setSelectedOrderId(id); setSheet('order') }} onRefresh={() => setOrderRefresh((n) => n + 1)} />}
        {tab === 'account' && <AccountPage session={session} lastSync={lastSync} syncBusy={syncBusy} platform={platform} onSync={() => void syncNow()} onCheckUpdate={() => void checkAndroidUpdate().then((available) => { if (available) { setUpdate(available); setSheet('update') } else showToast('Uygulamanız güncel.') }).catch((error) => showToast(userFacingError(error)))} onLogout={() => void onLogout()} />}
      </main>
      <BottomTabs tab={tab} setTab={setTab} cartCount={cartCount} />
      {sheet === 'filters' && <FilterSheet
        entries={searchIndex}
        initialBrands={state.catalogBrands}
        initialDimensions={state.catalogDimensions}
        onApply={state.setCatalogFilters}
        onClose={() => setSheet(null)}
      />}
      {sheet === 'detail' && selectedProduct && <ProductDetail product={selectedProduct} settings={settings} session={session} onClose={() => setSheet(null)} onToast={showToast} />}
      {sheet === 'order' && selectedOrderId !== null && <OrderDetail id={selectedOrderId} settings={settings} onClose={() => setSheet(null)} />}
      {sheet === 'update' && update && <UpdateSheet update={update} onClose={() => setSheet(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

function BottomTabs({ tab, setTab, cartCount }: { tab: Tab; setTab: (tab: Tab) => void; cartCount: number }): ReactNode {
  const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Ana Sayfa', icon: Home },
    { id: 'products', label: 'Ürünler', icon: PackageSearch },
    { id: 'cart', label: 'Sepet', icon: ShoppingCart },
    { id: 'orders', label: 'Siparişler', icon: ClipboardList },
    { id: 'account', label: 'Hesap', icon: UserRound }
  ]
  return (
    <nav className="bottom-tabs" aria-label="Ana menü">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button type="button" key={id} className={tab === id ? 'tab active' : 'tab'} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined} aria-label={label}>
          <span className="tab-icon"><Icon size={21} aria-hidden />{id === 'cart' && cartCount > 0 && <span className="tab-badge">{cartCount > 99 ? '99+' : cartCount}</span>}</span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

function HomePage({ session, settings, openOrders, products, onNavigate, onToast }: {
  session: Session; settings: Settings; openOrders: number | null; products: Product[]; onNavigate: (tab: Tab) => void; onToast: (message: string) => void
}): ReactNode {
  const openContact = (url: string): void => {
    try { external(url) } catch { onToast('Bağlantı açılamadı.') }
  }
  const openCount = openOrders ?? 0
  const customerName = session.customer?.name ?? settings.company_name
  const greetingName = session.user.display_name || session.user.username
  const showCompany = normalize(customerName) !== normalize(greetingName) && normalize(customerName) !== normalize('Yamansa Rulman')
  return (
    <div className="page home-page">
      <section className="home-hero">
        <span className="home-hero-mark"><Sparkles size={20} /></span>
        <p className="eyebrow">BAYİ PANELİ</p>
        <h1>Merhaba, {greetingName}</h1>
        {showCompany && <p>{customerName}</p>}
      </section>
      <div className="summary-grid">
        <button className="summary-card" onClick={() => onNavigate('products')}>
          <span className="summary-icon"><Package size={20} /></span>
          {products.length ? <span className="summary-value">{num(products.length)}</span> : <span className="summary-value summary-skeleton" aria-label=" " />}
          {products.length > 0 && <span className="summary-label">Toplam ürün</span>}
        </button>
        <button className="summary-card" onClick={() => { onNavigate('products') }}>
          <span className="summary-icon"><Box size={20} /></span>
          <span className="summary-value">{num(products.filter((product) => product.stock > 0).length)}</span>
          <span className="summary-label">Stokta olan</span>
        </button>
        <button className="summary-card" onClick={() => onNavigate('orders')}>
          <span className="summary-icon"><ClipboardList size={20} /></span>
          <span className="summary-value">{openOrders === null ? '—' : num(openCount)}</span>
          <span className="summary-label">Açık sipariş</span>
        </button>
        <button className="summary-card" onClick={() => onNavigate('cart')}>
          <span className="summary-icon"><ShoppingCart size={20} /></span>
          <span className="summary-value">{useCart.getState().lines.length}</span>
          <span className="summary-label">Sepetteki kalem</span>
        </button>
      </div>
      <nav className="quick-actions" aria-label="Hızlı işlemler">
        <button onClick={() => onNavigate('products')}><Search size={17} /> Ürün ara</button>
        <button onClick={() => onNavigate('cart')}><ShoppingCart size={17} /> Sepet</button>
        <button onClick={() => onNavigate('orders')}><ClipboardList size={17} /> Siparişler</button>
      </nav>
      <section className="contacts-section">
        <h2>Size yardımcı olalım</h2>
        <div className="contact-list">
          {SUPPORT_CONTACTS.map((contact) => {
            const digits = contact.phone.replace(/\D/g, '')
            return (
              <div className="contact-card" key={contact.phone}>
                <div className="contact-avatar">{contact.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
                <div className="contact-info"><strong>{contact.name}</strong><span>{contact.phone}</span></div>
                <button className="round-action whatsapp" onClick={() => openContact(`https://wa.me/${digits}`)} aria-label={`${contact.name} ile WhatsApp'tan yaz`}><MessageCircle size={19} /></button>
                <button className="round-action" onClick={() => openContact(`tel:+${digits}`)} aria-label={`${contact.name} numarasını ara`}><Phone size={19} /></button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function ProductsPage({ entries, settings, session, loading, onToast }: {
  entries: SearchEntry[]; settings: Settings; session: Session; loading: boolean; onToast: (message: string) => void
}): ReactNode {
  const setSheet = useApp((state) => state.setSheet)
  const setSelectedProduct = useApp((state) => state.setSelectedProduct)
  const selectedBrands = useApp((state) => state.catalogBrands)
  const dims = useApp((state) => state.catalogDimensions)
  const [query, setQuery] = useState('')
  const [inStock, setInStock] = useState(false)
  const [view, setView] = useState<'table' | 'card'>(() => {
    try { return localStorage.getItem('yb2b.productView') === 'card' ? 'card' : 'table' } catch { return 'table' }
  })
  const [sort, setSort] = useState<{ key: 'sku' | 'brand' | 'stock' | 'price'; direction: 'asc' | 'desc' } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const searchResult = useMemo(() => {
    const start = performance.now()
    const matches = searchProducts(entries, query, { inStock, brands: new Set(selectedBrands), dimensions: dims })
    return { matches, elapsed: performance.now() - start }
  }, [entries, query, inStock, selectedBrands, dims])
  const results = useMemo(() => {
    if (!sort) return searchResult.matches
    const direction = sort.direction === 'asc' ? 1 : -1
    return [...searchResult.matches].sort((a, b) => {
      const left = a[sort.key]
      const right = b[sort.key]
      const comparison = sort.key === 'sku' || sort.key === 'brand'
        ? String(left ?? '').localeCompare(String(right ?? ''), 'tr', { numeric: true, sensitivity: 'base' })
        : Number(left ?? 0) - Number(right ?? 0)
      return comparison * direction
    })
  }, [searchResult.matches, sort])
  const searchMs = searchResult.elapsed
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => view === 'table' ? 66 : 210,
    getItemKey: (index) => results[index].id,
    overscan: 5
  })
  const showPrices = settings.show_prices_to_dealers !== false || hasPerm(session.user, 'prices')
  const canShelf = hasPerm(session.user, 'shelf')
  const activeFilters = selectedBrands.length + (inStock ? 1 : 0) + Object.values(dims).filter((value) => value !== null).length
  const cycleSort = (key: 'sku' | 'brand' | 'stock' | 'price'): void => setSort((current) => current?.key !== key ? { key, direction: 'asc' } : current.direction === 'asc' ? { key, direction: 'desc' } : null)
  const setProductView = (next: 'table' | 'card'): void => {
    setView(next)
    virtualizer.measure()
    try { localStorage.setItem('yb2b.productView', next) } catch { /* Storage may be unavailable in private browsing. */ }
    scrollRef.current?.scrollTo({ top: 0 })
  }
  const onOpen = (product: Product): void => { setSelectedProduct(product); setSheet('detail') }
  const column = (key: 'sku' | 'brand' | 'stock' | 'price', label: string, className: string): ReactNode => {
    const current = sort?.key === key ? sort.direction : null
    const Icon = current === 'asc' ? ArrowUp : current === 'desc' ? ArrowDown : ArrowUpDown
    return <div role="columnheader" aria-sort={current === 'asc' ? 'ascending' : current === 'desc' ? 'descending' : 'none'} className={`table-head-cell ${className}`}><button type="button" onClick={() => cycleSort(key)}>{label}<Icon size={12} aria-hidden /></button></div>
  }
  return (
    <div className="page products-page">
      <div className="page-heading"><div><p className="eyebrow">KATALOG</p><h1>Ürünler</h1></div><div className="catalog-heading-actions"><div className="view-toggle" role="group" aria-label="Ürün görünümü"><button className={view === 'table' ? 'active' : ''} onClick={() => setProductView('table')} aria-pressed={view === 'table'}><Table2 size={16} />Tablo</button><button className={view === 'card' ? 'active' : ''} onClick={() => setProductView('card')} aria-pressed={view === 'card'}><LayoutGrid size={16} />Kart</button></div><span className="count-pill">{num(results.length)}</span></div></div>
      <div className="search-row">
        <div className="search-box"><Search size={19} aria-hidden /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kod, marka veya açıklama ara" aria-label="Ürünlerde ara" /><button aria-label="Aramayı temizle" onClick={() => setQuery('')} className="search-clear" hidden={!query}><X size={17} /></button></div>
        <button className={`filter-button${activeFilters ? ' selected' : ''}`} onClick={() => setSheet('filters')} aria-label={`Filtreler${activeFilters ? `, ${activeFilters} seçili` : ''}`}><SlidersHorizontal size={19} />{activeFilters > 0 && <span>{activeFilters}</span>}</button>
      </div>
      <label className="stock-toggle"><input type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} /><span className="switch" /><span>Sadece stoktakiler</span></label>
      <div className="catalog-meta" data-search-ms={searchMs.toFixed(2)}><span>{entries.length ? `${num(results.length)} ürün gösteriliyor` : 'Katalog yükleniyor'}</span><span>{canShelf ? 'Raf bilgisi açık' : ''}</span></div>
      <div className={`catalog-scroll ${view === 'table' ? 'table-view' : 'card-view'}`} ref={scrollRef} role={view === 'table' ? 'table' : undefined} aria-label="Ürün listesi">
        {view === 'table' && <div className={`catalog-table-header ${showPrices ? '' : 'no-price'} ${canShelf ? 'has-shelf' : ''}`} role="row">
          {column('sku', 'Kod', 'sku-col')}{column('brand', 'Marka', 'brand-col')}{column('stock', 'Stok', 'stock-col')}
          <div role="columnheader" className="box-col">Kutu</div>
          {showPrices && column('price', 'Fiyat', 'price-col')}
          {canShelf && <div role="columnheader" className="shelf-col">Raf</div>}
          <div role="columnheader" className="add-col" aria-label="Sepete ekle" />
          <div role="columnheader" className="desc-col">Açıklama</div>
        </div>}
        {loading && entries.length === 0 ? <div className="catalog-skeletons" aria-label="Ürünler yükleniyor">{Array.from({ length: 7 }, (_, i) => <div className="catalog-skeleton" key={i}><i /><i /><i /></div>)}</div> : results.length === 0 ? <div className="empty-state"><PackageSearch size={35} /><strong>Ürün bulunamadı</strong><span>Arama veya filtreleri değiştirebilirsiniz.</span></div> : (
          <div className={view === 'table' ? `virtual-list table-list ${showPrices ? '' : 'no-price'} ${canShelf ? 'has-shelf' : ''}` : 'virtual-list'} style={{ height: virtualizer.getTotalSize() }} role={view === 'table' ? 'rowgroup' : undefined}>
            {virtualizer.getVirtualItems().map((item) => {
              const product = results[item.index]
              return (
                view === 'table'
                  ? <ProductTableRow key={item.key} product={product} settings={settings} showPrices={showPrices} canShelf={canShelf} onOpen={() => onOpen(product)} onToast={onToast} index={item.index} start={item.start} measure={virtualizer.measureElement} />
                  : <div key={item.key} data-index={item.index} ref={virtualizer.measureElement} className="virtual-row" style={{ transform: `translateY(${item.start}px)` }}><ProductCard product={product} settings={settings} showPrices={showPrices} canShelf={canShelf} onOpen={() => onOpen(product)} onToast={onToast} /></div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ProductTableRow({ product, settings, showPrices, canShelf, onOpen, onToast, index, start, measure }: {
  product: Product; settings: Settings; showPrices: boolean; canShelf: boolean; onOpen: () => void; onToast: (message: string) => void; index: number; start: number; measure: (node: Element | null) => void
}): ReactNode {
  const cart = useCart()
  const stockClass = product.stock <= 0 ? 'out' : product.stock <= settings.low_stock_threshold ? 'low' : 'ok'
  const box = product.box.trim()
  const boxNormalized = normalize(box).toLowerCase()
  const boxClass = boxNormalized.includes('kutulu') && boxNormalized.includes('kutusuz') ? 'mixed' : boxNormalized.includes('kutusuz') ? 'kutusuz' : boxNormalized.includes('kutulu') ? 'kutulu' : 'unknown'
  const dimensions = [product.d_inner, product.d_outer, product.width]
  const add = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation()
    cart.add({ ...product, min_order: Math.max(1, product.min_order) }, Math.max(1, product.min_order))
    onToast(`${product.sku} sepete eklendi.`)
  }
  return <div key={product.id} ref={measure} data-index={index} role="row" tabIndex={0} aria-label={`${product.sku}, ${product.brand}, ayrıntıları aç`} onClick={onOpen} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onOpen() } }} className={`catalog-table-row ${showPrices ? '' : 'no-price'} ${canShelf ? 'has-shelf' : ''}`} style={{ transform: `translateY(${start}px)` }}>
    <div role="cell" className="sku-col"><strong className="table-sku">{product.sku}</strong><div className="sku-subline"><span className={`box-badge ${boxClass}`}>{box || 'Kutu bilgisi yok'}</span>{dimensions.some((value) => value !== null) && <small>{dimensions.map((value) => value === null ? '—' : num(value)).join('×')} mm</small>}</div></div>
    <div role="cell" className="brand-col" title={product.brand}>{product.brand || '—'}</div>
    <div role="cell" className="stock-col"><span className={`stock-badge ${stockClass}`}>{num(product.stock)}</span></div>
    <div role="cell" className="box-col"><span className={`box-badge ${boxClass}`}>{box || '—'}</span></div>
    {showPrices && <div role="cell" className="price-col">{displayPrice(product.price, product.currency)}</div>}
    {canShelf && <div role="cell" className="shelf-col" title={product.shelf}>{product.shelf || '—'}</div>}
    <div role="cell" className="add-col"><button type="button" aria-label={`${product.sku} sepete ekle`} onClick={add}><span className="cart-plus-icon"><ShoppingCart size={17} /><Plus size={10} /></span></button></div>
    <div role="cell" className="desc-col" title={product.description}>{product.description || '—'}</div>
  </div>
}

function ProductCard({ product, settings, showPrices, canShelf, onOpen, onToast }: {
  product: Product; settings: Settings; showPrices: boolean; canShelf: boolean; onOpen: () => void; onToast: (message: string) => void
}): ReactNode {
  const cart = useCart()
  const [qty, setQty] = useState(Math.max(1, product.min_order))
  const threshold = settings.low_stock_threshold
  const stockClass = product.stock <= 0 ? 'out' : product.stock <= threshold ? 'low' : 'ok'
  const box = product.box.trim()
  const normalizedBox = normalize(box).toLowerCase()
  const boxClass = normalizedBox.includes('kutulu') && normalizedBox.includes('kutusuz')
    ? 'mixed'
    : normalizedBox.includes('kutusuz')
      ? 'kutusuz'
      : normalizedBox.includes('kutulu')
        ? 'kutulu'
        : 'unknown'
  const add = (): void => {
    cart.add({ ...product, min_order: Math.max(1, product.min_order) }, qty)
    onToast(`${product.sku} sepete eklendi.`)
  }
  return (
    <article className="product-card">
      <button type="button" className="product-main" onClick={onOpen} aria-label={`${product.sku}, ${product.brand} ürün ayrıntıları`}>
        <div className="product-topline"><strong className="product-sku">{product.sku}</strong><span className={`stock-badge ${stockClass}`}>{num(product.stock)} <small>{product.unit || 'Adet'}</small></span></div>
        <div className="product-brand">{product.brand || 'Marka belirtilmemiş'}</div>
        {(product.d_inner !== null || product.d_outer !== null || product.width !== null) && <div className="product-dims">{num(product.d_inner)} × {num(product.d_outer)} × {num(product.width)} <small>mm</small></div>}
        <div className="product-flags"><span className={`box-badge ${boxClass}`} title={box || undefined}>{box || 'Kutu bilgisi yok'}</span>{canShelf && product.shelf && <span className="shelf-badge">Raf {product.shelf}</span>}</div>
        {product.description && <p className="product-description">{product.description}</p>}
        {showPrices && <strong className="product-price">{displayPrice(product.price, product.currency)}</strong>}
      </button>
      <div className="product-actions">
        <div className="quantity-stepper" role="group" aria-label={`${product.sku} miktarı`}>
          <button type="button" aria-label="Miktarı azalt" onClick={() => setQty((value) => Math.max(product.min_order, value - Math.max(1, product.min_order)))}><Minus size={16} /></button>
          <input aria-label={`${product.sku} miktarı`} inputMode="numeric" value={qty} onChange={(event) => setQty(Math.max(Math.max(1, product.min_order), Number(event.target.value.replace(/\D/g, '')) || 1))} />
          <button type="button" aria-label="Miktarı artır" onClick={() => setQty((value) => value + Math.max(1, product.min_order))}><Plus size={16} /></button>
        </div>
        <button type="button" className="button add-button" onClick={add}><ShoppingCart size={17} /> Sepete ekle</button>
      </div>
    </article>
  )
}

function FilterSheet({ entries, initialBrands, initialDimensions, onApply, onClose }: {
  entries: SearchEntry[]
  initialBrands: string[]
  initialDimensions: DimensionFilters
  onApply: (brands: string[], dimensions: DimensionFilters) => void
  onClose: () => void
}): ReactNode {
  const [brandQuery, setBrandQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(initialBrands))
  const [showAllBrands, setShowAllBrands] = useState(false)
  const [ranges, setRanges] = useState({
    dMin: String(initialDimensions.dMin ?? ''),
    dMax: String(initialDimensions.dMax ?? ''),
    DMin: String(initialDimensions.DMin ?? ''),
    DMax: String(initialDimensions.DMax ?? ''),
    bMin: String(initialDimensions.bMin ?? ''),
    bMax: String(initialDimensions.bMax ?? '')
  })
  const brandCounts = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>()
    for (const entry of entries) {
      if (!entry.brand) continue
      const brand = counts.get(entry.brand)
      if (brand) brand.count++
      else counts.set(entry.brand, { label: entry.product.brand, count: 1 })
    }
    return [...counts.entries()].sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label, 'tr'))
  }, [entries])
  const filteredBrands = brandCounts.filter(([key, value]) => selected.has(key) || value.label.toLocaleLowerCase('tr-TR').includes(brandQuery.toLocaleLowerCase('tr-TR')))
  const pinnedBrands = filteredBrands.filter(([key]) => selected.has(key))
  const unselectedBrands = filteredBrands.filter(([key]) => !selected.has(key))
  const visibleBrands = showAllBrands
    ? filteredBrands
    : [...pinnedBrands, ...unselectedBrands.slice(0, Math.max(0, 12 - pinnedBrands.length))]
  const hiddenBrandCount = unselectedBrands.length - (visibleBrands.length - pinnedBrands.length)
  const setProductsFilter = (): void => {
    const numValue = (value: string): number | null => {
      if (!value.trim()) return null
      const number = Number(value.replace(',', '.'))
      return Number.isFinite(number) ? number : null
    }
    const dims = { dMin: numValue(ranges.dMin), dMax: numValue(ranges.dMax), DMin: numValue(ranges.DMin), DMax: numValue(ranges.DMax), bMin: numValue(ranges.bMin), bMax: numValue(ranges.bMax) }
    onApply([...selected], dims)
    onClose()
  }
  const clear = (): void => {
    setSelected(new Set())
    setRanges({ dMin: '', dMax: '', DMin: '', DMax: '', bMin: '', bMax: '' })
    onApply([], { dMin: null, dMax: null, DMin: null, DMax: null, bMin: null, bMax: null })
    onClose()
  }
  return (
    <Sheet title="Filtreler" onClose={onClose}>
      <section className="filter-section"><h3>Marka</h3><div className="sheet-search"><Search size={16} /><input value={brandQuery} onChange={(event) => setBrandQuery(event.target.value)} placeholder="Marka ara" aria-label="Markalarda ara" /></div>
        <div className="brand-options">{visibleBrands.map(([key, value]) => <label key={key} className="brand-option"><input type="checkbox" checked={selected.has(key)} onChange={(event) => setSelected((prev) => { const next = new Set(prev); if (event.target.checked) next.add(key); else next.delete(key); return next })} /><span>{value.label}</span><small>{num(value.count)}</small></label>)}</div>
        {(hiddenBrandCount > 0 || showAllBrands) && <button type="button" className="show-more-brands" onClick={() => setShowAllBrands((value) => !value)}>{showAllBrands ? 'Daha az göster' : `Tümünü göster (+${num(hiddenBrandCount)})`}</button>}
      </section>
      <section className="filter-section"><h3>Ölçü aralığı <small>mm</small></h3><div className="measure-grid">{([
        ['İç çap (d)', 'dMin', 'dMax'], ['Dış çap (D)', 'DMin', 'DMax'], ['Genişlik (B)', 'bMin', 'bMax']
      ] as const).map(([label, minKey, maxKey]) => <div className="range-group" key={minKey}><span>{label}</span><div className="range-inputs"><input aria-label={`${label} en az`} type="number" inputMode="decimal" placeholder="Min" value={ranges[minKey]} onChange={(event) => setRanges((prev) => ({ ...prev, [minKey]: event.target.value }))} /><input aria-label={`${label} en çok`} type="number" inputMode="decimal" placeholder="Maks" value={ranges[maxKey]} onChange={(event) => setRanges((prev) => ({ ...prev, [maxKey]: event.target.value }))} /></div></div>)}</div></section>
      <div className="sheet-actions"><button className="button secondary" onClick={clear}>Temizle</button><button className="button primary" onClick={setProductsFilter}>Sonuçları göster</button></div>
    </Sheet>
  )
}

function ProductDetail({ product, settings, session, onClose, onToast }: {
  product: Product; settings: Settings; session: Session; onClose: () => void; onToast: (message: string) => void
}): ReactNode {
  const cart = useCart()
  const showPrices = settings.show_prices_to_dealers !== false || hasPerm(session.user, 'prices')
  const canShelf = hasPerm(session.user, 'shelf')
  const [qty, setQty] = useState(Math.max(1, product.min_order))
  const normalizedBox = normalize(product.box).toLowerCase()
  const boxClass = normalizedBox.includes('kutulu') && normalizedBox.includes('kutusuz')
    ? 'mixed'
    : normalizedBox.includes('kutusuz')
      ? 'kutusuz'
      : normalizedBox.includes('kutulu')
        ? 'kutulu'
        : 'unknown'
  const dimensionValues = [product.d_inner, product.d_outer, product.width]
  const hasDimensions = dimensionValues.some((value) => value !== null)
  const dimensionText = dimensionValues.map((value) => value === null ? '—' : num(value)).join(' × ')
  const copy = async (): Promise<void> => {
    const value = productsToTsv([product], { canShelf, showPrices })
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.append(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
    onToast('Ürün bilgisi kopyalandı.')
  }
  return (
    <Sheet title="Ürün bilgisi" onClose={onClose}>
      <div className="detail-product-header">
        <div className="detail-heading"><strong className="product-sku">{product.sku}</strong><button className="button secondary compact" onClick={() => void copy()}><Copy size={16} /> Kopyala</button></div>
        {product.brand.trim() && <strong className="detail-product-brand">{product.brand}</strong>}
        <div className="detail-product-badges"><span className={`stock-badge ${product.stock <= 0 ? 'out' : product.stock <= settings.low_stock_threshold ? 'low' : 'ok'}`}>{num(product.stock)} {product.unit || 'Adet'}</span>{product.box.trim() && <span className={`box-badge ${boxClass}`}>{product.box}</span>}</div>
      </div>
      <dl className="detail-list">
        {product.name.trim() && normalize(product.name) !== normalize(product.sku) && <DetailRow label="Ürün adı" value={product.name} />}
        {hasDimensions && <DetailRow label="Ölçü d × D × B" value={`${dimensionText} mm`} />}
        {product.min_order > 0 && <DetailRow label="Min. sipariş" value={`${num(product.min_order)} ${product.unit || 'Adet'}`} />}
        {canShelf && <DetailRow label="Raf" value={product.shelf} />}
        {showPrices && <DetailRow label="Fiyat" value={displayPrice(product.price, product.currency)} />}
        {product.list_price !== null && showPrices && <DetailRow label="Liste fiyatı" value={displayPrice(product.list_price, product.currency)} />}
        <DetailRow label="Kategori" value={product.category} />
        <DetailRow label="Tip" value={product.type} />
        <DetailRow label="Keçe" value={product.seal} />
        <DetailRow label="Barkod" value={product.barcode} />
        <DetailRow label="Eşdeğerler" value={product.equivalents} />
        <DetailRow label="Açıklama" value={product.description} />
      </dl>
      <div className="product-actions detail-actions">
        <QuantityStepper qty={qty} setQty={setQty} min={Math.max(1, product.min_order)} sku={product.sku} />
        <button className="button primary" onClick={() => { cart.add(product, qty); onToast(`${product.sku} sepete eklendi.`); onClose() }}><ShoppingCart size={18} /> Sepete ekle</button>
      </div>
    </Sheet>
  )
}

function DetailRow({ label, value }: { label: string; value: string }): ReactNode {
  const normalized = value.trim().toLocaleLowerCase('tr-TR')
  if (!normalized || ['belirtilmemiş', 'yok', 'açıklama yok'].includes(normalized)) return null
  return <div className="detail-row"><dt>{label}</dt><dd>{value}</dd></div>
}

function QuantityStepper({ qty, setQty, min, sku }: { qty: number; setQty: (value: number) => void; min: number; sku: string }): ReactNode {
  return <div className="quantity-stepper" role="group" aria-label={`${sku} miktarı`}><button type="button" aria-label="Miktarı azalt" onClick={() => setQty(Math.max(min, qty - min))}><Minus size={16} /></button><input aria-label={`${sku} miktarı`} inputMode="numeric" value={qty} onChange={(event) => setQty(Math.max(min, Number(event.target.value.replace(/\D/g, '')) || min))} /><button type="button" aria-label="Miktarı artır" onClick={() => setQty(qty + min)}><Plus size={16} /></button></div>
}

function CartPage({ session, settings, customers, products, online, onToast, onOrderCreated, onViewOrders }: {
  session: Session; settings: Settings; customers: Customer[]; products: Product[]; online: boolean; onToast: (message: string) => void; onOrderCreated: () => void; onViewOrders: () => void
}): ReactNode {
  const cart = useCart()
  const [busy, setBusy] = useState(false)
  const [successOrder, setSuccessOrder] = useState<Order | null>(null)
  const busyRef = useRef(false)
  const isDealer = session.user.role !== 'admin'
  const customer = isDealer ? session.customer : customers.find((item) => item.id === cart.customerId) ?? null
  const showPrices = settings.show_prices_to_dealers !== false || hasPerm(session.user, 'prices')
  const currency = cart.lines[0]?.currency ?? customer?.currency ?? settings.default_currency ?? 'TRY'
  const mixedCurrency = cart.lines.some((line) => line.currency !== currency)
  const discountPct = customer?.discount_pct ?? 0
  const lineUnit = (line: (typeof cart.lines)[number]): number => priceFor(cart.payment, line.unit_price, line.card_price, settings.card_price_pct)
  const gross = cart.lines.reduce((total, line) => total + line.qty * lineUnit(line), 0)
  const subtotal = gross * (1 - discountPct / 100)
  const vat = subtotal * (settings.vat_pct / 100)
  const total = subtotal + vat
  useEffect(() => { cart.refresh(products) }, [products])
  const submit = async (): Promise<void> => {
    if (busyRef.current || !cart.lines.length) return
    if (!online) return onToast('Sipariş oluşturmak için internet bağlantısı gerekir.')
    if (!isDealer && !cart.customerId) return onToast('Lütfen bir bayi/müşteri seçin.')
    if (mixedCurrency) return onToast('Sepette farklı para birimleri var; tek para birimiyle sipariş oluşturun.')
    busyRef.current = true
    setBusy(true)
    try {
      const order = await createOrder({
        customer_id: isDealer ? session.user.customer_id : cart.customerId,
        note: cart.note,
        payment: cart.payment,
        currency,
        vat_pct: settings.vat_pct,
        items: cart.lines.map((line) => ({
          product_id: line.product_id,
          sku: line.sku,
          name: line.name,
          qty: line.qty,
          unit_price: lineUnit(line),
          discount_pct: discountPct
        }))
      })
      cart.clear()
      setSuccessOrder(order)
      onOrderCreated()
    } catch (error) {
      onToast(userFacingError(error))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  if (successOrder) return (
    <div className="page success-page">
      <PageTitle title="Sipariş oluşturuldu" />
      <section className="success-card card">
        <div className="success-mark"><Check size={30} /></div>
        <h2>Siparişiniz alındı</h2>
        <p>Sipariş numaranız</p>
        <strong className="success-order-no">{successOrder.order_no}</strong>
        <span className={`status-pill status-${successOrder.status}`}>{STATUS_LABEL[successOrder.status]}</span>
        <button className="button primary wide" onClick={onViewOrders}>Siparişlerime git</button>
        <button className="button secondary wide" onClick={() => useApp.getState().setTab('products')}>Yeni sipariş</button>
      </section>
    </div>
  )
  if (!cart.lines.length) return <div className="page"><PageTitle title="Sepet" /><div className="empty-state card"><ShoppingCart size={38} /><strong>Sepetiniz boş</strong><span>Ürünler sayfasından ürün ekleyebilirsiniz.</span><button className="button primary" onClick={() => useApp.getState().setTab('products')}>Ürünlere git</button></div></div>
  return (
    <div className="page cart-page">
      <PageTitle title="Sepet" />
      <div className="cart-lines">{cart.lines.map((line) => (
        <article className="cart-line card" key={line.product_id}>
          <div className="cart-line-head"><div><strong className="product-sku">{line.sku}</strong><span className="cart-brand">{line.brand}</span></div><button className="icon-button danger-icon" onClick={() => cart.remove(line.product_id)} aria-label={`${line.sku} sepetten çıkar`}><Trash2 size={19} /></button></div>
          {line.name.trim() && normalize(line.name) !== normalize(line.sku) && <div className="cart-line-name">{line.name}</div>}
          {line.qty > line.stock && <span className="stock-warning">Stokta {num(line.stock)} {line.stock === 1 ? 'adet' : 'adet'} var</span>}
          <div className="cart-line-bottom"><QuantityStepper qty={line.qty} setQty={(qty) => cart.setQty(line.product_id, qty)} min={line.min_order} sku={line.sku} />{showPrices && <strong>{displayPrice(lineUnit(line) * line.qty, line.currency)}</strong>}</div>
        </article>
      ))}</div>
      <section className="card checkout-card">
        {!isDealer && <label className="field-label">Bayi / Müşteri<select value={cart.customerId ?? ''} onChange={(event) => cart.setCustomer(event.target.value ? Number(event.target.value) : null)}><option value="">Seçin</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.discount_pct ? ` · %${num(customer.discount_pct)}` : ''}</option>)}</select></label>}
        <fieldset className="payment-field"><legend>Ödeme şekli</legend><div className="payment-options"><label><input type="radio" name="payment" checked={cart.payment === 'pesin'} onChange={() => cart.setPayment('pesin')} /> Peşin</label><label><input type="radio" name="payment" checked={cart.payment === 'kart'} onChange={() => cart.setPayment('kart')} /> Kart</label></div></fieldset>
        <label className="field-label">Sipariş notu<textarea value={cart.note} onChange={(event) => cart.setNote(event.target.value)} rows={2} placeholder="Varsa teslimat notu" /></label>
        {showPrices && <dl className="totals">
          <div><dt>Ara toplam</dt><dd>{money(gross, currency)}</dd></div>
          {discountPct > 0 && <div><dt>Bayi indirimi (%{num(discountPct)})</dt><dd>−{money(gross - subtotal, currency)}</dd></div>}
          <div><dt>KDV (%{num(settings.vat_pct)})</dt><dd>{money(vat, currency)}</dd></div>
          <div className="total-row"><dt>Genel toplam</dt><dd>{money(total, currency)}</dd></div>
        </dl>}
        {!online && <p className="inline-warning"><WifiOff size={16} /> Sipariş vermek için internet bağlantısı gerekir.</p>}
        {mixedCurrency && <p className="inline-warning">Sepette farklı para birimleri var. Tek para birimiyle sipariş oluşturun.</p>}
        <button className="text-button" onClick={() => cart.clear()}><Trash2 size={16} /> Sepeti boşalt</button>
      </section>
      <div className="cart-sticky-summary">
        <div className="cart-summary-copy">
          {showPrices && <span className="cart-summary-breakdown">Ara toplam {money(gross, currency)} · KDV {money(vat, currency)}</span>}
          <span className="cart-summary-label">Genel toplam</span>
          <strong>{showPrices ? money(total, currency) : '—'}</strong>
        </div>
        <button className="button primary" disabled={busy || !online || mixedCurrency} onClick={() => void submit()}><Send size={17} />{busy ? 'Gönderiliyor…' : 'Siparişi gönder'}</button>
      </div>
    </div>
  )
}

function OrdersPage({ settings, refreshKey, selectedOrderId, onSelectOrder, onRefresh }: {
  settings: Settings; refreshKey: number; selectedOrderId: number | null; onSelectOrder: (id: number) => void; onRefresh: () => void
}): ReactNode {
  const session = useApp((state) => state.session)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const showPrices = settings.show_prices_to_dealers !== false || hasPerm(session?.user, 'prices')
  useEffect(() => {
    let active = true
    setLoading(true)
    void listOrders().then((data) => { if (active) { setOrders(data); setError('') } }).catch((reason) => { if (active) setError(userFacingError(reason)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refreshKey])
  return (
    <div className="page orders-page">
      <div className="page-heading"><PageTitle title="Siparişler" /><button className="icon-button" onClick={onRefresh} aria-label="Siparişleri yenile"><RefreshCw size={19} /></button></div>
      {loading && <div className="order-skeletons" aria-label="Siparişler yükleniyor">{Array.from({ length: 4 }, (_, i) => <div className="order-skeleton card" key={i}><i /><i /><i /></div>)}</div>}
      {error && <p className="inline-warning" role="alert">{error}</p>}
      {!loading && !error && orders.length === 0 && <div className="empty-state card"><ClipboardList size={36} /><strong>Henüz sipariş yok</strong><span>Oluşturduğunuz siparişleri burada görebilirsiniz.</span></div>}
      <div className="order-list">{orders.map((order) => (
        <button className="order-card card" key={order.id} onClick={() => onSelectOrder(order.id)}>
          <div className="order-card-top"><strong>{order.order_no}</strong><span className={`status-pill status-${order.status}`}>{STATUS_LABEL[order.status]}</span></div>
          <div className="order-card-meta"><span>{new Date(order.created_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</span>{session?.user.role === 'admin' && <span>{order.customer_name}</span>}</div>
          <div className="order-card-bottom"><span>{order.payment === 'kart' ? 'Kart' : 'Peşin'} · {(order as Order & { item_count?: number }).item_count ?? '—'} kalem</span>{showPrices && <strong>{money(order.total, order.currency)}</strong>}</div>
          {selectedOrderId === order.id && <span className="sr-only">Seçili</span>}
        </button>
      ))}</div>
    </div>
  )
}

function OrderDetail({ id, settings, onClose }: { id: number; settings: Settings; onClose: () => void }): ReactNode {
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const session = useApp((state) => state.session)
  const showPrices = settings.show_prices_to_dealers !== false || hasPerm(session?.user, 'prices')
  useEffect(() => {
    let active = true
    void getOrder(id).then((value) => { if (active) setOrder(value) }).catch((reason) => { if (active) setError(userFacingError(reason)) })
    return () => { active = false }
  }, [id])
  return (
    <Sheet title="Sipariş ayrıntısı" onClose={onClose}>
      {!order && !error && <p className="muted">Sipariş yükleniyor…</p>}
      {error && <p className="error-text">{error}</p>}
      {order && <>
        <div className="order-detail-head"><strong>{order.order_no}</strong><span className={`status-pill status-${order.status}`}>{STATUS_LABEL[order.status]}</span></div>
        <p className="muted">{new Date(order.created_at).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })}</p>
        {order.note && <p className="order-note">{order.note}</p>}
        <div className="detail-order-lines">{(order.items ?? []).map((item) => <div className="detail-order-item" key={item.id}><div><strong className="product-sku">{item.sku}</strong><span>{item.name}</span></div><span>{num(item.qty)} adet</span>{showPrices && <strong>{money(item.line_total, order.currency)}</strong>}</div>)}</div>
        {showPrices && (
          <dl className="totals">
            <div><dt>Ara toplam</dt><dd>{money(order.subtotal + order.discount, order.currency)}</dd></div>
            {order.discount > 0 && <div><dt>İndirim</dt><dd>−{money(order.discount, order.currency)}</dd></div>}
            <div><dt>KDV ({num(order.vat_pct)}%)</dt><dd>{money(order.vat, order.currency)}</dd></div>
            <div className="total-row"><dt>Genel toplam</dt><dd>{money(order.total, order.currency)}</dd></div>
          </dl>
        )}
      </>}
    </Sheet>
  )
}

function AccountPage({ session, lastSync, syncBusy, platform, onSync, onCheckUpdate, onLogout }: {
  session: Session; lastSync: string | null; syncBusy: boolean; platform: string; onSync: () => void; onCheckUpdate: () => void; onLogout: () => void
}): ReactNode {
  return (
    <div className="page account-page">
      <PageTitle title="Hesap" />
      <section className="profile-card card">
        <div className="profile-avatar">{(session.user.display_name || session.user.username).charAt(0).toLocaleUpperCase('tr-TR')}</div>
        <div><strong>{session.user.display_name || session.user.username}</strong><span>{session.customer?.name ?? (session.user.role === 'admin' ? 'Yönetici' : session.user.role === 'ara' ? 'Ara kullanıcı' : 'Bayi')}</span></div>
      </section>
      <section className="card account-list">
        {session.customer?.code && <InfoRow label="Cari kodu" value={session.customer.code} />}
        {session.customer?.phone && <InfoRow label="Telefon" value={session.customer.phone} />}
        <InfoRow label="Kullanıcı adı" value={session.user.username} />
        <InfoRow label="Son eşitleme" value={timeLabel(lastSync)} />
        <InfoRow label="Uygulama sürümü" value={APP_VERSION} />
      </section>
      <div className="account-actions">
        <button className="button secondary wide" onClick={onSync} disabled={syncBusy}><RefreshCw size={18} className={syncBusy ? 'spin' : ''} />{syncBusy ? 'Eşitleniyor…' : 'Şimdi eşitle'}</button>
        {platform === 'android' && <button className="button secondary wide" onClick={onCheckUpdate}><Download size={18} /> Güncellemeleri kontrol et</button>}
        {platform === 'ios' && <p className="update-platform-note">App Store'dan güncellenir</p>}
        <button className="button danger wide" onClick={onLogout}>Çıkış yap</button>
      </div>
      <p className="version-note">Yamansa Rulman B2B · {APP_VERSION}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }): ReactNode {
  return <div className="info-row"><span>{label}</span><strong>{value}</strong></div>
}

function UpdateSheet({ update, onClose }: { update: AndroidUpdate; onClose: () => void }): ReactNode {
  return <Sheet title="Güncelleme var" onClose={onClose}><div className="update-content"><div className="update-icon"><Download size={25} /></div><h2>Yeni sürüm {update.version}</h2><p>Uygulamanın yeni sürümü hazır.</p>{update.notes && <div className="release-notes">{update.notes.slice(0, 900)}</div>}<button className="button primary wide" onClick={() => external(update.url)}><Download size={18} /> İndir</button></div></Sheet>
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }): ReactNode {
  return (
    <div className="sheet-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="bottom-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" />
        <div className="sheet-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Kapat"><X size={21} /></button></div>
        <div className="sheet-body">{children}</div>
      </section>
    </div>
  )
}

function PageTitle({ title }: { title: string }): ReactNode {
  return <div className="page-title"><h1>{title}</h1></div>
}
