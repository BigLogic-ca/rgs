/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  rootDir: '../../',
  displayName: 'CLIENT',
  verbose: true,
  roots: ['<rootDir>'],
  testMatch: ['<rootDir>/tests/jest/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest/jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['<rootDir>/tests/node_modules/ts-jest', {
      useESM: true,
      tsconfig: {
        rootDir: '<rootDir>',
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        module: 'ES2020',
        moduleResolution: 'node',
        ignoreDeprecations: '6.0'
      }
    }]
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
