<template>
  <div class="result-pane-font-mono flex flex-col overflow-hidden bg-background min-h-0 flex-1 font-mono">
    <!-- Result Tabs Bar (Current vs Pinned Results) -->
    <div v-if="resultStore.pinnedResults.length > 0" class="flex items-center h-8 bg-muted/20 border-b border-border px-2 select-none gap-1 flex-shrink-0">
      <!-- Current Result Tab -->
      <button
        class="inline-flex items-center gap-1.5 px-3 h-6 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded transition-all cursor-pointer border-none bg-transparent"
        :class="{ 'bg-background text-foreground shadow-[inset_0_-1.5px_0_0_var(--primary)] font-semibold border-b-transparent': resultStore.activeResultTabId === 'current' }"
        @click="resultStore.activeResultTabId = 'current'"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Active Result
      </button>

      <!-- Pinned Tabs -->
      <div 
        v-for="pin in resultStore.pinnedResults" 
        :key="pin.id"
        class="group inline-flex items-center gap-1.5 px-3 h-6 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded transition-all cursor-pointer relative"
        :class="{ 'bg-background text-foreground shadow-[inset_0_-1.5px_0_0_var(--primary)] font-semibold border-b-transparent': resultStore.activeResultTabId === pin.id }"
        @click="resultStore.activeResultTabId = pin.id"
      >
        <svg class="w-2.5 h-2.5 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span class="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap" :title="pin.sql">{{ getQueryLabel(pin.sql) }}</span>
        <!-- Close/Unpin button -->
        <button
          class="inline-flex items-center justify-center w-3.5 h-3.5 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent flex-shrink-0 cursor-pointer border-none bg-transparent opacity-0 group-hover:opacity-100 transition-opacity ml-1"
          title="Unpin"
          @click.stop="resultStore.unpinResult(pin.id)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>

    <Tabs v-model="resultStore.activeView" class="flex-1 flex flex-col overflow-hidden min-h-0">
      <div class="flex items-center h-10 bg-background border-b border-border flex-shrink-0 overflow-hidden px-2 justify-between">
        <TabsList class="h-8 bg-muted/40 p-0.5 rounded-md gap-0.5">
          <TabsTrigger
            v-for="view in VIEWS"
            :key="view.id"
            :value="view.id"
            class="inline-flex items-center px-3 h-full text-[11px] font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-sm transition-all"
          >{{ view.label }}</TabsTrigger>
        </TabsList>

        <div class="flex items-center gap-2">
          <template v-if="hasDirtyEdits">
            <Button
              variant="ghost"
              size="sm"
              class="text-[11px] h-7 px-3 gap-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 rounded-md transition-colors"
              :disabled="resultStore.savingEdits"
              @click="resultStore.revertAllEdits()"
            >Revert</Button>
            <Button
              variant="outline"
              size="sm"
              class="text-[11px] h-7 px-3 gap-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 rounded-md transition-colors border-blue-500/30"
              :disabled="resultStore.savingEdits || !editableTableName"
              @click="copyUpdateQueries"
              title="Copy UPDATE statements to clipboard"
            >Copy SQL</Button>
            <Button
              size="sm"
              class="text-[11px] h-7 px-3 gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md shadow-sm transition-colors"
              :disabled="resultStore.savingEdits || !editableTableName"
              @click="saveEdits"
            >
              <template v-if="resultStore.savingEdits">Saving&hellip;</template>
              <template v-else>Save</template>
            </Button>
          </template>

          <div class="flex items-center px-2 py-1 rounded bg-muted/30 border border-border/50 text-[10px] text-muted-foreground gap-3 shadow-inner">
            <span v-if="currentStatus === 'success'" class="whitespace-nowrap font-medium font-mono tabular-nums">
              {{ currentRows.length }} rows
            </span>
            <span v-if="currentStatus === 'success'" class="whitespace-nowrap font-medium font-mono tabular-nums text-muted-foreground/70">
              {{ currentDuration }}ms
            </span>
            <span v-else-if="currentStatus === 'running'" class="text-amber-500 flex items-center gap-2 font-medium">
              Running&hellip;
              <button
                class="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                :disabled="resultStore.cancelling"
                @click="resultStore.cancelQuery()"
              >{{ resultStore.cancelling ? 'Cancelling...' : 'Cancel' }}</button>
            </span>
          </div>

          <div class="flex items-center border border-border rounded-md bg-background overflow-hidden shadow-sm">
            <select
              v-if="currentColumns.length"
              class="h-7 w-[68px] bg-transparent px-2 text-[11px] font-medium text-foreground outline-none border-r border-border hover:bg-muted/30 transition-colors cursor-pointer"
              :value="resultStore.pageSize"
              @change="onPageSizeChange"
              aria-label="Page size"
            >
              <option :value="50">50</option>
              <option :value="100">100</option>
              <option :value="250">250</option>
              <option :value="500">500</option>
            </select>
            <button
              v-if="currentStatus === 'success' && currentColumns.length"
              class="inline-flex items-center justify-center h-7 px-2.5 transition-colors border-none bg-transparent cursor-pointer"
              :class="isCurrentResultPinned ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'"
              @click="togglePinCurrentResult"
              :title="isCurrentResultPinned ? 'Unpin this result' : 'Pin this result'"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </button>
            <div v-if="currentStatus === 'success' && currentColumns.length" class="w-px h-4 bg-border"></div>
            <button
              class="inline-flex items-center justify-center h-7 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              :disabled="!currentColumns.length"
              @click="uiStore.openExport()"
              title="Export"
            >
              <Download class="w-3.5 h-3.5" />
            </button>
            <div class="w-px h-4 bg-border"></div>
            <div v-if="resultStore.selectedRows.size > 0" class="contents">
              <button
                class="inline-flex items-center justify-center h-7 px-2 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-colors text-[10px] font-semibold gap-1 rounded-sm cursor-pointer border-none"
                @click="copySelectedRowsTsv"
                title="Copy selected rows as TSV (Excel friendly)"
              >
                <Copy class="w-3 h-3" />
                <span>Copy TSV ({{ resultStore.selectedRows.size }})</span>
              </button>
              <button
                class="inline-flex items-center justify-center h-7 px-2 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-colors text-[10px] font-semibold gap-1 rounded-sm cursor-pointer border-none ml-1"
                @click="copySelectedRowsJson"
                title="Copy selected rows as JSON"
              >
                <Copy class="w-3 h-3" />
                <span>JSON</span>
              </button>
              <div class="w-px h-4 bg-border mx-1"></div>
            </div>
            <button
              class="inline-flex items-center justify-center h-7 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              :class="{ 'text-primary bg-primary/10': showSearch }"
              :disabled="!currentColumns.length"
              @click="toggleSearch"
              title="Search Results"
            >
              <Search class="w-3.5 h-3.5" />
            </button>
            <div class="w-px h-4 bg-border"></div>
            <button
              class="inline-flex items-center justify-center h-7 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              :class="{ 'text-primary bg-primary/10': showFilters }"
              :disabled="!detectedTable"
              @click="showFilters = !showFilters"
              title="Filter"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
            </button>
            <div class="w-px h-4 bg-border"></div>
            <button
              class="inline-flex items-center justify-center h-7 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              @click="resultStore.runProcesslist()"
              title="Sessions"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </button>
          </div>

          <button
            class="inline-flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded transition-all cursor-pointer border-none bg-transparent"
            title="Hide Result Panel"
            @click="uiStore.toggleResultPanel()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>
      </div>

      <TabsContent value="table" class="flex-1 flex flex-col overflow-hidden min-h-0 p-0 m-0">
        <div v-if="showSearch" class="flex items-center h-7 px-2 bg-muted/20 border-b border-border gap-1.5 flex-shrink-0">

          <Input
            class="h-6 w-[180px] text-[11px]"
            placeholder="Search results&hellip;"
            aria-label="Search results"
            v-model="rawSearch"
            @input="onSearch"
          />
          <select
            class="h-6 w-[120px] rounded-md border border-input bg-background px-2 text-[11px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filter by column"
            v-model="filterCol"
          >
            <option value="">All columns</option>
            <option v-for="col in currentColumns" :key="col.name" :value="col.name">{{ col.name }}</option>
          </select>
        </div>

        <div v-if="showFilters && detectedTable" class="flex items-center gap-1.5 px-2 py-1 bg-muted/10 border-b border-border flex-wrap">
          <template v-for="col in currentColumns" :key="col.name">
            <div class="flex items-center gap-1">
              <label class="text-[9px] text-muted-foreground whitespace-nowrap">{{ col.name }}</label>
              <input
                v-model="filters[col.name]"
                :placeholder="col.type"
                class="h-6 w-[120px] rounded border border-input bg-background px-1.5 text-[10px] font-mono outline-none focus:border-primary"
                @keydown.enter="applyFilters"
              />
            </div>
          </template>
          <Button variant="outline" size="sm" class="text-[10px] h-6 px-2" @click="applyFilters">Apply</Button>
          <Button variant="ghost" size="sm" class="text-[10px] h-6 px-2" @click="clearFilters">Clear</Button>
        </div>

        <div class="flex-1 min-h-0 overflow-auto bg-background" ref="scrollAreaRef">
          <Table 
            id="result-grid-table"
            class="relative w-full text-left border-collapse focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-sm transition-shadow"
            tabindex="0"
            @keydown="handleTableKeydown"
          >
            <TableHeader class="sticky top-0 z-10 bg-muted shadow-[0_1px_0_0_var(--border)]">
              <TableRow class="hover:bg-transparent border-none">
                <TableHead class="w-[36px] text-center p-0 border-r border-border/30 bg-muted/80 backdrop-blur-md">
                  <div class="flex items-center justify-center w-full h-full">
                    <input
                      type="checkbox"
                      :checked="allSelected"
                      @change="toggleAll"
                      aria-label="Select all rows"
                      class="accent-primary cursor-pointer w-3.5 h-3.5 rounded-sm border-input"
                    />
                  </div>
                </TableHead>
                <TableHead class="w-[36px] text-center text-[9px] font-medium tracking-tight text-muted-foreground bg-muted/80 backdrop-blur-md border-r border-border/30 select-none py-1 px-2">#</TableHead>
                <TableHead
                  v-for="col in currentColumns"
                  :key="col.name"
                  class="text-[10.5px] font-medium tracking-tight text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap py-1.5 px-3 border-r border-border/30 last:border-r-0 bg-muted/80 backdrop-blur-md transition-colors select-none"
                  :class="{ 'text-right': isNumericColumn(col) }"
                  :aria-sort="getSortAria(col.name)"
                  @click="sortBy(col.name)"
                  @contextmenu.prevent="showHeaderContextMenu($event, col.name)"
                >
                  <div class="inline-flex items-center gap-1.5" :class="{ 'flex-row-reverse': isNumericColumn(col) }">
                    {{ col.name }}
                    <span v-if="sortCol === col.name" class="text-[10px] text-primary">
                      {{ sortDir === 'asc' ? '\u2191' : '\u2193' }}
                    </span>
                  </div>
                </TableHead>
                <TableHead v-if="isProcesslist" class="w-[70px] text-center text-[10.5px] font-medium text-muted-foreground bg-muted/80 backdrop-blur-md">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="currentStatus === 'running' && filteredRows.length === 0" class="hover:bg-transparent">
                <TableCell :colspan="currentColumns.length + (isProcesslist ? 3 : 2)" class="h-32 text-center text-muted-foreground border-b-0">
                  <div class="flex flex-col items-center justify-center gap-3">
                    <svg class="w-6 h-6 animate-spin text-primary opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    <span class="text-xs font-medium">Executing query...</span>
                  </div>
                </TableCell>
              </TableRow>
              <template v-else>
                <TableRow
                  v-for="item in filteredRows"
                  :key="item.key"
                  class="text-[11px] font-mono group transition-colors border-b border-border/40"
                  :class="[
                    item.index % 2 === 0 ? 'bg-transparent' : 'bg-muted/10',
                    resultStore.selectedRows.has(item.key) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/40'
                  ]"
                >
                <TableCell class="text-center p-0 w-[36px] border-r border-border/30 relative">
                  <div v-if="resultStore.selectedRows.has(item.key)" class="absolute left-0 top-0 bottom-0 w-[2.5px] bg-primary"></div>
                  <div class="flex items-center justify-center w-full h-full">
                    <input
                      type="checkbox"
                      :checked="resultStore.selectedRows.has(item.key)"
                      @change="resultStore.toggleRowSelection(item.key)"
                      :aria-label="`Select row ${item.index + 1}`"
                      class="accent-primary cursor-pointer w-3 h-3 rounded-sm border-input opacity-0 group-hover:opacity-100 transition-opacity"
                      :class="{ 'opacity-100': resultStore.selectedRows.has(item.key) }"
                    />
                  </div>
                </TableCell>
                <TableCell class="text-center py-1 px-2 w-[36px] border-r border-border/30 text-[9.5px] text-muted-foreground/60 select-none tabular-nums font-mono">{{ item.index + 1 }}</TableCell>
                <TableCell
                  v-for="(col, colIndex) in currentColumns"
                  :key="col.name"
                  class="max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap border-r border-border/30 last:border-r-0 cursor-cell hover:bg-muted/15 select-none transition-all duration-75 font-mono"
                  :class="[
                    resultStore.editingCell?.rowIndex === item.index && resultStore.editingCell?.colName === col.name 
                      ? 'p-0 ring-2 ring-primary ring-inset z-10 relative bg-background' 
                      : 'py-1 px-3',
                    getCellClass(item.row[col.name], col),
                    isNumericColumn(col) ? 'text-right tabular-nums font-mono text-[10px]' : '',
                    getCellSelectionClass(item.index, colIndex)
                  ]"
                  @mousedown="onCellMouseDown(item.index, col.name, $event)"
                  @mouseenter="onCellMouseEnter(item.index, col.name, $event)"
                  @dblclick="startEditCell(item.index, col.name, $event)"
                  @contextmenu.prevent="showContextMenu($event, item.row, item.index, col.name)"
                >
                  <template v-if="resultStore.editingCell?.rowIndex === item.index && resultStore.editingCell?.colName === col.name">
                    <input
                      ref="editInputRef"
                      v-model="resultStore.editValue"
                      class="w-full h-full bg-transparent border-none outline-none px-3 py-1 font-mono shadow-none focus:ring-0 focus:outline-none"
                      :class="[
                        isNumericColumn(col) ? 'text-right text-[10px]' : 'text-[11px]'
                      ]"
                      @keydown.enter="commitEditCell(item.index, col.name)"
                      @keydown.escape="resultStore.cancelEditing()"
                      @blur="commitEditCell(item.index, col.name)"
                      @click.stop
                    />
                  </template>
                  <template v-else-if="item.row[col.name] === null">
                    <span class="text-[9.5px] italic text-muted-foreground/45 select-none">NULL</span>
                  </template>
                  <template v-else-if="col.name === 'status'">
                    <Badge variant="outline" class="text-[9.5px] px-1.5 py-0 font-mono tracking-wide" :class="statusBadgeClass(String(item.row[col.name]))">{{ item.row[col.name] }}</Badge>
                  </template>
                  <template v-else-if="col.type === 'boolean'">
                    <span class="inline-flex items-center px-1 py-0.2 rounded-full text-[9.5px] font-semibold font-mono" :class="item.row[col.name] ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'">{{ item.row[col.name] ? 'TRUE' : 'FALSE' }}</span>
                  </template>
                  <template v-else>
                    <div class="flex items-center justify-between gap-1 group/fk w-full">
                      <span :title="String(item.row[col.name]).length > 50 ? String(item.row[col.name]) : undefined" class="truncate">
                        {{ formatCell(item.row[col.name], col) }}
                      </span>
                      <button 
                        v-if="getColumnForeignKey(col)"
                        class="text-primary/80 hover:text-primary cursor-pointer p-0.5 hover:bg-primary/10 rounded transition-colors opacity-0 group-hover/fk:opacity-100 focus:opacity-100 flex-shrink-0"
                        title="Preview referenced record"
                        @click.stop="(e) => showFkPreview(e, col, item.index, item.row[col.name])"
                      >
                        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                      </button>
                    </div>
                  </template>
                </TableCell>
                <TableCell v-if="isProcesslist" class="text-center p-1 border-l border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-[10px] h-5 px-2 text-destructive hover:text-white hover:bg-destructive rounded"
                    @click="resultStore.killSession(Number(item.row['Id']))"
                  >KILL</Button>
                </TableCell>
              </TableRow>
              </template>
            </TableBody>
          </Table>
          <div v-if="resultStore.hasMore && currentStatus === 'success' && !searchQuery.value" ref="sentinelRef" class="flex items-center justify-center py-3 text-xs text-muted-foreground">
            <template v-if="resultStore.loadingMore">
              <span class="animate-pulse">Loading more&hellip;</span>
            </template>
            <template v-else>
              <span>Scroll for more rows</span>
            </template>
          </div>
          <div v-if="filteredRows.length === 0 && currentStatus === 'success'" class="py-6 text-center text-xs text-muted-foreground">
            No results match your filter.
          </div>
        </div>
      </TabsContent>

      <TabsContent value="json" class="flex-1 flex flex-col overflow-hidden min-h-0 p-0 m-0">
        <div class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20 flex-shrink-0">
          <span class="text-[10px] text-muted-foreground">JSON</span>
          <Button variant="ghost" size="sm" class="text-[10px] h-6 px-2" @click="copyJson">Copy</Button>
        </div>
        <ScrollArea class="flex-1 min-h-0">
          <pre class="p-4 text-xs font-mono leading-relaxed text-foreground whitespace-pre" v-html="highlightedJson"></pre>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="plan" class="flex-1 flex flex-col overflow-hidden min-h-0 p-0 m-0">
        <ScrollArea class="h-full">
          <Table v-if="resultStore.planRows.length">
            <TableHeader>
              <TableRow class="hover:bg-transparent">
                <TableHead
                  v-for="col in resultStore.planColumns"
                  :key="col.name"
                  class="text-[10px] font-medium text-muted-foreground whitespace-nowrap"
                >
                  {{ col.name }}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(row, i) in resultStore.planRows" :key="i" class="text-[11px] font-mono">
                <TableCell
                  v-for="col in resultStore.planColumns"
                  :key="col.name"
                  class="p-1.5 px-2 max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap"
                  :title="row[col.name] === null ? undefined : String(row[col.name])"
                >
                  <span v-if="row[col.name] === null" class="italic text-muted-foreground">NULL</span>
                  <span v-else>{{ row[col.name] }}</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-else class="py-8 text-center text-xs text-muted-foreground">
            Run Explain to view the query plan.
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="messages" class="flex-1 overflow-auto min-h-0 p-4 m-0">
        <div
          v-for="(msg, i) in currentMessages"
          :key="i"
          class="text-xs font-mono mb-1"
          :class="currentError ? 'text-red-500' : 'text-muted-foreground'"
        >{{ msg }}</div>
        <div v-if="currentError" class="text-xs font-mono text-red-500 mb-1">
          <div class="flex items-center gap-2">
            <span>[{{ currentError.code }}] {{ truncateError(currentError.message) }}</span>
            <button
              v-if="currentError.message.length > 80"
              class="text-[10px] text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer underline"
              @click="showFullError = !showFullError"
            >{{ showFullError ? 'Less' : 'More' }}</button>
          </div>
          <div v-if="showFullError" class="mt-2 p-2 rounded bg-muted/50 border border-border text-[10px] leading-relaxed text-foreground whitespace-pre-wrap break-all">
            {{ currentError.message }}
          </div>
        </div>
        <div v-if="!currentMessages.length && !currentError" class="text-xs font-mono text-muted-foreground">
          No messages.
        </div>
      </TabsContent>

      <TabsContent value="history" class="flex-1 flex flex-col overflow-hidden min-h-0 p-0 m-0">
        <div class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20 flex-shrink-0">
          <span class="text-[10px] text-muted-foreground">Recent queries</span>
          <Button
            variant="ghost"
            size="sm"
            class="text-[10px] h-6 px-2"
            @click="resultStore.loadHistory()"
          >Refresh</Button>
        </div>
        <ScrollArea class="flex-1 min-h-0">
          <div v-if="resultStore.history.length === 0" class="py-8 text-center text-xs text-muted-foreground">
            No query history yet.
          </div>
          <div
            v-for="item in resultStore.history"
            :key="item.id"
            class="flex items-start gap-2 px-3 py-2 border-b border-border hover:bg-accent/30 cursor-pointer transition-colors"
            @click="restoreHistorySql(item.sql)"
          >
            <span
              class="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
              :class="item.error ? 'bg-red-500' : 'bg-emerald-500'"
            ></span>
            <div class="flex-1 min-w-0">
              <div class="text-[11px] font-mono text-foreground truncate" :title="item.sql">{{ item.sql }}</div>
              <div class="flex items-center gap-2 text-[9px] text-muted-foreground mt-0.5">
                <span>{{ formatTime(item.executed_at) }}</span>
                <span>&middot;</span>
                <span>{{ item.duration_ms }}ms</span>
                <span v-if="item.row_count > 0">&middot; {{ item.row_count }} rows</span>
                <span v-if="item.error" class="text-red-400 truncate" :title="item.error">Error</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>

    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="result-panel-context-menu fixed z-50 bg-popover border border-border rounded-md shadow-lg py-1 w-[180px] text-xs"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
        @contextmenu.prevent
      >
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer" @click="copyCellValue">Copy Cell Value</button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer" @click="copyColumnName(false)">Copy Column Name</button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer" @click="copyRowJson">Copy Row as JSON</button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer" @click="copyRowInsert">Copy Row as INSERT</button>
        <div class="h-px bg-border my-1"></div>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer" @click="copyAllJson">Copy All as JSON</button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer" @click="copySelectedJson">Copy Selected as JSON</button>
      </div>

      <div
        v-if="headerContextMenu.visible"
        class="result-panel-context-menu fixed z-50 bg-popover border border-border rounded-md shadow-lg py-1 w-[180px] text-xs"
        :style="{ left: headerContextMenu.x + 'px', top: headerContextMenu.y + 'px' }"
        @click.stop
        @contextmenu.prevent
      >
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer" @click="copyColumnName(true)">Copy Column Name</button>
        <div class="h-px bg-border my-1"></div>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer" @click="sortFromHeader('asc')">Sort Ascending</button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer" @click="sortFromHeader('desc')">Sort Descending</button>
      </div>
    </Teleport>
    
    <Dialog v-model:open="showUpdateModal">
      <DialogContent class="result-panel-dialog sm:max-w-[600px] bg-background border-border">
        <DialogHeader>
          <DialogTitle>Confirm Update</DialogTitle>
          <DialogDescription>
            The following queries will be executed. Please review them carefully.
          </DialogDescription>
        </DialogHeader>
        <div class="py-4">
          <ScrollArea class="h-[200px] w-full rounded-md border border-border bg-muted/30 p-4">
            <pre class="text-xs font-mono text-foreground whitespace-pre-wrap">{{ pendingUpdateSql }}</pre>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showUpdateModal = false" :disabled="resultStore.savingEdits">Cancel</Button>
          <Button class="bg-emerald-500 hover:bg-emerald-600 text-white" @click="confirmSaveEdits" :disabled="resultStore.savingEdits">
            <template v-if="resultStore.savingEdits">Executing&hellip;</template>
            <template v-else>Run Update</template>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Foreign Key Row Preview Tooltip -->
    <Teleport to="body">
      <div 
        v-if="activeFkPreview" 
        id="fk-preview-popover"
        class="fixed z-[1000] w-85 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl p-4 text-[12px] font-mono pointer-events-auto transition-all"
        :style="{ left: `${activeFkPreview.x}px`, top: `${activeFkPreview.y + 4}px` }"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border pb-2 mb-2">
          <span class="font-semibold text-muted-foreground">Referenced Row Preview</span>
          <span class="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground select-all">
            {{ activeFkPreview.referencedTable }}
          </span>
        </div>

        <!-- Content -->
        <div v-if="activeFkPreview.loading" class="flex flex-col gap-2 py-2">
          <div class="h-3 bg-muted/60 rounded w-3/4 animate-pulse"></div>
          <div class="h-3 bg-muted/60 rounded w-5/6 animate-pulse"></div>
          <div class="h-3 bg-muted/60 rounded w-1/2 animate-pulse"></div>
        </div>
        
        <div v-else-if="activeFkPreview.error" class="text-destructive font-mono text-[10px] py-2">
          Error loading record: {{ activeFkPreview.error }}
        </div>

        <div v-else-if="!activeFkPreview.data" class="text-muted-foreground italic py-2">
          Referenced record not found.
        </div>

        <div v-else class="max-h-52 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
          <div v-for="(val, key) in activeFkPreview.data" :key="key" class="flex border-b border-border/30 pb-1 last:border-0 last:pb-0">
            <span class="font-semibold text-muted-foreground w-1/3 truncate" :title="key">{{ key }}</span>
            <span class="text-foreground w-2/3 break-all pl-2 border-l border-border/20">
              <span v-if="val === null" class="italic text-muted-foreground/60">NULL</span>
              <span v-else>{{ val }}</span>
            </span>
          </div>
        </div>

        <!-- Footer/Close instruction -->
        <div class="text-[9px] text-muted-foreground/60 text-right mt-3 pt-2 border-t border-border/30">
          Click outside or press Escape to close
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download, Search, Copy } from '@lucide/vue'
import { useResultStore, type ResultView, type Column, type CellValue, type ResultRow } from '../stores/result'
import { useEditorStore } from '../stores/editor'
import { useSchemaStore } from '../stores/schema'
import { useUiStore } from '../stores/ui'
import { toast } from 'vue-sonner'

