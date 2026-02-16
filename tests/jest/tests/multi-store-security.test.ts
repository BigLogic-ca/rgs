import { describe, test, expect, beforeEach } from '@jest/globals'
import { createStore, destroyState } from '../../../index'

describe('Multi-Store Security Isolation', () => {
  beforeEach(() => {
    destroyState()
  })

  test('should isolate access rules between different stores', () => {
    const storeA = createStore({ namespace: 'storeA', silent: true })
    const storeB = createStore({ namespace: 'storeB', silent: true })

    // Rule for Store A: public_* is read-only
    storeA.addAccessRule('public_*', ['read'])

    // Rule for Store B: public_* is admin (full access)
    storeB.addAccessRule('public_*', ['read', 'write', 'delete'])

    // Check Store A
    expect(storeA.hasPermission('public_data', 'read')).toBe(true)
    expect(storeA.hasPermission('public_data', 'write')).toBe(false)

    // Check Store B
    expect(storeB.hasPermission('public_data', 'read')).toBe(true)
    expect(storeB.hasPermission('public_data', 'write')).toBe(true)
  })

  test('should isolate consents between different stores', () => {
    const storeA = createStore({ namespace: 'storeA', silent: true })
    const storeB = createStore({ namespace: 'storeB', silent: true })

    storeA.recordConsent('user1', 'marketing', true)

    // Store B should NOT see Store A's consents
    expect(storeA.hasConsent('user1', 'marketing')).toBe(true)
    expect(storeB.hasConsent('user1', 'marketing')).toBe(false)

    storeB.recordConsent('user1', 'marketing', false)
    expect(storeB.hasConsent('user1', 'marketing')).toBe(false)
    expect(storeA.hasConsent('user1', 'marketing')).toBe(true)
  })

  test('should handle plugin methods isolation', () => {
    const storeA = createStore({ namespace: 'storeA', silent: true })
    const storeB = createStore({ namespace: 'storeB', silent: true })

    storeA._registerMethod('testPlugin', 'greet', () => 'Hello from A')
    storeB._registerMethod('testPlugin', 'greet', () => 'Hello from B')

    const pA = storeA.plugins.testPlugin as Record<string, () => string>
    const pB = storeB.plugins.testPlugin as Record<string, () => string>

    expect(pA?.greet()).toBe('Hello from A')
    expect(pB?.greet()).toBe('Hello from B')
  })
})
