import { gstate } from '../../index'

export interface AuthState extends Record<string, unknown> {
  user: { id: string, email: string } | null
  token: string | null
  isAuthenticated: boolean
}

/**
 * Secure Authentication Store
 * RECOMMENDED FOR: Frontend (FE) / Backend (BE)
 *
 * Demonstrates the 'encoded' option for basic obfuscation in localStorage.
 * Notice: For industrial-grade security, use encryptionKey in config.
 */
export const useAuth = gstate<AuthState>({
  user: null,
  token: null,
  isAuthenticated: false
}, {
  namespace: 'secure-auth',
  encoded: true, // Base64 encodes data in localStorage
  persist: true
})

export const login = (user: { id: string, email: string }, token: string) => {
  useAuth.transaction(() => {
    useAuth.set('user', user)
    useAuth.set('token', token)
    useAuth.set('isAuthenticated', true)
  })
}

export const logout = () => {
  useAuth.deleteAll() // Clears all state and storage for this namespace
}
