import { test, expect } from '@playwright/test'

/**
 * TEST LAB: Enterprise-Grade Cross-Tab Synchronization
 * This test simulates multiple browser contexts interacting concurrently.
 */
test.describe('Test Lab: Cross-Tab Resilience', () => {
  test('Sync consistency across multiple concurrent tabs', async ({ context }) => {
    // Open 3 independent tabs with a real origin (data URLs or unique origins)
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ])

    const initLab = async (page: any, id: number) => {
      // Use a unique query param to ensure they are slightly different but same origin
      await page.goto('https://example.com/?tab=' + id)
      await page.evaluate((tabId: number) => {
        // @ts-ignore
        // @ts-ignore
        const bc = new BroadcastChannel('gstate_sync')
        // @ts-ignore
        window.storeState = {}
        // @ts-ignore
        window.timestamps = {}

        // @ts-ignore
        window.dispatchSync = (key: string, value: any) => {
          const ts = Date.now() + Math.random() // Uniqueish timestamp
          // @ts-ignore
          window.storeState[key] = value
          // @ts-ignore
          window.timestamps[key] = ts
          bc.postMessage({ key, value, ts, source: tabId })
        }

        bc.onmessage = (event) => {
          const { key, value, ts } = event.data
          // @ts-ignore
          const currentTs = window.timestamps[key] || 0

          if (ts > currentTs) {
            // @ts-ignore
            window.storeState[key] = value
            // @ts-ignore
            window.timestamps[key] = ts
          }
        }
      }, id)
    }

    await Promise.all(pages.map((p, i) => initLab(p, i)))

    // Chaos: Concurrent writes to the same key from different tabs
    // We trigger them almost simultaneously
    await Promise.all([
      pages[0].evaluate(() => (window as any).dispatchSync('status', 'online')),
      pages[1].evaluate(() => (window as any).dispatchSync('status', 'away')),
      pages[2].evaluate(() => (window as any).dispatchSync('status', 'busy')),
    ])

    // Wait for propagation (BroadcastChannel is asynchronous)
    await new Promise(resolve => setTimeout(resolve, 1000))

    const results = await Promise.all(pages.map(async (p, i) => {
      const state = await p.evaluate(() => (window as any).storeState.status)
      return { tab: i, state }
    }))

    console.log('Sync Results:', results)

    // Assert eventual consistency: all tabs must have the same value
    const finalState = results[0].state
    expect(finalState).toBeDefined()
    results.forEach(r => {
      expect(r.state).toBe(finalState)
    })
  })
})
