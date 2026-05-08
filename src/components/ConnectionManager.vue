<template>
  <Teleport to="body">
    <div
      v-if="uiStore.connectionManagerOpen"
      class="cm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Connection manager"
      @click.self="uiStore.closeConnectionManager()"
    >
      <div class="cm-modal">
        <!-- Left pane: connection list -->
        <div class="cm-left">
          <div class="cm-list">
            <button
              v-for="conn in connStore.connections"
              :key="conn.id"
              class="cm-conn-item"
              :class="{ active: selectedId === conn.id }"
              @click="selectConn(conn.id)"
            >
              <span class="status-dot" :class="conn.id === connStore.activeId ? 'connected' : 'idle'"></span>
              <span class="cm-conn-name">{{ conn.name }}</span>
              <span class="cm-conn-type">{{ conn.dbType }}</span>
            </button>
          </div>
          <button class="ghost-btn cm-new-btn" @click="newConnection" aria-label="Create new connection">
            + New connection
          </button>
        </div>

        <!-- Right pane: form -->
        <div class="cm-right">
          <div v-if="form" class="cm-form">
            <h2 class="cm-title">{{ isNew ? 'New Connection' : 'Edit Connection' }}</h2>

            <div class="form-row">
              <label class="form-label" for="f-name">Name</label>
              <input id="f-name" class="input-base form-input" v-model="form.name" placeholder="My database" />
            </div>

            <div class="form-row">
              <label class="form-label" for="f-dbtype">DB Type</label>
              <select id="f-dbtype" class="input-base form-input" v-model="form.dbType">
                <option value="postgres">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="sqlite">SQLite</option>
                <option value="mssql">SQL Server</option>
                <option value="mariadb">MariaDB</option>
                <option value="mongodb">MongoDB</option>
              </select>
            </div>

            <div class="form-row-2">
              <div class="form-field">
                <label class="form-label" for="f-host">Host</label>
                <input id="f-host" class="input-base form-input" v-model="form.host" placeholder="localhost" />
              </div>
              <div class="form-field form-field-sm">
                <label class="form-label" for="f-port">Port</label>
                <input id="f-port" class="input-base form-input" v-model.number="form.port" type="number" placeholder="5432" />
              </div>
            </div>

            <div class="form-row">
              <label class="form-label" for="f-db">Database</label>
              <input id="f-db" class="input-base form-input" v-model="form.database" placeholder="my_database" />
            </div>

            <div class="form-row">
              <label class="form-label" for="f-user">Username</label>
              <input id="f-user" class="input-base form-input" v-model="form.username" placeholder="admin" />
            </div>

            <div class="form-row">
              <label class="form-label" for="f-pass">Password</label>
              <div class="pw-row">
                <input
                  id="f-pass"
                  class="input-base form-input"
                  :type="showPw ? 'text' : 'password'"
                  v-model="form.password"
                  placeholder="••••••••"
                />
                <button
                  class="ghost-btn pw-toggle"
                  :aria-label="showPw ? 'Hide password' : 'Show password'"
                  @click="showPw = !showPw"
                >{{ showPw ? 'Hide' : 'Show' }}</button>
              </div>
            </div>

            <div class="form-row form-row-check">
              <label class="form-label check-label">
                <input type="checkbox" v-model="form.ssl" aria-label="Enable SSL" />
                Enable SSL
              </label>
            </div>

            <div class="form-row form-row-check">
              <label class="form-label check-label">
                <input type="checkbox" v-model="form.sshTunnel" aria-label="Enable SSH tunnel" />
                SSH Tunnel
              </label>
            </div>

            <div v-if="form.sshTunnel" class="ssh-fields">
              <div class="form-row-2">
                <div class="form-field">
                  <label class="form-label" for="f-ssh-host">SSH Host</label>
                  <input id="f-ssh-host" class="input-base form-input" v-model="form.sshHost" placeholder="ssh.example.com" />
                </div>
                <div class="form-field form-field-sm">
                  <label class="form-label" for="f-ssh-port">SSH Port</label>
                  <input id="f-ssh-port" class="input-base form-input" v-model.number="form.sshPort" type="number" placeholder="22" />
                </div>
              </div>
              <div class="form-row">
                <label class="form-label" for="f-ssh-key">Key File</label>
                <input id="f-ssh-key" class="input-base form-input" v-model="form.sshKeyFile" placeholder="~/.ssh/id_rsa" />
              </div>
            </div>

            <!-- Color tags -->
            <div class="form-row">
              <span class="form-label">Color tag</span>
              <div class="color-swatches">
                <button
                  v-for="color in colorOptions"
                  :key="color"
                  class="color-swatch"
                  :style="{ background: color }"
                  :class="{ selected: form.color === color }"
                  :aria-label="`Select color ${color}`"
                  @click="form.color = color"
                ></button>
              </div>
            </div>

            <!-- Test result -->
            <div v-if="testResult" class="test-result" :class="testResult.ok ? 'ok' : 'fail'">
              {{ testResult.ok ? `✓ Connected in ${testResult.latency}ms` : `✗ ${testResult.error}` }}
            </div>

            <!-- Actions -->
            <div class="cm-actions">
              <button class="ghost-btn" @click="testConn" :disabled="testing" aria-label="Test connection">
                {{ testing ? 'Testing…' : 'Test connection' }}
              </button>
              <div class="cm-actions-right">
                <button class="ghost-btn" @click="uiStore.closeConnectionManager()" aria-label="Cancel">Cancel</button>
                <button class="primary-btn" @click="save" aria-label="Save and connect">Save & Connect</button>
              </div>
            </div>
          </div>
          <div v-else class="cm-empty">
            <p>Select a connection or create a new one.</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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
    form.value = { ...conn } as FormData
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
    targetId = connStore.addConnection(form.value)
  } else if (targetId) {
    connStore.updateConnection(targetId, form.value)
  }
  
  if (targetId) {
    await connStore.connect(targetId)
  }
  
  uiStore.closeConnectionManager()
}

