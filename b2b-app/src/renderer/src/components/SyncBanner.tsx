import type { SyncStatus } from '@shared/types'
import { CloudAlert, CloudOff, CloudUpload } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Confirm } from '@/components/ui'
import { api, onEvent } from '@/lib/api'
import { num } from '@/lib/format'
import { useApp } from '@/store/app'

export function useSyncStatus(): SyncStatus | null {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  useEffect(() => {
    let alive = true
    const load = (): void => {
      api('app:syncStatus', undefined)
        .then((s) => alive && setStatus(s))
        .catch((error) => console.warn('Eşitleme durumu alınamadı.', error))
    }
    load()
    const off = onEvent('sync:changed', load)
    // The OS tells the renderer when a network comes back; nudge the queue instead of waiting for the next poll.
    const wake = (): void => {
      api('app:flushOutbox', undefined)
        .then((s) => alive && setStatus(s))
        .catch((error) => console.warn('Bekleyen kayıtlar gönderilemedi.', error))
    }
    window.addEventListener('online', wake)
    return () => {
      alive = false
      off()
      window.removeEventListener('online', wake)
    }
  }, [])
  return status
}

/** Always-visible connection pill: online / offline, plus how many saves are waiting to reach the cloud. */
export function ConnectionPill(): ReactNode {
  const s = useSyncStatus()
  const session = useApp((a) => a.session)
  const toast = useApp((a) => a.toast)
  const [busy, setBusy] = useState(false)
  const [discardPrompt, setDiscardPrompt] = useState<number | null>(null)
  const [failedCount, setFailedCount] = useState(0)
  const retryButton = useRef<HTMLButtonElement | null>(null)
  const [browserOnline, setBrowserOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const online = (): void => setBrowserOnline(true)
    const offline = (): void => setBrowserOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])
  if (!s) return <span className="conn-pill-slot" aria-hidden="true" />
  const offline = !browserOnline || (s.checked === true && !s.online)
  const state = offline ? 'offline' : s.pending ? 'pending' : s.failed || failedCount ? 'failed' : 'online'
  const detail = s.pending ? ` · ${num(s.pending)} kayıt bekliyor` : s.failed || failedCount ? ` · ${num(s.failed || failedCount)} kayıt gönderilemedi` : ''
  const retry = async (): Promise<void> => {
    if (!navigator.onLine) {
      toast('Hâlâ bağlantı yok.', 'error')
      return
    }
    setBusy(true)
    try {
      const r = await api('app:flushOutbox', undefined)
      setFailedCount(r.failed)
      if (!r.online) {
        toast('Hâlâ bağlantı yok.', 'error')
        return
      }
      else if (r.failed && session?.user.role === 'admin') {
        setDiscardPrompt(r.failed)
      }
    } catch (e) {
      console.warn('Bağlantı denetimi başarısız.', e)
    } finally {
      setBusy(false)
    }
  }
  const cancelDiscard = (): void => {
    setDiscardPrompt(null)
    requestAnimationFrame(() => retryButton.current?.focus())
  }
  const discardFailed = async (): Promise<void> => {
    setDiscardPrompt(null)
    setBusy(true)
    try {
      const n = await api('app:discardFailedOps', undefined)
      setFailedCount(0)
      toast(`${num(n)} bekleyen kayıt kaldırıldı.`, 'info')
    } catch (e) {
      console.warn('Bekleyen kayıtlar kaldırılamadı.', e)
    } finally {
      setBusy(false)
    }
  }
  const Icon = state === 'offline' ? CloudOff : state === 'pending' ? CloudUpload : CloudAlert
  const visibleState = state === 'online' && discardPrompt !== null ? 'failed' : state
  const showPill = visibleState !== 'online'
  const visibleLabel = visibleState === 'offline' ? 'Çevrimdışı' : visibleState === 'pending' ? 'Gönderiliyor' : 'Gönderilemedi'
  const visibleTitle =
    visibleState === 'offline'
      ? `Sunucuya ulaşılamıyor${s.pending ? `; ${num(s.pending)} kayıt bu bilgisayarda bekliyor, bağlantı gelince bir kez gönderilecek` : ''}. Yeniden denemek için tıklayın.`
      : visibleState === 'pending'
        ? `${num(s.pending)} kayıt sunucuya gönderiliyor.`
      : `${num(s.failed || failedCount)} kayıt sunucu tarafından kabul edilmedi. Ayrıntı ve kaldırma için tıklayın.`
  return (
    <>
      {showPill ? (
        <button
          ref={retryButton}
          type="button"
          className={`conn-pill ${visibleState}`}
          title={visibleTitle}
          aria-label={`${visibleLabel}${detail}. ${visibleTitle}`}
          onClick={() => void retry()}
          disabled={busy}
        >
          <Icon size={14} aria-hidden className={visibleState === 'pending' ? 'spin' : undefined} />
          <span>
            {visibleLabel}
            {detail}
          </span>
        </button>
      ) : <span className="conn-pill-slot" aria-hidden="true" />}
      <Confirm
        open={discardPrompt !== null}
        title="Başarısız kayıtları kaldır?"
        text={`${num(discardPrompt ?? 0)} kayıt sunucu tarafından kabul edilmedi (örn. başka bir bilgisayarda değişen/silinen ürün). Bu kayıtlar kuyruktan kaldırılsın mı? Ürün listesi sunucudaki haliyle güncellenir.`}
        danger
        confirmLabel="Kuyruktan kaldır"
        onCancel={cancelDiscard}
        onConfirm={() => void discardFailed()}
      />
    </>
  )
}
