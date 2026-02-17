import { createAsyncStore } from '../../index'

/**
 * Async Data Loader Utility
 * RECOMMENDED FOR: Frontend (FE)
 */

interface User {
  id: number
  name: string
  email: string
}

export const fetchUser = async (args: { id: string }) => {
  const response = await fetch(`https://jsonplaceholder.typicode.com/users/${args.id}`)
  if (!response.ok) throw new Error('User not found')
  return response.json() as Promise<User>
}

// Basic Async Store for a specific user (Example)
export const useUser = createAsyncStore<User>(() => fetchUser({ id: '1' }), {
  key: 'userData'
})

/**
 * Usage in component:
 *
 * const [state, actions] = useUser()
 * useEffect(() => { actions.execute({ id: '1' }) }, [])
 */
