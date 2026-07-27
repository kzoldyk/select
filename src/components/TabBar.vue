<template>
  <div class="flex items-center justify-between h-9 bg-muted/40 border-b border-border flex-shrink-0 px-2 select-none">
    <!-- Left: Scrollable Tabs list & Add Tab button -->
    <div class="flex items-end h-full overflow-x-auto overflow-y-hidden gap-1 pt-1 min-w-0 flex-1" role="tablist" aria-label="Query tabs">
      <button
        v-for="tab in editorStore.tabs"
        :key="tab.id"
        class="group inline-flex items-center gap-2 px-3 h-7 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent rounded-t-md cursor-pointer whitespace-nowrap flex-shrink-0 relative transition-all ease-premium duration-normal"
        :class="{ 'bg-background text-foreground border-border border-b-transparent shadow-[0_-2px_0_0_var(--primary)_inset] font-medium': editorStore.activeTabId === tab.id }"
        role="tab"
        :aria-selected="editorStore.activeTabId === tab.id"
        :title="tab.name"
        @click="editorStore.selectTab(tab.id)"
      >
        <span class="max-w-[140px] overflow-hidden text-ellipsis">{{ tab.name }}</span>
        <span v-if="tab.isUnsaved" class="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 shadow-[0_0_4px_var(--primary)]" aria-label="Unsaved changes"></span>
        <div
          class="inline-flex items-center justify-center w-4 h-4 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent flex-shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          :class="{ 'opacity-100': tab.isUnsaved }"
          role="button"
          :aria-label="`Close tab ${tab.name}`"
          tabindex="0"
          @click.stop="editorStore.closeTab(tab.id)"
          @keydown.enter.stop="editorStore.closeTab(tab.id)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </div>
      </button>

      <button
        class="inline-flex items-center justify-center w-7 h-7 mb-0.5 rounded-md bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer flex-shrink-0 transition-colors"
        aria-label="Add new query tab (⌘T)"
        title="New tab ⌘T"
        @click="editorStore.addTab()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
      </button>
    </div>

    <!-- Right: Integrated Editor Controls (Format, Explain, Zoom) -->
    <div class="flex items-center gap-1 pl-2 flex-shrink-0">
      <Button
        variant="ghost"
        size="sm"
        class="text-[11px] h-6 px-2 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        title="Format SQL (⇧⌘F)"
        @click="$emit('format')"
      >
        <FileText class="w-3.5 h-3.5 opacity-70" />
        <span class="hidden sm:inline">Format</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="text-[11px] h-6 px-2 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        title="Explain Query Plan"
        @click="$emit('explain')"
      >
        <Search class="w-3.5 h-3.5 opacity-70" />
        <span class="hidden sm:inline">Explain</span>
      </Button>

      <div class="h-3.5 w-px bg-border/60 mx-1"></div>

      <!-- Compact Zoom Control Pill -->
      <div class="flex items-center gap-0.5 bg-background/50 border border-border/60 rounded-md p-0.5">
        <Button
          variant="ghost"
          size="icon"
          class="h-5 w-5 text-muted-foreground hover:text-foreground rounded transition-colors"
          title="Zoom Out (⌘-)"
          @click="editorStore.zoomOut()"
        >
          <Minus class="w-3 h-3" />
        </Button>
        <button
          class="text-[10px] font-mono px-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
          title="Reset Zoom (⌘0)"
          @click="editorStore.resetZoom()"
        >
          {{ editorStore.fontSize }}px
        </button>
        <Button
          variant="ghost"
          size="icon"
          class="h-5 w-5 text-muted-foreground hover:text-foreground rounded transition-colors"
          title="Zoom In (⌘+)"
          @click="editorStore.zoomIn()"
        >
          <Plus class="w-3 h-3" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from '../stores/editor'
import { Button } from '@/components/ui/button'
import { FileText, Search, Plus, Minus } from '@lucide/vue'

defineEmits<{
  format: []
  explain: []
}>()

const editorStore = useEditorStore()
</script>
