/**
 * Argis (RGS) - React Globo State
 * Simple, secure, scalable state management for React
 *
 * @see https://github.com/dpassariello/rgs
 */

import { createStore as baseCreateStore } from "./core/store"
import { useStore as baseUseStore, getStore } from "./core/hooks"
import * as Security from "./core/security"
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
  const magic = <K extends keyof S>(key: K) => baseUseStore<S[K], S>(key as string, store)

  // Expose as global for debugging purposes in dev environments
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).gState = store;
    (window as unknown as Record<string, unknown>).rgs = store
  }

  return Object.assign(magic, store) as IStore<S> & (<K extends keyof S>(key: K) => readonly [S[K] | undefined, (val: S[K] | ((draft: S[K]) => S[K]), options?: unknown) => boolean])
}

export { baseCreateStore as createStore }

export {
  useStore,
  useIsStoreReady,
  initState,
  getStore,
  destroyState,
  useStore as useGState,
  useStore as useSimpleState
} from "./core/hooks"

export { createAsyncStore } from "./core/async"

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
  sanitizeValue
} from "./core/security"

// Store-aware Wrappers for Global Convenience
/** @deprecated Use store instance methods for better isolation in multi-store scenarios */
export const addAccessRule = (pattern: string | ((key: string, userId?: string) => boolean), perms: Security.Permission[]) => getStore()?.addAccessRule(pattern, perms)
/** @deprecated Use store instance methods for better isolation in multi-store scenarios */
export const hasPermission = (key: string, action: Security.Permission, uid?: string) => getStore()?.hasPermission(key, action, uid) ?? true
/** @deprecated Use store instance methods for better isolation in multi-store scenarios */
export const recordConsent = (uid: string, p: string, g: boolean) => {
  const s = getStore()
  if (!s) throw new Error('[gState] recordConsent failed: No store found. call initState() first.')
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
  if (!s) throw new Error('[gState] exportUserData failed: No store found.')
  return s.exportUserData(uid)
}
/** @deprecated Use store instance methods for better isolation in multi-store scenarios */
export const deleteUserData = (uid: string) => {
  const s = getStore()
  if (!s) throw new Error('[gState] deleteUserData failed: No store found.')
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

/* eslint-disable no-var */
declare global {
  var createStore: typeof baseCreateStore
  var gstate: <S extends Record<string, unknown>>(initialState: S, configOrNamespace?: string | StoreConfig<S>) => IStore<S> & ((key: string) => unknown)
  var initState: typeof import("./core/hooks").initState
  var destroyState: typeof import("./core/hooks").destroyState
  var gState: IStore<Record<string, unknown>>
  var rgs: IStore<Record<string, unknown>>
  var useStore: typeof baseUseStore
}
