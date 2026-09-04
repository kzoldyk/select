<template>
  <aside
    class="sidebar border-r border-border/80 flex flex-col overflow-hidden select-none font-mono text-xs"
    :class="{ 'w-0 border-r-0': !uiStore.sidebarOpen }"
    role="navigation"
    aria-label="Schema browser"
  >
    <!-- Top Database & Search Bar -->
    <div class="px-3 py-3 border-b border-border/80 flex flex-col gap-2 flex-shrink-0 bg-sidebar/95 z-10">
      <template v-if="connStore.status === 'connected'">
        <div class="flex items-center gap-1.5">
          <select
            v-if="schemaStore.databases?.length"
            class="flex h-7 w-full rounded-md border border-border/60 bg-background/50 px-2 py-1 text-[11px] font-mono text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-2xs cursor-pointer"
            aria-label="Select database"
            :value="connStore.activeConnection?.database"
            @change="async (e) => {
              await connStore.changeDatabase((e.target as HTMLSelectElement).value)
              await schemaStore.fetchDatabases(connStore.activeId ?? undefined)
              await schemaStore.refreshSchema(connStore.activeId ?? undefined)
            }"
          >
            <option value="" disabled>Select Database...</option>
            <option v-for="db in schemaStore.databases" :key="db" :value="db">{{ db }}</option>
          </select>
          <ActionTooltip text="Refresh schema (⇧⌘R)">
            <button
              class="flex items-center justify-center w-7 h-7 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground bg-background/50 border border-border/60 cursor-pointer flex-shrink-0 shadow-2xs transition-colors"
              :disabled="schemaStore.isLoading"
              aria-label="Refresh schema"
              @click="schemaStore.refreshSchema(connStore.activeId ?? undefined)"
            >
              <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': schemaStore.isLoading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </button>
          </ActionTooltip>
        </div>

        <div v-if="schemaStore.schemaError" class="p-2 bg-destructive/10 border border-destructive/20 rounded text-[10.5px] text-destructive flex items-center justify-between gap-1">
          <span class="truncate">{{ schemaStore.schemaError }}</span>
          <button
            class="px-1.5 py-0.5 bg-destructive/20 hover:bg-destructive/30 rounded text-[9.5px] font-semibold cursor-pointer border-none"
            @click="schemaStore.refreshSchema(connStore.activeId ?? undefined)"
          >
            Retry
          </button>
        </div>
      </template>

      <div v-else-if="connStore.status === 'connecting'" class="flex items-center justify-center gap-2 py-2 text-[11px] text-muted-foreground">
        <span class="w-3 h-3 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin"></span>
        Connecting…
      </div>
      <div v-else class="flex flex-col gap-1.5 py-1">
        <button
          class="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm cursor-pointer border-none"
          @click="uiStore.openConnectionManager()"
        >
          <PhPlug class="w-3.5 h-3.5" />
          <span>Connect to Database</span>
        </button>
      </div>

      <!-- Quick Search Filter -->
      <div class="relative">
        <PhMagnifyingGlass class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
        <input
          id="sidebar-search-input"
          class="flex h-7.5 w-full rounded-md border border-border/50 bg-background/40 pl-8 pr-2.5 py-1 text-[11.5px] text-foreground font-mono placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all shadow-2xs"
          type="text"
          placeholder="Filter objects… (⌘1)"
          aria-label="Filter schema objects"
          :value="schemaStore.searchQuery"
          @input="onSearch"
        />
      </div>
    </div>

    <!-- Scrollable Explorer Sections -->
    <ScrollArea class="flex-1">
      <div v-if="connStore.status !== 'connected' && connStore.status !== 'connecting' && !schemaStore.isLoading" class="px-3 pt-6">
        <EmptyState
          title="No database connected"
          description="Connect to query tables, inspect schemas, and view relationships."
        >
          <template #icon>
            <PhDatabase class="w-6 h-6 text-muted-foreground/50" />
          </template>
        </EmptyState>
      </div>

      <div v-else class="py-2 flex flex-col gap-1 px-2">
        <!-- WORKSPACE SECTION -->
        <div v-if="connStore.status === 'connected'" class="mb-2 flex flex-col">
          <div class="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center justify-between">
            <span>Workspace</span>
          </div>

          <button
            class="w-full flex items-center gap-2 px-2 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors border-none cursor-pointer text-left bg-transparent"
            @click="editorStore.addSchemaDiagramTab()"
          >
            <PhGitBranch class="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span class="flex-1 font-medium">Schema Diagram</span>
          </button>
        </div>

        <div class="h-px bg-border/40 my-1"></div>

        <!-- SCHEMA SECTION -->
        <div class="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground/60">
          Schema Objects
        </div>

        <!-- Tables -->
        <div v-if="connStore.status === 'connected' || schemaStore.tables.length || schemaStore.isLoading" class="flex flex-col">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10.5px] font-bold text-muted-foreground/80 hover:text-foreground hover:bg-sidebar-accent rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('tables')"
          >
            <PhCaretRight class="w-3.5 h-3.5 transition-transform duration-fast text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.tables }" />
            <PhTable class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span class="flex-1">Tables</span>
            <span class="text-[9px] font-mono font-semibold bg-background/50 px-1.5 py-0.2 rounded text-muted-foreground/80 border border-border/30">{{ schemaStore.tables.length }}</span>
          </button>
          
          <div v-show="sectionsOpen.tables" class="flex flex-col pl-2 mt-0.5 space-y-0.5">
            <div v-if="schemaStore.isLoading" class="px-4 py-2 space-y-1.5 opacity-60">
              <div class="h-3 bg-muted rounded w-3/4 animate-pulse"></div>
              <div class="h-3 bg-muted rounded w-5/6 animate-pulse"></div>
            </div>
            <template v-else-if="schemaStore.filteredTables.length">
              <button
                v-for="table in schemaStore.filteredTables"
                :key="table.name"
                class="w-full flex items-center gap-2 px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-fast bg-transparent border-none cursor-pointer text-left relative"
                :class="{ 'text-primary bg-primary/10 font-semibold': schemaStore.activeTable === table.name }"
                :title="table.name + ' — Alt+click to inspect'"
                @click="(e: MouseEvent) => e.altKey ? inspectTable(table.name) : openTableAsQuery(table.name)"
                @contextmenu.prevent="(e) => openCtxMenu(e, table.name, 'table')"
              >
                <div v-if="schemaStore.activeTable === table.name" class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-primary rounded-r"></div>
                <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ table.name }}</span>
                <span class="text-[9px] text-muted-foreground/60 font-mono flex-shrink-0">{{ formatCount(table.rowCount) }}</span>
              </button>
            </template>
            <div v-else class="px-4 py-1.5 text-[10.5px] text-muted-foreground/50">
              No matching tables
            </div>
          </div>
        </div>

        <!-- Views -->
        <div v-if="schemaStore.filteredViews.length || (schemaStore.views.length && !schemaStore.searchQuery)" class="flex flex-col">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10.5px] font-bold text-muted-foreground/80 hover:text-foreground hover:bg-sidebar-accent rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('views')"
          >
            <PhCaretRight class="w-3.5 h-3.5 transition-transform duration-fast text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.views }" />
            <PhEye class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span class="flex-1">Views</span>
            <span class="text-[9px] font-mono font-semibold bg-background/50 px-1.5 py-0.2 rounded text-muted-foreground/80 border border-border/30">{{ schemaStore.views.length }}</span>
          </button>
          
          <div v-show="sectionsOpen.views" class="flex flex-col pl-2 mt-0.5 space-y-0.5">
            <button
              v-for="view in schemaStore.filteredViews"
              :key="view.name"
              class="w-full flex items-center gap-2 px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-fast bg-transparent border-none cursor-pointer text-left truncate"
              :title="view.name"
              @click="openTableAsQuery(view.name)"
              @contextmenu.prevent="(e) => openCtxMenu(e, view.name, 'view')"
            >
              <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ view.name }}</span>
            </button>
          </div>
        </div>

        <!-- Functions -->
        <div v-if="schemaStore.filteredFunctions.length || (schemaStore.functions.length && !schemaStore.searchQuery)" class="flex flex-col">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10.5px] font-bold text-muted-foreground/80 hover:text-foreground hover:bg-sidebar-accent rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('functions')"
          >
            <PhCaretRight class="w-3.5 h-3.5 transition-transform duration-fast text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.functions }" />
            <PhLightning class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span class="flex-1">Functions</span>
            <span class="text-[9px] font-mono font-semibold bg-background/50 px-1.5 py-0.2 rounded text-muted-foreground/80 border border-border/30">{{ schemaStore.functions.length }}</span>
          </button>
          
          <div v-show="sectionsOpen.functions" class="flex flex-col pl-2 mt-0.5 space-y-0.5">
            <button
              v-for="fn in schemaStore.filteredFunctions"
              :key="fn.name"
              class="w-full flex items-center gap-2 px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-fast bg-transparent border-none cursor-pointer text-left truncate"
              :title="fn.name"
              @click="selectFunction(fn.name)"
              @contextmenu.prevent="(e) => openCtxMenu(e, fn.name, 'function')"
            >
              <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ fn.name }}</span>
            </button>
          </div>
        </div>

        <!-- Procedures -->
        <div v-if="schemaStore.filteredProcs.length || (schemaStore.procs.length && !schemaStore.searchQuery)" class="flex flex-col">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10.5px] font-bold text-muted-foreground/80 hover:text-foreground hover:bg-sidebar-accent rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('procs')"
          >
            <PhCaretRight class="w-3.5 h-3.5 transition-transform duration-fast text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.procs }" />
            <PhPlay class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span class="flex-1">Procedures</span>
            <span class="text-[9px] font-mono font-semibold bg-background/50 px-1.5 py-0.2 rounded text-muted-foreground/80 border border-border/30">{{ schemaStore.procs.length }}</span>
          </button>
          
          <div v-show="sectionsOpen.procs" class="flex flex-col pl-2 mt-0.5 space-y-0.5">
            <button
              v-for="proc in schemaStore.filteredProcs"
              :key="proc.name"
              class="w-full flex items-center gap-2 px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-fast bg-transparent border-none cursor-pointer text-left truncate"
              :title="proc.name"
              @click="selectProc(proc.name)"
              @contextmenu.prevent="(e) => openCtxMenu(e, proc.name, 'proc')"
            >
              <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ proc.name }}</span>
            </button>
          </div>
        </div>

        <!-- Indexes -->
        <div v-if="schemaStore.filteredIndexes.length || (schemaStore.indexes.length && !schemaStore.searchQuery)" class="flex flex-col">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10.5px] font-bold text-muted-foreground/80 hover:text-foreground hover:bg-sidebar-accent rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('indexes')"
          >
            <PhCaretRight class="w-3.5 h-3.5 transition-transform duration-fast text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.indexes }" />
            <PhHash class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span class="flex-1">Indexes</span>
            <span class="text-[9px] font-mono font-semibold bg-background/50 px-1.5 py-0.2 rounded text-muted-foreground/80 border border-border/30">{{ schemaStore.indexes.length }}</span>
          </button>
          
          <div v-show="sectionsOpen.indexes" class="flex flex-col pl-2 mt-0.5 space-y-0.5">
            <button
              v-for="idx in schemaStore.filteredIndexes"
              :key="idx.name"
              class="w-full flex items-center gap-2 px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-fast bg-transparent border-none cursor-pointer text-left truncate"
              :title="idx.name"
              @click="copyText(idx.name)"
            >
              <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ idx.name }}</span>
            </button>
          </div>
        </div>

        <!-- Saved Queries -->
        <div class="flex flex-col">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10.5px] font-bold text-muted-foreground/80 hover:text-foreground hover:bg-sidebar-accent rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('saved')"
          >
            <PhCaretRight class="w-3.5 h-3.5 transition-transform duration-fast text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.saved }" />
            <PhFileCode class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span class="flex-1">Saved Queries</span>
            <span class="text-[9px] font-mono font-semibold bg-background/50 px-1.5 py-0.2 rounded text-muted-foreground/80 border border-border/30">{{ editorStore.savedQueries?.length || 0 }}</span>
          </button>
          
          <div v-show="sectionsOpen.saved" class="flex flex-col pl-2 mt-0.5 space-y-0.5">
            <button
              v-for="sq in (editorStore.savedQueries || [])"
              :key="sq.id"
              class="w-full flex items-center gap-2 px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-fast bg-transparent border-none cursor-pointer text-left truncate"
              :title="sq.name"
              @click="editorStore.openSavedQuery(sq)"
              @contextmenu.prevent="(e) => openSQCtxMenu(e, sq)"
            >
              <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ sq.name }}</span>
            </button>
            <div v-if="!editorStore.savedQueries?.length" class="px-4 py-1.5 text-[10.5px] text-muted-foreground/50">
              No saved queries
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>

    <!-- Context Menus -->
    <Teleport to="body">
      <div
        v-if="ctxMenu.visible && !ctxMenu.isSavedQuery"
        class="fixed z-[9999] bg-popover border border-border/80 rounded-md shadow-xl py-1 min-w-[170px] text-xs font-mono select-none"
        :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
        @mouseleave="closeCtxMenu"
        @click.stop
      >
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left"
          @click="ctxAction('open')"
        >
          <PhArrowSquareOut class="w-3.5 h-3.5" /> Open Data
        </button>
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left"
          @click="ctxAction('inspect')"
        >
          <PhEye class="w-3.5 h-3.5" /> Inspect (⌘I)
        </button>
        <div class="h-px bg-border/60 my-1"></div>
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left"
          @click="ctxAction('copy')"
        >
          <PhCopy class="w-3.5 h-3.5" /> Copy Name
        </button>
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left"
          @click="ctxAction('ddl')"
        >
          <PhFileCode class="w-3.5 h-3.5" /> View DDL
        </button>
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left"
          @click="ctxAction('visualize')"
        >
          <PhGitBranch class="w-3.5 h-3.5 text-indigo-400" /> Visualize Relations
        </button>
      </div>

      <div
        v-if="ctxMenu.visible && ctxMenu.isSavedQuery"
        class="fixed z-[9999] bg-popover border border-border/80 rounded-md shadow-xl py-1 min-w-[160px] text-xs font-mono select-none"
        :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
        @mouseleave="closeCtxMenu"
        @click.stop
      >
        <button class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left" @click="ctxSqAction('rename')">
          <PhPencil class="w-3.5 h-3.5" /> Rename
        </button>
        <button class="w-full flex items-center gap-2 px-3 py-1.5 text-red-500 hover:bg-red-500/10 cursor-pointer border-none bg-transparent text-left" @click="ctxSqAction('delete')">
          <PhTrash class="w-3.5 h-3.5" /> Delete
        </button>
      </div>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { reactive, onMounted, onUnmounted, watch } from 'vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import EmptyState from '@/components/ui/EmptyState.vue'
