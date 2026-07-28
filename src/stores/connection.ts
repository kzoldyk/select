import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { saveConnections, loadConnections, saveActiveConnectionId, loadActiveConnectionId } from './storage'
import { useResultStore } from './result'
import { useSchemaStore } from './schema'

export type SslMode = 'disabled' | 'preferred' | 'required' | 'verify_ca' | 'verify_identity'

export interface Connection {
  id: string
  name: string
  host: string
  port: number
  database: string
  username: string
  password: string
  dbType: 'mysql' | 'mariadb'
  ssl: boolean
  sslMode?: SslMode
  connectTimeoutSecs?: number
  charset?: string
  socketPath?: string
  readOnly: boolean
  sshTunnel: boolean
  sshHost?: string
  sshPort?: number
  sshKeyFile?: string
  color: string
  createdAt: string
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export const useConnectionStore = defineStore('connection', {
  state: () => ({
    connections: [] as Connection[],
    activeId: null as string | null,
    status: 'idle' as ConnectionStatus,
    latency: 0,
    loaded: false,
    lastError: null as string | null,
  }),

  getters: {
    activeConnection: (state): Connection | null =>
      state.connections.find(c => c.id === state.activeId) ?? null,
  },

  actions: {
    async load() {
      if (this.loaded) return
      
      const saved = await loadConnections()
      if (saved && saved.length > 0) {
        this.connections = await decryptConnections(saved as Connection[])
      } else {
        this.connections = [{
          id: 'conn-1',
          name: 'Local DB',
          host: 'localhost',
          port: 3306,
          database: 'mysql',
          username: 'root',
          password: '',
          dbType: 'mysql' as const,
          ssl: false,
          sslMode: 'preferred',
          connectTimeoutSecs: 10,
          charset: 'utf8mb4',
          readOnly: false,
          sshTunnel: false,
          color: '#22C55E',
          createdAt: new Date().toISOString(),
        }]
      }

      const savedActiveId = await loadActiveConnectionId()
      if (savedActiveId && this.connections.find(c => c.id === savedActiveId)) {
        this.activeId = savedActiveId
      } else if (this.connections.length > 0) {
        this.activeId = this.connections[0].id
      }
      
      this.loaded = true
    },

    async setActive(id: string) {
      this.activeId = id
      await saveActiveConnectionId(id)
    },

    async addConnection(conn: Omit<Connection, 'id' | 'createdAt'>) {
      const newConn: Connection = {
        ...conn,
        id: `conn-${Date.now()}`,
        createdAt: new Date().toISOString(),
      }
      this.connections.push(newConn)
      await saveConnections(await encryptConnections(this.connections))
      return newConn.id
    },

    async updateConnection(id: string, updates: Partial<Connection>) {
      const idx = this.connections.findIndex(c => c.id === id)
      if (idx !== -1) {
        this.connections[idx] = { ...this.connections[idx], ...updates }
        await saveConnections(await encryptConnections(this.connections))
      }
    },

    async removeConnection(id: string) {
      this.connections = this.connections.filter(c => c.id !== id)
      if (this.activeId === id) {
        this.activeId = this.connections[0]?.id ?? null
        await saveActiveConnectionId(this.activeId)
      }
      await saveConnections(await encryptConnections(this.connections))
    },
    async testConnection(conn: Partial<Connection>): Promise<{ ok: boolean; latency?: number; error?: string }> {
      try {
        const validationError = validateConnection(conn)
        if (validationError) return { ok: false, error: validationError }
        const latency = await invoke<number>('test_connection', { config: conn })
        return { ok: true, latency }
      } catch (err) {
        return { ok: false, error: String(err) }
      }
    },
	    async connect(id: string) {
	      this.status = 'connecting'
	      this.lastError = null
	      try {
	        const conn = this.connections.find(c => c.id === id)
	        if (!conn) throw new Error("Connection not found")
	        const validationError = validateConnection(conn)
	        if (validationError) throw new Error(validationError)
	        await invoke('connect', { id: conn.id, config: conn })
	        this.activeId = id
	        this.status = 'connected'
	        await saveActiveConnectionId(id)
	        useResultStore().clearResults()
	        useSchemaStore().clearSchema()
	        return true
	      } catch (e) {
	        this.status = 'error'
	        this.lastError = String(e)
	        return false
      }
    },
    async changeDatabase(dbName: string) {
      if (!this.activeId) return
      this.lastError = null
      try {
        await invoke('change_database', { database: dbName, id: this.activeId })
        await this.updateConnection(this.activeId, { database: dbName })
        useResultStore().clearResults()
        useSchemaStore().clearSchema()
      } catch (e) {
        this.status = 'error'
        this.lastError = String(e)
      }
    },
    async disconnect() {
      try {
        if (this.activeId) await invoke('disconnect', { id: this.activeId })
        this.status = 'idle'
        this.activeId = null
        this.lastError = null
        await saveActiveConnectionId(null)
        useResultStore().clearResults()
        useSchemaStore().clearSchema()
      } catch (e) {
        this.status = 'error'
        this.lastError = String(e)
      }
    },
  },
})

function validateConnection(conn: Partial<Connection>): string | null {
  if (!conn.host?.trim()) return 'Host is required.'
  if (!conn.username?.trim()) return 'Username is required.'
  if (!Number.isInteger(conn.port) || conn.port < 1 || conn.port > 65535) {
    return 'Port must be between 1 and 65535.'
  }
  if (conn.dbType !== 'mysql' && conn.dbType !== 'mariadb') {
    return 'Only MySQL and MariaDB connections are currently supported.'
  }
  return null
}

async function encryptConnections(connections: Connection[]): Promise<Connection[]> {
  if (!connections.length) return connections
  try {
    const encrypted = await Promise.all(connections.map(async (c) => {
      if (!c.password) return c
      const encPw = await invoke<string>('encrypt_password', { plaintext: c.password })
      return { ...c, password: encPw }
    }))
    return encrypted
  } catch (e) {
    console.warn('Password encryption failed, storing in plaintext:', e)
    return connections
  }
}

async function decryptConnections(connections: Connection[]): Promise<Connection[]> {
  if (!connections.length) return connections
  try {
    const decrypted = await Promise.all(connections.map(async (c) => {
      if (!c.password || c.password.startsWith('enc:')) return c
      const isEncrypted = c.password.length > 40 && /^[A-Za-z0-9+/=]+$/.test(c.password)
      if (!isEncrypted) return c
      const decPw = await invoke<string>('decrypt_password', { ciphertextB64: c.password })
      return { ...c, password: decPw }
    }))
    return decrypted
  } catch (e) {
    console.warn('Password decryption failed, using stored value:', e)
    return connections
  }
}
