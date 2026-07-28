<template>
  <Dialog :open="uiStore.connectionManagerOpen" @update:open="uiStore.closeConnectionManager()">
    <DialogContent class="sm:max-w-[720px] h-[640px] max-h-[92vh] overflow-hidden flex !p-0 gap-0 border-border shadow-2xl">
      <!-- Left: Connection sidebar with search & list -->
      <div class="w-[230px] border-r border-border flex flex-col flex-shrink-0 bg-muted/20 select-none">
        <div class="p-3 border-b border-border/60 space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Connections</h3>
            <span class="text-[10px] font-mono text-muted-foreground/70">{{ connStore.connections.length }}</span>
          </div>
          <div class="relative">
            <Search class="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground/60" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Filter connections..."
              class="w-full h-7 pl-8 pr-2.5 bg-background border border-input rounded-md text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          <div
            v-for="conn in filteredConnections"
            :key="conn.id"
            class="group flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-all cursor-pointer"
            :class="selectedId === conn.id ? 'bg-accent text-foreground font-medium shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'"
            @click="selectConn(conn.id)"
          >
            <div class="flex items-center gap-2.5 overflow-hidden min-w-0">
              <span
                class="w-2 h-2 rounded-full flex-shrink-0 transition-all"
                :style="{ backgroundColor: conn.color || '#9CA3AF' }"
                :class="{ 'ring-2 ring-emerald-500/40 shadow-[0_0_8px_currentColor]': conn.id === connStore.activeId && connStore.status === 'connected' }"
              ></span>
              <div class="min-w-0 flex-1">
                <div class="truncate text-[12px] flex items-center gap-1.5">
                  <span class="truncate">{{ conn.name }}</span>
                  <span v-if="conn.readOnly" title="Read-only mode">
                    <ShieldAlert class="w-3 h-3 text-amber-500 flex-shrink-0" />
                  </span>
                </div>
                <div class="text-[10px] text-muted-foreground/70 truncate font-mono">
                  {{ conn.host }}:{{ conn.port }}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1 flex-shrink-0">
              <span v-if="conn.id === connStore.activeId && connStore.status === 'connected'" class="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Connected"></span>
              <button
                v-if="connStore.connections.length > 1"
                class="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 rounded transition-opacity"
                title="Delete connection"
                @click.stop="confirmDeleteConn(conn.id)"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            </div>
          </div>

          <div v-if="filteredConnections.length === 0" class="p-4 text-center text-xs text-muted-foreground/60">
            No connections found.
          </div>
        </div>

        <div class="p-2 border-t border-border/60 bg-background/50">
          <Button variant="outline" size="sm" class="w-full text-xs h-7 justify-center gap-1.5 shadow-xs" @click="newConnection">
            <Plus class="w-3.5 h-3.5" />
            New Connection
          </Button>
        </div>
      </div>

      <!-- Right: Detailed Configuration Panel -->
      <div class="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
        <template v-if="form">
          <!-- Top Header -->
          <div class="px-6 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0 bg-muted/10">
            <div class="flex items-center gap-2.5">
              <span
                class="w-3 h-3 rounded-full flex-shrink-0"
                :style="{ backgroundColor: form.color || '#3B82F6' }"
              ></span>
              <div>
                <h2 class="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                  {{ form.name || 'Untitled Connection' }}
                  <span v-if="isNew" class="text-[10px] font-normal px-1.5 py-0.2 bg-primary/10 text-primary rounded-full">New</span>
                </h2>
                <p class="text-[11px] text-muted-foreground/80 font-mono">
                  {{ form.dbType === 'mariadb' ? 'MariaDB' : 'MySQL' }} &middot; {{ form.username || 'root' }}@{{ form.host || 'localhost' }}:{{ form.port || 3306 }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                class="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                title="Duplicate configuration"
                @click="duplicateConn"
              >
                <Copy class="w-3.5 h-3.5" />
                <span class="hidden sm:inline">Duplicate</span>
              </Button>
            </div>
          </div>

          <!-- Configuration Tabs Navigation -->
          <div class="flex items-center gap-4 px-6 border-b border-border bg-background select-none flex-shrink-0">
            <button
              class="py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5"
              :class="activeTab === 'general' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
              @click="activeTab = 'general'"
            >
              <Server class="w-3.5 h-3.5 opacity-70" />
              General
            </button>

            <button
              class="py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5"
              :class="activeTab === 'ssl' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
              @click="activeTab = 'ssl'"
            >
              <Lock class="w-3.5 h-3.5 opacity-70" />
              SSL & Security
              <span v-if="form.sslMode && form.sslMode !== 'disabled'" class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </button>

            <button
              class="py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5"
              :class="activeTab === 'advanced' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
              @click="activeTab = 'advanced'"
            >
              <Sliders class="w-3.5 h-3.5 opacity-70" />
              Advanced
            </button>
          </div>

          <!-- Tab Content Body -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- General Tab -->
            <div v-if="activeTab === 'general'" class="space-y-4 max-w-lg">
              <div class="grid gap-1.5">
                <Label for="f-name" class="text-xs font-medium">Connection Name</Label>
                <Input id="f-name" v-model="form.name" placeholder="e.g. Production DB" class="h-8 text-xs" />
              </div>

              <div class="grid gap-1.5">
                <Label class="text-xs font-medium">Environment Badge Color</Label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="color in colorOptions"
                    :key="color.value"
                    type="button"
                    class="flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-colors cursor-pointer text-left"
                    :class="form.color === color.value ? 'border-primary bg-primary/5 font-medium' : 'border-input hover:border-border hover:bg-accent/40'"
                    @click="form.color = color.value"
                  >
                    <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: color.value }"></span>
                    <span class="truncate text-[11px]">{{ color.label }}</span>
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div class="col-span-2 grid gap-1.5">
                  <Label for="f-host" class="text-xs font-medium">Host / Server</Label>
                  <Input id="f-host" v-model="form.host" placeholder="127.0.0.1 or db.example.com" class="h-8 text-xs font-mono" />
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
                      class="h-8 text-xs font-mono flex-1"
                    />
                    <Button variant="outline" size="sm" class="h-8 text-xs px-2.5" @click="showPw = !showPw" type="button">
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
                    class="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="mysql">MySQL</option>
                    <option value="mariadb">MariaDB</option>
                  </select>
                </div>

                <div class="grid gap-1.5">
                  <Label for="f-db" class="text-xs font-medium">Default Schema / Database</Label>
                  <Input id="f-db" v-model="form.database" placeholder="Optional (e.g. my_app)" class="h-8 text-xs font-mono" />
                </div>
              </div>
            </div>

            <!-- SSL & Security Tab -->
            <div v-else-if="activeTab === 'ssl'" class="space-y-5 max-w-lg">
              <div class="space-y-2">
                <Label for="f-sslmode" class="text-xs font-medium">SSL Mode Enforcement</Label>
                <select
                  id="f-sslmode"
                  v-model="form.sslMode"
                  class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="preferred">Preferred (Default - Auto-negotiate SSL if supported)</option>
                  <option value="required">Required (Enforce SSL encryption - RDS, PlanetScale, GCP)</option>
                  <option value="verify_ca">Verify CA (Encrypted + Validate Certificate Authority)</option>
                  <option value="verify_identity">Verify Identity (Encrypted + Validate Server Hostname)</option>
                  <option value="disabled">Disabled (Plaintext connection without SSL)</option>
                </select>
                <p class="text-[11px] text-muted-foreground/80">
                  Select <strong class="text-foreground">Required</strong> for cloud database providers like AWS RDS, PlanetScale, DigitalOcean, or GCP Cloud SQL that enforce SSL.
                </p>
              </div>

              <div class="p-3 bg-muted/30 border border-border rounded-lg space-y-2">
                <div class="flex items-center gap-2 text-xs font-medium text-foreground">
                  <Globe class="w-4 h-4 text-primary" />
                  Cloud Database SSL Quick Guide
                </div>
                <div class="text-[11px] text-muted-foreground/80 space-y-1">
                  <div>&bull; <strong>AWS RDS / Aurora</strong>: SSL Mode = Required</div>
                  <div>&bull; <strong>PlanetScale</strong>: SSL Mode = Required</div>
                  <div>&bull; <strong>DigitalOcean Managed DB</strong>: SSL Mode = Required</div>
                  <div>&bull; <strong>Local MySQL / Docker</strong>: SSL Mode = Preferred or Disabled</div>
                </div>
              </div>

              <div class="pt-2 border-t border-border/60">
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
                    <p class="text-[11px] text-muted-foreground/80 mt-0.5">
                      Prevents accidental modifications. Destructive statements (`UPDATE`, `DELETE`, `DROP`, `TRUNCATE`) will trigger confirmation prompts before execution.
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
                    class="h-8 text-xs font-mono"
                  />
                </div>

                <div class="grid gap-1.5">
                  <Label for="f-charset" class="text-xs font-medium">Character Encoding</Label>
                  <select
                    id="f-charset"
                    v-model="form.charset"
                    class="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="utf8mb4">utf8mb4 (Recommended - Universal Unicode & Emojis)</option>
                    <option value="utf8">utf8 (Standard UTF-8)</option>
                    <option value="latin1">latin1 (ISO 8859-1 West European)</option>
                    <option value="ascii">ascii (US ASCII)</option>
                  </select>
                </div>
              </div>

              <div class="grid gap-1.5">
                <Label for="f-socket" class="text-xs font-medium">Unix Socket Path (Optional)</Label>
                <Input
                  id="f-socket"
                  v-model="form.socketPath"
                  placeholder="e.g. /tmp/mysql.sock or /var/run/mysqld/mysqld.sock"
                  class="h-8 text-xs font-mono"
                />
                <p class="text-[11px] text-muted-foreground/70">Leave empty when connecting via TCP/IP Host and Port.</p>
              </div>
            </div>
          </div>

          <!-- Status & Footer Controls -->
          <div class="px-6 py-3 border-t border-border bg-muted/10 flex flex-col gap-2 flex-shrink-0">
            <!-- Connection Test Result Banner -->
            <div
              v-if="testResult"
              class="rounded-md px-3 py-2 text-xs font-mono flex items-center justify-between"
              :class="testResult.ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'"
            >
              <div class="flex items-center gap-2 truncate">
                <CheckCircle2 v-if="testResult.ok" class="w-4 h-4 flex-shrink-0 text-emerald-500" />
                <XCircle v-else class="w-4 h-4 flex-shrink-0 text-red-500" />
                <span class="truncate">{{ testResult.ok ? 'Connection successful' : testResult.error }}</span>
              </div>
              <span v-if="testResult.ok" class="text-[10px] font-bold text-emerald-500 px-1.5 py-0.5 bg-emerald-500/15 rounded">
                {{ testResult.latency }}ms
              </span>
            </div>

            <div class="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                class="text-xs h-8 px-3 gap-1.5 bg-background shadow-xs"
                :disabled="testing"
                @click="testConn"
                type="button"
              >
                <template v-if="testing">
                  <svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Testing Connection...
                </template>
                <template v-else>
                  Test Connection
                </template>
              </Button>

              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" class="text-xs h-8" @click="uiStore.closeConnectionManager()" type="button" :disabled="connStore.status === 'connecting'">
                  Cancel
                </Button>
                <Button size="sm" class="text-xs h-8 shadow-xs gap-1.5" @click="save" type="button" :disabled="connStore.status === 'connecting'">
                  <template v-if="connStore.status === 'connecting'">
                    <svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Connecting...
                  </template>
                  <template v-else>
                    Save & Connect
                  </template>
                </Button>
              </div>
            </div>
          </div>
        </template>

        <!-- Empty selection state -->
        <div v-else class="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 select-none">
          <div class="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
            <Server class="w-6 h-6 text-muted-foreground" />
          </div>
          <div class="space-y-1">
            <h3 class="text-sm font-medium">No Connection Selected</h3>
            <p class="text-xs text-muted-foreground">Select a connection from the list or create a new one.</p>
          </div>
          <Button size="sm" class="text-xs mt-2" @click="newConnection">Create Connection</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import {
  Search, ShieldAlert, Lock, Server, Copy, Trash2, Globe, Sliders, CheckCircle2, XCircle, Plus
} from '@lucide/vue'
import { useUiStore } from '../stores/ui'
import { useConnectionStore, type Connection, type SslMode } from '../stores/connection'

