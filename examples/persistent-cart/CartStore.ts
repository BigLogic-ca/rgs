import { gstate } from '../../index'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export interface CartState extends Record<string, unknown> {
  items: CartItem[]
  coupon: string | null
}

/**
 * Persistent Cart Store
 * RECOMMENDED FOR: Frontend (FE)
 */
export const useCart = gstate<CartState>({
  items: [],
  coupon: null
}, {
  namespace: 'shopping-cart',
  persist: true
})

export const addToCart = (product: Omit<CartItem, 'quantity'>) => {
  useCart.set('items', (items) => {
    const existing = items.find(item => item.id === product.id)
    if (existing) {
      existing.quantity++
    } else {
      items.push({ ...product, quantity: 1 })
    }
  })
}

export const getCartTotal = () => useCart.compute('totalPrice', (get) => {
  const items = get<CartItem[]>('items') || []
  return items.reduce((total, item) => total + (item.price * item.quantity), 0)
})
