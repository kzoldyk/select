<template>
  <Sheet :open="uiStore.inspectorOpen" @update:open="uiStore.closeInspector()">
    <SheetContent class="w-[340px] !p-0 flex flex-col">
      <SheetHeader class="px-4 py-3 border-b border-border flex-shrink-0">
        <SheetTitle class="flex items-center gap-2 text-sm">
          <svg class="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
          </svg>
          {{ uiStore.activeInspectorTable ?? 'Schema Inspector' }}
        </SheetTitle>
      </SheetHeader>

      <Tabs v-model="activeTab" class="flex-1 flex flex-col overflow-hidden">
        <TabsList class="mx-4 mt-2 flex-shrink-0">
          <TabsTrigger v-for="tab in INSPECTOR_TABS" :key="tab.id" :value="tab.id" class="text-xs px-3">
            {{ tab.label }}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="columns" class="flex-1 overflow-auto p-0 m-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="text-[10px] uppercase tracking-wider">Name</TableHead>
                <TableHead class="text-[10px] uppercase tracking-wider">Type</TableHead>
                <TableHead class="text-[10px] uppercase tracking-wider">Nullable</TableHead>
                <TableHead class="text-[10px] uppercase tracking-wider">Default</TableHead>
                <TableHead class="text-[10px] uppercase tracking-wider w-8">PK</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="schemaStore.isDetailsLoading">
                <TableCell colspan="5" class="text-xs text-muted-foreground text-center py-6">Loading columns...</TableCell>
              </TableRow>
              <TableRow v-else-if="!columns.length">
                <TableCell colspan="5" class="text-xs text-muted-foreground text-center py-6">No columns found</TableCell>
              </TableRow>
              <TableRow v-for="col in columns" v-else :key="col.name" :class="{ 'border-l-2 border-l-purple-500': col.pk }">
                <TableCell class="font-medium text-xs">{{ col.name }}</TableCell>
                <TableCell class="text-xs text-purple-500">{{ col.columnType }}</TableCell>
                <TableCell class="text-xs">
                  <span :class="col.nullable ? 'text-muted-foreground' : 'text-red-500'">{{ col.nullable ? 'YES' : 'NO' }}</span>
                </TableCell>
                <TableCell class="text-xs text-yellow-500">{{ col.default ?? '\u2014' }}</TableCell>
                <TableCell><Badge v-if="col.pk" variant="outline" class="text-[9px] px-1 py-0">PK</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="indexes" class="flex-1 overflow-auto p-0 m-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="text-[10px] uppercase tracking-wider">Name</TableHead>
                <TableHead class="text-[10px] uppercase tracking-wider">Columns</TableHead>
                <TableHead class="text-[10px] uppercase tracking-wider">Unique</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="schemaStore.isDetailsLoading">
                <TableCell colspan="3" class="text-xs text-muted-foreground text-center py-6">Loading indexes...</TableCell>
              </TableRow>
              <TableRow v-else-if="!indexes.length">
                <TableCell colspan="3" class="text-xs text-muted-foreground text-center py-6">No indexes found</TableCell>
              </TableRow>
              <TableRow v-for="idx in indexes" v-else :key="idx.name">
                <TableCell class="text-xs">{{ idx.name }}</TableCell>
                <TableCell class="text-xs">{{ idx.columns }}</TableCell>
                <TableCell class="text-xs">{{ idx.unique ? 'YES' : 'NO' }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="constraints" class="flex-1 overflow-auto p-0 m-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="text-[10px] uppercase tracking-wider">Name</TableHead>
                <TableHead class="text-[10px] uppercase tracking-wider">Type</TableHead>
                <TableHead class="text-[10px] uppercase tracking-wider">Definition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="schemaStore.isDetailsLoading">
                <TableCell colspan="3" class="text-xs text-muted-foreground text-center py-6">Loading constraints...</TableCell>
              </TableRow>
              <TableRow v-else-if="!constraints.length">
                <TableCell colspan="3" class="text-xs text-muted-foreground text-center py-6">No constraints found</TableCell>
              </TableRow>
              <TableRow v-for="constraint in constraints" v-else :key="constraint.name">
                <TableCell class="text-xs">{{ constraint.name }}</TableCell>
                <TableCell>
                  <Badge variant="outline" class="text-[9px] px-1 py-0">{{ constraint.type }}</Badge>
                </TableCell>
                <TableCell class="text-xs text-muted-foreground">{{ constraint.definition }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="ddl" class="flex-1 overflow-auto p-0 m-0">
          <div class="flex justify-end px-3 py-1.5 border-b border-border">
            <Button variant="ghost" size="sm" class="text-xs h-7" :disabled="!ddl" @click="copyDdl">Copy DDL</Button>
          </div>
          <div v-if="schemaStore.isDetailsLoading" class="p-4 text-xs text-muted-foreground">Loading DDL...</div>
          <div v-else-if="schemaStore.detailsError" class="p-4 text-xs text-red-500">{{ schemaStore.detailsError }}</div>
          <pre v-else-if="ddl" class="p-4 text-xs font-mono leading-relaxed text-foreground whitespace-pre overflow-auto" v-html="highlightedDdl"></pre>
          <div v-else class="p-4 text-xs text-muted-foreground">No DDL available</div>
        </TabsContent>
      </Tabs>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useUiStore } from '../stores/ui'
import { useSchemaStore } from '../stores/schema'

const uiStore = useUiStore()
const schemaStore = useSchemaStore()

const INSPECTOR_TABS = [
  { id: 'columns',     label: 'Columns' },
  { id: 'indexes',     label: 'Indexes' },
  { id: 'constraints', label: 'Constraints' },
  { id: 'ddl',         label: 'DDL' },
] as const

type InspectorTab = typeof INSPECTOR_TABS[number]['id']
const activeTab = ref<InspectorTab>('columns')

const columns = computed(() => schemaStore.tableDetails?.columns ?? [])
const indexes = computed(() => schemaStore.tableDetails?.indexes ?? [])
const constraints = computed(() => schemaStore.tableDetails?.constraints ?? [])
const ddl = computed(() => schemaStore.tableDetails?.ddl ?? '')

watch(
  () => uiStore.activeInspectorTable,
  (tableName) => {
    if (tableName) {
      schemaStore.setActiveTable(tableName)
      schemaStore.fetchTableDetails(tableName)
    }
  },
  { immediate: true },
)

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const highlightedDdl = computed(() => {
  const escaped = escapeHtml(ddl.value)
  return escaped
    .replace(/\b(CREATE|TABLE|VIEW|PRIMARY|KEY|NOT|NULL|UNIQUE|DEFAULT|CONSTRAINT|ENGINE|CHARSET|COLLATE|AUTO_INCREMENT)\b/g, '<span class="text-blue-400">$1</span>')
    .replace(/\b(BIGINT|INT|INTEGER|VARCHAR|CHAR|TEXT|LONGTEXT|DATETIME|TIMESTAMP|DATE|DECIMAL|JSON|BOOLEAN)\b/g, '<span class="text-purple-400">$1</span>')
    .replace(/&#039;(.*?)&#039;/g, '<span class="text-yellow-400">&#039;$1&#039;</span>')
})

function copyDdl() {
  navigator.clipboard.writeText(ddl.value)
}
</script>
