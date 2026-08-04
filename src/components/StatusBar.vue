<template>
  <footer class="flex items-center justify-between h-8 px-3 border-t border-border/60 bg-background text-[11px] font-medium text-muted-foreground flex-shrink-0 relative">
    <!-- Bottom-Left Connection Switcher & Status -->
    <div class="flex items-center gap-3 min-w-0">
      <!-- Connection Switcher Dropdown Trigger -->
      <div class="relative" ref="connMenuRef">
        <button
          class="flex items-center gap-2 px-1.5 py-0.5 rounded hover:bg-accent/60 transition-colors text-foreground cursor-pointer border-none bg-transparent"
          @click="showConnMenu = !showConnMenu"
          :title="activeConnLabel"
        >
          <!-- Glowing dot according to connection color -->
          <span 
            class="w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300"
            :style="dotStyle"
          ></span>
          
          <span class="font-semibold tracking-tight max-w-[130px] truncate text-[11px]">
            {{ connStore.activeConnection?.name || 'No Connection' }}
          </span>

          <span v-if="connStore.activeConnection?.database" class="text-muted-foreground text-[10px]">
            ({{ connStore.activeConnection.database }})
          </span>

          <PhCaretDown class="w-2.5 h-2.5 text-muted-foreground/70 flex-shrink-0" />
        </button>

        <!-- Dropdown Menu for Connection Switcher -->
        <div
          v-if="showConnMenu"
          class="absolute bottom-full left-0 mb-1 z-50 w-56 py-1 bg-popover border border-border/80 rounded-md shadow-lg text-[11px] animate-in fade-in-50 zoom-in-95"
        >
          <div class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Connections
          </div>
          
          <div class="max-h-48 overflow-y-auto">
            <button
              v-for="conn in connStore.connections"
              :key="conn.id"
              class="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-accent/60 transition-colors cursor-pointer text-left border-none bg-transparent"
              :class="{ 'bg-accent/40 font-medium text-foreground': conn.id === connStore.activeId }"
              @click="switchConnection(conn.id)"
            >
              <div class="flex items-center gap-2 truncate">
                <span
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: conn.color || '#6B7280' }"
                ></span>
                <span class="truncate">{{ conn.name }}</span>
              </div>
              <PhCheck v-if="conn.id === connStore.activeId" class="w-3.5 h-3.5 text-primary flex-shrink-0" />
            </button>

            <div v-if="!connStore.connections.length" class="px-2.5 py-1.5 text-muted-foreground text-[10px]">
              No saved connections
            </div>
          </div>

          <div class="h-px bg-border/60 my-1"></div>

          <button
            class="w-full flex items-center gap-2 px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer border-none bg-transparent"
            @click="openManager"
          >
            <PhPlug class="w-3.5 h-3.5 text-muted-foreground" />
            <span>Manage Connections…</span>
          </button>

          <button
            v-if="connStore.status === 'connected'"
            class="w-full flex items-center gap-2 px-2.5 py-1.5 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer border-none bg-transparent"
            @click="disconnect"
          >
            <PhPower class="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </button>
        </div>
      </div>

      <div v-if="resultStore.status !== 'idle'" class="flex items-center gap-1.5" :class="runStatusClass">
        <span class="w-px h-3 bg-border/60 mx-0.5"></span>
        <span class="font-mono tabular-nums text-[10px]">{{ runStatusText }}</span>
      </div>
    </div>

    <!-- Right Side Status Info -->
    <div class="flex items-center gap-3 text-muted-foreground/80 cursor-default">
      <span class="font-mono text-[10px]">
        Ln {{ editorStore.activeTab?.cursorLine ?? 1 }}, Col {{ editorStore.activeTab?.cursorCol ?? 1 }}
        <template v-if="editorStore.activeTab?.selectedTextCount">
          ({{ editorStore.activeTab.selectedTextCount }} selected)
        </template>
      </span>
      <span class="w-px h-3 bg-border/60"></span>
      <span>UTF-8</span>
      <span class="w-px h-3 bg-border/60"></span>
      <span>SQL</span>
      <span class="w-px h-3 bg-border/60"></span>
      <button
        class="flex items-center justify-center hover:text-foreground transition-colors cursor-pointer border-none bg-transparent"
        @click="uiStore.toggleTheme()"
        :title="`Theme: ${uiStore.theme.charAt(0).toUpperCase() + uiStore.theme.slice(1)}`"
      >
        <PhSun v-if="uiStore.theme === 'light'" class="w-3.5 h-3.5" />
        <PhMoon v-else-if="uiStore.theme === 'dark'" class="w-3.5 h-3.5" />
        <PhMonitor v-else class="w-3.5 h-3.5" />
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { PhSun, PhMoon, PhMonitor, PhCaretDown, PhPlug, PhCheck, PhPower } from '@phosphor-icons/vue'
import { useConnectionStore } from '../stores/connection'
import { useResultStore } from '../stores/result'
import { useEditorStore } from '../stores/editor'
import { useUiStore } from '../stores/ui'

const connStore = useConnectionStore()
const resultStore = useResultStore()
const editorStore = useEditorStore()
const uiStore = useUiStore()

const showConnMenu = ref(false)
const connMenuRef = ref<HTMLDivElement | null>(null)

const activeDotColor = computed(() => {
  if (connStore.status === 'connected') {
    return connStore.activeConnection?.color || '#10B981'
  }
  switch (connStore.status) {
    case 'connecting': return '#F59E0B'
    case 'error':      return '#EF4444'
    default:           return '#6B7280'
  }
})

const dotStyle = computed(() => {
  const color = activeDotColor.value
  const isGlowing = connStore.status === 'connected' || connStore.status === 'connecting' || connStore.status === 'error'
  return {
    backgroundColor: color,
    boxShadow: isGlowing
      ? `0 0 8px ${color}, 0 0 14px ${color}80`
      : 'none',
  }
})

const activeConnLabel = computed(() => {
  const conn = connStore.activeConnection
  if (!conn) return 'No active connection'
  return `${conn.name} (${conn.host}:${conn.port}) - Status: ${connStore.status}`
})

const runStatusText = computed(() => {
  switch (resultStore.status) {
    case 'running': return 'Running…'
    case 'success': return `Query OK · ${resultStore.duration}ms · ${resultStore.rowCount} rows`
    case 'error':   return 'Query Error'
    default:        return 'Ready'
  }
})

const runStatusClass = computed(() => {
  switch (resultStore.status) {
    case 'running': return 'text-amber-500'
    case 'success': return 'text-emerald-500'
    case 'error':   return 'text-red-500'
    default:        return ''
  }
})

async function switchConnection(id: string) {
  showConnMenu.value = false
  if (id === connStore.activeId && connStore.status === 'connected') return
  await connStore.connect(id)
}

function openManager() {
  showConnMenu.value = false
  uiStore.openConnectionManager()
}

async function disconnect() {
  showConnMenu.value = false
  await connStore.disconnect()
}

function handleClickOutside(e: MouseEvent) {
  if (connMenuRef.value && !connMenuRef.value.contains(e.target as Node)) {
    showConnMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
