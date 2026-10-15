import type { ActivityKind, ActivityPlatform, ActivityRow, ActivitySummary, StockLogRow } from '@shared/types'
import type { Customer, User } from '@shared/types'
import { CalendarDays, Globe, Monitor, Smartphone } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { useApp } from '@/store/app'

type Tab = 'activity' | 'stock'
const kinds: [ActivityKind, string][] = [['login', 'Giriş'], ['search', 'Arama'], ['product_view', 'Ürün görüntüleme'], ['cart_add', 'Sepete ekleme'], ['order', 'Sipariş']]
const platforms: [ActivityPlatform, string][] = [['windows', 'Windows'], ['android', 'Android'], ['ios', 'iPhone'], ['web', 'Web']]
const sources: [string, string][] = [['order', 'Sipariş'], ['order_status', 'Sipariş durumu'], ['merge', 'Birleştirme'], ['stock_screen', 'Stok yönetimi'], ['adjust', 'Stok düzeltme'], ['new_product', 'Yeni ürün'], ['manual', 'Elle / Excel']]
const dateText = (value: string): string => {
  const d = new Date(value)
  const p = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)
  const part = Object.fromEntries(p.map((x) => [x.type, x.value]))
  return `${part.day}.${part.month}.${part.year} ${part.hour}:${part.minute}`
}
const sourceName = (source: string): string => sources.find(([key]) => key === source)?.[1] ?? 'Hızlı giriş'
const activityText = (row: ActivityRow): string => {
  const product = [row.sku, row.brand].filter(Boolean).join(' · ')
  if (row.kind === 'login') return 'Giriş yaptı'
  if (row.kind === 'search') return `“${row.query}” aradı`
  if (row.kind === 'product_view') return `${product || 'Ürüne'} baktı`
  if (row.kind === 'cart_add') return `${product || 'Ürün'} sepete ekledi (${row.qty ?? 1} adet)`
  return `${String(row.detail?.order_no ?? `Sipariş #${row.order_id ?? ''}`)} siparişini verdi`
}
const PlatformIcon = ({ platform }: { platform: ActivityPlatform }): ReactNode =>
  platform === 'windows' ? <Monitor size={15} /> : platform === 'web' ? <Globe size={15} /> : <Smartphone size={15} />

