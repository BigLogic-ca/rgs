# 🔌 Chapter 5: Ecosystem and Plugins - Extend Without Limits

RGS comes with a powerful plugin ecosystem that lets you extend functionality without modifying the core.

## Official Plugins

| Plugin | Purpose | Import |
|--------|---------|--------|
| `undoRedoPlugin` | Time travel through state | `@biglogic/rgs` |
| `syncPlugin` | Cross-tab sync | `@biglogic/rgs/core/advanced` |
| `indexedDBPlugin` | GB-scale storage | `@biglogic/rgs` |
| `cloudSyncPlugin` | Cloud backup & sync | `@biglogic/rgs` |
| `devToolsPlugin` | Redux DevTools | `@biglogic/rgs` |
| `immerPlugin` | Mutable-style updates | `@biglogic/rgs` |
| `snapshotPlugin` | Save/restore checkpoints | `@biglogic/rgs` |
| `schemaPlugin` | Runtime validation | `@biglogic/rgs` |
| `guardPlugin` | Transform on set | `@biglogic/rgs` |
| `analyticsPlugin` | Track changes | `@biglogic/rgs` |
| `debugPlugin` | Console access (DEV) | `@biglogic/rgs` |

## Adding Plugins

```typescript
import { gstate, undoRedoPlugin, indexedDBPlugin } from '@biglogic/rgs'

const store = gstate({ count: 0 })

// Add undo/redo
store._addPlugin(undoRedoPlugin({ limit: 50 }))

// Add IndexedDB for large data
store._addPlugin(indexedDBPlugin({ dbName: 'my-app' }))
```

## Using Plugin Methods

Access plugin methods via `store.plugins`:

```typescript
// Undo/Redo
store.plugins.undoRedo.undo()
store.plugins.undoRedo.redo()
store.plugins.undoRedo.canUndo() // boolean
store.plugins.undoRedo.canRedo() // boolean

// Cloud Sync
await store.plugins.cloudSync.sync()
const stats = store.plugins.cloudSync.getStats()

// IndexedDB
store.plugins.indexedDB.clear()
```

## Plugin Configuration

Each plugin accepts an options object:

```typescript
// Undo/Redo with custom limit
store._addPlugin(undoRedoPlugin({ limit: 100 }))

// IndexedDB with custom settings
store._addPlugin(indexedDBPlugin({
  dbName: 'my-app-db',
  storeName: 'states',
  version: 1
}))

// Cloud Sync with auto-sync
store._addPlugin(cloudSyncPlugin({
  adapter: createMongoAdapter(url, key),
  autoSyncInterval: 30000 // 30 seconds
}))
```

## Custom Plugins

You can create your own plugins. See [Plugin SDK](plugin-sdk.md) for details.

---

**Next step:** [Plugin SDK: Build Your Own Extensions](plugin-sdk.md)
