# Troubleshooting

Common issues and their solutions.

## Common Issues

### "Cannot set value when using a selector"

**Cause:** Trying to set state while using a selector.

**Solution:**
```typescript
// BAD
const [value, setValue] = useStore('key', { selector: s => s })
setValue(newValue) // Error: cannot set with selector

// GOOD
const value = useSelector(state => state.key)
const [, setValue] = useStore('key')
setValue(newValue)
```

### "RBAC Denied for 'key'"

**Cause:** User doesn't have permission for the requested action.

**Solution:**
```typescript
// Check permissions before action
import { hasPermission } from '@biglogic/rgs'

if (hasPermission(rules, 'admin_settings', 'write', userId)) {
  setState('admin_settings', value)
} else {
  // Handle permission denied
  console.warn('Permission denied')
}
```

### "Object size exceeds maxObjectSize"

**Cause:** Trying to store an object larger than the configured limit.

**Solution:**
```typescript
// Increase limit or remove it
initState(state, { 
  maxObjectSize: 0 // 0 = no limit
  // Or set higher limit
  // maxObjectSize: 10 * 1024 * 1024 // 10MB
})
```

### Store not initialized

**Cause:** Calling `useStore()` before `initState()`.

**Solution:**
```typescript
// Ensure initState is called before any hooks
const App = () => {
  // Call initState at the top level
  useEffect(() => {
    initState(initialState)
  }, [])
  
  return <MyComponents />
}
```

### State not updating in component

**Cause:** Direct mutation of state object.

**Solution:**
```typescript
// BAD: Direct mutation
const [user, setUser] = useStore('user')
user.name = 'Alice' // Won't trigger update

// GOOD: New reference
setUser({ ...user, name: 'Alice' })
```

### Multiple re-renders

**Cause:** Multiple setState calls without transaction.

**Solution:**
```typescript
// BAD: Multiple re-renders
setState('a', 1)
setState('b', 2)

// GOOD: Single re-render
transaction(() => {
  setState('a', 1)
  setState('b', 2)
})
```

### Hooks called conditionally

**Cause:** Calling useStore inside conditional or loop.

**Solution:**
```typescript
// BAD: Conditional hook
if (condition) {
  const [value] = useStore('key') // Error!
}

// GOOD: Always called
const [value] = useStore('key')
if (condition) {
  // Use value
}
```

## Debugging Tips

### Enable Debug Logging

```typescript
// Use console.debug instead of console.log
console.debug('State updated:', value)
```

### Inspect Current State

```typescript
// Check state directly
const currentState = getState('key')
console.debug('Current value:', currentState)
```

### Watch for Changes

```typescript
// Watch all state changes
watch('*', (key, newValue, oldValue) => {
  console.debug(`State changed: ${key}`, { oldValue, newValue })
})
```

## Build Issues

### TypeScript Errors

**Problem:** TypeScript compilation errors.

**Solution:**
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Ensure tsconfig.json has correct settings
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

### Bundle Size Issues

**Problem:** Large bundle size.

**Solution:**
- Use tree-shaking friendly imports
- Avoid storing large objects in state
- Use code splitting for features

```typescript
// BAD: Importing everything
import * as RGS from '@biglogic/rgs'

// GOOD: Import only what you need
import { useStore, setState } from '@biglogic/rgs'
```

## Getting Help

### Resources

- **Documentation:** https://github.com/BigLogic-ca/rgs/docs
- **Issues:** https://github.com/BigLogic-ca/rgs/issues
- **Email:** dariopassariello@gmail.com

### Before Reporting Issues

1. Check this troubleshooting guide
2. Search existing GitHub issues
3. Create a minimal reproduction
4. Include relevant error messages
5. Specify your environment (Node.js version, React version, etc.)

## Next Steps

- [Quick Start](quick-start.md) - Get started with RGS
- [API Reference](api-reference.md) - Complete API documentation
- [Best Practices](best-practices.md) - Best practices for RGS
