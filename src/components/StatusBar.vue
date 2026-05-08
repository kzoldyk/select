<template>
  <footer class="statusbar" role="status" aria-live="polite">
    <!-- Connection status -->
    <span
      class="status-dot"
      :class="dotClass"
      :aria-label="`Connection: ${connStore.status}`"
    ></span>
    <span class="sb-item">{{ connStore.status === 'connected' ? 'Connected' : connStore.status }}</span>

    <span class="sb-sep"></span>
    <span class="sb-item">{{ activeConnLabel }}</span>

    <span class="sb-sep"></span>
    <span class="sb-item" :class="runStatusClass">{{ runStatusText }}</span>

    <span class="sb-sep"></span>
    <span class="sb-item">{{ queryStatusLabel }}</span>

    <span class="sb-sep" aria-hidden="true">→</span>

    <span class="sb-item">Ln {{ editorStore.activeTab?.cursorLine ?? 1 }}, Col {{ editorStore.activeTab?.cursorCol ?? 1 }}</span>

    <span class="sb-sep"></span>
    <span class="sb-item">UTF-8 · SQL</span>

    <span class="sb-sep"></span>
    <button
      class="sb-item sb-toggle"
      :aria-label="`Autocommit is ${autocommit ? 'on' : 'off'}, click to toggle`"
      @click="autocommit = !autocommit"
    >Autocommit {{ autocommit ? 'ON' : 'OFF' }}</button>

    <span class="sb-sep"></span>
    <span class="sb-item" :class="txnClass">{{ txnLabel }}</span>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConnectionStore } from '../stores/connection'
import { useResultStore } from '../stores/result'
import { useEditorStore } from '../stores/editor'

const connStore = useConnectionStore()
const resultStore = useResultStore()
const editorStore = useEditorStore()

const autocommit = ref(true)

const dotClass = computed(() => {
  switch (connStore.status) {
    case 'connected':  return 'connected'
    case 'connecting': return 'connecting'
    case 'error':      return 'error'
    default:           return 'idle'
  }
})

const activeConnLabel = computed(() => {
  const conn = connStore.activeConnection
  if (!conn) return 'No connection'
  return `${conn.name}:${conn.port}`
})

const runStatusText = computed(() => {
  switch (resultStore.status) {
    case 'running': return 'Running…'
    case 'success': return `Query OK · ${resultStore.duration}ms · ${resultStore.rowCount} rows`
    case 'error':   return 'Query Error'
    default:        return 'Ready'
  }
})

const runStatusClass = computed(() => {
  switch (resultStore.status) {
    case 'running': return 'status-amber'
    case 'success': return 'status-green'
    case 'error':   return 'status-red'
    default:        return ''
  }
})

const queryStatusLabel = computed(() => {
  switch (resultStore.status) {
    case 'success': return 'Query OK'
    case 'error':   return 'Error'
    default:        return 'Idle'
  }
})

const txnLabel = computed(() => autocommit.value ? 'Idle' : 'In transaction')
const txnClass = computed(() => autocommit.value ? '' : 'status-amber')
</script>

<style scoped>
.statusbar {
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  background: var(--surface);
  border-top: 1px solid var(--border);
  font-size: 10px;
  font-family: 'Inter', sans-serif;
  color: var(--text-muted);
  overflow: hidden;
  flex-shrink: 0;
  gap: 0;
}

.sb-item {
  white-space: nowrap;
  font-size: 10px;
  color: var(--text-muted);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 5px;
}
.status-dot.connected  { background: var(--green); }
.status-dot.connecting { background: var(--amber); }
.status-dot.error      { background: var(--red); }
.status-dot.idle       { background: var(--text-dim); }

.status-green { color: var(--green) !important; }
.status-amber { color: var(--amber) !important; }
.status-red   { color: var(--red) !important; }

.sb-toggle {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 10px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-decoration-color: var(--border-2);
}
.sb-toggle:hover { color: var(--text); }

/* Override from tokens for statusbar */
.statusbar .sb-sep {
  margin: 0 6px;
}
</style>
