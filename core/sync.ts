import { IStore } from "./types"
import { deepClone } from "./utils"
import { freeze as _immerFreeze } from 'immer'

/**
 * Local-First Sync Engine for RGS
 *
 * Provides offline-by-default functionality with automatic synchronization
 * when connectivity is restored. Supports multiple conflict resolution strategies.
 */

// --- Types ---

export type SyncStrategy = 'last-write-wins' | 'merge' | 'crdt' | 'server-wins' | 'client-wins'

export interface SyncConfig {
  /** Remote endpoint for synchronization */
  endpoint: string
  /** Authentication token */
  authToken?: string
  /** Conflict resolution strategy (default: 'last-write-wins') */
  strategy?: SyncStrategy
  /** Auto-sync interval in ms (default: 30000 = 30s) */
  autoSyncInterval?: number
  /** Enable auto-sync on reconnect (default: true) */
  syncOnReconnect?: boolean
  /** Debounce time for batch sync (default: 1000ms) */
  debounceTime?: number
  /** Custom fetch function */
  fetch?: typeof fetch
  /** Callback on sync complete */
  onSync?: (result: SyncResult) => void
  /** Callback on conflict */
  onConflict?: (conflict: ConflictInfo) => ConflictResolution
  /** Maximum retries on failure (default: 3) */
  maxRetries?: number
}

export interface SyncResult {
  success: boolean
  syncedKeys: string[]
  conflicts: ConflictInfo[]
  errors: string[]
  timestamp: number
  duration: number
}

export interface ConflictInfo {
  key: string
  localValue: unknown
  remoteValue: unknown
  localVersion: number
  remoteVersion: number
  timestamp: number
}

export type ConflictResolution =
  | { action: 'accept-local' }
  | { action: 'accept-remote' }
  | { action: 'merge'; value: unknown }
  | { action: 'discard' }

export interface SyncState {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTimestamp: number | null
  pendingChanges: number
  conflicts: number
}

// --- Sync Engine ---

interface PendingChange {
  key: string
  value: unknown
  timestamp: number
  version: number
}

interface RemoteVersion {
  version: number
  timestamp: number
  value: unknown
}

export class SyncEngine<S extends Record<string, unknown> = Record<string, unknown>> {
  private store: IStore<S>
  private config: Required<SyncConfig>
  private pendingQueue: Map<string, PendingChange> = new Map()
  private remoteVersions: Map<string, RemoteVersion> = new Map()
  private syncTimer: ReturnType<typeof setTimeout> | null = null
  private onlineStatusListeners: Set<(online: boolean) => void> = new Set()
  private syncStateListeners: Set<(state: SyncState) => void> = new Set()
  private _isOnline: boolean = true
  private _isSyncing: boolean = false

  constructor(store: IStore<S>, config: SyncConfig) {
    this.store = store
    this.config = {
      endpoint: config.endpoint,
      authToken: config.authToken || '',
      strategy: config.strategy || 'last-write-wins',
      autoSyncInterval: config.autoSyncInterval ?? 30000,
      syncOnReconnect: config.syncOnReconnect ?? true,
      debounceTime: config.debounceTime ?? 1000,
      fetch: config.fetch || fetch,
      onSync: config.onSync || (() => { }),
      onConflict: config.onConflict || (() => ({ action: 'accept-local' })),
      maxRetries: config.maxRetries ?? 3
    }

    this._isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    this._setupOnlineListener()
    this._setupStoreListener()

    // Start auto-sync if enabled
    if (this.config.autoSyncInterval > 0) {
      this._startAutoSync()
    }
  }

  private _setupOnlineListener(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => {
      this._isOnline = true
      this._notifyOnlineChange(true)
      if (this.config.syncOnReconnect) {
        this.sync()
      }
    })

