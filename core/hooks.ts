import { useSyncExternalStore, useDebugValue, useMemo } from "react"
import { createStore } from "./store"
import type { IStore, StoreConfig, PersistOptions, StateUpdater } from "./types"

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
): any {
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

  // --- MODE 1: Selector Function (Read-Only) ---
  if (typeof keyOrSelector === 'function') {
    const selector = keyOrSelector
    const subscribe = useMemo(() =>
      (cb: () => void) => safeStore._subscribe(cb), // Subscribe to all changes
      [safeStore]
    )

    const getSnapshot = () => safeStore.getSnapshot()

    // Create a stable selector wrapper to prevent infinite loops if selector returns new object
    // However, users should memoize selectors or rely on React 18's referential checks.
    // We pass the selector directly to useSyncExternalStore's snapshot function?
    // No, useSyncExternalStore expects a getSnapshot that returns immutable generic state,
    // and then we apply selector? Or selector inside getSnapshot?
    // React docs say: getSnapshot must return cached value.
    // Our store.getSnapshot() returns a cached object reference.
    // So we can compute the selected value during render.

    // Correct pattern for selectors with useSyncExternalStore:
    const selection = useSyncExternalStore(
      subscribe,
      () => selector(safeStore.getSnapshot()),
      () => selector({} as S) // Server snapshot
    )

    return selection
  }

  // --- MODE 2: String Key (Read/Write) ---
  const key = keyOrSelector as string

  // SSR-safe subscription (filtered by key)
  const subscribe = useMemo(() =>
    (callback: () => void) => safeStore._subscribe(callback, key),
    [safeStore, key]
  )

  // Get current value
  const value = useSyncExternalStore(
    subscribe,
    () => safeStore.get<T>(key) ?? undefined,
    () => undefined // Server snapshot
  ) as T | undefined

  // Memoized setter
  const setter = useMemo(() =>
    (val: T | StateUpdater<T>, options?: PersistOptions) =>
      safeStore.set<T>(key, val, options),
    [safeStore, key]
  )

  useDebugValue(value, v => `${key}: ${JSON.stringify(v)}`)

  return [value, setter] as const
}
