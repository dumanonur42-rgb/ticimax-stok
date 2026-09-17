import { useEffect, useRef, useState, type ReactNode } from 'react'
import logo from '@/assets/logo.png'

const BALLS = 14

/** Yamansa mark: the globe with a ball-bearing ring orbiting it. */
export function GlobeScene({ size = 220, className = '' }: { size?: number; className?: string }): ReactNode {
  const ring = (
    <div className="ring">
      {Array.from({ length: BALLS }, (_, i) => (
        <span key={i} className="ball" style={{ ['--a' as string]: `${(360 / BALLS) * i}deg` }} />
      ))}
    </div>
  )
  return (
    <div className={`globe-scene ${className}`} style={{ ['--size' as string]: `${size}px` }} aria-hidden>
      <div className="ring-clip back">{ring}</div>
      <div className="globe" />
      <div className="ring-clip front">{ring}</div>
    </div>
  )
}

const MIN_SHOW_MS = 2200
const LEAVE_MS = 450

/** Startup splash: shown until `ready` and at least MIN_SHOW_MS have elapsed. */
export function Splash({ ready, onDone }: { ready: boolean; onDone: () => void }): ReactNode {
  const [minElapsed, setMinElapsed] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const reduce = document.documentElement.dataset.motion === 'reduce'

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), reduce ? 300 : MIN_SHOW_MS)
    return () => clearTimeout(t)
  }, [reduce])

  useEffect(() => {
    if (ready && minElapsed) setLeaving(true)
  }, [ready, minElapsed])

  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => done.current(), reduce ? 0 : LEAVE_MS)
    return () => clearTimeout(t)
  }, [leaving, reduce])

  return (
    <div className={`splash${leaving ? ' leaving' : ''}`} role="status" aria-live="polite" aria-label="Yamansa Rulman B2B başlatılıyor">
      <div className="splash-inner">
        <GlobeScene size={240} />
        <img className="splash-word" src={logo} alt="Yamansa Rulman" />
        <div className="splash-sub">B2B Bayi Portalı</div>
        <div className="splash-bar" aria-hidden>
          <i />
        </div>
      </div>
    </div>
  )
}
