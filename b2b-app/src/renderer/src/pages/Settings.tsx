import { PERMS, type Currency, type Customer, type CustomerProfile, type Perm, type Settings as S, type SyncStatus, type User, type UserRole } from '@shared/types'
import { PERM_INFO, ROLE_PERMS } from '@shared/perms'
import { Building2, Check, ChevronRight, Copy, Contrast, Database, Eye, EyeOff, LockKeyhole, Minus, Monitor, Moon, Pencil, Plus, RotateCcw, Save, Sun, Trash2, UserCheck, Users as UsersIcon, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Confirm, Field, Modal } from '@/components/ui'
import { api, onEvent } from '@/lib/api'
import { date, ROLE_HINT, ROLE_LABEL } from '@/lib/format'
import { useApp } from '@/store/app'
import './settings.css'

type Tab = 'gorunum' | 'profil' | 'firma' | 'kullanicilar' | 'veri' | 'sifre'

const SECTIONS: { id: Tab; label: string; hint: string; icon: LucideIcon; admin?: boolean; dealer?: boolean }[] = [
  { id: 'gorunum', label: 'Görünüm & Erişilebilirlik', hint: 'Tema, yazı ve kullanım', icon: Monitor },
  { id: 'profil', label: 'Firma bilgilerim', hint: 'Bayi firma kartı', icon: Building2, dealer: true },
  { id: 'firma', label: 'Firma & Fiyat', hint: 'Şirket ve fiyat ayarları', icon: Building2, admin: true },
  { id: 'kullanicilar', label: 'Kullanıcılar', hint: 'Hesaplar ve yetkiler', icon: UsersIcon, admin: true },
  { id: 'veri', label: 'Bulut & Veri', hint: 'Eşitleme ve yerel kopya', icon: Database, admin: true },
  { id: 'sifre', label: 'Şifre', hint: 'Giriş güvenliği', icon: LockKeyhole }
]

/** `go('settings', SETTINGS_TAB_USERS)` opens the user management tab directly. */
export const SETTINGS_TAB_USERS = 1

export function SettingsPage(): ReactNode {
  const { session, settings, pageParam } = useApp()
  const isAdmin = session?.user.role === 'admin'
  const [tab, setTab] = useState<Tab>(pageParam === SETTINGS_TAB_USERS && isAdmin ? 'kullanicilar' : 'gorunum')
  const { go } = useApp()
  const visible = SECTIONS.filter((t) => (!t.admin || isAdmin) && (!t.dealer || !isAdmin))
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const selected = visible.find((item) => item.id === tab) ?? visible[0]

  return (
    <div className="settings-layout">
      <nav className="settings-nav" role="tablist" aria-label="Ayar bölümleri">
        {visible.map((item, index) => {
          const Icon = item.icon
          return <button
            key={item.id}
            ref={(element) => { buttonRefs.current[index] = element }}
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            className={`settings-nav-item${tab === item.id ? ' active' : ''}`}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => {
              let next = -1
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % visible.length
              if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + visible.length) % visible.length
              if (event.key === 'Home') next = 0
              if (event.key === 'End') next = visible.length - 1
              if (next >= 0) {
                event.preventDefault()
                setTab(visible[next].id)
                buttonRefs.current[next]?.focus()
              }
            }}
          >
            <Icon size={18} aria-hidden />
            <span><strong>{item.label}</strong><small>{item.hint}</small></span>
            <ChevronRight className="settings-nav-chevron" size={16} aria-hidden />
          </button>
        })}
      </nav>
      <div className="settings-content">
        <header className="settings-panel-head">
          <div><h2>{selected.label}</h2><p>{selected.hint}</p></div>
        </header>
        <div className="settings-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'gorunum' && settings && <Appearance s={settings} />}
          {tab === 'profil' && <MyCompany />}
          {tab === 'firma' && settings && <Company s={settings} />}
          {tab === 'kullanicilar' && <section className="settings-group"><header><h3>Kullanıcılar</h3><p>Hesapları ve erişim yetkilerini yönetin.</p></header><Users /></section>}
          {tab === 'veri' && <Data />}
          {tab === 'sifre' && <Password />}
        </div>
      </div>
    </div>
  )
}

