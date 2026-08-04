<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[999] flex flex-col bg-[#090A0C] text-foreground font-sans overflow-hidden select-none"
  >
    <!-- Background ShaderGradient component -->
    <ShaderGradient
      v-if="showGradientBg"
      :color1="activeColor1"
      :color2="'#ff810a'"
      :color3="'#8da0ce'"
      :animate="'on'"
      :grain="'on'"
    />
    <!-- Fallback background grid when gradient is disabled -->
    <template v-else>
      <div class="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#090A0C]/50 to-[#090A0C] pointer-events-none"></div>
    </template>

    <!-- Main Container -->
    <div class="relative z-10 flex flex-col h-full overflow-y-auto px-6 py-8">
      
      <!-- Top header actions -->
      <div class="flex justify-between items-center max-w-5xl w-full mx-auto mb-8 flex-shrink-0">
        <div>
          <!-- Show back button if in edit view and we are connected -->
          <Button
            v-if="currentView === 'edit' && connStore.connections.length > 0"
            variant="ghost"
            size="sm"
            class="text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            @click="currentView = 'dashboard'"
          >
            <ChevronLeft class="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
        <div class="flex items-center gap-3 animate-fade-in">
          <!-- Gradient Background Toggle Checkbox -->
          <div class="flex items-center gap-2 bg-muted/20 border border-border/40 px-3 py-1.5 rounded-lg text-xs">
            <input
              id="f-gradient"
              type="checkbox"
              v-model="showGradientBg"
              class="size-3.5 accent-primary cursor-pointer rounded-sm"
            />
            <Label for="f-gradient" class="cursor-pointer text-muted-foreground hover:text-foreground select-none">
              Background
            </Label>
          </div>
          <!-- Settings Icon -->
          <Button
            variant="ghost"
            size="icon"
            class="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground border border-border/40 bg-muted/10 cursor-pointer"
            title="Open Settings"
            @click="uiStore.openSettings()"
          >
            <Settings class="w-4 h-4" />
          </Button>
        </div>
      </div>

      <!-- Dashboard View -->
      <div v-if="currentView === 'dashboard'" class="flex-1 flex flex-col items-center justify-between max-w-5xl w-full mx-auto animate-fade-in">
        <!-- Logo and Search bar -->
        <div class="w-full flex flex-col items-center gap-6 my-auto pt-4 flex-shrink-0">
          <div class="flex flex-col items-center gap-2">
            <!-- Inline SELECT Logo -->
            <div class="w-16 h-16 bg-[#131416] p-2.5 rounded-2xl border border-[#242629]/80 shadow-2xl flex items-center justify-center">
              <svg viewBox="0 0 304 304" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                <path d="M 24 0 L 120 0 A 24 24 0 0 1 144 24 L 144 56 A 24 24 0 0 1 120 80 L 104 80 A 24 24 0 0 0 80 104 L 80 136 A 24 24 0 0 0 104 160 L 120 160 A 24 24 0 0 1 144 184 L 144 280 A 24 24 0 0 1 120 304 L 24 304 A 24 24 0 0 1 0 280 L 0 248 A 24 24 0 0 1 24 224 L 40 224 A 24 24 0 0 0 64 200 L 64 168 A 24 24 0 0 0 40 144 L 24 144 A 24 24 0 0 1 0 120 L 0 24 A 24 24 0 0 1 24 0 Z" fill="#FFFFFF"/>
                <rect x="160" y="0" width="64" height="64" rx="16" fill="#3F3F46"/>
                <rect x="240" y="0" width="64" height="64" rx="16" fill="#3F3F46"/>
                <rect x="160" y="80" width="64" height="64" rx="16" fill="#3F3F46"/>
                <rect x="240" y="80" width="64" height="64" rx="16" fill="#3F3F46"/>
                <rect x="160" y="160" width="64" height="64" rx="16" fill="#3F3F46"/>
                <rect x="240" y="160" width="64" height="64" rx="16" fill="#FF1F5A"/>
                <rect x="160" y="240" width="64" height="64" rx="16" fill="#3F3F46"/>
                <rect x="240" y="240" width="64" height="64" rx="16" fill="#3F3F46"/>
              </svg>
            </div>
            <span class="text-[10px] text-muted-foreground/60 font-mono mt-1">Version 2.6.8</span>
          </div>

          <!-- Search Input -->
          <div class="w-full max-w-md relative">
            <Search class="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground/50" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search connections..."
              class="w-full h-9 pl-9 pr-10 bg-[#131416]/95 hover:bg-[#16171a]/95 focus:bg-[#131416] border border-[#242629] rounded-lg text-xs placeholder:text-muted-foreground/45 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
            />
          </div>

          <!-- Recents Connections -->
          <div v-if="connStore.recentConnections.length" class="w-full max-w-lg mt-2 space-y-2">
            <h4 class="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider text-center">Recents</h4>
            <div class="flex flex-wrap justify-center gap-2">
              <button
                v-for="conn in connStore.recentConnections"
                :key="conn.id"
                class="flex items-center gap-2 px-3 py-1 bg-[#131416]/85 hover:bg-[#1c1d20]/95 border border-[#242629] rounded-full text-[11px] transition-all cursor-pointer font-medium text-muted-foreground hover:text-foreground"
                @click="handleConnect(conn.id)"
              >
                <span class="w-1.5 h-1.5 rounded-full animate-pulse" :style="{ backgroundColor: conn.color }"></span>
                <span>{{ conn.name }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Saved Connections Grid -->
        <div class="w-full mt-10 space-y-4">
          <div class="flex justify-between items-center border-b border-border/40 pb-2">
            <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              Saved Connections
              <span class="text-[10px] font-mono text-muted-foreground/60 bg-muted px-1.5 py-0.2 rounded-full border border-border/40">{{ connStore.connections.length }}</span>
            </h3>
            
            <div class="flex items-center gap-2">
              <!-- Import / Export Dropdown -->
              <div class="relative group/dropdown">
                <Button variant="outline" size="sm" class="text-xs h-7 px-2.5 gap-1.5 bg-[#131416]/90 border-[#242629] text-muted-foreground hover:text-foreground cursor-pointer">
                  Import / Export
                  <ChevronDown class="w-3 h-3 opacity-60" />
                </Button>
                <!-- Dropdown contents -->
                <div class="absolute right-0 top-full mt-1 w-36 bg-[#131416] border border-[#242629] rounded-lg shadow-xl py-1 hidden group-hover/dropdown:block hover:block z-50">
                  <button class="w-full px-3 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 cursor-pointer border-none bg-transparent" @click="triggerImport">
                    Import JSON
                  </button>
                  <button class="w-full px-3 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 cursor-pointer border-none bg-transparent" @click="exportConnections">
                    Export JSON
                  </button>
                </div>
              </div>

              <!-- New Button -->
              <Button size="sm" class="text-xs h-7 px-3 gap-1 bg-primary text-primary-foreground shadow-sm hover:opacity-90 cursor-pointer" @click="openNewConnection">
                <Plus class="w-3.5 h-3.5" />
                New
              </Button>
            </div>
          </div>

          <!-- Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="conn in filteredConnections"
              :key="conn.id"
              class="group relative flex items-start gap-4 p-4 rounded-xl bg-[#131416]/80 hover:bg-[#16171a]/95 border border-[#242629] hover:border-primary/45 transition-all duration-200 cursor-pointer shadow-md select-none"
              @click="handleConnect(conn.id)"
              @mouseenter="hoveredConnId = conn.id"
              @mouseleave="hoveredConnId = null"
            >
              <!-- Colored Database icon cylinder box -->
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center text-white/95 flex-shrink-0 shadow-inner"
                :style="{ backgroundColor: conn.color || '#3B82F6' }"
              >
                <!-- Show Loading Spinner if connecting, else show Database icon -->
                <svg v-if="connectingId === conn.id" class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <Database v-else class="w-5 h-5" />
              </div>

              <!-- Connection Details -->
              <div class="min-w-0 flex-1">
                <div class="font-semibold text-xs truncate text-foreground flex items-center gap-1.5">
                  {{ conn.name }}
                  <span v-if="conn.readOnly" title="Read-only mode">
                    <ShieldAlert class="w-3 h-3 text-amber-500" />
                  </span>
                </div>
                <div class="text-[10px] text-muted-foreground/70 font-mono truncate mt-0.5 uppercase">
                  {{ conn.dbType }} &middot; {{ conn.host }}
                </div>
              </div>

              <!-- Top-right Quick Actions (Pencil & Trash) -->
              <div class="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#16171a] p-0.5 rounded border border-[#242629]">
                <button
                  class="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded transition-colors cursor-pointer"
                  title="Edit configuration"
                  @click.stop="openEditConnection(conn.id)"
                >
                  <Pencil class="w-3 h-3" />
                </button>
                <button
                  class="p-1 text-muted-foreground hover:text-red-400 hover:bg-muted/40 rounded transition-colors cursor-pointer"
                  title="Delete connection"
                  @click.stop="confirmDeleteConn(conn.id)"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>

              <!-- Pulse dot indicator if currently active -->
              <span
                v-if="conn.id === connStore.activeId && connStore.status === 'connected'"
                class="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse"
                title="Currently active connection"
              ></span>
            </div>

            <!-- Empty State -->
            <div v-if="filteredConnections.length === 0" class="col-span-full py-12 text-center border border-dashed border-[#242629] rounded-xl bg-[#131416]/30">
              <Database class="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p class="text-xs text-muted-foreground">No saved connections match your search.</p>
              <Button size="sm" class="text-xs mt-3 bg-secondary/80 hover:bg-secondary border border-border cursor-pointer" @click="openNewConnection">
                Create New Connection
              </Button>
            </div>
          </div>
        </div>

        <!-- Promotional DBPro Offer styled box -->
        <div class="w-full mt-10 mb-6 p-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-xl flex items-center justify-between gap-4 flex-shrink-0 text-xs text-amber-500/90 shadow-sm max-w-3xl">
          <div class="flex items-center gap-2 truncate">
            <span class="px-2 py-0.5 bg-amber-500/15 text-[10px] text-amber-400 font-bold rounded">PRO OFFER</span>
            <span class="truncate">Time-limited offer: Get DB Pro for <strong class="text-amber-400 font-semibold">$39</strong>. Lifetime license.</span>
          </div>
          <a href="https://dbpro.app" target="_blank" class="px-3 py-1 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors text-[11px] whitespace-nowrap cursor-pointer">
            Claim offer
          </a>
        </div>
      </div>

      <!-- Edit / Details View -->
      <div v-else-if="currentView === 'edit'" class="flex-1 flex flex-col justify-center items-center py-4 animate-fade-in">
        <!-- Centered content card workspace -->
        <div class="w-full max-w-5xl h-[600px] border border-[#242629] rounded-2xl overflow-hidden flex bg-[#0B0D10]/95 shadow-2xl backdrop-blur-md">
          
          <!-- Left Sidebar inside edit panel -->
          <div class="w-[220px] border-r border-[#242629] flex flex-col flex-shrink-0 bg-[#131416]/50 select-none">
            <div class="p-3 border-b border-[#242629] space-y-2">
              <div class="flex items-center justify-between">
                <h3 class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-sans">Configurations</h3>
                <span class="text-[10px] font-mono text-muted-foreground/60">{{ connStore.connections.length }}</span>
              </div>
              <div class="relative">
                <Search class="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground/50" />
                <input
                  v-model="editSearchQuery"
                  type="text"
                  placeholder="Filter..."
                  class="w-full h-7 pl-8 pr-2 bg-[#090A0C] border border-[#242629] rounded-md text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div class="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              <div
                v-for="conn in filteredEditConnections"
                :key="conn.id"
                class="group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer"
                :class="selectedId === conn.id ? 'bg-accent text-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'"
                @click="selectConn(conn.id)"
              >
                <div class="flex items-center gap-2 overflow-hidden min-w-0">
                  <span
                    class="w-2 h-2 rounded-full flex-shrink-0 transition-all"
                    :style="{ backgroundColor: conn.color || '#9CA3AF' }"
                  ></span>
                  <div class="truncate text-[11.5px]">
                    {{ conn.name }}
                  </div>
                </div>
                <button
                  v-if="connStore.connections.length > 1"
                  class="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400 rounded transition-opacity cursor-pointer border-none bg-transparent"
                  @click.stop="confirmDeleteConn(conn.id)"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </div>

            <div class="p-2 border-t border-[#242629] bg-[#090A0C]/35">
              <Button variant="outline" size="sm" class="w-full text-xs h-7 justify-center gap-1 bg-[#131416] border-[#242629] hover:bg-[#16171a] cursor-pointer" @click="newConnection">
                <Plus class="w-3.5 h-3.5" />
                New Connection
              </Button>
            </div>
          </div>

          <!-- Right Form inside edit panel -->
          <div class="flex-1 flex flex-col min-w-0 bg-[#0B0D10] overflow-hidden">
            <template v-if="form">
              <!-- Details Header -->
              <div class="px-6 py-4 border-b border-[#242629] flex items-center justify-between flex-shrink-0 bg-[#131416]/20">
                <div class="flex items-center gap-2.5">
                  <span
                    class="w-3 h-3 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: form.color || '#3B82F6' }"
                  ></span>
                  <div>
                    <h2 class="text-xs font-semibold tracking-tight text-foreground flex items-center gap-2">
                      {{ form.name || 'Untitled Connection' }}
                      <span v-if="isNew" class="text-[9px] font-normal px-1.5 py-0.1 bg-primary/10 text-primary rounded-full">New</span>
                    </h2>
                    <p class="text-[10px] text-muted-foreground/60 font-mono">
                      {{ form.dbType === 'mariadb' ? 'MariaDB' : 'MySQL' }} &middot; {{ form.username || 'root' }}@{{ form.host || 'localhost' }}:{{ form.port || 3306 }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Duplicate configuration"
                    @click="duplicateConn"
                  >
                    <Copy class="w-3.5 h-3.5" />
                    Duplicate
                  </Button>
                </div>
              </div>

              <!-- Configuration Navigation Tabs -->
              <div class="flex items-center gap-4 px-6 border-b border-[#242629] bg-[#0B0D10] select-none flex-shrink-0">
                <button
                  class="py-2 text-[11px] font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 bg-transparent border-none"
                  :class="activeTab === 'general' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
                  @click="activeTab = 'general'"
                >
                  <Server class="w-3.5 h-3.5 opacity-70" />
                  General
                </button>

                <button
                  class="py-2 text-[11px] font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 bg-transparent border-none"
                  :class="activeTab === 'ssl' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
                  @click="activeTab = 'ssl'"
                >
                  <Lock class="w-3.5 h-3.5 opacity-70" />
                  SSL & Security
                  <span v-if="form.sslMode && form.sslMode !== 'disabled'" class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                </button>

                <button
                  class="py-2 text-[11px] font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 bg-transparent border-none"
                  :class="activeTab === 'advanced' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
                  @click="activeTab = 'advanced'"
                >
                  <Sliders class="w-3.5 h-3.5 opacity-70" />
                  Advanced
                </button>
              </div>

              <!-- Form Body Content -->
              <div class="flex-1 overflow-y-auto p-6">
                <!-- General Tab -->
                <div v-if="activeTab === 'general'" class="space-y-4 max-w-lg">
                  <div class="grid gap-1.5 p-3.5 bg-accent/10 border border-[#242629] rounded-xl space-y-2">
                    <div class="flex items-center justify-between">
                      <Label for="f-uri" class="text-xs font-semibold flex items-center gap-1.5 text-foreground/90">
                        <Link class="w-3.5 h-3.5 text-primary" />
                        Connection URI / URL (Optional)
                      </Label>
                      <Button
                        v-if="uriInput"
                        variant="ghost"
                        class="h-5 text-[10px] px-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                        @click="uriInput = ''"
                        type="button"
                      >
                        Clear
                      </Button>
                    </div>
                    <Input
                      id="f-uri"
                      v-model="uriInput"
                      placeholder="e.g. mysql://avnadmin:password@host:port/defaultdb"
                      class="h-8 text-xs font-mono bg-[#090A0C] border-[#242629]"
                      @input="parseConnectionUri"
                    />
                    <p class="text-[10px] text-muted-foreground/60 leading-relaxed">
                      Paste a connection string/URI to automatically pre-fill all fields.
                    </p>
                  </div>

                  <div class="grid gap-1.5">
                    <Label for="f-name" class="text-xs font-medium">Connection Name</Label>
                    <Input id="f-name" v-model="form.name" placeholder="e.g. Production DB" class="h-8 text-xs bg-[#090A0C] border-[#242629]" />
                  </div>

                  <div class="grid gap-1.5">
                    <Label class="text-xs font-medium">Environment Badge Color</Label>
                    <div class="grid grid-cols-3 gap-2">
                      <button
                        v-for="color in colorOptions"
                        :key="color.value"
                        type="button"
                        class="flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-colors cursor-pointer text-left bg-transparent"
                        :class="form.color === color.value ? 'border-primary bg-primary/5 font-medium' : 'border-[#242629] hover:border-border hover:bg-accent/40'"
                        @click="form.color = color.value"
                      >
                        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: color.value }"></span>
                        <span class="truncate text-[10px]">{{ color.label }}</span>
                      </button>
                    </div>
                  </div>

                  <div class="grid grid-cols-3 gap-3">
                    <div class="col-span-2 grid gap-1.5">
                      <Label for="f-host" class="text-xs font-medium">Host / Server</Label>
                      <Input id="f-host" v-model="form.host" placeholder="127.0.0.1" class="h-8 text-xs font-mono bg-[#090A0C] border-[#242629]" />
                    </div>
                    <div class="grid gap-1.5">
                      <Label for="f-port" class="text-xs font-medium">Port</Label>
                      <Input id="f-port" v-model.number="form.port" type="number" placeholder="3306" class="h-8 text-xs font-mono bg-[#090A0C] border-[#242629]" />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div class="grid gap-1.5">
                      <Label for="f-user" class="text-xs font-medium">Username</Label>
                      <Input id="f-user" v-model="form.username" placeholder="root" class="h-8 text-xs font-mono bg-[#090A0C] border-[#242629]" />
                    </div>
                    <div class="grid gap-1.5">
                      <Label for="f-pass" class="text-xs font-medium">Password</Label>
                      <div class="flex gap-1.5">
                        <Input
                          id="f-pass"
                          :type="showPw ? 'text' : 'password'"
                          v-model="form.password"
                          placeholder="••••••••"
                          class="h-8 text-xs font-mono flex-1 bg-[#090A0C] border-[#242629]"
                        />
                        <Button variant="outline" size="sm" class="h-8 text-xs px-2.5 border-[#242629] bg-[#131416] cursor-pointer" @click="showPw = !showPw" type="button">
                          {{ showPw ? 'Hide' : 'Show' }}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div class="grid gap-1.5">
                      <Label for="f-dbtype" class="text-xs font-medium">Database Type</Label>
                      <select
                        id="f-dbtype"
                        v-model="form.dbType"
                        class="flex h-8 w-full rounded-md border border-[#242629] bg-[#090A0C] px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="mysql">MySQL</option>
                        <option value="mariadb">MariaDB</option>
                      </select>
                    </div>

                    <div class="grid gap-1.5">
                      <Label for="f-db" class="text-xs font-medium">Default Schema</Label>
                      <Input id="f-db" v-model="form.database" placeholder="Optional (e.g. my_app)" class="h-8 text-xs font-mono bg-[#090A0C] border-[#242629]" />
                    </div>
                  </div>
                </div>

                <!-- SSL & Security Tab -->
                <div v-else-if="activeTab === 'ssl'" class="space-y-4 max-w-lg">
                  <div class="grid gap-1.5">
                    <Label for="f-sslmode" class="text-xs font-medium">SSL Mode Enforcement</Label>
                    <select
                      id="f-sslmode"
                      v-model="form.sslMode"
                      class="flex h-9 w-full rounded-md border border-[#242629] bg-[#090A0C] px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="preferred">Preferred (Auto-negotiate SSL)</option>
                      <option value="required">Required (Enforce SSL)</option>
                      <option value="verify_ca">Verify CA (Validate CA)</option>
                      <option value="verify_identity">Verify Identity (Validate Hostname)</option>
                      <option value="disabled">Disabled (Plaintext)</option>
                    </select>
                  </div>

                  <div class="pt-2 border-t border-[#242629]">
                    <div class="flex items-start gap-2.5">
                      <input
                        id="f-readonly"
                        type="checkbox"
                        v-model="form.readOnly"
                        class="size-4 accent-primary cursor-pointer rounded-sm mt-0.5"
                      />
                      <div>
                        <Label for="f-readonly" class="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                          <ShieldAlert class="w-3.5 h-3.5 text-amber-500" />
                          Read-only Safe Mode
                        </Label>
                        <p class="text-[10px] text-muted-foreground/60 mt-0.5">
                          Prevents accidental modifications. Destructive statements will trigger warnings.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Advanced Tab -->
                <div v-else-if="activeTab === 'advanced'" class="space-y-4 max-w-lg">
                  <div class="grid grid-cols-2 gap-3">
                    <div class="grid gap-1.5">
                      <Label for="f-timeout" class="text-xs font-medium">Connection Timeout (Seconds)</Label>
                      <Input
                        id="f-timeout"
                        v-model.number="form.connectTimeoutSecs"
                        type="number"
                        min="1"
                        max="120"
                        placeholder="10"
                        class="h-8 text-xs font-mono bg-[#090A0C] border-[#242629]"
                      />
                    </div>

                    <div class="grid gap-1.5">
                      <Label for="f-charset" class="text-xs font-medium">Encoding</Label>
                      <select
                        id="f-charset"
                        v-model="form.charset"
                        class="flex h-8 w-full rounded-md border border-[#242629] bg-[#090A0C] px-3 py-1 text-xs font-mono ring-offset-background"
                      >
                        <option value="utf8mb4">utf8mb4 (Recommended)</option>
                        <option value="utf8">utf8</option>
                        <option value="latin1">latin1</option>
                        <option value="ascii">ascii</option>
                      </select>
                    </div>
                  </div>

                  <div class="grid gap-1.5">
                    <Label for="f-socket" class="text-xs font-medium">Unix Socket Path (Optional)</Label>
                    <Input
                      id="f-socket"
                      v-model="form.socketPath"
                      placeholder="e.g. /tmp/mysql.sock"
                      class="h-8 text-xs font-mono bg-[#090A0C] border-[#242629]"
                    />
                  </div>
                </div>
              </div>

              <!-- Edit Panel Footer -->
              <div class="px-6 py-3 border-t border-[#242629] bg-[#131416]/20 flex flex-col gap-2 flex-shrink-0">
                <!-- Test status banner -->
                <div
                  v-if="testResult"
                  class="rounded-md px-3 py-1.5 text-[11px] font-mono flex items-center justify-between animate-fade-in"
                  :class="testResult.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-red-500/10 text-red-400 border border-red-500/25'"
                >
                  <div class="flex items-center gap-2 truncate">
                    <CheckCircle2 v-if="testResult.ok" class="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <XCircle v-else class="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <span class="truncate">{{ testResult.ok ? 'Connection successful' : testResult.error }}</span>
                  </div>
                  <span v-if="testResult.ok" class="text-[9px] font-bold text-emerald-500 px-1.5 py-0.5 bg-emerald-500/15 rounded">
                    {{ testResult.latency }}ms
                  </span>
                </div>

                <div class="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    class="text-xs h-8 px-3 gap-1.5 border-[#242629] bg-[#131416] hover:bg-[#16171a] cursor-pointer"
                    :disabled="testing"
                    @click="testConn"
                    type="button"
                  >
                    <template v-if="testing">
                      <svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      Testing...
                    </template>
                    <template v-else>
                      Test Connection
                    </template>
                  </Button>

                  <div class="flex items-center gap-2">
                    <Button variant="ghost" size="sm" class="text-xs h-8 cursor-pointer" @click="currentView = 'dashboard'" type="button" :disabled="connStore.status === 'connecting'">
                      Cancel
                    </Button>
                    <Button size="sm" class="text-xs h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground hover:opacity-90 cursor-pointer" @click="save" type="button" :disabled="connStore.status === 'connecting'">
                      <template v-if="connStore.status === 'connecting'">
                        <svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        Saving & Connecting...
                      </template>
                      <template v-else>
                        Save & Connect
                      </template>
                    </Button>
                  </div>
                </div>
              </div>
            </template>

            <!-- Empty form state -->
            <div v-else class="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
              <Server class="w-8 h-8 text-muted-foreground/40" />
              <div class="space-y-1">
                <h3 class="text-xs font-medium">No Connection Selected</h3>
                <p class="text-[11px] text-muted-foreground/60">Select an configuration from the sidebar list or add a new one.</p>
              </div>
              <Button size="sm" class="text-xs mt-2 cursor-pointer" @click="newConnection">Create Connection</Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom client footer links -->
      <div class="w-full text-center py-4 text-[10px] text-muted-foreground/50 border-t border-border/10 flex flex-col md:flex-row justify-center items-center gap-1.5 md:gap-4 flex-shrink-0 select-none mt-auto">
        <a href="#" class="hover:text-muted-foreground">What's New</a>
        <span class="hidden md:inline text-muted-foreground/30">&bull;</span>
        <a href="#" class="hover:text-muted-foreground">Check for updates</a>
        <span class="hidden md:inline text-muted-foreground/30">&bull;</span>
        <a href="#" class="hover:text-muted-foreground flex items-center gap-1 justify-center">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 1-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/></svg>
          Discord
        </a>
        <span class="hidden md:inline text-muted-foreground/30">&bull;</span>
        <a href="#" class="hover:text-muted-foreground">DBPro.app</a>
        <span class="hidden md:inline text-muted-foreground/30">&bull;</span>
        <a href="#" class="hover:text-muted-foreground">Manage Devices</a>
        <span class="hidden md:inline text-muted-foreground/30">&bull;</span>
        <a href="#" class="hover:text-muted-foreground">Upgrade</a>
        <span class="hidden md:inline text-muted-foreground/30">&bull;</span>
        <a href="#" class="hover:text-muted-foreground">Sign In / Sign Up</a>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Search, ShieldAlert, Lock, Server, Copy, Trash2, Globe, Sliders, CheckCircle2, XCircle, Plus, Link,
  ChevronLeft, Settings, Database, Pencil, ChevronDown
} from '@lucide/vue'
import { useUiStore } from '../stores/ui'
import { useConnectionStore, type Connection } from '../stores/connection'
import { activeTheme } from '../theme/manager'
import ShaderGradient from './ShaderGradient.vue'
import { toast } from 'vue-sonner'

const uiStore = useUiStore()
const connStore = useConnectionStore()

// State
const selectedId = ref<string | null>(connStore.activeId)
const isNew = ref(false)
const showPw = ref(false)
const testing = ref(false)
const searchQuery = ref('')
const editSearchQuery = ref('')
const activeTab = ref<'general' | 'ssl' | 'advanced'>('general')
const testResult = ref<{ ok: boolean; latency?: number; error?: string } | null>(null)
const uriInput = ref('')

const hoveredConnId = ref<string | null>(null)
const connectingId = ref<string | null>(null)
const currentView = ref<'dashboard' | 'edit'>('dashboard')
const showGradientBg = ref(localStorage.getItem('show-gradient-bg') !== 'false')

const colorOptions = [
  { value: '#EF4444', label: 'Prod' },
  { value: '#F59E0B', label: 'Staging' },
  { value: '#22C55E', label: 'Dev' },
  { value: '#3B82F6', label: 'Local' },
  { value: '#A78BFA', label: 'Test' },
  { value: '#67E8F9', label: 'Other' },
]

type FormData = Omit<Connection, 'id' | 'createdAt'>
const form = ref<FormData | null>(null)

// Compute dynamic primary color of the ShaderGradient
const activeColor1 = computed(() => {
  // 1. If we are hovering a connection in the grid, use its badge color
  if (hoveredConnId.value) {
    const conn = connStore.connections.find(c => c.id === hoveredConnId.value)
    if (conn?.color) return conn.color
  }
  // 2. If we are editing/configuring a connection, use its color
  if (currentView.value === 'edit' && form.value?.color) {
    return form.value.color
  }
  // 3. Fallback to app theme's primary color or default teal
  return activeTheme.value?.colors?.primary || '#73bfc4'
})

// Keep gradient background toggle state saved
watch(showGradientBg, (val) => {
  localStorage.setItem('show-gradient-bg', String(val))
})

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

function selectConn(id: string) {
  selectedId.value = id
  isNew.value = false
  testResult.value = null
  activeTab.value = 'general'
  uriInput.value = ''
  const conn = connStore.connections.find(c => c.id === id)
  if (conn) {
    form.value = {
      name: conn.name,
      host: conn.host,
      port: conn.port,
      database: conn.database,
      username: conn.username,
      password: conn.password,
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
    }
  }
}

function newConnection() {
  isNew.value = true
  selectedId.value = null
  testResult.value = null
  activeTab.value = 'general'
  uriInput.value = ''
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
  const dupName = `${form.value.name} (Copy)`
  form.value = {
    ...form.value,
    name: dupName,
  }
  isNew.value = true
  selectedId.value = null
}

async function confirmDeleteConn(id: string) {
  const conn = connStore.connections.find(c => c.id === id)
  if (!conn) return
  if (window.confirm(`Delete connection "${conn.name}"?`)) {
    await connStore.removeConnection(id)
    if (selectedId.value === id) {
      selectInitialConnection()
    }
  }
}

async function testConn() {
  if (!form.value) return
  testing.value = true
  testResult.value = null
  const payload = {
    ...form.value,
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

// Connections Import/Export
function exportConnections() {
  try {
    const dataStr = JSON.stringify(connStore.connections, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', 'select_connections.json')
    linkElement.click()
    toast.success('Connections configuration exported successfully.')
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
              })
              count++
            }
          }
          toast.success(`Successfully imported ${count} configurations.`)
          selectInitialConnection()
        } else {
          toast.error('Invalid format. Must be a JSON array of connections.')
        }
      } catch (err) {
        toast.error('Parse failed: ' + String(err))
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

// Watch connection modal open event
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
.bg-grid-pattern {
  background-size: 40px 40px;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
}

.animate-fade-in {
  animation: fadeIn 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Custom Scrollbars */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
