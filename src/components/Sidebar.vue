<template>
  <aside
    class="sidebar border-r border-border bg-muted/30 flex flex-col overflow-hidden"
    :class="{ 'w-0 border-r-0': !uiStore.sidebarOpen }"
    role="navigation"
    aria-label="Schema browser"
  >
    <div class="p-2 border-b border-border flex flex-col gap-1.5 flex-shrink-0">
      <template v-if="connStore.status === 'connected'">
        <select
          v-if="schemaStore.databases.length"
          class="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Select database"
          :value="connStore.activeConnection?.database"
          @change="async (e) => {
            await connStore.changeDatabase((e.target as HTMLSelectElement).value)
            await schemaStore.refreshSchema(connStore.activeId ?? undefined)
          }"
        >
          <option value="" disabled>Select Database...</option>
          <option v-for="db in schemaStore.databases" :key="db" :value="db">{{ db }}</option>
        </select>

        <select
          v-if="schemaStore.databases.length"
          class="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Select schema"
          :disabled="connStore.activeConnection?.dbType === 'mysql'"
        >
          <option v-if="connStore.activeConnection?.dbType === 'mysql'" value="def">MySQL (Schema = DB)</option>
          <option v-else value="public">public</option>
        </select>

        <div v-if="!schemaStore.databases.length" class="text-[10px] text-muted-foreground text-center py-1">
          Loading databases...
        </div>
      </template>

      <div v-else-if="connStore.status === 'connecting'" class="text-[10px] text-muted-foreground text-center py-1">
        Connecting...
      </div>
      <div v-else-if="connStore.status === 'error'" class="text-[10px] text-red-500 text-center py-1">
        Connection error
      </div>
      <div v-else class="text-[10px] text-muted-foreground text-center py-1">
        No active connection
      </div>

      <input
        class="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        type="text"
        placeholder="Search tables\u2026"
        aria-label="Search tables"
        :value="schemaStore.searchQuery"
        @input="onSearch"
      />
    </div>

    <ScrollArea class="flex-1">
      <div class="py-1">
        <div v-if="schemaStore.filteredTables.length" class="mb-0.5">
          <button
            class="w-full flex items-center gap-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
            @click="toggle('tables')"
          >
            <ChevronRight class="w-3 h-3 transition-transform" :class="{ 'rotate-90': sectionsOpen.tables }" />
            <span class="flex-1 text-left">Tables</span>
            <span class="text-[9px] text-muted-foreground">{{ schemaStore.tables.length }}</span>
          </button>
          <template v-if="sectionsOpen.tables">
            <button
              v-for="table in schemaStore.filteredTables"
              :key="table.name"
              class="w-full flex items-center gap-1.5 px-2 py-0.5 pl-7 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent border-l-2 border-transparent transition-colors bg-transparent border-none cursor-pointer text-left"
              :class="{ 'text-foreground bg-accent border-l-primary': schemaStore.activeTable === table.name }"
              :title="table.name"
              @click="selectTable(table.name)"
              @contextmenu.prevent="(e) => openCtxMenu(e, table.name)"
            >
              <svg class="w-3 h-3 flex-shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
              <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ table.name }}</span>
              <span class="text-[9px] text-muted-foreground bg-muted border border-border rounded px-1 font-mono flex-shrink-0">{{ formatCount(table.rowCount) }}</span>
            </button>
          </template>
        </div>

        <div v-if="schemaStore.filteredViews.length" class="mb-0.5">
          <button
            class="w-full flex items-center gap-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
            @click="toggle('views')"
          >
            <ChevronRight class="w-3 h-3 transition-transform" :class="{ 'rotate-90': sectionsOpen.views }" />
            <span class="flex-1 text-left">Views</span>
            <span class="text-[9px] text-muted-foreground">{{ schemaStore.views.length }}</span>
          </button>
          <template v-if="sectionsOpen.views">
            <button
              v-for="view in schemaStore.filteredViews"
              :key="view.name"
              class="w-full flex items-center gap-1.5 px-2 py-0.5 pl-7 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer text-left"
              :title="view.name"
              @click="selectTable(view.name)"
              @contextmenu.prevent="(e) => openCtxMenu(e, view.name)"
            >
              <svg class="w-3 h-3 text-amber-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ view.name }}</span>
            </button>
          </template>
        </div>

        <div v-if="schemaStore.filteredFunctions.length" class="mb-0.5">
          <button class="w-full flex items-center gap-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer" @click="toggle('functions')">
            <ChevronRight class="w-3 h-3 transition-transform" :class="{ 'rotate-90': sectionsOpen.functions }" />
            <span class="flex-1 text-left">Functions</span>
            <span class="text-[9px] text-muted-foreground">{{ schemaStore.functions.length }}</span>
          </button>
        </div>

        <div v-if="schemaStore.filteredIndexes.length" class="mb-0.5">
          <button class="w-full flex items-center gap-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer" @click="toggle('indexes')">
            <ChevronRight class="w-3 h-3 transition-transform" :class="{ 'rotate-90': sectionsOpen.indexes }" />
            <span class="flex-1 text-left">Indexes</span>
            <span class="text-[9px] text-muted-foreground">{{ schemaStore.indexes.length }}</span>
          </button>
        </div>

        <div class="mb-0.5">
          <button
            class="w-full flex items-center gap-1 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
            @click="toggle('saved')"
          >
            <ChevronRight class="w-3 h-3 transition-transform" :class="{ 'rotate-90': sectionsOpen.saved }" />
            <span class="flex-1 text-left">Saved Queries</span>
            <span class="text-[9px] text-muted-foreground">{{ editorStore.savedQueries.length }}</span>
          </button>
          <template v-if="sectionsOpen.saved">
            <button
              v-for="sq in editorStore.savedQueries"
              :key="sq.id"
              class="w-full flex items-center gap-1.5 px-2 py-0.5 pl-7 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer text-left border-l-2 border-transparent transition-colors"
              :title="sq.name"
              @click="editorStore.openSavedQuery(sq)"
              @contextmenu.prevent="(e) => openSQCtxMenu(e, sq)"
            >
              <FileText class="w-3 h-3 flex-shrink-0 text-primary/70" />
              <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ sq.name }}</span>
            </button>
            <div v-if="!editorStore.savedQueries.length" class="px-7 py-1 text-[10px] text-muted-foreground">
              No saved queries
            </div>
          </template>
        </div>
      </div>
    </ScrollArea>

    <Teleport to="body">
      <div
        v-if="ctxMenu.visible && !ctxMenu.isSavedQuery"
        class="fixed z-[9999] bg-popover border border-border rounded-md shadow-lg py-1 min-w-[160px]"
        :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
        role="menu"
        @mouseleave="closeCtxMenu"
      >
        <button class="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer text-left" role="menuitem" @click="ctxAction('open')"><ExternalLink class="w-3 h-3" /> Open in new tab</button>
        <button class="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer text-left" role="menuitem" @click="ctxAction('copy')"><Copy class="w-3 h-3" /> Copy name</button>
        <button class="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer text-left" role="menuitem" @click="ctxAction('ddl')"><FileText class="w-3 h-3" /> View DDL</button>
      </div>
      <div
        v-if="ctxMenu.visible && ctxMenu.isSavedQuery"
        class="fixed z-[9999] bg-popover border border-border rounded-md shadow-lg py-1 min-w-[160px]"
        :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
        role="menu"
        @mouseleave="closeCtxMenu"
      >
        <button class="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer text-left" role="menuitem" @click="ctxSqAction('rename')"><Edit class="w-3 h-3" /> Rename</button>
        <button class="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-500 hover:bg-red-500/10 bg-transparent border-none cursor-pointer text-left" role="menuitem" @click="ctxSqAction('delete')"><Trash2 class="w-3 h-3" /> Delete</button>
      </div>
    </Teleport>

    <Dialog :open="renameDialog.open" @update:open="renameDialog.open = false">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename Query</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="doRename" class="flex flex-col gap-4">
          <div class="grid gap-2">
            <Label for="rename-name">New name</Label>
            <Input id="rename-name" ref="renameInput" v-model="renameDialog.name" class="w-full" @keydown.enter.prevent="doRename" />
          </div>
          <div class="flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" @click="renameDialog.open = false">Cancel</Button>
            <Button size="sm" type="submit" :disabled="!renameDialog.name.trim()">Rename</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </aside>
