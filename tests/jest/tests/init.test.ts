/**
 * Init Tests - Global State Initialization
 * Tests for global state object and configuration
 */
import { test, expect } from '@jest/globals'
import 'dphelper'

// require('/src/core/global')
// state.config = {}
// console.log(state)

const obj = typeof {}

test('state config exist', () => {
  expect(typeof state).toBe(obj)
})
