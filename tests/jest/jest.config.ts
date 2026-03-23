import type { Config } from 'jest'
import { fileURLToPath } from 'url'
import * as path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
    '^.+\\.tsx?$': path.resolve(__dirname, '../../tests/node_modules/ts-jest')
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/dist/'],
  transformIgnorePatterns: [
    '/node_modules/(?!(memorio|immer|dphelper.types)/)'
  ]
}

export default config
