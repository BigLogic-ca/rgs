# ❓ Chapter 7: FAQ - Architectural Insights

This section provides technical context for the design decisions behind RGS (Argis) - Reactive Global State.

## 1. "Why integrate Security and GDPR into the State layer?"

**The Rationale:** In enterprise environments, ensuring that every data access is authorized is critical. By integrating **RBAC** and **Auditing** directly into the store instance, we provide a "Secure-by-Default" architecture. This prevents common oversights where developers might forget to apply permission checks in custom middleware or component logic.

## 2. "How does RGS compare to the React Context API?"

**The Technical Difference:** Context is a dependency injection tool. When values change, React often triggers broad re-renders across the consumer tree. RGS uses a **Surgical Subscription** model. Only components observing a specific key are notified of changes, ensuring optimal performance even in data-heavy applications.

## 3. "Is there a performance overhead for Safety Features?"

**The Trade-off:** Capabilities like deep freezing (immutability) and sanitization do introduce a small computational cost (typically 1-2ms). We believe this is a worthwhile investment to prevent accidental state mutations and security vulnerabilities. For performance-critical scenarios (like high-frequency animations), these features can be selectively disabled.

## 4. "How is Type Safety handled with string keys?"

**The Approach:** String keys provide the flexibility needed for dynamic and runtime-generated state namespaces. For developers requiring strict type safety, RGS offers the `gstate` factory and `GStatePlugins` augmentation, allowing you to define a fully typed interface for your store and its plugins.

## 5. "What logic dictates the use of 'Ghost Stores'?"

**Operational Resilience:** Many applications experience race conditions during hydration or initialization. Instead of allowing the application to crash due to an uninitialized reference, RGS returns a protective Proxy. This Proxy logs a developer warning while providing a safe fallback, ensuring the user interface remains functional while the developer addresses the initialization sequence.

## 6. "Is it compatible with modern React patterns (SSR/Next.js)?"

**Yes.** RGS is built on top of `useSyncExternalStore` and is fully compatible with Concurrent Rendering and Server-Side Rendering (SSR). It works seamlessly with Next.js, Remix, and other modern frameworks without hydration mismatch issues.

## 7. "Where do the best practices and improvements come from?"

**The Process:** All improvements and best practices are based on:

- **Official React Documentation** - useSyncExternalStore for SSR, hooks rules, React 18/19 features
- **TypeScript Best Practices** - Type safety patterns, generics, strict mode
- **Security Standards** - OWASP for XSS prevention, AES-256-GCM encryption, RBAC patterns
- **Community Libraries** - Patterns from Zustand, Redux, Jotai for plugin architecture
- **Enterprise Patterns** - Error handling, multi-store isolation, GDPR compliance

Key fixes (like security isolation per-store, Immer optional loading) come from common issues in similar libraries.

---

## 🛑 Best Practices: Maximizing Reliability

1. **State Granularity**: Use RGS for global, persistent, or secured data. For transient UI state (like toggle transitions), standard `useState` is more appropriate.
2. **Namespace Management**: Always define a unique namespace for your store to prevent data collisions in shared domain environments.
3. **Rule Validation**: Ensure your RBAC rules are tested against your expected key patterns to maintain a robust security posture.

---

## 👋 Conclusion

RGS is designed for teams that prioritize long-term maintainability and system stability. By handling the complexities of security and persistence at the architectural level, we allow developers to focus on building features with confidence.
