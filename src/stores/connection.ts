import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { saveConnections, loadConnections, saveActiveConnectionId, loadActiveConnectionId, saveRecentConnectionIds, loadRecentConnectionIds } from './storage'
import { useResultStore } from './result'
import { useSchemaStore } from './schema'
import { resolveEnvironment, type ConnectionEnvironment } from '../lib/connectionEnv'
import { playSound } from '../lib/cuelume'

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
  environment?: ConnectionEnvironment
  createdAt: string
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

function withEnvironment(conn: Connection): Connection {
  return {
    ...conn,
    environment: resolveEnvironment(conn),
  }
}

export const useConnectionStore = defineStore('connection', {
  state: () => ({
    connections: [] as Connection[],
    activeId: null as string | null,
    recentIds: [] as string[],
    status: 'idle' as ConnectionStatus,
    latency: 0,
    loaded: false,
    lastError: null as string | null,
  }),

  getters: {
    activeConnection: (state): Connection | null =>
      state.connections.find(c => c.id === state.activeId) ?? null,
    activeEnvironment: (state): ConnectionEnvironment =>
      resolveEnvironment(state.connections.find(c => c.id === state.activeId) ?? null),
    recentConnections: (state): Connection[] => {
      return state.recentIds
        .map(id => state.connections.find(c => c.id === id))
        .filter((c): c is Connection => !!c)
    }
  },

  actions: {
    async load() {
      if (this.loaded) return
      
      const saved = await loadConnections()
      if (saved && saved.length > 0) {
        try {
          const result = await decryptConnections(saved as Connection[])
          this.connections = result.connections.map(withEnvironment)
          if (result.degraded.length > 0) {
            this.lastError = `Could not decrypt saved password for: ${result.degraded.join(', ')}. Re-enter it in Manage Connections.`
          }
        } catch (e) {
          console.warn('Failed to decrypt saved connections, using stored values:', e)
          this.lastError = `Could not decrypt saved passwords. Re-enter them in Manage Connections.`
          this.connections = (saved as Connection[]).map(withEnvironment)
        }
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
          environment: 'local',
          createdAt: new Date().toISOString(),
        }]
      }

      const savedActiveId = await loadActiveConnectionId()
      if (savedActiveId && this.connections.find(c => c.id === savedActiveId)) {
        this.activeId = savedActiveId
      } else if (this.connections.length > 0) {
        this.activeId = this.connections[0].id
      }

      const savedRecents = await loadRecentConnectionIds()
      if (savedRecents) {
        this.recentIds = savedRecents.filter(id => this.connections.some(c => c.id === id))
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
        environment: resolveEnvironment(conn),
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
      const wasActive = this.activeId === id
      if (wasActive && this.status === 'connected') {
        try {
          await invoke('disconnect', { id })
        } catch (err) {
          console.warn('Failed to disconnect removed connection:', err)
        }
      }
      this.connections = this.connections.filter(c => c.id !== id)
      this.recentIds = this.recentIds.filter(x => x !== id)
      await saveRecentConnectionIds(this.recentIds)
      if (wasActive) {
        this.activeId = this.connections[0]?.id ?? null
        if (!this.activeId) {
          this.status = 'idle'
        }
        await saveActiveConnectionId(this.activeId)
        useResultStore().clearResults()
        useSchemaStore().clearSchema()
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

	        // Disconnect previous active connection if switching to a different one
	        if (this.activeId && this.activeId !== id) {
	          try {
	            await invoke('disconnect', { id: this.activeId })
	          } catch (err) {
	            console.warn('Failed to disconnect previous connection:', err)
	          }
	        }

	        await invoke('connect', { id: conn.id, config: conn })
	        this.activeId = id
	        this.status = 'connected'
	        playSound('ready')
	        await saveActiveConnectionId(id)

	        // Track connection in history (max 5)
	        const nextRecents = [id, ...this.recentIds.filter(x => x !== id)].slice(0, 5)
	        this.recentIds = nextRecents
	        await saveRecentConnectionIds(nextRecents)

	        useResultStore().clearResults()
	        useSchemaStore().clearSchema()
	        return true
	      } catch (e) {
	        this.status = 'error'
	        this.lastError = String(e)
	        playSound('error')
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
        useSchemaStore().clearSchema(true)
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
    async ping(): Promise<boolean> {
      if (this.status !== 'connected' || !this.activeId) return false
      try {
        await invoke('run_query', { sql: 'SELECT 1', id: this.activeId })
        return true
      } catch {
        return false
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
    return await invoke<Connection[]>('seal_connections_for_storage', { connections })
  } catch (e) {
    console.warn('Failed to encrypt connections for storage, falling back to unsealed:', e)
    return connections
  }
}

async function decryptConnections(connections: Connection[]): Promise<{
  connections: Connection[]
  degraded: string[]
}> {
  if (!connections.length) return { connections, degraded: [] }
  return await invoke<{ connections: Connection[]; degraded: string[] }>(
    'unseal_connections_from_storage',
    { connections },
  )
}
