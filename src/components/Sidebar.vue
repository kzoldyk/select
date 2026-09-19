<template>
  <aside
    class="sidebar border-r border-border/80 flex flex-col overflow-hidden select-none font-mono text-xs"
    :class="{ 'w-0 border-r-0': !uiStore.sidebarOpen }"
    role="navigation"
    aria-label="Schema browser"
  >
    <!-- Top Database & Search Bar -->
    <div class="px-3 py-3 border-b border-border/80 flex flex-col gap-2 flex-shrink-0 bg-sidebar/95 z-10">
      <template v-if="connStore.status === 'connected'">
        <div class="flex items-center gap-1.5">
          <select
            v-if="schemaStore.databases?.length"
            class="flex h-7 w-full rounded-md border border-border/60 bg-background/50 px-2 py-1 text-[11px] font-mono text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-2xs cursor-pointer"
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
          <ActionTooltip text="Refresh schema (⇧⌘R)">
            <button
              class="flex items-center justify-center w-7 h-7 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground bg-background/50 border border-border/60 cursor-pointer flex-shrink-0 shadow-2xs transition-colors"
              :disabled="schemaStore.isLoading"
              aria-label="Refresh schema"
              @click="schemaStore.refreshSchema(connStore.activeId ?? undefined)"
            >
              <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': schemaStore.isLoading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </button>
          </ActionTooltip>
        </div>

        <div v-if="schemaStore.schemaError" class="p-2 bg-destructive/10 border border-destructive/20 rounded text-[10.5px] text-destructive flex items-center justify-between gap-1">
          <span class="truncate">{{ schemaStore.schemaError }}</span>
          <button
            class="px-1.5 py-0.5 bg-destructive/20 hover:bg-destructive/30 rounded text-[9.5px] font-semibold cursor-pointer border-none"
            @click="schemaStore.refreshSchema(connStore.activeId ?? undefined)"
          >
            Retry
          </button>
        </div>
      </template>

      <div v-else-if="connStore.status === 'connecting'" class="flex items-center justify-center gap-2 py-2 text-[11px] text-muted-foreground">
        <span class="w-3 h-3 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin"></span>
        Connecting…
      </div>
      <div v-else class="flex flex-col gap-1.5 py-1">
        <button
          class="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm cursor-pointer border-none"
          @click="uiStore.openConnectionManager()"
        >
          <PhPlug class="w-3.5 h-3.5" />
          <span>Connect to Database</span>
        </button>
      </div>

      <!-- Quick Search Filter -->
      <div class="relative">
        <PhMagnifyingGlass class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
        <input
          id="sidebar-search-input"
          class="flex h-7.5 w-full rounded-md border border-border/50 bg-background/40 pl-8 pr-2.5 py-1 text-[11.5px] text-foreground font-mono placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all shadow-2xs"
          type="text"
          placeholder="Filter objects… (⌘1)"
          aria-label="Filter schema objects"
          :value="schemaStore.searchQuery"
          @input="onSearch"
        />
      </div>
    </div>

    <!-- Scrollable Explorer Sections -->
    <ScrollArea class="flex-1">
      <div v-if="connStore.status !== 'connected' && connStore.status !== 'connecting' && !schemaStore.isLoading" class="px-3 pt-6">
        <EmptyState
          title="No database connected"
          description="Connect to query tables, inspect schemas, and view relationships."
        >
          <template #icon>
            <PhDatabase class="w-6 h-6 text-muted-foreground/50" />
          </template>
        </EmptyState>
      </div>

      <div v-else class="py-2 flex flex-col gap-1 px-2">
        <!-- WORKSPACE SECTION -->
        <div v-if="connStore.status === 'connected'" class="mb-2 flex flex-col">
          <div class="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center justify-between">
            <span>Workspace</span>
          </div>

          <button
            class="w-full flex items-center gap-2 px-2 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors border-none cursor-pointer text-left bg-transparent"
            @click="editorStore.addSchemaDiagramTab()"
          >
            <PhGitBranch class="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span class="flex-1 font-medium">Schema Diagram</span>
          </button>
        </div>

        <div class="h-px bg-border/40 my-1"></div>

        <!-- SCHEMA SECTION -->
        <div class="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground/60">
          Schema Objects
        </div>

        <!-- Tables -->
        <div v-if="connStore.status === 'connected' || schemaStore.tables.length || schemaStore.isLoading" class="flex flex-col">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10.5px] font-bold text-muted-foreground/80 hover:text-foreground hover:bg-sidebar-accent rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('tables')"
          >
            <PhCaretRight class="w-3.5 h-3.5 transition-transform duration-fast text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.tables }" />
            <PhTable class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span class="flex-1">Tables</span>
            <span class="text-[9px] font-mono font-semibold bg-background/50 px-1.5 py-0.2 rounded text-muted-foreground/80 border border-border/30">{{ schemaStore.tables.length }}</span>
          </button>
          
          <div v-show="sectionsOpen.tables" class="flex flex-col pl-2 mt-0.5 space-y-0.5">
            <div v-if="schemaStore.isLoading" class="px-4 py-2 space-y-1.5 opacity-60">
              <div class="h-3 bg-muted rounded w-3/4 animate-pulse"></div>
              <div class="h-3 bg-muted rounded w-5/6 animate-pulse"></div>
            </div>
            <template v-else-if="schemaStore.filteredTables.length">
              <button
                v-for="table in schemaStore.filteredTables"
                :key="table.name"
                class="w-full flex items-center gap-2 px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-fast bg-transparent border-none cursor-pointer text-left relative"
                :class="{ 'text-primary bg-primary/10 font-semibold': schemaStore.activeTable === table.name }"
                :title="table.name + ' — Alt+click to inspect'"
                @click="(e: MouseEvent) => e.altKey ? inspectTable(table.name) : openTableAsQuery(table.name)"
                @contextmenu.prevent="(e) => openCtxMenu(e, table.name, 'table')"
              >
                <div v-if="schemaStore.activeTable === table.name" class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-primary rounded-r"></div>
                <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ table.name }}</span>
                <span class="text-[9px] text-muted-foreground/60 font-mono flex-shrink-0">{{ formatCount(table.rowCount) }}</span>
              </button>
            </template>
            <div v-else class="px-4 py-1.5 text-[10.5px] text-muted-foreground/50">
              No matching tables
            </div>
          </div>
        </div>

        <!-- Views -->
        <div v-if="schemaStore.filteredViews.length || (schemaStore.views.length && !schemaStore.searchQuery)" class="flex flex-col">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10.5px] font-bold text-muted-foreground/80 hover:text-foreground hover:bg-sidebar-accent rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('views')"
          >
            <PhCaretRight class="w-3.5 h-3.5 transition-transform duration-fast text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.views }" />
            <PhEye class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span class="flex-1">Views</span>
            <span class="text-[9px] font-mono font-semibold bg-background/50 px-1.5 py-0.2 rounded text-muted-foreground/80 border border-border/30">{{ schemaStore.views.length }}</span>
          </button>
          
          <div v-show="sectionsOpen.views" class="flex flex-col pl-2 mt-0.5 space-y-0.5">
            <button
              v-for="view in schemaStore.filteredViews"
              :key="view.name"
              class="w-full flex items-center gap-2 px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-fast bg-transparent border-none cursor-pointer text-left truncate"
              :title="view.name"
              @click="openTableAsQuery(view.name)"
              @contextmenu.prevent="(e) => openCtxMenu(e, view.name, 'view')"
            >
              <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ view.name }}</span>
            </button>
          </div>
        </div>

        <!-- Functions -->
        <div v-if="schemaStore.filteredFunctions.length || (schemaStore.functions.length && !schemaStore.searchQuery)" class="flex flex-col">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10.5px] font-bold text-muted-foreground/80 hover:text-foreground hover:bg-sidebar-accent rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('functions')"
          >
            <PhCaretRight class="w-3.5 h-3.5 transition-transform duration-fast text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.functions }" />
            <PhLightning class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span class="flex-1">Functions</span>
            <span class="text-[9px] font-mono font-semibold bg-background/50 px-1.5 py-0.2 rounded text-muted-foreground/80 border border-border/30">{{ schemaStore.functions.length }}</span>
          </button>
          
          <div v-show="sectionsOpen.functions" class="flex flex-col pl-2 mt-0.5 space-y-0.5">
            <button
              v-for="fn in schemaStore.filteredFunctions"
              :key="fn.name"
              class="w-full flex items-center gap-2 px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-fast bg-transparent border-none cursor-pointer text-left truncate"
              :title="fn.name"
              @click="selectFunction(fn.name)"
              @contextmenu.prevent="(e) => openCtxMenu(e, fn.name, 'function')"
            >
              <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ fn.name }}</span>
            </button>
          </div>
        </div>

        <!-- Procedures -->
        <div v-if="schemaStore.filteredProcs.length || (schemaStore.procs.length && !schemaStore.searchQuery)" class="flex flex-col">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10.5px] font-bold text-muted-foreground/80 hover:text-foreground hover:bg-sidebar-accent rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('procs')"
          >
            <PhCaretRight class="w-3.5 h-3.5 transition-transform duration-fast text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.procs }" />
            <PhPlay class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span class="flex-1">Procedures</span>
            <span class="text-[9px] font-mono font-semibold bg-background/50 px-1.5 py-0.2 rounded text-muted-foreground/80 border border-border/30">{{ schemaStore.procs.length }}</span>
          </button>
          
          <div v-show="sectionsOpen.procs" class="flex flex-col pl-2 mt-0.5 space-y-0.5">
            <button
              v-for="proc in schemaStore.filteredProcs"
              :key="proc.name"
              class="w-full flex items-center gap-2 px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-fast bg-transparent border-none cursor-pointer text-left truncate"
              :title="proc.name"
              @click="selectProc(proc.name)"
              @contextmenu.prevent="(e) => openCtxMenu(e, proc.name, 'proc')"
            >
              <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ proc.name }}</span>
            </button>
          </div>
        </div>

        <!-- Indexes -->
        <div v-if="schemaStore.filteredIndexes.length || (schemaStore.indexes.length && !schemaStore.searchQuery)" class="flex flex-col">
          <button
            class="w-full flex items-center gap-2 px-2 py-1.5 text-[10.5px] font-bold text-muted-foreground/80 hover:text-foreground hover:bg-sidebar-accent rounded-md transition-all border-none cursor-pointer text-left select-none uppercase tracking-wider bg-transparent"
            @click="toggle('indexes')"
          >
            <PhCaretRight class="w-3.5 h-3.5 transition-transform duration-fast text-muted-foreground/60" :class="{ 'rotate-90': sectionsOpen.indexes }" />
            <PhHash class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span class="flex-1">Indexes</span>
            <span class="text-[9px] font-mono font-semibold bg-background/50 px-1.5 py-0.2 rounded text-muted-foreground/80 border border-border/30">{{ schemaStore.indexes.length }}</span>
          </button>
          
          <div v-show="sectionsOpen.indexes" class="flex flex-col pl-2 mt-0.5 space-y-0.5">
            <button
              v-for="idx in schemaStore.filteredIndexes"
              :key="idx.name"
              class="w-full flex items-center gap-2 px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-fast bg-transparent border-none cursor-pointer text-left truncate"
              :title="idx.name"
              @click="copyText(idx.name)"
            >
              <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ idx.name }}</span>
            </button>
          </div>
        </div>

        <!-- Saved Queries -->
        <div class="flex flex-col">
          <div
            data-saved-queries-header
            class="w-full flex items-center justify-between px-2 py-1.5 text-[10.5px] font-bold text-muted-foreground/80 hover:text-foreground hover:bg-sidebar-accent rounded-md transition-all select-none uppercase tracking-wider"
            :class="{ 'bg-primary/20 text-foreground ring-1 ring-primary': draggingQueryId && isQueryInFolder(draggingQueryId) && dragOverTarget === 'root' }"
            @dragover.prevent.stop="(e) => onDragOver(e, 'root')"
            @dragenter.prevent.stop="(e) => onDragOver(e, 'root')"
            @dragleave.stop="(e) => onDragLeave(e, 'root')"
            @drop.prevent.stop="(e) => onDrop(e, null)"
          >
            <button
              class="flex items-center gap-2 flex-1 border-none cursor-pointer text-left uppercase tracking-wider bg-transparent p-0 text-[10.5px] font-bold text-inherit"
              :class="{ 'pointer-events-none': !!draggingQueryId }"
              @click="toggle('saved')"
            >
              <PhCaretRight class="w-3.5 h-3.5 transition-transform duration-fast text-muted-foreground/60 pointer-events-none" :class="{ 'rotate-90': sectionsOpen.saved }" />
              <PhFileCode class="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 pointer-events-none" />
              <span class="flex-1 pointer-events-none">Saved Queries</span>
              <span class="text-[9px] font-mono font-semibold bg-background/50 px-1.5 py-0.2 rounded text-muted-foreground/80 border border-border/30 pointer-events-none">{{ editorStore.savedQueries?.length || 0 }}</span>
            </button>
            <ActionTooltip text="New query folder">
              <button
                id="btn-create-folder"
                class="ml-1 p-1 hover:text-foreground text-muted-foreground/60 hover:bg-background/80 rounded border-none cursor-pointer bg-transparent transition-colors"
                :class="{ 'pointer-events-none': !!draggingQueryId }"
                aria-label="New query folder"
                @click.stop="openCreateFolderDialog(null)"
              >
                <PhFolderPlus class="w-3.5 h-3.5 pointer-events-none" />
              </button>
            </ActionTooltip>
          </div>
          
          <div
            v-show="sectionsOpen.saved"
            class="flex flex-col pl-2 mt-0.5 space-y-0.5 min-h-[36px] rounded transition-colors"
            :class="{ 'bg-primary/5 ring-1 ring-dashed ring-primary/40': draggingQueryId && dragOverTarget === 'root' }"
            @dragover.prevent.stop="(e) => onDragOver(e, 'root')"
            @dragenter.prevent.stop="(e) => onDragOver(e, 'root')"
            @dragleave="(e) => onDragLeave(e, 'root')"
            @drop.prevent.stop="(e) => onDrop(e, null)"
          >

            <!-- Folder List -->
            <div
              v-for="folder in allFolders"
              :key="folder"
              class="flex flex-col rounded transition-colors"
              :class="{ 'bg-primary/10 ring-2 ring-primary/50 border border-primary/40': draggingQueryId && dragOverTarget === folder }"
              @dragover.prevent.stop="(e) => onDragOver(e, folder)"
              @dragenter.prevent.stop="(e) => onDragOver(e, folder)"
              @dragleave="(e) => onDragLeave(e, folder)"
              @drop.prevent.stop="(e) => onDrop(e, folder)"
            >
              <!-- Folder Header -->
              <div
                :data-folder-header="folder"
                class="w-full flex items-center gap-1.5 px-1.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-fast cursor-pointer select-none group"
                :class="{ 'bg-primary/20 text-foreground font-semibold': draggingQueryId && dragOverTarget === folder }"
                @dragover.prevent.stop="(e) => onDragOver(e, folder)"
                @dragenter.prevent.stop="(e) => onDragOver(e, folder)"
                @drop.prevent.stop="(e) => onDrop(e, folder)"
                @click="toggleFolder(folder)"
                @contextmenu.prevent="(e) => openFolderCtxMenu(e, folder)"
              >
                <PhCaretRight class="w-3 h-3 transition-transform duration-fast text-muted-foreground/60 flex-shrink-0 pointer-events-none" :class="{ 'rotate-90': isFolderOpen(folder) }" />
                <component
                  :is="isFolderOpen(folder) ? PhFolderOpen : PhFolder"
                  class="w-3.5 h-3.5 text-amber-500/80 flex-shrink-0 pointer-events-none"
                />
                <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-medium pointer-events-none">{{ folder }}</span>
                <span class="text-[9px] font-mono text-muted-foreground/60 px-1 rounded bg-background/40 pointer-events-none">
                  {{ (queriesByFolder[folder] || []).length }}
                </span>
                <button
                  class="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-background/80 text-muted-foreground/70 hover:text-foreground border-none bg-transparent cursor-pointer ml-0.5"
                  title="Folder actions"
                  @click.stop="(e) => openFolderCtxMenu(e, folder)"
                >
                  <PhPlus class="w-3 h-3 pointer-events-none" />
                </button>
              </div>

              <!-- Folder Children -->
              <div
                v-show="isFolderOpen(folder)"
                class="flex flex-col pl-4 space-y-0.5 min-h-[12px]"
                @dragover.prevent.stop="(e) => onDragOver(e, folder)"
                @dragenter.prevent.stop="(e) => onDragOver(e, folder)"
                @drop.prevent.stop="(e) => onDrop(e, folder)"
              >
                <div
                  v-for="sq in (queriesByFolder[folder] || [])"
                  :key="sq.id"
                  role="button"
                  tabindex="0"
                  draggable="true"
                  class="w-full flex items-center gap-2 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-fast bg-transparent border-none cursor-grab active:cursor-grabbing text-left truncate select-none"
                  :class="{ 'opacity-40': draggingQueryId === sq.id }"
                  :title="`${sq.name} (drag to move)`"
                  @dragstart="(e) => onDragStart(e, sq.id)"
                  @dragend="onDragEnd"
                  @dragover.prevent.stop="(e) => onDragOver(e, folder)"
                  @drop.prevent.stop="(e) => onDrop(e, folder)"
                  @click="editorStore.openSavedQuery(sq)"
                  @keydown.enter="editorStore.openSavedQuery(sq)"
                  @contextmenu.prevent="(e) => openSQCtxMenu(e, sq)"
                >
                  <component
                    :is="sq.id.toLowerCase().endsWith('.md') ? PhNotebook : PhFileCode"
                    class="w-3.5 h-3.5 flex-shrink-0 pointer-events-none"
                    :class="sq.id.toLowerCase().endsWith('.md') ? 'text-amber-400' : 'text-muted-foreground/70'"
                  />
                  <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap pointer-events-none">{{ sq.name }}</span>
                </div>
                <div
                  v-if="!(queriesByFolder[folder] || []).length"
                  class="px-2 py-2 text-[10.5px] border border-dashed rounded text-muted-foreground/60 transition-colors cursor-pointer select-none pointer-events-none"
                  :class="{
                    'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary': draggingQueryId && dragOverTarget === folder,
                    'border-border/40': !draggingQueryId || dragOverTarget !== folder
                  }"
                  @dragover.prevent.stop="(e) => onDragOver(e, folder)"
                  @dragenter.prevent.stop="(e) => onDragOver(e, folder)"
                  @drop.prevent.stop="(e) => onDrop(e, folder)"
                >
                  Empty folder (drag queries here)
                </div>
              </div>
            </div>

            <!-- Root Queries (no folder) -->
            <div
              v-for="sq in rootQueries"
              :key="sq.id"
              role="button"
              tabindex="0"
              draggable="true"
              class="w-full flex items-center gap-2 px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-fast bg-transparent border-none cursor-grab active:cursor-grabbing text-left truncate select-none"
              :class="{ 'opacity-40': draggingQueryId === sq.id }"
              :title="`${sq.name} (drag to move)`"
              @dragstart="(e) => onDragStart(e, sq.id)"
              @dragend="onDragEnd"
              @dragover.prevent.stop="(e) => onDragOver(e, 'root')"
              @drop.prevent.stop="(e) => onDrop(e, null)"
              @click="editorStore.openSavedQuery(sq)"
              @keydown.enter="editorStore.openSavedQuery(sq)"
              @contextmenu.prevent="(e) => openSQCtxMenu(e, sq)"
            >
              <component
                :is="sq.id.toLowerCase().endsWith('.md') ? PhNotebook : PhFileCode"
                class="w-3.5 h-3.5 flex-shrink-0 pointer-events-none"
                :class="sq.id.toLowerCase().endsWith('.md') ? 'text-amber-400' : 'text-muted-foreground/70'"
              />
              <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap pointer-events-none">{{ sq.name }}</span>
            </div>

            <div v-if="!editorStore.savedQueries?.length && !allFolders.length" class="px-4 py-1.5 text-[10.5px] text-muted-foreground/50">
              No saved queries
            </div>

            <!-- Drop target for moving out to root when dragging query from folder -->
            <div
              v-if="draggingQueryId && isQueryInFolder(draggingQueryId)"
              data-drop-zone="root"
              class="flex items-center justify-center gap-2 py-2.5 px-3 my-1.5 rounded-md border-2 border-dashed border-primary/70 bg-primary/10 text-primary text-xs font-semibold transition-all select-none cursor-pointer"
              :class="{ 'bg-primary/25 ring-2 ring-primary scale-[1.01]': dragOverTarget === 'root' }"
              @dragover.prevent.stop="(e) => onDragOver(e, 'root')"
              @dragenter.prevent.stop="(e) => onDragOver(e, 'root')"
              @dragleave.stop="(e) => onDragLeave(e, 'root')"
              @drop.prevent.stop="(e) => onDrop(e, null)"
            >
              <PhArrowBendUpLeft class="w-4 h-4 pointer-events-none" />
              <span class="pointer-events-none">Drop here to move back to Root</span>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>

    <!-- Context Menus -->
    <Teleport to="body">
      <div
        v-if="ctxMenu.visible && !ctxMenu.isSavedQuery"
        data-context-menu
        class="fixed z-[9999] bg-popover border border-border/80 rounded-md shadow-xl py-1 min-w-[170px] text-xs font-mono select-none"
        :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
        @click.stop
      >
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left"
          @click="ctxAction('open')"
        >
          <PhArrowSquareOut class="w-3.5 h-3.5" /> Open Data
        </button>
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left"
          @click="ctxAction('inspect')"
        >
          <PhEye class="w-3.5 h-3.5" /> Inspect (⌘I)
        </button>
        <div class="h-px bg-border/60 my-1"></div>
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left"
          @click="ctxAction('copy')"
        >
          <PhCopy class="w-3.5 h-3.5" /> Copy Name
        </button>
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left"
          @click="ctxAction('ddl')"
        >
          <PhFileCode class="w-3.5 h-3.5" /> View DDL
        </button>
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left"
          @click="ctxAction('visualize')"
        >
          <PhGitBranch class="w-3.5 h-3.5 text-indigo-400" /> Visualize Relations
        </button>
      </div>

      <div
        v-if="ctxMenu.visible && ctxMenu.isSavedQuery"
        data-context-menu
        class="fixed z-[9999] bg-popover border border-border/80 rounded-md shadow-xl py-1 min-w-[180px] text-xs font-mono select-none"
        :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
        @click.stop
      >
        <button class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left" @click="ctxSqAction('rename')">
          <PhPencil class="w-3.5 h-3.5" /> Rename
        </button>

        <!-- Move to submenu container -->
        <div class="relative group/move">
          <button
            class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left"
            @click="ctxSqAction('move')"
          >
            <span class="flex items-center gap-2">
              <PhFolderNotch class="w-3.5 h-3.5 text-amber-500/80" /> Move to
            </span>
            <PhCaretRight class="w-3 h-3 text-muted-foreground/70" />
          </button>

          <!-- Flyout Submenu with folder choices -->
          <div
            class="hidden group-hover/move:block absolute top-0 z-[10000]"
            :class="submenuOnLeft ? 'right-full pr-1' : 'left-full pl-1'"
          >
            <div
              data-context-menu
              class="bg-popover border border-border/80 rounded-md shadow-2xl py-1 min-w-[180px] max-h-60 overflow-y-auto text-xs font-mono select-none"
            >
              <div class="px-2.5 py-1 text-[10px] uppercase font-semibold text-muted-foreground/70 tracking-wider">
                Select Destination
              </div>
              <div v-if="allFolders.length === 0" class="px-3 py-1.5 text-[11px] text-muted-foreground/60 italic">
                No folders created yet
              </div>
              <button
                v-for="f in allFolders"
                :key="f"
                class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left truncate"
                :class="{ 'text-primary font-semibold bg-primary/10': currentQueryFolder(ctxMenu.savedQueryId) === f }"
                :disabled="currentQueryFolder(ctxMenu.savedQueryId) === f"
                @click="ctxMoveTo(ctxMenu.savedQueryId, f)"
              >
                <span class="flex items-center gap-2 truncate">
                  <PhFolder class="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                  <span class="truncate">{{ f }}</span>
                </span>
                <span v-if="currentQueryFolder(ctxMenu.savedQueryId) === f" class="text-[9.5px] text-primary shrink-0 ml-1">Current</span>
              </button>

              <div class="h-px bg-border/60 my-1"></div>

              <button
                v-if="currentQueryFolder(ctxMenu.savedQueryId)"
                class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left text-muted-foreground hover:text-foreground"
                @click="ctxMoveTo(ctxMenu.savedQueryId, null)"
              >
                <PhArrowBendUpLeft class="w-3.5 h-3.5 text-primary shrink-0" />
                <span>/ (Root folder)</span>
              </button>

              <button
                class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left text-primary font-medium"
                @click="ctxSqAction('move')"
              >
                <PhPlus class="w-3.5 h-3.5 shrink-0" />
                <span>New folder / Dialog…</span>
              </button>
            </div>
          </div>
        </div>

        <button
          v-if="currentQueryFolder(ctxMenu.savedQueryId)"
          id="btn-ctx-move-to-root"
          class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left text-muted-foreground hover:text-foreground"
          @click="ctxSqAction('moveToRoot')"
        >
          <PhArrowBendUpLeft class="w-3.5 h-3.5 text-primary" /> Move to Root
        </button>
        <div class="h-px bg-border/60 my-1"></div>
        <button class="w-full flex items-center gap-2 px-3 py-1.5 text-red-500 hover:bg-red-500/10 cursor-pointer border-none bg-transparent text-left" @click="ctxSqAction('delete')">
          <PhTrash class="w-3.5 h-3.5" /> Delete
        </button>
      </div>

      <div
        v-if="ctxMenu.visible && ctxMenu.isFolder"
        data-context-menu
        class="fixed z-[9999] bg-popover border border-border/80 rounded-md shadow-xl py-1 min-w-[170px] text-xs font-mono select-none"
        :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
        @click.stop
      >
        <button class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left" @click="ctxFolderAction('newQuery')">
          <PhPlus class="w-3.5 h-3.5" /> New Query Here
        </button>
        <button id="btn-ctx-rename-folder" class="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent text-left" @click="ctxFolderAction('rename')">
          <PhPencil class="w-3.5 h-3.5" /> Rename Folder
        </button>
        <div class="h-px bg-border/60 my-1"></div>
        <button id="btn-ctx-delete-folder" class="w-full flex items-center gap-2 px-3 py-1.5 text-red-500 hover:bg-red-500/10 cursor-pointer border-none bg-transparent text-left" @click="ctxFolderAction('delete')">
          <PhTrash class="w-3.5 h-3.5" /> Delete Folder
        </button>
      </div>

      <!-- Create Folder Dialog -->
      <Dialog :open="folderDialogOpen" @update:open="(v) => folderDialogOpen = v">
        <DialogContent class="sm:max-w-sm font-mono">
          <DialogHeader>
            <DialogTitle class="text-sm">Create Query Folder</DialogTitle>
            <DialogDescription class="text-xs">
              Organize your saved queries into folders.
            </DialogDescription>
          </DialogHeader>
          <form @submit.prevent="submitCreateFolder" class="flex flex-col gap-4 py-2">
            <div class="grid gap-2">
              <Label for="folder-name-input" class="text-xs">Folder Name</Label>
              <Input
                id="folder-name-input"
                ref="folderInputRef"
                v-model="folderDialogName"
                placeholder="e.g. Reports, Migrations, Analytics"
                class="h-8 text-xs font-mono"
              />
            </div>
            <DialogFooter class="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" type="button" class="h-8 text-xs" @click="folderDialogOpen = false">Cancel</Button>
              <Button id="btn-submit-folder" size="sm" type="submit" class="h-8 text-xs" :disabled="!folderDialogName.trim()">Create Folder</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <!-- Rename Folder Dialog -->
      <Dialog :open="renameFolderDialogOpen" @update:open="(v) => renameFolderDialogOpen = v">
        <DialogContent class="sm:max-w-sm font-mono">
          <DialogHeader>
            <DialogTitle class="text-sm">Rename Folder</DialogTitle>
          </DialogHeader>
          <form @submit.prevent="submitRenameFolder" class="flex flex-col gap-4 py-2">
            <div class="grid gap-2">
              <Label for="rename-folder-input" class="text-xs">Folder Name</Label>
              <Input
                id="rename-folder-input"
                ref="renameFolderInputRef"
                v-model="renameFolderDialogName"
                class="h-8 text-xs font-mono"
              />
            </div>
            <DialogFooter class="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" type="button" class="h-8 text-xs" @click="renameFolderDialogOpen = false">Cancel</Button>
              <Button id="btn-submit-rename-folder" size="sm" type="submit" class="h-8 text-xs" :disabled="!renameFolderDialogName.trim() || renameFolderDialogName.trim() === renameFolderDialogOldName">Rename Folder</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <!-- Rename Query Dialog -->
      <Dialog :open="renameDialogOpen" @update:open="(v) => renameDialogOpen = v">
        <DialogContent class="sm:max-w-sm font-mono">
          <DialogHeader>
            <DialogTitle class="text-sm">Rename Query</DialogTitle>
          </DialogHeader>
          <form @submit.prevent="submitRenameQuery" class="flex flex-col gap-4 py-2">
            <div class="grid gap-2">
              <Label for="rename-query-input" class="text-xs">Query Name</Label>
              <Input
                id="rename-query-input"
                ref="renameInputRef"
                v-model="renameDialogName"
                class="h-8 text-xs font-mono"
              />
            </div>
            <DialogFooter class="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" type="button" class="h-8 text-xs" @click="renameDialogOpen = false">Cancel</Button>
              <Button id="btn-submit-rename" size="sm" type="submit" class="h-8 text-xs" :disabled="!renameDialogName.trim()">Rename</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <!-- Delete Folder Confirmation Dialog -->
      <Dialog :open="deleteFolderDialogOpen" @update:open="(v) => deleteFolderDialogOpen = v">
        <DialogContent class="sm:max-w-sm font-mono">
          <DialogHeader>
            <DialogTitle class="text-sm text-destructive">Delete Folder</DialogTitle>
            <DialogDescription class="text-xs">
              Are you sure you want to delete folder "{{ deleteFolderTarget }}" and all queries inside it?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" class="h-8 text-xs" @click="deleteFolderDialogOpen = false">Cancel</Button>
            <Button id="btn-confirm-delete-folder" variant="destructive" size="sm" class="h-8 text-xs" @click="submitDeleteFolder">Delete Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <!-- Move Query to Folder Dialog -->
      <Dialog :open="moveDialogOpen" @update:open="(v) => moveDialogOpen = v">
        <DialogContent class="sm:max-w-sm font-mono">
          <DialogHeader>
            <DialogTitle class="text-sm">Move Query</DialogTitle>
            <DialogDescription class="text-xs">
              Move "{{ moveTargetQueryName }}" to a folder or back to root.
            </DialogDescription>
          </DialogHeader>
          <div class="flex flex-col gap-3 py-2">
            <!-- Current Location -->
            <div class="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span>Current location:</span>
              <span class="font-bold text-foreground">{{ moveTargetCurrentFolder ? `📁 ${moveTargetCurrentFolder}` : 'Root (no folder)' }}</span>
            </div>

            <!-- Existing folders -->
            <div v-if="allFolders.length > 0" class="flex flex-col gap-1">
              <Label class="text-[10.5px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Select Destination Folder</Label>
              <div class="max-h-40 overflow-y-auto space-y-1 pr-1">
                <button
                  v-if="moveTargetCurrentFolder"
                  type="button"
                  class="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded border border-border/60 hover:bg-accent hover:text-foreground text-left cursor-pointer transition-colors"
                  @click="executeMove(null)"
                >
                  <PhArrowBendUpLeft class="w-3.5 h-3.5 text-primary" />
                  <span class="font-medium">Move to Root</span>
                </button>
                <button
                  v-for="f in allFolders"
                  :key="f"
                  type="button"
                  class="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded border text-left cursor-pointer transition-colors"
                  :class="moveTargetCurrentFolder === f ? 'border-primary/50 bg-primary/10 text-primary font-semibold' : 'border-border/60 hover:bg-accent text-foreground'"
                  :disabled="moveTargetCurrentFolder === f"
                  @click="executeMove(f)"
                >
                  <span class="flex items-center gap-2 truncate">
                    <PhFolder class="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                    <span class="truncate">{{ f }}</span>
                  </span>
                  <span v-if="moveTargetCurrentFolder === f" class="text-[10px] text-primary/80 shrink-0">Current</span>
                </button>
              </div>
            </div>

            <!-- Create new folder and move -->
            <div class="flex flex-col gap-1.5 pt-2 border-t border-border/40">
              <Label for="move-new-folder-input" class="text-[10.5px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Or Move to New Folder</Label>
              <div class="flex gap-2">
                <Input
                  id="move-new-folder-input"
                  v-model="moveDialogNewFolder"
                  placeholder="new_folder_name"
                  class="h-8 text-xs font-mono flex-1"
                  @keydown.enter.prevent="executeMove(moveDialogNewFolder.trim())"
                />
                <Button
                  size="sm"
                  class="h-8 text-xs shrink-0 cursor-pointer"
                  :disabled="!moveDialogNewFolder.trim()"
                  @click="executeMove(moveDialogNewFolder.trim())"
                >
                  Move
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter class="gap-2 sm:gap-0 mt-1">
            <Button variant="outline" size="sm" class="h-8 text-xs" @click="moveDialogOpen = false">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import EmptyState from '@/components/ui/EmptyState.vue'
