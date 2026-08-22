<template>
  <div
    class="unified-grid-container flex flex-col flex-1 h-full min-h-0 bg-background overflow-hidden select-none font-mono text-xs relative"
    tabindex="0"
    ref="gridContainerRef"
    @keydown="handleKeydown"
  >
    <!-- Grid Control Bar -->
    <div v-if="showControls" class="flex items-center justify-between px-3 py-1.5 border-b border-border/80 bg-muted/20 flex-shrink-0 text-xs">
      <!-- Left: Search, Filter, Sort, Actions -->
      <div class="flex items-center gap-2 min-w-0">
        <!-- Quick Search -->
        <div class="relative flex items-center">
          <PhMagnifyingGlass class="w-3.5 h-3.5 absolute left-2 text-muted-foreground/60 pointer-events-none" />
          <input
            v-model="quickSearch"
            placeholder="Search rows…"
            class="h-6.5 w-36 sm:w-48 rounded border border-border/60 bg-background/80 pl-7 pr-2 text-[11px] font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
            @input="onSearchInput"
          />
          <button
            v-if="quickSearch"
            class="absolute right-1.5 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer border-none bg-transparent"
            @click="clearSearch"
          >
            <PhX class="w-2.5 h-2.5" />
          </button>
        </div>

        <!-- Filter Toggle Button -->
        <Button
          variant="outline"
          size="sm"
          class="h-6.5 px-2 text-[11px] gap-1 rounded bg-background"
          :class="{ 'border-primary text-primary bg-primary/5': showFilterBar || activeFilterCount > 0 }"
          @click="showFilterBar = !showFilterBar"
        >
          <PhFunnel class="w-3 h-3" />
          <span>Filter</span>
          <Badge v-if="activeFilterCount > 0" variant="secondary" class="h-3.5 px-1 text-[9px] bg-primary/20 text-primary">
            {{ activeFilterCount }}
          </Badge>
        </Button>

        <!-- Sort Indicator / Reset -->
        <Button
          v-if="sortCol"
          variant="outline"
          size="sm"
          class="h-6.5 px-2 text-[11px] gap-1 rounded bg-background border-primary/40 text-primary"
          @click="clearSort"
        >
          <PhSortAscending v-if="sortDir === 'asc'" class="w-3 h-3" />
          <PhSortDescending v-else class="w-3 h-3" />
          <span class="max-w-[100px] truncate">{{ sortCol }}</span>
          <PhX class="w-2.5 h-2.5 opacity-70 hover:opacity-100" />
        </Button>

        <!-- Key / PK Status Pill -->
        <ActionTooltip :text="keyStatusTooltip">
          <button
            v-if="tableName"
            class="h-6.5 px-2 flex items-center gap-1 rounded border border-border/60 bg-background hover:bg-muted/40 text-[10.5px] text-muted-foreground hover:text-foreground font-mono transition-colors cursor-pointer shadow-2xs max-w-[150px] truncate flex-shrink-0"
            @click="uiStore.openVirtualKeyDialog(tableName)"
          >
            <PhKey class="w-3 h-3 flex-shrink-0" :class="keyStatusIconClass" />
            <span class="truncate">{{ keyStatusLabel }}</span>
          </button>
        </ActionTooltip>
      </div>

      <!-- Right: Selection actions & Row counts -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <!-- Contextual Selection Actions -->
        <div v-if="hasSelection" class="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded animate-in fade-in duration-100">
          <span class="text-[10px] font-semibold text-primary">
            {{ selectionSummaryText }}
          </span>
          <ActionTooltip text="Copy selected as TSV (⌘C)">
            <Button
              variant="ghost"
              size="sm"
              class="h-5 px-1.5 text-[10px] gap-1 rounded bg-background/80 text-foreground hover:bg-background"
              @click="copySelectedTsv"
            >
              <PhCopy class="w-2.5 h-2.5" />
              <span>TSV</span>
            </Button>
          </ActionTooltip>
          <ActionTooltip text="Copy selected as JSON">
            <Button
              variant="ghost"
              size="sm"
              class="h-5 px-1.5 text-[10px] gap-1 rounded bg-background/80 text-foreground hover:bg-background"
              @click="copySelectedJson"
            >
              <PhFileCode class="w-2.5 h-2.5" />
              <span>JSON</span>
            </Button>
          </ActionTooltip>
        </div>

        <div class="h-3.5 w-px bg-border/60 mx-0.5"></div>

        <!-- Export Dropdown -->
        <div class="relative">
          <Button
            variant="outline"
            size="sm"
            class="h-6.5 px-2 text-[11px] gap-1 rounded bg-background"
            @click="showExportMenu = !showExportMenu"
          >
            <PhDownloadSimple class="w-3 h-3" />
            <span>Export</span>
            <PhCaretDown class="w-2.5 h-2.5 opacity-60" />
          </Button>

          <div
            v-if="showExportMenu"
            class="absolute right-0 mt-1 w-36 bg-popover border border-border/80 rounded-md shadow-lg py-1 z-50 text-[11px] animate-in fade-in-50 zoom-in-95 duration-fast"
            @mouseleave="showExportMenu = false"
          >
            <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent" @click="exportCsv">Export as CSV</button>
            <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent" @click="exportJson">Export as JSON</button>
            <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent" @click="copyAllTsv">Copy all (TSV)</button>
          </div>
        </div>

        <!-- Row Count & Duration -->
        <div class="flex items-center gap-1.5 text-[10.5px] text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded border border-border/40">
          <span class="font-medium text-foreground">{{ filteredRows.length }} / {{ rows.length }} rows</span>
          <template v-if="durationMs !== undefined && durationMs > 0">
            <span class="text-border">·</span>
            <span>{{ durationMs }}ms</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Filter Bar (Collapsible) -->
    <div v-if="showFilterBar" class="flex flex-col gap-1.5 px-3 py-2 border-b border-border/80 bg-muted/15 text-xs flex-shrink-0 animate-in slide-in-from-top-1 duration-fast">
      <div class="flex items-center gap-2 flex-wrap">
        <template v-for="col in columns" :key="col.name">
          <div class="flex items-center gap-1 bg-background border border-border/60 rounded px-1.5 py-0.5">
            <span class="text-[10px] text-muted-foreground font-semibold">{{ col.name }}:</span>
            <input
              v-model="columnFilters[col.name]"
              :placeholder="col.type"
              class="h-5 w-24 bg-transparent text-[10px] font-mono outline-none"
              @input="onSearchInput"
            />
          </div>
        </template>
        <Button variant="ghost" size="sm" class="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground" @click="clearAllFilters">
          Clear Filters
        </Button>
      </div>
    </div>

    <!-- Virtualized Scroll Viewport -->
    <div
      ref="scrollViewportRef"
      class="flex-1 min-h-0 overflow-auto relative bg-background outline-none"
      @scroll="onScroll"
    >
      <!-- Empty State -->
      <div v-if="rows.length === 0 && !loading" class="absolute inset-0 flex items-center justify-center surface-inset p-4">
        <EmptyState
          title="No rows returned"
          description="Query completed successfully with an empty result set."
        >
          <template #icon>
            <PhTable class="w-6 h-6 text-muted-foreground/60" />
          </template>
        </EmptyState>
      </div>

      <!-- Loading Overlay -->
      <div v-if="loading" class="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-30 flex items-center justify-center gap-2">
        <svg class="w-5 h-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <span class="text-xs font-semibold text-foreground">Fetching records…</span>
      </div>

      <!-- Main Data Table with Row Virtualization -->
      <div class="inline-block min-w-full align-top" :style="{ width: tableTotalWidth + 'px' }">
        <!-- Sticky Header -->
        <div class="sticky top-0 z-20 flex bg-muted/95 backdrop-blur-md border-b border-border shadow-[0_1px_0_0_var(--border)] select-none">
          <!-- Select All Checkbox -->
          <div class="w-9 h-7 flex items-center justify-center border-r border-border/40 flex-shrink-0 bg-muted/80">
            <input
              type="checkbox"
              :checked="allRowsSelected"
              class="w-3.5 h-3.5 accent-primary cursor-pointer rounded-xs"
              @change="toggleSelectAll"
              aria-label="Select all rows"
            />
          </div>

          <!-- Row Number Column Header -->
          <div class="w-10 h-7 flex items-center justify-center border-r border-border/40 text-[9.5px] font-medium text-muted-foreground/80 flex-shrink-0 bg-muted/80">
            #
          </div>

          <!-- Data Column Headers -->
          <div
            v-for="(col, colIndex) in columns"
            :key="col.name"
            class="group/head relative flex items-center justify-between px-2.5 h-7 border-r border-border/40 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-muted/80"
            :style="{ width: getColumnWidth(col.name) + 'px', minWidth: getColumnWidth(col.name) + 'px' }"
            @click="sortBy(col.name)"
            @contextmenu.prevent="openHeaderMenu($event, col.name)"
          >
            <div class="flex items-center gap-1.5 truncate">
              <span class="truncate">{{ col.name }}</span>
              <span v-if="sortCol === col.name" class="text-primary font-bold text-[10px]">
                {{ sortDir === 'asc' ? '↑' : '↓' }}
              </span>
            </div>

            <span class="text-[9px] font-mono text-muted-foreground/50 font-normal group-hover/head:text-muted-foreground/80 transition-colors">
              {{ col.type }}
            </span>

            <!-- Column Resizer Drag Handle -->
            <div
              class="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 transition-colors z-10"
              @mousedown.stop="startResizeColumn($event, col.name)"
              @dblclick.stop="autoFitColumn(col.name)"
            ></div>
          </div>
        </div>

        <!-- Virtual Spacer Top -->
        <div :style="{ height: virtualTopHeight + 'px' }"></div>

        <!-- Rendered Virtual Rows -->
        <div
          v-for="item in visibleRows"
          :key="item.index"
          class="flex border-b border-border/30 hover:bg-muted/30 transition-colors duration-fast text-[11px]"
          :class="[
            item.index % 2 === 0 ? 'bg-transparent' : 'bg-muted/5',
            selectedRowIndices.has(item.index) ? 'bg-primary/8 hover:bg-primary/12' : ''
          ]"
          :style="{ height: ROW_HEIGHT + 'px' }"
        >
          <!-- Row Checkbox -->
          <div class="w-9 h-full flex items-center justify-center border-r border-border/30 flex-shrink-0 relative">
            <div v-if="selectedRowIndices.has(item.index)" class="absolute left-0 top-0 bottom-0 w-[2.5px] bg-primary"></div>
            <input
              type="checkbox"
              :checked="selectedRowIndices.has(item.index)"
              class="w-3 h-3 accent-primary cursor-pointer rounded-xs opacity-0 group-hover:opacity-100 transition-opacity"
              :class="{ 'opacity-100': selectedRowIndices.has(item.index) }"
              @change="toggleRowSelection(item.index)"
              aria-label="Select row"
            />
          </div>

          <!-- Row Number -->
          <div class="w-10 h-full flex items-center justify-center border-r border-border/30 text-[9.5px] text-muted-foreground/60 tabular-nums flex-shrink-0 select-none">
            {{ item.index + 1 }}
          </div>

          <!-- Row Cells -->
          <div
            v-for="(col, colIndex) in columns"
            :key="col.name + '_' + colIndex"
            class="relative flex items-center px-2.5 border-r border-border/30 truncate cursor-cell select-none transition-colors"
            :style="{ width: getColumnWidth(col.name) + 'px', minWidth: getColumnWidth(col.name) + 'px' }"
            :class="[
              isCellFocused(item.index, colIndex) ? 'ring-2 ring-primary ring-inset z-10 bg-primary/10' : '',
              isCellInRange(item.index, colIndex) ? 'bg-primary/8' : '',
              columnMetaMap[col.name]?.isNumeric ? 'justify-end tabular-nums text-right font-mono' : 'justify-start'
            ]"
            @mousedown="onCellMouseDown(item.index, colIndex, $event)"
            @mouseenter="onCellMouseEnter(item.index, colIndex, $event)"
            @dblclick="startEditCell(item.index, col.name, $event)"
            @contextmenu.prevent="openCellContextMenu($event, item.row, item.index, col.name)"
          >
            <!-- In-Place Cell Editor Input (Renders strictly exclusively with distinct highlight) -->
            <template v-if="editingCell?.rowIndex === item.index && editingCell?.colName === col.name">
              <input
                ref="inlineEditInputRef"
                v-model="editInputValue"
                class="absolute inset-0 z-30 w-full h-full bg-primary/20 border-2 border-primary text-foreground outline-none font-mono text-[11px] px-2 shadow-lg ring-2 ring-primary/40 rounded-none selection:bg-primary selection:text-primary-foreground"
                :class="{ 'text-right': columnMetaMap[col.name]?.isNumeric }"
                @keydown.enter="commitInlineEdit"
                @keydown.escape.stop="cancelInlineEdit"
                @blur="commitInlineEdit"
                @click.stop
              />
            </template>

            <!-- Standard Cell Value Display (when NOT editing) -->
            <template v-else>
              <!-- Dirty Cell Indicator Badge -->
              <span
                v-if="isCellDirty(item.index, col.name)"
                class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-xs z-10"
                title="Modified (Unsaved)"
              ></span>

              <!-- NULL Display -->
              <template v-if="item.row[col.name] === null || item.row[col.name] === undefined">
                <span class="text-[9.5px] italic text-muted-foreground/40 font-mono">NULL</span>
              </template>

              <!-- Boolean Display -->
              <template v-else-if="columnMetaMap[col.name]?.isBoolean">
                <span
                  class="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold"
                  :class="item.row[col.name] ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'"
                >
                  {{ item.row[col.name] ? 'TRUE' : 'FALSE' }}
                </span>
              </template>

              <!-- Color Value Display -->
              <template v-else-if="isColorValue(col.name, item.row[col.name])">
                <div class="inline-flex items-center gap-1.5 font-mono text-[11px] truncate">
                  <span
                    class="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-border/80 shadow-2xs"
                    :style="{ backgroundColor: String(item.row[col.name]) }"
                    :title="`Color swatch: ${item.row[col.name]}`"
                  ></span>
                  <span class="truncate font-medium">{{ item.row[col.name] }}</span>
                </div>
              </template>

              <!-- Status Value Display (Chips / Badges) -->
              <template v-else-if="isStatusValue(col.name, item.row[col.name])">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono border tracking-wide uppercase transition-all shadow-2xs"
                  :class="getStatusChipClass(col.name, String(item.row[col.name]))"
                >
                  <span class="w-1.5 h-1.5 rounded-full mr-1 flex-shrink-0" :class="getStatusDotClass(col.name, String(item.row[col.name]))"></span>
                  {{ String(item.row[col.name]) }}
                </span>
              </template>

              <!-- Standard Value Display with FK Link & Large Value Peek -->
              <template v-else>
                <span class="truncate font-mono" :title="String(item.row[col.name])">
                  {{ formatCellText(item.row[col.name]) }}
                </span>

                <!-- Foreign Key Peek Action -->
                <button
                  v-if="columnMetaMap[col.name]?.foreignKey"
                  class="ml-auto text-primary/70 hover:text-primary hover:bg-primary/10 p-0.5 rounded cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                  title="Preview referenced record"
                  @click.stop="peekForeignKey($event, col, item.row[col.name])"
                >
                  <PhArrowSquareOut class="w-3 h-3" />
                </button>

                <!-- Large Value Inspector Trigger -->
                <button
                  v-if="isLargeValue(item.row[col.name])"
                  class="ml-auto text-muted-foreground hover:text-foreground hover:bg-accent p-0.5 rounded cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                  title="Open Value Inspector"
                  @click.stop="openValueInspector(item.row[col.name], col.name, item.index)"
                >
                  <PhArrowsOutSimple class="w-3 h-3" />
                </button>
              </template>
            </template>
          </div>
        </div>

        <!-- Virtual Spacer Bottom -->
        <div :style="{ height: virtualBottomHeight + 'px' }"></div>
      </div>
    </div>

    <!-- Batch Unsaved Changes Floating Bar -->
    <div
      v-if="hasDirtyChanges"
      class="px-4 py-2 border-t border-amber-500/30 bg-amber-500/10 flex items-center justify-between z-20 flex-shrink-0 animate-in slide-in-from-bottom-2 duration-fast"
    >
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        <span class="text-xs font-semibold text-amber-500">
          {{ dirtyCount }} unsaved change{{ dirtyCount > 1 ? 's' : '' }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="h-6.5 px-2.5 text-[11px] rounded bg-background"
          :disabled="isSaving"
          @click="discardAllEdits"
        >
          Discard
        </Button>
        <Button
          size="sm"
          class="h-6.5 px-3 text-[11px] font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-sm"
          :disabled="isSaving"
          @click="applyDirtyEdits"
        >
          <PhCheck class="w-3 h-3" />
          <span>{{ isSaving ? 'Saving…' : 'Review & Apply (⌘S)' }}</span>
        </Button>
      </div>
    </div>

    <!-- Cell Context Menu -->
    <Teleport to="body">
      <div
        v-if="cellContextMenu.visible"
        class="fixed z-[9999] bg-popover border border-border/80 rounded-md shadow-xl py-1 w-48 text-xs font-mono select-none"
        :style="{ left: cellContextMenu.x + 'px', top: cellContextMenu.y + 'px' }"
        @click.stop
      >
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2" @click="copyTargetCell">
          <PhCopy class="w-3 h-3" /> Copy Cell Value
        </button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2" @click="copyTargetRowJson">
          <PhFileCode class="w-3 h-3" /> Copy Row as JSON
        </button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2" @click="copyTargetRowInsert">
          <PhDatabase class="w-3 h-3" /> Copy Row as INSERT
        </button>
        <div class="h-px bg-border/60 my-1"></div>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2" @click="inspectCurrentCell">
          <PhArrowsOutSimple class="w-3 h-3" /> Inspect in Full Viewer
        </button>
      </div>

      <!-- Header Context Menu -->
      <div
        v-if="headerContextMenu.visible"
        class="fixed z-[9999] bg-popover border border-border/80 rounded-md shadow-xl py-1 w-48 text-xs font-mono select-none"
        :style="{ left: headerContextMenu.x + 'px', top: headerContextMenu.y + 'px' }"
        @click.stop
      >
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2" @click="sortFromHeader('asc')">
          <PhSortAscending class="w-3 h-3" /> Sort Ascending
        </button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2" @click="sortFromHeader('desc')">
          <PhSortDescending class="w-3 h-3" /> Sort Descending
        </button>
        <div class="h-px bg-border/60 my-1"></div>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2" @click="copyColumnName">
          <PhCopy class="w-3 h-3" /> Copy Column Name
        </button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2" @click="autoFitColumn(headerContextMenu.colName)">
          <PhArrowsOutLineHorizontal class="w-3 h-3" /> Auto-fit Column Width
        </button>
      </div>
    </Teleport>

    <!-- Large Value Inspector Sheet -->
    <ValueInspector
      :open="valueInspectorState.open"
      :value="valueInspectorState.value"
      :column-name="valueInspectorState.columnName"
      :row-index="valueInspectorState.rowIndex"
      @update:open="(val) => valueInspectorState.open = val"
      @save-value="onInspectorSaveValue"
    />

    <!-- Foreign Key Referenced-Record Peek -->
    <Teleport to="body">
      <div
        v-if="fkPeekState.visible"
        class="fixed z-[100] w-80 max-h-64 bg-popover border border-border/80 rounded-lg shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-fast"
        :style="{ left: fkPeekState.x + 'px', top: fkPeekState.y + 'px' }"
        @click.stop
      >
        <div class="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-accent/40">
          <div class="flex items-center gap-1.5 min-w-0">
            <PhArrowSquareOut class="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              {{ fkPeekState.refTable }} · {{ fkPeekState.refColumn }}
            </span>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <button
              v-if="fkPeekState.row"
              class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer border-none bg-transparent"
              title="Copy as JSON"
              @click="copyFkRowAsJson"
            >
              <PhCopy class="w-3 h-3" />
            </button>
            <button
              class="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer border-none bg-transparent"
              title="Close"
              @click="fkPeekState.visible = false"
            >
              <PhX class="w-3 h-3" />
            </button>
          </div>
        </div>

        <div class="max-h-52 overflow-y-auto p-2 text-[11px] font-mono">
          <div v-if="fkPeekState.loading" class="flex items-center justify-center gap-2 py-6 text-muted-foreground">
            <svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <span>Fetching referenced record…</span>
          </div>

          <div v-else-if="fkPeekState.error" class="px-2 py-3 text-destructive break-words">
            {{ fkPeekState.error }}
          </div>

          <div v-else-if="!fkPeekState.row" class="px-2 py-3 text-muted-foreground text-center">
            No referenced record found.
          </div>

          <div v-else class="flex flex-col gap-0.5">
            <div
              v-for="(value, key) in fkPeekState.row"
              :key="key"
              class="flex gap-2 px-1.5 py-0.5 rounded hover:bg-accent/60"
            >
              <span class="text-muted-foreground/80 flex-shrink-0 max-w-[110px] truncate" :title="String(key)">{{ key }}:</span>
              <span class="truncate" :class="{ 'italic text-muted-foreground/60': value === null }" :title="value === null ? 'NULL' : String(value)">
                {{ value === null ? 'NULL' : String(value) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActionTooltip } from '@/components/ui/tooltip'
import EmptyState from '@/components/ui/EmptyState.vue'
import ValueInspector from './ValueInspector.vue'
import {
  PhMagnifyingGlass, PhFunnel, PhSortAscending, PhSortDescending, PhX, PhKey,
  PhCopy, PhFileCode, PhDownloadSimple, PhCaretDown, PhTable, PhCheck,
  PhArrowSquareOut, PhArrowsOutSimple, PhDatabase, PhArrowsOutLineHorizontal
} from '@phosphor-icons/vue'
import { useSchemaStore } from '@/stores/schema'
import { useConnectionStore } from '@/stores/connection'
import { useUiStore } from '@/stores/ui'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'vue-sonner'

export interface ColumnDef {
  name: string
  type: string
  orgName?: string
  orgTable?: string
}

export type GridRow = Record<string, any>

const props = withDefaults(defineProps<{
  columns: ColumnDef[]
  rows: GridRow[]
  tableName?: string
  durationMs?: number
  loading?: boolean
  showControls?: boolean
}>(), {
  showControls: true,
  loading: false
})

const emit = defineEmits<{
  'save-edits': [updates: { rowIndex: number; changes: Record<string, any> }[], onSuccess?: () => void]
  'refresh': []
}>()

const schemaStore = useSchemaStore()
const uiStore = useUiStore()

const ROW_HEIGHT = 28
const OVERSCAN = 8

const gridContainerRef = ref<HTMLDivElement | null>(null)
const scrollViewportRef = ref<HTMLDivElement | null>(null)
const inlineEditInputRef = ref<HTMLInputElement | null>(null)

const scrollTop = ref(0)
const viewportHeight = ref(400)
const quickSearch = ref('')
const showFilterBar = ref(false)
const showExportMenu = ref(false)
const isSaving = ref(false)

const sortCol = ref('')
const sortDir = ref<'asc' | 'desc' | ''>('')
const columnFilters = reactive<Record<string, string>>({})
const columnWidths = reactive<Record<string, number>>({})

const dirtyEdits = reactive<Record<number, Record<string, any>>>({})
const selectedRowIndices = ref<Set<number>>(new Set())

const focusedCell = ref<{ rowIndex: number; colIndex: number } | null>(null)
const anchorCell = ref<{ rowIndex: number; colIndex: number } | null>(null)
const isMouseDown = ref(false)

const editingCell = ref<{ rowIndex: number; colName: string } | null>(null)
const editInputValue = ref('')

const valueInspectorState = reactive({
  open: false,
  value: null as any,
  columnName: '',
  rowIndex: 0
})

const cellContextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  row: null as GridRow | null,
  rowIndex: 0,
  colName: ''
})

const headerContextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  colName: ''
})

// Column widths persistence
const storageKey = computed(() => `select_grid_widths_${props.tableName || 'default'}`)

function loadSavedWidths() {
  try {
    const raw = localStorage.getItem(storageKey.value)
    if (raw) {
      const parsed = JSON.parse(raw)
      Object.assign(columnWidths, parsed)
    }
  } catch {}
}

function saveWidths() {
  try {
    localStorage.setItem(storageKey.value, JSON.stringify(columnWidths))
  } catch {}
}

function getColumnWidth(name: string): number {
  return columnWidths[name] || 150
}

let resizeColName = ''
let resizeStartX = 0
let resizeStartWidth = 150

function startResizeColumn(e: MouseEvent, colName: string) {
  e.preventDefault()
  resizeColName = colName
  resizeStartX = e.clientX
  resizeStartWidth = getColumnWidth(colName)
  window.addEventListener('mousemove', onColumnResizeMove)
  window.addEventListener('mouseup', stopResizeColumn)
}

function onColumnResizeMove(e: MouseEvent) {
  if (!resizeColName) return
  const delta = e.clientX - resizeStartX
  columnWidths[resizeColName] = Math.max(70, Math.min(600, resizeStartWidth + delta))
}

function stopResizeColumn() {
  resizeColName = ''
  window.removeEventListener('mousemove', onColumnResizeMove)
  window.removeEventListener('mouseup', stopResizeColumn)
  saveWidths()
}

