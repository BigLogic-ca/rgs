/**
 * Argis (RGS) - Reactive Global State
 * Simple, secure, scalable state management for React
 *
 * @see https://github.com/@biglogic/rgs
 */

import { createStore as baseCreateStore } from "./core/store"
import { useStore as baseUseStore, getStore } from "./core/hooks"
import * as Security from "./core/security"
import { isDevelopment } from "./core/env"
import type { IStore, StoreConfig } from "./core/types"

// ============================================================================
// Core API - The Magnetar Way
// ============================================================================

/**
 * Creates a reactive store with a built-in hook.
 * This is the primary entry point for RGS - "The Magnetar Way".
 *
 * @param initialState - Initial state object
 * @param configOrNamespace - String for namespace (enables persistence) or full StoreConfig
 */
export const gstate = <S extends Record<string, unknown>>(
  initialState: S,
  configOrNamespace?: string | StoreConfig<S>
) => {
  const config = typeof configOrNamespace === 'string'
    ? { namespace: configOrNamespace }
    : configOrNamespace

  // Initialize core store
  const store = baseCreateStore<S>(config)

  // Initialize state if store is empty or needs defaults
  if (initialState) {
    Object.entries(initialState).forEach(([k, v]) => {
      // Only set if not already hydrated/loaded from storage
      if (store.get(k) === null) {
        store._setSilently(k, v)
      }
    })
  }

  // Magic function that returns a typed hook when called with a key
  // Also supports no-arg call for subscribing to ANY change (legacy compatibility)
  // @ts-ignore - complex type overload
  const magic = (key?: string) => {
    // No key provided - return a subscription hook for legacy compatibility
    if (key === undefined) {
      // Return useStoreSubscribe for subscribing to any change
      // We need to use the 'ghost' store pattern from useStore and subscribe to all changes
      const storeRef = { current: store }
      const subscribe = (callback: () => void) => storeRef.current._subscribe(callback)
      const getSnapshot = () => true
      const getServerSnapshot = () => true

      // Use useSyncExternalStore to subscribe to any change
      // This must be called inside a React component
      // @ts-ignore - React hook
      const { useSyncExternalStore } = require('react')
      useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
      return [true, store.set.bind(store)] as const
    }
    // Key provided - return the typed hook
    return baseUseStore(key, store)
  }

  // Expose as global for debugging purposes ONLY in dev environments
  // We use multiple checks to catch common bundler environments (Vite, Webpack, etc.)
  if (typeof window !== 'undefined' && isDevelopment()) {
    (window as unknown as Record<string, unknown>).gstate = store;
    (window as unknown as Record<string, unknown>).gState = store; // Backward compatibility
    (window as unknown as Record<string, unknown>).rgs = store
  }

  // Return mixed type: callable with or without key
  // @ts-ignore - complex type that works at runtime
  return Object.assign(magic, store)
}

export { baseCreateStore as createStore }

export {
  useStore,
  useIsStoreReady,
  initState,
  getStore,
  destroyState,
  useStore as useGState,
  useStore as useSimpleState,
  useStoreSubscribe
} from "./core/hooks"

export { createAsyncStore } from "./core/async"

// ============================================================================
// SSR Support (Next.js, Remix)
// ============================================================================

export {
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
} from "./core/ssr"

export type { SSRStoreConfig } from "./core/ssr"

// ============================================================================
// Thunk Middleware (Async Actions)
// ============================================================================

export {
  createThunkStore,
  createActions,
  createAsyncAction,
  createAsyncActions,
  createSaga,
  runSaga,
  call,
  put,
  select,
  take,
  all,
  race
} from "./core/thunk"

export type { ThunkAction, ThunkDispatch, ThunkActionPayload, Effect } from "./core/thunk"

// ============================================================================
// Local-First Sync Engine
// ============================================================================

export { SyncEngine, createSyncEngine } from "./core/sync"
export type {
  SyncConfig,
  SyncState,
  SyncResult,
  SyncStrategy,
  ConflictInfo,
  ConflictResolution
} from "./core/sync"

export { initSync, destroySync, useSyncedState, useSyncStatus, triggerSync } from "./core/hooks"

// ============================================================================
// Plugins
// ============================================================================

export * from "./plugins/index"

// ============================================================================
// Security & Compliance (Unified)
// ============================================================================

// Stateless Utilities
export {
  generateEncryptionKey,
  exportKey,
  importKey,
  isCryptoAvailable,
  setAuditLogger,
  logAudit,
  validateKey,
  sanitizeValue,
  deriveKeyFromPassword,
  generateSalt
} from "./core/security"

// Store-aware Wrappers for Global Convenience
/** @deprecated Use store instance methods for better isolation in multi-store scenarios */
export const addAccessRule = (pattern: string | ((key: string, userId?: string) => boolean), perms: Security.Permission[]) => getStore()?.addAccessRule(pattern, perms)
/** @deprecated Use store instance methods for better isolation in multi-store scenarios */
export const hasPermission = (key: string, action: Security.Permission, uid?: string) => getStore()?.hasPermission(key, action, uid) ?? true
/** @deprecated Use store instance methods for better isolation in multi-store scenarios */
export const recordConsent = (uid: string, p: string, g: boolean) => {
  const s = getStore()
  if (!s) throw new Error('[gstate] recordConsent failed: No store found. call initState() first.')
  return s.recordConsent(uid, p, g)
}
/** @deprecated Use store instance methods for better isolation in multi-store scenarios */
export const hasConsent = (uid: string, p: string) => getStore()?.hasConsent(uid, p) ?? false
/** @deprecated Use store instance methods for better isolation in multi-store scenarios */
export const getConsents = (uid: string) => getStore()?.getConsents(uid) ?? []
/** @deprecated Use store instance methods for better isolation in multi-store scenarios */
export const revokeConsent = (uid: string, p: string) => getStore()?.revokeConsent(uid, p)
/** @deprecated Use store instance methods for better isolation in multi-store scenarios */
export const exportUserData = (uid: string) => {
  const s = getStore()
  if (!s) throw new Error('[gstate] exportUserData failed: No store found.')
  return s.exportUserData(uid)
}
/** @deprecated Use store instance methods for better isolation in multi-store scenarios */
export const deleteUserData = (uid: string) => {
  const s = getStore()
  if (!s) throw new Error('[gstate] deleteUserData failed: No store found.')
  return s.deleteUserData(uid)
}

// Legacy cleanup helpers (now handled by destroyState / destroy())
/** @deprecated Logic now tied to store lifecycle. Use destroyState() or store.destroy() */
export const clearAccessRules = () => { /* No-op globally */ }
/** @deprecated Logic now tied to store lifecycle. Use destroyState() or store.destroy() */
export const clearAllConsents = () => { /* No-op globally */ }

export type { EncryptionKey, AuditEntry, Permission, AccessRule, ConsentRecord } from "./core/security"

// ============================================================================
// Types
// ============================================================================

export type {
  IStore,
  StoreConfig,
  PersistOptions,
  StateUpdater,
  ComputedSelector,
  WatcherCallback
} from "./core/types"

// ============================================================================
// Global Augmentation
// ============================================================================

declare global {
  var createStore: typeof baseCreateStore
  var gstate: <S extends Record<string, unknown>>(initialState: S, configOrNamespace?: string | StoreConfig<S>) => IStore<S> & ((key: string) => unknown)
  var initState: typeof import("./core/hooks").initState
  var destroyState: typeof import("./core/hooks").destroyState
  var gState: IStore<Record<string, unknown>>  // Backward compatibility alias
  var rgs: IStore<Record<string, unknown>>
  var useStore: typeof baseUseStore
}
