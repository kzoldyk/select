<template>
  <Dialog :open="editorStore.queriesDirNeedsSetup" @update:open="() => {}">
    <DialogContent class="sm:max-w-[440px]" :close-on-outside-click="false" :close-on-escape="false" :show-close-button="false">
      <DialogHeader class="space-y-2">
        <DialogTitle class="text-sm font-semibold flex items-center gap-2">
          <FolderOpen class="w-4 h-4 text-primary" />
          Setup Query Save Folder
        </DialogTitle>
        <DialogDescription class="text-xs text-muted-foreground leading-relaxed">
          Select now saves queries as separate <code>.sql</code> files so you can easily edit them in VS Code, commit to Git, or share them. 
          Please choose where you would like to save all your queries.
        </DialogDescription>
      </DialogHeader>

      <div class="py-4 space-y-4">
        <div v-if="defaultPath" class="text-[11px] text-muted-foreground bg-muted/40 border border-border/40 p-2.5 rounded-lg font-mono break-all leading-normal">
          <span class="font-semibold block mb-0.5 text-foreground/80 font-sans">Default location:</span>
          {{ defaultPath }}
        </div>
      </div>

      <DialogFooter class="flex flex-col sm:flex-row gap-2 sm:justify-end border-t border-border/40 pt-4">
        <Button 
          variant="ghost" 
          size="sm" 
          class="text-xs w-full sm:w-auto cursor-pointer" 
          @click="useDefaultFolder" 
          :disabled="loading"
        >
          Use Default Folder
        </Button>
        <Button 
          size="sm" 
          class="text-xs w-full sm:w-auto gap-1.5 shadow-sm cursor-pointer" 
          @click="chooseCustomFolder" 
          :disabled="loading"
        >
          <FolderOpen class="w-3.5 h-3.5" />
          Choose Custom Folder...
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { FolderOpen } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useEditorStore } from '../stores/editor'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'vue-sonner'

const editorStore = useEditorStore()
const loading = ref(false)
const defaultPath = ref('')

onMounted(async () => {
  try {
    defaultPath.value = await invoke<string>('get_queries_dir')
  } catch (e) {
    console.error('Failed to get default queries path:', e)
  }
})

async function useDefaultFolder() {
  if (!defaultPath.value) return
  loading.value = true
  try {
    await editorStore.setQueriesDir(defaultPath.value)
    toast.success('Queries folder set to default location successfully!')
  } catch (e) {
    toast.error('Failed to configure queries folder')
  } finally {
    loading.value = false
  }
}

async function chooseCustomFolder() {
  loading.value = true
  try {
    const selected = await invoke<string | null>('select_folder')
    if (selected) {
      await editorStore.setQueriesDir(selected)
      toast.success('Queries folder configured successfully!')
    }
  } catch (e) {
    toast.error('Failed to select queries folder')
  } finally {
    loading.value = false
  }
}
</script>
