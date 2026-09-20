import type { MergePatch, Product } from '@shared/types'
import { AlertTriangle, Check, Crown, GitMerge, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Confirm, Modal } from '@/components/ui'
import { api } from '@/lib/api'
import { money, num } from '@/lib/format'
import { useApp } from '@/store/app'

/** Fields a merge can pick per-product. `dims` bundles d/D/B so the three stay consistent. */
type FieldKey = 'sku' | 'name' | 'brand' | 'category' | 'type' | 'seal' | 'dims' | 'price' | 'card_price' | 'list_price' | 'shelf' | 'barcode' | 'equivalents' | 'description'

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: 'sku', label: 'Stok kodu' },
  { key: 'name', label: 'Ürün adı' },
  { key: 'brand', label: 'Marka' },
  { key: 'category', label: 'Kategori' },
  { key: 'type', label: 'Tip' },
  { key: 'seal', label: 'Keçe / Kapak' },
  { key: 'dims', label: 'd × D × B' },
  { key: 'price', label: 'Peşin fiyat' },
  { key: 'card_price', label: 'K. kartı fiyatı' },
  { key: 'list_price', label: 'Liste fiyatı' },
  { key: 'shelf', label: 'Raf' },
  { key: 'barcode', label: 'Barkod' },
  { key: 'equivalents', label: 'Muadiller' },
  { key: 'description', label: 'Açıklama' }
]

const MAX_PIECES = 6

function fieldValue(p: Product, k: FieldKey): string {
  switch (k) {
    case 'dims':
      return p.d_inner == null && p.d_outer == null && p.width == null ? '' : `${num(p.d_inner)}×${num(p.d_outer)}×${num(p.width)}`
    case 'price':
      return money(p.price, p.currency)
    case 'card_price':
      return p.card_price == null ? '' : money(p.card_price, p.currency)
    case 'list_price':
      return p.list_price == null ? '' : money(p.list_price, p.currency)
    default:
      return p[k] ?? ''
  }
}

/** Raw comparable value so identical fields collapse into a single "aynı" cell. */
function rawValue(p: Product, k: FieldKey): string {
  if (k === 'dims') return `${p.d_inner}|${p.d_outer}|${p.width}`
  return String(p[k] ?? '')
}

function copyField<K extends Exclude<FieldKey, 'dims'>>(patch: MergePatch, k: K, from: Product): void {
  patch[k] = from[k]
}

function applyPick(patch: MergePatch, k: FieldKey, from: Product): void {
  if (k === 'dims') {
    patch.d_inner = from.d_inner
    patch.d_outer = from.d_outer
    patch.width = from.width
  } else copyField(patch, k, from)
}

