import { brandOrigin } from '@shared/identity'
import { brandLogo } from '../lib/brandLogos'

/** A brand as its logo (or its name on a plate), with origin and condition beside it. */
export function BrandMark({ brand, empty = '', originPrefix = '' }: { brand: string; empty?: string; originPrefix?: string }) {
  const { base, origin, condition } = brandOrigin(brand)
  const logo = brandLogo(base)
  if (!base) return empty ? <span className="brand-mark"><span className="brand-none">{empty}</span></span> : null
  return <span className="brand-mark">
    {logo
      ? <>
        <span className={`brand-plate${logo.flag ? ' flag' : ''}`}>
          <img src={logo.src} style={logo.size} alt={logo.named ? base : ''} decoding="async" draggable={false} />
          {logo.emblem && <b>{base}</b>}
        </span>
        {!logo.named && !logo.emblem && <span className="brand-rest">{base}</span>}
      </>
      : <span className={`brand-plate text${base.length > 6 ? ' long' : ''}`}><span>{base}</span></span>}
    {origin && originPrefix && <span className="brand-rest origin">{originPrefix}{origin}</span>}
    {condition && <span className="brand-cond">{condition}</span>}
  </span>
}
