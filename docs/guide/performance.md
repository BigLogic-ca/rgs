# Performance

Optimize your RGS implementation for maximum performance.

## Optimization Tips

### 1. Use Transactions for Batch Updates

```typescript
// BAD: Causes multiple re-renders
setState('a', 1)
setState('b', 2)
setState('c', 3)

// GOOD: Single re-render
transaction(() => {
  setState('a', 1)
  setState('b', 2)
  setState('c', 3)
})
```

### 2. Avoid Storing Large Objects

```typescript
// BAD: Large objects cause slow serialization
setState('bigData', hugeObject)

// GOOD: Break into smaller pieces
setState('data.part1', part1)
setState('data.part2', part2)
```

### 3. Use Selectors for Derived State

```typescript
// BAD: Recomputes on every render
const MyComponent = () => {
  const [items] = useStore('items')
  const active = items.filter(i => i.active) // Recomputed each render
  return <List items={active} />
}

// GOOD: Memoized with computed
computed('items', (items) => items.filter(i => i.active))
const MyComponent = () => {
  const [active] = useStore('items.active')
  return <List items={active} />
}
```

### 4. Flatten State When Possible

```typescript
// BAD: Deep nesting
initState({
  user: {
    profile: {
      settings: {
        theme: 'dark'
      }
    }
  }
})
// Access: useStore('user.profile.settings.theme')

// GOOD: Flat structure
initState({
  'user.profile.settings.theme': 'dark'
})
// Access: useStore('user.profile.settings.theme')
```

### 5. Use Namespaces to Isolate State

```typescript
// Isolate frequently-updated state from stable state
initState(frequentState, { namespace: 'frequent' })
initState(stableState, { namespace: 'stable' })
```

### 6. Avoid Unnecessary Subscriptions

```typescript
// BAD: Subscribes to entire state
const [allState] = useStore('*') // Subscribe to everything

// GOOD: Subscribe only to needed keys
const [user] = useStore('user')
const [settings] = useStore('settings')
```

## Performance Benchmarks

### Current Benchmarks

| Operation | Time (ms) | Notes |
|-----------|------------|-------|
| 10k key sets | ~690ms | Individual updates |
| 10k key gets | ~1559ms | Individual reads |
| 1,000 transactions (50 updates each) | ~297ms | Batched updates |
| 100-level deep object (set+get) | ~12ms | Nested object access |
| 50 namespaces x 100 keys | ~55ms | Namespaced state |
| 1,000 updates with 100 listeners | ~17ms | High listener count |

### Running Benchmarks

Create a benchmark suite:

```typescript
// benchmark.test.ts
const benchmarks = [
  {
    name: '10k key sets',
    run: () => {
      initState({})
      const start = performance.now()
      for (let i = 0; i < 10000; i++) {
        setState(`key_${i}`, i)
      }
      return performance.now() - start
    }
  },
  {
    name: '10k key gets',
    run: () => {
      initState({})
      for (let i = 0; i < 10000; i++) {
        setState(`key_${i}`, i)
      }
      const start = performance.now()
      for (let i = 0; i < 10000; i++) {
        getState(`key_${i}`)
      }
      return performance.now() - start
    }
  }
]

benchmarks.forEach(b => {
  const time = b.run()
  console.log(`${b.name}: ${time.toFixed(2)}ms`)
})
```

## Memory Management

### Cleaning Up Subscriptions

```typescript
// Always unsubscribe when done
const unsubscribe = watch('counter', callback)

// Later...
unsubscribe()
```

### Avoiding Memory Leaks

```typescript
// In React components, use built-in cleanup
const MyComponent = () => {
  useEffect(() => {
    const unsubscribe = watch('counter', callback)
    return () => unsubscribe() // Cleanup on unmount
  }, [])
}
```

## Measuring Performance

### Using Performance API

```typescript
import { performance } from 'perf_hooks'

const measureOperation = (name: string, fn: () => void) => {
  const start = performance.now()
  fn()
  const end = performance.now()
  console.log(`${name}: ${(end - start).toFixed(2)}ms`)
}

measureOperation('setState', () => {
  setState('key', 'value')
})
```

### React DevTools Profiler

Use React DevTools Profiler to identify unnecessary re-renders:

1. Open React DevTools
2. Switch to Profiler tab
3. Record while interacting with your app
4. Analyze re-render patterns

## Next Steps

- [Best Practices](best-practices.md) - Performance best practices
- [Testing](testing.md) - Performance testing
