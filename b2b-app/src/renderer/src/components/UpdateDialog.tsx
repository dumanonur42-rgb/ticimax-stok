import { Download, RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { UpdateState } from '@shared/types'
import { api, onEvent } from '@/lib/api'
import mark from '@/assets/mark.png'

/** Subscribes to the main-process updater state. */
export function useUpdateState(): UpdateState | null {
  const [state, setState] = useState<UpdateState | null>(null)
  useEffect(() => {
    const load = (): void => {
      api('update:state', undefined).then(setState).catch(() => undefined)
    }
    load()
    return onEvent('update:changed', load)
  }, [])
  return state
}

const BUSY = new Set<UpdateState['status']>(['downloading', 'downloaded', 'installing'])

/**
 * Pops up when a newer release is found: shows current → new version, release notes and
 * a single "Şimdi güncelle" action that downloads, installs over the current build and relaunches.
 * "Sonra" hides the dialog for that version until the app is restarted.
 */
export function UpdateDialog(): ReactNode {
  const u = useUpdateState()
  const ref = useRef<HTMLDialogElement>(null)
  const [dismissed, setDismissed] = useState<string | null>(null)

  const show = !!u && u.version !== undefined && (BUSY.has(u.status) || (u.status === 'available' && dismissed !== u.version) || (u.status === 'error' && dismissed !== `err:${u.version}`))

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (show && !d.open) d.showModal()
    if (!show && d.open) d.close()
  }, [show])

  if (!u) return null
  const busy = BUSY.has(u.status)
  const close = (): void => setDismissed(u.status === 'error' ? `err:${u.version}` : (u.version ?? null))

  return (
    <dialog
      ref={ref}
      className="modal update-dialog"
      aria-labelledby="update-title"
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) close()
      }}
    >
      {show && (
        <div className="update-card">
          <div className="update-hero">
            <img src={mark} alt="" width={64} height={64} />
            <div>
              <h2 id="update-title">{u.status === 'error' ? 'Güncelleme yapılamadı' : 'Yeni sürüm hazır'}</h2>
              <div className="update-versions" aria-label="Sürüm">
                <span className="ver old">{u.current}</span>
                <span aria-hidden>→</span>
                <span className="ver new">{u.version}</span>
              </div>
            </div>
          </div>

          {u.status === 'available' && (
            <>
              <p className="muted">Yamansa Rulman B2B için {u.version} sürümü yayınlandı. Güncelleme indirilip mevcut kurulumun üzerine kurulur ve uygulama yeniden açılır; verileriniz korunur.</p>
              {u.notes && (
                <div className="update-notes">
                  <b>Yenilikler</b>
                  <pre>{u.notes}</pre>
                </div>
              )}
              <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
                <button className="btn" onClick={close}>
                  Sonra
                </button>
                <button className="btn primary" autoFocus onClick={() => api('update:download', undefined).catch(() => undefined)}>
                  <Download size={16} aria-hidden /> Şimdi güncelle
                </button>
              </div>
            </>
          )}

          {busy && (
            <div role="status" aria-live="polite" className="grid" style={{ gap: 10 }}>
              <div className="row" style={{ gap: 8 }}>
                <RefreshCw size={16} aria-hidden className="spin" />
                <span>{u.status === 'downloading' ? `İndiriliyor… ${u.percent ?? 0}%` : u.status === 'downloaded' ? 'İndirildi, kuruluyor…' : 'Kuruluyor, uygulama yeniden başlatılıyor…'}</span>
              </div>
              <progress className="update-progress" max={100} value={u.status === 'downloading' ? (u.percent ?? 0) : 100} aria-label="İndirme ilerlemesi" />
              <span className="muted small">Lütfen uygulamayı kapatmayın.</span>
            </div>
          )}

          {u.status === 'error' && (
            <>
              <p className="danger-text small" style={{ wordBreak: 'break-word' }}>
                {u.message ?? 'Bilinmeyen hata'}
              </p>
              <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
                <button className="btn" onClick={close}>
                  Kapat
                </button>
                <button className="btn primary" onClick={() => api('update:check', undefined).catch(() => undefined)}>
                  <Sparkles size={16} aria-hidden /> Tekrar dene
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </dialog>
  )
}
