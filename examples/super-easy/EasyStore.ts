import { gstate } from '../../index'

/**
 * Super Easy Example Store
 * Demonstrates: set, get, delete, and multi-value state.
 */

// 1. Define your initial state
const initialState = {
  user: { name: 'Dario', role: 'Dev' },
  theme: 'dark',
  notifications: 5,
  tempData: 'temporary information'
}

// 2. Create the store (The "Magnetar" way)
export const useEasyStore = gstate(initialState)

// Conditional debug logging
const isDev = process.env.NODE_ENV !== 'production'
const debugLog = (...args: unknown[]) => { if (isDev) console.debug(...args) }

// --- PRACTICAL ACTIONS ---

/**
 * SET: Update specific values
 */
export const updateSettings = () => {
  // Direct value set
  useEasyStore.set('theme', 'light')

  // Functional update (via Immer) - safe and easy for nested objects
  useEasyStore.set('user', (draft) => {
    draft.role = 'Architect'
  })
}

/**
 * GET: Retrieve values programmatically
 */
export const checkState = () => {
  const currentTheme = useEasyStore.get('theme')
  const user = useEasyStore.get('user')

  debugLog(`Current Theme: ${currentTheme}`)
  debugLog(`User Name: ${user?.name}`)
}

/**
 * DELETE: Remove a key from the state
 */
export const clearTempData = () => {
  // Removes the 'tempData' key entirely from the store
  const success = useEasyStore.delete('tempData')
  return success
}

/**
 * REACTIVE HOOK USAGE (Inside a component)
 *
 * const [theme, setTheme] = useEasyStore('theme')
 * const [user] = useEasyStore('user')
 *
 * return <div className={theme}>{user.name}</div>
 */