import { ActionTooltip } from '@/components/ui/tooltip'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'vue-sonner'
import {
  PhMagnifyingGlass, PhCaretRight, PhTable, PhEye, PhLightning, PhHash,
  PhPlay, PhFileCode, PhGitBranch, PhPlug, PhDatabase,
  PhCopy, PhArrowSquareOut, PhPencil, PhTrash
} from '@phosphor-icons/vue'
import { useSchemaStore } from '../stores/schema'
import { useConnectionStore } from '../stores/connection'
import { useUiStore } from '../stores/ui'
import { useEditorStore, type SavedQuery } from '../stores/editor'
import { useResultStore } from '../stores/result'

const schemaStore = useSchemaStore()
const connStore = useConnectionStore()
const uiStore = useUiStore()
const editorStore = useEditorStore()
const resultStore = useResultStore()

watch(() => connStore.status, async (status) => {
  if (status === 'connected') {
    await schemaStore.fetchDatabases()
    await schemaStore.refreshSchema(connStore.activeId ?? undefined)
  }
}, { immediate: true })

onMounted(() => {
  editorStore.restoreTabState()
  editorStore.loadSavedQueries()
})

const sectionsOpen = reactive({
  tables: true,
  views: false,
  functions: false,
  indexes: false,
  procs: false,
  triggers: false,
  saved: false,
})

