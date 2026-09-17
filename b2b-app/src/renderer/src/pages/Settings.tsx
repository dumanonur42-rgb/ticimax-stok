import type { Currency, Customer, CustomerProfile, Settings as S, User, UserRole } from '@shared/types'
import { Building2, Database, Pencil, Plus, Save, UserCheck } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import { Confirm, Field, Modal } from '@/components/ui'
import { useUpdateState } from '@/components/Shell'
import { api, onEvent } from '@/lib/api'
import { date, ROLE_HINT, ROLE_LABEL } from '@/lib/format'
import { useApp } from '@/store/app'

type Tab = 'gorunum' | 'profil' | 'firma' | 'kullanicilar' | 'veri' | 'sifre'

/** `go('settings', SETTINGS_TAB_USERS)` opens the user management tab directly. */
export const SETTINGS_TAB_USERS = 1

export function SettingsPage(): ReactNode {
  const { session, settings, pageParam } = useApp()
  const isAdmin = session?.user.role === 'admin'
  const [tab, setTab] = useState<Tab>(pageParam === SETTINGS_TAB_USERS && isAdmin ? 'kullanicilar' : 'gorunum')
  const tabs: { id: Tab; label: string; admin?: boolean; dealer?: boolean }[] = [
    { id: 'gorunum', label: 'Görünüm & Erişilebilirlik' },
    { id: 'profil', label: 'Firma bilgilerim', dealer: true },
    { id: 'firma', label: 'Firma & Fiyat', admin: true },
    { id: 'kullanicilar', label: 'Kullanıcılar', admin: true },
    { id: 'veri', label: 'Yedekleme & Veri', admin: true },
    { id: 'sifre', label: 'Şifre' }
  ]
  const visible = tabs.filter((t) => (!t.admin || isAdmin) && (!t.dealer || !isAdmin))

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="tabs" role="tablist" aria-label="Ayar bölümleri">
        {visible.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => {
              const i = visible.findIndex((x) => x.id === tab)
              if (e.key === 'ArrowRight') setTab(visible[(i + 1) % visible.length].id)
              if (e.key === 'ArrowLeft') setTab(visible[(i - 1 + visible.length) % visible.length].id)
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'gorunum' && settings && <Appearance s={settings} />}
        {tab === 'profil' && <MyCompany />}
        {tab === 'firma' && settings && <Company s={settings} />}
        {tab === 'kullanicilar' && <Users />}
        {tab === 'veri' && <Data />}
        {tab === 'sifre' && <Password />}
      </div>
    </div>
  )
}

function Appearance({ s }: { s: S }): ReactNode {
  const { updateSettings, toast } = useApp()
  const set = (patch: Partial<S>): void => {
    updateSettings(patch).catch((e) => toast(e.message, 'error'))
  }
  return (
    <div className="card grid g2" style={{ gap: 16 }}>
      <Field label="Tema">
        {(id) => (
          <select id={id} className="select" value={s.theme} onChange={(e) => set({ theme: e.target.value as S['theme'] })}>
            <option value="system">Sistem</option>
            <option value="light">Açık</option>
            <option value="dark">Koyu</option>
            <option value="contrast">Yüksek kontrast</option>
          </select>
        )}
      </Field>
      <Field label="Yoğunluk">
        {(id) => (
          <select id={id} className="select" value={s.density} onChange={(e) => set({ density: e.target.value as S['density'] })}>
            <option value="comfortable">Rahat</option>
            <option value="compact">Sıkışık (daha çok satır)</option>
          </select>
        )}
      </Field>
      <Field label={`Yazı boyutu: %${Math.round(s.font_scale * 100)}`} hint="Ctrl + / Ctrl − ile de değiştirebilirsiniz">
        {(id) => <input id={id} type="range" min={0.85} max={1.5} step={0.05} value={s.font_scale} onChange={(e) => set({ font_scale: Number(e.target.value) })} style={{ width: '100%' }} />}
      </Field>
      <label className="check" style={{ alignSelf: 'end' }}>
        <input type="checkbox" checked={s.reduce_motion} onChange={(e) => set({ reduce_motion: e.target.checked })} /> Animasyonları azalt
      </label>
      <div style={{ gridColumn: 'span 2' }} className="muted small">
        Kısayollar: <kbd>Ctrl</kbd>+<kbd>K</kbd> ürün ara · <kbd>F2</kbd> sepet · <kbd>F1</kbd> yardım · <kbd>Alt</kbd>+<kbd>1..8</kbd> sayfalar · listede <kbd>+</kbd> sepete ekle, <kbd>Enter</kbd> ayrıntı.
      </div>
      <div style={{ gridColumn: 'span 2' }} className="row wrap" role="group" aria-label="Uygulama sürümü">
        <UpdateStatus />
      </div>
    </div>
  )
}

