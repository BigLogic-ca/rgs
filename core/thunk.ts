/**
 * Thunk Middleware for RGS
 * Provides async action handling similar to Redux Thunk
 *
 * Allows writing async logic that can interact with the store
 */

import type { IStore } from "./types"

/**
 * Thunk action type - can be sync or async
 *
 * @template S - Store state type
 * @template R - Return type
 *
 * @example
 * // Sync thunk
 * const increment = (state: AppState) => {
 *   state.counter++
 * }
 *
 * // Async thunk
 * const fetchUser = async (dispatch: any, getState: () => AppState) => {
 *   const response = await fetch('/api/user')
 *   const user = await response.json()
 *   dispatch({ type: 'SET_USER', payload: user })
 * }
 */
export type ThunkAction<R = void, S extends Record<string, unknown> = Record<string, unknown>> = (
  dispatch: ThunkDispatch<S>,
  getState: () => S,
  extraArgument?: unknown
) => Promise<R> | R

/**
 * Thunk dispatch type - extended store dispatch that accepts thunks
 */
export type ThunkDispatch<S extends Record<string, unknown> = Record<string, unknown>> = <R>(
  action: ThunkAction<R, S> | ThunkActionPayload<S>
) => Promise<R>

/**
 * Plain action payload (synchronous action)
 */
export interface ThunkActionPayload<_S extends Record<string, unknown> = Record<string, unknown>> {
  type: string
  payload?: unknown
  meta?: Record<string, unknown>
}

/**
 * Thunk middleware configuration
 */
export interface ThunkMiddlewareConfig {
  /** Extra argument that can be passed to thunks */
  extraArgument?: unknown
  /** Custom dispatch identifier */
  dispatchKey?: string
}

/**
 * Creates a thunk-enabled store wrapper
 *
 * @param store - The base RGS store
 * @param config - Optional thunk configuration
 * @returns Store with thunk support
 *
 * @example
 * const store = createStore({ namespace: 'app' })
 * const thunkStore = createThunkStore(store)
 *
 * // Use async thunks
 * await thunkStore.dispatch(async (dispatch, getState) => {
 *   dispatch({ type: 'LOADING', payload: true })
 *
 *   const user = await fetchUser()
 *   dispatch({ type: 'SET_USER', payload: user })
 *
 *   dispatch({ type: 'LOADING', payload: false })
 * })
 */
export const createThunkStore = <S extends Record<string, unknown>>(
  store: IStore<S>,
  config?: ThunkMiddlewareConfig
): IStore<S> & {
  dispatch: ThunkDispatch<S>
} => {
  const extraArgument = config?.extraArgument

  /**
   * Extended dispatch that accepts thunks
   */
  const dispatch = async <R>(
    action: ThunkAction<R, S> | ThunkActionPayload<S>
  ): Promise<R> => {
    // If it's a thunk action, execute it
    if (typeof action === 'function') {
      return (action as ThunkAction<R, S>)(
        dispatch as ThunkDispatch<S>,
        () => store.getSnapshot() as S,
        extraArgument
      )
    }

    // Otherwise, it's a plain action - handle synchronously
    if (action.type) {
      const { type, payload } = action

      // Find the key from action type (convention: 'SET_KEY' -> 'key')
      const keyMatch = type.match(/^SET_(.+)$/i)
      if (keyMatch && keyMatch[1]) {
        const key = keyMatch[1].toLowerCase()
        store.set(key, payload)
      }

      // Find remove action
      const removeMatch = type.match(/^REMOVE_(.+)$/i)
      if (removeMatch && removeMatch[1]) {
        const key = removeMatch[1].toLowerCase()
        store.remove(key)
      }
    }

    return undefined as R
  }

  // Attach dispatch to store
  return Object.assign(store, { dispatch })
}

