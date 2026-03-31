import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 300_000,
  use: {
    baseURL: 'https://bush-league-bocce.vercel.app',
    headless: true,
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
