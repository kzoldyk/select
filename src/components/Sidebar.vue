<template>
  <aside
    class="sidebar border-r border-border bg-muted/30 flex flex-col overflow-hidden"
    :class="{ 'w-0 border-r-0': !uiStore.sidebarOpen }"
    role="navigation"
    aria-label="Schema browser"
  >
    <div class="px-3 py-3 border-b border-border flex flex-col gap-2.5 flex-shrink-0 bg-background/50 backdrop-blur-sm z-10">
      <template v-if="connStore.status === 'connected'">
        <select
          v-if="schemaStore.databases.length"
          class="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all shadow-sm"
          aria-label="Select database"
          :value="connStore.activeConnection?.database"
          @change="async (e) => {
            await connStore.changeDatabase((e.target as HTMLSelectElement).value)
            await schemaStore.fetchDatabases(connStore.activeId ?? undefined)
            await schemaStore.refreshSchema(connStore.activeId ?? undefined)
          }"
        >
          <option value="" disabled>Select Database...</option>
          <option v-for="db in schemaStore.databases" :key="db" :value="db">{{ db }}</option>
        </select>

        <div class="flex items-center gap-1.5">
          <select
            v-if="schemaStore.databases.length"
            class="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm"
            aria-label="Select schema"
            :disabled="connStore.activeConnection?.dbType === 'mysql'"
          >
            <option v-if="connStore.activeConnection?.dbType === 'mysql'" value="def">MySQL (Schema = DB)</option>
            <option v-else value="public">public</option>
          </select>
          <button
            v-if="connStore.status === 'connected'"
            class="flex items-center justify-center w-7 h-7 rounded hover:bg-accent text-muted-foreground hover:text-foreground bg-background border border-input cursor-pointer flex-shrink-0 shadow-sm transition-colors"
            title="Refresh schema"
            :disabled="schemaStore.isLoading"
            @click="schemaStore.refreshSchema(connStore.activeId ?? undefined)"
          >
            <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': schemaStore.isLoading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>
        </div>
      </template>

      <div v-else-if="connStore.status === 'connecting'" class="text-[10px] text-muted-foreground text-center py-2">
        Connecting...
      </div>
      <div v-else-if="connStore.status === 'error'" class="text-[10px] text-red-500 text-center py-2">
        Connection error
      </div>
      <div v-else class="text-[10px] text-muted-foreground text-center py-2">
        No active connection
      </div>

      <input
        id="sidebar-search-input"
        class="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-[12px] ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all shadow-sm mt-1"
        type="text"
        placeholder="Search schema objects…"
        aria-label="Search schema objects"
        :value="schemaStore.searchQuery"
        @input="onSearch"
      />
    </div>

    <ScrollArea class="flex-1">
      <div class="py-2 flex flex-col gap-1.5 px-2">
        <!-- Tables -->
        <div v-if="connStore.status === 'connected' || schemaStore.tables.length || schemaStore.isLoading" class="flex flex-col">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('tables')"
          >
            <ChevronRight class="w-3.5 h-3.5 transition-transform ease-premium duration-normal text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.tables }" />
            <Table class="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <span class="flex-1">Tables</span>
            <span class="text-[9px] font-mono font-semibold bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground/80 border border-border/40">{{ schemaStore.tables.length }}</span>
          </button>
          <div 
            class="grid transition-all duration-200 ease-in-out"
            :class="sectionsOpen.tables ? 'grid-rows-[1fr] opacity-100 mt-0.5' : 'grid-rows-[0fr] opacity-0 pointer-events-none'"
          >
            <div class="overflow-hidden">
              <div v-if="schemaStore.isLoading" class="px-5 py-2 space-y-2.5 opacity-60">
                <div class="h-3 bg-muted rounded w-3/4 animate-pulse"></div>
                <div class="h-3 bg-muted rounded w-5/6 animate-pulse"></div>
                <div class="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
              </div>
              <template v-else-if="schemaStore.filteredTables.length">
                <button
                  v-for="table in schemaStore.filteredTables"
                  :key="table.name"
                  class="w-full flex items-center gap-2.5 px-3 py-1.5 pl-6 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/30 rounded-md transition-all duration-150 bg-transparent border-none cursor-pointer text-left relative"
                  :class="{ 'text-primary bg-primary/10 font-medium': schemaStore.activeTable === table.name }"
                  :title="table.name"
                  @click="selectTable(table.name)"
                  @contextmenu.prevent="(e) => openCtxMenu(e, table.name, 'table')"
                >
                  <div v-if="schemaStore.activeTable === table.name" class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full shadow-[0_0_8px_var(--primary)]"></div>
                  <Table class="w-3.5 h-3.5 text-sky-400/80 flex-shrink-0" :class="{ 'text-primary opacity-100': schemaStore.activeTable === table.name }" />
                  <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ table.name }}</span>
                  <span class="text-[9px] text-muted-foreground/70 font-mono flex-shrink-0">{{ formatCount(table.rowCount) }}</span>
                </button>
              </template>
              <div v-else class="px-6 py-2 text-[11px] text-muted-foreground/50">
                No matching tables
              </div>
            </div>
          </div>
        </div>

        <!-- Views -->
        <div v-if="schemaStore.filteredViews.length || (schemaStore.views.length && !schemaStore.searchQuery)" class="flex flex-col">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('views')"
          >
            <ChevronRight class="w-3.5 h-3.5 transition-transform ease-premium duration-normal text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.views }" />
            <Eye class="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span class="flex-1">Views</span>
            <span class="text-[9px] font-mono font-semibold bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground/80 border border-border/40">{{ schemaStore.views.length }}</span>
          </button>
          <div 
            class="grid transition-all duration-200 ease-in-out"
            :class="sectionsOpen.views ? 'grid-rows-[1fr] opacity-100 mt-0.5' : 'grid-rows-[0fr] opacity-0 pointer-events-none'"
          >
            <div class="overflow-hidden">
              <div v-if="schemaStore.isLoading" class="px-5 py-2 space-y-2.5 opacity-60">
                <div class="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
                <div class="h-3 bg-muted rounded w-3/4 animate-pulse"></div>
              </div>
              <template v-else-if="schemaStore.filteredViews.length">
                <button
                  v-for="view in schemaStore.filteredViews"
                  :key="view.name"
                  class="w-full flex items-center gap-2.5 px-3 py-1.5 pl-6 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/30 rounded-md transition-all duration-150 bg-transparent border-none cursor-pointer text-left relative"
                  :title="view.name"
                  @click="selectTable(view.name)"
                  @contextmenu.prevent="(e) => openCtxMenu(e, view.name, 'view')"
                >
                  <Eye class="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />
                  <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ view.name }}</span>
                </button>
              </template>
              <div v-else class="px-6 py-2 text-[11px] text-muted-foreground/50">
                No matching views
              </div>
            </div>
          </div>
        </div>

        <!-- Functions -->
        <div v-if="schemaStore.filteredFunctions.length || (schemaStore.functions.length && !schemaStore.searchQuery)" class="flex flex-col">
          <button 
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('functions')"
          >
            <ChevronRight class="w-3.5 h-3.5 transition-transform ease-premium duration-normal text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.functions }" />
            <Zap class="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span class="flex-1">Functions</span>
            <span class="text-[9px] font-mono font-semibold bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground/80 border border-border/40">{{ schemaStore.functions.length }}</span>
          </button>
          <div 
            class="grid transition-all duration-200 ease-in-out"
            :class="sectionsOpen.functions ? 'grid-rows-[1fr] opacity-100 mt-0.5' : 'grid-rows-[0fr] opacity-0 pointer-events-none'"
          >
            <div class="overflow-hidden">
              <div v-if="schemaStore.isLoading" class="px-5 py-2 space-y-2.5 opacity-60">
                <div class="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
              </div>
              <template v-else-if="schemaStore.filteredFunctions.length">
                <button
                  v-for="fn in schemaStore.filteredFunctions"
                  :key="fn.name"
                  class="w-full flex items-center gap-2.5 px-3 py-1.5 pl-6 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/30 rounded-md transition-all duration-150 bg-transparent border-none cursor-pointer text-left relative"
                  :title="fn.name"
                  @click="selectFunction(fn.name)"
                  @contextmenu.prevent="(e) => openCtxMenu(e, fn.name, 'function')"
                >
                  <Zap class="w-3.5 h-3.5 text-purple-400/80 flex-shrink-0" />
                  <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ fn.name }}</span>
                </button>
              </template>
              <div v-else class="px-6 py-2 text-[11px] text-muted-foreground/50">
                No matching functions
              </div>
            </div>
          </div>
        </div>

        <!-- Indexes -->
        <div v-if="schemaStore.filteredIndexes.length || (schemaStore.indexes.length && !schemaStore.searchQuery)" class="flex flex-col">
          <button 
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('indexes')"
          >
            <ChevronRight class="w-3.5 h-3.5 transition-transform ease-premium duration-normal text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.indexes }" />
            <Hash class="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span class="flex-1">Indexes</span>
            <span class="text-[9px] font-mono font-semibold bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground/80 border border-border/40">{{ schemaStore.indexes.length }}</span>
          </button>
          <div 
            class="grid transition-all duration-200 ease-in-out"
            :class="sectionsOpen.indexes ? 'grid-rows-[1fr] opacity-100 mt-0.5' : 'grid-rows-[0fr] opacity-0 pointer-events-none'"
          >
            <div class="overflow-hidden">
              <div v-if="schemaStore.isLoading" class="px-5 py-2 space-y-2.5 opacity-60">
                <div class="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
              </div>
              <template v-else-if="schemaStore.filteredIndexes.length">
                <button
                  v-for="idx in schemaStore.filteredIndexes"
                  :key="idx.name"
                  class="w-full flex items-center gap-2.5 px-3 py-1.5 pl-6 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/30 rounded-md transition-all duration-150 bg-transparent border-none cursor-pointer text-left relative"
                  :title="idx.name"
                  @click="copyOrInsert(idx.name)"
                  @contextmenu.prevent="(e) => openCtxMenu(e, idx.name, 'index')"
                >
                  <Hash class="w-3.5 h-3.5 text-emerald-400/80 flex-shrink-0" />
                  <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ idx.name }}</span>
                </button>
              </template>
              <div v-else class="px-6 py-2 text-[11px] text-muted-foreground/50">
                No matching indexes
              </div>
            </div>
          </div>
        </div>

        <!-- Procedures -->
        <div v-if="schemaStore.filteredProcs.length || (schemaStore.procs.length && !schemaStore.searchQuery)" class="flex flex-col">
          <button 
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('procs')"
          >
            <ChevronRight class="w-3.5 h-3.5 transition-transform ease-premium duration-normal text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.procs }" />
            <Play class="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span class="flex-1">Procedures</span>
            <span class="text-[9px] font-mono font-semibold bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground/80 border border-border/40">{{ schemaStore.procs.length }}</span>
          </button>
          <div 
            class="grid transition-all duration-200 ease-in-out"
            :class="sectionsOpen.procs ? 'grid-rows-[1fr] opacity-100 mt-0.5' : 'grid-rows-[0fr] opacity-0 pointer-events-none'"
          >
            <div class="overflow-hidden">
              <div v-if="schemaStore.isLoading" class="px-5 py-2 space-y-2.5 opacity-60">
                <div class="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
              </div>
              <template v-else-if="schemaStore.filteredProcs.length">
                <button
                  v-for="proc in schemaStore.filteredProcs"
                  :key="proc.name"
                  class="w-full flex items-center gap-2.5 px-3 py-1.5 pl-6 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/30 rounded-md transition-all duration-150 bg-transparent border-none cursor-pointer text-left relative"
                  :title="proc.name"
                  @click="selectProc(proc.name)"
                  @contextmenu.prevent="(e) => openCtxMenu(e, proc.name, 'proc')"
                >
                  <Play class="w-3.5 h-3.5 text-indigo-400/80 flex-shrink-0" />
                  <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ proc.name }}</span>
                </button>
              </template>
              <div v-else class="px-6 py-2 text-[11px] text-muted-foreground/50">
                No matching procedures
              </div>
            </div>
          </div>
        </div>

        <!-- Triggers -->
        <div v-if="schemaStore.filteredTriggers.length || (schemaStore.triggers.length && !schemaStore.searchQuery)" class="flex flex-col">
          <button 
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('triggers')"
          >
            <ChevronRight class="w-3.5 h-3.5 transition-transform ease-premium duration-normal text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.triggers }" />
            <Activity class="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            <span class="flex-1">Triggers</span>
            <span class="text-[9px] font-mono font-semibold bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground/80 border border-border/40">{{ schemaStore.triggers.length }}</span>
          </button>
          <div 
            class="grid transition-all duration-200 ease-in-out"
            :class="sectionsOpen.triggers ? 'grid-rows-[1fr] opacity-100 mt-0.5' : 'grid-rows-[0fr] opacity-0 pointer-events-none'"
          >
            <div class="overflow-hidden">
              <div v-if="schemaStore.isLoading" class="px-5 py-2 space-y-2.5 opacity-60">
                <div class="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
              </div>
              <template v-else-if="schemaStore.filteredTriggers.length">
                <button
                  v-for="trig in schemaStore.filteredTriggers"
                  :key="trig.name"
                  class="w-full flex items-center gap-2.5 px-3 py-1.5 pl-6 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/30 rounded-md transition-all duration-150 bg-transparent border-none cursor-pointer text-left relative"
                  :title="trig.name"
                  @click="selectTrigger(trig.name)"
                  @contextmenu.prevent="(e) => openCtxMenu(e, trig.name, 'trigger')"
                >
                  <Activity class="w-3.5 h-3.5 text-rose-400/80 flex-shrink-0" />
                  <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ trig.name }}</span>
                </button>
              </template>
              <div v-else class="px-6 py-2 text-[11px] text-muted-foreground/50">
                No matching triggers
              </div>
            </div>
          </div>
        </div>

        <!-- Saved Queries -->
        <div class="flex flex-col">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('saved')"
          >
            <ChevronRight class="w-3.5 h-3.5 transition-transform ease-premium duration-normal text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.saved }" />
            <FileText class="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <span class="flex-1">Saved Queries</span>
            <span class="text-[9px] font-mono font-semibold bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground/80 border border-border/40">{{ editorStore.savedQueries.length }}</span>
          </button>
          <div 
            class="grid transition-all duration-200 ease-in-out"
            :class="sectionsOpen.saved ? 'grid-rows-[1fr] opacity-100 mt-0.5' : 'grid-rows-[0fr] opacity-0 pointer-events-none'"
          >
            <div class="overflow-hidden">
              <button
                v-for="sq in editorStore.savedQueries"
                :key="sq.id"
                class="w-full flex items-center gap-2.5 px-3 py-1.5 pl-6 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/30 rounded-md transition-all duration-150 bg-transparent border-none cursor-pointer text-left relative"
                :title="sq.name"
                @click="editorStore.openSavedQuery(sq)"
                @contextmenu.prevent="(e) => openSQCtxMenu(e, sq)"
              >
                <FileText class="w-3.5 h-3.5 text-zinc-400/80 flex-shrink-0" />
                <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ sq.name }}</span>
              </button>
              <div v-if="!editorStore.savedQueries.length" class="px-6 py-2 text-[11px] text-muted-foreground/50">
                No saved queries
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>

    <Teleport to="body">
      <div
        v-if="ctxMenu.visible && !ctxMenu.isSavedQuery"
        class="fixed z-[9999] bg-popover border border-border rounded-md shadow-lg py-1 min-w-[160px]"
        :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
        role="menu"
        @mouseleave="closeCtxMenu"
      >
        <button
          v-if="ctxMenu.objectType === 'table' || ctxMenu.objectType === 'view'"
          class="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer text-left"
          role="menuitem"
          @click="ctxAction('open')"
        >
          <ExternalLink class="w-3 h-3" /> Open in new tab
        </button>
        <button
          class="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer text-left"
          role="menuitem"
          @click="ctxAction('copy')"
        >
          <Copy class="w-3 h-3" /> Copy name
        </button>
        <button
          v-if="ctxMenu.objectType === 'table' || ctxMenu.objectType === 'view'"
          class="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer text-left"
          role="menuitem"
          @click="ctxAction('ddl')"
        >
          <FileText class="w-3 h-3" /> View DDL
        </button>
      </div>
      <div
        v-if="ctxMenu.visible && ctxMenu.isSavedQuery"
        class="fixed z-[9999] bg-popover border border-border rounded-md shadow-lg py-1 min-w-[160px]"
        :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
        role="menu"
        @mouseleave="closeCtxMenu"
      >
        <button class="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent border-none cursor-pointer text-left" role="menuitem" @click="ctxSqAction('rename')"><Edit class="w-3 h-3" /> Rename</button>
        <button class="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-500 hover:bg-red-500/10 bg-transparent border-none cursor-pointer text-left" role="menuitem" @click="ctxSqAction('delete')"><Trash2 class="w-3 h-3" /> Delete</button>
      </div>
    </Teleport>

    <Dialog :open="renameDialog.open" @update:open="renameDialog.open = false">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename Query</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="doRename" class="flex flex-col gap-4">
          <div class="grid gap-2">
            <Label for="rename-name">New name</Label>
            <Input id="rename-name" ref="renameInput" v-model="renameDialog.name" class="w-full" @keydown.enter.prevent="doRename" />
          </div>
          <div class="flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" @click="renameDialog.open = false">Cancel</Button>
            <Button size="sm" type="submit" :disabled="!renameDialog.name.trim()">Rename</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </aside>
