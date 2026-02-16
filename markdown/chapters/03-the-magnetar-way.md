# 🌌 Chapter 3: The Magnetar Way - Peak Simplicity

If you are a fan of "Clean Code" or just hate writing imports, the **Magnetar** method is your new best friend.

It's a single function that creates the store and the hook simultaneously. **Zero config, 100% typed.**

## 🛠️ The "Master" Example

Let's create a User Profile module.

```typescript
import { gstate } from '@biglogic/rgs';

// 1. Define the state and create everything in ONE shot
// Pass a string namespace to enable automatic persistence to localStorage
export const useUser = gstate({
  name: 'Guest',
  isLogged: false,
  preferences: { theme: 'dark', lang: 'en' }
}, 'user_module'); // Auto-persists to localStorage (excludes sensitive fields)

// Or use an object config for more control:
export const useUserNoPersist = gstate({
  name: 'Guest',
  isLogged: false
}, { namespace: 'user_module', autoPersist: false }); // No persistence

// 2. Use it anywhere
function ProfileHeader() {
  const [name, setName] = useUser('name');
  // Note: 'setName' is already typed! It only accepts strings.

  return <h1>Hello, {name}!</h1>;
}
```

## 💎 Why Magnetar Rocks

1. **Inferred Types**: No need to define `<string>`. TypeScript looks at the initial value you passed to `gstate` and figures it out.
2. **Auto-Persistence**: When you pass a string namespace, RGS automatically persists to localStorage (excluding sensitive fields like tokens, passwords, secrets).
3. **Security**: Sensitive fields (containing 'token', 'password', 'secret', 'key') are automatically excluded from persistence.

```typescript
// You can access the store OUTSIDE components!
const currentUser = useUser.get('name');
useUser.set('isLogged', true);

// You can even compute data on the fly (Computed State)
useUser.compute('fullName', ['firstName', 'lastName'], (s) => `${s.firstName} ${s.lastName}`);
```

## 🚜 Production Strategy: "The Store Folder"

Don't scatter stores everywhere. Create a `src/stores` folder and put your Magnetar files there:

- `auth.ts`
- `cart.ts`
- `settings.ts`

Then import them whenever needed. It’s clean, fast, and professional.

## 🧠 Reflection for the Senior Dev

*"Wait, does Magnetar create a new store every time?"*
Yes, and that's the point! You can have isolated micro-stores for every domain of your app, while still keeping the ability to make them talk to each other. It’s the evolution of the "Atomic State" concept.

---

**Next step:** [Persistence and Safety: Data Never Dies](04-persistence-and-safety.md)
