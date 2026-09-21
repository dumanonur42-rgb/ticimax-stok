import type { Product } from '@shared/types'
import { MapPin, Minus, Pencil, Plus, ShoppingCart, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { date, mm, money, num, stockLevel } from '@/lib/format'
import { useApp, useCart } from '@/store/app'
import { cardPrice } from '@shared/price'

export function ProductDrawer({
  product,
  onClose,
  onEdit,
  showPrices,
  threshold
}: {
  product: Product
  onClose: () => void
  onEdit?: () => void
  showPrices: boolean
  threshold: number
}): ReactNode {
  const add = useCart((s) => s.add)
  const toast = useApp((s) => s.toast)
  const cardPct = useApp((s) => s.settings?.card_price_pct ?? 0)
  const cp = cardPrice(product.price, product.card_price, cardPct)
  const [qty, setQty] = useState(Math.max(1, product.min_order || 1))
  const [equivalents, setEquivalents] = useState<Product[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const lvl = stockLevel(product.stock, threshold)

  useEffect(() => {
    setQty(Math.max(1, product.min_order || 1))
    const skus = product.equivalents
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (skus.length) api('products:bySkus', skus).then(setEquivalents).catch(() => setEquivalents([]))
    else setEquivalents([])
    ref.current?.querySelector<HTMLElement>('h2')?.focus()
  }, [product])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const addNow = (): void => {
    add(product, qty)
    toast(`${product.sku} × ${qty} sepete eklendi.`, 'success')
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} aria-hidden />
      <aside ref={ref} className="drawer" role="dialog" aria-modal="true" aria-labelledby="pd-title">
        <div className="drawer-head">
          <h2 id="pd-title" tabIndex={-1} className="mono">
            {product.sku}
          </h2>
          {onEdit && (
            <button className="btn sm" onClick={onEdit}>
              <Pencil size={14} aria-hidden /> Düzenle
            </button>
          )}
          <button className="btn ghost icon sm" onClick={onClose} aria-label="Ayrıntı panelini kapat">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="drawer-body grid" style={{ gap: 18, alignContent: 'start' }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>{product.name}</h3>
            <div className="row wrap small">
              {product.brand && <span className="badge info">{product.brand}</span>}
              {product.box && <span className="badge neutral">{product.box}</span>}
              {product.category && <span className="badge neutral">{product.category}</span>}
              {product.type && <span className="badge neutral">{product.type}</span>}
              {product.seal && <span className="badge neutral">{product.seal}</span>}
              {!product.active && <span className="badge out">Pasif</span>}
            </div>
          </div>

          {product.shelf && (
            <div className="shelf-card" role="group" aria-label="Raf konumu">
              <MapPin size={22} aria-hidden />
              <div>
                <span className="shelf-card-label">Raf</span>
                <b className="shelf-card-value mono">{product.shelf}</b>
              </div>
            </div>
          )}

          {(product.d_inner != null || product.d_outer != null || product.width != null) && (
            <div className="dims" role="group" aria-label="Ölçüler">
              <div className="dim">
                <b>{num(product.d_inner)}</b>
                <span>İç çap d (mm)</span>
              </div>
              <div className="dim">
                <b>{num(product.d_outer)}</b>
                <span>Dış çap D (mm)</span>
              </div>
              <div className="dim">
                <b>{num(product.width)}</b>
                <span>Genişlik B (mm)</span>
              </div>
            </div>
          )}

          <dl className="dl">
            <dt>Stok</dt>
            <dd>
              <span className={`badge ${lvl.cls}`}>{lvl.label}</span> <span className="muted small">{product.unit}</span>
            </dd>
            {showPrices && (
              <>
                <dt>Peşin Fiyat</dt>
                <dd>
                  <strong>{money(product.price, product.currency)}</strong>
                  {product.list_price != null && product.list_price > product.price && (
                    <span className="muted small">
                      {' '}
                      · liste <s>{money(product.list_price, product.currency)}</s>
                    </span>
                  )}
                </dd>
                <dt>Kredi Kartı Fiyatı</dt>
                <dd>{cp == null ? <span className="muted">—</span> : <strong>{money(cp, product.currency)}</strong>}</dd>
              </>
            )}
            {product.min_order > 1 && (
              <>
                <dt>Min. sipariş</dt>
                <dd>{num(product.min_order)}</dd>
              </>
            )}
            {product.barcode && (
              <>
                <dt>Barkod</dt>
                <dd className="mono">{product.barcode}</dd>
              </>
            )}
            {product.d_inner != null && (
              <>
                <dt>Ölçü</dt>
                <dd>
                  {mm(product.d_inner)} × {mm(product.d_outer)} × {mm(product.width)}
                </dd>
              </>
            )}
            <dt>Güncelleme</dt>
            <dd className="small">{date(product.updated_at)}</dd>
          </dl>

          {product.description && <p>{product.description}</p>}

          {product.equivalents && (
            <section aria-labelledby="eq-title">
              <h3 id="eq-title">Muadiller</h3>
              <div className="chips">
                {product.equivalents
                  .split(/[,;\n]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((s) => {
                    const found = equivalents.find((e) => e.sku.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === s.replace(/[^A-Za-z0-9]/g, '').toUpperCase())
                    return (
                      <span key={s} className={`chip ${found ? '' : 'faint'}`} style={{ padding: '3px 10px' }} title={found ? `Stokta: ${num(found.stock)}` : 'Stok listesinde yok'}>
                        {s}
                        {found && <span className={`badge ${stockLevel(found.stock, threshold).cls}`}>{num(found.stock)}</span>}
                      </span>
                    )
                  })}
              </div>
            </section>
          )}
        </div>
        <div className="drawer-foot">
          <div className="row" style={{ gap: 4 }} role="group" aria-label="Miktar">
            <button className="btn icon sm" onClick={() => setQty((n) => Math.max(1, n - (product.min_order || 1)))} aria-label="Azalt">
              <Minus size={14} aria-hidden />
            </button>
            <input className="qty-input" inputMode="numeric" aria-label="Miktar" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1))} onKeyDown={(e) => e.key === 'Enter' && addNow()} />
            <button className="btn icon sm" onClick={() => setQty((n) => n + (product.min_order || 1))} aria-label="Artır">
              <Plus size={14} aria-hidden />
            </button>
          </div>
          <span className="spacer" />
          {showPrices && (
            <span aria-live="polite" className="nowrap">
              <strong>{money(product.price * qty, product.currency)}</strong>
              {cp != null && <span className="muted small"> · kart {money(cp * qty, product.currency)}</span>}
            </span>
          )}
          <button className="btn primary" onClick={addNow}>
            <ShoppingCart size={16} aria-hidden /> Sepete ekle
          </button>
        </div>
      </aside>
    </>
  )
}
