<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-40 flex flex-col bg-background text-foreground overflow-hidden select-none"
  >
    <!-- Subtle theme-aware backdrop -->
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,color-mix(in_srgb,var(--primary)_7%,transparent),transparent_60%)]"
      aria-hidden="true"
    />

    <!-- Header -->
    <header class="relative z-10 flex items-center justify-between h-12 px-4 border-b border-border chrome-bar flex-shrink-0">
      <div class="flex items-center gap-3 min-w-0">
        <Button
          v-if="currentView === 'edit' && connStore.connections.length > 0"
          variant="ghost"
          size="sm"
          class="h-8 px-2 gap-1.5 text-xs text-muted-foreground"
          @click="currentView = 'dashboard'"
        >
          <ChevronLeft class="w-4 h-4" />
          Back
        </Button>
        <div class="flex items-center gap-2.5 min-w-0">
          <img src="/select-logo.svg" alt="" class="w-7 h-7 flex-shrink-0" />
          <div class="min-w-0">
            <h1 class="text-sm font-semibold tracking-tight leading-none">
              {{ currentView === 'edit' ? 'Connection Settings' : 'Connections' }}
            </h1>
            <p class="text-[10px] text-muted-foreground mt-0.5 truncate">
              {{ currentView === 'edit' ? 'Configure host, credentials, and SSL' : 'Select or create a database connection' }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-muted-foreground"
          title="Settings"
          @click="uiStore.openSettings()"
        >
          <Settings class="w-4 h-4" />
        </Button>
        <Button
          v-if="connStore.status === 'connected'"
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-muted-foreground"
          title="Close (Esc)"
          @click="tryClose"
        >
          <X class="w-4 h-4" />
        </Button>
      </div>
    </header>

    <!-- Dashboard -->
    <div
      v-if="currentView === 'dashboard'"
      class="relative z-10 flex-1 overflow-y-auto px-4 py-6"
    >
      <div class="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <!-- Search -->
        <div class="relative">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
          <Input
            v-model="searchQuery"
            type="text"
            placeholder="Search by name, host, or database…"
            class="h-9 pl-9 text-xs bg-background/80"
          />
        </div>

        <!-- Recents -->
        <div v-if="connStore.recentConnections.length" class="space-y-2">
          <h2 class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recent</h2>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="conn in connStore.recentConnections"
              :key="conn.id"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              @click="handleConnect(conn.id)"
            >
              <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: conn.color }" />
              {{ conn.name }}
            </button>
          </div>
        </div>

        <!-- Saved connections -->
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              Saved
              <span class="text-[10px] font-mono font-normal normal-case px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                {{ connStore.connections.length }}
              </span>
            </h2>
            <div class="flex items-center gap-1.5">
              <Button variant="outline" size="sm" class="h-7 text-xs px-2.5" @click="triggerImport">
                Import
              </Button>
              <Button variant="outline" size="sm" class="h-7 text-xs px-2.5" @click="exportConnections">
                Export
              </Button>
              <Button size="sm" class="h-7 text-xs px-3 gap-1" @click="openNewConnection">
                <Plus class="w-3.5 h-3.5" />
                New
              </Button>
            </div>
          </div>

          <div v-if="filteredConnections.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="conn in filteredConnections"
              :key="conn.id"
              role="button"
              tabindex="0"
              class="group relative flex items-start gap-3 p-3.5 rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-accent/20 text-left transition-[border-color,background,box-shadow] duration-normal ease-premium cursor-pointer shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @click="handleConnect(conn.id)"
              @keydown.enter.space.prevent="handleConnect(conn.id)"
            >
              <div
                class="w-9 h-9 rounded-md flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                :style="{ backgroundColor: conn.color || 'var(--primary)' }"
              >
                <svg
                  v-if="connectingId === conn.id"
                  class="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <Database v-else class="w-4 h-4" />
              </div>

              <div class="min-w-0 flex-1 pr-6">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-semibold truncate">{{ conn.name }}</span>
                  <ShieldAlert v-if="conn.readOnly" class="w-3 h-3 text-amber-500 flex-shrink-0" title="Read-only" />
                </div>
                <p class="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                  {{ conn.dbType }} · {{ conn.host }}<template v-if="conn.database">/{{ conn.database }}</template>
                </p>
              </div>

              <div
                class="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity rounded-md border border-border bg-popover p-0.5 shadow-sm"
                @click.stop
              >
                <button
                  type="button"
                  class="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer border-none bg-transparent"
                  title="Edit"
                  aria-label="Edit connection"
                  @click.stop="openEditConnection(conn.id)"
                >
                  <Pencil class="w-3 h-3" />
                </button>
                <button
                  type="button"
                  class="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer border-none bg-transparent"
                  title="Delete"
                  aria-label="Delete connection"
                  @click.stop="requestDeleteConnection(conn.id)"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>

              <span
                v-if="conn.id === connStore.activeId && connStore.status === 'connected'"
                class="absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background"
                title="Active connection"
              />
            </div>
          </div>

          <div
            v-else
            class="rounded-lg border border-dashed border-border bg-muted/20 py-12 text-center"
          >
            <Database class="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p class="text-xs text-muted-foreground mb-3">
              {{ searchQuery ? 'No connections match your search.' : 'No saved connections yet.' }}
            </p>
            <Button size="sm" class="text-xs h-8" @click="openNewConnection">
              Create Connection
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit view -->
    <div
      v-else-if="currentView === 'edit'"
      class="relative z-10 flex-1 flex items-stretch justify-center p-4 md:p-6 min-h-0 overflow-hidden"
    >
      <div class="w-full max-w-5xl flex rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-fade-in min-h-0">
        <!-- Sidebar list -->
        <aside class="w-[210px] border-r border-border flex flex-col flex-shrink-0 bg-muted/20 min-h-0">
          <div class="p-3 border-b border-border space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Saved</span>
              <span class="text-[10px] font-mono text-muted-foreground">{{ connStore.connections.length }}</span>
            </div>
            <div class="relative">
              <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
              <Input
                v-model="editSearchQuery"
                type="text"
                placeholder="Filter…"
                class="h-7 pl-8 text-xs"
              />
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-1.5 space-y-0.5 min-h-0">
            <div
              v-for="conn in filteredEditConnections"
              :key="conn.id"
              role="button"
              tabindex="0"
              class="group w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer border-none text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              :class="selectedId === conn.id ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 bg-transparent'"
              @click="selectConn(conn.id)"
              @keydown.enter.space.prevent="selectConn(conn.id)"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: conn.color || '#9CA3AF' }" />
                <span class="truncate">{{ conn.name }}</span>
              </div>
              <button
                type="button"
                class="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 p-0.5 text-muted-foreground hover:text-destructive rounded transition-opacity cursor-pointer border-none bg-transparent"
                title="Delete connection"
                aria-label="Delete connection"
                @click.stop="requestDeleteConnection(conn.id)"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            </div>
          </div>

          <div class="p-2 border-t border-border">
            <Button variant="outline" size="sm" class="w-full h-7 text-xs gap-1" @click="newConnection">
              <Plus class="w-3.5 h-3.5" />
              New
            </Button>
          </div>
        </aside>

        <!-- Form panel -->
        <div class="flex-1 flex flex-col min-w-0 min-h-0 bg-background">
          <template v-if="form">
            <div class="px-5 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: form.color || 'var(--primary)' }" />
                <div class="min-w-0">
                  <h2 class="text-sm font-semibold truncate flex items-center gap-2">
                    {{ form.name || 'Untitled' }}
                    <span v-if="isNew" class="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">New</span>
                  </h2>
                  <p class="text-[10px] text-muted-foreground font-mono truncate">
                    {{ form.dbType === 'mariadb' ? 'MariaDB' : 'MySQL' }} · {{ form.username || 'root' }}@{{ form.host || 'localhost' }}:{{ form.port || 3306 }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  v-if="!isNew && selectedId"
                  variant="ghost"
                  size="sm"
                  class="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                  @click="requestDeleteConnection(selectedId)"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                  Delete
                </Button>
                <Button variant="ghost" size="sm" class="h-7 text-xs gap-1 cursor-pointer" @click="duplicateConn">
                  <Copy class="w-3.5 h-3.5" />
                  Duplicate
                </Button>
              </div>
            </div>

            <!-- Tabs -->
            <div class="flex items-center gap-1 px-5 border-b border-border flex-shrink-0">
              <button
                v-for="tab in formTabs"
                :key="tab.id"
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium border-b-2 -mb-px transition-colors cursor-pointer bg-transparent"
                :class="activeTab === tab.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
                @click="activeTab = tab.id"
              >
                <component :is="tab.icon" class="w-3.5 h-3.5 opacity-70" />
                {{ tab.label }}
                <span
                  v-if="tab.id === 'ssl' && form.sslMode && form.sslMode !== 'disabled'"
                  class="w-1.5 h-1.5 rounded-full bg-emerald-500"
                />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-5 min-h-0">
              <!-- General -->
              <div v-if="activeTab === 'general'" class="space-y-4 max-w-lg">
                <div class="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2">
                  <div class="flex items-center justify-between">
                    <Label for="f-uri" class="text-xs font-medium flex items-center gap-1.5">
                      <Link class="w-3.5 h-3.5 text-primary" />
                      Connection URI
                    </Label>
                    <Button v-if="uriInput" variant="ghost" size="sm" class="h-6 text-[10px] px-2" type="button" @click="uriInput = ''">
                      Clear
                    </Button>
                  </div>
                  <Input
                    id="f-uri"
                    v-model="uriInput"
                    placeholder="mysql://user:pass@host:3306/database"
                    class="h-8 text-xs font-mono"
                    @input="parseConnectionUri"
                  />
                  <p class="text-[10px] text-muted-foreground">Paste a URI to auto-fill fields below.</p>
                </div>

                <div class="grid gap-1.5">
                  <Label for="f-name" class="text-xs font-medium">Name</Label>
                  <Input id="f-name" v-model="form.name" placeholder="Production DB" class="h-8 text-xs" />
                </div>

                <div class="grid gap-1.5">
                  <Label class="text-xs font-medium">Environment</Label>
                  <div class="grid grid-cols-3 gap-2">
                    <button
                      v-for="opt in envOptions"
                      :key="opt.id"
                      type="button"
                      class="flex items-center justify-center px-2.5 py-1.5 rounded-md border text-[10px] font-semibold cursor-pointer bg-transparent"
                      :class="form.environment === opt.id ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:bg-accent/50'"
                      @click="form.environment = opt.id"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </div>

                <div class="grid gap-1.5">
                  <Label class="text-xs font-medium">Color</Label>
                  <div class="grid grid-cols-3 gap-2">
                    <button
                      v-for="color in colorOptions"
                      :key="color.value"
                      type="button"
                      class="flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-colors cursor-pointer text-left bg-transparent"
                      :class="form.color === color.value ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:bg-accent/50'"
                      @click="form.color = color.value"
                    >
                      <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: color.value }" />
                      <span class="truncate text-[10px]">{{ color.label }}</span>
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-3">
                  <div class="col-span-2 grid gap-1.5">
                    <Label for="f-host" class="text-xs font-medium">Host</Label>
                    <Input id="f-host" v-model="form.host" placeholder="127.0.0.1" class="h-8 text-xs font-mono" />
                  </div>
                  <div class="grid gap-1.5">
                    <Label for="f-port" class="text-xs font-medium">Port</Label>
                    <Input id="f-port" v-model.number="form.port" type="number" placeholder="3306" class="h-8 text-xs font-mono" />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="grid gap-1.5">
                    <Label for="f-user" class="text-xs font-medium">Username</Label>
                    <Input id="f-user" v-model="form.username" placeholder="root" class="h-8 text-xs font-mono" />
                  </div>
                  <div class="grid gap-1.5">
                    <Label for="f-pass" class="text-xs font-medium">Password</Label>
                    <div class="flex gap-1.5">
                      <Input
                        id="f-pass"
                        :type="showPw ? 'text' : 'password'"
                        v-model="form.password"
                        placeholder="••••••••"
                        autocomplete="new-password"
                        autocapitalize="none"
                        autocorrect="off"
                        spellcheck="false"
                        class="h-8 text-xs font-mono flex-1"
                        @input="passwordTouched = true"
                      />
                      <Button variant="outline" size="sm" class="h-8 text-xs px-2.5 shrink-0" type="button" @click="showPw = !showPw">
                        {{ showPw ? 'Hide' : 'Show' }}
                      </Button>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="grid gap-1.5">
                    <Label for="f-dbtype" class="text-xs font-medium">Type</Label>
                    <select id="f-dbtype" v-model="form.dbType" :class="selectClass">
                      <option value="mysql">MySQL</option>
                      <option value="mariadb">MariaDB</option>
                    </select>
                  </div>
                  <div class="grid gap-1.5">
                    <Label for="f-db" class="text-xs font-medium">Default database</Label>
                    <Input id="f-db" v-model="form.database" placeholder="Optional" class="h-8 text-xs font-mono" />
                  </div>
                </div>
              </div>

              <!-- SSL -->
              <div v-else-if="activeTab === 'ssl'" class="space-y-4 max-w-lg">
                <div class="grid gap-1.5">
                  <Label for="f-sslmode" class="text-xs font-medium">SSL mode</Label>
                  <select id="f-sslmode" v-model="form.sslMode" :class="selectClass">
                    <option value="preferred">Preferred</option>
                    <option value="required">Required</option>
                    <option value="verify_ca">Verify CA</option>
                    <option value="verify_identity">Verify identity</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>

                <div class="rounded-lg border border-border p-3.5 flex items-start gap-3">
                  <input
                    id="f-readonly"
                    type="checkbox"
                    v-model="form.readOnly"
                    class="size-4 accent-primary cursor-pointer rounded mt-0.5"
                  />
                  <div>
                    <Label for="f-readonly" class="text-xs font-medium cursor-pointer flex items-center gap-1.5">
                      <ShieldAlert class="w-3.5 h-3.5 text-amber-500" />
                      Read-only mode
                    </Label>
                    <p class="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                      Blocks write queries on this connection. Useful for production browsing.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Advanced -->
              <div v-else-if="activeTab === 'advanced'" class="space-y-4 max-w-lg">
                <div class="grid grid-cols-2 gap-3">
                  <div class="grid gap-1.5">
                    <Label for="f-timeout" class="text-xs font-medium">Timeout (seconds)</Label>
                    <Input id="f-timeout" v-model.number="form.connectTimeoutSecs" type="number" min="1" max="120" placeholder="10" class="h-8 text-xs font-mono" />
                  </div>
                  <div class="grid gap-1.5">
                    <Label for="f-charset" class="text-xs font-medium">Charset</Label>
                    <select id="f-charset" v-model="form.charset" :class="selectClass">
                      <option value="utf8mb4">utf8mb4</option>
                      <option value="utf8">utf8</option>
                      <option value="latin1">latin1</option>
                      <option value="ascii">ascii</option>
                    </select>
                  </div>
                </div>

                <div class="grid gap-1.5">
                  <Label for="f-socket" class="text-xs font-medium">Unix socket path</Label>
                  <Input id="f-socket" v-model="form.socketPath" placeholder="/tmp/mysql.sock" class="h-8 text-xs font-mono" />
                </div>

                <div class="rounded-lg border border-dashed border-border p-3.5">
                  <div class="flex items-center justify-between gap-2">
                    <Label class="text-xs font-medium text-muted-foreground">SSH tunnel</Label>
                    <span class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">Coming soon</span>
                  </div>
                  <p class="text-[10px] text-muted-foreground mt-1.5">Bastion host tunneling will be available in a future release.</p>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="px-5 py-3 border-t border-border bg-muted/10 flex flex-col gap-2 flex-shrink-0">
              <div
                v-if="testResult"
                class="rounded-md px-3 py-2 text-[11px] font-mono flex items-center justify-between gap-2"
                :class="testResult.ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25' : 'bg-destructive/10 text-destructive border border-destructive/25'"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <CheckCircle2 v-if="testResult.ok" class="w-3.5 h-3.5 flex-shrink-0" />
                  <XCircle v-else class="w-3.5 h-3.5 flex-shrink-0" />
                  <span class="truncate">{{ testResult.ok ? 'Connection successful' : testResult.error }}</span>
                </div>
                <span v-if="testResult.ok" class="text-[9px] font-semibold tabular-nums flex-shrink-0">{{ testResult.latency }}ms</span>
              </div>

              <div class="flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" class="h-8 text-xs gap-1.5" :disabled="testing" type="button" @click="testConn">
                  <template v-if="testing">
                    <svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                    Testing…
                  </template>
                  <template v-else>Test connection</template>
                </Button>

                <div class="flex items-center gap-2">
                  <Button variant="ghost" size="sm" class="h-8 text-xs" type="button" :disabled="connStore.status === 'connecting'" @click="currentView = 'dashboard'">
                    Cancel
                  </Button>
                  <Button size="sm" class="h-8 text-xs gap-1.5" type="button" :disabled="connStore.status === 'connecting'" @click="save">
                    <template v-if="connStore.status === 'connecting'">
                      <svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                      Connecting…
                    </template>
                    <template v-else>Save & connect</template>
                  </Button>
                </div>
              </div>
            </div>
          </template>

          <div v-else class="flex flex-col items-center justify-center flex-1 p-8 text-center gap-3">
            <Server class="w-8 h-8 text-muted-foreground/40" />
            <div>
              <h3 class="text-sm font-medium">No connection selected</h3>
              <p class="text-xs text-muted-foreground mt-1">Choose one from the list or create a new connection.</p>
            </div>
            <Button size="sm" class="text-xs" @click="newConnection">Create connection</Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <Dialog :open="Boolean(connectionToDelete)" @update:open="(open) => { if (!open) connectionToDelete = null }">
      <DialogContent class="sm:max-w-md font-mono select-none">
        <DialogHeader>
          <DialogTitle class="text-sm font-semibold flex items-center gap-2 text-destructive">
            <Trash2 class="w-4 h-4" />
            Delete Connection
          </DialogTitle>
          <DialogDescription class="text-xs text-muted-foreground pt-1">
            Are you sure you want to delete <span class="font-semibold text-foreground">"{{ connectionToDelete?.name }}"</span> ({{ connectionToDelete?.host }})? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter class="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            class="h-8 text-xs font-mono cursor-pointer"
            :disabled="isDeleting"
            @click="connectionToDelete = null"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            class="h-8 text-xs font-mono gap-1.5 cursor-pointer"
            :disabled="isDeleting"
            @click="executeDeleteConnection"
          >
            <svg v-if="isDeleting" class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <Trash2 v-else class="w-3.5 h-3.5" />
            <span>{{ isDeleting ? 'Deleting…' : 'Delete Connection' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, type Component } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Search, ShieldAlert, Lock, Server, Copy, Trash2, Sliders, CheckCircle2, XCircle, Plus, Link,
  ChevronLeft, Settings, Database, Pencil, X,
} from '@lucide/vue'
import { useUiStore } from '../stores/ui'
import { useConnectionStore, type Connection } from '../stores/connection'
import { ENVIRONMENT_OPTIONS, resolveEnvironment } from '@/lib/connectionEnv'
import { safeStoredPassword } from '@/lib/utils'
import { toast } from 'vue-sonner'

