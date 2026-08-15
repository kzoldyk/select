import { bind, play, setEnabled, type SoundName } from 'cuelume'

let initialized = false

/** Call once at app startup to wire delegated interaction listeners. */
export function initCuelume() {
  if (initialized || typeof window === 'undefined') return
  bind()
  initialized = true
}

/** Sync the global mute state with the user's preference. */
export function syncSoundsEnabled(enabled: boolean) {
  setEnabled(enabled)
}

/** Play an outcome or action sound (no-op when muted or Web Audio unavailable). */
export function playSound(name: SoundName, options?: { volume?: number }) {
  play(name, options)
}

export type { SoundName }