function Company({ s }: { s: S }): ReactNode {
  const { updateSettings, toast } = useApp()
  const [f, setF] = useState<S>(s)
  const save = async (): Promise<void> => {
    try {
      await updateSettings(f)
      toast('Ayarlar kaydedildi.', 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }
  const text = (k: keyof S, label: string): ReactNode => (
    <Field label={label}>{(id) => <input id={id} className="input" value={String(f[k] ?? '')} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}</Field>
  )
  const numF = (k: 'rate_usd' | 'rate_eur' | 'vat_pct' | 'low_stock_threshold' | 'card_price_pct', label: string, hint?: string): ReactNode => (
    <Field label={label} hint={hint}>
      {(id) => <input id={id} className="input" inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value.replace(',', '.')) || 0 })} />}
    </Field>
  )
  return (
    <div className="card grid g2" style={{ gap: 14 }}>
      {text('company_name', 'Firma adı')}
      {text('company_phone', 'Telefon')}
      {text('company_email', 'E-posta')}
      {text('company_web', 'Web')}
      <div style={{ gridColumn: 'span 2' }}>{text('company_address', 'Adres')}</div>
      <Field label="Varsayılan para birimi">
        {(id) => (
          <select id={id} className="select" value={f.default_currency} onChange={(e) => setF({ ...f, default_currency: e.target.value as Currency })}>
            <option value="TRY">TRY</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        )}
      </Field>
      {numF('vat_pct', 'KDV (%)')}
      {numF('card_price_pct', 'Kredi kartı fiyat farkı (%)', 'Ürünün kendi kredi kartı fiyatı boşsa peşin fiyata bu yüzde eklenir; 0 ise kart fiyatı gösterilmez')}
      {numF('rate_usd', 'USD kuru (₺)')}
      {numF('rate_eur', 'EUR kuru (₺)')}
      {numF('low_stock_threshold', 'Kritik stok eşiği', 'Bu değerin altındaki ürünler "Azaldı" olarak işaretlenir')}
      <label className="check" style={{ alignSelf: 'end' }}>
        <input type="checkbox" checked={f.show_prices_to_dealers} onChange={(e) => setF({ ...f, show_prices_to_dealers: e.target.checked })} /> Bayiler fiyatları görebilsin
      </label>
      <div style={{ gridColumn: 'span 2' }} className="row">
        <span className="spacer" />
        <button className="btn primary" onClick={save}>
          <Save size={16} aria-hidden /> Kaydet
        </button>
      </div>
    </div>
  )
}

type UserForm = { id?: number; username: string; display_name: string; role: UserRole; customer_id: number | null; password?: string; active: number }

