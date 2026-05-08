<template>
  <div
    class="app"
    :style="appGridStyle"
  >
    <!-- Toolbar (spans full width) -->
    <Toolbar
      :connection-name="connStore.activeConnection?.name ?? 'No connection'"
      :env="connStore.env"
      @run="runQuery"
      @open-palette="uiStore.openPalette()"
      @open-conn-manager="uiStore.openConnectionManager()"
      @open-settings="uiStore.openConnectionManager()"
      @open-history="uiStore.historyOpen = true"
      @open-share="undefined"
    />

    <!-- Sidebar -->
    <Sidebar />

    <!-- Main content area (editor + resize handle + result) -->
    <main class="main-content" ref="mainRef">
      <!-- Editor pane -->
      <div
        class="editor-pane"
        :style="{ height: editorPaneHeight }"
      >
        <QueryEditor @run="runQuery" />
      </div>

      <!-- Resize handle -->
      <div
        class="resize-handle"
        role="separator"
        aria-label="Resize editor and result panels"
        aria-orientation="horizontal"
        @mousedown="startResize"
        @dblclick="resetSplit"
      ></div>

      <!-- Result pane -->
      <div class="result-pane" :style="{ height: resultPaneHeight }">
        <ResultPanel />
      </div>
    </main>

    <!-- Status bar (spans full width) -->
    <StatusBar />

    <!-- Overlays -->
    <CommandPalette @run="runQuery" />
    <ConnectionManager />
    <SchemaInspector />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Toolbar from './components/Toolbar.vue'
import Sidebar from './components/Sidebar.vue'
import QueryEditor from './components/QueryEditor.vue'
import ResultPanel from './components/ResultPanel.vue'
import StatusBar from './components/StatusBar.vue'
import CommandPalette from './components/CommandPalette.vue'
import ConnectionManager from './components/ConnectionManager.vue'
import SchemaInspector from './components/SchemaInspector.vue'

import { useConnectionStore } from './stores/connection'
import { useEditorStore } from './stores/editor'
import { useResultStore } from './stores/result'
import { useUiStore } from './stores/ui'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'

const connStore = useConnectionStore()
const editorStore = useEditorStore()
const resultStore = useResultStore()
const uiStore = useUiStore()

// Load persisted split and connect
onMounted(async () => {
  editorStore.loadSplitRatio()
  if (connStore.activeId) {
    await connStore.connect(connStore.activeId)
  }
})

// Keyboard shortcuts
useKeyboardShortcuts(runQuery)

// App grid style — sidebar open/closed
const appGridStyle = computed(() => ({
  gridTemplateColumns: uiStore.sidebarOpen ? '220px 1fr' : '0 1fr',
}))

// Run query
async function runQuery() {
  const tab = editorStore.activeTab
  if (!tab) return
  editorStore.saveTab(tab.id)
  await resultStore.runQuery(tab.sql)
}

// Resize logic
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

function startResize(e: MouseEvent) {
  isResizing = true
  startY = e.clientY
  startRatio = editorStore.splitRatio

  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
}

function onResize(e: MouseEvent) {
  if (!isResizing || !mainRef.value) return
  const mainH = mainRef.value.clientHeight
  const delta = e.clientY - startY
  const newRatio = startRatio + delta / mainH
  editorStore.setSplitRatio(newRatio)
}

function stopResize() {
  isResizing = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
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
  grid-template-rows: 40px 1fr 28px;
  grid-template-columns: 220px 1fr;
  height: 100vh;
  background: var(--bg);
  overflow: hidden;
  transition: grid-template-columns 0.15s ease;
}

/* Toolbar and statusbar span full width */
.app > :first-child { grid-column: 1 / -1; }
.app > :last-child  { grid-column: 1 / -1; }

/* Main content */
.main-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

/* Editor and result panes */
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

/* Resize handle */
.resize-handle {
  height: 4px;
  background: var(--border);
  cursor: row-resize;
  flex-shrink: 0;
  transition: background 0.15s;
  position: relative;
  z-index: 10;
}
.resize-handle:hover { background: var(--blue); }
</style>