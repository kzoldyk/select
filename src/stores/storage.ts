import { load } from '@tauri-apps/plugin-store'

const STORE_PATH = 'select-store.json'

let storePromise: Awaited<ReturnType<typeof load>> | null = null

async function getStore() {
  if (!storePromise) {
    storePromise = await load(STORE_PATH)
  }
  return storePromise
}

const CONNECTION_KEY = 'connections'
const ACTIVE_CONNECTION_KEY = 'activeConnectionId'

function localGet<T>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function localSet(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export async function saveConnections(connections: unknown[]): Promise<void> {
  try {
    const store = await getStore()
    await store.set(CONNECTION_KEY, connections)
    await store.save()
  } catch (error) {
    console.warn('Falling back to localStorage for connections:', error)
    localSet(CONNECTION_KEY, connections)
  }
}

export async function loadConnections(): Promise<unknown[] | null> {
  try {
    const store = await getStore()
    const value = await store.get<unknown[]>(CONNECTION_KEY)
    return value ?? localGet<unknown[]>(CONNECTION_KEY)
  } catch (error) {
    console.warn('Falling back to localStorage for connections:', error)
    return localGet<unknown[]>(CONNECTION_KEY)
  }
}

export async function saveActiveConnectionId(id: string | null): Promise<void> {
  try {
    const store = await getStore()
    await store.set(ACTIVE_CONNECTION_KEY, id)
    await store.save()
  } catch (error) {
    console.warn('Falling back to localStorage for active connection:', error)
    localSet(ACTIVE_CONNECTION_KEY, id)
  }
}

export async function loadActiveConnectionId(): Promise<string | null> {
  try {
    const store = await getStore()
    const value = await store.get<string>(ACTIVE_CONNECTION_KEY)
    return value ?? localGet<string>(ACTIVE_CONNECTION_KEY)
  } catch (error) {
    console.warn('Falling back to localStorage for active connection:', error)
    return localGet<string>(ACTIVE_CONNECTION_KEY)
  }
}

const RECENTS_KEY = 'recentConnectionIds'

export async function saveRecentConnectionIds(ids: string[]): Promise<void> {
  try {
    const store = await getStore()
    await store.set(RECENTS_KEY, ids)
    await store.save()
  } catch (error) {
    console.warn('Falling back to localStorage for recents:', error)
    localSet(RECENTS_KEY, ids)
  }
}

export async function loadRecentConnectionIds(): Promise<string[] | null> {
  try {
    const store = await getStore()
    const value = await store.get<string[]>(RECENTS_KEY)
    return value ?? localGet<string[]>(RECENTS_KEY)
  } catch (error) {
    console.warn('Falling back to localStorage for recents:', error)
    return localGet<string[]>(RECENTS_KEY)
  }
}

