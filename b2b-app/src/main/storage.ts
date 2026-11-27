import { app, safeStorage } from 'electron'

let warnedAboutLinuxFallback = false

function canUseLinuxFallback(): boolean {
  return process.platform === 'linux' && (!app.isPackaged || process.argv.includes('--selfcheck'))
}

export function ensureAtRestAvailable(): void {
  if (safeStorage.isEncryptionAvailable()) return
  if (process.platform === 'win32' || !canUseLinuxFallback()) {
    throw new Error('Secure local storage is unavailable.')
  }
}

export function encryptAtRest(value: string): string {
  ensureAtRestAvailable()
  if (safeStorage.isEncryptionAvailable()) {
    return `safe:${safeStorage.encryptString(value).toString('base64')}`
  }
  if (process.platform === 'win32' || !canUseLinuxFallback()) {
    throw new Error('Secure local storage is unavailable.')
  }
  if (!warnedAboutLinuxFallback) {
    console.warn('safeStorage encryption unavailable; Linux dev/selfcheck is using unencrypted local data.')
    warnedAboutLinuxFallback = true
  }
  return `dev-plain:${value}`
}

export function decryptAtRest(value: string): { value: string; encrypted: boolean } {
  if (value.startsWith('safe:')) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure local storage is unavailable.')
    return { value: safeStorage.decryptString(Buffer.from(value.slice(5), 'base64')), encrypted: true }
  }
  if (value.startsWith('dev-plain:')) {
    if (!canUseLinuxFallback()) throw new Error('A development-only local key cannot be used in this build.')
    return { value: value.slice(10), encrypted: false }
  }
  if (process.platform === 'win32' && !safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure local storage is unavailable.')
  }
  if (!safeStorage.isEncryptionAvailable() && !canUseLinuxFallback()) {
    throw new Error('Secure local storage is unavailable.')
  }
  return { value, encrypted: false }
}