</template>

<script setup lang="ts">
import { reactive, ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'vue-sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ChevronRight,
  ExternalLink,
  Copy,
  FileText,
  Trash2,
  Edit,
  Table,
  Eye,
  Zap,
  Hash,
  Play,
  Activity,
} from '@lucide/vue'
import { useSchemaStore } from '../stores/schema'
import { useConnectionStore } from '../stores/connection'
import { useUiStore } from '../stores/ui'
import { useEditorStore } from '../stores/editor'
import { useResultStore } from '../stores/result'
import type { SavedQuery } from '../stores/editor'

const schemaStore = useSchemaStore()
const connStore = useConnectionStore()
const uiStore = useUiStore()
const editorStore = useEditorStore()
const resultStore = useResultStore()

watch(() => connStore.status, async (status) => {
  if (status === 'connected') {
    await schemaStore.fetchDatabases()
    await schemaStore.refreshSchema(connStore.activeId ?? undefined)
  }
}, { immediate: true })

onMounted(() => {
  editorStore.restoreTabState()
  editorStore.loadSavedQueries()
})

const sectionsOpen = reactive({
  tables: true,
  views: true,
  functions: true,
  indexes: true,
  procs: true,
  triggers: true,
  saved: true,
})

const renameDialog = reactive({
  open: false,
  id: '',
  name: '',
})
const renameInput = ref<HTMLInputElement | null>(null)

