<template>
  <Dialog :open="uiStore.connectionManagerOpen" @update:open="uiStore.closeConnectionManager()">
    <DialogContent class="sm:max-w-[540px] max-h-[90vh] overflow-hidden flex !p-0">
      <!-- Left: connection list -->
      <div class="w-[180px] border-r border-border flex flex-col flex-shrink-0">
        <div class="flex-1 overflow-y-auto py-2">
          <button
            v-for="conn in connStore.connections"
            :key="conn.id"
            class="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-accent border-l-2 border-transparent transition-colors bg-transparent border-none cursor-pointer"
            :class="{ 'bg-accent text-foreground border-l-primary': selectedId === conn.id }"
            @click="selectConn(conn.id)"
          >
            <span class="w-2 h-2 rounded-full flex-shrink-0" :class="conn.id === connStore.activeId ? 'bg-emerald-500' : 'bg-muted-foreground'"></span>
            <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ conn.name }}</span>
            <span class="text-[9px] text-muted-foreground flex-shrink-0">{{ conn.dbType }}</span>
          </button>
        </div>
        <Button variant="ghost" size="sm" class="mx-2 my-2 text-xs justify-center" @click="newConnection">
          + New connection
        </Button>
      </div>

      <!-- Right: form -->
      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="form" class="space-y-3">
          <DialogHeader>
            <DialogTitle class="text-sm">{{ isNew ? 'New Connection' : 'Edit Connection' }}</DialogTitle>
          </DialogHeader>

          <div class="grid gap-2">
            <Label for="f-name" class="text-xs text-muted-foreground uppercase tracking-wider">Name</Label>
            <Input id="f-name" v-model="form.name" placeholder="My database" class="h-8 text-xs" />
          </div>

          <div class="grid gap-2">
            <Label for="f-dbtype" class="text-xs text-muted-foreground uppercase tracking-wider">DB Type</Label>
            <select
              id="f-dbtype"
              v-model="form.dbType"
              class="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
	            >
	              <option value="mysql">MySQL</option>
	              <option value="mariadb">MariaDB</option>
	            </select>
	            <p class="text-[10px] text-muted-foreground">
	              PostgreSQL, SQLite, SQL Server, and MongoDB are not available in this build.
	            </p>
	          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="col-span-2 grid gap-2">
              <Label for="f-host" class="text-xs text-muted-foreground uppercase tracking-wider">Host</Label>
              <Input id="f-host" v-model="form.host" placeholder="localhost" class="h-8 text-xs" />
            </div>
            <div class="grid gap-2">
              <Label for="f-port" class="text-xs text-muted-foreground uppercase tracking-wider">Port</Label>
              <Input id="f-port" v-model.number="form.port" type="number" placeholder="5432" class="h-8 text-xs" />
            </div>
          </div>

          <div class="grid gap-2">
            <Label for="f-db" class="text-xs text-muted-foreground uppercase tracking-wider">Database</Label>
            <Input id="f-db" v-model="form.database" placeholder="my_database" class="h-8 text-xs" />
          </div>

          <div class="grid gap-2">
            <Label for="f-user" class="text-xs text-muted-foreground uppercase tracking-wider">Username</Label>
            <Input id="f-user" v-model="form.username" placeholder="admin" class="h-8 text-xs" />
          </div>

          <div class="grid gap-2">
            <Label for="f-pass" class="text-xs text-muted-foreground uppercase tracking-wider">Password</Label>
            <div class="flex gap-2">
              <Input
                id="f-pass"
                :type="showPw ? 'text' : 'password'"
                v-model="form.password"
                placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                class="h-8 text-xs flex-1"
              />
              <Button variant="outline" size="sm" class="h-8 text-xs whitespace-nowrap" @click="showPw = !showPw">
                {{ showPw ? 'Hide' : 'Show' }}
              </Button>
            </div>
          </div>

	          <div class="grid gap-2">
            <span class="text-xs text-muted-foreground uppercase tracking-wider">Color tag</span>
            <div class="flex gap-1.5">
              <button
                v-for="color in colorOptions"
                :key="color"
                class="w-4 h-4 rounded-full border-2 transition-colors cursor-pointer"
                :class="form.color === color ? 'border-foreground' : 'border-transparent'"
                :style="{ background: color }"
                :aria-label="`Select color ${color}`"
                @click="form.color = color"
              ></button>
            </div>
          </div>

          <div v-if="testResult" class="rounded-md px-3 py-2 text-xs font-mono" :class="testResult.ok ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'">
            {{ testResult.ok ? '\u2713 Connected in ' + testResult.latency + 'ms' : '\u2717 ' + testResult.error }}
          </div>

          <div v-if="connStore.lastError && !testResult" class="rounded-md px-3 py-2 text-xs font-mono bg-red-500/10 text-red-500 border border-red-500/20">
            {{ connStore.lastError }}
          </div>
        </div>
        <div v-else class="flex items-center justify-center h-full text-xs text-muted-foreground">
          Select a connection or create a new one.
        </div>

        <div v-if="form" class="flex items-center justify-between pt-3 mt-2 border-t border-border">
          <Button variant="outline" size="sm" class="text-xs h-8" :disabled="testing" @click="testConn">
            {{ testing ? 'Testing\u2026' : 'Test connection' }}
          </Button>
          <div class="flex gap-2">
            <Button variant="ghost" size="sm" class="text-xs h-8" @click="uiStore.closeConnectionManager()">Cancel</Button>
            <Button size="sm" class="text-xs h-8" @click="save">Save &amp; Connect</Button>
          </div>
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
  DialogHeader,
  DialogTitle,
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

const colorOptions = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#A78BFA', '#67E8F9']

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