import { ActionTooltip } from '@/components/ui/tooltip'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'vue-sonner'
import {
  PhMagnifyingGlass, PhCaretRight, PhTable, PhEye, PhLightning, PhHash,
  PhPlay, PhFileCode, PhGitBranch, PhPlug, PhDatabase,
  PhCopy, PhArrowSquareOut, PhPencil, PhTrash, PhNotebook,
  PhFolder, PhFolderOpen, PhFolderPlus, PhPlus, PhFolderNotch, PhArrowBendUpLeft
} from '@phosphor-icons/vue'
import { useSchemaStore } from '../stores/schema'
import { useConnectionStore } from '../stores/connection'
import { useUiStore } from '../stores/ui'
import { useEditorStore, type SavedQuery } from '../stores/editor'
import { useResultStore } from '../stores/result'

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
  views: false,
  functions: false,
  indexes: false,
  procs: false,
  triggers: false,
  saved: false,
})

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
  searchTimer = setTimeout(() => schemaStore.setSearchQuery(val), 120)
}

// Unified Table Click -> Open Query Workflow
function openTableAsQuery(name: string) {
  schemaStore.setActiveTable(name)
  const quoted = quoteSqlIdentifier(name)
  const query = `SELECT *\nFROM ${quoted}\nLIMIT 100;`

  let tab = editorStore.tabs.find(t => t.name === name)
  if (!tab) {
    const tabId = editorStore.addTab()
    tab = editorStore.tabs.find(t => t.id === tabId)
    if (tab) {
      tab.name = name
      tab.sql = query
    }
  } else {
    editorStore.selectTab(tab.id)
  }

  resultStore.runQuery(query)
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
  toast.success(`Copied "${text}"`)
}

