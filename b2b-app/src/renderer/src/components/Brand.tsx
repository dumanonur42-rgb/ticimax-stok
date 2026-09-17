import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { onEvent } from '@/lib/api'

const SEGMENTS = 32

/**
 * Yamansa mark: the globe with a real 3D ball-bearing ring spinning around it.
 * The ring is built from SEGMENTS plates placed around the Y axis (outer race
 * with a ball on each plate, plus a darker inner race and top/bottom rims), so
 * spinning it rotates the balls around the globe like the logo.
 */
export function GlobeScene({ size = 220, className = '' }: { size?: number; className?: string }): ReactNode {
  const r = size * 0.48 // outer radius
  const t = size * 0.055 // radial thickness of the race
  const h = size * 0.15 // ring height
  const w = (2 * Math.PI * r) / SEGMENTS + 1.5
  const wi = (2 * Math.PI * (r - t)) / SEGMENTS + 1.5
  const vars = { ['--size' as string]: `${size}px`, ['--h' as string]: `${h}px`, ['--r' as string]: `${r}px`, ['--ri' as string]: `${r - t}px` } as CSSProperties
  return (
    <div className={`globe-scene ${className}`} style={vars} aria-hidden>
      <div className="tilt">
        <div className="globe" />
        <div className="ring">
          {Array.from({ length: SEGMENTS }, (_, i) => {
            const a = (360 / SEGMENTS) * i
            return (
              <div key={i}>
                <span className="race outer" style={{ width: w, transform: `rotateY(${a}deg) translateZ(${r}px)` }}>
                  <i className="ball" />
                </span>
                <span className="race inner" style={{ width: wi, transform: `rotateY(${a}deg) translateZ(${r - t}px) rotateY(180deg)` }} />
              </div>
            )
          })}
          <span className="rim top" />
          <span className="rim bottom" />
        </div>
      </div>
    </div>
  )
}

/** Content of the frameless transparent startup window; the main process tells it when to fade out. */
export function SplashWindow(): ReactNode {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => onEvent('splash:leave', () => setLeaving(true)), [])
  return (
    <div className={`splash${leaving ? ' leaving' : ''}`} role="status" aria-live="polite" aria-label="Yamansa Rulman B2B başlatılıyor">
      <GlobeScene size={320} />
    </div>
  )
}
