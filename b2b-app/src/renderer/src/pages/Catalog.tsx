import type { CatalogProduct, Facets, Perm, Product, ProductFilter } from '@shared/types'
import { hasPerm } from '@shared/perms'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, Copy, Download, Filter, MapPin, Plus, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ProductDrawer } from '@/components/ProductDrawer'
import { ProductEditor } from '@/components/ProductEditor'
import { LoadError } from '@/components/ui'
import { api, onEvent } from '@/lib/api'
import { money, num } from '@/lib/format'
import {
  availableCopyColumns,
  COPY_COLUMN_LABELS,
  COPY_COLUMN_PRESETS,
  copyPresetFor,
  loadCopyColumns,
  productsToClipboard,
  saveCopyColumns,
  type CopyColumn
} from '@shared/copy'
import { StockPill } from '@/components/StockPill'
import { brandOrigin, canonBox } from '@shared/identity'
import { brandLogo } from '../lib/brandLogos'
import { locationLabel, shelfBreakdown } from '@shared/locations'
import { useApp, useCart } from '@/store/app'

const PAGE = 200
type SortKey = NonNullable<ProductFilter['sort']>
type FacetKey = 'brand' | 'category' | 'type' | 'seal'
type RangeKey = 'dInner' | 'dOuter' | 'width'
const FACET_SHORT = 10
const FACET_SEARCH_MIN = 8

interface Column {
  key: string
  label: string
  /** Minimum track width in px; tracks with `grow` share the remaining space. */
  min: number
  grow?: number
  /** Columns with a lower `drop` value are hidden first when the grid is too narrow; undefined = always shown. */
  drop?: number
  sort?: SortKey
  align?: 'right'
  /** Shown only to accounts holding this ability. */
  perm?: Perm
}

const COLUMNS: Column[] = [
  { key: 'pick', label: '', min: 36 },
  { key: 'shelf', label: 'Raf', min: 240, drop: 4, sort: 'shelf', perm: 'shelf' },
  { key: 'sku', label: 'Ürün Kodu', min: 194, grow: 1.6, sort: 'sku' },
  { key: 'brand', label: 'Marka', min: 96, grow: 0.6, drop: 5 },
  { key: 'dims', label: 'd × D × B', min: 104, grow: 0.7, drop: 1 },
  { key: 'stock', label: 'Stok', min: 65, grow: 0.4, sort: 'stock', align: 'right' },
  { key: 'box', label: 'Kutu durumu', min: 170, grow: 1, drop: 2 },
  { key: 'description', label: 'Açıklama', min: 120, grow: 1.2, drop: 3 },
  { key: 'price', label: 'Fiyat', min: 146, grow: 0.4, sort: 'price', align: 'right' },
  { key: 'act', label: '', min: 106 }
]

/** Chip style for the packaging label: the two common states get their own look, anything else is neutral. */
function boxClass(box: string): string {
  const c = canonBox(box)
  return c === 'Kutulu' ? 'kutulu' : c === 'Kutusuz' ? 'kutusuz' : ''
}

/** Horizontal padding of `.vgrid-head` / `.vrow` (4px each side). */
const GRID_PAD = 8

