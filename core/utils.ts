/**
 * Utility functions for the store.
 * Extracted from store.ts to reduce file size.
 */

/**
 * Deep clone using structuredClone (native) with fallback.
 * Handles circular references safely and preserves common types.
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj

  // Optimization: use native structuredClone if available
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj)
    } catch (_e) {
      // Fallback for non-serializable objects (functions, prototypes, etc.)
    }
  }

  const seen = new WeakMap<object, unknown>()

  const clone = <V>(value: V): V => {
    if (value === null || typeof value !== 'object') return value
    if (typeof value === 'function') return value as unknown as V // Functions cannot be deep cloned easily

    // Check for circular references
    if (seen.has(value as object)) return seen.get(value as object) as V

    if (value instanceof Date) return new Date(value.getTime()) as unknown as V
    if (value instanceof RegExp) return new RegExp(value.source, value.flags) as unknown as V
    if (value instanceof Map) {
      const result = new Map()
      seen.set(value as object, result)
      value.forEach((v, k) => result.set(clone(k), clone(v)))
      return result as unknown as V
    }
    if (value instanceof Set) {
      const result = new Set()
      seen.set(value as object, result)
      value.forEach((v) => result.add(clone(v)))
      return result as unknown as V
    }

    // Handle Plain Objects and Arrays
    const result = (Array.isArray(value)
      ? []
      : Object.create(Object.getPrototypeOf(value))) as Record<string | symbol, unknown>

    seen.set(value as object, result)

    const keys = [...Object.keys(value as object), ...Object.getOwnPropertySymbols(value as object)]
    for (const key of keys) {
      result[key as string] = clone((value as Record<string | symbol, unknown>)[key])
    }

    return result as V
  }

  return clone(obj)
}

/**
 * Compares two values for deep equality.
 * @param a - First value
 * @param b - Second value
 * @returns True if values are equal
 */
export const isEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (a === null || b === null) return a === b
  if (typeof a !== 'object' || typeof b !== 'object') return a === b
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (!isEqual(a[i], b[i])) return false
    return true
  }
  const keysA = Object.keys(a as object)
  const keysB = Object.keys(b as object)
  if (keysA.length !== keysB.length) return false

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i] as string
    if (!(key in (b as object)) || !isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false
  }
  return true
}
