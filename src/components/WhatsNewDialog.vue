<template>
  <Dialog :open="uiStore.whatsNewOpen" @update:open="onClose">
    <DialogContent class="sm:max-w-xl font-mono p-0 overflow-hidden border-border/80 shadow-2xl">
      <!-- Header Banner -->
      <div class="relative px-6 pt-6 pb-4 border-b border-border/60 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent">
        <div class="flex items-center justify-between gap-3 mb-2">
          <div class="flex items-center gap-2">
            <span class="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/20 text-primary border border-primary/30 shadow-xs">
              <PhSparkle class="w-4 h-4" />
            </span>
            <span
              v-if="uiStore.isNewUpdateAvailable"
              class="px-2 py-0.5 rounded-full text-[10.5px] font-semibold tracking-wide uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
            >
              New Update Available
            </span>
            <span
              v-else-if="uiStore.isNewlyUpdated"
              class="px-2 py-0.5 rounded-full text-[10.5px] font-semibold tracking-wide uppercase bg-primary/15 text-primary border border-primary/30"
            >
              Update Installed
            </span>
            <span
              v-else
              class="px-2 py-0.5 rounded-full text-[10.5px] font-semibold tracking-wide uppercase bg-muted text-muted-foreground border border-border/60"
            >
              Release Notes
            </span>
          </div>

          <span class="text-xs font-semibold px-2.5 py-0.5 rounded bg-background/80 border border-border/60 text-foreground shadow-2xs">
            v{{ release.version }}
          </span>
        </div>

        <DialogHeader class="space-y-1 text-left">
          <DialogTitle class="text-base font-bold text-foreground tracking-tight">
            {{ release.title }}
          </DialogTitle>
          <DialogDescription class="text-xs text-muted-foreground leading-relaxed">
            {{ release.summary }}
          </DialogDescription>
        </DialogHeader>
      </div>

      <!-- Features & Major Improvements List -->
      <div class="px-6 py-4 max-h-[360px] overflow-y-auto space-y-3 scrollbar-thin">
        <div class="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 mb-1">
          Major Improvements in this Release
        </div>

        <div
          v-for="(feature, idx) in release.highlights"
          :key="idx"
          class="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/60 hover:bg-card/90 transition-colors shadow-2xs"
        >
          <!-- Feature Icon -->
          <div class="flex items-center justify-center w-8 h-8 rounded-md bg-muted/60 border border-border/60 text-foreground shrink-0 mt-0.5">
            <PhFolder v-if="feature.icon === 'folder'" class="w-4 h-4 text-amber-400" />
            <PhDownloadSimple v-else-if="feature.icon === 'download'" class="w-4 h-4 text-emerald-400" />
            <PhTimer v-else-if="feature.icon === 'timer'" class="w-4 h-4 text-cyan-400" />
            <PhRows v-else-if="feature.icon === 'layout'" class="w-4 h-4 text-indigo-400" />
            <PhShieldCheck v-else-if="feature.icon === 'shield'" class="w-4 h-4 text-violet-400" />
            <PhSparkle v-else class="w-4 h-4 text-primary" />
          </div>

          <!-- Feature Description -->
          <div class="flex-1 min-w-0 space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-semibold text-foreground leading-none">
                {{ feature.title }}
              </span>
              <span
                v-if="feature.tag"
                class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                :class="tagBadgeClass(feature.tag)"
              >
                {{ feature.tag }}
              </span>
            </div>
            <p class="text-[11px] text-muted-foreground leading-relaxed">
              {{ feature.description }}
            </p>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="px-6 py-3.5 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label class="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            id="dont-show-again-checkbox"
            type="checkbox"
            v-model="dontShowAgain"
            class="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
          />
          <span>Don't show this release again</span>
        </label>

        <div class="flex items-center gap-2 justify-end">
          <Button
            v-if="uiStore.isNewUpdateAvailable"
            variant="ghost"
            size="sm"
            class="h-8 text-xs cursor-pointer"
            @click="handleLater"
          >
            Remind Later
          </Button>

          <Button
            v-if="uiStore.isNewUpdateAvailable && release.downloadUrl"
            id="btn-download-update"
            size="sm"
            class="h-8 text-xs gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            @click="handleDownload"
          >
            <PhDownloadSimple class="w-3.5 h-3.5" />
            Download v{{ release.version }}
          </Button>

          <Button
            v-else
            id="btn-dismiss-whats-new"
            size="sm"
            class="h-8 text-xs gap-1.5 cursor-pointer"
            @click="handleDismiss"
          >
            <PhCheck class="w-3.5 h-3.5" />
            Got it, Thanks!
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  PhSparkle,
  PhFolder,
  PhDownloadSimple,
  PhTimer,
  PhRows,
  PhShieldCheck,
  PhCheck,
} from '@phosphor-icons/vue'
import { useUiStore } from '../stores/ui'
import { BUILTIN_RELEASE, type AppRelease } from '../lib/updates'

const uiStore = useUiStore()
const dontShowAgain = ref(true)

const release = computed<AppRelease>(() => {
  return uiStore.activeRelease || BUILTIN_RELEASE
})

function tagBadgeClass(tag?: string): string {
  switch (tag?.toLowerCase()) {
    case 'new':
      return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
    case 'improved':
      return 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
    case 'fix':
      return 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
    default:
      return 'bg-muted text-muted-foreground border border-border/60'
  }
}

function onClose(open: boolean) {
  if (!open) {
    uiStore.closeWhatsNew(dontShowAgain.value)
  }
}

function handleLater() {
  uiStore.closeWhatsNew(false)
}

function handleDismiss() {
  uiStore.closeWhatsNew(dontShowAgain.value)
}

async function handleDownload() {
  const url = release.value.downloadUrl || 'https://github.com/hitesh103/select/releases'
  try {
    const { open } = await import('@tauri-apps/plugin-opener')
    await open(url)
  } catch {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank')
    }
  }
  uiStore.closeWhatsNew(dontShowAgain.value)
}
</script>
