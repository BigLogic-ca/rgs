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

// Fixed: The fetcher should accept the same arguments passed to .execute() or .run()
export const fetchUser = async (args?: { id: string }) => {
  if (!args?.id) throw new Error('ID is required')
  const response = await fetch(`https://jsonplaceholder.typicode.com/users/${args.id}`)
  if (!response.ok) throw new Error('User not found')
  return response.json() as Promise<User>
}

export const useUser = createAsyncStore<User>(fetchUser as any, {
  key: 'userData'
})

/**
 * Usage in component:
 *
 * const [state, actions] = useUser()
 * useEffect(() => { actions.execute({ id: '1' }) }, [])
 */
