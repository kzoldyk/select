<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import TooltipProvider from './TooltipProvider.vue'
import Tooltip from './Tooltip.vue'
import TooltipTrigger from './TooltipTrigger.vue'
import TooltipContent from './TooltipContent.vue'

interface Props {
  text?: string
  kbd?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  class?: HTMLAttributes['class']
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  side: 'bottom',
  align: 'center',
  sideOffset: 6,
  disabled: false,
})

const parsed = computed(() => {
  if (!props.text) return { label: '', kbd: props.kbd || '' }
  if (props.kbd) return { label: props.text, kbd: props.kbd }

  // Extract shortcut inside parentheses e.g. "Format SQL (⇧⌘F)" -> label: "Format SQL", kbd: "⇧⌘F"
  const match = props.text.match(/^(.*?)\s*\(([^)]+)\)$/)
  if (match) {
    return {
      label: match[1].trim(),
      kbd: match[2].trim(),
    }
  }
  return { label: props.text, kbd: '' }
})
</script>

<template>
  <template v-if="disabled || (!parsed.label && !parsed.kbd)">
    <slot />
  </template>
  <TooltipProvider v-else :delay-duration="120" :skip-delay-duration="300">
    <Tooltip>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipContent :side="side" :align="align" :side-offset="sideOffset" :class="props.class">
        <div class="flex items-center gap-1.5 whitespace-nowrap">
          <span>{{ parsed.label }}</span>
          <kbd
            v-if="parsed.kbd"
            class="font-mono text-[9.5px] px-1 py-0.2 bg-muted/80 text-muted-foreground border border-border/50 rounded shadow-xs tracking-tight"
          >{{ parsed.kbd }}</kbd>
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>

