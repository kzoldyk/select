<template>
  <Dialog :open="!!resultStore.pendingWriteQuery" @update:open="onCancel">
    <DialogContent class="sm:max-w-md" @pointer-down-outside.prevent @escape-key-down.prevent>
      <DialogHeader>
        <DialogTitle>Confirm Write Query</DialogTitle>
        <DialogDescription>
          This query will modify data in the database.
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <div class="rounded bg-muted p-3 font-mono text-xs leading-relaxed overflow-auto max-h-32">
          {{ resultStore.pendingWriteQuery?.sql }}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="onCancel">Cancel</Button>
        <Button variant="destructive" @click="onConfirm">Execute</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useResultStore } from '@/stores/result'

const resultStore = useResultStore()

function onConfirm() {
  resultStore.pendingWriteQuery?.resolve(true)
  resultStore.pendingWriteQuery = null
}

function onCancel() {
  resultStore.pendingWriteQuery?.resolve(false)
  resultStore.pendingWriteQuery = null
}
</script>
