<script lang="ts" setup>
import type { ToasterProps } from 'vue-sonner'
import 'vue-sonner/style.css'

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from '@lucide/vue'
import { Toaster as Sonner } from 'vue-sonner'
import { cn } from '@/lib/utils'

const props = defineProps<ToasterProps>()
</script>

<template>
  <Sonner
    :class="cn('toaster group', props.class)"
    :rich-colors="true"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': '10px',
      '--success-bg': '#064e3b',
      '--success-text': '#ecfdf5',
      '--success-border': '#059669',
    }"
    :toast-options="{
      classes: {
        toast: 'group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl font-sans border-border/80 border p-3.5 gap-3 text-xs flex items-center data-[type=success]:!bg-emerald-950/95 data-[type=success]:!border-emerald-500/80 data-[type=success]:!text-emerald-100 data-[type=success]:shadow-lg data-[type=success]:shadow-emerald-950/40',
        success: '!bg-emerald-950/95 !border-emerald-500/80 !text-emerald-100 shadow-lg shadow-emerald-950/40',
        description: 'group-[.toast]:text-muted-foreground text-[11px] group-[.toast][data-type=success]:text-emerald-300/90',
        actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-medium',
        cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
      },
    }"
    v-bind="props"
  >
    <template #success-icon>
      <CircleCheckIcon class="size-4 text-emerald-400 shrink-0" />
    </template>
    <template #info-icon>
      <InfoIcon class="size-4" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon class="size-4" />
    </template>
    <template #error-icon>
      <OctagonXIcon class="size-4" />
    </template>
    <template #loading-icon>
      <div>
        <Loader2Icon class="size-4 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-4" />
    </template>
  </Sonner>
</template>
