import type { ReactNode } from 'react'
import { num, stockLevel } from '@/lib/format'

interface Props {
  stock: number
  threshold: number
  unit?: string
}

/** Stock quantity as a compact pill: level dot, tabular number, small unit — same width in every row so columns line up. */
export function StockPill({ stock, threshold, unit }: Props): ReactNode {
  const lvl = stockLevel(stock, threshold)
  const out = lvl.cls === 'out'
  return (
    <span className={`stock-pill ${lvl.cls}`} title={lvl.label} aria-label={lvl.label}>
      <span className="stock-pill-dot" aria-hidden="true" />
      {out ? (
        <span className="stock-pill-text">Yok</span>
      ) : (
        <>
          <span className="stock-pill-num">{num(stock)}</span>
          <span className="stock-pill-unit">{unit || 'adet'}</span>
          {lvl.cls === 'low' && <span className="stock-pill-flag">az</span>}
        </>
      )}
    </span>
  )
}
