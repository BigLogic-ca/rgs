/**
 * Argis (RGS) - React Globo State - Advanced API
 * Expert-level state management utilities
 */

import { createStore, StorageAdapters } from "./core/store"
import type { IStore, StoreConfig, PersistOptions, CustomStorage } from "./core/types"
import * as Security from "./core/security"

/**
 * Creates a store with custom storage adapter.
 * @param storage Custom storage implementation
 * @param config Store configuration
 * @returns IStore instance
 */
export const createStoreWithStorage = <S extends Record<string, unknown>>(
  storage: CustomStorage,
  config?: StoreConfig<S>
): IStore<S> => {
  return createStore<S>({ ...config, storage })
}

/**
 * Creates an in-memory store (no persistence).
 * Useful for temporary state or testing.
 * @param config Store configuration
 * @returns IStore instance
 */
export const createMemoryStore = <S extends Record<string, unknown>>(
  config?: StoreConfig<S>
): IStore<S> => {
  return createStore<S>({
    ...config,
    storage: StorageAdapters.memory()
  })
}

/**
 * Creates a session store (persists until tab closes).
 * @param config Store configuration
 * @returns IStore instance
 */
export const createSessionStore = <S extends Record<string, unknown>>(
  config?: StoreConfig<S>
): IStore<S> | null => {
  const sessionStorage = StorageAdapters.session()
  if (!sessionStorage) return null
  return createStore<S>({
    ...config,
    storage: sessionStorage
  })
}

// Re-export everything from main entry
export {
  createStore,
  StorageAdapters,
  Security
}

export type {
  IStore,
  StoreConfig,
  PersistOptions,
  CustomStorage
}

// Advanced Security Exports
// Note: clearAccessRules and clearAllConsents removed - logic is now per-store
// Use store.destroy() to clean up

export type {
  EncryptionKey,
  AuditEntry,
  Permission,
  AccessRule,
  ConsentRecord
} from "./core/security"
