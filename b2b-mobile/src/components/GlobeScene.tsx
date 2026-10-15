import type { CSSProperties, ReactNode } from 'react'
import globeImage from '../assets/globe.png'

const SEGMENTS = 36
const BALLS = 18

export function GlobeScene({ size = 220, className = '' }: { size?: number; className?: string }): ReactNode {
  const r = size * 0.5
  const h = size * 0.1
  const d = size * 0.07
  const tro = size * 0.032
  const tri = size * 0.046
  const gap = d * 1.75
  const ri = r - tro - gap - tri
  const rm = r - tro - gap / 2
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
      <div className="globe" style={{ backgroundImage: `url("${globeImage}")` }} />
      {bearing}
    </div>
  )
}
