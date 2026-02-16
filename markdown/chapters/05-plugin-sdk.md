# 🔧 Plugin SDK: Build Your Own Extensions

This guide shows you how to create custom plugins for RGS (Argis) - React Globo State. Plugins are the way to extend the store with custom functionality.

---

## 📦 What is a Plugin?

A plugin is a module that:

1. Adds **lifecycle hooks** to react to store events
2. Exposes **custom methods** via `store.plugins.yourPlugin.method()`
3. Can **validate**, **transform**, or **track** data

---

## 🏗️ Plugin Structure

Every plugin implements the `IPlugin` interface:

```typescript
import type { IPlugin, PluginContext } from '@biglogic/rgs'

interface IPlugin {
  name: string
  hooks: {
    onInit?: (ctx: PluginContext) => void | Promise<void>
    onInstall?: (ctx: PluginContext) => void | Promise<void>
    onSet?: (ctx: PluginContext) => void | Promise<void>
    onGet?: (ctx: PluginContext) => void | Promise<void>
    onRemove?: (ctx: PluginContext) => void | Promise<void>
    onDestroy?: (ctx: PluginContext) => void | Promise<void>
    onTransaction?: (ctx: PluginContext) => void | Promise<void>
    onBeforeSet?: (ctx: PluginContext) => void | Promise<void>
    onAfterSet?: (ctx: PluginContext) => void | Promise<void>
  }
}
```

---

## 🎯 Creating Your First Plugin

### Example: A Simple Logger Plugin

```typescript
import type { IPlugin, PluginContext } from '@biglogic/rgs'

export const loggerPlugin = (): IPlugin => {
  return {
    name: 'my-logger',
    hooks: {
      onSet: ({ key, value }: PluginContext) => {
        console.log(`[Logger] Set "${key}" to:`, value)
      },
      onGet: ({ key, value }: PluginContext) => {
        console.log(`[Logger] Got "${key}":`, value)
      },
      onRemove: ({ key }: PluginContext) => {
        console.log(`[Logger] Removed "${key}"`)
      }
    }
  }
}

// Usage
store._addPlugin(loggerPlugin())
```

---

## 🔌 Registering Custom Methods

Plugins can expose methods accessible via `store.plugins.pluginName.methodName()`:

```typescript
import type { IPlugin, PluginContext } from '@biglogic/rgs'

export const counterPlugin = (): IPlugin => {
  let _count = 0

  return {
    name: 'counter',
    hooks: {
      onInstall: ({ store }) => {
        // Register methods with explicit plugin namespace
        store._registerMethod('counter', 'increment', () => {
          _count++
          return _count
        })

        store._registerMethod('counter', 'decrement', () => {
          _count--
          return _count
        })

        store._registerMethod('counter', 'getCount', () => _count)

        store._registerMethod('counter', 'reset', () => {
          _count = 0
          return _count
        })
      }
    }
  }
}

// Usage
store._addPlugin(counterPlugin())

store.plugins.counter.increment()   // returns 1
store.plugins.counter.increment()  // returns 2
store.plugins.counter.getCount()  // returns 2
store.plugins.counter.decrement()  // returns 1
store.plugins.counter.reset()      // returns 0
```

---

## ⚙️ Plugin Configuration

Plugins can accept configuration options:

```typescript
interface ValidationConfig {
  email?: (value: string) => boolean | string
  username?: (value: string) => boolean | string
  maxLength?: number
}

export const validationPlugin = (config: ValidationConfig): IPlugin => {
  return {
    name: 'validation',
    hooks: {
      onBeforeSet: ({ key, value }) => {
        const validator = config[key as keyof ValidationConfig]
        if (validator && typeof value === 'string') {
          const result = validator(value)
          if (result !== true) {
            throw new Error(`Validation failed for "${key}": ${result}`)
          }
        }

        // Check maxLength
        if (config.maxLength && typeof value === 'string' && value.length > config.maxLength) {
          throw new Error(`"${key}" exceeds max length of ${config.maxLength}`)
        }
      }
    }
  }
}

// Usage
store._addPlugin(validationPlugin({
  email: (v) => v.includes('@') ? true : 'Invalid email',
  username: (v) => v.length >= 3 ? true : 'Too short',
  maxLength: 100
}))
```

---

## 🔄 Using Store Internals

Plugins have access to internal store methods:

```typescript
export const auditPlugin = (): IPlugin => {
  return {
    name: 'audit',
    hooks: {
      onSet: ({ store, key, value, version }) => {
        // Read other keys
        const currentUser = store.get('currentUser')

        // Set silently (without triggering hooks)
        store._setSilently('_auditLog', [
          ...(store.get('_auditLog') || []),
          { action: 'set', key, timestamp: Date.now() }
        ])

        // Get version
        const ver = store._getVersion(key)
      }
    }
  }
}
```

### Available Internal Methods

| Method | Description |
|--------|-------------|
| `store.get(key)` | Get a value |
| `store.set(key, value)` | Set a value |
| `store._setSilently(key, value)` | Set without triggering hooks |
| `store.list()` | Get all key-value pairs |
| `store._getVersion(key)` | Get version number |
| `store._subscribe(callback)` | Subscribe to changes |

---

## 🧪 Full Example: Persistence Plugin

Here's a complete plugin that auto-saves to a custom backend:

```typescript
import type { IPlugin, PluginContext } from '@biglogic/rgs'

interface AutoSaveConfig {
  endpoint: string
  debounceMs?: number
  keys?: string[]  // Which keys to save
}

export const autoSavePlugin = (config: AutoSaveConfig): IPlugin => {
  const { endpoint, debounceMs = 1000, keys } = config
  let _saveTimeout: ReturnType<typeof setTimeout> | null = null

  const save = async (store: any) => {
    const data = keys
      ? Object.fromEntries(keys.map(k => [k, store.get(k)]))
      : store.list()

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      console.log('[AutoSave] Saved to', endpoint)
    } catch (err) {
      console.error('[AutoSave] Failed:', err)
    }
  }

  return {
    name: 'auto-save',
    hooks: {
      onInstall: async ({ store }) => {
        // Load initial data
        try {
          const res = await fetch(endpoint)
          const data = await res.json()
          Object.entries(data).forEach(([k, v]) => {
            store._setSilently(k, v)
          })
        } catch {
          // Ignore load errors
        }
      },
      onSet: ({ store }) => {
        // Debounced save
        if (_saveTimeout) clearTimeout(_saveTimeout)
        _saveTimeout = setTimeout(() => save(store), debounceMs)
      },
      onDestroy: ({ store }) => {
        // Save immediately on destroy
        if (_saveTimeout) clearTimeout(_saveTimeout)
        save(store)
      }
    }
  }
}

// Usage
store._addPlugin(autoSavePlugin({
  endpoint: '/api/save',
  debounceMs: 2000,
  keys: ['user', 'settings', 'preferences']
}))
```

---

## 📋 Plugin Best Practices

1. **Use Namespaced Methods** - Always use `store._registerMethod('pluginName', 'method', fn)`
2. **Clean Up Resources** - Use `onDestroy` to clean up timers, listeners, etc.
3. **Handle Errors** - Wrap async operations in try/catch
4. **Document Configuration** - Provide clear TypeScript interfaces
5. **Test Hooks** - Test each hook independently

---

## 📚 Related

- [Plugin API Reference](../api/plugins.md)
- [Chapter 5: Ecosystem and Plugins](05-plugins-and-extensibility.md)
- [Case Studies](06-case-studies.md)
