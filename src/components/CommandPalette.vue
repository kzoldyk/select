<template>
  <Teleport to="body">
    <div
      v-if="uiStore.paletteOpen"
      class="palette-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      @click.self="uiStore.closePalette()"
    >
      <div class="palette" @keydown="onKeyDown">
        <!-- Search input -->
        <div class="palette-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref="inputRef"
            id="palette-input"
            class="palette-input"
            type="text"
            placeholder="Search commands…"
            v-model="query"
            aria-label="Search commands"
            autocomplete="off"
            spellcheck="false"
            @keydown.up.prevent="moveUp"
            @keydown.down.prevent="moveDown"
            @keydown.enter.prevent="runSelected"
            @keydown.esc.prevent="uiStore.closePalette()"
          />
        </div>

        <!-- Command list -->
        <div class="palette-list" role="listbox" aria-label="Commands">
          <template v-for="group in filteredGroups" :key="group.label">
            <div class="palette-group-label">{{ group.label }}</div>
            <button
              v-for="(cmd, i) in group.commands"
              :key="cmd.id"
              class="pal-item"
              :class="{ selected: selectedIndex === getGlobalIndex(group, i) }"
              role="option"
              :aria-selected="selectedIndex === getGlobalIndex(group, i)"
              @click="execute(cmd)"
              @mouseenter="selectedIndex = getGlobalIndex(group, i)"
            >
              <span class="cmd-icon">{{ cmd.icon }}</span>
              <span class="cmd-label">{{ cmd.label }}</span>
              <span v-if="cmd.shortcut" class="kb-pill">{{ cmd.shortcut }}</span>
            </button>
          </template>

          <div v-if="flatCommands.length === 0" class="palette-empty">
            No commands match "{{ query }}"
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useUiStore } from '../stores/ui'
import { useEditorStore } from '../stores/editor'
import { useResultStore } from '../stores/result'
import { useSchemaStore } from '../stores/schema'

const uiStore = useUiStore()
const editorStore = useEditorStore()
const resultStore = useResultStore()
const schemaStore = useSchemaStore()

const emit = defineEmits<{ run: [] }>()

const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const selectedIndex = ref(0)

interface Command {
  id: string
  icon: string
  label: string
  shortcut?: string
  action: () => void
}

interface Group {
  label: string
  commands: Command[]
}

const allGroups: Group[] = [
  {
    label: 'Recent',
    commands: [
      {
        id: 'open-users',
        icon: '⊞',
        label: 'Open table: users',
        shortcut: '↵',
        action: () => {
          schemaStore.setActiveTable('users')
          const id = editorStore.addTab()
          const tab = editorStore.tabs.find(t => t.id === id)
          if (tab) tab.sql = 'SELECT * FROM users LIMIT 100;'
          uiStore.closePalette()
        },
      },
    ],
  },
  {
    label: 'Actions',
    commands: [
      {
        id: 'run-query',
        icon: '▶',
        label: 'Run query',
        shortcut: '⌘↵',
        action: () => { emit('run'); uiStore.closePalette() },
      },
      {
        id: 'new-tab',
        icon: '✎',
        label: 'New query tab',
        shortcut: '⌘T',
        action: () => { editorStore.addTab(); uiStore.closePalette() },
      },
      {
        id: 'export-csv',
        icon: '⇓',
        label: 'Export CSV',
        shortcut: '⌘E',
        action: () => { resultStore.exportCsv(); uiStore.closePalette() },
      },
      {
        id: 'refresh-schema',
        icon: '⟳',
        label: 'Refresh schema',
        shortcut: '⌘R',
        action: () => { schemaStore.refreshSchema(); uiStore.closePalette() },
      },
    ],
  },
  {
    label: 'Navigation',
    commands: [
      {
        id: 'switch-db',
        icon: '⛁',
        label: 'Switch database',
        shortcut: '⌘D',
        action: () => { uiStore.openConnectionManager(); uiStore.closePalette() },
      },
      {
        id: 'toggle-sidebar',
        icon: '☰',
        label: 'Toggle sidebar',
        shortcut: '⌘B',
        action: () => { uiStore.toggleSidebar(); uiStore.closePalette() },
      },
      {
        id: 'schema-inspector',
        icon: '🔍',
        label: 'Open schema inspector',
        shortcut: '⌘I',
        action: () => { uiStore.openInspector('users'); uiStore.closePalette() },
      },
      {
        id: 'close-palette',
        icon: '✕',
        label: 'Close palette',
        shortcut: 'Esc',
        action: () => { uiStore.closePalette() },
      },
    ],
  },
]

const filteredGroups = computed<Group[]>(() => {
  if (!query.value) return allGroups
  const q = query.value.toLowerCase()
  return allGroups
    .map(g => ({ ...g, commands: g.commands.filter(c => c.label.toLowerCase().includes(q)) }))
    .filter(g => g.commands.length > 0)
})

const flatCommands = computed(() =>
  filteredGroups.value.flatMap(g => g.commands)
)

function getGlobalIndex(group: Group, i: number): number {
  let offset = 0
  for (const g of filteredGroups.value) {
    if (g === group) return offset + i
    offset += g.commands.length
  }
  return i
}

function moveUp() {
  if (selectedIndex.value > 0) selectedIndex.value--
}
function moveDown() {
  if (selectedIndex.value < flatCommands.value.length - 1) selectedIndex.value++
}
function runSelected() {
  const cmd = flatCommands.value[selectedIndex.value]
  if (cmd) execute(cmd)
}
function execute(cmd: Command) {
  cmd.action()
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') { uiStore.closePalette(); e.stopPropagation() }
}

// Reset on open
watch(() => uiStore.paletteOpen, async (open) => {
  if (open) {
    query.value = ''
    selectedIndex.value = 0
    await nextTick()
    inputRef.value?.focus()
  }
})

// Reset selection when query changes
watch(query, () => { selectedIndex.value = 0 })
</script>

<style scoped>
.palette-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: center;
}

.palette {
  position: absolute;
  top: 60px;
  width: 460px;
  background: var(--surface);
  border: 1px solid var(--border-2);
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.palette-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}
.search-icon { color: var(--text-dim); flex-shrink: 0; }

.palette-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  color: var(--text);
}
.palette-input::placeholder { color: var(--text-dim); }

.palette-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
}

.palette-group-label {
  font-size: 10px;
  font-family: 'Inter', sans-serif;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 6px 10px 3px;
}

.pal-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-family: 'Inter', sans-serif;
  color: var(--text-muted);
  cursor: pointer;
  text-align: left;
}
.pal-item:hover, .pal-item.selected {
  background: var(--row-hover);
  color: var(--text);
}
.cmd-icon { width: 16px; text-align: center; flex-shrink: 0; }
.cmd-label { flex: 1; }

.palette-empty {
  padding: 16px;
  text-align: center;
  color: var(--text-dim);
  font-size: 11px;
  font-family: 'Inter', sans-serif;
}
</style>