function openRename(id: string, currentName: string) {
  renameDialog.id = id
  renameDialog.name = currentName
  renameDialog.open = true
  nextTick(() => renameInput.value?.focus())
}

function doRename() {
  if (!renameDialog.name.trim() || !renameDialog.id) return
  editorStore.renameSavedQuery(renameDialog.id, renameDialog.name.trim())
  renameDialog.open = false
}

function toggle(section: keyof typeof sectionsOpen) {
  sectionsOpen[section] = !sectionsOpen[section]
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return String(n)
}

function quoteSqlIdentifier(name: string): string {
  return `\`${name.replace(/`/g, '``')}\``
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearch(e: Event) {
  const val = (e.target as HTMLInputElement).value
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => schemaStore.setSearchQuery(val), 150)
}

function selectTable(name: string) {
  schemaStore.setActiveTable(name)
  const quotedName = quoteSqlIdentifier(name)
  let tab = editorStore.tabs.find(t => t.name === name && t.sql.includes(`SELECT * FROM ${quotedName}`))
  if (!tab) {
    const tabId = editorStore.addTab()
    tab = editorStore.tabs.find(t => t.id === tabId)
    if (tab) { tab.name = name; tab.sql = `SELECT * FROM ${quotedName} LIMIT 100;` }
  } else {
    editorStore.selectTab(tab.id)
  }
  if (tab) resultStore.runQuery(tab.sql)
}