function autoFitColumn(colName: string) {
  let maxLen = colName.length
  for (let i = 0; i < Math.min(props.rows.length, 100); i++) {
    const s = String(props.rows[i]?.[colName] ?? '')
    if (s.length > maxLen) maxLen = s.length
  }
  columnWidths[colName] = Math.max(80, Math.min(450, maxLen * 8 + 32))
  saveWidths()
}

const tableTotalWidth = computed(() => {
  const base = 36 + 40 // Checkbox + #
  const cols = props.columns.reduce((sum, c) => sum + getColumnWidth(c.name), 0)
  return Math.max(base + cols, 600)
})

// Pre-computed Column Metadata Map for O(1) cell evaluation
const columnMetaMap = computed(() => {
  const map: Record<string, { isNumeric: boolean; isBoolean: boolean; foreignKey: any }> = {}
  for (const col of props.columns) {
    const t = (col.type || '').toLowerCase()
    const isNumeric = ['int', 'bigint', 'decimal', 'float', 'double', 'numeric', 'number'].some(k => t.includes(k))
    const isBoolean = t === 'boolean' || t === 'bool' || t === 'tinyint(1)'
    let foreignKey = null
    if (col.orgTable) {
      const fks = schemaStore.foreignKeysByTable[col.orgTable]
      if (fks) {
        foreignKey = fks.find(fk => (fk.column_name || fk.columnName || '').toLowerCase() === (col.orgName || col.name).toLowerCase()) || null
      }
    }
    map[col.name] = { isNumeric, isBoolean, foreignKey }
  }
  return map
})