const uiStore = useUiStore()
const connStore = useConnectionStore()

const selectClass =
  'flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'

const formTabs: { id: 'general' | 'ssl' | 'advanced'; label: string; icon: Component }[] = [
  { id: 'general', label: 'General', icon: Server },
  { id: 'ssl', label: 'SSL & Security', icon: Lock },
  { id: 'advanced', label: 'Advanced', icon: Sliders },
]

const selectedId = ref<string | null>(connStore.activeId)
const isNew = ref(false)
const showPw = ref(false)
// The stored (possibly encrypted) password is never prefilled into the form.
// If the user doesn't type a new one, the original must be sent back on save,
// otherwise editing any other field would wipe the stored password.
const storedPassword = ref('')
const passwordTouched = ref(false)
const testing = ref(false)
const searchQuery = ref('')
const editSearchQuery = ref('')
const activeTab = ref<'general' | 'ssl' | 'advanced'>('general')
const testResult = ref<{ ok: boolean; latency?: number; error?: string } | null>(null)
const uriInput = ref('')

const connectionToDelete = ref<Connection | null>(null)
const isDeleting = ref(false)

const connectingId = ref<string | null>(null)
const currentView = ref<'dashboard' | 'edit'>('dashboard')

const colorOptions = [
  { value: '#EF4444', label: 'Red' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#22C55E', label: 'Green' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#A78BFA', label: 'Purple' },
  { value: '#67E8F9', label: 'Cyan' },
]

const envOptions = ENVIRONMENT_OPTIONS

type FormData = Omit<Connection, 'id' | 'createdAt'>
const form = ref<FormData | null>(null)

const isOpen = computed(() => uiStore.connectionManagerOpen || connStore.status !== 'connected')

const filteredConnections = computed(() => {
  if (!searchQuery.value.trim()) return connStore.connections
  const q = searchQuery.value.toLowerCase()
  return connStore.connections.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.host.toLowerCase().includes(q) ||
    c.database.toLowerCase().includes(q)
  )
})

