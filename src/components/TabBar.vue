<template>
  <div class="flex items-stretch h-8 bg-muted/30 border-b border-border overflow-x-auto overflow-y-hidden flex-shrink-0" role="tablist" aria-label="Query tabs">
    <button
      v-for="tab in editorStore.tabs"
      :key="tab.id"
      class="inline-flex items-center gap-1.5 px-3 h-full text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 border-r border-border bg-transparent border-none cursor-pointer whitespace-nowrap flex-shrink-0 relative transition-colors"
      :class="{ 'bg-background text-foreground shadow-[inset_0_-2px_0_0_hsl(var(--primary))]': editorStore.activeTabId === tab.id }"
      role="tab"
      :aria-selected="editorStore.activeTabId === tab.id"
      :title="tab.name"
      @click="editorStore.selectTab(tab.id)"
    >
      <span v-if="tab.isUnsaved" class="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" aria-label="Unsaved changes"></span>
      <span class="max-w-[120px] overflow-hidden text-ellipsis">{{ tab.name }}</span>
      <span
        class="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm text-muted-foreground hover:text-red-500 hover:bg-accent text-xs flex-shrink-0 cursor-pointer"
        role="button"
        :aria-label="`Close tab ${tab.name}`"
        tabindex="0"
        @click.stop="editorStore.closeTab(tab.id)"
        @keydown.enter.stop="editorStore.closeTab(tab.id)"
      >&times;</span>
    </button>

    <button
      class="inline-flex items-center justify-center w-8 h-full bg-transparent border-none border-r border-border text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer text-base flex-shrink-0"
      aria-label="Add new query tab (\u2318T)"
      title="New tab \u2318T"
      @click="editorStore.addTab()"
    >+</button>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from '../stores/editor'
const editorStore = useEditorStore()
</script>
