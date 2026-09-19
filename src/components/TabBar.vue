<template>
  <div class="flex items-center justify-between h-9 chrome-bar border-b border-border/80 flex-shrink-0 px-2 select-none">
    <!-- Left: Sidebar Toggle & Scrollable Tabs -->
    <div class="flex items-center h-full gap-2 min-w-0 flex-1">
      <!-- Toggle Sidebar Button -->
      <ActionTooltip text="Toggle Sidebar (⌘B)">
        <Button
          variant="ghost"
          size="icon"
          class="text-muted-foreground hover:text-foreground h-6.5 w-6.5 transition-colors rounded cursor-pointer"
          aria-label="Toggle sidebar"
          @click="uiStore.toggleSidebar()"
        >
          <PhSidebar class="w-3.5 h-3.5 opacity-80" />
        </Button>
      </ActionTooltip>

      <div class="h-4 w-px bg-border/60 mx-0.5"></div>

      <!-- Scrollable Tabs list & Add Tab button -->
      <div class="flex items-end h-full overflow-x-auto overflow-y-hidden gap-1 pt-1 min-w-0 flex-1" role="tablist" aria-label="Query tabs">
        <div
          v-for="tab in editorStore.tabs"
          :key="tab.id"
          class="group inline-flex items-center gap-2 px-3 h-7 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/40 border border-transparent rounded-t-md cursor-pointer whitespace-nowrap flex-shrink-0 relative transition-[color,background,box-shadow] duration-fast ease-premium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
          :class="{
            'bg-background text-foreground border-border border-b-transparent font-medium shadow-[inset_0_-2px_0_0_var(--primary)]': editorStore.activeTabId === tab.id,
          }"
          role="tab"
          tabindex="0"
          :aria-selected="editorStore.activeTabId === tab.id"
          :title="tab.name"
          @click="editorStore.selectTab(tab.id)"
          @keydown.enter.space.prevent="editorStore.selectTab(tab.id)"
          @auxclick.stop="editorStore.closeTab(tab.id)"
          @contextmenu.prevent="openTabCtxMenu($event, tab)"
        >
          <component 
            :is="getTabIcon(tab)" 
            class="w-3.5 h-3.5 opacity-70 flex-shrink-0"
            :class="{ 'text-amber-400 opacity-90': isNotebookTab(tab) }"
          />
          <span class="max-w-[140px] overflow-hidden text-ellipsis">{{ tab.name }}</span>
          
          <!-- Unsaved Dirty Dot -->
          <span v-if="tab.isUnsaved" class="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" title="Unsaved changes"></span>

          <!-- Close Tab Button -->
          <button
            type="button"
            class="inline-flex items-center justify-center w-4 h-4 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent flex-shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity border-none bg-transparent p-0"
            :class="{ 'opacity-100': tab.isUnsaved }"
            :aria-label="`Close tab ${tab.name}`"
            @click.stop="editorStore.closeTab(tab.id)"
          >
            <PhX class="w-3 h-3" />
          </button>
        </div>

        <!-- New Tab Button with Format Chooser Menu -->
        <div class="relative flex-shrink-0">
          <ActionTooltip text="New Tab (Click to choose format)">
            <button
              class="inline-flex items-center justify-center w-6 h-6 mb-0.5 rounded bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer flex-shrink-0 transition-colors border-none"
              aria-label="Add new tab"
              @click.stop="toggleNewTabMenu"
            >
              <PhPlus class="w-3.5 h-3.5" />
            </button>
          </ActionTooltip>

          <!-- Format Chooser Menu (Teleported to avoid overflow-y-hidden clipping) -->
          <Teleport to="body">
            <div
              v-if="newTabMenuOpen"
              class="fixed z-[9999] bg-popover border border-border/90 rounded-md shadow-xl py-1 min-w-[200px] text-xs font-sans select-none"
              :style="{ top: newTabMenuPos.y + 'px', left: newTabMenuPos.x + 'px' }"
              @click.stop
            >
              <button
                type="button"
                class="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent cursor-pointer border-none bg-transparent text-left text-foreground text-xs transition-colors"
                @click="createNewTab('sql')"
              >
                <PhFileCode class="w-4 h-4 text-primary shrink-0" />
                <div class="flex flex-col flex-1 min-w-0">
                  <span class="font-medium text-[12px]">SQL Query</span>
                  <span class="text-[10px] text-muted-foreground">Standard .sql file</span>
                </div>
                <span class="text-[10px] text-muted-foreground/60 font-mono">⌘T</span>
              </button>

              <div class="h-px bg-border/60 my-1"></div>

              <button
                type="button"
                class="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent cursor-pointer border-none bg-transparent text-left text-foreground text-xs transition-colors"
                @click="createNewTab('notebook')"
              >
                <PhNotebook class="w-4 h-4 text-amber-400 shrink-0" />
                <div class="flex flex-col flex-1 min-w-0">
                  <span class="font-medium text-[12px]">Markdown Note</span>
                  <span class="text-[10px] text-muted-foreground">Notion notes & SQL snippets</span>
                </div>
                <span class="text-[10px] text-muted-foreground/60 font-mono">⌘N</span>
              </button>
            </div>
          </Teleport>
        </div>
      </div>
    </div>

    <!-- Right: Command Palette, Format, Explain & Run Action -->
    <div class="flex items-center gap-1.5 pl-2 flex-shrink-0">
      <!-- Command Palette trigger -->
      <ActionTooltip text="Command Palette (⌘K)">
        <Button
          variant="ghost"
          size="icon"
          class="h-6.5 w-6.5 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
          aria-label="Command palette"
          @click="uiStore.openPalette()"
        >
          <PhMagnifyingGlass class="w-3.5 h-3.5" />
        </Button>
      </ActionTooltip>

      <!-- Format SQL Button -->
      <ActionTooltip text="Format SQL (⇧⌘F)">
        <Button
          variant="ghost"
          size="icon"
          class="h-6.5 w-6.5 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
          aria-label="Format SQL"
          @click="$emit('format')"
        >
          <PhMagicWand class="w-3.5 h-3.5" />
        </Button>
      </ActionTooltip>

      <!-- Explain Query Plan Button -->
      <ActionTooltip text="Explain Query Plan (⌘E)">
        <Button
          variant="ghost"
          size="icon"
          class="h-6.5 w-6.5 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
          aria-label="Explain Query Plan"
          @click="$emit('explain')"
        >
          <PhTreeStructure class="w-3.5 h-3.5" />
        </Button>
      </ActionTooltip>

      <!-- Toggle Results Panel Button -->
      <ActionTooltip text="Toggle Results Panel (⌘J)">
        <Button
          variant="ghost"
          size="icon"
          class="h-6.5 w-6.5 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
          :class="{ 'text-foreground bg-accent/60': uiStore.resultPanelOpen }"
          aria-label="Toggle Results Panel"
          @click="uiStore.toggleResultPanel()"
        >
          <PhTable class="w-3.5 h-3.5" />
        </Button>
      </ActionTooltip>

      <div class="h-4 w-px bg-border/60 mx-0.5"></div>

      <!-- Run / Cancel Button -->
      <template v-if="resultStore.status === 'running'">
        <Button
          size="sm"
          variant="destructive"
          class="h-6.5 px-3 gap-1.5 text-[11px] font-semibold rounded-md shadow-sm transition-all cursor-pointer animate-pulse"
          aria-label="Cancel Running Query"
          :disabled="resultStore.cancelling"
          @click="resultStore.cancelQuery()"
        >
          <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span>{{ resultStore.cancelling ? 'Cancelling…' : 'Cancel' }}</span>
        </Button>
      </template>
      <template v-else>
        <ActionTooltip text="Run Query (⌘↵)">
          <Button 
            size="sm" 
            class="h-6.5 px-3 gap-1.5 text-[11px] font-semibold rounded-md shadow-sm active:scale-[0.97] transition-[transform,box-shadow] duration-fast ease-premium cursor-pointer ring-1 ring-primary/20 hover:shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_35%,transparent)]"
            aria-label="Run Query"
            @click="$emit('run')"
          >
            <PhPlay class="w-3 h-3 fill-current" weight="fill" />
            <span>Run</span>
          </Button>
        </ActionTooltip>
      </template>
    </div>

    <!-- Tab Context Menu -->
    <Teleport to="body">
      <div
        v-if="tabCtxMenu.visible && tabCtxMenu.tab"
        class="fixed z-[9999] bg-popover border border-border/80 rounded-md shadow-xl py-1 min-w-[170px] text-xs font-mono select-none"
        :style="{ top: tabCtxMenu.y + 'px', left: tabCtxMenu.x + 'px' }"
        @click.stop
      >
        <template v-if="tabCtxMenu.tab.type === 'query' || !tabCtxMenu.tab.type">
          <button
            v-if="isNotebookTab(tabCtxMenu.tab)"
            class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left text-muted-foreground hover:text-foreground text-[11px]"
            @click="ctxConvertToSql"
          >
            <PhFileCode class="w-3.5 h-3.5 text-primary" />
            <span>Convert to SQL</span>
          </button>
          <button
            v-else
            class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left text-muted-foreground hover:text-foreground text-[11px]"
            @click="ctxConvertToNotebook"
          >
            <PhNotebook class="w-3.5 h-3.5 text-amber-500" />
            <span>Convert to Notebook</span>
          </button>
          <div class="h-px bg-border/60 my-1"></div>
        </template>

        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left text-muted-foreground hover:text-foreground text-[11px]"
          @click="ctxCloseTab"
        >
          <PhX class="w-3.5 h-3.5" />
          <span>Close Tab</span>
        </button>
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left text-muted-foreground hover:text-foreground text-[11px]"
          @click="ctxCloseOtherTabs"
        >
          <span>Close Other Tabs</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useEditorStore, type Tab } from '../stores/editor'
