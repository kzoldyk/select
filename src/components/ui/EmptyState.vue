<template>
  <div class="flex flex-col items-center justify-center text-center px-6 py-10 select-none">
    <div
      class="flex items-center justify-center w-11 h-11 rounded-xl border border-border/60 bg-muted/30 text-muted-foreground/70 mb-3 shadow-sm"
      :class="iconClass"
    >
      <slot name="icon" />
    </div>
    <p class="text-[13px] font-medium text-foreground/90 tracking-tight">{{ title }}</p>
    <p v-if="description" class="text-[11px] text-muted-foreground/80 mt-1 max-w-[240px] leading-relaxed">{{ description }}</p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  iconClass?: string
}>()
</script>
