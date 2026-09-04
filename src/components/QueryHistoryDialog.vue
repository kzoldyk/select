<template>
  <Dialog :open="uiStore.historyOpen" @update:open="onOpen">
    <DialogContent class="sm:max-w-lg font-mono">
      <DialogHeader>
        <DialogTitle class="text-sm font-semibold">Query history</DialogTitle>
        <DialogDescription class="text-xs">Click a statement to run it again.</DialogDescription>
      </DialogHeader>
      <div class="max-h-80 overflow-auto -mx-1 px-1">
        <button
          v-for="item in resultStore.history"
          :key="item.id"
          class="group w-full text-left p-2.5 mb-1.5 rounded-lg border border-border/60 bg-muted/10 hover:bg-muted/30 transition-colors cursor-pointer"
          @click="rerun(item.sql)"
        >
          <div class="flex items-center gap-2 mb-1">
            <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="item.error ? 'bg-red-500' : 'bg-emerald-500'"></span>
            <span class="text-[10px] text-muted-foreground">{{ formatTime(item.executed_at) }}</span>
            <span class="text-[10px] text-muted-foreground/70">{{ item.duration_ms }}ms · {{ item.row_count }} rows</span>
          </div>
          <pre class="text-[11px] text-foreground truncate">{{ item.sql }}</pre>
        </button>
        <div v-if="!resultStore.history.length" class="text-muted-foreground/50 text-center py-8 text-xs">
          No queries recorded yet
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUiStore } from '@/stores/ui'
import { useResultStore } from '@/stores/result'

const uiStore = useUiStore()
const resultStore = useResultStore()

watch(() => uiStore.historyOpen, (open) => {
  if (open) resultStore.loadHistory()
})

function onOpen(val: boolean) {
  if (!val) uiStore.closeHistory()
}

function rerun(sql: string) {
  uiStore.closeHistory()
  resultStore.runQuery(sql)
}

function formatTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleTimeString()
  } catch {
    return isoStr
  }
}
</script>
