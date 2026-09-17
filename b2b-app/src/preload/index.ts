import type { Api } from '@shared/api'
import { contextBridge, ipcRenderer } from 'electron'

const EVENTS = new Set(['products:changed', 'orders:changed', 'session:changed'])

const api: Api = {
  invoke: (channel, args) => ipcRenderer.invoke(channel, args),
  on: (channel, cb) => {
    if (!EVENTS.has(channel)) throw new Error(`Bilinmeyen olay: ${channel}`)
    const listener = (): void => cb()
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
