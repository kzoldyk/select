<template>
  <footer class="flex items-center justify-between h-8 px-3 border-t border-border/80 chrome-bar text-[11px] font-mono text-muted-foreground flex-shrink-0 relative select-none">
    <!-- Bottom-Left: Connection Switcher Dropdown -->
    <div class="flex items-center gap-3 min-w-0" ref="connMenuRef">
      <div class="relative">
        <ActionTooltip text="Switch Connection">
          <button
            class="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-accent/60 transition-colors text-foreground cursor-pointer border border-border/50 bg-background/50 text-[11px] font-mono shadow-2xs"
            @click="showConnMenu = !showConnMenu"
          >
            <!-- Colored Environment / Connection Dot -->
            <span 
              class="w-2 h-2 rounded-full flex-shrink-0"
              :style="{ backgroundColor: connStore.activeConnection?.color || '#10B981' }"
            ></span>
            
            <span class="font-semibold text-foreground truncate max-w-[140px]">
              {{ connStore.activeConnection?.name || 'No Connection' }}
            </span>

            <span v-if="connStore.activeConnection?.database" class="text-muted-foreground/70 text-[10px] truncate max-w-[100px]">
              ({{ connStore.activeConnection.database }})
            </span>

            <PhCaretDown class="w-2.5 h-2.5 text-muted-foreground/70 flex-shrink-0" />
          </button>
        </ActionTooltip>

        <!-- Dropdown Menu for Connection Switcher -->
        <div
          v-if="showConnMenu"
          class="absolute bottom-full left-0 mb-1.5 z-50 w-64 py-1 bg-popover border border-border/80 rounded-lg shadow-2xl text-xs font-mono animate-in fade-in-50 zoom-in-95 duration-fast"
          @click.stop
        >
          <div class="px-3 py-1.5 text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground/70 border-b border-border/40 flex items-center justify-between">
            <span>Connections</span>
            <span class="text-[9px] font-normal text-muted-foreground/50">{{ connStore.connections.length }} saved</span>
          </div>
          
          <div class="max-h-56 overflow-y-auto py-1">
            <button
              v-for="conn in connStore.connections"
              :key="conn.id"
              class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/70 transition-colors cursor-pointer text-left border-none bg-transparent"
              :class="{ 'bg-primary/10 text-primary font-semibold': conn.id === connStore.activeId }"
              @click="switchConnection(conn.id)"
            >
              <div class="flex items-center gap-2 truncate">
                <span
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: conn.color || '#10B981' }"
                ></span>
                <div class="truncate">
                  <div class="truncate text-[11.5px]">{{ conn.name }}</div>
                  <div class="text-[9px] text-muted-foreground/70 truncate">{{ conn.host }}:{{ conn.port }}</div>
                </div>
              </div>
              <PhCheck v-if="conn.id === connStore.activeId" class="w-3.5 h-3.5 text-primary flex-shrink-0" />
            </button>

            <div v-if="!connStore.connections.length" class="px-3 py-3 text-center text-muted-foreground text-[10.5px]">
              No saved connections
            </div>
          </div>

          <div class="h-px bg-border/60 my-1"></div>

          <div class="p-1 flex flex-col gap-0.5">
            <button
              class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent text-[11px]"
              @click="openNewConnection"
            >
              <PhPlug class="w-3.5 h-3.5 text-primary" />
              <span>New / Manage Connections…</span>
            </button>

            <button
              v-if="connStore.status === 'connected'"
              class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors cursor-pointer border-none bg-transparent text-[11px]"
              @click="disconnect"
            >
              <PhPower class="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      </div>

      <span class="w-px h-3 bg-border/60"></span>

      <!-- Ping Health Latency -->
      <div class="flex items-center gap-1 text-[10px] text-muted-foreground/80">
        <PhActivity class="w-3 h-3 text-emerald-500" />
        <span>{{ pingLatency !== null ? `${pingLatency}ms` : 'Connected' }}</span>
      </div>

      <!-- Transaction State (if any) -->
      <template v-if="isInTransaction">
        <span class="w-px h-3 bg-border/60"></span>
        <div class="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-500 font-semibold animate-pulse">
          <PhWarning class="w-3 h-3" />
          <span>IN TRANSACTION</span>
          <button class="px-1 bg-amber-500/20 hover:bg-amber-500/30 rounded text-[9px] cursor-pointer border-none text-amber-400" @click="runCommit">Commit</button>
          <button class="px-1 bg-red-500/20 hover:bg-red-500/30 rounded text-[9px] cursor-pointer border-none text-red-400" @click="runRollback">Rollback</button>
        </div>
      </template>
    </div>

    <!-- Center: Running Feedback & Cancel Action -->
    <div v-if="resultStore.status === 'running'" class="flex items-center gap-2 text-primary font-medium">
      <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <span>Executing query…</span>
      <button
        class="ml-1 px-1.5 py-0.5 rounded bg-destructive/15 hover:bg-destructive/25 text-destructive text-[10px] font-semibold transition-colors cursor-pointer border border-destructive/30"
        :disabled="resultStore.cancelling"
        @click="resultStore.cancelQuery()"
      >
        {{ resultStore.cancelling ? 'Cancelling…' : 'Cancel' }}
      </button>
    </div>

    <!-- Right Side: Editor Info & Tools (Settings, Sound, Theme) -->
    <div class="flex items-center gap-2.5 text-muted-foreground/80">
      <span class="font-mono text-[10px]">
        Ln {{ editorStore.activeTab?.cursorLine ?? 1 }}, Col {{ editorStore.activeTab?.cursorCol ?? 1 }}
      </span>

      <span class="w-px h-3 bg-border/60"></span>
      <span>UTF-8</span>
      <span class="w-px h-3 bg-border/60"></span>
      <span>MySQL</span>

      <span class="w-px h-3 bg-border/60"></span>

      <!-- Sound / Voice Effect Toggle -->
      <ActionTooltip :text="uiStore.soundsEnabled ? 'Mute interaction sounds' : 'Enable interaction sounds'">
        <button
          class="flex items-center justify-center p-1 rounded hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer border-none bg-transparent"
          @click="uiStore.toggleSounds()"
          :aria-label="uiStore.soundsEnabled ? 'Mute interaction sounds' : 'Enable interaction sounds'"
        >
          <PhSpeakerHigh v-if="uiStore.soundsEnabled" class="w-3.5 h-3.5 text-foreground" />
          <PhSpeakerSlash v-else class="w-3.5 h-3.5 text-muted-foreground/50" />
        </button>
      </ActionTooltip>

      <!-- Theme Switcher -->
      <ActionTooltip :text="`Theme: ${uiStore.theme}`">
        <button
          class="flex items-center justify-center p-1 rounded hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer border-none bg-transparent"
          @click="uiStore.toggleTheme()"
          aria-label="Toggle theme"
        >
          <PhSun v-if="uiStore.theme === 'light'" class="w-3.5 h-3.5 text-amber-400" />
          <PhMoon v-else class="w-3.5 h-3.5 text-blue-400" />
        </button>
      </ActionTooltip>

      <!-- Settings Gear Button -->
      <ActionTooltip text="Settings (⌘,)">
        <button
          class="flex items-center justify-center p-1 rounded hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer border-none bg-transparent"
          @click="uiStore.openSettings()"
          aria-label="Open settings"
        >
          <PhGear class="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
        </button>
      </ActionTooltip>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ActionTooltip } from '@/components/ui/tooltip'