    window.addEventListener('offline', () => {
      this._isOnline = false
      this._notifyOnlineChange(false)
    })
  }

  private _setupStoreListener(): void {
    // Listen to all store changes to queue for sync
    this.store._subscribe(() => {
      // This will be called on every change - we track pending changes differently
    })
  }

  private _startAutoSync(): void {
    setInterval(() => {
      if (this._isOnline && !this._isSyncing && this.pendingQueue.size > 0) {
        this.sync()
      }
    }, this.config.autoSyncInterval)
  }

  private _notifyOnlineChange(online: boolean): void {
    this.onlineStatusListeners.forEach(cb => cb(online))
    this._notifyStateChange()
  }

  private _notifyStateChange(): void {
    const state = this.getState()
    this.syncStateListeners.forEach(cb => cb(state))
  }

  /**
   * Queue a change for synchronization
   */
  queueChange(key: string, value: unknown): void {
    const version = this.store._getVersion(key) || 1
    this.pendingQueue.set(key, {
      key,
      value: deepClone(value),
      timestamp: Date.now(),
      version
    })
    this._notifyStateChange()

    // Debounced sync
    if (this.syncTimer) clearTimeout(this.syncTimer)
    this.syncTimer = setTimeout(() => {
      if (this._isOnline) this.sync()
    }, this.config.debounceTime)
  }

  /**
   * Perform synchronization with remote server
   */
  async sync(): Promise<SyncResult> {
    if (this._isSyncing) {
      return {
        success: false,
        syncedKeys: [],
        conflicts: [],
        errors: ['Sync already in progress'],
        timestamp: Date.now(),
        duration: 0
      }
    }

    this._isSyncing = true
    this._notifyStateChange()

    const startTime = Date.now()
    const syncedKeys: string[] = []
    const conflicts: ConflictInfo[] = []
    const errors: string[] = []

    try {
      // Get pending changes
      const pendingChanges = Array.from(this.pendingQueue.values())

      if (pendingChanges.length === 0) {
        this._isSyncing = false
        this._notifyStateChange()
        return {
          success: true,
          syncedKeys: [],
          conflicts: [],
          errors: [],
          timestamp: Date.now(),
          duration: Date.now() - startTime
        }
      }

      // Fetch remote versions for conflict detection
      await this._fetchRemoteVersions(pendingChanges.map(p => p.key))

      // Process each change
      for (const change of pendingChanges) {
        try {
          const remoteVersion = this.remoteVersions.get(change.key)

          if (!remoteVersion) {
            // No remote version - first time sync, just push
            await this._pushChange(change)
            syncedKeys.push(change.key)
            this.pendingQueue.delete(change.key)
          } else if (remoteVersion.version >= change.version) {
            // Remote is newer - conflict!
            const conflict: ConflictInfo = {
              key: change.key,
              localValue: change.value,
              remoteValue: remoteVersion.value,
              localVersion: change.version,
              remoteVersion: remoteVersion.version,
              timestamp: change.timestamp
            }
            conflicts.push(conflict)

            // Resolve conflict
            const resolution = this.config.onConflict(conflict)
            await this._resolveConflict(change, remoteVersion, resolution)
            syncedKeys.push(change.key)
            this.pendingQueue.delete(change.key)
          } else {
            // Local is newer - push to remote
            await this._pushChange(change)
            syncedKeys.push(change.key)
            this.pendingQueue.delete(change.key)
          }
        } catch (err) {
          errors.push(`Failed to sync "${change.key}": ${err}`)
        }
      }

      const result: SyncResult = {
        success: errors.length === 0,
        syncedKeys,
        conflicts,
        errors,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      }

      this.config.onSync(result)
      return result
    } catch (err) {
      const errorMsg = `Sync failed: ${err}`
      errors.push(errorMsg)

      return {
        success: false,
        syncedKeys,
        conflicts,
        errors,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      }
    } finally {
      this._isSyncing = false
      this._notifyStateChange()
    }
  }

  private async _fetchRemoteVersions(keys: string[]): Promise<void> {
    try {
      const response = await this.config.fetch(`${this.config.endpoint}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` })
        },
        body: JSON.stringify({ keys })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.versions) {
          for (const [key, version] of Object.entries(data.versions)) {
            this.remoteVersions.set(key, version as RemoteVersion)
          }
        }
      }
    } catch (err) {
      console.warn('[SyncEngine] Failed to fetch remote versions:', err)
    }
  }

  private async _pushChange(change: PendingChange): Promise<void> {
    let retries = 0

    while (retries < this.config.maxRetries) {
      try {
        const response = await this.config.fetch(`${this.config.endpoint}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` })
          },
          body: JSON.stringify({
            key: change.key,
            value: change.value,
            version: change.version,
            timestamp: change.timestamp
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.version) {
            this.remoteVersions.set(change.key, {
              version: data.version,
              timestamp: data.timestamp || Date.now(),
              value: change.value
            })
          }
          return
        }

        retries++
      } catch (err) {
        retries++
        if (retries >= this.config.maxRetries) throw err
      }
    }
  }

  private async _resolveConflict(
    localChange: PendingChange,
    remoteVersion: RemoteVersion,
    resolution: ConflictResolution
  ): Promise<void> {
    switch (resolution.action) {
      case 'accept-local':
        // Force push local value
        await this._pushChange({
          ...localChange,
          version: remoteVersion.version + 1,
          timestamp: Date.now()
        })
        break

      case 'accept-remote':
        // Keep remote value, update local store
        this.store.set(localChange.key, remoteVersion.value)
        break

      case 'merge':
        // Use merged value
        this.store.set(localChange.key, resolution.value)
        await this._pushChange({
          key: localChange.key,
          value: resolution.value,
          version: Math.max(localChange.version, remoteVersion.version) + 1,
          timestamp: Date.now()
        })
        break

      case 'discard':
        // Do nothing, keep local but don't sync
        break
    }
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return {
      isOnline: this._isOnline,
      isSyncing: this._isSyncing,
      lastSyncTimestamp: null, // Could track this
      pendingChanges: this.pendingQueue.size,
      conflicts: 0 // Could track unresolved conflicts
    }
  }

  /**
   * Subscribe to online status changes
   */
  onOnlineChange(callback: (online: boolean) => void): () => void {
    this.onlineStatusListeners.add(callback)
    return () => this.onlineStatusListeners.delete(callback)
  }

  /**
   * Subscribe to sync state changes
   */
  onStateChange(callback: (state: SyncState) => void): () => void {
    this.syncStateListeners.add(callback)
    return () => this.syncStateListeners.delete(callback)
  }

  /**
   * Force push all pending changes
   */
  async flush(): Promise<SyncResult> {
    return this.sync()
  }

  /**
   * Destroy the sync engine
   */
  destroy(): void {
    if (this.syncTimer) clearTimeout(this.syncTimer)
    this.pendingQueue.clear()
    this.onlineStatusListeners.clear()
    this.syncStateListeners.clear()
  }
}

/**
 * Create a configured SyncEngine instance
 */
export const createSyncEngine = <S extends Record<string, unknown>>(
  store: IStore<S>,
  config: SyncConfig
): SyncEngine<S> => {
  return new SyncEngine(store, config)
}
