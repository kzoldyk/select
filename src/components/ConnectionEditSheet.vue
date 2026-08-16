<template>
  <Sheet :open="open" @update:open="(val) => emit('update:open', val)">
    <SheetContent :show-close-button="false" side="right" class="w-[500px] sm:max-w-lg flex flex-col p-0 bg-background border-l border-border select-none font-mono text-xs shadow-2xl">
      <!-- Header -->
      <div class="px-5 py-3.5 border-b border-border/80 flex items-center justify-between flex-shrink-0 chrome-bar">
        <div class="flex items-center gap-2.5">
          <div
            class="w-3.5 h-3.5 rounded-full flex-shrink-0"
            :style="{ backgroundColor: form.color || '#10B981' }"
          ></div>
          <div>
            <SheetTitle class="text-sm font-semibold text-foreground">
              {{ isEditing ? 'Edit Connection' : 'New Connection' }}
            </SheetTitle>
            <SheetDescription class="text-[10px] text-muted-foreground">
              MySQL & MariaDB connection profile
            </SheetDescription>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Badge
            class="text-[9.5px] font-semibold uppercase tracking-wider"
            :class="environmentBadgeClass"
          >
            {{ environmentLabel }}
          </Badge>
          <button
            class="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer border-none bg-transparent"
            title="Close (ESC)"
            aria-label="Close"
            @click="emit('update:open', false)"
          >
            <PhX class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Form Body -->
      <div class="flex-1 overflow-y-auto p-5 space-y-4">
        <!-- Display Name & Environment Color -->
        <div class="space-y-1.5">
          <label class="text-[11px] font-semibold text-foreground">Profile Name</label>
          <div class="flex items-center gap-2">
            <input
              v-model="form.name"
              placeholder="e.g. Production Replica, Local Dev"
              class="h-8 flex-1 rounded-md border border-border/70 bg-background/80 px-2.5 text-xs font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
            <!-- Color preset picker -->
            <div class="flex items-center gap-1 bg-muted/40 p-1 rounded-md border border-border/60">
              <button
                v-for="c in COLOR_PRESETS"
                :key="c.hex"
                type="button"
                class="w-4.5 h-4.5 rounded-full border border-black/20 cursor-pointer transition-transform hover:scale-110 flex items-center justify-center"
                :style="{ backgroundColor: c.hex }"
                :title="c.label"
                @click="form.color = c.hex"
              >
                <span v-if="form.color === c.hex" class="w-1.5 h-1.5 rounded-full bg-white shadow-xs"></span>
              </button>
            </div>
          </div>
        </div>

        <!-- Host & Port -->
        <div class="grid grid-cols-3 gap-2">
          <div class="col-span-2 space-y-1.5">
            <label class="text-[11px] font-semibold text-foreground">Host</label>
            <input
              v-model="form.host"
              placeholder="localhost or 127.0.0.1"
              class="h-8 w-full rounded-md border border-border/70 bg-background/80 px-2.5 text-xs font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold text-foreground">Port</label>
            <input
              v-model.number="form.port"
              type="number"
              placeholder="3306"
              class="h-8 w-full rounded-md border border-border/70 bg-background/80 px-2.5 text-xs font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>

        <!-- Database -->
        <div class="space-y-1.5">
          <label class="text-[11px] font-semibold text-foreground">Default Database</label>
          <input
            v-model="form.database"
            placeholder="e.g. main_db (optional)"
            class="h-8 w-full rounded-md border border-border/70 bg-background/80 px-2.5 text-xs font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <!-- Credentials (User & Password) -->
        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold text-foreground">Username</label>
            <input
              v-model="form.username"
              placeholder="root"
              class="h-8 w-full rounded-md border border-border/70 bg-background/80 px-2.5 text-xs font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold text-foreground">Password</label>
            <input
              v-model="form.password"
              type="password"
              placeholder="••••••••"
              class="h-8 w-full rounded-md border border-border/70 bg-background/80 px-2.5 text-xs font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>

        <div class="h-px bg-border/60 my-2"></div>

        <!-- Security & Advanced Options -->
        <div class="space-y-3">
          <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Safety & Protocol</span>

          <!-- Read-Only Safeguard Toggle -->
          <label class="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-card hover:bg-accent/30 cursor-pointer transition-colors">
            <div class="flex items-center gap-2">
              <PhShieldWarning class="w-4 h-4" :class="form.readOnly ? 'text-amber-500' : 'text-muted-foreground'" />
              <div>
                <div class="text-xs font-semibold text-foreground">Read-Only Mode</div>
                <div class="text-[10px] text-muted-foreground">Block all mutating queries (UPDATE, DELETE, DROP)</div>
              </div>
            </div>
            <input
              type="checkbox"
              v-model="form.readOnly"
              class="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
          </label>

          <!-- SSL Mode -->
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold text-foreground">SSL / TLS Mode</label>
            <select
              v-model="form.sslMode"
              class="h-8 w-full rounded-md border border-border/70 bg-background/80 px-2.5 text-xs font-mono outline-none focus:border-primary"
            >
              <option value="disabled">Disabled</option>
              <option value="preferred">Preferred (Auto-negotiate)</option>
              <option value="required">Required (Encrypted)</option>
              <option value="verify_ca">Verify CA</option>
              <option value="verify_identity">Verify Identity</option>
            </select>
          </div>

          <!-- Unix Socket (Optional) -->
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold text-muted-foreground">Unix Domain Socket (Optional)</label>
            <input
              v-model="form.socketPath"
              placeholder="/tmp/mysql.sock"
              class="h-8 w-full rounded-md border border-border/70 bg-background/80 px-2.5 text-xs font-mono outline-none focus:border-primary"
            />
          </div>
        </div>

        <!-- Test Result Banner -->
        <div v-if="testResult" class="p-3 rounded-lg text-xs" :class="testResult.ok ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'">
          <div class="flex items-center gap-1.5 font-semibold">
            <PhCheckCircle v-if="testResult.ok" class="w-4 h-4" />
            <PhXCircle v-else class="w-4 h-4" />
            <span>{{ testResult.ok ? `Connection Successful (${testResult.latency}ms)` : 'Connection Failed' }}</span>
          </div>
          <p v-if="testResult.error" class="text-[10.5px] mt-1 break-all text-red-300">
            {{ testResult.error }}
          </p>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="px-5 py-3 border-t border-border/80 bg-muted/20 flex items-center justify-between gap-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          class="h-8 px-3 text-xs gap-1.5 bg-background"
          :disabled="isTesting"
          @click="runTestConnection"
        >
          <svg v-if="isTesting" class="w-3.5 h-3.5 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <PhPlug v-else class="w-3.5 h-3.5" />
          <span>{{ isTesting ? 'Testing…' : 'Test Connection' }}</span>
        </Button>

        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm" class="h-8 px-3 text-xs" @click="emit('update:open', false)">
            Cancel
          </Button>
          <Button size="sm" class="h-8 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm" @click="saveConnection">
            Save
          </Button>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PhShieldWarning, PhPlug, PhCheckCircle, PhXCircle, PhX } from '@phosphor-icons/vue'
