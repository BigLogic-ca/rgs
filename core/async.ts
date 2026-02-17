import { createStore } from "./store"
import type { IStore, AsyncState } from "./types"

/**
 * Creates an async store that automatically manages the data/loading/error lifecycle.
 * @template T The type of data being fetched
 * @param resolver - Async function that returns the data
 * @param options - Configuration options
 * @returns Store instance with execute method
 *
 * @example
 * const store = createAsyncStore(async () => {
 *   const response = await fetch('/api/data');
 *   return response.json();
 * }, { key: 'userData', persist: true });
 *
 * // Execute the fetch
 * await store.execute();
 *
 * // Use in React
 * const { data, loading, error } = store.get('userData');
 */
export const createAsyncStore = <T>(
  resolver: () => Promise<T>,
  options?: { key?: string, persist?: boolean, store?: IStore<Record<string, AsyncState<T>>> }
): IStore<Record<string, AsyncState<T>>> & { execute: () => Promise<void> } => {
  /**
 * Key used to store the async state in the store
 */
  const key = options?.key || 'async_data'

  /**
   * Store instance - uses existing or creates new one
   */
  const store = options?.store || createStore<Record<string, AsyncState<T>>>({
    namespace: `async_${key}`,
    silent: true
  })

  // Initial State if not present
  if (store.get(key) == null) {
    store.set(key, { data: null, loading: false, error: null, updatedAt: null })
  }

  /**
 * Executes the async resolver and updates store state
 */
  const run = async () => {
    const current = store.get(key) as AsyncState<T> | null
    store.set(key, {
      ...(current || { data: null, loading: false, error: null, updatedAt: null }),
      loading: true,
      error: null
    })

    // Wait for store to be ready if it's hydrating
    if ('whenReady' in store && !store.isReady) await store.whenReady()

    try {
      const result = await resolver()
      const prev = store.get(key) as AsyncState<T> | null
      store.set(key, {
        ...(prev || { data: null, loading: false, error: null, updatedAt: null }),
        data: result,
        loading: false,
        updatedAt: Date.now()
      }, { persist: options?.persist })
    } catch (e: unknown) {
      const prev = store.get(key) as AsyncState<T> | null
      store.set(key, {
        ...(prev || { data: null, loading: false, error: null, updatedAt: null }),
        error: e instanceof Error ? e : new Error(String(e)),
        loading: false
      })
    }
  }

  return Object.assign(store, { execute: run })
}
