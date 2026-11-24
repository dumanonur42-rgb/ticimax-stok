import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'

const editableSelector = 'input, textarea, select, [contenteditable="true"]'

export function dismissIOSKeyboard(): void {
  if (Capacitor.getPlatform() !== 'ios') return
  const active = document.activeElement
  if (active instanceof HTMLElement && active.matches(editableSelector)) active.blur()
  void Keyboard.hide().catch(() => undefined)
}

export function installIOSKeyboardDismissal(): void {
  if (Capacitor.getPlatform() !== 'ios') return
  const preservesEditing = (target: EventTarget | null): boolean => target instanceof Element &&
    !!target.closest(`${editableSelector}, label, .quantity-stepper, .search-clear`)
  document.addEventListener('pointerdown', (event) => {
    if (!preservesEditing(event.target)) dismissIOSKeyboard()
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing && event.target instanceof Element &&
      event.target.matches('input[data-dismiss-on-enter]')) {
      event.preventDefault()
      dismissIOSKeyboard()
    }
  })
  let drag: { x: number; y: number } | null = null
  document.addEventListener('touchstart', (event) => {
    const target = event.target
    const touch = event.touches[0]
    drag = touch && target instanceof Element && !target.closest(editableSelector) &&
      target.closest('.page, .catalog-scroll, .sheet-body, .login-screen')
      ? { x: touch.clientX, y: touch.clientY } : null
  }, { passive: true })
  document.addEventListener('touchmove', (event) => {
    const touch = event.touches[0]
    if (drag && touch && Math.hypot(touch.clientX - drag.x, touch.clientY - drag.y) > 8) {
      drag = null
      dismissIOSKeyboard()
    }
  }, { passive: true })
  document.addEventListener('touchend', () => { drag = null }, { passive: true })
  document.addEventListener('touchcancel', () => { drag = null }, { passive: true })
}
