# 🚀 Chapter 10: Local-First Sync Engine

RGS now includes a powerful **Local-First Sync Engine** that makes your app work offline by default and automatically synchronize when connectivity is restored.

## Why Local-First?

Traditional apps require an internet connection to work. Local-First apps work immediately with local data and sync in the background when possible.

### Benefits

- **Instant Load** - No waiting for server responses
- **Works Offline** - App functions without internet
- **Better UX** - No loading spinners for data
- **Conflict Resolution** - Smart merge strategies

## Quick Start

```typescript
import { gstate, useSyncedState } from '@biglogic/rgs'

// Create store with sync enabled
const store = gstate({
  todos: [],
  user: null
}, {
  namespace: 'myapp',
  sync: {
    endpoint: 'https://api.example.com/sync',
    authToken: 'your-token',
    autoSyncInterval: 30000,  // Sync every 30s
    syncOnReconnect: true    // Auto-sync when back online
  }
})

// Use in React components
function TodoList() {
  const [todos, setTodos] = useSyncedState('todos')

  // Add todo - automatically queued for sync
  const addTodo = (text) => {
    setTodos([...todos, { id: Date.now(), text }])
  }

  return <div>{/* ... */}</div>
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | `string` | required | Remote sync server URL |
| `authToken` | `string` | - | Authentication token |
| `strategy` | `string` | `'last-write-wins'` | Conflict resolution |
| `autoSyncInterval` | `number` | `30000` | Auto-sync interval (ms) |
| `syncOnReconnect` | `boolean` | `true` | Sync on network restore |
| `debounceTime` | `number` | `1000` | Batch changes (ms) |
| `maxRetries` | `number` | `3` | Failed sync retries |
| `onConflict` | `function` | - | Custom conflict handler |
| `onSync` | `function` | - | Sync completion callback |

## Conflict Resolution Strategies

### 1. Last-Write-Wins (Default)

```typescript
sync: { strategy: 'last-write-wins' }
```
Latest timestamp wins - simplest strategy.

### 2. Server-Wins

```typescript
sync: { strategy: 'server-wins' }
```
Always prefer remote values - useful for read-heavy apps.

### 3. Client-Wins

```typescript
sync: { strategy: 'client-wins' }
```
Always prefer local values - useful for write-heavy apps.

### 4. Custom Merge

```typescript
sync: {
  strategy: 'merge',
  onConflict: (conflict) => {
    // Custom logic for merging
    return {
      action: 'merge',
      value: { /* merged result */ }
    }
  }
}
```

## Hook API

### useSyncedState

```typescript
const [value, setValue, syncState] = useSyncedState('key')

// syncState contains:
// - isOnline: boolean
// - isSyncing: boolean
// - pendingChanges: number
// - conflicts: number
```

### useSyncStatus

```typescript
const status = useSyncStatus()
// Global sync status across all stores
```

## Manual Sync Control

```typescript
// Force sync
await store.plugins.sync.flush()

// Get sync state
const state = store.plugins.sync.getState()
```

## Integration with Persistence

The Sync Engine works seamlessly with RGS's existing persistence layer:

- **Local Storage** - Data persists locally first
- **IndexedDB** - For larger datasets
- **Cloud Sync** - Optional remote backup

Your data survives browser refresh, works offline, and stays synchronized across devices.

## Next Steps

- Learn about [Security Architecture](09-security-architecture.md)
- Explore [Plugin SDK](05-plugin-sdk.md)
- Check [Migration Guide](08-migration-guide.md)
