import { gstate } from '../../index'

/**
 * RBAC Dashboard Store
 * RECOMMENDED FOR: Backend (BE) / Admin Frontend (FE)
 *
 * Demonstrates Role-Based Access Control.
 */
export const useDashboard = gstate({
  stats: { visitors: 100, revenue: 5000 },
  settings: { allowPublicSignup: true },
  logs: [] as string[]
}, {
  userId: 'manager-101',
  accessRules: [
    {
      // Allow 'manager-101' read access to stats
      pattern: (key, userId) => key === 'stats' && userId === 'manager-101',
      permissions: ['read']
    },
    {
      // Allow 'manager-101' full access to settings
      pattern: (key, userId) => key === 'settings' && userId === 'manager-101',
      permissions: ['read', 'write']
    },
    {
      // ONLY 'admin-user' can access logs
      pattern: (key, userId) => key === 'logs' && userId === 'admin-user',
      permissions: ['admin']
    }
  ]
})

/**
 * Attempt to add a log entry.
 * Will fail if the current store userId is not 'admin-user'.
 */
export const addLog = (msg: string) => {
  const success = useDashboard.set('logs', (draft: string[]) => {
    draft.push(msg)
  })
  if (!success) {
    console.warn(`[Security] Access Denied for user ${useDashboard.userId}: Insufficient permissions for 'logs'`)
  }
  return success
}
