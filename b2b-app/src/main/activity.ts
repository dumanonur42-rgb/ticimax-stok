import type { ActivityEvent } from '@shared/types'
import { app } from 'electron'
import { cloud } from './cloud/client'
import type { ActivityLogInsert } from './cloud/database.types'

type Queued = { owner: string; row: ActivityLogInsert }

const queue: Queued[] = []
let activeUser: string | null = null
let flushing: Promise<void> | null = null
let quittingAfterFlush = false

export function setActivitySession(userId: string | null): void {
  activeUser = userId
}

export function logActivity(event: ActivityEvent): void {
  if (!activeUser) return
  const row: ActivityLogInsert = {
    platform: 'windows',
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

export async function flushActivity(): Promise<void> {
  const owner = activeUser
  if (!owner) return
  if (flushing) return flushing
  const drain = async (): Promise<void> => {
    while (activeUser === owner) {
      const batch = queue.filter((item) => item.owner === owner).slice(0, 20)
      if (!batch.length) return
      try {
        const { error } = await cloud().from('activity_log').insert(batch.map((item) => item.row), { defaultToNull: false })
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

const timer = setInterval(() => void flushActivity(), 10_000)
timer.unref()
app.on('before-quit', (event) => {
  if (quittingAfterFlush) return
  event.preventDefault()
  quittingAfterFlush = true
  void flushActivity().finally(() => app.quit())
})
