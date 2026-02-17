import { gstate, destroyState } from '../../../index'

describe('RGS Stress Test Validation', () => {

  beforeEach(() => {
    destroyState()
  })

  test('Rapid Fire: handle 1000 synchronous sets', () => {
    const store = gstate({ count: 0 })
    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      store.set('count', i + 1)
    }
    const end = performance.now()
    expect(store.get('count')).toBe(1000)
    console.info(`[Stress] Rapid Fire (1000 updates): ${(end - start).toFixed(2)}ms`)
  })

  test('Big Payload: handle 2000 keys object', () => {
    const store = gstate({ data: {} })
    const bigObj: any = {}
    for (let i = 0; i < 2000; i++) bigObj[`k${i}`] = { val: i }

    const start = performance.now()
    store.set('data', bigObj)
    const end = performance.now()

    expect(Object.keys(store.get<any>('data')).length).toBe(2000)
    expect(end - start).toBeLessThan(500)
    console.info(`[Stress] Big Payload (2000 keys): ${(end - start).toFixed(2)}ms`)
  })

  test('Computed Chain: recursive dependency updates', () => {
    const store = gstate({ base: 0 })

    // Define chain
    store.compute('l1', (get) => (get<number>('base') || 0) + 1)
    store.compute('l2', (get) => (get<number>('l1') || 0) + 1)
    store.compute('l3', (get) => (get<number>('l2') || 0) + 1)
    store.compute('l4', (get) => (get<number>('l3') || 0) + 1)
    store.compute('l5', (get) => (get<number>('l4') || 0) + 1)

    // Initial check
    expect(store.compute('l5', () => 0)).toBe(5)

    // Update base
    store.set('base', 10)

    // Should be 15
    const final = store.compute('l5', () => 0)
    expect(final).toBe(15)

    console.info(`[Stress] Computed Chain verified: base(10) -> l5(${final})`)
  })
})
