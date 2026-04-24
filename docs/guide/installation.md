# Installation

## Prerequisites

Before installing RGS, ensure your project meets these requirements:

- **Node.js** >= 16.0.0
- **React** >= 16.8.0 (peer dependency)
- **TypeScript** (recommended) >= 4.0.0

## Install via npm

```bash
npm install @biglogic/rgs
```

## Install via yarn

```bash
yarn add @biglogic/rgs
```

## Install via pnpm

```bash
pnpm add @biglogic/rgs
```

## Verify Installation

Create a simple test file to verify RGS is properly installed:

```typescript
// test-rgs.ts
import { initState } from '@biglogic/rgs'

const store = initState({
  test: 'Hello RGS!'
})

console.log('RGS installed successfully!')
console.log('Initial state:', store.getState('test'))
```

Run with:
```bash
npx tsx test-rgs.ts
```

## Peer Dependencies

RGS requires React as a peer dependency. If you haven't installed React yet:

```bash
npm install react react-dom
npm install -D @types/react @types/react-dom
```

## TypeScript Configuration

For the best experience, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Troubleshooting Installation

### Issue: "Cannot find module '@biglogic/rgs'"

**Solution:** Ensure the package is installed in your project directory:
```bash
npm list @biglogic/rgs
```

### Issue: Peer dependency warnings

**Solution:** Install the required peer dependencies:
```bash
npm install react@>=16.8.0 react-dom@>=16.8.0
```

## Next Steps

- [Quick Start](quick-start.md) - Create your first RGS store
- [Core Concepts](core-concepts.md) - Learn the fundamentals
