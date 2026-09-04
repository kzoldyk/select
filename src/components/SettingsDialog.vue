<template>
  <Dialog :open="uiStore.settingsOpen" @update:open="uiStore.closeSettings()">
    <DialogContent class="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle class="text-sm font-semibold">Settings</DialogTitle>
        <DialogDescription class="text-xs text-muted-foreground">
          Customize your experience in Select.
        </DialogDescription>
      </DialogHeader>

      <div class="py-4 space-y-6">
        <!-- Appearance section -->
        <div class="space-y-4">
          <div class="space-y-2">
            <Label class="text-xs font-medium text-foreground">Theme Mode</Label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="opt in themeOptions"
                :key="opt.value"
                class="flex flex-col items-center justify-center gap-2 p-3.5 rounded-lg border text-xs transition-all duration-200 cursor-pointer text-center bg-transparent group"
                :class="uiStore.theme === opt.value 
                  ? 'border-primary bg-primary/5 text-primary font-medium shadow-[0_0_12px_rgba(225,29,72,0.15)]' 
                  : 'border-border/80 text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:border-border'"
                @click="uiStore.setTheme(opt.value)"
                type="button"
              >
                <component :is="opt.icon" class="w-4 h-4" />
                <span>{{ opt.label }}</span>
              </button>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            class="w-full text-xs gap-2 justify-center cursor-pointer"
            @click="openGallery"
          >
            <Palette class="w-4 h-4 text-primary" />
            Browse Themes Gallery...
          </Button>

          <!-- Film Grain Texture Switch & Level Selector -->
          <div class="space-y-3 p-3 rounded-lg border border-border/60 bg-muted/20">
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <Label class="text-xs font-medium text-foreground cursor-pointer" for="film-grain-toggle">Film Grain Texture</Label>
                <p class="text-[11px] text-muted-foreground">
                  {{ uiStore.filmGrainEnabled ? `Active: ${uiStore.grainIntensity.charAt(0).toUpperCase() + uiStore.grainIntensity.slice(1)}` : 'Disabled (No texture)' }}
                </p>
              </div>
              <Switch
                id="film-grain-toggle"
                :checked="uiStore.filmGrainEnabled"
                @update:checked="uiStore.setFilmGrainEnabled"
              />
            </div>

            <!-- Level Selector (Off, Subtle, Medium, High) -->
            <div class="pt-2 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span class="text-xs font-medium text-foreground">Effect Level</span>
              <div class="inline-flex rounded-lg border border-border/60 p-0.5 bg-background/70 shadow-xs">
                <button
                  v-for="lvl in (['off', 'subtle', 'medium', 'high'] as const)"
                  :key="lvl"
                  type="button"
                  class="px-2.5 py-1 text-[10px] font-medium rounded-md capitalize transition-all cursor-pointer"
                  :class="uiStore.currentGrainLevel === lvl 
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground'"
                  @click="uiStore.setGrainLevel(lvl)"
                >
                  {{ lvl === 'subtle' ? 'Subtle' : lvl }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Queries Directory section -->
        <div class="space-y-3 pt-4 border-t border-border/40">
          <Label class="text-xs font-medium text-foreground">Saved Queries Folder</Label>
          <div class="flex flex-col gap-2 bg-muted/40 border border-border/40 p-2.5 rounded-lg">
            <span class="text-[10px] font-mono break-all leading-normal text-muted-foreground">
              {{ editorStore.queriesDir || 'Not configured' }}
            </span>
            <Button
              variant="outline"
              size="sm"
              class="w-full text-xs gap-1.5 justify-center cursor-pointer h-8"
              @click="changeQueriesFolder"
            >
              <FolderOpen class="w-3.5 h-3.5" />
              Change Folder...
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter class="border-t border-border/40 pt-4 flex justify-end">
        <Button size="sm" class="text-xs" @click="uiStore.closeSettings()">
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Sun, Moon, Monitor, Palette, FolderOpen } from '@lucide/vue'
import { useUiStore, type Theme } from '../stores/ui'
import { useEditorStore } from '../stores/editor'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'vue-sonner'

const uiStore = useUiStore()
const editorStore = useEditorStore()

const themeOptions = [
  { value: 'light' as Theme, label: 'Light', icon: Sun },
  { value: 'dark' as Theme, label: 'Dark', icon: Moon },
  { value: 'system' as Theme, label: 'System', icon: Monitor },
]

function openGallery() {
  uiStore.closeSettings()
  uiStore.openThemeGallery()
}

async function changeQueriesFolder() {
  try {
    const selected = await invoke<string | null>('select_folder')
    if (selected) {
      await editorStore.setQueriesDir(selected)
      toast.success('Queries folder updated successfully!')
    }
  } catch (e) {
    toast.error('Failed to update queries folder')
  }
}
</script>
