<template>
  <div
    id="result-grid-table"
    class="unified-grid-container flex flex-col flex-1 h-full min-h-0 bg-background overflow-hidden select-none font-mono text-xs relative"
    tabindex="0"
    ref="gridContainerRef"
    @keydown="handleKeydown"
  >
    <!-- Grid Control Bar -->
    <div v-if="showControls" class="flex items-center justify-between px-3 py-1.5 border-b border-border/80 bg-muted/20 flex-shrink-0 text-xs">
      <div class="flex items-center gap-2 min-w-0">
        <div class="relative flex items-center">
          <PhMagnifyingGlass class="w-3.5 h-3.5 absolute left-2 text-muted-foreground/60 pointer-events-none" />
          <input
            ref="findInputRef"
            v-model="quickSearch"
            placeholder="Find…"
            class="h-6.5 w-36 sm:w-44 rounded border border-border/60 bg-background/80 pl-7 pr-7 text-[11px] font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
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

        <Button
          variant="outline"
          size="sm"
          class="h-6.5 px-2 text-[11px] gap-1 rounded bg-background"
          :class="{ 'border-primary text-primary bg-primary/5': filterPopover.visible || activeFilters.length > 0 }"
          @click.stop="openAddFilter($event)"
        >
          <PhFunnel class="w-3 h-3" />
          <span>Filter</span>
          <span
            v-if="activeFilters.length > 0"
            class="min-w-3.5 h-3.5 px-1 rounded text-[9px] bg-primary/20 text-primary leading-3.5"
          >{{ activeFilters.length }}</span>
        </Button>

        <Button
          v-if="sortCol"
          variant="outline"
          size="sm"
          class="h-6.5 px-2 text-[11px] gap-1 rounded bg-background border-primary/40 text-primary"
          @click="clearSort"
        >
          <PhSortAscending v-if="sortDir === 'asc'" class="w-3 h-3" />
          <PhSortDescending v-else class="w-3 h-3" />
          <span class="max-w-[100px] truncate">{{ getColDisplayName(sortCol) }}</span>
          <PhX class="w-2.5 h-2.5 opacity-70 hover:opacity-100" />
        </Button>

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

      <div class="flex items-center gap-2 flex-shrink-0">
        <div v-if="hasCellRangeSelection || selectedRowIndices.size > 0" class="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded animate-in fade-in duration-100">
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

        <div v-if="pageSize !== undefined" class="flex items-center border border-border/60 rounded bg-background h-6.5 text-[10.5px]">
          <select
            class="bg-transparent px-1.5 text-foreground outline-none font-mono cursor-pointer border-none"
            :value="pageSize"
            @change="onPageSizeSelect"
          >
            <option v-for="n in pageSizeOptions" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>

        <div class="flex items-center gap-1.5 text-[10.5px] text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded border border-border/40">
          <span class="font-medium text-foreground">{{ filteredRows.length }} / {{ rows.length }}</span>
          <span v-if="hasMore" class="text-amber-500">+</span>
          <span v-if="activeFilters.length || quickSearch" class="text-primary">local</span>
          <template v-if="durationMs !== undefined && durationMs > 0">
            <span class="text-border">·</span>
            <span>{{ durationMs }}ms</span>
          </template>
        </div>
        <Button
          v-if="hasMore"
          variant="outline"
          size="sm"
          class="h-6.5 px-2 text-[11px] rounded bg-background"
          :disabled="loadingMore"
          @click="emit('fetch-next')"
        >
          {{ loadingMore ? 'Loading…' : 'Fetch next' }}
        </Button>
        <Button
          v-if="hasMore"
          variant="outline"
          size="sm"
          class="h-6.5 px-2 text-[11px] rounded bg-background"
          :disabled="loadingMore"
          @click="emit('fetch-all')"
        >
          Fetch all
        </Button>
      </div>
    </div>

    <!-- Predicate chips: only when filters are active -->
    <div
      v-if="showControls && columnFilters.length"
      class="flex items-center gap-1.5 px-3 py-1 border-b border-border/80 bg-muted/10 text-xs flex-shrink-0 min-h-7 overflow-x-auto"
    >
      <button
        v-for="filter in columnFilters"
        :key="filter.id"
        class="group inline-flex items-center gap-1 h-5.5 max-w-[280px] px-1.5 rounded border border-primary/25 bg-primary/8 text-[10.5px] text-foreground font-mono cursor-pointer hover:bg-primary/12"
        @click.stop="openFilterForColumn($event, filter.column)"
      >
        <span class="truncate">{{ getFilterChipLabel(filter) }}</span>
        <span
          class="opacity-50 group-hover:opacity-100 p-0.5"
          @click.stop="removeFilter(filter.column)"
        >
          <PhX class="w-2.5 h-2.5" />
        </span>
      </button>
      <button
        v-if="filtersToSql(columnFilters)"
        class="h-5.5 px-1.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer border-none bg-transparent whitespace-nowrap"
        @click="promoteFiltersToWhere"
      >
        Promote to WHERE
      </button>
      <button
        class="h-5.5 px-1.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer border-none bg-transparent"
        @click="clearColumnFilters"
      >
        Clear
      </button>
    </div>

    <!-- Virtualized Scroll Viewport -->
    <div
      ref="scrollViewportRef"
      class="flex-1 min-h-0 overflow-auto relative bg-background outline-none spreadsheet-viewport"
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

      <div
        v-else-if="filteredRows.length === 0 && !loading"
        class="absolute inset-0 flex items-center justify-center surface-inset p-4 z-10"
      >
        <EmptyState
          title="No matching rows"
          :description="`0 of ${rows.length} loaded rows match the current find/filters.`"
        >
          <template #icon>
            <PhFunnel class="w-6 h-6 text-muted-foreground/60" />
          </template>
          <template #action>
            <Button variant="outline" size="sm" class="h-7" @click="clearAllFilters">
              Clear filters
            </Button>
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
      <div class="inline-block min-w-full align-top border-l border-t border-border/70" :style="{ width: tableTotalWidth + 'px' }">
        <!-- Sticky Header -->
        <div class="sticky top-0 z-20 flex bg-muted/90 backdrop-blur-sm border-b border-border select-none shadow-[0_1px_0_0_hsl(var(--border))]">
          <!-- Select All Checkbox -->
          <div class="grid-corner-cell w-9 flex items-center justify-center border-r border-border/70 flex-shrink-0">
            <input
              type="checkbox"
              :checked="allRowsSelected"
              class="w-3.5 h-3.5 accent-primary cursor-pointer rounded-xs"
              @change="toggleSelectAll"
              aria-label="Select all rows"
            />
          </div>

          <!-- Row Number Column Header -->
          <div class="grid-corner-cell w-10 flex items-center justify-center border-r border-border/70 text-[10px] font-semibold text-muted-foreground flex-shrink-0 tabular-nums">
            #
          </div>

          <!-- Data Column Headers -->
          <div
            v-for="(col, colIndex) in columns"
            :key="(col.key || col.name) + '_' + colIndex"
            class="group/head relative flex items-center justify-between px-2.5 border-r border-border/70 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer grid-header-cell flex-shrink-0"
            :class="sortCol === (col.key || col.name) ? 'bg-primary/8 text-foreground' : ''"
            :style="{ width: getColumnWidth(col.key || col.name) + 'px', minWidth: getColumnWidth(col.key || col.name) + 'px' }"
            @click="onHeaderClick($event, col.key || col.name)"
            @contextmenu.prevent="openHeaderMenu($event, col.key || col.name)"
          >
            <TooltipProvider :delay-duration="250" :skip-delay-duration="150">
              <Tooltip>
                <TooltipTrigger as-child>
                  <div class="flex items-center gap-1.5 truncate min-w-0 flex-1">
                    <!-- Key Indicator Icon -->
                    <PhKey
                      v-if="isColPk(col)"
                      class="w-3 h-3 text-emerald-500 flex-shrink-0"
                      title="Primary Key"
                    />
                    <PhArrowSquareOut
                      v-else-if="columnMetaMap[col.key || col.name]?.foreignKey"
                      class="w-3 h-3 text-primary/70 flex-shrink-0"
                      title="Foreign Key"
                    />

                    <!-- Clean, prominent column name -->
                    <span class="truncate font-semibold text-foreground/90 group-hover/head:text-foreground">
                      {{ col.name }}
                    </span>

                    <!-- Disambiguation index ONLY if duplicate column names exist in results -->
                    <span
                      v-if="isDuplicateColName(col.name) && getColDuplicateIndex(col, colIndex) > 1"
                      class="text-[9px] px-1 py-0.2 rounded bg-primary/15 text-primary font-mono flex-shrink-0 font-medium"
                    >
                      #{{ getColDuplicateIndex(col, colIndex) }}
                    </span>

                    <!-- Sort Indicator -->
                    <span v-if="sortCol === (col.key || col.name)" class="text-primary font-bold text-[10px] flex-shrink-0">
                      {{ sortDir === 'asc' ? '↑' : '↓' }}
                    </span>
                  </div>
                </TooltipTrigger>

                <TooltipContent
                  side="bottom"
                  align="start"
                  :side-offset="6"
                  class="w-72 p-2.5 bg-popover/98 border border-border/90 shadow-xl rounded-lg text-xs font-mono select-text pointer-events-auto"
                >
                  <div class="flex flex-col gap-2">
                    <!-- Top row: Name and Type -->
                    <div class="flex items-start justify-between gap-2 border-b border-border/60 pb-1.5">
                      <div class="min-w-0 flex-1">
                        <div class="text-[12px] font-bold text-foreground break-all leading-tight">{{ col.name }}</div>
                        <div v-if="col.orgName && col.orgName !== col.name" class="text-[10px] text-muted-foreground/80 mt-0.5">
                          Original: <code class="text-foreground/90">{{ col.orgName }}</code>
                        </div>
                      </div>
                      <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50 flex-shrink-0">
                        {{ col.type }}
                      </span>
                    </div>

                    <!-- Table & Schema info -->
                    <div class="space-y-1 text-[11px]">
                      <div v-if="col.orgTable || props.tableName" class="flex items-center justify-between text-muted-foreground">
                        <span>Table:</span>
                        <span class="text-foreground font-medium truncate max-w-[170px]" :title="col.orgTable || props.tableName">
                          {{ col.orgTable || props.tableName }}
                        </span>
                      </div>
                      <div v-if="col.schema" class="flex items-center justify-between text-muted-foreground">
                        <span>Schema:</span>
                        <span class="text-foreground font-medium truncate max-w-[170px]" :title="col.schema">{{ col.schema }}</span>
                      </div>

                      <!-- Key / Constraint Badges -->
                      <div v-if="getColumnTooltipDetails(col).keyBadge" class="flex items-center justify-between pt-0.5">
                        <span class="text-muted-foreground">Key:</span>
                        <span class="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                          <PhKey class="w-2.5 h-2.5" />
                          {{ getColumnTooltipDetails(col).keyBadge }}
                        </span>
                      </div>

                      <!-- Foreign Key Target -->
                      <div v-if="getColumnTooltipDetails(col).fkInfo" class="flex flex-col gap-0.5 pt-0.5 border-t border-border/40">
                        <div class="flex items-center gap-1 text-[10.5px] text-primary font-medium">
                          <PhArrowSquareOut class="w-3 h-3" />
                          <span>References FK:</span>
                        </div>
                        <div class="text-[10px] text-foreground/90 bg-muted/40 px-1.5 py-0.5 rounded truncate" :title="`${getColumnTooltipDetails(col).fkInfo.refTable}.${getColumnTooltipDetails(col).fkInfo.refColumn}`">
                          {{ getColumnTooltipDetails(col).fkInfo.refTable }}.{{ getColumnTooltipDetails(col).fkInfo.refColumn }}
                        </div>
                      </div>
                    </div>

                    <!-- Helpful Tip Footer -->
                    <div class="border-t border-border/50 pt-1.5 text-[9.5px] text-muted-foreground/70 flex items-center justify-between">
                      <span>Click to sort</span>
                      <span>·</span>
                      <span>Drag edge to resize</span>
                      <span>·</span>
                      <span>Right-click menu</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div class="flex items-center gap-1 flex-shrink-0 ml-1">
              <button
                class="p-0.5 rounded cursor-pointer border-none"
                :class="filterForColumn(col.key || col.name) ? 'text-primary bg-primary/15 opacity-100' : 'text-muted-foreground/50 opacity-0 group-hover/head:opacity-100 hover:text-foreground bg-transparent'"
                title="Filter column"
                @click.stop="openFilterForColumn($event, col.key || col.name)"
                @mousedown.stop
              >
                <PhFunnel class="w-3 h-3" weight="bold" />
              </button>
              <span class="text-[9px] font-mono text-muted-foreground/45 font-normal hidden lg:inline group-hover/head:text-muted-foreground/75 transition-colors">
                {{ col.type }}
              </span>
            </div>

            <!-- Column Resizer Drag Handle -->
            <div
              class="column-resizer absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-20 flex items-center justify-center group/resizer"
              :class="{ 'is-resizing': isResizingColumn && resizeColName === (col.key || col.name) }"
              @mousedown.stop.prevent="startResizeColumn($event, col.key || col.name)"
              @dblclick.stop="autoFitColumn(col.key || col.name)"
              title="Drag to resize, double-click to auto-fit"
            >
              <div
                class="w-[2px] h-full transition-colors group-hover/resizer:bg-primary/70"
                :class="isResizingColumn && resizeColName === (col.key || col.name) ? 'bg-primary' : 'bg-transparent'"
              ></div>
            </div>
          </div>

          <!-- Trailing Header Filler to provide right margin buffer so last column resizer has room -->
          <div class="flex-1 min-w-[64px] bg-muted/40 border-b border-border/70"></div>
        </div>

        <!-- Virtual Spacer Top -->
        <div :style="{ height: virtualTopHeight + 'px' }"></div>

        <!-- Rendered Virtual Rows -->
        <div
          v-for="item in visibleRows"
          :key="item.index"
          class="group flex text-[11px]"
          :class="[
            isRowInSelection(item.index) ? '' : (item.index % 2 === 0 ? 'bg-background' : 'bg-muted/20'),
            !isRowInSelection(item.index) && selectedRowIndices.has(item.index) ? 'bg-primary/6' : '',
            !isRowInSelection(item.index) && !selectedRowIndices.has(item.index) ? 'hover:bg-muted/35' : ''
          ]"
          :style="{ height: ROW_HEIGHT + 'px' }"
        >
          <!-- Row Checkbox -->
          <div
            class="w-9 h-full flex items-center justify-center border-r border-b border-border/70 flex-shrink-0 relative grid-corner-cell"
            :class="isRowInSelection(item.index) ? 'bg-primary/[0.06]' : ''"
          >
            <div v-if="selectedRowIndices.has(item.index)" class="absolute left-0 top-0 bottom-0 w-[2px] bg-primary"></div>
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
          <div
            class="w-10 h-full flex items-center justify-center border-r border-b border-border/70 text-[10px] text-muted-foreground tabular-nums flex-shrink-0 select-none grid-corner-cell"
            :class="isRowInSelection(item.index) ? 'text-primary font-semibold bg-primary/[0.06]' : ''"
          >
            {{ item.index + 1 }}
          </div>

          <!-- Row Cells -->
          <div
            v-for="(col, colIndex) in columns"
            :key="(col.key || col.name) + '_' + colIndex"
            class="relative flex items-center px-2 border-r border-b border-border/70 truncate cursor-cell select-none grid-data-cell flex-shrink-0"
            :style="{
              width: getColumnWidth(col.key || col.name) + 'px',
              minWidth: getColumnWidth(col.key || col.name) + 'px',
              ...getCellSelectionStyle(item.index, colIndex)
            }"
            :class="[
              getCellClass(item.index, colIndex, col.key || col.name),
              columnMetaMap[col.key || col.name]?.isNumeric ? 'justify-end tabular-nums text-right font-mono' : 'justify-start'
            ]"
            @mousedown="onCellMouseDown(item.index, colIndex, $event)"
            @mouseenter="onCellMouseEnter(item.index, colIndex, $event)"
            @dblclick="startEditCell(item.index, col.key || col.name, $event)"
            @contextmenu.prevent="openCellContextMenu($event, item.index, col.key || col.name)"
          >
            <!-- In-Place Cell Editor Input -->
            <template v-if="editingCell?.rowIndex === item.index && editingCell?.colKey === (col.key || col.name)">
              <input
                ref="inlineEditInputRef"
                v-model="editInputValue"
                class="absolute inset-0 z-30 w-full h-full bg-background border-2 border-primary text-foreground outline-none font-mono text-[11px] px-2 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)] rounded-none selection:bg-primary selection:text-primary-foreground"
                :class="{ 'text-right': columnMetaMap[col.key || col.name]?.isNumeric }"
                @keydown.enter="commitInlineEdit"
                @keydown.escape.stop="cancelInlineEdit"
                @blur="commitInlineEdit"
                @click.stop
              />
            </template>

            <!-- Standard Cell Value Display (when NOT editing) -->
            <template v-else>
              <!-- Dirty Cell Indicator -->
              <span
                v-if="isCellDirty(item.index, col.key || col.name)"
                class="absolute top-0 left-0 w-0 h-0 border-t-[6px] border-r-[6px] border-t-amber-500 border-r-transparent z-10"
                title="Modified (unsaved)"
              ></span>

              <!-- NULL Display -->
              <template v-if="getCellValue(item.index, col.key || col.name) === null || getCellValue(item.index, col.key || col.name) === undefined">
                <span class="text-[10px] italic text-muted-foreground/45 font-mono">NULL</span>
              </template>

              <!-- Boolean Display -->
              <template v-else-if="columnMetaMap[col.key || col.name]?.isBoolean">
                <span
                  class="inline-flex items-center px-1.5 py-0 rounded-sm text-[9px] font-semibold border"
                  :class="getCellValue(item.index, col.key || col.name) ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' : 'bg-red-500/12 text-red-600 dark:text-red-400 border-red-500/25'"
                >
                  {{ getCellValue(item.index, col.key || col.name) ? 'TRUE' : 'FALSE' }}
                </span>
              </template>

              <!-- Color Value Display -->
              <template v-else-if="isColorValue(col.name, getCellValue(item.index, col.key || col.name))">
                <div class="inline-flex items-center gap-1.5 font-mono text-[11px] truncate">
                  <span
                    class="w-3.5 h-3.5 rounded-sm flex-shrink-0 border border-border/80 shadow-2xs"
                    :style="{ backgroundColor: String(getCellValue(item.index, col.key || col.name)) }"
                    :title="`Color: ${getCellValue(item.index, col.key || col.name)}`"
                  ></span>
                  <span class="truncate">{{ getCellValue(item.index, col.key || col.name) }}</span>
                </div>
              </template>

              <!-- Status Value Display -->
              <template v-else-if="isStatusValue(col.name, getCellValue(item.index, col.key || col.name))">
                <span
                  class="inline-flex items-center px-1.5 py-0 rounded-sm text-[9.5px] font-medium font-mono border tracking-wide uppercase"
                  :class="getStatusChipClass(col.name, String(getCellValue(item.index, col.key || col.name)))"
                >
                  <span class="w-1.5 h-1.5 rounded-full mr-1 flex-shrink-0" :class="getStatusDotClass(col.name, String(getCellValue(item.index, col.key || col.name)))"></span>
                  {{ String(getCellValue(item.index, col.key || col.name)) }}
                </span>
              </template>

              <!-- Standard Value Display -->
              <template v-else>
                <span class="truncate" :title="String(getCellValue(item.index, col.key || col.name))">
                  {{ formatCellText(getCellValue(item.index, col.key || col.name)) }}
                </span>

                <!-- Foreign Key Peek Action -->
                <button
                  v-if="columnMetaMap[col.key || col.name]?.foreignKey"
                  class="ml-auto text-primary/70 hover:text-primary hover:bg-primary/10 p-0.5 rounded cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                  title="Preview referenced record"
                  @click.stop="peekForeignKey($event, col, getCellValue(item.index, col.key || col.name))"
                >
                  <PhArrowSquareOut class="w-3 h-3" />
                </button>

                <!-- Large Value Inspector Trigger -->
                <button
                  v-if="isLargeValue(getCellValue(item.index, col.key || col.name))"
                  class="ml-auto text-muted-foreground hover:text-foreground hover:bg-accent p-0.5 rounded cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                  title="Open Value Inspector"
                  @click.stop="openValueInspector(getCellValue(item.index, col.key || col.name), col.key || col.name, item.index)"
                >
                  <PhArrowsOutSimple class="w-3 h-3" />
                </button>
              </template>
            </template>
          </div>

          <!-- Trailing Row Filler -->
          <div class="flex-1 min-w-[64px] border-b border-border/70"></div>
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
          :disabled="saving"
          @click="discardAllEdits"
        >
          Discard
        </Button>
        <Button
          size="sm"
          class="h-6.5 px-3 text-[11px] font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-sm"
          :disabled="saving"
          @click="applyDirtyEdits"
        >
          <PhCheck class="w-3 h-3" />
          <span>{{ saving ? 'Saving…' : 'Review & Apply (⌘S)' }}</span>
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
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2" @click="filterByCurrentCell">
          <PhFunnel class="w-3 h-3" /> Filter by this cell
        </button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2" @click="inspectCurrentCell">
          <PhArrowsOutSimple class="w-3 h-3" /> Inspect in Full Viewer
        </button>
      </div>

      <!-- Column filter popover -->
      <div
        v-if="filterPopover.visible"
        ref="filterPopoverRef"
        class="fixed z-[9999] w-64 bg-popover border border-border/80 rounded-md shadow-xl text-xs font-mono select-none overflow-hidden"
        :style="{ left: filterPopover.x + 'px', top: filterPopover.y + 'px' }"
        @click.stop
        @mousedown.stop
      >
        <div v-if="filterPopover.mode === 'pick-column'" class="max-h-64 overflow-y-auto py-1">
          <div class="px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Column</div>
          <button
            v-for="(col, colIdx) in columns"
            :key="(col.key || col.name) + '_' + colIdx"
            class="w-full text-left px-3 py-1.5 hover:bg-accent cursor-pointer border-none bg-transparent flex items-center justify-between gap-2"
            @click="selectFilterColumn(col.key || col.name)"
          >
            <div class="flex items-center gap-1.5 truncate min-w-0">
              <span class="truncate">{{ col.name }}</span>
              <span v-if="col.orgTable" class="text-[9px] text-muted-foreground/60 truncate">({{ col.orgTable }})</span>
            </div>
            <span class="text-[9px] text-muted-foreground truncate">{{ col.type }}</span>
          </button>
        </div>
        <div v-else class="flex flex-col">
          <div class="px-2.5 py-1.5 border-b border-border/60 flex items-center justify-between gap-2">
            <span class="font-semibold truncate">{{ getColDisplayName(filterPopover.column) }}</span>
            <span class="text-[9px] text-muted-foreground">local</span>
          </div>
          <div class="p-2 flex flex-col gap-1.5">
            <select
              class="h-7 w-full rounded border border-border/60 bg-background px-1.5 text-[11px] outline-none"
              :value="draftFilter.op"
              @change="onDraftOpChange"
            >
              <option v-for="opt in draftOps" :key="opt.op" :value="opt.op">{{ opt.label }}</option>
            </select>
            <input
              v-if="opNeedsValue(draftFilter.op)"
              ref="filterValueInputRef"
              v-model="draftFilter.value"
              class="h-7 w-full rounded border border-border/60 bg-background px-2 text-[11px] outline-none focus:border-primary"
              placeholder="Value"
              @input="applyDraftFilter"
            />
          </div>
          <div v-if="popoverDistinct.length" class="border-t border-border/60 max-h-40 overflow-y-auto py-1">
            <div class="px-2.5 py-1 text-[10px] text-muted-foreground">Values in this page</div>
            <button
              v-for="item in popoverDistinct"
              :key="item.key"
              class="w-full text-left px-3 py-1 hover:bg-accent cursor-pointer border-none bg-transparent flex items-center justify-between gap-2"
              :class="{ 'bg-primary/10 text-foreground': isDistinctSelected(item) }"
              @click="applyDistinctValue(item)"
            >
              <span class="truncate" :class="{ 'italic text-muted-foreground': item.raw === null || item.raw === undefined }">{{ item.label }}</span>
              <span class="text-[9px] text-muted-foreground tabular-nums">{{ item.count }}</span>
            </button>
          </div>
          <div class="border-t border-border/60 px-2 py-1.5 flex justify-between">
            <button class="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer border-none bg-transparent" @click="clearPopoverColumn">Clear</button>
            <button class="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer border-none bg-transparent" @click="filterPopover.visible = false">Done</button>
          </div>
        </div>
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
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2" @click="filterFromHeaderMenu">
          <PhFunnel class="w-3 h-3" /> Filter this column
        </button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2" @click="copyColumnName">
          <PhCopy class="w-3 h-3" /> Copy Column Name
        </button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2" @click="autoFitColumn(headerContextMenu.colKey)">
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
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, ActionTooltip } from '@/components/ui/tooltip'
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
import {
  defaultOpForKind,
  distinctValues,
  filtersToSql,
  formatFilterChip,
  inferFilterKind,
  opNeedsValue,
  operatorsForKind,
  rowMatchesFilter,
  type ColumnFilter,
  type DistinctValue,
  type FilterOp,
} from '@/lib/gridFilters'

