import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for EntrevistaAI E2E tests.
 *
 * Tests live under `./tests/e2e`. They exercise the respondent-facing
 * interview flow (consent → lobby → interview room → finalize modal →
 * completion card). Tests that require a live Python LiveKit agent or
 * real voice audio are marked `fixme` in their spec files.
 *
 * Run locally:
 *   npm run test:e2e            # headless
 *   npm run test:e2e:headed     # headed
 *   npm run test:e2e:ui         # UI mode
 *   npm run test:e2e:debug      # debug mode (inspector)
 *   npm run test:e2e:report     # open last HTML report
 *
 * Run against a remote preview:
 *   PLAYWRIGHT_BASE_URL=https://preview.example.com npm run test:e2e
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3005'
const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Grant microphone so the lobby mic check doesn't need manual interaction.
    permissions: ['microphone'],
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Auto-start the Next.js dev server when testing against localhost.
  // Against a deployed preview (PLAYWRIGHT_BASE_URL set), skip the webServer.
  webServer: isLocalhost
    ? {
        command: 'npm run dev -- -p 3005',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
})
