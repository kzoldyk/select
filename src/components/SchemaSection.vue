<template>
  <div class="flex flex-col">
    <button
      class="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
      :aria-expanded="open"
      @click="$emit('toggle')"
    >
      <ChevronRight class="w-3.5 h-3.5 transition-transform ease-premium duration-normal text-muted-foreground/60" :class="{ 'rotate-90': open }" />
      <component :is="iconComponent" v-if="iconComponent" class="w-3.5 h-3.5 opacity-80" />
      <span class="flex-1">{{ title }}</span>
      <span class="text-[9px] font-mono font-semibold bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground/80 border border-border/40">{{ count }}</span>
    </button>
    <div
      class="grid transition-all duration-200 ease-in-out"
      :class="open ? 'grid-rows-[1fr] opacity-100 mt-0.5' : 'grid-rows-[0fr] opacity-0 pointer-events-none'"
    >
      <div class="overflow-hidden flex flex-col">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ChevronRight,
  Table,
  Eye,
  Zap,
  Play,
  Hash,
  Activity,
  FileText,
  Search,
} from '@lucide/vue'

type IconName = 'table' | 'view' | 'function' | 'proc' | 'index' | 'trigger' | 'saved' | 'search'

const props = defineProps<{
  title: string
  icon: IconName
  count: number
  open: boolean
  hasItems?: boolean
}>()

defineEmits<{
  (e: 'toggle'): void
}>()

const iconMap: Record<IconName, any> = {
  table: Table,
  view: Eye,
  function: Zap,
  proc: Play,
  index: Hash,
  trigger: Activity,
  saved: FileText,
  search: Search,
}

const iconComponent = computed(() => iconMap[props.icon])
</script>
