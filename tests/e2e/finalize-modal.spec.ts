import { test } from '@playwright/test'

/**
 * FinalizeModal component tests.
 *
 * The FinalizeModal is rendered by interview-room.tsx only when the
 * finalizeState machine is in `showing_modal` or `finalizing`. Getting
 * there requires one of:
 *   (a) a live Python LiveKit agent that delivers a `ready_to_finalize`
 *       data-channel message after the closing summary, OR
 *   (b) the 100% frontend fallback timer, which for the 5-min Ximena
 *       fixture means waiting ~5 minutes of real time.
 *
 * Neither is practical inside a headless Playwright run without a real
 * backend. We therefore mark these as fixme with an explicit TODO so they
 * can be wired up later — either by:
 *   - standing up a Storybook harness that mounts <FinalizeModal> in
 *     isolation and targeting it via a /_test-harness route, or
 *   - injecting synthetic data channel traffic via a /__test/inject
 *     route gated behind NODE_ENV !== 'production', or
 *   - running the full suite against a live dev agent and using a very
 *     short-duration test fixture campaign.
 *
 * The DOM contract these tests will assert (once unblocked):
 *   - role="dialog" with aria-modal="true"
 *   - heading "¡Gracias por tu tiempo!"
 *   - Sparkle icon inside the hero circle
 *   - Summary paragraph (live region)
 *   - Primary button with text that swaps based on agentState:
 *       * "Finalizar entrevista"           (agent idle/listening)
 *       * "Esperando al entrevistador..."  (agent speaking/thinking, or queued)
 *       * "Finalizando..."                 (confirming=true)
 *   - Escape key does NOT close the modal
 *   - Focus moves to the primary button ~320ms after mount
 */
test.describe('FinalizeModal component', () => {
  test.fixme(
    'renders with sparkle icon, title, summary, and button',
    async ({ page }) => {
      // TODO: inject ready_to_finalize state via test-only route and assert:
      //   - getByRole('dialog') visible
      //   - getByRole('heading', { name: /gracias por tu tiempo/i }) visible
      //   - summary text visible
      //   - primary button visible with text "Finalizar entrevista"
      void page
    }
  )

  test.fixme(
    'button text changes based on agentState prop',
    async ({ page }) => {
      // TODO: render modal with agentState='speaking' → button label is
      //   "Esperando al entrevistador..." and disabled.
      // Then transition agentState to 'listening' → button label becomes
      //   "Finalizar entrevista" and enabled.
      void page
    }
  )

  test.fixme(
    'clicking button while agent is speaking queues the confirmation',
    async ({ page }) => {
      // TODO: render modal with agentState='speaking'. Click the button.
      // Assert the onConfirm handler has NOT fired yet and the label shows
      // "Esperando al entrevistador...". Transition agentState → 'listening'.
      // Assert onConfirm fires exactly once.
      void page
    }
  )

  test.fixme('Escape key is blocked', async ({ page }) => {
    // TODO: render modal, press Escape, assert modal is still visible.
    void page
  })

  test.fixme(
    'focus moves to the Finalizar button on mount',
    async ({ page }) => {
      // TODO: render modal, wait 400ms, assert document.activeElement is
      // the primary button (evaluate in the page context or use
      // locator('button').evaluate(b => b === document.activeElement)).
      void page
    }
  )
})