export function MergeDialog({ initial, onClose, onMerged }: { initial: Product[]; onClose: () => void; onMerged: (p: Product) => void }): ReactNode {
  const { toast } = useApp()
  const [pieces, setPieces] = useState<Product[]>(initial)
  const [targetId, setTargetId] = useState<number>(() => initial.reduce((best, p) => (p.stock > best.stock ? p : best), initial[0])?.id ?? 0)
  const [picks, setPicks] = useState<Partial<Record<FieldKey, number>>>({})
  const [stockText, setStockText] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Product[]>([])

  const target = pieces.find((p) => p.id === targetId) ?? pieces[0]
  const sources = pieces.filter((p) => p.id !== target?.id)
  const stockSum = pieces.reduce((s, p) => s + p.stock, 0)
  const stockValue = stockText == null ? stockSum : Number(stockText.replace(',', '.')) || 0

  useEffect(() => {
    if (!target && pieces[0]) setTargetId(pieces[0].id)
  }, [target, pieces])

  useEffect(() => {
    const s = q.trim()
    if (s.length < 2) {
      setHits([])
      return
    }
    let cancelled = false
    const t = setTimeout(() => {
      api('products:search', { q: s, limit: 8, offset: 0, includeInactive: true })
        .then((r) => !cancelled && setHits(r.items.filter((p) => !pieces.some((x) => x.id === p.id))))
        .catch(() => undefined)
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q, pieces])

  const pickedFor = (k: FieldKey): Product | undefined => pieces.find((p) => p.id === (picks[k] ?? target?.id))

  const patch = useMemo<MergePatch>(() => {
    const out: MergePatch = { stock: stockValue }
    if (!target) return out
    for (const f of FIELDS) {
      const from = pieces.find((p) => p.id === picks[f.key])
      if (from && from.id !== target.id) applyPick(out, f.key, from)
    }
    return out
  }, [pieces, picks, target, stockValue])

  const remove = (id: number): void => {
    setPieces((ps) => ps.filter((p) => p.id !== id))
    setPicks((pk) => Object.fromEntries(Object.entries(pk).filter(([, v]) => v !== id)))
  }

  const merge = async (): Promise<void> => {
    if (!target || !sources.length) return
    setConfirm(false)
    setBusy(true)
    try {
      const p = await api('products:merge', { targetId: target.id, sourceIds: sources.map((s) => s.id), patch })
      toast(`${sources.length} kayıt "${p.sku}" ürününe birleştirildi.`, 'success')
      onMerged(p)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const canMerge = !!target && sources.length > 0 && !busy

  return (
    <Modal
      open
      wide
      title="Ürünleri birleştir"
      onClose={onClose}
      footer={
        <>
          <span className="small muted" style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} aria-hidden /> Kaynak kayıtlar silinir, siparişleri ana ürüne taşınır. Geri alınamaz.
          </span>
          <button className="btn" onClick={onClose}>
            Vazgeç
          </button>
          <button className="btn primary" onClick={() => setConfirm(true)} disabled={!canMerge}>
            <GitMerge size={16} aria-hidden /> {sources.length ? `${sources.length} kaydı birleştir` : 'Birleştir'}
          </button>
        </>
      }
    >
      <p className="small muted" style={{ marginTop: 0 }}>
        Parçaları yerleştirin: önce <b>ana kaydı</b> seçin (taç simgesi), sonra her satırda hangi kaydın değerinin kalacağına tıklayın. Seçmediğiniz alanlar ana kayıttan gelir; stoklar toplanır.
      </p>

      {pieces.length < MAX_PIECES && (
        <div className="merge-add">
          <div className="search-box" style={{ maxWidth: 420 }}>
            <Search size={18} aria-hidden />
            <input className="input" type="search" placeholder="Birleştirmeye ürün ekle (kod ara)…" aria-label="Birleştirmeye ürün ekle" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {hits.length > 0 && (
            <ul className="merge-hits" role="listbox" aria-label="Arama sonuçları">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="merge-hit"
                    onClick={() => {
                      setPieces((ps) => [...ps, h])
                      setQ('')
                    }}
                  >
                    <Plus size={14} aria-hidden />
                    <span className="sku">{h.sku}</span>
                    <span className="muted">{h.brand}</span>
                    <span className="muted truncate">{h.name}</span>
                    <span className="nowrap muted">Stok {num(h.stock)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {pieces.length === 0 ? (
        <div className="empty">
          <h3>Parça yok</h3>
          <p>Yukarıdan en az iki ürün ekleyin.</p>
        </div>
      ) : (
        <div className="puzzle" style={{ ['--pieces' as string]: pieces.length }}>
          <div className="puzzle-row puzzle-head" role="row">
            <div className="puzzle-label" role="columnheader">
              Alan
            </div>
            {pieces.map((p) => {
              const isTarget = p.id === target?.id
              return (
                <div key={p.id} className={`puzzle-card${isTarget ? ' target' : ''}`} role="columnheader">
                  <button type="button" className="puzzle-crown" onClick={() => setTargetId(p.id)} aria-pressed={isTarget} title={isTarget ? 'Ana kayıt' : 'Ana kayıt yap'}>
                    <Crown size={16} aria-hidden /> {isTarget ? 'Ana kayıt' : 'Ana yap'}
                  </button>
                  <div className="sku" title={p.name}>
                    {p.sku}
                  </div>
                  <div className="small muted truncate">{p.brand || 'markasız'}</div>
                  <div className="small">
                    Stok <b>{num(p.stock)}</b>
                    {!p.active ? <span className="badge neutral" style={{ marginLeft: 6 }}>Pasif</span> : null}
                  </div>
                  {pieces.length > 1 && (
                    <button type="button" className="btn ghost icon sm puzzle-remove" onClick={() => remove(p.id)} aria-label={`${p.sku} kaydını birleştirmeden çıkar`} title="Çıkar">
                      <X size={14} aria-hidden />
                    </button>
                  )}
                </div>
              )
            })}
            <div className="puzzle-result-head" role="columnheader">
              Sonuç
            </div>
          </div>

          <div className="puzzle-row" role="row">
            <div className="puzzle-label" role="rowheader">
              Stok
            </div>
            <div className="puzzle-same" style={{ gridColumn: `span ${pieces.length}` }}>
              {pieces.map((p) => num(p.stock)).join(' + ')} = <b>{num(stockSum)}</b>
            </div>
            <div className="puzzle-result">
              <input className="input sm right" inputMode="decimal" aria-label="Birleşik stok" value={stockText ?? String(stockSum)} onChange={(e) => setStockText(e.target.value)} />
            </div>
          </div>

          {FIELDS.map((f) => {
            const values = pieces.map((p) => rawValue(p, f.key))
            const allSame = values.every((v) => v === values[0])
            const chosen = pickedFor(f.key)
            return (
              <div key={f.key} className="puzzle-row" role="row">
                <div className="puzzle-label" role="rowheader">
                  {f.label}
                </div>
                {allSame ? (
                  <div className="puzzle-same" style={{ gridColumn: `span ${pieces.length}` }}>
                    {target ? fieldValue(target, f.key) || <span className="faint">—</span> : null}
                    <span className="faint small"> · aynı</span>
                  </div>
                ) : (
                  pieces.map((p) => {
                    const picked = chosen?.id === p.id
                    const v = fieldValue(p, f.key)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`puzzle-piece${picked ? ' picked' : ''}${p.id === target?.id ? ' from-target' : ''}`}
                        aria-pressed={picked}
                        onClick={() => setPicks((pk) => ({ ...pk, [f.key]: p.id }))}
                        title={v || 'boş'}
                      >
                        {picked && <Check size={14} aria-hidden />}
                        <span className="truncate">{v || <span className="faint">boş</span>}</span>
                      </button>
                    )
                  })
                )}
                <div className="puzzle-result" role="gridcell">
                  {chosen ? fieldValue(chosen, f.key) || <span className="faint">—</span> : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Confirm
        open={confirm}
        title="Birleştirmeyi onayla"
        text={`${sources.map((s) => `"${s.sku}"`).join(', ')} → "${target?.sku ?? ''}" ana kaydına birleştirilecek. Kaynak kayıtlar silinir, siparişleri ana ürüne taşınır ve toplam stok ${num(stockValue)} olur. Bu işlem geri alınamaz.`}
        danger
        confirmLabel="Birleştir"
        onCancel={() => setConfirm(false)}
        onConfirm={merge}
      />
    </Modal>
  )
}
