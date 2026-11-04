import type { ActivityKind, ActivityPlatform, ActivityRow, ActivitySummary, StockLogRow, TrafficSource } from '@shared/types'
import type { Customer, User } from '@shared/types'
import { CalendarDays, Eye, Globe, LogIn, Monitor, PackageCheck, RefreshCw, Search, ShoppingCart, Smartphone } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { api, onEvent } from '@/lib/api'
import { LoadError } from '@/components/ui'
import { useApp } from '@/store/app'
import { TrafficView } from './TrafficView'

type Tab = 'activity' | 'stock'
const kinds: [ActivityKind, string][] = [['login', 'Giriş'], ['search', 'Arama'], ['product_view', 'Ürün görüntüleme'], ['cart_add', 'Sepete ekleme'], ['order', 'Sipariş']]
const platforms: [ActivityPlatform, string][] = [['windows', 'Windows'], ['android', 'Android'], ['ios', 'iPhone'], ['web', 'Web']]
const sources: [string, string][] = [['order', 'Sipariş'], ['order_status', 'Sipariş durumu'], ['merge', 'Birleştirme'], ['stock_screen', 'Stok yönetimi'], ['adjust', 'Stok düzeltme'], ['new_product', 'Yeni ürün'], ['manual', 'Elle / Excel']]
const sourceTabs: [TrafficSource, string][] = [['all', 'Genel'], ['app', 'Yamansa Rulman Uygulama'], ['yamansarulman', 'Yamansa Rulman Web'], ['rulmansitesi', 'Rulman Sitesi Web'], ['teknikkesici', 'Teknik Kesici Web']]
const kindIcons = { login: LogIn, search: Search, product_view: Eye, cart_add: ShoppingCart, order: PackageCheck }
const dateText = (value: string): string => {
  const d = new Date(value)
  const p = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)
  const part = Object.fromEntries(p.map((x) => [x.type, x.value]))
  return `${part.day}.${part.month}.${part.year} ${part.hour}:${part.minute}`
}
const timeText = (value: string): string => new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value))
const dayKey = (date: Date): string => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
const dayLabel = (date: Date): string => {
  const today = new Date()
  if (dayKey(date) === dayKey(today)) return 'Bugün'
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (dayKey(date) === dayKey(yesterday)) return 'Dün'
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }).format(date)
}
type DayGroup<T extends { at: string }> = { key: string; label: string; rows: T[] }
const groupByDay = <T extends { at: string }>(rows: T[]): DayGroup<T>[] => {
  const groups: DayGroup<T>[] = []
  for (const row of rows) {
    const date = new Date(row.at)
    const key = dayKey(date)
    const last = groups.at(-1)
    if (last?.key === key) last.rows.push(row)
    else groups.push({ key, label: dayLabel(date), rows: [row] })
  }
  return groups
}
const sourceName = (source: string): string => sources.find(([key]) => key === source)?.[1] ?? 'Hızlı giriş'
const activityText = (row: ActivityRow): string => {
  const product = [row.sku, row.brand].filter(Boolean).join(' · ')
  if (row.kind === 'login') return row.detail?.restored === true ? 'Uygulamayı açtı' : 'Giriş yaptı'
  if (row.kind === 'search') return `“${row.query}” aradı`
  if (row.kind === 'product_view') return `${product || 'Ürüne'} baktı`
  if (row.kind === 'cart_add') return `${product || 'Ürün'} sepete ekledi (${row.qty ?? 1} adet)`
  return `${String(row.detail?.order_no ?? `Sipariş #${row.order_id ?? ''}`)} siparişini verdi`
}
const PlatformIcon = ({ platform }: { platform: ActivityPlatform }): ReactNode =>
  platform === 'windows' ? <Monitor size={15} /> : platform === 'web' ? <Globe size={15} /> : <Smartphone size={15} />
const ActivityKindBadge = ({ kind }: { kind: ActivityKind }): ReactNode => {
  const Icon = kindIcons[kind]
  return <span className={`activity-kind-badge activity-kind-${kind}`} aria-hidden="true"><Icon size={14} /></span>
}