/** Drops the lowest-priority columns until the minimum widths fit into `width`. */
function fitColumns(all: Column[], width: number): Column[] {
  const cols = [...all]
  const need = (): number => cols.reduce((s, c) => s + c.min, 0) + GRID_PAD
  while (need() > width) {
    let victim = -1
    for (let i = 0; i < cols.length; i++) {
      const d = cols[i].drop
      if (d !== undefined && (victim < 0 || d < cols[victim].drop!)) victim = i
    }
    if (victim < 0) break
    cols.splice(victim, 1)
  }
  return cols
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function Catalog(): ReactNode {
  const { settings, session, toast } = useApp()
  const addToCart = useCart((s) => s.add)
  const isAdmin = session?.user.role === 'admin'
  const canShelf = hasPerm(session?.user, 'shelf')
  const showPrices = settings?.show_prices_to_dealers !== false || hasPerm(session?.user, 'prices')
  const threshold = settings?.low_stock_threshold ?? 5

  const [q, setQ] = useState('')
  const lastLoggedSearch = useRef('')
  useEffect(() => {
    const query = q.trim()
    if (query.length < 2 || query === lastLoggedSearch.current) return
    const timer = window.setTimeout(() => {
      lastLoggedSearch.current = query
      void api('activity:log', { kind: 'search', query }).catch(() => undefined)
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [q])
  const dq = useDebounced(q, 120)
  const [filter, setFilter] = useState<Omit<ProductFilter, 'q' | 'offset' | 'limit'>>({ sort: 'relevance', sortDir: 'asc' })
  const [showFilters, setShowFilters] = useState(true)
  const [facetQ, setFacetQ] = useState<Partial<Record<FacetKey, string>>>({})
  const [facetMore, setFacetMore] = useState<Partial<Record<FacetKey, boolean>>>({})
  const [facets, setFacets] = useState<Facets | null>(null)
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<Map<number, CatalogProduct>>(new Map())
  const [picked, setPicked] = useState<Map<number, Product>>(new Map())
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [version, setVersion] = useState(0)
  const copyUserId = session?.user.id ?? ''
  const [savedCopyColumns, setSavedCopyColumns] = useState(() => ({
    userId: copyUserId,
    columns: loadCopyColumns(copyUserId)
  }))
  const [copyMenuOpen, setCopyMenuOpen] = useState(false)
  const pendingPages = useRef(new Set<number>())
  const bodyRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const selectAllRef = useRef<HTMLInputElement>(null)
  const copyButtonRef = useRef<HTMLButtonElement>(null)
  const copyPopoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (savedCopyColumns.userId !== copyUserId) {
      setSavedCopyColumns({ userId: copyUserId, columns: loadCopyColumns(copyUserId) })
    }
  }, [copyUserId, savedCopyColumns.userId])
  useEffect(() => {
    if (copyUserId && savedCopyColumns.userId === copyUserId) saveCopyColumns(copyUserId, savedCopyColumns.columns)
  }, [copyUserId, savedCopyColumns])
  useEffect(() => {
    if (!copyMenuOpen) return
    copyPopoverRef.current?.querySelector<HTMLElement>('button, input')?.focus()
    const onPointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && !copyPopoverRef.current?.contains(event.target) && !copyButtonRef.current?.contains(event.target)) {
        setCopyMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [copyMenuOpen])

  const fullFilter = useMemo<ProductFilter>(() => ({ ...filter, q: dq }), [filter, dq])
  const hasActiveFilter = Boolean(
    dq.trim() ||
      Object.entries(filter).some(([key, value]) => key !== 'sort' && key !== 'sortDir' && (Array.isArray(value) ? value.some(Boolean) : Boolean(value)))
  )

  useEffect(() => onEvent('products:changed', () => setVersion((v) => v + 1)), [])

  // first page + total + facets whenever filter changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    pendingPages.current.clear()
    Promise.all([api('products:search', { ...fullFilter, offset: 0, limit: PAGE }), api('products:facets', fullFilter)])
      .then(([page, f]) => {
        if (cancelled) return
        const m = new Map<number, CatalogProduct>()
        page.items.forEach((p, i) => m.set(i, p))
        setRows(m)
        setTotal(page.total)
        setFacets(f)
        setActiveIdx(0)
        bodyRef.current?.scrollTo({ top: 0 })
      })
      .catch((e) => { if (!cancelled) setLoadError((e as Error).message || 'Ürün listesi alınamadı.') })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [fullFilter, version])

  const loadPage = useCallback(
    (pageNo: number) => {
      if (pendingPages.current.has(pageNo)) return
      pendingPages.current.add(pageNo)
      api('products:search', { ...fullFilter, offset: pageNo * PAGE, limit: PAGE })
        .then((page) => {
          setRows((prev) => {
            const m = new Map(prev)
            page.items.forEach((p, i) => m.set(pageNo * PAGE + i, p))
            return m
          })
        })
        .catch((e) => toast(e.message, 'error'))
    },
    [fullFilter, toast]
  )

  const rowH = settings?.density === 'compact' ? 34 : 44
  const virt = useVirtualizer({
    count: total,
    getScrollElement: () => bodyRef.current,
    estimateSize: () => rowH,
    overscan: 12
  })
  const vItems = virt.getVirtualItems()
  useEffect(() => {
    const needed = new Set<number>()
    for (const v of vItems) if (!rows.has(v.index)) needed.add(Math.floor(v.index / PAGE))
    needed.forEach(loadPage)
  }, [vItems, rows, loadPage])

  const [gridW, setGridW] = useState(() => window.innerWidth)
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const measure = (): void => {
      if (el.clientWidth) setGridW(el.clientWidth)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const hasDimensions = total > rows.size || Array.from(rows.values()).some((product) => product.d_inner != null || product.d_outer != null || product.width != null)
  const layoutColumns = useMemo(() => {
    const scale = settings?.font_scale ?? 1
    const compact = gridW < 900
    return COLUMNS.map((column) => {
      if (column.key === 'shelf') return { ...column, min: gridW < 1200 ? 229 : 240 }
      if (column.key === 'sku') return { ...column, min: Math.ceil(178 * scale + 20) }
      // Logo plate (68) + gap + the condition label ("Çıkma"); the origin is shown in the drawer only.
      if (column.key === 'brand') return { ...column, min: Math.ceil(46 * scale + 102) }
      if (column.key === 'stock') return { ...column, min: compact ? Math.ceil(45 + 20 * scale) : 104 }
      if (column.key === 'price') return { ...column, min: Math.ceil(96 * scale + 50) }
      if (column.key === 'act') return { ...column, min: Math.ceil(72 * scale + 34) }
      return column
    })
  }, [settings?.font_scale, gridW])
  const cols = useMemo(
    () =>
      fitColumns(
        layoutColumns.filter((c) => (showPrices || c.key !== 'price') && (hasDimensions || c.key !== 'dims') && (!c.perm || hasPerm(session?.user, c.perm))),
        gridW
      ),
    [layoutColumns, showPrices, session?.user, gridW, hasDimensions]
  )
  const has = useMemo(() => new Set(cols.map((c) => c.key)), [cols])
  const gridCols = cols.map((c) => (c.grow ? `minmax(${c.min}px, ${c.grow}fr)` : `${c.min}px`)).join(' ')
  const loadedProducts = useMemo(
    () => Array.from(rows.entries()).sort(([a], [b]) => a - b).map(([, product]) => product),
    [rows]
  )
  const loadedPickedCount = loadedProducts.reduce((count, product) => count + Number(picked.has(product.id)), 0)
  const allLoadedPicked = loadedProducts.length > 0 && loadedPickedCount === loadedProducts.length

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = loadedPickedCount > 0 && !allLoadedPicked
  }, [allLoadedPicked, loadedPickedCount])

  const togglePicked = (product: Product): void =>
    setPicked((prev) => {
      const next = new Map(prev)
      if (next.has(product.id)) next.delete(product.id)
      else next.set(product.id, product)
      return next
    })

  const toggleLoadedPicked = (): void =>
    setPicked((prev) => {
      const next = new Map(prev)
      if (loadedProducts.length > 0 && loadedProducts.every((product) => prev.has(product.id)))
        loadedProducts.forEach((product) => next.delete(product.id))
      else loadedProducts.forEach((product) => next.set(product.id, product))
      return next
    })

  const copyProducts = async (products: Product[]): Promise<void> => {
    if (!products.length) return
    try {
      const value = productsToClipboard(products, savedCopyColumns.columns, { canShelf, showPrices })
      await api('clipboard:write', value)
      const preset = copyPresetFor(savedCopyColumns.columns)
      const suffix = preset === 'ozel' ? 'Özel' : COPY_COLUMN_PRESETS[preset].label
      toast(`${products.length} ürün kopyalandı · ${suffix}`, 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const setCopyColumns = (next: CopyColumn[]): void => {
    setSavedCopyColumns({
      userId: copyUserId,
      columns: [...new Set<CopyColumn>(['sku', ...next])]
    })
  }

  const copySelectionLabel = copyPresetFor(savedCopyColumns.columns)
  const availableColumns = availableCopyColumns(Array.from(picked.values()), { canShelf, showPrices })

  const toggleSort = (s: SortKey): void =>
    setFilter((f) => ({ ...f, sort: s, sortDir: f.sort === s && f.sortDir === 'asc' ? 'desc' : 'asc' }))

  const toggleFacet = (key: FacetKey, value: string): void =>
    setFilter((f) => {
      const cur = f[key] ?? []
      return { ...f, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] }
    })

  const setRange = (key: RangeKey, idx: 0 | 1, raw: string): void =>
    setFilter((f) => {
      const r: [number | null, number | null] = [...(f[key] ?? [null, null])] as [number | null, number | null]
      const parsed = Number(raw.replace(',', '.'))
      r[idx] = raw.trim() === '' || !Number.isFinite(parsed) ? null : parsed
      return { ...f, [key]: r[0] == null && r[1] == null ? undefined : r }
    })

  const activeChips: { label: string; clear: () => void }[] = []
  for (const key of ['brand', 'category', 'type', 'seal'] as const)
    for (const v of filter[key] ?? []) activeChips.push({ label: v, clear: () => toggleFacet(key, v) })
  for (const [key, label] of [['dInner', 'd'], ['dOuter', 'D'], ['width', 'B']] as const) {
    const r = filter[key]
    if (r) activeChips.push({ label: `${label}: ${r[0] ?? '…'}–${r[1] ?? '…'} mm`, clear: () => setFilter((f) => ({ ...f, [key]: undefined })) })
  }
  if (filter.inStock) activeChips.push({ label: 'Sadece stokta', clear: () => setFilter((f) => ({ ...f, inStock: false })) })

  const clearAll = (): void => {
    setQ('')
    setFilter({ sort: 'relevance', sortDir: 'asc' })
    searchRef.current?.focus()
  }

  const onGridKey = (e: React.KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'c') {
      if (window.getSelection()?.toString()) return
      e.preventDefault()
      void copyProducts(picked.size > 0 ? Array.from(picked.values()) : [rows.get(activeIdx)].filter((p): p is CatalogProduct => !!p))
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault()
      toggleLoadedPicked()
      return
    }
    if (e.key === 'Escape' && picked.size > 0) {
      e.preventDefault()
      setPicked(new Map())
      return
    }
    if (!total) return
    const move = (n: number): void => {
      e.preventDefault()
      const next = Math.min(total - 1, Math.max(0, activeIdx + n))
      setActiveIdx(next)
      virt.scrollToIndex(next, { align: 'auto' })
    }
    if (e.key === 'ArrowDown') move(1)
    else if (e.key === 'ArrowUp') move(-1)
    else if (e.key === 'PageDown') move(20)
    else if (e.key === 'PageUp') move(-20)
    else if (e.key === 'Home') move(-total)
    else if (e.key === 'End') move(total)
    else if ((e.key === ' ' || e.code === 'Space') && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement)) {
      e.preventDefault()
      const p = rows.get(activeIdx)
      if (p) togglePicked(p)
    } else if (e.key === 'Enter') {
      const p = rows.get(activeIdx)
      if (p) {
        bodyRef.current?.focus()
        setSelected(p)
      }
    } else if (e.key === '+' || (e.key === 'Insert' && !e.ctrlKey)) {
      const p = rows.get(activeIdx)
      if (p) {
        e.preventDefault()
        if (p.price == null || p.price <= 0) toast('Bu ürünün fiyatı girilmemiş. Fiyat için lütfen bizi arayın.', 'error')
        else {
          addToCart(p)
          toast(`${p.sku} sepete eklendi.`, 'success')
        }
      }
    }
  }

  const facetBlock = (key: FacetKey, title: string): ReactNode => {
    const all = facets?.[key] ?? []
    const picked = filter[key] ?? []
    if (!all.length && !picked.length) return null
    const query = (facetQ[key] ?? '').trim().toLocaleLowerCase('tr')
    const missing = picked.filter((v) => !all.some((f) => f.value === v)).map((v) => ({ value: v, count: 0 }))
    const list = [...all, ...missing].filter((f) => !query || f.value.toLocaleLowerCase('tr').includes(query))
    const ordered = [...list].sort((a, b) => Number(picked.includes(b.value)) - Number(picked.includes(a.value)))
    const more = !!facetMore[key] || !!query
    const shown = more ? ordered : ordered.slice(0, FACET_SHORT)
    const hidden = ordered.length - shown.length
    return (
      <details className="fsec" open>
        <summary>
          <span className="fsec-title">{title}</span>
          {picked.length > 0 && (
            <span className="fsec-count" aria-label={`${picked.length} seçili`}>
              {picked.length}
            </span>
          )}
        </summary>
        <div className="fsec-body" role="group" aria-label={title}>
          {all.length > FACET_SEARCH_MIN && (
            <div className="fsearch">
              <Search size={14} aria-hidden />
              <input
                className="input sm"
                type="search"
                placeholder={`${title} ara…`}
                aria-label={`${title} içinde ara`}
                value={facetQ[key] ?? ''}
                onChange={(e) => setFacetQ((s) => ({ ...s, [key]: e.target.value }))}
              />
            </div>
          )}
          {shown.length === 0 && <p className="fempty">Eşleşen seçenek yok.</p>}
          {shown.map((f) => {
            const on = picked.includes(f.value)
            return (
              <label key={f.value} className={`fcheck${on ? ' on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => toggleFacet(key, f.value)} />
                <span className="truncate">{f.value}</span>
                <span className="count" aria-label={`${f.count} ürün`}>
                  {num(f.count)}
                </span>
              </label>
            )
          })}
          {!query && (hidden > 0 || (facetMore[key] && ordered.length > FACET_SHORT)) && (
            <button className="fmore" onClick={() => setFacetMore((s) => ({ ...s, [key]: !s[key] }))}>
              {hidden > 0 ? `Tümünü göster (+${num(hidden)})` : 'Daha az göster'}
            </button>
          )}
        </div>
      </details>
    )
  }

  const rangeBlock = (key: RangeKey, label: string, id: string): ReactNode => (
    <div className={`frange${filter[key] ? ' on' : ''}`}>
      <span className="frange-label" id={`${id}-label`}>
        {label}
      </span>
      <div className="frange-inputs" role="group" aria-labelledby={`${id}-label`}>
        <input className="input sm" inputMode="decimal" placeholder="min" aria-label={`${label} en az (mm)`} value={filter[key]?.[0] ?? ''} onChange={(e) => setRange(key, 0, e.target.value)} />
        <span className="frange-sep" aria-hidden>
          –
        </span>
        <input className="input sm" inputMode="decimal" placeholder="maks" aria-label={`${label} en çok (mm)`} value={filter[key]?.[1] ?? ''} onChange={(e) => setRange(key, 1, e.target.value)} />
        <span className="frange-unit" aria-hidden>
          mm
        </span>
      </div>
    </div>
  )

  return (
    <div className={`catalog${showFilters ? '' : ' no-filters'}`}>
      {showFilters && (
        <aside className="filters" aria-label="Filtreler" id="catalog-filters">
          <div className="filters-head">
            <Filter size={16} aria-hidden />
            <strong>Filtreler</strong>
            {activeChips.length > 0 && (
              <span className="badge info" aria-label={`${activeChips.length} etkin filtre`}>
                {activeChips.length}
              </span>
            )}
            <span className="spacer" />
            {activeChips.length > 0 && (
              <button className="btn ghost sm" onClick={clearAll} title="Tüm filtreleri ve aramayı temizle">
                Temizle
              </button>
            )}
            <button className="btn ghost icon sm" onClick={() => setShowFilters(false)} aria-label="Filtre panelini kapat" title="Kapat">
              <ChevronLeft size={16} aria-hidden />
            </button>
          </div>
          <div className="filters-body">
            <label className={`fswitch${filter.inStock ? ' on' : ''}`}>
              <span>Sadece stoktakiler</span>
              <input type="checkbox" role="switch" checked={!!filter.inStock} onChange={(e) => setFilter((f) => ({ ...f, inStock: e.target.checked }))} />
              <span className="fswitch-track" aria-hidden />
            </label>
            <details className="fsec" open>
              <summary>
                <span className="fsec-title">Ölçüler</span>
                <span className="fsec-hint">mm</span>
              </summary>
              <div className="fsec-body">
                {rangeBlock('dInner', 'İç çap (d)', 'f-d')}
                {rangeBlock('dOuter', 'Dış çap (D)', 'f-D')}
                {rangeBlock('width', 'Genişlik (B)', 'f-B')}
              </div>
            </details>
            {facetBlock('category', 'Kategori')}
            {facetBlock('brand', 'Marka')}
            {facetBlock('type', 'Tip')}
            {facetBlock('seal', 'Keçe / Kapak')}
          </div>
          <div className="filters-foot" role="status">
            <strong>{num(total)}</strong> ürün listeleniyor
          </div>
        </aside>
      )}

      <section className="catalog-main" aria-label="Ürün listesi">
        <div className="toolbar">
          <button
            className={`btn${showFilters ? ' active' : ''}`}
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            aria-controls="catalog-filters"
            title={showFilters ? 'Filtre panelini gizle' : 'Filtre panelini göster'}
          >
            <Filter size={16} aria-hidden /> Filtreler
            {activeChips.length > 0 && <span className="badge info">{activeChips.length}</span>}
          </button>
          <div className="search-box">
            <Search size={20} aria-hidden />
            <input
              id="product-search"
              ref={searchRef}
              className="input"
              type="search"
              placeholder="Stok kodu, ürün adı, marka veya muadil ara… (örn. 6205 2RS, 30206, UC208)"
              aria-label="Ürün ara"
              aria-describedby="search-help"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  bodyRef.current?.focus()
                }
                if (e.key === 'Escape') setQ('')
              }}
              autoFocus
            />
            <kbd className="kbd" aria-hidden>
              Ctrl+K
            </kbd>
          </div>
          <span id="search-help" className="sr-only">
            Yazdıkça sonuçlar filtrelenir. Aşağı ok ile listeye geçebilirsiniz.
          </span>
          <label className="row small" style={{ gap: 6 }}>
            <span className="muted">Sırala</span>
            <select
              className="select sm"
              style={{ width: 150 }}
              value={filter.sort}
              onChange={(e) => setFilter((f) => ({ ...f, sort: e.target.value as SortKey }))}
              aria-label="Sıralama"
            >
              <option value="relevance">Uygunluk</option>
              <option value="sku">Ürün kodu</option>
              <option value="stock">Stok</option>
              {canShelf && <option value="shelf">Raf</option>}
              {showPrices && <option value="price">Fiyat</option>}
              <option value="updated">Güncelleme</option>
            </select>
          </label>
          {!isAdmin && hasPerm(session?.user, 'export') && (
            <button
              className="btn"
              title="Bu listeyi (arama ve sıralamayla) Excel olarak kaydet"
              onClick={() => {
                api('products:exportExcel', fullFilter)
                  .then((path) => path && toast(`Excel kaydedildi: ${path}`, 'success'))
                  .catch((e: Error) => toast(e.message, 'error'))
              }}
            >
              <Download size={16} aria-hidden /> Excel
            </button>
          )}
          {isAdmin && (
            <button className="btn" onClick={() => setEditing('new')}>
              <Plus size={16} aria-hidden /> Yeni ürün
            </button>
          )}
        </div>
        {picked.size > 0 && (
          <div className="toolbar selection-toolbar" role="status" aria-live="polite">
            <strong>{num(picked.size)} ürün seçildi</strong>
            <span className="spacer" />
            <div className="copy-split">
              <button className="btn sm" onClick={() => void copyProducts(Array.from(picked.values()))}>
                <Copy size={14} aria-hidden /> Kopyala
              </button>
              <button
                ref={copyButtonRef}
                className="btn sm copy-split-caret"
                aria-label="Kopyalanacak sütunları ayarla"
                aria-haspopup="dialog"
                aria-expanded={copyMenuOpen}
                onClick={() => setCopyMenuOpen((open) => !open)}
              >
                <ChevronDown size={14} aria-hidden />
              </button>
              {copyMenuOpen && <div
                ref={copyPopoverRef}
                className="copy-column-popover"
                role="dialog"
                aria-label="Kopyalanacak sütunlar"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    event.stopPropagation()
                    setCopyMenuOpen(false)
                    copyButtonRef.current?.focus()
                  }
                }}
              >
                <strong>Kopyalanacak sütunlar</strong>
                <div className="copy-presets" aria-label="Sütun ön ayarları">
                  {(['musteri', 'depo'] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`btn sm${copySelectionLabel === preset ? ' active' : ''}`}
                      aria-pressed={copySelectionLabel === preset}
                      onClick={() => setCopyColumns(COPY_COLUMN_PRESETS[preset].columns)}
                    >
                      {COPY_COLUMN_PRESETS[preset].label}
                    </button>
                  ))}
                </div>
                <div className="copy-column-options">
                  {availableColumns.map((column) => (
                    <label key={column} className="copy-column-option">
                      <input
                        type="checkbox"
                        checked={savedCopyColumns.columns.includes(column)}
                        disabled={column === 'sku'}
                        onChange={(event) => setCopyColumns(
                          event.target.checked
                            ? [...savedCopyColumns.columns, column]
                            : savedCopyColumns.columns.filter((item) => item !== column)
                        )}
                      />
                      <span>{COPY_COLUMN_LABELS[column]}</span>
                    </label>
                  ))}
                </div>
              </div>}
            </div>
            <button className="btn sm ghost" onClick={() => setPicked(new Map())}>
              Seçimi temizle
            </button>
          </div>
        )}
        {(activeChips.length > 0 || q) && (
          <div className="toolbar" style={{ paddingTop: 6, paddingBottom: 6 }}>
            <div className="chips" aria-label="Etkin filtreler">
              {activeChips.map((c) => (
                <span key={c.label} className="chip">
                  {c.label}
                  <button onClick={c.clear} aria-label={`${c.label} filtresini kaldır`}>
                    <X size={14} aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="vgrid" style={{ ['--cols' as string]: gridCols }}>
          <div className="vgrid-head" role="row">
            {cols.map((c) => (
              <div key={c.key} role="columnheader" aria-sort={filter.sort === c.sort ? (filter.sortDir === 'desc' ? 'descending' : 'ascending') : undefined} className={c.align === 'right' ? 'right' : ''}>
                {c.key === 'pick' ? (
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allLoadedPicked}
                    onChange={toggleLoadedPicked}
                    aria-label="Görünen ürünlerin tümünü seç"
                  />
                ) : c.sort ? (
                  <button onClick={() => toggleSort(c.sort!)} title={`${c.label} sütununa göre sırala`}>
                    {c.label}
                    {filter.sort === c.sort && (filter.sortDir === 'desc' ? <ArrowDown size={14} aria-hidden /> : <ArrowUp size={14} aria-hidden />)}
                  </button>
                ) : (
                  c.label
                )}
              </div>
            ))}
          </div>
          <div
            ref={bodyRef}
            className="vgrid-body"
            role="grid"
            tabIndex={0}
            aria-label="Ürünler"
            aria-rowcount={total}
            aria-activedescendant={total ? `prow-${activeIdx}` : undefined}
            aria-busy={loading}
            onKeyDown={onGridKey}
          >
            {loadError && <LoadError message={loadError} onRetry={() => setVersion((value) => value + 1)} />}
            {total === 0 && !loading && !loadError && (
              <div className="empty">
                <h3>{hasActiveFilter ? 'Aramaya uyan ürün yok.' : 'Ürün bulunamadı'}</h3>
                <p>{hasActiveFilter ? 'Aramayı veya filtreleri değiştirmeyi deneyin.' : 'Henüz ürün eklenmemiş.'}</p>
                {hasActiveFilter && <button className="btn" onClick={clearAll}>Filtreleri temizle</button>}
              </div>
            )}
            <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
              {vItems.map((v) => {
                const p = rows.get(v.index)
                const isActive = v.index === activeIdx
                if (!p)
                  return (
                    <div key={v.key} className={`vrow${v.index % 2 ? ' odd' : ''}`} role="row" aria-rowindex={v.index + 1} style={{ transform: `translateY(${v.start}px)`, height: v.size }}>
                      <div className="cell faint">…</div>
                    </div>
                  )
                const locations = shelfBreakdown(p)
                const locationEntries = [
                  ...locations.map((location) => ({ location, box: location.box || p.box })),
                  ...p.others.flatMap((other) => shelfBreakdown({
                    shelf: other.shelf, stock: other.stock, box: other.box, locations: []
                  }).map((location) => ({ location, box: location.box || other.box })))
                ]
                const locationTitle = locationEntries.map(({ location, box }) => [
                  location.shelf.trim(),
                  box.trim(),
                  locationLabel({ shelf: '', qty: location.qty }, p.unit)
                ].filter(Boolean).join(' · ')).filter(Boolean).join(', ')
                const shelfNames = [...new Set(locationEntries.map(({ location }) => location.shelf.trim()).filter(Boolean))]
                const brand = brandOrigin(p.brand)
                const logo = brandLogo(brand.base)
                // A short one-word name fits inside the plate beside an emblem; anything longer goes after it.
                const brandInside = !!logo?.emblem && /^[^\s\-/().,&]{1,4}$/.test(brand.base)
                return (
                  <div
                    key={v.key}
                    id={`prow-${v.index}`}
                    className={`vrow${v.index % 2 ? ' odd' : ''}${p.active ? '' : ' inactive'}${picked.has(p.id) ? ' picked' : ''}`}
                    role="row"
                    tabIndex={-1}
                    aria-rowindex={v.index + 1}
                    aria-selected={isActive}
                    style={{ transform: `translateY(${v.start}px)`, height: v.size }}
                    onClick={() => {
                      setActiveIdx(v.index)
                      if (window.getSelection()?.toString()) return
                      bodyRef.current?.focus()
                      setSelected(p)
                    }}
                  >
                    <div className="cell pick-cell" role="gridcell">
                      <input
                        type="checkbox"
                        checked={picked.has(p.id)}
                        onChange={() => togglePicked(p)}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveIdx(v.index)
                        }}
                        aria-label={`${p.sku} seç`}
                      />
                    </div>
                    {has.has('shelf') && (
                      <div className="cell shelf-cell" role="gridcell">
                        {shelfNames.length > 0 ? <div className="shelf-summary" title={locationTitle} aria-label={locationTitle || 'Raf bilgisi yok'}>
                          <MapPin className="shelf-summary-icon" size={12} aria-hidden="true" />
                          <span className="shelf-summary-text">
                            {shelfNames.map((shelf, index) => <span key={`${shelf}-${index}`}>
                              {index > 0 && <span className="shelf-summary-separator" aria-hidden="true"> · </span>}
                              {shelf}
                            </span>)}
                          </span>
                        </div> : <span className="faint">—</span>}
                      </div>
                    )}
                    <div className="cell sku" role="gridcell" title={`${p.sku} · ${p.name}`}>
                      {p.sku}
                    </div>
                    {has.has('brand') && (
                      <div className="cell muted brand-cell" role="gridcell" title={p.brand}>
                        {logo
                          ? <>
                            <span className={`brand-plate${logo.flag ? ' flag' : ''}`}>
                              <img src={logo.src} style={logo.size} alt="" loading="lazy" decoding="async" draggable={false} />
                              {brandInside && <b>{brand.base}</b>}
                            </span>
                            {logo.named && <span className="sr-only">{brand.base} </span>}
                            {!logo.named && !brandInside && <span className="brand-rest">{brand.base}</span>}
                          </>
                          : brand.base && <span className={`brand-plate text${brand.base.length > 7 ? ' long' : ''}`}><span>{brand.base}</span></span>}
                        {brand.condition && <span className="brand-cond">{brand.condition}</span>}
                      </div>
                    )}
                    {has.has('dims') && (
                      <div className="cell mono small muted truncate" role="gridcell">
                        {p.d_inner != null || p.d_outer != null || p.width != null ? `${num(p.d_inner)}×${num(p.d_outer)}×${num(p.width)}` : ''}
                      </div>
                    )}
                    <div className="cell right stock-cell" role="gridcell">
                      <StockPill stock={p.stock} threshold={threshold} unit={p.unit} />
                    </div>
                    {has.has('box') && (
                      <div className="cell box-cell" role="gridcell" title={p.box}>
                        {p.box ? <span className={`box-tag ${boxClass(p.box)}`}>{p.box}</span> : <span className="faint">—</span>}
                      </div>
                    )}
                    {has.has('description') && (
                      <div className="cell small truncate" role="gridcell" title={p.description}>
                        {p.description || <span className="faint">—</span>}
                      </div>
                    )}
                    {has.has('price') && (
                      <div className="cell right nowrap" role="gridcell">
                        {p.price != null && p.price > 0 ? money(p.price, p.currency) : <span className="badge low">Fiyat sorunuz</span>}
                      </div>
                    )}
                    <div className="cell cart-cell" role="gridcell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <button
                        className="btn sm cart-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (p.price == null || p.price <= 0) toast('Bu ürünün fiyatı girilmemiş. Fiyat için lütfen bizi arayın.', 'error')
                          else {
                            addToCart(p)
                            toast(`${p.sku} sepete eklendi.`, 'success')
                          }
                        }}
                        aria-label={`${p.sku} sepete ekle`}
                        disabled={(p.stock <= 0 && !isAdmin) || p.price == null || p.price <= 0}
                      >
                        <Plus size={16} aria-hidden /> Sepet
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="toolbar small muted" style={{ borderTop: '1px solid var(--border)', borderBottom: 0, padding: '6px 14px' }} aria-live="polite">
            {loading ? 'Aranıyor…' : `${num(total)} ürün`}
            {activeIdx < total && total > 0 && <span className="faint"> · {num(activeIdx + 1)}. satır</span>}
            <span className="spacer" />
            <span className="faint">↑↓ gezin · Boşluk seç · Ctrl+C kopyala · Enter ayrıntı · + sepete ekle</span>
          </div>
        </div>
      </section>

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
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(p) => {
            setEditing(null)
            setSelected(p)
          }}
          onGoto={(p) => setEditing(p)}
        />
      )}
    </div>
  )
}