async function selectProc(name: string) {
  try {
    const connId = connStore.activeId
    const sql = `SHOW CREATE PROCEDURE ${quoteSqlIdentifier(name)};`
    const result = await invoke<any>('run_query_paged', { sql, limit: 1, offset: 0, id: connId })
    if (result?.rows?.[0]) {
      const row = result.rows[0]
      const key = Object.keys(row).find(k => k.toLowerCase().includes('create procedure') || k.toLowerCase().includes('definition'))
      if (key && row[key]) {
        openQueryTab(name, row[key])
        return
      }
    }
    openQueryTab(name, sql)
  } catch {
    openQueryTab(name, `SHOW CREATE PROCEDURE ${quoteSqlIdentifier(name)};`)
  }
}

async function selectFunction(name: string) {
  try {
    const connId = connStore.activeId
    const sql = `SHOW CREATE FUNCTION ${quoteSqlIdentifier(name)};`
    const result = await invoke<any>('run_query_paged', { sql, limit: 1, offset: 0, id: connId })
    if (result?.rows?.[0]) {
      const row = result.rows[0]
      const key = Object.keys(row).find(k => k.toLowerCase().includes('create function') || k.toLowerCase().includes('definition'))
      if (key && row[key]) {
        openQueryTab(name, row[key])
        return
      }
    }
    openQueryTab(name, sql)
  } catch {
    openQueryTab(name, `SHOW CREATE FUNCTION ${quoteSqlIdentifier(name)};`)
  }
}