const resultStore = useResultStore()
const schemaStore = useSchemaStore()
const uiStore = useUiStore()

const currentColumns = computed(() => {
  if (resultStore.activeResultTabId === 'current') return resultStore.columns
  const pin = resultStore.pinnedResults.find(p => p.id === resultStore.activeResultTabId)
  return pin ? pin.columns : []
})

const currentRows = computed(() => {
  if (resultStore.activeResultTabId === 'current') return resultStore.rows
  const pin = resultStore.pinnedResults.find(p => p.id === resultStore.activeResultTabId)
  return pin ? pin.rows : []
})

const currentDuration = computed(() => {
  if (resultStore.activeResultTabId === 'current') return resultStore.duration
  const pin = resultStore.pinnedResults.find(p => p.id === resultStore.activeResultTabId)
  return pin ? pin.duration : 0
})

const currentStatus = computed(() => {
  if (resultStore.activeResultTabId === 'current') return resultStore.status
  const pin = resultStore.pinnedResults.find(p => p.id === resultStore.activeResultTabId)
  return pin ? 'success' : 'idle'
})

const currentMessages = computed(() => {
  if (resultStore.activeResultTabId === 'current') return resultStore.messages
  const pin = resultStore.pinnedResults.find(p => p.id === resultStore.activeResultTabId)
  return pin ? pin.messages : []
})

