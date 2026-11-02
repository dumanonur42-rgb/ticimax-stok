import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App'
import { SystemInsets, type SystemInsetsValue } from './lib/systemInsets'
import './styles.css'

const root = document.documentElement
const SYSTEM_INSETS_BOOTSTRAP_TIMEOUT_MS = 400
root.dataset.platform = Capacitor.getPlatform()

function applyInsets(insets: SystemInsetsValue): void {
  root.style.setProperty('--native-top', `${Math.max(0, insets.top)}px`)
  root.style.setProperty('--native-right', `${Math.max(0, insets.right)}px`)
  root.style.setProperty('--native-bottom', `${Math.max(0, insets.bottom)}px`)
  root.style.setProperty('--native-left', `${Math.max(0, insets.left)}px`)
  root.style.setProperty('--keyboard', `${Math.max(0, insets.ime)}px`)
  root.dataset.keyboardOpen = String(insets.ime > 0)
}

function scrollFocusedField(): void {
  const activeElement = document.activeElement
  if (!(activeElement instanceof HTMLElement)) return
  if (!activeElement.matches('input, textarea, select, [contenteditable="true"]')) return
  const loginScreen = activeElement.closest<HTMLElement>('.login-screen')
  if (loginScreen) {
    requestAnimationFrame(() => {
      const keyboard = Number.parseFloat(getComputedStyle(root).getPropertyValue('--keyboard')) || 0
      const safeTop = Number.parseFloat(getComputedStyle(root).getPropertyValue('--safe-top')) || 0
      const visibleTop = loginScreen.getBoundingClientRect().top + safeTop + 12
      const viewportBottom = (window.visualViewport?.offsetTop ?? 0) + (window.visualViewport?.height ?? window.innerHeight)
      const keyboardTop = keyboard > 0 ? window.innerHeight - keyboard : window.innerHeight
      const visibleBottom = Math.min(viewportBottom, keyboardTop) - 16
      const field = activeElement.getBoundingClientRect()
      const submit = loginScreen.querySelector<HTMLButtonElement>('button[type="submit"]')?.getBoundingClientRect()
      const targetTop = Math.min(field.top, submit?.top ?? field.top)
      const targetBottom = Math.max(field.bottom, submit?.bottom ?? field.bottom)
      if (targetTop >= visibleTop && targetBottom <= visibleBottom) return
      const needed = Math.max(0, targetBottom - visibleBottom)
      const available = Math.max(0, targetTop - visibleTop)
      const amount = targetTop < visibleTop ? targetTop - visibleTop : Math.min(needed, available)
      if (amount) loginScreen.scrollBy({ top: amount, behavior: 'auto' })
    })
    return
  }
  requestAnimationFrame(() => activeElement.scrollIntoView({
    block: 'center',
    inline: 'nearest',
    behavior: 'smooth'
  }))
}

async function initializeSystemInsets(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return

  root.style.setProperty('--status-bar-color', '#0b2a5b')
  const preference = localStorage.getItem('yamansa.theme')
  const dark = preference === 'dark' || (
    preference !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  await SystemInsets.setNavigationBarStyle({ dark })
  applyInsets(await SystemInsets.get())
  await SystemInsets.addListener('change', (insets) => {
    applyInsets(insets)
    if (insets.ime > 0) scrollFocusedField()
  })
  document.addEventListener('focusin', () => {
    if (root.dataset.keyboardOpen === 'true') scrollFocusedField()
  })
}

async function bootstrap(): Promise<void> {
  const initialization = initializeSystemInsets().catch(() => {
    root.dataset.keyboardOpen = 'false'
  })
  let timeoutId: number | undefined
  try {
    await Promise.race([
      initialization,
      new Promise<void>((resolve) => {
        timeoutId = window.setTimeout(resolve, SYSTEM_INSETS_BOOTSTRAP_TIMEOUT_MS)
      })
    ])
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

void bootstrap()
