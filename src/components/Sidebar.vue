<template>
  <aside
    class="sidebar"
    :class="{ collapsed: !uiStore.sidebarOpen }"
    role="navigation"
    aria-label="Schema browser"
  >
    <!-- Header -->
    <div class="sb-header">
      <div class="sb-selects" style="display: flex; flex-direction: column; gap: 6px;">
        <template v-if="connStore.status === 'connected'">
          <select
            v-if="schemaStore.databases.length"
            id="sb-db-select"
            class="input-base sb-select"
            aria-label="Select database"
            :value="connStore.activeConnection?.database"
            @change="async (e) => {
              await connStore.changeDatabase((e.target as HTMLSelectElement).value)
              await schemaStore.refreshSchema()
            }"
          >
            <option value="" disabled>Select Database...</option>
            <option
              v-for="db in schemaStore.databases"
              :key="db"
              :value="db"
            >{{ db }}</option>
          </select>
          
          <select
            v-if="schemaStore.databases.length"
            id="sb-schema-select"
            class="input-base sb-select"
            aria-label="Select schema"
            :disabled="connStore.activeConnection?.dbType === 'mysql'"
          >
            <option v-if="connStore.activeConnection?.dbType === 'mysql'" value="def">MySQL (Schema = DB)</option>
            <option v-else value="public">public</option>
          </select>

          <div v-if="!schemaStore.databases.length" class="text-dim text-10" style="padding: 4px; text-align: center;">
            Loading databases...
          </div>
        </template>
        
        <div v-else-if="connStore.status === 'connecting'" class="text-dim text-10" style="padding: 4px; text-align: center;">
          Connecting...
        </div>
        <div v-else-if="connStore.status === 'error'" class="text-dim text-10" style="padding: 4px; text-align: center; color: var(--red);">
          Connection error
        </div>
        <div v-else class="text-dim text-10" style="padding: 4px; text-align: center;">
          No active connection
        </div>
      </div>
      <input
        id="sb-search"
        class="input-base sb-search"
        type="text"
        placeholder="Search tables…"
        aria-label="Search tables"
        :value="schemaStore.searchQuery"
        @input="onSearch"
      />
    </div>

    <!-- Tree -->
    <div class="sb-tree" role="tree">

      <!-- Tables -->
      <div class="sb-section" v-if="schemaStore.filteredTables.length">
        <button
          class="sb-section-header"
          :aria-expanded="sectionsOpen.tables"
          @click="toggle('tables')"
        >
          <span class="sb-section-name">Tables</span>
          <span class="sb-count">{{ schemaStore.tables.length }}</span>
          <svg
            class="sb-chevron"
            :class="{ open: sectionsOpen.tables }"
            width="10" height="10" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <transition name="collapse">
          <ul v-if="sectionsOpen.tables" role="group">
            <li
              v-for="table in schemaStore.filteredTables"
              :key="table.name"
              role="treeitem"
              class="tree-item"
              :class="{ active: schemaStore.activeTable === table.name }"
              :title="table.name"
              @click="selectTable(table.name)"
              @contextmenu.prevent="(e) => openCtxMenu(e, table.name)"
            >
              <div class="ti-left">
                <svg class="ti-icon table" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
                </svg>
                <span class="ti-name">{{ table.name }}</span>
              </div>
              <span class="row-badge">{{ formatCount(table.rowCount) }}</span>
            </li>
          </ul>
        </transition>
      </div>

      <!-- Views -->
      <div class="sb-section" v-if="schemaStore.filteredViews.length">
        <button
          class="sb-section-header"
          :aria-expanded="sectionsOpen.views"
          @click="toggle('views')"
        >
          <span class="sb-section-name">Views</span>
          <span class="sb-count">{{ schemaStore.views.length }}</span>
          <svg class="sb-chevron" :class="{ open: sectionsOpen.views }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <transition name="collapse">
          <ul v-if="sectionsOpen.views" role="group">
            <li
              v-for="view in schemaStore.filteredViews"
              :key="view.name"
              role="treeitem"
              class="tree-item"
              :class="{ active: schemaStore.activeTable === view.name }"
              @click="selectTable(view.name)"
              @contextmenu.prevent="(e) => openCtxMenu(e, view.name)"
            >
              <div class="ti-left">
                <svg class="ti-icon view" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <span class="ti-name">{{ view.name }}</span>
              </div>
            </li>
          </ul>
        </transition>
      </div>

      <!-- Functions -->
      <div class="sb-section" v-if="schemaStore.filteredFunctions.length">
        <button
          class="sb-section-header"
          :aria-expanded="sectionsOpen.functions"
          @click="toggle('functions')"
        >
          <span class="sb-section-name">Functions</span>
          <span class="sb-count">{{ schemaStore.functions.length }}</span>
          <svg class="sb-chevron" :class="{ open: sectionsOpen.functions }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <transition name="collapse">
          <ul v-if="sectionsOpen.functions" role="group">
            <li
              v-for="fn in schemaStore.filteredFunctions"
              :key="fn.name"
              role="treeitem"
              class="tree-item"
              @contextmenu.prevent="(e) => openCtxMenu(e, fn.name)"
            >
              <div class="ti-left">
                <svg class="ti-icon fn" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                </svg>
                <span class="ti-name">{{ fn.name }}</span>
              </div>
            </li>
          </ul>
        </transition>
      </div>

      <!-- Indexes -->
      <div class="sb-section" v-if="schemaStore.filteredIndexes.length">
        <button
          class="sb-section-header"
          :aria-expanded="sectionsOpen.indexes"
          @click="toggle('indexes')"
        >
          <span class="sb-section-name">Indexes</span>
          <span class="sb-count">{{ schemaStore.indexes.length }}</span>
          <svg class="sb-chevron" :class="{ open: sectionsOpen.indexes }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <transition name="collapse">
          <ul v-if="sectionsOpen.indexes" role="group">
            <li
              v-for="idx in schemaStore.filteredIndexes"
              :key="idx.name"
              role="treeitem"
              class="tree-item"
              @contextmenu.prevent="(e) => openCtxMenu(e, idx.name)"
            >
              <div class="ti-left">
                <svg class="ti-icon idx" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                <span class="ti-name">{{ idx.name }}</span>
              </div>
            </li>
          </ul>
        </transition>
      </div>

    </div>

    <!-- Context Menu -->
    <Teleport to="body">
      <div
        v-if="ctxMenu.visible"
        class="ctx-menu"
        :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
        role="menu"
        @mouseleave="closeCtxMenu"
      >
        <button class="ctx-item" role="menuitem" @click="ctxAction('open')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Open in new tab
        </button>
        <button class="ctx-item" role="menuitem" @click="ctxAction('copy')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy name
        </button>
        <button class="ctx-item" role="menuitem" @click="ctxAction('ddl')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
          </svg>
          View DDL
        </button>
        <div class="ctx-divider"></div>
        <button class="ctx-item" role="menuitem" @click="ctxAction('truncate')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Truncate table
        </button>
        <button class="ctx-item danger" role="menuitem" @click="ctxAction('drop')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          Drop table
        </button>
      </div>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { reactive, onMounted, onUnmounted, watch } from 'vue'
