/**
 * Argis (RGS) - React Globo State - Official Plugins
 * Performance-optimized extensions for the core engine.
 */

export { immerPlugin } from "./official/immer.plugin"
export { undoRedoPlugin } from "./official/undo-redo.plugin"
export { schemaPlugin } from "./official/schema.plugin"
export { devToolsPlugin } from "./official/devtools.plugin"
export { snapshotPlugin } from "./official/snapshot.plugin"
export { guardPlugin } from "./official/guard.plugin"
export { analyticsPlugin } from "./official/analytics.plugin"
export { syncPlugin } from "./official/sync.plugin"
export { debugPlugin } from "./official/debug.plugin"
export { indexedDBPlugin } from "./official/indexeddb.plugin"
export {
  cloudSyncPlugin,
  createMongoAdapter,
  createFirestoreAdapter,
  createSqlRestAdapter
} from "./official/cloud-sync.plugin"

import type { PluginContext, IPlugin } from "../core/types"

/**
 * Official Logger Plugin: Professional change tracking.
 * @param options Styling options for the logger
 * @returns IPlugin
 */
export const loggerPlugin = <S extends Record<string, unknown>>(options?: { collapsed?: boolean }): IPlugin<S> => ({
  name: 'gstate-logger',
  hooks: {
    onSet: ({ key, value, version }: PluginContext<S>) => {
      const
        time = new Date().toLocaleTimeString(),
        groupLabel = `[gState] SET: ${key} (v${version}) @ ${time}`

      if (options?.collapsed) console.groupCollapsed(groupLabel)
      else console.group(groupLabel)

      console.info('%c Value:', 'color: #4CAF50; font-weight: bold;', value)
      console.groupEnd()
    },
    onRemove: ({ key }) => {
      console.warn(`[gState] REMOVED: ${key}`)
    },
    onTransaction: ({ key }) => {
      if (key === 'START') console.group('── TRANSACTION START ──')
      else console.groupEnd()
    }
  }
})
