import { gstate } from '../../index'

export interface CounterState extends Record<string, unknown> {
  count: number
  lastUpdated: string
}

/**
 * Basic Counter Store
 * RECOMMENDED FOR: Frontend (FE)
 */
export const useCounter = gstate<CounterState>({
  count: 0,
  lastUpdated: new Date().toISOString()
})

export const increment = () => {
  useCounter.set('count', (d) => d + 1)
  useCounter.set('lastUpdated', new Date().toISOString())
}

export const decrement = () => {
  useCounter.set('count', (d) => d - 1)
  useCounter.set('lastUpdated', new Date().toISOString())
}
