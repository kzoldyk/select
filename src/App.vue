<template>
  <div class="app" :style="appGridStyle">
    <Toolbar
      class="app-header"
      :connection="connStore.activeConnection"
      @run="runQuery"
      @open-palette="uiStore.openPalette()"
      @open-conn-manager="uiStore.openConnectionManager()"
      @open-settings="uiStore.openSettings()"
      @toggle-sidebar="uiStore.toggleSidebar()"
    />

    <Sidebar class="app-sidebar" />

    <main class="main-content app-main" ref="mainRef">
      <div
        class="editor-pane"
        :style="{ height: editorPaneHeight }"
      >
        <QueryEditor @run="runQuery" @explain="explainQuery" ref="queryEditorRef" />
      </div>

      <div
        class="resize-handle group"
        role="separator"
        aria-label="Resize editor and result panels"
        aria-orientation="horizontal"
        @pointerdown="startResize"
        @dblclick="resetSplit"
      >
        <div class="resize-handle-icon group-hover:opacity-100 group-active:opacity-100 flex items-center justify-center gap-0.5 px-2 h-3.5 bg-muted/80 border border-border/80 rounded-full opacity-0 shadow-sm transition-all absolute pointer-events-none">
          <div class="w-1 h-1 rounded-full bg-muted-foreground/50 group-hover:bg-primary/80"></div>
          <div class="w-1 h-1 rounded-full bg-muted-foreground/50 group-hover:bg-primary/80"></div>
          <div class="w-1 h-1 rounded-full bg-muted-foreground/50 group-hover:bg-primary/80"></div>
        </div>
      </div>

      <div class="result-pane" :style="{ height: resultPaneHeight }">
        <ResultPanel />
      </div>
    </main>

    <StatusBar class="app-footer" />

    <div class="overlays">
      <CommandPalette @run="runQuery" />
      <ConnectionManager />
      <SchemaInspector />
      <SaveQueryDialog />
      <DestructiveQueryDialog />
      <KeyboardShortcuts />
      <ExportDialog />
      <SettingsDialog />
      <Toaster />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Toolbar from './components/Toolbar.vue'
import Sidebar from './components/Sidebar.vue'
import QueryEditor from './components/QueryEditor.vue'
import ResultPanel from './components/ResultPanel.vue'
import StatusBar from './components/StatusBar.vue'
import CommandPalette from './components/CommandPalette.vue'
import ConnectionManager from './components/ConnectionManager.vue'
import SchemaInspector from './components/SchemaInspector.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'vue-sonner'
import SaveQueryDialog from './components/SaveQueryDialog.vue'
import DestructiveQueryDialog from './components/DestructiveQueryDialog.vue'
import KeyboardShortcuts from './components/KeyboardShortcuts.vue'
import ExportDialog from './components/ExportDialog.vue'

import { useConnectionStore } from './stores/connection'
import { useEditorStore } from './stores/editor'
import { useResultStore } from './stores/result'
import { useUiStore } from './stores/ui'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'

const connStore = useConnectionStore()
const editorStore = useEditorStore()
const resultStore = useResultStore()
const uiStore = useUiStore()
const queryEditorRef = ref<InstanceType<typeof QueryEditor> | null>(null)

let mediaQueryList: MediaQueryList | null = null

const handleSystemThemeChange = (e: MediaQueryListEvent) => {
  uiStore.updateSystemTheme(e.matches)
}

onMounted(async () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')
    uiStore.updateSystemTheme(mediaQueryList.matches)
    mediaQueryList.addEventListener('change', handleSystemThemeChange)
  }

  uiStore.applyTheme()
  await connStore.load()
  editorStore.loadSplitRatio()
  if (connStore.activeId) {
    const connected = await connStore.connect(connStore.activeId)
    if (!connected && connStore.lastError) {
      toast.error('Connection failed', { description: connStore.lastError })
    }
  }
})

onUnmounted(() => {
  if (mediaQueryList) {
    mediaQueryList.removeEventListener('change', handleSystemThemeChange)
  }
})

useKeyboardShortcuts(runQuery)

const appGridStyle = computed(() => ({
  gridTemplateColumns: uiStore.sidebarOpen ? '260px 1fr' : '0 1fr',
}))

async function runQuery(sqlOverride?: string) {
  const tab = editorStore.activeTab
  if (!tab) return
  const sql = sqlOverride ?? queryEditorRef.value?.getCurrentSql() ?? tab.sql
  await resultStore.runQuery(sql)
}

async function explainQuery() {
  const tab = editorStore.activeTab
  if (!tab) return
  const sql = queryEditorRef.value?.getCurrentSql() ?? tab.sql
  await resultStore.explainQuery(sql)
}

const mainRef = ref<HTMLDivElement | null>(null)
let isResizing = false
let startY = 0
let startRatio = 0

const editorPaneHeight = computed(() =>
  `calc(${editorStore.splitRatio * 100}% - 2px)`
)
const resultPaneHeight = computed(() =>
  `calc(${(1 - editorStore.splitRatio) * 100}% - 2px)`
)

function startResize(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  isResizing = true
  startY = e.clientY
  startRatio = editorStore.splitRatio
  el.addEventListener('pointermove', onResize)
  el.addEventListener('pointerup', stopResize)
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
}

function onResize(e: PointerEvent) {
  if (!isResizing || !mainRef.value) return
  const mainH = mainRef.value.clientHeight
  const delta = e.clientY - startY
  const newRatio = startRatio + delta / mainH
  editorStore.setSplitRatio(newRatio)
}

function stopResize(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  el.removeEventListener('pointermove', onResize)
  el.removeEventListener('pointerup', stopResize)
  isResizing = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

function resetSplit() {
  editorStore.setSplitRatio(0.5)
}
</script>

<style>
@import './styles/tokens.css';

.app {
  display: grid;
  grid-template-rows: 48px 1fr 32px;
  grid-template-columns: 260px 1fr;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  height: 100vh;
  overflow: hidden;
  transition: grid-template-columns 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.app-header { grid-area: header; z-index: 20; }
.app-sidebar { grid-area: sidebar; border-right: 1px solid var(--border); overflow: hidden; }
.app-main { grid-area: main; z-index: 10; }
.app-footer { grid-area: footer; z-index: 20; }

.main-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

.editor-pane {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.result-pane {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.resize-handle {
  height: 8px;
  background: transparent;
  cursor: row-resize;
  flex-shrink: 0;
  transition: background 180ms cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}
.resize-handle::after {
  content: '';
  display: block;
  width: 100%;
  height: 1px;
  background: var(--border);
  transition: background 180ms cubic-bezier(0.16, 1, 0.3, 1);
}
.resize-handle:hover::after { background: var(--ring); }
.resize-handle:hover { background: var(--ring); }

.overlays {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 999;
}
.overlays > * {
  pointer-events: auto;
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--muted-foreground); }
</style>
