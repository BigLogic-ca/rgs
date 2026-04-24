# Core Concepts

Understanding these core concepts will help you effectively use RGS in your applications.

## Store Initialization

The `initState()` function creates a new store instance with optional initial state.

### Basic Initialization

```typescript
import { initState, StoreContext } from '@biglogic/rgs'

// Basic initialization
const store = initState({
  key: 'value'
})
```

### Initialization with Configuration

```typescript
const store = initState(
  { user: null, theme: 'light' },
  {
    namespace: 'my-app',      // Namespace for persistence
    storage: localStorage,    // Storage adapter
    encrypt: true,            // Enable encryption
    encryptionKey: keyData    // Encryption key (see Security section)
  }
)
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `namespace` | `string` | Isolates state in a namespace |
| `storage` | `StorageAdapter` | Storage backend (localStorage, sessionStorage, custom) |
| `encrypt` | `boolean` | Enable AES-256-GCM encryption |
| `encryptionKey` | `EncryptionKey` | Key for encryption (see Security) |
| `persist` | `boolean` | Enable automatic persistence |
| `hydrate` | `boolean` | Auto-hydrate on initialization |
| `maxObjectSize` | `number` | Max object size in bytes (0 = unlimited) |

## Reactive State

State in RGS is reactive - components automatically re-render when subscribed state changes.

### How Reactivity Works

1. **Subscription**: When a component uses `useStore('key')`, it subscribes to that key
2. **Update**: When state changes via `setState('key', value)`, all subscribers are notified
3. **Re-render**: Subscribed components re-render with the new value

```typescript
import { watch } from '@biglogic/rgs'

// Subscribe to state changes
const unsubscribe = watch('counter', (newValue, oldValue) => {
  console.log(`Counter changed: ${oldValue} -> ${newValue}`)
})

// Watch multiple keys
watch(['user', 'settings'], (changes) => {
  console.log('State changed:', changes)
})

// Stop watching
unsubscribe()
```

## Namespaces

Namespaces allow you to isolate state for different parts of your application or different users.

### Creating Namespaced State

```typescript
// Initialize with namespace
initState({ theme: 'dark' }, { namespace: 'user-preferences' })

// Access namespaced state
const [theme] = useStore('theme', { namespace: 'user-preferences' })
```

### Use Cases for Namespaces

- **User preferences**: Isolate each user's settings
- **Multi-tenant apps**: Separate state per tenant
- **Feature flags**: Group feature-specific state
- **Temporary state**: Separate ephemeral from persistent state

```typescript
// Example: Multi-user scenario
initState({ theme: 'light' }, { namespace: `user-${userId}` })

// Later...
const [theme] = useStore('theme', { namespace: `user-${userId}` })
```

## State Shape

RGS supports flexible state shapes:

### Flat State (Recommended)

```typescript
initState({
  counter: 0,
  user: null,
  theme: 'dark'
})
```

### Nested State

```typescript
initState({
  user: {
    profile: { name: 'John', email: 'john@example.com' },
    settings: { theme: 'dark', notifications: true }
  }
})

// Access nested values with dot notation
const [name] = useStore('user.profile.name')
```

### Dynamic Keys

```typescript
// Store items with dynamic keys
setState(`item.${itemId}`, itemData)

// Retrieve with template
const [item] = useStore(`item.${itemId}`)
```

## Equality and Updates

RGS uses reference equality by default. Objects/arrays are only considered "changed" if the reference changes.

### Shallow Equality

```typescript
const [user, setUser] = useStore('user')

// This WON'T trigger update (same reference)
user.name = 'Alice'
setUser(user)

// This WILL trigger update (new reference)
setUser({ ...user, name: 'Alice' })
```

### Custom Equality Function

```typescript
const [value] = useStore('key', {
  equalityFn: (a, b) => {
    // Custom comparison logic
    return JSON.stringify(a) === JSON.stringify(b)
  }
})
```

## Next Steps

- [API Reference](api-reference.md) - Detailed API documentation
- [Advanced Usage](advanced-usage.md) - Transactions, plugins, persistence
- [Security Features](security-features.md) - Enterprise security features
