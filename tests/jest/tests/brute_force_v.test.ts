import { createStore, destroyState } from '../../../index'

describe('RGS Brutal Force Test Suite (Core Only)', () => {

  beforeEach(() => {
    destroyState()
  })

  test('Concurrency: 1000 "parallel" async sets', async () => {
    const store = createStore({ namespace: 'brute-concurrency', immer: true })
    const operations = []

    for (let i = 0; i < 1000; i++) {
      operations.push((async () => {
        store.set(`key_${i}`, { val: i, time: performance.now() })
      })())
    }

    const start = performance.now()
    await Promise.all(operations)
    const end = performance.now()

    expect(store.list()).not.toBeNull()
    const keys = Object.keys(store.list())
    expect(keys.length).toBe(1000)
    console.info(`[BruteForce] 1000 concurrent sets: ${(end - start).toFixed(2)}ms`)
  })

  test('Deep Nesting: 100-level deep object (Recursion Test)', () => {
    const store = createStore({ namespace: 'brute-deep', validateInput: true })

    const buildDeep = (depth: number): any => {
      if (depth === 0) return { leaf: 'data' }
      return { node: buildDeep(depth - 1) }
    }

    const deepObj = buildDeep(100)

    const start = performance.now()
    store.set('deep_key', deepObj)
    const end = performance.now()

    const retrieved: any = store.get('deep_key')
    expect(retrieved).toBeDefined()
    // Verify leaf at 100 levels
    let current = retrieved
    for (let i = 0; i < 100; i++) current = current.node
    expect(current.leaf).toBe('data')

    console.info(`[BruteForce] 100-level deep object (Set+Get): ${(end - start).toFixed(2)}ms`)
  })

  test('Transaction Overload: 500 transactions / 100 ops each', () => {
    const store = createStore({ namespace: 'brute-tx' })
    const start = performance.now()

    for (let t = 0; t < 500; t++) {
      store.transaction(() => {
        for (let o = 0; o < 100; o++) {
          store.set(`tx_${t}_op_${o}`, o)
        }
      })
    }

    const end = performance.now()
    // 500 * 100 = 50,000 keys
    expect(Object.keys(store.list()).length).toBe(50000)
    console.info(`[BruteForce] 50,000 updates via 500 transactions: ${(end - start).toFixed(2)}ms`)
  })

  test('Memory Pressure: 10,000 large-ish keys (Total ~20MB)', () => {
    const store = createStore({
      namespace: 'brute-memory',
      maxTotalSize: 100 * 1024 * 1024 // 100MB limit for test
    })

    const largeStr = 'A'.repeat(2000) // 4KB string
    const start = performance.now()

    for (let i = 0; i < 10000; i++) {
      store.set(`mem_${i}`, { content: largeStr, index: i })
    }

    const end = performance.now()
    expect(Object.keys(store.list()).length).toBe(10000)
    console.info(`[BruteForce] 10,000 keys (~40MB raw state): ${(end - start).toFixed(2)}ms`)
  })

  test('RBAC Chaos: 1000 dynamic rules evaluation', () => {
    const rules = []
    for (let i = 0; i < 1000; i++) {
      rules.push({
        pattern: `key_${i}`,
        permissions: ['read', 'write'] as any
      })
    }

    const store = createStore({
      namespace: 'brute-rbac',
      userId: 'test-user',
      accessRules: rules as any
    })

    const start = performance.now()
    // Test access to the 1000th key (should iterate through rules or use cache)
    for (let j = 0; j < 500; j++) {
      store.set('key_999', j)
      store.get('key_999')
    }
    const end = performance.now()

    expect(store.get('key_999')).toBe(499)
    console.info(`[BruteForce] 1000 RBAC evaluations x 500 ops: ${(end - start).toFixed(2)}ms`)
  })
})
