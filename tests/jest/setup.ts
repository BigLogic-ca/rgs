import { jest } from '@jest/globals'
import { webcrypto } from 'node:crypto'

// Polyfill Web Crypto for JSDOM
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true
  })
}

// Functional Mock for localStorage
const createStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    // Helper for Object.keys(localStorage)
    ...{ get [Symbol.iterator]() { return Object.keys(store)[Symbol.iterator]() } }
  }
}

const localStorageMock = createStorageMock()
const sessionStorageMock = createStorageMock()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock, writable: true })

// Mock navigator
Object.defineProperty(globalThis, 'navigator', {
  value: {
    userAgent: 'node.js',
    storage: {
      estimate: () => Promise.resolve({ usage: 0, quota: 1000000 })
    }
  },
  configurable: true
})

// Initialize global objects
globalThis.state = {}
globalThis.store = {
  get: jest.fn(key => null),
  set: jest.fn((key, value) => true),
  remove: jest.fn(() => true),
  removeAll: jest.fn(() => true),
  delete: jest.fn(() => true),
  clearAll: jest.fn(() => true),
  quota: jest.fn(() => ({ usage: 0, quota: 1000000 })),
  size: jest.fn(() => 0)
}
globalThis.cache = {}
// globalThis.observer = jest.fn()
