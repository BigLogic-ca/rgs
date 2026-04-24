# Advanced Usage

Advanced patterns and features for production applications.

## Transactions

Batch multiple state updates into a single transaction for performance and consistency.

### Basic Transaction

```typescript
import { transaction } from '@biglogic/rgs'

// All updates happen atomically
transaction(() => {
  setState('user', { name: 'Bob', role: 'admin' })
  setState('permissions', ['read', 'write', 'delete'])
  setState('lastLogin', Date.now())
})
// Components re-render once after transaction completes
```

### Nested Transactions

```typescript
transaction(() => {
  setState('a', 1)
  
  // Nested transaction (flattens to parent)
  transaction(() => {
    setState('b', 2)
    setState('c', 3)
  })
})
```

### Use Cases

- **Form submissions**: Update multiple fields atomically
- **Batch operations**: Update many items at once
- **State consistency**: Ensure related updates happen together

## Middleware and Plugins

RGS supports a plugin system for extending functionality.

### Creating a Plugin

```typescript
import { installPlugin, Plugin } from '@biglogic/rgs'

// Define a custom plugin
const loggerPlugin: Plugin = {
  name: 'logger',
  version: '1.0.0',
  
  // Called when plugin is installed
  onInstall: (context) => {
    console.log('Logger plugin installed')
  },
  
  // Called before state is set
  beforeSet: (key, value) => {
    console.log(`Setting ${key} to:`, value)
    return value // Return (possibly modified) value
  },
  
  // Called after state is set
  afterSet: (key, value) => {
    console.log(`Set ${key} complete`)
  }
}

// Install the plugin
installPlugin(loggerPlugin)
```

### Built-in Plugin Hooks

| Hook | Description |
|------|-------------|
| `onInstall` | Called when plugin is installed |
| `beforeSet` | Called before state is updated |
| `afterSet` | Called after state is updated |
| `beforeGet` | Called before state is read |
| `afterGet` | Called after state is read |

### Plugin Use Cases

- **Logging**: Log all state changes
- **Analytics**: Track state mutations
- **Validation**: Validate state before updates
- **Persistence**: Auto-persist on changes

## Persistent State

Persist state to localStorage, sessionStorage, or custom storage.

### Basic Persistence

```typescript
import { initState } from '@biglogic/rgs'

const store = initState(
  { cart: [], user: null },
  {
    namespace: 'ecommerce',
    storage: localStorage, // or sessionStorage, or custom
    persist: true,
    // Auto-hydrate on init
    hydrate: true
  }
)
```

### Manual Persistence

```typescript
import { persist } from '@biglogic/rgs'

// Manually persist
persist('cart', localStorage)

// Manually hydrate
import { hydrate } from '@biglogic/rgs'
hydrate('cart', localStorage)
```

### Custom Storage Adapters

Create custom storage adapters for different backends.

```typescript
import { StorageAdapter } from '@biglogic/rgs'

// Custom AsyncStorage adapter (React Native example)
const asyncStorageAdapter: StorageAdapter = {
  getItem: async (key: string) => {
    const value = await AsyncStorage.getItem(key)
    return value ? JSON.parse(value) : null
  },
  
  setItem: async (key: string, value: any) => {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  },
  
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key)
  }
}

initState(state, { storage: asyncStorageAdapter })
```

### Storage Adapter Interface

```typescript
interface StorageAdapter {
  getItem(key: string): any | Promise<any>
  setItem(key: string, value: any): void | Promise<void>
  removeItem(key: string): void | Promise<void>
}
```

## SSR Compatibility

RGS supports server-side rendering with proper hydration.

### SSR Setup

```typescript
// Server-side
const serverState = initState({ user: null })

// Send state to client
const initialState = JSON.stringify(getState())

// Client-side hydration
initState(initialState, { hydrate: true })
```

## Next Steps

- [Security Features](security-features.md) - Enterprise security features
- [Testing](testing.md) - Testing strategies
- [Performance](performance.md) - Optimization tips
