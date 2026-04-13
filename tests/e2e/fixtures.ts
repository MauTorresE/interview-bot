import { expect, type Page } from '@playwright/test'

/**
 * Shared test fixtures and helpers for EntrevistaAI E2E tests.
 *
 * These helpers encapsulate the standard respondent journey:
 *   1. openInterview()        — navigate to /interview/:token
 *   2. acceptConsent()        — tick the 3 checkboxes, click "Comenzar entrevista"
 *   3. waitForLobby()         — wait for the mic check UI
 *   4. waitForInterviewRoom() — wait for the orb + transcript container
 *   5. waitForFinalizeModal() — wait for the "¡Gracias por tu tiempo!" modal
 *
 * Add new tokens to `testTokens` as new fixtures are created in Supabase.
 */

export const testTokens = {
  /**
   * Ximena — 5-minute structured interview used as the canonical E2E test
   * fixture. Owned by the dev database. Update if the token is rotated.
   */
  ximena: '9aefb39a-c5ab-4a0e-95c8-0e00022fb83f',
  /**
   * A random UUID that should not exist in any respondents or campaigns
   * table. Used to assert the "Enlace no valido" error card.
   */
  invalid: '00000000-0000-0000-0000-000000000000',
} as const

/**
 * Navigate to an interview invite link and wait for the consent screen to
 * appear. Assumes the token belongs to a respondent-type invite (direct
 * link). For reusable campaign links, the caller should additionally fill
 * the name input before submitting.
 */
export async function openInterview(page: Page, token: string): Promise<void> {
  await page.goto(`/interview/${token}`)
  // The consent screen always renders the "Bienvenido" heading.
  await expect(
    page.getByRole('heading', { name: /bienvenido a tu entrevista/i })
  ).toBeVisible({ timeout: 15_000 })
}

/**
 * Tick all 3 consent checkboxes, fill the name input if present (reusable
 * campaign invite links show an extra "Tu nombre" field), and click
 * "Comenzar entrevista". Does NOT wait for the lobby — chain with
 * `waitForLobby()` if you need to assert the next screen.
 */
export async function acceptConsent(
  page: Page,
  opts: { name?: string } = {}
): Promise<void> {
  // If the token is a reusable campaign link, a "Tu nombre" textbox is
  // rendered. Fill it first so the submit button can enable.
  const nameInput = page.getByLabel(/tu nombre/i)
  if (await nameInput.count()) {
    await nameInput.fill(opts.name ?? 'Playwright Test User')
  }

  const checkboxes = page.getByRole('checkbox')
  const count = await checkboxes.count()
  // Sanity: consent-form.tsx defines exactly 3 CONSENT_ITEMS.
  expect(count).toBeGreaterThanOrEqual(3)
  for (let i = 0; i < 3; i++) {
    await checkboxes.nth(i).check()
  }
  await page.getByRole('button', { name: /comenzar entrevista/i }).click()
}

/**
 * Wait for the lobby screen (mic check + start button) to be visible.
 * The lobby shows a "Comenzar entrevista" button (reused text — the
 * selector disambiguates via the presence of mic device controls).
 */
export async function waitForLobby(page: Page): Promise<void> {
  // Lobby has a Select trigger for mic devices ("Selecciona microfono" placeholder
  // OR the selected device label). Prefer the "Duracion estimada" text as a
  // stable discriminator unique to the lobby UI.
  await expect(page.getByText(/duracion estimada/i)).toBeVisible({
    timeout: 20_000,
  })
}

/**
 * Wait for the interview room to mount: the orb + transcript + text input.
 * This requires LiveKit to connect, which requires the Python agent to be
 * running. Tests that use this helper should be gated behind `fixme` if
 * the agent is not available in the current environment.
 */
export async function waitForInterviewRoom(page: Page): Promise<void> {
  // The text fallback input is a stable anchor: it's rendered regardless of
  // agent connection state and disappears only when the finalize modal opens.
  await expect(
    page.getByPlaceholder(/escribe un mensaje|mensaje/i).first()
  ).toBeVisible({ timeout: 30_000 })
}

/**
 * Wait for the FinalizeModal to appear. Matches by the modal's heading
 * "¡Gracias por tu tiempo!" which is unique across the app.
 */
export async function waitForFinalizeModal(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: /gracias por tu tiempo/i })
  ).toBeVisible({ timeout: 30_000 })
}

/**
 * Wait for the wrap-up banner that appears after the user clicks
 * "Finalizar entrevista" early (Wave 2.1) or the 90% timer fires.
 * Selector: role="status" + exact Spanish string.
 */
export async function waitForWrapupBanner(page: Page): Promise<void> {
  await expect(
    page.getByRole('status').filter({ hasText: /preparando un resumen/i })
  ).toBeVisible({ timeout: 15_000 })
}
