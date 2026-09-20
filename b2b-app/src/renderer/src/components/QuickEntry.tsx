import { normalize as norm, productKey } from '@shared/identity'
import type { Product, QuickEntryResult, QuickEntryRow } from '@shared/types'
import { AlertTriangle, ClipboardPaste, Eraser, Info, Keyboard, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Modal } from '@/components/ui'
import { api } from '@/lib/api'
import { num } from '@/lib/format'
import { useApp } from '@/store/app'

type Col = 'shelf' | 'sku' | 'brand' | 'stock' | 'box' | 'price' | 'note'

interface Row {
  id: number
  shelf: string
  sku: string
  brand: string
  stock: string
  box: string
  price: string
  note: string
  existing: 'add' | 'set'
  error?: string
}

/** Same column order as the shop's Excel sheet, so a copied block pastes straight in. */
const COLS: { key: Col; label: string; width: string; hint?: string; numeric?: boolean }[] = [
  { key: 'shelf', label: 'Raf', width: 'minmax(170px, 1fr)', hint: 'Boş bırakılırsa üstteki satırdan gelir' },
  { key: 'sku', label: 'Ürün kodu', width: 'minmax(200px, 1.4fr)' },
  { key: 'brand', label: 'Marka', width: 'minmax(100px, 0.7fr)' },
  { key: 'stock', label: 'Adet', width: '84px', numeric: true },
  { key: 'box', label: 'Kutu durumu', width: 'minmax(130px, 0.9fr)' },
  { key: 'price', label: 'Peşin fiyat', width: '104px', numeric: true },
  { key: 'note', label: 'Açıklama', width: 'minmax(140px, 1.1fr)' }
]
const ORDER = COLS.map((c) => c.key)
const MIN_ROWS = 12

let seq = 1
const blank = (shelf = ''): Row => ({ id: seq++, shelf, sku: '', brand: '', stock: '', box: '', price: '', note: '', existing: 'add' })
const isEmpty = (r: Row): boolean => !r.sku.trim() && !r.brand.trim() && !r.stock.trim() && !r.box.trim() && !r.price.trim() && !r.note.trim()

const rowKey = (r: Row): string => productKey(r.sku, r.brand, r.box)
const variantLabel = (p: Product): string => `${p.sku} · ${p.brand || 'markasız'}${p.box ? ` · ${p.box}` : ''}`

