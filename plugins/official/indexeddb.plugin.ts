import type { IPlugin, PluginContext } from '../../core/types'

/**
 * IndexedDB Plugin for RGS
 * Allows storing large amounts of data (GBs) by leveraging IndexedDB.
 * This plugin can be used as a replacement for standard localStorage persistence.
 */

export interface IndexedDBOptions {
  dbName?: string
  storeName?: string
  version?: number
}

export const indexedDBPlugin = (options: IndexedDBOptions = {}): IPlugin<any> => {
  const dbName = options.dbName || 'rgs-db'
  const storeName = options.storeName || 'states'
  const dbVersion = options.version || 1
  let db: IDBDatabase | null = null

  const getDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db)
      const request = indexedDB.open(dbName, dbVersion)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        db = request.result
        resolve(db)
      }
      request.onupgradeneeded = (event: any) => {
        const database = event.target.result
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName)
        }
      }
    })
  }

  const save = async (key: string, value: any) => {
    const database = await getDB()
    return new Promise<void>((resolve, reject) => {
      const tx = database.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const request = store.put(value, key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  const load = async (key: string): Promise<any> => {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  const remove = async (key: string) => {
    const database = await getDB()
    return new Promise<void>((resolve, reject) => {
      const tx = database.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  return {
    name: 'indexedDB',
    hooks: {
      onInstall: ({ store }) => {
        // Register utility methods
        store._registerMethod('indexedDB', 'clear', async () => {
          const database = await getDB()
          const tx = database.transaction(storeName, 'readwrite')
          tx.objectStore(storeName).clear()
        })
      },

      onInit: async ({ store }) => {
        // Hydrate from IndexedDB
        // We look for all keys that start with the store namespace
        const database = await getDB()
        const tx = database.transaction(storeName, 'readonly')
        const objectStore = tx.objectStore(storeName)
        const request = objectStore.getAllKeys()

        request.onsuccess = async () => {
          const keys = request.result as string[]
          const prefix = (store as any).namespace + '_'

          for (const key of keys) {
            if (key.startsWith(prefix)) {
              const val = await load(key)
              if (val) {
                const storeKey = key.substring(prefix.length);
                // Use a silent set to avoid re-triggering persistence during hydration
                (store as any)._setSilently(storeKey, val.d)
              }
            }
          }
        }
      },

      onSet: async ({ key, value, store }) => {
        if (!key) return
        const prefix = (store as any).namespace + '_'
        // We wrap the value in a structure similar to what RGS does for storage
        const data = {
          d: value,
          t: Date.now(),
          v: (store as any)._getVersion?.(key) || 1
        }
        await save(`${prefix}${key}`, data)
      },

      onRemove: async ({ key, store }) => {
        if (!key) return
        const prefix = (store as any).namespace + '_'
        await remove(`${prefix}${key}`)
      }
    }
  }
}
