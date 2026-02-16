import type { IPlugin } from '../../core/types'

/**
 * Guard Plugin: Intercepts values before they hit the store.
 * @param guards Map of keys to guard/transform functions
 * @returns IPlugin
 */
export const guardPlugin = (guards: Record<string, (val: unknown) => unknown>): IPlugin => ({
  name: 'gstate-guard',
  hooks: {
    onBeforeSet: ({ key, value, store: _store }) => {
      if (!key) return
      const guard = guards[key]

      if (guard) {
        const transformed = guard(value)

        // Note: Core currently doesn't support value interception for transformation
        // in onBeforeSet, but this serves as a placeholder for validation/logging.
        if (transformed !== value) {
          // Future: core.set could accept the transformed value
        }
      }
    }
  }
})
