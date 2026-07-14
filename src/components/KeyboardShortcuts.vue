<template>
  <Dialog :open="uiStore.shortcutsOpen" @update:open="uiStore.closeShortcuts()">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Keyboard Shortcuts</DialogTitle>
        <DialogDescription>All available shortcuts for Select</DialogDescription>
      </DialogHeader>
      <div class="grid gap-2 py-2">
        <div v-for="group in shortcutGroups" :key="group.label" class="grid gap-1">
          <h4 class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{{ group.label }}</h4>
          <div v-for="item in group.items" :key="item.keys" class="flex items-center justify-between py-1">
            <span class="text-xs text-foreground">{{ item.label }}</span>
            <span class="flex items-center gap-1">
              <Kbd v-for="k in item.keys.split(' ')" :key="k" class="text-[9px]">{{ k }}</Kbd>
            </span>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()

const shortcutGroups = [
  {
    label: 'Query Execution',
    items: [
      { keys: '⌘ ↵', label: 'Run current query' },
      { keys: '⌘ ⇧ ↵', label: 'Run selected SQL' },
      { keys: '⌘ ⇧ F', label: 'Format SQL' },
    ],
  },
  {
    label: 'Editing',
    items: [
      { keys: '⌘ S', label: 'Save query' },
      { keys: '⌘ ⇧ S', label: 'Save query as' },
      { keys: '⌘ /', label: 'Toggle comment' },
      { keys: '↵', label: 'Confirm cell edit' },
      { keys: '⎋', label: 'Cancel cell edit / Close overlay' },
    ],
  },
  {
    label: 'Navigation',
    items: [
      { keys: '⌘ K', label: 'Command palette' },
      { keys: '⌘ ⇧ /', label: 'Keyboard shortcuts' },
      { keys: '⌘ B', label: 'Toggle sidebar' },
    ],
  },
  {
    label: 'Tabs',
    items: [
      { keys: '⌘ T', label: 'New tab' },
      { keys: '⌘ W', label: 'Close tab' },
      { keys: '⌘ ⇧ ]', label: 'Next tab' },
      { keys: '⌘ ⇧ [', label: 'Previous tab' },
    ],
  },
]
</script>
