import { gstate } from '../../index'
import { indexedDBPlugin } from '../../plugins/official/indexeddb.plugin'
import { cloudSyncPlugin, createMongoAdapter } from '../../plugins/official/cloud-sync.plugin'

/**
 * Hybrid Cloud Sync Store
 * RECOMMENDED FOR: Frontend (FE) with Cloud Backup
 *
 * Demonstrates a multi-layer storage strategy:
 * 1. Cache: Memory (fast)
 * 2. Persistent Local: IndexedDB (large capacity)
 * 3. remote: MongoDB Cloud (On-demand/Scheduled backup)
 */

export interface AppState extends Record<string, unknown> {
  userProfile: { name: string; preferences: any }
  projects: Array<{ id: string; content: string }>
}

const initialState: AppState = {
  userProfile: { name: 'Dario', preferences: { theme: 'dark' } },
  projects: []
}

// 1. Initialize the store
const isDev = process.env.NODE_ENV !== 'production'
const debugLog = (...args: unknown[]) => { if (isDev) console.debug(...args) }
export const useHybridStore = gstate<AppState>(initialState, {
  namespace: 'hybrid-app-vault',
  persist: false // We use plugins for persistence
})

// 2. Add IndexedDB for local persistence (up to GBs)
useHybridStore._addPlugin(indexedDBPlugin({
  dbName: 'LocalCacheDB'
}))

// 3. Add Cloud Sync for remote backup
// Configured to automatically sync every 5 minutes (300000ms)
useHybridStore._addPlugin(cloudSyncPlugin({
  adapter: createMongoAdapter('https://api.mongodb.com/v1', 'YOUR_SECRET_API_KEY'),
  autoSyncInterval: 300000,
  onSync: (stats) => {
    console.info(`[CloudSync] Success! Keys: ${stats.totalKeysSynced}, Total Bytes: ${stats.totalBytesSynced}`)
  }
}))

/**
 * Manual Trigger for Cloud Sync
 */
export const syncNow = async () => {
  const result = await (useHybridStore as any).plugins.cloudSync.sync()
  if (result.status === 'success') {
    alert(`Sync completed! ${result.stats.totalKeysSynced} items pushed to cloud.`)
  } else if (result.status === 'no-change') {
    debugLog('No new changes to sync.')
  }
}

/**
 * Get synchronization diagnostics
 */
export const getSyncReport = () => {
  const stats = (useHybridStore as any).plugins.cloudSync.getStats()
  return {
    lastSync: stats.lastSyncTimestamp ? new Date(stats.lastSyncTimestamp).toLocaleString() : 'Never',
    count: stats.syncCount,
    errors: stats.errors,
    averageKeysPerSync: stats.syncCount > 0 ? stats.totalKeysSynced / stats.syncCount : 0
  }
}

/**
 * Action to update profile
 */
export const updateName = (newName: string) => {
  useHybridStore.set('userProfile', (draft) => {
    draft.name = newName
  })
}
