import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export interface SystemInsetsValue {
  top: number
  right: number
  bottom: number
  left: number
  ime: number
}

interface SystemInsetsPlugin {
  get(): Promise<SystemInsetsValue>
  setNavigationBarStyle(options: { dark: boolean }): Promise<void>
  addListener(
    eventName: 'change',
    listenerFunc: (insets: SystemInsetsValue) => void
  ): Promise<PluginListenerHandle>
}

export const SystemInsets = registerPlugin<SystemInsetsPlugin>('SystemInsets')