const filteredEditConnections = computed(() => {
  if (!editSearchQuery.value.trim()) return connStore.connections
  const q = editSearchQuery.value.toLowerCase()
  return connStore.connections.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.host.toLowerCase().includes(q)
  )
})

function tryClose() {
  if (connStore.status === 'connected') {
    uiStore.closeConnectionManager()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value && connStore.status === 'connected') {
    tryClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})

function selectConn(id: string) {
  selectedId.value = id
  isNew.value = false
  testResult.value = null
  activeTab.value = 'general'
  uriInput.value = ''
  passwordTouched.value = false
  form.value.password = ''
  const conn = connStore.connections.find(c => c.id === id)
  if (conn) {
    storedPassword.value = conn.password
    form.value = {
      name: conn.name,
      host: conn.host,
      port: conn.port,
      database: conn.database,
      username: conn.username,
      password: safeStoredPassword(conn.password),
      dbType: conn.dbType,
      readOnly: conn.readOnly,
      ssl: conn.sslMode ? conn.sslMode !== 'disabled' : conn.ssl,
      sslMode: conn.sslMode || (conn.ssl ? 'required' : 'preferred'),
      connectTimeoutSecs: conn.connectTimeoutSecs ?? 10,
      charset: conn.charset ?? 'utf8mb4',
      socketPath: conn.socketPath ?? '',
      sshTunnel: conn.sshTunnel,
      sshHost: conn.sshHost,
      sshPort: conn.sshPort,
      sshKeyFile: conn.sshKeyFile,
      color: conn.color,
      environment: resolveEnvironment(conn),
    }
  }
}

