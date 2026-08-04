<template>
  <Dialog :open="uiStore.themeGalleryOpen" @update:open="closeDialog">
    <DialogContent class="max-w-[900px] h-[640px] flex flex-col p-0 overflow-hidden bg-background-elevated border-border text-foreground">
      <DialogHeader class="px-6 pt-5 pb-3 border-b border-border flex-shrink-0 flex flex-row items-center justify-between">
        <div>
          <DialogTitle class="text-sm font-semibold flex items-center gap-2">
            <Palette class="w-4 h-4 text-primary" />
            Theme Gallery
          </DialogTitle>
          <DialogDescription class="text-[11px] text-text-muted mt-0.5">
            Discover, customize, and manage themes. Hover to preview instantly.
          </DialogDescription>
        </div>
        <div class="flex items-center gap-1 pr-10">
          <Button variant="ghost" size="icon" class="h-7 w-7 text-text-muted hover:text-foreground cursor-pointer" @click="applyRandomTheme" title="Random Theme (⌘⌥R)">
            <Shuffle class="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" class="h-7 w-7 text-text-muted hover:text-foreground cursor-pointer" @click="triggerImport" title="Import Theme JSON">
            <Download class="w-3.5 h-3.5 rotate-180" />
          </Button>
          <input type="file" ref="fileInput" class="hidden" accept=".json" @change="handleImportFile" />
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7 text-text-muted hover:text-foreground cursor-pointer"
            @click="exportActiveTheme"
            :disabled="!activeTheme"
            title="Export Theme JSON"
          >
            <Download class="w-3.5 h-3.5" />
          </Button>
        </div>
      </DialogHeader>

      <!-- Dashboard Controls -->
      <div class="px-6 py-2 border-b border-border/60 flex items-center justify-between gap-3 bg-background-secondary/40 flex-shrink-0">
        <div class="flex items-center gap-1.5 flex-1 min-w-0">
          <div class="relative flex-1 max-w-[240px]">
            <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              v-model="themeState.searchQuery"
              placeholder="Search themes…"
              class="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1 text-xs outline-none focus:border-primary transition-colors text-foreground"
            />
          </div>
          <!-- Categories Scrollable -->
          <div class="flex gap-1 overflow-x-auto py-1 px-0.5 no-scrollbar max-w-[400px]">
            <button
              v-for="cat in categories"
              :key="cat"
              class="px-2 py-0.5 rounded text-[10px] font-medium border transition-all cursor-pointer whitespace-nowrap"
              :class="themeState.selectedCategory === cat
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-transparent border-border hover:border-text-muted text-text-muted hover:text-foreground'"
              @click="themeState.selectedCategory = cat"
            >
              {{ cat }}
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="text-[10px] text-text-muted">Sort:</span>
          <select
            v-model="themeState.sortBy"
            class="bg-background border border-border rounded px-2 py-0.5 text-[10px] outline-none text-foreground cursor-pointer"
          >
            <option value="alphabetical">Alphabetical</option>
            <option value="favorites">Favorites First</option>
            <option value="recent">Recently Used</option>
          </select>

          <Button variant="outline" size="sm" class="text-[10px] h-6 px-2 bg-background border-border hover:bg-accent/40 cursor-pointer" @click="createNewThemeAction">
            <Plus class="w-3 h-3 mr-1" /> Custom
          </Button>
        </div>
      </div>

      <!-- Main Layout (List Grid + Editor Side Panel) -->
      <div class="flex-1 flex overflow-hidden min-h-0">
        <!-- Grid list of themes -->
        <div class="flex-1 overflow-y-auto p-6" ref="gridContainer">
          <div v-if="filteredThemes.length === 0" class="flex flex-col items-center justify-center h-full text-center py-10">
            <Palette class="w-8 h-8 text-text-muted opacity-40 mb-2 animate-pulse" />
            <span class="text-xs font-medium text-text-muted">No themes match your criteria.</span>
            <button class="text-[10px] text-primary hover:underline mt-1 cursor-pointer" @click="resetFilters">
              Clear filters
            </button>
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div
              v-for="(theme, idx) in filteredThemes"
              :key="theme.id"
              :ref="el => { if (el) cardRefs[theme.id] = el as HTMLElement }"
              class="group relative flex flex-col p-3 rounded-lg border bg-background hover:bg-surface-hover hover:border-primary/40 transition-all duration-200 cursor-pointer"
              :class="[
                themeState.activeThemeId === theme.id ? 'border-primary ring-1 ring-primary' : 'border-border',
                keyboardSelectedIndex === idx ? 'ring-2 ring-primary/60 bg-surface-hover border-primary/40' : ''
              ]"
              @mouseenter="onCardMouseEnter(theme.id)"
              @mouseleave="onCardMouseLeave"
              @click="applyTheme(theme.id)"
              @dblclick="applyAndClose(theme.id)"
            >
              <!-- Favorite Badge & Button -->
              <div class="absolute top-2.5 right-2.5 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  class="p-1 rounded bg-background/80 hover:bg-background border border-border hover:border-primary/50 text-text-muted hover:text-yellow-500 cursor-pointer transition-colors"
                  @click.stop="toggleFav(theme.id)"
                  title="Toggle Favorite"
                >
                  <Star class="w-3 h-3" :class="{ 'fill-yellow-500 text-yellow-500': themeState.favorites.includes(theme.id) }" />
                </button>
                <button
                  class="p-1 rounded bg-background/80 hover:bg-background border border-border hover:border-primary/50 text-text-muted hover:text-foreground cursor-pointer transition-colors"
                  @click.stop="duplicateThemeAction(theme.id)"
                  title="Duplicate Theme"
                >
                  <Copy class="w-3 h-3" />
                </button>
                <button
                  v-if="isCustom(theme.id)"
                  class="p-1 rounded bg-background/80 hover:bg-background border border-border hover:border-red-500/50 text-text-muted hover:text-red-500 cursor-pointer transition-colors"
                  @click.stop="deleteThemeAction(theme.id)"
                  title="Delete Theme"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>

              <!-- Content -->
              <div class="flex flex-col flex-1 min-w-0 pr-6">
                <span class="text-xs font-semibold truncate text-foreground flex items-center gap-1.5">
                  {{ theme.name }}
                  <Star v-if="themeState.favorites.includes(theme.id)" class="w-3 h-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />
                </span>
                <span class="text-[9px] text-text-muted truncate mt-0.5">by {{ theme.author }}</span>
                <p class="text-[10px] text-text-muted line-clamp-1 mt-2 mb-3">
                  {{ theme.description }}
                </p>
              </div>

              <!-- Preview Dots / Palette -->
              <div class="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
                <span class="text-[8px] uppercase tracking-wider text-text-muted font-bold font-mono">
                  {{ theme.category }}
                </span>
                <div class="flex items-center gap-1">
                  <!-- Dots showing preview colors -->
                  <span
                    class="w-2.5 h-2.5 rounded-full border border-border/50 flex-shrink-0"
                    :style="{ backgroundColor: theme.colors.background }"
                    title="Background"
                  ></span>
                  <span
                    class="w-2.5 h-2.5 rounded-full border border-border/50 flex-shrink-0"
                    :style="{ backgroundColor: theme.colors.surface }"
                    title="Surface"
                  ></span>
                  <span
                    class="w-2.5 h-2.5 rounded-full border border-border/50 flex-shrink-0"
                    :style="{ backgroundColor: theme.colors.text }"
                    title="Text"
                  ></span>
                  <span
                    class="w-2.5 h-2.5 rounded-full border border-border/50 flex-shrink-0"
                    :style="{ backgroundColor: theme.colors.primary }"
                    title="Primary"
                  ></span>
                  <span
                    class="w-2.5 h-2.5 rounded-full border border-border/50 flex-shrink-0"
                    :style="{ backgroundColor: theme.colors.accent }"
                    title="Accent"
                  ></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Custom Theme Real-Time Editor Drawer -->
        <div
          v-if="isCustom(activeTheme.id)"
          class="w-[280px] border-l border-border bg-background-secondary/20 flex flex-col overflow-hidden flex-shrink-0"
        >
          <div class="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
            <span class="text-xs font-semibold flex items-center gap-1.5">
              <Sliders class="w-3.5 h-3.5 text-primary" /> Edit Active Palette
            </span>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 text-[10px] text-text-muted hover:text-foreground cursor-pointer"
              @click="exportTheme(activeTheme.id)"
            >
              Export
            </Button>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <!-- Edit Fields -->
            <div class="space-y-3">
              <span class="text-[10px] uppercase font-bold tracking-wider text-text-muted">Core Colors</span>
              <div v-for="color in editableColors" :key="color.key" class="flex items-center justify-between gap-2">
                <label class="text-[11px] text-text-muted capitalize truncate">{{ color.label }}</label>
                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <input
                    type="text"
                    :value="activeTheme.colors[color.key]"
                    @input="e => updateColor(color.key, (e.target as HTMLInputElement).value)"
                    class="w-16 bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-right font-mono outline-none focus:border-primary text-foreground"
                  />
                  <input
                    type="color"
                    :value="activeTheme.colors[color.key]"
                    @input="e => updateColor(color.key, (e.target as HTMLInputElement).value)"
                    class="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                  />
                </div>
              </div>
            </div>

            <div class="space-y-3 pt-2 border-t border-border/60">
              <span class="text-[10px] uppercase font-bold tracking-wider text-text-muted">Syntax Highlighting</span>
              <div v-for="syntax in editableSyntax" :key="syntax.key" class="flex items-center justify-between gap-2">
                <label class="text-[11px] text-text-muted capitalize truncate">{{ syntax.label }}</label>
                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <input
                    type="text"
                    :value="activeTheme.colors[syntax.key]"
                    @input="e => updateColor(syntax.key, (e.target as HTMLInputElement).value)"
                    class="w-16 bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-right font-mono outline-none focus:border-primary text-foreground"
                  />
                  <input
                    type="color"
                    :value="activeTheme.colors[syntax.key]"
                    @input="e => updateColor(syntax.key, (e.target as HTMLInputElement).value)"
                    class="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="px-6 py-3.5 border-t border-border bg-background-secondary/60 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <!-- Reset button -->
          <Button variant="ghost" size="sm" class="text-[10px] h-7 px-2.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 cursor-pointer" @click="resetSystem">
            Reset System Themes
          </Button>
        </div>
        <div class="flex items-center gap-1.5">
          <kbd class="text-[9px] bg-background border border-border px-1 rounded text-text-muted">↑↓←→</kbd>
          <span class="text-[10px] text-text-muted mr-3">Navigate</span>
          <Button variant="outline" size="sm" class="text-xs h-8 bg-background border-border text-foreground hover:bg-accent/40 cursor-pointer" @click="closeDialog">
            Cancel
          </Button>
          <Button size="sm" class="text-xs h-8 cursor-pointer" @click="closeDialog">
            Confirm
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Palette,
  Search,
  Star,
  Shuffle,
  Download,
  Sliders,
  Plus,
  Trash2,
  Copy,
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useUiStore } from '../stores/ui'
import { ThemeCategory, ThemeColors } from '../theme/types'
import {
  themeState,
  allThemes,
  activeTheme,
  setTheme,
  previewTheme,
  toggleFavorite,
  randomTheme,
  duplicateTheme,
  deleteTheme,
  updateCustomTheme,
  createNewTheme,
  importTheme,
  exportTheme,
  resetThemeSystem,
} from '../theme'

