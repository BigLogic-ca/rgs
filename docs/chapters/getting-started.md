# ⚡ Chapter 2: Quick Start - From Zero to State in 30 Seconds

Stop wasting time on boilerplate. Here is how you deploy the RGS Panzer in your React project.

## 1. Installation

The engine is lightweight but armored.

```bash
npm install rgs
```

## 2. Initialization: The "Big Bang"

In your main entry file (e.g., `main.tsx` or `App.tsx`), wake up the engine once.

```typescript
import { initState, useStore } from '@biglogic/rgs';

// Initialize with optional settings
initState({
  namespace: 'my-awesome-app',
  persistence: true // Optional: Saves everything to localStorage automatically
});
```

## 3. Usage: Instant Reactions

Use the `useStore` hook. No providers, no wrappers. Just raw, atomic power.

```tsx
import { useStore } from '@biglogic/rgs';

function Counter() {
  // If 'count' doesn't exist yet, it defaults to undefined. Easy.
  const [count, setCount] = useStore<number>('count');

  return (
    <div className="card">
      <h1>Power Level: {count ?? 0}</h1>
      <button onClick={() => setCount((prev) => (prev || 0) + 1)}>
        Boost Power 💥
      </button>
    </div>
  );
}
```

## 🧐 What just happened?

- **Reactive Subscription**: `useStore('count')` tells React to watch the 'count' key. Surgical updates only.
- **Global Scope**: `setCount` updates the value everywhere in the app, instantly.
- **Resilient Nature**: If you access a key that hasn't been set yet, RGS returns `undefined` gracefully instead of throwing a tantrum.

## 🚨 Pro Tip: Direct Store Access

Need to access state outside of React components? Simple.

```typescript
import { getStore } from '@biglogic/rgs';

const value = getStore()?.get('count');
getStore()?.set('count', 9001);
```

---

**Next step:** [The Magnetar Way: One-Liner Power](03-the-magnetar-way.md)