function toggle(section: keyof typeof sectionsOpen) {
  sectionsOpen[section] = !sectionsOpen[section]
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return String(n)
}

function quoteSqlIdentifier(name: string): string {
  return `\`${name.replace(/`/g, '``')}\``
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearch(e: Event) {
  const val = (e.target as HTMLInputElement).value
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => schemaStore.setSearchQuery(val), 120)
}

// Unified Table Click -> Open Query Workflow
function openTableAsQuery(name: string) {
  schemaStore.setActiveTable(name)
  const quoted = quoteSqlIdentifier(name)
  const query = `SELECT *\nFROM ${quoted}\nLIMIT 100;`

  let tab = editorStore.tabs.find(t => t.name === name)
  if (!tab) {
    const tabId = editorStore.addTab()
    tab = editorStore.tabs.find(t => t.id === tabId)
    if (tab) {
      tab.name = name
      tab.sql = query
    }
  } else {
    editorStore.selectTab(tab.id)
  }

  resultStore.runQuery(query)
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
  toast.success(`Copied "${text}"`)
}

async function selectProc(name: string) {
  try {
    const connId = connStore.activeId
    const sql = `SHOW CREATE PROCEDURE ${quoteSqlIdentifier(name)};`
    const result = await invoke<any>('run_query_paged', { sql, limit: 1, offset: 0, id: connId })
    if (result?.rows?.[0]) {
      const row = result.rows[0]
      const key = Object.keys(row).find(k => k.toLowerCase().includes('create procedure') || k.toLowerCase().includes('definition'))
      if (key && row[key]) {
        openQueryTab(name, row[key])
        return
      }
    }
    openQueryTab(name, sql)
  } catch {
    openQueryTab(name, `SHOW CREATE PROCEDURE ${quoteSqlIdentifier(name)};`)
  }
}