function newConnection() {
  isNew.value = true
  selectedId.value = null
  testResult.value = null
  activeTab.value = 'general'
  uriInput.value = ''
  passwordTouched.value = false
  storedPassword.value = ''
  form.value = {
    name: 'New Connection',
    host: 'localhost',
    port: 3306,
    database: '',
    username: 'root',
    password: '',
    dbType: 'mysql',
    readOnly: false,
    ssl: true,
    sslMode: 'preferred',
    connectTimeoutSecs: 10,
    charset: 'utf8mb4',
    socketPath: '',
    sshTunnel: false,
    color: '#3B82F6',
    environment: 'local',
  }
}

function parseConnectionUri() {
  if (!uriInput.value || !uriInput.value.trim() || !form.value) return

  let rawUri = uriInput.value.trim()
  if (rawUri.startsWith('"') && rawUri.endsWith('"')) rawUri = rawUri.slice(1, -1)
  if (rawUri.startsWith("'") && rawUri.endsWith("'")) rawUri = rawUri.slice(1, -1)

  try {
    if (!rawUri.includes('://') && !rawUri.startsWith('mysql:') && !rawUri.startsWith('mariadb:')) {
      rawUri = 'mysql://' + rawUri
    }

    const url = new URL(rawUri)
    form.value.dbType = url.protocol === 'mariadb:' ? 'mariadb' : 'mysql'

    if (url.hostname) form.value.host = url.hostname
    form.value.port = url.port ? parseInt(url.port, 10) : 3306
    if (url.username) form.value.username = decodeURIComponent(url.username)
    if (url.password) form.value.password = decodeURIComponent(url.password)

    let db = url.pathname
    if (db.startsWith('/')) db = db.substring(1)
    if (db) form.value.database = decodeURIComponent(db)

    const sslMode = url.searchParams.get('ssl-mode') || url.searchParams.get('sslmode') || url.searchParams.get('ssl_mode')
    if (sslMode) {
      const mode = sslMode.toLowerCase()
      if (['required', 'require'].includes(mode)) {
        form.value.sslMode = 'required'
        form.value.ssl = true
      } else if (['verify-ca', 'verify_ca', 'verifyca'].includes(mode)) {
        form.value.sslMode = 'verify_ca'
        form.value.ssl = true
      } else if (['verify-identity', 'verify_identity', 'verifyidentity'].includes(mode)) {
        form.value.sslMode = 'verify_identity'
        form.value.ssl = true
      } else if (['disabled', 'disable', 'false', '0'].includes(mode)) {
        form.value.sslMode = 'disabled'
        form.value.ssl = false
      } else {
        form.value.sslMode = 'preferred'
        form.value.ssl = true
      }
    }

    if (form.value.name === 'New Connection' || !form.value.name) {
      form.value.name = form.value.database ? `${form.value.host}/${form.value.database}` : form.value.host
    }
  } catch (err) {
    console.warn('URL parsing failed', err)
  }
}

