import type { SiteActivityRow, TrafficCounts, TrafficSite, TrafficSource, TrafficSummary } from '@shared/types'
import { Activity, Eye, Globe, Monitor, PackageCheck, RefreshCw, Search, ShoppingCart, Smartphone, TabletSmartphone } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { useApp } from '@/store/app'

type Period = 1 | 7 | 30 | 90
const periods: [Period, string][] = [[1, 'Bugün'], [7, 'Son 7 gün'], [30, 'Son 30 gün'], [90, 'Son 90 gün']]
const sourceLabels: Record<string, string> = {
  app: 'Uygulama',
  yamansarulman: 'Yamansa Rulman Web',
  rulmansitesi: 'Rulman Sitesi Web',
  teknikkesici: 'Teknik Kesici Web'
}
const kindLabels = { visit: 'Ziyaret', search: 'Arama', product_view: 'Ürün görüntüleme', cart_add: 'Sepete ekleme', order: 'Sipariş' }
const kindIcons = { visit: Activity, search: Search, product_view: Eye, cart_add: ShoppingCart, order: PackageCheck }
const cache = new Map<string, { at: number; value: TrafficSummary }>()
const dayMs = 86_400_000

function istanbulDayStart(): number {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const date = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return new Date(`${date.year}-${date.month}-${date.day}T00:00:00+03:00`).getTime()
}

function boundaries(days: Period): { from: string; to: string; previousFrom: string; previousTo: string } {
  const today = istanbulDayStart()
  const from = today - (days - 1) * dayMs
  const to = today + dayMs
  return {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    previousFrom: new Date(from - days * dayMs).toISOString(),
    previousTo: new Date(from).toISOString()
  }
}

async function cachedSummary(source: TrafficSource, key: string, from: string, to: string): Promise<TrafficSummary> {
  const cacheKey = `${source}:${key}`
  const existing = cache.get(cacheKey)
  if (existing && Date.now() - existing.at < 60_000) return existing.value
  const value = await api('traffic:summary', { source, from, to })
  cache.set(cacheKey, { at: Date.now(), value })
  return value
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value || 0)
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }).format(new Date(`${value}T12:00:00+03:00`))
}