export function ActivityLogs(): ReactNode {
  const toast = useApp((s) => s.toast)
  const [tab, setTab] = useState<Tab>('activity')
  const [users, setUsers] = useState<User[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [userId, setUserId] = useState('')
  const [kind, setKind] = useState('')
  const [platform, setPlatform] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sku, setSku] = useState('')
  const [source, setSource] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [stock, setStock] = useState<StockLogRow[]>([])
  const [summary, setSummary] = useState<ActivitySummary | null>(null)
  useEffect(() => {
    void api('activity:open', undefined)
    api('users:list', undefined).then(setUsers).catch((e) => toast(e.message, 'error'))
    api('customers:list', {}).then(setCustomers).catch(() => undefined)
  }, [])
  useEffect(() => {
    setOffset(0)
  }, [tab, userId, kind, platform, from, to, sku, source])
  useEffect(() => {
    if (tab !== 'activity') return
    let cancelled = false
    api('activity:list', { userId: userId || undefined, kind: (kind || undefined) as ActivityKind | undefined, platform: (platform || undefined) as ActivityPlatform | undefined, from: from || undefined, to: to || undefined, offset, limit: 50 })
      .then((page) => { if (!cancelled) { setActivity((prev) => offset ? [...prev, ...page.rows] : page.rows); setHasMore(page.hasMore) } })
      .catch((e) => toast(e.message, 'error'))
    return () => { cancelled = true }
  }, [tab, userId, kind, platform, from, to, offset])
  useEffect(() => {
    if (tab !== 'stock') return
    let cancelled = false
    api('stock:log', { sku: sku || undefined, userId: userId || undefined, source: source || undefined, from: from || undefined, to: to || undefined, offset, limit: 50 })
      .then((page) => { if (!cancelled) { setStock((prev) => offset ? [...prev, ...page.rows] : page.rows); setHasMore(page.hasMore) } })
      .catch((e) => toast(e.message, 'error'))
    return () => { cancelled = true }
  }, [tab, sku, userId, source, from, to, offset])
  useEffect(() => {
    if (!userId) { setSummary(null); return }
    api('activity:summary', userId).then(setSummary).catch((e) => toast(e.message, 'error'))
  }, [userId])
  const companyById = useMemo(() => new Map(customers.map((customer) => [customer.id, customer.name])), [customers])
  const filterPerson = <select className="select sm activity-person-filter" aria-label="Kişi filtresi" value={userId} onChange={(e) => setUserId(e.target.value)}><option value="">Tüm kişiler</option>{users.map((u) => <option key={u.id} value={u.id}>{u.display_name || u.username}{u.customer_id ? ` · ${companyById.get(u.customer_id) ?? ''}` : ''}</option>)}</select>
  const dateFilters = <><label className="activity-date"><CalendarDays size={14} /><input className="input sm" type="date" aria-label="Başlangıç tarihi" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="activity-date"><CalendarDays size={14} /><input className="input sm" type="date" aria-label="Bitiş tarihi" value={to} onChange={(e) => setTo(e.target.value)} /></label></>
  return <section className="activity-page">
    <div className="tabs" role="tablist" aria-label="Hareket kayıtları">
      <button className="tab" role="tab" aria-selected={tab === 'activity'} onClick={() => setTab('activity')}>Kullanıcı hareketleri</button>
      <button className="tab" role="tab" aria-selected={tab === 'stock'} onClick={() => setTab('stock')}>Stok hareketleri</button>
    </div>
    {tab === 'activity' ? <>
      <div className="activity-filters">{filterPerson}<select className="select sm" aria-label="Hareket türü" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">Tüm hareketler</option>{kinds.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select className="select sm" aria-label="Platform" value={platform} onChange={(e) => setPlatform(e.target.value)}><option value="">Tüm platformlar</option>{platforms.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{dateFilters}</div>
      {userId && summary && <div className="card activity-summary"><b>{users.find((u) => u.id === userId)?.display_name || 'Kullanıcı özeti'}</b><span>Son giriş: {summary.lastLogin ? dateText(summary.lastLogin) : 'Kayıt yok'}</span><div><b>En çok baktığı ürünler</b>{summary.topViewedProducts.map((p) => <span key={`${p.product_id}-${p.sku}`}>{p.sku}{p.brand && ` · ${p.brand}`} ({p.views})</span>)}</div><div><b>En çok aradığı kelimeler</b>{summary.topSearchTerms.map((q) => <span key={q.query}>“{q.query}” ({q.searches})</span>)}</div></div>}
      <div className="activity-table-wrap"><table className="table activity-table"><thead><tr><th>Zaman</th><th>Kişi</th><th>Platform</th><th>Hareket</th></tr></thead><tbody>{activity.map((row) => <tr key={row.id}><td>{dateText(row.at)}</td><td className="activity-person"><b>{row.person.display_name || row.person.username}</b><small>{[row.person.company, row.person.username].filter(Boolean).join(' · ')}</small></td><td><span className="activity-platform"><PlatformIcon platform={row.platform} />{platforms.find(([key]) => key === row.platform)?.[1] ?? row.platform}</span></td><td>{activityText(row)}</td></tr>)}</tbody></table>{!activity.length && <p className="activity-empty">Kayıt bulunamadı.</p>}</div>
    </> : <>
      <div className="activity-filters"><input className="input sm" aria-label="Ürün kodu ara" placeholder="Ürün kodu" value={sku} onChange={(e) => setSku(e.target.value)} />{filterPerson}<select className="select sm" aria-label="Stok kaynağı" value={source} onChange={(e) => setSource(e.target.value)}><option value="">Tüm kaynaklar</option>{sources.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{dateFilters}</div>
      <div className="activity-table-wrap"><table className="table activity-table stock-activity-table"><thead><tr><th>Zaman</th><th>Ürün</th><th>Eski → Yeni</th><th>Fark</th><th>Kim</th><th>Kaynak</th></tr></thead><tbody>{stock.map((row) => <tr key={row.id}><td>{dateText(row.at)}</td><td><b>{row.sku}</b><small>{[row.brand, row.box].filter(Boolean).join(' · ')}</small></td><td>{row.old_stock ?? '—'} → {row.new_stock}</td><td className={row.delta > 0 ? 'activity-positive' : row.delta < 0 ? 'activity-negative' : ''}>{row.delta > 0 ? '+' : ''}{row.delta}</td><td className="activity-person"><b>{row.person.display_name || row.person.username}</b><small>{[row.person.company, row.person.username].filter(Boolean).join(' · ')}</small></td><td>{sourceName(row.source)}</td></tr>)}</tbody></table>{!stock.length && <p className="activity-empty">Kayıt bulunamadı.</p>}</div>
    </>}
    {hasMore && <button className="btn activity-more" onClick={() => setOffset((value) => value + 50)}>Daha fazla yükle</button>}
  </section>
}
