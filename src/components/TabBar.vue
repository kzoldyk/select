<template>
  <div class="flex items-center justify-between h-9 bg-muted/40 border-b border-border flex-shrink-0 px-2 select-none relative">
    <!-- Environment line indicator at the top -->
    <div 
      class="absolute top-0 left-0 right-0 h-[2px] transition-all duration-300"
      :style="{ backgroundColor: connectionColor }"
      :class="{ 'animate-pulse': isProd }"
    ></div>

    <!-- Left: Sidebar Toggle & Connection Manager & Tabs -->
    <div class="flex items-center h-full gap-2 min-w-0 flex-1">
      <!-- Toggle Sidebar -->
      <Button
        variant="ghost"
        size="icon"
        class="text-muted-foreground hover:text-foreground h-6 w-6 transition-colors ease-premium duration-normal rounded cursor-pointer"
        aria-label="Toggle sidebar"
        @click="uiStore.toggleSidebar()"
      >
        <PanelLeft class="w-3.5 h-3.5 opacity-80" />
      </Button>

      <!-- Connection Manager dropdown -->
      <button
        class="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all ease-premium duration-normal bg-transparent cursor-pointer border-none"
        aria-label="Open connection manager"
        @click="uiStore.openConnectionManager()"
      >
        <span 
          class="w-1.5 h-1.5 rounded-full flex-shrink-0"
          :class="{ 'shadow-[0_0_6px_currentColor]': connStore.status === 'connected' }"
          :style="{ backgroundColor: connectionColor, color: connectionColor }"
        ></span>
        <span class="text-foreground font-semibold">{{ connectionName }}</span>
        <ChevronDown class="w-2.5 h-2.5 opacity-50" />
      </button>

      <span
        v-if="envName"
        class="inline-flex items-center rounded px-1 py-0.2 text-[8px] font-bold tracking-wide uppercase leading-none select-none"
        :style="{ backgroundColor: `${connectionColor}20`, color: connectionColor }"
      >{{ envName }}</span>

      <!-- Divider -->
      <div class="h-4 w-px bg-border/60 mx-1"></div>

      <!-- Scrollable Tabs list & Add Tab button -->
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
          <span class="max-w-[120px] overflow-hidden text-ellipsis">{{ tab.name }}</span>
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
          class="inline-flex items-center justify-center w-6 h-6 mb-0.5 rounded bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer flex-shrink-0 transition-colors border-none"
          aria-label="Add new query tab (⌘T)"
          title="New tab ⌘T"
          @click="editorStore.addTab()"
        >
          <Plus class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Right: Integrated Controls (Search, Format, Explain, Zoom, Settings, Run) -->
    <div class="flex items-center gap-1.5 pl-2 flex-shrink-0">
      <!-- Search/Command Palette trigger -->
      <Button
        variant="ghost"
        size="icon"
        class="h-6 w-6 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
        title="Search commands (⌘K)"
        @click="uiStore.openPalette()"
      >
        <Search class="w-3.5 h-3.5" />
      </Button>

      <div class="h-3.5 w-px bg-border/60"></div>

      <Button
        variant="ghost"
        size="sm"
        class="text-[11px] h-6 px-2 gap-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
        title="Format SQL (⇧⌘F)"
        @click="$emit('format')"
      >
        <FileText class="w-3.5 h-3.5 opacity-70" />
        <span class="hidden md:inline">Format</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="text-[11px] h-6 px-2 gap-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
        title="Explain Query Plan"
        @click="$emit('explain')"
      >
        <Search class="w-3.5 h-3.5 opacity-70" />
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
          <Minus class="w-3 h-3" />
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
          <Plus class="w-3 h-3" />
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
        <Settings class="w-3.5 h-3.5" />
      </Button>

      <div class="h-3.5 w-px bg-border/60"></div>

      <!-- Run Button -->
      <Button 
        size="sm" 
        class="h-6.5 px-3 gap-1 text-[11px] font-semibold shadow-xs rounded active:scale-[0.97] transition-all cursor-pointer"
        title="Run Query (⌘Enter)"
        @click="$emit('run')"
      >
        <Play class="w-3 h-3 fill-current" />
        Run
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../stores/editor'
import { useUiStore } from '../stores/ui'
import { useConnectionStore } from '../stores/connection'
import { Button } from '@/components/ui/button'
import { 
  FileText, Search, Plus, Minus, PanelLeft, ChevronDown, Settings, Play 
} from '@lucide/vue'

defineEmits<{
  format: []
  explain: []
  run: []
}>()

const editorStore = useEditorStore()
const uiStore = useUiStore()
const connStore = useConnectionStore()

const connectionName = computed(() => connStore.activeConnection?.name ?? 'No connection')
const connectionColor = computed(() => connStore.activeConnection?.color ?? '#9CA3AF')

const isProd = computed(() => connStore.activeConnection?.color?.toUpperCase() === '#EF4444')

const envName = computed(() => {
  const color = connStore.activeConnection?.color?.toUpperCase()
  if (!color) return null
  switch (color) {
    case '#EF4444': return 'PROD'
    case '#F59E0B': return 'STAGING'
    case '#3B82F6': return 'DEV'
    case '#10B981': return 'DEV'
    case '#22C55E': return 'DEV'
    default: return null
  }
})
</script>