function openQueryTab(name: string, sql: string) {
  const tabId = editorStore.addTab()
  const tab = editorStore.tabs.find(t => t.id === tabId)
  if (tab) {
    tab.name = name
    tab.sql = sql
    editorStore.selectTab(tabId)
    toast.success(`Loaded definition for "${name}"`)
  }
}

const closedFolders = reactive<Record<string, boolean>>({})

function isFolderOpen(folder: string): boolean {
  return !closedFolders[folder]
}

function toggleFolder(folder: string) {
  closedFolders[folder] = !closedFolders[folder]
}

const allFolders = computed(() => {
  const set = new Set<string>(editorStore.queryFolders || [])
  for (const q of (editorStore.savedQueries || [])) {
    if (q.folder) set.add(q.folder)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

const queriesByFolder = computed(() => {
  const map: Record<string, SavedQuery[]> = {}
  for (const f of allFolders.value) {
    map[f] = []
  }
  for (const q of (editorStore.savedQueries || [])) {
    if (q.folder) {
      if (!map[q.folder]) map[q.folder] = []
      map[q.folder].push(q)
    }
  }
  return map
})

const rootQueries = computed(() => {
  return (editorStore.savedQueries || []).filter(q => !q.folder)
})

function openFolder(folder: string) {
  closedFolders[folder] = false
}

function isQueryInFolder(id: string | null): boolean {
  const checkId = id || activeDragQueryId || (typeof window !== 'undefined' ? (window as any).__select_dragging_query_id : null)
  if (!checkId) return false
  const q = (editorStore.savedQueries || []).find(x => x.id === checkId)
  if (q) return !!q.folder
  return checkId.includes('/') || checkId.includes('\\')
}

function currentQueryFolder(id: string | null): string | null {
  const checkId = id || activeDragQueryId || (typeof window !== 'undefined' ? (window as any).__select_dragging_query_id : null)
  if (!checkId) return null
  const q = (editorStore.savedQueries || []).find(x => x.id === checkId)
  if (q?.folder) return q.folder
  const normalized = checkId.replace(/\\/g, '/')
  if (normalized.includes('/')) {
    return normalized.substring(0, normalized.lastIndexOf('/'))
  }
  return null
}

const draggingQueryId = ref<string | null>(null)
const dragOverTarget = ref<string | null>(null)
let folderHoverTimer: any = null
let activeDragQueryId: string | null = null

function onDragStart(e: DragEvent, id: string) {
  activeDragQueryId = id
  draggingQueryId.value = id
  if (typeof window !== 'undefined') {
    (window as any).__select_dragging_query_id = id
  }
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.setData('application/x-select-query-id', id)
    e.dataTransfer.effectAllowed = 'move'
  }
}

function onDragEnd() {
  if (folderHoverTimer) clearTimeout(folderHoverTimer)
  setTimeout(() => {
    draggingQueryId.value = null
    dragOverTarget.value = null
    activeDragQueryId = null
    if (typeof window !== 'undefined') {
      (window as any).__select_dragging_query_id = null
    }
  }, 300)
}

function onDragOver(e: DragEvent, target: string | null) {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  if (dragOverTarget.value !== target) {
    dragOverTarget.value = target
    if (folderHoverTimer) clearTimeout(folderHoverTimer)
    if (target && target !== 'root' && !isFolderOpen(target)) {
      folderHoverTimer = setTimeout(() => {
        if (dragOverTarget.value === target) {
          openFolder(target)
        }
      }, 500)
    }
  }
}

function onDragLeave(e: DragEvent, target: string | null) {
  const current = e.currentTarget as HTMLElement | null
  const related = e.relatedTarget as Node | null
  if (current && related && current.contains(related)) {
    return
  }
  if (dragOverTarget.value === target) {
    dragOverTarget.value = null
  }
}

async function onDrop(e: DragEvent, targetFolder: string | null) {
  e.preventDefault()
  e.stopPropagation()
  if (folderHoverTimer) clearTimeout(folderHoverTimer)

  const idFromData = e.dataTransfer?.getData('application/x-select-query-id') || e.dataTransfer?.getData('text/plain')
  const id = idFromData || draggingQueryId.value || activeDragQueryId || (typeof window !== 'undefined' ? (window as any).__select_dragging_query_id : null)

  dragOverTarget.value = null
  if (!id) return

  // If already in target folder, noop
  const currentFolder = currentQueryFolder(id)
  const destFolder = (targetFolder && targetFolder.trim().length > 0 && targetFolder !== 'root') ? targetFolder.trim() : null
  if (currentFolder === destFolder) {
    draggingQueryId.value = null
    return
  }

  try {
    await editorStore.moveQuery(id, destFolder)
    toast.success(destFolder ? `Moved to "${destFolder}"` : 'Moved to root')
    if (destFolder) {
      openFolder(destFolder)
    }
  } catch (e: any) {
    toast.error(`Move failed: ${e?.message || e}`)
  } finally {
    draggingQueryId.value = null
    activeDragQueryId = null
    if (typeof window !== 'undefined') {
      (window as any).__select_dragging_query_id = null
    }
  }
}

const folderDialogOpen = ref(false)
const folderDialogName = ref('')
const folderDialogParent = ref<string | null>(null)
const folderInputRef = ref<any>(null)

function openCreateFolderDialog(parent?: string | null) {
  sectionsOpen.saved = true
  folderDialogParent.value = typeof parent === 'string' ? parent : null
  folderDialogName.value = ''
  folderDialogOpen.value = true
  setTimeout(() => {
    folderInputRef.value?.$el?.focus?.() || folderInputRef.value?.focus?.()
  }, 50)
}

async function submitCreateFolder() {
  const name = folderDialogName.value.trim()
  if (!name) return
  folderDialogOpen.value = false
  try {
    await editorStore.createFolder(name, folderDialogParent.value)
    toast.success(`Created folder "${name}"`)
  } catch (e: any) {
    toast.error(`Failed to create folder: ${e?.message || e}`)
  }
}

const renameDialogOpen = ref(false)
const renameDialogId = ref('')
const renameDialogName = ref('')
const renameInputRef = ref<any>(null)

function openRenameDialog(id: string, currentName: string) {
  renameDialogId.value = id
  renameDialogName.value = currentName
  renameDialogOpen.value = true
  setTimeout(() => {
    renameInputRef.value?.$el?.focus?.() || renameInputRef.value?.focus?.()
  }, 50)
}

async function submitRenameQuery() {
  const newName = renameDialogName.value.trim()
  const id = renameDialogId.value
  if (!newName || !id) return
  renameDialogOpen.value = false
  try {
    await editorStore.renameSavedQuery(id, newName)
    toast.success('Renamed query')
  } catch (e: any) {
    toast.error(`Rename failed: ${e?.message || e}`)
  }
}

const renameFolderDialogOpen = ref(false)
const renameFolderDialogOldName = ref('')
const renameFolderDialogName = ref('')
const renameFolderInputRef = ref<any>(null)

function openRenameFolderDialog(folder: string) {
  renameFolderDialogOldName.value = folder
  renameFolderDialogName.value = folder
  renameFolderDialogOpen.value = true
  setTimeout(() => {
    renameFolderInputRef.value?.$el?.focus?.() || renameFolderInputRef.value?.focus?.()
  }, 50)
}

async function submitRenameFolder() {
  const oldName = renameFolderDialogOldName.value
  const newName = renameFolderDialogName.value.trim()
  if (!newName || !oldName || newName === oldName) return
  renameFolderDialogOpen.value = false
  try {
    await editorStore.renameFolder(oldName, newName)
    toast.success(`Renamed folder to "${newName}"`)
  } catch (e: any) {
    toast.error(`Rename folder failed: ${e?.message || e}`)
  }
}

const deleteFolderDialogOpen = ref(false)
const deleteFolderTarget = ref('')

function openDeleteFolderDialog(folder: string) {
  deleteFolderTarget.value = folder
  deleteFolderDialogOpen.value = true
}

async function submitDeleteFolder() {
  const folder = deleteFolderTarget.value
  deleteFolderDialogOpen.value = false
  if (!folder) return
  try {
    await editorStore.deleteFolder(folder)
    toast.success(`Deleted folder "${folder}"`)
  } catch (e: any) {
    toast.error(`Delete failed: ${e?.message || e}`)
  }
}

// Context Menu
const ctxMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  target: '',
  objectType: 'table',
  isSavedQuery: false,
  savedQueryId: '',
  isFolder: false,
  folderName: '',
})

