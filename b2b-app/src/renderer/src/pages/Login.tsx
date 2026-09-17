import { CheckCircle2, LogIn } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import logo from '@/assets/logo.png'
import { GlobeScene } from '@/components/Brand'
import { Field } from '@/components/ui'
import { api } from '@/lib/api'
import { useApp } from '@/store/app'

export function Login(): ReactNode {
  const setSession = useApp((s) => s.setSession)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setSession(await api('auth:login', { username, password }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <aside className="login-side" aria-hidden>
        <img className="brand-logo" src={logo} alt="" />
        <div>
          <h2>Rulman stoklarına anında erişim</h2>
          <p>Stok kodu, ölçü veya marka ile saniyeler içinde arayın; sepete ekleyin, siparişinizi oluşturun.</p>
          <ul>
            <li>
              <CheckCircle2 size={18} /> 10.000+ üründe anında arama
            </li>
            <li>
              <CheckCircle2 size={18} /> Muadil kodlar ve d × D × B ölçü filtresi
            </li>
            <li>
              <CheckCircle2 size={18} /> Sipariş takibi ve Excel çıktısı
            </li>
          </ul>
        </div>
        <small style={{ color: 'var(--navy-muted)' }}>yamansarulman.com</small>
        <GlobeScene size={420} />
      </aside>
      <div className="login-form">
      <form className="card" onSubmit={submit} aria-labelledby="login-title" aria-describedby={error ? 'login-error' : undefined}>
        <h1 id="login-title" style={{ fontSize: '1.4rem', marginBottom: 4 }}>
          Oturum aç
        </h1>
        <p className="muted" style={{ marginBottom: 18 }}>
          Yamansa Rulman B2B hesabınızla giriş yapın.
        </p>
        <div className="grid" style={{ gap: 14 }}>
          <Field label="Kullanıcı adı">
            {(id) => (
              <input id={id} className="input" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} required />
            )}
          </Field>
          <Field label="Şifre">
            {(id) => (
              <input
                id={id}
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}
          </Field>
          {error && (
            <div id="login-error" role="alert" className="badge out" style={{ padding: '8px 12px', borderRadius: 8 }}>
              {error}
            </div>
          )}
          <button className="btn primary" type="submit" disabled={busy} style={{ height: 44 }}>
            <LogIn size={18} aria-hidden /> {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>
          <p className="faint small" style={{ margin: 0 }}>
            Kullanıcı adı ve şifrenizi yöneticinizden alın. Şifrenizi Ayarlar bölümünden değiştirebilirsiniz.
          </p>
        </div>
      </form>
      </div>
    </div>
  )
}
