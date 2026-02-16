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

  // Check if we're in browser and have a namespace for persistence
  let stateToUse = initialState
  const namespace = config?.namespace
  if (typeof window !== 'undefined' && namespace) {
    try {
      const saved = localStorage.getItem(namespace)
      if (saved) {
        // Decode from base64
        stateToUse = JSON.parse(atob(saved)) as S
      }
    } catch (_e) {
      // Ignore errors, use initialState
    }
  }

  const store = baseCreateStore<S>(config)

  if (stateToUse) {
    Object.entries(stateToUse).forEach(([k, v]) => {
      store._setSilently(k, v)
    })
  }

  // Auto-save to localStorage when persist: true
  // Only saves non-sensitive fields and uses base64 encoding
  const configAny = config as Record<string, unknown> | undefined

  if (typeof window !== 'undefined' && configAny?.persist && namespace) {
    store._subscribe(() => {
      try {
        const state: Record<string, unknown> = {}
        const list = store.list()
        Object.keys(list).forEach(k => {
          // Skip sensitive fields
          const lowerKey = k.toLowerCase()
          if (lowerKey.includes('token') || lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('key')) {
            return
          }
          state[k] = store.get(k)
        })
        // Encode to base64 for security
        localStorage.setItem(namespace, btoa(JSON.stringify(state)))
      } catch (_e) {
        // Ignore save errors
      }
    })
  }

  // Magic function that returns typed hook when called with a key
  const magic = <K extends keyof S>(key: K) => baseUseStore<S[K], S>(key as string, store)

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

declare global {
  var createStore: typeof baseCreateStore
  var gstate: <S extends Record<string, unknown>>(initialState: S, configOrNamespace?: string | StoreConfig<S>) => IStore<S> & ((key: string) => unknown)
  var initState: typeof import("./core/hooks").initState
  var destroyState: typeof import("./core/hooks").destroyState
  var gState: IStore<Record<string, unknown>>
  var useStore: typeof baseUseStore
}
