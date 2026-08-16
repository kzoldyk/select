<template>
  <Sheet :open="open" @update:open="(val) => emit('update:open', val)">
    <SheetContent :show-close-button="false" side="right" class="w-[540px] sm:max-w-2xl flex flex-col p-0 bg-background border-l border-border select-none font-mono text-xs shadow-2xl">
      <!-- Header with clear close button & title -->
      <div class="px-4 py-3 border-b border-border/80 flex items-center justify-between flex-shrink-0 chrome-bar">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
            <PhCodeBlock class="w-3.5 h-3.5 text-primary" />
          </div>
          <div class="min-w-0">
            <div class="text-xs font-bold text-foreground truncate">
              {{ columnName || 'Value Inspector' }}
            </div>
            <div class="text-[10px] text-muted-foreground truncate">
              Row #{{ (rowIndex ?? 0) + 1 }} · {{ valueLengthFormatted }}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <Badge v-if="isJson" variant="secondary" class="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20 font-semibold">
            JSON
          </Badge>
          <Badge v-else class="text-[9px] px-1.5 py-0.5 bg-muted text-muted-foreground font-mono">
            {{ valueType }}
          </Badge>

          <!-- User-Friendly Close Cross Button -->
          <button
            class="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer border-none bg-transparent"
            title="Close Inspector (ESC)"
            aria-label="Close"
            @click="emit('update:open', false)"
          >
            <PhX class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Action Toolbar (View / Edit modes, Format, Wrap, Copy, Save) -->
      <div class="px-4 py-2 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-2 flex-shrink-0 text-xs">
        <div class="flex items-center gap-1.5">
          <!-- View / Edit mode switcher -->
          <div class="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded border border-border/60">
            <button
              class="px-2 py-0.5 rounded text-[10.5px] transition-colors cursor-pointer border-none"
              :class="!isEditing ? 'bg-background text-foreground font-semibold shadow-2xs' : 'text-muted-foreground hover:text-foreground bg-transparent'"
              @click="isEditing = false"
            >
              Preview
            </button>
            <button
              class="px-2 py-0.5 rounded text-[10.5px] transition-colors cursor-pointer border-none"
              :class="isEditing ? 'bg-background text-foreground font-semibold shadow-2xs' : 'text-muted-foreground hover:text-foreground bg-transparent'"
              @click="isEditing = true"
            >
              Edit Value
            </button>
          </div>

          <Button
            v-if="isJson && !isEditing"
            variant="ghost"
            size="sm"
            class="h-6 px-2 text-[10px] gap-1 rounded transition-colors"
            :class="{ 'bg-primary/15 text-primary font-medium': formattedMode }"
            @click="formattedMode = !formattedMode"
          >
            <PhTreeStructure class="w-3 h-3" />
            <span>{{ formattedMode ? 'Pretty' : 'Raw' }}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            class="h-6 px-2 text-[10px] gap-1 rounded transition-colors"
            :class="{ 'bg-primary/15 text-primary font-medium': wrapText }"
            @click="wrapText = !wrapText"
          >
            <PhTextAlignLeft class="w-3 h-3" />
            <span>Wrap</span>
          </Button>
        </div>

        <div class="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            class="h-6 px-2 text-[10px] gap-1 rounded bg-background"
            @click="copyValue"
          >
            <PhCopy class="w-3 h-3" />
            <span>Copy</span>
          </Button>

          <!-- Apply Changes Button -->
          <Button
            v-if="isEditing"
            size="sm"
            class="h-6 px-2.5 text-[10px] font-semibold gap-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
            :disabled="!hasUnsavedChanges"
            @click="applyValueChanges"
          >
            <PhCheck class="w-3 h-3" />
            <span>Apply to Cell</span>
          </Button>
        </div>
      </div>

      <!-- Main Editor / Preview Area -->
      <div class="flex-1 overflow-hidden flex flex-col relative bg-background">
        <!-- Edit Mode: Multi-line Textarea -->
        <template v-if="isEditing">
          <div class="flex-1 flex flex-col p-3">
            <textarea
              v-model="editDraft"
              class="w-full flex-1 p-3 bg-muted/20 border border-border/80 rounded-lg text-xs font-mono text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none leading-relaxed select-text"
              :class="wrapText ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'"
              placeholder="Enter value…"
            ></textarea>
          </div>
        </template>

        <!-- Preview Mode: Syntax Highlighted / Formatted HTML -->
        <template v-else>
          <div class="flex-1 overflow-auto p-4 select-text">
            <pre
              class="text-xs font-mono leading-relaxed"
              :class="[
                wrapText ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-x-auto',
                isJson && formattedMode ? 'text-foreground' : 'text-foreground/90'
              ]"
              v-html="renderedContent"
            ></pre>
          </div>
        </template>
      </div>

      <!-- Footer Info -->
      <div class="px-4 py-2 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground flex-shrink-0">
        <div class="flex items-center gap-1.5">
          <span v-if="hasUnsavedChanges" class="text-amber-500 font-semibold flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Modified (Unapplied)
          </span>
          <span v-else>Press <kbd class="px-1 py-0.5 bg-muted rounded border border-border/60 text-[9px]">ESC</kbd> to close</span>
        </div>
        <span>{{ charCount }} characters</span>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PhCodeBlock, PhTreeStructure, PhTextAlignLeft, PhCopy, PhX, PhCheck } from '@phosphor-icons/vue'