function Users(): ReactNode {
  const { toast, session } = useApp()
  const [users, setUsers] = useState<User[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [editing, setEditing] = useState<UserForm | null>(null)
  const [del, setDel] = useState<User | null>(null)
  const load = (): void => {
    api('users:list', undefined).then(setUsers).catch((e) => toast(e.message, 'error'))
  }
  useEffect(() => {
    load()
    api('customers:list', {}).then(setCustomers).catch(() => undefined)
    return onEvent('users:changed', load)
  }, [])

  const approve = async (u: User): Promise<void> => {
    try {
      await api('users:approve', u.id)
      toast(`${u.username} onaylandı; artık giriş yapabilir.`, 'success')
      load()
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }
  const pending = users.filter((u) => !u.approved)

  const save = async (): Promise<void> => {
    if (!editing) return
    if (!editing.username.trim()) return toast('Kullanıcı adı zorunludur.', 'error')
    if (!editing.id && !editing.password) return toast('Yeni kullanıcı için şifre girin.', 'error')
    try {
      await api('users:save', editing)
      toast('Kullanıcı kaydedildi.', 'success')
      setEditing(null)
      load()
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }
  const remove = async (): Promise<void> => {
    if (!del) return
    try {
      await api('users:delete', del.id)
      toast('Kullanıcı silindi.', 'success')
      setDel(null)
      load()
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="toolbar">
        <p className="muted small" style={{ margin: 0 }}>
          Kayıtlı herkes burada listelenir. Rol, kullanıcının yetkilerini belirler; "Kayıt ol" ile gelen hesaplar siz onaylayana kadar giriş yapamaz.
        </p>
        <span className="spacer" />
        <button className="btn primary" onClick={() => setEditing({ username: '', display_name: '', role: 'bayi', customer_id: null, password: '', active: 1 })}>
          <Plus size={16} aria-hidden /> Yeni kullanıcı
        </button>
      </div>
      {pending.length > 0 && (
        <div className="toolbar" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }} role="status">
          <UserCheck size={16} aria-hidden /> <strong>{pending.length}</strong> yeni kayıt onayınızı bekliyor.
        </div>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Kullanıcı</th>
            <th>Ad</th>
            <th>Rol / Yetki</th>
            <th>Bayi</th>
            <th>Kayıt</th>
            <th>Durum</th>
            <th>
              <span className="sr-only">İşlem</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="mono">{u.username}</td>
              <td>{u.display_name}</td>
              <td title={ROLE_HINT[u.role]}>{ROLE_LABEL[u.role]}</td>
              <td>{customers.find((c) => c.id === u.customer_id)?.name ?? '-'}</td>
              <td className="small muted nowrap">{u.created_at ? date(u.created_at) : '-'}</td>
              <td>
                {!u.approved ? <span className="badge low">Onay bekliyor</span> : u.active ? <span className="badge ok">Aktif</span> : <span className="badge neutral">Pasif</span>}
              </td>
              <td>
                <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                  {!u.approved && (
                    <button className="btn primary sm" onClick={() => approve(u)} aria-label={`${u.username} kaydını onayla`}>
                      <UserCheck size={14} aria-hidden /> Onayla
                    </button>
                  )}
                  <button className="btn ghost icon sm" aria-label={`${u.username} düzenle`} onClick={() => setEditing({ ...u, password: '' })}>
                    <Pencil size={16} aria-hidden />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <Modal
          open
          title={editing.id ? `Kullanıcı düzenle – ${editing.username}` : 'Yeni kullanıcı'}
          onClose={() => setEditing(null)}
          footer={
            <>
              {editing.id && editing.id !== session?.user.id && (
                <button className="btn danger" style={{ marginRight: 'auto' }} onClick={() => setDel(users.find((u) => u.id === editing.id) ?? null)}>
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
            <Field label="Kullanıcı adı *">{(id) => <input id={id} className="input" autoComplete="off" value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} />}</Field>
            <Field label="Görünen ad">{(id) => <input id={id} className="input" value={editing.display_name} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} />}</Field>
            <Field label="Rol">
              {(id) => (
                <select id={id} className="select" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as UserRole })}>
                  <option value="admin">{ROLE_LABEL.admin}</option>
                  <option value="bayi">{ROLE_LABEL.bayi}</option>
                </select>
              )}
            </Field>
            <p className="muted small" style={{ gridColumn: 'span 2', margin: 0 }}>
              {ROLE_HINT[editing.role]}
            </p>
            <Field label="Cari kart" hint={editing.role === 'bayi' ? 'Boş bırakılırsa kullanıcı için yeni bir cari kart açılır.' : undefined}>
              {(id) => (
                <select id={id} className="select" value={editing.customer_id ?? ''} disabled={editing.role !== 'bayi'} onChange={(e) => setEditing({ ...editing, customer_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Yeni cari kart oluştur</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={editing.id ? 'Yeni şifre (boş: değişmez)' : 'Şifre *'}>
              {(id) => <input id={id} type="password" className="input" autoComplete="new-password" value={editing.password ?? ''} onChange={(e) => setEditing({ ...editing, password: e.target.value })} />}
            </Field>
            <label className="check" style={{ alignSelf: 'end' }}>
              <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked ? 1 : 0 })} /> Aktif
            </label>
          </form>
        </Modal>
      )}
      <Confirm open={!!del} title="Kullanıcıyı sil" text={`${del?.username} silinecek.`} danger confirmLabel="Sil" onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  )
}

function UpdateStatus(): ReactNode {
  const u = useUpdateState()
  if (!u) return null
  const label =
    u.status === 'checking'
      ? 'Güncelleme denetleniyor…'
      : u.status === 'available'
        ? `Yeni sürüm ${u.version} hazır`
        : u.status === 'downloading'
          ? `Sürüm ${u.version} indiriliyor… ${u.percent ?? 0}%`
          : u.status === 'downloaded' || u.status === 'installing'
            ? `Sürüm ${u.version} kuruluyor…`
            : u.status === 'error'
              ? `Güncelleme denetlenemedi: ${u.message ?? ''}`
              : 'Güncel'
  return (
    <>
      <span className="small">
        Sürüm <b>{u.current}</b> · <span className={u.status === 'error' ? 'danger-text' : 'muted'}>{label}</span>
      </span>
      {u.status === 'available' ? (
        <button className="btn primary sm" onClick={() => api('update:download', undefined).catch(() => undefined)}>
          Şimdi güncelle
        </button>
      ) : (
        <button className="btn sm" disabled={u.status !== 'idle' && u.status !== 'error'} onClick={() => api('update:check', undefined).catch(() => undefined)}>
          Güncellemeleri denetle
        </button>
      )}
    </>
  )
}

function Data(): ReactNode {
  const { toast } = useApp()
  const [info, setInfo] = useState<{ version: string; dbPath: string; platform: string } | null>(null)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [confirmSeed, setConfirmSeed] = useState(false)
  useEffect(() => {
    api('app:info', undefined).then(setInfo).catch(() => undefined)
  }, [])
  return (
    <div className="card grid" style={{ gap: 14 }}>
      <dl className="dl">
        <dt>Sürüm</dt>
        <dd className="row wrap" style={{ gap: 10 }}>
          <UpdateStatus />
        </dd>
        <dt>Veritabanı</dt>
        <dd className="mono small" style={{ wordBreak: 'break-all' }}>
          {info?.dbPath ?? '-'}
        </dd>
      </dl>
      <div className="row wrap">
        <button className="btn" onClick={() => api('app:backup', undefined).then((p) => p && toast(`Yedek alındı: ${p}`, 'success')).catch((e) => toast(e.message, 'error'))}>
          <Database size={16} aria-hidden /> Yedek al…
        </button>
        <button className="btn" onClick={() => setConfirmRestore(true)}>
          Yedekten geri yükle…
        </button>
        <button className="btn" onClick={() => info && api('app:openPath', info.dbPath.replace(/[\\/][^\\/]+$/, '')).catch(() => undefined)}>
          Veri klasörünü aç
        </button>
        <span className="spacer" />
        <button className="btn ghost" onClick={() => setConfirmSeed(true)}>
          Örnek veri yükle (12.000 ürün)
        </button>
      </div>
      <p className="muted small">Yedek dosyasını başka bir bilgisayara taşıyarak aynı veriyle çalışabilirsiniz. Geri yükleme sonrası uygulama yeniden başlar.</p>
      <Confirm
        open={confirmRestore}
        title="Yedekten geri yükle"
        text="Mevcut veriler seçeceğiniz yedekle değiştirilecek. Devam edilsin mi?"
        danger
        confirmLabel="Dosya seç"
        onCancel={() => setConfirmRestore(false)}
        onConfirm={() => {
          setConfirmRestore(false)
          api('app:restore', undefined).catch((e) => toast(e.message, 'error'))
        }}
      />
      <Confirm
        open={confirmSeed}
        title="Örnek veri"
        text="Test amaçlı 12.000 örnek rulman ürünü eklenir. Gerçek stok listesini yüklemeden önce 'Tümünü sil ve yeniden yükle' modunu kullanabilirsiniz."
        confirmLabel="Yükle"
        onCancel={() => setConfirmSeed(false)}
        onConfirm={() => {
          setConfirmSeed(false)
          api('app:seedDemo', 12000)
            .then((n) => toast(`${n} örnek ürün eklendi.`, 'success'))
            .catch((e) => toast(e.message, 'error'))
        }}
      />
    </div>
  )
}

const EMPTY_PROFILE: CustomerProfile = { name: '', contact: '', phone: '', email: '', address: '', city: '', tax_no: '', tax_office: '' }

/** Dealers complete their own company card (title, tax and contact details) after approval. */
function MyCompany(): ReactNode {
  const { session, setSession, toast } = useApp()
  const c = session?.customer ?? null
  const [p, setP] = useState<CustomerProfile>(EMPTY_PROFILE)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (c) setP({ name: c.name, contact: c.contact, phone: c.phone, email: c.email, address: c.address, city: c.city, tax_no: c.tax_no, tax_office: c.tax_office })
  }, [c])
  const missing = c ? [c.name, c.tax_no, c.tax_office, c.phone, c.address].filter((v) => !v.trim()).length : 0
  const set = (k: keyof CustomerProfile) => (e: ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: e.target.value })
  const submit = async (): Promise<void> => {
    if (!p.name.trim()) return toast('Firma / ünvan boş olamaz.', 'error')
    setSaving(true)
    try {
      const s = await api('customers:profile', p)
      setSession(s)
      toast('Firma bilgileriniz kaydedildi.', 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }
  if (!c)
    return (
      <div className="card">
        <p className="muted">Bu hesaba bağlı bir cari kart bulunamadı. Lütfen yöneticinizle iletişime geçin.</p>
      </div>
    )
  return (
    <form
      className="card grid"
      style={{ gap: 16, maxWidth: 760 }}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <Building2 size={28} aria-hidden style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <div>
          <h3 style={{ margin: 0 }}>Firma bilgilerim</h3>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Cari kodunuz: <b className="mono">{c.code}</b>. Fatura ve teslimat için ünvan, vergi ve iletişim bilgilerinizi buradan tamamlayın.
          </p>
        </div>
      </div>
      {missing > 0 && (
        <div className="toolbar" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', borderRadius: 'var(--radius-sm)' }} role="status">
          Kaydınızı tamamlamak için {missing} alan eksik.
        </div>
      )}
      <div className="grid g2">
        <Field label="Firma / ünvan *">{(id) => <input id={id} className="input" value={p.name} onChange={set('name')} autoComplete="organization" />}</Field>
        <Field label="Yetkili kişi">{(id) => <input id={id} className="input" value={p.contact} onChange={set('contact')} autoComplete="name" />}</Field>
        <Field label="Telefon">{(id) => <input id={id} className="input" value={p.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" />}</Field>
        <Field label="E-posta">{(id) => <input id={id} className="input" type="email" value={p.email} onChange={set('email')} autoComplete="email" />}</Field>
        <Field label="Vergi no / TC kimlik no" hint="10 haneli VKN veya 11 haneli TCKN">{(id) => <input id={id} className="input mono" value={p.tax_no} onChange={set('tax_no')} inputMode="numeric" maxLength={11} />}</Field>
        <Field label="Vergi dairesi">{(id) => <input id={id} className="input" value={p.tax_office} onChange={set('tax_office')} />}</Field>
        <Field label="Şehir">{(id) => <input id={id} className="input" value={p.city} onChange={set('city')} autoComplete="address-level1" />}</Field>
        <Field label="Adres">{(id) => <input id={id} className="input" value={p.address} onChange={set('address')} autoComplete="street-address" />}</Field>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn primary" type="submit" disabled={saving}>
          <Save size={16} aria-hidden /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </form>
  )
}

function Password(): ReactNode {
  const { toast } = useApp()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const submit = async (): Promise<void> => {
    if (next.length < 4) return toast('Yeni şifre en az 4 karakter olmalı.', 'error')
    if (next !== again) return toast('Şifreler eşleşmiyor.', 'error')
    try {
      await api('auth:changePassword', { current, next })
      toast('Şifre değiştirildi.', 'success')
      setCurrent('')
      setNext('')
      setAgain('')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }
  return (
    <form
      className="card grid"
      style={{ gap: 12, maxWidth: 420 }}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Field label="Mevcut şifre">{(id) => <input id={id} type="password" className="input" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}</Field>
      <Field label="Yeni şifre">{(id) => <input id={id} type="password" className="input" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}</Field>
      <Field label="Yeni şifre (tekrar)">{(id) => <input id={id} type="password" className="input" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />}</Field>
      <button className="btn primary" type="submit">
        Şifreyi değiştir
      </button>
    </form>
  )
}
