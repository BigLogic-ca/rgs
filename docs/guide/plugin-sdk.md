# Plugin SDK - Extending RGS

Complete guide to creating custom plugins for RGS.

## Plugin Interface

Every RGS plugin must implement the `Plugin` interface:

```typescript
interface Plugin {
  name: string;
  version?: string;
  
  // Lifecycle hooks
  onInstall?: (context: PluginContext) => void | Promise<void>;
  onUninstall?: (context: PluginContext) => void | Promise<void>;
  
  // State hooks
  beforeSet?: (key: string, value: any, context: PluginContext) => any | Promise<any>;
  afterSet?: (key: string, value: any, context: PluginContext) => void | Promise<void>;
  beforeGet?: (key: string, context: PluginContext) => void | Promise<void>;
  afterGet?: (key: string, value: any, context: PluginContext) => void | Promise<void>;
  
  // Error handling
  onError?: (error: Error, context: PluginContext) => void;
}
```

## Creating Your First Plugin

### Logger Plugin Example

```typescript
import { Plugin, PluginContext } from '@biglogic/rgs';

const loggerPlugin: Plugin = {
  name: 'logger',
  version: '1.0.0',
  
  onInstall: (context: PluginContext) => {
    console.log(`[${context.namespace}] Logger plugin installed`);
  },
  
  beforeSet: (key: string, value: any, context: PluginContext) => {
    console.log(`[${context.namespace}] Setting ${key} to:`, value);
    return value; // Return (possibly modified) value
  },
  
  afterSet: (key: string, value: any, context: PluginContext) => {
    console.log(`[${context.namespace}] Set ${key} complete`);
  },
  
  beforeGet: (key: string, context: PluginContext) => {
    console.log(`[${context.namespace}] Getting ${key}`);
  }
};

// Install the plugin
import { installPlugin } from '@biglogic/rgs';
installPlugin(loggerPlugin);
```

## Advanced Plugin: Analytics Tracker

Track state changes for analytics purposes:

```typescript
const analyticsPlugin: Plugin = {
  name: 'analytics',
  version: '2.0.0',
  
  afterSet: async (key: string, value: any, context) => {
    // Send analytics data
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'state_update',
          key,
          namespace: context.namespace,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('Analytics send failed:', error);
    }
  }
};
```

## Plugin Context

The `PluginContext` provides useful information:

```typescript
interface PluginContext {
  namespace: string;      // Current namespace
  store: IStore;         // Store instance
  userId?: string;       // Current user (if set)
  metadata?: Record<string, any>; // Custom metadata
}
```

## Official Plugins

### IndexedDB Plugin

```typescript
import { indexedDBPlugin } from '@biglogic/rgs/plugins';

const plugin = indexedDBPlugin({
  dbName: 'my-app-db',
  version: 1,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

### Cloud Sync Plugin

```typescript
import { cloudSyncPlugin } from '@biglogic/rgs/plugins';

const plugin = cloudSyncPlugin({
  endpoint: 'https://api.example.com/sync',
  interval: 5 * 60 * 1000, // 5 minutes
  headers: {
    'Authorization': `Bearer ${token}`
  },
  onSync: (changes) => console.log('Synced:', changes),
  onError: (error) => console.error('Sync failed:', error)
});
```

### Schema Validation Plugin

Never trust data coming back from the server or saved in the browser 6 months ago. Use the **SchemaPlugin**.

```typescript
import { schemaPlugin } from '@biglogic/rgs/plugins';
import { z } from 'zod'; // Recommended!

const plugin = schemaPlugin({
  price: z.number().positive(),
  email: z.string().email(),
  user: z.object({
    name: z.string(),
    age: z.number().min(18)
  })
});

// If anyone tries to setState('price', -50), RGS will block the operation
```

### Persistence Plugin

Custom persistence behavior:

```typescript
import { persistencePlugin } from '@biglogic/rgs/plugins';

const plugin = persistencePlugin({
  storage: localStorage,
  debounceMs: 300,
  exclude: ['temporary', 'cache_*'], // Exclude these keys
  include: ['user', 'settings'] // Only persist these (if specified)
});
```

## Plugin Installation

### Global Installation

```typescript
import { installPlugin } from '@biglogic/rgs';

installPlugin(myPlugin);
```

### Per-Store Installation

```typescript
import { gstate } from '@biglogic/rgs';

const useStore = gstate(
  { counter: 0 },
  {
    plugins: [myPlugin, anotherPlugin]
  }
);
```

## Plugin Best Practices

1. **Unique Names**: Always give your plugin a unique name
2. **Version Control**: Include version for compatibility tracking
3. **Error Handling**: Handle errors gracefully in plugin hooks
4. **Async Support**: Use async/await for asynchronous operations
5. **Return Values**: `beforeSet` must return a value (possibly modified)
6. **Cleanup**: Implement `onUninstall` for cleanup if needed

## Publishing Your Plugin

If you create a useful plugin, consider publishing it:

```bash
# Create package
npm init @biglogic/rgs-plugin-myplugin

# Install dependencies
npm install @biglogic/rgs

# Build and publish
npm run build
npm publish
```

## Next Steps

- [Advanced Usage](advanced-usage.md) - More plugin examples
- [Best Practices](best-practices.md) - Plugin architecture guidelines
