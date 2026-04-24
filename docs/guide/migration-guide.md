# Migration Guide

Migrate from other state management solutions to RGS.

## Migrating from Redux

### Redux to RGS Comparison

```typescript
// Redux
import { createStore } from 'redux'
const store = createStore(reducer)
store.dispatch({ type: 'SET_USER', payload: user })

// RGS equivalent
import { initState, setState } from '@biglogic/rgs'
const store = initState({ user: null })
setState('user', user)
```

### Redux Reducer to RGS

```typescript
// Redux reducer
function counterReducer(state = { value: 0 }, action) {
  switch (action.type) {
    case 'increment':
      return { ...state, value: state.value + 1 }
    case 'decrement':
      return { ...state, value: state.value - 1 }
    default:
      return state
  }
}

// RGS equivalent
initState({ counter: 0 })

// No reducer needed - just set state directly
const increment = () => {
  const [count, setCount] = useStore<number>('counter')
  setCount(count + 1)
}
```

### Redux Actions to RGS

```typescript
// Redux
dispatch({ type: 'ADD_TODO', payload: todo })

// RGS
setState('todos', [...getState('todos'), todo])

// Or with transaction
transaction(() => {
  const todos = getState('todos')
  setState('todos', [...todos, todo])
})
```

### Redux Middleware to RGS Plugins

```typescript
// Redux middleware
const logger = store => next => action => {
  console.log('dispatching', action)
  return next(action)
}

// RGS plugin equivalent
const loggerPlugin = {
  name: 'logger',
  beforeSet: (key, value) => {
    console.log(`Setting ${key} to:`, value)
    return value
  }
}

installPlugin(loggerPlugin)
```

## Migrating from Context API

### Context API to RGS

```typescript
// Context API
const UserContext = React.createContext(null)

const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  )
}

const user = useContext(UserContext)

// RGS equivalent
initState({ user: null })

const [user, setUser] = useStore('user')
// No Provider needed!
```

### Context API with Multiple Contexts

```typescript
// Context API - multiple providers
<ThemeContext.Provider>
  <UserContext.Provider>
    <App />
  </UserContext.Provider>
</ThemeContext.Provider>

// RGS - single init, no providers needed
initState({
  theme: 'light',
  user: null
})
// Access anywhere with useStore()
```

## Migrating from useState

### useState to RGS

```typescript
// useState
const [count, setCount] = useState(0)

// RGS equivalent
const [count, setCount] = useStore<number>('count')
```

### Multiple useState to RGS

```typescript
// useState - multiple state variables
const [user, setUser] = useState(null)
const [theme, setTheme] = useState('light')
const [cart, setCart] = useState([])

// RGS - single init, multiple keys
initState({
  user: null,
  theme: 'light',
  cart: []
})

// Access individually
const [user, setUser] = useStore('user')
const [theme, setTheme] = useStore('theme')
const [cart, setCart] = useStore('cart')
```

## Migrating from MobX

### MobX to RGS

```typescript
// MobX
import { makeAutoObservable } from 'mobx'

class Store {
  count = 0
  
  constructor() {
    makeAutoObservable(this)
  }
  
  increment() {
    this.count++
  }
}

// RGS equivalent
initState({ count: 0 })

const increment = () => {
  const [count, setCount] = useStore<number>('count')
  setCount(count + 1)
}
```

## Migration Steps

### 1. Install RGS

```bash
npm install @biglogic/rgs
```

### 2. Initialize Store

Create a store initialization file:

```typescript
// store.ts
import { initState } from '@biglogic/rgs'

initState({
  // Your initial state here
})
```

### 3. Replace State Management

Gradually replace Redux/Context/useState with RGS:

1. Start with leaf components
2. Replace state hooks one at a time
3. Remove old state management once migration is complete

### 4. Testing

After migration, ensure everything works:

```bash
npm test
```

## Common Pitfalls

### Pitfall: Forgetting to Initialize

**Problem:** Calling `useStore()` before `initState()`.

**Solution:**
```typescript
// Ensure initState is called before any hooks
const App = () => {
  useEffect(() => {
    initState(initialState)
  }, [])
  
  return <MyComponents />
}
```

### Pitfall: Direct State Mutation

**Problem:** Mutating state directly.

**Solution:**
```typescript
// BAD
const [user] = useStore('user')
user.name = 'Alice' // Won't trigger update

// GOOD
const [user, setUser] = useStore('user')
setUser({ ...user, name: 'Alice' })
```

## Next Steps

- [Quick Start](quick-start.md) - Fresh start with RGS
- [Best Practices](best-practices.md) - Post-migration best practices
- [Troubleshooting](troubleshooting.md) - Common migration issues
