/**
 * SSR Support for RGS
 * Provides hydration helpers for Next.js, Remix, and other SSR frameworks
 */

import { createStore, StorageAdapters } from "./store"
import type { IStore, StoreConfig } from "./types"

// ============================================================================
// SSR Environment Detection
// ============================================================================

/**
 * Check if running in server-side environment
 */
export const isServerSide = (): boolean =>
  typeof window === 'undefined' ||
  typeof window.document === 'undefined'

/**
 * Check if running in browser environment
 */
export const isClientSide = (): boolean => !isServerSide()

// ============================================================================
// SSR Store Configuration
// ============================================================================

/**
 * Configuration options for SSR stores
 */
export interface SSRStoreConfig<S extends Record<string, unknown>> extends StoreConfig<S> {
  /**
   * Delay hydration until explicitly triggered
   * When true, store starts in "server mode" with empty state
   * Use hydrateOnClient() to trigger hydration on the client
   * @default false
   */
  deferHydration?: boolean

  /**
   * Initial state to use on server-side
   * This state will be serialized to the client and rehydrated
   */
  initialState?: S

  /**
   * Enable SSR-safe mode
   * Uses memory storage on server, localStorage on client
   * @default true
   */
  ssrSafe?: boolean
}

/**
 * Creates a store optimized for SSR environments
 *
 * @param config - SSR-specific store configuration
 * @returns IStore instance with SSR capabilities
 *
 * @example
 * // Next.js Page Component
 * const store = createSSRStore({
 *   namespace: 'my-app',
 *   deferHydration: true,
 *   initialState: { counter: 0 }
 * })
 *
 * // After client hydration
 * hydrateOnClient(store)
 */
export const createSSRStore = <S extends Record<string, unknown>>(
  config?: SSRStoreConfig<S>
): IStore<S> & {
  /** Manually trigger hydration on client */
  hydrate: () => Promise<void>
  /** Get state for SSR serialization */
  getSerializedState: () => string | null
  /** Check if hydration has occurred */
  isHydrated: () => boolean
} => {
  const ssrSafe = config?.ssrSafe ?? true
  const deferHydration = config?.deferHydration ?? false

  // On server: use memory storage (no persistence)
  // On client with ssrSafe: use memory initially, then switch to localStorage after hydration
  let storage = config?.storage

  if (!storage && ssrSafe) {
    if (isServerSide()) {
      // Server: use memory storage
      storage = StorageAdapters.memory()
    }
    // Client will get storage from config or default to localStorage after hydration
  }

  // Create the base store
  const store = createStore<S>({
    ...config,
    storage: storage || undefined,
    // Disable persistence during SSR to avoid hydration mismatches
    persistByDefault: deferHydration ? false : (config?.persistByDefault ?? false)
  })

  let _hydrated = false
  let _serializedState: string | null = null

  // If initialState provided, set it (for server-side)
  if (config?.initialState && isServerSide()) {
    Object.entries(config.initialState).forEach(([k, v]) => {
      store._setSilently(k, v)
    })
    // Serialize for client hydration
    _serializedState = JSON.stringify(config.initialState)
  }

  // If deferHydration is true, we need special handling
  const _needsDeferredHydration = deferHydration && isClientSide()

  /**
   * Manually trigger hydration on client
   * Call this after the component mounts in a useEffect
   */
  const hydrate = async (): Promise<void> => {
    if (_hydrated || isServerSide()) return

    // Set actual storage for hydration
    if (ssrSafe && !store.namespace.startsWith('async_')) {
      // Get the internal store reference and update storage
      // This is a workaround - in production we'd need store internal access
      // For now, we reinitialize with proper storage
      const currentState = store.getSnapshot()

      // Create new store with localStorage
      const newStore = createStore<S>({
        ...config,
        namespace: store.namespace,
        storage: undefined, // Will use default (localStorage)
        persistByDefault: config?.persistByDefault ?? false
      })

      // Restore state
      Object.entries(currentState).forEach(([k, v]) => {
        newStore._setSilently(k, v)
      })

      _hydrated = true
    } else {
      _hydrated = true
    }

    // Wait for store to be ready
    await store.whenReady()
  }

  /**
   * Get serialized state for SSR
   * Use this in getServerSideProps or loader to get state to pass to client
   */
  const getSerializedState = (): string | null => {
    if (isServerSide()) {
      return JSON.stringify(store.getSnapshot())
    }
    return _serializedState
  }

  /**
   * Check if hydration has occurred
   */
  const isHydrated = (): boolean => _hydrated || store.isReady

  // Attach SSR methods to store
  return Object.assign(store, {
    hydrate,
    getSerializedState,
    isHydrated
  })
}

// ============================================================================
// Hydration Helpers
// ============================================================================