import { useUiStore } from '../stores/ui'
import { useResultStore } from '../stores/result'
import { Button } from '@/components/ui/button'
import { ActionTooltip } from '@/components/ui/tooltip'
import { 
  PhSidebar, PhPlus, PhMagnifyingGlass, PhMagicWand, PhTreeStructure, PhPlay, PhX,
  PhTable, PhFileCode, PhGitBranch, PhNotebook
} from '@phosphor-icons/vue'
import { detectDocumentFormat } from '../lib/sqlExtract'

defineEmits<{
  format: []
  explain: []
  run: []
}>()

const editorStore = useEditorStore()
const uiStore = useUiStore()
const resultStore = useResultStore()

function isNotebookTab(tab: Tab | null): boolean {
  if (!tab || tab.type === 'table' || tab.type === 'schema_diagram') return false
  return tab.format === 'notebook' || detectDocumentFormat(tab.sql) === 'notebook'
}

function getTabIcon(tab: Tab) {
  if (tab.type === 'table') return PhTable
  if (tab.type === 'schema_diagram') return PhGitBranch
  return isNotebookTab(tab) ? PhNotebook : PhFileCode
}

const tabCtxMenu = ref<{
  visible: boolean
  x: number
  y: number
  tab: Tab | null
}>({
  visible: false,
  x: 0,
  y: 0,
  tab: null,
})

