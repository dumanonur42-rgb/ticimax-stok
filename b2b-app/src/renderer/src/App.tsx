import { useEffect, useState, type ReactNode } from 'react'
import { Splash } from '@/components/Brand'
import { Shell } from '@/components/Shell'
import { Toasts } from '@/components/ui'
import { api, onEvent } from '@/lib/api'
import { Cart } from '@/pages/Cart'
import { Catalog } from '@/pages/Catalog'
import { Customers } from '@/pages/Customers'
import { Dashboard } from '@/pages/Dashboard'
import { Help } from '@/pages/Help'
import { Import } from '@/pages/Import'
import { Login } from '@/pages/Login'
import { Orders } from '@/pages/Orders'
import { SettingsPage } from '@/pages/Settings'
import { useApp } from '@/store/app'

function useApplySettings(): void {
  const settings = useApp((s) => s.settings)
  useEffect(() => {
    if (!settings) return
    const root = document.documentElement
    const dark = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (): void => {
      const theme = settings.theme === 'system' ? (dark.matches ? 'dark' : 'light') : settings.theme
      root.dataset.theme = theme
    }
    apply()
    dark.addEventListener('change', apply)
    root.dataset.density = settings.density
    root.dataset.motion = settings.reduce_motion ? 'reduce' : 'auto'
    root.style.fontSize = `${Math.round(settings.font_scale * 100)}%`
    return () => dark.removeEventListener('change', apply)
  }, [settings])
}

function useFontShortcuts(): void {
  const { settings, updateSettings } = useApp()
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey) || !settings) return
      const cur = settings.font_scale
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        updateSettings({ font_scale: Math.min(1.5, Math.round((cur + 0.1) * 100) / 100) })
      } else if (e.key === '-') {
        e.preventDefault()
        updateSettings({ font_scale: Math.max(0.85, Math.round((cur - 0.1) * 100) / 100) })
      } else if (e.key === '0') {
        e.preventDefault()
        updateSettings({ font_scale: 1 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settings, updateSettings])
}

const PAGES: Record<ReturnType<typeof useApp.getState>['page'], () => ReactNode> = {
  dashboard: Dashboard,
  catalog: Catalog,
  cart: Cart,
  orders: Orders,
  customers: Customers,
  import: Import,
  settings: SettingsPage,
  help: Help
}

export function App(): ReactNode {
  const { session, setSession, loadSettings, page } = useApp()
  const [ready, setReady] = useState(false)
  const [splash, setSplash] = useState(true)
  useApplySettings()
  useFontShortcuts()

  useEffect(() => {
    Promise.all([api('auth:session', undefined).then(setSession), loadSettings()])
      .catch(() => undefined)
      .finally(() => setReady(true))
    return onEvent('session:changed', () => {
      api('auth:session', undefined).then(setSession).catch(() => setSession(null))
    })
  }, [])

  const overlay = splash ? <Splash ready={ready} onDone={() => setSplash(false)} /> : null

  if (!ready) return overlay

  if (!session)
    return (
      <>
        <Login />
        <Toasts />
        {overlay}
      </>
    )

  const Page = PAGES[page]
  return (
    <>
      <Shell>
        <Page />
      </Shell>
      <Toasts />
      {overlay}
    </>
  )
}