</template>

<script setup lang="ts">
import { reactive, ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronRight, ExternalLink, Copy, FileText, Trash2, Edit } from '@lucide/vue'
import { useSchemaStore } from '../stores/schema'
import { useConnectionStore } from '../stores/connection'
import { useUiStore } from '../stores/ui'
import { useEditorStore } from '../stores/editor'
import { useResultStore } from '../stores/result'
import type { SavedQuery } from '../stores/editor'

const schemaStore = useSchemaStore()
const connStore = useConnectionStore()
const uiStore = useUiStore()
const editorStore = useEditorStore()
const resultStore = useResultStore()

watch(() => connStore.status, async (status) => {
  if (status === 'connected') {
    await schemaStore.fetchDatabases()
    await schemaStore.refreshSchema()
  }
}, { immediate: true })

onMounted(() => {
  editorStore.loadSavedQueries()
})

const sectionsOpen = reactive({
  tables: true, views: true, functions: false, indexes: false, saved: true,
})

const renameDialog = reactive({
  open: false,
  id: '',
  name: '',
})
const renameInput = ref<HTMLInputElement | null>(null)

function openRename(id: string, currentName: string) {
  renameDialog.id = id
  renameDialog.name = currentName
  renameDialog.open = true
  nextTick(() => renameInput.value?.focus())
}

