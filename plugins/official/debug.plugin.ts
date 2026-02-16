import type { IPlugin } from '../../core/types'

/**
 * Debug Plugin: Exposes the store to the browser console.
 * ⚠️ FOR DEV/DEBUG ONLY - Never use in production!
 *
 * @example
 * ```typescript
 * if (process.env.NODE_ENV === 'development') {
 *   store._addPlugin(debugPlugin())
 * }
 *
 * // In browser console:
 * > gstate.list()
 * > gstate.get('myKey')
 * > gstate.set('myKey', 'newValue')
 * ```
 */
export const debugPlugin = (): IPlugin => {
  // Security: Only run in development
  if (process.env.NODE_ENV === 'production') {
    return { name: 'gstate-debug-noop', hooks: {} }
  }

  return {
    name: 'gstate-debug',
    hooks: {
      onInstall: ({ store }) => {
        // Expose store to global window object for console access
        if (typeof window !== 'undefined') {
          (window as unknown as Record<string, unknown>).gstate = {
            /** Get all state */
            list: () => {
              // eslint-disable-next-line no-console
              console.log('[gState] Current state:', store.list())
              return store.list()
            },
            /** Get a specific key */
            get: (key: string) => {
              const val = store.get(key)
              // eslint-disable-next-line no-console
              console.log(`[gState] get('${key}'):`, val)
              return val
            },
            /** Set a value */
            set: (key: string, value: unknown) => {
              const result = store.set(key, value)
              // eslint-disable-next-line no-console
              console.log(`[gState] set('${key}', ${JSON.stringify(value)}):`, result)
              return result
            },
            /** Watch a key */
            watch: (key: string, callback: (val: unknown) => void) => {
              const unwatch = store.watch(key, callback)
              // eslint-disable-next-line no-console
              console.log(`[gState] watching '${key}'`)
              return unwatch
            },
            /** Get store info */
            info: () => {
              const info = {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                namespace: (store as Record<string, any>)._namespace,
                isReady: store.isReady,
                keys: Object.keys(store.list()),
                size: Object.keys(store.list()).length
              }
              // eslint-disable-next-line no-console
              console.log('[gState] Store Info:', info)
              return info
            },
            /** Clear console and show banner */
            banner: () => {
              // eslint-disable-next-line no-console
              console.log(`
╔═══════════════════════════════════════╗
║         🧲 gState Debug            ║
║   Type: gstate.list()              ║
║        gstate.get(key)            ║
║        gstate.set(key, value)    ║
║        gstate.info()              ║
╚═══════════════════════════════════════╝
              `)
            }
          }

          // Auto-show banner on install
          // eslint-disable-next-line no-console
          console.log('[gState] Debug plugin installed. Type gstate.banner() for help.')
        }
      },
      onDestroy: () => {
        // Cleanup global reference
        if (typeof window !== 'undefined') {
          delete (window as unknown as Record<string, unknown>).gstate
        }
      }
    }
  }
}
