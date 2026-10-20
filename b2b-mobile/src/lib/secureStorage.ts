import { SecureStorage } from '@aparajita/capacitor-secure-storage'

export const CART_STORAGE_KEY = 'yamansa-b2b-cart'
export const LEGACY_WEB_DATA_PURGED_KEY = 'legacy-webdata-purged'

const cachedValues = new Map<string, string | null>()

async function readSecureValue(key: string): Promise<string | null> {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await SecureStorage.getItem(key)
    } catch (error) {
      lastError = error
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)))
    }
  }
  throw lastError
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    let value: string | null = null
    try {
      value = await readSecureValue(key)
    } catch (error) {
      if (cachedValues.has(key)) return cachedValues.get(key) ?? null
      let legacy: string | null = null
      try {
        legacy = localStorage.getItem(key)
      } catch {}
      if (legacy !== null) {
        await SecureStorage.setItem(key, legacy)
        cachedValues.set(key, legacy)
        try {
          localStorage.removeItem(key)
        } catch {}
        return legacy
      }
      throw error
    }
    if (value === null && cachedValues.get(key) != null) return cachedValues.get(key) ?? null
    cachedValues.set(key, value)
    if (value !== null) {
      try {
        localStorage.removeItem(key)
      } catch {}
      return value
    }
    let legacy: string | null = null
    try {
      legacy = localStorage.getItem(key)
    } catch {}
    if (legacy === null) return null
    await SecureStorage.setItem(key, legacy)
    cachedValues.set(key, legacy)
    try {
      localStorage.removeItem(key)
    } catch {}
    return legacy
  },
  async setItem(key: string, value: string): Promise<void> {
    await SecureStorage.setItem(key, value)
    cachedValues.set(key, value)
  },
  async removeItem(key: string): Promise<void> {
    await SecureStorage.removeItem(key)
    cachedValues.set(key, null)
    try {
      localStorage.removeItem(key)
    } catch {}
  }
}

export async function migrateLegacyStorage(keys: string[]): Promise<boolean> {
  let found = false
  for (const key of keys) {
    let legacy: string | null = null
    try {
      legacy = localStorage.getItem(key)
    } catch {}
    if (legacy === null) continue
    found = true
    await secureStorage.getItem(key)
  }
  return found
}
