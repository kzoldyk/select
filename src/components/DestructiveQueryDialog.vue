<template>
  <Dialog :open="!!resultStore.pendingWriteQuery" @update:open="onCancel">
    <DialogContent class="sm:max-w-md" @pointer-down-outside.prevent @escape-key-down.prevent>
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-destructive">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Confirm Mutating Query
        </DialogTitle>
        <DialogDescription>
          This query will modify or destroy data in the database.
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-2">
        <div class="rounded-lg bg-muted/60 border border-border/80 p-3 font-mono text-[11px] leading-relaxed overflow-auto max-h-36 shadow-inner">
          {{ resultStore.pendingWriteQuery?.sql }}
        </div>

        <div v-if="requiresConfirmationText" class="grid gap-2.5 pt-1">
          <Label for="confirm-text" class="text-xs font-semibold text-destructive flex items-center gap-1.5 select-none">
            Production/Staging Safeguard: Type <span class="font-mono bg-destructive/10 px-1 py-0.5 rounded text-destructive select-all">CONFIRM</span> to run
          </Label>
          <Input 
            id="confirm-text" 
            v-model="confirmationText" 
            placeholder="Type CONFIRM here" 
            class="h-8.5 text-xs border-destructive/40 focus-visible:ring-destructive/60 bg-background" 
            autocomplete="off"
            @keydown.enter="isConfirmed ? onConfirm() : null"
          />
        </div>
      </div>

      <DialogFooter class="gap-2 sm:gap-0 mt-2">
        <Button variant="outline" size="sm" class="text-xs h-8 px-4" @click="onCancel">Cancel</Button>
        <Button 
          variant="destructive" 
          size="sm" 
          class="text-xs h-8 px-4 font-semibold shadow-sm"
          :disabled="!isConfirmed" 
          @click="onConfirm"
        >Execute</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResultStore } from '@/stores/result'
import { useConnectionStore } from '@/stores/connection'

const resultStore = useResultStore()
const connStore = useConnectionStore()
const confirmationText = ref('')

const requiresConfirmationText = computed(() => {
  const color = connStore.activeConnection?.color?.toUpperCase()
  return color === '#EF4444' || color === '#F59E0B' // Prod or Staging
})

const isConfirmed = computed(() => {
  if (!requiresConfirmationText.value) return true
  return confirmationText.value.trim().toUpperCase() === 'CONFIRM'
})

watch(() => resultStore.pendingWriteQuery, (newVal) => {
  if (newVal) {
    confirmationText.value = ''
  }
})

function onConfirm() {
  if (!isConfirmed.value) return
  resultStore.pendingWriteQuery?.resolve(true)
  resultStore.pendingWriteQuery = null
}

function onCancel() {
  resultStore.pendingWriteQuery?.resolve(false)
  resultStore.pendingWriteQuery = null
}
</script>
