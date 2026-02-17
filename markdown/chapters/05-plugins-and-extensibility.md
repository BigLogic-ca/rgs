# 🔌 Chapter 5: Ecosystem and Plugins - Become a Power User

RGS is not a closed box. It's a modular engine that you can extend to cover every business need. All plugins are designed to be "Plug & Play".

## 🔌 Available Plugins

RGS includes 11 official plugins:

| Plugin | Purpose | Import |
|--------|---------|--------|
| `devToolsPlugin` | Redux DevTools integration | `rgs` |
| `debugPlugin` | Console debug access (DEV only) | `rgs` |
| `indexedDBPlugin` | GB-scale Local Storage | `rgs/advanced` |
| `cloudSyncPlugin` | Remote Cloud Backup/Sync | `rgs/advanced` |
| `syncPlugin` | Cross-tab synchronization | `rgs/advanced` |
| `immerPlugin` | Immer for mutable-style updates | `rgs` |
| `snapshotPlugin` | Save/restore state snapshots | `rgs` |
| `undoRedoPlugin` | History management | `rgs` |
| `schemaPlugin` | Schema validation | `rgs` |
| `guardPlugin` | Pre-set value transformation | `rgs` |
| `analyticsPlugin` | Track state changes | `rgs` |

## 🔎 1. DevTools: See Under the Hood

Import the official plugin and you'll see every state change, transaction, and execution time in the console or dev tools (Redux DevTools support included!).

```typescript
import { devToolsPlugin } from '@biglogic/rgs';

store._addPlugin(devToolsPlugin({ name: 'My Store' }));
```

## 🐛 2. Debug: Console Access (DEV ONLY)

⚠️ **FOR DEVELOPMENT ONLY** - This plugin is automatically disabled in production.

Access your store directly from the browser console:

```typescript
import { debugPlugin } from '@biglogic/rgs';

// Always wrap in dev check
if (process.env.NODE_ENV === 'development') {
  store._addPlugin(debugPlugin())
}
```

Then in the browser console:
```javascript
gstate.list()        // View all state
gstate.get('key')   // Get a value
gstate.set('key', val) // Set a value
gstate.info()        // Store info
gstate.banner()     // Show help
```

##  2. Cross-Tab Sync: Multi-Tab Magic

Have your app open in three browser tabs? With the `syncPlugin`, if a user changes the theme in one tab, all other tabs update instantly. **Without hitting the server.**

```typescript
import { syncPlugin } from 'rgs/advanced';

store._addPlugin(syncPlugin({ channelName: 'my_app_sync' }));
```

## 🔐 3. Encode Option: Base64 Encoding

Use the `encoded` option for simple base64 encoding (not encryption, just obfuscation):

```typescript
// Per-value encoding
store.set('token', 'secret-value', { persist: true, encoded: true })

// Or global encoding for all persisted values
const store = initState({ encoded: true })
```

> **Note:** Use `encryptionKey` with AES-256-GCM for real security. The `encoded` option is just simple obfuscation.

## 🕐 4. TTL (Time To Live): Expiring Data

Use the `ttl` option in persist to make data expire automatically:

```typescript
store.set('session_token', tokenValue, {
  persist: true,
  ttl: 3600000 // Expires in 1 hour
});
```

## 🎲 5. Undo/Redo: History Management

```typescript
import { undoRedoPlugin } from '@biglogic/rgs';

store._addPlugin(undoRedoPlugin({ limit: 50 }));

// Later...
store.undo();
store.redo();
store.canUndo(); // boolean
store.canRedo(); // boolean
```

## 📸 6. Snapshots: Save & Restore State

```typescript
import { snapshotPlugin } from '@biglogic/rgs';

store._addPlugin(snapshotPlugin());

// Save current state
store.takeSnapshot('backup_1');

// Restore
store.restoreSnapshot('backup_1');

// List all snapshots
store.listSnapshots(); // ['backup_1', ...]

// Delete
store.deleteSnapshot('backup_1');
store.clearSnapshots();
```

## 🛡️ 7. Guard: Pre-Set Transformation

Transform values before they hit the store:

```typescript
import { guardPlugin } from '@biglogic/rgs';

store._addPlugin(guardPlugin({
  'user_input': (val) => val.trim().toLowerCase()
}));
```

## ✅ 8. Schema: Validation

Validate values before setting:

```typescript
import { schemaPlugin } from '@biglogic/rgs';

store._addPlugin(schemaPlugin({
  'email': (val) => {
    if (typeof val !== 'string') return 'Must be a string';
    return val.includes('@') ? true : 'Invalid email';
  }
}));
```

## 📊 9. Analytics: Track Changes

```typescript
import { analyticsPlugin } from '@biglogic/rgs';

store._addPlugin(analyticsPlugin({
  provider: (event) => {
    console.log('State changed:', event);
    // Send to analytics service
  },
  keys: ['user', 'cart'] // Only track these keys
}));
```

## 🔄 10. Immer Integration

```typescript
import { immerPlugin } from '@biglogic/rgs';

store._addPlugin(immerPlugin());

// Update nested state with Immer
store.setWithProduce('user', (draft) => {
  draft.name = 'New Name';
  draft.address.city = 'New City';
});
```

---

## 💡 A Word of Wisdom for Easy & Advanced Scenarios

Plugins are used to **abstract the boring logic**. If you find yourself writing the same `useEffect` to sync two things in 5 different parts of your app... **Stop.** Create a plugin or use an existing one.

The best code is the code you write once and forget about.

**Next step:** [Case Studies: Real-World Production Strategies](06-case-studies.md)
