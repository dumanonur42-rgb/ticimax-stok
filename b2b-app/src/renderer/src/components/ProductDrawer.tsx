import type { Product } from '@shared/types'
import { boxParts, brandOrigin, normalize } from '@shared/identity'
import { brandLogo } from '../lib/brandLogos'
import { ArrowLeftRight, BadgeCheck, Barcode, Clock, CreditCard, Info, Layers, MapPin, Minus, Package, Pencil, Plus, ShoppingCart, Tag, TextSearch, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { date, money, num, stockLevel } from '@/lib/format'
import { useApp, useCart } from '@/store/app'
import { cardPrice } from '@shared/price'
import { locationLabel, shelfBreakdown, shelfQuantitySummary } from '@shared/locations'
import { hasPerm } from '@shared/perms'
import { explainProductCode } from '@shared/bearingCodes'

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
  const brand = brandOrigin(product.brand)
  const logo = brandLogo(brand.base)
  const add = useCart((s) => s.add)
  const toast = useApp((s) => s.toast)
  const session = useApp((s) => s.session)
  const cardPct = useApp((s) => s.settings?.card_price_pct ?? 0)
  const cp = cardPrice(product.price, product.card_price, cardPct)
  const [qty, setQty] = useState(String(Math.max(1, product.min_order || 1)))
  const [equivalents, setEquivalents] = useState<Product[]>([])
  const [variants, setVariants] = useState<Product[]>([])
  const canSeeShelf = hasPerm(session?.user ?? null, 'shelf')
  const shelfRows = (variants.length ? variants : [product]).flatMap((variant) =>
    shelfBreakdown(variant).map((location, index) => ({ variant, location, index }))
  )
  const shelfQuantities = shelfQuantitySummary(shelfRows)
  const hideShelfQuantities = shelfQuantities.hideQuantityColumn
  const ref = useRef<HTMLDivElement>(null)
  const lvl = stockLevel(product.stock, threshold)
  const hasPrice = product.price != null && product.price > 0
  const hasDims = product.d_inner != null || product.d_outer != null || product.width != null
  const stockNote = lvl.cls === 'out' ? 'Stok yok' : lvl.cls === 'low' ? 'Az kaldı' : 'Stokta'
  const tags = [product.box, product.category, product.type, product.seal].filter(Boolean)
  const codeInfo = useMemo(() => explainProductCode(product.sku, product.brand), [product.sku, product.brand])

  useEffect(() => {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const grid = document.querySelector<HTMLElement>('[role="grid"]')
    const row = grid?.querySelector<HTMLElement>('[aria-selected="true"]') ?? document.querySelector<HTMLElement>('[role="button"][tabindex="0"]')
    const activeContext = active && active !== document.body && (active.closest('[role="grid"]') || active.closest('[role="button"]'))
    const target = activeContext ? active : row ?? grid
    return () => {
      if (target?.isConnected) target.focus()
      else if (row?.isConnected) row.focus()
      else if (grid?.isConnected) grid.focus()
    }
  }, [])

  useEffect(() => {
    void api('activity:log', {
      kind: 'product_view',
      product_id: product.id,
      sku: product.sku,
      brand: product.brand
    }).catch(() => undefined)
    setQty(String(Math.max(1, product.min_order || 1)))
    api('products:variants', product.id).then(setVariants).catch(() => setVariants([product]))
    const skus = product.equivalents
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (skus.length) api('products:bySkus', skus).then(setEquivalents).catch(() => setEquivalents([]))
    else setEquivalents([])
    ref.current?.querySelector<HTMLElement>('h2')?.focus()
  }, [product])

  useEffect(() => {
    const drawer = ref.current
    if (!drawer) return
    const onKey = (e: KeyboardEvent): void => {
      if (document.querySelector('dialog[open]')) return
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const focusable = [...drawer.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')].filter((element) => element.offsetParent !== null)
      if (focusable.length === 0) {
        e.preventDefault()
        drawer.focus()
        return
      }
      const activeIndex = focusable.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey && (activeIndex === 0 || activeIndex === -1)) {
        e.preventDefault()
        focusable[focusable.length - 1].focus()
      } else if (!e.shiftKey && (activeIndex === focusable.length - 1 || (activeIndex === -1 && !drawer.contains(document.activeElement)))) {
        e.preventDefault()
        focusable[0].focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const addNow = (): void => {
    if (product.price == null || product.price <= 0) {
      toast('Bu ürünün fiyatı girilmemiş. Fiyat için lütfen bizi arayın.', 'error')
      return
    }
    const quantity = Math.max(1, Math.floor(Number(qty) || 1))
    setQty(String(quantity))
    add(product, quantity)
    toast(`${product.sku} × ${quantity} sepete eklendi.`, 'success')
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} aria-hidden />
      <aside ref={ref} className="drawer" role="dialog" aria-modal="true" aria-labelledby="pd-title" tabIndex={-1}>
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
        <div className="drawer-body grid" style={{ gap: 16, alignContent: 'start' }}>
          {canSeeShelf ? (
            <section className="shelf-card shelf-card-locations" role="group" aria-label="Raflar">
              <MapPin size={22} aria-hidden />
              <div className="shelf-card-content">
                <span className="shelf-card-label">Raflar</span>
                <div className={`shelf-location-table${hideShelfQuantities ? ' without-qty' : ''}`} role="table" aria-label="Raf konumları">
                  <div className="shelf-location-header" role="row">
                    <span role="columnheader">Raf</span>
                    <span role="columnheader">Kutu durumu</span>
                    {!hideShelfQuantities && <span role="columnheader">Adet</span>}
                  </div>
                  {shelfRows.map(({ variant, location, index }) => (
                    <div
                      className={`shelf-location-row${variant.id === product.id ? ' selected' : ''}`}
                      key={`${variant.id}-${location.shelf}-${index}`}
                      role="row"
                      aria-label={`${locationLabel(location, variant.unit)}${location.box || variant.box ? ` · ${location.box || variant.box}` : ''}`}
                    >
                      <span className="shelf-location-shelf" role="cell">
                        <b className="mono">{location.shelf || 'Raf belirtilmemiş'}</b>
                        {variant.id === product.id && <small className="shelf-current-tag">Bu ürün</small>}
                      </span>
                      <span className="shelf-location-box" role="cell"><BoxParts value={location.box || variant.box} /></span>
                      {!hideShelfQuantities && <strong className="shelf-location-qty" role="cell">{location.qty === null ? '—' : `${num(location.qty)} ${variant.unit.trim() || 'adet'}`}</strong>}
                    </div>
                  ))}
                </div>
                {shelfQuantities.notes.map(({ variantId, label }) => <p className="shelf-location-summary" key={variantId}>{label}</p>)}
              </div>
            </section>
          ) : variants.length > 1 ? (
            <section className="shelf-card" role="group" aria-label="Kutu durumları">
              <div><span className="shelf-card-label">Kutu durumları</span><div>{(variants.length ? variants : [product]).map((variant) => <span key={variant.id}>{variant.box || 'Belirtilmemiş'} · {num(variant.stock)} adet</span>)}</div></div>
            </section>
          ) : null}

          <section className="pd-card" aria-labelledby="pd-name">
            <div className="pd-head">
              <div className="pd-head-text">
                <span className="pd-eyebrow">Ürün</span>
                <h3 id="pd-name" className="pd-name">{product.name}</h3>
              </div>
              {product.brand && (
                <span className={`pd-brand${logo ? ' has-logo' : ''}`}>
                  {logo && <img src={logo.src} alt={logo.named ? brand.base : ''} />}
                  {!logo?.named && <b>{brand.base}</b>}
                  {brand.origin && <small>Menşei: {brand.origin}</small>}
                </span>
              )}
              {(tags.length > 0 || !product.active) && (
                <ul className="pd-tags" aria-label="Özellikler">
                  {tags.map((tag) => <li key={tag}>{tag}</li>)}
                  {!product.active && <li className="out">Pasif</li>}
                </ul>
              )}
            </div>

            <dl className="pd-stats">
              <div className={`pd-stat pd-stock ${lvl.cls}`}>
                <dt><Package size={13} aria-hidden /> Stok</dt>
                <dd>
                  <b>{num(Math.max(0, product.stock))}</b> <small>{product.unit.trim() || 'adet'}</small>
                  <span className="pd-stat-note"><i aria-hidden />{stockNote}</span>
                </dd>
              </div>
              {showPrices && (
                <div className="pd-stat">
                  <dt><Tag size={13} aria-hidden /> Fiyat</dt>
                  <dd>
                    <b className={hasPrice ? '' : 'ask'}>{hasPrice ? money(product.price as number, product.currency) : 'Fiyat sorunuz'}</b>
                    {product.list_price != null && product.price != null && product.list_price > product.price && (
                      <span className="pd-stat-note">Liste {hasPrice ? <s>{money(product.list_price, product.currency)}</s> : money(product.list_price, product.currency)}</span>
                    )}
                  </dd>
                </div>
              )}
              {showPrices && cp != null && (
                <div className="pd-stat">
                  <dt><CreditCard size={13} aria-hidden /> Kredi kartı</dt>
                  <dd><b>{money(cp, product.currency)}</b></dd>
                </div>
              )}
            </dl>

            {hasDims && (
              <div className="pd-dims" role="group" aria-label="Ölçüler">
                <div className="pd-dim">
                  <i aria-hidden>d</i>
                  <span><b>{num(product.d_inner)}</b><small>İç çap (mm)</small></span>
                </div>
                <div className="pd-dim">
                  <i aria-hidden>D</i>
                  <span><b>{num(product.d_outer)}</b><small>Dış çap (mm)</small></span>
                </div>
                <div className="pd-dim">
                  <i aria-hidden>B</i>
                  <span><b>{num(product.width)}</b><small>Genişlik (mm)</small></span>
                </div>
              </div>
            )}

            <dl className="pd-meta">
              {product.min_order > 1 && <div><dt><Layers size={13} aria-hidden /> Min. sipariş</dt><dd>{num(product.min_order)}</dd></div>}
              {product.barcode && <div><dt><Barcode size={13} aria-hidden /> Barkod</dt><dd className="mono">{product.barcode}</dd></div>}
              <div><dt><Clock size={13} aria-hidden /> Güncelleme</dt><dd>{date(product.updated_at)}</dd></div>
            </dl>
          </section>

          {product.description && <p className="pd-description">{product.description}</p>}

          {codeInfo && (
            <section className="code-info" aria-labelledby="code-title">
              <div className="code-head">
                <span className="code-head-icon" aria-hidden><TextSearch size={20} /></span>
                <div>
                  <h3 id="code-title">Kod açıklaması</h3>
                  <p>Koddaki her parçanın anlamı</p>
                </div>
              </div>
              <ol className="code-steps">
                <li className="code-note base">
                  <span className="code-chip">{codeInfo.base}</span>
                  <div>
                    <strong>{codeInfo.type}</strong>
                    {codeInfo.size && <p className="code-size">{codeInfo.size}</p>}
                    {codeInfo.typeDetail && <p>{codeInfo.typeDetail}</p>}
                  </div>
                </li>
                {codeInfo.notes.map((note) => (
                  <li className="code-note" key={note.code}>
                    <span className="code-chip">{note.code}</span>
                    <div>
                      <strong>{note.title}</strong>
                      {note.detail && <p>{note.detail}</p>}
                      {note.sameEverywhere && <p className="code-same"><BadgeCheck size={15} aria-hidden /> Bütün markalarda aynı yazılır.</p>}
                      {note.equivalents.length > 0 && (
                        <div className="code-equivalents" aria-label="Diğer markalardaki yazılışı">
                          <small><ArrowLeftRight size={12} aria-hidden /> Diğer markalarda</small>
                          <ul>
                            {note.equivalents.map((item) => {
                              const mark = brandLogo(item.brand)
                              return (
                                <li key={item.brand}>
                                  {mark && !mark.emblem ? <i><img src={mark.src} alt={item.brand} /></i> : <b>{item.brand}</b>} <span>{item.code}</span>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              <p className="code-disclaimer"><Info size={14} aria-hidden /> <span>Açıklamalar üreticilerin genel kodlamasına göredir. Kritik kullanımda üretici kataloğundan teyit edin.</span></p>
            </section>
          )}

          {product.equivalents && (
            <section aria-labelledby="eq-title">
              <h3 id="eq-title">Muadiller</h3>
              <div className="chips">
                {product.equivalents
                  .split(/[,;\n]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((s) => {
                    const found = equivalents.find((e) => normalize(e.sku) === normalize(s))
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
            <button className="btn icon sm" onClick={() => setQty(String(Math.max(1, (Number(qty) || 1) - (product.min_order || 1))))} aria-label="Azalt">
              <Minus size={14} aria-hidden />
            </button>
            <input
              className="qty-input"
              inputMode="numeric"
              aria-label="Miktar"
              value={qty}
              onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))}
              onBlur={() => setQty(String(Math.max(1, Math.floor(Number(qty) || 1))))}
              onKeyDown={(e) => e.key === 'Enter' && addNow()}
            />
            <button className="btn icon sm" onClick={() => setQty(String((Number(qty) || 1) + (product.min_order || 1)))} aria-label="Artır">
              <Plus size={14} aria-hidden />
            </button>
          </div>
          <span className="spacer" />
          {showPrices && (
            <span aria-live="polite" className="nowrap drawer-price">
              <strong>{product.price != null && product.price > 0 ? money(product.price * (Number(qty) || 1), product.currency) : 'Fiyat sorunuz'}</strong>
              {cp != null && <span className="muted small"> · kart {money(cp * (Number(qty) || 1), product.currency)}</span>}
            </span>
          )}
          <button className="btn primary" onClick={addNow} disabled={product.price == null || product.price <= 0}>
            <ShoppingCart size={16} aria-hidden /> Sepete ekle
          </button>
        </div>
      </aside>
    </>
  )
}

function BoxParts({ value }: { value: string }): ReactNode {
  const parts = boxParts(value)
  if (!parts) return value ? <span className="box-tag">{value}</span> : <span className="faint">Kutu durumu belirtilmemiş</span>
  return <span className="row wrap">{parts.map(({ count, state }, index) => <span key={`${state}-${index}`} className={`box-tag ${state === 'Kutulu' ? 'kutulu' : state === 'Kutusuz' ? 'kutusuz' : ''}`}>
    {count === null ? '' : `${num(count)} `}{state}
  </span>)}</span>
}
