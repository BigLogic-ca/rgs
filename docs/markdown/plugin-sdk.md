# 🛠️ Plugin SDK: Build Your Own Extensions

Create custom plugins to extend RGS functionality.

## Basic Plugin Structure

```typescript
import type { IPlugin, PluginContext } from '@biglogic/rgs'

const myPlugin = <S extends Record<string, unknown>>(): IPlugin<S> => {
  return {
    name: 'my-plugin',
    hooks: {
      onInstall: ({ store }) => {
        // Called when plugin is added
        console.log('Plugin installed!')
      },
      onInit: ({ store }) => {
        // Called during store initialization
      },
      onBeforeSet: ({ key, value }) => {
        // Called before a value is set
        console.log(`Setting ${key}:`, value)
      },
      onSet: ({ key, value }) => {
        // Called after a value is set
      },
      onGet: ({ key, value }) => {
        // Called when a value is retrieved
      },
      onRemove: ({ key }) => {
        // Called when a value is removed
      },
      onDestroy: () => {
        // Called when store is destroyed
      },
      onTransaction: ({ key }) => {
        // Called during transactions
      }
    }
  }
}

// Add to store
store._addPlugin(myPlugin())
```

## Plugin Interface

```typescript
interface IPlugin<S extends Record<string, unknown>> {
  name: string
  hooks: Partial<{
    onInstall: (context: PluginContext<S>) => void
    onInit: (context: PluginContext<S>) => void | Promise<void>
    onBeforeSet: (context: PluginContext<S>) => void
    onSet: (context: PluginContext<S>) => void | Promise<void>
    onGet: (context: PluginContext<S>) => void
    onRemove: (context: PluginContext<S>) => void | Promise<void>
    onDestroy: (context: PluginContext<S>) => void
    onTransaction: (context: PluginContext<S>) => void
  }>
}
```

## Registering Custom Methods

Expose functionality via `store.plugins`:

```typescript
const counterPlugin = (): IPlugin => ({
  name: 'counter',
  hooks: {
    onInstall: ({ store }) => {
      let count = 0

      store._registerMethod('counter', 'increment', () => {
        count++
        store.set('count', count)
        return count
      })

      store._registerMethod('counter', 'decrement', () => {
        count--
        store.set('count', count)
        return count
      })

      store._registerMethod('counter', 'getCount', () => count)
    }
  }
})

// Use it
store._addPlugin(counterPlugin())
store.plugins.counter.increment()
store.plugins.counter.decrement()
store.plugins.counter.getCount()
```

## Example: Custom Validation Plugin

```typescript
const validationPlugin = (rules: Record<string, (val: unknown) => boolean>): IPlugin => ({
  name: 'validation',
  hooks: {
    onBeforeSet: ({ key, value }) => {
      const validator = rules[key]
      if (validator && !validator(value)) {
        throw new Error(`Validation failed for key: ${key}`)
      }
    }
  }
})

// Usage
store._addPlugin(validationPlugin({
  age: (val) => typeof val === 'number' && val >= 0,
  email: (val) => typeof val === 'string' && val.includes('@')
}))
```

## Example: Custom Analytics Plugin

```typescript
const analyticsPlugin = (): IPlugin => ({
  name: 'analytics',
  hooks: {
    onSet: ({ key, value, version }) => {
      // Track in your analytics service
      console.log(`[Analytics] Key "${key}" updated to version ${version}`)
    },
    onRemove: ({ key }) => {
      console.log(`[Analytics] Key "${key}" removed`)
    }
  }
})
```

## Type-Safe Plugins with GStatePlugins

Extend the global type for IDE autocomplete:

```typescript
// In a type declaration file
import type { GStatePlugins } from '@biglogic/rgs'

declare module '@biglogic/rgs' {
  interface GStatePlugins {
    counter: {
      increment: () => number
      decrement: () => number
      getCount: () => number
    }
  }
}
```

---

**Next step:** [Local-First Sync Engine](local-first-sync.md)
