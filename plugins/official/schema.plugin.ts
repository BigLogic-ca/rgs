import type { IPlugin } from '../../core/types'

/**
 * Schema Plugin: Validates state changes against a validator function.
 * @param schemas Map of keys to validation functions
 * @returns IPlugin
 */
export const schemaPlugin = (schemas: Record<string, (val: unknown) => boolean | string>): IPlugin => ({
  name: 'gstate-schema',
  hooks: {
    onSet: ({ key, value }) => {
      if (!key) return
      const validator = schemas[key]

      if (validator) {
        const result = validator(value)

        if (result !== true) {
          throw new Error(`[Schema Error] Validation failed for key "${key}": ${result === false ? 'Invalid type' : result}`)
        }
      }
    }
  }
})
