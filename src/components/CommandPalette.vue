<template>
  <CommandDialog :open="uiStore.paletteOpen" @update:open="uiStore.closePalette()">
    <template #default>
      <!-- Top search input -->
      <CommandInput placeholder="Type a command or search tables, views, connections, actions, themes…" />

      <!-- Quick category filter pills -->
      <div class="flex items-center gap-1 px-3 py-1.5 border-b border-border/60 bg-muted/10 text-[11px] overflow-x-auto no-scrollbar select-none">
        <span class="text-[10px] text-muted-foreground/60 uppercase font-semibold mr-1 flex items-center gap-1">
          <PhSparkle class="w-3 h-3 text-primary" />
          Filter:
        </span>
        <button
          v-for="cat in CATEGORIES"
          :key="cat.id"
          class="px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors cursor-pointer border-none"
          :class="activeCategory === cat.id ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'"
          @click="activeCategory = cat.id"
        >
          {{ cat.label }}
        </button>

        <div v-if="connStore.activeConnection" class="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground/70 flex-shrink-0">
          <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: connStore.activeConnection.color || '#10B981' }"></span>
          <span class="font-mono max-w-[110px] truncate">{{ connStore.activeConnection.name }}</span>
        </div>
      </div>

      <!-- Command list -->
      <CommandList class="max-h-[460px]">
        <CommandEmpty class="py-10 text-center">
          <div class="flex flex-col items-center justify-center gap-2">
            <PhMagnifyingGlass class="w-7 h-7 text-muted-foreground/40" />
            <p class="text-sm font-medium text-foreground">No commands found</p>
            <p class="text-xs text-muted-foreground">Try searching for a table name, connection, query action, or theme.</p>
          </div>
        </CommandEmpty>

        <template v-for="group in filteredGroups" :key="group.label">
          <CommandGroup :heading="group.label">
            <CommandItem
              v-for="cmd in group.commands"
              :key="cmd.id"
              :value="`${group.label} ${cmd.label} ${cmd.keywords || ''}`"
              @select="execute(cmd)"
              class="group/item"
            >
              <!-- Icon Container -->
              <div 
                class="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                :class="cmd.iconBgClass || 'bg-muted/70 text-muted-foreground group-hover/item:text-primary group-data-[selected=true]/command-item:bg-primary/15 group-data-[selected=true]/command-item:text-primary'"
              >
                <component :is="cmd.iconComponent" class="w-3.5 h-3.5" :weight="cmd.iconWeight || 'regular'" />
              </div>

              <!-- Main Label & Subtitle -->
              <div class="flex flex-col min-w-0 flex-1">
                <div class="flex items-center gap-1.5 truncate">
                  <span class="font-medium text-foreground text-[12.5px] truncate">{{ cmd.label }}</span>
                  <span v-if="cmd.badge" class="text-[9.5px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground/80 border border-border/40 flex-shrink-0">
                    {{ cmd.badge }}
                  </span>
                </div>
                <span v-if="cmd.description" class="text-[10.5px] text-muted-foreground/70 truncate leading-tight">
                  {{ cmd.description }}
                </span>
              </div>

              <!-- Keyboard Shortcut keycaps -->
              <CommandShortcut v-if="cmd.shortcut">
                <kbd
                  v-for="(key, i) in formatShortcutKeys(cmd.shortcut)"
                  :key="i"
                  class="font-mono text-[10px] leading-none"
                >{{ key }}</kbd>
              </CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </template>
      </CommandList>

      <!-- Bottom Palette Footer Bar -->
      <div class="flex items-center justify-between px-3.5 py-2 border-t border-border/70 bg-muted/20 text-[10.5px] text-muted-foreground select-none font-mono">
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center gap-1">
            <kbd class="px-1 py-0.5 bg-muted rounded border border-border/60 text-[9px] shadow-2xs">↑</kbd>
            <kbd class="px-1 py-0.5 bg-muted rounded border border-border/60 text-[9px] shadow-2xs">↓</kbd>
            Navigate
          </span>
          <span class="inline-flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 bg-muted rounded border border-border/60 text-[9px] shadow-2xs">↵</kbd>
            Execute
          </span>
          <span class="inline-flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 bg-muted rounded border border-border/60 text-[9px] shadow-2xs">ESC</kbd>
            Close
          </span>
        </div>

        <div class="flex items-center gap-2 text-muted-foreground/70">
          <span>Select Command Bar</span>
          <span class="w-1 h-1 rounded-full bg-primary/60"></span>
          <span>{{ totalCommandCount }} commands available</span>
        </div>
      </div>
    </template>
  </CommandDialog>
