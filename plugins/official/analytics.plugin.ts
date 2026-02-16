import type { IPlugin } from '../../core/types'

/**
 * Analytics Plugin: Tracks state changes and sends them to a provider.
 * @param options Provider and filtering configuration
 * @returns IPlugin
 */
export const analyticsPlugin = (options: {
  provider: (event: { key: string, value: unknown, action: string }) => void,
  keys?: string[]
}): IPlugin => ({
  name: 'gstate-analytics',
  hooks: {
    onSet: ({ key, value }) => {
      if (!key) return
      if (!options.keys || options.keys.includes(key)) {
        options.provider({ key, value, action: 'SET' })
      }
    },
    onRemove: ({ key }) => {
      if (!key) return
      if (!options.keys || options.keys.includes(key)) {
        options.provider({ key, value: null, action: 'REMOVE' })
      }
    }
  }
})
