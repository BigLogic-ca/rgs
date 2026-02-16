import type { EncryptionKey, AuditEntry, Permission, AccessRule } from './security'

/**
 * Options for persisting state values.
 */
export interface PersistOptions {
  /** Persist the value to the configured storage (default: localStorage). */
  persist?: boolean
  /** @deprecated Use 'encrypted' for AES-256-GCM encryption. 'secure' only applies base64 encoding. */
  secure?: boolean
  /** Base64 encode the value (not encryption, just encoding). Useful for simple obfuscation. */
  encoded?: boolean
  /** AES-256-GCM encryption (REAL security). Requires 'encryptionKey' in store config. */
  encrypted?: boolean
  /** Time-to-live in milliseconds. Value will be automatically removed after this duration. */
  ttl?: number
}

/**
 * Metadata associated with a stored value.
 */
export interface StoreMetadata {
  /** Version number for the stored value */
  version: number
  /** Timestamp of last update */
  lastUpdated: number
}

/**
 * Subscriber callback for store changes.
 */
export type StoreSubscriber = () => void

/**
 * Middleware function for intercepting store changes.
 */
export type Middleware<T = unknown> = (key: string, value: T, meta: StoreMetadata) => void

/**
 * Function to update state immutably (used with Immer).
 */
export type StateUpdater<T> = (draft: T) => void | T

/**
 * Selector function for computed values.
 * @param get - Function to retrieve other store values
 * @returns Computed value
 */
export type ComputedSelector<T> = (get: <V>(key: string) => V | null) => T

/**
 * Callback for watching value changes.
 */
export type WatcherCallback<T> = (value: T | null) => void

// --- Plugin System ---

/**
 * Type-safe plugin method definition.
 * Use this to define typed methods for your plugin.
 * @template T - The return type of the method
 */
export interface PluginMethod<T = unknown> {
  (...args: unknown[]): T
}

/**
 * Plugin methods container - use to define type-safe plugin APIs.
 * @template T - Object containing plugin methods
 */
export type PluginMethods<T extends Record<string, PluginMethod>> = T

/**
 * Available plugin lifecycle hooks.
 */
export type PluginHookName =
  | 'onInit'
  | 'onInstall'
  | 'onSet'
  | 'onGet'
  | 'onRemove'
  | 'onDestroy'
  | 'onTransaction'
  | 'onBeforeSet'
  | 'onAfterSet'

/**
 * Context passed to plugin hooks.
 */
export interface PluginContext<S extends Record<string, unknown> = Record<string, unknown>> {
  /** Store instance */
  store: IStore<S>
  /** Key being accessed (if applicable) */
  key?: string
  /** Value being set (if applicable) */
  value?: unknown
  /** Version number */
  version?: number
}

/**
 * Plugin interface for extending store functionality.
 */
export interface IPlugin<S extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique plugin name */
  name: string
  /** Lifecycle hooks */
  hooks: {
    [K in PluginHookName]?: (context: PluginContext<S>) => void | Promise<void>
  }
}

/**
 * Helper to create a type-safe plugin with typed methods.
 * @example
 * ```typescript
 * const myPlugin = createTypedPlugin('myPlugin', {
 *   increment: () => 1,
 *   getValue: () => 42
 * })
 * ```
 */
export const createTypedPlugin = <T extends Record<string, PluginMethod>>(
  name: string,
  methods: T
): IPlugin & { methods: T } => ({
  name,
  hooks: {},
  methods
})

// --- Main Interface ---

/**
 * Main store interface with full type safety.
 * @template S - State schema type
 */
export interface IStore<S extends Record<string, unknown> = Record<string, unknown>> {
  // Type-safe setters/getters for known keys
  set<K extends keyof S>(key: K, valOrUp: S[K] | StateUpdater<S[K]>, options?: PersistOptions): boolean
  get<K extends keyof S>(key: K): S[K] | null

  // Dynamic key access
  set<T = unknown>(key: string, valOrUp: T | StateUpdater<T>, options?: PersistOptions): boolean
  get<T = unknown>(key: string): T | null

  compute<T = unknown>(key: string, selector: ComputedSelector<T>): T
  watch<K extends keyof S>(key: K, callback: WatcherCallback<S[K]>): () => void
  watch<T = unknown>(key: string, callback: WatcherCallback<T>): () => void

  remove(key: keyof S | string): boolean
  delete(key: keyof S | string): boolean
  deleteAll(): boolean

  list(): Record<string, unknown>
  use(m: Middleware): void
  transaction(fn: () => void): void
  destroy(): void

  // Public, Type-Safe Plugin Management
  _addPlugin(plugin: IPlugin<S>): void
  _removePlugin(name: string): void