</template>

<script setup lang="ts">
import { ref, computed, type Component } from 'vue'
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
import { toast } from 'vue-sonner'
import { 
  themeState, 
  activeTheme, 
  setTheme,
  randomTheme, 
  nextTheme, 
  prevTheme, 
  toggleFavorite,
  BUILTIN_THEMES 
} from '../theme'
import {
  PhTable,
  PhEye,
  PhLightning,
  PhPlay,
  PhPlus,
  PhX,
  PhMagicWand,
  PhTreeStructure,
  PhDownloadSimple,
  PhArrowClockwise,
  PhPalette,
  PhShuffle,
  PhArrowRight,
  PhArrowLeft,
  PhStar,
  PhSidebar,
  PhArrowsOut,
  PhKeyboard,
  PhClockCounterClockwise,
  PhGitBranch,
  PhKey,
  PhGear,
  PhMagnifyingGlass,
  PhMagnifyingGlassPlus,
  PhMagnifyingGlassMinus,
  PhSpeakerHigh,
  PhSpeakerSlash,
  PhSun,
  PhMoon,
  PhCopy,
  PhFileCode,
  PhActivity,
  PhFunnel,
  PhFolderOpen,
  PhPlug,
  PhPower,
  PhDatabase,
  PhBookmarkSimple,
  PhCode,
  PhCheck,
  PhSparkle,
  PhFloppyDisk,
  PhRows,
} from '@phosphor-icons/vue'

const emit = defineEmits<{
  run: []
  explain: []
  format: []
}>()

const uiStore = useUiStore()
const editorStore = useEditorStore()
const resultStore = useResultStore()
const schemaStore = useSchemaStore()
const connStore = useConnectionStore()

const activeCategory = ref<'all' | 'tables' | 'query' | 'themes' | 'connections' | 'tools'>('all')

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'tables', label: 'Tables & Views' },
  { id: 'query', label: 'Query & Editor' },
  { id: 'connections', label: 'Connections' },
  { id: 'themes', label: 'Themes' },
  { id: 'tools', label: 'Navigation & Tools' },
] as const

interface Command {
  id: string
  label: string
  description?: string
  badge?: string
  keywords?: string
  shortcut?: string
  iconComponent: Component
  iconWeight?: 'regular' | 'fill' | 'bold'
  iconBgClass?: string
  category: 'tables' | 'query' | 'themes' | 'connections' | 'tools'
  action: () => void
}

interface Group {
  label: string
  category: 'tables' | 'query' | 'themes' | 'connections' | 'tools'
  commands: Command[]
}

function quoteSqlIdentifier(name: string): string {
  return `\`${name.replace(/`/g, '``')}\``
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

function openTableDiagram(name: string) {
  editorStore.addSchemaDiagramTab(name)
  uiStore.closePalette()
}

function formatShortcutKeys(shortcut: string): string[] {
  // If already symbol based, return single string or split
  return [shortcut]
}

