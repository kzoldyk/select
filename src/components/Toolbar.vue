<template>
  <header class="flex items-center justify-between h-12 px-3 border-b border-border bg-background flex-shrink-0 relative">
    <div 
      class="absolute top-0 left-0 right-0 h-[3px] transition-all duration-300"
      :style="{ backgroundColor: connectionColor }"
      :class="{ 'animate-pulse': isProd }"
    ></div>
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <Button variant="ghost" size="icon" class="text-muted-foreground hover:text-foreground h-8 w-8 transition-colors ease-premium duration-normal rounded-lg ml-1" aria-label="Toggle sidebar" @click="$emit('toggleSidebar')">
        <PanelLeft class="w-4.5 h-4.5 opacity-80" />
      </Button>
      <img
        src="@/assets/select-logo.svg"
        alt="Select Logo"
        class="h-5 w-5 object-contain flex-shrink-0 ml-1.5"
        aria-hidden="true"
      />

      <button
        class="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all ease-premium duration-normal bg-transparent"
        aria-label="Open connection manager"
        @click="$emit('openConnManager')"
      >
        <span 
          class="w-1.5 h-1.5 rounded-full flex-shrink-0"
          :class="{ 'shadow-[0_0_8px_currentColor]': connStore.status === 'connected' }"
          :style="{ backgroundColor: connectionColor, color: connectionColor }"
        ></span>
        <span class="text-foreground">{{ connectionName }}</span>
        <ChevronDown class="w-3.5 h-3.5 opacity-50" />
      </button>

      <span
        v-if="envName"
        class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase leading-none select-none"
        :style="{ backgroundColor: `${connectionColor}20`, color: connectionColor }"
      >{{ envName }}</span>
    </div>

    <div class="flex-1 flex justify-center max-w-md">
      <button
        class="flex items-center gap-2 border border-border bg-muted/40 rounded-lg px-3 h-8 text-[13px] text-muted-foreground hover:border-border/80 hover:bg-muted/80 transition-all ease-premium duration-normal w-full max-w-[320px] shadow-sm"
        aria-label="Open command palette (⌘K)"
        @click="$emit('openPalette')"
      >
        <Search class="w-3.5 h-3.5 opacity-70" />
        <span class="flex-1 text-left">Search commands…</span>
        <Kbd class="text-[10px] bg-background/50 border-border/50">⌘K</Kbd>
      </button>
    </div>

    <div class="flex items-center justify-end gap-1.5 flex-1">
      <Button variant="ghost" size="icon" class="text-muted-foreground hover:text-foreground h-8 w-8 transition-colors ease-premium duration-normal rounded-lg" aria-label="Open settings" @click="$emit('openSettings')">
        <Settings class="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" class="h-4 mx-1 opacity-50" />

      <Button class="text-[13px] h-8 px-4 gap-1.5 shadow-sm rounded-lg font-medium transition-all ease-premium duration-normal active:scale-[0.97]" @click="$emit('run')">
        <Play class="w-3.5 h-3.5 fill-current" />
        Run
      </Button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Kbd } from '@/components/ui/kbd'
import {
  Database, ChevronDown, Search, Settings, Play, PanelLeft
} from '@lucide/vue'
import { useConnectionStore, type Connection } from '../stores/connection'

const connStore = useConnectionStore()

const props = defineProps<{
  connection: Connection | null
}>()

defineEmits<{
  run: []
  openPalette: []
  openConnManager: []
  openSettings: []
  toggleSidebar: []
}>()

const connectionName = computed(() => props.connection?.name ?? 'No connection')
const connectionColor = computed(() => props.connection?.color ?? '#9CA3AF')

const isProd = computed(() => props.connection?.color?.toUpperCase() === '#EF4444')

const envName = computed(() => {
  const color = props.connection?.color?.toUpperCase()
  if (!color) return null
  switch (color) {
    case '#EF4444': return 'PROD'
    case '#F59E0B': return 'STAGING'
    case '#22C55E': return 'DEV'
    case '#3B82F6': return 'LOCAL'
    default: return null
  }
})
</script>