function copyOrInsert(name: string) {
  navigator.clipboard.writeText(name)
}

async function selectProc(name: string) {
  try {
    const connId = connStore.activeId
    const sql = `SHOW CREATE PROCEDURE ${quoteSqlIdentifier(name)};`
    const result = await invoke<any>('run_query_paged', {
      sql,
      limit: 1,
      offset: 0,
      id: connId,
    })

    if (result && result.rows && result.rows.length > 0) {
      const row = result.rows[0]
      const ddlKey = Object.keys(row).find(
        (k) =>
          k.toLowerCase().includes('create procedure') ||
          k.toLowerCase().includes('definition')
      )
      const definition = ddlKey ? row[ddlKey] : null

      if (definition) {
        const tabId = editorStore.addTab()
        const tab = editorStore.tabs.find((t) => t.id === tabId)
        if (tab) {
          tab.name = name
          tab.sql = definition
          editorStore.selectTab(tabId)
          toast.success(`Loaded definition for procedure "${name}"`)
        }
      } else {
        openFallbackTab(name, sql)
      }
    } else {
      openFallbackTab(name, sql)
    }
  } catch (error) {
    console.error('Failed to fetch procedure definition:', error)
    openFallbackTab(name, `SHOW CREATE PROCEDURE ${quoteSqlIdentifier(name)};`)
  }
}