function duplicateConn() {
  if (!form.value) return
  form.value = {
    ...form.value,
    name: `${form.value.name} (Copy)`,
  }
  isNew.value = true
  selectedId.value = null
}

function requestDeleteConnection(id: string) {
  const conn = connStore.connections.find(c => c.id === id)
  if (conn) {
    connectionToDelete.value = conn
  }
}

async function executeDeleteConnection() {
  if (!connectionToDelete.value) return
  const id = connectionToDelete.value.id
  isDeleting.value = true
  try {
    await connStore.removeConnection(id)
    toast.success('Connection deleted')
    if (selectedId.value === id) {
      selectInitialConnection()
    }
    connectionToDelete.value = null
  } catch (err) {
    toast.error('Failed to delete connection: ' + String(err))
  } finally {
    isDeleting.value = false
  }
}

async function testConn() {
  if (!form.value) return
  testing.value = true
  testResult.value = null
  const payload = {
    ...form.value,
    password: passwordTouched.value ? form.value.password : storedPassword.value,
    ssl: form.value.sslMode ? form.value.sslMode !== 'disabled' : form.value.ssl,
  }
  testResult.value = await connStore.testConnection(payload)
  testing.value = false
}

async function save() {
  if (!form.value) return
  let targetId = selectedId.value
  const payload = {
    ...form.value,
    // Blank field + untouched means "keep whatever was stored" (it may be
    // encrypted and is intentionally not prefilled).
    password: passwordTouched.value ? form.value.password : storedPassword.value,
    ssl: form.value.sslMode ? form.value.sslMode !== 'disabled' : form.value.ssl,
  }

  if (isNew.value) {
    targetId = await connStore.addConnection(payload)
  } else if (targetId) {
    await connStore.updateConnection(targetId, payload)
  }
  if (targetId) {
    await handleConnect(targetId)
  }
}

