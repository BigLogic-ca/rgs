# 📚 API Reference

Complete API reference for RGS (Argis) - Reactive Global State.

---

## Core Functions

### `gstate`

Creates a reactive store with a built-in typed hook in one line.

```typescript
function gstate<S extends Record<string, unknown>>(
  initialState: S,
  configOrNamespace?: string | StoreConfig<S>
): (<K extends keyof S>(
  key: K
) => readonly [
  S[K] | undefined,
  (val: S[K] | StateUpdater<S[K]>, options?: PersistOptions) => boolean
]) & IStore<S>
```

**Parameters:**
- `initialState` - Initial state object
- `configOrNamespace` - Optional namespace string or full StoreConfig

**Returns:** A callable function that returns typed hooks when called with a key, plus the full store interface.

**Example:**
```typescript
const useCounter = gstate({ count: 0, name: 'John' })

// Get typed hook for specific key
const [count, setCount] = useCounter('count')
const [name, setName] = useCounter('name')

// Or use store methods directly
useCounter.set('count', 5)
useCounter.get('count')
```

---

### `initState`

Initializes a global store instance.

```typescript
function initState<S extends Record<string, unknown>>(
  config?: StoreConfig<S>
): IStore<S>
```

**Parameters:**
- `config` - Optional store configuration

**Returns:** `IStore<S>`

**Example:**
```typescript
const store = initState({
  namespace: 'myApp',
  version: 1,
  persistByDefault: true,
  onError: (error, context) => {
    console.error(`Error in ${context.operation}:`, error.message)
  }
})
```

---

### `useStore`

React hook for reactive state.

```typescript
function useStore<T = unknown, S extends Record<string, unknown> = Record<string, unknown>>(
  key: string,
  store?: IStore<S>
): readonly [T | undefined, (val: T | StateUpdater<T>, options?: PersistOptions) => boolean]
```

**Parameters:**
- `key` - State key to subscribe to
- `store` - Optional store instance

**Returns:** Tuple of `[value, setter]`

---

### `createStore`

Creates a new store instance.

```typescript
function createStore<S extends Record<string, unknown>>(
  config?: StoreConfig<S>
): IStore<S>
```

---

### `getStore`

Retrieves the currently active default store instance. Useful for accessing the store outside of React components or in utility functions.

```typescript
function getStore(): IStore<Record<string, unknown>> | null
```

**Returns:** The active `IStore` or `null` if no store was initialized via `initState`.

---

### `getStoreByNamespace`

Retrieves a store by its namespace.

```typescript
function getStoreByNamespace(namespace: string): IStore<Record<string, unknown>> | null
```

**Returns:** The `IStore` for the given namespace or `null`.

---

### `registerStore`

Registers a store in the global registry for HMR cleanup. Used internally by `gstate()`.

```typescript
function registerStore(namespace: string, store: IStore<Record<string, unknown>>): void
```

---

### `unregisterStore`

Unregisters a store from the global registry.

```typescript
function unregisterStore(namespace: string): void
```

---

### `destroyState`

Destroys a store by namespace. Safe to call multiple times.

```typescript
function destroyState(namespace?: string): void
```

**Parameters:**
- `namespace` - Optional namespace to destroy. If not provided, destroys the default store.

---

### `destroyAllStores`

Destroys all registered stores. Useful for HMR, testing, and micro-frontend teardown.

```typescript
function destroyAllStores(): void
```

---

## Store Interface (`IStore`)

### State Operations

#### `set`

Sets a value in the store.

```typescript
store.set<T>(key: string, value: T | StateUpdater<T>, options?: PersistOptions): boolean
```

#### `get`

Gets a value from the store.

```typescript
store.get<T>(key: string): T | null
```

#### `remove` / `delete`

Removes a value from the store.

```typescript
store.remove(key: string): boolean
store.delete(key: string): boolean
```

#### `deleteAll`

Removes all values from the store.

```typescript
store.deleteAll(): void
```

#### `list`

Returns all key-value pairs.

```typescript
store.list(): Record<string, unknown>
```

---

### Metadata Properties

#### `namespace`

The unique namespace of the store (read-only).

```typescript
store.namespace: string
```

#### `userId`

The current user ID associated with the store for RBAC and audit logs (read-only).

```typescript
store.userId?: string
```

---

### Computed Values

#### `compute`

Creates or retrieves a computed (derived) value.

```typescript
store.compute<T>(key: string, selector: ComputedSelector<T>): T
```

**Example:**
```typescript
const fullName = store.compute('fullName', (get) => {
  const first = get<string>('firstName')
  const last = get<string>('lastName')
  return `${first} ${last}`
})
```

> **Note:** RGS supports **nested computed dependencies**. A computed value can reactively depend on other computed values in the same store.

---

### Watching Changes

#### `watch`

Watches for changes on a specific key.

```typescript
store.watch<T>(key: string, callback: WatcherCallback<T>): () => void
```

**Returns:** Unsubscribe function

---

### Transactions

#### `transaction`

Groups multiple operations into a single transaction.

```typescript
store.transaction(fn: () => void): void
```

---

### Middleware

#### `use`

Adds a middleware function.

```typescript
store.use(middleware: Middleware): void
```

---

### Lifecycle

#### `destroy`

Destroys the store and cleans up resources.

```typescript
store.destroy(): void
```

---

## Plugin API

### `_addPlugin`

Adds a plugin to the store.

```typescript
store._addPlugin(plugin: IPlugin): void
```

### `_removePlugin`

Removes a plugin from the store.

```typescript
store._removePlugin(name: string): void
```

### `_registerMethod`

Registers a custom method on the store.

