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
 * SSR-safe with proper hydration support.
 *
 * @param key - State key to subscribe to
 * @param store - Optional store instance (uses default if not provided)
 * @returns Tuple of [value, setter]
 *
 * @example
 * const [count, setCount] = useStore('count')
 * // count will be undefined on SSR, actual value on client
 */
export const useStore = <T = unknown, S extends Record<string, unknown> = Record<string, unknown>>(
  key: string,
  store?: IStore<S>
): readonly [T | undefined, (val: T | StateUpdater<T>, options?: PersistOptions) => boolean] => {
  // Memoize store reference - always call this hook
  const targetStore = useMemo(() =>
    (store || _defaultStore) as IStore<Record<string, unknown>> | null,
    [store]
  )

  // Ghost store fallback - ultra-light silent safe defaults for SSR/Missing store
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
      get plugins() { return {} }
    }
  }, []) as unknown as IStore<Record<string, unknown>>

  // Use ghost store if no store is available
  const safeStore = targetStore || ghostStore

  // SSR-safe subscription
  const subscribe = useMemo(() =>
    (callback: () => void) => safeStore._subscribe(callback, key),
    [safeStore, key]
  )

  // Get current value (undefined on SSR, actual value on client)
  const value = useSyncExternalStore(
    subscribe,
    () => safeStore.get<T>(key) ?? undefined,
    () => undefined // Server snapshot returns undefined
  ) as T | undefined

  // Memoized setter to prevent unnecessary re-renders
  const setter = useMemo(() =>
    (val: T | StateUpdater<T>, options?: PersistOptions) =>
      safeStore.set<T>(key, val, options),
    [safeStore, key]
  )

  // Debug value for React DevTools
  useDebugValue(value, v => `${key}: ${JSON.stringify(v)}`)

  return [value, setter] as const
}

// Legacy aliases - DEPRECATED, will be removed in next major
/** @deprecated Use useStore instead */
export const useGState = useStore

/** @deprecated Use useStore instead */
export const useSimpleState = useStore