const uiStore = useUiStore()

const categories: (ThemeCategory | 'All' | 'Favorites' | 'Recent')[] = [
  'All',
  'Favorites',
  'Recent',
  'Dark',
  'Light',
  'OLED',
  'Pastel',
  'Nature',
  'Retro',
  'Synthwave',
  'Cyberpunk',
]

// Keyboard selected index
const keyboardSelectedIndex = ref(-1)
const gridContainer = ref<HTMLDivElement | null>(null)
const cardRefs = ref<Record<string, HTMLElement>>({})
const fileInput = ref<HTMLInputElement | null>(null)

// Core editable keys
const editableColors = [
  { key: 'background' as keyof ThemeColors, label: 'Background' },
  { key: 'surface' as keyof ThemeColors, label: 'Surface' },
  { key: 'text' as keyof ThemeColors, label: 'Text color' },
  { key: 'textMuted' as keyof ThemeColors, label: 'Muted text' },
  { key: 'primary' as keyof ThemeColors, label: 'Primary' },
  { key: 'accent' as keyof ThemeColors, label: 'Accent' },
  { key: 'border' as keyof ThemeColors, label: 'Border' },
]

// Syntax editable keys
const editableSyntax = [
  { key: 'syntaxKeyword' as keyof ThemeColors, label: 'Keywords' },
  { key: 'syntaxFunction' as keyof ThemeColors, label: 'Functions' },
  { key: 'syntaxString' as keyof ThemeColors, label: 'Strings' },
  { key: 'syntaxNumber' as keyof ThemeColors, label: 'Numbers' },
  { key: 'syntaxComment' as keyof ThemeColors, label: 'Comments' },
]

