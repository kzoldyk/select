import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'

export interface Connection {
  id: string
  name: string
  host: string
  port: number
  database: string
  username: string
  password: string
  dbType: 'postgres' | 'mysql' | 'sqlite' | 'mssql' | 'mariadb' | 'mongodb'
  ssl: boolean
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
    connections: [
      {
        id: 'conn-1',
        name: 'Local DB',
        host: 'localhost',
        port: 3306,
        database: 'mysql',
        username: 'root',
        password: '',
        dbType: 'mysql' as const,
        ssl: false,
        sshTunnel: false,
        color: '#22C55E',
        createdAt: new Date().toISOString(),
      }
    ] as Connection[],
    activeId: 'conn-1' as string | null,
    status: 'idle' as ConnectionStatus,
    latency: 0,
  }),

  getters: {
    activeConnection: (state): Connection | null =>
      state.connections.find(c => c.id === state.activeId) ?? null,
    env: () => 'PROD' as 'PROD' | 'DEV' | 'STAGING',
  },

  actions: {
    setActive(id: string) {
      this.activeId = id
    },
    addConnection(conn: Omit<Connection, 'id' | 'createdAt'>) {
      const newConn: Connection = {
        ...conn,
        id: `conn-${Date.now()}`,
        createdAt: new Date().toISOString(),
      }
      this.connections.push(newConn)
      return newConn.id
    },
    updateConnection(id: string, updates: Partial<Connection>) {
      const idx = this.connections.findIndex(c => c.id === id)
      if (idx !== -1) {
        this.connections[idx] = { ...this.connections[idx], ...updates }
      }
    },
    removeConnection(id: string) {
      this.connections = this.connections.filter(c => c.id !== id)
      if (this.activeId === id) this.activeId = this.connections[0]?.id ?? null
    },
    async testConnection(conn: Partial<Connection>): Promise<{ ok: boolean; latency?: number; error?: string }> {
      try {
        const latency = await invoke<number>('test_connection', { config: conn })
        return { ok: true, latency }
      } catch (err) {
        return { ok: false, error: String(err) }
      }
    },
    async connect(id: string) {
      this.status = 'connecting'
      try {
        const conn = this.connections.find(c => c.id === id)
        if (!conn) throw new Error("Connection not found")
        await invoke('connect', { config: conn })
        this.activeId = id
        this.status = 'connected'
      } catch (e) {
        this.status = 'error'
      }
    },
    async changeDatabase(dbName: string) {
      if (!this.activeId) return
      this.updateConnection(this.activeId, { database: dbName })
      await this.connect(this.activeId)
    },
    async disconnect() {
      try {
        if (this.activeId) await invoke('disconnect', { id: this.activeId })
      } finally {
        this.status = 'idle'
        this.activeId = null
      }
    },
  },
})
