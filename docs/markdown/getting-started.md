# ⚡ Chapter 2: Quick Start - From Zero to State in 30 Seconds

Stop wasting time on boilerplate. Here is how you deploy the RGS Panzer in your React project.

## 1. Installation

The engine is lightweight but armored.

```bash
npm install @biglogic/rgs
```

## 2. Quick Start: The Zen Way (Recommended)

The simplest way to use RGS - one line creates both store and typed hook.

```typescript
import { gstate } from '@biglogic/rgs';

// ONE line creates a typed store + hook
const useCounter = gstate({ count: 0, name: 'John' })

function Counter() {
  // Get typed hook for specific keys
  const [count, setCount] = useCounter('count')
  const [name, setName] = useCounter('name')

  return (
    <div>
      <p>Hello, {name}!</p>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        +1
      </button>
    </div>
  )
}
```

Or use store methods directly:
```typescript
useCounter.set('count', 5)
useCounter.get('count')
```

## 3. Classic Way (Global Store)

If you prefer a global store approach:

```typescript
import { initState, useStore } from '@biglogic/rgs';

// Initialize once at app root
initState({
  namespace: 'my-awesome-app',
  persistByDefault: true
});

// Use anywhere in your app
const [count, setCount] = useStore('count')
const [user, setUser] = useStore('user')
```

## 4. Multi-Store Pattern (Recommended for Large Apps)

For micro-frontends or large applications, use separate namespaces:

```typescript
import { gstate } from '@biglogic/rgs';

// Cart store
export const useCart = gstate({ items: [] }, { namespace: 'cart' })

// User store
export const useUser = gstate({ profile: null }, { namespace: 'user' })

// Theme store
export const useTheme = gstate({ mode: 'light' }, { namespace: 'theme' })
```

## 5. Cleanup (HMR / Testing)

For Hot Module Replacement or test cleanup:

```typescript
import { destroyState, destroyAllStores } from '@biglogic/rgs';

// Destroy specific store
destroyState('cart')

// Destroy all stores (useful for HMR)
destroyAllStores()
```
