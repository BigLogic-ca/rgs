/**
 * Enterprise Security Module - AES-256-GCM
 * RBAC, Audit Logging, GDPR Compliance, and Input Validation
 */

// --- Infrastructure ---

/**
 * Checks if Web Crypto API is available in the current environment
 */
export const isCryptoAvailable = typeof crypto !== 'undefined' &&
  typeof crypto.subtle !== 'undefined' &&
  typeof crypto.subtle.generateKey === 'function'

export interface EncryptionKey {
  key: CryptoKey
  iv: Uint8Array
}

// --- AES-256-GCM Encryption ---

/**
 * Generates a secure AES-256-GCM key and IV
 * @returns Promise<EncryptionKey>
 */
export const generateEncryptionKey = async (): Promise<EncryptionKey> => {
  if (!isCryptoAvailable) throw new Error('Web Crypto API not available')

  const
    key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    ),
    iv = crypto.getRandomValues(new Uint8Array(12))

  return { key, iv }
}

/**
 * Exports an encryption key to base64 strings
 * @param encryptionKey Key and IV to export
 * @returns Promise<{ key: string, iv: string }>
 */
export const exportKey = async (encryptionKey: EncryptionKey): Promise<{ key: string, iv: string }> => {
  const exportedKey = await crypto.subtle.exportKey('raw', encryptionKey.key)

  return {
    key: btoa(String.fromCharCode(...new Uint8Array(exportedKey))),
    iv: btoa(String.fromCharCode(...encryptionKey.iv))
  }
}

/**
 * Imports an encryption key from base64 strings
 * @param keyData Base64 encoded key
 * @param ivData Base64 encoded IV
 * @returns Promise<EncryptionKey>
 */
export const importKey = async (keyData: string, ivData: string): Promise<EncryptionKey> => {
  const
    keyBytes = Uint8Array.from(atob(keyData), c => c.charCodeAt(0)),
    ivBytes = Uint8Array.from(atob(ivData), c => c.charCodeAt(0)),
    key = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    )

  return { key, iv: ivBytes }
}

/**
 * Encrypts data using AES-256-GCM
 * @param data Data to encrypt
 * @param encryptionKey Key and IV
 * @returns Promise<string> Base64 combined IV + ciphertext
 */
export const encrypt = async (data: unknown, encryptionKey: EncryptionKey): Promise<string> => {
  const
    encoder = new TextEncoder(),
    encoded = encoder.encode(JSON.stringify(data)),
    encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: encryptionKey.iv as unknown as BufferSource },
      encryptionKey.key,
      encoded
    ),
    combined = new Uint8Array(encryptionKey.iv.length + encrypted.byteLength)

  combined.set(encryptionKey.iv)
  combined.set(new Uint8Array(encrypted), encryptionKey.iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypts AES-256-GCM encrypted data
 * @param encryptedData Base64 combined IV + ciphertext
 * @param encryptionKey Expected key
 * @returns Promise<T> Decrypted data
 */
export const decrypt = async <T>(encryptedData: string, encryptionKey: EncryptionKey): Promise<T> => {
  const
    combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0)),
    iv = combined.slice(0, 12),
    ciphertext = combined.slice(12),
    decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      encryptionKey.key,
      ciphertext
    )

  return JSON.parse(new TextDecoder().decode(decrypted))
}

// --- AUDIT LOGGING ---

export interface AuditEntry {
  timestamp: number
  action: 'set' | 'get' | 'delete' | 'hydrate'
  key: string
  userId?: string
  success: boolean
  error?: string
}

let _auditLogger: ((entry: AuditEntry) => void) | null = null

/**
 * Configures the global audit logger
 * @param logger Callback for audit entries
 */
export const setAuditLogger = (logger: (entry: AuditEntry) => void) => { _auditLogger = logger }

/**
 * Checks if audit logging is currently active (has a logger configured)
 */
export const isAuditActive = () => _auditLogger !== null

/**
 * Records an audit entry
 * @param entry Entry to log
 */
export const logAudit = (entry: AuditEntry) => { if (_auditLogger) _auditLogger(entry) }

// --- ENTERPRISE SECURITY SYSTEM ---

/**
 * Permission levels for Role-Based Access Control
 */
export type Permission = 'read' | 'write' | 'delete' | 'admin'

/**
 * Access control rules
 */
export interface AccessRule {
  /** Regex pattern for matching keys, or a function for dynamic checks */
  pattern: string | ((key: string, userId?: string) => boolean)
  /** Permissions granted by this rule */
  permissions: Permission[]
}

/**
 * Global access rules registry
 * Supports both string patterns and function-based rules
 */
export type AccessRulesMap = Map<string | ((key: string, userId?: string) => boolean), Permission[]>

/**
 * Adds an access rule for a key pattern
 * @param rules Map of rules to update
 * @param pattern Regex pattern or function for keys
 * @param perms Allowed permissions
 */
export const addAccessRule = (rules: AccessRulesMap, pattern: string | ((key: string, userId?: string) => boolean), perms: Permission[]) => {
  rules.set(pattern instanceof RegExp ? pattern.source : pattern, perms)
}

/**
 * Checks if a user has permission for an action on a key
 * @param rules Map of access rules
 * @param key Store key
 * @param action Requested action
 * @param _userId User identifier (optional)
 * @returns boolean - True if permission granted
 */