import { toast } from 'vue-sonner'

const props = defineProps<{
  open: boolean
  value: any
  columnName?: string
  rowIndex?: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save-value': [newValue: any]
}>()

const isEditing = ref(false)
const formattedMode = ref(true)
const wrapText = ref(true)
const editDraft = ref('')

const rawString = computed(() => {
  if (props.value === null || props.value === undefined) return ''
  if (typeof props.value === 'object') {
    return JSON.stringify(props.value, null, 2)
  }
  return String(props.value)
})

const charCount = computed(() => (isEditing.value ? editDraft.value.length : rawString.value.length))

const hasUnsavedChanges = computed(() => {
  return editDraft.value !== rawString.value
})

const valueLengthFormatted = computed(() => {
  const bytes = new Blob([rawString.value]).size
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
})

const isJson = computed(() => {
  if (props.value === null || props.value === undefined) return false
  if (typeof props.value === 'object') return true
  const s = String(props.value).trim()
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
    try {
      JSON.parse(s)
      return true
    } catch {
      return false
    }
  }
  return false
})

const valueType = computed(() => {
  if (props.value === null || props.value === undefined) return 'NULL'
  return typeof props.value
})

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const renderedContent = computed(() => {
  if (props.value === null || props.value === undefined) {
    return '<span class="italic text-muted-foreground/60">NULL</span>'
  }

  if (isJson.value && formattedMode.value) {
    try {
      const obj = typeof props.value === 'object' ? props.value : JSON.parse(String(props.value))
      const json = JSON.stringify(obj, null, 2)
      const escaped = escapeHtml(json)
      return escaped
        .replace(/(&quot;.*?&quot;)(: )/g, '<span class="text-blue-400 font-medium">$1</span>$2')
        .replace(/: (&quot;.*?&quot;)/g, ': <span class="text-amber-400">$1</span>')
        .replace(/: (\d+\.?\d*)/g, ': <span class="text-emerald-400 font-mono">$1</span>')
        .replace(/: (true|false)/g, ': <span class="text-purple-400 font-bold">$1</span>')
        .replace(/: (null)/g, ': <span class="italic text-muted-foreground">$1</span>')
    } catch {
      return escapeHtml(rawString.value)
    }
  }

  return escapeHtml(rawString.value)
})

function copyValue() {
  const text = isEditing.value ? editDraft.value : rawString.value
  navigator.clipboard.writeText(text)
  toast.success('Copied value to clipboard')
}

function applyValueChanges() {
  let finalVal: any = editDraft.value
  if (isJson.value) {
    try {
      finalVal = JSON.parse(editDraft.value)
    } catch {
      finalVal = editDraft.value
    }
  }
  emit('save-value', finalVal)
  emit('update:open', false)
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    editDraft.value = rawString.value
    formattedMode.value = isJson.value
    isEditing.value = false
  }
})
</script>
