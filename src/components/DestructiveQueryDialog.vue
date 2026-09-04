<template>
  <Dialog :open="!!resultStore.pendingWriteQuery" @update:open="onCancel">
    <DialogContent class="sm:max-w-md font-mono select-none" @pointer-down-outside.prevent @escape-key-down.prevent>
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-destructive text-sm font-semibold">
          <PhShieldWarning class="w-5 h-5 text-red-500 flex-shrink-0" />
          <span>{{ environmentTitle }}</span>
        </DialogTitle>
        <DialogDescription class="text-xs text-muted-foreground">
          This operation will mutate or delete records in the database.
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-3 py-2 text-xs">
        <!-- SQL Snippet Box -->
        <div class="rounded-lg bg-black/40 border border-border/80 p-3 text-[11px] leading-relaxed overflow-auto max-h-36 select-text text-foreground/90 font-mono shadow-inner">
          {{ resultStore.pendingWriteQuery?.sql }}
        </div>

        <!-- Safeguard Verification Input for Prod/Staging -->
        <div v-if="requiresConfirmationText" class="grid gap-2 pt-1">
          <Label for="confirm-text" class="text-[11px] font-semibold text-destructive flex items-center gap-1.5 select-none">
            Type <span class="font-mono bg-destructive/15 text-destructive px-1.5 py-0.5 rounded font-bold">CONFIRM</span> to execute on {{ environmentName }}
          </Label>
          <Input 
            id="confirm-text" 
            v-model="confirmationText" 
            placeholder="Type CONFIRM here" 
            class="h-8 text-xs border-destructive/40 focus-visible:ring-destructive/60 bg-background font-mono" 
            autocomplete="off"
            @keydown.enter="isConfirmed ? onConfirm() : null"
          />
        </div>
      </div>

      <DialogFooter class="gap-2 sm:gap-0 mt-2">
        <Button variant="outline" size="sm" class="text-xs h-8 px-4 font-mono" @click="onCancel">Cancel</Button>
        <Button 
          variant="destructive" 
          size="sm" 
          class="text-xs h-8 px-4 font-semibold shadow-sm font-mono gap-1"
          :disabled="!isConfirmed" 
          @click="onConfirm"
        >
          <PhWarning class="w-3.5 h-3.5" />
          <span>Execute Mutation</span>
        </Button>
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
import { PhShieldWarning, PhWarning } from '@phosphor-icons/vue'
import { useResultStore } from '@/stores/result'
import { useConnectionStore } from '@/stores/connection'
import { environmentLabel, requiresWriteConfirmation, resolveEnvironment } from '@/lib/connectionEnv'

const resultStore = useResultStore()
const connStore = useConnectionStore()
const confirmationText = ref('')

const env = computed(() => resolveEnvironment(connStore.activeConnection))
const requiresConfirmationText = computed(() => requiresWriteConfirmation(env.value))
const environmentName = computed(() => environmentLabel(env.value).toUpperCase())

const environmentTitle = computed(() => {
  if (env.value === 'production') return 'PRODUCTION SAFEGUARD: Confirm write query'
  if (env.value === 'staging') return 'STAGING SAFEGUARD: Confirm write query'
  return 'Confirm mutating query'
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