export interface ColumnDef {
  name: string
  type: string
  key?: string
  orgName?: string
  orgTable?: string
  schema?: string
}

export type GridRow = Record<string, any>

const props = withDefaults(defineProps<{
  columns: ColumnDef[]
  rows: GridRow[]
  tableName?: string
  durationMs?: number
  loading?: boolean
  showControls?: boolean
  pageSize?: number
  hasMore?: boolean
  loadingMore?: boolean
  canEdit?: boolean
  saving?: boolean
}>(), {
  showControls: true,
  loading: false,
  canEdit: true,
})

const emit = defineEmits<{
  'save-edits': [updates: { rowIndex: number; changes: Record<string, any> }[], onSuccess?: () => void]
  'refresh': []
  'page-size-change': [size: number]
  'promote-where': [predicate: string]
  'fetch-next': []
  'fetch-all': []
}>()

const schemaStore = useSchemaStore()
const uiStore = useUiStore()

const ROW_HEIGHT = 32
const OVERSCAN = 8

const gridContainerRef = ref<HTMLDivElement | null>(null)
const scrollViewportRef = ref<HTMLDivElement | null>(null)
const inlineEditInputRef = ref<HTMLInputElement | null>(null)
const findInputRef = ref<HTMLInputElement | null>(null)
const filterPopoverRef = ref<HTMLDivElement | null>(null)
const filterValueInputRef = ref<HTMLInputElement | null>(null)

