import type { SiteActivityRow, TrafficCounts, TrafficSite, TrafficSource, TrafficSummary } from '@shared/types'
import { Activity, Building2, Eye, Globe, MapPin, Monitor, PackageCheck, RefreshCw, Search, ShoppingCart, Smartphone, TabletSmartphone } from 'lucide-react'
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
const visitorAdjectives = [
  'Mavi', 'Çevik', 'Sakin', 'Parlak', 'Neşeli', 'Serin', 'Güçlü', 'Nazik', 'Dingin', 'Meraklı',
  'Hızlı', 'Yumuşak', 'Aydınlık', 'Dayanıklı', 'Uysal', 'Yalın', 'Canlı', 'Umutlu', 'Dikkatli', 'Güvenli',
  'İlkeli', 'Sağlam', 'Sevecen', 'Özenli', 'Sessiz', 'Atik', 'Doğal', 'Ferah', 'Dengeli', 'Kıvrak',
  'Mutlu', 'Renkli', 'Sade', 'Taze', 'Uyumlu', 'Verimli', 'Yaratıcı', 'Akıcı', 'Açık', 'Odaklı'
]
const visitorNouns = [
  'Kartal', 'Çınar', 'Martı', 'Deniz', 'Pınar', 'Bulut', 'Orman', 'Turna', 'Kırlangıç', 'Irmak',
  'Güneş', 'Kestane', 'Lale', 'Menekşe', 'Kumsal', 'Akarsu', 'Sedir', 'Saka', 'Ceylan', 'Kirpi',
  'Kaplumbağa', 'Yunus', 'Sincap', 'Dağ', 'Yıldız', 'Koru', 'Papatya', 'Ada', 'Mercan', 'Rüzgâr',
  'Yağmur', 'Bahar', 'Kuğu', 'Kumru', 'Balina', 'Söğüt', 'Meşe', 'Güvercin', 'Zeytin', 'Şafak'
]

export function visitorName(visitor: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < visitor.length; i += 1) {
    hash ^= visitor.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  const value = hash >>> 0
  return `${visitorAdjectives[value % visitorAdjectives.length]} ${visitorNouns[Math.floor(value / visitorAdjectives.length) % visitorNouns.length]}`
}

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
  return Number(value || 0).toLocaleString('tr-TR')
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }).format(new Date(`${value}T12:00:00+03:00`))
}

