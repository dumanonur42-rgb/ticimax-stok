import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

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
      <GlobeScene size={320} />
    </div>
  )
}
