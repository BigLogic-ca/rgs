# Testing

Comprehensive testing strategies for RGS applications.

## Unit Testing with Jest

### Basic Test Setup

```typescript
// store.test.ts
import { initState, getState, setState, useStore } from '@biglogic/rgs'
import { renderHook, act } from '@testing-library/react'

describe('Store', () => {
  beforeEach(() => {
    initState({ counter: 0 })
  })

  test('should initialize with initial state', () => {
    expect(getState('counter')).toBe(0)
  })

  test('should update state', () => {
    act(() => {
      setState('counter', 5)
    })
    expect(getState('counter')).toBe(5)
  })

  test('hook should update component', () => {
    const { result } = renderHook(() => useStore<number>('counter'))
    
    expect(result.current[0]).toBe(0)
    
    act(() => {
      result.current[1](10)
    })
    
    expect(result.current[0]).toBe(10)
  })
})
```

### Testing with Different Initial States

```typescript
test('should handle complex state', () => {
  initState({
    user: { name: 'John', role: 'admin' },
    settings: { theme: 'dark' }
  })
  
  const user = getState('user')
  expect(user.name).toBe('John')
  expect(user.role).toBe('admin')
})
```

### Testing Computed Values

```typescript
import { computed } from '@biglogic/rgs'

test('should compute derived values', () => {
  initState({ price: 100, quantity: 2 })
  
  computed('price', (price) => price * 1.2)
  
  const [withTax] = useStore<number>('price_withTax')
  expect(withTax).toBe(120)
})
```

## Integration Testing

### Testing Transactions

```typescript
// integration.test.ts
import { initState, transaction, watch } from '@biglogic/rgs'

test('transaction should batch updates', () => {
  initState({ a: 0, b: 0, c: 0 })
  
  const changes: string[] = []
  watch(['a', 'b', 'c'], () => {
    changes.push('changed')
  })
  
  transaction(() => {
    setState('a', 1)
    setState('b', 2)
    setState('c', 3)
  })
  
  // Should only trigger one change notification
  expect(changes.length).toBe(1)
})
```

### Testing React Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { RGSProvider, useStore } from '@biglogic/rgs'

const TestComponent = () => {
  const [count, setCount] = useStore<number>('counter')
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  )
}

test('component should update on state change', () => {
  initState({ counter: 0 })
  
  render(
    <RGSProvider>
      <TestComponent />
    </RGSProvider>
  )
  
  expect(screen.getByTestId('count')).toHaveTextContent('0')
  
  fireEvent.click(screen.getByText('Increment'))
  
  expect(screen.getByTestId('count')).toHaveTextContent('1')
})
```

## Stress Testing

### High-Frequency Updates

```typescript
// stress.test.ts
test('handles high-frequency updates', () => {
  initState({})
  
  const start = performance.now()
  
  // 10,000 rapid updates
  for (let i = 0; i < 10000; i++) {
    setState(`key_${i % 100}`, i)
  }
  
  const elapsed = performance.now() - start
  console.log(`10k updates: ${elapsed}ms`)
  
  expect(elapsed).toBeLessThan(1000) // Should complete under 1 second
})
```

### Large State Objects

```typescript
test('handles large objects', () => {
  initState({})
  
  const largeObject = {}
  for (let i = 0; i < 1000; i++) {
    largeObject[`key_${i}`] = 'value'.repeat(100)
  }
  
  const start = performance.now()
  setState('large', largeObject)
  const elapsed = performance.now() - start
  
  expect(elapsed).toBeLessThan(500)
})
```

### Concurrent Updates

```typescript
import { transaction } from '@biglogic/rgs'

test('handles concurrent updates', async () => {
  initState({ counter: 0 })
  
  // Simulate concurrent updates
  const updates = Array(100).fill(null).map((_, i) => {
    return new Promise(resolve => {
      setTimeout(() => {
        transaction(() => {
          const current = getState<number>('counter')
          setState('counter', current + 1)
        })
        resolve(null)
      }, Math.random() * 10)
    })
  })
  
  await Promise.all(updates)
  expect(getState('counter')).toBe(100)
})
```

## Performance Benchmarks

Run these tests to establish performance baselines:

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| 10k key sets | ~690ms | Individual updates |
| 10k key gets | ~1559ms | Individual reads |
| 1,000 transactions (50 updates each) | ~297ms | Batched updates |
| 100-level deep object (set+get) | ~12ms | Nested object access |
| 50 namespaces x 100 keys | ~55ms | Namespaced state |
| 1,000 updates with 100 listeners | ~17ms | High listener count |

## Test Configuration

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'],
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.spec.ts']
}
```

### Test Utilities

```typescript
// test-utils.ts
import { initState } from '@biglogic/rgs'

export const setupTestStore = (initialState = {}) => {
  initState(initialState)
}

export const cleanup = () => {
  // Clean up after each test
}
```

## Next Steps

- [Performance](performance.md) - Optimization tips
- [Best Practices](best-practices.md) - Testing best practices
