# 🏗️ Chapter 4: Persistence and Safety - Built like a Tank

In a real-world application, state that vanishes on page refresh is a developer failure. RGS handles data saving **intelligently**.

## 💾 Persistence: "Set and Forget"

When you initialize RGS or a Magnetar, you can enable persistence. But it's not a simple `localStorage.set`.

```typescript
initState({
  persist: true,
  storage: 'local' // or 'session', or a custom adapter
});
```

### Advanced Storage: Beyond 5MB

For applications that need to store massive amounts of data (Gigabytes), standard `localStorage` is not enough. RGS provides official plugins for advanced scenarios:

| Technology | Capacity | Purpose | Plugin |
| :--- | :--- | :--- | :--- |
| **LocalStorage** | ~5MB | Basic UI settings, small profiles. | Core (Native) |
| **IndexedDB** | GBs | Offline-first apps, large datasets, logs. | `indexedDBPlugin` |
| **Cloud Sync** | Unlimited | Remote backup, cross-device sync. | `cloudSyncPlugin` |

---

## ☁️ Hybrid Persistence: The "Cloud-Cloud" Strategy

RGS allows you to combine local power with cloud safety. You can store your active data in **IndexedDB** for speed and capacity, while automatically backing it up to a remote database (MongoDB, Firebase, SQL) using the **Cloud Sync Plugin**.

### Why use Cloud Sync?
- **Differential Updates**: Safely sends only what was changed since the last sync.
- **Scheduled or On-Demand**: Sync every 5 minutes automatically, or triggered by a "Save to Cloud" button.
- **Diagnostics**: Track how much data you are syncing and detect errors before they reach the user.

---

### What happens under the hood?

```mermaid
sequenceDiagram
    participant C as Component
    participant RGS as Globo State
    participant S as LocalStorage

    Note over C,RGS: User clicks a button
    C->>RGS: set('count', 10)
    RGS-->>C: Update UI (Instant)

    Note over RGS: Waiting 300ms (Debounce)

    RGS->>S: Write to Disk
    Note right of S: Data saved successfully
```

- **Debouncing**: If you update the state 100 times in one second, RGS writes to the disk only once at the end. This saves battery life and browser performance.
- **Selective Persistence**: Don't want to save everything? You can tell RGS which keys to ignore or which ones to save only temporarily.

## 🛡️ Immutability: The Immer Shield

Have you ever had bugs where state changed "mysteriously" because you mutated an array directly? RGS uses **Immer** at its core (the Stellar Engine).

**Dangerous Code (Standard JS):**

```javascript
const user = store.get('user');
user.permissions.push('admin'); // BOOM! You mutated the original without triggering a re-render.
```

**The RGS Way:**

```javascript
store.set('user', (draft) => {
  draft.permissions.push('admin'); // SAFE! RGS creates an immutable copy for you.
});
```

## 🕵️ Validation: Schema Plugin

Never trust data coming back from the server or saved in the browser 6 months ago. Use the **schemaPlugin**.

```typescript
import { schemaPlugin } from '@biglogic/rgs';
import { z } from 'zod'; // Recommended!

const store = initState();
store._addPlugin(schemaPlugin({
  price: (val) => typeof val === 'number' && val > 0,
  email: (val) => val.includes('@')
}));
```

If anyone tries to `set('price', -50)`, RGS will block the operation and warn you. **Clean State = Happy App.**

---

## 💡 Case Study: The Cart that Never Lost an Item

**Challenge**: User adds products, closes the browser, comes back after two days. The cart must still be there, and synced with their account on other devices.
**RGS Solution**:

1. Enable `indexedDBPlugin` for robust local storage (handles thousands of items).
2. Use `cloudSyncPlugin` to bridge the local state with your company's MongoDB Atlas or Firebase.
3. Result? 5-star UX with full data durability and cross-device sync.

**Next step:** [Ecosystem and Plugins: Extending the Power](05-plugins-and-extensibility.md)
