import { useEffect, useState, type ReactNode } from 'react'
import { Shell } from '@/components/Shell'
import { ThemePicker } from '@/components/ThemePicker'
import { Toasts } from '@/components/ui'
import { UpdateDialog } from '@/components/UpdateDialog'
import { api, onEvent } from '@/lib/api'
import { Cart } from '@/pages/Cart'
import { ActivityLogs } from '@/pages/ActivityLogs'
import { Catalog } from '@/pages/Catalog'
import { Customers } from '@/pages/Customers'
import { Dashboard } from '@/pages/Dashboard'
import { Help } from '@/pages/Help'
import { Import } from '@/pages/Import'
import { Login } from '@/pages/Login'
import { Orders } from '@/pages/Orders'
import { SettingsPage } from '@/pages/Settings'
import { Stock } from '@/pages/Stock'
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
      root.lang = 'tr'
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
  stock: Stock,
  customers: Customers,
  import: Import,
  settings: SettingsPage,
  help: Help,
  activity: ActivityLogs
}

export function App(): ReactNode {
  const { session, setSession, loadSettings, page, go } = useApp()
  const [ready, setReady] = useState(false)
  const [sessionNotice, setSessionNotice] = useState('')
  useApplySettings()
  useFontShortcuts()

  useEffect(() => {
    if (session?.user.role !== 'admin' && ['import', 'customers', 'stock', 'activity'].includes(page)) go('dashboard')
  }, [session?.user.role, page, go])

  useEffect(() => {
    const refreshSession = async (): Promise<void> => {
      const result = await api('auth:session', undefined)
      setSession(result.session)
      setSessionNotice(result.notice ?? '')
    }
    Promise.all([refreshSession(), loadSettings()])
      .catch(() => undefined)
      .finally(() => setReady(true))
    const offSession = onEvent('session:changed', () => {
      refreshSession().catch(() => {
        setSession(null)
        setSessionNotice('')
      })
    })
    // Shared settings changed by an admin on another computer.
    const offSettings = onEvent('settings:changed', () => {
      loadSettings().catch(() => undefined)
    })
    // Focus given while the window was still hidden behind the splash does not reach the keyboard; redo it once visible.
    const offShown = onEvent('window:shown', () => {
      const active = document.activeElement
      const target =
        active instanceof HTMLElement && active !== document.body
          ? active
          : ['[autofocus]', 'input[type="search"]', 'input', 'main [tabindex="0"]']
              .map((sel) => document.querySelector<HTMLElement>(sel))
              .find((el) => el != null)
      if (!target) return
      target.blur()
      target.focus({ preventScroll: true })
    })
    return () => {
      offSession()
      offSettings()
      offShown()
    }
  }, [])

  if (!ready) return null

  if (!session)
    return (
      <>
        <Login sessionNotice={sessionNotice} />
        <UpdateDialog />
        <Toasts />
      </>
    )

  const role = session.user.role
  const allowed = role === 'admin' || (page !== 'import' && page !== 'customers' && page !== 'stock' && page !== 'activity')
  const Page = PAGES[allowed ? page : 'dashboard']
  return (
    <>
      <Shell>
        <Page />
      </Shell>
      <ThemePicker />
      <UpdateDialog />
      <Toasts />
    </>
  )
}