import { useConnectionStore, type Connection } from '@/stores/connection'
import { toast } from 'vue-sonner'

const props = defineProps<{
  open: boolean
  connectionId?: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [connectionId: string]
}>()

const connStore = useConnectionStore()

const isEditing = computed(() => Boolean(props.connectionId))

const COLOR_PRESETS = [
  { hex: '#EF4444', label: 'Production (Red)' },
  { hex: '#F59E0B', label: 'Staging (Amber)' },
  { hex: '#10B981', label: 'Local Dev (Emerald)' },
  { hex: '#3B82F6', label: 'Testing (Blue)' },
  { hex: '#8B5CF6', label: 'Analytics (Purple)' },
]

const form = reactive({
  name: '',
  host: 'localhost',
  port: 3306,
  database: '',
  username: 'root',
  password: '',
  dbType: 'mysql' as 'mysql' | 'mariadb',
  ssl: false,
  sslMode: 'preferred' as any,
  socketPath: '',
  readOnly: false,
  color: '#10B981',
})

const isTesting = ref(false)
const testResult = ref<{ ok: boolean; latency?: number; error?: string } | null>(null)

const environmentLabel = computed(() => {
  const c = form.color?.toUpperCase()
  if (c === '#EF4444') return 'PRODUCTION'
  if (c === '#F59E0B') return 'STAGING'
  if (c === '#10B981') return 'LOCAL DEV'
  return 'ENVIRONMENT'
})

const environmentBadgeClass = computed(() => {
  const c = form.color?.toUpperCase()
  if (c === '#EF4444') return 'bg-red-500/15 text-red-500 border-red-500/30'
  if (c === '#F59E0B') return 'bg-amber-500/15 text-amber-500 border-amber-500/30'
  if (c === '#10B981') return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
  return 'bg-blue-500/15 text-blue-500 border-blue-500/30'
})

function loadInitial() {
  testResult.value = null
  if (props.connectionId) {
    const existing = connStore.connections.find(c => c.id === props.connectionId)
    if (existing) {
      Object.assign(form, {
        name: existing.name,
        host: existing.host,
        port: existing.port,
        database: existing.database || '',
        username: existing.username,
        password: existing.password || '',
        dbType: existing.dbType || 'mysql',
        ssl: existing.ssl || false,
        sslMode: existing.sslMode || 'preferred',
        socketPath: existing.socketPath || '',
        readOnly: existing.readOnly || false,
        color: existing.color || '#10B981',
      })
      return
    }
  }

  // Reset to default new connection
  Object.assign(form, {
    name: 'Local DB',
    host: 'localhost',
    port: 3306,
    database: '',
    username: 'root',
    password: '',
    dbType: 'mysql',
    ssl: false,
    sslMode: 'preferred',
    socketPath: '',
    readOnly: false,
    color: '#10B981',
  })
}

watch(() => props.open, (isOpen) => {
  if (isOpen) loadInitial()
})

async function runTestConnection() {
  isTesting.value = true
  testResult.value = null
  try {
    const res = await connStore.testConnection({
      ...form,
      ssl: form.sslMode !== 'disabled',
    })
    testResult.value = res
  } catch (err) {
    testResult.value = { ok: false, error: String(err) }
  } finally {
    isTesting.value = false
  }
}

async function saveConnection() {
  if (!form.name.trim()) {
    toast.error('Connection name is required')
    return
  }
  if (!form.host.trim()) {
    toast.error('Host is required')
    return
  }

  try {
    let targetId = props.connectionId
    if (isEditing.value && targetId) {
      await connStore.updateConnection(targetId, {
        ...form,
        ssl: form.sslMode !== 'disabled',
      })
      toast.success('Connection updated')
    } else {
      targetId = await connStore.addConnection({
        ...form,
        ssl: form.sslMode !== 'disabled',
        sshTunnel: false,
      })
      toast.success('Connection created')
    }
    emit('saved', targetId!)
    emit('update:open', false)
  } catch (e) {
    toast.error('Failed to save connection', { description: String(e) })
  }
}
</script>