async function selectFunction(name: string) {
  try {
    const connId = connStore.activeId
    const sql = `SHOW CREATE FUNCTION ${quoteSqlIdentifier(name)};`
    const result = await invoke<any>('run_query_paged', { sql, limit: 1, offset: 0, id: connId })
    if (result?.rows?.[0]) {
      const row = result.rows[0]
      const key = Object.keys(row).find(k => k.toLowerCase().includes('create function') || k.toLowerCase().includes('definition'))
      if (key && row[key]) {
        openQueryTab(name, row[key])
        return
      }
    }
    openQueryTab(name, sql)
  } catch {
    openQueryTab(name, `SHOW CREATE FUNCTION ${quoteSqlIdentifier(name)};`)
  }
}

function openQueryTab(name: string, sql: string) {
  const tabId = editorStore.addTab()
  const tab = editorStore.tabs.find(t => t.id === tabId)
  if (tab) {
    tab.name = name
    tab.sql = sql
    editorStore.selectTab(tabId)
    toast.success(`Loaded definition for "${name}"`)
  }
}

// Context Menu
const ctxMenu = reactive({ visible: false, x: 0, y: 0, target: '', objectType: 'table', isSavedQuery: false, savedQueryId: '' })

function openCtxMenu(e: MouseEvent, name: string, objectType = 'table') {
  ctxMenu.visible = true
  ctxMenu.target = name
  ctxMenu.objectType = objectType
  ctxMenu.x = e.clientX
  ctxMenu.y = e.clientY
  ctxMenu.isSavedQuery = false
}