const uiStore = useUiStore()
const connStore = useConnectionStore()

const selectedId = ref<string | null>(connStore.activeId)
const isNew = ref(false)
const showPw = ref(false)
const testing = ref(false)
const searchQuery = ref('')
const activeTab = ref<'general' | 'ssl' | 'advanced'>('general')
const testResult = ref<{ ok: boolean; latency?: number; error?: string } | null>(null)

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

const filteredConnections = computed(() => {
  if (!searchQuery.value.trim()) return connStore.connections
  const q = searchQuery.value.toLowerCase()
  return connStore.connections.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.host.toLowerCase().includes(q) ||
    c.database.toLowerCase().includes(q)
  )
})

function selectConn(id: string) {
  selectedId.value = id
  isNew.value = false
  testResult.value = null
  activeTab.value = 'general'
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
    selectInitialConnection()
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
    const connected = await connStore.connect(targetId)
    if (!connected) {
      testResult.value = null
      return
    }
  }
  uiStore.closeConnectionManager()
}

function selectInitialConnection() {
  const id = connStore.activeId ?? connStore.connections[0]?.id
  if (id) selectConn(id)
  else {
    selectedId.value = null
    isNew.value = false
    testResult.value = null
    form.value = null
  }
}

watch(
  () => uiStore.connectionManagerOpen,
  (open) => {
    if (!open) return
    showPw.value = false
    searchQuery.value = ''
    selectInitialConnection()
  },
  { immediate: true }
)

watch(
  () => [connStore.activeId, connStore.connections.length] as const,
  () => {
    if (uiStore.connectionManagerOpen && !isNew.value) selectInitialConnection()
  }
)
</script>
