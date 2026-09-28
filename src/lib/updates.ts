export interface ReleaseFeature {
  icon: 'folder' | 'download' | 'timer' | 'layout' | 'shield' | 'sparkles'
  title: string
  description: string
  tag?: 'New' | 'Improved' | 'Fix'
}

export interface AppRelease {
  version: string
  releaseDate: string
  title: string
  summary: string
  highlights: ReleaseFeature[]
  downloadUrl?: string
}

export const CURRENT_APP_VERSION = '0.2.1'

export const DEFAULT_MANIFEST_URL = 'https://raw.githubusercontent.com/hitesh103/select/main/releases.json'

export const BUILTIN_RELEASE: AppRelease = {
  version: '0.2.1',
  releaseDate: '2026-09-28',
  title: 'Connection Stability & Inline Editing Fixes',
  summary: 'Fixed connection crash when default schema is empty, eliminated duplicate query loader, and improved in-cell updates with NULL & type coercion.',
  downloadUrl: 'https://github.com/hitesh103/select/releases/latest',
  highlights: [
    {
      icon: 'shield',
      title: 'Empty Database Connection Fix',
      description: 'Fixed crash on connect when no default database is selected and added auto-selection for available databases.',
      tag: 'Fix',
    },
    {
      icon: 'timer',
      title: 'Cleaner Single Query Loader',
      description: 'Removed duplicate inner spinner overlay so long-running queries show one clean execution status.',
      tag: 'Fix',
    },
    {
      icon: 'layout',
      title: 'Enhanced In-Cell Table Updates',
      description: 'Fixed in-cell update queries to support NULL values, IS NULL key predicates, and strict column type coercion.',
      tag: 'Fix',
    },
    {
      icon: 'sparkles',
      title: 'Refined Update Notification Modal',
      description: 'Fixed cross button and version badge positioning for clean, unclipped dialog header layout.',
      tag: 'Improved',
    },
  ],
}

/**
 * Compares two semantic version strings (e.g., "0.1.0" and "0.2.0").
 * Returns:
 *   1 if a > b
 *  -1 if a < b
 *   0 if a === b
 */
export function semverCompare(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0)
  const pb = b.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

export function getLastSeenVersion(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('select_last_seen_version')
}

export function setLastSeenVersion(version: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('select_last_seen_version', version)
}

export function getDismissedUpdateVersion(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('select_dismissed_update_version')
}

export function setDismissedUpdateVersion(version: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('select_dismissed_update_version', version)
}

/**
 * Fetches the latest release from the remote manifest with a short timeout.
 * Falls back to built-in release information if offline or unreachable.
 */
export async function fetchLatestRelease(manifestUrl = DEFAULT_MANIFEST_URL): Promise<AppRelease> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(manifestUrl, { signal: controller.signal })
    clearTimeout(timer)
    if (res.ok) {
      const data = await res.json()
      if (data?.latest?.version && Array.isArray(data?.latest?.highlights)) {
        return data.latest as AppRelease
      }
    }
  } catch {
    // Network failure, offline, or timeout: fallback to built-in release definition
  }
  return BUILTIN_RELEASE
}

export interface UpdateStatus {
  isNewUpdateAvailable: boolean
  isNewlyUpdated: boolean
  release: AppRelease
}

/**
 * Computes update state:
 * - isNewUpdateAvailable: remote release > installed app version
 * - isNewlyUpdated: installed app version > last seen version
 */
export function evaluateUpdateStatus(
  latestRelease: AppRelease,
  currentVersion = CURRENT_APP_VERSION,
  lastSeenVersion: string | null = getLastSeenVersion(),
  dismissedVersion: string | null = getDismissedUpdateVersion(),
): UpdateStatus {
  const isNewer = semverCompare(latestRelease.version, currentVersion) > 0
  const isDismissed = dismissedVersion ? semverCompare(dismissedVersion, latestRelease.version) >= 0 : false

  const isNewUpdateAvailable = isNewer && !isDismissed

  // Newly updated if not on a newer remote version and user has never seen this installed version before
  const isNewlyUpdated = !isNewer && (!lastSeenVersion || semverCompare(currentVersion, lastSeenVersion) > 0)

  return {
    isNewUpdateAvailable,
    isNewlyUpdated,
    release: latestRelease,
  }
}
