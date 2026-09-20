import type { BulkProductPatch, DuplicateGroup, Product, ProductFilter } from '@shared/types'
import { cardPrice } from '@shared/price'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, Copy, Download, GitMerge, Pencil, Plus, RefreshCw, RotateCcw, Save, Search, SlidersHorizontal, TableProperties, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MergeDialog } from '@/components/MergeDialog'
import { ProductEditor } from '@/components/ProductEditor'
import { QuickEntry } from '@/components/QuickEntry'
import { Confirm, Field, Modal } from '@/components/ui'
import { api, onEvent } from '@/lib/api'
import { money, num, stockLevel } from '@/lib/format'
import { useApp } from '@/store/app'

const PAGE = 200
type SortKey = NonNullable<ProductFilter['sort']>
type EditKey = 'stock' | 'shelf' | 'price' | 'card_price'
type Edit = Partial<Record<EditKey, string>>
type Tab = 'list' | 'quick' | 'dups'

interface Column {
  key: string
  label: string
  width: string
  sort?: SortKey
  align?: 'right'
}

const COLUMNS: Column[] = [
  { key: 'sel', label: '', width: '40px' },
  { key: 'shelf', label: 'Raf', width: '150px', sort: 'shelf' },
  { key: 'sku', label: 'Ürün Kodu', width: 'minmax(200px, 1fr)', sort: 'sku' },
  { key: 'brand', label: 'Marka', width: '110px' },
  { key: 'stock', label: 'Stok', width: '150px', sort: 'stock', align: 'right' },
  { key: 'price', label: 'Peşin Fiyat', width: '130px', sort: 'price', align: 'right' },
  { key: 'card_price', label: 'K. Kartı Fiyatı', width: '130px', align: 'right' },
  { key: 'act', label: '', width: '84px' }
]

