import type { Currency, Product, ProductInput } from '@shared/types'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Confirm, Field, Modal } from '@/components/ui'
import { api } from '@/lib/api'
import { num } from '@/lib/format'
import { useApp } from '@/store/app'

const empty = (cur: Currency): ProductInput => ({
  sku: '',
  name: '',
  brand: '',
  category: '',
  type: '',
  seal: '',
  d_inner: null,
  d_outer: null,
  width: null,
  stock: 0,
  unit: 'Adet',
  price: 0,
  currency: cur,
  list_price: null,
  card_price: null,
  min_order: 1,
  shelf: '',
  barcode: '',
  image: '',
  description: '',
  equivalents: '',
  active: 1
})

const numOrNull = (v: string): number | null => (v.trim() === '' ? null : Number(v.replace(',', '.')))

export function ProductEditor({
  product,
  onClose,
  onSaved,
  onGoto
}: {
  product: Product | null
  onClose: () => void
  onSaved: (p: Product) => void
  /** "Ürüne git" on the duplicate warning: open the existing product instead of creating a twin. */
  onGoto?: (p: Product) => void
}): ReactNode {
  const { settings, toast, session } = useApp()
  const isAdmin = session?.user.role === 'admin'
  const [form, setForm] = useState<ProductInput & { id?: number }>(product ? { ...product } : empty(settings?.default_currency ?? 'TRY'))
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [similar, setSimilar] = useState<Product[]>([])
  const [confirmTwin, setConfirmTwin] = useState(false)
  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]): void => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!isAdmin) return
    const sku = form.sku.trim()
    if (sku.length < 3) {
      setSimilar([])
      return
    }
    let cancelled = false
    const t = setTimeout(() => {
      api('products:similar', { sku, brand: form.brand, excludeId: product?.id ?? null })
        .then((r) => !cancelled && setSimilar(r))
        .catch(() => undefined)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [form.sku, form.brand, product?.id, isAdmin])

  const save = async (force = false): Promise<void> => {
    if (!form.sku.trim()) return toast('Stok kodu zorunludur.', 'error')
    if (!form.name.trim()) return toast('Ürün adı zorunludur.', 'error')
    if (!force && !product && similar.length) return setConfirmTwin(true)
    setConfirmTwin(false)
    setBusy(true)
    try {
      const p = await api('products:save', form)
      toast('Ürün kaydedildi.', 'success')
      onSaved(p)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const del = async (): Promise<void> => {
    if (!product) return
    try {
      await api('products:delete', product.id)
      toast('Ürün silindi.', 'success')
      onClose()
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const text = (k: keyof ProductInput, label: string, hint?: string): ReactNode => (
    <Field label={label} hint={hint}>
      {(id) => <input id={id} className="input" value={String(form[k] ?? '')} onChange={(e) => set(k, e.target.value as never)} />}
    </Field>
  )
  const number = (k: 'd_inner' | 'd_outer' | 'width' | 'list_price' | 'card_price', label: string): ReactNode => (
    <Field label={label}>
      {(id) => <input id={id} className="input" inputMode="decimal" value={form[k] ?? ''} onChange={(e) => set(k, numOrNull(e.target.value))} />}
    </Field>
  )

  return (
    <Modal
      open
      wide
      title={product ? `Ürünü düzenle – ${product.sku}` : 'Yeni ürün'}
      onClose={onClose}
      footer={
        <>
          {product && session?.user.role === 'admin' && (
            <button className="btn danger" onClick={() => setConfirmDelete(true)} style={{ marginRight: 'auto' }}>
              Sil
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Vazgeç
          </button>
          <button className="btn primary" onClick={() => save()} disabled={busy}>
            Kaydet
          </button>
        </>
      }
    >
      <form
        className="grid g3"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        {text('sku', 'Stok kodu *')}
        <div style={{ gridColumn: 'span 2' }}>{text('name', 'Ürün adı *')}</div>
        {similar.length > 0 && (
          <div className="dup-warning" role="alert" style={{ gridColumn: 'span 3' }}>
            <div className="dup-warning-head">
              <AlertTriangle size={20} aria-hidden />
              <div>
                <strong>{similar.length > 1 ? `${similar.length} benzer ürün bulunuyor` : 'Aynı ürün bulunuyor'}</strong>
                <div className="small">Bu kod stokta kayıtlı görünüyor. Yeni kayıt yerine mevcut ürünü düzenlemek için tıklayın.</div>
              </div>
            </div>
            <ul className="dup-list">
              {similar.map((s) => (
                <li key={s.id}>
                  <span className="sku">{s.sku}</span>
                  <span className="muted">{s.brand || 'markasız'}</span>
                  <span className="muted truncate" title={s.name}>
                    {s.name}
                  </span>
                  <span className="nowrap">
                    Stok: <b>{num(s.stock)}</b>
                    {s.shelf && (
                      <>
                        {' · '}
                        <span className="shelf-tag sm">{s.shelf}</span>
                      </>
                    )}
                  </span>
                  {onGoto && (
                    <button type="button" className="btn sm primary" onClick={() => onGoto(s)}>
                      Ürüne git <ArrowRight size={14} aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {text('brand', 'Marka')}
        {text('category', 'Kategori')}
        {text('type', 'Tip', 'örn. Sabit Bilyalı, Konik Makaralı')}
        {text('seal', 'Keçe / Kapak', 'ZZ, 2RS, Açık…')}
        {number('d_inner', 'İç çap d (mm)')}
        {number('d_outer', 'Dış çap D (mm)')}
        {number('width', 'Genişlik B (mm)')}
        <Field label="Stok">
          {(id) => <input id={id} className="input" inputMode="decimal" value={form.stock} onChange={(e) => set('stock', Number(e.target.value.replace(',', '.')) || 0)} />}
        </Field>
        {text('unit', 'Birim')}
        <Field label="Peşin fiyat">
          {(id) => <input id={id} className="input" inputMode="decimal" value={form.price} onChange={(e) => set('price', Number(e.target.value.replace(',', '.')) || 0)} />}
        </Field>
        <Field label="Para birimi">
          {(id) => (
            <select id={id} className="select" value={form.currency} onChange={(e) => set('currency', e.target.value as Currency)}>
              <option value="TRY">TRY (₺)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          )}
        </Field>
        {number('card_price', 'Kredi kartı fiyatı (boşsa Ayarlar\'daki yüzde uygulanır)')}
        {number('list_price', 'Liste fiyatı')}
        <Field label="Min. sipariş">
          {(id) => <input id={id} className="input" inputMode="numeric" value={form.min_order} onChange={(e) => set('min_order', Number(e.target.value) || 1)} />}
        </Field>
        {session?.user.role === 'admin' && text('shelf', 'Raf')}
        {text('barcode', 'Barkod')}
        <div style={{ gridColumn: 'span 3' }}>{text('equivalents', 'Muadiller', 'Virgülle ayırın: 6205-2RS1, 6205 DDU')}</div>
        <div style={{ gridColumn: 'span 3' }}>
          <Field label="Açıklama">{(id) => <textarea id={id} className="input" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />}</Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={!!form.active} onChange={(e) => set('active', e.target.checked ? 1 : 0)} /> Aktif (listede görünsün)
        </label>
      </form>
      <Confirm
        open={confirmTwin}
        title="Benzer ürün var"
        text={`"${similar[0]?.sku ?? ''}" zaten kayıtlı görünüyor. Yine de "${form.sku.trim()}" kodunu ayrı bir ürün olarak kaydetmek istiyor musunuz?`}
        confirmLabel="Yine de kaydet"
        onCancel={() => setConfirmTwin(false)}
        onConfirm={() => save(true)}
      />
      <Confirm open={confirmDelete} title="Ürünü sil" text={`${product?.sku} kalıcı olarak silinecek. Emin misiniz?`} danger confirmLabel="Sil" onCancel={() => setConfirmDelete(false)} onConfirm={del} />
    </Modal>
  )
}
