export class CatalogSyncAbortedError extends Error {
  constructor() {
    super('Katalog eşitlemesi iptal edildi.')
    this.name = 'CatalogSyncAbortedError'
  }
}

export async function catalogRequest<T>(operation: (signal: AbortSignal) => PromiseLike<T>, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) throw new CatalogSyncAbortedError()
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  let abort: () => void = () => {}
  const cancelled = new Promise<never>((_, reject) => {
    abort = () => {
      controller.abort()
      reject(new CatalogSyncAbortedError())
    }
    signal?.addEventListener('abort', abort, { once: true })
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error('Katalog isteği zaman aşımına uğradı.'))
    }, 15_000)
  })
  try {
    return await Promise.race([operation(controller.signal), cancelled])
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}
