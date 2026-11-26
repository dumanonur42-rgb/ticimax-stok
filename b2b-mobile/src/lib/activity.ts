import { Capacitor } from '@capacitor/core'
import type { ActivityEvent, ActivityPlatform } from '@shared/types'
import type { ActivityLogInsert } from '@desktopDatabase'
import { supabase } from './cloud'

type Queued = { owner: string; row: ActivityLogInsert }

const queue: Queued[] = []
let activeUser: string | null = null
let flushing: Promise<void> | null = null
let searchTimer: number | null = null
let lastSearchKey: string | null = null
const lastProductViews = new Map<string, number>()

function platform(): ActivityPlatform {
  const value = Capacitor.getPlatform()
  return value === 'android' || value === 'ios' ? value : 'web'
}

export function setActivitySession(userId: string | null): void {
  if (activeUser !== userId) lastProductViews.clear()
  activeUser = userId
  cancelActivitySearch()
  lastSearchKey = null
}

export function logActivity(event: ActivityEvent): void {
  if (!activeUser) return
  const now = Date.now()
  if (event.kind === 'search' && event.query !== undefined) {
    const key = event.query.toLocaleLowerCase('tr-TR').replace(/[\s.\-\/_]+/g, '')
    if (lastSearchKey === key) return
    lastSearchKey = key
  }
  if (event.kind === 'product_view') {
    for (const [key, at] of lastProductViews) if (now - at >= 60_000) lastProductViews.delete(key)
    const key = event.product_id != null ? `id:${event.product_id}` : `sku:${event.sku ?? ''}|brand:${event.brand ?? ''}`
    const lastViewedAt = lastProductViews.get(key)
    if (lastViewedAt !== undefined && now - lastViewedAt < 60_000) return
    lastProductViews.set(key, now)
  }
  const row: ActivityLogInsert = {
    at: new Date().toISOString(),
    platform: platform(),
    kind: event.kind,
    ...(event.product_id !== undefined ? { product_id: event.product_id } : {}),
    ...(event.sku !== undefined ? { sku: event.sku.slice(0, 160) } : {}),
    ...(event.brand !== undefined ? { brand: event.brand.slice(0, 160) } : {}),
    ...(event.query !== undefined ? { query: event.query.slice(0, 300) } : {}),
    ...(event.qty !== undefined ? { qty: event.qty } : {}),
    ...(event.order_id !== undefined ? { order_id: event.order_id } : {}),
    ...(event.detail !== undefined ? { detail: event.detail } : {})
  }
  queue.push({ owner: activeUser, row })
  if (queue.length > 500) queue.splice(0, queue.length - 500)
  if (queue.filter((item) => item.owner === activeUser).length >= 20) void flushActivity()
}

export function scheduleActivitySearch(query: string): void {
  cancelActivitySearch()
  const owner = activeUser
  const trimmed = query.trim()
  if (!owner || trimmed.length < 2) return
  searchTimer = window.setTimeout(() => {
    searchTimer = null
    if (activeUser !== owner) return
    logActivity({ kind: 'search', query: trimmed })
  }, 1500)
}

export function cancelActivitySearch(): void {
  if (searchTimer !== null) window.clearTimeout(searchTimer)
  searchTimer = null
}

export async function flushActivity(): Promise<void> {
  const owner = activeUser
  if (!owner) return
  if (flushing) return flushing
  const drain = async (): Promise<void> => {
    while (activeUser === owner) {
      const batch = queue.filter((item) => item.owner === owner).slice(0, 20)
      if (!batch.length) return
      try {
        const { error } = await supabase.from('activity_log').insert(
          batch.map((item) => item.row),
          { defaultToNull: false }
        )
        if (error) throw error
        const sent = new Set(batch)
        for (let i = queue.length - 1; i >= 0; i--) if (sent.has(queue[i])) queue.splice(i, 1)
      } catch (error) {
        console.warn('Activity log upload failed.', error)
        return
      }
    }
  }
  const current = drain()
  flushing = current.finally(() => {
    flushing = null
  })
  return flushing
}

window.setInterval(() => void flushActivity(), 10_000)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void flushActivity()
})
window.addEventListener('pagehide', () => void flushActivity())