const scrollTop = ref(0)
const viewportHeight = ref(400)
const quickSearch = ref('')
const showExportMenu = ref(false)
const pageSizeOptions = [50, 100, 250, 500, 1000]

const sortCol = ref('')
const sortDir = ref<'asc' | 'desc' | ''>('')
const columnFilters = ref<ColumnFilter[]>([])
const columnWidths = reactive<Record<string, number>>({})

const dirtyEdits = reactive<Record<number, Record<string, any>>>({})
const selectedRowIndices = ref<Set<number>>(new Set())

const focusedCell = ref<{ rowIndex: number; colIndex: number } | null>(null)
const anchorCell = ref<{ rowIndex: number; colIndex: number } | null>(null)
const isMouseDown = ref(false)

const editingCell = ref<{ rowIndex: number; colKey: string } | null>(null)
const editInputValue = ref('')

const valueInspectorState = reactive({
  open: false,
  value: null as any,
  colKey: '',
  columnName: '',
  rowIndex: 0
})

const cellContextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  rowIndex: 0,
  colKey: ''
})

const headerContextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  colKey: ''
})

const filterPopover = reactive({
  visible: false,
  mode: 'column' as 'pick-column' | 'column',
  column: '',
  x: 0,
  y: 0,
})

const draftFilter = reactive<ColumnFilter>({
  id: '',
  column: '',
  op: 'contains',
  value: '',
})

