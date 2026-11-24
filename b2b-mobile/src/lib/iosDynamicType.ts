import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

interface TextSize {
  scale: number
}

const DynamicType = registerPlugin<{
  getCurrent(): Promise<TextSize>
  addListener(event: 'change', listener: (value: TextSize) => void): Promise<PluginListenerHandle>
}>('DynamicType')

export function initializeIOSDynamicType(onChange: () => void): void {
  if (Capacitor.getPlatform() !== 'ios') return
  let revision = 0
  const apply = (value: TextSize): void => {
    if (typeof value?.scale !== 'number' || !Number.isFinite(value.scale)) return
    const scale = Math.max(1, Math.min(1.3, value.scale))
    const root = document.documentElement
    root.style.setProperty('--ios-font-size', `${16 * scale}px`)
    root.dataset.iosTextEnlarged = String(scale > 1)
    requestAnimationFrame(onChange)
  }
  void DynamicType.addListener('change', (value) => {
    revision++
    apply(value)
  }).catch(() => undefined)
  const initialRevision = revision
  void DynamicType.getCurrent().then((value) => {
    if (revision === initialRevision) apply(value)
  }).catch(() => undefined)
}
