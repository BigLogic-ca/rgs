---
name: biglogic-rgs
description: Reactive global state management library for React - simple, secure, scalable
---

# @biglogic/rgs - Reactive Global State

## Overview

RGS (Argis) is a reactive global state management library for React. Simple, secure, and scalable. It provides typed state management with built-in persistence, security, and sync capabilities.

## Instructions

### Constraints

1. **TypeScript Strict**: Always use strict typing - avoid `any` unless absolutely necessary
2. **No console.log**: Use `console.debug` for debugging, or `console.warn`/`console.error` for warnings/errors
3. **Build before commit**: Always run `npm run build` successfully before any commit
4. **Test TypeScript**: Run `npx tsc --noEmit` to verify no type errors
5. **No console.log debugging**: Never leave console.log statements in production code
6. **Use arrow functions**: Prefer arrow functions over function declarations

### Workflow

1. **For new features**:
   - Create in `core/` folder
   - Export from `index.ts` if public API
   - Add types to `core/types.ts`
   - Run build and type-check

2. **For bug fixes**:
   - Run `npx tsc --noEmit` to identify issues
   - Fix type errors first
   - Verify build succeeds

3. **For testing**:
   - Run `npm run build` or `npm run test`
   - Config is in `tests/` folder

### Output Format

When adding new hooks or functions:

```typescript
/**
 * Description of what the hook does.
 * @param param - Description of parameter
 * @returns Description of return value
 */
export const myHook = (param: string): boolean => {
  // Implementation
}
```

## Usage Examples

### Basic Store Creation

```typescript
import { gstate } from '@biglogic/rgs'

// Create store with typed hook
const store = gstate({ count: 0, name: 'John' })

// Use typed hook for specific keys
const [count, setCount] = store('count')
const [name, setName] = store('name')

// Or use store directly
store.set('count', 5)
store.get('count')
```

### SSR Support

```typescript
import { isServerSide, hydrateOnClient } from '@biglogic/rgs'

if (isServerSide()) {
  // Server-side logic
}

hydrateOnClient(myStore)
```

### Security

```typescript
import { generateEncryptionKey, validateKey } from '@biglogic/rgs'

// Generate encryption key for secure persistence
const key = generateEncryptionKey()

// Validate keys to prevent XSS
if (validateKey(userInput)) {
  store.set(userInput, value)
}
```

## API Quick Reference

### Core

| Function | Description |
|----------|-------------|
| `gstate(initialState, config?)` | Creates store + returns typed hook |
| `useStore(key, store?)` | React hook for state subscription |
| `createStore(config?)` | Creates store instance |
| `initState(config?)` | Initializes global store |
| `getStore()` | Gets current default store |

### SSR

| Function | Description |
|----------|-------------|
| `isServerSide()` | Check if running on server |
| `isClientSide()` | Check if running on client |
| `hydrateOnClient(store)` | Hydrate store on client |

### Security

| Function | Description |
|----------|-------------|
| `generateEncryptionKey()` | Generate AES-256 key |
| `validateKey(key)` | Validate key format (XSS prevention) |
| `sanitizeValue(value)` | Sanitize value |

## Project Structure

```
core/
├── hooks.ts       # React hooks (useStore, useSyncedState)
├── store.ts       # Core store implementation
├── types.ts       # TypeScript types
├── security.ts    # Security utilities
├── persistence.ts # Storage persistence
├── sync.ts        # Sync engine
└── ssr.ts        # SSR support
```

## Dependencies

- **peerDependencies**: `react`, `react-dom` (>=16.8.0)
- **devDependencies**: `typescript`, `tsup`, `terser`

## License

MIT - Copyright Dario Passariello
