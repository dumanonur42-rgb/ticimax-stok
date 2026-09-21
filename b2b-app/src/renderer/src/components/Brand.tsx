import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { onEvent } from '@/lib/api'

const SEGMENTS = 36
const BALLS = 18

/**
 * Yamansa mark: the globe with a 3D deep-groove ball bearing spinning around it.
 * The bearing is built in CSS 3D (race walls as plates around the Y axis, annulus
 * discs for the faces, billboard balls in the groove). It is rendered twice with
 * complementary screen-space clips along the ring's major axis: the half behind
 * the globe is drawn under it and the half in front over it, so the globe never
 * intersects the races. Each ball counter-spins so its shading faces the viewer.
 */
export function GlobeScene({ size = 220, className = '' }: { size?: number; className?: string }): ReactNode {
  const r = size * 0.5 // outer radius
  const h = size * 0.075 // ring height (axial)
  const d = size * 0.078 // ball diameter
  const tro = size * 0.032 // outer race radial thickness (top lip)
  const tri = size * 0.046 // inner race radial thickness
  const gap = d * 1.12 // groove width
  const ri = r - tro - gap - tri // bore radius
  const rm = r - tro - gap / 2 // ball pitch radius
  const width = (radius: number): number => (2 * Math.PI * radius) / SEGMENTS + 1.2
  const vars = {
    ['--size' as string]: `${size}px`,
    ['--h' as string]: `${h}px`,
    ['--d' as string]: `${d}px`,
    ['--r' as string]: `${r}px`,
    ['--ri' as string]: `${ri}px`,
    ['--tro' as string]: `${tro}px`,
    ['--tri' as string]: `${tri}px`
  } as CSSProperties
  const bearing = (
    <div className="tilt">
      <div className="ring">
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const a = (360 / SEGMENTS) * i
          return (
            <div key={i}>
              <span className="race outer" style={{ width: width(r), transform: `rotateY(${a}deg) translateZ(${r}px)` }} />
              <span className="race groove" style={{ width: width(r - tro), transform: `rotateY(${a}deg) translateZ(${r - tro}px) rotateY(180deg)` }} />
              <span className="race groove" style={{ width: width(ri + tri), transform: `rotateY(${a}deg) translateZ(${ri + tri}px)` }} />
              <span className="race inner" style={{ width: width(ri), transform: `rotateY(${a}deg) translateZ(${ri}px) rotateY(180deg)` }} />
            </div>
          )
        })}
        <span className="rim bottom" />
        {Array.from({ length: BALLS }, (_, i) => {
          const a = (360 / BALLS) * i
          return (
            <span key={i} className="ball-pos" style={{ transform: `rotateY(${a}deg) translateZ(${rm}px) rotateY(${-a}deg)` }}>
              <i className="ball" />
            </span>
          )
        })}
        <span className="rim top" />
      </div>
    </div>
  )
  return (
    <div className={`globe-scene ${className}`} style={vars} aria-hidden>
      <div className="layer back">{bearing}</div>
      <div className="globe" />
      <div className="layer front">{bearing}</div>
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