/**
 * Create action creators for a store
 *
 * @param store - The RGS store
 * @returns Object with typed action creators
 *
 * @example
 * const store = createStore({ namespace: 'app' })
 * const actions = createActions(store, {
 *   increment: (amount: number) => ({ type: 'SET_COUNTER', payload: store.get('counter') + amount }),
 *   fetchData: async () => {
 *     const data = await fetch('/api/data').then(r => r.json())
 *     return { type: 'SET_DATA', payload: data }
 *   }
 * })
 *
 * // Use
 * store.dispatch(actions.increment(5))
 * await store.dispatch(actions.fetchData())
 */
export const createActions = <S extends Record<string, unknown>, T extends Record<string, unknown>>(
  store: IStore<S>,
  creators: T
): T & { dispatch: ThunkDispatch<S> } => {
  const thunkStore = createThunkStore(store)
  return Object.assign(thunkStore.dispatch, creators) as unknown as T & { dispatch: ThunkDispatch<S> }
}

/**
 * Helper to create async actions with automatic loading/error handling
 *
 * @param key - Store key to manage
 * @param fetcher - Async function to fetch data
 * @returns Action creator
 *
 * @example
 * const store = createStore({ namespace: 'app' })
 *
 * const fetchUser = createAsyncAction(
 *   'user',
 *   async () => {
 *     const response = await fetch('/api/user')
 *     return response.json()
 *   }
 * )
 *
 * // Use
 * await store.dispatch(fetchUser)
 * // Automatically sets: { user: { data: ..., loading: false, error: null } }
 */
export const createAsyncAction = <T>(
  key: string,
  fetcher: () => Promise<T>
): ThunkAction<T, Record<string, { data: T | null; loading: boolean; error: Error | null }>> => {
  return async (dispatch, getState) => {
    const state = getState()
    const current = state[key as keyof typeof state] as { data: T | null; loading: boolean; error: Error | null } | undefined

    // Set loading
    dispatch({
      type: `SET_${key.toUpperCase()}`,
      payload: { ...current, loading: true, error: null }
    })

    try {
      const result = await fetcher()

      // Set data
      dispatch({
        type: `SET_${key.toUpperCase()}`,
        payload: { data: result, loading: false, error: null }
      })

      return result
    } catch (error) {
      // Set error
      dispatch({
        type: `SET_${key.toUpperCase()}`,
        payload: {
          data: current?.data ?? null,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error))
        }
      })

      throw error
    }
  }
}

/**
 * Create a set of async actions with common patterns
 *
 * @param store - The RGS store
 * @param actions - Map of action names to async functions
 * @returns Dispatcher with all actions
 *
 * @example
 * const store = createStore({ namespace: 'app' })
 *
 * const api = createAsyncActions(store, {
 *   fetchUser: () => fetch('/api/user').then(r => r.json()),
 *   fetchPosts: () => fetch('/api/posts').then(r => r.json()),
 *   createPost: (post) => fetch('/api/posts', {
 *     method: 'POST',
 *     body: JSON.stringify(post)
 *   }).then(r => r.json())
 * })
 *
 * // Use
 * await store.dispatch(api.fetchUser())
 * await store.dispatch(api.createPost({ title: 'Hello' }))
 */
export const createAsyncActions = <S extends Record<string, unknown>>(
  store: IStore<S>,
  actions: Record<string, () => Promise<unknown>>
): Record<string, ThunkAction<unknown, S>> => {
  const _thunkStore = createThunkStore(store)

  const result: Record<string, ThunkAction<unknown, S>> = {}

  for (const [name, fetcher] of Object.entries(actions)) {
    result[name] = createAsyncAction(name, fetcher) as ThunkAction<unknown, S>
  }

  return result
}

// ============================================================================
// Saga-like Effects (Simplified)
// ============================================================================

/**
 * Effect types for saga-like patterns
 */
export type Effect =
  | { type: 'call'; fn: () => Promise<unknown>; args?: unknown[] }
  | { type: 'put'; action: ThunkActionPayload<Record<string, unknown>> }
  | { type: 'select'; selector: (state: Record<string, unknown>) => unknown }
  | { type: 'take'; pattern: string | ((action: ThunkActionPayload) => boolean) }
  | { type: 'all'; effects: Effect[] }
  | { type: 'race'; effects: Record<string, Effect> }

