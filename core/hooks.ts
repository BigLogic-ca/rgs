import { useSyncExternalStore, useDebugValue, useMemo, useCallback, useEffect, useState } from "react"
import { createStore } from "./store"
import type { IStore, StoreConfig, PersistOptions, StateUpdater } from "./types"
import { SyncEngine, SyncConfig, SyncState } from "./sync"

let _defaultStore: IStore<Record<string, unknown>> | null = null

/**
 * Initialize a global store instance.
 * @param config Optional store configuration
 * @returns IStore instance
 * @throws Error if store already exists (prevents accidental overwrites)
 */
export const initState = <S extends Record<string, unknown>>(
  config?: StoreConfig<S>
): IStore<S> => {
  if (_defaultStore && !config?.namespace) {
    if (!config?.silent) {
      console.warn(
        "[gState] Store already exists. Pass a unique namespace to create additional stores."
      )
    }
  }

  const store = createStore<S>(config)
  _defaultStore = store as IStore<Record<string, unknown>>
  return store
}

/**
 * Cleanup the global state.
 * Safe to call multiple times.
 */
export const destroyState = (): void => {
  if (_defaultStore) {
    _defaultStore.destroy()
    _defaultStore = null
  }
}

/**
 * Hook to check if the store has finished hydration.
 * @param store Optional store instance
 * @returns boolean
 */
export const useIsStoreReady = (store?: IStore<Record<string, unknown>>): boolean => {
  const targetStore = store || _defaultStore

  const subscribe = useMemo(() =>
    (callback: () => void) => targetStore ? targetStore._subscribe(callback) : () => { },
    [targetStore]
  )

  return useSyncExternalStore(
    subscribe,
    () => targetStore ? targetStore.isReady : false,
    () => true // SSR is always "ready" as it doesn't hydrate from local storage
  )
}

/**
 * Get the current default store (for advanced use cases).
 * Returns null if no store has been initialized.
 */
export const getStore = (): IStore<Record<string, unknown>> | null => _defaultStore

/**
 * Check if running in a server-side environment.
 */
const _isServer = (): boolean =>
  typeof window === 'undefined' ||
  typeof window.document === 'undefined'

/**
 * Reactive Hook for state management.
 *
 * Supports two modes:
 * 1. String Key: `useStore('count')` -> Returns [value, setter]
 * 2. Type-Safe Selector: `useStore(state => state.count)` -> Returns value (Read-only)
 */
export function useStore<T, S extends Record<string, unknown> = Record<string, unknown>>(
  selector: (state: S) => T,
  store?: IStore<S>
): T
export function useStore<T = unknown, S extends Record<string, unknown> = Record<string, unknown>>(
  key: string,
  store?: IStore<S>
): readonly [T | undefined, (val: T | StateUpdater<T>, options?: PersistOptions) => boolean]
export function useStore<T = unknown, S extends Record<string, unknown> = Record<string, unknown>>(
  keyOrSelector: string | ((state: S) => T),
  store?: IStore<S>
): T | readonly [T | undefined, (val: T | StateUpdater<T>, options?: PersistOptions) => boolean] {
  // Memoize store reference
  const targetStore = useMemo(() =>
    (store || _defaultStore) as IStore<S> | null,
    [store]
  )

  // Ghost store fallback
  const ghostStore = useMemo(() => {
    const noop = () => { }
    const noopFalse = () => false
    const noopNull = () => null
    return {
      set: noopFalse, get: noopNull, remove: noopFalse, delete: noopFalse,
      deleteAll: noopFalse, list: () => ({}), compute: noopNull,
      watch: () => () => { }, use: noop, transaction: noop, destroy: noop,
      _subscribe: () => () => { }, _setSilently: noop, _registerMethod: noop,
      _addPlugin: noop, _removePlugin: noop, _getVersion: () => 0,
      get isReady() { return false }, whenReady: () => Promise.resolve(),
      get plugins() { return {} },
      getSnapshot: () => ({} as S), // Ghost snapshot
      get namespace() { return "ghost" }, get userId() { return undefined }
    } as unknown as IStore<S>
  }, [])

  const safeStore = targetStore || ghostStore

  const isSelector = typeof keyOrSelector === 'function'
  const key = !isSelector ? (keyOrSelector as string) : null
  const selector = isSelector ? (keyOrSelector as (state: S) => T) : null

  // 1. Subscribe
  const subscribe = useCallback(
    (callback: () => void) => {
      if (isSelector) {
        // Selector mode: subscribe to all changes
        return safeStore._subscribe(callback)
      } else {
        // Key mode: subscribe to key changes
        return safeStore._subscribe(callback, key!)
      }
    },
    [safeStore, isSelector, key]
  )

  // 2. Get Snapshot (Client)
  const getSnapshot = useCallback(() => {
    if (isSelector) {
      return selector!(safeStore.getSnapshot())
    } else {
      return safeStore.get<T>(key!) ?? undefined
    }
  }, [safeStore, isSelector, key, selector])

  // 3. Get Snapshot (Server)
  const getServerSnapshot = useCallback(() => {
    if (isSelector) {
      try { return selector!({} as S) } catch { return undefined }
    } else {
      return undefined
    }
  }, [selector, isSelector])

  const value = useSyncExternalStore(
    subscribe,
    getSnapshot as () => T | undefined, // Cast needed for union types
    getServerSnapshot as () => T | undefined
  )

  // 4. Setter (Only for Key Mode)
  const setter = useCallback(
    (val: T | StateUpdater<T>, options?: PersistOptions) => {
      if (isSelector) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[gState] Cannot set value when using a selector.')
        }
        return false
      }
      return safeStore.set<T>(key!, val, options)
    },
    [safeStore, isSelector, key]
  )

  // Debug value
  useDebugValue(value, v => isSelector ? `Selector: ${JSON.stringify(v)}` : `${key}: ${JSON.stringify(v)}`)

  if (isSelector) {
    return value as T
  }

  return [value, setter] as const
}

