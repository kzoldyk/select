<template>
  <footer class="flex items-center justify-between h-8 px-3 border-t border-border/60 bg-background text-[11px] font-medium text-muted-foreground overflow-hidden flex-shrink-0">
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5 cursor-default" :title="activeConnLabel">
        <span 
          class="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300" 
          :class="[dotClass, { 'shadow-[0_0_8px_currentColor]': connStore.status === 'connected' }]"
          :style="connStore.status === 'connected' && connStore.activeConnection?.color ? { backgroundColor: connStore.activeConnection.color, color: connStore.activeConnection.color } : {}"
        ></span>
        <span class="text-foreground tracking-wide capitalize">
          {{ connStore.status === 'connected' ? 'Connected' : (connStore.status === 'idle' ? 'Disconnected' : connStore.status) }}
        </span>
      </div>

      <div v-if="connStore.activeConnection" class="flex items-center gap-1.5 text-muted-foreground/80">
        <span>{{ connStore.activeConnection.name }}</span>
        <span>&middot;</span>
        <span class="max-w-[120px] truncate">{{ connStore.activeConnection.database || 'No DB' }}</span>
      </div>
      
      <div v-if="resultStore.status !== 'idle'" class="flex items-center gap-1.5" :class="runStatusClass">
        <span class="w-px h-3 bg-border mx-1"></span>
        <span class="font-mono tabular-nums">{{ runStatusText }}</span>
      </div>
    </div>

    <div class="flex items-center gap-3 text-muted-foreground/80 cursor-default">
      <span class="font-mono text-[10px]">
        Ln {{ editorStore.activeTab?.cursorLine ?? 1 }}, Col {{ editorStore.activeTab?.cursorCol ?? 1 }}
        <template v-if="editorStore.activeTab?.selectedTextCount">
          ({{ editorStore.activeTab.selectedTextCount }} selected)
        </template>
      </span>
      <span class="w-px h-3 bg-border"></span>
      <span>UTF-8</span>
      <span class="w-px h-3 bg-border"></span>
      <span>SQL</span>
      <span class="w-px h-3 bg-border"></span>
      <button
        class="flex items-center justify-center hover:text-foreground transition-colors cursor-pointer"
        @click="uiStore.toggleTheme()"
        :title="`Theme: ${uiStore.theme.charAt(0).toUpperCase() + uiStore.theme.slice(1)}`"
      >
        <Sun v-if="uiStore.theme === 'light'" class="w-3.5 h-3.5" />
        <Moon v-else-if="uiStore.theme === 'dark'" class="w-3.5 h-3.5" />
        <Monitor v-else class="w-3.5 h-3.5" />
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { Separator } from '@/components/ui/separator'
import { Sun, Moon, Monitor } from '@lucide/vue'
import { useConnectionStore } from '../stores/connection'
import { useResultStore } from '../stores/result'
import { useEditorStore } from '../stores/editor'
import { useUiStore } from '../stores/ui'

const connStore = useConnectionStore()
const resultStore = useResultStore()
const editorStore = useEditorStore()
const uiStore = useUiStore()

	const dotClass = computed(() => {
  if (connStore.status === 'connected' && connStore.activeConnection?.color) {
    return '' // Using inline style for custom color
  }
  switch (connStore.status) {
    case 'connected':  return 'bg-emerald-500' // fallback
    case 'connecting': return 'bg-amber-500'
    case 'error':      return 'bg-red-500'
    default:           return 'bg-muted-foreground/60'
  }
})

const activeConnLabel = computed(() => {
  const conn = connStore.activeConnection
  if (!conn) return 'No connection'
  return `${conn.name}:${conn.port}`
})

const runStatusText = computed(() => {
  switch (resultStore.status) {
    case 'running': return 'Running\u2026'
    case 'success': return `Query OK \u00b7 ${resultStore.duration}ms \u00b7 ${resultStore.rowCount} rows`
    case 'error':   return 'Query Error'
    default:        return 'Ready'
  }
})

const runStatusClass = computed(() => {
  switch (resultStore.status) {
    case 'running': return 'text-amber-500'
    case 'success': return 'text-emerald-500'
    case 'error':   return 'text-red-500'
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

</script>