async function selectFunction(name: string) {
  try {
    const connId = connStore.activeId
    const sql = `SHOW CREATE FUNCTION ${quoteSqlIdentifier(name)};`
    const result = await invoke<any>('run_query_paged', {
      sql,
      limit: 1,
      offset: 0,
      id: connId,
    })

    if (result && result.rows && result.rows.length > 0) {
      const row = result.rows[0]
      const ddlKey = Object.keys(row).find(
        (k) =>
          k.toLowerCase().includes('create function') ||
          k.toLowerCase().includes('definition')
      )
      const definition = ddlKey ? row[ddlKey] : null

      if (definition) {
        const tabId = editorStore.addTab()
        const tab = editorStore.tabs.find((t) => t.id === tabId)
        if (tab) {
          tab.name = name
          tab.sql = definition
          editorStore.selectTab(tabId)
          toast.success(`Loaded definition for function "${name}"`)
        }
      } else {
        openFallbackTab(name, sql)
      }
    } else {
      openFallbackTab(name, sql)
    }
  } catch (error) {
    console.error('Failed to fetch function definition:', error)
    openFallbackTab(name, `SHOW CREATE FUNCTION ${quoteSqlIdentifier(name)};`)
  }
}

async function selectTrigger(name: string) {
  try {
    const connId = connStore.activeId
    const sql = `SHOW CREATE TRIGGER ${quoteSqlIdentifier(name)};`
    const result = await invoke<any>('run_query_paged', {
      sql,
      limit: 1,
      offset: 0,
      id: connId,
    })

    if (result && result.rows && result.rows.length > 0) {
      const row = result.rows[0]
      const ddlKey = Object.keys(row).find(
        (k) =>
          k.toLowerCase().includes('create trigger') ||
          k.toLowerCase().includes('sql original statement') ||
          k.toLowerCase().includes('definition')
      )
      const definition = ddlKey ? row[ddlKey] : null

      if (definition) {
        const tabId = editorStore.addTab()
        const tab = editorStore.tabs.find((t) => t.id === tabId)
        if (tab) {
          tab.name = name
          tab.sql = definition
          editorStore.selectTab(tabId)
          toast.success(`Loaded definition for trigger "${name}"`)
        }
      } else {
        openFallbackTab(name, sql)
      }
    } else {
      openFallbackTab(name, sql)
    }
  } catch (error) {
    console.error('Failed to fetch trigger definition:', error)
    openFallbackTab(name, `SHOW CREATE TRIGGER ${quoteSqlIdentifier(name)};`)
  }
}