function Appearance({ s }: { s: S }): ReactNode {
  const { session, updateSettings, toast, go } = useApp()
  const isAdmin = session?.user.role === 'admin'
  const [version, setVersion] = useState('—')
  const [checking, setChecking] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('Otomatik denetim açık')
  useEffect(() => {
    let active = true
    api('app:info', undefined)
      .then((info) => active && setVersion(info.version))
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])
  const set = (patch: Partial<S>): void => {
    updateSettings(patch).catch((e) => toast(e.message, 'error'))
  }
  const checkUpdates = async (): Promise<void> => {
    setChecking(true)
    try {
      await api('app:checkUpdates', undefined)
      setUpdateStatus('Denetim başlatıldı')
    } catch (error) {
      const message = (error as Error).message
      setUpdateStatus(message.startsWith('Güncelleme') ? message : `Güncelleme denetlenemedi: ${message}`)
      toast(message, 'error')
    } finally {
      setChecking(false)
    }
  }
  const themes: { id: S['theme']; label: string; icon: LucideIcon }[] = [
    { id: 'system', label: 'Sistem', icon: Monitor },
    { id: 'light', label: 'Açık', icon: Sun },
    { id: 'dark', label: 'Koyu', icon: Moon },
    { id: 'contrast', label: 'Yüksek kontrast', icon: Contrast }
  ]
  const adjustFont = (delta: number): void => set({ font_scale: Math.max(0.85, Math.min(1.5, Number((s.font_scale + delta).toFixed(2)))) })
  return (
    <div className="settings-stack">
      <section className="settings-group">
        <header><h3>Görünüm</h3><p>Uygulamayı gözünüze ve çalışma biçiminize göre ayarlayın.</p></header>
        <div className="settings-field"><span className="label">Tema</span><div className="theme-grid" role="radiogroup" aria-label="Tema">
          {themes.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="radio" aria-checked={s.theme === id} className={`theme-option${s.theme === id ? ' selected' : ''}`} data-preview={id} onClick={() => set({ theme: id })}>
            <span className="theme-swatch" aria-hidden><span className="theme-swatch-bar" /><span className="theme-swatch-body"><i className="theme-swatch-line" /><i className="theme-swatch-line short" /></span></span>
            <span className="theme-option-text"><strong><Icon size={15} aria-hidden /> {label}</strong></span>{s.theme === id && <Check className="theme-check" size={18} aria-hidden />}
          </button>)}
        </div></div>
        <div className="settings-field"><span className="label">Yoğunluk</span><div className="settings-segment" role="radiogroup" aria-label="Yoğunluk">
          {([{ value: 'comfortable', label: 'Rahat' }, { value: 'compact', label: 'Sıkışık' }] as const).map((item) => <button key={item.value} role="radio" aria-checked={s.density === item.value} className={s.density === item.value ? 'active' : ''} onClick={() => set({ density: item.value })}>{item.label}</button>)}
        </div></div>
        <div className="settings-font">
          <div className="settings-font-head"><label htmlFor="settings-font-scale">Yazı boyutu <b>%{Math.round(s.font_scale * 100)}</b></label><button className="btn sm" onClick={() => set({ font_scale: 1 })}><RotateCcw size={14} aria-hidden /> Sıfırla</button></div>
          <div className="settings-font-control"><button className="btn icon" aria-label="Yazıyı küçült" onClick={() => adjustFont(-0.05)}><Minus size={16} aria-hidden /></button><input id="settings-font-scale" type="range" min={0.85} max={1.5} step={0.05} value={s.font_scale} onChange={(e) => set({ font_scale: Number(e.target.value) })} /><button className="btn icon" aria-label="Yazıyı büyüt" onClick={() => adjustFont(0.05)}><Plus size={16} aria-hidden /></button></div>
          <p className="settings-preview" style={{ fontSize: `${s.font_scale}em` }}>Ürün kodu, fiyat ve açıklamalar bu boyutta görünür.</p>
        </div>
        <label className="settings-switch"><span><strong>Animasyonları azalt</strong><small>Hareketli geçişleri azaltır.</small></span><input type="checkbox" role="switch" checked={s.reduce_motion} onChange={(e) => set({ reduce_motion: e.target.checked })} /></label>
        {isAdmin && <label className="settings-switch"><span><strong>Arka planda çalış ve Windows bildirimi göster</strong><small>Pencere kapandığında siparişleri izler; Windows açılışında başlar.</small></span><input type="checkbox" role="switch" checked={s.background_notifications} onChange={(e) => set({ background_notifications: e.target.checked })} /></label>}
        <button className="settings-link" onClick={() => go('help')}>Klavye kısayolları <ChevronRight size={15} aria-hidden /> Yardım</button>
      </section>
      <section className="settings-group">
        <header><h3>Uygulama</h3><p>Yüklü sürümü ve güncelleme durumunu görün.</p></header>
        <div className="settings-app-row"><span><b>Sürüm {version} </b><small>{updateStatus}</small></span><button className="btn" disabled={checking} onClick={() => void checkUpdates()}>{checking ? 'Denetleniyor…' : 'Güncellemeleri denetle'}</button></div>
      </section>
    </div>
  )
}

