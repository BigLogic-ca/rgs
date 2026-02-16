import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { createStore, destroyState } from '../../../index'

/**
 * New Features Tests
 * Tests for latest features: encoding, onError, maxObjectSize
 */
describe('New Features', () => {
  beforeEach(() => {
    localStorage.clear()
    destroyState()
  })

  /**
 * Tests for base64 encoding option
 */
  describe('encoded option (replaces secure)', () => {
    test('should encode data with encoded: true', async () => {
      const store = createStore({ namespace: 'test-encoded', debounceTime: 0 })
      store.set('secret', { password: '123' }, { persist: true, encoded: true })

      // Wait for async operations to complete
      await new Promise(r => setTimeout(r, 50))

      const raw = localStorage.getItem('test-encoded_secret')
      expect(raw).toBeTruthy()

      const meta = JSON.parse(raw!)
      expect(typeof meta.d).toBe('string')
      expect(meta.d).not.toContain('password') // Should be base64 encoded

      // Verify it can be decoded
      const decoded = JSON.parse(atob(meta.d))
      expect(decoded.password).toBe('123')
    })

    test('should support legacy secure option (backward compatibility)', async () => {
      const store = createStore({ namespace: 'test-secure', debounceTime: 0 })
      store.set('legacy', { data: 'test' }, { persist: true, secure: true })

      // Wait for async operations to complete
      await new Promise(r => setTimeout(r, 50))

      const raw = localStorage.getItem('test-secure_legacy')
      expect(raw).toBeTruthy()

      const meta = JSON.parse(raw!)
      expect(typeof meta.d).toBe('string')

      // Should work the same as encoded
      const decoded = JSON.parse(atob(meta.d))
      expect(decoded.data).toBe('test')
    })

    test('should not encode when encoded: false', async () => {
      const store = createStore({ namespace: 'test-plain', debounceTime: 0 })
      store.set('plain', { data: 'test' }, { persist: true, encoded: false })

      // Wait for async operations to complete
      await new Promise(r => setTimeout(r, 50))

      const raw = localStorage.getItem('test-plain_plain')
      expect(raw).toBeTruthy()

      const meta = JSON.parse(raw!)
      // When encoded: false, data is stored as plain JSON string (not base64)
      expect(typeof meta.d).toBe('string')
      expect(meta.d).toBe('{"data":"test"}')
    })
  })

  /**
 * Tests for onError callback option
 */
  describe('onError callback', () => {
    test('should call onError on plugin crash', () => {
      const onError = jest.fn()
      const store = createStore({ onError })

      // Add a plugin that crashes
      store._addPlugin({
        name: 'crasher',
        hooks: {
          onSet: () => {
            throw new Error('Plugin crash!')
          }
        }
      })

      store.set('test', 'value')

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Plugin crash!' }),
        expect.objectContaining({ operation: 'plugin:crasher:onSet', key: 'test' })
      )
    })

    test('should call onError on hydration failure', () => {
      // Corrupt localStorage
      localStorage.setItem('test-hydration_key', 'invalid json{')

      const onError = jest.fn()
      const store = createStore({ namespace: 'test-hydration', onError })

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ operation: 'hydration' })
      )
    })

    test('should fallback to console.error when onError not provided', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { })
      const store = createStore({ silent: false })

      store._addPlugin({
        name: 'crasher',
        hooks: {
          onSet: () => {
            throw new Error('Test error')
          }
        }
      })

      store.set('test', 'value')

      expect(consoleError).toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })

  /**
 * Tests for maxObjectSize warning feature
 */
  describe('maxObjectSize warning', () => {
    test('should warn when object exceeds maxObjectSize', () => {
      const onError = jest.fn()
      const store = createStore({
        maxObjectSize: 100, // 100 bytes
        onError
      })

      // Create object larger than 100 bytes
      const largeObject = { data: 'x'.repeat(200) }
      store.set('large', largeObject)

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('exceeds maxObjectSize') }),
        expect.objectContaining({ operation: 'set', key: 'large' })
      )
    })

    test('should not warn when object is within limit', () => {
      const onError = jest.fn()
      const store = createStore({
        maxObjectSize: 1000,
        onError
      })

      store.set('small', { data: 'test' })

      expect(onError).not.toHaveBeenCalled()
    })

    test('should disable warnings when maxObjectSize is 0', () => {
      const onError = jest.fn()
      const store = createStore({
        maxObjectSize: 0,
        onError
      })

      const hugeObject = { data: 'x'.repeat(10000) }
      store.set('huge', hugeObject)

      expect(onError).not.toHaveBeenCalled()
    })

    test('should use default 5MB limit when not specified', () => {
      const store = createStore()

      // Should not warn for reasonable objects
      store.set('normal', { data: 'x'.repeat(1000) })

      // Would warn for > 5MB (but we won't test that here due to memory)
      expect(store.get('normal')).toBeTruthy()
    })
  })

  describe('Integration: All features together', () => {
    test('should work with encoded + onError + maxObjectSize', async () => {
      const errors: any[] = []
      const store = createStore({
        namespace: 'integration',
        maxObjectSize: 500,
        debounceTime: 0,
        onError: (error, context) => {
          errors.push({ error: error.message, context })
        }
      })

      // 1. Normal set with encoding
      store.set('secret', { key: 'value' }, { persist: true, encoded: true })

      // Wait for async operations to complete
      await new Promise(r => setTimeout(r, 50))

      expect(errors.length).toBe(0)

      // 2. Large object warning
      store.set('large', { data: 'x'.repeat(1000) })
      expect(errors.length).toBe(1)
      expect(errors[0].context.operation).toBe('set')

      // 3. Plugin error
      store._addPlugin({
        name: 'test',
        hooks: {
          onSet: () => { throw new Error('Test') }
        }
      })
      store.set('trigger', 'value')
      expect(errors.length).toBe(2)
      expect(errors[1].context.operation).toContain('plugin')

      // Verify encoded data
      const raw = localStorage.getItem('integration_secret')
      const meta = JSON.parse(raw!)
      expect(typeof meta.d).toBe('string')
    })
  })
})
