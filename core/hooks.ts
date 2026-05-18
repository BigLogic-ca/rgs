import { useSyncExternalStore, useDebugValue, useMemo, useCallback, useEffect, useState, useRef } from "react"
import { createStore } from "./store"
import type { IStore, StoreConfig, PersistOptions, StateUpdater } from "./types"
import { SyncEngine, SyncConfig, SyncState } from "./sync"
import { isDevelopment, isProduction } from "./env"

// ============================================================================
// Store Registry - Multi-store support with HMR safety
// ============================================================================

/**
 * Global store registry - supports multiple named stores.
 * Keyed by namespace for micro-frontend isolation.
 */
const _storeRegistry = new Map<string, IStore<Record<string, unknown>>>()

/**
 * Default store namespace.
 */
const _DEFAULT_NS = '__default__'

/**
 * HMR cleanup handler - prevents stale store references on hot reload.
 * Works with Vite (import.meta.hot) and Webpack (module.hot).
 */
declare const module: { hot?: { dispose: (cb: () => void) => void } }

if (typeof module !== 'undefined' && module.hot) {
  module.hot.dispose(() => {
    _storeRegistry.forEach(store => { try { store.destroy() } catch { /* ignore */ } })
    _storeRegistry.clear()
  })
}

/**
 * Initialize a global store instance.
 * @param config Optional store configuration
 * @returns IStore instance
 */
export const initState = <S extends Record<string, unknown>>(
  config?: StoreConfig<S>
): IStore<S> => {
  const ns = config?.namespace || _DEFAULT_NS

  // Return existing store if namespace already registered
  const existing = _storeRegistry.get(ns)
  if (existing) {
    if (!config?.silent && isDevelopment()) {
      console.warn(
        `[gstate] Store "${ns}" already exists. Returning existing instance. Use a unique namespace or call destroyState() first.`
      )
    }
    return existing as IStore<S>
  }

  const store = createStore<S>(config)
  _storeRegistry.set(ns, store as IStore<Record<string, unknown>>)
  return store
}

/**
 * Cleanup the global state.
 * Safe to call multiple times.
 * @param namespace Optional namespace to destroy. If not provided, destroys the default store.
 */
export const destroyState = (namespace?: string): void => {
  const ns = namespace || _DEFAULT_NS
  const store = _storeRegistry.get(ns)
  if (store) {
    store.destroy()
    _storeRegistry.delete(ns)
  }
}

/**
 * Cleanup ALL registered stores.
 * Useful for HMR, testing, and micro-frontend teardown.
 */
export const destroyAllStores = (): void => {
  _storeRegistry.forEach(store => { try { store.destroy() } catch { /* ignore */ } })
  _storeRegistry.clear()
}

/**
 * Get the current default store (for advanced use cases).
 * Returns null if no store has been initialized.
 */
export const getStore = (): IStore<Record<string, unknown>> | null =>
  _storeRegistry.get(_DEFAULT_NS) || null

/**
 * Get a store by namespace.
 * @param namespace Store namespace
 * @returns Store instance or null
 */
export const getStoreByNamespace = (namespace: string): IStore<Record<string, unknown>> | null =>
  _storeRegistry.get(namespace) || null

/**
 * Register a store in the global registry.
 * Used by gstate() to track stores for HMR cleanup.
 * @param namespace Store namespace
 * @param store Store instance
 */
export const registerStore = (namespace: string, store: IStore<Record<string, unknown>>): void => {
  _storeRegistry.set(namespace, store)
}

/**
 * Unregister a store from the global registry.
 * @param namespace Store namespace
 */