// Filter themes
const filteredThemes = computed(() => {
  let themes = allThemes.value

  // Category filter
  if (themeState.selectedCategory === 'Favorites') {
    themes = themes.filter((t) => themeState.favorites.includes(t.id))
  } else if (themeState.selectedCategory === 'Recent') {
    themes = themes.filter((t) => themeState.history.includes(t.id))
    // Sort recent order
    themes = [...themes].sort((a, b) => {
      const idxA = themeState.history.indexOf(a.id)
      const idxB = themeState.history.indexOf(b.id)
      return idxA - idxB
    })
  } else if (themeState.selectedCategory !== 'All') {
    themes = themes.filter((t) => t.category === themeState.selectedCategory)
  }

  // Search filter
  if (themeState.searchQuery.trim()) {
    const q = themeState.searchQuery.toLowerCase()
    themes = themes.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.author.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    )
  }

  // Sort
  if (themeState.sortBy === 'alphabetical') {
    themes = [...themes].sort((a, b) => a.name.localeCompare(b.name))
  } else if (themeState.sortBy === 'favorites') {
    themes = [...themes].sort((a, b) => {
      const favA = themeState.favorites.includes(a.id) ? 1 : 0
      const favB = themeState.favorites.includes(b.id) ? 1 : 0
      return favB - favA || a.name.localeCompare(b.name)
    })
  } else if (themeState.sortBy === 'recent') {
    themes = [...themes].sort((a, b) => {
      const idxA = themeState.history.indexOf(a.id)
      const idxB = themeState.history.indexOf(b.id)
      const hasA = idxA !== -1 ? idxA : 999
      const hasB = idxB !== -1 ? idxB : 999
      return hasA - hasB || a.name.localeCompare(b.name)
    })
  }

  return themes
})

