import { test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pk = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../app.json'), 'utf-8'))

// Configure baseURL for this file.
test.use({ baseURL: pk.app.host.prod })

test(
  'check intro contents',
  async ({ page }) => {
    await page.screenshot(
      {
        path: './tests/playwright/screenshot/000.png',
        fullPage: true
      }
    )
  }
)

test.describe(() => {
  // Reset the value to a config-defined one.
  test.use({ baseURL: 'https://google.ca' })

  test(
    'can navigate to intro from the home page',
    async ({ page }) => {
      await page.screenshot(
        {
          path: './tests/playwright/screenshot/001.png',
          fullPage: true
        }
      )
    }
  )
})
