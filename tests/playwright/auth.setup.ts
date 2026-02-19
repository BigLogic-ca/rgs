// global.setup.ts
import { test as setup, expect } from '@playwright/test'

import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pk = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../app.json'), 'utf-8'))

///

const authFile = path.join(__dirname, '.auth/user.json')

setup(
  'authenticate',
  async ({ page }) => {
    // Perform your login actions here
    await page.goto(pk.app.host.dev + ':' + pk.app.port + '/signin')
    await page.fill('input[name="username"]', 'test')
    await page.fill('input[name="password"]', 'test')
    await page.click('input[type="submit"]')

    const myDiv = await page.locator('#message')
    // Now you can perform actions or assertions on 'myDiv'
    // await expect(myDiv).toBeVisible()
    await expect(myDiv).toHaveText("Welcome") // Example: Clicking the div

    // Wait for successful login and save the state
    // await page.waitForURL(pk.app.url.dev + ':' + pk.app.port)
    await page.context().storageState({ path: authFile })
  }
)
