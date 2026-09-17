import type { ApiArgs, ApiChannel, ApiResult, AppEvent } from '@shared/api'

export function api<C extends ApiChannel>(channel: C, args: ApiArgs<C>): Promise<ApiResult<C>> {
  return window.api.invoke(channel, args).catch((e: unknown) => {
    throw new Error(cleanError(e))
  })
}

/** Electron prefixes IPC errors with "Error invoking remote method 'x': Error: ..." — strip it. */
export function cleanError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}

export const onEvent = (channel: AppEvent, cb: () => void): (() => void) =>
  window.api.on(channel, cb)
