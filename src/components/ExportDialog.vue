<template>
  <Dialog :open="uiStore.exportOpen" @update:open="uiStore.closeExport()">
    <DialogContent class="sm:max-w-md font-mono">
      <DialogHeader>
        <DialogTitle class="text-sm">Export Query Results</DialogTitle>
        <DialogDescription class="text-xs">
          Export full query results. Datasets larger than 10,000 rows are streamed directly to disk without memory limits.
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-2">
        <!-- 1. Format Selection -->
        <div class="grid gap-1.5">
          <Label class="text-xs text-muted-foreground uppercase tracking-wider font-semibold">1. Format</Label>
          <div class="grid grid-cols-4 gap-2">
            <Button
              v-for="fmt in formats"
              :key="fmt.id"
              variant="outline"
              size="sm"
              class="text-xs h-8 flex-1"
              :class="selectedFormat === fmt.id ? 'border-primary text-primary bg-primary/10 font-bold' : ''"
              @click="setFormat(fmt.id)"
            >{{ fmt.label }}</Button>
          </div>
        </div>

        <!-- 2. Save Path / Destination -->
        <div class="grid gap-1.5">
          <Label class="text-xs text-muted-foreground uppercase tracking-wider font-semibold">2. Save Destination Path</Label>
          <div class="flex gap-2 items-center">
            <Input
              id="export-path-input"
              v-model="saveFilePath"
              placeholder="e.g. /Users/name/Downloads/export.csv"
              class="h-8 text-xs font-mono flex-1 bg-background"
            />
            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs shrink-0 cursor-pointer"
              type="button"
              @click="handleBrowsePath"
            >
              Browse…
            </Button>
          </div>
          <span class="text-[10px] text-muted-foreground/70">
            Leave blank to pick location upon clicking Export.
          </span>
        </div>

        <!-- 3. Number of Rows -->
        <div class="grid gap-1.5">
          <Label class="text-xs text-muted-foreground uppercase tracking-wider font-semibold">3. Number of Rows</Label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              class="flex flex-col items-center justify-center p-2 rounded border text-center cursor-pointer transition-colors"
              :class="rowScope === 'all' ? 'border-primary bg-primary/10 text-foreground font-semibold' : 'border-border/60 hover:bg-accent text-muted-foreground'"
              @click="rowScope = 'all'"
            >
              <span class="text-xs">All Rows</span>
              <span class="text-[9.5px] opacity-75 mt-0.5">Unlimited (>10k)</span>
            </button>

            <button
              type="button"
              class="flex flex-col items-center justify-center p-2 rounded border text-center cursor-pointer transition-colors"
              :class="rowScope === 'custom' ? 'border-primary bg-primary/10 text-foreground font-semibold' : 'border-border/60 hover:bg-accent text-muted-foreground'"
              @click="rowScope = 'custom'"
            >
              <span class="text-xs">Custom Limit</span>
              <span class="text-[9.5px] opacity-75 mt-0.5">Specify rows</span>
            </button>

            <button
              type="button"
              class="flex flex-col items-center justify-center p-2 rounded border text-center cursor-pointer transition-colors"
              :class="rowScope === 'loaded' ? 'border-primary bg-primary/10 text-foreground font-semibold' : 'border-border/60 hover:bg-accent text-muted-foreground'"
              @click="rowScope = 'loaded'"
            >
              <span class="text-xs">Loaded Only</span>
              <span class="text-[9.5px] opacity-75 mt-0.5">{{ resultStore.rows.length.toLocaleString() }} rows</span>
            </button>
          </div>

          <div v-if="rowScope === 'custom'" class="flex items-center gap-2 mt-1">
            <Label for="custom-rows-input" class="text-xs text-muted-foreground shrink-0">Row limit:</Label>
            <Input
              id="custom-rows-input"
              v-model.number="customLimit"
              type="number"
              min="1"
              step="1000"
              placeholder="e.g. 50000"
              class="h-7 text-xs font-mono w-32 bg-background"
            />
            <span class="text-[10.5px] text-muted-foreground">rows</span>
          </div>
        </div>

        <!-- In-flight progress -->
        <div v-if="exporting" class="flex items-center justify-between p-2.5 rounded bg-muted/40 border border-border/60 text-xs text-muted-foreground">
          <div class="flex items-center gap-2.5">
            <svg class="w-4 h-4 animate-spin text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <span>Streaming full dataset directly to disk, please wait…</span>
          </div>
          <Button variant="ghost" size="sm" class="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 cursor-pointer" @click="handleCancel">
            Cancel
          </Button>
        </div>
      </div>

      <DialogFooter class="gap-2 sm:gap-0 mt-2">
        <Button variant="outline" size="sm" class="text-xs h-8 cursor-pointer" @click="handleCancel">
          {{ exporting ? 'Cancel Export' : 'Cancel' }}
        </Button>
        <Button id="btn-submit-export" size="sm" class="text-xs h-8" :disabled="exporting" @click="doExport">
          {{ exporting ? 'Exporting…' : 'Export' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useUiStore } from '@/stores/ui'
import { useResultStore } from '@/stores/result'

const uiStore = useUiStore()
const resultStore = useResultStore()

type ExportFormat = 'csv' | 'json' | 'tsv' | 'jsonl'

const formats: { id: ExportFormat; label: string }[] = [
  { id: 'csv', label: 'CSV' },
  { id: 'json', label: 'JSON' },
  { id: 'tsv', label: 'TSV' },
  { id: 'jsonl', label: 'JSONL' },
]

const selectedFormat = ref<ExportFormat>('csv')
const saveFilePath = ref('')
const rowScope = ref<'all' | 'custom' | 'loaded'>('all')
const customLimit = ref(50000)
const exporting = ref(false)

function defaultFileName(fmt: ExportFormat): string {
  const dateStr = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_')
  return `export_${dateStr}.${fmt}`
}

function setFormat(fmt: ExportFormat) {
  selectedFormat.value = fmt
  if (saveFilePath.value) {
    saveFilePath.value = saveFilePath.value.replace(/\.[^/.]+$/, `.${fmt}`)
  }
}

watch(() => uiStore.exportOpen, (open) => {
  if (open) {
    exporting.value = false
    rowScope.value = 'all'
    saveFilePath.value = ''
    selectedFormat.value = 'csv'
  }
})

async function handleBrowsePath() {
  try {
    const picked = await resultStore.pickExportPath(defaultFileName(selectedFormat.value), selectedFormat.value)
    if (picked) {
      saveFilePath.value = picked
    }
  } catch (e: any) {
    console.error('Browse path failed:', e)
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function handleCancel() {
  if (exporting.value) {
    await resultStore.cancelExport()
    exporting.value = false
    toast.info('Export cancelled.')
  }
  uiStore.closeExport()
}

async function doExport() {
  exporting.value = true
  try {
    let maxRows: number | null = null
    if (rowScope.value === 'custom') {
      maxRows = Math.max(1, customLimit.value || 1000)
    } else if (rowScope.value === 'loaded') {
      maxRows = Math.max(1, resultStore.rows.length)
    }

    const res = await resultStore.streamExport(
      selectedFormat.value,
      saveFilePath.value.trim() || null,
      maxRows,
    )

    toast.success(`Exported ${res.rowCount.toLocaleString()} rows (${formatBytes(res.fileSizeBytes)}) in ${res.durationMs}ms`, {
      description: `Saved to: ${res.filePath}`,
      class: '!bg-emerald-950/95 !border-emerald-500/80 !text-emerald-100 shadow-2xl',
      style: {
        backgroundColor: '#064e3b',
        borderColor: '#10b981',
        color: '#ecfdf5',
      },
    })
    uiStore.closeExport()
  } catch (e: any) {
    const msg = typeof e === 'string' ? e : e?.message || String(e)
    if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('interrupt')) {
      toast.error(`Export failed: ${msg}`)
    } else {
      toast.info('Export cancelled.')
    }
  } finally {
    exporting.value = false
  }
}
</script>