function getColKey(col: ColumnDef): string {
  return col.key || col.name
}

function getColByKey(colKey: string): ColumnDef | undefined {
  return props.columns.find(c => (c.key || c.name) === colKey)
}

function isDuplicateColName(name: string): boolean {
  return props.columns.filter(c => c.name === name).length > 1
}

function getColDuplicateIndex(col: ColumnDef, colIndex: number): number {
  let count = 0
  for (let i = 0; i <= colIndex; i++) {
    if (props.columns[i].name === col.name) {
      count++
    }
  }
  return count
}

function isColPk(col: ColumnDef): boolean {
  const targetTable = col.orgTable || props.tableName || ''
  if (!targetTable) return false
  const info = schemaStore.getKeyColumnsForTable(targetTable)
  const cName = (col.orgName || col.name).toLowerCase()
  return info.columns.some(k => k.toLowerCase() === cName)
}

function getColumnTooltipDetails(col: ColumnDef) {
  const colKey = col.key || col.name
  const meta = columnMetaMap.value[colKey]
  const targetTable = col.orgTable || props.tableName || ''

  let keyBadge: string | null = null
  let keyDescription: string | null = null

  if (targetTable) {
    const keyInfo = schemaStore.getKeyColumnsForTable(targetTable)
    const cName = (col.orgName || col.name).toLowerCase()
    if (keyInfo.columns.some(k => k.toLowerCase() === cName)) {
      if (keyInfo.keyType === 'primary') {
        keyBadge = 'PRIMARY KEY'
        keyDescription = 'Primary key column'
      } else if (keyInfo.keyType === 'unique') {
        keyBadge = 'UNIQUE KEY'
        keyDescription = 'Unique index column'
      } else if (keyInfo.keyType === 'virtual') {
        keyBadge = 'VIRTUAL KEY'
        keyDescription = 'Virtual key column'
      }
    }
  }

  const fk = meta?.foreignKey
  let fkInfo: { refTable: string; refColumn: string } | null = null
  if (fk) {
    const refTable = fk.referenced_table || fk.referencedTable || ''
    const refColumn = fk.referenced_column || fk.referencedColumn || ''
    if (refTable && refColumn) {
      fkInfo = { refTable, refColumn }
    }
  }

  return {
    name: col.name,
    orgName: col.orgName && col.orgName !== col.name ? col.orgName : null,
    table: col.orgTable || (props.tableName ? props.tableName : null),
    schema: col.schema || null,
    type: col.type || 'unknown',
    keyBadge,
    keyDescription,
    fkInfo,
  }
}

