<template>
  <div class="tab-bar" role="tablist" aria-label="Query tabs">
    <button
      v-for="tab in editorStore.tabs"
      :key="tab.id"
      class="tab"
      :class="{ active: editorStore.activeTabId === tab.id }"
      role="tab"
      :aria-selected="editorStore.activeTabId === tab.id"
      :title="tab.name"
      @click="editorStore.selectTab(tab.id)"
    >
      <span v-if="tab.isUnsaved" class="unsaved-dot" aria-label="Unsaved changes"></span>
      <span class="tab-name">{{ tab.name }}</span>
      <span
        class="tab-close"
        role="button"
        :aria-label="`Close tab ${tab.name}`"
        @click.stop="editorStore.closeTab(tab.id)"
      >×</span>
    </button>

    <button
      id="add-tab-btn"
      class="tab-add"
      aria-label="Add new query tab (⌘T)"
      title="New tab ⌘T"
      @click="editorStore.addTab()"
    >+</button>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from '../stores/editor'
const editorStore = useEditorStore()
</script>

<style scoped>
.tab-bar {
  display: flex;
  align-items: stretch;
  height: 32px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  overflow-y: hidden;
  flex-shrink: 0;
}
.tab-bar::-webkit-scrollbar { height: 0; }

.tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 12px;
  height: 100%;
  font-size: 11px;
  font-family: 'Inter', sans-serif;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-right: 1px solid var(--border);
  cursor: pointer;
  position: relative;
  white-space: nowrap;
  transition: color 0.1s;
  flex-shrink: 0;
}
.tab:hover { color: var(--text); background: rgba(255,255,255,0.02); }
.tab.active {
  background: var(--bg);
  color: var(--text);
}
.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
  background: var(--blue);
}

.unsaved-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--amber);
  flex-shrink: 0;
}

.tab-name { max-width: 120px; overflow: hidden; text-overflow: ellipsis; }

.tab-close {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 2px;
  color: var(--text-dim);
  font-size: 12px;
  cursor: pointer;
  line-height: 1;
  flex-shrink: 0;
  transition: color 0.1s;
}
.tab-close:hover { color: var(--red); }

.tab-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 100%;
  background: transparent;
  border: none;
  border-right: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 16px;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.1s, background 0.1s;
}
.tab-add:hover { color: var(--text); background: rgba(255,255,255,0.03); }
</style>
