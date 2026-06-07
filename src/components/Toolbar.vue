<template>
  <header class="flex items-center justify-between h-10 px-3 border-b bg-background flex-shrink-0">
    <div class="flex items-center gap-2 min-w-0">
      <img
        src="@/assets/select-logo.png"
        alt=""
        class="h-6 w-6 rounded-sm object-contain flex-shrink-0"
        aria-hidden="true"
      />

      <button
        class="inline-flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-background"
        aria-label="Open connection manager"
        @click="$emit('openConnManager')"
      >
        <span class="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
        <Database class="w-3.5 h-3.5" />
        <span class="text-foreground text-xs">{{ connectionName }}</span>
        <ChevronDown class="w-3 h-3 text-muted-foreground" />
      </button>

      <span
        v-if="env"
        class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none select-none"
        :class="envBadgeClass"
      >{{ env }}</span>
    </div>

    <div class="flex-1 flex justify-center">
      <button
        class="inline-flex items-center gap-2 border border-border bg-muted rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:border-ring hover:text-foreground transition-colors w-60"
        aria-label="Open command palette (⌘K)"
        @click="$emit('openPalette')"
      >
        <Search class="w-3.5 h-3.5" />
        <span class="text-muted-foreground">Search commands…</span>
        <Kbd class="ml-auto text-[10px]">⌘K</Kbd>
      </button>
    </div>

    <div class="flex items-center gap-1.5">
	      <Button variant="ghost" size="sm" class="text-xs h-7 gap-1.5" aria-label="Open settings" @click="$emit('openSettings')">
	        <Settings class="w-3.5 h-3.5" />
	      </Button>

      <Separator orientation="vertical" class="h-5 mx-1" />

      <Button size="sm" class="text-xs h-7 gap-1.5" @click="$emit('run')">
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
