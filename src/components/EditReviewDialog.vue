<template>
  <Dialog :open="open" @update:open="onOpen">
    <DialogContent class="sm:max-w-lg font-mono select-none">
      <DialogHeader>
        <DialogTitle class="text-sm font-semibold">Review {{ count }} cell change{{ count === 1 ? '' : 's' }}</DialogTitle>
        <DialogDescription class="text-xs">
          These UPDATE statements will run in one batch. Copy them if you want to inspect first.
        </DialogDescription>
      </DialogHeader>
      <pre class="max-h-56 overflow-auto rounded-md border border-border/80 bg-muted/30 p-3 text-[11px] leading-relaxed select-text whitespace-pre-wrap">{{ sql }}</pre>
      <DialogFooter class="gap-2">
        <Button variant="outline" size="sm" class="h-8 text-xs" @click="emit('copy')">Copy SQL</Button>
        <Button variant="outline" size="sm" class="h-8 text-xs" @click="emit('cancel')">Cancel</Button>
        <Button size="sm" class="h-8 text-xs" :disabled="saving" @click="emit('confirm')">
          {{ saving ? 'Saving…' : 'Apply updates' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  open: boolean
  sql: string
  count: number
  saving?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
  copy: []
  'update:open': [value: boolean]
}>()

function onOpen(val: boolean) {
  emit('update:open', val)
  if (!val) emit('cancel')
}
</script>
