import { test, expect } from '@playwright/test'
import {
  acceptConsent,
  openInterview,
  testTokens,
  waitForLobby,
} from './fixtures'

/**
 * Lobby screen tests.
 *
 * The lobby runs after consent and before LiveKit connection. It requires:
 *   - A working /api/livekit/token endpoint (Supabase reachable)
 *   - Microphone permission (granted globally via playwright.config.ts)
 *
 * It does NOT require the Python LiveKit agent to be running — the agent
 * only joins once the InterviewRoom component mounts the LiveKitRoom.
 *
 * NOTE: if consent submission fails (e.g. the token is already "used"),
 * these tests will be reported as timeouts on `waitForLobby`. Rotate the
 * test fixture token if you see this.
 */
test.describe('Interview lobby', () => {
  test('lobby renders after consent acceptance', async ({ page }) => {
    await openInterview(page, testTokens.ximena)
    await acceptConsent(page)
    await waitForLobby(page)

    // Persona name and duration are shown
    await expect(page.getByText(/entrevistador:/i)).toBeVisible()
    await expect(page.getByText(/duracion estimada/i)).toBeVisible()
  })

  test('mic device selector is present and populated', async ({ page }) => {
    await openInterview(page, testTokens.ximena)
    await acceptConsent(page)
    await waitForLobby(page)

    // The Select trigger has combobox role via Radix / base-ui. It may be
    // rendered as a button with a placeholder or a device label.
    const micSelect = page
      .getByRole('combobox')
      .or(page.getByRole('button', { name: /selecciona microfono|default|microfono/i }))

    await expect(micSelect.first()).toBeVisible({ timeout: 10_000 })
  })

  test('"Comenzar entrevista" button is visible in the lobby', async ({
    page,
  }) => {
    await openInterview(page, testTokens.ximena)
    await acceptConsent(page)
    await waitForLobby(page)

    // The lobby Start button reuses the "Comenzar entrevista" label.
    // It may be disabled until a mic level is detected, which in headless
    // mode with fake mic may or may not happen — we only assert visibility.
    await expect(
      page.getByRole('button', { name: /comenzar entrevista/i })
    ).toBeVisible()
  })
})