function Company({ s }: { s: S }): ReactNode {
  const { updateSettings, toast } = useApp()
  const [f, setF] = useState<S>(s)
  useEffect(() => setF(s), [s])
  const dirty = JSON.stringify(f) !== JSON.stringify(s)
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
    <div className="settings-stack settings-company">
      <section className="settings-group"><header><h3>Firma bilgileri</h3><p>Alışveriş ekranında ve belgelerde görünen iletişim bilgileri.</p></header><div className="settings-fields">{text('company_name', 'Firma adı')}{text('company_phone', 'Telefon')}{text('company_email', 'E-posta')}{text('company_web', 'Web')}<div className="span-all">{text('company_address', 'Adres')}</div></div></section>
      <section className="settings-group"><header><h3>Fiyat ve kur</h3><p>Varsayılan para birimi, vergi ve fiyat hesaplama ayarları.</p></header><div className="settings-fields">
        <Field label="Varsayılan para birimi">{(id) => <select id={id} className="select" value={f.default_currency} onChange={(e) => setF({ ...f, default_currency: e.target.value as Currency })}><option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option></select>}</Field>
        {numF('vat_pct', 'KDV (%)')}{numF('card_price_pct', 'Kredi kartı fiyat farkı (%)', 'Kendi kart fiyatı yoksa bu oran eklenir. 0 ise gösterilmez.')}{numF('rate_usd', 'USD kuru (₺)')}{numF('rate_eur', 'EUR kuru (₺)')}
      </div></section>
      <section className="settings-group"><header><h3>Stok ve bayiler</h3><p>Stok uyarısı ve bayi fiyat görünürlüğü.</p></header><div className="settings-fields">{numF('low_stock_threshold', 'Kritik stok eşiği', '"Azaldı" uyarısı bu değerin altında gösterilir.')}<label className="check"><input type="checkbox" checked={f.show_prices_to_dealers} onChange={(e) => setF({ ...f, show_prices_to_dealers: e.target.checked })} /> Bayiler fiyatları görebilsin</label></div></section>
      {dirty && <div className="settings-savebar"><button className="btn" onClick={() => setF(s)}>Vazgeç</button><button className="btn primary" onClick={() => void save()}><Save size={16} aria-hidden /> Kaydet</button></div>}
    </div>
  )
}

type UserForm = { id?: string; username: string; display_name: string; role: UserRole; perms: Perm[]; customer_id: number | null; password?: string; active: number }

