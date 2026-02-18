# 🔄 Migration Guide

## Upgrading from Previous Versions

### Security: `secure` → `encoded`

**IMPORTANT:** The `secure` option has been deprecated in favor of `encoded` to clarify that it only applies **base64 encoding**, not encryption.

#### ❌ Old Code (Deprecated)

```typescript
store.set('apiKey', 'secret123', {
  persist: true,
  secure: true  // ⚠️ DEPRECATED: This is NOT encryption!
})
```

#### ✅ New Code (Recommended)

```typescript
store.set('apiKey', 'secret123', {
  persist: true,
  encoded: true  // ✅ Clear: This is base64 encoding
})
```

#### Backward Compatibility

Your old code will **still work**, but you'll see a deprecation warning in TypeScript:

```typescript
/** @deprecated Use 'encoded' instead. 'secure' only applies base64 encoding, not encryption. */
secure?: boolean
```

#### Why This Change?

Base64 encoding is **NOT encryption**. It's trivial to decode:

```javascript
// Anyone can decode base64
const encoded = btoa(JSON.stringify({ secret: 'password123' }))
const decoded = JSON.parse(atob(encoded)) // { secret: 'password123' }
```

**For real security**, use proper encryption libraries like:

- `crypto-js` (AES encryption)
- `tweetnacl` (NaCl encryption)
- Web Crypto API (`crypto.subtle`)

---

### Error Handling: `onError` Callback

**NEW:** You can now catch and handle errors from plugins, hydration, and other operations.

#### Example: Custom Error Logging

```typescript
import { initState, useStore } from '@biglogic/rgs'

const store = initState({
  namespace: 'myapp',
  onError: (error, context) => {
    // Send to your error tracking service
    console.error(`[gState Error] ${context.operation}:`, error)

    if (context.operation === 'hydration') {
      // Handle corrupted localStorage
      localStorage.clear()
      alert('Storage corrupted, resetting...')
    }

    if (context.operation.startsWith('plugin:')) {
      // Handle plugin crashes
      Sentry.captureException(error, { tags: { plugin: context.operation } })
    }
  }
})
```

#### Error Context

```typescript
interface ErrorContext {
  operation: string  // 'hydration', 'plugin:name:hook', 'set'
  key?: string       // State key (if applicable)
}
```

---

### Performance: `maxObjectSize` Warning

**NEW:** Get warned when storing objects larger than a configurable limit (default: 5MB).

#### Example: Custom Size Limit

```typescript
import { createStore } from '@biglogic/rgs'

const store = createStore({
  maxObjectSize: 10 * 1024 * 1024, // 10MB limit
  onError: (error, context) => {
    if (context.operation === 'set') {
      console.warn(`Large object detected in key: ${context.key}`)
    }
  }
})

// This will trigger a warning if > 10MB
store.set('bigData', hugeArray)
```

#### Disable Size Checking

```typescript
const store = createStore({
  maxObjectSize: 0  // Disable size warnings
})
```

---

## Upgrading to Latest Version (The Enterprise Update)

**IMPORTANT:** This release introduces a fundamental shift towards **Multi-Store Isolation**. Security rules and GDPR consents are now instance-bound rather than global.

### 1. Security: Global → Instance-Specific

In previous versions, security rules were shared globally. Now, each store instance maintains its own rules for better isolation in micro-frontend environments.

#### ❌ Deprecated Global Methods

```typescript
import { addAccessRule, recordConsent } from '@biglogic/rgs'

// ⚠️ DEPRECATED: These affect the 'default' store only and are less isolated
addAccessRule('user_*', ['read', 'write'])
```

#### ✅ Recommended Instance Methods

```typescript
const store = createStore({ namespace: 'my-isolated-app' })

// ✅ Use the instance methods
store.addAccessRule('user_*', ['read', 'write'])
store.recordConsent('user123', 'marketing', true)
```

### 2. Operational Resilience: Ghost Stores

**NEW:** If you access a store that hasn't finished its initialization (e.g., during slow hydration), RGS now returns a **Ghost Store Proxy**.

- **Behavior:** It prevents application crashes by providing a safe fallback.
- **Developer Warning:** It logs a detailed warning in the console so you can fix the initialization sequence.

### 3. Performance: Regex Caching

**NEW:** Permission checks now use an internal **Regex Cache** per instance.

- **Why?** Avoids the overhead of re-compiling regex strings on every `.get()` or `.set()` call.
- **Impact:** Significant performance boost for applications with high-frequency state updates and complex RBAC rules.

### 4. Advanced Plugin Typing

**NEW:** Introducing `GStatePlugins` for Module Augmentation.

- You can now define types for your custom plugins to get full IDE autocomplete.

---

## v2.9.5: The Architecture & Safety Update (2026-02-16)

This release focuses on improving developer ergonomics, security visibility, and complex dependency handling.

### 1. Nested Computed Dependencies

**NEW:** Computed values can now re-trigger based on other computed values.

```typescript
store.compute('tax', (get) => (get<number>('subtotal') || 0) * 0.2)
store.compute('total', (get) => (get<number>('subtotal') || 0) + (get<number>('tax') || 0))
```

### 2. Direct Store Access: `getStore()`
**NEW:** A top-level utility to retrieve the default store without React hooks.

```typescript
import { getStore } from '@biglogic/rgs'

export const toggleTheme = () => {
  const store = getStore()
  if (store) store.set('mode', 'dark')
}
```

### 3. Exposed Metadata: `namespace` and `userId`
**NEW:** Store instances now expose their identifying properties as read-only getters.

```typescript
const store = createStore({ namespace: 'auth-vault', userId: 'user-001' })
console.log(store.namespace) // 'auth-vault'
console.log(store.userId)    // 'user-001'
```

### 4. High-Volume & Hybrid Sync (Plugins)
**NEW:** Support for GB-scale storage and Remote Cloud Backups.

- **IndexedDB Plugin**: Replaces localStorage for massive browser datasets.
- **Cloud Sync Plugin**: Differential synchronization to MongoDB, Firebase, or any SQL backend.

```typescript
// Example: Manual Cloud Sync
const result = await store.plugins.cloudSync.sync()
console.log('Stats:', store.plugins.cloudSync.getStats())
```

---

## Breaking Changes

### 🔒 Security Isolation

If you relied on `addAccessRule()` from the global export to affect a `createStore()` instance, you must now call `store.addAccessRule()` on that specific instance.

---

## Recommended Actions

### 1. Migrate Security Calls to Store Instances

**Priority:** High (if using multiple stores)

**Effort:** Low

### 2. Implement `GStatePlugins` for Custom Plugins

**Priority:** Medium (Developer Experience)

**Effort:** Low

---

## Need Help?

- **Issues:** [GitHub Issues](https://github.com/dpassariello/rgs/issues)
- **Docs:** [Galaxy Documentation](../SUMMARY.md)

---

## Last updated: 2026-02-16
