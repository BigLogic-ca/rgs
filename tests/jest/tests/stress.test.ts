/**
 * Stress Tests - Enterprise Level Performance
 * Tests with 10k+ keys to verify scalability
 */
import { describe, test, expect, beforeEach } from '@jest/globals'
import { createStore, destroyState } from '../../../index'

describe('Stress Tests - Enterprise Performance', () => {

  test('should handle 10,000 keys efficiently', () => {
    const store = createStore({ namespace: 'stress-10k', silent: true })
    const start = performance.now()

    // Set 10,000 keys
    for (let i = 0; i < 10000; i++) {
      store.set(`key_${i}`, { id: i, data: `value_${i}`, nested: { a: i, b: i * 2 } })
    }

    const setTime = performance.now() - start
    console.log(`Set 10k keys: ${setTime.toFixed(2)}ms`)

    // Get 10,000 keys
    const getStart = performance.now()
    for (let i = 0; i < 10000; i++) {
      const val = store.get(`key_${i}`)
      expect(val).toBeTruthy()
    }
    const getTime = performance.now() - getStart
    console.log(`Get 10k keys: ${getTime.toFixed(2)}ms`)

    // Should complete in reasonable time (< 2 seconds for set, < 1.5 seconds for get)
    expect(setTime).toBeLessThan(2000)
    expect(getTime).toBeLessThan(1500)
  }, 30000)

  test('should handle 1,000 updates to same key', () => {
    const store = createStore({ namespace: 'stress-update', silent: true })

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      store.set('counter', { count: i, timestamp: Date.now() })
    }
    const updateTime = performance.now() - start
    console.log(`1,000 updates: ${updateTime.toFixed(2)}ms`)

    expect(store.get('counter')).toEqual({ count: 999, timestamp: expect.any(Number) })
    expect(updateTime).toBeLessThan(500)
  })

  test('should handle rapid set/get cycles', () => {
    const store = createStore({ namespace: 'stress-rapid', silent: true })
    const iterations = 5000

    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      store.set('rapid', { i })
      const val = store.get('rapid')
      expect(val).toEqual({ i })
    }
    const rapidTime = performance.now() - start
    console.log(`${iterations} rapid cycles: ${rapidTime.toFixed(2)}ms`)

    expect(rapidTime).toBeLessThan(1000)
  })

  test('should handle large object values', () => {
    const store = createStore({ namespace: 'stress-large', silent: true })

    // Create a large object (approx 100KB)
    const largeObj = {
      data: Array(10000).fill(0).map((_, i) => ({ id: i, value: `item_${i}` }))
    }

    const start = performance.now()
    store.set('large', largeObj)
    const setTime = performance.now() - start

    const getStart = performance.now()
    const retrieved = store.get('large')
    const getTime = performance.now() - getStart

    console.log(`Large object (100KB) - Set: ${setTime.toFixed(2)}ms, Get: ${getTime.toFixed(2)}ms`)

    expect(retrieved).toEqual(largeObj)
    expect(setTime).toBeLessThan(150)
    expect(getTime).toBeLessThan(50)
  })

  test('should handle multiple namespaces efficiently', () => {
    const namespaces = 50
    const keysPerNamespace = 100

    const start = performance.now()
    for (let n = 0; n < namespaces; n++) {
      const store = createStore({ namespace: `stress-ns-${n}`, silent: true })
      for (let k = 0; k < keysPerNamespace; k++) {
        store.set(`key_${k}`, { namespace: n, key: k })
      }
    }
    const multiTime = performance.now() - start
    console.log(`${namespaces} namespaces x ${keysPerNamespace} keys: ${multiTime.toFixed(2)}ms`)

    expect(multiTime).toBeLessThan(3000)
  }, 10000)

  test('should maintain performance with listeners', () => {
    const store = createStore({ namespace: 'stress-listeners', silent: true })

    // Add 100 listeners
    for (let i = 0; i < 100; i++) {
      store._subscribe(() => { /* no-op */ })
    }

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      store.set('key', { i })
    }
    const listenerTime = performance.now() - start
    console.log(`1,000 updates with 100 listeners: ${listenerTime.toFixed(2)}ms`)

    expect(listenerTime).toBeLessThan(2000)
  })
})
