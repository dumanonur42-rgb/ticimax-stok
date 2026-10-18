import type { SyncStatus } from '@shared/types'
import { CloudAlert, CloudOff, CloudUpload } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
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
  const state = offline ? 'offline' : s.pending ? 'pending' : s.failed ? 'failed' : 'online'
  if (state === 'online') return <span className="conn-pill-slot" aria-hidden="true" />
  const label = state === 'offline' ? 'Çevrimdışı' : state === 'pending' ? 'Gönderiliyor' : 'Gönderilemedi'
  const detail = s.pending ? ` · ${num(s.pending)} kayıt bekliyor` : s.failed ? ` · ${num(s.failed)} kayıt gönderilemedi` : ''
  const title =
    state === 'offline'
      ? `Sunucuya ulaşılamıyor${s.pending ? `; ${num(s.pending)} kayıt bu bilgisayarda bekliyor, bağlantı gelince bir kez gönderilecek` : ''}. Yeniden denemek için tıklayın.`
      : state === 'pending'
        ? `${num(s.pending)} kayıt sunucuya gönderiliyor.`
      : `${num(s.failed)} kayıt sunucu tarafından kabul edilmedi. Ayrıntı ve kaldırma için tıklayın.`
  const retry = async (): Promise<void> => {
    if (!navigator.onLine) {
      toast('Hâlâ bağlantı yok.', 'error')
      return
    }
    setBusy(true)
    try {
      const r = await api('app:flushOutbox', undefined)
      if (!r.online) {
        toast('Hâlâ bağlantı yok.', 'error')
        return
      }
      else if (r.failed && session?.user.role === 'admin') {
        const ok = window.confirm(
          `${num(r.failed)} kayıt sunucu tarafından kabul edilmedi (örn. başka bir bilgisayarda değişen/silinen ürün). Bu kayıtlar kuyruktan kaldırılsın mı? Ürün listesi sunucudaki haliyle güncellenir.`
        )
        if (ok) {
          const n = await api('app:discardFailedOps', undefined)
          toast(`${num(n)} bekleyen kayıt kaldırıldı.`, 'info')
        }
      }
    } catch (e) {
      console.warn('Bağlantı denetimi başarısız.', e)
    } finally {
      setBusy(false)
    }
  }
  const Icon = state === 'offline' ? CloudOff : state === 'pending' ? CloudUpload : CloudAlert
  return (
    <button
      type="button"
      className={`conn-pill ${state}`}
      title={title}
      aria-label={`${label}${detail}. ${title}`}
      onClick={retry}
      disabled={busy}
    >
      <Icon size={14} aria-hidden className={state === 'pending' ? 'spin' : undefined} />
      <span>
        {label}
        {detail}
      </span>
    </button>
  )
}
