type Site = 'yamansarulman' | 'rulmansitesi' | 'teknikkesici'
type Kind = 'visit' | 'search' | 'product_view' | 'cart_add' | 'order'
type Device = '' | 'mobile' | 'tablet' | 'desktop'
type EventInput = { k: unknown; t: unknown; s?: unknown; n?: unknown; p?: unknown; q?: unknown; c?: unknown; x?: unknown }
type DenoRuntime = { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Response | Promise<Response>): void }

const runtime = (globalThis as unknown as { Deno: DenoRuntime }).Deno
const hosts: Record<string, Site> = {
  'yamansarulman.com': 'yamansarulman', 'www.yamansarulman.com': 'yamansarulman',
  'rulmansitesi.com': 'rulmansitesi', 'www.rulmansitesi.com': 'rulmansitesi',
  'teknikkesici.com.tr': 'teknikkesici', 'www.teknikkesici.com.tr': 'teknikkesici'
}
const kinds = new Set<Kind>(['visit', 'search', 'product_view', 'cart_add', 'order'])
const rate = new Map<string, { start: number; count: number }>()
const windowMs = 600_000

function hostname(value: string): string {
  try { return new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase() } catch { return '' }
}

function cors(origin: string): Headers {
  return new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  })
}

function response(status: number, origin: string): Response {
  return new Response(null, { status, headers: origin ? cors(origin) : undefined })
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

async function readBody(request: Request): Promise<string | null> {
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 16_384) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return new TextDecoder().decode(bytes)
}

function limit(key: string, count: number, now: number): number {
  let item = rate.get(key)
  if (!item || now - item.start >= windowMs) {
    item = { start: now, count: 0 }
    rate.set(key, item)
  }
  const accepted = Math.min(count, Math.max(0, 200 - item.count))
  item.count += accepted
  if (rate.size > 10_000) {
    for (const [entry, value] of rate) if (now - value.start >= windowMs) rate.delete(entry)
  }
  return accepted
}

runtime.serve(async (request) => {
  const originHeader = request.headers.get('origin') ?? ''
  const referer = request.headers.get('referer') ?? ''
  const sourceHost = hostname(originHeader || referer)
  const site = hosts[sourceHost]
  const origin = site ? (originHeader ? new URL(originHeader).origin : `https://${sourceHost}`) : ''
  if (!site) return response(403, '')
  if (request.method === 'OPTIONS') return response(204, origin)
  if (request.method !== 'POST') return response(405, origin)
  if (/(bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|pingdom)/i.test(request.headers.get('user-agent') ?? '')) {
    return response(204, origin)
  }

  try {
    const text = await readBody(request)
    if (text === null) return response(204, origin)
    const input = JSON.parse(text) as { v?: unknown; d?: unknown; r?: unknown; e?: unknown }
    if (typeof input.v !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(input.v) || !Array.isArray(input.e)) return response(204, origin)
    const device: Device = input.d === 'mobile' || input.d === 'tablet' || input.d === 'desktop' ? input.d : ''
    const referrer = hosts[hostname(clean(input.r, 255))] ? hostname(clean(input.r, 255)) : ''
    const now = Date.now()
    const visitorIp = request.headers.get('cf-connecting-ip') || (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
    const accepted = limit(`${input.v}|${visitorIp}`, Math.min(input.e.length, 25), now)
    const rows = (input.e as EventInput[]).slice(0, accepted).flatMap((event) => {
      if (!kinds.has(event.k as Kind) || !Number.isInteger(event.t) || Number(event.t) < 0 || Number(event.t) > windowMs) return []
      if (event.c !== undefined && event.c !== null && (!Number.isInteger(event.c) || Number(event.c) < 0)) return []
      if (event.x !== undefined && event.x !== null && (typeof event.x !== 'number' || !Number.isFinite(event.x) || event.x < 0 || event.x > 100_000)) return []
      const kind = event.k as Kind
      let path = clean(event.p, 300)
      if (kind !== 'search') path = path.split(/[?#]/, 1)[0]
      return [{
        at: new Date(now - Number(event.t)).toISOString(),
        site,
        visitor: input.v as string,
        kind,
        sku: clean(event.s, 80),
        name: clean(event.n, 160),
        path,
        query: clean(event.q, 100),
        results: event.c == null ? null : Number(event.c),
        qty: event.x == null ? null : Number(event.x),
        device,
        referrer
      }]
    })
    if (rows.length) {
      const url = runtime.env.get('SUPABASE_URL')
      const key = runtime.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (url && key) {
        const result = await fetch(`${url}/rest/v1/site_activity`, {
          method: 'POST',
          headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(rows)
        })
        if (!result.ok) console.error('site-track insert failed:', result.status)
      }
    }
  } catch {
    return response(204, origin)
  }
  return response(204, origin)
})
