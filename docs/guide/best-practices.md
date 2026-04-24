# Best Practices

Guidelines for maintainable, performant, and secure RGS implementations.

## Code Organization

### Recommended Project Structure

```
src/
├── store/
│   ├── index.ts          # Store initialization
│   ├── types.ts          # TypeScript interfaces
│   ├── plugins/         # Custom plugins
│   └── computed/        # Computed values
├── components/
│   └── ...
└── hooks/
    └── custom-hooks.ts   # Custom hooks wrapping useStore
```

### Store Initialization

```typescript
// store/index.ts
import { initState } from '@biglogic/rgs'
import type { AppState } from './types'
import { loggerPlugin } from './plugins/logger'
import { analyticsPlugin } from './plugins/analytics'

const initialState: AppState = {
  user: null,
  settings: { theme: 'light', notifications: true },
  cart: []
}

const store = initState(initialState)

// Install plugins
store.installPlugin(loggerPlugin)
store.installPlugin(analyticsPlugin)

export default store
```

### TypeScript Usage

```typescript
// types.ts - Define your state shape
export interface AppState {
  user: User | null
  settings: Settings
  cart: CartItem[]
}

export interface User {
  id: string
  name: string
  role: 'admin' | 'user' | 'guest'
}

// Create typed hooks
import { useStore } from '@biglogic/rgs'
import type { AppState } from './types'

export const useAppStore = <K extends keyof AppState>(key: K) => 
  useStore<AppState[K]>(key as string)
```

## Security Checklist

### Mandatory for Production

- [ ] Enable RBAC for sensitive state keys
- [ ] Use AES-256-GCM encryption for PII
- [ ] Configure audit logging
- [ ] Implement GDPR consent management
- [ ] Sanitize all user inputs
- [ ] Use HTTPS in production
- [ ] Store encryption keys securely (httpOnly cookies)
- [ ] Regularly rotate encryption keys
- [ ] Monitor for suspicious access patterns

### Security Do's and Don'ts

**DO:**
- Use `console.debug` instead of `console.log` for debugging
- Use arrow functions for consistency
- Handle errors gracefully
- Write tests for critical state logic
- Use transactions for related updates
- Keep state flat when possible
- Validate user input before storing
- Use namespaces to isolate sensitive data

**DON'T:**
- Use `eval()` or `new Function()` (security risk)
- Store functions in state (not serializable)
- Mutate state directly
- Use `console.log` in production code
- Store sensitive data without encryption
- Ignore RBAC rules for admin functions
- Store large objects (break them down)
- Subscribe to all state with wildcard `*`

## Performance Best Practices

### State Structure

```typescript
// GOOD: Flat and focused
initState({
  'user.profile.name': '',
  'user.profile.email': '',
  'settings.theme': 'light',
  'cart.items': [],
  'cart.total': 0
})

// BAD: Deeply nested and monolithic
initState({
  user: {
    profile: { name: '', email: '' }
  },
  settings: { theme: 'light' },
  cart: { items: [], total: 0 }
})
```

### Update Patterns

```typescript
// GOOD: Transaction for related updates
transaction(() => {
  setState('cart.items', [...items, newItem])
  setState('cart.total', total + newItem.price)
})

// BAD: Separate updates cause multiple re-renders
setState('cart.items', [...items, newItem])
setState('cart.total', total + newItem.price)
```

## Documentation

### Document Your Store

```typescript
/**
 * User store slice
 * Manages user authentication and profile data
 */
const userSlice = {
  /**
   * Current user or null if not authenticated
   * @type {User | null}
   */
  user: null,
  
  /**
   * Check if user has specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean}
   */
  hasPermission: (permission: string) => {
    const user = getState('user')
    return user?.permissions?.includes(permission) ?? false
  }
}
```

## Testing Strategy

### Test Coverage Goals

- **Unit tests**: 80%+ coverage for store logic
- **Integration tests**: All critical user flows
- **Performance tests**: Baseline benchmarks
- **Security tests**: RBAC and encryption validation

### Test Organization

```
tests/
├── unit/
│   ├── store.test.ts
│   └── computed.test.ts
├── integration/
│   └── user-flow.test.ts
└── performance/
    └── benchmarks.test.ts
```

## Common Patterns

### Custom Hooks

```typescript
// hooks/useAuth.ts
import { useStore } from '@biglogic/rgs'

export const useAuth = () => {
  const [user, setUser] = useStore('user')
  
  const login = (credentials: Credentials) => {
    // Login logic
  }
  
  const logout = () => {
    setUser(null)
  }
  
  return { user, login, logout }
}
```

### Feature-Based Organization

```
src/
├── features/
│   ├── auth/
│   │   ├── store.ts
│   │   ├── hooks.ts
│   │   └── types.ts
│   └── cart/
│       ├── store.ts
│       ├── hooks.ts
│       └── types.ts
```

## Next Steps

- [Migration Guide](migration-guide.md) - Migrating from other state managers
- [Troubleshooting](troubleshooting.md) - Common issues and solutions
