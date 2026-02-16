import type { IPlugin } from '../../core/types'

/**
 * Sync Plugin: Synchronizes state across multiple browser tabs.
 * @param options Configuration for the broadcast channel
 * @returns IPlugin
 */
export const syncPlugin = (options?: { channelName?: string }): IPlugin => {
  /** BroadcastChannel for cross-tab communication */
  const _channel = new BroadcastChannel(options?.channelName || 'gstate_sync')

  /** Flag to prevent infinite loops when syncing from other tabs */
  let _isSyncing = false

  return {
    name: 'gstate-sync',
    hooks: {
      onInstall: ({ store }) => {
        _channel.onmessage = (event) => {
          const { key, value, action } = event.data
          if (!key) return
          _isSyncing = true
          if (action === 'REMOVE') {
            store.remove(key)
          } else {
            store.set(key, value)
          }
          _isSyncing = false
        }
      },
      onSet: ({ key, value }) => {
        if (!key || _isSyncing) return
        _channel.postMessage({ key, value, action: 'SET' })
      },
      onRemove: ({ key }) => {
        if (!key || _isSyncing) return
        _channel.postMessage({ key, action: 'REMOVE' })
      },
      onDestroy: () => {
        _channel.close()
      }
    }
  }
}
