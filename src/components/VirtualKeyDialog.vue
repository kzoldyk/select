<template>
  <Dialog :open="uiStore.virtualKeyDialogOpen" @update:open="onClose">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <span>Virtual Unique Key</span>
          <span v-if="targetTable" class="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground font-normal">
            {{ targetTable }}
          </span>
        </DialogTitle>
      </DialogHeader>

      <div class="flex flex-col gap-3 py-1">
        <p class="text-xs text-muted-foreground leading-relaxed">
          Virtual keys are stored locally in your client configuration (like DBeaver). They allow safe inline cell editing on tables that lack a physical <code class="bg-muted px-1 rounded text-[11px]">PRIMARY KEY</code> constraint without modifying your database schema.
        </p>

        <div class="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-1">
          <span>Select Unique Identifier Columns:</span>
          <span class="text-[11px] font-mono text-primary">
            {{ selectedCols.length }} selected
          </span>
        </div>

        <div class="border border-border rounded-md max-h-56 overflow-y-auto divide-y divide-border/40 bg-muted/20">
          <label 
            v-for="col in availableColumns" 
            :key="col.name"
            class="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent/40 cursor-pointer select-none transition-colors"
          >
            <input
              type="checkbox"
              :value="col.name"
              v-model="selectedCols"
              class="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span class="font-mono font-medium text-foreground flex-1 truncate">{{ col.name }}</span>
            <span class="text-[10px] font-mono text-muted-foreground/70">{{ col.type }}</span>
          </label>
          <div v-if="availableColumns.length === 0" class="p-4 text-center text-xs text-muted-foreground italic">
            Loading table columns...
          </div>
        </div>
      </div>

      <div class="flex justify-between items-center pt-2">
        <Button 
          v-if="hasExistingVirtualKey"
          variant="ghost" 
          size="sm" 
          type="button" 
          class="text-xs text-destructive hover:bg-destructive/10"
          @click="onRemove"
        >
          Reset to Default
        </Button>
        <div v-else></div>

        <div class="flex gap-2">
          <Button variant="outline" size="sm" type="button" @click="onClose">Cancel</Button>
          <Button 
            size="sm" 
            type="button" 
            :disabled="selectedCols.length === 0" 
            @click="onSave"
          >
            Save Virtual Key
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUiStore } from '../stores/ui'
import { useSchemaStore } from '../stores/schema'
import { useResultStore } from '../stores/result'
import { toast } from 'vue-sonner'

const uiStore = useUiStore()
const schemaStore = useSchemaStore()
const resultStore = useResultStore()

const targetTable = computed(() => uiStore.virtualKeyTable || '')
const selectedCols = ref<string[]>([])

const availableColumns = computed(() => {
  if (!targetTable.value) return []
  const rawName = targetTable.value.toLowerCase()
  const tableKey = Object.keys(schemaStore.detailsByTable).find(k => k.toLowerCase() === rawName)
  const details = tableKey ? schemaStore.detailsByTable[tableKey] : null
  if (details && details.columns.length > 0) {
    return details.columns.map(c => ({ name: c.name, type: c.columnType }))
  }
  // Fallback to result store columns if available
  return resultStore.columns.map(c => ({ name: c.name, type: c.type || 'VARCHAR' }))
})

const hasExistingVirtualKey = computed(() => {
  if (!targetTable.value) return false
  const rawName = targetTable.value.toLowerCase()
  return Boolean(schemaStore.virtualKeys[rawName]?.length)
})

watch(() => uiStore.virtualKeyDialogOpen, async (open) => {
  if (open && targetTable.value) {
    const rawName = targetTable.value.toLowerCase()
    // Load existing virtual key or default PKs
    const existing = schemaStore.virtualKeys[rawName]
    if (existing && existing.length > 0) {
      selectedCols.value = [...existing]
    } else {
      const keyInfo = schemaStore.getKeyColumnsForTable(targetTable.value)
      selectedCols.value = [...keyInfo.columns]
    }

    // Ensure table details are fetched
    if (!schemaStore.detailsByTable[rawName]) {
      await schemaStore.fetchTableDetails(targetTable.value).catch(() => null)
    }
  }
})

function onClose() {
  uiStore.closeVirtualKeyDialog()
}

function onSave() {
  if (!targetTable.value || selectedCols.value.length === 0) return
  schemaStore.setVirtualKey(targetTable.value, selectedCols.value)
  toast.success('Virtual key defined', {
    description: `Configured [${selectedCols.value.join(', ')}] as virtual unique key for ${targetTable.value}.`,
  })
  onClose()
}

function onRemove() {
  if (!targetTable.value) return
  schemaStore.removeVirtualKey(targetTable.value)
  toast.info('Virtual key reset', {
    description: `Reset ${targetTable.value} to database default key detection.`,
  })
  onClose()
}
</script>
