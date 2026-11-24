export class NetworkTimeoutError extends TypeError {
  constructor() {
    super('Sunucu isteği zaman aşımına uğradı. Lütfen yeniden deneyin.')
    this.name = 'NetworkTimeoutError'
  }
}

export async function networkRequest<T>(operation: (signal: AbortSignal) => PromiseLike<T>, parent?: AbortSignal | null, timeoutMs = 10_000): Promise<T> {
  if (parent?.aborted) throw new NetworkTimeoutError()
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  let abort = (): void => {}
  const cancelled = new Promise<never>((_, reject) => {
    abort = () => { controller.abort(); reject(new NetworkTimeoutError()) }
    parent?.addEventListener('abort', abort, { once: true })
    timer = setTimeout(abort, timeoutMs)
  })
  try {
    if (controller.signal.aborted) throw new NetworkTimeoutError()
    return await Promise.race([operation(controller.signal), cancelled])
  } finally {
    clearTimeout(timer)
    parent?.removeEventListener('abort', abort)
  }
}

export const authFetch: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (!new URL(url).pathname.startsWith('/auth/v1/')) return fetch(input, init)
  const parent = init?.signal ?? (typeof Request !== 'undefined' && input instanceof Request ? input.signal : undefined)
  return networkRequest(async signal => {
    const response = await fetch(input, { ...init, signal })
    const body = await response.arrayBuffer()
    return new Response([204, 205, 304].includes(response.status) ? null : body, {
      status: response.status, statusText: response.statusText, headers: response.headers
    })
  }, parent, 15_000)
}
