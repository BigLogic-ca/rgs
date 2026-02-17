import { gstate, setAuditLogger, generateEncryptionKey } from '../../index'

/**
 * SECURITY BEST PRACTICES EXAMPLE
 *
 * RECOMMENDED FOR: Frontend (FE) and Backend (BE/Node)
 *
 * DESIGN PRINCIPLE:
 * - NEVER hardcode sensitive data (PII, Credit Cards, Keys) in source code.
 * - Use environment variables or secure user input at runtime.
 */

export interface VaultState extends Record<string, unknown> {
  encryptedData: string | null
}

/**
 * 1. AES-256-GCM Encryption (Enterprise Grade)
 * This store demonstrates how to handle sensitive information securely.
 */
export const initSecureVault = async () => {
  // At runtime, you would typically fetch the key from a secure vault or env
  const masterKey = await generateEncryptionKey()

  return gstate<VaultState>({
    encryptedData: null
  }, {
    namespace: 'secure-vault',
    persist: true,
    encryptionKey: masterKey, // Real AES-256-GCM encryption
    encoded: true
  })
}

/**
 * 2. Field-Level Sanitization (XSS Defense)
 * RECOMMENDED FOR: Frontend (FE)
 * Automatically strips <script> and other XSS vectors from input values.
 */
export const useProfileStore = gstate({
  bio: '',
  displayName: ''
}, {
  validateInput: true // Enables automatic sanitizeValue() on all .set() calls
})

/**
 * 3. Audit Logging Integration
 * RECOMMENDED FOR: Backend (BE) / Regulatory Compliance
 * Tracks every 'set' or 'delete' operation for accountability.
 */
const auditBuffer: any[] = []
setAuditLogger((entry) => {
  // In a real BE scenario, send this to a logging service (Datadog, Elastic, etc.)
  auditBuffer.push({
    ...entry,
    timestamp: new Date().toISOString()
  })
})

import type { IStore } from '../../index'

/**
 * 4. GDPR "Right to be Forgotten"
 * RECOMMENDED FOR: Compliance
 */
export const purgeUserData = (store: IStore<Record<string, unknown>>, userId: string) => {
  // Wipe state and storage
  store.deleteAll()

  // Enterprise: Wipe GDPR consents and audit traces
  store.deleteUserData(userId)

  console.info(`[Security] Data purge requested for ${userId}`)
}