// Store map for sync engines - using any to avoid complex generic issues
const _syncEngines = new Map<string, SyncEngine<Record<string, unknown>>>()

/**
 * Initialize sync engine for a store
 * @param store - The store to sync
 * @param config - Sync configuration
 * @returns SyncEngine instance
 */
export const initSync = (
  store: IStore<Record<string, unknown>>,
  config: SyncConfig
): SyncEngine<Record<string, unknown>> => {
  const key = store.namespace
  if (_syncEngines.has(key)) {
    console.warn(`[gState] Sync engine already exists for namespace "${key}". Call destroySync first.`)
    return _syncEngines.get(key)!
  }

  const engine = new SyncEngine(store, config)
  _syncEngines.set(key, engine)
  return engine
}

/**
 * Destroy sync engine for a namespace
 */
export const destroySync = (namespace: string): void => {
  const engine = _syncEngines.get(namespace)
  if (engine) {
    engine.destroy()
    _syncEngines.delete(namespace)
  }
}

/**
 * Hook for synchronized state management.
 * Provides offline-by-default functionality with automatic sync.
 *
 * @param key - State key
 * @param store - Optional store instance (uses default if not provided)
 * @returns [value, setter, syncState]
 *
 * @example
 * const [count, setCount, syncState] = useSyncedState('count')
 *
 * // syncState contains:
 * // - isOnline: boolean
 * // - isSyncing: boolean
 * // - pendingChanges: number
 * // - conflicts: number
 */
export function useSyncedState<T = unknown>(
  key: string,
  store?: IStore<Record<string, unknown>>
): readonly [
  T | undefined,
  (val: T | StateUpdater<T>, options?: PersistOptions) => boolean,
  SyncState
] {
  const targetStore = store || _defaultStore
  const namespace = targetStore?.namespace || 'default'

  // Get or create sync engine
  const engine = _syncEngines.get(namespace)

  // Use useStore with any cast to handle generics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = useStore(key, targetStore as any) as readonly [T | undefined, (val: any, options?: PersistOptions) => boolean]
  const value = result[0] as T | undefined
  const setter = result[1]

  // Track sync state
  const [syncState, setSyncState] = useState<SyncState>(() => engine?.getState() || {
    isOnline: true,
    isSyncing: false,
    lastSyncTimestamp: null,
    pendingChanges: 0,
    conflicts: 0
  })

  // Subscribe to sync state changes
  useEffect(() => {
    if (!engine) return

    const unsubscribe = engine.onStateChange(setSyncState)
    return unsubscribe
  }, [engine])

  // Wrapper setter that queues changes for sync
  const syncedSetter = useCallback(
    (val: T | StateUpdater<T>, options?: PersistOptions) => {
      const result = setter(val, options)

      if (result && engine) {
        // Get the current value and queue for sync
        const currentValue = targetStore?.get(key)
        engine.queueChange(key, currentValue)
      }

      return result
    },
    [setter, engine, key, targetStore]
  )

  return [value, syncedSetter, syncState] as const
}

/**
 * Hook to get global sync status
 *
 * @example
 * const status = useSyncStatus()
 * // status.isOnline, status.isSyncing, status.pendingChanges
 */
export const useSyncStatus = (): SyncState => {
  const [state, setState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    lastSyncTimestamp: null,
    pendingChanges: 0,
    conflicts: 0
  })

  useEffect(() => {
    // Aggregate state from all sync engines
    const updateState = () => {
      let isOnline = true
      let isSyncing = false
      let pendingChanges = 0
      let conflicts = 0

      _syncEngines.forEach(engine => {
        const s = engine.getState()
        isOnline = isOnline && s.isOnline
        isSyncing = isSyncing || s.isSyncing
        pendingChanges += s.pendingChanges
        conflicts += s.conflicts
      })

      setState({
        isOnline,
        isSyncing,
        lastSyncTimestamp: null,
        pendingChanges,
        conflicts
      })
    }

    updateState()

    // Subscribe to all engines
    const unsubscribes = Array.from(_syncEngines.values()).map(engine =>
      engine.onStateChange(updateState)
    )

    return () => unsubscribes.forEach(fn => fn())
  }, [])

  return state
}

/**
 * Trigger manual sync for a specific namespace
 */
export const triggerSync = async (namespace?: string): Promise<void> => {
  const targetNamespace = namespace || _defaultStore?.namespace
  if (!targetNamespace) return

  const engine = _syncEngines.get(targetNamespace)
  if (engine) {
    await engine.flush()
  }
}