/**
 * Run effects in sequence
 */
export const call = (fn: () => Promise<unknown>, ...args: unknown[]): Effect => ({
  type: 'call',
  fn,
  args
})

/**
 * Dispatch an action
 */
export const put = (action: ThunkActionPayload<Record<string, unknown>>): Effect => ({
  type: 'put',
  action
})

/**
 * Select from state
 */
export const select = (selector: (state: Record<string, unknown>) => unknown): Effect => ({
  type: 'select',
  selector
})

/**
 * Wait for a specific action
 */
export const take = (pattern: string | ((action: ThunkActionPayload) => boolean)): Effect => ({
  type: 'take',
  pattern
})

/**
 * Run effects in parallel
 */
export const all = (effects: Effect[]): Effect => ({
  type: 'all',
  effects
})

/**
 * Race multiple effects
 */
export const race = (effects: Record<string, Effect>): Effect => ({
  type: 'race',
  effects
})

/**
 * Create a saga (generator-based async flow)
 *
 * @param generator - Generator function that yields effects
 * @returns Thunk action that runs the saga
 *
 * @example
 * const watchFetchUser = function*() {
 *   while (true) {
 *     yield take('FETCH_USER')
 *
 *     yield put({ type: 'SET_LOADING', payload: true })
 *
 *     try {
 *       const user = yield call(() => fetch('/api/user').then(r => r.json()))
 *       yield put({ type: 'SET_USER', payload: user })
 *     } catch (error) {
 *       yield put({ type: 'SET_ERROR', payload: error })
 *     }
 *
 *     yield put({ type: 'SET_LOADING', payload: false })
 *   }
 * }
 *
 * const store = createStore({ namespace: 'app' })
 * const sagaStore = createThunkStore(store)
 *
 * // Run saga
 * sagaStore.dispatch(createSaga(watchFetchUser))
 */
export const createSaga = <S extends Record<string, unknown>>(
  generator: Generator<Effect, void, unknown>
): ((dispatch: ThunkDispatch<S>, getState: () => S, extraArgument?: unknown) => Promise<void>) => {
  return async (dispatch: ThunkDispatch<S>, getState: () => S): Promise<void> => {
    const runEffect = async (effect: Effect): Promise<unknown> => {
      switch (effect.type) {
        case 'call':
          return effect.fn()

        case 'put':
          return dispatch(effect.action)

        case 'select':
          return effect.selector(getState())

        case 'all':
          return Promise.all(effect.effects.map(runEffect))

        case 'race': {
          const promises = Object.fromEntries(
            Object.entries(effect.effects).map(([key, eff]) => [
              key,
              runEffect(eff)
            ])
          )
          return Promise.race(Object.values(promises))
        }

        default:
          return undefined
      }
    }

    try {
      let result = generator.next()

      while (!result.done) {
        await runEffect(result.value as Effect)
        result = generator.next()
      }
    } catch (error) {
      console.error('[gstate] Saga error:', error)
    }
  }
}

/**
 * Run a saga and return a cancel function
 */
export const runSaga = <S extends Record<string, unknown>>(
  store: IStore<S>,
  saga: ThunkAction<void, S>
): (() => void) => {
  const _thunkStore = createThunkStore(store)

  // Start the saga
  const _promise = _thunkStore.dispatch(saga as ThunkAction<unknown, S>)

  // Return cancel function
  return () => {
    // Note: For true cancellation, we'd need to implement cancellation tokens
    // This is a simplified version
    console.debug('[gstate] Saga cancel requested')
  }
}

// ============================================================================
// Export all
// ============================================================================

export default {
  createThunkStore,
  createActions,
  createAsyncAction,
  createAsyncActions,
  call,
  put,
  select,
  take,
  all,
  race,
  createSaga,
  runSaga
}