function dayKey(value: string): string {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function chartDayLabel(value: string, includeWeekday: boolean): string {
  const date = new Date(`${value}T12:00:00+03:00`)
  const options: Intl.DateTimeFormatOptions = includeWeekday ? { weekday: 'short', timeZone: 'Europe/Istanbul' } : { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' }
  return new Intl.DateTimeFormat('tr-TR', options).format(date).replace(/\.$/, '')
}

function chartTooltip(entry: TrafficSummary['daily'][number]): string {
  return `${chartDayLabel(entry.day, false)} ${chartDayLabel(entry.day, true)} · ${formatCount(entry.visitors)} ziyaretçi · ${formatCount(entry.searches)} arama`
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

function deviceLabel(device: string): string {
  if (device === 'mobile') return 'Mobil'
  if (device === 'desktop') return 'Masaüstü'
  if (device === 'tablet') return 'Tablet'
  return 'Bilinmiyor'
}

function sources(sources: string[]): ReactNode {
  return <span className="traffic-source-chips">{sources.map((source) => <span className="traffic-source-chip" key={source}>{sourceLabels[source] ?? source}</span>)}</span>
}

function relativeTime(value: string): string {
  const elapsed = Date.now() - new Date(value).getTime()
  if (!Number.isFinite(elapsed) || elapsed < 60_000) return 'Az önce'
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 60) return `${minutes} dk önce`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} sa önce`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} gün önce`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} ay önce`
  return `${Math.floor(months / 12)} yıl önce`
}

function Panel({ title, icon, children, className = '' }: { title: string; icon: ReactNode; children: ReactNode; className?: string }): ReactNode {
  return <section className={`card traffic-panel ${className}`}><h3>{icon}{title}</h3>{children}</section>
}

function GeoAttribution(): ReactNode {
  const toast = useApp((state) => state.toast)
  return <p className="traffic-geo-attribution">
    Konumlar yaklaşıktır. IP konum verisi: <a href="https://db-ip.com" className="traffic-attribution-link" onClick={(event) => {
      event.preventDefault()
      api('app:openExternal', 'https://db-ip.com').catch((error: Error) => toast(error.message, 'error'))
    }}>DB-IP.com</a>
  </p>
}

function CityPanel({ rows, selected, onSelect }: { rows: TrafficSummary['cities']; selected?: string; onSelect: (city: string) => void }): ReactNode {
  const maximum = Math.max(1, ...rows.map((row) => row.visitors))
  return <Panel title="Şehirler" icon={<MapPin size={17} />} className="traffic-geo-panel">
    {rows.length ? <ol className="traffic-geo-list">{rows.map((row) =>
      <li key={row.city}>
        <button className="traffic-geo-row" type="button" aria-pressed={selected === row.city} onClick={() => onSelect(row.city)}>
          <span className="traffic-geo-main">
            <span className="traffic-geo-name">{row.city}</span>
            <span className="traffic-geo-stats">{formatCount(row.visitors)} ziyaretçi · {formatCount(row.product_views)} ürün</span>
          </span>
          <span className="traffic-geo-bar" aria-hidden><span style={{ width: `${Math.max(4, row.visitors / maximum * 100)}%` }} /></span>
        </button>
      </li>
    )}</ol> : <p className="traffic-empty">Bu dönemde şehir bilgisi yok.</p>}
    <GeoAttribution />
  </Panel>
}

function CompanyPanel({ rows, selected, onSelect }: { rows: TrafficSummary['companies']; selected?: string; onSelect: (org: string) => void }): ReactNode {
  return <Panel title="Şirket ağları" icon={<Building2 size={17} />} className="traffic-geo-panel">
    {rows.length ? <ol className="traffic-geo-list">{rows.map((row) =>
      <li key={row.org}>
        <button className="traffic-geo-row traffic-company-row" type="button" aria-pressed={selected === row.org} onClick={() => onSelect(row.org)}>
          <span className="traffic-company-name"><Building2 size={15} aria-hidden />{row.org}</span>
          <span className="traffic-company-meta">{formatCount(row.visitors)} ziyaretçi · {formatCount(row.product_views)} ürün · {relativeTime(row.last_at)}</span>
          {sources(row.sources)}
        </button>
      </li>
    )}</ol> : <p className="traffic-empty">Bu dönemde şirket ağından giriş yok.</p>}
    <GeoAttribution />
  </Panel>
}

function TopList<T extends { count: number; sources: string[] }>({ rows, label, render }: { rows: T[]; label: (row: T) => string; render?: (row: T) => string }): ReactNode {
  if (!rows.length) return <p className="traffic-empty">Bu dönemde kayıt yok.</p>
  return <ol className="traffic-top-list">{rows.map((row, index) => {
    return <li key={`${label(row)}-${index}`}><span className="traffic-rank">{index + 1}</span><span className="traffic-top-label">{label(row)}{render && <small>{render(row)}</small>}{sources(row.sources)}</span><b>{formatCount(row.count)}</b></li>
  })}</ol>
}

function Metric({ title, value, previous, icon }: { title: string; value: number; previous: number | undefined; icon: ReactNode }): ReactNode {
  const change = previous === undefined || previous === 0 ? null : value === previous ? 0 : ((value - previous) / previous) * 100
  const changeLabel = change === 0 ? '— değişmedi' : change === null ? '' : `${change > 0 ? '▲' : '▼'} %${Math.abs(change).toFixed(0)}`
  const changeClass = change === 0 ? 'traffic-neutral' : change !== null && change > 0 ? 'traffic-up' : 'traffic-down'
  return <article className="card traffic-metric"><span className="traffic-metric-icon">{icon}</span><span className="traffic-metric-label">{title}</span><b>{formatCount(value)}</b>{change !== null && <small className={changeClass}>{changeLabel}</small>}</article>
}

function DailyChart({ daily }: { daily: TrafficSummary['daily'] }): ReactNode {
  const values = daily.slice(-90)
  const maximum = Math.max(0, ...values.map((entry) => entry.visitors))
  const width = 1000
  const baseline = 104
  const maxHeight = maximum ? 82 : 2
  const slotWidth = width / Math.max(values.length, 1)
  const barWidth = Math.max(2, Math.min(28, slotWidth * 0.62))
  const maxIndex = Math.max(0, values.findIndex((entry) => entry.visitors === maximum))
  const showEveryDay = values.length <= 14
  return <Panel title="Günlük ziyaretçi" icon={<Activity size={17} />} className="traffic-chart-panel">
    {values.length ? <div className="traffic-chart-scroll">
      <div className="traffic-chart-plot">
        <svg viewBox={`0 0 ${width} 128`} preserveAspectRatio="none" role="group" aria-label="Günlük ziyaretçi sayısı">
          <line x1="0" y1={baseline} x2={width} y2={baseline} className="traffic-chart-axis" />
          {values.map((entry, index) => {
            const height = Math.max(2, maximum ? (entry.visitors / maximum) * maxHeight : 2)
            const x = index * slotWidth + (slotWidth - barWidth) / 2
            const tooltip = chartTooltip(entry)
            return <g key={entry.day} className="traffic-chart-point" role="img" tabIndex={0} aria-label={tooltip}>
              <title>{tooltip}</title>
              <rect x={x} y={baseline - height} width={barWidth} height={height} rx="3" className="traffic-chart-bar" />
            </g>
          })}
        </svg>
        <b className={`traffic-chart-max${maxIndex === 0 ? ' at-start' : maxIndex === values.length - 1 ? ' at-end' : ''}`} style={{ left: `${((maxIndex + 0.5) / values.length) * 100}%`, top: `${Math.max(0, baseline - maxHeight - 18)}px` }}>{formatCount(maximum)}</b>
      </div>
      <div className="traffic-chart-labels" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }} aria-hidden="true">
        {values.map((entry, index) => <span key={entry.day}>{showEveryDay || index % 7 === 0 ? chartDayLabel(entry.day, showEveryDay) : ''}</span>)}
      </div>
    </div> : <p className="traffic-empty">Bu dönemde ziyaret yok.</p>}
  </Panel>
}

function RecentActivity({ site, city, org, onClearCity, onClearOrg }: {
  site: TrafficSite | null
  city?: string
  org?: string
  onClearCity: () => void
  onClearOrg: () => void
}): ReactNode {
  const toast = useApp((state) => state.toast)
  const [rows, setRows] = useState<SiteActivityRow[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let cancelled = false
    const pageOffset = offset
    api('traffic:recent', {
      ...(site ? { site } : {}),
      ...(city ? { city } : {}),
      ...(org ? { org } : {}),
      offset: pageOffset
    }).then((page) => {
      if (cancelled) return
      setRows((current) => pageOffset ? [...current, ...page.rows] : page.rows)
      setHasMore(page.hasMore)
      setLoaded(true)
    }).catch((error: Error) => { if (!cancelled) { setLoaded(true); toast(error.message, 'error') } })
    return () => { cancelled = true }
  }, [site, city, org, offset, toast])
  const groups = useMemo(() => recentGroups(rows), [rows])
  return <Panel title="Son hareketler" icon={<Activity size={17} />} className="traffic-recent-panel">
    {(city || org) && <div className="traffic-filter-chips">
      {city && <button type="button" className="traffic-filter-chip" onClick={onClearCity} aria-label={`Şehir filtresini kaldır: ${city}`}>Şehir: {city} ×</button>}
      {org && <button type="button" className="traffic-filter-chip" onClick={onClearOrg} aria-label={`Şirket filtresini kaldır: ${org}`}>Şirket: {org} ×</button>}
    </div>}
    {!loaded ? <p className="traffic-empty">Yükleniyor…</p> : !rows.length ? <p className="traffic-empty">{city || org ? 'Bu filtreyle eşleşen hareket yok.' : site ? 'Bu siteden henüz hareket gelmedi. Site kodu kurulunca burada görünecek.' : 'Bu sitelerde henüz hareket yok.'}</p> :
      <div className="traffic-recent-list">{groups.map((group) => <Fragment key={group.key}>
        <h4>{group.label}</h4>{group.rows.map((row) => {
          const Icon = kindIcons[row.kind]
          const detail = row.kind === 'search' ? `“${row.query}” arandı` : row.kind === 'product_view' ? `${row.name || row.sku || 'Ürün'} görüntülendi` : row.kind === 'cart_add' ? `${row.name || row.sku || 'Ürün'} sepete eklendi${row.qty !== null && row.qty !== undefined ? ` (${formatCount(row.qty)} adet)` : ''}` : row.kind === 'order' ? 'Sipariş verildi' : 'Siteyi ziyaret etti'
          return <article className="traffic-recent-row" key={row.id}>
            <span className={`activity-kind-badge activity-kind-${row.kind}`}><Icon size={14} /></span>
            <span className="traffic-recent-detail">{detail}<small>{row.sku && row.kind !== 'product_view' ? row.sku : row.path}</small></span>
            <span className="traffic-visitor">
              <span className="traffic-visitor-name">{row.org ? <><Building2 size={14} aria-hidden />{row.org}</> : visitorName(row.visitor)}</span>
              <small>{row.city && <>{row.city}<span aria-hidden> · </span></>}<DeviceIcon device={row.device} />{deviceLabel(row.device)}</small>
            </span>
            <time>{new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(row.at))}</time>
          </article>
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
  const [cityFilter, setCityFilter] = useState<string>()
  const [companyFilter, setCompanyFilter] = useState<string>()
  const site = source === 'all' || source === 'app' ? null : source as TrafficSite
  const range = useMemo(() => boundaries(period), [period, refresh])

  useEffect(() => {
    setCityFilter(undefined)
    setCompanyFilter(undefined)
  }, [source])

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
        <Panel title="Cihazlar" icon={<Monitor size={17} />}><ul className="traffic-devices">{summary.devices.map((item) => <li key={item.device}><DeviceIcon device={item.device} /><span>{deviceLabel(item.device)}</span><b>{formatCount(item.visitors)}</b></li>)}</ul></Panel>
        {source !== 'app' && <>
          <CityPanel
            rows={summary.cities}
            selected={cityFilter}
            onSelect={(city) => { setCityFilter(cityFilter === city ? undefined : city); setCompanyFilter(undefined) }}
          />
          <CompanyPanel
            rows={summary.companies}
            selected={companyFilter}
            onSelect={(org) => { setCompanyFilter(companyFilter === org ? undefined : org); setCityFilter(undefined) }}
          />
        </>}
      </div>
      {source !== 'app' && <RecentActivity
        key={`${source}:${refresh}:${cityFilter ?? ''}:${companyFilter ?? ''}`}
        site={site}
        city={cityFilter}
        org={companyFilter}
        onClearCity={() => setCityFilter(undefined)}
        onClearOrg={() => setCompanyFilter(undefined)}
      />}
      {!counts && <p className="traffic-empty">Trafik verisi bulunamadı.</p>}
    </>}
  </section>
}
