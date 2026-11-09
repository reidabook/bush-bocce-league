import { defineConfig, devices } from '@playwright/test'

// Read-only smoke test against production. Only *.prod.test.js runs here —
// nothing in it writes to the league's data.
// Run: npx playwright test --config=playwright.prod.config.js
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.prod.test.js',
  timeout: 60_000,
  use: {
    baseURL: 'https://bush-league-bocce.vercel.app',
    headless: true,
    ...devices['iPhone 13'],
    browserName: 'chromium',
  },
})
