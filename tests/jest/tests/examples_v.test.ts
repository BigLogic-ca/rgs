import { useCounter, increment } from '../../../examples/basic-counter/CounterStore'
import { initTheme, toggleTheme } from '../../../examples/global-theme/ThemeManager'
import { useCart, addToCart, getCartTotal } from '../../../examples/persistent-cart/CartStore'
import { useAuth, login, logout } from '../../../examples/secure-auth/AuthStore'
import { useDashboard, addLog } from '../../../examples/rbac-dashboard/DashboardStore'
import { initSecureVault } from '../../../examples/security-best-practices/SecurityStore'
import { destroyState } from '../../../index'

describe('RGS Examples Validation', () => {

  beforeEach(() => {
    destroyState()
    localStorage.clear()
  })

  test('Basic Counter validation', () => {
    useCounter.set('count', 10)
    increment()
    expect(useCounter.get('count')).toBe(11)
  })

  test('Global Theme validation', () => {
    const themeStore = initTheme()
    themeStore.set('mode', 'light')
    toggleTheme()
    expect(themeStore.get('mode')).toBe('dark')
  })

  test('Persistent Cart validation', () => {
    useCart.set('items', [], { persist: false })
    addToCart({ id: '1', name: 'Product', price: 100 })
    expect(getCartTotal()).toBe(100)
  })

  test('Secure Auth validation', () => {
    login({ id: '1', email: 'test@example.com' }, 'token-abc')
    expect(useAuth.get('isAuthenticated')).toBe(true)
    logout()
    // deleteAll() removes everything, so get() should return null or initial value if store re-inits
    // In our case, deleteAll() completely wipes the store instance's Map.
    expect(useAuth.get('isAuthenticated')).toBeFalsy()
  })

  test('Security Vault validation (Async Init)', async () => {
    const vault = await initSecureVault()
    vault.set('encryptedData', 'secret')
    expect(vault.get('encryptedData')).toBe('secret')
  })

  test('RBAC Dashboard validation', () => {
    // manager-101 has no admin rights, so 'logs' should return null on get()
    // and fail on set()
    useDashboard.set('logs', ['initial'], { persist: false }) // This set will ALSO fail because of RBAC

    const success = addLog('Attack')
    expect(success).toBe(false)

    // get('logs') returns null because of RBAC deny
    expect(useDashboard.get('logs')).toBeNull()
  })
})
