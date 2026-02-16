/**
 * Security Tests - Enterprise Security Features
 */
import { describe, test, expect, beforeEach } from '@jest/globals'
import {
  createStore,
  initState,
  destroyState,
  addAccessRule,
  hasPermission,
  validateKey,
  sanitizeValue,
  recordConsent,
  hasConsent,
  getConsents,
  revokeConsent,
  setAuditLogger,
  exportUserData,
  deleteUserData
} from '../../../index'

describe('Security Tests', () => {
  beforeEach(() => {
    destroyState()
    initState({ silent: true }) // Security now requires an active store
  })

  describe('Input Validation', () => {
    test('should validate correct keys', () => {
      expect(validateKey('user_123')).toBe(true)
      expect(validateKey('user-name')).toBe(true)
      expect(validateKey('user.name')).toBe(true)
      expect(validateKey('user123')).toBe(true)
    })

    test('should reject invalid keys', () => {
      expect(validateKey('')).toBe(false)
      expect(validateKey('user name')).toBe(false)
      expect(validateKey('user<script>')).toBe(false)
      expect(validateKey('../../../etc')).toBe(false)
      expect(validateKey('user;rm -rf')).toBe(false)
    })

    test('should sanitize values', () => {
      expect(sanitizeValue('plain text')).toBe('plain text')
      expect(sanitizeValue({ a: 1 })).toEqual({ a: 1 })
      expect(sanitizeValue(null)).toBe(null)
      expect(sanitizeValue(undefined)).toBe(undefined)
    })
  })

  describe('Access Control (RBAC)', () => {
    test('should allow by default', () => {
      expect(hasPermission('anykey', 'read')).toBe(true)
      expect(hasPermission('anykey', 'write')).toBe(true)
      expect(hasPermission('anykey', 'delete')).toBe(true)
    })

    test('should restrict with rules', () => {
      addAccessRule('admin_*', ['read', 'write', 'delete'])
      addAccessRule('user_*', ['read', 'write'])
      addAccessRule('public_*', ['read'])

      expect(hasPermission('admin_settings', 'read', 'user1')).toBe(true)
      expect(hasPermission('admin_settings', 'write', 'user1')).toBe(true)
      expect(hasPermission('user_profile', 'write', 'user1')).toBe(true)
      expect(hasPermission('user_profile', 'delete', 'user1')).toBe(false) // user can't delete
      expect(hasPermission('public_data', 'write', 'user1')).toBe(false)
    })

    test('should fail closed when rule exists but not matched', () => {
      addAccessRule('private_*', ['read'])
      expect(hasPermission('other_key', 'read')).toBe(false)
    })
  })

  describe('GDPR Compliance', () => {
    test('should record consent', () => {
      const consent = recordConsent('user123', 'marketing', true)
      expect(consent.granted).toBe(true)
      expect(consent.purpose).toBe('marketing')
    })

    test('should check consent status', () => {
      recordConsent('user456', 'analytics', true)
      recordConsent('user456', 'marketing', false)

      expect(hasConsent('user456', 'analytics')).toBe(true)
      expect(hasConsent('user456', 'marketing')).toBe(false)
    })

    test('should get all consents', () => {
      recordConsent('user789', 'analytics', true)
      recordConsent('user789', 'marketing', false)
      recordConsent('user789', 'cookies', true)

      const consents = getConsents('user789')
      expect(consents).toHaveLength(3)
    })

    // Skip for now - Jest line number bug
    test('should revoke consent', () => {
      recordConsent('user999', 'newsletter', true)
      const revoked = revokeConsent('user999', 'newsletter')

      expect(revoked).not.toBeNull()
      expect(revoked!.granted).toBe(false)
      expect(hasConsent('user999', 'newsletter')).toBe(false)
    })

    test('should export user data', () => {
      recordConsent('user888', 'marketing', true)
      recordConsent('user888', 'analytics', false)

      const exportData = exportUserData('user888')
      expect(exportData.userId).toBe('user888')
      expect(exportData.consents).toHaveLength(2)
    })

    test('should delete user data', () => {
      recordConsent('user777', 'marketing', true)
      recordConsent('user777', 'analytics', true)

      const result = deleteUserData('user777')
      expect(result.success).toBe(true)
      expect(result.deletedConsents).toBe(2)
    })
  })

  describe('Audit Logging', () => {
    test('should log operations to custom logger', () => {
      const logs: any[] = []

      // Set up audit logger
      setAuditLogger((entry) => logs.push(entry))

      const store = createStore({
        namespace: 'audit-test',
        auditEnabled: true,
        silent: true
      })

      store.set('key1', 'value1')
      store.get('key1')
      store.remove('key1')

      // Should have logged set and remove (get may not be logged by default)
      expect(logs.length).toBeGreaterThanOrEqual(2)
    })
  })
})
