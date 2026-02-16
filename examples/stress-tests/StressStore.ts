import { gstate } from '../../index'

/**
 * Rapid Fire Stress Test
 * Tests RGS ability to handle massive bursts of updates.
 */
export const useRapidStore = gstate({
  updates: 0,
  lastBatchTime: 0
})

export const runRapidFire = (iterations: number = 1000) => {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    useRapidStore.set('updates', i + 1)
  }
  const end = performance.now()
  useRapidStore.set('lastBatchTime', end - start)
  return end - start
}

/**
 * Big Payload Stress Test
 * Tests memory handling and cloning performance with large objects.
 */
export const usePayloadStore = gstate({
  data: {} as any
})

export const generateBigPayload = (keys: number = 5000) => {
  const bigObj: Record<string, any> = {}
  for (let i = 0; i < keys; i++) {
    bigObj[`key_${i}`] = {
      id: i,
      value: Math.random(),
      meta: { timestamp: Date.now(), tags: ['test', 'stress', 'payload'] }
    }
  }

  const start = performance.now()
  usePayloadStore.set('data', bigObj)
  const end = performance.now()
  return end - start
}

/**
 * Computed Chain Stress Test
 * Tests dependency tracking and recursive updates.
 */
export const useChainStore = gstate({
  base: 0
})

// Create a chain of 5 computed values
export const setupChain = () => {
  useChainStore.compute('level1', (get) => (get<number>('base') || 0) + 1)
  useChainStore.compute('level2', (get) => (get<number>('level1') || 0) + 1)
  useChainStore.compute('level3', (get) => (get<number>('level2') || 0) + 1)
  useChainStore.compute('level4', (get) => (get<number>('level3') || 0) + 1)
  useChainStore.compute('level5', (get) => (get<number>('level4') || 0) + 1)
}
