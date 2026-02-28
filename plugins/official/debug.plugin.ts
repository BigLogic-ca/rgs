import { isProduction } from '../../core/env'
import type { IPlugin } from '../../core/types'

/**
 * Debug Plugin: Exposes the store to the browser console.
 * ⚠️ FOR DEV/DEBUG ONLY - Never use in production!
 *
 * @example
 * ```typescript
 * if (!isProduction()) {
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
  if (isProduction()) {
    return { name: 'gstate-debug-noop', hooks: {} }
  }

  const isDev = !isProduction()

  const debugLog = (...args: unknown[]) => {
    if (isDev) console.debug(...args)
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
              return store.list()
            },
            /** Get a specific key */
            get: (key: string) => {
              const val = store.get(key)
              debugLog(`[gstate] get('${key}'):`, val)
              return val
            },
            /** Set a value */
            set: (key: string, value: unknown) => {
              const result = store.set(key, value)
              debugLog(`[gstate] set('${key}', ${JSON.stringify(value)}):`, result)
              return result
            },
            /** Watch a key */
            watch: (key: string, callback: (val: unknown) => void) => {
              const unwatch = store.watch(key, callback)
              debugLog(`[gstate] watching '${key}'`)
              return unwatch
            },
            /** Get store info */
            info: () => {
              const info = {
                namespace: store.namespace,
                isReady: store.isReady,
                keys: Object.keys(store.list()),
                size: Object.keys(store.list()).length
              }
              debugLog('[gstate] Store Info:', info)
              return info
            },
            /** Clear console and show banner */
            banner: () => {
              debugLog(`
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
          debugLog('[gstate] Debug plugin installed. Type gstate.banner() for help.')
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
