# 🌌 RGS Examples & Best Practices

This folder contains functional and reusable examples of **React Globo State (RGS)** implementation.

## 🏁 Overview: FE vs BE Recommendations

| Example | Recommendation | Primary Use Case |
| :--- | :--- | :--- |
| **[Basic Counter](./basic-counter)** | **FE Only** | Local component state, UI toggles. |
| **[Global Theme](./global-theme)** | **FE Only** | Dark mode, Layout settings, Persistence. |
| **[Persistent Cart](./persistent-cart)** | **FE Preferred** | Shopping carts, Drafts, Offline-first apps. |
| **[Secure Auth](./secure-auth)** | **FE / BE** | Session management, Tokens, User metadata. |
| **[Undo/Redo Editor](./undo-redo-editor)** | **FE Only** | Rich text editors, Canvas tools, Form history. |
| **[RBAC Dashboard](./rbac-dashboard)** | **BE / Admin FE** | Permission-based UI, Secure Admin panels. |
| **[Async Data Fetch](./async-data-fetch)** | **FE Only** | API integration, Data hydration. |
| **[Security Practices](./security-best-practices)** | **BE / Core FE** | Encryption, Audit logs, GDPR compliance. |
| **[Stress Tests](./stress-tests)** | **Validation** | Performance benchmarking & profiling. |

---

## 🛡️ Security Guidelines

### 1. Sensitive Data Handling
**CRITICAL:** Never hardcode actual sensitive data (Credit Cards, Passwords, API Keys) in your JavaScript/TypeScript files.
- **Frontend:** Collect from secure `<input type="password">` and pass to RGS at runtime.
- **Backend:** Retrieve from environment variables (`process.env`) or Secret Managers.

### 2. Encryption
For PII (Personally Identifiable Information), always use the `encryptionKey` option in `StoreConfig`.
RGS will use the Web Crypto API (or Node Crypto) to perform **AES-256-GCM** encryption before writing to storage.

### 3. XSS Defense
Enable `validateInput: true` in your store configuration to automatically sanitize strings. This is vital for any user-generated content displayed in the DOM.

## 🛠️ Testing Environment
All examples are validated using Jest in a `jsdom` environment.
Refer to `tests/jest/tests/examples_v.test.ts` for automated verify suites.