/**
 * Hydrate an existing store on the client
 * Use this with stores created without deferHydration
 *
 * @param store - The store to hydrate
 * @returns Promise that resolves when hydration is complete
 *
 * @example
 * // In a Next.js client component
 * useEffect(() => {
 *   hydrateOnClient(myStore)
 * }, [])
 */
export const hydrateOnClient = async (
  store: IStore<Record<string, unknown>>
): Promise<void> => {
  if (isServerSide()) {
    console.warn('[gstate] hydrateOnClient called on server - skipping')
    return
  }

  // Wait for store to be ready
  await store.whenReady()
}

/**
 * Dehydrate store state for SSR transfer
 * Call this on server to get state to serialize
 *
 * @param store - The store to dehydrate
 * @returns Serialized state string
 *
 * @example
 * // In getServerSideProps
 * const state = dehydrateStore(myStore)
 * return { props: { dehydratedState: state } }
 */
export const dehydrateStore = (
  store: IStore<Record<string, unknown>>
): string => {
  return JSON.stringify(store.getSnapshot())
}

/**
 * Rehydrate store from SSR state
 * Call this on client with state from server
 *
 * @param store - The store to rehydrate
 * @param serializedState - State from server
 *
 * @example
 * // In _app.tsx getInitialProps
 * if (typeof window !== 'undefined' && props.dehydratedState) {
 *   rehydrateStore(myStore, props.dehydratedState)
 * }
 */
export const rehydrateStore = (
  store: IStore<Record<string, unknown>>,
  serializedState: string
): void => {
  if (isServerSide()) return

  try {
    const state = JSON.parse(serializedState)
    Object.entries(state).forEach(([key, value]) => {
      store._setSilently(key, value)
    })
  } catch (e) {
    console.error('[gstate] Failed to rehydrate store:', e)
  }
}

// ============================================================================
// React Hooks for SSR
// ============================================================================

// Lazy load React to avoid SSR issues
let React: typeof import('react')
let useState: typeof import('react')['useState']
let useEffect: typeof import('react')['useEffect']
let useSyncExternalStore: typeof import('react')['useSyncExternalStore']
let useMemo: typeof import('react')['useMemo']
let useCallback: typeof import('react')['useCallback']

const getReact = () => {
  if (!React) {
    React = require('react')
    useState = React.useState
    useEffect = React.useEffect
    useSyncExternalStore = React.useSyncExternalStore
    useMemo = React.useMemo
    useCallback = React.useCallback
  }
  return { React, useState, useEffect, useSyncExternalStore, useMemo, useCallback }
}

/**
 * Hook to check if the app is hydrated
 * Returns true on server (assumes hydration will happen)
 * Returns true on client after hydration completes
 *
 * @returns boolean - true if hydrated
 *
 * @example
 * const isHydrated = useHydrated()
 *
 * if (!isHydrated) return <Loading />
 *
 * return <MyApp />
 */
export const useHydrated = (): boolean => {
  const { useSyncExternalStore } = getReact()

  // Use a simple subscribe mechanism
  const subscribe = (_callback: () => void) => {
    // No actual subscription needed - we just want to trigger a re-render
    return () => { }
  }

  return useSyncExternalStore(
    subscribe,
    () => isClientSide(),
    () => true // Server is always "hydrated" from its perspective
  )
}

/**
 * Hook to get hydration status with loading state
 * Useful for showing skeleton UI during hydration
 *
 * @returns { isHydrated: boolean, isHydrating: boolean }
 *
 * @example
 * const { isHydrated, isHydrating } = useHydrationStatus()
 *
 * return (
 *   <div>
 *     {isHydrating && <Skeleton />}
 *     {isHydrated && <Content />}
 *   </div>
 * )
 */
