import type { IPlugin } from '../../core/types'

/**
 * Snapshot Plugin: Allows taking and restoring full store snapshots manually.
 * @returns IPlugin
 */
export const snapshotPlugin = (): IPlugin => {
  /** Internal storage for snapshots */
  const _snapshots = new Map<string, unknown>()

  return {
    name: 'gstate-snapshot',
    hooks: {
      onInstall: ({ store }) => {
        store._registerMethod('snapshot', 'takeSnapshot', ((name: string) => {
          _snapshots.set(name, store.list())
        }) as (...args: unknown[]) => unknown)

        store._registerMethod('snapshot', 'restoreSnapshot', ((name: string) => {
          const snap = _snapshots.get(name)
          if (!snap) return false

          store.transaction(() => {
            Object.entries(snap).forEach(([k, v]) => {
              store.set(k, v)
            })
          })
          return true
        }) as (...args: unknown[]) => unknown)

        store._registerMethod('snapshot', 'listSnapshots', (() => Array.from(_snapshots.keys())) as (...args: unknown[]) => unknown)
        store._registerMethod('snapshot', 'deleteSnapshot', ((name: string) => _snapshots.delete(name)) as (...args: unknown[]) => unknown)
        store._registerMethod('snapshot', 'clearSnapshots', (() => _snapshots.clear()) as (...args: unknown[]) => unknown)
      }
    }
  }
}
