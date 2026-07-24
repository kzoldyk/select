<template>
  <Dialog :open="uiStore.connectionManagerOpen" @update:open="uiStore.closeConnectionManager()">
    <DialogContent class="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex !p-0">
      <!-- Left: connection list -->
      <div class="w-[200px] border-r border-border flex flex-col flex-shrink-0 bg-muted/20">
        <div class="px-3 py-2 border-b border-border/50">
          <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connections</h3>
        </div>
        <div class="flex-1 overflow-y-auto py-2">
          <button
            v-for="conn in connStore.connections"
            :key="conn.id"
            class="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-accent border-l-2 border-transparent transition-all bg-transparent cursor-pointer group"
            :class="{ 'bg-accent/80 text-foreground border-l-primary': selectedId === conn.id }"
            @click="selectConn(conn.id)"
          >
            <span 
              class="w-2 h-2 rounded-full flex-shrink-0 transition-shadow" 
              :style="{ backgroundColor: conn.color || '#9CA3AF', color: conn.color || '#9CA3AF' }"
              :class="{ 'shadow-[0_0_8px_currentColor] ring-2 ring-background': conn.id === connStore.activeId && connStore.status === 'connected', 'opacity-50 group-hover:opacity-100': conn.id !== connStore.activeId }"
            ></span>
            <div class="flex-1 overflow-hidden">
              <div class="text-ellipsis whitespace-nowrap font-medium" :class="{ 'text-foreground': conn.id === connStore.activeId }">{{ conn.name }}</div>
              <div class="text-[9px] text-muted-foreground/70 mt-0.5 truncate">{{ conn.host }}</div>
            </div>
            <span v-if="conn.id === connStore.activeId && connStore.status === 'connected'" class="text-[9px] font-bold text-emerald-500 tracking-wide" title="Connected">✓</span>
          </button>
        </div>
        <div class="p-2 border-t border-border/50">
          <Button variant="outline" size="sm" class="w-full text-xs justify-center shadow-sm" @click="newConnection">
            + New Connection
          </Button>
        </div>
      </div>

      <!-- Right: form -->
      <div class="flex-1 overflow-y-auto bg-background">
        <div v-if="form" class="flex flex-col h-full">
          <div class="px-5 py-4 border-b border-border/50 flex-shrink-0">
            <h2 class="text-lg font-semibold tracking-tight">{{ isNew ? 'Create Connection' : 'Edit Connection' }}</h2>
            <p class="text-xs text-muted-foreground mt-1">{{ isNew ? 'Set up a new database connection.' : 'Modify existing connection details.' }}</p>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            <!-- General -->
            <div class="space-y-4">
              <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <span class="w-full h-px bg-border flex-1"></span>
                General
                <span class="w-full h-px bg-border flex-1"></span>
              </h3>
              
              <div class="grid gap-2">
                <Label for="f-name" class="text-xs font-medium">Connection Name</Label>
                <Input id="f-name" v-model="form.name" placeholder="e.g. Production DB" class="h-8 text-xs" />
              </div>

              <div class="grid gap-2">
                <Label class="text-xs font-medium">Environment (Color)</Label>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    v-for="color in colorOptions"
                    :key="color.value"
                    class="flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs transition-colors cursor-pointer text-left"
                    :class="form.color === color.value ? 'border-foreground bg-accent' : 'border-input hover:border-border hover:bg-accent/50'"
                    @click="form.color = color.value"
                    type="button"
                  >
                    <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: color.value }"></span>
                    <span class="truncate">{{ color.label }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Database -->
            <div class="space-y-4">
              <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <span class="w-full h-px bg-border flex-1"></span>
                Database Setup
                <span class="w-full h-px bg-border flex-1"></span>
              </h3>
              
              <div class="grid grid-cols-2 gap-3">
                <div class="grid gap-2">
                  <Label for="f-dbtype" class="text-xs font-medium">Database Type</Label>
                  <select
                    id="f-dbtype"
                    v-model="form.dbType"
                    class="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="mysql">MySQL</option>
                    <option value="mariadb">MariaDB</option>
                  </select>
                </div>
                <div class="grid gap-2">
                  <Label for="f-db" class="text-xs font-medium">Default Database</Label>
                  <Input id="f-db" v-model="form.database" placeholder="Leave empty for none" class="h-8 text-xs" />
                </div>
              </div>

              <div class="grid grid-cols-4 gap-3">
                <div class="col-span-3 grid gap-2">
                  <Label for="f-host" class="text-xs font-medium">Host</Label>
                  <Input id="f-host" v-model="form.host" placeholder="localhost" class="h-8 text-xs" />
                </div>
                <div class="grid gap-2">
                  <Label for="f-port" class="text-xs font-medium">Port</Label>
                  <Input id="f-port" v-model.number="form.port" type="number" placeholder="3306" class="h-8 text-xs" />
                </div>
              </div>
            </div>

            <!-- Authentication -->
            <div class="space-y-4">
              <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <span class="w-full h-px bg-border flex-1"></span>
                Authentication
                <span class="w-full h-px bg-border flex-1"></span>
              </h3>
              
              <div class="grid grid-cols-2 gap-3">
                <div class="grid gap-2">
                  <Label for="f-user" class="text-xs font-medium">Username</Label>
                  <Input id="f-user" v-model="form.username" placeholder="root" class="h-8 text-xs" />
                </div>
                <div class="grid gap-2">
                  <Label for="f-pass" class="text-xs font-medium">Password</Label>
                  <div class="flex gap-2">
                    <Input
                      id="f-pass"
                      :type="showPw ? 'text' : 'password'"
                      v-model="form.password"
                      placeholder="••••••••"
                      class="h-8 text-xs flex-1"
                    />
                    <Button variant="outline" size="sm" class="h-8 text-xs px-2" @click="showPw = !showPw" type="button">
                      {{ showPw ? 'Hide' : 'Show' }}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Advanced -->
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <input
                  id="f-readonly"
                  type="checkbox"
                  v-model="form.readOnly"
                  class="size-3.5 accent-primary cursor-pointer rounded-sm"
                />
                <Label for="f-readonly" class="text-xs font-medium cursor-pointer">Read-only connection</Label>
              </div>
              <p class="text-[10px] text-muted-foreground">When enabled, queries that modify data will require a prompt before execution.</p>
            </div>

            <!-- Test Result -->
            <div v-if="testResult" class="rounded-md px-3 py-2 text-xs font-mono shadow-sm" :class="testResult.ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'">
              {{ testResult.ok ? '✓ Connection successful (' + testResult.latency + 'ms)' : '✗ ' + testResult.error }}
            </div>
            
            <div v-else-if="connStore.lastError && !testResult && selectedId === connStore.activeId" class="rounded-md px-3 py-2 text-xs font-mono bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 shadow-sm">
              {{ connStore.lastError }}
            </div>
          </div>

          <div class="px-5 py-3 border-t border-border/50 bg-muted/10 flex items-center justify-between flex-shrink-0">
            <Button variant="outline" size="sm" class="text-xs h-8 bg-background shadow-sm" :disabled="testing" @click="testConn" type="button">
              {{ testing ? 'Testing...' : 'Test Connection' }}
            </Button>
            <div class="flex gap-2">
              <Button variant="ghost" size="sm" class="text-xs h-8" @click="uiStore.closeConnectionManager()" type="button" :disabled="connStore.status === 'connecting'">Cancel</Button>
              <Button size="sm" class="text-xs h-8 shadow-sm" @click="save" type="button" :disabled="connStore.status === 'connecting'">
                <template v-if="connStore.status === 'connecting'">
                  <svg class="w-3.5 h-3.5 mr-1.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Connecting...
                </template>
                <template v-else>Save & Connect</template>
              </Button>
            </div>
          </div>
        </div>
        
        <div v-else class="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
          <div class="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
            <svg class="w-6 h-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12c-2.66 0-4.73-1.67-4.98-3.79l-7.85 4.54A5.99 5.99 0 0 1 12 18a6 6 0 1 1 5.2-9l5.05-2.92"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/></svg>
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
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { useUiStore } from '../stores/ui'
import { useConnectionStore, type Connection } from '../stores/connection'

const uiStore = useUiStore()
const connStore = useConnectionStore()

const selectedId = ref<string | null>(connStore.activeId)
const isNew = ref(false)
const showPw = ref(false)
const testing = ref(false)
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

function selectConn(id: string) {
  selectedId.value = id
  isNew.value = false
  testResult.value = null
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
      ssl: conn.ssl,
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
  form.value = {
    name: 'New Connection',
    host: 'localhost',
    port: 3306,
    database: '',
    username: 'root',
    password: '',
    dbType: 'mysql',
    readOnly: false,
    ssl: false,
    sshTunnel: false,
    color: '#3B82F6',
  }
}

async function testConn() {
  if (!form.value) return
  testing.value = true
  testResult.value = null
  testResult.value = await connStore.testConnection(form.value)
  testing.value = false
}

async function save() {
  if (!form.value) return
  let targetId = selectedId.value
  if (isNew.value) {
    targetId = await connStore.addConnection(form.value)
  } else if (targetId) {
    await connStore.updateConnection(targetId, form.value)
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
