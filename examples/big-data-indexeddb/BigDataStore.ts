import { gstate } from '../../index'
import { indexedDBPlugin } from '../../plugins/official/indexeddb.plugin'

/**
 * Big Data Store using IndexedDB
 * RECOMMENDED FOR: Frontend (FE)
 *
 * Demonstrates how to handle massive datasets (GBs) that would exceed
 * the standard 5MB-10MB limit of localStorage.
 */

export interface BigDataState extends Record<string, unknown> {
  largeCollection: any[]
  metaInfo: { totalItems: number, lastSync: number }
}

const initialState: BigDataState = {
  largeCollection: [],
  metaInfo: { totalItems: 0, lastSync: Date.now() }
}

// 1. Define the store
export const useBigData = gstate<BigDataState>(initialState, {
  namespace: 'big-data-vault',
  persist: false // Disable standard persistence to use IndexedDB exclusively
})

// 2. Add the IndexedDB Plugin
useBigData._addPlugin(indexedDBPlugin({
  dbName: 'UserLargeStorage',
  storeName: 'appStates'
}))

/**
 * Action to simulate adding a large amount of data.
 */
export const populateData = (count: number = 1000) => {
  const data: Array<{ id: string, payload: string, timestamp: number }> = []
  for (let i = 0; i < count; i++) {
    data.push({
      id: `item_${i}`,
      payload: 'X'.repeat(1024), // 1KB per item
      timestamp: Date.now()
    })
  }

  useBigData.transaction(() => {
    useBigData.set('largeCollection', data)
    useBigData.set('metaInfo', { totalItems: count, lastSync: Date.now() })
  })
}

/**
 * Clear the database
 */
export const clearBigData = async () => {
  // Access plugin methods registered on the store
  await (useBigData as any).plugins.indexedDB.clear()
  useBigData.set('largeCollection', [])
}