function clampMenuPosition(x: number, y: number, menuWidth = 190, menuHeight = 170) {
  const clampedX = Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8))
  const clampedY = Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8))
  return { x: clampedX, y: clampedY }
}

const submenuOnLeft = computed(() => ctxMenu.x + 380 > window.innerWidth)

function openCtxMenu(e: MouseEvent, name: string, objectType = 'table') {
  const pos = clampMenuPosition(e.clientX, e.clientY)
  ctxMenu.visible = true
  ctxMenu.target = name
  ctxMenu.objectType = objectType
  ctxMenu.x = pos.x
  ctxMenu.y = pos.y
  ctxMenu.isSavedQuery = false
  ctxMenu.isFolder = false
}

function openSQCtxMenu(e: MouseEvent, sq: SavedQuery) {
  const pos = clampMenuPosition(e.clientX, e.clientY)
  ctxMenu.visible = true
  ctxMenu.target = sq.name
  ctxMenu.savedQueryId = sq.id
  ctxMenu.x = pos.x
  ctxMenu.y = pos.y
  ctxMenu.isSavedQuery = true
  ctxMenu.isFolder = false
}

function openFolderCtxMenu(e: MouseEvent, folder: string) {
  const pos = clampMenuPosition(e.clientX, e.clientY)
  ctxMenu.visible = true
  ctxMenu.target = folder
  ctxMenu.folderName = folder
  ctxMenu.isFolder = true
  ctxMenu.isSavedQuery = false
  ctxMenu.x = pos.x
  ctxMenu.y = pos.y
}

