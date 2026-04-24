# Quick Start

Get up and running with RGS in minutes.

## Basic Store Setup

Create a store file to initialize your state:

```typescript
// store.ts
import { initState } from '@biglogic/rgs'

// Initialize with initial state
const store = initState({
  counter: 0,
  user: { name: 'John', role: 'admin' },
  settings: { theme: 'dark' }
})

export default store
```

## Using in React Components

The primary way to interact with RGS in components is through the `useStore` hook:

```tsx
// Counter.tsx
import React from 'react'
import { useStore } from '@biglogic/rgs'

export const Counter: React.FC = () => {
  // useStore returns [value, setter] tuple
  const [count, setCount] = useStore<number>('counter')
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button onClick={() => setCount(count - 1)}>
        Decrement
      </button>
    </div>
  )
}
```

## Computed Values

Create derived state that automatically updates when dependencies change:

```typescript
import { computed } from '@biglogic/rgs'

// Create a computed value that reacts to state changes
const doubledCount = computed('counter', (count) => count * 2)

// Use in component
const [doubled] = useStore<number>('doubledCount')
```

## Reading State Without Subscription

Use `getState` to read state without subscribing to changes:

```typescript
import { getState } from '@biglogic/rgs'

// Read state anywhere in your code
const currentUser = getState<User>('user')
console.log('Current user:', currentUser)
```

## Updating State

Update state with the setter or `setState` function:

```typescript
import { setState } from '@biglogic/rgs'

// Using the setter from useStore
const [name, setName] = useStore<string>('user.name')
setName('Alice')

// Using setState directly
setState('settings.theme', 'light')
```

## Watching for Changes

Subscribe to state changes with `watch`:

```typescript
import { watch } from '@biglogic/rgs'

// Watch a single key
const unsubscribe = watch('counter', (newValue, oldValue) => {
  console.log(`Counter changed: ${oldValue} -> ${newValue}`)
})

// Watch multiple keys
watch(['user', 'settings'], (changes) => {
  console.log('State changed:', changes)
})

// Stop watching
unsubscribe()
```

## Complete Example

Here's a complete working example:

```tsx
// App.tsx
import React from 'react'
import { initState, useStore, useState } from '@biglogic/rgs'

// Initialize once at app root
initState({
  todos: [] as string[],
  filter: 'all' as 'all' | 'active' | 'completed'
})

export const TodoApp: React.FC = () => {
  const [todos, setTodos] = useStore<string[]>('todos')
  const [filter, setFilter] = useStore<'all' | 'active' | 'completed'>('filter')
  
  const addTodo = (text: string) => {
    setTodos([...todos, text])
  }
  
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return true // Simplified
    return true
  })
  
  return (
    <div>
      <h1>Todo App</h1>
      <ul>
        {filteredTodos.map((todo, i) => (
          <li key={i}>{todo}</li>
        ))}
      </ul>
    </div>
  )
}
```

## Next Steps

- [Core Concepts](core-concepts.md) - Deep dive into RGS concepts
- [API Reference](api-reference.md) - Complete API documentation
- [Advanced Usage](advanced-usage.md) - Transactions, plugins, persistence
