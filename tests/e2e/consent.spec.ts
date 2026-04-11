import { test, expect } from '@playwright/test'
import { openInterview, testTokens } from './fixtures'

/**
 * Consent screen tests.
 *
 * The consent screen is fully server-rendered + client-hydrated and does
 * NOT require the Python LiveKit agent or a Supabase write — only a read
 * of the invite token. These tests exercise the pure UI contract.
 */
test.describe('Interview consent screen', () => {
  test('renders the consent screen for a valid token', async ({ page }) => {
    await openInterview(page, testTokens.ximena)

    // EntrevistaAI brand
    await expect(page.getByText('EntrevistaAI').first()).toBeVisible()

    // Heading
    await expect(
      page.getByRole('heading', { name: /bienvenido a tu entrevista/i })
    ).toBeVisible()

    // 3 consent checkboxes
    const checkboxes = page.getByRole('checkbox')
    await expect(checkboxes).toHaveCount(3)

    // Submit button exists
    await expect(
      page.getByRole('button', { name: /comenzar entrevista/i })
    ).toBeVisible()
  })

  test('submit button is disabled when checkboxes are unchecked', async ({
    page,
  }) => {
    await openInterview(page, testTokens.ximena)

    const submit = page.getByRole('button', { name: /comenzar entrevista/i })
    await expect(submit).toBeDisabled()
  })

  test('submit button enables only when all 3 checkboxes are ticked', async ({
    page,
  }) => {
    await openInterview(page, testTokens.ximena)

    const checkboxes = page.getByRole('checkbox')
    const submit = page.getByRole('button', { name: /comenzar entrevista/i })

    // Reusable campaign links (like the Ximena fixture) render an extra
    // "Tu nombre" input that must also be filled for the button to enable.
    // We fill it up-front so the test focuses purely on checkbox gating.
    const nameInput = page.getByLabel(/tu nombre/i)
    if (await nameInput.count()) {
      await nameInput.fill('Playwright Test User')
    }

    // Tick the first two — button should still be disabled
    await checkboxes.nth(0).check()
    await expect(submit).toBeDisabled()
    await checkboxes.nth(1).check()
    await expect(submit).toBeDisabled()

    // Third checkbox enables the button
    await checkboxes.nth(2).check()
    await expect(submit).toBeEnabled()
  })

  test('invalid token shows the "Enlace no valido" card', async ({ page }) => {
    // Hit an interview page with a fake UUID. The server component looks
    // this up in Supabase and renders the invalid card when nothing matches.
    await page.goto(`/interview/${testTokens.invalid}`)

    await expect(
      page.getByRole('heading', { name: /enlace no valido/i })
    ).toBeVisible({ timeout: 15_000 })

    // Should not show the consent UI
    await expect(
      page.getByRole('heading', { name: /bienvenido a tu entrevista/i })
    ).toHaveCount(0)
  })
})
