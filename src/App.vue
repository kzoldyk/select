<template>
  <div class="app dark" :style="appGridStyle">
    <Toolbar
      :connection-name="connStore.activeConnection?.name ?? 'No connection'"
      :env="connStore.env"
      @run="runQuery"
      @open-palette="uiStore.openPalette()"
      @open-conn-manager="uiStore.openConnectionManager()"
      @open-settings="uiStore.openConnectionManager()"
    />

    <Sidebar />

    <main class="main-content" ref="mainRef">
      <div
        class="editor-pane"
        :style="{ height: editorPaneHeight }"
      >
        <QueryEditor @run="runQuery" @explain="explainQuery" />
      </div>

      <div
        class="resize-handle"
        role="separator"
        aria-label="Resize editor and result panels"
        aria-orientation="horizontal"
        @mousedown="startResize"
        @dblclick="resetSplit"
      ></div>

      <div class="result-pane" :style="{ height: resultPaneHeight }">
        <ResultPanel />
      </div>
    </main>

    <StatusBar />

    <div class="overlays">
      <CommandPalette @run="runQuery" />
      <ConnectionManager />
      <SchemaInspector />
      <SaveQueryDialog />
      <Toaster />
    </div>
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
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'vue-sonner'
import SaveQueryDialog from './components/SaveQueryDialog.vue'

import { useConnectionStore } from './stores/connection'
import { useEditorStore } from './stores/editor'
import { useResultStore } from './stores/result'
import { useUiStore } from './stores/ui'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'

const connStore = useConnectionStore()
const editorStore = useEditorStore()
const resultStore = useResultStore()
const uiStore = useUiStore()

onMounted(async () => {
  document.documentElement.classList.add('dark')
  await connStore.load()
  editorStore.loadSplitRatio()
  if (connStore.activeId) {
    const connected = await connStore.connect(connStore.activeId)
    if (!connected && connStore.lastError) {
      toast.error('Connection failed', { description: connStore.lastError })
    }
  }
})

useKeyboardShortcuts(runQuery)

const appGridStyle = computed(() => ({
  gridTemplateColumns: uiStore.sidebarOpen ? '220px 1fr' : '0 1fr',
}))

async function runQuery(sqlOverride?: string) {
  const tab = editorStore.activeTab
  if (!tab) return
  await resultStore.runQuery(sqlOverride ?? tab.sql)
}

async function explainQuery() {
  const tab = editorStore.activeTab
  if (!tab) return
  await resultStore.explainQuery(tab.sql)
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

function startResize(e: MouseEvent) {
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
  grid-template-rows: 40px 1fr 28px;
  grid-template-columns: 220px 1fr;
  height: 100vh;
  overflow: hidden;
  transition: grid-template-columns 0.15s ease;
}

.app > :first-child { grid-column: 1 / -1; }
.app > :last-child  { grid-column: 1 / -1; }

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
  height: 4px;
  background: hsl(var(--border));
  cursor: row-resize;
  flex-shrink: 0;
  transition: background 0.15s;
  position: relative;
  z-index: 10;
}
.resize-handle:hover { background: hsl(var(--ring)); }

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
::-webkit-scrollbar-thumb { background: hsl(var(--muted)); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }
</style>
