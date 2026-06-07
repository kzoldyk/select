<template>
  <footer class="flex items-center h-7 px-3 border-t bg-background text-[10px] text-muted-foreground overflow-hidden flex-shrink-0 gap-0">
    <span class="w-2 h-2 rounded-full flex-shrink-0 mr-1.5" :class="dotClass"></span>
    <span class="whitespace-nowrap text-[10px]">{{ connStore.status === 'connected' ? 'Connected' : connStore.status }}</span>

    <Separator orientation="vertical" class="mx-1.5 h-3" />
    <span class="whitespace-nowrap text-[10px]">{{ activeConnLabel }}</span>

    <Separator orientation="vertical" class="mx-1.5 h-3" />
    <span class="whitespace-nowrap text-[10px]" :class="runStatusClass">{{ runStatusText }}</span>

    <Separator orientation="vertical" class="mx-1.5 h-3" />
    <span class="whitespace-nowrap text-[10px]">{{ queryStatusLabel }}</span>

    <span class="mx-1.5 text-muted-foreground">&rarr;</span>

    <span class="whitespace-nowrap text-[10px]">Ln {{ editorStore.activeTab?.cursorLine ?? 1 }}, Col {{ editorStore.activeTab?.cursorCol ?? 1 }}</span>

	    <Separator orientation="vertical" class="mx-1.5 h-3" />
	    <span class="whitespace-nowrap text-[10px]">UTF-8 &middot; SQL</span>
	  </footer>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { Separator } from '@/components/ui/separator'
import { useConnectionStore } from '../stores/connection'
import { useResultStore } from '../stores/result'
import { useEditorStore } from '../stores/editor'

const connStore = useConnectionStore()
const resultStore = useResultStore()
const editorStore = useEditorStore()

	const dotClass = computed(() => {
  switch (connStore.status) {
    case 'connected':  return 'bg-emerald-500'
    case 'connecting': return 'bg-amber-500'
    case 'error':      return 'bg-red-500'
    default:           return 'bg-muted-foreground'
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