```typescript
// New signature (recommended)
store._registerMethod(pluginName: string, methodName: string, fn: (...args) => unknown): void
```

---

## Plugins Property

Access plugin methods via `store.plugins`:

```typescript
store.plugins.undoRedo.undo()
store.plugins.undoRedo.redo()
store.plugins.counter.increment()
store.plugins.cloudSync.sync()
store.plugins.cloudSync.getStats()
```

---

## Configuration (`StoreConfig`)

```typescript
interface StoreConfig<S> {
  /** Unique namespace for this store */
  namespace?: string
  /** Schema version */
  version?: number
  /** Suppress console warnings */
  silent?: boolean
  /** Debounce time for disk flush (default: 150ms) */
  debounceTime?: number
  /** Custom storage adapter */
  storage?: CustomStorage | Storage
  /** Migration function */
  migrate?: (oldState: Record<string, unknown>, oldVersion: number) => S
  /** Error handler */
  onError?: (error: Error, context: { operation: string; key?: string }) => void
  /** Max object size in bytes (default: 5MB) */
  maxObjectSize?: number
  /** Max total store size in bytes (default: 50MB) */
  maxTotalSize?: number
  /** AES-256-GCM encryption key */
  encryptionKey?: EncryptionKey
  /** Enable audit logging */
  auditEnabled?: boolean
  /** Current user ID for audit */
  userId?: string
  /** Enable input validation */
  validateInput?: boolean
  /** Access control rules */
  accessRules?: Array<{
    pattern: string | ((key: string, userId?: string) => boolean)
    permissions: Permission[]
  }>
  /** Enable Immer (default: true) */
  immer?: boolean
}
```

---

## Persistence Options (`PersistOptions`)

```typescript
interface PersistOptions {
  /** Persist to storage (default: localStorage) */
  persist?: boolean
  /** Base64 encode the value */
  encoded?: boolean
  /** AES-256-GCM encryption */
  encrypted?: boolean
  /** Time-to-live in milliseconds */
  ttl?: number
}
```

---

## Types

### `StateUpdater`

```typescript
type StateUpdater<T> = (draft: T) => void | T
```

### `ComputedSelector`

```typescript
type ComputedSelector<T> = (get: <V>(key: string) => V | null) => T
```

### `WatcherCallback`

```typescript
type WatcherCallback<T> = (value: T | null) => void
```

### `Middleware`

```typescript
type Middleware<T = unknown> = (key: string, value: T, meta: StoreMetadata) => void
```

---

## Security Types

### `Permission`

```typescript
type Permission = 'read' | 'write' | 'delete' | 'admin'
```

### `AccessRule`

```typescript
interface AccessRule {
  pattern: string | ((key: string, userId?: string) => boolean)
  permissions: Permission[]
}
```

---

## Plugin Hooks

| Hook | Description |
|------|-------------|
| `onInit` | Called when plugin is first initialized |
| `onInstall` | Called when plugin is added to store |
| `onBeforeSet` | Called before a value is set |
| `onSet` | Called after a value is set |
| `onGet` | Called when a value is retrieved |
| `onRemove` | Called when a value is removed |
| `onDestroy` | Called when store is destroyed |
| `onTransaction` | Called during a transaction |

---

## SSR Hooks

### `useHydrated`

Returns `true` when the app is hydrated on the client.

```typescript
function useHydrated(): boolean
```

### `useHydrationStatus`

Returns detailed hydration status.

```typescript
function useHydrationStatus(): { isHydrated: boolean; isHydrating: boolean }
```

### `useDeferredStore`

Returns a store proxy that returns defaults until hydrated.

```typescript
function useDeferredStore<S>(store: IStore<S> & { isHydrated?: () => boolean }): IStore<S>
```

### `createSSRStore`

Creates an SSR-safe store with hydration methods.

```typescript
function createSSRStore<S>(config?: SSRStoreConfig<S>): IStore<S> & {
  hydrate: () => Promise<void>
  getSerializedState: () => string | null
  isHydrated: () => boolean
}
```

### `createNextStore`

Creates a Next.js App Router compatible store.

```typescript
function createNextStore<S>(config?: SSRStoreConfig<S>)
```

---

## Sync API

### `initSync`

Initializes the sync engine for a store.

```typescript
function initSync(
  store: IStore<Record<string, unknown>>,
  config: SyncConfig
): SyncEngine<Record<string, unknown>>
```

### `destroySync`

Destroys the sync engine for a namespace.

```typescript
function destroySync(namespace: string): void
```

### `useSyncedState`

Hook for offline-first synchronized state.

```typescript
function useSyncedState<T>(
  key: string,
  store?: IStore<Record<string, unknown>>
): readonly [
  T | undefined,
  (val: T | StateUpdater<T>, options?: PersistOptions) => boolean,
  SyncState
]
```

### `useSyncStatus`

Hook for global sync status.

```typescript
function useSyncStatus(): SyncState
```

### `triggerSync`

Manually triggers sync for a namespace.

```typescript
function triggerSync(namespace?: string): Promise<void>
```

---

## Changelog (v3.9.20)

### New APIs
- `registerStore()` / `unregisterStore()` - Store registry management
- `getStoreByNamespace()` - Get store by namespace
- `destroyAllStores()` - Destroy all registered stores
- `destroyState(namespace?)` - Destroy store by namespace

### Improvements
- `gstate()` now auto-registers stores for HMR cleanup
- `isEqual()` now supports Date, Map, Set, RegExp, TypedArray, ArrayBuffer
- `getServerSnapshot()` uses safe Proxy for SSR selectors
- `initState()` warnings only shown in development mode
- `useSyncedState()` warns if `initSync()` not called
- `safeBtoa()` / `safeAtob()` for SSR Node.js compatibility