function openSQCtxMenu(e: MouseEvent, sq: SavedQuery) {
  ctxMenu.visible = true
  ctxMenu.target = sq.name
  ctxMenu.savedQueryId = sq.id
  ctxMenu.x = e.clientX
  ctxMenu.y = e.clientY
  ctxMenu.isSavedQuery = true
}

function closeCtxMenu() { ctxMenu.visible = false }

function inspectTable(name: string) {
  schemaStore.setActiveTable(name)
  uiStore.openInspector(name)
}

function ctxAction(action: string) {
  const name = ctxMenu.target
  closeCtxMenu()
  switch (action) {
    case 'open': openTableAsQuery(name); break
    case 'inspect': inspectTable(name); break
    case 'copy': copyText(name); break
    case 'ddl': schemaStore.setActiveTable(name); uiStore.openInspector(name); break
    case 'visualize': editorStore.addSchemaDiagramTab(name); break
  }
}

function ctxSqAction(action: string) {
  const id = ctxMenu.savedQueryId
  closeCtxMenu()
  if (action === 'delete') {
    editorStore.dropSavedQuery(id)
    toast.success('Deleted query')
  }
}

function handleDocClick(e: MouseEvent) {
  if (ctxMenu.visible && !(e.target as HTMLElement)?.closest('.sidebar')) {
    closeCtxMenu()
  }
}

onMounted(() => document.addEventListener('click', handleDocClick))
onUnmounted(() => {
  document.removeEventListener('click', handleDocClick)
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
.sidebar {
  transition: opacity 180ms cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
}
.sidebar.w-0 { opacity: 0; border-right: none; pointer-events: none; }
</style>
