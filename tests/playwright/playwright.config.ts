import { defineConfig, devices } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pk = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../app.json'), 'utf-8'))

export default defineConfig(
  {

    use: {
      // Base URL to use in actions like `await page.goto('/')`.
      // baseURL: pk.app.host.dev + pk.app.port,

      // Populates context with given storage state.
      // storageState: 'state.json',

      // Collect trace when retrying the failed test.
      trace: 'on',
      video: 'on',
      screenshot: 'on',

      // Emulates `'prefers-colors-scheme'` media feature.
      colorScheme: 'dark',

      // Viewport used for all pages in the context.
      viewport: { width: 1280, height: 720 },

      // Whether to automatically download all the attachments.
      // acceptDownloads: false,

      // An object containing additional HTTP headers to be sent with every request.
      extraHTTPHeaders: {
        'X-App-Name': pk.app.code
      },

      // Whether to ignore HTTPS errors during navigation.
      ignoreHTTPSErrors: true,

      // Run browser in headless mode.
      headless: true

    },

    // Look for test files in the "tests" directory, relative to this configuration file.
    testDir: './tests', // Punterà a tests/playwright/tests

    // Run all tests in parallel.
    fullyParallel: true,

    // Fail the build on CI if you accidentally left test.only in the source code.
    forbidOnly: !!process.env.CI,

    // Retry on CI only.
    retries: process.env.CI ? 2 : 0,

    // Opt out of parallel tests on CI.
    workers: process.env.CI ? 1 : undefined,

    // Reporter to use
    reporter: [
      // [
      //   'json', {
      //     outputFolder: './tests/playwright/reports/',
      //     outputFile: 'reports.json',
      //     open: 'never'
      //   }
      // ],
      [
        'html', {
          outputFolder: './tests/playwright/reports/',
          outputFile: 'index.html',
          open: 'never'
        }
      ]
    ],

    // Folder for test artifacts such as screenshots, videos, traces, etc.
    outputDir: './tests/playwright/results',

    // // path to the global setup files.
    // globalSetup: require.resolve('../setup'),

    // // path to the global teardown files.
    // globalTeardown: require.resolve('../teardown'),


    // Configure projects for major browsers.
    projects: [
      {
        name: 'setup',
        testDir: '.', // Directory del config
        testMatch: /.*setup\.ts/
        // retries: 0
      },
      {
        name: 'local',
        use: {
          baseURL: pk.app.host.dev + ':' + pk.app.port
        },
        retries: 2
      },
      {
        name: 'production',
        use: {
          baseURL: pk.app.host.prod
        },
        retries: 2
      },
      {
        name: 'Google Chrome',
        use: {
          ...devices['Desktop Chrome'],
          channel: 'chrome'
        },
        dependencies: ['setup']
      }
    ],

    // Run your local dev server before starting the tests.
    /*
    webServer: {
      command: 'npm run dev',
      url: pk.app.host.dev + ':' + pk.app.port,
      reuseExistingServer: !process.env.CI
    }
    */
  }
)