function openTabCtxMenu(e: MouseEvent, tab: Tab) {
  tabCtxMenu.value = {
    visible: true,
    x: Math.min(e.clientX, window.innerWidth - 180),
    y: e.clientY + 4,
    tab,
  }
}

function closeTabCtxMenu() {
  tabCtxMenu.value.visible = false
  tabCtxMenu.value.tab = null
}

function ctxConvertToSql() {
  if (tabCtxMenu.value.tab) {
    editorStore.convertTabToSql(tabCtxMenu.value.tab.id)
  }
  closeTabCtxMenu()
}

function ctxConvertToNotebook() {
  if (tabCtxMenu.value.tab) {
    editorStore.convertTabToNotebook(tabCtxMenu.value.tab.id)
  }
  closeTabCtxMenu()
}

function ctxCloseTab() {
  if (tabCtxMenu.value.tab) {
    editorStore.closeTab(tabCtxMenu.value.tab.id)
  }
  closeTabCtxMenu()
}

function ctxCloseOtherTabs() {
  if (tabCtxMenu.value.tab) {
    const keepId = tabCtxMenu.value.tab.id
    const toClose = editorStore.tabs.filter(t => t.id !== keepId)
    for (const t of toClose) {
      const closed = editorStore.closeTab(t.id)
      if (!closed) break
    }
  }
  closeTabCtxMenu()
}

const newTabMenuOpen = ref(false)
const newTabMenuPos = ref({ x: 0, y: 0 })

function toggleNewTabMenu(e: MouseEvent) {
  const btn = (e.currentTarget as HTMLElement).getBoundingClientRect()
  newTabMenuPos.value = {
    x: Math.min(btn.left, window.innerWidth - 210),
    y: btn.bottom + 4,
  }
  newTabMenuOpen.value = !newTabMenuOpen.value
}

function createNewTab(format: 'sql' | 'notebook') {
  newTabMenuOpen.value = false
  if (format === 'notebook') {
    editorStore.addNotebookTab()
  } else {
    editorStore.addTab()
  }
}

function handleGlobalClick() {
  newTabMenuOpen.value = false
  closeTabCtxMenu()
}

onMounted(() => {
  window.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick)
})
</script>