function Users(): ReactNode {
  const { toast, session } = useApp()
  const [users, setUsers] = useState<User[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [editing, setEditing] = useState<UserForm | null>(null)
  const [revealed, setRevealed] = useState<Record<string, string | null>>({})
  const hidePassword = (id: string): void => setRevealed(({ [id]: _, ...rest }) => rest)
  const reveal = async (u: User): Promise<void> => {
    if (u.id in revealed) return hidePassword(u.id)
    try {
      const password = await api('users:revealPassword', u.id)
      setRevealed((current) => ({ ...current, [u.id]: password }))
      window.setTimeout(() => hidePassword(u.id), 30_000)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }
  const [del, setDel] = useState<User | null>(null)
  const addUserButtonRef = useRef<HTMLButtonElement>(null)
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
      setEditing(null)
      setDel(null)
      load()
      window.requestAnimationFrame(() => addUserButtonRef.current?.focus())
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
        <button ref={addUserButtonRef} className="btn primary" onClick={() => setEditing({ username: '', display_name: '', role: 'bayi', perms: [], customer_id: null, password: '', active: 1 })}>
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
              <td className="mono">
                {u.username}
                {u.id in revealed && (
                  <div className="row small" style={{ gap: 4, marginTop: 4 }}>
                    {revealed[u.id] ? (
                      <>
                        <code>{revealed[u.id]}</code>
                        <button
                          className="btn ghost icon sm"
                          aria-label={`${u.username} şifresini kopyala`}
                          onClick={() => void navigator.clipboard.writeText(revealed[u.id] ?? '').then(() => toast('Şifre kopyalandı.', 'success'))}
                        >
                          <Copy size={14} aria-hidden />
                        </button>
                      </>
                    ) : (
                      <span className="muted">Kayıtlı değil — şifreyi yeniden belirleyin.</span>
                    )}
                  </div>
                )}
              </td>
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
                  <button
                    className="btn ghost icon sm"
                    aria-label={u.id in revealed ? `${u.username} şifresini gizle` : `${u.username} şifresini göster`}
                    title={u.id in revealed ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    onClick={() => void reveal(u)}
                  >
                    {u.id in revealed ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                  </button>
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
                  <option value="ara">{ROLE_LABEL.ara}</option>
                  <option value="bayi">{ROLE_LABEL.bayi}</option>
                </select>
              )}
            </Field>
            <p className="muted small" style={{ gridColumn: 'span 2', margin: 0 }}>
              {ROLE_HINT[editing.role]}
            </p>
            {editing.role !== 'admin' && (
              <fieldset className="perm-set" style={{ gridColumn: 'span 2' }}>
                <legend>Ek özellikler</legend>
                {PERMS.map((perm) => {
                  const inherent = ROLE_PERMS[editing.role].includes(perm)
                  const checked = inherent || editing.perms.includes(perm)
                  return (
                    <label key={perm} className="check perm-check" title={PERM_INFO[perm].hint}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={inherent}
                        onChange={(e) =>
                          setEditing({ ...editing, perms: e.target.checked ? [...editing.perms, perm] : editing.perms.filter((p) => p !== perm) })
                        }
                      />
                      <span>
                        {PERM_INFO[perm].label}
                        {inherent && <span className="muted small"> · rolle gelir</span>}
                        <small className="muted">{PERM_INFO[perm].hint}</small>
                      </span>
                    </label>
                  )
                })}
              </fieldset>
            )}
            <Field label="Cari kart" hint={editing.role !== 'admin' ? 'Boş bırakılırsa kullanıcı için yeni bir cari kart açılır.' : undefined}>
              {(id) => (
                <select id={id} className="select" value={editing.customer_id ?? ''} disabled={editing.role === 'admin'} onChange={(e) => setEditing({ ...editing, customer_id: e.target.value ? Number(e.target.value) : null })}>
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

function fmtTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('tr-TR') : '—'
}

/** Cloud status: every installation reads the same shared database; the local copy is only a search cache. */
function Data(): ReactNode {
  const { toast } = useApp()
  const [info, setInfo] = useState<{ version: string; dbPath: string; platform: string } | null>(null)
  const [sync, setSync] = useState<SyncStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmPurge, setConfirmPurge] = useState(false)
  useEffect(() => {
    api('app:info', undefined).then(setInfo).catch(() => undefined)
    const load = (): void => {
      api('app:syncStatus', undefined)
        .then(setSync)
        .catch((error) => console.warn('Eşitleme durumu alınamadı.', error))
    }
    load()
    return onEvent('sync:changed', load)
  }, [])
  const resync = (): void => {
    setBusy(true)
    api('app:resync', undefined)
      .then((n) => toast(`${n} ürün buluttan yeniden alındı.`, 'success'))
      .catch((error) => toast((error as Error).message || 'Ürün eşitleme başarısız.', 'error'))
      .finally(() => setBusy(false))
  }
  const purge = (): void => {
    setConfirmPurge(false)
    setBusy(true)
    api('app:purgeProducts', undefined)
      .then((n) => toast(`${n.toLocaleString('tr-TR')} ürün silindi; tüm bilgisayarlardaki listeler temizleniyor.`, 'success'))
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setBusy(false))
  }
  return (
    <div className="settings-stack">
    <section className="settings-group">
      <header><h3>Bulut durumu</h3><p>Ortak veriler bulutta; bu bilgisayarda şifreli ürün kopyası bulunur.</p></header>
      <div className="settings-status-grid">
        <div><small>Bağlantı</small><b className={`badge ${sync?.online ? 'ok' : 'out'}`}>{sync?.online ? 'Bağlı' : 'Bağlantı yok'}</b></div>
        <div><small>Son eşitleme</small><b>{fmtTime(sync?.lastSync ?? null)}</b></div>
        <div><small>Yerel ürün kopyası</small><b>{sync ? `${sync.productCount.toLocaleString('tr-TR')} ürün` : '—'}</b></div>
        <div className="encrypted-tile"><small>Yerel veri</small><b><LockKeyhole size={15} aria-hidden /> Şifreli</b></div>
      </div>
      <p className="settings-encryption-note">Bu bilgisayardaki ürün kopyası şifreli tutulur, çıkış yapınca silinir.</p>
    </section>
    <section className="settings-group">
      <header><h3>Eşitleme</h3><p>Ürünleri buluttan yeniden alın veya teknik dosya bilgilerini görüntüleyin.</p></header>
      <div className="row wrap">
        <button className="btn" disabled={busy} onClick={resync}><Database size={16} aria-hidden /> {busy ? 'Eşitleniyor…' : 'Ürünleri yeniden eşitle'}</button>
      </div>
      <details className="settings-details"><summary>Teknik ayrıntı</summary>
      <dl className="dl">
        <dt>Sürüm</dt>
        <dd className="row wrap" style={{ gap: 10 }}>
          <b>{info?.version ?? '—'}</b>
        </dd>
        <dt>Bulut bağlantısı</dt>
        <dd>
          <span className={`badge ${sync?.online ? 'ok' : 'out'}`}>{sync?.online ? 'Bağlı' : 'Bağlantı yok'}</span>
        </dd>
        <dt>Son eşitleme</dt>
        <dd>{fmtTime(sync?.lastSync ?? null)}</dd>
        <dt>Ürün sayısı</dt>
        <dd>{sync ? `${sync.productCount.toLocaleString('tr-TR')} ürün` : '—'}</dd>
        <dt>Yerel ürün kopyası</dt>
        <dd className="mono small" style={{ wordBreak: 'break-all' }}>
          {info?.dbPath ?? '-'}
        </dd>
      </dl>
      <div className="row wrap">
        <button className="btn" onClick={() => info && api('app:openPath', info.dbPath.replace(/[\\/][^\\/]+$/, '')).catch(() => undefined)}>
          Veri klasörünü aç
        </button>
      </div>
      </details>
      <p className="muted small">
        Ürünler, stoklar, bayiler, kullanıcılar ve siparişler ortak bulut veritabanında tutulur.
      </p>
    </section>
    <section className="settings-danger-zone"><header><h3>Tehlikeli bölge</h3><p>Bu işlem ortak ürün listesini tüm bilgisayarlardan kaldırır.</p></header><button className="btn danger" disabled={busy} onClick={() => setConfirmPurge(true)}><Trash2 size={16} aria-hidden /> Ürün listesini sil</button></section>
      <Confirm
        open={confirmPurge}
        title="Ürün listesini sil"
        text={`Ortak veritabanındaki ${sync ? sync.productCount.toLocaleString('tr-TR') : 'tüm'} ürün kalıcı olarak silinir ve tüm bilgisayarlardaki ürün listeleri temizlenir. Geçmiş siparişler korunur. Ardından Stok Aktar ile yeni listeyi yükleyebilirsiniz. Bu işlem geri alınamaz.`}
        danger
        confirmLabel="Tümünü sil"
        onCancel={() => setConfirmPurge(false)}
        onConfirm={purge}
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
  const [visible, setVisible] = useState(false)
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
      className="card grid settings-password"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Field label="Mevcut şifre">{(id) => <div className="settings-password-input"><input id={id} type={visible ? 'text' : 'password'} className="input" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /><button type="button" className="btn ghost icon" aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>}</Field>
      <Field label="Yeni şifre">{(id) => <input id={id} type={visible ? 'text' : 'password'} className="input" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}</Field>
      <Field label="Yeni şifre (tekrar)">{(id) => <input id={id} type={visible ? 'text' : 'password'} className="input" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />}</Field>
      <button className="btn primary" type="submit">
        Şifreyi değiştir
      </button>
    </form>
  )
}