export function ActivityLogs(): ReactNode {
  const toast = useApp((s) => s.toast)
  const [sourceTab, setSourceTab] = useState<TrafficSource>('all')
  const [tab, setTab] = useState<Tab>('activity')
  const [users, setUsers] = useState<User[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [userId, setUserId] = useState('')
  const [kind, setKind] = useState('')
  const [platform, setPlatform] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [text, setText] = useState('')
  const [debouncedText, setDebouncedText] = useState('')
  const [sku, setSku] = useState('')
  const [source, setSource] = useState('')
  const [activityOffset, setActivityOffset] = useState(0)
  const [stockOffset, setStockOffset] = useState(0)
  const [activityHasMore, setActivityHasMore] = useState(false)
  const [stockHasMore, setStockHasMore] = useState(false)
  const [activityRefresh, setActivityRefresh] = useState(0)
  const [stockRefresh, setStockRefresh] = useState(0)
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [stock, setStock] = useState<StockLogRow[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [stockLoading, setStockLoading] = useState(true)
  const [summary, setSummary] = useState<ActivitySummary | null>(null)
  const [activityError, setActivityError] = useState('')
  const [stockError, setStockError] = useState('')
  const activityGroups = useMemo(() => groupByDay(activity), [activity])
  const stockGroups = useMemo(() => groupByDay(stock), [stock])
  useEffect(() => {
    if (sourceTab !== 'app') return
    void api('activity:open', undefined)
    api('users:list', undefined).then(setUsers).catch((e) => toast(e.message, 'error'))
    api('customers:list', {}).then(setCustomers).catch(() => undefined)
  }, [sourceTab])
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedText(text.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [text])
  useEffect(() => {
    setActivityOffset(0)
    setActivityHasMore(false)
  }, [userId, kind, platform, from, to, debouncedText])
  useEffect(() => {
    setStockOffset(0)
    setStockHasMore(false)
  }, [userId, from, to, sku, source])
  useEffect(() => {
    if (sourceTab !== 'app' || tab !== 'activity') return
    let cancelled = false
    setActivityError('')
    setActivityLoading(true)
    api('activity:list', { userId: userId || undefined, kind: (kind || undefined) as ActivityKind | undefined, platform: (platform || undefined) as ActivityPlatform | undefined, from: from || undefined, to: to || undefined, text: debouncedText || undefined, offset: activityOffset, limit: 50 })
      .then((page) => { if (!cancelled) { setActivity((prev) => activityOffset ? [...prev, ...page.rows] : page.rows); setActivityHasMore(page.hasMore); setActivityLoading(false) } })
      .catch((e) => { if (!cancelled) { setActivityError((e as Error).message || 'Hareketler alınamadı.'); setActivityLoading(false) } })
    return () => { cancelled = true }
  }, [sourceTab, tab, userId, kind, platform, from, to, debouncedText, activityOffset, activityRefresh])
  useEffect(() => {
    if (sourceTab !== 'app' || tab !== 'stock') return
    let cancelled = false
    setStockError('')
    setStockLoading(true)
    api('stock:log', { sku: sku || undefined, userId: userId || undefined, source: source || undefined, from: from || undefined, to: to || undefined, offset: stockOffset, limit: 50 })
      .then((page) => { if (!cancelled) { setStock((prev) => stockOffset ? [...prev, ...page.rows] : page.rows); setStockHasMore(page.hasMore); setStockLoading(false) } })
      .catch((e) => { if (!cancelled) { setStockError((e as Error).message || 'Stok hareketleri alınamadı.'); setStockLoading(false) } })
    return () => { cancelled = true }
  }, [sourceTab, tab, sku, userId, source, from, to, stockOffset, stockRefresh])
  useEffect(() => {
    if (sourceTab !== 'app' || !userId) { setSummary(null); return }
    let cancelled = false
    setSummary(null)
    api('activity:summary', userId).then((value) => { if (!cancelled) setSummary(value) }).catch((e) => toast(e.message, 'error'))
    return () => { cancelled = true }
  }, [sourceTab, userId, activityRefresh])
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (sourceTab !== 'app' || document.visibilityState !== 'visible') return
      if (tab === 'activity' && activityOffset === 0) setActivityRefresh((value) => value + 1)
      if (tab === 'stock' && stockOffset === 0) setStockRefresh((value) => value + 1)
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [sourceTab, tab, activityOffset, stockOffset])
  const companyById = useMemo(() => new Map(customers.map((customer) => [customer.id, customer.name])), [customers])
  const filterPerson = <select className="select sm activity-person-filter" aria-label="Kişi filtresi" value={userId} onChange={(e) => setUserId(e.target.value)}><option value="">Tüm kişiler</option>{users.map((u) => <option key={u.id} value={u.id}>{u.display_name || u.username}{u.customer_id ? ` · ${companyById.get(u.customer_id) ?? ''}` : ''}</option>)}</select>
  const dateFilters = <><label className="activity-date"><CalendarDays size={14} /><input className="input sm" type="date" aria-label="Başlangıç tarihi" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="activity-date"><CalendarDays size={14} /><input className="input sm" type="date" aria-label="Bitiş tarihi" value={to} onChange={(e) => setTo(e.target.value)} /></label></>
  const refresh = (): void => {
    if (tab === 'activity') {
      setActivityOffset(0)
      setActivityRefresh((value) => value + 1)
    } else {
      setStockOffset(0)
      setStockRefresh((value) => value + 1)
    }
  }
  useEffect(() => {
    const reload = (): void => {
      if (sourceTab === 'app') refresh()
    }
    window.addEventListener('online', reload)
    const offSync = onEvent('sync:changed', reload)
    return () => {
      window.removeEventListener('online', reload)
      offSync()
    }
  }, [sourceTab, tab])
  const selectedUser = users.find((user) => user.id === userId)
  const stockHasFilters = Boolean(sku.trim() || userId || source || from || to)
  const hasMore = tab === 'activity' ? activityHasMore : stockHasMore
  const onSourceKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const index = sourceTabs.findIndex(([key]) => key === sourceTab)
    const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + sourceTabs.length) % sourceTabs.length
    setSourceTab(sourceTabs[next][0])
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }
  return <section className="activity-page">
    <div className="tabs traffic-source-tabs" role="tablist" aria-label="Hareket kaynağı" onKeyDown={onSourceKeyDown}>
      {sourceTabs.map(([key, label]) => <button className="tab" type="button" role="tab" aria-selected={sourceTab === key} tabIndex={sourceTab === key ? 0 : -1} key={key} onClick={() => setSourceTab(key)}>{label}</button>)}
    </div>
    {sourceTab === 'all' || sourceTab === 'yamansarulman' || sourceTab === 'rulmansitesi' || sourceTab === 'teknikkesici'
      ? <TrafficView source={sourceTab} />
      : <>
    <div className="tabs" role="tablist" aria-label="Hareket kayıtları">
      <button className="tab" role="tab" aria-selected={tab === 'activity'} onClick={() => setTab('activity')}>Kullanıcı hareketleri</button>
      <button className="tab" role="tab" aria-selected={tab === 'stock'} onClick={() => setTab('stock')}>Stok hareketleri</button>
    </div>
    {tab === 'activity' ? <>
      <div className="activity-filters">{filterPerson}<select className="select sm" aria-label="Hareket türü" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">Tüm hareketler</option>{kinds.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select className="select sm" aria-label="Platform" value={platform} onChange={(e) => setPlatform(e.target.value)}><option value="">Tüm platformlar</option>{platforms.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><input className="input sm activity-text-filter" aria-label="Ürün kodu veya arama" placeholder="Ürün kodu veya arama" value={text} onChange={(e) => setText(e.target.value)} />{dateFilters}<button className="btn sm activity-refresh" onClick={refresh}><RefreshCw size={15} aria-hidden /> Yenile</button></div>
      {userId && summary && <div className="card activity-summary">
        <div className="activity-summary-head"><b>{selectedUser?.display_name || selectedUser?.username || 'Silinmiş kullanıcı'}</b><div><span>Son giriş: {summary.lastLogin ? dateText(summary.lastLogin) : 'Kayıt yok'}</span><span>Son hareket: {summary.lastActivity ? dateText(summary.lastActivity) : 'Kayıt yok'}</span></div></div>
        <div className="activity-summary-counts">{kinds.map(([key, label]) => <span className="activity-summary-count" key={key}><b>{summary.kindCounts[key] ?? 0}</b>{label}</span>)}</div>
        <div className="activity-summary-platforms"><b>Kullandığı platformlar</b><span>{summary.platforms.length ? summary.platforms.map((key) => <span className="activity-platform" key={key}><PlatformIcon platform={key} />{platforms.find(([value]) => value === key)?.[1] ?? key}</span>) : 'Kayıt yok'}</span></div>
        <div className="activity-summary-list"><b>En çok baktığı ürünler</b>{summary.topViewedProducts.length ? summary.topViewedProducts.map((product) => <span key={`${product.product_id}-${product.sku}`}>{product.sku}{product.brand && ` · ${product.brand}`} ({product.views})</span>) : <span>Kayıt yok</span>}</div>
        <div className="activity-summary-list"><b>En çok aradığı kelimeler</b>{summary.topSearchTerms.length ? summary.topSearchTerms.map((term) => <span key={term.query}>“{term.query}” ({term.searches})</span>) : <span>Kayıt yok</span>}</div>
      </div>}
      <div className="activity-table-wrap"><table className="table activity-table"><thead><tr><th>Zaman</th><th>Kişi</th><th>Platform</th><th>Hareket</th></tr></thead><tbody>{activityGroups.map((group) => <Fragment key={group.key}><tr className="activity-day-row"><th colSpan={4} scope="rowgroup">{group.label}</th></tr>{group.rows.map((row) => <tr key={row.id}><td>{timeText(row.at)}</td><td className="activity-person"><b>{row.person.display_name || row.person.username || 'Silinmiş kullanıcı'}</b><small>{[row.person.company, row.person.username].filter(Boolean).join(' · ')}</small></td><td><span className="activity-platform"><PlatformIcon platform={row.platform} />{platforms.find(([key]) => key === row.platform)?.[1] ?? row.platform}</span></td><td><span className="activity-description"><ActivityKindBadge kind={row.kind} /><span>{activityText(row)}</span></span></td></tr>)}</Fragment>)}</tbody></table>{activityError ? <LoadError message={activityError} onRetry={refresh} /> : activityLoading ? <p className="activity-empty" role="status">Hareketler yükleniyor…</p> : !activity.length && <p className="activity-empty">Kayıt bulunamadı.</p>}</div>
    </> : <>
      <div className="activity-filters"><input className="input sm" aria-label="Ürün kodu ara" placeholder="Ürün kodu" value={sku} onChange={(e) => setSku(e.target.value)} />{filterPerson}<select className="select sm" aria-label="Stok kaynağı" value={source} onChange={(e) => setSource(e.target.value)}><option value="">Tüm kaynaklar</option>{sources.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{dateFilters}<button className="btn sm activity-refresh" onClick={refresh}><RefreshCw size={15} aria-hidden /> Yenile</button></div>
      <div className="activity-table-wrap"><table className="table activity-table stock-activity-table"><thead><tr><th>Zaman</th><th>Ürün</th><th>Eski → Yeni</th><th>Fark</th><th>Kim</th><th>Kaynak</th></tr></thead><tbody>{stockGroups.map((group) => <Fragment key={group.key}><tr className="activity-day-row"><th colSpan={6} scope="rowgroup">{group.label}</th></tr>{group.rows.map((row) => <tr key={row.id}><td>{timeText(row.at)}</td><td><b>{row.sku}</b><small>{[row.brand, row.box].filter(Boolean).join(' · ')}</small></td><td>{row.old_stock ?? '—'} → {row.new_stock}</td><td className={row.delta > 0 ? 'activity-positive' : row.delta < 0 ? 'activity-negative' : ''}>{row.delta > 0 ? '+' : ''}{row.delta}</td><td className="activity-person"><b>{row.person.display_name || row.person.username || 'Silinmiş kullanıcı'}</b><small>{[row.person.company, row.person.username].filter(Boolean).join(' · ')}</small></td><td>{sourceName(row.source)}</td></tr>)}</Fragment>)}</tbody></table>{stockError ? <LoadError message={stockError} onRetry={refresh} /> : stockLoading ? <p className="activity-empty" role="status">Stok hareketleri yükleniyor…</p> : !stock.length && <p className="activity-empty">{stockHasFilters ? 'Kayıt bulunamadı.' : 'Henüz stok değişikliği yok.'}</p>}</div>
    </>}
    {hasMore && <button className="btn activity-more" onClick={() => tab === 'activity' ? setActivityOffset((value) => value + 50) : setStockOffset((value) => value + 50)}>Daha fazla yükle</button>}
    </>}
  </section>
}
