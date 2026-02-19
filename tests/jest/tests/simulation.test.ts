
import { createStore } from '../../../core/store'
import type { IPlugin } from '../../../core/types'

describe('100M$ DOLLAR SIMULATION 🚀', () => {

  // --- Scenario 1: Basic Store ---
  test('Scenario 1: Basic Store - Increment', () => {
    console.log('--- Scenario 1: Basic Store ---')
    const store = createStore<{ count: number }>({
      namespace: 'sim-basic',
      silent: true
    })
    store.set('count', 0)
    expect(store.get('count')).toBe(0)

    store.set('count', (c: number) => c + 1)
    expect(store.get('count')).toBe(1)
    console.log('✅ Basic Store OK')
  })


  // --- Scenario 2: Computed Values ---
  test('Scenario 2: Computed Values', () => {
    console.log('--- Scenario 2: Computed Values ---')
    const userStore = createStore<{ firstName: string, lastName: string }>({
      namespace: 'sim-computed', silent: true
    })
    userStore.set('firstName', 'John')
    userStore.set('lastName', 'Doe')

    // Using string selector for computed value as per API
    const fullName = userStore.compute('fullName', (get) => `${get('firstName')} ${get('lastName')}`)
    expect(fullName).toBe('John Doe')

    // Update dependency
    userStore.set('firstName', 'Jane')
    // Re-access computed (should update)
    const newFullName = userStore.compute('fullName', (get) => `${get('firstName')} ${get('lastName')}`)
    expect(newFullName).toBe('Jane Doe')
    console.log('✅ Computed Values OK')
  })


  // --- Scenario 3: Plugin System (Counter Plugin from Docs) ---
  test('Scenario 3: Custom Plugin', () => {
    console.log('--- Scenario 3: Custom Plugin ---')

    let _count = 0
    const counterPlugin = (): IPlugin => {
      return {
        name: 'counter',
        hooks: {
          onInstall: ({ store }) => {
            store._registerMethod('counter', 'increment', () => { _count++; return _count })
            store._registerMethod('counter', 'getCount', () => _count)
          }
        }
      }
    }

    const pluginStore = createStore({ namespace: 'sim-plugin', silent: true })
    pluginStore._addPlugin(counterPlugin())

    // Access via plugins namespace (Need to cast or extend type for TS in strict check, but at runtime it just works)
    const increment = (pluginStore.plugins as any).counter.increment
    const getCount = (pluginStore.plugins as any).counter.getCount

    expect(increment()).toBe(1)
    expect(increment()).toBe(2)
    expect(getCount()).toBe(2)
    console.log('✅ Custom Plugin OK')
  })


  // --- Scenario 4: Transactions ---
  test('Scenario 4: Transactions', () => {
    console.log('--- Scenario 4: Transactions ---')
    const txStore = createStore<{ a: number, b: number }>({ namespace: 'sim-tx', silent: true })
    txStore.set('a', 1)
    txStore.set('b', 1)

    let renderCount = 0
    txStore._subscribe(() => { renderCount++ })

    txStore.transaction(() => {
      txStore.set('a', 2)
      txStore.set('b', 2)
      txStore.set('a', 3)
    })

    expect(txStore.get('a')).toBe(3)
    expect(txStore.get('b')).toBe(2)
    expect(renderCount).toBe(1) // Should only render/notify once
    console.log('✅ Transactions OK')
  })


  // --- Scenario 5: Type-Safe Selectors (v3.5.0) ---
  test('Scenario 5: Type-Safe Selectors', () => {
    console.log('--- Scenario 5: Type-Safe Selectors ---')
    const store = createStore<{ user: { name: string, age: number }, theme: string }>({
      namespace: 'sim-selectors', silent: true
    })

    store.set('user', { name: 'Alice', age: 25 })
    store.set('theme', 'dark')

    // Simulate Selector Access (getSnapshot usage)
    const snapshot = store.getSnapshot()
    const userName = snapshot.user.name
    const theme = snapshot.theme

    expect(userName).toBe('Alice')
    expect(theme).toBe('dark')

    // Update Store
    store.set('user', { name: 'Bob', age: 30 })

    // Verify Snapshot Update
    const newSnapshot = store.getSnapshot()
    expect(newSnapshot.user.name).toBe('Bob')
    expect(newSnapshot.theme).toBe('dark') // Should remain same

    // Verify Referential Stability (Snapshot object identity changes on write)
    expect(snapshot).not.toBe(newSnapshot)

    console.log('✅ Type-Safe Selectors OK')
  })

})
