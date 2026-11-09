import { defineConfig, devices } from '@playwright/test'

// Local e2e: runs the app on its own Vite server with /api/sheets and
// /api/chat faked in the browser (e2e/support/fakeBackend.js). Never touches
// the league's Google Sheet. Run: npx playwright test
const PORT = 5180
export const E2E_PASSWORD = 'e2e-commissioner'

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/*.prod.test.js',
  timeout: 60_000,
  fullyParallel: true,
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    ...devices['iPhone 13'],
    browserName: 'chromium',
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: { VITE_ADMIN_PASSWORD: E2E_PASSWORD },
  },
})
