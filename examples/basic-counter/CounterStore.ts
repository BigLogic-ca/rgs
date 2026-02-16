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
  const current = useCounter.get('count') || 0
  useCounter.set('count', current + 1)
  useCounter.set('lastUpdated', new Date().toISOString())
}

export const decrement = () => {
  const current = useCounter.get('count') || 0
  useCounter.set('count', current - 1)
  useCounter.set('lastUpdated', new Date().toISOString())
}
