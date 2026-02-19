# Changelog

## [3.5.1] - 2026-02-19

### 📚 Documentation
- **New Branding**: Updated project name to **"Reactive Global State"** to better reflect the library's nature.
- **Comparison Table**: Added detailed "Battle of the Giants" comparison vs Redux, Zustand, Recoil.
- **README Overhaul**: Removed legacy references and polished the documentation.

### 🧹 Maintenance
- **Deprecations**: Formally deprecated versions < 3.0.0.
- **Dependencies**: Pinned critical dev dependencies (ESLint 9.17) to prevent CI instability.

## [3.5.0] - 2026-02-19

### 🌟 New Features
- **Type-Safe Selectors**: You can now use `useStore(state => state.user.profile)`!
  - Full TypeScript autocomplete.
  - Refactoring-safe (renaming properties in your interface updates usages).
  - Performance optimized via referential stability checks.
  - Legacy string-based access (`useStore('key')`) is still fully supported.

### 🚀 Performance
- **Snapshot Caching**: Implemented a smart `getSnapshot()` cache in the core store. It only regenerates the state object when data actually changes, ensuring minimal re-renders for React 18+ components using `useSyncExternalStore`.

---

## [3.4.0] - 2026-02-19

### 🚀 Performance
- **Zero-Check Default**: `maxObjectSize` and `maxTotalSize` are now `0` (disabled) by default in production builds. This prevents expensive recursive traversals (`O(N)`) during `set()` operations for large objects.
- **Async Safety**: Even when enabled, size calculations are now guarded to run only in non-production environments to prevent main-thread freezing.

### 🏗️ Architecture (Refactor)
- **Modular Core**: The monolithic `store.ts` "God Object" has been split into dedicated modules:
  - `persistence.ts`: Handles all storage logic and serialization.
  - `plugins.ts`: Manages the plugin lifecycle and hooks.
  - `reactivity.ts`: Handles computed values, watchers, and listeners.
- This change is fully backward compatible but makes the codebase significantly easier to maintain and test.

### 🧹 Clean Code
- Removed deprecated aliases: `useGState` and `useSimpleState`. Use `useStore` exclusively.
- Types: Improved strict typing for Plugin Context generics (`S extends Record<string, unknown>`).
- API Polish: `_registerMethod` now enforces the structured `(pluginName, methodName, fn)` signature.

### 🐛 Fixes
- Fixed potential hydration race conditions in SSR.
- Fixed `_getPrefix` context binding in `remove()` operations.

---

All notable changes to this project will be documented in this file.

## [2.9.5] - 2026-02-16

### Improved
- **Security Hardening**: Rebuilt `sanitizeValue` with advanced regex patterns to block redundant schemes (`data:`, `vbscript:`, `&#...;` entities) and dangerous HTML elements.
- **Deep Clone Engine**: Refactored `deepClone` to prioritize native `structuredClone` while adding explicit support for `Map` and `Set` in the fallback walker.
- **Architectural Integrity**: Added missing `test` script to `package.json` for standardized enterprise integration.

### Fixed
- Circular reference edge cases in manual cloning fallback.
- Potential sanitization bypasses using entity encoding.

## [2.7.0] - 2026-02-15

### Added

- **Multiple Stores**: Support for multiple independent stores via namespaces.
- **Global Type Declarations**: TypeScript global types for `gState`, `gstate`, `useStore`, `initState`, `destroyState`.
- **README**: Comprehensive documentation with comparison table (gState vs useState).
- **Architecture Diagram**: ASCII diagram showing system components.
- **Quick Examples**: Common use cases (persistence, encryption, undo/redo, sync, computed).
- **CI/CD**: GitHub Actions workflow for automated testing and publishing.
- **CONTRIBUTING.md**: Contribution guidelines.

### Fixed

- **Type Safety**: Replaced all `any` types with proper generics.
- **ESLint**: Fixed unused variable warnings.
- **Plugin Types**: Fixed type casting in immer, snapshot, undo-redo plugins.
- **Regex Validation**: Added secure regex validation in security module.
- **Plugin Exports**: Added missing exports for `analyticsPlugin` and `syncPlugin`.
- **FAQ**: Corrected "outside React" answer (only `createStore` works without React).

### Changed

- **API Alignment**: useStore is now the primary export (useGState/useSimpleState are deprecated aliases).
- **Documentation**: All docs now in English.
- **Keywords**: Cleaned up package.json keywords.
- **Magnatar → Magnetar**: Fixed naming throughout documentation.

## [2.6.0] - 2026-02-14

### Added

- **Magnetar Wrapper**: Introduced `gstate()` for one-liner store and hook creation.
- **Async Store Engine**: Added `createAsyncStore` for atomic data/loading/error lifecycle management.
- **Worker Store Engine**: Added `createWorkerStore` for off-main-thread state proxying.
- **Deep Proxy Guard**: Implemented recursive Proxy protection with `Forbidden Mutation` errors to ensure absolute immutability.
- **Micro-Kernel Plugin System**: New hook-based architecture (`onInit`, `onSet`, `onGet`, `onRemove`, etc.).
- **Official Plugin Ecosystem**: Added 10 official modules (Immer, Undo/Redo, Sync, Schema, Persistence, DevTools, TTL, Analytics, Snapshot, Guard).
- **Circular Reference Safety**: Robust `_deepClone` implementation using `WeakMap`.

### Changed

- **Architecture Refinement**: Transitioned to a "Zen" modular core, moving key files to root for a leaner structure.
- **Core Optimization**: Enhanced Proxy caching for O(n) equality check performance.
- **Build System**: Refined `esbuild` and `tsc` configuration for optimized enterprise distribution.

### Fixed

- **Proxy Invariants**: Resolved conflicts between standard JS Proxy invariants and Immer's frozen objects.
- **Circular Dependencies**: Zero-dependency architecture verified across all core modules.

## [2.1.0] - 2026-02-14

### Changed

- **Strict Typing**: Enforced `strict: true` and `noImplicitAny` across the entire codebase.
- **Code Standards**: Modernized ESLint flat configuration.
- **Internal Cleanup**: Removed app-specific technical noise and legacy dev-proxy overhead.

## [2.0.0] - 2026-02-14

### Changed

- **The Magnetar Transformation**: Major shift toward high-performance kernel architecture.
- **Immer Core**: Native integration of Immer for handled immutability.
