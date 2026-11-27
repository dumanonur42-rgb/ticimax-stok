import type { ApiArgs, ApiChannel, ApiResult, AppEvent } from '@shared/api'

let loggingOut = false
let suppressLogoutSessionErrorUntil = 0

export function beginLogout(): void {
  loggingOut = true
}

export function endLogout(): void {
  loggingOut = false
  suppressLogoutSessionErrorUntil = Date.now() + 3000
}

export function api<C extends ApiChannel>(channel: C, args: ApiArgs<C>): Promise<ApiResult<C>> {
  return window.api.invoke(channel, args).catch((e: unknown) => {
    const message = cleanError(e)
    if ((loggingOut || Date.now() < suppressLogoutSessionErrorUntil) && message === 'Oturum açılmamış.') return undefined as ApiResult<C>
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
