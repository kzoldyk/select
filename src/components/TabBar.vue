<template>
  <div class="flex items-center justify-between h-9 bg-muted/40 border-b border-border flex-shrink-0 px-2 select-none">
    <!-- Left: Sidebar Toggle & Tabs -->
    <div class="flex items-center h-full gap-2 min-w-0 flex-1">
      <!-- Toggle Sidebar Button -->
      <Button
        variant="ghost"
        size="icon"
        class="text-muted-foreground hover:text-foreground h-6 w-6 transition-colors rounded cursor-pointer"
        aria-label="Toggle sidebar"
        @click="uiStore.toggleSidebar()"
      >
        <PhSidebar class="w-3.5 h-3.5 opacity-80" />
      </Button>

      <!-- Divider -->
      <div class="h-4 w-px bg-border/60 mx-0.5"></div>

      <!-- Scrollable Tabs list & Add Tab button -->
      <div class="flex items-end h-full overflow-x-auto overflow-y-hidden gap-1 pt-1 min-w-0 flex-1" role="tablist" aria-label="Query tabs">
        <button
          v-for="tab in editorStore.tabs"
          :key="tab.id"
          class="group inline-flex items-center gap-2 px-3 h-7 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent rounded-t-md cursor-pointer whitespace-nowrap flex-shrink-0 relative transition-all"
          :class="{ 'bg-background text-foreground border-border border-b-transparent font-medium shadow-xs': editorStore.activeTabId === tab.id }"
          role="tab"
          :aria-selected="editorStore.activeTabId === tab.id"
          :title="tab.name"
          @click="editorStore.selectTab(tab.id)"
        >
          <component 
            :is="tab.type === 'table' ? PhTable : (tab.type === 'schema_diagram' ? PhGitBranch : PhFileCode)" 
            class="w-3.5 h-3.5 opacity-70 flex-shrink-0"
          />
          <span class="max-w-[120px] overflow-hidden text-ellipsis">{{ tab.name }}</span>
          <span v-if="tab.isUnsaved" class="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" aria-label="Unsaved changes"></span>
          <div
            class="inline-flex items-center justify-center w-4 h-4 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent flex-shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
            :class="{ 'opacity-100': tab.isUnsaved }"
            role="button"
            :aria-label="`Close tab ${tab.name}`"
            tabindex="0"
            @click.stop="editorStore.closeTab(tab.id)"
            @keydown.enter.stop="editorStore.closeTab(tab.id)"
          >
            <PhX class="w-3 h-3" />
          </div>
        </button>

        <button
          class="inline-flex items-center justify-center w-6 h-6 mb-0.5 rounded bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer flex-shrink-0 transition-colors border-none"
          aria-label="Add new query tab (⌘T)"
          title="New tab (⌘T)"
          @click="editorStore.addTab()"
        >
          <PhPlus class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Right: Integrated Controls (Command Palette, Format, Explain, Zoom, Settings, Run) -->
    <div class="flex items-center gap-1.5 pl-2 flex-shrink-0">
      <!-- Search/Command Palette trigger -->
      <Button
        variant="ghost"
        size="icon"
        class="h-6 w-6 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
        title="Search commands (⌘K)"
        @click="uiStore.openPalette()"
      >
        <PhMagnifyingGlass class="w-3.5 h-3.5" />
      </Button>

      <div class="h-3.5 w-px bg-border/60"></div>

      <Button
        variant="ghost"
        size="sm"
        class="text-[11px] h-6 px-2 gap-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
        title="Format SQL (⇧⌘F)"
        @click="$emit('format')"
      >
        <PhCode class="w-3.5 h-3.5 opacity-70" />
        <span class="hidden md:inline">Format</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="text-[11px] h-6 px-2 gap-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
        title="Explain Query Plan"
        @click="$emit('explain')"
      >
        <PhFileText class="w-3.5 h-3.5 opacity-70" />
        <span class="hidden md:inline">Explain</span>
      </Button>

      <div class="h-3.5 w-px bg-border/60"></div>

      <!-- Compact Zoom Control Pill -->
      <div class="flex items-center gap-0.5 bg-background/50 border border-border/60 rounded p-0.5">
        <Button
          variant="ghost"
          size="icon"
          class="h-5 w-5 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
          title="Zoom Out (⌘-)"
          @click="editorStore.zoomOut()"
        >
          <PhMinus class="w-3 h-3" />
        </Button>
        <button
          class="text-[9px] font-mono px-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer border-none bg-transparent"
          title="Reset Zoom (⌘0)"
          @click="editorStore.resetZoom()"
        >
          {{ editorStore.fontSize }}px
        </button>
        <Button
          variant="ghost"
          size="icon"
          class="h-5 w-5 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
          title="Zoom In (⌘+)"
          @click="editorStore.zoomIn()"
        >
          <PhPlus class="w-3 h-3" />
        </Button>
      </div>

      <div class="h-3.5 w-px bg-border/60"></div>

      <!-- Settings button -->
      <Button
        variant="ghost"
        size="icon"
        class="h-6 w-6 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
        title="Open Settings"
        @click="uiStore.openSettings()"
      >
        <PhGear class="w-3.5 h-3.5" />
      </Button>

      <div class="h-3.5 w-px bg-border/60"></div>

      <!-- Run Button -->
      <Button 
        size="sm" 
        class="h-6.5 px-3 gap-1 text-[11px] font-semibold shadow-xs rounded active:scale-[0.97] transition-all cursor-pointer"
        title="Run Query (⌘Enter)"
        @click="$emit('run')"
      >
        <PhPlay class="w-3 h-3 fill-current" />
        Run
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from '../stores/editor'
import { useUiStore } from '../stores/ui'
import { Button } from '@/components/ui/button'
import { 
  PhSidebar, PhPlus, PhMinus, PhMagnifyingGlass, PhCode, PhFileText, PhGear, PhPlay, PhX,
  PhTable, PhFileCode, PhGitBranch
} from '@phosphor-icons/vue'

defineEmits<{
  format: []
  explain: []
  run: []
}>()

const editorStore = useEditorStore()
const uiStore = useUiStore()
</script>
