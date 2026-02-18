import type { IPlugin, PluginContext } from '../../core/types'

/**
 * Sync Stats interface for reporting and analytics.
 */
export interface SyncStats {
  lastSyncTimestamp: number | null
  totalKeysSynced: number
  totalBytesSynced: number
  syncCount: number
  lastDuration: number
  errors: number
}

/**
 * Cloud Adapter interface.
 * Implement this to support different backends (MongoDB, Firebase, SQL, etc.)
 */
export interface CloudSyncAdapter {
  name: string
  /**
   * Save dirty keys to the remote database
   * @param data Object containing key-value pairs to sync
   */
  save: (data: Record<string, unknown>) => Promise<boolean>
}

export interface CloudSyncOptions {
  adapter: CloudSyncAdapter
  autoSyncInterval?: number // ms (e.g. 60000 for 1 minute)
  onSync?: (stats: SyncStats) => void
}

/**
 * Cloud Sync Plugin for RGS
 * Allows on-demand or scheduled synchronization of local state to a remote database.
 * Uses internal versioning to only sync modified data (Differential Sync).
 */
export const cloudSyncPlugin = <S extends Record<string, unknown>>(options: CloudSyncOptions): IPlugin<S> => {
  const { adapter, autoSyncInterval } = options

  // Track last synced version for each key to perform differential sync
  const lastSyncedVersions = new Map<string, number>()
  const stats: SyncStats = {
    lastSyncTimestamp: null,
    totalKeysSynced: 0,
    totalBytesSynced: 0,
    syncCount: 0,
    lastDuration: 0,
    errors: 0
  }

  let timer: ReturnType<typeof setInterval> | null = null

  return {
    name: 'cloudSync',
    hooks: {
      onInstall: ({ store }) => {
        /**
         * Manual Sync Method
         * Triggers a differential sync to the cloud.
         */
        store._registerMethod('cloudSync', 'sync', async () => {
          const startTime = performance.now()
          const dirtyData: Record<string, unknown> = {}
          let bytesCount = 0

          try {
            const allData = store.list()
            const keys = Object.keys(allData)

            for (const key of keys) {
              const currentVersion = (store as import('../../core/types').IStore<S>)._getVersion?.(key) || 0
              const lastVersion = lastSyncedVersions.get(key) || 0

              if (currentVersion > lastVersion) {
                const val = allData[key]
                dirtyData[key] = val
                bytesCount += JSON.stringify(val).length // Rough byte estimation
                lastSyncedVersions.set(key, currentVersion)
              }
            }

            if (Object.keys(dirtyData).length === 0) return { status: 'no-change', stats }

            const success = await adapter.save(dirtyData)

            if (success) {
              stats.lastSyncTimestamp = Date.now()
              stats.totalKeysSynced += Object.keys(dirtyData).length
              stats.totalBytesSynced += bytesCount
              stats.syncCount++
              stats.lastDuration = performance.now() - startTime
              if (options.onSync) options.onSync(stats)
              return { status: 'success', stats }
            } else {
              throw new Error(`Adapter ${adapter.name} failed to save.`)
            }
          } catch (err) {
            stats.errors++
            console.error(`[gState] Cloud Sync Failed (${adapter.name}):`, err)
            return { status: 'error', error: String(err), stats }
          }
        })

        /**
         * Get Stats Method
         */
        store._registerMethod('cloudSync', 'getStats', () => stats)

        // Start Auto-Sync Timer if configured
        if (autoSyncInterval && autoSyncInterval > 0) {
          timer = setInterval(() => {
            const plugins = (store as import('../../core/types').IStore<S>).plugins
            const cs = plugins.cloudSync as unknown as { sync: () => Promise<unknown> }
            if (cs) cs.sync()
          }, autoSyncInterval)
        }
      },

      onDestroy: () => {
        if (timer) clearInterval(timer)
      }
    }
  }
}

/**
 * --- CLOUD ADAPTER TEMPLATES ---
 */

/**
 * Template for MongoDB (REST API / Atlas Data API)
 */
export const createMongoAdapter = (apiUrl: string, apiKey: string): CloudSyncAdapter => ({
  name: 'MongoDB-Atlas',
  save: async (data: Record<string, unknown>) => {
    const response = await fetch(`${apiUrl}/action/updateOne`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        dataSource: 'Cluster0',
        database: 'rgs_cloud',
        collection: 'user_states',
        filter: { id: 'global_state' }, // Or specific user ID
        update: { $set: { data, updatedAt: Date.now() } },
        upsert: true
      })
    })
    return response.ok
  }
})

/**
 * Template for Firebase Firestore
 */
export const createFirestoreAdapter = (db: unknown, docPath: string): CloudSyncAdapter => ({
  name: 'Firebase-Firestore',
  save: async (data: Record<string, unknown>) => {
    // Assuming Firebase SDK is already initialized
    try {
      // In a real scenario, you'd use updateDoc from firebase/firestore
      // await updateDoc(doc(db, docPath), { ...data, updatedAt: serverTimestamp() });
      const isDev = process.env.NODE_ENV !== 'production'
      const debugLog = (...args: unknown[]) => { if (isDev) console.debug(...args) }

      // await updateDoc(doc(db, docPath), { ...data, updatedAt: serverTimestamp() });
      debugLog('[Mock] Firestore Syncing:', data)
      return true
    } catch (e) {
      return false
    }
  }
})

/**
 * Template for generic SQL/PostgreSQL (via standard REST API)
 */
export const createSqlRestAdapter = (endpoint: string, authToken: string): CloudSyncAdapter => ({
  name: 'SQL-REST-API',
  save: async (data: Record<string, unknown>) => {
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(data)
    })
    return response.ok
  }
})
