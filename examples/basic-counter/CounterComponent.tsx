import React from 'react'
import { useCounter, increment, decrement } from './CounterStore'

/**
 * Counter Component
 * Demonstrates the "Magnetar" pattern where the store IS the hook.
 */
export const CounterComponent: React.FC = () => {
  // Subscribe to specific keys for fine-grained re-renders
  const [count] = useCounter('count')
  const [lastUpdated] = useCounter('lastUpdated')

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc' }}>
      <h2>Counter: {String(count)}</h2>
      <p><small>Last updated: {String(lastUpdated)}</small></p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={() => useCounter.set('count', 0)}>Reset</button>
    </div>
  )
}
