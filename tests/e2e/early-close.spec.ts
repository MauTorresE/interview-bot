import { test } from '@playwright/test'

/**
 * Early-close (user-initiated finalize) tests.
 *
 * The "Finalizar entrevista" button in the main interview room is only
 * mounted when the InterviewRoom component successfully connects to
 * LiveKit AND the Python agent joins the room. Without a live agent the
 * room stalls at the "connecting" state and the button is never visible.
 *
 * These tests are therefore marked `fixme` until the test environment
 * can spin up the Python agent — either locally via
 *     python agent/entrevista_agent.py dev
 * or via a dedicated test harness agent in CI.
 *
 * The DOM contract these tests will assert (once unblocked):
 *   - Clicking "Finalizar entrevista" hides the button AND reveals a
 *     wrap-up banner with role="status" and exact Spanish text
 *     "El entrevistador está preparando un resumen...".
 *   - The banner remains visible until the FinalizeModal takes over.
 */
test.describe('Early close flow (user clicks Finalizar entrevista)', () => {
  test.fixme(
    'clicking "Finalizar entrevista" reveals the wrap-up banner',
    async ({ page }) => {
      // TODO(voice): requires live Python agent. Steps once enabled:
      //   1. openInterview(page, testTokens.ximena)
      //   2. acceptConsent(page)
      //   3. waitForLobby(page)
      //   4. click the lobby "Comenzar entrevista" button
      //   5. waitForInterviewRoom(page)
      //   6. click getByRole('button', { name: 'Finalizar entrevista' })
      //   7. waitForWrapupBanner(page)
      //   8. assert getByRole('status') contains "preparando un resumen"
      void page
    }
  )

  test.fixme(
    'wrap-up banner text matches the exact Spanish string',
    async ({ page }) => {
      // TODO(voice): same setup as above. Assert the banner text is
      //   "El entrevistador está preparando un resumen..."
      // byRole('status') matching that text, and that it's the only
      // status region on the page at that moment.
      void page
    }
  )
})
