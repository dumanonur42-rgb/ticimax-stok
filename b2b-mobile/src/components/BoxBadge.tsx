import { boxParts } from '@shared/identity'
import type { ReactNode } from 'react'

export function BoxBadge({ box, compact = false }: { box: string; compact?: boolean }): ReactNode {
  const value = box.trim()
  if (!value) return null

  const parts = boxParts(value)
  if (parts) {
    return (
      <span className={`box-badge-group${compact ? ' compact' : ''}`}>
        {parts.map(({ count, state }, index) => {
          const status = state === 'Kutulu' ? 'kutulu' : state === 'Kutusuz' ? 'kutusuz' : 'neutral'
          return <span className={`box-badge ${status}${compact ? ' compact' : ''}`} key={`${state}-${count}-${index}`} title={value}>
            <span className="box-badge-dot" aria-hidden="true" />
            <span>{count === null ? '' : `${count} `}{state}</span>
          </span>
        })}
      </span>
    )
  }

  return (
    <span className={`box-badge neutral${compact ? ' compact' : ''}`} title={value} aria-label={value}>
      <span className="box-badge-dot" aria-hidden="true" />
      <span className="box-badge-text">{value}</span>
    </span>
  )
}