function closeCtxMenu() { ctxMenu.visible = false }

function ctxMoveTo(queryId: string, folder: string | null) {
  closeCtxMenu()
  executeMoveDirect(queryId, folder)
}

function inspectTable(name: string) {
  schemaStore.setActiveTable(name)
  uiStore.openInspector(name)
}

function ctxAction(action: string) {
  const name = ctxMenu.target
  closeCtxMenu()
  switch (action) {
    case 'open': openTableAsQuery(name); break
    case 'inspect': inspectTable(name); break
    case 'copy': copyText(name); break
    case 'ddl': schemaStore.setActiveTable(name); uiStore.openInspector(name); break
    case 'visualize': editorStore.addSchemaDiagramTab(name); break
  }
}

function ctxSqAction(action: string) {
  const id = ctxMenu.savedQueryId
  const oldName = ctxMenu.target
  closeCtxMenu()
  if (action === 'delete') {
    editorStore.dropSavedQuery(id)
    toast.success('Deleted query')
  } else if (action === 'rename') {
    openRenameDialog(id, oldName)
  } else if (action === 'move') {
    openMoveDialog(id, oldName)
  } else if (action === 'moveToRoot') {
    executeMoveDirect(id, null)
  }
}

const moveDialogOpen = ref(false)
const moveTargetQueryId = ref('')
const moveTargetQueryName = ref('')
const moveTargetCurrentFolder = ref<string | null>(null)
const moveDialogNewFolder = ref('')

