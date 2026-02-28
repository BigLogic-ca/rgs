/**
 * ULTRA MINIMAL - Bare bones state management
 * Target: < 2KB
 * No plugins, no security, no sync
 */

type Listener = () => void

interface Store<T extends Record<string, unknown>> {
  get<K extends keyof T>(key: K): T[K]
  set<K extends keyof T>(key: K, value: T[K]): void
  subscribe(listener: Listener): () => void
}

const createStore = <T extends Record<string, unknown>>(initialState: T): Store<T> => {
  let state = { ...initialState }
  const listeners = new Set<Listener>()

  return {
    get: (key) => state[key],
    set: (key, value) => {
      state = { ...state, [key]: value }
      listeners.forEach(l => l())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}

export { createStore, type Store }
