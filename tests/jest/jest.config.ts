import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'jsdom',
  rootDir: '../../',
  displayName: 'CLIENT',
  verbose: true,
  roots: ['<rootDir>'],
  testMatch: ['<rootDir>/tests/jest/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest/jest.setup.ts'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': '<rootDir>/tests/node_modules/ts-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/dist/'],
  transformIgnorePatterns: [
    '/node_modules/(?!(memorio|immer|dphelper.types)/)'
  ]
}

export default config