export const unregisterStore = (namespace: string): void => {
  _storeRegistry.delete(namespace)
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to check if the store has finished hydration.
 * @param store Optional store instance
 * @returns boolean
 */
export const useIsStoreReady = (store?: IStore<Record<string, unknown>>): boolean => {
  const targetStore = store || getStore()

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
 * Internal helper to get the default store with warning.
 */
const _getDefaultStore = <S extends Record<string, unknown>>(): IStore<S> | null => {
  const store = getStore()
  if (!store && !isProduction()) {
    console.warn(
      '[gstate] No store initialized. Call initState() before using useStore(), or pass a store instance explicitly.'
    )
  }
  return store as IStore<S> | null
}

/**
 * Reactive Hook for state management.
 *
 * Supports two modes:
 * 1. String Key: `useStore('count')` -> Returns [value, setter] tuple
 * 2. Type-Safe Selector: `useStore(state => state.count)` -> Returns value directly (read-only)
 *
 * @example
 * // Key mode - returns [value, setter]
 * const [count, setCount] = useStore('count')
 *
 * // Selector mode - returns value directly (read-only)
 * const count = useStore(state => state.count)
 *
 * @note Selector mode is READ-ONLY. To update state, use the store instance directly:
 *       store.set('key', value) or use the key mode: const [, setCount] = useStore('count')
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
  // Memoize store reference - use provided store or default
  const targetStore = useMemo(() =>
    store || _getDefaultStore<S>(),
    [store]
  )

  // Ghost store fallback - prevents crashes but warns in dev
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
      getSnapshot: () => ({} as S),
      get namespace() { return "ghost" }, get userId() { return undefined }
    } as unknown as IStore<S>
  }, [])

  const safeStore = targetStore || ghostStore
  const hasNoStore = !targetStore

  const isSelector = typeof keyOrSelector === 'function'
  const key = !isSelector ? (keyOrSelector as string) : null
  const selector = isSelector ? (keyOrSelector as (state: S) => T) : null

   // Warn once if no store initialized (key mode only)
   const warnedRef = useRef(false)
   useEffect(() => {
     if (!warnedRef.current && hasNoStore && !isSelector && !isProduction()) {
       warnedRef.current = true
       console.warn(
         `[gstate] useStore('${key}') called without initialized store. ` +
         `Call initState() first or pass a store instance.`
       )
     }
   }, [hasNoStore, isSelector, isProduction(), key])

  // 1. Subscribe
  const subscribe = useCallback(
    (callback: () => void) => {
      if (isSelector) {
        return safeStore._subscribe(callback)
      } else {
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

  // 3. Get Snapshot (Server) - safe selector for empty state
  const getServerSnapshot = useCallback(() => {
    if (isSelector) {
      try {
        // Create a safe proxy that returns undefined for any property access
        const safeEmptyProxy = new Proxy({} as S, {
          get: () => undefined,
          has: () => false
        })
        return selector!(safeEmptyProxy)
      } catch { return undefined }
    } else {
      return undefined
    }
  }, [selector, isSelector])

  const value = useSyncExternalStore(
    subscribe,
    getSnapshot as () => T | undefined,
    getServerSnapshot as () => T | undefined
  )

  // 4. Setter (Only for Key Mode)
  const setter = useCallback(
    (val: T | StateUpdater<T>, options?: PersistOptions) => {
      if (isSelector) {
        if (!isProduction()) {
          console.warn('[gstate] Cannot set value when using a selector. Use the setter from key mode: useStore("key")[1]')
        }
        return false
      }
      if (!targetStore) {
        console.error(`[gstate] Cannot set "${key}" - no store initialized. Call initState() first.`)
        return false
      }
      return safeStore.set<T>(key!, val, options)
    },
    [safeStore, isSelector, key, targetStore]
  )

  // Debug value
  useDebugValue(value, v => isSelector ? `Selector: ${JSON.stringify(v)}` : `${key}: ${JSON.stringify(v)}`)

  // Selector mode returns value directly (read-only)
  if (isSelector) {
    return value as T
  }

  // Key mode returns [value, setter] tuple
  return [value, setter] as const
}

// ============================================================================
// Sync Engine
// ============================================================================

// Store map for sync engines
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
    console.warn(`[gstate] Sync engine already exists for namespace "${key}". Call destroySync first.`)
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
 */
export function useSyncedState<T = unknown>(
  key: string,
  store?: IStore<Record<string, unknown>>
): readonly [
  T | undefined,
  (val: T | StateUpdater<T>, options?: PersistOptions) => boolean,
  SyncState
] {
  const targetStore = store || getStore()
  const namespace = targetStore?.namespace || 'default'

  // Get or create sync engine - auto-initialize if missing
  let engine = _syncEngines.get(namespace)
  if (!engine && targetStore) {
    // Auto-create sync engine with default config
    if (isDevelopment()) {
      console.warn(
        `[gstate] useSyncedState('${key}') called without initSync(). ` +
        `Call initSync(store, config) first for proper sync behavior.`
      )
    }
  }

  const result = useStore(
    key,
    targetStore as IStore<Record<string, unknown>>
  ) as readonly [
    T | undefined,
    (val: T | StateUpdater<T>, options?: PersistOptions) => boolean
  ]
  const value = result[0]
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
  const targetNamespace = namespace || getStore()?.namespace
  if (!targetNamespace) return

  const engine = _syncEngines.get(targetNamespace)
  if (engine) {
    await engine.flush()
  }
}

/**
 * Hook to subscribe to any state changes and trigger re-render.
 * Use this when you want to re-render on any store change without reading a specific key.
 * @param store Optional store instance
 * @returns [isSubscribed, forceRender]
 */
export function useStoreSubscribe<S extends Record<string, unknown> = Record<string, unknown>>(
  store?: IStore<S>
): readonly [boolean, () => void] {
  const targetStore = useMemo(() =>
    (store || getStore()) as IStore<S> | null,
    [store]
  )

  const subscribe = useCallback(
    (callback: () => void) => {
      return targetStore ? targetStore._subscribe(callback) : () => { }
    },
    [targetStore]
  )

  const getSnapshot = useCallback(() => true, [])
  const getServerSnapshot = useCallback(() => true, [])

  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const [, setForceRender] = useState(0)

  const forceRender = useCallback(() => setForceRender(n => n + 1), [])

  return [true, forceRender] as const
}
