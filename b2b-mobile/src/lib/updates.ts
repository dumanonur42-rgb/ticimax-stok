import { AppUpdate, FlexibleUpdateInstallStatus } from '@capawesome/capacitor-app-update'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import { compareVersions } from '@shared/version'
import { cachedMinimumVersion } from './cloud'

const APP_VERSION = __APP_VERSION__
const MANIFEST_URL = 'https://raw.githubusercontent.com/dumanonur42-rgb/ticimax-stok/main/b2b-mobile/live-update.json'
const ANDROID_RELEASES_API = 'https://api.github.com/repos/dumanonur42-rgb/ticimax-stok/releases?per_page=100'
const ANDROID_RELEASES_PAGE = 'https://github.com/dumanonur42-rgb/ticimax-stok/releases'
const GITHUB_CHECK_CACHE = 'yb2b.githubUpdateCheckedAt'
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

let liveRetryCount = 0
let liveRetryAt = 0
let liveCheck: Promise<void> | null = null

export async function checkAndroidUpdate(): Promise<AndroidUpdate | null> {
  const checkedAt = Number(localStorage.getItem(GITHUB_CHECK_CACHE) ?? 0)
  if (Date.now() - checkedAt < 6 * 60 * 60 * 1000) return null
  localStorage.setItem(GITHUB_CHECK_CACHE, String(Date.now()))
  const response = await fetch(ANDROID_RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
  if (!response.ok) throw new Error(`GitHub update check failed (${response.status})`)
  const releases = await response.json() as { tag_name?: string; body?: string; assets?: { name: string; browser_download_url: string }[]; draft?: boolean }[]
  const candidates = releases
    .filter((release) => !release.draft && /^b2b-android-v\d+\.\d+\.\d+$/.test(release.tag_name ?? ''))
    .map((release) => ({ release, version: (release.tag_name ?? '').replace(/^b2b-android-v/, '') }))
    .sort((a, b) => compareVersions(b.version, a.version))
  const latest = candidates[0]
  if (!latest || compareVersions(latest.version, APP_VERSION) <= 0) return null
  const apk = latest.release.assets?.find((asset) => asset.name.endsWith('.apk'))
  return apk ? { version: latest.version, url: apk.browser_download_url, notes: latest.release.body ?? '' } : null
}

export function androidReleasesPage(): string {
  return ANDROID_RELEASES_PAGE
}

export async function checkLiveUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform() || navigator.onLine === false || Date.now() < liveRetryAt || liveCheck) return liveCheck ?? undefined
  liveCheck = (async () => {
    try {
      const [response, native] = await Promise.all([
        fetch(MANIFEST_URL, { cache: 'no-store' }),
        CapacitorApp.getInfo()
      ])
      if (!response.ok) throw new Error(`Live manifest request failed (${response.status})`)
      const manifest = await response.json() as LiveUpdateManifest
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
