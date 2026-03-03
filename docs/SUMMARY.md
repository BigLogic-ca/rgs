# 🌌 Argis (RGS) - Reactive Global State: The Final Guide

Welcome to the definitive documentation for **Reactive Global State (RGS)**. If you are here, you're likely tired of endless boilerplate, complex configurations, and state management tools that seem to require a PhD in rocket science.

This documentation is written for everyone: from **easy setup** for those who just want things to work, to **advanced implementation** for those who want to master the engine.

---

## 🗺️ Summary

- **[The Philosophy: Panzer vs. Bicycle](chapters/philosophy.md)**
  - Reliability and Security as First-Class Citizens.
  - The "Ironclad" Core: Simplicity meets Power.

- **[Quick Start: 30-Second Setup](chapters/getting-started.md)**
  - Deploying the RGS Panzer in your React project.

- **[The Magnetar Way: One-Liner Power](chapters/the-magnetar-way.md)**
  - Creating stores and hooks simultaneously. Types included.

- **[Persistence and Safety](chapters/persistence-and-safety.md)**
  - Never lose user data again (without localStorage headaches).
  - Native immutability with Immer (Stellar Engine).

- **[Ecosystem and Plugins](chapters/plugins-and-extensibility.md)**
  - DevTools, Cross-Tab Sync, Analytics, and Typed Plugins.

- **[Plugin SDK: Build Your Own Extensions](chapters/plugin-sdk.md)**
  - Create custom plugins with lifecycle hooks.
  - Register methods via `store.plugins`.
  - Full API reference and examples.

- **[Case Studies: Real World Strategies](chapters/case-studies.md)**
  - **E-commerce**: Cart isolation and atomic updates.
  - **Dashboards**: Multi-store strategies and complex flows.

- **[Architectural Insights (FAQ)](chapters/07-faq.md)**
  - Honest answers on security, performance, and Proxies.

- **[Migration Guide](chapters/migration-guide.md)**
  - Upgrading to latest version (Enterprise Isolation)
  - Upgrading to previous version (`secure` → `encoded`)

- **[Security Architecture & Hardening](chapters/security-architecture.md)**
  - Advanced XSS prevention and deep cloning reliability.
  - AES-256-GCM and RBAC.

- **[Local-First Sync Engine](chapters/local-first-sync.md)**
  - Offline-by-default with automatic background sync.
  - Conflict resolution strategies (last-write-wins, merge, etc.).
  - `useSyncedState` hook for React components.

---

> *"Make things simple, but not simpler than necessary."* – RGS Team
