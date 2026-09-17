import type { Currency, Product, ProductInput } from '@shared/types'
import { useState, type ReactNode } from 'react'
import { Confirm, Field, Modal } from '@/components/ui'
import { api } from '@/lib/api'
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
  min_order: 1,
  shelf: '',
  barcode: '',
  image: '',
  description: '',
  equivalents: '',
  active: 1
})

const numOrNull = (v: string): number | null => (v.trim() === '' ? null : Number(v.replace(',', '.')))

export function ProductEditor({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: (p: Product) => void }): ReactNode {
  const { settings, toast, session } = useApp()
  const [form, setForm] = useState<ProductInput & { id?: number }>(product ? { ...product } : empty(settings?.default_currency ?? 'TRY'))
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]): void => setForm((f) => ({ ...f, [k]: v }))

  const save = async (): Promise<void> => {
    if (!form.sku.trim()) return toast('Stok kodu zorunludur.', 'error')
    if (!form.name.trim()) return toast('Ürün adı zorunludur.', 'error')
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
  const number = (k: 'd_inner' | 'd_outer' | 'width' | 'list_price', label: string): ReactNode => (
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
          <button className="btn primary" onClick={save} disabled={busy}>
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
        <Field label="Fiyat">
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
        {number('list_price', 'Liste fiyatı')}
        <Field label="Min. sipariş">
          {(id) => <input id={id} className="input" inputMode="numeric" value={form.min_order} onChange={(e) => set('min_order', Number(e.target.value) || 1)} />}
        </Field>
        {text('shelf', 'Raf')}
        {text('barcode', 'Barkod')}
        <div style={{ gridColumn: 'span 3' }}>{text('equivalents', 'Muadiller', 'Virgülle ayırın: 6205-2RS1, 6205 DDU')}</div>
        <div style={{ gridColumn: 'span 3' }}>
          <Field label="Açıklama">{(id) => <textarea id={id} className="input" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />}</Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={!!form.active} onChange={(e) => set('active', e.target.checked ? 1 : 0)} /> Aktif (listede görünsün)
        </label>
      </form>
      <Confirm open={confirmDelete} title="Ürünü sil" text={`${product?.sku} kalıcı olarak silinecek. Emin misiniz?`} danger confirmLabel="Sil" onCancel={() => setConfirmDelete(false)} onConfirm={del} />
    </Modal>
  )
}