export const hasPermission = (rules: AccessRulesMap, key: string, action: Permission, _userId?: string): boolean => {
  // Default allow ONLY if no rules are defined at all
  if (rules.size === 0) return true

  // Check each rule pattern
  for (const [pattern, perms] of rules) {
    let matches: boolean

    // Check if pattern is a function
    if (typeof pattern === 'function') {
      matches = pattern(key, _userId)
    } else {
      // It's a regex string
      try {
        matches = new RegExp(pattern).test(key)
      } catch {
        // Invalid regex, skip
        continue
      }
    }

    if (matches) {
      // User has permission if requested action is in allowed permissions
      // Or if 'admin' permission is granted (full access)
      return perms.includes(action) || perms.includes('admin')
    }
  }

  // No matching rule found but rules EXIST = default DENY (Fail-Closed)
  return false
}

/**
 * Sanitizes values against common XSS patterns.
 * WARNING: While this provides a baseline defense, for applications requiring
 * high-security HTML sanitization, consider using an external library like DOMPurify.
 * @param value Value to sanitize
 * @returns Sanitized value
 */
export const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    // Prevent XSS vectors using a more comprehensive set of patterns
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[SEC-REMOVED]')
      .replace(/javascript:/gi, '[SEC-REMOVED]')
      .replace(/data:text\/html/gi, '[SEC-REMOVED]')
      .replace(/vbscript:/gi, '[SEC-REMOVED]')
      .replace(/on\w+\s*=/gi, '[SEC-REMOVED]=')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '[SEC-REMOVED]')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '[SEC-REMOVED]')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '[SEC-REMOVED]')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '[SEC-REMOVED]')
      .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '[SEC-REMOVED]')
      .replace(/<base\b[^<]*(?:(?!<\/base>)<[^<]*)*<\/base>/gi, '[SEC-REMOVED]')
      .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '[SEC-REMOVED]')
      .replace(/<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi, '[SEC-REMOVED]')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '[SEC-REMOVED]')
      .replace(/&#[xX]?[0-9a-fA-F]+;?/g, '') // Remove HTML entities that could be used for bypasses
  }

  // Deep clone and sanitize nested objects
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    // Check if it's a plain object or something else (like Date, Map, etc.)
    if (Object.getPrototypeOf(value) === Object.prototype) {
      const sanitized: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) {
        sanitized[k] = sanitizeValue(v)
      }
      return sanitized
    }
    return value // For non-plain objects, we return as is (security should be handled at the source)
  }

  // Array sanitization
  if (Array.isArray(value)) {
    return value.map(v => sanitizeValue(v))
  }

  // Primitive values
  return value
}

/**
 * Validates store key format and length
 * @param key Key to validate
 * @returns boolean - True if valid
 */
export const validateKey = (key: string): boolean => /^[a-zA-Z0-9_.-]+$/.test(key) && key.length <= 256

// --- GDPR COMPLIANCE ---

export interface ConsentRecord { id: string, purpose: string, granted: boolean, timestamp: number }
export type ConsentsMap = Map<string, ConsentRecord[]>

/**
 * Records user consent for a specific purpose
 * @param consents Map of consents
 * @param userId User identifier
 * @param purpose Purpose of data processing
 * @param granted Whether consent is granted
 * @returns ConsentRecord
 */
export const recordConsent = (consents: ConsentsMap, userId: string, purpose: string, granted: boolean): ConsentRecord => {
  const
    record = { id: crypto.randomUUID(), purpose, granted, timestamp: Date.now() },
    user = consents.get(userId) || []

  user.push(record)
  consents.set(userId, user)

  logAudit({ timestamp: Date.now(), action: 'set', key: `consent:${purpose}`, userId, success: true })

  return record
}

/**
 * Checks if a user has granted consent for a purpose
 * @param consents Map of consents
 * @param userId User identifier
 * @param purpose Purpose to check
 * @returns boolean
 */
export const hasConsent = (consents: ConsentsMap, userId: string, purpose: string): boolean => {
  const userConsents = consents.get(userId)
  if (!userConsents) return false

  // Find the latest record for this purpose (insertion order is reliable)
  for (let i = userConsents.length - 1; i >= 0; i--) {
    const record = userConsents[i]
    if (record && record.purpose === purpose) {
      return record.granted
    }
  }

  return false
}

/**
 * Revokes user consent for a specific purpose
 * @param consents Map of consents
 * @param userId User identifier
 * @param purpose Purpose of data processing
 * @returns ConsentRecord | null
 */
export const revokeConsent = (consents: ConsentsMap, userId: string, purpose: string): ConsentRecord | null => {
  return recordConsent(consents, userId, purpose, false)
}

/**
 * Retrieves all consent records for a user
 * @param consents Map of consents
 * @param userId User identifier
 * @returns ConsentRecord[]
 */
export const getConsents = (consents: ConsentsMap, userId: string) => consents.get(userId) || []

/**
 * Exports all data associated with a user
 * @param consents Map of consents
 * @param userId User identifier
 * @returns Exported data object
 */
export const exportUserData = (consents: ConsentsMap, userId: string) => ({ userId, exportedAt: Date.now(), consents: consents.get(userId) || [] })

/**
 * Deletes all user data (Right to be Forgotten)
 * @param consents Map of consents
 * @param userId User identifier
 * @returns Result status
 */
export const deleteUserData = (consents: ConsentsMap, userId: string) => {
  const count = consents.get(userId)?.length || 0
  consents.delete(userId)

  return { success: true, deletedConsents: count }
}
