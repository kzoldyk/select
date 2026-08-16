<template>
  <div class="relative" ref="switcherRef">
    <slot :toggle="toggle" :isOpen="isOpen">
      <button
        class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent/60 transition-colors text-foreground cursor-pointer border border-border/50 bg-background/50 text-xs shadow-2xs font-mono"
        @click="toggle"
      >
        <span
          class="w-2 h-2 rounded-full flex-shrink-0"
          :style="{ backgroundColor: activeConnColor }"
        ></span>
        <span class="font-semibold truncate max-w-[130px]">
          {{ connStore.activeConnection?.name || 'Select Connection' }}
        </span>
        <PhCaretDown class="w-3 h-3 text-muted-foreground" />
      </button>
    </slot>

    <!-- Popover dropdown -->
    <div
      v-if="isOpen"
      class="absolute top-full mt-1 left-0 z-50 w-72 bg-popover border border-border/80 rounded-lg shadow-2xl py-1 text-xs select-none font-mono animate-in fade-in-50 zoom-in-95 duration-fast"
      @click.stop
    >
      <!-- Search -->
      <div class="p-2 border-b border-border/60">
        <div class="relative flex items-center">
          <PhMagnifyingGlass class="w-3.5 h-3.5 absolute left-2 text-muted-foreground/60 pointer-events-none" />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            placeholder="Search connections…"
            class="h-7 w-full rounded border border-border/60 bg-background/80 pl-7 pr-2 text-[11px] font-mono outline-none focus:border-primary"
            @keydown.down.prevent="focusFirst"
          />
        </div>
      </div>

      <!-- Connections List -->
      <div class="max-h-60 overflow-y-auto py-1">
        <div class="px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Saved Connections
        </div>

        <button
          v-for="(conn, idx) in filteredConnections"
          :key="conn.id"
          class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/70 transition-colors cursor-pointer text-left border-none bg-transparent"
          :class="{ 'bg-primary/10 text-primary font-semibold': conn.id === connStore.activeId }"
          @click="selectConnection(conn.id)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span
              class="w-2 h-2 rounded-full flex-shrink-0"
              :style="{ backgroundColor: conn.color || '#10B981' }"
            ></span>
            <div class="min-w-0">
              <div class="truncate text-[11.5px] flex items-center gap-1">
                <span>{{ conn.name }}</span>
                <span v-if="conn.readOnly" class="text-[9px] text-amber-500 font-normal">[RO]</span>
              </div>
              <div class="text-[9.5px] text-muted-foreground/70 truncate">
                {{ conn.host }}:{{ conn.port }}
              </div>
            </div>
          </div>

          <PhCheck v-if="conn.id === connStore.activeId" class="w-3.5 h-3.5 text-primary flex-shrink-0" />
        </button>

        <div v-if="filteredConnections.length === 0" class="px-3 py-3 text-center text-[10.5px] text-muted-foreground">
          No connections match
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="border-t border-border/60 p-1.5 bg-muted/20 flex items-center justify-between gap-1">
        <Button
          variant="ghost"
          size="sm"
          class="h-6.5 px-2 text-[10.5px] gap-1 text-muted-foreground hover:text-foreground w-full justify-start"
          @click="openNewConnection"
        >
          <PhPlus class="w-3 h-3" />
          <span>New Connection</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          class="h-6.5 px-2 text-[10.5px] gap-1 text-muted-foreground hover:text-foreground w-full justify-start"
          @click="openManager"
        >
          <PhGear class="w-3 h-3" />
          <span>Manage All</span>
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'
import { PhCaretDown, PhMagnifyingGlass, PhCheck, PhPlus, PhGear } from '@phosphor-icons/vue'
import { useConnectionStore } from '@/stores/connection'
import { useUiStore } from '@/stores/ui'

const connStore = useConnectionStore()
const uiStore = useUiStore()

const isOpen = ref(false)
const searchQuery = ref('')
const switcherRef = ref<HTMLDivElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const activeConnColor = computed(() => {
  return connStore.activeConnection?.color || '#10B981'
})

const filteredConnections = computed(() => {
  if (!searchQuery.value.trim()) return connStore.connections
  const q = searchQuery.value.toLowerCase()
  return connStore.connections.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.host.toLowerCase().includes(q) ||
    c.database.toLowerCase().includes(q)
  )
})

function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
}

async function selectConnection(id: string) {
  isOpen.value = false
  if (id !== connStore.activeId || connStore.status !== 'connected') {
    await connStore.connect(id)
  }
}

function openNewConnection() {
  isOpen.value = false
  uiStore.openConnectionManager()
}

function openManager() {
  isOpen.value = false
  uiStore.openConnectionManager()
}

function focusFirst() {
  // Focus navigation
}

function handleDocClick(e: MouseEvent) {
  if (switcherRef.value && !switcherRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocClick)
})
</script>