const currentError = computed(() => {
  if (resultStore.activeResultTabId === 'current') return resultStore.error
  const pin = resultStore.pinnedResults.find(p => p.id === resultStore.activeResultTabId)
  return pin ? pin.error : null
})

const currentSql = computed(() => {
  if (resultStore.activeResultTabId === 'current') return resultStore.lastSql
  const pin = resultStore.pinnedResults.find(p => p.id === resultStore.activeResultTabId)
  return pin ? pin.sql : ''
})

const isCurrentResultPinned = computed(() => {
  if (resultStore.activeResultTabId !== 'current') return true
  return resultStore.pinnedResults.some(p => p.sql === resultStore.lastSql)
})

function togglePinCurrentResult() {
  if (resultStore.activeResultTabId !== 'current') {
    resultStore.unpinResult(resultStore.activeResultTabId)
    return
  }
  const existingIndex = resultStore.pinnedResults.findIndex(p => p.sql === resultStore.lastSql)
  if (existingIndex >= 0) {
    resultStore.unpinResult(resultStore.pinnedResults[existingIndex].id)
  } else {
    resultStore.pinCurrentResult()
  }
}

function getQueryLabel(sql: string): string {
  const cleaned = sql.trim().replace(/\s+/g, ' ')
  const fromMatch = cleaned.match(/FROM\s+([a-zA-Z0-9_\.`"'\-]+)/i)
  if (fromMatch && fromMatch[1]) {
    return fromMatch[1].replace(/[`"']/g, '')
  }
  return cleaned.length > 20 ? cleaned.slice(0, 18) + '...' : cleaned
}

const scrollAreaRef = ref<InstanceType<typeof ScrollArea> | null>(null)
const sentinelRef = ref<HTMLDivElement | null>(null)
const editInputRef = ref<HTMLInputElement | null>(null)
const showFullError = ref(false)
const showFilters = ref(false)
const showSearch = ref(false)
const filters = reactive<Record<string, string>>({})
const showUpdateModal = ref(false)
const pendingUpdateSql = ref('')
let observer: IntersectionObserver | null = null

const detectedTable = computed(() => detectTableFromSql(currentSql.value))
const isProcesslist = computed(() => {
  const cols = currentColumns.value.map(c => c.name)
  return cols.includes('Id') && cols.includes('Command') && cols.includes('Info')
})

function detectTableFromSql(sql: string): string | null {
  console.log('[detectTableFromSql] original sql:', sql)
  if (!sql) return null
  
  // Strip comments to safely check the first real keyword
  const noComments = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()
    
  const clean = noComments.replace(/;+$/, '')
  console.log('[detectTableFromSql] clean sql:', clean)
  
  if (/\bSELECT\b/i.test(clean)) {
    // Match FROM followed by any valid table name characters (including hyphens, spaces in quotes, and $)
    const fromRegex = /\bFROM\s+((?:`[^`]+`|"[^"]+"|\[[^\]]+\]|[a-zA-Z0-9_.$]+)(?:\s*\.\s*(?:`[^`]+`|"[^"]+"|\[[^\]]+\]|[a-zA-Z0-9_.$]+))?)/i
    const fromMatch = clean.match(fromRegex)
    console.log('[detectTableFromSql] fromMatch:', fromMatch)
    if (fromMatch) {
      let tableName = fromMatch[1]
      console.log('[detectTableFromSql] raw tableName:', tableName)
      const finalName = tableName.replace(/[`"\[\]']/g, '').trim()
      console.log('[detectTableFromSql] final name:', finalName)
      
      // If the query does not specify a schema (no dot) and we have a lastDatabase, attach the selected schema!
      if (!finalName.includes('.') && resultStore.lastDatabase) {
        return `${resultStore.lastDatabase}.${finalName}`
      }
      return finalName
    }
  }
  return null
}

function getRawTableName(name: string): string {
  if (!name) return ''
  const parts = name.split('.')
  return parts[parts.length - 1].replace(/[`"\[\]']/g, '').trim()
}

const editableTableName = computed(() => {
  return detectTableFromSql(currentSql.value)
})

const pkColumns = computed<string[]>(() => {
  const tableName = editableTableName.value
  console.log('[pkColumns] editableTableName:', tableName)
  if (!tableName) return []
  const rawName = getRawTableName(tableName).toLowerCase()
  const tableKey = Object.keys(schemaStore.detailsByTable).find(k => {
    return getRawTableName(k).toLowerCase() === rawName
  })
  console.log('[pkColumns] found tableKey:', tableKey)
  if (!tableKey) {
    console.log('[pkColumns] detailsByTable keys:', Object.keys(schemaStore.detailsByTable))
    return []
  }
  const details = schemaStore.detailsByTable[tableKey]
  if (!details) return []
  const pks = details.columns.filter(c => c.pk).map(c => c.name)
  console.log('[pkColumns] final primary keys:', pks)
  return pks
})

const hasDirtyEdits = computed(() => {
  if (resultStore.activeResultTabId !== 'current') return false
  return Object.keys(resultStore.dirtyCells).length > 0
})

async function startEditCell(rowIndex: number, colName: string, _e: MouseEvent) {
  if (resultStore.activeResultTabId !== 'current') return
  console.log('[startEditCell] Clicked cell. lastSql is:', currentSql.value)
  const manualDetect = detectTableFromSql(currentSql.value)
  console.log('[startEditCell] manualDetect returned:', manualDetect)
  
  if (!editableTableName.value) {
    if (!/\bSELECT\b/i.test(resultStore.lastSql)) {
      toast.error('Cannot edit data', { description: 'Data can only be edited from a SELECT query on a physical table.' })
    } else {
      toast.error('Cannot edit data', { description: `Could not detect the table name from the query. Regex detected: ${manualDetect}` })
    }
    return
  }

  const tableName = editableTableName.value
  const rawName = getRawTableName(tableName).toLowerCase()
  let tableKey = Object.keys(schemaStore.detailsByTable).find(k => {
    return getRawTableName(k).toLowerCase() === rawName
  })
  
  if (!tableKey) {
    try {
      await schemaStore.fetchTableDetails(getRawTableName(tableName))
      tableKey = Object.keys(schemaStore.detailsByTable).find(k => {
        return getRawTableName(k).toLowerCase() === rawName
      })
    } catch (e) {
      console.error('Failed to fetch table details for editing:', e)
    }
  }
  
  const pkCols = pkColumns.value
  console.log('[startEditCell] pkCols:', pkCols)
  if (pkCols.length === 0) {
    toast.error('Cannot edit data', { description: 'The table must have at least one primary key column.' })
    return
  }
  resultStore.startEditing(rowIndex, colName)
  nextTick(() => {
    const el = editInputRef.value
    if (Array.isArray(el)) {
      el[0]?.focus()
      el[0]?.select()
    } else {
      el?.focus()
      el?.select()
    }
  })
}

async function commitEditCell(rowIndex: number, colName: string) {
  if (resultStore.editingCell?.rowIndex !== rowIndex || resultStore.editingCell?.colName !== colName) {
    return
  }
  
  const row = resultStore.rows[rowIndex]
  if (row && String(row[colName] ?? '') === resultStore.editValue) {
    resultStore.cancelEditing()
    return
  }

  resultStore.commitEdit(rowIndex, colName, resultStore.editValue)
  // We do not auto-save. The user must explicitly click "Save" to open the modal.
}

async function saveEdits() {
  const tableName = editableTableName.value
  if (!tableName) return
  
  const pks = pkColumns.value
  if (pks.length === 0) {
    toast.error('Cannot generate SQL', { description: 'The table must have at least one primary key column.' })
    return
  }

  const statements: string[] = []
  
  for (const [rowKey, cells] of Object.entries(resultStore.dirtyCells)) {
    const rowIndex = parseInt(rowKey)
    const row = resultStore.rows[rowIndex]
    if (!row) continue
    
    const setClauses: string[] = []
    for (const [colName, val] of Object.entries(cells)) {
      const colDef = resultStore.columns.find(c => c.name === colName)
      const type = colDef ? colDef.type : 'string'
      const updateColName = colDef?.orgName || colName
      
      let escapedVal = 'NULL'
      if (val !== null) {
         escapedVal = escapeVal(String(val), type)
      }
      setClauses.push(`${escapeId(updateColName)} = ${escapedVal}`)
    }
    
    if (setClauses.length === 0) continue
    
    const whereClauses: string[] = []
    for (const pk of pks) {
      const colDef = resultStore.columns.find(c => {
        const bareOrgTable = c.orgTable ? (c.orgTable.includes('.') ? c.orgTable.split('.').pop() : c.orgTable) : '';
        const bareTableName = tableName.includes('.') ? tableName.split('.').pop() : tableName;
        return (c.orgName || c.name) === pk && (!c.orgTable || bareOrgTable?.toLowerCase() === bareTableName?.toLowerCase());
      })
      const pkType = colDef ? colDef.type : 'string'
      const gridColName = colDef ? colDef.name : pk
      const pkVal = row[gridColName]
      if (pkVal === null || pkVal === undefined) {
         whereClauses.push(`${escapeId(pk)} IS NULL`)
      } else {
         whereClauses.push(`${escapeId(pk)} = ${escapeVal(String(pkVal), pkType)}`)
      }
    }
    
    const sql = `UPDATE ${escapeId(tableName)} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`
    statements.push(sql)
  }
  
  if (statements.length === 0) {
    toast.info('No changes to save')
    return
  }
  
  pendingUpdateSql.value = statements.join('\n')
  showUpdateModal.value = true
}

async function confirmSaveEdits() {
  const tableName = editableTableName.value
  if (!tableName) return
  
  const success = await resultStore.saveEdits(tableName, pkColumns.value)
  showUpdateModal.value = false
  if (success) {
    toast.success('Edits saved successfully')
  } else {
    resultStore.activeView = 'messages'
    toast.error('Failed to save edits', { description: 'Check the Messages tab for details.' })
  }
}

function copyUpdateQueries() {
  const tableName = editableTableName.value
  if (!tableName) return
  
  const pks = pkColumns.value
  if (pks.length === 0) {
    toast.error('Cannot generate SQL', { description: 'The table must have at least one primary key column.' })
    return
  }

  const statements: string[] = []
  
  for (const [rowKey, cells] of Object.entries(resultStore.dirtyCells)) {
    const rowIndex = parseInt(rowKey)
    const row = resultStore.rows[rowIndex]
    if (!row) continue
    
    const setClauses: string[] = []
    for (const [colName, val] of Object.entries(cells)) {
      const colDef = resultStore.columns.find(c => c.name === colName)
      const type = colDef ? colDef.type : 'string'
      
      let escapedVal = 'NULL'
      if (val !== null) {
         escapedVal = escapeVal(String(val), type)
      }
      setClauses.push(`${escapeId(colName)} = ${escapedVal}`)
    }
    
    if (setClauses.length === 0) continue
    
    const whereClauses: string[] = []
    for (const pk of pks) {
      const colDef = resultStore.columns.find(c => {
        const bareOrgTable = c.orgTable ? (c.orgTable.includes('.') ? c.orgTable.split('.').pop() : c.orgTable) : '';
        const bareTableName = tableName.includes('.') ? tableName.split('.').pop() : tableName;
        return (c.orgName || c.name) === pk && (!c.orgTable || bareOrgTable?.toLowerCase() === bareTableName?.toLowerCase());
      })
      const pkType = colDef ? colDef.type : 'string'
      const gridColName = colDef ? colDef.name : pk
      const pkVal = row[gridColName]
      if (pkVal === null || pkVal === undefined) {
         whereClauses.push(`${escapeId(pk)} IS NULL`)
      } else {
         whereClauses.push(`${escapeId(pk)} = ${escapeVal(String(pkVal), pkType)}`)
      }
    }
    
    const sql = `UPDATE ${escapeId(tableName)} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`
    statements.push(sql)
  }
  
  if (statements.length > 0) {
    navigator.clipboard.writeText(statements.join('\n'))
  } else {
    toast.info('No changes', { description: 'There are no edits to copy.' })
  }
}

function escapeId(id: string): string {
  if (id.includes('.')) {
    return id.split('.')
      .map(part => '`' + part.replace(/`/g, '``') + '`')
      .join('.')
  }
  return '`' + id.replace(/`/g, '``') + '`'
}

function escapeVal(val: string, colType: string): string {
  if (val === '') return "''"
  if (colType === 'integer' || colType === 'numeric' || colType === 'bigint' || colType === 'decimal') {
    const num = Number(val)
    if (!isNaN(num)) return String(num)
  }
  return "'" + val.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
}

async function applyFilters() {
  const table = detectedTable.value
  if (!table) return

  const clauses: string[] = []
  for (const col of resultStore.columns) {
    const val = filters[col.name]
    if (val !== undefined && val !== '') {
      clauses.push(`${escapeId(col.name)} = ${escapeVal(val, col.type)}`)
    }
  }
  if (clauses.length === 0) return

  const sql = `SELECT * FROM ${escapeId(table)} WHERE ${clauses.join(' AND ')} LIMIT ${resultStore.pageSize};`
  await resultStore.runQuery(sql)
}

function clearFilters() {
  for (const key of Object.keys(filters)) {
    delete filters[key]
  }
  showFilters.value = false
}

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  row: null as ResultRow | null,
  rowIndex: -1,
  colName: '',
})

function showContextMenu(e: MouseEvent, row: ResultRow, rowIndex: number, colName: string) {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.row = row
  contextMenu.rowIndex = rowIndex
  contextMenu.colName = colName
}

function hideContextMenu() {
  contextMenu.visible = false
}

const headerContextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  colName: '',
})

function showHeaderContextMenu(e: MouseEvent, colName: string) {
  headerContextMenu.visible = true
  headerContextMenu.x = e.clientX
  headerContextMenu.y = e.clientY
  headerContextMenu.colName = colName
}

function hideHeaderContextMenu() {
  headerContextMenu.visible = false
}

function hideAllContextMenus() {
  hideContextMenu()
  hideHeaderContextMenu()
}

function copyColumnName(isHeader = true) {
  const colName = isHeader ? headerContextMenu.colName : contextMenu.colName
  if (colName) {
    navigator.clipboard.writeText(colName)
    toast.success(`Copied column name "${colName}"`)
  }
  if (isHeader) hideHeaderContextMenu()
  else hideContextMenu()
}

function sortFromHeader(dir: 'asc' | 'desc') {
  if (headerContextMenu.colName) {
    const colName = headerContextMenu.colName
    if (sortCol.value !== colName) {
      sortBy(colName)
    }
    if (sortDir.value !== dir) {
      sortBy(colName)
    }
  }
  hideHeaderContextMenu()
}

function copyCellValue() {
  const val = contextMenu.row?.[contextMenu.colName]
  if (val !== undefined && val !== null) {
    navigator.clipboard.writeText(String(val))
  }
  hideContextMenu()
}

function copyRowJson() {
  if (contextMenu.row) {
    navigator.clipboard.writeText(JSON.stringify(contextMenu.row, null, 2))
  }
  hideContextMenu()
}

function copyRowInsert() {
  const row = contextMenu.row
  if (!row) { hideContextMenu(); return }
  const cols = currentColumns.value
  const names = cols.map(c => `\`${c.name}\``).join(', ')
  const vals = cols.map(c => {
    const v = row[c.name]
    if (v === null || v === undefined) return 'NULL'
    if (typeof v === 'number') return String(v)
    return `'${String(v).replace(/'/g, "\\'")}'`
  }).join(', ')
  const insert = `INSERT INTO \`${editableTableName.value ?? 'table'}\` (${names}) VALUES (${vals});`
  navigator.clipboard.writeText(insert)
  hideContextMenu()
}

function copyAllJson() {
  navigator.clipboard.writeText(JSON.stringify(currentRows.value, null, 2))
  hideContextMenu()
}

function copySelectedJson() {
  const selected = currentRows.value.filter((_, i) => resultStore.selectedRows.has(String(i)))
  navigator.clipboard.writeText(JSON.stringify(selected.length ? selected : currentRows.value, null, 2))
  hideContextMenu()
}

function copySelectedRowsTsv() {
  const selectedIndices = Array.from(resultStore.selectedRows).map(Number).sort((a, b) => a - b)
  if (!selectedIndices.length) return
  
  const headers = currentColumns.value.map(c => c.name).join('\t')
  const lines = selectedIndices.map(idx => {
    const row = currentRows.value[idx]
    if (!row) return ''
    return currentColumns.value.map(c => {
      const val = row[c.name]
      return val === null || val === undefined ? '' : String(val)
    }).join('\t')
  })
  
  const text = [headers, ...lines].join('\n')
  navigator.clipboard.writeText(text)
  toast.success(`Copied ${selectedIndices.length} rows to clipboard (TSV)`)
}

function copySelectedRowsJson() {
  const selected = currentRows.value.filter((_, i) => resultStore.selectedRows.has(String(i)))
  if (!selected.length) return
  navigator.clipboard.writeText(JSON.stringify(selected, null, 2))
  toast.success(`Copied ${selected.length} rows to clipboard (JSON)`)
}

onMounted(() => {
  document.addEventListener('click', hideAllContextMenus)
  document.addEventListener('click', handleGlobalFkClick)
  document.addEventListener('keydown', handleGlobalFkKeydown)
  window.addEventListener('mouseup', onGlobalMouseUp)
  resultStore.loadHistory()
  if (resultStore.status === 'success') {
    loadForeignKeysForColumns()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', hideAllContextMenus)
  document.removeEventListener('click', handleGlobalFkClick)
  document.removeEventListener('keydown', handleGlobalFkKeydown)
  window.removeEventListener('mouseup', onGlobalMouseUp)
  if (observer) observer.disconnect()
  if (searchTimer) clearTimeout(searchTimer)
})

function setupSentinel() {
  nextTick(() => {
    if (observer) observer.disconnect()
    if (!sentinelRef.value) return
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && resultStore.hasMore && !resultStore.loadingMore) {
          resultStore.fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.value)
  })
}

watch(() => resultStore.hasMore, (val) => {
  if (val) setupSentinel()
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

const VIEWS = [
  { id: 'table',    label: 'Table' },
  { id: 'json',     label: 'JSON' },
  { id: 'plan',     label: 'Execution Plan' },
  { id: 'messages', label: 'Messages' },
  { id: 'history',  label: 'History' },
] as const

const rawSearch = ref('')
const filterCol = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
const searchQuery = ref('')

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { searchQuery.value = rawSearch.value }, 150)
}

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (!showSearch.value) {
    rawSearch.value = ''
    searchQuery.value = ''
  }
}



const sortCol = ref('')
const sortDir = ref<'asc' | 'desc' | ''>('')
type FilteredRow = {
  key: string
  index: number
  row: ResultRow
}

function sortBy(col: string) {
  if (sortCol.value === col) {
    sortDir.value = sortDir.value === '' ? 'asc' : sortDir.value === 'asc' ? 'desc' : ''
    if (sortDir.value === '') sortCol.value = ''
  } else {
    sortCol.value = col
    sortDir.value = 'asc'
  }
}

function getSortAria(col: string) {
  if (sortCol.value !== col) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

const filteredRows = computed<FilteredRow[]>(() => {
  let rows = currentRows.value.map((row, index) => ({ row, index, key: String(index) }))
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    rows = rows.filter(item => {
      const cols = filterCol.value ? [filterCol.value] : currentColumns.value.map(c => c.name)
      return cols.some(c => String(item.row[c] ?? '').toLowerCase().includes(q))
    })
  }
  if (sortCol.value && sortDir.value) {
    const col = sortCol.value
    const dir = sortDir.value
    rows.sort((a, b) => {
      const av = a.row[col]; const bv = b.row[col]
      if (av === null) return 1; if (bv === null) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return dir === 'asc' ? cmp : -cmp
    })
  }
  return rows
})

const allSelected = computed(() =>
  filteredRows.value.length > 0 &&
  filteredRows.value.every(item => resultStore.selectedRows.has(item.key))
)

function toggleAll() {
  if (allSelected.value) resultStore.clearSelection()
  else filteredRows.value.forEach(item => resultStore.selectedRows.add(item.key))
}

function isNumericColumn(col: Column): boolean {
  const type = (col.type || '').toLowerCase()
  return ['integer', 'numeric', 'decimal', 'bigint', 'int', 'float', 'double', 'real', 'number'].some(t => type.includes(t))
}

function isDateColumn(col: Column): boolean {
  const type = (col.type || '').toLowerCase()
  return ['timestamp', 'datetime', 'date', 'time'].some(t => type.includes(t))
}

function getCellClass(val: CellValue, col: Column): string {
  if (val === null) return ''
  if (isNumericColumn(col)) return 'text-syn-number'
  if (isDateColumn(col)) return 'text-syn-string font-medium'
  return ''
}

function truncateError(msg: string): string {
  if (msg.length <= 80) return msg
  return msg.slice(0, 80) + '\u2026'
}

function formatCell(val: CellValue, _col: Column): string {
  if (val === null) return 'NULL'
  const s = String(val)
  if (s.length > 50) return s.slice(0, 50) + '\u2026'
  return s
}

function statusBadgeClass(val: string): string {
  const v = val.toLowerCase()
  if (v === 'active') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
  if (v === 'inactive') return 'bg-muted text-muted-foreground border-border'
  return ''
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const highlightedJson = computed(() => {
  const json = JSON.stringify(currentRows.value, null, 2)
  const escaped = escapeHtml(json)
  return escaped
    .replace(/(&quot;.*?&quot;)(: )/g, '<span class="text-blue-400">$1</span>$2')
    .replace(/: (&quot;.*?&quot;)/g, ': <span class="text-yellow-500">$1</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="text-red-400">$1</span>')
    .replace(/: (true|false)/g, ': <span class="text-emerald-500">$1</span>')
    .replace(/: (null)/g, ': <span class="italic text-muted-foreground">$1</span>')
})

function copyJson() {
  navigator.clipboard.writeText(JSON.stringify(currentRows.value, null, 2))
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return iso }
}

function onPageSizeChange(e: Event) {
  const val = parseInt((e.target as HTMLSelectElement).value)
  resultStore.setPageSize(val)
}

function restoreHistorySql(sql: string) {
  const editorStore = useEditorStore()
  if (editorStore.activeTabId) {
    editorStore.updateSql(editorStore.activeTabId, sql)
  }
}

// Foreign Key Hover Previews Logic
import { invoke } from '@tauri-apps/api/core'
import { useConnectionStore } from '../stores/connection'

const connStore = useConnectionStore()

const foreignKeysCache = ref<Record<string, { column_name: string; referenced_table: string; referenced_column: string }[]>>({})

const activeFkPreview = ref<{
  rowIndex: number
  colName: string
  colValue: string
  referencedTable: string
  referencedColumn: string
  loading: boolean
  data: any | null
  error: string | null
  x: number
  y: number
} | null>(null)

async function loadForeignKeysForColumns() {
  const tablesToLoad = new Set<string>()
  for (const col of resultStore.columns) {
    if (col.orgTable) {
      tablesToLoad.add(col.orgTable)
    }
  }

  for (const table of tablesToLoad) {
    if (foreignKeysCache.value[table]) continue
    try {
      const fks = await invoke<any[]>('fetch_table_foreign_keys', {
        table,
        id: connStore.activeId,
        database: connStore.activeConnection?.database || null
      })
      foreignKeysCache.value[table] = fks
    } catch (e) {
      console.error(`Failed to load foreign keys for table ${table}:`, e)
      foreignKeysCache.value[table] = []
    }
  }
}

function getColumnForeignKey(col: Column) {
  if (!col.orgTable) return null
  const fks = foreignKeysCache.value[col.orgTable]
  if (!fks) return null
  const colName = col.orgName || col.name
  return fks.find(fk => fk.column_name.toLowerCase() === colName.toLowerCase()) || null
}

async function showFkPreview(event: MouseEvent, col: Column, rowIndex: number, cellValue: CellValue) {
  if (cellValue === null || cellValue === undefined) return
  const fk = getColumnForeignKey(col)
  if (!fk) return

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  
  activeFkPreview.value = {
    rowIndex,
    colName: col.name,
    colValue: String(cellValue),
    referencedTable: fk.referenced_table,
    referencedColumn: fk.referenced_column,
    loading: true,
    data: null,
    error: null,
    x: rect.left,
    y: rect.bottom + window.scrollY,
  }

  try {
    const data = await invoke<any>('fetch_referenced_row', {
      table: fk.referenced_table,
      column: fk.referenced_column,
      value: String(cellValue),
      id: connStore.activeId,
      database: connStore.activeConnection?.database || null
    })
    if (activeFkPreview.value && activeFkPreview.value.rowIndex === rowIndex && activeFkPreview.value.colName === col.name) {
      activeFkPreview.value.data = data
      activeFkPreview.value.loading = false
    }
  } catch (e) {
    if (activeFkPreview.value && activeFkPreview.value.rowIndex === rowIndex && activeFkPreview.value.colName === col.name) {
      activeFkPreview.value.error = String(e)
      activeFkPreview.value.loading = false
    }
  }
}

function closeFkPreview() {
  activeFkPreview.value = null
}

function handleGlobalFkClick(e: MouseEvent) {
  if (!activeFkPreview.value) return
  const popover = document.getElementById('fk-preview-popover')
  if (popover && !popover.contains(e.target as Node) && !(e.target as HTMLElement).closest('button[title="Preview referenced record"]')) {
    closeFkPreview()
  }
}

function handleGlobalFkKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeFkPreview()
  }
}

watch(() => resultStore.status, (newStatus) => {
  if (newStatus === 'success') {
    loadForeignKeysForColumns()
  }
})

function focus() {
  const el = document.getElementById('result-grid-table')
  el?.focus()
}

const anchorCell = ref<{ rowIndex: number; colIndex: number } | null>(null)
const focusCell = ref<{ rowIndex: number; colIndex: number } | null>(null)
const isMouseDown = ref(false)

function onGlobalMouseUp() {
  isMouseDown.value = false
}

function onCellMouseDown(rowIndex: number, colName: string, event: MouseEvent) {
  if (event.button !== 0) return // Left click only
  isMouseDown.value = true
  const colIndex = currentColumns.value.findIndex(c => c.name === colName)
  
  if (event.shiftKey && anchorCell.value) {
    focusCell.value = { rowIndex, colIndex }
  } else {
    anchorCell.value = { rowIndex, colIndex }
    focusCell.value = { rowIndex, colIndex }
  }
  
  focus()
  // event.preventDefault() // Prevents default text dragging select
}

function onCellMouseEnter(rowIndex: number, colName: string, _event: MouseEvent) {
  if (!isMouseDown.value) return
  const colIndex = currentColumns.value.findIndex(c => c.name === colName)
  focusCell.value = { rowIndex, colIndex }
}

function selectCell(rowIndex: number, colName: string, event?: MouseEvent) {
  const colIndex = currentColumns.value.findIndex(c => c.name === colName)
  if (event?.shiftKey && anchorCell.value) {
    focusCell.value = { rowIndex, colIndex }
  } else {
    anchorCell.value = { rowIndex, colIndex }
    focusCell.value = { rowIndex, colIndex }
  }
  focus()
}

function getCellSelectionClass(rowIndex: number, colIndex: number) {
  if (!anchorCell.value || !focusCell.value) return ''
  
  const minRow = Math.min(anchorCell.value.rowIndex, focusCell.value.rowIndex)
  const maxRow = Math.max(anchorCell.value.rowIndex, focusCell.value.rowIndex)
  const minCol = Math.min(anchorCell.value.colIndex, focusCell.value.colIndex)
  const maxCol = Math.max(anchorCell.value.colIndex, focusCell.value.colIndex)
  
  const inRange = rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol
  if (!inRange) return ''
  
  if (focusCell.value.rowIndex === rowIndex && focusCell.value.colIndex === colIndex) {
    return 'ring-2 ring-primary ring-inset bg-primary/15'
  }
  
  return 'bg-primary/10'
}

function handleTableKeydown(e: KeyboardEvent) {
  if (resultStore.editingCell) return

  const meta = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? e.metaKey : e.ctrlKey
  
  // Copy selected range (TSV formatted)
  if (meta && e.key.toLowerCase() === 'c') {
    if (anchorCell.value && focusCell.value) {
      e.preventDefault()
      copySelectedRange()
    }
    return
  }

  if (focusCell.value && anchorCell.value) {
    const { rowIndex, colIndex } = focusCell.value
    const shift = e.shiftKey
    
    let nextRow = rowIndex
    let nextCol = colIndex
    
    if (e.key === 'ArrowUp') {
      if (rowIndex > 0) {
        e.preventDefault()
        nextRow = rowIndex - 1
      }
    } else if (e.key === 'ArrowDown') {
      if (rowIndex < currentRows.value.length - 1) {
        e.preventDefault()
        nextRow = rowIndex + 1
      }
    } else if (e.key === 'ArrowLeft') {
      if (colIndex > 0) {
        e.preventDefault()
        nextCol = colIndex - 1
      }
    } else if (e.key === 'ArrowRight') {
      if (colIndex < currentColumns.value.length - 1) {
        e.preventDefault()
        nextCol = colIndex + 1
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const colName = currentColumns.value[colIndex].name
      startEditCell(rowIndex, colName, e)
      return
    } else {
      return
    }
    
    focusCell.value = { rowIndex: nextRow, colIndex: nextCol }
    if (!shift) {
      anchorCell.value = { rowIndex: nextRow, colIndex: nextCol }
    }
    scrollToActiveCell()
  }
}

function copySelectedRange() {
  if (!anchorCell.value || !focusCell.value) return
  
  const minRow = Math.min(anchorCell.value.rowIndex, focusCell.value.rowIndex)
  const maxRow = Math.max(anchorCell.value.rowIndex, focusCell.value.rowIndex)
  const minCol = Math.min(anchorCell.value.colIndex, focusCell.value.colIndex)
  const maxCol = Math.max(anchorCell.value.colIndex, focusCell.value.colIndex)
  
  const lines: string[] = []
  for (let r = minRow; r <= maxRow; r++) {
    const row = currentRows.value[r]
    const rowValues: string[] = []
    for (let c = minCol; c <= maxCol; c++) {
      const colName = currentColumns.value[c].name
      const val = row?.[colName]
      rowValues.push(val === null || val === undefined ? '' : String(val))
    }
    lines.push(rowValues.join('\t'))
  }
  
  const text = lines.join('\n')
  navigator.clipboard.writeText(text)
  toast.success(`Copied selection (${maxRow - minRow + 1}x${maxCol - minCol + 1}) to clipboard`)
}

function scrollToActiveCell() {
  nextTick(() => {
    const activeEl = document.querySelector('#result-grid-table .ring-primary')
    activeEl?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
}

watch(() => resultStore.rows, () => {
  anchorCell.value = null
  focusCell.value = null
})

defineExpose({ focus })
</script>

<style>
.result-pane-font-mono,
.result-pane-font-mono *,
.result-panel-context-menu,
.result-panel-context-menu *,
.result-panel-dialog,
.result-panel-dialog *,
#fk-preview-popover,
#fk-preview-popover * {
  font-family: var(--font-mono), monospace !important;
}
</style>
