/**
 * Migration Tests - Data Migration System
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { createStore, destroyState } from '../../../index'

describe('Migration Tests', () => {
  beforeEach(() => {
    destroyState()
    localStorage.clear()
  })

  test('should migrate data on version change', () => {
    // Simulate old data in localStorage (version 1)
    // Key: migrate_test_user_old -> Key in store: user_old
    const oldData = {
      v: 1,
      t: Date.now(),
      d: 'value1'
    }
    localStorage.setItem('migrate_test_user_old', JSON.stringify(oldData))

    // Create store with migration from version 1 to 2
    const store = createStore({
      namespace: 'migrate_test',
      version: 2,
      migrate: (oldState: Record<string, unknown>, oldVersion: number) => {
        if (oldVersion === 1) {
          return {
            ...oldState,
            user_migrated: (oldState.user_old as string) + '_migrated',
            _migration: 'v1_to_v2'
          }
        }
        return oldState as any
      },
      silent: true
    })

    // Hydration is now sync for non-encrypted
    expect(store.get('user_migrated')).toBe('value1_migrated')
    expect(store.get('_migration')).toBe('v1_to_v2')
  })

  test('should not migrate if versions match', () => {
    const data = {
      v: 2,
      t: Date.now(),
      d: JSON.stringify({ existing: 'data' })
    }
    localStorage.setItem('no_migrate_test_existing', JSON.stringify(data))

    const migrateFn = jest.fn()
    createStore({
      namespace: 'no_migrate_test',
      version: 2,
      migrate: migrateFn as any,
      silent: true
    })

    expect(migrateFn).not.toHaveBeenCalled()
  })

  test('should handle multiple migrations', () => {
    // Simulate v1 data
    const oldData = {
      v: 1,
      t: Date.now(),
      d: '100'
    }
    localStorage.setItem('multi_migrate_value', JSON.stringify(oldData))

    const store = createStore({
      namespace: 'multi_migrate',
      version: 3,
      migrate: (state: any, version: number) => {
        let result = { ...state }
        if (version === 1) {
          result = { ...result, value: Number(result.value) * 10, v2: true }
          version = 2
        }
        if (version === 2) {
          result = { ...result, value: Number(result.value) + 50, v3: true }
        }
        return result
      },
      silent: true
    })

    expect(store.get('value')).toBe(1050)
    expect(store.get('v2')).toBe(true)
    expect(store.get('v3')).toBe(true)
  })
})
