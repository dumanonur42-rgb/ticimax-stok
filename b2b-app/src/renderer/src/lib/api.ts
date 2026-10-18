import type { ApiArgs, ApiChannel, ApiResult, AppEvent } from '@shared/api'

let loggingOut = false

export function beginLogout(): void {
  loggingOut = true
}

export function endLogout(): void {
  loggingOut = false
}

export function api<C extends ApiChannel>(channel: C, args: ApiArgs<C>): Promise<ApiResult<C>> {
  return window.api.invoke(channel, args).catch((e: unknown) => {
    const message = cleanError(e)
    if (loggingOut && message === 'Oturum açılmamış.') return new Promise<ApiResult<C>>(() => undefined)
    throw new Error(message)
  })
}

/** Electron prefixes IPC errors with "Error invoking remote method 'x': SomeError: ..." — strip it. */
export function cleanError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, '')
}

export const onEvent = (channel: AppEvent, cb: () => void): (() => void) =>
  window.api.on(channel, cb)