import { useSchemaStore } from '../stores/schema'
import { useConnectionStore } from '../stores/connection'
import { useUiStore } from '../stores/ui'
import { useEditorStore } from '../stores/editor'
import { useResultStore } from '../stores/result'

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

const sectionsOpen = reactive({
  tables: true,
  views: true,
  functions: false,
  indexes: false,
})

function toggle(section: keyof typeof sectionsOpen) {
  sectionsOpen[section] = !sectionsOpen[section]
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return String(n)
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearch(e: Event) {
  const val = (e.target as HTMLInputElement).value
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    schemaStore.setSearchQuery(val)
  }, 150)
}

function selectTable(name: string) {
  schemaStore.setActiveTable(name)
  
  // Check if a tab for this table already exists to avoid spamming tabs
  let tab = editorStore.tabs.find(t => t.name === name && t.sql.includes(`SELECT * FROM \`${name}\``))
  
  if (!tab) {
    const tabId = editorStore.addTab()
    tab = editorStore.tabs.find(t => t.id === tabId)
    if (tab) {
      tab.name = name
      tab.sql = `SELECT * FROM \`${name}\` LIMIT 100;`
    }
  } else {
    editorStore.selectTab(tab.id)
  }
  
  if (tab) {
    resultStore.runQuery(tab.sql)
  }
}

