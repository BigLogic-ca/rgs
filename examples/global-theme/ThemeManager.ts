import { gstate, getStore } from '../../index'

// Define the shape of our theme state
export interface ThemeState extends Record<string, unknown> {
  mode: 'light' | 'dark'
  accent: string
}

/**
 * Global Theme Manager
 * RECOMMENDED FOR: Frontend (FE)
 *
 * Demonstrates global state using a dedicated store instance.
 */
export const useTheme = gstate<ThemeState>({
  mode: 'light',
  accent: '#007bff'
}, {
  namespace: 'theme-store',
  persist: true
})

/**
 * Helper to initialize the theme (useful for SSR or specific init logic)
 */
export const initTheme = () => useTheme

// Reusable action to toggle theme
export const toggleTheme = () => {
  const current = useTheme.get('mode')
  useTheme.set('mode', current === 'light' ? 'dark' : 'light')
}