function isColorValue(colName: string, val: unknown): boolean {
  if (typeof val !== 'string') return false
  const str = val.trim()
  if (!str) return false
  const isHex = /^#(?:[0-9a-fA-F]{3,4}){1,2}$/.test(str)
  const isRgbOrHsl = /^(?:rgb|hsl)a?\([^)]+\)$/i.test(str)
  if (isHex || isRgbOrHsl) return true
  const lowerCol = colName.toLowerCase()
  if ((lowerCol.includes('color') || lowerCol.includes('hex')) && str.length <= 30 && (str.startsWith('#') || /^[a-z]+$/i.test(str))) {
    return true
  }
  return false
}

const KNOWN_STATUS_VALUES = new Set([
  'CO', 'CC', 'CD', 'CO_PENDING', 'CO_DONE',
  'PENDING', 'COMPLETED', 'DELIVERED', 'SUCCESS', 'FAILED', 'ERROR', 'CANCELLED',
  'CANCELED', 'REJECTED', 'ACTIVE', 'INACTIVE', 'PROCESSING', 'APPROVED',
  'OPEN', 'CLOSED', 'DRAFT', 'SHIPPED', 'RETURNED', 'PASSED', 'QUEUED',
  'IN_PROGRESS', 'INPROGRESS', 'WAITING', 'HOLD', 'RESOLVED', 'PAID', 'UNPAID',
  'RTS', 'TRUCK_AT_RTS', 'CREATING', 'INITIATED', 'EXPIRED', 'DEAD'
])

