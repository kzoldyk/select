export type ConnectionEnvironment = 'local' | 'staging' | 'production'

export const ENVIRONMENT_OPTIONS: { id: ConnectionEnvironment; label: string; color: string }[] = [
  { id: 'local', label: 'Local', color: '#10B981' },
  { id: 'staging', label: 'Staging', color: '#F59E0B' },
  { id: 'production', label: 'Production', color: '#EF4444' },
]

export function inferEnvironmentFromColor(color?: string): ConnectionEnvironment {
  const c = (color || '').toUpperCase()
  if (c === '#EF4444') return 'production'
  if (c === '#F59E0B') return 'staging'
  return 'local'
}

export function resolveEnvironment(conn: { environment?: ConnectionEnvironment; color?: string } | null | undefined): ConnectionEnvironment {
  if (!conn) return 'local'
  if (conn.environment === 'local' || conn.environment === 'staging' || conn.environment === 'production') {
    return conn.environment
  }
  return inferEnvironmentFromColor(conn.color)
}

export function environmentLabel(env: ConnectionEnvironment): string {
  if (env === 'production') return 'Production'
  if (env === 'staging') return 'Staging'
  return 'Local'
}

export function environmentBadgeClass(env: ConnectionEnvironment): string {
  if (env === 'production') return 'bg-red-500/15 text-red-500 border-red-500/30'
  if (env === 'staging') return 'bg-amber-500/15 text-amber-500 border-amber-500/30'
  return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
}

export function requiresWriteConfirmation(env: ConnectionEnvironment): boolean {
  return env === 'production' || env === 'staging'
}
