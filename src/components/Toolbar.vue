<template>
  <header class="toolbar" role="banner">
    <!-- Left cluster -->
    <div class="toolbar-left">
      <button
        id="conn-chip"
        class="conn-chip"
        aria-label="Open connection manager"
        @click="$emit('openConnManager')"
      >
        <span class="status-dot connected"></span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
        </svg>
        <span class="conn-name">{{ connectionName }}</span>
        <svg class="chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <span
        class="env-badge"
        :class="env.toLowerCase()"
        aria-label="Environment"
      >{{ env }}</span>
    </div>

    <!-- Center: Search/Palette trigger -->
    <div class="toolbar-center">
      <button
        id="palette-trigger"
        class="palette-trigger"
        aria-label="Open command palette (⌘K)"
        @click="$emit('openPalette')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span class="palette-text">Search…</span>
        <span class="kb-pill">⌘K</span>
      </button>
    </div>

    <!-- Right cluster -->
    <div class="toolbar-right">
      <button
        id="btn-history"
        class="ghost-btn"
        aria-label="Query history"
        @click="$emit('openHistory')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4"/>
          <polyline points="3 16 3 11 8 11"/>
        </svg>
        History
      </button>

      <button
        id="btn-share"
        class="ghost-btn"
        aria-label="Share query"
        @click="$emit('openShare')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Share
      </button>

      <button
        id="btn-settings"
        class="ghost-btn icon-only"
        aria-label="Open settings"
        @click="$emit('openSettings')"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

      <div class="toolbar-sep" role="separator"></div>

      <button
        id="btn-run"
        class="run-btn"
        aria-label="Run query (⌘Enter)"
        @click="$emit('run')"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Run
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  connectionName: string
  env: 'PROD' | 'DEV' | 'STAGING'
}>()

defineEmits<{
  run: []
  openPalette: []
  openConnManager: []
  openSettings: []
  openHistory: []
  openShare: []
}>()
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  height: 40px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

/* Left */
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.conn-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--surface);
  border: 1px solid var(--border-2);
  border-radius: 5px;
  padding: 4px 8px;
  color: var(--text-muted);
  font-size: 11px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: color 0.1s;
}
.conn-chip:hover { color: var(--text); }
.conn-name { color: var(--text); font-size: 11px; }
.chevron { color: var(--text-dim); margin-left: 2px; }

.env-badge {
  font-size: 10px;
  font-family: 'Inter', sans-serif;
  padding: 2px 5px;
  border-radius: 3px;
  font-weight: 500;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
.env-badge.prod { background: #7F1D1D; color: #FCA5A5; }
.env-badge.dev  { background: #1A3A1A; color: #86EFAC; }
.env-badge.staging { background: #1C1A00; color: #FCD34D; }

/* Center */
.toolbar-center { flex: 1; display: flex; justify-content: center; }

.palette-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 240px;
  background: var(--surface-2);
  border: 1px solid var(--border-2);
  border-radius: 5px;
  padding: 5px 10px;
  color: var(--text-dim);
  font-size: 11px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: border-color 0.15s;
  text-align: left;
}
.palette-trigger:hover { border-color: var(--blue); color: var(--text-muted); }
.palette-text { flex: 1; color: var(--text-dim); }

/* Right */
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-only { padding: 4px 6px; }

.toolbar-sep {
  width: 1px;
  height: 16px;
  background: var(--border-2);
  margin: 0 2px;
}

.run-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--blue);
  border: none;
  color: #fff;
  font-size: 11px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}
.run-btn:hover { background: #2563EB; }
</style>
