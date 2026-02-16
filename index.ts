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
 */
export const gstate = <S extends Record<string, unknown>>(initialState: S, configOrNamespace?: string | StoreConfig<S>) => {
  const config = typeof configOrNamespace === 'string'
    ? { namespace: configOrNamespace }
    : configOrNamespace

  const store = baseCreateStore<S>(config)

  if (initialState) {
    Object.entries(initialState).forEach(([k, v]) => {
      store._setSilently(k, v)
    })
  }

  const magic = (key: string) => baseUseStore(key, store)
  return Object.assign(magic, store) as IStore<S> & ((key: string) => unknown)
}

export { baseCreateStore as createStore }

export {
  useStore,
  useIsStoreReady,
  initState,
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

declare global {
  var createStore: typeof baseCreateStore
  var gstate: <S extends Record<string, unknown>>(initialState: S, configOrNamespace?: string | StoreConfig<S>) => IStore<S> & ((key: string) => unknown)
  var initState: typeof import("./core/hooks").initState
  var destroyState: typeof import("./core/hooks").destroyState
  var gState: IStore<Record<string, unknown>>
  var useStore: typeof baseUseStore
}
