<template>
  <Dialog :open="uiStore.exportOpen" @update:open="uiStore.closeExport()">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Export Results</DialogTitle>
        <DialogDescription>Choose format and options for exporting query results.</DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label class="text-xs text-muted-foreground uppercase tracking-wider">Format</Label>
          <div class="flex gap-2">
            <Button
              v-for="fmt in formats"
              :key="fmt.id"
              variant="outline"
              size="sm"
              class="text-xs h-8 flex-1"
              :class="selectedFormat === fmt.id ? 'border-primary text-primary' : ''"
              @click="selectedFormat = fmt.id"
            >{{ fmt.label }}</Button>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" class="text-xs h-8" @click="uiStore.closeExport()">Cancel</Button>
        <Button size="sm" class="text-xs h-8" @click="doExport">Export</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useUiStore } from '@/stores/ui'
import { useResultStore } from '@/stores/result'

const uiStore = useUiStore()
const resultStore = useResultStore()

const formats = [
  { id: 'csv', label: 'CSV' },
  { id: 'json', label: 'JSON' },
] as const

const selectedFormat = ref<'csv' | 'json'>('csv')

function doExport() {
  if (selectedFormat.value === 'csv') {
    resultStore.exportCsv()
  } else {
    const json = JSON.stringify(resultStore.rows, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `export_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  uiStore.closeExport()
}
</script>
