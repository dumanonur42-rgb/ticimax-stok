import type { Facets, Product, ProductFilter } from '@shared/types'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, Download, Filter, Plus, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ProductDrawer } from '@/components/ProductDrawer'
import { ProductEditor } from '@/components/ProductEditor'
import { api, onEvent } from '@/lib/api'
import { money, num, stockLevel } from '@/lib/format'
import { useApp, useCart } from '@/store/app'

const PAGE = 200
type SortKey = NonNullable<ProductFilter['sort']>

interface Column {
  key: string
  label: string
  width: string
  sort?: SortKey
  align?: 'right'
}

const COLUMNS: Column[] = [
  { key: 'sku', label: 'Stok Kodu', width: 'minmax(150px, 1.1fr)', sort: 'sku' },
  { key: 'name', label: 'Ürün Adı', width: 'minmax(220px, 2.4fr)', sort: 'name' },
  { key: 'brand', label: 'Marka', width: '96px' },
  { key: 'dims', label: 'd × D × B', width: '128px' },
  { key: 'stock', label: 'Stok', width: '104px', sort: 'stock', align: 'right' },
  { key: 'price', label: 'Fiyat', width: '120px', sort: 'price', align: 'right' },
  { key: 'act', label: '', width: '112px' }
]

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
  const canEdit = session?.user.role !== 'bayi'
  const showPrices = settings?.show_prices_to_dealers !== false || session?.user.role !== 'bayi'
  const threshold = settings?.low_stock_threshold ?? 5

  const [q, setQ] = useState('')
  const dq = useDebounced(q, 120)
  const [filter, setFilter] = useState<Omit<ProductFilter, 'q' | 'offset' | 'limit'>>({ sort: 'relevance', sortDir: 'asc' })
  const [showFilters, setShowFilters] = useState(true)
  const [facets, setFacets] = useState<Facets | null>(null)
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<Map<number, Product>>(new Map())
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [version, setVersion] = useState(0)
  const pendingPages = useRef(new Set<number>())
  const bodyRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const fullFilter = useMemo<ProductFilter>(() => ({ ...filter, q: dq }), [filter, dq])

  useEffect(() => onEvent('products:changed', () => setVersion((v) => v + 1)), [])

  // first page + total + facets whenever filter changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    pendingPages.current.clear()
    Promise.all([api('products:search', { ...fullFilter, offset: 0, limit: PAGE }), api('products:facets', fullFilter)])
      .then(([page, f]) => {
        if (cancelled) return
        const m = new Map<number, Product>()
        page.items.forEach((p, i) => m.set(i, p))
        setRows(m)
        setTotal(page.total)
        setFacets(f)
        setActiveIdx(0)
        bodyRef.current?.scrollTo({ top: 0 })
      })
      .catch((e) => toast(e.message, 'error'))
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

  const cols = COLUMNS.filter((c) => showPrices || c.key !== 'price')
  const gridCols = cols.map((c) => c.width).join(' ')

  const toggleSort = (s: SortKey): void =>
    setFilter((f) => ({ ...f, sort: s, sortDir: f.sort === s && f.sortDir === 'asc' ? 'desc' : 'asc' }))

  const toggleFacet = (key: 'brand' | 'category' | 'type' | 'seal', value: string): void =>
    setFilter((f) => {
      const cur = f[key] ?? []
      return { ...f, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] }
    })

  const setRange = (key: 'dInner' | 'dOuter' | 'width', idx: 0 | 1, raw: string): void =>
    setFilter((f) => {
      const r: [number | null, number | null] = [...(f[key] ?? [null, null])] as [number | null, number | null]
      r[idx] = raw.trim() === '' ? null : Number(raw.replace(',', '.'))
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
    else if (e.key === 'Enter') {
      const p = rows.get(activeIdx)
      if (p) setSelected(p)
    } else if (e.key === '+' || (e.key === 'Insert' && !e.ctrlKey)) {
      const p = rows.get(activeIdx)
      if (p) {
        e.preventDefault()
        addToCart(p)
        toast(`${p.sku} sepete eklendi.`, 'success')
      }
    }
  }

  const exportExcel = async (): Promise<void> => {
    const path = await api('products:exportExcel', fullFilter)
    if (path) toast(`Excel kaydedildi: ${path}`, 'success')
  }

  const facetBlock = (key: 'brand' | 'category' | 'type' | 'seal', title: string): ReactNode => {
    const list = facets?.[key] ?? []
    if (!list.length && !(filter[key]?.length ?? 0)) return null
    return (
      <fieldset>
        <legend>{title}</legend>
        {list.slice(0, 14).map((f) => (
          <label key={f.value} className="check">
            <input type="checkbox" checked={filter[key]?.includes(f.value) ?? false} onChange={() => toggleFacet(key, f.value)} />
            <span className="truncate">{f.value}</span>
            <span className="count" aria-label={`${f.count} ürün`}>
              {num(f.count)}
            </span>
          </label>
        ))}
      </fieldset>
    )
  }

  const rangeBlock = (key: 'dInner' | 'dOuter' | 'width', label: string, id: string): ReactNode => (
    <div className="field">
      <span className="label" id={`${id}-label`}>
        {label} (mm)
      </span>
      <div className="range" role="group" aria-labelledby={`${id}-label`}>
        <input className="input sm" inputMode="decimal" placeholder="min" aria-label={`${label} en az`} value={filter[key]?.[0] ?? ''} onChange={(e) => setRange(key, 0, e.target.value)} />
        <span aria-hidden>–</span>
        <input className="input sm" inputMode="decimal" placeholder="maks" aria-label={`${label} en çok`} value={filter[key]?.[1] ?? ''} onChange={(e) => setRange(key, 1, e.target.value)} />
      </div>
    </div>
  )

  return (
    <div className={`catalog${showFilters ? '' : ' no-filters'}`}>
      {showFilters && (
        <aside className="filters" aria-label="Filtreler">
          <div className="row">
            <strong>Filtreler</strong>
            <span className="spacer" />
            {activeChips.length > 0 && (
              <button className="btn ghost sm" onClick={clearAll}>
                Temizle
              </button>
            )}
          </div>
          <label className="check">
            <input type="checkbox" checked={!!filter.inStock} onChange={(e) => setFilter((f) => ({ ...f, inStock: e.target.checked }))} />
            Sadece stokta olanlar
          </label>
          <fieldset>
            <legend>Ölçüler</legend>
            <div className="grid" style={{ gap: 8 }}>
              {rangeBlock('dInner', 'İç çap (d)', 'f-d')}
              {rangeBlock('dOuter', 'Dış çap (D)', 'f-D')}
              {rangeBlock('width', 'Genişlik (B)', 'f-B')}
            </div>
          </fieldset>
          {facetBlock('category', 'Kategori')}
          {facetBlock('brand', 'Marka')}
          {facetBlock('type', 'Tip')}
          {facetBlock('seal', 'Keçe / Kapak')}
        </aside>
      )}

      <section className="catalog-main" aria-label="Ürün listesi">
        <div className="toolbar">
          <button className="btn icon" onClick={() => setShowFilters((s) => !s)} aria-pressed={showFilters} aria-label="Filtre panelini göster/gizle" title="Filtreler">
            <Filter size={18} aria-hidden />
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
              <option value="sku">Stok kodu</option>
              <option value="name">Ürün adı</option>
              <option value="stock">Stok</option>
              {showPrices && <option value="price">Fiyat</option>}
              <option value="updated">Güncelleme</option>
            </select>
          </label>
          {canEdit && (
            <button className="btn" onClick={() => setEditing('new')}>
              <Plus size={16} aria-hidden /> Yeni ürün
            </button>
          )}
          <button className="btn" onClick={exportExcel} title="Listeyi Excel olarak kaydet">
            <Download size={16} aria-hidden /> Excel
          </button>
        </div>
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
                {c.sort ? (
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
            {total === 0 && !loading && (
              <div className="empty">
                <h3>Sonuç bulunamadı</h3>
                <p>Aramayı veya filtreleri değiştirmeyi deneyin.</p>
                <button className="btn" onClick={clearAll}>
                  Filtreleri temizle
                </button>
              </div>
            )}
            <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
              {vItems.map((v) => {
                const p = rows.get(v.index)
                const isActive = v.index === activeIdx
                if (!p)
                  return (
                    <div key={v.key} className="vrow" role="row" aria-rowindex={v.index + 1} style={{ transform: `translateY(${v.start}px)`, height: v.size }}>
                      <div className="cell faint">…</div>
                    </div>
                  )
                const lvl = stockLevel(p.stock, threshold)
                return (
                  <div
                    key={v.key}
                    id={`prow-${v.index}`}
                    className={`vrow${p.active ? '' : ' inactive'}`}
                    role="row"
                    aria-rowindex={v.index + 1}
                    aria-selected={isActive}
                    style={{ transform: `translateY(${v.start}px)`, height: v.size }}
                    onClick={() => {
                      setActiveIdx(v.index)
                      setSelected(p)
                    }}
                  >
                    <div className="cell sku" role="gridcell">
                      {p.sku}
                    </div>
                    <div className="cell" role="gridcell" title={p.name}>
                      {p.name}
                    </div>
                    <div className="cell" role="gridcell">
                      {p.brand}
                    </div>
                    <div className="cell mono small" role="gridcell">
                      {p.d_inner != null || p.d_outer != null ? `${num(p.d_inner)}×${num(p.d_outer)}×${num(p.width)}` : ''}
                    </div>
                    <div className="cell right" role="gridcell">
                      <span className={`badge ${lvl.cls}`}>{lvl.label}</span>
                    </div>
                    {showPrices && (
                      <div className="cell right nowrap" role="gridcell">
                        {money(p.price, p.currency)}
                      </div>
                    )}
                    <div className="cell" role="gridcell" style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                      <button
                        className="btn primary sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          addToCart(p)
                          toast(`${p.sku} sepete eklendi.`, 'success')
                        }}
                        aria-label={`${p.sku} sepete ekle`}
                        disabled={p.stock <= 0 && session?.user.role === 'bayi'}
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
            <span className="faint">↑↓ gezin · Enter ayrıntı · + sepete ekle</span>
          </div>
        </div>
      </section>

      {selected && (
        <ProductDrawer
          product={selected}
          onClose={() => setSelected(null)}
          onEdit={canEdit ? () => setEditing(selected) : undefined}
          showPrices={showPrices}
          threshold={threshold}
        />
      )}
      {editing && (
        <ProductEditor
          product={editing === 'new' ? null : editing}
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
