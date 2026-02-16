import { test } from '@playwright/test'
import pk from '../../../app.json' with { type: 'json' }

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
  test(
    'api',
    async ({ page }) => {
      await page.route('https://dog.ceo/api/breeds/list/all', async route => {
        const response = await route.fetch()
        const json = await response.json()
        json.message['big_red_dog'] = []
        console.log(json)
        await route.fulfill({ response, json })
      })
    }
  )
})