function dayKey(value: string): string {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function dayTitle(value: string): string {
  const date = new Date(value)
  const today = dayKey(new Date().toISOString())
  const yesterday = dayKey(new Date(Date.now() - dayMs).toISOString())
  const key = dayKey(value)
  return key === today ? 'Bugün' : key === yesterday ? 'Dün' : formatDay(key)
}

function recentGroups(rows: SiteActivityRow[]): { key: string; label: string; rows: SiteActivityRow[] }[] {
  const groups: { key: string; label: string; rows: SiteActivityRow[] }[] = []
  for (const row of rows) {
    const key = dayKey(row.at)
    const previous = groups.at(-1)
    if (previous?.key === key) previous.rows.push(row)
    else groups.push({ key, label: dayTitle(row.at), rows: [row] })
  }
  return groups
}

function DeviceIcon({ device }: { device: string }): ReactNode {
  if (device === 'mobile') return <Smartphone size={14} />
  if (device === 'tablet') return <TabletSmartphone size={14} />
  if (device === 'desktop') return <Monitor size={14} />
  return <Globe size={14} />
}

function sources(sources: string[]): ReactNode {
  return <span className="traffic-source-chips">{sources.map((source) => <span className="traffic-source-chip" key={source}>{sourceLabels[source] ?? source}</span>)}</span>
}

function Panel({ title, icon, children, className = '' }: { title: string; icon: ReactNode; children: ReactNode; className?: string }): ReactNode {
  return <section className={`card traffic-panel ${className}`}><h3>{icon}{title}</h3>{children}</section>
}

function TopList<T extends { count: number; sources: string[] }>({ rows, label, render }: { rows: T[]; label: (row: T) => string; render?: (row: T) => string }): ReactNode {
  if (!rows.length) return <p className="traffic-empty">Bu dönemde kayıt yok.</p>
  return <ol className="traffic-top-list">{rows.map((row, index) => {
    return <li key={`${label(row)}-${index}`}><span className="traffic-rank">{index + 1}</span><span className="traffic-top-label">{label(row)}{render && <small>{render(row)}</small>}{sources(row.sources)}</span><b>{formatCount(row.count)}</b></li>
  })}</ol>
}

function Metric({ title, value, previous, icon }: { title: string; value: number; previous: number | undefined; icon: ReactNode }): ReactNode {
  const change = previous ? ((value - previous) / previous) * 100 : null
  return <article className="card traffic-metric"><span className="traffic-metric-icon">{icon}</span><span className="traffic-metric-label">{title}</span><b>{formatCount(value)}</b>{change !== null && <small className={change >= 0 ? 'traffic-up' : 'traffic-down'}>{change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(0)}%</small>}</article>
}

function DailyChart({ daily }: { daily: TrafficSummary['daily'] }): ReactNode {
  const values = daily.slice(-90)
  const max = Math.max(1, ...values.map((entry) => entry.visitors))
  const width = Math.max(320, values.length * 16)
  const barWidth = Math.max(4, Math.min(12, width / Math.max(values.length, 1) - 4))
  return <Panel title="Günlük ziyaretçi" icon={<Activity size={17} />} className="traffic-chart-panel">
    {values.length ? <div className="traffic-chart-scroll"><svg viewBox={`0 0 ${width} 132`} role="img" aria-label="Günlük ziyaretçi sayısı">
      <title>Günlük ziyaretçi sayısı</title>
      <line x1="0" y1="108" x2={width} y2="108" className="traffic-chart-axis" />
      {values.map((entry, index) => {
        const height = Math.max(2, (entry.visitors / max) * 88)
        const x = index * (width / values.length) + (width / values.length - barWidth) / 2
        return <g key={entry.day}><title>{formatDay(entry.day)}: {formatCount(entry.visitors)} ziyaretçi</title><rect x={x} y={108 - height} width={barWidth} height={height} rx="3" className="traffic-chart-bar" /></g>
      })}
    </svg></div> : <p className="traffic-empty">Bu dönemde ziyaret yok.</p>}
  </Panel>
}

function RecentActivity({ site, refresh }: { site: TrafficSite; refresh: number }): ReactNode {
  const toast = useApp((state) => state.toast)
  const [rows, setRows] = useState<SiteActivityRow[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { setOffset(0) }, [site, refresh])
  useEffect(() => {
    let cancelled = false
    const pageOffset = offset
    api('traffic:recent', { site, offset: pageOffset }).then((page) => {
      if (cancelled) return
      setRows((current) => pageOffset ? [...current, ...page.rows] : page.rows)
      setHasMore(page.hasMore)
      setLoaded(true)
    }).catch((error: Error) => { if (!cancelled) { setLoaded(true); toast(error.message, 'error') } })
    return () => { cancelled = true }
  }, [site, offset, refresh])
  const groups = useMemo(() => recentGroups(rows), [rows])
  return <Panel title="Son hareketler" icon={<Activity size={17} />} className="traffic-recent-panel">
    {!loaded ? <p className="traffic-empty">Yükleniyor…</p> : !rows.length ? <p className="traffic-empty">Bu siteden henüz hareket gelmedi. Site kodu kurulunca burada görünecek.</p> :
      <div className="traffic-recent-list">{groups.map((group) => <Fragment key={group.key}>
        <h4>{group.label}</h4>{group.rows.map((row) => {
          const Icon = kindIcons[row.kind]
          const detail = row.kind === 'search' ? `“${row.query}” arandı` : row.kind === 'product_view' ? `${row.name || row.sku || 'Ürün'} görüntülendi` : row.kind === 'cart_add' ? `${row.name || row.sku || 'Ürün'} sepete eklendi${row.qty ? ` (${row.qty} adet)` : ''}` : row.kind === 'order' ? 'Sipariş verildi' : 'Siteyi ziyaret etti'
          return <article className="traffic-recent-row" key={row.id}><span className={`activity-kind-badge activity-kind-${row.kind}`}><Icon size={14} /></span><span className="traffic-recent-detail">{detail}<small>{row.sku && row.kind !== 'product_view' ? row.sku : row.path}</small></span><span className="traffic-visitor">Ziyaretçi #{row.visitor.slice(-4)}<small><DeviceIcon device={row.device} />{row.device || 'Bilinmiyor'}</small></span><time>{new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(row.at))}</time></article>
        })}</Fragment>)}</div>}
    {hasMore && <button className="btn sm traffic-load-more" onClick={() => setOffset((value) => value + 50)}>Daha fazla yükle</button>}
  </Panel>
}

export function TrafficView({ source }: { source: TrafficSource }): ReactNode {
  const toast = useApp((state) => state.toast)
  const [period, setPeriod] = useState<Period>(7)
  const [refresh, setRefresh] = useState(0)
  const [summary, setSummary] = useState<TrafficSummary | null>(null)
  const [previous, setPrevious] = useState<TrafficSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const site = source === 'all' || source === 'app' ? null : source as TrafficSite
  const range = useMemo(() => boundaries(period), [period, refresh])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      cachedSummary(source, `${period}:${range.from}`, range.from, range.to),
      cachedSummary(source, `${period}:${range.previousFrom}`, range.previousFrom, range.previousTo)
    ]).then(([current, past]) => {
      if (!cancelled) { setSummary(current); setPrevious(past); setLoading(false) }
    }).catch((error: Error) => { if (!cancelled) { setLoading(false); toast(error.message, 'error') } })
    return () => { cancelled = true }
  }, [source, period, range, refresh])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      cache.delete(`${source}:${period}:${range.from}`)
      cache.delete(`${source}:${period}:${range.previousFrom}`)
      setRefresh((value) => value + 1)
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [source, period, range])

  function refreshNow(): void {
    cache.delete(`${source}:${period}:${range.from}`)
    cache.delete(`${source}:${period}:${range.previousFrom}`)
    setRefresh((value) => value + 1)
  }

  const counts = summary?.totals
  const prior = previous?.totals
  const metric = (title: string, key: keyof TrafficCounts, icon: ReactNode): ReactNode =>
    <Metric title={title} value={counts?.[key] ?? 0} previous={prior?.[key]} icon={icon} />

  return <section className="traffic-view">
    <div className="traffic-toolbar">
      <div className="traffic-periods" role="group" aria-label="Trafik dönemini seç">
        {periods.map(([days, label]) => <button key={days} className={`btn sm ${period === days ? 'primary' : ''}`} aria-pressed={period === days} onClick={() => setPeriod(days)}>{label}</button>)}
      </div>
      <span className="traffic-period-caption">{period === 1 ? 'İstanbul saatine göre bugün' : `${period} günlük dönem · İstanbul saati`}</span>
      <button className="btn sm activity-refresh" onClick={refreshNow}><RefreshCw size={15} aria-hidden /> Yenile</button>
    </div>
    <div className="traffic-metrics">
      {metric('Ziyaretçi', 'visitors', <Globe size={18} />)}
      {metric('Arama', 'searches', <Search size={18} />)}
      {metric('Ürün görüntüleme', 'product_views', <Eye size={18} />)}
      {metric('Sepete ekleme', 'cart_adds', <ShoppingCart size={18} />)}
      {metric('Sipariş', 'orders', <PackageCheck size={18} />)}
    </div>
    {loading && <p className="traffic-loading" role="status">Trafik verileri yükleniyor…</p>}
    {summary && <>
      <DailyChart daily={summary.daily} />
      <div className="traffic-panels">
        <Panel title="En çok aranan" icon={<Search size={17} />}><TopList rows={summary.topSearches} label={(row) => row.term} render={(row) => `${formatCount(row.people)} ziyaretçi`} /></Panel>
        <Panel title="En çok bakılan ürünler" icon={<Eye size={17} />}><TopList rows={summary.topProducts} label={(row) => `${row.sku}${row.label ? ` · ${row.label}` : ''}`} render={(row) => `${formatCount(row.people)} ziyaretçi`} /></Panel>
        <Panel title="Sepete en çok eklenen" icon={<ShoppingCart size={17} />}><TopList rows={summary.topCart} label={(row) => `${row.sku}${row.label ? ` · ${row.label}` : ''}`} render={(row) => `${formatCount(row.qty)} adet`} /></Panel>
        {source !== 'app' && summary.zeroResults.length > 0 && <Panel title="Sonuç bulunamayan aramalar" icon={<Search size={17} />}><TopList rows={summary.zeroResults} label={(row) => (row as unknown as { term: string }).term} /></Panel>}
        {source === 'all' && <Panel title="Kaynaklara göre" icon={<Globe size={17} />} className="traffic-source-panel"><div className="traffic-table-wrap"><table className="table traffic-source-table"><thead><tr><th>Kaynak</th><th>Ziyaretçi</th><th>Arama</th><th>Ürün</th><th>Sepet</th><th>Sipariş</th></tr></thead><tbody>{summary.bySource.map((row) => <tr key={row.src}><th>{sourceLabels[row.src] ?? row.src}</th><td>{formatCount(row.visitors)}</td><td>{formatCount(row.searches)}</td><td>{formatCount(row.product_views)}</td><td>{formatCount(row.cart_adds)}</td><td>{formatCount(row.orders)}</td></tr>)}</tbody></table></div></Panel>}
        <Panel title="Cihazlar" icon={<Monitor size={17} />}><ul className="traffic-devices">{summary.devices.map((item) => <li key={item.device}><DeviceIcon device={item.device} /><span>{item.device === 'unknown' ? 'Bilinmiyor' : item.device}</span><b>{formatCount(item.visitors)}</b></li>)}</ul></Panel>
      </div>
      {site && <RecentActivity key={site} site={site} refresh={refresh} />}
      {!counts && <p className="traffic-empty">Trafik verisi bulunamadı.</p>}
    </>}
  </section>
}