const allGroups = computed<Group[]>(() => {
  const firstTable = schemaStore.filteredTables[0] ?? schemaStore.tables[0]

  // 1. Table Commands
  const tableCommands: Command[] = schemaStore.tables.map(t => ({
    id: `table-open-${t.name}`,
    label: `Open table: ${t.name}`,
    description: t.rowCount !== undefined ? `${Number(t.rowCount).toLocaleString()} rows · SELECT * FROM ${t.name}` : `SELECT * FROM ${t.name}`,
    badge: 'Table',
    keywords: `table select data ${t.name}`,
    iconComponent: PhTable,
    category: 'tables',
    action: () => openTableInTab(t.name),
  }))

  // 2. View Commands
  const viewCommands: Command[] = schemaStore.views.map(v => ({
    id: `view-open-${v.name}`,
    label: `Open view: ${v.name}`,
    description: `SELECT * FROM ${v.name}`,
    badge: 'View',
    keywords: `view select ${v.name}`,
    iconComponent: PhEye,
    category: 'tables',
    action: () => openTableInTab(v.name),
  }))

  // 3. Functions & Procedures
  const functionCommands: Command[] = [
    ...schemaStore.functions.map(fn => ({
      id: `fn-${fn.name}`,
      label: `Call function: ${fn.name}`,
      description: `SELECT ${fn.name}()`,
      badge: 'Function',
      keywords: `function routine ${fn.name}`,
      iconComponent: PhLightning,
      category: 'tables' as const,
      action: () => {
        const id = editorStore.addTab()
        const tab = editorStore.tabs.find(t => t.id === id)
        if (tab) {
          tab.name = fn.name
          tab.sql = `SELECT ${fn.name}();`
        }
        uiStore.closePalette()
      },
    })),
    ...schemaStore.procs.map(proc => ({
      id: `proc-${proc.name}`,
      label: `Execute procedure: ${proc.name}`,
      description: `CALL ${proc.name}()`,
      badge: 'Procedure',
      keywords: `procedure call stored ${proc.name}`,
      iconComponent: PhPlay,
      category: 'tables' as const,
      action: () => {
        const id = editorStore.addTab()
        const tab = editorStore.tabs.find(t => t.id === id)
        if (tab) {
          tab.name = proc.name
          tab.sql = `CALL ${proc.name}();`
        }
        uiStore.closePalette()
      },
    })),
  ]

  // 4. Saved Queries
  const savedQueryCommands: Command[] = editorStore.savedQueries.map(sq => ({
    id: `saved-${sq.id}`,
    label: `Saved Query: ${sq.name}`,
    description: sq.sql.slice(0, 70).replace(/\s+/g, ' '),
    badge: 'Snippet',
    keywords: `saved query snippet sql ${sq.name}`,
    iconComponent: PhBookmarkSimple,
    category: 'query',
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

  // 5. Connections
  const connectionCommands: Command[] = connStore.connections.map(conn => ({
    id: `conn-switch-${conn.id}`,
    label: `Switch Connection: ${conn.name}`,
    description: `${conn.host}:${conn.port} ${conn.database ? `(${conn.database})` : ''}`,
    badge: conn.id === connStore.activeId ? 'Connected' : 'Connection',
    keywords: `connection switch database host ${conn.name} ${conn.host}`,
    iconComponent: PhPlug,
    iconWeight: conn.id === connStore.activeId ? 'fill' : 'regular',
    iconBgClass: conn.id === connStore.activeId ? 'bg-emerald-500/20 text-emerald-400' : undefined,
    category: 'connections',
    action: () => {
      connStore.connect(conn.id)
      uiStore.closePalette()
    },
  }))

  // 6. Available Database Schemas in Active Connection
  const databaseCommands: Command[] = (schemaStore.databases || []).map(db => ({
    id: `db-switch-${db}`,
    label: `Switch Database: ${db}`,
    description: `USE \`${db}\``,
    badge: db === connStore.activeConnection?.database ? 'Current DB' : 'Database',
    keywords: `database schema switch use ${db}`,
    iconComponent: PhDatabase,
    iconBgClass: db === connStore.activeConnection?.database ? 'bg-primary/20 text-primary' : undefined,
    category: 'connections',
    action: async () => {
      await connStore.changeDatabase(db)
      await schemaStore.fetchDatabases(connStore.activeId ?? undefined)
      await schemaStore.refreshSchema(connStore.activeId ?? undefined)
      toast.success(`Switched active database to "${db}"`)
      uiStore.closePalette()
    },
  }))

  // 7. Query Actions
  const queryCommands: Command[] = [
    {
      id: 'run-query',
      label: 'Run Query',
      description: 'Execute the active SQL query in current editor',
      shortcut: '⌘Enter',
      iconComponent: PhPlay,
      iconWeight: 'fill',
      iconBgClass: 'bg-emerald-500/20 text-emerald-400',
      category: 'query',
      action: () => { emit('run'); uiStore.closePalette() },
    },
    {
      id: 'explain-query',
      label: 'Explain Query Plan',
      description: 'Analyze query execution tree & performance stats',
      shortcut: '⌘E',
      iconComponent: PhTreeStructure,
      category: 'query',
      action: () => {
        emit('explain')
        uiStore.closePalette()
      },
    },
    {
      id: 'format-sql',
      label: 'Format SQL Code',
      description: 'Beautify and indent SQL statements in editor',
      shortcut: '⇧⌘F',
      iconComponent: PhMagicWand,
      category: 'query',
      action: () => {
        emit('format')
        uiStore.closePalette()
      },
    },
    {
      id: 'new-query-tab',
      label: 'New Query Tab',
      description: 'Open a blank SQL editor tab',
      shortcut: '⌘T',
      iconComponent: PhPlus,
      category: 'query',
      action: () => { editorStore.addTab(); uiStore.closePalette() },
    },
    {
      id: 'save-query-snippet',
      label: 'Save Query to Snippets',
      description: 'Store current SQL editor content into saved queries',
      shortcut: '⌘S',
      iconComponent: PhFloppyDisk,
      category: 'query',
      action: () => {
        if (editorStore.activeTabId) editorStore.saveTab(editorStore.activeTabId)
        uiStore.closePalette()
      },
    },
    {
      id: 'close-active-tab',
      label: 'Close Active Tab',
      description: 'Close currently focused query or table tab',
      shortcut: '⌘W',
      iconComponent: PhX,
      category: 'query',
      action: () => {
        if (editorStore.activeTabId) editorStore.closeTab(editorStore.activeTabId)
        uiStore.closePalette()
      },
    },
  ]

  // 8. Result Grid Actions
  const resultCommands: Command[] = [
    {
      id: 'export-results',
      label: 'Export Query Results',
      description: 'Export active result dataset as CSV or JSON file',
      shortcut: '⌘⇧E',
      iconComponent: PhDownloadSimple,
      category: 'query',
      action: () => { uiStore.openExport(); uiStore.closePalette() },
    },
    {
      id: 'copy-selected-tsv',
      label: 'Copy Selected Rows as TSV',
      description: 'Copy selected rows in TSV format for Excel & Google Sheets',
      iconComponent: PhCopy,
      category: 'query',
      action: () => {
        const selectedIndices = Array.from(resultStore.selectedRows).map(Number).sort((a, b) => a - b)
        if (!selectedIndices.length) {
          toast.error('No rows selected in results table')
        } else {
          const headers = resultStore.columns.map(c => c.name).join('\t')
          const lines = selectedIndices.map(idx => {
            const row = resultStore.rows[idx]
            if (!row) return ''
            return resultStore.columns.map(c => {
              const val = row[c.name]
              return val === null || val === undefined ? '' : String(val)
            }).join('\t')
          })
          navigator.clipboard.writeText([headers, ...lines].join('\n'))
          toast.success(`Copied ${selectedIndices.length} rows to clipboard (TSV)`)
        }
        uiStore.closePalette()
      },
    },
    {
      id: 'copy-selected-json',
      label: 'Copy Selected Rows as JSON',
      description: 'Copy selected rows as JSON objects array',
      iconComponent: PhFileCode,
      category: 'query',
      action: () => {
        const selected = resultStore.rows.filter((_, i) => resultStore.selectedRows.has(String(i)))
        if (!selected.length) {
          toast.error('No rows selected in results table')
        } else {
          navigator.clipboard.writeText(JSON.stringify(selected, null, 2))
          toast.success(`Copied ${selected.length} rows to clipboard (JSON)`)
        }
        uiStore.closePalette()
      },
    },
    {
      id: 'processlist',
      label: 'Active Database Sessions (Processlist)',
      description: 'Inspect live database threads, state & running queries',
      iconComponent: PhActivity,
      category: 'tools',
      action: () => {
        resultStore.runProcesslist()
        uiStore.closePalette()
      },
    },
    {
      id: 'schema-diagram-all',
      label: 'Open Schema Diagram (All Tables)',
      description: 'Visualize interactive ER relations canvas',
      iconComponent: PhGitBranch,
      category: 'tools',
      action: () => {
        editorStore.addSchemaDiagramTab()
        uiStore.closePalette()
      },
    },
  ]

  // 9. Theme Management Commands
  const popularThemes = [
    'default-dark',
    'dracula',
    'nord',
    'tokyo-night',
    'catppuccin-mocha',
    'one-dark-pro',
    'github-dark',
    'cyberpunk',
    'oled-black',
    'github-light',
    'solarized-dark',
    'everforest',
  ]

  const quickThemeCommands: Command[] = BUILTIN_THEMES.filter(t => popularThemes.includes(t.id)).map(theme => ({
    id: `theme-apply-${theme.id}`,
    label: `Apply Theme: ${theme.name}`,
    description: `${theme.category} theme · ${theme.description || 'Color theme'}`,
    badge: theme.id === activeTheme.value.id ? 'Active' : theme.category,
    keywords: `theme appearance style color palette ${theme.name} ${theme.category}`,
    iconComponent: PhPalette,
    iconBgClass: theme.id === activeTheme.value.id ? 'bg-primary/20 text-primary' : undefined,
    category: 'themes',
    action: () => {
      setTheme(theme.id)
      toast.success(`Theme switched to "${theme.name}"`)
      uiStore.closePalette()
    },
  }))

  const themeCommands: Command[] = [
    {
      id: 'theme-gallery',
      label: 'Browse Theme Gallery',
      description: 'Open visual theme picker with 40+ curated themes',
      shortcut: '⌘⌥T',
      iconComponent: PhPalette,
      category: 'themes',
      action: () => { uiStore.openThemeGallery(); uiStore.closePalette() },
    },
    {
      id: 'theme-random',
      label: 'Apply Random Theme',
      description: 'Surprise me with a fresh color theme',
      shortcut: '⌘⌥R',
      iconComponent: PhShuffle,
      category: 'themes',
      action: () => {
        const t = randomTheme()
        if (t) toast.success(`Applied random theme: "${t.name}"`)
        uiStore.closePalette()
      },
    },
    {
      id: 'theme-next',
      label: 'Next Theme',
      shortcut: '⌘⌥→',
      iconComponent: PhArrowRight,
      category: 'themes',
      action: () => {
        nextTheme()
        toast.success(`Switched to: "${activeTheme.value.name}"`)
        uiStore.closePalette()
      },
    },
    {
      id: 'theme-prev',
      label: 'Previous Theme',
      shortcut: '⌘⌥←',
      iconComponent: PhArrowLeft,
      category: 'themes',
      action: () => {
        prevTheme()
        toast.success(`Switched to: "${activeTheme.value.name}"`)
        uiStore.closePalette()
      },
    },
    {
      id: 'theme-favorite',
      label: 'Favorite Active Theme',
      shortcut: '⌘⌥F',
      iconComponent: PhStar,
      category: 'themes',
      action: () => {
        toggleFavorite(activeTheme.value.id)
        const isFav = activeTheme.value.id ? themeState.favorites.includes(activeTheme.value.id) : false
        toast.success(isFav ? `Added "${activeTheme.value.name}" to favorites` : `Removed "${activeTheme.value.name}" from favorites`)
        uiStore.closePalette()
      },
    },
    ...quickThemeCommands,
  ]

  // 10. Navigation & Tools
  const navCommands: Command[] = [
    {
      id: 'toggle-sidebar',
      label: 'Toggle Sidebar',
      description: 'Show or hide schema explorer panel',
      shortcut: '⌘B',
      iconComponent: PhSidebar,
      category: 'tools',
      action: () => { uiStore.toggleSidebar(); uiStore.closePalette() },
    },
    {
      id: 'toggle-result-panel',
      label: 'Toggle Result Panel',
      description: 'Expand or collapse the bottom query results panel',
      iconComponent: PhRows,
      category: 'tools',
      action: () => { uiStore.toggleResultPanel(); uiStore.closePalette() },
    },
    {
      id: 'toggle-film-grain',
      label: 'Toggle Film Grain Texture',
      description: 'Enable or disable tactile micro-noise background texture',
      iconComponent: PhSparkle,
      category: 'tools',
      action: () => {
        uiStore.toggleFilmGrain()
        toast.info(uiStore.filmGrainEnabled ? 'Film grain texture enabled' : 'Film grain texture disabled')
        uiStore.closePalette()
      },
    },
    {
      id: 'refresh-schema',
      label: 'Refresh Schema Objects',
      description: 'Reload tables, columns, indexes, and routines',
      shortcut: '⌘⇧R',
      iconComponent: PhArrowClockwise,
      category: 'tools',
      action: () => { schemaStore.refreshSchema(connStore.activeId ?? undefined); uiStore.closePalette() },
    },
    {
      id: 'open-connection-manager',
      label: 'Manage Database Connections',
      description: 'Add, edit, test, and remove database connections',
      shortcut: '⌘D',
      iconComponent: PhPlug,
      category: 'connections',
      action: () => { uiStore.openConnectionManager(); uiStore.closePalette() },
    },
    {
      id: 'schema-inspector',
      label: 'Open Schema Inspector & DDL',
      description: 'View table indexes, constraints, and CREATE TABLE DDL',
      shortcut: '⌘I',
      iconComponent: PhCode,
      category: 'tools',
      action: () => {
        const tableName = schemaStore.activeTable ?? firstTable?.name
        if (tableName) uiStore.openInspector(tableName)
        uiStore.closePalette()
      },
    },
    {
      id: 'view-history',
      label: 'View Query History',
      description: 'Browse past executed SQL queries and logs',
      iconComponent: PhClockCounterClockwise,
      category: 'tools',
      action: () => {
        uiStore.openHistory()
        uiStore.closePalette()
      },
    },
    {
      id: 'toggle-sound',
      label: uiStore.soundsEnabled ? 'Mute Interaction Sounds' : 'Enable Interaction Sounds',
      description: 'Toggle audio feedback on button clicks and query runs',
      iconComponent: uiStore.soundsEnabled ? PhSpeakerSlash : PhSpeakerHigh,
      category: 'tools',
      action: () => { uiStore.toggleSounds(); uiStore.closePalette() },
    },
    {
      id: 'toggle-light-dark',
      label: `Toggle Theme Mode (${uiStore.theme === 'light' ? 'Switch to Dark' : 'Switch to Light'})`,
      description: 'Toggle between light, dark, and system color mode',
      iconComponent: uiStore.theme === 'light' ? PhMoon : PhSun,
      category: 'themes',
      action: () => { uiStore.toggleTheme(); uiStore.closePalette() },
    },
    {
      id: 'zoom-in',
      label: 'Zoom In Editor Text',
      shortcut: '⌘+',
      iconComponent: PhMagnifyingGlassPlus,
      category: 'tools',
      action: () => { editorStore.zoomIn(); uiStore.closePalette() },
    },
    {
      id: 'zoom-out',
      label: 'Zoom Out Editor Text',
      shortcut: '⌘-',
      iconComponent: PhMagnifyingGlassMinus,
      category: 'tools',
      action: () => { editorStore.zoomOut(); uiStore.closePalette() },
    },
    {
      id: 'zoom-reset',
      label: 'Reset Zoom (13px)',
      shortcut: '⌘0',
      iconComponent: PhMagnifyingGlass,
      category: 'tools',
      action: () => { editorStore.resetZoom(); uiStore.closePalette() },
    },
    {
      id: 'shortcuts',
      label: 'Keyboard Shortcuts Reference',
      description: 'View all keyboard shortcuts and key bindings',
      shortcut: '⌘⇧/',
      iconComponent: PhKeyboard,
      category: 'tools',
      action: () => { uiStore.openShortcuts(); uiStore.closePalette() },
    },
    {
      id: 'settings',
      label: 'Open Settings',
      description: 'Configure general preferences, editor font, and defaults',
      iconComponent: PhGear,
      category: 'tools',
      action: () => { uiStore.openSettings(); uiStore.closePalette() },
    },
  ]

  return [
    ...(queryCommands.length ? [{ label: 'Query & Editor Actions', category: 'query' as const, commands: queryCommands }] : []),
    ...(resultCommands.length ? [{ label: 'Results & Data Actions', category: 'query' as const, commands: resultCommands }] : []),
    ...(tableCommands.length ? [{ label: 'Database Tables', category: 'tables' as const, commands: tableCommands }] : []),
    ...(viewCommands.length ? [{ label: 'Database Views', category: 'tables' as const, commands: viewCommands }] : []),
    ...(functionCommands.length ? [{ label: 'Routines & Procedures', category: 'tables' as const, commands: functionCommands }] : []),
    ...(savedQueryCommands.length ? [{ label: 'Saved Queries & Snippets', category: 'query' as const, commands: savedQueryCommands }] : []),
    ...(connectionCommands.length ? [{ label: 'Connections', category: 'connections' as const, commands: connectionCommands }] : []),
    ...(databaseCommands.length ? [{ label: 'Database Schemas', category: 'connections' as const, commands: databaseCommands }] : []),
    ...(themeCommands.length ? [{ label: 'Themes & Appearance', category: 'themes' as const, commands: themeCommands }] : []),
    ...(navCommands.length ? [{ label: 'Tools & Navigation', category: 'tools' as const, commands: navCommands }] : []),
  ]
})

const filteredGroups = computed(() => {
  if (activeCategory.value === 'all') return allGroups.value
  return allGroups.value
    .filter(g => g.category === activeCategory.value)
    .filter(g => g.commands.length > 0)
})

const totalCommandCount = computed(() => {
  return allGroups.value.reduce((acc, g) => acc + g.commands.length, 0)
})

function execute(cmd: Command) {
  cmd.action()
}
</script>
