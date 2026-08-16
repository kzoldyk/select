<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <span
    data-slot="command-shortcut"
    :class="cn('text-muted-foreground/80 group-data-[selected=true]/command-item:text-foreground ml-auto text-[10.5px] font-mono tracking-tight inline-flex items-center gap-1 bg-muted/60 border border-border/50 px-1.5 py-0.5 rounded shadow-2xs', props.class)"
  >
    <slot />
  </span>
</template>