function openFallbackTab(name: string, sql: string) {
  const tabId = editorStore.addTab()
  const tab = editorStore.tabs.find((t) => t.id === tabId)
  if (tab) {
    tab.name = name
    tab.sql = sql
    editorStore.selectTab(tabId)
    resultStore.runQuery(sql)
  }
}

const ctxMenu = reactive({ visible: false, x: 0, y: 0, target: '', objectType: 'table', isSavedQuery: false, savedQueryId: '' })

function openCtxMenu(e: MouseEvent, name: string, objectType = 'table') {
  ctxMenu.visible = true
  ctxMenu.target = name
  ctxMenu.objectType = objectType
  ctxMenu.x = e.clientX
  ctxMenu.y = e.clientY
  ctxMenu.isSavedQuery = false
}

function openSQCtxMenu(e: MouseEvent, sq: SavedQuery) {
  ctxMenu.visible = true
  ctxMenu.target = sq.name
  ctxMenu.savedQueryId = sq.id
  ctxMenu.x = e.clientX
  ctxMenu.y = e.clientY
  ctxMenu.isSavedQuery = true
}

function closeCtxMenu() { ctxMenu.visible = false }

function ctxSqAction(action: string) {
  const id = ctxMenu.savedQueryId; const name = ctxMenu.target; closeCtxMenu()
  switch (action) {
    case 'rename': openRename(id, name); break
    case 'delete': editorStore.dropSavedQuery(id); break
  }
}

function ctxAction(action: string) {
  const name = ctxMenu.target; closeCtxMenu()
  switch (action) {
    case 'open': {
      const id = editorStore.addTab()
      const tab = editorStore.tabs.find(t => t.id === id)
      if (tab) {
        tab.name = name
        tab.sql = `SELECT * FROM ${quoteSqlIdentifier(name)} LIMIT 100;`
      }
      break
    }
    case 'copy': navigator.clipboard.writeText(name); break
    case 'ddl': schemaStore.setActiveTable(name); uiStore.openInspector(name); break
  }
}

function onDocClick(e: MouseEvent) {
  if (ctxMenu.visible && !(e.target as HTMLElement)?.closest('.sidebar')) {
    closeCtxMenu()
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
  document.removeEventListener('click', onDocClick)
})
</script>

<style scoped>
.sidebar {
  transition: opacity 180ms cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
}
.sidebar.w-0 { opacity: 0; border-right: none; pointer-events: none; }
</style>
