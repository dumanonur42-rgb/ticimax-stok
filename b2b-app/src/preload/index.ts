import type { Api, AppEvent } from '@shared/api'
import { contextBridge, ipcRenderer } from 'electron'

const EVENTS = new Set<AppEvent>([
  'products:changed',
  'orders:changed',
  'customers:changed',
  'session:changed',
  'settings:changed',
  'splash:leave',
  'sync:changed',
  'update:changed',
  'users:changed',
  'window:shown'
])

const api: Api = {
  invoke: (channel, args) => ipcRenderer.invoke(channel, args),
  on: (channel, cb) => {
    if (!EVENTS.has(channel as AppEvent)) throw new Error(`Bilinmeyen olay: ${channel}`)
    const listener = (): void => cb()
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
