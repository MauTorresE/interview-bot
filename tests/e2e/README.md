# EntrevistaAI E2E tests

Playwright-based end-to-end tests for the respondent-facing interview flow.

## Quick start

```bash
# Run the whole suite (headless, Chromium only)
npm run test:e2e

# Watch tests execute in a real browser
npm run test:e2e:headed

# Interactive UI mode — filter, rerun, time-travel
npm run test:e2e:ui

# Step-through debugger with the Playwright inspector
npm run test:e2e:debug

# Open the last HTML report
npm run test:e2e:report
```

By default the suite starts a Next.js dev server on `http://localhost:3005`
(see `webServer` in `playwright.config.ts`). If a dev server is already
running on that port, Playwright reuses it — so you can keep `npm run dev`
open in another terminal and rerun the suite quickly.

## Running against a different URL

```bash
# Preview deployment
PLAYWRIGHT_BASE_URL=https://entrevista-ai-git-main.vercel.app npm run test:e2e

# Production
PLAYWRIGHT_BASE_URL=https://entrevista.example.com npm run test:e2e
```

When `PLAYWRIGHT_BASE_URL` is set to a non-localhost URL, the `webServer`
config is skipped and the suite targets the remote URL directly.

## Test layout

```
tests/e2e/
├── fixtures.ts            # shared helpers + canonical test tokens
├── consent.spec.ts        # consent screen (no backend beyond Supabase read)
├── lobby.spec.ts          # lobby / mic check (needs /api/livekit/token)
├── finalize-modal.spec.ts # FinalizeModal component contract (currently fixme)
├── early-close.spec.ts    # user clicks "Finalizar entrevista" (currently fixme)
└── README.md              # this file
```

## What's covered today

- **Consent screen** — renders, checkbox gating, invalid-token error card.
- **Lobby** — renders after consent, mic selector present, Start button visible.

## What's currently skipped (and why)

Anything that touches the live voice pipeline is marked `test.fixme` with
a clear TODO block. The blockers are:

1. **The Python LiveKit agent cannot be mocked trivially.** It needs to run
   as a separate process, join the LiveKit room, and stream real audio.
   Until we either (a) inject synthetic data-channel messages via a
   test-only route or (b) run the suite against a live dev agent, the
   following cases stay `fixme`:
   - `finalize-modal.spec.ts` — the modal only mounts after a
     `ready_to_finalize` message arrives, OR after the 90s/100% fallback
     fires, neither of which happens in a headless Playwright run.
   - `early-close.spec.ts` — the "Finalizar entrevista" button in the
     interview room is only visible after the LiveKit room has connected
     AND the agent has joined.

2. **Real microphone audio.** Playwright grants the `microphone`
   permission (see `playwright.config.ts`) and Chromium provides a fake
   audio stream in headless mode, but the stream produces silence — so
   the lobby mic-level meter may never latch. The lobby tests assert
   visibility, not interaction.

## How to unblock the skipped tests

Two reasonable paths:

### Option A: synthetic data-channel injection

Add a test-only client-side hook behind `process.env.NODE_ENV !== 'production'`
that lets a Playwright test call `window.__entrevistaTest.injectFinalize(summary)`
and synthetically drive the `finalizeState` machine into `showing_modal`.
Then replace the `fixme` calls with real assertions against the
`<FinalizeModal>` DOM.

### Option B: live agent + short fixture

Stand up a dedicated test campaign in Supabase with a 30-second duration,
start the Python agent in `dev` mode as a background service in CI, and
let the suite run through the full voice pipeline. Expensive but the
most faithful signal.

## Adding a new test

1. Put it in `tests/e2e/<feature>.spec.ts`.
2. Import the helpers from `./fixtures` — prefer `openInterview`,
   `acceptConsent`, `waitForLobby`, etc. over raw selectors so that
   changes to the consent/lobby DOM only need to be fixed in one place.
3. If your test touches the voice pipeline, wrap it in `test.fixme(...)`
   with a TODO comment that explains exactly what needs to be mocked or
   injected to unblock it. Do NOT silently skip.
4. Add new test tokens to `fixtures.ts` under `testTokens` with a comment
   describing the fixture campaign they belong to.

## Troubleshooting

- **"Enlace no valido" on a token you expect to work** — the respondent
  fixture has already been used (status ≠ `pending`). Create a fresh
  respondent row in Supabase or use a reusable campaign invite link.
- **Lobby times out waiting for "Duracion estimada"** — the
  `/api/livekit/token` route failed. Check dev-server logs; the most
  likely cause is a missing `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` in
  `.env.local`.
- **webServer timeout after 120s** — `npm run dev` is slow to compile on
  cold start. Either bump the `webServer.timeout` in `playwright.config.ts`
  or start the dev server manually first (Playwright will reuse it).
