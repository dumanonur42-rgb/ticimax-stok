import { normalize } from '@shared/identity'
import type { ReactNode } from 'react'

type BoxStatus = 'kutulu' | 'kutusuz'

interface BoxPart {
  count: string
  status: BoxStatus
}

function parseParts(value: string): BoxPart[] | null {
  const normalized = normalize(value)
  const pattern = /(\d*)(KUTUSUZ|KUTULU)/g
  const matches = [...normalized.matchAll(pattern)]
  if (matches.length === 0 || normalized.replace(pattern, '')) return null
  return matches.map((match) => ({
    count: match[1],
    status: match[2] === 'KUTUSUZ' ? 'kutusuz' : 'kutulu'
  }))
}

export function BoxBadge({ box, compact = false }: { box: string; compact?: boolean }): ReactNode {
  const value = box.trim()
  if (!value) return null

  const parts = parseParts(value)
  if (parts) {
    return (
      <span className={`box-badge-group${compact ? ' compact' : ''}`}>
        {parts.map(({ count, status }, index) => (
          <span className={`box-badge ${status}${compact ? ' compact' : ''}`} key={`${status}-${count}-${index}`} title={value}>
            <span className="box-badge-dot" aria-hidden="true" />
            <span>{count ? `${count} ` : ''}{status === 'kutulu' ? 'Kutulu' : 'Kutusuz'}</span>
          </span>
        ))}
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
