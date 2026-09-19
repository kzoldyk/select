<template>
  <Dialog :open="Boolean(tabToConfirm)" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-sm select-none" @pointer-down-outside.prevent>
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-sm font-semibold">
          <PhWarningCircle class="w-4 h-4 text-amber-500 shrink-0" weight="fill" />
          <span>Save Changes?</span>
        </DialogTitle>
        <DialogDescription class="text-xs text-muted-foreground pt-1 leading-relaxed">
          Do you want to save the changes you made to <span class="text-foreground font-semibold">"{{ tabToConfirm?.name }}"</span>? Your changes will be lost if you don't save them.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter class="flex flex-row items-center justify-end gap-2 pt-3">
        <Button
          variant="outline"
          size="sm"
          class="text-xs h-8 px-3 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          @click="onDiscard"
        >
          Don't Save
        </Button>
        <Button
          variant="ghost"
          size="sm"
          class="text-xs h-8 px-3 cursor-pointer text-muted-foreground hover:text-foreground"
          @click="onCancel"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          class="text-xs h-8 px-4 cursor-pointer font-medium"
          @click="onSave"
        >
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PhWarningCircle } from '@phosphor-icons/vue'
import { useEditorStore } from '@/stores/editor'

const editorStore = useEditorStore()

const tabToConfirm = computed(() => {
  if (!editorStore.confirmCloseTabId) return null
  return editorStore.tabs.find(t => t.id === editorStore.confirmCloseTabId) ?? null
})

function onOpenChange(open: boolean) {
  if (!open) {
    editorStore.cancelCloseTab()
  }
}

function onCancel() {
  editorStore.cancelCloseTab()
}

function onDiscard() {
  editorStore.discardAndCloseTab()
}

async function onSave() {
  await editorStore.saveAndCloseTab()
}
</script>