// Load initial selection
selectConn(connStore.activeId ?? connStore.connections[0]?.id)
</script>

<style scoped>
.cm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cm-modal {
  width: 520px;
  max-height: 90vh;
  background: var(--surface);
  border: 1px solid var(--border-2);
  border-radius: 8px;
  display: flex;
  overflow: hidden;
}

/* Left pane */
.cm-left {
  width: 180px;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.cm-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.cm-conn-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  color: var(--text-muted);
  font-size: 11px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  text-align: left;
}
.cm-conn-item:hover { background: var(--row-hover); color: var(--text); }
.cm-conn-item.active {
  background: var(--row-hover);
  border-left-color: var(--blue);
  color: var(--text);
}
.cm-conn-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cm-conn-type { font-size: 9px; color: var(--text-dim); flex-shrink: 0; }

.cm-new-btn {
  margin: 8px;
  font-size: 10px;
  justify-content: center;
}

/* Right pane */
.cm-right {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.cm-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 14px;
  font-family: 'Inter', sans-serif;
}
.cm-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-dim);
  font-size: 11px;
  font-family: 'Inter', sans-serif;
}

/* Form */
.cm-form { display: flex; flex-direction: column; gap: 10px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.form-row-2 { display: flex; gap: 8px; }
.form-row-check { flex-direction: row; align-items: center; }
.form-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.form-field-sm { max-width: 80px; }
.form-label {
  font-size: 10px;
  color: var(--text-dim);
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.form-input { width: 100%; }
.check-label { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); text-transform: none; letter-spacing: 0; }
.check-label input { accent-color: var(--blue); }

.pw-row { display: flex; gap: 6px; }
.pw-row .form-input { flex: 1; }
.pw-toggle { font-size: 10px; padding: 3px 6px; flex-shrink: 0; }

.ssh-fields { background: var(--surface-2); border: 1px solid var(--border); border-radius: 4px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }

.color-swatches { display: flex; gap: 6px; margin-top: 2px; }
.color-swatch {
  width: 18px; height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.1s;
}
.color-swatch.selected { border-color: var(--text); }
.color-swatch:hover { border-color: var(--text-muted); }

.test-result {
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
}
.test-result.ok   { background: rgba(34,197,94,0.1); color: var(--green); border: 1px solid rgba(34,197,94,0.2); }
.test-result.fail { background: rgba(239,68,68,0.1); color: var(--red);   border: 1px solid rgba(239,68,68,0.2); }

.cm-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 6px;
  border-top: 1px solid var(--border);
  margin-top: 4px;
}
.cm-actions-right { display: flex; gap: 6px; }
</style>