const parseNum = (s: string): number | null => {
  let t = s.replace(/[^\d.,-]/g, '')
  if (!t) return null
  const lc = t.lastIndexOf(',')
  const ld = t.lastIndexOf('.')
  if (lc > -1 && ld > -1) t = lc > ld ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')
  else if (lc > -1) t = t.replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function parseClipboard(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  const cells = lines.map((l) => l.split('\t').map((c) => c.trim()))
  if (cells.length && /^raf/i.test(cells[0][0] ?? '') && cells[0].some((c) => /ürün|urun|marka|adet/i.test(c))) cells.shift()
  return cells
}

export function QuickEntry({ onSaved }: { onSaved: () => void }): ReactNode {
  const { toast } = useApp()
  const [confirmSet, setConfirmSet] = useState(false)
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: MIN_ROWS }, () => blank()))
  const [found, setFound] = useState<Product[]>([])
  const known = useMemo(() => new Map(found.map((p) => [productKey(p.sku, p.brand, p.box), p])), [found])
  const variants = useMemo(() => {
    const m = new Map<string, Product[]>()
    found.forEach((p) => m.set(norm(p.sku), [...(m.get(norm(p.sku)) ?? []), p]))
    return m
  }, [found])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<QuickEntryResult | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const skuSig = useMemo(() => [...new Set(rows.map((r) => r.sku.trim()).filter(Boolean))].join('\n'), [rows])
  useEffect(() => {
    if (!skuSig) return
    const t = setTimeout(() => {
      api('products:bySkus', skuSig.split('\n'))
        .then(setFound)
        .catch(() => undefined)
    }, 250)
    return () => clearTimeout(t)
  }, [skuSig])

  const filled = useMemo(() => rows.filter((r) => r.sku.trim()), [rows])
  const dupInBatch = useMemo(() => {
    const seen = new Map<string, number>()
    filled.forEach((r) => seen.set(rowKey(r), (seen.get(rowKey(r)) ?? 0) + 1))
    return seen
  }, [filled])
  const totalQty = useMemo(() => filled.reduce((s, r) => s + (parseNum(r.stock) ?? 0), 0), [filled])

  const ensureTail = (list: Row[]): Row[] => {
    const out = [...list]
    const tailBlank = (): boolean => out.length >= 2 && isEmpty(out[out.length - 1]) && isEmpty(out[out.length - 2])
    while (out.length < MIN_ROWS || !tailBlank()) out.push(blank(out[out.length - 1]?.shelf ?? ''))
    return out
  }

  const update = (idx: number, key: Col, value: string): void => {
    setRows((list) => {
      const next = list.map((r, i) => (i === idx ? { ...r, [key]: value, error: undefined } : r))
      if (key === 'shelf') {
        for (let i = idx + 1; i < next.length && isEmpty(next[i]); i++) next[i] = { ...next[i], shelf: value }
      }
      return ensureTail(next)
    })
  }

  const setMode = (idx: number, existing: Row['existing']): void => setRows((list) => list.map((r, i) => (i === idx ? { ...r, existing } : r)))

  const removeRow = (idx: number): void => setRows((list) => ensureTail(list.filter((_, i) => i !== idx)))

  const focusCell = useCallback((idx: number, key: Col): void => {
    const find = (): HTMLInputElement | null => gridRef.current?.querySelector<HTMLInputElement>(`[data-qe="${idx}:${key}"]`) ?? null
    const go = (el: HTMLInputElement): void => {
      el.focus()
      el.select()
    }
    const now = find()
    if (now) go(now)
    else
      requestAnimationFrame(() => {
        const el = find()
        if (el) go(el)
      })
  }, [])

  const onKey = (ev: KeyboardEvent<HTMLInputElement>, idx: number, key: Col): void => {
    const ci = ORDER.indexOf(key)
    if (ev.key === 'Enter') {
      ev.preventDefault()
      const to = ev.shiftKey ? Math.max(0, idx - 1) : idx + 1
      if (to >= rows.length) setRows((list) => ensureTail([...list, blank(list[list.length - 1]?.shelf)]))
      focusCell(to, key)
    } else if (ev.key === 'ArrowDown' && !ev.altKey) {
      ev.preventDefault()
      focusCell(Math.min(rows.length - 1, idx + 1), key)
    } else if (ev.key === 'ArrowUp' && !ev.altKey) {
      ev.preventDefault()
      focusCell(Math.max(0, idx - 1), key)
    } else if (ev.key === 'ArrowRight' && ev.currentTarget.selectionStart === ev.currentTarget.value.length && ci < ORDER.length - 1) {
      ev.preventDefault()
      focusCell(idx, ORDER[ci + 1])
    } else if (ev.key === 'ArrowLeft' && ev.currentTarget.selectionStart === 0 && ci > 0) {
      ev.preventDefault()
      focusCell(idx, ORDER[ci - 1])
    } else if (ev.key === 'Delete' && ev.shiftKey) {
      ev.preventDefault()
      removeRow(idx)
      focusCell(Math.min(idx, rows.length - 2), key)
    }
  }

  const onPaste = (ev: ClipboardEvent<HTMLInputElement>, idx: number, key: Col): void => {
    const text = ev.clipboardData.getData('text/plain')
    if (!text.includes('\t') && !text.includes('\n')) return
    ev.preventDefault()
    const block = parseClipboard(text)
    if (!block.length) return
    const startCol = ORDER.indexOf(key)
    setRows((list) => {
      const next = [...list]
      block.forEach((cells, r) => {
        const at = idx + r
        while (next.length <= at) next.push(blank(next[next.length - 1]?.shelf))
        const row = { ...next[at], error: undefined }
        cells.forEach((c, k) => {
          const col = ORDER[startCol + k]
          if (col) row[col] = c
        })
        if (!row.shelf.trim() && at > 0) row.shelf = next[at - 1].shelf
        next[at] = row
      })
      return ensureTail(next)
    })
    toast(`${block.length} satır yapıştırıldı.`, 'info')
    focusCell(idx + block.length, 'sku')
  }

  const clearAll = (): void => {
    setRows(Array.from({ length: MIN_ROWS }, () => blank()))
    setResult(null)
    focusCell(0, 'shelf')
  }

  const overwrites = useMemo(
    () =>
      filled
        .filter((r) => r.existing === 'set' && known.has(rowKey(r)))
        .map((r) => {
          const hit = known.get(rowKey(r))!
          return { id: r.id, sku: variantLabel(hit), from: Number(hit.stock), to: parseNum(r.stock) ?? 0 }
        }),
    [filled, known]
  )

  const save = async (): Promise<void> => {
    if (!filled.length) return toast('Kaydedilecek satır yok.', 'info')
    const bad = filled.find((r) => r.stock.trim() && parseNum(r.stock) == null)
    if (bad) return toast(`"${bad.sku}" satırındaki adet sayı değil.`, 'error')
    if (overwrites.length) {
      setConfirmSet(true)
      return
    }
    await commit()
  }

  const commit = async (): Promise<void> => {
    setConfirmSet(false)
    const payload: QuickEntryRow[] = filled.map((r) => ({
      shelf: r.shelf.trim(),
      sku: r.sku.trim(),
      brand: r.brand.trim(),
      box: r.box.trim(),
      stock: parseNum(r.stock) ?? 0,
      price: parseNum(r.price),
      description: r.note.trim(),
      existing: r.existing
    }))
    setBusy(true)
    try {
      const res = await api('products:quickEntry', payload)
      setResult(res)
      const failed = new Map(res.errors.map((e) => [e.key, e.message]))
      setRows((list) => {
        const keep = list.filter((r) => r.sku.trim() && failed.has(rowKey(r))).map((r) => ({ ...r, error: failed.get(rowKey(r)) }))
        return ensureTail(keep.length ? keep : [blank(list[list.length - 1]?.shelf)])
      })
      if (res.errors.length) toast(`${res.errors.length} satır kaydedilemedi; tabloda kaldı.`, 'error')
      else toast(`${res.created} yeni ürün, ${res.updated} stok güncellemesi kaydedildi.`, 'success')
      onSaved()
      focusCell(0, 'sku')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const template = `44px ${COLS.map((c) => c.width).join(' ')} 44px`
  const existingCount = filled.filter((r) => known.has(rowKey(r))).length

  return (
    <section className="quick-entry" aria-label="Hızlı stok girişi" role="tabpanel">
      <div className="toolbar">
        <div className="qe-help">
          <Keyboard size={18} aria-hidden />
          <span>
            Excel gibi yazın: <kbd>Tab</kbd> yan hücre, <kbd>Enter</kbd> alt satır, <kbd>Ctrl</kbd>+<kbd>S</kbd> kaydet. Excel'den kopyalayıp herhangi bir hücreye
            yapıştırın; raf üstteki satırdan otomatik gelir.
          </span>
        </div>
        <span className="spacer" />
        <button className="btn" onClick={clearAll} disabled={!filled.length || busy}>
          <Eraser size={16} aria-hidden /> Temizle
        </button>
        <button className="btn primary" onClick={save} disabled={!filled.length || busy}>
          <Save size={16} aria-hidden /> Kaydet {filled.length ? `(${filled.length})` : ''}
        </button>
      </div>

      {result && !result.errors.length && (
        <div className="qe-result" role="status">
          <b>{num(result.created)}</b> yeni ürün eklendi, <b>{num(result.updated)}</b> mevcut ürünün stoğu güncellendi.
        </div>
      )}

      <div className="qe-grid-wrap" ref={gridRef}>
        <div className="qe-grid" role="grid" aria-rowcount={rows.length} style={{ gridTemplateColumns: template }}>
          <div className="qe-head" role="row">
            <div className="qe-num" aria-hidden />
            {COLS.map((c) => (
              <div key={c.key} role="columnheader" className={c.numeric ? 'right' : undefined} title={c.hint}>
                {c.label}
              </div>
            ))}
            <div aria-hidden />
          </div>
          {rows.map((r, idx) => {
            const key = rowKey(r)
            const hit = r.sku.trim() ? known.get(key) : undefined
            const twice = r.sku.trim() && (dupInBatch.get(key) ?? 0) > 1
            const others = r.sku.trim() && !hit ? (variants.get(norm(r.sku)) ?? []).filter((p) => norm(p.brand) === norm(r.brand)) : []
            return (
              <div key={r.id} className={`qe-row${hit ? ' known' : ''}${r.error ? ' error' : ''}${isEmpty(r) ? ' blank' : ''}`} role="row" aria-rowindex={idx + 1}>
                <div className="qe-num" aria-hidden>
                  {idx + 1}
                </div>
                {COLS.map((c) => (
                  <div key={c.key} role="gridcell" className={`qe-cell${c.numeric ? ' right' : ''}`}>
                    <input
                      className={`cell-input${c.key === 'shelf' ? ' shelf' : c.numeric ? ' num' : ''}${c.key === 'sku' ? ' sku' : ''}`}
                      data-qe={`${idx}:${c.key}`}
                      aria-label={`Satır ${idx + 1} ${c.label}`}
                      value={r[c.key]}
                      inputMode={c.numeric ? 'decimal' : 'text'}
                      spellCheck={false}
                      autoComplete="off"
                      placeholder={c.key === 'sku' && idx === 0 ? 'örn. 6002 2RS' : c.key === 'stock' && idx === 0 ? '0' : ''}
                      onChange={(ev) => update(idx, c.key, ev.target.value)}
                      onKeyDown={(ev) => onKey(ev, idx, c.key)}
                      onPaste={(ev) => onPaste(ev, idx, c.key)}
                    />
                  </div>
                ))}
                <div role="gridcell" className="qe-cell center">
                  {!isEmpty(r) && (
                    <button type="button" className="btn ghost icon sm" tabIndex={-1} onClick={() => removeRow(idx)} aria-label={`Satır ${idx + 1} sil`} title="Satırı sil (Shift+Delete)">
                      <Trash2 size={14} aria-hidden />
                    </button>
                  )}
                </div>
                {(hit || twice || others.length > 0 || r.error) && (
                  <div className={`qe-note${!hit && !r.error && others.length ? ' variant' : ''}`} role="note">
                    {r.error ? (
                      <>
                        <AlertTriangle size={14} aria-hidden /> <span className="danger-text">{r.error}</span>
                      </>
                    ) : hit ? (
                      (() => {
                        const cur = Number(hit.stock)
                        const qty = parseNum(r.stock) ?? 0
                        const set = r.existing === 'set'
                        return (
                          <>
                            <span className="qe-known">
                              <AlertTriangle size={14} aria-hidden />
                              <span>
                                <b>{hit.sku}</b> zaten kayıtlı ({hit.brand || 'markasız'}
                                {hit.box ? `, ${hit.box}` : ''}) — mevcut stok <b>{num(cur)}</b>
                                {hit.shelf && (
                                  <>
                                    {' · raf '}
                                    <span className="shelf-tag sm" title={hit.shelf}>
                                      {hit.shelf}
                                    </span>
                                  </>
                                )}
                              </span>
                            </span>
                            <div className="qe-modes" role="radiogroup" aria-label={`${hit.sku} için stok işlemi`}>
                              <button
                                type="button"
                                role="radio"
                                aria-checked={!set}
                                className={`qe-mode-btn add${!set ? ' on' : ''}`}
                                tabIndex={-1}
                                onClick={() => setMode(idx, 'add')}
                              >
                                <span className="qe-mode-title">
                                  <Plus size={14} aria-hidden /> Stoğa ekle
                                </span>
                                <span className="qe-mode-math">
                                  {num(cur)} + {num(qty)} = <b>{num(cur + qty)}</b>
                                </span>
                              </button>
                              <button
                                type="button"
                                role="radio"
                                aria-checked={set}
                                className={`qe-mode-btn set${set ? ' on' : ''}`}
                                tabIndex={-1}
                                onClick={() => setMode(idx, 'set')}
                              >
                                <span className="qe-mode-title">
                                  <RefreshCw size={14} aria-hidden /> Üzerine yaz
                                </span>
                                <span className="qe-mode-math">
                                  {num(cur)} → <b>{num(qty)}</b>
                                </span>
                              </button>
                            </div>
                            {set && (
                              <span className="qe-set-warn" role="alert">
                                <AlertTriangle size={14} aria-hidden />
                                <span>
                                  Dikkat: <b>{hit.sku}</b> ürününün önceki <b>{num(cur)}</b> adet stoğu <u>silinir</u>, yerine <b>{num(qty)}</b> yazılır. Kaydederken tekrar onay istenir.
                                </span>
                              </span>
                            )}
                          </>
                        )
                      })()
                    ) : twice ? (
                      <>
                        <ClipboardPaste size={14} aria-hidden /> Bu ürün (aynı kod, marka ve kutu) tabloda birden fazla kez var; adetler toplanarak tek ürün olur.
                      </>
                    ) : (
                      <span className="qe-variant">
                        <Info size={13} aria-hidden />
                        <span>
                          Bilgi: bu ürünün{' '}
                          {others.slice(0, 3).map((p, i) => (
                            <span key={p.id}>
                              {i > 0 && ', '}
                              <b>{p.box || 'kutu durumu boş'}</b> hali ({num(Number(p.stock))} adet)
                            </span>
                          ))}
                          {others.length > 3 && ` +${others.length - 3}`} da kayıtlı — ayrı ürün olarak kalır.
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <footer className="qe-foot">
        <span>
          <b>{num(filled.length)}</b> satır · toplam <b>{num(totalQty)}</b> adet
        </span>
        {existingCount > 0 && (
          <span className="muted">
            {num(existingCount - overwrites.length)} satırda stoğa eklenir
            {overwrites.length > 0 && (
              <>
                , <b className="danger-text">{num(overwrites.length)} satırda stok üzerine yazılır</b>
              </>
            )}
            , {num(filled.length - existingCount)} yeni ürün
          </span>
        )}
        <span className="spacer" />
        <span className="muted small">Boş bırakılan fiyat 0 olarak kaydedilir; kayıtlı ürünlerde fiyat yalnızca yazıldıysa değişir.</span>
      </footer>

      <Modal
        open={confirmSet}
        title="Emin misiniz? Önceki stok silinecek"
        onClose={() => setConfirmSet(false)}
        footer={
          <>
            <button className="btn" onClick={() => setConfirmSet(false)} autoFocus>
              Vazgeç
            </button>
            <button className="btn danger" onClick={() => void commit()} disabled={busy}>
              <RefreshCw size={16} aria-hidden /> Evet, üzerine yaz ve kaydet
            </button>
          </>
        }
      >
        <p>
          <b>{num(overwrites.length)}</b> üründe "Üzerine yaz" seçili. Bu ürünlerin <b>mevcut stokları silinip</b> yerine yazdığınız adet kaydedilecek; bu işlem geri
          alınamaz.
        </p>
        <ul className="qe-confirm-list">
          {overwrites.slice(0, 12).map((o) => (
            <li key={o.id}>
              <span className="sku">{o.sku}</span>
              <span className="qe-mode-math">
                {num(o.from)} → <b>{num(o.to)}</b>
              </span>
            </li>
          ))}
          {overwrites.length > 12 && <li className="muted">… ve {num(overwrites.length - 12)} ürün daha</li>}
        </ul>
        <p className="muted small">Stoğu silmek istemiyorsanız "Vazgeç" deyip ilgili satırda "Stoğa ekle"yi seçin.</p>
      </Modal>
    </section>
  )
}
