import { renderHook, act } from '@testing-library/react'
import { createStore, useStore, immerPlugin, undoRedoPlugin, destroyState } from '../../../index'

/**
 * Test state interface with index signature for Record compatibility
 */
interface TestState {
  user: { name: string }
  count: number
  [key: string]: unknown
}

/**
 * Ecosystem Integration Tests
 * Tests for plugins working together with React hooks
 */
describe('Ecosystem Integration', () => {
  let store: any

  beforeEach(() => {
    localStorage.clear()
    destroyState()
    store = createStore<TestState>({ namespace: 'integration-test' })
    // Add both plugins
    store._addPlugin(immerPlugin())
    store._addPlugin(undoRedoPlugin())
  })

  afterEach(() => {
    store.destroy()
  })

  it('should create a store with plugins', () => {
    // Check that the new plugin methods exist in namespaced API
    expect(typeof store.plugins.immer?.setWithProduce).toBe('function')
    expect(typeof store.plugins.undoRedo?.undo).toBe('function')
    expect(typeof store.plugins.undoRedo?.redo).toBe('function')
  })

  it('should use immer plugin to update nested state', () => {
    store.set('user', { name: 'John' })

    // Use the method provided by the immer plugin via namespaced API
    store.plugins.immer?.setWithProduce('user', (draft: any) => {
      draft.name = 'Jane'
    })

    expect(store.get('user').name).toBe('Jane')
  })

  it('should use undo-redo plugin to manage history', () => {
    store.set('count', 1)
    expect(store.get('count')).toBe(1)
    expect(store.plugins.undoRedo?.canUndo()).toBe(true)
    expect(store.plugins.undoRedo?.canRedo()).toBe(false)

    store.set('count', 2)
    expect(store.get('count')).toBe(2)

    // Use the method provided by the undo-redo plugin via namespaced API
    store.plugins.undoRedo?.undo()
    expect(store.get('count')).toBe(1)
    expect(store.plugins.undoRedo?.canUndo()).toBe(true)
    expect(store.plugins.undoRedo?.canRedo()).toBe(true)

    store.plugins.undoRedo?.redo()
    expect(store.get('count')).toBe(2)
  })

  it.skip('should work seamlessly with the useStore hook', () => {
    store.set('count', 10)
    const { result } = renderHook(() => useStore('count', store))

    expect(result.current[0]).toBe(10)

    act(() => {
      result.current[1](20)
    })

    expect(result.current[0]).toBe(20)
  })

  it('should handle both plugins together', () => {
    store.set('user', { name: 'Alice' })

    act(() => {
      // Use immer via namespaced API
      store.plugins.immer?.setWithProduce('user', (draft: any) => { draft.name = 'Bob' })
    })
    expect(store.get('user').name).toBe('Bob')
    expect(store.plugins.undoRedo?.canUndo()).toBe(true)

    // Use undo via namespaced API
    store.plugins.undoRedo?.undo()
    expect(store.get('user').name).toBe('Alice')
  })
})
