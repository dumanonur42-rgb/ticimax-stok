import { Capacitor } from '@capacitor/core'
import { SESSION_CACHE, SUPABASE_AUTH_STORAGE_KEY } from './cloud'
import { hasLegacyCatalog } from './idb'
import { CART_STORAGE_KEY, LEGACY_WEB_DATA_PURGED_KEY, migrateLegacyStorage, secureStorage } from './secureStorage'
import { webDataPurge } from './webDataPurge'

export async function purgeLegacyWebDataIfNeeded(): Promise<boolean> {
  const alreadyPurged = await secureStorage.getItem(LEGACY_WEB_DATA_PURGED_KEY)
  const [legacyStorageFound, legacyCatalogFound] = await Promise.all([
    migrateLegacyStorage([SESSION_CACHE, SUPABASE_AUTH_STORAGE_KEY, CART_STORAGE_KEY]),
    alreadyPurged === '1' ? Promise.resolve(false) : hasLegacyCatalog()
  ])
  if (alreadyPurged === '1' || (!legacyStorageFound && !legacyCatalogFound)) return false

  await secureStorage.setItem(LEGACY_WEB_DATA_PURGED_KEY, '1')
  if (Capacitor.getPlatform() !== 'android') return false

  try {
    await webDataPurge.purge()
    return true
  } catch (error) {
    console.warn('Legacy WebView data purge failed', error)
    return false
  }
}