function doRename() {
  if (!renameDialog.name.trim() || !renameDialog.id) return
  editorStore.renameSavedQuery(renameDialog.id, renameDialog.name.trim())
  renameDialog.open = false
}

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
  searchTimer = setTimeout(() => schemaStore.setSearchQuery(val), 150)
}

	function selectTable(name: string) {
	  schemaStore.setActiveTable(name)
	  const quotedName = quoteSqlIdentifier(name)
	  let tab = editorStore.tabs.find(t => t.name === name && t.sql.includes(`SELECT * FROM ${quotedName}`))
	  if (!tab) {
	    const tabId = editorStore.addTab()
	    tab = editorStore.tabs.find(t => t.id === tabId)
	    if (tab) { tab.name = name; tab.sql = `SELECT * FROM ${quotedName} LIMIT 100;` }
  } else {
    editorStore.selectTab(tab.id)
  }
  if (tab) resultStore.runQuery(tab.sql)
}

const ctxMenu = reactive({ visible: false, x: 0, y: 0, target: '', isSavedQuery: false, savedQueryId: '' })

function openCtxMenu(e: MouseEvent, name: string) {
  ctxMenu.visible = true; ctxMenu.target = name; ctxMenu.x = e.clientX; ctxMenu.y = e.clientY; ctxMenu.isSavedQuery = false
}

function openSQCtxMenu(e: MouseEvent, sq: SavedQuery) {
  ctxMenu.visible = true; ctxMenu.target = sq.name; ctxMenu.savedQueryId = sq.id; ctxMenu.x = e.clientX; ctxMenu.y = e.clientY; ctxMenu.isSavedQuery = true
}

function closeCtxMenu() { ctxMenu.visible = false }

function ctxSqAction(action: string) {
  const id = ctxMenu.savedQueryId; const name = ctxMenu.target; closeCtxMenu()
  switch (action) {
    case 'rename': openRename(id, name); break
    case 'delete': editorStore.dropSavedQuery(id); break
  }
}

function ctxAction(action: string) {
  const name = ctxMenu.target; closeCtxMenu()
  switch (action) {
	    case 'open': {
	      const id = editorStore.addTab()
	      const tab = editorStore.tabs.find(t => t.id === id)
	      if (tab) {
	        tab.name = name
	        tab.sql = `SELECT * FROM ${quoteSqlIdentifier(name)} LIMIT 100;`
	      }
	      break
	    }
    case 'copy': navigator.clipboard.writeText(name); break
    case 'ddl': schemaStore.setActiveTable(name); uiStore.openInspector(name); break
  }
}

function onDocClick(e: MouseEvent) {
  if (ctxMenu.visible && !(e.target as HTMLElement)?.closest('.sidebar')) {
    closeCtxMenu()
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
  document.removeEventListener('click', onDocClick)
})
</script>

<style scoped>
.sidebar {
  width: 220px;
  transition: width 0.15s ease;
  flex-shrink: 0;
}
.sidebar.w-0 { width: 0; border-right: none; overflow: hidden; }
</style>