function isStatusValue(colName: string, val: unknown): boolean {
  if (val === null || val === undefined || typeof val === 'number' || typeof val === 'boolean') return false
  const str = String(val).trim()
  if (!str || str.length > 35 || str.includes('\n')) return false

  const lowerCol = colName.toLowerCase()
  const isStatusCol = lowerCol === 'status' || lowerCol.includes('status') || lowerCol.includes('state') || lowerCol.endsWith('_code') || lowerCol === 'code' || lowerCol === 'statuscode'

  if (isStatusCol) return true
  if (KNOWN_STATUS_VALUES.has(str.toUpperCase())) return true
  return false
}

function getStatusChipClass(colName: string, val: string): string {
  const upper = val.trim().toUpperCase()

  if (['CO', 'CD', 'COMPLETED', 'DELIVERED', 'SUCCESS', 'ACTIVE', 'PASSED', 'APPROVED', 'RESOLVED', 'PAID', 'DONE', 'FINISHED', 'SETTLED', 'OK', 'READY'].includes(upper)) {
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
  }

  if (['CC', 'PENDING', 'PROCESSING', 'IN_PROGRESS', 'INPROGRESS', 'QUEUED', 'WAITING', 'SHIPPED', 'OPEN', 'REVIEW', 'DRAFT', 'HOLD', 'INITIATED', 'RUNNING', 'RTS', 'TRUCK_AT_RTS'].includes(upper)) {
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
  }

  if (['FAILED', 'ERROR', 'CANCELLED', 'CANCELED', 'REJECTED', 'ABORTED', 'BLOCKED', 'EXPIRED', 'INACTIVE', 'DEAD', 'STOPPED', 'FAIL', 'RETURNED', 'REFUNDED', 'UNPAID'].includes(upper)) {
    return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
  }

  return 'bg-primary/10 text-primary border-primary/25'
}

function getStatusDotClass(colName: string, val: string): string {
  const upper = val.trim().toUpperCase()
  if (['CO', 'CD', 'COMPLETED', 'DELIVERED', 'SUCCESS', 'ACTIVE', 'PASSED', 'APPROVED', 'RESOLVED', 'PAID', 'DONE', 'FINISHED', 'SETTLED', 'OK', 'READY'].includes(upper)) {
    return 'bg-emerald-500'
  }
  if (['CC', 'PENDING', 'PROCESSING', 'IN_PROGRESS', 'INPROGRESS', 'QUEUED', 'WAITING', 'SHIPPED', 'OPEN', 'REVIEW', 'DRAFT', 'HOLD', 'INITIATED', 'RUNNING', 'RTS', 'TRUCK_AT_RTS'].includes(upper)) {
    return 'bg-amber-500'
  }
  if (['FAILED', 'ERROR', 'CANCELLED', 'CANCELED', 'REJECTED', 'ABORTED', 'BLOCKED', 'EXPIRED', 'INACTIVE', 'DEAD', 'STOPPED', 'FAIL', 'RETURNED', 'REFUNDED', 'UNPAID'].includes(upper)) {
    return 'bg-red-500'
  }
  return 'bg-primary'
}

// Filtering and Sorting
const activeFilterCount = computed(() => {
  return Object.values(columnFilters).filter(v => Boolean(v && v.trim())).length
})