// Scroll selected card into view
function scrollSelectedIntoView() {
  if (keyboardSelectedIndex.value < 0 || filteredThemes.value.length === 0) return
  const selectedTheme = filteredThemes.value[keyboardSelectedIndex.value]
  const cardEl = cardRefs.value[selectedTheme.id]
  if (cardEl && gridContainer.value) {
    const container = gridContainer.value
    const topDiff = cardEl.offsetTop - container.scrollTop
    const bottomDiff = (cardEl.offsetTop + cardEl.clientHeight) - (container.scrollTop + container.clientHeight)
    if (topDiff < 0) {
      container.scrollTop = cardEl.offsetTop - 12
    } else if (bottomDiff > 0) {
      container.scrollTop = cardEl.offsetTop + cardEl.clientHeight - container.clientHeight + 12
    }
  }
}

// Keydown navigation inside gallery
function handleKeydown(e: KeyboardEvent) {
  if (!uiStore.themeGalleryOpen) return

  const list = filteredThemes.value
  if (!list.length) return

  const cols = 3 // Standard grid cols (can approximate)
  let nextIndex = keyboardSelectedIndex.value

  if (e.key === 'ArrowRight') {
    e.preventDefault()
    nextIndex = (nextIndex + 1) % list.length
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    nextIndex = (nextIndex - 1 + list.length) % list.length
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (nextIndex === -1) nextIndex = 0
    else {
      const target = nextIndex + cols
      nextIndex = target < list.length ? target : nextIndex % cols
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (nextIndex === -1) nextIndex = list.length - 1
    else {
      const target = nextIndex - cols
      nextIndex = target >= 0 ? target : Math.floor((list.length - 1) / cols) * cols + (nextIndex % cols)
      if (nextIndex >= list.length) nextIndex = list.length - 1
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (nextIndex >= 0 && nextIndex < list.length) {
      applyAndClose(list[nextIndex].id)
    }
  } else if (e.key === 'f' && !['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
    e.preventDefault()
    if (nextIndex >= 0 && nextIndex < list.length) {
      toggleFav(list[nextIndex].id)
    }
  }

  if (nextIndex !== keyboardSelectedIndex.value) {
    keyboardSelectedIndex.value = nextIndex
    // Apply temporary preview
    const selectedTheme = list[nextIndex]
    previewTheme(selectedTheme.id)
    nextTick(scrollSelectedIntoView)
  }
}

// Mouse events
function onCardMouseEnter(id: string) {
  previewTheme(id)
}

function onCardMouseLeave() {
  previewTheme(null)
}

function applyTheme(id: string) {
  setTheme(id)
  const theme = allThemes.value.find(t => t.id === id)
  if (theme) {
    toast.success(`Theme switched to "${theme.name}"`)
  }
}

function applyAndClose(id: string) {
  setTheme(id)
  closeDialog()
}

// Favorites/Utilities
function toggleFav(id: string) {
  toggleFavorite(id)
  const isFav = themeState.favorites.includes(id)
  toast.success(isFav ? `Added theme to favorites` : `Removed theme from favorites`)
}

function isCustom(id: string) {
  return !!themeState.customThemes[id]
}

function updateColor(key: keyof ThemeColors, val: string) {
  if (activeTheme.value && isCustom(activeTheme.value.id)) {
    // Only update if hex is valid
    if (val.startsWith('#') && (val.length === 4 || val.length === 7 || val.length === 9)) {
      updateCustomTheme(activeTheme.value.id, { [key]: val })
    } else if (val.startsWith('rgba') || val.startsWith('rgb')) {
      updateCustomTheme(activeTheme.value.id, { [key]: val })
    }
  }
}

function createNewThemeAction() {
  const name = prompt('Enter name for your custom theme:')
  if (!name) return
  // Use active theme core colors as starting point
  const base = { ...activeTheme.value.colors }
  const created = createNewTheme(name, 'Dark', base)
  toast.success(`Custom theme "${created.name}" created!`)
}

function duplicateThemeAction(id: string) {
  const duped = duplicateTheme(id)
  if (duped) {
    toast.success(`Duplicated theme into "${duped.name}"`)
  }
}

function deleteThemeAction(id: string) {
  if (confirm('Are you sure you want to delete this custom theme?')) {
    deleteTheme(id)
    toast.success('Theme deleted successfully')
  }
}

function triggerImport() {
  fileInput.value?.click()
}

function handleImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (event) => {
    const text = event.target?.result as string
    const imported = importTheme(text)
    if (imported) {
      toast.success(`Theme "${imported.name}" imported!`)
    } else {
      toast.error('Failed to import theme. Validate JSON structure.')
    }
  }
  reader.readAsText(file)
  if (fileInput.value) fileInput.value.value = ''
}

function exportActiveTheme() {
  if (activeTheme.value) {
    exportTheme(activeTheme.value.id)
    toast.success(`Theme "${activeTheme.value.name}" configuration exported.`)
  }
}

function applyRandomTheme() {
  const rand = randomTheme()
  if (rand) {
    toast.success(`Applied random theme: "${rand.name}"`)
  }
}

function resetSystem() {
  if (confirm('Reset theme state? This deletes all custom themes and favorites.')) {
    resetThemeSystem()
    toast.success('Themes reset to default.')
  }
}

function resetFilters() {
  themeState.searchQuery = ''
  themeState.selectedCategory = 'All'
}

function closeDialog() {
  previewTheme(null) // make sure preview is cleared
  uiStore.closeThemeGallery()
}

// Reset keyboard index when search/category changes
watch(() => [themeState.searchQuery, themeState.selectedCategory], () => {
  keyboardSelectedIndex.value = -1
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