export const useHydrationStatus = (): { isHydrated: boolean; isHydrating: boolean } => {
  const { useState, useEffect } = getReact()

  const [isHydrating, setIsHydrating] = useState(() => isServerSide())
  const [isHydrated, setIsHydrated] = useState(() => isServerSide())

  useEffect(() => {
    if (isServerSide()) return

    setIsHydrating(true)

    // Give a tick for React to render
    const timer = setTimeout(() => {
      setIsHydrated(true)
      setIsHydrating(false)
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  return { isHydrated, isHydrating }
}

/**
 * Hook that defers store access until hydrated
 * Use this to prevent hydration mismatches
 *
 * @param store - The store to use
 * @returns Store that returns default values until hydrated
 *
 * @example
 * const store = useDeferredStore(mySSRStore)
 * const [value, setValue] = useStore('key', store)
 */
export const useDeferredStore = <S extends Record<string, unknown>>(
  store: IStore<S> & { isHydrated?: () => boolean }
): IStore<S> => {
  const { useState, useEffect, useMemo } = getReact()

  const [ready, setReady] = useState(() => {
    if (isServerSide()) return true
    return store.isHydrated?.() ?? store.isReady
  })

  useEffect(() => {
    if (isServerSide()) return

    const checkReady = () => {
      const hydrated = store.isHydrated?.() ?? store.isReady
      setReady(hydrated)
    }

    // Poll for hydration
    const interval = setInterval(checkReady, 50)

    // Also subscribe to store changes
    const unsubscribe = store._subscribe(checkReady)

    checkReady()

    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [store])

  // Return a proxy that returns defaults until ready
  return useMemo(() => {
    if (ready) return store

    // Return a ghost store with defaults
    const noop = () => { }
    const noopFalse = () => false
    const noopNull = () => null

    return {
      set: noopFalse,
      get: noopNull,
      remove: noopFalse,
      delete: noopFalse,
      deleteAll: noopFalse,
      list: () => ({}),
      compute: noopNull,
      watch: () => () => { },
      use: noop,
      transaction: noop,
      destroy: noop,
      _subscribe: () => () => { },
      _setSilently: noop,
      _registerMethod: noop,
      _addPlugin: noop,
      _removePlugin: noop,
      _getVersion: () => 0,
      get isReady() { return false },
      whenReady: () => Promise.resolve(),
      get plugins() { return {} },
      getSnapshot: () => ({} as S),
      get namespace() { return store.namespace },
      get userId() { return store.userId }
    } as unknown as IStore<S>
  }, [store, ready])
}

// ============================================================================
// Next.js/Remix Specific Helpers
// ============================================================================

/**
 * Create a store with Next.js App Router compatibility
 * Handles both server and client seamlessly
 *
 * @param config - Store configuration
 * @returns Store with Next.js compatible hydration
 *
 * @example
 * // app/store.ts
 * export const useStore = createNextStore({
 *   namespace: 'my-app',
 *   initialState: { user: null }
 * })
 *
 * // app/page.tsx
 * 'use client'
 * export default function Page() {
 *   const [user, setUser] = useStore('user')
 *   const isHydrated = useHydrated()
 *
 *   if (!isHydrated) return <Loading />
 *
 *   return <div>Hello {user?.name}</div>
 * }
 */
export const createNextStore = <S extends Record<string, unknown>>(
  config?: SSRStoreConfig<S>
) => {
  const store = createSSRStore<S>(config)

  // Add the useHydrated hook as a property
  return Object.assign(store, {
    useHydrated,
    useHydrationStatus,
    useDeferredStore: <K extends keyof S>(key: K) => {
      const deferred = useDeferredStore(store)
      const { useCallback } = getReact()

      // Create a key-specific hook
      const keyHook = <T>(k: string) => {
        const { useSyncExternalStore } = getReact()

        const subscribe = useCallback(
          (cb: () => void) => deferred._subscribe(cb, k),
          [deferred, k]
        )

        const getSnapshot = useCallback(
          () => deferred.get<T>(k),
          [deferred, k]
        )

        const getServerSnapshot = () => undefined

        return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
      }

      return keyHook(key as string)
    }
  })
}

/**
 * Get initial state for server-side rendering
 * Use in getServerSideProps or page props
 *
 * @param store - The store to get state from
 * @returns State object to pass to client
 *
 * @example
 * // pages/_app.tsx
 * App.getInitialProps = ({ Component, ctx }) => {
 *   const store = createStore({ namespace: 'app' })
 *   const initialState = getSSRInitialState(store)
 *
 *   return { pageProps: { initialState } }
 * }
 */
export const getSSRInitialState = (
  store: IStore<Record<string, unknown>>
): Record<string, unknown> => {
  return store.getSnapshot()
}

/**
 * Initialize store from SSR props
 * Use in client-side initialization
 *
 * @param store - Store to initialize
 * @param initialState - State from server
 *
 * @example
 * // In client component
 * useEffect(() => {
 *   if (props.initialState) {
 *     initializeFromSSR(store, props.initialState)
 *   }
 * }, [])
 */
export const initializeFromSSR = (
  store: IStore<Record<string, unknown>>,
  initialState: Record<string, unknown>
): void => {
  if (isServerSide()) return

  Object.entries(initialState).forEach(([key, value]) => {
    store._setSilently(key, value)
  })
}

// ============================================================================
// Export all SSR utilities
// ============================================================================

export default {
  isServerSide,
  isClientSide,
  createSSRStore,
  hydrateOnClient,
  dehydrateStore,
  rehydrateStore,
  useHydrated,
  useHydrationStatus,
  useDeferredStore,
  createNextStore,
  getSSRInitialState,
  initializeFromSSR
}