import {
  PhActivity, PhWarning, PhSun, PhMoon, PhSpeakerHigh, PhSpeakerSlash,
  PhGear, PhCaretDown, PhCheck, PhPlug, PhPower
} from '@phosphor-icons/vue'
import { useConnectionStore } from '../stores/connection'
import { useResultStore } from '../stores/result'
import { useEditorStore } from '../stores/editor'
import { useUiStore } from '../stores/ui'
import { toast } from 'vue-sonner'

const connStore = useConnectionStore()
const resultStore = useResultStore()
const editorStore = useEditorStore()
const uiStore = useUiStore()

const showConnMenu = ref(false)
const connMenuRef = ref<HTMLDivElement | null>(null)
const pingLatency = ref<number | null>(null)
const isInTransaction = ref(false)
let pingInterval: ReturnType<typeof setInterval> | null = null

async function switchConnection(id: string) {
  showConnMenu.value = false
  if (id !== connStore.activeId || connStore.status !== 'connected') {
    const ok = await connStore.connect(id)
    if (ok) {
      toast.success(`Connected to ${connStore.activeConnection?.name}`)
    }
  }
}

function openNewConnection() {
  showConnMenu.value = false
  uiStore.openConnectionManager()
}

async function disconnect() {
  showConnMenu.value = false
  await connStore.disconnect()
  toast.info('Disconnected')
}

async function checkHealth() {
  if (connStore.status === 'connected' && connStore.activeId) {
    const start = performance.now()
    try {
      await connStore.ping()
      pingLatency.value = Math.round(performance.now() - start)
    } catch {
      pingLatency.value = null
    }
  }
}

function runCommit() {
  resultStore.runQuery('COMMIT;')
  isInTransaction.value = false
  toast.success('Transaction committed')
}

function runRollback() {
  resultStore.runQuery('ROLLBACK;')
  isInTransaction.value = false
  toast.info('Transaction rolled back')
}

function handleDocClick(e: MouseEvent) {
  if (connMenuRef.value && !connMenuRef.value.contains(e.target as Node)) {
    showConnMenu.value = false
  }
}

onMounted(() => {
  checkHealth()
  pingInterval = setInterval(checkHealth, 30000)
  document.addEventListener('click', handleDocClick)
})

onUnmounted(() => {
  if (pingInterval) clearInterval(pingInterval)
  document.removeEventListener('click', handleDocClick)
})
</script>
