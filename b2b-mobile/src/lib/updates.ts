import { AppUpdate, FlexibleUpdateInstallStatus } from '@capawesome/capacitor-app-update'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import { compareVersions } from '@shared/version'
import { cachedMinimumVersion } from './cloud'

const APP_VERSION = __APP_VERSION__
const CHANNEL_TAG = 'b2b-mobile-channel'
const CHANNEL_URL = `https://github.com/dumanonur42-rgb/ticimax-stok/releases/download/${CHANNEL_TAG}`
const MANIFEST_URL = `${CHANNEL_URL}/live-update.json`
const ANDROID_LATEST_URL = `${CHANNEL_URL}/android-latest.json`
const ANDROID_RELEASES_PAGE = `https://github.com/dumanonur42-rgb/ticimax-stok/releases/tag/${CHANNEL_TAG}`
const CHANNEL_CHECK_CACHE = 'yb2b.mobileChannelCheckedAt'
const PENDING_FLEXIBLE_UPDATE = 'yb2b.pendingFlexibleUpdate'

export interface AndroidUpdate {
  version: string
  url: string
  notes: string
}

interface LiveUpdateManifest {
  version: string
  url: string
  checksum: string
  minNative: string
}

interface AndroidChannelManifest {
  version: string
  versionCode: number
  apkUrl: string
  sha256: string
}

async function fetchChannelJson<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Mobile update request failed (${response.status})`)
    return await response.json() as T
  } catch (error) {
    if (!Capacitor.isNativePlatform()) throw error
    const response = await CapacitorHttp.get({ url, headers: { Accept: 'application/json' }, responseType: 'json' })
    if (response.status < 200 || response.status >= 300) throw new Error(`Mobile update request failed (${response.status})`)
    return response.data as T
  }
}

let liveRetryCount = 0
let liveRetryAt = 0
let liveCheck: Promise<void> | null = null

export async function checkAndroidUpdate(): Promise<AndroidUpdate | null> {
  const checkedAt = Number(localStorage.getItem(CHANNEL_CHECK_CACHE) ?? 0)
  if (Date.now() - checkedAt < 6 * 60 * 60 * 1000) return null
  const latest = await fetchChannelJson<AndroidChannelManifest>(ANDROID_LATEST_URL)
  if (!/^\d+\.\d+\.\d+$/.test(latest.version) ||
    !Number.isInteger(latest.versionCode) ||
    !/^https:\/\/github\.com\/dumanonur42-rgb\/ticimax-stok\/releases\/download\//.test(latest.apkUrl) ||
    !/^[a-f\d]{64}$/i.test(latest.sha256)) {
    throw new Error('Invalid Android update manifest')
  }
  localStorage.setItem(CHANNEL_CHECK_CACHE, String(Date.now()))
  return compareVersions(latest.version, APP_VERSION) > 0
    ? { version: latest.version, url: latest.apkUrl, notes: '' }
    : null
}

export function androidReleasesPage(): string {
  return ANDROID_RELEASES_PAGE
}

export async function checkLiveUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform() || navigator.onLine === false || Date.now() < liveRetryAt || liveCheck) return liveCheck ?? undefined
  liveCheck = (async () => {
    try {
      const [manifest, native] = await Promise.all([
        fetchChannelJson<LiveUpdateManifest>(MANIFEST_URL),
        CapacitorApp.getInfo()
      ])
      if (!manifest.url || !/^[a-f\d]{64}$/i.test(manifest.checksum) || !/^\d+\.\d+\.\d+$/.test(manifest.version) || !/^\d+\.\d+\.\d+$/.test(manifest.minNative)) {
        throw new Error('Invalid live update manifest')
      }
      liveRetryCount = 0
      liveRetryAt = 0
      if (compareVersions(native.version || APP_VERSION, manifest.minNative) < 0) return
      const current = await CapacitorUpdater.current()
      const currentVersion = /^\d+\.\d+\.\d+$/.test(current.bundle.version) ? current.bundle.version : APP_VERSION
      if (compareVersions(manifest.version, currentVersion) <= 0) return
      const bundle = await CapacitorUpdater.download({ url: manifest.url, version: manifest.version, checksum: manifest.checksum })
      await CapacitorUpdater.next({ id: bundle.id })
    } catch (error) {
      console.warn('Live update check failed', error)
      liveRetryCount += 1
      liveRetryAt = Date.now() + Math.min(5 * 60_000, 30_000 * 2 ** (liveRetryCount - 1))
    } finally {
      liveCheck = null
    }
  })()
  return liveCheck
}

export async function completePendingFlexibleUpdate(): Promise<void> {
  if (localStorage.getItem(PENDING_FLEXIBLE_UPDATE) !== 'true') return
  try {
    await AppUpdate.completeFlexibleUpdate()
    localStorage.removeItem(PENDING_FLEXIBLE_UPDATE)
  } catch (error) {
    console.warn('Flexible update completion failed', error)
  }
}

export async function startFlexibleUpdateListener(): Promise<{ remove: () => Promise<void> }> {
  return AppUpdate.addListener('onFlexibleUpdateStateChange', (state) => {
    if (state.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) {
      localStorage.setItem(PENDING_FLEXIBLE_UPDATE, 'true')
    }
  })
}

export function minimumVersionFor(platform: string, settings: { min_version_android?: string; min_version_ios?: string; min_version_windows?: string }): string | undefined {
  if (platform === 'android') return settings.min_version_android || cachedMinimumVersion('min_version_android')
  if (platform === 'ios') return settings.min_version_ios || cachedMinimumVersion('min_version_ios')
  return undefined
}
