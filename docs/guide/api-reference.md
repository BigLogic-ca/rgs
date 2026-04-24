# API Reference

Complete reference for all RGS hooks and functions.

## Hooks

### `useStore<T>(key: string, options?: StoreOptions): [T, (value: T) => void]`

Primary hook for reading and writing state.

**Parameters:**
- `key` (string): State key to subscribe to
- `options` (StoreOptions, optional):
  - `namespace` (string): Custom namespace
  - `selector` (function): Transform state before returning
  - `equalityFn` (function): Custom equality comparison

**Returns:** Tuple of `[currentValue, setterFunction]`

**Example:**
```typescript
// Basic usage
const [value, setValue] = useStore<T>('key')

// With options
const [value, setValue] = useStore<T>('key', {
  namespace: 'my-app',       // Custom namespace
  selector: (state) => state, // Transform state
  equalityFn: (a, b) => a === b // Custom equality check
})
```

### `useComputed<T>(keys: string[], computeFn: (...args) => T): T`

Hook for computed values derived from multiple state keys.

**Parameters:**
- `keys` (string[]): State keys to watch
- `computeFn` (function): Function to compute derived value

**Returns:** Computed value

**Example:**
```typescript
const total = useComputed(
  ['price', 'quantity'],
  (price, quantity) => price * quantity
)
```

### `useSelector<T>(selector: (state) => T): T`

Hook for selecting and transforming state.

**Parameters:**
- `selector` (function): Selector function

**Returns:** Selected value

**Example:**
```typescript
const userName = useSelector((state) => state.user?.name ?? 'Guest')
```

## Store Functions

### `getState<T>(key: string, options?: GetOptions): T`

Read state without subscribing to changes.

**Parameters:**
- `key` (string): State key
- `options` (GetOptions, optional):
  - `namespace` (string): Custom namespace

**Returns:** Current state value

**Example:**
```typescript
const currentUser = getState<User>('user')
const theme = getState<string>('settings.theme', { namespace: 'prefs' })
```

### `setState<T>(key: string, value: T, options?: SetOptions): void`

Update state without using hook.

**Parameters:**
- `key` (string): State key
- `value` (T): New value
- `options` (SetOptions, optional):
  - `namespace` (string): Custom namespace

**Example:**
```typescript
setState('counter', 100)
setState('user', { name: 'Alice' }, { namespace: 'auth' })

// With transaction for batch updates
transaction(() => {
  setState('a', 1)
  setState('b', 2)
  setState('c', 3)
})
```

### `watch(key: string | string[], callback: (value, oldValue?) => void): () => void`

Subscribe to state changes.

**Parameters:**
- `key` (string | string[]): Key(s) to watch
- `callback` (function): Called when state changes

**Returns:** Unsubscribe function

**Example:**
```typescript
const unwatch = watch('counter', (newVal, oldVal) => {
  console.log(`Changed from ${oldVal} to ${newVal}`)
})

// Later...
unwatch()
```

### `computed(baseKey: string, computeFn: (value) => any): void`

Create a computed value that auto-updates.

**Parameters:**
- `baseKey` (string): Base state key
- `computeFn` (function): Computation function

**Example:**
```typescript
computed('price', (price) => price * 1.2) // Add tax
computed('items', (items) => items.filter(i => i.active)) // Active items
```

### `transaction(fn: () => void): void`

Execute multiple state updates as a single atomic operation.

**Parameters:**
- `fn` (function): Function containing state updates

**Example:**
```typescript
transaction(() => {
  setState('user', { name: 'Bob', role: 'admin' })
  setState('permissions', ['read', 'write', 'delete'])
  setState('lastLogin', Date.now())
})
// Components re-render once after transaction completes
```

## Utility Functions

### `initState(initialState?, config?): Store`

Initialize the store with optional initial state and configuration.

### `persist(key: string, storage?): void`

Manually persist state to storage.

### `hydrate(key: string, storage?): void`

Manually hydrate state from storage.

### `destroy(key: string): void`

Remove a key from state.

### `clearNamespace(namespace: string): void`

Clear all state in a namespace.

## TypeScript Generics

All hooks and functions support TypeScript generics for type safety:

```typescript
// Typed useStore
const [counter, setCounter] = useStore<number>('counter')
const [user, setUser] = useStore<User>('user')

// Typed getState
const user = getState<User>('user')

// Typed computed
const doubled = computed('counter', (count: number) => count * 2)
```

## Next Steps

- [Advanced Usage](advanced-usage.md) - Transactions, plugins, persistence
- [Security Features](security-features.md) - Enterprise security
- [Testing](testing.md) - Testing strategies