function openMoveDialog(id: string, name: string) {
  moveTargetQueryId.value = id
  moveTargetQueryName.value = name
  moveTargetCurrentFolder.value = currentQueryFolder(id)
  moveDialogNewFolder.value = ''
  moveDialogOpen.value = true
}

async function executeMove(targetFolder: string | null) {
  const id = moveTargetQueryId.value
  moveDialogOpen.value = false
  if (!id) return
  try {
    await editorStore.moveQuery(id, targetFolder)
    toast.success(targetFolder ? `Moved to "${targetFolder}"` : 'Moved to root')
    if (targetFolder) {
      openFolder(targetFolder)
    }
  } catch (e: any) {
    toast.error(`Move failed: ${e?.message || e}`)
  }
}

async function executeMoveDirect(id: string, targetFolder: string | null) {
  try {
    await editorStore.moveQuery(id, targetFolder)
    toast.success(targetFolder ? `Moved to "${targetFolder}"` : 'Moved to root')
    if (targetFolder) {
      openFolder(targetFolder)
    }
  } catch (e: any) {
    toast.error(`Move failed: ${e?.message || e}`)
  }
}

function ctxFolderAction(action: string) {
  const folder = ctxMenu.folderName
  closeCtxMenu()
  if (action === 'newQuery') {
    editorStore.openNewQueryInFolder(folder)
  } else if (action === 'rename') {
    openRenameFolderDialog(folder)
  } else if (action === 'delete') {
    openDeleteFolderDialog(folder)
  }
}

function handleDocClick(e: MouseEvent) {
  if (ctxMenu.visible && !(e.target as HTMLElement)?.closest('[data-context-menu]')) {
    closeCtxMenu()
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && ctxMenu.visible) {
    closeCtxMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocClick)
  document.addEventListener('keydown', handleKeyDown)
})
onUnmounted(() => {
  document.removeEventListener('click', handleDocClick)
  document.removeEventListener('keydown', handleKeyDown)
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
.sidebar {
  transition: opacity 180ms cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
}
.sidebar.w-0 { opacity: 0; border-right: none; pointer-events: none; }
</style>
