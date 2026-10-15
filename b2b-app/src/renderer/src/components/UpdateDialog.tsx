import { Download, RefreshCw } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { UpdateState } from '@shared/types'
import { api, onEvent } from '@/lib/api'

/** Subscribes to the main-process updater state. */
export function useUpdateState(): UpdateState | null {
  const [state, setState] = useState<UpdateState | null>(null)
  useEffect(() => {
    const load = (): void => {
      api('update:state', undefined).then(setState).catch(() => undefined)
    }
    load()
    const offUpdate = onEvent('update:changed', load)
    const offSettings = onEvent('settings:changed', load)
    return () => {
      offUpdate()
      offSettings()
    }
  }, [])
  return state
}

export function UpdateDialog(): ReactNode {
  const u = useUpdateState()
  const [installing, setInstalling] = useState(false)
  useEffect(() => {
    if (u?.status === 'installing') setInstalling(true)
  }, [u?.status])
  if (!u?.required) return null
  return (
    <div className="mandatory-update" role="alertdialog" aria-modal="true" aria-labelledby="mandatory-update-title" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(2, 6, 23, .68)' }}>
      <div className="card grid" style={{ gap: 12, width: 'min(420px, 90vw)' }}>
        {u.storeBuild ? (
          <>
            <h2 id="mandatory-update-title">Güncelleme gerekli</h2>
            <p>Uygulamayı kullanmaya devam etmek için Microsoft Store’dan güncelleyin.</p>
            <button className="btn primary" onClick={() => api('app:openStoreUpdates', undefined).catch(() => undefined)}>
              <Download size={16} aria-hidden /> Store güncellemelerini aç
            </button>
          </>
        ) : (
          <div className="row" role="status" style={{ gap: 8 }}>
            <RefreshCw size={16} aria-hidden className="spin" />
            <span id="mandatory-update-title">{installing ? 'Güncelleme yükleniyor…' : 'Güncelleniyor…'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