  // Internal Core Operations
  _subscribe(cb: StoreSubscriber, key?: string): () => void
  _getVersion(key: string): number
  _setSilently(key: string, value: unknown): void
  _registerMethod(name: string, fn: (...args: unknown[]) => unknown): void
  /**
   * Registers a method from a specific plugin.
   * @param pluginName - Name of the plugin
   * @param methodName - Method name
   * @param fn - Method function
   */
  _registerMethod(pluginName: string, methodName: string, fn: (...args: unknown[]) => unknown): void

  // Security & Compliance (Enterprise)
  addAccessRule(pattern: string | ((key: string, userId?: string) => boolean), permissions: Permission[]): void
  hasPermission(key: string, action: Permission, userId?: string): boolean
  recordConsent(userId: string, purpose: string, granted: boolean): import('./security').ConsentRecord
  hasConsent(userId: string, purpose: string): boolean
  getConsents(userId: string): import('./security').ConsentRecord[]
  revokeConsent(userId: string, purpose: string): import('./security').ConsentRecord | null
  exportUserData(userId: string): { userId: string, exportedAt: number, consents: import('./security').ConsentRecord[] }
  deleteUserData(userId: string): { success: boolean, deletedConsents: number }

  /** True if the store has finished hydration from storage. */
  readonly isReady: boolean
  /** Returns a promise that resolves when hydration is complete. */
  whenReady(): Promise<void>
  /**
   * Plugin methods namespace.
   * Access methods registered by plugins: store.plugins.immer.setWithProduce(...)
   */
  readonly plugins: GStatePlugins
}

/**
 * Global registry for plugin methods.
 * Can be augmented by official or custom plugins.
 */
export interface GStatePlugins {
  security: {
    addAccessRule: (pattern: string | ((key: string, userId?: string) => boolean), permissions: Permission[]) => void
    recordConsent: (userId: string, purpose: string, granted: boolean) => import('./security').ConsentRecord
    hasConsent: (userId: string, purpose: string) => boolean
    getConsents: (userId: string) => import('./security').ConsentRecord[]
    revokeConsent: (userId: string, purpose: string) => import('./security').ConsentRecord | null
    exportUserData: (userId: string) => { userId: string, exportedAt: number, consents: import('./security').ConsentRecord[] }
    deleteUserData: (userId: string) => { success: boolean, deletedConsents: number }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: Record<string, (...args: any[]) => any>
}

/**
 * Configuration options for creating a store.
 */
export interface StoreConfig<S extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique namespace for this store. Used as a prefix in storage (default: 'gstate'). */
  namespace?: string
  /** Schema version. Used for migrations. Increment this when changing data structure. */
  version?: number
  /** If true, suppresses warnings and error logs in the console. */
  silent?: boolean
  /** Milliseconds to wait before flushing changes to disk (default: 150ms). */
  debounceTime?: number
  /** Storage adapter (default: window.localStorage). */
  storage?: CustomStorage | Storage
  /** Migration function called when the saved version is lower than the current version. */
  migrate?: (oldState: Record<string, unknown>, oldVersion: number) => S
  /** Persist all keys to storage by default (default: false). Can be overridden per-key. */
  persistByDefault?: boolean
  /** Alias for persistByDefault for backwards compatibility. */
  persistence?: boolean
  /** @deprecated Use persistByDefault instead. */
  persist?: boolean
  /** Callback for error handling (hydration failures, plugin crashes, etc.). */
  onError?: (error: Error, context: { operation: string; key?: string }) => void
  /** Warn if object size exceeds this limit (in bytes, default: 5MB). 0 to disable. */
  maxObjectSize?: number
  /** Enterprise: Warn if total store size exceeds this limit (in bytes, default: 50MB). 0 to disable. */
  maxTotalSize?: number
  /** Enterprise: AES-256-GCM encryption key and IV. Use generateEncryptionKey() to create one. */
  encryptionKey?: EncryptionKey
  /** Enterprise: Enable audit logging for all store interactions. */
  auditEnabled?: boolean
  /** Enterprise: Current user ID for audit log tracking. */
  userId?: string
  /** Enterprise: Enable strict input validation for keys and values (XSS prevention). */
  validateInput?: boolean
  /** Base64 encode all persisted values by default. Can be overridden per-key. */
  encoded?: boolean
  /** Enterprise: Access control rules patterns. Can be regex strings or dynamic functions. */
  accessRules?: Array<{ pattern: string | ((key: string, userId?: string) => boolean); permissions: Permission[] }>
  /** Enable Immer for immutable updates (default: true). Set to false for better performance with frequent updates. */
  immer?: boolean
}

/**
 * Custom storage interface for alternative storage backends.
 */
export interface CustomStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  key(index: number): string | null
  length: number
}

/**
 * State for async operations.
 */
export interface AsyncState<T> {
  /** Resolved data */
  data: T | null
  /** Loading state */
  loading: boolean
  /** Error if operation failed */
  error: Error | null
  /** Timestamp of last update */
  updatedAt: number | null
}

// Re-export security types
export type { EncryptionKey, AuditEntry, Permission, AccessRule }
