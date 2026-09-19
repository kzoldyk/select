import { describe, it, expect, beforeEach } from 'vitest'
import {
  semverCompare,
  evaluateUpdateStatus,
  fetchLatestRelease,
  BUILTIN_RELEASE,
  type AppRelease,
} from '../updates'

describe('updates lib', () => {
  describe('semverCompare', () => {
    it('handles identical versions', () => {
      expect(semverCompare('0.1.0', '0.1.0')).toBe(0)
      expect(semverCompare('v0.1.0', '0.1.0')).toBe(0)
    })

    it('detects newer minor and patch versions', () => {
      expect(semverCompare('0.2.0', '0.1.0')).toBe(1)
      expect(semverCompare('0.1.1', '0.1.0')).toBe(1)
      expect(semverCompare('1.0.0', '0.9.9')).toBe(1)
    })

    it('detects older versions', () => {
      expect(semverCompare('0.1.0', '0.2.0')).toBe(-1)
      expect(semverCompare('0.1.0', '0.1.1')).toBe(-1)
      expect(semverCompare('0.9.9', '1.0.0')).toBe(-1)
    })
  })

  describe('evaluateUpdateStatus', () => {
    const mockRemoteRelease: AppRelease = {
      version: '0.2.0',
      releaseDate: '2026-10-01',
      title: 'Next Gen Release',
      summary: 'Exciting features',
      highlights: [],
    }

    it('signals new update available when remote version is higher and not dismissed', () => {
      const status = evaluateUpdateStatus(mockRemoteRelease, '0.1.0', '0.1.0', null)
      expect(status.isNewUpdateAvailable).toBe(true)
      expect(status.isNewlyUpdated).toBe(false)
    })

    it('respects dismissed update versions', () => {
      const status = evaluateUpdateStatus(mockRemoteRelease, '0.1.0', '0.1.0', '0.2.0')
      expect(status.isNewUpdateAvailable).toBe(false)
    })

    it('signals newly updated on first launch after upgrading', () => {
      const currentRelease: AppRelease = { ...BUILTIN_RELEASE, version: '0.2.0' }
      const status = evaluateUpdateStatus(currentRelease, '0.2.0', '0.1.0', null)
      expect(status.isNewUpdateAvailable).toBe(false)
      expect(status.isNewlyUpdated).toBe(true)
    })

    it('does not trigger newly updated if current version matches last seen version', () => {
      const currentRelease: AppRelease = { ...BUILTIN_RELEASE, version: '0.1.0' }
      const status = evaluateUpdateStatus(currentRelease, '0.1.0', '0.1.0', null)
      expect(status.isNewUpdateAvailable).toBe(false)
      expect(status.isNewlyUpdated).toBe(false)
    })
  })

  describe('fetchLatestRelease', () => {
    it('returns builtin fallback on network failure or invalid url', async () => {
      const release = await fetchLatestRelease('http://127.0.0.1:9999/non-existent.json')
      expect(release).toBeDefined()
      expect(release.version).toBe(BUILTIN_RELEASE.version)
      expect(release.highlights.length).toBeGreaterThan(0)
    })
  })
})