const parseNum = (s: string): number | null => {
  const t = s.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
const round2 = (v: number | string): number => Math.round(Number(v) * 100) / 100
const editText = (p: Product, k: EditKey): string => {
  if (k === 'shelf') return p.shelf
  if (k === 'card_price') return p.card_price == null ? '' : String(round2(p.card_price))
  return String(round2(p[k]))
}

/** Turns one row's pending text edits into a cloud patch; null when nothing actually changed. */
function toPatch(p: Product, e: Edit): BulkProductPatch | null {
  const out: BulkProductPatch = { id: p.id }
  let changed = false
  if (e.shelf != null && e.shelf.trim() !== p.shelf) {
    out.shelf = e.shelf.trim()
    changed = true
  }
  if (e.stock != null) {
    const n = parseNum(e.stock) ?? 0
    if (n !== Number(p.stock)) {
      out.stock = n
      changed = true
    }
  }
  if (e.price != null) {
    const n = parseNum(e.price) ?? 0
    if (n !== round2(p.price)) {
      out.price = n
      changed = true
    }
  }
  if (e.card_price != null) {
    const n = parseNum(e.card_price)
    if (n !== (p.card_price == null ? null : round2(p.card_price))) {
      out.card_price = n
      changed = true
    }
  }
  return changed ? out : null
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function Stock(): ReactNode {
  const { settings, toast } = useApp()
  const threshold = settings?.low_stock_threshold ?? 5
  const cardPct = settings?.card_price_pct ?? 0
  const [tab, setTab] = useState<Tab>('list')

  const [q, setQ] = useState('')
  const dq = useDebounced(q, 120)
  const [sort, setSort] = useState<{ sort: SortKey; sortDir: 'asc' | 'desc' }>({ sort: 'sku', sortDir: 'asc' })
  const [includeInactive, setIncludeInactive] = useState(false)
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<Map<number, Product>>(new Map())
  const [loading, setLoading] = useState(false)
  const [version, setVersion] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)
  const [edits, setEdits] = useState<Map<number, Edit>>(new Map())
  const [selected, setSelected] = useState<Map<number, Product>>(new Map())
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [gotoText, setGotoText] = useState('')
  const [dups, setDups] = useState<DuplicateGroup[] | null>(null)
  const [dupsLoading, setDupsLoading] = useState(false)
  const [dupQ, setDupQ] = useState('')
  const [merging, setMerging] = useState<Product[] | null>(null)
  const pendingPages = useRef(new Set<number>())
  const bodyRef = useRef<HTMLDivElement>(null)

  const filter = useMemo<ProductFilter>(() => ({ q: dq, ...sort, includeInactive }), [dq, sort, includeInactive])

  useEffect(() => onEvent('products:changed', () => setVersion((v) => v + 1)), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    pendingPages.current.clear()
    api('products:search', { ...filter, offset: 0, limit: PAGE })
      .then((page) => {
        if (cancelled) return
        const m = new Map<number, Product>()
        page.items.forEach((p, i) => m.set(i, p))
        setRows(m)
        setTotal(page.total)
      })
      .catch((e) => toast(e.message, 'error'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [filter, version])
  useEffect(() => {
    setActiveIdx(0)
    bodyRef.current?.scrollTo({ top: 0 })
  }, [filter])

  const loadPage = useCallback(
    (pageNo: number) => {
      if (pendingPages.current.has(pageNo)) return
      pendingPages.current.add(pageNo)
      api('products:search', { ...filter, offset: pageNo * PAGE, limit: PAGE })
        .then((page) => {
          setRows((prev) => {
            const m = new Map(prev)
            page.items.forEach((p, i) => m.set(pageNo * PAGE + i, p))
            return m
          })
        })
        .catch((e) => toast(e.message, 'error'))
    },
    [filter, toast]
  )

  const rowH = settings?.density === 'compact' ? 38 : 46
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

  const loadDups = useCallback((): void => {
    setDupsLoading(true)
    api('products:duplicates', undefined)
      .then(setDups)
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setDupsLoading(false))
  }, [toast])
  useEffect(() => {
    if (tab === 'dups') loadDups()
  }, [tab, version, loadDups])

  const gridCols = COLUMNS.map((c) => c.width).join(' ')
  const toggleSort = (s: SortKey): void => setSort((f) => ({ sort: s, sortDir: f.sort === s && f.sortDir === 'asc' ? 'desc' : 'asc' }))

  const setEdit = (p: Product, k: EditKey, v: string): void =>
    setEdits((m) => {
      const next = new Map(m)
      const cur = { ...(next.get(p.id) ?? {}), [k]: v }
      if (v === editText(p, k)) delete cur[k]
      if (Object.keys(cur).length) next.set(p.id, cur)
      else next.delete(p.id)
      return next
    })
  const revertRow = (id: number): void =>
    setEdits((m) => {
      const next = new Map(m)
      next.delete(id)
      return next
    })

  const patches = useMemo(() => {
    const out: BulkProductPatch[] = []
    const byId = new Map<number, Product>()
    rows.forEach((p) => byId.set(p.id, p))
    edits.forEach((e, id) => {
      const p = byId.get(id) ?? selected.get(id)
      if (!p) return
      const patch = toPatch(p, e)
      if (patch) out.push(patch)
    })
    return out
  }, [edits, rows, selected])

  const saveAll = async (): Promise<void> => {
    if (!patches.length) {
      setEdits(new Map())
      return
    }
    setSaving(true)
    try {
      const saved = await api('products:bulkUpdate', patches)
      setEdits(new Map())
      toast(`${saved.length} ürün güncellendi.`, 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (tab !== 'list') return
        e.preventDefault()
        if (edits.size && !saving) saveAll()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const toggleSelect = (p: Product): void =>
    setSelected((m) => {
      const next = new Map(m)
      if (next.has(p.id)) next.delete(p.id)
      else next.set(p.id, p)
      return next
    })
  const loaded = useMemo(() => [...rows.values()], [rows])
  const allLoadedSelected = loaded.length > 0 && loaded.every((p) => selected.has(p.id))
  const toggleAll = (): void =>
    setSelected((m) => {
      const next = new Map(m)
      if (allLoadedSelected) loaded.forEach((p) => next.delete(p.id))
      else loaded.forEach((p) => next.set(p.id, p))
      return next
    })

  const deleteSelected = async (): Promise<void> => {
    setConfirmDelete(false)
    try {
      await api('products:bulkDelete', [...selected.keys()])
      toast(`${selected.size} ürün silindi.`, 'success')
      setSelected(new Map())
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const jump = (idx: number): void => {
    if (!total) return
    const i = Math.min(total - 1, Math.max(0, idx))
    setActiveIdx(i)
    virt.scrollToIndex(i, { align: 'start' })
  }

  const onCellKey = (e: React.KeyboardEvent<HTMLInputElement>, idx: number, k: EditKey): void => {
    if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = e.key === 'ArrowUp' ? idx - 1 : idx + 1
      if (next < 0 || next >= total) return
      virt.scrollToIndex(next, { align: 'auto' })
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-cell="${next}:${k}"]`)?.focus())
    } else if (e.key === 'Escape') {
      const p = rows.get(idx)
      if (p) setEdit(p, k, editText(p, k))
    }
  }

  const cell = (p: Product, idx: number, k: EditKey, label: string, extra?: ReactNode): ReactNode => {
    const e = edits.get(p.id)
    const dirty = e?.[k] != null
    const value = dirty ? e[k]! : editText(p, k)
    return (
      <div className={`cell edit-cell${k === 'shelf' ? '' : ' right'}`} role="gridcell">
        {extra}
        <input
          className={`cell-input${dirty ? ' dirty' : ''}${k === 'shelf' ? ' shelf' : ' num'}`}
          data-cell={`${idx}:${k}`}
          aria-label={`${p.sku} ${label}`}
          inputMode={k === 'shelf' ? 'text' : 'decimal'}
          value={value}
          title={k === 'shelf' && value ? value : undefined}
          placeholder={k === 'card_price' ? (cardPct > 0 ? `%${cardPct}` : '—') : k === 'shelf' ? 'Raf' : ''}
          onChange={(ev) => setEdit(p, k, ev.target.value)}
          onKeyDown={(ev) => onCellKey(ev, idx, k)}
          onClick={(ev) => ev.stopPropagation()}
          onFocus={() => setActiveIdx(idx)}
        />
      </div>
    )
  }

  const visibleDups = useMemo(() => {
    if (!dups) return []
    const s = dupQ.trim().toLocaleUpperCase('tr-TR')
    return s ? dups.filter((g) => g.designation.includes(s) || g.brand.toLocaleUpperCase('tr-TR').includes(s) || g.items.some((i) => i.sku.toLocaleUpperCase('tr-TR').includes(s))) : dups
  }, [dups, dupQ])

  return (
    <div className="stock-page">
      <div className="tabs" role="tablist" style={{ margin: 0, padding: '0 14px', background: 'var(--bg-elev)' }}>
        <button role="tab" className="tab" aria-selected={tab === 'list'} onClick={() => setTab('list')}>
          <SlidersHorizontal size={16} aria-hidden style={{ verticalAlign: -3, marginRight: 6 }} />
          Ürünler
        </button>
        <button role="tab" className="tab" aria-selected={tab === 'quick'} onClick={() => setTab('quick')}>
          <TableProperties size={16} aria-hidden style={{ verticalAlign: -3, marginRight: 6 }} />
          Hızlı giriş
        </button>
        <button role="tab" className="tab" aria-selected={tab === 'dups'} onClick={() => setTab('dups')}>
          <Copy size={16} aria-hidden style={{ verticalAlign: -3, marginRight: 6 }} />
          Mükerrer ürünler{dups ? ` (${dups.length})` : ''}
        </button>
      </div>

      {tab === 'list' && (
        <section className="catalog-main" aria-label="Stok listesi" role="tabpanel">
          <div className="toolbar">
            <div className="search-box plain" style={{ maxWidth: 440, minWidth: 300 }}>
              <Search size={20} aria-hidden />
              <input
                id="stock-search"
                className="input"
                type="search"
                placeholder="Kod, marka veya raf ara…"
                aria-label="Stokta ara"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setQ('')
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    bodyRef.current?.focus()
                  }
                }}
                autoFocus
              />
            </div>
            <label className="row small" style={{ gap: 6 }}>
              <span className="muted">Sırala</span>
              <select className="select sm" style={{ width: 130 }} value={sort.sort} onChange={(e) => setSort((s) => ({ ...s, sort: e.target.value as SortKey }))} aria-label="Sıralama">
                <option value="sku">Ürün kodu</option>
                <option value="shelf">Raf</option>
                <option value="stock">Stok</option>
                <option value="price">Peşin fiyat</option>
                <option value="updated">Güncelleme</option>
              </select>
            </label>
            <label className="check small">
              <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} /> Pasifleri göster
            </label>
            <span className="spacer" />
            <button
              className="btn"
              title="Bu listeyi (arama ve sıralamayla) Excel olarak kaydet"
              onClick={() => {
                api('products:exportExcel', filter)
                  .then((path) => path && toast(`Excel kaydedildi: ${path}`, 'success'))
                  .catch((e: Error) => toast(e.message, 'error'))
              }}
            >
              <Download size={16} aria-hidden /> Excel dışa aktar
            </button>
            <button className="btn" onClick={() => setEditing('new')}>
              <Plus size={16} aria-hidden /> Yeni ürün
            </button>
          </div>

          <div className={`toolbar bulk-bar${selected.size ? ' on' : ''}`} aria-live="polite">
            {selected.size ? (
              <>
                <strong>{num(selected.size)} ürün seçili</strong>
                <button className="btn sm" onClick={() => setBulkOpen(true)}>
                  <SlidersHorizontal size={14} aria-hidden /> Toplu düzenle
                </button>
                <button className="btn sm danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} aria-hidden /> Sil
                </button>
                <button className="btn sm ghost" onClick={() => setSelected(new Map())}>
                  Seçimi kaldır
                </button>
              </>
            ) : (
              <span className="small muted">Satırların başındaki kutucuklarla ürün seçin; stok, raf ve fiyat hücrelerine doğrudan yazabilirsiniz (Enter ile alt satıra geçer).</span>
            )}
            <span className="spacer" />
            {edits.size > 0 && (
              <>
                <span className="badge low">{num(edits.size)} satırda kaydedilmemiş değişiklik</span>
                <button className="btn sm ghost" onClick={() => setEdits(new Map())} disabled={saving}>
                  <RotateCcw size={14} aria-hidden /> Geri al
                </button>
                <button className="btn sm primary" onClick={saveAll} disabled={saving || !patches.length} title="Ctrl+S">
                  <Save size={14} aria-hidden /> Kaydet
                </button>
              </>
            )}
          </div>

          <div className="vgrid" style={{ ['--cols' as string]: gridCols }}>
            <div className="vgrid-head" role="row">
              {COLUMNS.map((c) =>
                c.key === 'sel' ? (
                  <div key={c.key} role="columnheader">
                    <input type="checkbox" checked={allLoadedSelected} onChange={toggleAll} aria-label="Yüklü satırların tümünü seç" title="Yüklü satırların tümünü seç" />
                  </div>
                ) : (
                  <div key={c.key} role="columnheader" aria-sort={sort.sort === c.sort ? (sort.sortDir === 'desc' ? 'descending' : 'ascending') : undefined} className={c.align === 'right' ? 'right' : ''}>
                    {c.sort ? (
                      <button onClick={() => toggleSort(c.sort!)} title={`${c.label} sütununa göre sırala`}>
                        {c.label}
                        {sort.sort === c.sort && (sort.sortDir === 'desc' ? <ArrowDown size={14} aria-hidden /> : <ArrowUp size={14} aria-hidden />)}
                      </button>
                    ) : (
                      c.label
                    )}
                  </div>
                )
              )}
            </div>
            <div ref={bodyRef} className="vgrid-body" role="grid" tabIndex={0} aria-label="Stok ürünleri" aria-rowcount={total} aria-busy={loading}>
              {total === 0 && !loading && (
                <div className="empty">
                  <h3>Ürün bulunamadı</h3>
                  <p>Aramayı değiştirin veya yeni ürün ekleyin.</p>
                </div>
              )}
              <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
                {vItems.map((v) => {
                  const p = rows.get(v.index)
                  if (!p)
                    return (
                      <div key={v.key} className={`vrow${v.index % 2 ? ' odd' : ''}`} role="row" aria-rowindex={v.index + 1} style={{ transform: `translateY(${v.start}px)`, height: v.size }}>
                        <div className="cell faint">…</div>
                      </div>
                    )
                  const e = edits.get(p.id)
                  const stockNow = e?.stock != null ? (parseNum(e.stock) ?? 0) : p.stock
                  const lvl = stockLevel(stockNow, threshold)
                  const isSel = selected.has(p.id)
                  return (
                    <div
                      key={v.key}
                      className={`vrow stock-row${v.index % 2 ? ' odd' : ''}${p.active ? '' : ' inactive'}${e ? ' dirty' : ''}`}
                      role="row"
                      aria-rowindex={v.index + 1}
                      aria-selected={isSel || v.index === activeIdx}
                      style={{ transform: `translateY(${v.start}px)`, height: v.size }}
                      onClick={() => setActiveIdx(v.index)}
                    >
                      <div className="cell" role="gridcell">
                        <input type="checkbox" checked={isSel} onChange={() => toggleSelect(p)} aria-label={`${p.sku} seç`} onClick={(ev) => ev.stopPropagation()} />
                      </div>
                      {cell(p, v.index, 'shelf', 'raf')}
                      <div className="cell sku" role="gridcell" title={p.name}>
                        {p.sku}
                        {!p.active && (
                          <span className="badge neutral" style={{ marginLeft: 8 }}>
                            Pasif
                          </span>
                        )}
                      </div>
                      <div className="cell muted" role="gridcell">
                        {p.brand}
                      </div>
                      {cell(p, v.index, 'stock', 'stok', <span className={`stock-dot ${lvl.cls}`} title={lvl.label} aria-label={lvl.label} />)}
                      {cell(p, v.index, 'price', 'peşin fiyat')}
                      {cell(
                        p,
                        v.index,
                        'card_price',
                        'kredi kartı fiyatı',
                        p.card_price == null && cardPct > 0 ? (
                          <span className="faint small nowrap" title="Otomatik (peşin + %)">
                            {money(cardPrice(p.price, null, cardPct) ?? 0, p.currency)}
                          </span>
                        ) : undefined
                      )}
                      <div className="cell" role="gridcell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                        {e && (
                          <button className="btn ghost icon sm" onClick={(ev) => (ev.stopPropagation(), revertRow(p.id))} aria-label={`${p.sku} değişikliklerini geri al`} title="Geri al">
                            <RotateCcw size={15} aria-hidden />
                          </button>
                        )}
                        <button className="btn ghost icon sm" onClick={(ev) => (ev.stopPropagation(), setEditing(p))} aria-label={`${p.sku} ayrıntılı düzenle`} title="Ayrıntılı düzenle">
                          <Pencil size={15} aria-hidden />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="toolbar small muted" style={{ borderTop: '1px solid var(--border)', borderBottom: 0, padding: '6px 14px' }} aria-live="polite">
              {loading ? 'Aranıyor…' : `${num(total)} ürün`}
              {total > 0 && <span className="faint"> · {num(activeIdx + 1)}. satır</span>}
              <span className="spacer" />
              <label className="row small" style={{ gap: 6 }}>
                <span className="muted">Satıra git</span>
                <input
                  className="input sm"
                  style={{ width: 84 }}
                  inputMode="numeric"
                  aria-label="Satır numarası"
                  value={gotoText}
                  onChange={(e) => setGotoText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') jump(Number(gotoText) - 1)
                  }}
                />
              </label>
              <button className="btn sm" onClick={() => jump(0)} disabled={!total} title="En üste (Home)">
                <ArrowUpToLine size={15} aria-hidden /> En üst
              </button>
              <button className="btn sm" onClick={() => jump(total - 1)} disabled={!total} title="En alta (End)">
                <ArrowDownToLine size={15} aria-hidden /> En alt
              </button>
            </div>
          </div>

          <div className="jump-fab" aria-hidden={!total}>
            <button className="btn icon" onClick={() => jump(0)} aria-label="En üste git" title="En üste" disabled={!total}>
              <ArrowUpToLine size={18} aria-hidden />
            </button>
            <button className="btn icon" onClick={() => jump(total - 1)} aria-label="En alta git" title="En alta" disabled={!total}>
              <ArrowDownToLine size={18} aria-hidden />
            </button>
          </div>
        </section>
      )}

      {tab === 'quick' && <QuickEntry onSaved={() => setSelected(new Map())} />}

      {tab === 'dups' && (
        <section className="catalog-main" aria-label="Mükerrer ürünler" role="tabpanel">
          <div className="toolbar">
            <div className="search-box plain" style={{ maxWidth: 360 }}>
              <Search size={20} aria-hidden />
              <input className="input" type="search" placeholder="Grup içinde ara…" aria-label="Mükerrer gruplarda ara" value={dupQ} onChange={(e) => setDupQ(e.target.value)} />
            </div>
            <span className="small muted">Kod normalize edilip (kutulu/orijinal gibi ekler atılır) marka aynıysa aynı ürün sayılır.</span>
            <span className="spacer" />
            <button className="btn" onClick={() => setMerging([])}>
              <GitMerge size={16} aria-hidden /> Elle birleştir
            </button>
            <button className="btn icon" onClick={loadDups} aria-label="Yenile" title="Yenile" disabled={dupsLoading}>
              <RefreshCw size={16} aria-hidden className={dupsLoading ? 'spin' : undefined} />
            </button>
          </div>
          <div className="dup-groups" aria-busy={dupsLoading}>
            {dups && dups.length === 0 && (
              <div className="empty">
                <h3>Mükerrer ürün bulunamadı</h3>
                <p>Gözünüze çarpan bir çift varsa "Elle birleştir" ile seçip birleştirebilirsiniz.</p>
              </div>
            )}
            {visibleDups.map((g) => (
              <article key={g.key} className="dup-group card">
                <header>
                  <span className="sku">{g.designation}</span>
                  <span className="badge neutral">{g.brand || 'markasız'}</span>
                  <span className="muted small">{g.items.length} kayıt</span>
                  <span className="spacer" />
                  <button className="btn sm primary" onClick={() => setMerging(g.items)}>
                    <GitMerge size={14} aria-hidden /> Birleştir
                  </button>
                </header>
                <ul>
                  {g.items.map((p) => {
                    const lvl = stockLevel(p.stock, threshold)
                    return (
                      <li key={p.id}>
                        <span className="sku">{p.sku}</span>
                        <span className="muted truncate" title={p.name}>
                          {p.name}
                        </span>
                        <span className={`badge ${lvl.cls}`}>{lvl.label}</span>
                        <span className="nowrap">{money(p.price, p.currency)}</span>
                        {p.shelf ? <span className="shelf-tag sm">{p.shelf}</span> : <span className="faint">—</span>}
                        <button className="btn ghost icon sm" onClick={() => setEditing(p)} aria-label={`${p.sku} düzenle`} title="Düzenle">
                          <Pencil size={14} aria-hidden />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      {editing && (
        <ProductEditor
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
          onGoto={(p) => setEditing(p)}
        />
      )}
      {merging && (
        <MergeDialog
          initial={merging}
          onClose={() => setMerging(null)}
          onMerged={() => {
            setMerging(null)
            setSelected(new Map())
          }}
        />
      )}
      {bulkOpen && (
        <BulkEdit
          items={[...selected.values()]}
          cardPct={cardPct}
          onClose={() => setBulkOpen(false)}
          onDone={() => {
            setBulkOpen(false)
            setSelected(new Map())
          }}
        />
      )}
      <Confirm
        open={confirmDelete}
        title="Seçili ürünleri sil"
        text={`${num(selected.size)} ürün silinecek ve tüm bilgisayarlardaki listelerden kalkacak. Geçmiş siparişler korunur. Emin misiniz?`}
        danger
        confirmLabel="Sil"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deleteSelected}
      />
    </div>
  )
}

type StockMode = 'keep' | 'set' | 'add' | 'sub'
type PriceMode = 'keep' | 'set' | 'pct'
type CardMode = 'keep' | 'set' | 'auto'
type ActiveMode = 'keep' | 'on' | 'off'

function BulkEdit({ items, cardPct, onClose, onDone }: { items: Product[]; cardPct: number; onClose: () => void; onDone: () => void }): ReactNode {
  const { toast } = useApp()
  const [stockMode, setStockMode] = useState<StockMode>('keep')
  const [stockVal, setStockVal] = useState('')
  const [shelfOn, setShelfOn] = useState(false)
  const [shelf, setShelf] = useState('')
  const [priceMode, setPriceMode] = useState<PriceMode>('keep')
  const [priceVal, setPriceVal] = useState('')
  const [cardMode, setCardMode] = useState<CardMode>('keep')
  const [cardVal, setCardVal] = useState('')
  const [active, setActive] = useState<ActiveMode>('keep')
  const [busy, setBusy] = useState(false)

  const rows = useMemo<BulkProductPatch[]>(() => {
    const sv = parseNum(stockVal) ?? 0
    const pv = parseNum(priceVal) ?? 0
    const cv = parseNum(cardVal)
    return items.map((p) => {
      const r: BulkProductPatch = { id: p.id }
      if (stockMode === 'set') r.stock = sv
      else if (stockMode === 'add') r.stock = p.stock + sv
      else if (stockMode === 'sub') r.stock = p.stock - sv
      if (shelfOn) r.shelf = shelf.trim()
      if (priceMode === 'set') r.price = pv
      else if (priceMode === 'pct') r.price = Math.round(p.price * (1 + pv / 100) * 100) / 100
      if (cardMode === 'set') r.card_price = cv
      else if (cardMode === 'auto') r.card_price = null
      if (active === 'on') r.active = true
      else if (active === 'off') r.active = false
      return r
    })
  }, [items, stockMode, stockVal, shelfOn, shelf, priceMode, priceVal, cardMode, cardVal, active])

  const changes = stockMode !== 'keep' || shelfOn || priceMode !== 'keep' || cardMode !== 'keep' || active !== 'keep'

  const apply = async (): Promise<void> => {
    setBusy(true)
    try {
      const saved = await api('products:bulkUpdate', rows)
      toast(`${saved.length} ürün güncellendi.`, 'success')
      onDone()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const sample = rows[0]
  const first = items[0]

  return (
    <Modal
      open
      title={`Toplu düzenle – ${num(items.length)} ürün`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Vazgeç
          </button>
          <button className="btn primary" onClick={apply} disabled={!changes || busy}>
            <Save size={16} aria-hidden /> {num(items.length)} ürüne uygula
          </button>
        </>
      }
    >
      <div className="grid" style={{ gap: 14 }}>
        <Field label="Stok">
          {(id) => (
            <div className="row" style={{ gap: 8 }}>
              <select id={id} className="select" style={{ width: 200 }} value={stockMode} onChange={(e) => setStockMode(e.target.value as StockMode)}>
                <option value="keep">Değiştirme</option>
                <option value="set">Şu değere ayarla</option>
                <option value="add">Şu kadar ekle</option>
                <option value="sub">Şu kadar düş</option>
              </select>
              <input className="input" inputMode="decimal" aria-label="Stok değeri" value={stockVal} onChange={(e) => setStockVal(e.target.value)} disabled={stockMode === 'keep'} style={{ width: 140 }} />
            </div>
          )}
        </Field>
        <Field label="Raf">
          {(id) => (
            <div className="row" style={{ gap: 8 }}>
              <label className="check" style={{ width: 200 }}>
                <input type="checkbox" checked={shelfOn} onChange={(e) => setShelfOn(e.target.checked)} /> Rafı değiştir
              </label>
              <input id={id} className="input" aria-label="Yeni raf" placeholder="örn. A-12" value={shelf} onChange={(e) => setShelf(e.target.value)} disabled={!shelfOn} style={{ width: 140 }} />
            </div>
          )}
        </Field>
        <Field label="Peşin fiyat">
          {(id) => (
            <div className="row" style={{ gap: 8 }}>
              <select id={id} className="select" style={{ width: 200 }} value={priceMode} onChange={(e) => setPriceMode(e.target.value as PriceMode)}>
                <option value="keep">Değiştirme</option>
                <option value="set">Şu değere ayarla</option>
                <option value="pct">Yüzde değiştir (örn. 10 veya -5)</option>
              </select>
              <input className="input" inputMode="decimal" aria-label="Fiyat değeri" value={priceVal} onChange={(e) => setPriceVal(e.target.value)} disabled={priceMode === 'keep'} style={{ width: 140 }} />
            </div>
          )}
        </Field>
        <Field label="Kredi kartı fiyatı" hint={cardPct > 0 ? `Otomatik: peşin fiyat + %${cardPct}` : undefined}>
          {(id) => (
            <div className="row" style={{ gap: 8 }}>
              <select id={id} className="select" style={{ width: 200 }} value={cardMode} onChange={(e) => setCardMode(e.target.value as CardMode)}>
                <option value="keep">Değiştirme</option>
                <option value="set">Şu değere ayarla</option>
                <option value="auto">Otomatik hesaplansın</option>
              </select>
              <input className="input" inputMode="decimal" aria-label="Kart fiyatı değeri" value={cardVal} onChange={(e) => setCardVal(e.target.value)} disabled={cardMode !== 'set'} style={{ width: 140 }} />
            </div>
          )}
        </Field>
        <Field label="Durum">
          {(id) => (
            <select id={id} className="select" style={{ width: 200 }} value={active} onChange={(e) => setActive(e.target.value as ActiveMode)}>
              <option value="keep">Değiştirme</option>
              <option value="on">Aktif yap (listede görünsün)</option>
              <option value="off">Pasif yap (listeden gizle)</option>
            </select>
          )}
        </Field>
        {changes && sample && first && (
          <div className="small muted">
            Örnek: <span className="sku">{first.sku}</span> → stok {num(sample.stock ?? first.stock)}, raf {(sample.shelf ?? first.shelf) || '—'}, peşin {money(sample.price ?? first.price, first.currency)}
          </div>
        )}
      </div>
    </Modal>
  )
}
