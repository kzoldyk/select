<template>
  <header class="flex items-center justify-between h-12 px-3 border-b border-border bg-background flex-shrink-0">
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <img
        src="@/assets/select-logo.png"
        alt=""
        class="h-6 w-6 rounded-sm object-contain flex-shrink-0"
        aria-hidden="true"
      />

      <button
        class="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all ease-premium duration-normal bg-transparent"
        aria-label="Open connection manager"
        @click="$emit('openConnManager')"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
        <span class="text-foreground">{{ connectionName }}</span>
        <ChevronDown class="w-3.5 h-3.5 opacity-50" />
      </button>

      <span
        v-if="env"
        class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase leading-none select-none"
        :class="envBadgeClass"
      >{{ env }}</span>
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
	  Database, ChevronDown, Search, Settings, Play
	} from '@lucide/vue'

const props = defineProps<{
  connectionName: string
  env: 'PROD' | 'DEV' | 'STAGING'
}>()

defineEmits<{
  run: []
	  openPalette: []
	  openConnManager: []
	  openSettings: []
	}>()

const envBadgeClass = computed(() => ({
  'bg-red-950 text-red-400': props.env === 'PROD',
  'bg-emerald-950 text-emerald-400': props.env === 'DEV',
  'bg-yellow-950 text-yellow-400': props.env === 'STAGING',
}))
</script>