function getHeaderTitle(col: ColumnDef): string {
  if (col.orgTable) return `${col.orgTable}.${col.name} (${col.type})`
  return `${col.name} (${col.type})`
}

function getColDisplayName(colKey: string): string {
  const col = getColByKey(colKey)
  if (!col) return colKey
  if (col.orgTable) return `${col.orgTable}.${col.name}`
  return col.name
}

function getFilterChipLabel(filter: ColumnFilter): string {
  const col = getColByKey(filter.column)
  const displayCol = col ? (col.orgTable ? `${col.orgTable}.${col.name}` : col.name) : filter.column
  return formatFilterChip({ ...filter, column: displayCol })
}

// Column widths persistence
const storageKey = computed(() => (props.tableName ? `select_grid_widths_${props.tableName}` : ''))

function loadSavedWidths() {
  if (!storageKey.value) return
  try {
    const raw = localStorage.getItem(storageKey.value)
    if (raw) {
      const parsed = JSON.parse(raw)
      Object.assign(columnWidths, parsed)
    }
  } catch {}
}

function saveWidths() {
  if (!storageKey.value) return
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
const isResizingColumn = ref(false)
let hasMovedDuringResize = false
let justFinishedResize = false

function onHeaderClick(_e: MouseEvent, colKey: string) {
  if (isResizingColumn.value || justFinishedResize || hasMovedDuringResize) {
    return
  }
  sortBy(colKey)
}

function startResizeColumn(e: MouseEvent, colName: string) {
  e.preventDefault()
  e.stopPropagation()
  resizeColName = colName
  resizeStartX = e.clientX
  resizeStartWidth = getColumnWidth(colName)
  hasMovedDuringResize = false
  isResizingColumn.value = true

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  window.addEventListener('mousemove', onColumnResizeMove)
  window.addEventListener('mouseup', stopResizeColumn)
}

function onColumnResizeMove(e: MouseEvent) {
  if (!resizeColName) return
  const delta = e.clientX - resizeStartX
  if (Math.abs(delta) > 2) {
    hasMovedDuringResize = true
  }

  // Auto-scroll horizontally if dragging near or beyond viewport edge
  if (scrollViewportRef.value) {
    const vp = scrollViewportRef.value
    const rect = vp.getBoundingClientRect()
    const edgeThreshold = 35
    if (e.clientX > rect.right - edgeThreshold) {
      vp.scrollLeft += 12
    } else if (e.clientX < rect.left + edgeThreshold && vp.scrollLeft > 0) {
      vp.scrollLeft -= 12
    }
  }

  columnWidths[resizeColName] = Math.max(60, Math.min(1000, Math.round(resizeStartWidth + delta)))
}

function stopResizeColumn() {
  if (hasMovedDuringResize) {
    justFinishedResize = true
    setTimeout(() => {
      justFinishedResize = false
      hasMovedDuringResize = false
    }, 150)
  }

  resizeColName = ''
  isResizingColumn.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  window.removeEventListener('mousemove', onColumnResizeMove)
  window.removeEventListener('mouseup', stopResizeColumn)
  saveWidths()
}

function autoFitColumn(colKey: string) {
  const col = getColByKey(colKey)
  let maxLen = (col?.name || colKey).length
  for (let i = 0; i < Math.min(props.rows.length, 100); i++) {
    const s = String(props.rows[i]?.[colKey] ?? '')
    if (s.length > maxLen) maxLen = s.length
  }
  columnWidths[colKey] = Math.max(80, Math.min(450, maxLen * 8 + 32))
  saveWidths()
}

const tableTotalWidth = computed(() => {
  const base = 36 + 40 // Checkbox + #
  const cols = props.columns.reduce((sum, c) => sum + getColumnWidth(c.key || c.name), 0)
  return Math.max(base + cols + 64, 600)
})

// Pre-computed Column Metadata Map for O(1) cell evaluation
const columnMetaMap = computed(() => {
  const map: Record<string, { isNumeric: boolean; isBoolean: boolean; foreignKey: any }> = {}
  for (const col of props.columns) {
    const key = col.key || col.name
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
    map[key] = { isNumeric, isBoolean, foreignKey }
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
const activeFilters = computed(() =>
  columnFilters.value.filter(f => !opNeedsValue(f.op) || f.value.trim() !== '')
)

function filterForColumn(colKey: string): ColumnFilter | undefined {
  return columnFilters.value.find(f => f.column === colKey)
}

const draftOps = computed(() => {
  const col = getColByKey(draftFilter.column)
  return operatorsForKind(inferFilterKind(col?.type))
})

const popoverDistinct = computed(() => {
  if (!filterPopover.visible || !filterPopover.column) return []
  return distinctValues(props.rows, filterPopover.column)
})

function clampPopover(x: number, y: number, width = 256, height = 320) {
  const maxX = Math.max(8, window.innerWidth - width - 8)
  const maxY = Math.max(8, window.innerHeight - height - 8)
  return { x: Math.min(Math.max(8, x), maxX), y: Math.min(Math.max(8, y), maxY) }
}

function upsertFilter(next: ColumnFilter) {
  const idx = columnFilters.value.findIndex(f => f.column === next.column)
  if (!opNeedsValue(next.op) || next.value.trim() !== '') {
    const copy = { ...next, id: next.id || `f-${next.column}` }
    if (idx >= 0) columnFilters.value[idx] = copy
    else columnFilters.value.push(copy)
  } else if (idx >= 0) {
    columnFilters.value.splice(idx, 1)
  }
  onSearchInput()
}

function applyDraftFilter() {
  if (!draftFilter.column) return
  upsertFilter({ ...draftFilter, id: `f-${draftFilter.column}` })
}

function onDraftOpChange(e: Event) {
  draftFilter.op = (e.target as HTMLSelectElement).value as FilterOp
  if (!opNeedsValue(draftFilter.op)) draftFilter.value = ''
  applyDraftFilter()
}

function loadDraftFromColumn(colKey: string) {
  const existing = filterForColumn(colKey)
  const col = getColByKey(colKey)
  const kind = inferFilterKind(col?.type)
  draftFilter.id = existing?.id || `f-${colKey}`
  draftFilter.column = colKey
  draftFilter.op = existing?.op || defaultOpForKind(kind)
  draftFilter.value = existing?.value || ''
}

function openFilterAt(x: number, y: number, mode: 'pick-column' | 'column', column = '') {
  const pos = clampPopover(x, y)
  filterPopover.mode = mode
  filterPopover.column = column
  filterPopover.x = pos.x
  filterPopover.y = pos.y
  if (mode === 'column' && column) {
    loadDraftFromColumn(column)
  }
  nextTick(() => {
    filterPopover.visible = true
    if (mode === 'column' && column) {
      nextTick(() => filterValueInputRef.value?.focus())
    }
  })
}

function openAddFilter(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  openFilterAt(rect.left, rect.bottom + 4, 'pick-column')
}

function openFilterForColumn(e: MouseEvent, colKey: string) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  openFilterAt(rect.left, rect.bottom + 4, 'column', colKey)
}

function selectFilterColumn(colKey: string) {
  filterPopover.mode = 'column'
  filterPopover.column = colKey
  loadDraftFromColumn(colKey)
  nextTick(() => filterValueInputRef.value?.focus())
}

function removeFilter(colKey: string) {
  columnFilters.value = columnFilters.value.filter(f => f.column !== colKey)
  onSearchInput()
}

function clearColumnFilters() {
  columnFilters.value = []
  onSearchInput()
}

function clearPopoverColumn() {
  if (filterPopover.column) removeFilter(filterPopover.column)
  draftFilter.value = ''
  filterPopover.visible = false
}

function isDistinctSelected(item: DistinctValue): boolean {
  if (item.raw === null || item.raw === undefined) return draftFilter.op === 'is_null'
  return draftFilter.op === 'eq' && draftFilter.value === String(item.raw)
}

function applyDistinctValue(item: DistinctValue) {
  if (item.raw === null || item.raw === undefined) {
    draftFilter.op = 'is_null'
    draftFilter.value = ''
  } else {
    draftFilter.op = 'eq'
    draftFilter.value = String(item.raw)
  }
  applyDraftFilter()
}

function filterByCurrentCell() {
  const colKey = cellContextMenu.colKey
  const val = getCellValue(cellContextMenu.rowIndex, colKey)
  const col = getColByKey(colKey)
  const kind = inferFilterKind(col?.type)
  let op: FilterOp = 'eq'
  let value = val === null || val === undefined ? '' : String(val)
  if (val === null || val === undefined) op = 'is_null'
  else if (kind === 'boolean') op = isTruthyLike(val) ? 'is_true' : 'is_false'
  upsertFilter({ id: `f-${colKey}`, column: colKey, op, value })
  cellContextMenu.visible = false
}

function isTruthyLike(value: unknown): boolean {
  return value === true || value === 1 || String(value).toLowerCase() === 'true'
}

function filterFromHeaderMenu() {
  const colKey = headerContextMenu.colKey
  headerContextMenu.visible = false
  openFilterAt(headerContextMenu.x, headerContextMenu.y, 'column', colKey)
}

function promoteFiltersToWhere() {
  const sqlFilters = activeFilters.value.map(f => {
    const col = getColByKey(f.column)
    const sqlColName = col?.orgTable ? `${col.orgTable}.${col.orgName || col.name}` : (col?.orgName || col?.name || f.column)
    return {
      ...f,
      column: sqlColName,
    }
  })
  const sql = filtersToSql(sqlFilters)
  if (!sql) return
  emit('promote-where', sql)
}

function onPageSizeSelect(e: Event) {
  emit('page-size-change', parseInt((e.target as HTMLSelectElement).value, 10))
}

const filteredRows = computed(() => {
  const rows = props.rows
  if (!rows || rows.length === 0) return []

  const search = quickSearch.value.trim().toLowerCase()
  const filters = activeFilters.value
  const activeSortCol = sortCol.value
  const activeSortDir = sortDir.value

  const hasSearch = Boolean(search)
  const hasFilters = filters.length > 0
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
        const val = getCellValue(i, col.key || col.name)
        if (val !== null && val !== undefined && String(val).toLowerCase().includes(search)) {
          matched = true
          break
        }
      }
      if (!matched) continue
    }

    if (hasFilters) {
      let matched = true
      for (const filter of filters) {
        if (!rowMatchesFilter(getCellValue(i, filter.column), filter)) {
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
      const av = getCellValue(a.index, col)
      const bv = getCellValue(b.index, col)
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
  if (props.hasMore && !props.loadingMore && el.scrollTop + el.clientHeight > el.scrollHeight - 240) {
    emit('fetch-next')
  }
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

function getOriginalCellValue(rowIndex: number, colKey: string): any {
  return props.rows[rowIndex]?.[colKey]
}

function getCellValue(rowIndex: number, colKey: string): any {
  const dirty = dirtyEdits[rowIndex]
  if (dirty && colKey in dirty) {
    return dirty[colKey]
  }
  return getOriginalCellValue(rowIndex, colKey)
}

function getRowWithEdits(rowIndex: number): GridRow {
  const row = props.rows[rowIndex]
  if (!row) return {}
  const dirty = dirtyEdits[rowIndex]
  if (!dirty) return row
  return { ...row, ...dirty }
}

function isCellDirty(rowIndex: number, colKey: string): boolean {
  return dirtyEdits[rowIndex] !== undefined && colKey in dirtyEdits[rowIndex]
}

const selectionBounds = computed(() => {
  if (!anchorCell.value || !focusedCell.value) return null
  return {
    minR: Math.min(anchorCell.value.rowIndex, focusedCell.value.rowIndex),
    maxR: Math.max(anchorCell.value.rowIndex, focusedCell.value.rowIndex),
    minC: Math.min(anchorCell.value.colIndex, focusedCell.value.colIndex),
    maxC: Math.max(anchorCell.value.colIndex, focusedCell.value.colIndex),
  }
})

const hasCellRangeSelection = computed(() => {
  const b = selectionBounds.value
  if (!b) return false
  return b.minR !== b.maxR || b.minC !== b.maxC
})

function isCellInSelection(rowIndex: number, colIndex: number): boolean {
  const b = selectionBounds.value
  if (!b) return false
  return rowIndex >= b.minR && rowIndex <= b.maxR && colIndex >= b.minC && colIndex <= b.maxC
}

function isRowInSelection(rowIndex: number): boolean {
  const b = selectionBounds.value
  if (!b) return false
  return rowIndex >= b.minR && rowIndex <= b.maxR
}

function getCellSelectionStyle(rowIndex: number, colIndex: number): Record<string, string> {
  if (!isCellInSelection(rowIndex, colIndex)) return {}

  const b = selectionBounds.value!
  const isActive = isCellFocused(rowIndex, colIndex)
  const borderW = isActive ? '2px' : '1.5px'
  const color = 'hsl(var(--primary))'
  const shadows: string[] = []

  if (rowIndex === b.minR) shadows.push(`inset 0 ${borderW} 0 0 ${color}`)
  if (rowIndex === b.maxR) shadows.push(`inset 0 -${borderW} 0 0 ${color}`)
  if (colIndex === b.minC) shadows.push(`inset ${borderW} 0 0 0 ${color}`)
  if (colIndex === b.maxC) shadows.push(`inset -${borderW} 0 0 0 ${color}`)

  return { boxShadow: shadows.join(', ') }
}

function getCellClass(rowIndex: number, colIndex: number, colName: string): string {
  const classes: string[] = []
  if (isCellInSelection(rowIndex, colIndex)) {
    classes.push('bg-primary/[0.10] z-[1]')
    if (isCellFocused(rowIndex, colIndex)) {
      classes.push('selection-active-cell')
    }
  }
  if (isCellDirty(rowIndex, colName)) {
    classes.push('bg-amber-500/10')
  }
  return classes.join(' ')
}

function resolveInlineEditInput(): HTMLInputElement | null {
  const ref = inlineEditInputRef.value
  if (!ref) return null
  return Array.isArray(ref) ? ref[0] ?? null : ref
}

function startEditCell(rowIndex: number, colKey: string, _e?: MouseEvent) {
  if (!props.canEdit) {
    toast.error('This result is not safely editable. Define a primary or virtual key first.')
    if (props.tableName) uiStore.openVirtualKeyDialog(props.tableName)
    return
  }
  editingCell.value = { rowIndex, colKey }
  const val = getCellValue(rowIndex, colKey)
  editInputValue.value = val === null || val === undefined ? '' : String(val)
  nextTick(() => {
    const input = resolveInlineEditInput()
    if (input) {
      input.focus()
      input.select()
    }
  })
}

function commitInlineEdit() {
  if (!editingCell.value) return
  const { rowIndex, colKey } = editingCell.value
  const originalVal = getOriginalCellValue(rowIndex, colKey)
  const newVal = editInputValue.value

  if (String(originalVal ?? '') !== newVal) {
    if (!dirtyEdits[rowIndex]) dirtyEdits[rowIndex] = {}
    dirtyEdits[rowIndex][colKey] = newVal
  } else if (dirtyEdits[rowIndex]) {
    delete dirtyEdits[rowIndex][colKey]
    if (Object.keys(dirtyEdits[rowIndex]).length === 0) {
      delete dirtyEdits[rowIndex]
    }
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
}

function clearDirtyState() {
  for (const key of Object.keys(dirtyEdits)) {
    delete dirtyEdits[Number(key)]
  }
}

function applyDirtyEdits() {
  const payload: { rowIndex: number; changes: Record<string, any> }[] = []
  for (const [rIdx, changes] of Object.entries(dirtyEdits)) {
    payload.push({ rowIndex: parseInt(rIdx), changes })
  }
  emit('save-edits', payload, () => {
    clearDirtyState()
  })
}

// Selection & Navigation
const hasSelection = computed(() => selectedRowIndices.value.size > 0 || hasCellRangeSelection.value)

const selectionSummaryText = computed(() => {
  if (selectedRowIndices.value.size > 0) {
    return `${selectedRowIndices.value.size} row${selectedRowIndices.value.size > 1 ? 's' : ''}`
  }
  if (hasCellRangeSelection.value && selectionBounds.value) {
    const b = selectionBounds.value
    const rows = b.maxR - b.minR + 1
    const cols = b.maxC - b.minC + 1
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
  const target = e.target as HTMLElement | null
  const typingInField = target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const meta = isMac ? e.metaKey : e.ctrlKey

  if (meta && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    findInputRef.value?.focus()
    findInputRef.value?.select()
    return
  }

  if (typingInField) return

  if (e.key === 'Escape') {
    if (filterPopover.visible) {
      filterPopover.visible = false
      return
    }
    if (editingCell.value) {
      cancelInlineEdit()
    } else {
      clearAllSelection()
    }
    return
  }

  if (editingCell.value) return

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

  const curPos = filteredRows.value.findIndex(r => r.index === focusedCell.value!.rowIndex)
  if (curPos < 0) return

  let newPos = curPos
  let { colIndex } = focusedCell.value

  if (e.key === 'ArrowUp' && curPos > 0) {
    e.preventDefault()
    newPos = curPos - 1
  } else if (e.key === 'ArrowDown' && curPos < filteredRows.value.length - 1) {
    e.preventDefault()
    newPos = curPos + 1
  } else if (e.key === 'ArrowLeft' && colIndex > 0) {
    e.preventDefault()
    colIndex--
  } else if (e.key === 'ArrowRight' && colIndex < props.columns.length - 1) {
    e.preventDefault()
    colIndex++
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const col = props.columns[colIndex]
    if (col) {
      startEditCell(focusedCell.value.rowIndex, col.key || col.name, e as any)
    }
    return
  } else if (e.key === 'Tab') {
    e.preventDefault()
    if (e.shiftKey) {
      if (colIndex > 0) colIndex--
      else if (curPos > 0) {
        newPos = curPos - 1
        colIndex = props.columns.length - 1
      }
    } else {
      if (colIndex < props.columns.length - 1) colIndex++
      else if (curPos < filteredRows.value.length - 1) {
        newPos = curPos + 1
        colIndex = 0
      }
    }
  } else {
    return
  }

  const newRowIndex = filteredRows.value[newPos]?.index
  if (newRowIndex === undefined) return

  focusedCell.value = { rowIndex: newRowIndex, colIndex }
  if (!e.shiftKey) {
    anchorCell.value = { rowIndex: newRowIndex, colIndex }
  }

  scrollCellIntoView(newPos, colIndex)
}

function scrollCellIntoView(filteredPos: number, colIndex: number) {
  const viewport = scrollViewportRef.value
  if (!viewport) return

  const rowTop = filteredPos * ROW_HEIGHT
  const rowBottom = rowTop + ROW_HEIGHT
  const { scrollTop, clientHeight } = viewport

  if (rowTop < scrollTop) {
    viewport.scrollTop = rowTop
  } else if (rowBottom > scrollTop + clientHeight) {
    viewport.scrollTop = rowBottom - clientHeight
  }

  let colLeft = 36 + 40
  for (let i = 0; i < colIndex; i++) {
    colLeft += getColumnWidth(props.columns[i].key || props.columns[i].name)
  }
  const col = props.columns[colIndex]
  const colRight = colLeft + (col ? getColumnWidth(col.key || col.name) : 150)
  const { scrollLeft, clientWidth } = viewport

  if (colLeft < scrollLeft) {
    viewport.scrollLeft = colLeft
  } else if (colRight > scrollLeft + clientWidth) {
    viewport.scrollLeft = colRight - clientWidth
  }
}

function copySelectedTsv() {
  if (selectedRowIndices.value.size > 0) {
    const indices = Array.from(selectedRowIndices.value).sort((a, b) => a - b)
    const header = props.columns.map(c => c.name).join('\t')
    const lines = indices.map(idx => {
      return props.columns.map(c => getCellValue(idx, c.key || c.name) ?? '').join('\t')
    })
    navigator.clipboard.writeText([header, ...lines].join('\n'))
    toast.success(`Copied ${indices.length} rows as TSV`)
    return
  }

  if (hasCellRangeSelection.value && selectionBounds.value) {
    const b = selectionBounds.value
    const lines: string[] = []
    for (let r = b.minR; r <= b.maxR; r++) {
      const rowVals: string[] = []
      for (let c = b.minC; c <= b.maxC; c++) {
        const col = props.columns[c]
        rowVals.push(getCellValue(r, col.key || col.name) ?? '')
      }
      lines.push(rowVals.join('\t'))
    }
    navigator.clipboard.writeText(lines.join('\n'))
    toast.success(`Copied ${lines.length} row(s) to clipboard (TSV)`)
  }
}

function copySelectedJson() {
  if (selectedRowIndices.value.size > 0) {
    const selected = Array.from(selectedRowIndices.value).map(idx => getRowWithEdits(idx))
    navigator.clipboard.writeText(JSON.stringify(selected, null, 2))
    toast.success(`Copied ${selected.length} rows as JSON`)
    return
  }

  if (hasCellRangeSelection.value && selectionBounds.value) {
    const b = selectionBounds.value
    const result: Record<string, any>[] = []
    for (let r = b.minR; r <= b.maxR; r++) {
      const row: Record<string, any> = {}
      for (let c = b.minC; c <= b.maxC; c++) {
        const col = props.columns[c]
        row[col.name] = getCellValue(r, col.key || col.name)
      }
      result.push(row)
    }
    navigator.clipboard.writeText(JSON.stringify(result.length === 1 ? result[0] : result, null, 2))
    toast.success(`Copied ${result.length} row(s) as JSON`)
  }
}

function getExportRows(): GridRow[] {
  return props.rows.map((_, idx) => getRowWithEdits(idx))
}

async function copyAllTsv() {
  const exportRows = getExportRows()
  try {
    const text = await invoke<string>('format_query_data', { format: 'tsv', columns: props.columns.map(c => c.name), rows: exportRows })
    navigator.clipboard.writeText(text)
    toast.success('Copied all data as TSV')
  } catch {
    const header = props.columns.map(c => c.name).join('\t')
    const lines = exportRows.map(r => props.columns.map(c => r[c.key || c.name] ?? '').join('\t'))
    navigator.clipboard.writeText([header, ...lines].join('\n'))
    toast.success('Copied all data as TSV')
  }
}

async function exportCsv() {
  const exportRows = getExportRows()
  let text = ''
  try {
    text = await invoke<string>('format_query_data', { format: 'csv', columns: props.columns.map(c => c.name), rows: exportRows })
  } catch {
    const escape = (val: string) => /[",\n\r]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val
    const header = props.columns.map(c => escape(c.name)).join(',')
    const body = exportRows.map(row => props.columns.map(c => escape(String(row[c.key || c.name] ?? ''))).join(','))
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
  const exportRows = getExportRows()
  let text = ''
  try {
    text = await invoke<string>('format_query_data', { format: 'json', columns: props.columns.map(c => c.name), rows: exportRows })
  } catch {
    text = JSON.stringify(exportRows, null, 2)
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
  return columnMetaMap.value[col.key || col.name]?.isNumeric ?? false
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

function openValueInspector(val: any, colKey: string, rowIndex: number) {
  const col = getColByKey(colKey)
  valueInspectorState.value = val
  valueInspectorState.colKey = colKey
  valueInspectorState.columnName = col?.name || colKey
  valueInspectorState.rowIndex = rowIndex
  valueInspectorState.open = true
}

function onInspectorSaveValue(newVal: any) {
  const { rowIndex, colKey, columnName } = valueInspectorState
  if (rowIndex !== undefined && colKey && props.rows[rowIndex]) {
    const originalVal = getOriginalCellValue(rowIndex, colKey)
    if (String(originalVal ?? '') !== String(newVal ?? '')) {
      if (!dirtyEdits[rowIndex]) dirtyEdits[rowIndex] = {}
      dirtyEdits[rowIndex][colKey] = newVal
    } else if (dirtyEdits[rowIndex]) {
      delete dirtyEdits[rowIndex][colKey]
      if (Object.keys(dirtyEdits[rowIndex]).length === 0) {
        delete dirtyEdits[rowIndex]
      }
    }
    toast.success(`Updated [${columnName}] at Row #${rowIndex + 1}`)
  }
}

function getForeignKeyInfo(col: ColumnDef) {
  return columnMetaMap.value[col.key || col.name]?.foreignKey ?? null
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

function sortBy(colKey: string) {
  if (sortCol.value === colKey) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : sortDir.value === 'desc' ? '' : 'asc'
    if (!sortDir.value) sortCol.value = ''
  } else {
    sortCol.value = colKey
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
  columnFilters.value = []
  quickSearch.value = ''
  onSearchInput()
}

function onSearchInput() {
  scrollTop.value = 0
}

// Context menus
function openCellContextMenu(e: MouseEvent, rowIndex: number, colKey: string) {
  cellContextMenu.visible = true
  cellContextMenu.x = e.clientX
  cellContextMenu.y = e.clientY
  cellContextMenu.rowIndex = rowIndex
  cellContextMenu.colKey = colKey
}

function openHeaderMenu(e: MouseEvent, colKey: string) {
  headerContextMenu.visible = true
  headerContextMenu.x = e.clientX
  headerContextMenu.y = e.clientY
  headerContextMenu.colKey = colKey
}

function copyTargetCell() {
  navigator.clipboard.writeText(String(getCellValue(cellContextMenu.rowIndex, cellContextMenu.colKey) ?? ''))
  toast.success('Copied cell value')
  cellContextMenu.visible = false
}

function copyTargetRowJson() {
  navigator.clipboard.writeText(JSON.stringify(getRowWithEdits(cellContextMenu.rowIndex), null, 2))
  toast.success('Copied row as JSON')
  cellContextMenu.visible = false
}

function copyTargetRowInsert() {
  const row = getRowWithEdits(cellContextMenu.rowIndex)
  const table = props.tableName || 'table'
  const cols = props.columns.map(c => `\`${c.orgName || c.name}\``).join(', ')
  const vals = props.columns.map(c => {
    const v = row[c.key || c.name]
    if (v === null || v === undefined) return 'NULL'
    if (typeof v === 'number') return String(v)
    return `'${String(v).replace(/'/g, "\\'")}'`
  }).join(', ')
  navigator.clipboard.writeText(`INSERT INTO \`${table}\` (${cols}) VALUES (${vals});`)
  toast.success('Copied INSERT SQL')
  cellContextMenu.visible = false
}

function inspectCurrentCell() {
  openValueInspector(
    getCellValue(cellContextMenu.rowIndex, cellContextMenu.colKey),
    cellContextMenu.colKey,
    cellContextMenu.rowIndex
  )
  cellContextMenu.visible = false
}

function sortFromHeader(dir: 'asc' | 'desc') {
  sortCol.value = headerContextMenu.colKey
  sortDir.value = dir
  headerContextMenu.visible = false
}

function copyColumnName() {
  const col = getColByKey(headerContextMenu.colKey)
  const name = col?.name || headerContextMenu.colKey
  navigator.clipboard.writeText(name)
  toast.success(`Copied column "${name}"`)
  headerContextMenu.visible = false
}

function closeAllContextMenus(e?: Event) {
  const target = e?.target as Node | null
  if (target && filterPopoverRef.value?.contains(target)) return
  cellContextMenu.visible = false
  headerContextMenu.visible = false
  fkPeekState.visible = false
  filterPopover.visible = false
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

watch(() => props.columns.map(c => c.key || c.name).join('\0'), (next, prev) => {
  const validKeys = new Set(props.columns.map(c => c.key || c.name))
  if (prev && next !== prev) {
    columnFilters.value = columnFilters.value.filter(f => validKeys.has(f.column))
  }
  if (sortCol.value && !validKeys.has(sortCol.value)) {
    sortCol.value = ''
    sortDir.value = ''
  }
})

watch(() => props.rows, () => {
  editingCell.value = null
  clearAllSelection()
  clearDirtyState()
}, { flush: 'post' })

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

.grid-header-cell,
.grid-corner-cell,
.grid-data-cell {
  height: v-bind('ROW_HEIGHT + "px"');
}

.grid-corner-cell {
  background: hsl(var(--muted) / 0.45);
}

.spreadsheet-viewport {
  scrollbar-gutter: stable;
}

.selection-active-cell {
  font-weight: 500;
}

/* Suppress default cell borders inside selection so the inset box-shadow outline reads cleanly */
.grid-data-cell.bg-primary\/\[0\.10\] {
  border-color: hsl(var(--primary) / 0.15);
}

.column-resizer {
  touch-action: none;
}

.column-resizer.is-resizing {
  background: hsl(var(--primary) / 0.12);
}
</style>