const filteredRows = computed(() => {
  const rows = props.rows
  if (!rows || rows.length === 0) return []

  const search = quickSearch.value.trim().toLowerCase()
  const activeFilters = Object.entries(columnFilters).filter(([_, v]) => Boolean(v && v.trim()))
  const activeSortCol = sortCol.value
  const activeSortDir = sortDir.value

  const hasSearch = Boolean(search)
  const hasFilters = activeFilters.length > 0
  const hasSort = Boolean(activeSortCol && activeSortDir)

  if (!hasSearch && !hasFilters && !hasSort) {
    return rows.map((row, index) => ({ row, index }))
  }

  const result: { row: GridRow; index: number }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue

    if (hasSearch) {
      let matched = false
      for (const col of props.columns) {
        const val = row[col.name]
        if (val !== null && val !== undefined && String(val).toLowerCase().includes(search)) {
          matched = true
          break
        }
      }
      if (!matched) continue
    }

    if (hasFilters) {
      let matched = true
      for (const [colName, val] of activeFilters) {
        const rowVal = row[colName]
        if (rowVal === null || rowVal === undefined || !String(rowVal).toLowerCase().includes(val.toLowerCase())) {
          matched = false
          break
        }
      }
      if (!matched) continue
    }

    result.push({ row, index: i })
  }

  if (hasSort) {
    const col = activeSortCol
    const dir = activeSortDir
    result.sort((a, b) => {
      const av = a.row[col]
      const bv = b.row[col]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
      return dir === 'asc' ? cmp : -cmp
    })
  }

  return result
})

// Virtualization
const totalRowCount = computed(() => filteredRows.value.length)
const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN))
const endIndex = computed(() => Math.min(totalRowCount.value, Math.ceil((scrollTop.value + viewportHeight.value) / ROW_HEIGHT) + OVERSCAN))

const virtualTopHeight = computed(() => startIndex.value * ROW_HEIGHT)
const virtualBottomHeight = computed(() => Math.max(0, (totalRowCount.value - endIndex.value) * ROW_HEIGHT))

const visibleRows = computed(() => {
  return filteredRows.value.slice(startIndex.value, endIndex.value)
})

function onScroll(e: Event) {
  const el = e.target as HTMLElement
  scrollTop.value = el.scrollTop
  viewportHeight.value = el.clientHeight
}

// Dirty State & Editing
const hasDirtyChanges = computed(() => Object.keys(dirtyEdits).length > 0)
const dirtyCount = computed(() => {
  let count = 0
  for (const row of Object.values(dirtyEdits)) {
    count += Object.keys(row).length
  }
  return count
})

function isCellDirty(rowIndex: number, colName: string): boolean {
  return dirtyEdits[rowIndex] !== undefined && dirtyEdits[rowIndex][colName] !== undefined
}

function startEditCell(rowIndex: number, colName: string, _e?: MouseEvent) {
  editingCell.value = { rowIndex, colName }
  const val = props.rows[rowIndex]?.[colName]
  editInputValue.value = val === null || val === undefined ? '' : String(val)
  nextTick(() => {
    if (inlineEditInputRef.value) {
      inlineEditInputRef.value.focus()
      const len = editInputValue.value.length
      inlineEditInputRef.value.setSelectionRange(len, len)
    }
  })
}

function commitInlineEdit() {
  if (!editingCell.value) return
  const { rowIndex, colName } = editingCell.value
  const origVal = props.rows[rowIndex]?.[colName]
  const newVal = editInputValue.value

  if (String(origVal ?? '') !== newVal) {
    if (!dirtyEdits[rowIndex]) dirtyEdits[rowIndex] = {}
    dirtyEdits[rowIndex][colName] = newVal
    props.rows[rowIndex][colName] = newVal
  }
  editingCell.value = null
  gridContainerRef.value?.focus()
}

function cancelInlineEdit() {
  editingCell.value = null
  gridContainerRef.value?.focus()
}

function discardAllEdits() {
  clearDirtyState()
  emit('refresh')
}

function clearDirtyState() {
  for (const key of Object.keys(dirtyEdits)) {
    delete dirtyEdits[Number(key)]
  }
  isSaving.value = false
}

function applyDirtyEdits() {
  const payload: { rowIndex: number; changes: Record<string, any> }[] = []
  for (const [rIdx, changes] of Object.entries(dirtyEdits)) {
    payload.push({ rowIndex: parseInt(rIdx), changes })
  }
  isSaving.value = true
  emit('save-edits', payload, () => {
    clearDirtyState()
  })
}

// Selection & Navigation
const hasSelection = computed(() => selectedRowIndices.value.size > 0 || (anchorCell.value !== null && focusedCell.value !== null))

const selectionSummaryText = computed(() => {
  if (selectedRowIndices.value.size > 0) {
    return `${selectedRowIndices.value.size} row${selectedRowIndices.value.size > 1 ? 's' : ''}`
  }
  if (anchorCell.value && focusedCell.value) {
    const rows = Math.abs(anchorCell.value.rowIndex - focusedCell.value.rowIndex) + 1
    const cols = Math.abs(anchorCell.value.colIndex - focusedCell.value.colIndex) + 1
    return `${rows}×${cols} cells`
  }
  return ''
})

const allRowsSelected = computed(() =>
  filteredRows.value.length > 0 && filteredRows.value.every(r => selectedRowIndices.value.has(r.index))
)

function toggleSelectAll() {
  if (allRowsSelected.value) {
    selectedRowIndices.value.clear()
  } else {
    filteredRows.value.forEach(r => selectedRowIndices.value.add(r.index))
  }
}

function toggleRowSelection(index: number) {
  if (selectedRowIndices.value.has(index)) {
    selectedRowIndices.value.delete(index)
  } else {
    selectedRowIndices.value.add(index)
  }
}

function isCellFocused(rowIndex: number, colIndex: number): boolean {
  return focusedCell.value?.rowIndex === rowIndex && focusedCell.value?.colIndex === colIndex
}

function isCellInRange(rowIndex: number, colIndex: number): boolean {
  if (!anchorCell.value || !focusedCell.value) return false
  const minR = Math.min(anchorCell.value.rowIndex, focusedCell.value.rowIndex)
  const maxR = Math.max(anchorCell.value.rowIndex, focusedCell.value.rowIndex)
  const minC = Math.min(anchorCell.value.colIndex, focusedCell.value.colIndex)
  const maxC = Math.max(anchorCell.value.colIndex, focusedCell.value.colIndex)
  return rowIndex >= minR && rowIndex <= maxR && colIndex >= minC && colIndex <= maxC
}

function onCellMouseDown(rowIndex: number, colIndex: number, e: MouseEvent) {
  if (e.button !== 0) return
  isMouseDown.value = true
  if (e.shiftKey && anchorCell.value) {
    focusedCell.value = { rowIndex, colIndex }
  } else {
    anchorCell.value = { rowIndex, colIndex }
    focusedCell.value = { rowIndex, colIndex }
  }
  gridContainerRef.value?.focus()
}

