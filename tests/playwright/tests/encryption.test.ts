/**
 * Playwright E2E Encryption Test
 * Tests AES-256-GCM encryption in real browser environment
 */
import { test, expect } from '@playwright/test'

test.describe('AES-256-GCM Encryption', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('should encrypt data with Web Crypto API', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Generate a real AES-256 key using Web Crypto API
      const key = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      )

      // Test data
      const plaintext = 'Sensitive user data'
      const encoder = new TextEncoder()
      const data = encoder.encode(plaintext)

      // Generate IV (12 bytes for GCM)
      const iv = window.crypto.getRandomValues(new Uint8Array(12))

      // Encrypt
      const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      )

      // Decrypt
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      )

      const decoder = new TextDecoder()
      return decoder.decode(decrypted) === plaintext
    })

    expect(result).toBe(true)
  })

  test('should generate cryptographically secure random values', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Generate multiple random values
      const values: Uint8Array[] = []
      for (let i = 0; i < 10; i++) {
        values.push(window.crypto.getRandomValues(new Uint8Array(32)))
      }

      // Check that all values are different (very high probability)
      const allDifferent = values.every((v1, i) =>
        values.slice(i + 1).every(v2 =>
          !v1.every((byte, j) => byte === v2[j])
        )
      )

      return allDifferent
    })

    expect(result).toBe(true)
  })

  test('should handle encryption with special characters', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const testStrings = [
        'emoji 😀 test',
        'unicode ñ 中文',
        'special chars !@#$%^&*()',
        'newlines\n\nand\ttabs',
        'empty string',
        'very long string'.repeat(100)
      ]

      const key = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      )

      for (const plaintext of testStrings) {
        const encoder = new TextEncoder()
        const data = encoder.encode(plaintext)
        const iv = window.crypto.getRandomValues(new Uint8Array(12))

        const ciphertext = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          key,
          data
        )

        const decrypted = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          ciphertext
        )

        const decoder = new TextDecoder()
        if (decoder.decode(decrypted) !== plaintext) {
          return false
        }
      }

      return true
    })

    expect(result).toBe(true)
  })

  test('should correctly handle key derivation for persistence', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Derive a key from a password-like string using PBKDF2
      const password = 'user_secure_password_123'
      const encoder = new TextEncoder()
      const passwordData = encoder.encode(password)

      // Import password as key material
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        passwordData,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      )

      // Generate salt
      const salt = window.crypto.getRandomValues(new Uint8Array(16))

      // Derive AES-256 key
      const key = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      )

      // Test encryption/decryption with derived key
      const testData = 'Test data for derived key'
      const data = encoder.encode(testData)
      const iv = window.crypto.getRandomValues(new Uint8Array(12))

      const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      )

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      )

      const decoder = new TextDecoder()
      return decoder.decode(decrypted) === testData
    })

    expect(result).toBe(true)
  })
})
