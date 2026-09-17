import { LogIn } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
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
      <form className="card" onSubmit={submit} aria-labelledby="login-title" aria-describedby={error ? 'login-error' : undefined}>
        <div className="brand" style={{ padding: 0, marginBottom: 18 }}>
          <span className="brand-logo" aria-hidden />
          <div>
            Yamansa Rulman
            <small>B2B Bayi Portalı</small>
          </div>
        </div>
        <h1 id="login-title" style={{ fontSize: '1.25rem' }}>
          Oturum aç
        </h1>
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
            İlk kurulumda kullanıcı adı <code>admin</code>, şifre <code>admin</code>. Girişten sonra Ayarlar bölümünden değiştirin.
          </p>
        </div>
      </form>
    </div>
  )
}
