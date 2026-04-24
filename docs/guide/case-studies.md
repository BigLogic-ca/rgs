# Case Studies

Real-world examples of RGS implementations in enterprise scenarios.

## Case Study 1: E-Commerce Cart That Never Lost an Item

**Challenge**: User adds products, closes the browser, comes back after two days. The cart must still be there, and synced with their account on other devices.

**RGS Solution**:

1. Enable `indexedDBPlugin` for robust local storage (handles thousands of items).
2. Use `cloudSyncPlugin` to bridge the local state with your company's MongoDB Atlas or Firebase.
3. Result? 5-star UX with full data durability and cross-device sync.

```typescript
import { gstate } from '@biglogic/rgs';
import { indexedDBPlugin, cloudSyncPlugin } from '@biglogic/rgs/plugins';

const useCart = gstate(
  { items: [], total: 0 },
  { 
    namespace: 'cart',
    plugins: [indexedDBPlugin(), cloudSyncPlugin({ endpoint: '/api/sync' })]
  }
);
```

## Case Study 2: No-Stress E-Commerce Performance

**Scenario**: Imagine a shopping cart.

**Standard Approach**: The user adds a sock, and the entire product list (2000 items) re-renders because they share a Context.

**RGS Approach**: Adds the item with `set('cart', [...])`. Only the tiny cart badge updates. 3ms execution time. Happy client, happy developer.

```typescript
const useCart = gstate({ items: [], count: 0 });

function AddToCartButton({ item }) {
  const [items, setItems] = useCart('items');
  const [count, setCount] = useCart('count');
  
  const addToCart = () => {
    setItems([...items, item]);
    setCount(count + 1);
  };
  
  return <button onClick={addToCart}>Add to Cart</button>;
}

function CartBadge() {
  const [count] = useCart('count');
  return <span>{count} items in cart</span>;
}
```

## Case Study 3: Enterprise RBAC Dashboard

**Challenge**: Build an admin dashboard where different user roles can only access specific state keys.

**RGS Solution**:

```typescript
import { initState, addAccessRule } from '@biglogic/rgs';

initState({
  admin_settings: {},
  user_profiles: {},
  public_data: {}
});

// Define access rules
addAccessRule(/admin_.*/, ['read', 'write', 'delete', 'admin']);
addAccessRule(/user_.*/, ['read', 'write']);
addAccessRule(/public_.*/, ['read']);

// Now access is automatically enforced
// Trying to setState('admin_settings', value) will fail for non-admin users
```

## Case Study 4: Secure Multi-Tenant SaaS

**Challenge**: Multiple tenants on the same platform, data must be completely isolated.

**RGS Solution**: Use namespaces for tenant isolation.

```typescript
import { gstate } from '@biglogic/rgs';

// Each tenant gets their own namespace
const createTenantStore = (tenantId: string) => {
  return gstate({
    users: [],
    settings: {},
    billing: {}
  }, `tenant_${tenantId}`);
};

// Usage
const tenant1Store = createTenantStore('acme-corp');
const tenant2Store = createTenantStore('globex');
// Data is completely isolated between tenants
```

## Case Study 5: Real-Time Dashboard with WebSocket Sync

**Challenge**: Build a monitoring dashboard that updates in real-time and persists state.

**RGS Solution**:

```typescript
import { initState, watch } from '@biglogic/rgs';

initState(
  { metrics: [], alerts: [] },
  { namespace: 'monitoring', persist: true }
);

// Watch for state changes and sync via WebSocket
watch(['metrics', 'alerts'], (changes) => {
  websocket.send(JSON.stringify({
    type: 'state_update',
    data: changes
  }));
});

// Handle incoming WebSocket messages
websocket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'metrics_update') {
    setState('metrics', message.data);
  }
};
```

## Summary

These case studies demonstrate how RGS handles:
- **Data persistence** across sessions
- **Performance optimization** with surgical updates
- **Security** with built-in RBAC
- **Isolation** for multi-tenant applications
- **Real-time synchronization** for dashboards

Each scenario leverages RGS's core strengths: reactive state, enterprise security, and zero-boilerplate APIs.
