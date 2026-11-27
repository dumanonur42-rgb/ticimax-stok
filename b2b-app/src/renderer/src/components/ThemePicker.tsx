import type { Settings } from '@shared/types'
import { Check, Contrast, Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Modal } from '@/components/ui'
import { useApp } from '@/store/app'

type Theme = Settings['theme']

const KEY_PREFIX = 'yamansa.themeChosen.'

const OPTIONS: { id: Theme; label: string; hint: string; icon: ReactNode }[] = [
  { id: 'system', label: 'Sistem', hint: 'Windows ayarını izler', icon: <Monitor size={20} aria-hidden /> },
  { id: 'light', label: 'Açık', hint: 'Aydınlık ortamlar için', icon: <Sun size={20} aria-hidden /> },
  { id: 'dark', label: 'Koyu', hint: 'Göz yormayan koyu tonlar', icon: <Moon size={20} aria-hidden /> },
  { id: 'contrast', label: 'Yüksek kontrast', hint: 'En güçlü okunabilirlik', icon: <Contrast size={20} aria-hidden /> }
]

/** Shown once per user on first sign-in on this device; the choice applies live and is stored as the device theme. */
export function ThemePicker(): ReactNode {
  const { session, settings, updateSettings, toast } = useApp()
  const userId = session?.user.id
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!userId || !settings) return
    setOpen(localStorage.getItem(KEY_PREFIX + userId) !== '1')
  }, [userId, settings])

  if (!open || !settings || !userId) return null
  const current = settings.theme
  const choose = (theme: Theme): void => {
    updateSettings({ theme }).catch((e) => toast(e.message, 'error'))
  }
  const finish = (): void => {
    localStorage.setItem(KEY_PREFIX + userId, '1')
    setOpen(false)
  }
  return (
    <Modal
      open
      title="Görünümünüzü seçin"
      onClose={finish}
      footer={
        <button className="btn primary" onClick={finish} autoFocus>
          <Check size={16} aria-hidden /> Devam et
        </button>
      }
    >
      <p className="muted" style={{ marginTop: 0 }}>
        Uygulamanın renk temasını seçin; seçiminiz anında uygulanır. İsterseniz daha sonra <strong>Ayarlar → Görünüm &amp; Erişilebilirlik</strong> bölümünden değiştirebilirsiniz.
      </p>
      <div className="theme-grid" role="radiogroup" aria-label="Renk teması">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={current === o.id}
            className={`theme-option${current === o.id ? ' selected' : ''}`}
            data-preview={o.id}
            onClick={() => choose(o.id)}
          >
            <span className="theme-swatch" aria-hidden>
              <span className="theme-swatch-bar" />
              <span className="theme-swatch-body">
                <span className="theme-swatch-line" />
                <span className="theme-swatch-line short" />
              </span>
            </span>
            <span className="theme-option-text">
              <span className="row" style={{ gap: 8 }}>
                {o.icon}
                <strong>{o.label}</strong>
              </span>
              <span className="muted small">{o.hint}</span>
            </span>
            {current === o.id && <Check size={18} className="theme-check" aria-hidden />}
          </button>
        ))}
      </div>
    </Modal>
  )
}