function onCellMouseEnter(rowIndex: number, colIndex: number, _e: MouseEvent) {
  if (isMouseDown.value) {
    focusedCell.value = { rowIndex, colIndex }
  }
}

function clearAllSelection() {
  anchorCell.value = null
  focusedCell.value = null
  selectedRowIndices.value.clear()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (editingCell.value) {
      cancelInlineEdit()
    } else {
      clearAllSelection()
    }
    return
  }

  if (editingCell.value) return

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const meta = isMac ? e.metaKey : e.ctrlKey

  if (meta && e.key.toLowerCase() === 'c') {
    e.preventDefault()
    copySelectedTsv()
    return
  }

  if (meta && e.key.toLowerCase() === 's' && hasDirtyChanges.value) {
    e.preventDefault()
    applyDirtyEdits()
    return
  }

  if (!focusedCell.value) return

  let { rowIndex, colIndex } = focusedCell.value

  if (e.key === 'ArrowUp' && rowIndex > 0) {
    e.preventDefault()
    rowIndex--
  } else if (e.key === 'ArrowDown' && rowIndex < filteredRows.value.length - 1) {
    e.preventDefault()
    rowIndex++
  } else if (e.key === 'ArrowLeft' && colIndex > 0) {
    e.preventDefault()
    colIndex--
  } else if (e.key === 'ArrowRight' && colIndex < props.columns.length - 1) {
    e.preventDefault()
    colIndex++
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const colName = props.columns[colIndex].name
    startEditCell(rowIndex, colName, e as any)
    return
  } else {
    return
  }

  focusedCell.value = { rowIndex, colIndex }
  if (!e.shiftKey) {
    anchorCell.value = { rowIndex, colIndex }
  }
}

function copySelectedTsv() {
  if (selectedRowIndices.value.size > 0) {
    const indices = Array.from(selectedRowIndices.value).sort((a, b) => a - b)
    const header = props.columns.map(c => c.name).join('\t')
    const lines = indices.map(idx => {
      const r = props.rows[idx]
      return props.columns.map(c => r?.[c.name] ?? '').join('\t')
    })
    navigator.clipboard.writeText([header, ...lines].join('\n'))
    toast.success(`Copied ${indices.length} rows as TSV`)
    return
  }

  if (anchorCell.value && focusedCell.value) {
    const minR = Math.min(anchorCell.value.rowIndex, focusedCell.value.rowIndex)
    const maxR = Math.max(anchorCell.value.rowIndex, focusedCell.value.rowIndex)
    const minC = Math.min(anchorCell.value.colIndex, focusedCell.value.colIndex)
    const maxC = Math.max(anchorCell.value.colIndex, focusedCell.value.colIndex)

    const lines: string[] = []
    for (let r = minR; r <= maxR; r++) {
      const row = props.rows[r]
      const rowVals: string[] = []
      for (let c = minC; c <= maxC; c++) {
        const col = props.columns[c]
        rowVals.push(row?.[col.name] ?? '')
      }
      lines.push(rowVals.join('\t'))
    }
    navigator.clipboard.writeText(lines.join('\n'))
    toast.success(`Copied selection to clipboard (TSV)`)
  }
}

function copySelectedJson() {
  if (selectedRowIndices.value.size > 0) {
    const selected = Array.from(selectedRowIndices.value).map(idx => props.rows[idx])
    navigator.clipboard.writeText(JSON.stringify(selected, null, 2))
    toast.success(`Copied ${selected.length} rows as JSON`)
  }
}

async function copyAllTsv() {
  try {
    const text = await invoke<string>('format_query_data', { format: 'tsv', columns: props.columns.map(c => c.name), rows: props.rows })
    navigator.clipboard.writeText(text)
    toast.success('Copied all data as TSV')
  } catch {
    const header = props.columns.map(c => c.name).join('\t')
    const lines = props.rows.map(r => props.columns.map(c => r[c.name] ?? '').join('\t'))
    navigator.clipboard.writeText([header, ...lines].join('\n'))
    toast.success('Copied all data as TSV')
  }
}

async function exportCsv() {
  let text = ''
  try {
    text = await invoke<string>('format_query_data', { format: 'csv', columns: props.columns.map(c => c.name), rows: props.rows })
  } catch {
    const escape = (val: string) => /[",\n\r]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val
    const header = props.columns.map(c => escape(c.name)).join(',')
    const body = props.rows.map(row => props.columns.map(c => escape(String(row[c.name] ?? ''))).join(','))
    text = [header, ...body].join('\n')
  }
  const blob = new Blob([text], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.tableName || 'data'}_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function exportJson() {
  let text = ''
  try {
    text = await invoke<string>('format_query_data', { format: 'json', columns: props.columns.map(c => c.name), rows: props.rows })
  } catch {
    text = JSON.stringify(props.rows, null, 2)
  }
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.tableName || 'data'}_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function isNumericCol(col: ColumnDef): boolean {
  return columnMetaMap.value[col.name]?.isNumeric ?? false
}

function isLargeValue(val: any): boolean {
  if (val === null || val === undefined) return false
  const s = String(val)
  return s.length > 50 || (s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))
}

function formatCellText(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  const s = String(val)
  return s.length > 60 ? s.slice(0, 57) + '…' : s
}

function openValueInspector(val: any, colName: string, rowIndex: number) {
  valueInspectorState.value = val
  valueInspectorState.columnName = colName
  valueInspectorState.rowIndex = rowIndex
  valueInspectorState.open = true
}

function onInspectorSaveValue(newVal: any) {
  const { rowIndex, columnName } = valueInspectorState
  if (rowIndex !== undefined && columnName && props.rows[rowIndex]) {
    if (!dirtyEdits[rowIndex]) dirtyEdits[rowIndex] = {}
    dirtyEdits[rowIndex][columnName] = newVal
    props.rows[rowIndex][columnName] = newVal
    toast.success(`Updated [${columnName}] at Row #${rowIndex + 1}`)
  }
}

function getForeignKeyInfo(col: ColumnDef) {
  return columnMetaMap.value[col.name]?.foreignKey ?? null
}

const fkPeekState = reactive({
  visible: false,
  x: 0,
  y: 0,
  loading: false,
  error: '' ,
  row: null as Record<string, any> | null,
  refTable: '',
  refColumn: '',
})

async function peekForeignKey(e: MouseEvent, col: ColumnDef, val: any) {
  if (val === null || val === undefined) {
    toast.info('Cannot preview referenced record: value is NULL')
    return
  }
  const fk = getForeignKeyInfo(col)
  if (!fk) return

  const refTable = fk.referenced_table || fk.referencedTable || ''
  const refColumn = fk.referenced_column || fk.referencedColumn || ''
  if (!refTable || !refColumn) {
    toast.error('Foreign key metadata unavailable')
    return
  }

  // Position the popover near the cursor, clamped to the viewport.
  const POPOVER_W = 320
  const POPOVER_H = 260
  fkPeekState.x = Math.min(e.clientX + 8, window.innerWidth - POPOVER_W - 12)
  fkPeekState.y = Math.min(e.clientY + 8, window.innerHeight - POPOVER_H - 12)
  fkPeekState.refTable = refTable
  fkPeekState.refColumn = refColumn
  fkPeekState.row = null
  fkPeekState.error = ''
  fkPeekState.loading = true
  fkPeekState.visible = true

  try {
    const connId = useConnectionStore().activeId
    const row = await invoke<Record<string, any> | null>('fetch_referenced_row', {
      table: refTable,
      column: refColumn,
      value: String(val),
      id: connId,
    })
    fkPeekState.row = row
  } catch (err) {
    fkPeekState.error = String(err)
  } finally {
    fkPeekState.loading = false
  }
}

function copyFkRowAsJson() {
  if (!fkPeekState.row) return
  navigator.clipboard.writeText(JSON.stringify(fkPeekState.row, null, 2))
    .then(() => toast.success('Referenced record copied as JSON'))
    .catch(() => toast.error('Failed to copy'))
}

function sortBy(colName: string) {
  if (sortCol.value === colName) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : sortDir.value === 'desc' ? '' : 'asc'
    if (!sortDir.value) sortCol.value = ''
  } else {
    sortCol.value = colName
    sortDir.value = 'asc'
  }
}

