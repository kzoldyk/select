<template>
  <CommandDialog :open="uiStore.paletteOpen" @update:open="uiStore.closePalette()">
    <template #default>
      <CommandInput placeholder="Search commands…" />
      <CommandList>
        <CommandEmpty>No commands match.</CommandEmpty>

        <CommandGroup v-for="group in allGroups" :key="group.label" :heading="group.label">
          <CommandItem
            v-for="cmd in group.commands"
            :key="cmd.id"
            :value="cmd.label"
            @select="execute(cmd)"
          >
            <span class="mr-2 w-4 text-center flex-shrink-0">{{ cmd.icon }}</span>
            <span>{{ cmd.label }}</span>
            <CommandShortcut v-if="cmd.shortcut">{{ cmd.shortcut }}</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </template>
  </CommandDialog>
</template>

<script setup lang="ts">
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { useUiStore } from '../stores/ui'
import { useEditorStore } from '../stores/editor'
import { useResultStore } from '../stores/result'
import { useSchemaStore } from '../stores/schema'
import { useConnectionStore } from '../stores/connection'
import { computed } from 'vue'

const uiStore = useUiStore()
const editorStore = useEditorStore()
const resultStore = useResultStore()
const schemaStore = useSchemaStore()
const connStore = useConnectionStore()

	const emit = defineEmits<{ run: [] }>()
	
	function quoteSqlIdentifier(name: string): string {
	  return `\`${name.replace(/`/g, '``')}\``
	}

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

function openTableInTab(name: string) {
  schemaStore.setActiveTable(name)
  const id = editorStore.addTab()
  const tab = editorStore.tabs.find(t => t.id === id)
  if (tab) {
    tab.name = name
    tab.sql = `SELECT * FROM ${quoteSqlIdentifier(name)} LIMIT 100;`
    emit('run')
  }
  uiStore.closePalette()
}

const allGroups = computed<Group[]>(() => {
  const firstTable = schemaStore.filteredTables[0] ?? schemaStore.tables[0]

  const tableCommands: Command[] = schemaStore.tables.slice(0, 10).map(t => ({
    id: `open-${t.name}`,
    icon: '\u229E',
    label: `Open table: ${t.name}`,
    action: () => openTableInTab(t.name),
  }))

  const savedQueryCommands: Command[] = editorStore.savedQueries.slice(0, 10).map(sq => ({
    id: `saved-${sq.id}`,
    icon: '\uD83D\uDCC4',
    label: `Open saved: ${sq.name}`,
    action: () => {
      const id = editorStore.addTab()
      const tab = editorStore.tabs.find(t => t.id === id)
      if (tab) {
        tab.name = sq.name
        tab.sql = sq.sql
        editorStore.updateSql(id, sq.sql)
      }
      uiStore.closePalette()
    },
  }))

  const connectionCommands: Command[] = connStore.connections.map(conn => ({
    id: `conn-${conn.id}`,
    icon: conn.id === connStore.activeId ? '\u25C9' : '\u25CB',
    label: `Switch to: ${conn.name} (${conn.host}:${conn.port})`,
    action: () => {
      connStore.connect(conn.id)
      uiStore.closePalette()
    },
  }))

  return [
  ...(tableCommands.length ? [{
    label: 'Tables',
    commands: tableCommands,
  }] : []),
  ...(savedQueryCommands.length ? [{
    label: 'Saved Queries',
    commands: savedQueryCommands,
  }] : []),
  ...(connectionCommands.length ? [{
    label: 'Connections',
    commands: connectionCommands,
  }] : []),
  {
    label: 'Actions',
    commands: [
      {
        id: 'run-query',
        icon: '\u25B6',
        label: 'Run query',
        shortcut: '\u2318R',
        action: () => { emit('run'); uiStore.closePalette() },
      },
      {
        id: 'new-tab',
        icon: '\u270E',
        label: 'New query tab',
        shortcut: '\u2318T',
        action: () => { editorStore.addTab(); uiStore.closePalette() },
      },
      {
        id: 'export',
        icon: '\u21D3',
        label: 'Export results',
        shortcut: '\u2318\u21E7E',
        action: () => { uiStore.openExport(); uiStore.closePalette() },
      },
      {
        id: 'refresh-schema',
        icon: '\u27F3',
        label: 'Refresh schema',
        shortcut: '\u2318\u21E7R',
        action: () => { schemaStore.refreshSchema(connStore.activeId ?? undefined); uiStore.closePalette() },
      },
    ],
  },
  {
    label: 'Navigation',
    commands: [
      {
        id: 'switch-db',
        icon: '\u26C1',
        label: 'Switch database',
        shortcut: '\u2318D',
        action: () => { uiStore.openConnectionManager(); uiStore.closePalette() },
      },
      {
        id: 'toggle-sidebar',
        icon: '\u2630',
        label: 'Toggle sidebar',
        shortcut: '\u2318B',
        action: () => { uiStore.toggleSidebar(); uiStore.closePalette() },
      },
      {
        id: 'shortcuts',
        icon: '\u2318',
        label: 'Keyboard shortcuts',
        shortcut: '\u2318\u21E7/',
        action: () => { uiStore.openShortcuts(); uiStore.closePalette() },
      },
      {
        id: 'schema-inspector',
        icon: '\uD83D\uDD0D',
        label: 'Open schema inspector',
        shortcut: '\u2318I',
        action: () => {
          const tableName = schemaStore.activeTable ?? firstTable?.name
          if (tableName) uiStore.openInspector(tableName)
          uiStore.closePalette()
        },
      },
      {
        id: 'view-history',
        icon: '\u29D6',
        label: 'View query history',
        shortcut: '',
        action: () => {
          resultStore.setActiveView('history')
          resultStore.loadHistory()
          uiStore.closePalette()
        },
      },
    ],
  },
]})

function execute(cmd: Command) {
  cmd.action()
}
</script>
