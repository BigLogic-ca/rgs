import { act } from '@testing-library/react'
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { initState, destroyState, createAsyncStore } from '../../../index'
import type { IPlugin } from '../../../core/types'

/**
 * Argis (RGS) - React Globo State - Core Tests
 * Tests for async store, plugins, and immutability features
 */
describe('Argis (RGS)', () => {
  let store: any
  beforeEach(() => {
    localStorage.clear()
    destroyState()
    store = initState({ silent: true })
  })

  /**
 * Test: Async Store handles life-cycle automatically
 * Verifies loading/error/data state management
 */
  test('Async Store: Auto-handling life-cycle', async () => {
    const mockFetch = jest.fn(async () => ({ id: 1, name: 'Google' }))
    const asyncStore = createAsyncStore(mockFetch, { key: 'company' })

    // Initial State
    expect(asyncStore.get('company')?.loading).toBe(false)

    // Trigger
    const promise = (asyncStore as any).execute()
    expect(asyncStore.get('company')?.loading).toBe(true)

    await promise

    const state = asyncStore.get('company')
    expect(state?.loading).toBe(false)
    expect(state?.data?.name).toBe('Google')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  /**
 * Test: Plugins receive transaction hooks
 * Verifies onTransaction hook is called correctly
 */
  test('Plugins: Kernel Transaction Hook', () => {
    const log = jest.fn()
    const plugin: IPlugin = {
      name: 'tx-logger',
      hooks: {
        onTransaction: ({ key }) => { log(key) }
      }
    }

    store._addPlugin(plugin)

    store.transaction(() => {
      store.set('a', 1)
      store.set('b', 2)
    })

    expect(log).toHaveBeenCalledWith('START')
  })

  /**
 * Test: Store values are deeply frozen
 * Verifies Immer freeze prevents mutations
 */
  test('Immutability: Deep recursive freezing', () => {
    store.set('complex', { users: [{ id: 1, info: { age: 30 } }] })
    const state = store.get('complex')

    expect(() => {
      state.users[0].info.age = 31
    }).toThrow() // Deeply frozen by Immer
  })
})