// Context menu
const ctxMenu = reactive({ visible: false, x: 0, y: 0, target: '' })

function openCtxMenu(e: MouseEvent, name: string) {
  ctxMenu.visible = true
  ctxMenu.target = name
  ctxMenu.x = e.clientX
  ctxMenu.y = e.clientY
}

function closeCtxMenu() {
  ctxMenu.visible = false
}

function ctxAction(action: string) {
  const name = ctxMenu.target
  closeCtxMenu()

  switch (action) {
    case 'open': {
      const id = editorStore.addTab()
      const tab = editorStore.tabs.find(t => t.id === id)
      if (tab) tab.sql = `SELECT * FROM ${name} LIMIT 100;`
      break
    }
    case 'copy':
      navigator.clipboard.writeText(name)
      break
    case 'ddl':
      schemaStore.setActiveTable(name)
      uiStore.openInspector(name)
      break
    case 'truncate':
      // Stub
      break
    case 'drop':
      // Stub
      break
  }
}

function onDocClick(e: MouseEvent) {
  if (ctxMenu.visible) {
    const menu = document.querySelector('.ctx-menu')
    if (menu && !menu.contains(e.target as Node)) closeCtxMenu()
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<style scoped>
.sidebar {
  width: 220px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.15s ease;
  flex-shrink: 0;
}
.sidebar.collapsed { width: 0; border-right: none; }

/* Header */
.sb-header {
  padding: 8px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.sb-select {
  width: 100%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  padding-right: 22px;
}

.sb-search { width: 100%; }

/* Tree */
.sb-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

/* Section header */
.sb-section { margin-bottom: 2px; }
.sb-section-header {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-size: 10px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  gap: 4px;
}
.sb-section-header:hover { color: var(--text-muted); }
.sb-section-name { flex: 1; text-align: left; }
.sb-count {
  font-size: 9px;
  color: var(--text-dim);
}
.sb-chevron {
  transition: transform 0.15s ease;
  color: var(--text-dim);
}
.sb-chevron.open { transform: rotate(0deg); }
.sb-chevron:not(.open) { transform: rotate(-90deg); }

/* Tree item */
.tree-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 8px 3px 24px;
  font-size: 11px;
  font-family: 'Inter', sans-serif;
  color: var(--text-muted);
  border-left: 2px solid transparent;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
}
.tree-item:hover {
  background: var(--row-hover);
  color: var(--text);
}
.tree-item.active {
  background: var(--row-hover);
  color: var(--text);
  border-left-color: var(--blue);
}
.ti-left {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}
.ti-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.ti-icon { flex-shrink: 0; }
.ti-icon.table  { color: var(--text-muted); }
.ti-icon.view   { color: var(--amber); }
.ti-icon.fn     { color: var(--green); }
.ti-icon.idx    { color: var(--purple); }

.tree-item.active .ti-icon.table { color: var(--blue); }

.row-badge {
  background: var(--surface-2);
  border: 1px solid var(--border-2);
  color: var(--text-dim);
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 2px;
  font-family: 'JetBrains Mono', monospace;
  flex-shrink: 0;
}

/* Collapse animation */
.collapse-enter-active, .collapse-leave-active {
  transition: opacity 0.15s ease, max-height 0.15s ease;
  max-height: 500px;
  overflow: hidden;
}
.collapse-enter-from, .collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
ul { list-style: none; }

/* Context menu */
.ctx-menu {
  position: fixed;
  z-index: 9999;
  background: var(--surface);
  border: 1px solid var(--border-2);
  border-radius: 4px;
  padding: 3px;
  min-width: 160px;
}
.ctx-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  background: transparent;
  border: none;
  border-radius: 3px;
  color: var(--text-muted);
  font-size: 11px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  text-align: left;
}
.ctx-item:hover {
  background: var(--row-hover);
  color: var(--text);
}
.ctx-item.danger { color: var(--red); }
.ctx-item.danger:hover { background: rgba(239,68,68,0.08); color: var(--red); }
.ctx-divider {
  height: 1px;
  background: var(--border);
  margin: 3px 0;
}
</style>