async function handleConnect(id: string) {
  connectingId.value = id
  const connected = await connStore.connect(id)
  connectingId.value = null
  if (connected) {
    uiStore.closeConnectionManager()
  } else if (connStore.lastError) {
    toast.error('Connection failed', { description: connStore.lastError })
  }
}

function selectInitialConnection() {
  const id = connStore.activeId ?? connStore.connections[0]?.id
  if (id) selectConn(id)
  else {
    selectedId.value = null
    isNew.value = false
    testResult.value = null
    form.value = null
    uriInput.value = ''
  }
}

function openNewConnection() {
  newConnection()
  currentView.value = 'edit'
}

function openEditConnection(id: string) {
  selectConn(id)
  currentView.value = 'edit'
}

function exportConnections() {
  try {
    const dataStr = JSON.stringify(connStore.connections, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', 'select_connections.json')
    linkElement.click()
    toast.success('Connections exported.')
  } catch (err) {
    toast.error('Export failed: ' + String(err))
  }
}

function triggerImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string)
        if (Array.isArray(imported)) {
          let count = 0
          for (const conn of imported) {
            if (conn.host && conn.username && conn.name) {
              await connStore.addConnection({
                name: conn.name,
                host: conn.host,
                port: conn.port || 3306,
                database: conn.database || '',
                username: conn.username,
                password: conn.password || '',
                dbType: conn.dbType || 'mysql',
                ssl: conn.ssl ?? false,
                sslMode: conn.sslMode || 'preferred',
                connectTimeoutSecs: conn.connectTimeoutSecs || 10,
                charset: conn.charset || 'utf8mb4',
                socketPath: conn.socketPath || '',
                readOnly: conn.readOnly ?? false,
                sshTunnel: conn.sshTunnel ?? false,
                color: conn.color || '#3B82F6',
                environment: resolveEnvironment(conn),
              })
              count++
            }
          }
          toast.success(`Imported ${count} connection${count === 1 ? '' : 's'}.`)
          selectInitialConnection()
        } else {
          toast.error('Invalid format. Expected a JSON array.')
        }
      } catch (err) {
        toast.error('Parse failed: ' + String(err))
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

watch(
  isOpen,
  (open) => {
    if (!open) return
    showPw.value = false
    searchQuery.value = ''
    editSearchQuery.value = ''

    if (connStore.connections.length === 0) {
      newConnection()
      currentView.value = 'edit'
    } else {
      currentView.value = 'dashboard'
      selectInitialConnection()
    }
  },
  { immediate: true }
)

watch(
  () => [connStore.activeId, connStore.connections.length] as const,
  () => {
    if (isOpen.value && !isNew.value && currentView.value === 'edit') {
      selectInitialConnection()
    }
  }
)
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 280ms var(--ease-out-premium, cubic-bezier(0.16, 1, 0.3, 1)) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
