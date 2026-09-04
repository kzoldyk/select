import { describe, expect, it } from 'vitest'
import { inferEnvironmentFromColor, requiresWriteConfirmation, resolveEnvironment } from '../connectionEnv'

describe('connectionEnv', () => {
  it('infers production from legacy red color only when env is missing', () => {
    expect(inferEnvironmentFromColor('#EF4444')).toBe('production')
    expect(resolveEnvironment({ color: '#EF4444' })).toBe('production')
    expect(resolveEnvironment({ color: '#EF4444', environment: 'local' })).toBe('local')
  })

  it('requires confirm on staging and production', () => {
    expect(requiresWriteConfirmation('local')).toBe(false)
    expect(requiresWriteConfirmation('staging')).toBe(true)
    expect(requiresWriteConfirmation('production')).toBe(true)
  })
})
