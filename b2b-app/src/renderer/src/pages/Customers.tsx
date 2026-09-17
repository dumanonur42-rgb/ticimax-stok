import type { Currency, Customer, CustomerInput } from '@shared/types'
import { Pencil, Plus } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Confirm, Empty, Field, Modal, Spinner } from '@/components/ui'
import { api } from '@/lib/api'
import { useApp } from '@/store/app'

const empty: CustomerInput = {
  code: '',
  name: '',
  contact: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  tax_no: '',
  tax_office: '',
  discount_pct: 0,
  currency: 'TRY',
  notes: '',
  active: 1
}

export function Customers(): ReactNode {
  const { toast, session } = useApp()
  const isAdmin = session?.user.role === 'admin'
  const [list, setList] = useState<Customer[] | null>(null)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<(CustomerInput & { id?: number }) | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null)

  const load = (): void => {
    api('customers:list', { q }).then(setList).catch((e) => toast(e.message, 'error'))
  }
  useEffect(load, [q])

  const save = async (): Promise<void> => {
    if (!editing) return
    if (!editing.name.trim()) return toast('Firma adı zorunludur.', 'error')
    try {
      await api('customers:save', editing)
      toast('Bayi kaydedildi.', 'success')
      setEditing(null)
      load()
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const del = async (): Promise<void> => {
    if (!confirmDelete) return
    try {
      await api('customers:delete', confirmDelete.id)
      toast('Bayi silindi.', 'success')
      setConfirmDelete(null)
      load()
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const set = <K extends keyof CustomerInput>(k: K, v: CustomerInput[K]): void => setEditing((f) => (f ? { ...f, [k]: v } : f))
  const text = (k: keyof CustomerInput, label: string, type = 'text'): ReactNode => (
    <Field label={label}>{(id) => <input id={id} type={type} className="input" value={String(editing?.[k] ?? '')} onChange={(e) => set(k, e.target.value as never)} />}</Field>
  )

  return (
    <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="toolbar">
        <input className="input" style={{ maxWidth: 320 }} type="search" placeholder="Bayi ara…" aria-label="Bayi ara" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="spacer" />
        {isAdmin && (
          <button className="btn primary" onClick={() => setEditing({ ...empty })}>
            <Plus size={16} aria-hidden /> Yeni bayi
          </button>
        )}
      </div>
      {!list ? (
        <Spinner />
      ) : list.length === 0 ? (
        <Empty title="Bayi bulunamadı" hint="Yeni bayi ekleyerek başlayın." />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Kod</th>
              <th>Firma</th>
              <th>Yetkili</th>
              <th>Telefon</th>
              <th>Şehir</th>
              <th className="right">İskonto</th>
              <th>Durum</th>
              <th>
                <span className="sr-only">İşlem</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td className="mono">{c.code}</td>
                <td>
                  <strong>{c.name}</strong>
                  {c.email && <div className="small muted">{c.email}</div>}
                </td>
                <td>{c.contact}</td>
                <td className="nowrap">{c.phone}</td>
                <td>{c.city}</td>
                <td className="right">%{c.discount_pct}</td>
                <td>{c.active ? <span className="badge ok">Aktif</span> : <span className="badge neutral">Pasif</span>}</td>
                <td>
                  {isAdmin && (
                    <button className="btn ghost icon sm" onClick={() => setEditing({ ...c })} aria-label={`${c.name} düzenle`}>
                      <Pencil size={16} aria-hidden />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <Modal
          open
          title={editing.id ? `Bayi düzenle – ${editing.name}` : 'Yeni bayi'}
          onClose={() => setEditing(null)}
          footer={
            <>
              {editing.id && isAdmin && (
                <button className="btn danger" style={{ marginRight: 'auto' }} onClick={() => setConfirmDelete(editing as Customer)}>
                  Sil
                </button>
              )}
              <button className="btn" onClick={() => setEditing(null)}>
                Vazgeç
              </button>
              <button className="btn primary" onClick={save}>
                Kaydet
              </button>
            </>
          }
        >
          <form
            className="grid g2"
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            {text('code', 'Bayi kodu (boşsa otomatik)')}
            {text('name', 'Firma adı *')}
            {text('contact', 'Yetkili')}
            {text('phone', 'Telefon', 'tel')}
            {text('email', 'E-posta', 'email')}
            {text('city', 'Şehir')}
            {text('tax_office', 'Vergi dairesi')}
            {text('tax_no', 'Vergi no')}
            <Field label="İskonto (%)" hint="Bu bayinin siparişlerine otomatik uygulanır">
              {(id) => <input id={id} className="input" inputMode="decimal" value={editing.discount_pct} onChange={(e) => set('discount_pct', Number(e.target.value.replace(',', '.')) || 0)} />}
            </Field>
            <Field label="Para birimi">
              {(id) => (
                <select id={id} className="select" value={editing.currency} onChange={(e) => set('currency', e.target.value as Currency)}>
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              )}
            </Field>
            <div style={{ gridColumn: 'span 2' }}>{text('address', 'Adres')}</div>
            <div style={{ gridColumn: 'span 2' }}>
              <Field label="Notlar">{(id) => <textarea id={id} className="input" rows={2} value={editing.notes} onChange={(e) => set('notes', e.target.value)} />}</Field>
            </div>
            <label className="check">
              <input type="checkbox" checked={!!editing.active} onChange={(e) => set('active', e.target.checked ? 1 : 0)} /> Aktif
            </label>
          </form>
        </Modal>
      )}
      <Confirm open={!!confirmDelete} title="Bayiyi sil" text={`${confirmDelete?.name} silinecek. Siparişleri korunur ancak bayi bağlantısı kalkar.`} danger confirmLabel="Sil" onCancel={() => setConfirmDelete(null)} onConfirm={del} />
    </section>
  )
}
