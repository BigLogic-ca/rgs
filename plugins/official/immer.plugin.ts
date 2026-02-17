import type { IPlugin } from '../../core/types'

/**
 * Immer Plugin: Adds syntactic sugar for functional updates.
 * Leverages the core's native Immer support.
 * @returns IPlugin
 */
export const immerPlugin = <S extends Record<string, unknown>>(): IPlugin<S> => ({
  name: 'gstate-immer',
  hooks: {
    onInstall: ({ store }) => {
      // Add sugar method to store instance using the formal registration API
      store._registerMethod('immer', 'setWithProduce', ((key: string, updater: (draft: unknown) => void) => {
        return store.set(key, updater)
      }) as (...args: unknown[]) => unknown)
    }
  }
})
