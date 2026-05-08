<template>
  <Teleport to="body">
    <Transition name="inspector">
      <div
        v-if="uiStore.inspectorOpen"
        class="inspector"
        role="complementary"
        aria-label="Schema inspector"
      >
        <!-- Inspector header -->
        <div class="inspector-header">
          <div class="inspector-title-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ti-icon" style="color: var(--blue)">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
            </svg>
            <span class="inspector-title">{{ uiStore.activeInspectorTable ?? 'Schema Inspector' }}</span>
          </div>
          <button
            class="ghost-btn inspector-close"
            aria-label="Close schema inspector"
            @click="uiStore.closeInspector()"
          >✕</button>
        </div>

        <!-- Tabs -->
        <div class="inspector-tabs" role="tablist">
          <button
            v-for="tab in INSPECTOR_TABS"
            :key="tab.id"
            class="inspector-tab"
            :class="{ active: activeTab === tab.id }"
            role="tab"
            :aria-selected="activeTab === tab.id"
            @click="activeTab = tab.id"
          >{{ tab.label }}</button>
        </div>

        <!-- Columns tab -->
        <div v-if="activeTab === 'columns'" class="inspector-content">
          <table class="inspector-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Nullable</th>
                <th scope="col">Default</th>
                <th scope="col">PK</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="col in SAMPLE_COLUMNS" :key="col.name" :class="{ 'pk-row': col.pk }">
                <td>
                  <div class="col-name-cell">
                    <span v-if="col.pk" class="pk-icon" title="Primary key">🔑</span>
                    <span v-if="col.fk" class="fk-icon" :title="`References ${col.fkTable}`">↗</span>
                    {{ col.name }}
                  </div>
                </td>
                <td class="type-cell">{{ col.type }}</td>
                <td>
                  <span :class="col.nullable ? 'nullable-yes' : 'nullable-no'">
                    {{ col.nullable ? 'YES' : 'NO' }}
                  </span>
                </td>
                <td class="default-cell">{{ col.default ?? '—' }}</td>
                <td>
                  <span v-if="col.pk" class="badge-pk">PK</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Indexes tab -->
        <div v-else-if="activeTab === 'indexes'" class="inspector-content">
          <table class="inspector-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Columns</th>
                <th scope="col">Unique</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="idx in SAMPLE_INDEXES" :key="idx.name">
                <td>{{ idx.name }}</td>
                <td>{{ idx.columns }}</td>
                <td>{{ idx.unique ? 'YES' : 'NO' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Constraints tab -->
        <div v-else-if="activeTab === 'constraints'" class="inspector-content">
          <table class="inspector-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Definition</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>users_pkey</td>
                <td><span class="badge-pk">PK</span></td>
                <td class="def-cell">PRIMARY KEY (id)</td>
              </tr>
              <tr>
                <td>users_email_key</td>
                <td><span class="badge-unique">UNIQUE</span></td>
                <td class="def-cell">UNIQUE (email)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- DDL tab -->
        <div v-else-if="activeTab === 'ddl'" class="inspector-content ddl-tab">
          <div class="ddl-toolbar">
            <button class="ghost-btn" style="font-size:10px; padding:2px 7px;" @click="copyDdl" aria-label="Copy DDL">Copy DDL</button>
          </div>
          <pre class="ddl-content" v-html="highlightedDdl"></pre>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUiStore } from '../stores/ui'

const uiStore = useUiStore()

const INSPECTOR_TABS = [
  { id: 'columns',     label: 'Columns' },
  { id: 'indexes',     label: 'Indexes' },
  { id: 'constraints', label: 'Constraints' },
  { id: 'ddl',         label: 'DDL' },
] as const

type InspectorTab = typeof INSPECTOR_TABS[number]['id']
const activeTab = ref<InspectorTab>('columns')

const SAMPLE_COLUMNS: any[] = []
const SAMPLE_INDEXES: any[] = []
const DDL_SQL = ``

const highlightedDdl = computed(() => {
  let result = DDL_SQL
    .replace(/\b(CREATE|TABLE|PRIMARY|KEY|NOT|NULL|UNIQUE|DEFAULT)\b/g, '<span class="kw">$1</span>')
    .replace(/\b(BIGSERIAL|TEXT|TIMESTAMPTZ)\b/g, '<span class="ty">$1</span>')
    .replace(/'([^']*)'/g, '<span class="st">\'$1\'</span>')
  return result
})

function copyDdl() {
  navigator.clipboard.writeText(DDL_SQL)
}
</script>

<style scoped>
.inspector {
  position: fixed;
  top: 40px; /* below toolbar */
  right: 0;
  bottom: 28px; /* above statusbar */
  width: 320px;
  background: var(--surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 500;
  overflow: hidden;
}

/* Slide in/out animation */
.inspector-enter-active, .inspector-leave-active {
  transition: transform 0.2s ease;
}
.inspector-enter-from, .inspector-leave-to {
  transform: translateX(100%);
}

.inspector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.inspector-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.inspector-title {
  font-size: 11px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  color: var(--text);
}
.inspector-close {
  font-size: 11px;
  padding: 2px 6px;
  color: var(--text-dim);
}

.inspector-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.inspector-tab {
  flex: 1;
  padding: 6px 4px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-size: 10px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: color 0.1s;
}
.inspector-tab:hover { color: var(--text); }
.inspector-tab.active {
  color: var(--text);
  border-bottom-color: var(--blue);
}

.inspector-content {
  flex: 1;
  overflow: auto;
}

.inspector-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
}
.inspector-table thead th {
  background: var(--surface);
  color: var(--text-dim);
  font-size: 9px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  text-align: left;
}
.inspector-table tbody td {
  padding: 4px 8px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  font-size: 10px;
}
.inspector-table tbody tr:hover td { background: var(--row-hover); }
.pk-row td { border-left: 2px solid var(--purple); }

.col-name-cell { display: flex; align-items: center; gap: 4px; color: var(--text); }
.pk-icon { font-size: 9px; }
.fk-icon { font-size: 9px; color: var(--blue); cursor: help; }
.type-cell { color: var(--purple); }
.default-cell { color: var(--syn-string); font-size: 9px; }
.def-cell { color: var(--text-dim); font-size: 9px; }

.nullable-yes { color: var(--text-dim); }
.nullable-no  { color: var(--red); }

.badge-pk {
  font-size: 8px;
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(167,139,250,0.15);
  color: var(--purple);
  border: 1px solid rgba(167,139,250,0.2);
  font-family: 'Inter', sans-serif;
  font-weight: 500;
}
.badge-unique {
  font-size: 8px;
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(59,130,246,0.15);
  color: var(--blue);
  border: 1px solid rgba(59,130,246,0.2);
  font-family: 'Inter', sans-serif;
  font-weight: 500;
}

.ddl-tab { display: flex; flex-direction: column; }
.ddl-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 4px 8px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--surface);
}
.ddl-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  line-height: 18px;
  color: var(--text);
  white-space: pre;
}
.ddl-content :deep(.kw) { color: #93C5FD; }
.ddl-content :deep(.ty) { color: #C4B5FD; }
.ddl-content :deep(.st) { color: #FCD34D; }
</style>