function clearSort() {
  sortCol.value = ''
  sortDir.value = ''
}

function clearSearch() {
  quickSearch.value = ''
}

function clearAllFilters() {
  for (const k of Object.keys(columnFilters)) {
    delete columnFilters[k]
  }
  quickSearch.value = ''
}

function onSearchInput() {
  scrollTop.value = 0
}

// Context menus
function openCellContextMenu(e: MouseEvent, row: GridRow, rowIndex: number, colName: string) {
  cellContextMenu.visible = true
  cellContextMenu.x = e.clientX
  cellContextMenu.y = e.clientY
  cellContextMenu.row = row
  cellContextMenu.rowIndex = rowIndex
  cellContextMenu.colName = colName
}

function openHeaderMenu(e: MouseEvent, colName: string) {
  headerContextMenu.visible = true
  headerContextMenu.x = e.clientX
  headerContextMenu.y = e.clientY
  headerContextMenu.colName = colName
}

function copyTargetCell() {
  if (cellContextMenu.row) {
    navigator.clipboard.writeText(String(cellContextMenu.row[cellContextMenu.colName] ?? ''))
    toast.success('Copied cell value')
  }
  cellContextMenu.visible = false
}

function copyTargetRowJson() {
  if (cellContextMenu.row) {
    navigator.clipboard.writeText(JSON.stringify(cellContextMenu.row, null, 2))
    toast.success('Copied row as JSON')
  }
  cellContextMenu.visible = false
}

function copyTargetRowInsert() {
  if (cellContextMenu.row) {
    const table = props.tableName || 'table'
    const cols = props.columns.map(c => `\`${c.name}\``).join(', ')
    const vals = props.columns.map(c => {
      const v = cellContextMenu.row![c.name]
      if (v === null || v === undefined) return 'NULL'
      if (typeof v === 'number') return String(v)
      return `'${String(v).replace(/'/g, "\\'")}'`
    }).join(', ')
    navigator.clipboard.writeText(`INSERT INTO \`${table}\` (${cols}) VALUES (${vals});`)
    toast.success('Copied INSERT SQL')
  }
  cellContextMenu.visible = false
}

function inspectCurrentCell() {
  if (cellContextMenu.row) {
    openValueInspector(cellContextMenu.row[cellContextMenu.colName], cellContextMenu.colName, cellContextMenu.rowIndex)
  }
  cellContextMenu.visible = false
}

function sortFromHeader(dir: 'asc' | 'desc') {
  sortCol.value = headerContextMenu.colName
  sortDir.value = dir
  headerContextMenu.visible = false
}

function copyColumnName() {
  navigator.clipboard.writeText(headerContextMenu.colName)
  toast.success(`Copied column "${headerContextMenu.colName}"`)
  headerContextMenu.visible = false
}

function closeAllContextMenus() {
  cellContextMenu.visible = false
  headerContextMenu.visible = false
  fkPeekState.visible = false
  isMouseDown.value = false
}

// Key status
const keyStatusInfo = computed(() => {
  if (!props.tableName) return { columns: [], keyType: 'all_columns' as const }
  return schemaStore.getKeyColumnsForTable(props.tableName)
})

const keyStatusLabel = computed(() => {
  const info = keyStatusInfo.value
  if (info.keyType === 'primary') return `PK: ${info.columns.join(', ')}`
  if (info.keyType === 'unique') return `UK: ${info.columns.join(', ')}`
  if (info.keyType === 'virtual') return `VK: ${info.columns.join(', ')}`
  return 'Key: Auto'
})

const keyStatusIconClass = computed(() => {
  const info = keyStatusInfo.value
  if (info.keyType === 'primary') return 'text-emerald-500'
  if (info.keyType === 'unique') return 'text-blue-500'
  if (info.keyType === 'virtual') return 'text-purple-500'
  return 'text-amber-500'
})

const keyStatusTooltip = computed(() => {
  const info = keyStatusInfo.value
  if (info.keyType === 'primary') return `Primary Key: ${info.columns.join(', ')}`
  if (info.keyType === 'unique') return `Unique Index: ${info.columns.join(', ')}`
  if (info.keyType === 'virtual') return `Virtual Key: ${info.columns.join(', ')} (Click to edit)`
  return 'No Primary Key. Using full row matching (Click to define Virtual Key)'
})

onMounted(() => {
  loadSavedWidths()
  document.addEventListener('click', closeAllContextMenus)
  window.addEventListener('mouseup', () => { isMouseDown.value = false })
})

onUnmounted(() => {
  document.removeEventListener('click', closeAllContextMenus)
})

defineExpose({
  copySelectedTsv,
  exportCsv,
  exportJson,
  clearDirtyState
})
</script>

<style scoped>
.unified-grid-container {
  outline: none;
}
</style>
