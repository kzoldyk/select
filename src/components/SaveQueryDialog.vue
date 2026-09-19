<template>
  <Dialog :open="editorStore.saveDialogOpen" @update:open="onClose">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Save Query</DialogTitle>
      </DialogHeader>
      <form @submit.prevent="onSave" class="flex flex-col gap-4">
        <div class="grid gap-2">
          <Label for="query-name">Query name</Label>
          <Input
            id="query-name"
            ref="nameInput"
            v-model="name"
            placeholder="e.g. Monthly active users"
            class="w-full"
            @keydown.enter.prevent="onSave"
          />
        </div>

        <div v-if="editorStore.queryFolders.length > 0" class="grid gap-2">
          <Label for="query-folder">Folder</Label>
          <select
            id="query-folder"
            v-model="selectedFolder"
            class="w-full h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option :value="''">/ (Root folder)</option>
            <option v-for="f in editorStore.queryFolders" :key="f" :value="f">
              📁 {{ f }}
            </option>
          </select>
        </div>

        <div class="flex justify-end gap-2">
          <Button variant="outline" size="sm" type="button" @click="onClose">Cancel</Button>
          <Button size="sm" type="submit" :disabled="!name.trim()">Save</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useEditorStore } from '../stores/editor'

const editorStore = useEditorStore()
const name = ref('')
const selectedFolder = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

watch(() => editorStore.saveDialogOpen, async (open) => {
  if (open) {
    const tab = editorStore.tabs.find(t => t.id === editorStore.saveDialogTabId)
    name.value = tab?.name ?? ''
    selectedFolder.value = editorStore.saveDialogFolder || ''
    await nextTick()
    nameInput.value?.focus()
    nameInput.value?.select()
  }
})

function onSave() {
  if (!name.value.trim()) return
  if (editorStore.saveDialogTabId) {
    editorStore.saveQueryAs(editorStore.saveDialogTabId, name.value.trim(), selectedFolder.value || null)
  }
}

function onClose() {
  editorStore.saveDialogOpen = false
  editorStore.saveDialogTabId = null
  editorStore.saveDialogFolder = null
  editorStore.pendingCloseAfterSaveTabId = null
}
</script>
