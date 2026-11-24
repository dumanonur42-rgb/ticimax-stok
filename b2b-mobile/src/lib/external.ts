import { AppLauncher } from '@capacitor/app-launcher'
import { Capacitor } from '@capacitor/core'

export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const result = await AppLauncher.openUrl({ url })
    if (!result.completed) throw new Error('Bağlantı açılamadı.')
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
