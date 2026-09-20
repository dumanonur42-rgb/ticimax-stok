import type { SyncStatus } from '@shared/types'
import { CloudDownload } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { api, onEvent } from '@/lib/api'
import { num } from '@/lib/format'

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
    return () => {
      alive = false
      off()
    }
  }, [])
  return status
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
