import { LogIn, UserPlus } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import logo from '@/assets/logo.png'
import { GlobeScene } from '@/components/Brand'
import { Field } from '@/components/ui'
import { api } from '@/lib/api'
import { useApp } from '@/store/app'

type Mode = 'login' | 'register'

export function Login(): ReactNode {
  const setSession = useApp((s) => s.setSession)
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const switchMode = (m: Mode): void => {
    setMode(m)
    setError('')
    setNotice('')
    setPassword('')
    setPassword2('')
  }

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (mode === 'login') {
        setSession(await api('auth:login', { username, password }))
      } else {
        if (password !== password2) throw new Error('Şifreler birbiriyle eşleşmiyor.')
        await api('auth:register', { username, display_name: displayName, company_name: companyName, password })
        switchMode('login')
        setNotice('Kaydınız alındı. Bir yönetici bayi hesabınızı onayladığında giriş yapabilirsiniz.')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const isRegister = mode === 'register'

  return (
    <div className="login">
      <aside className="login-side" aria-hidden>
        <img className="brand-logo" src={logo} alt="" />
        <div>
          <h2>Rulman stoklarına anında erişim</h2>
          <p>Stok kodu, ölçü veya marka ile arayın; sepete ekleyin, siparişinizi oluşturun.</p>
        </div>
        <small style={{ color: 'var(--navy-muted)' }}>yamansarulman.com</small>
        <GlobeScene size={420} />
      </aside>
      <div className="login-form">
        <form className="card" onSubmit={submit} aria-labelledby="login-title" aria-describedby={error ? 'login-error' : notice ? 'login-notice' : undefined}>
          <h1 id="login-title" style={{ fontSize: '1.4rem', marginBottom: 4 }}>
            {isRegister ? 'Kayıt ol' : 'Oturum aç'}
          </h1>
          <p className="muted" style={{ marginBottom: 18 }}>
            {isRegister ? 'Bayi hesabınız yönetici onayından sonra açılır; firma ve vergi bilgilerinizi giriş yaptıktan sonra Ayarlar › Firma bilgilerim bölümünden tamamlayabilirsiniz.' : 'Yamansa Rulman B2B hesabınızla giriş yapın.'}
          </p>
          <div className="grid" style={{ gap: 14 }}>
            <Field label="Kullanıcı adı">
              {(id) => (
                <input id={id} className="input" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} required minLength={isRegister ? 3 : undefined} />
              )}
            </Field>
            {isRegister && (
              <>
                <Field label="İşletme adı">
                  {(id) => <input id={id} className="input" autoComplete="organization" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required minLength={2} />}
                </Field>
                <Field label="Ad Soyad">{(id) => <input id={id} className="input" autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />}</Field>
              </>
            )}
            <Field label="Şifre">
              {(id) => (
                <input
                  id={id}
                  className="input"
                  type="password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isRegister ? 4 : undefined}
                />
              )}
            </Field>
            {isRegister && (
              <Field label="Şifre (tekrar)">
                {(id) => <input id={id} className="input" type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} required />}
              </Field>
            )}
            {error && (
              <div id="login-error" role="alert" className="badge out" style={{ padding: '8px 12px', borderRadius: 8 }}>
                {error}
              </div>
            )}
            {notice && (
              <div id="login-notice" role="status" className="badge ok" style={{ padding: '8px 12px', borderRadius: 8, whiteSpace: 'normal' }}>
                {notice}
              </div>
            )}
            <button className="btn primary" type="submit" disabled={busy} style={{ height: 44 }}>
              {isRegister ? <UserPlus size={18} aria-hidden /> : <LogIn size={18} aria-hidden />}
              {busy ? (isRegister ? 'Kaydediliyor…' : 'Giriş yapılıyor…') : isRegister ? 'Kayıt ol' : 'Giriş yap'}
            </button>
            <div className="row small" style={{ justifyContent: 'center', gap: 6 }}>
              <span className="faint">{isRegister ? 'Zaten hesabınız var mı?' : 'Hesabınız yok mu?'}</span>
              <button type="button" className="btn ghost sm" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
                {isRegister ? 'Giriş yap' : 'Kayıt ol'}
              </button>
            </div>
            {!isRegister && (
              <p className="faint small" style={{ margin: 0 }}>
                Giriş yaptığınızda oturumunuz hatırlanır; yalnızca "Çıkış" yaptığınızda tekrar şifre istenir.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
