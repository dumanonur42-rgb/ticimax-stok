import type { SyncStatus } from '@shared/types'
import { CloudAlert, CloudDownload, CloudOff, CloudUpload, Wifi } from 'lucide-react'
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
        .catch(() => undefined)
    }
    load()
    const off = onEvent('sync:changed', load)
    // The OS tells the renderer when a network comes back; nudge the queue instead of waiting for the next poll.
    const wake = (): void => {
      api('app:flushOutbox', undefined)
        .then((s) => alive && setStatus(s))
        .catch(() => undefined)
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
  if (!s) return null
  const state = !s.online ? 'offline' : s.pending ? 'pending' : s.failed ? 'failed' : 'online'
  const label = state === 'offline' ? 'Çevrimdışı' : state === 'pending' ? 'Gönderiliyor' : 'Çevrimiçi'
  const detail = s.pending ? ` · ${num(s.pending)} kayıt bekliyor` : s.failed ? ` · ${num(s.failed)} kayıt gönderilemedi` : ''
  const title =
    state === 'offline'
      ? `Sunucuya ulaşılamıyor${s.pending ? `; ${num(s.pending)} kayıt bu bilgisayarda bekliyor, bağlantı gelince bir kez gönderilecek` : ''}. Yeniden denemek için tıklayın.`
      : state === 'pending'
        ? `${num(s.pending)} kayıt sunucuya gönderiliyor.`
        : state === 'failed'
          ? `${num(s.failed)} kayıt sunucu tarafından kabul edilmedi. Ayrıntı ve kaldırma için tıklayın.`
          : 'Sunucuya bağlı; değişiklikler anında paylaşılıyor. Bağlantıyı denetlemek için tıklayın.'
  const retry = async (): Promise<void> => {
    setBusy(true)
    try {
      const r = await api('app:flushOutbox', undefined)
      if (!r.online) toast(r.message ?? 'Sunucuya ulaşılamıyor.', 'error')
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
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }
  const Icon = state === 'offline' ? CloudOff : state === 'pending' ? CloudUpload : state === 'failed' ? CloudAlert : Wifi
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

/** Topbar progress while the product mirror is being pulled from the cloud (first run / full refresh). */
export function SyncBanner(): ReactNode {
  const s = useSyncStatus()
  const p = s?.progress
  if (!p) return null
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0
  return (
    <div className="update-banner sync-banner" role="status" aria-live="polite">
      <CloudDownload size={16} aria-hidden />
      <span>
        Ürün listesi indiriliyor… <b>{num(p.done)}</b> / {num(p.total)}
      </span>
      <progress className="sync-progress" max={100} value={pct} aria-label={`Ürün listesi indiriliyor, yüzde ${pct}`} />
    </div>
  )
}
