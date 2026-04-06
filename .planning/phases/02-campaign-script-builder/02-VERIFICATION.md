---
phase: 02-campaign-script-builder
verified: 2026-04-06T22:33:19Z
status: human_needed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Full end-to-end campaign creation and interview flow"
    expected: "Create campaign -> fill brief -> add respondent -> copy invite link -> open link in incognito -> see consent screen with all 3 checkboxes -> check all -> button enables -> click Comenzar entrevista -> see 'Entrevista lista' success state"
    why_human: "Requires authenticated browser session connected to live Supabase instance; cannot verify DB writes, token lookup, or consent recording programmatically without a running server"
  - test: "Voice play preview stub behavior in Config tab"
    expected: "Clicking a Play button on any voice persona shows toast 'Vista previa de voz no disponible aún' — button does not crash or navigate away"
    why_human: "Toast rendering requires interactive browser session; cannot verify via grep or unit tests"
  - test: "Brief unsaved-changes warning on browser navigation"
    expected: "Editing the research brief without saving, then navigating away, triggers the browser's native beforeunload dialog warning about unsaved changes"
    why_human: "beforeunload event is only fired in real browser navigation; not testable via static analysis"
  - test: "Archive campaign redirects to campaign list"
    expected: "Clicking Archive in the campaign detail dropdown -> confirming the AlertDialog -> campaign list shows the card with status 'Archivada' and user is redirected to /campaigns"
    why_human: "Server action + router.push flow requires live server with authenticated session"
---

# Phase 2: Campaign & Script Builder — Verification Report

**Phase Goal:** Researchers can create campaigns, build AI-driven research briefs with goals and critical paths, manage respondents with invite links, and see a consent screen — everything needed to set up an interview study
**Verified:** 2026-04-06T22:33:19Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can create a campaign with name, description, language, duration target, voice persona, and interviewer style | VERIFIED | `src/app/(dashboard)/campaigns/actions.ts` — `createCampaign` server action wired to `createCampaignSchema`; `config-tab.tsx` wired to `updateCampaignConfig` for voice/style post-creation |
| 2 | User can build an interview script with ordered questions and branching follow-up rules, then preview it | VERIFIED (per D-08 reinterpretation) | `brief-tab.tsx` implements 4-section research brief with `useFieldArray` critical paths (branching); `brief-preview-dialog.tsx` renders read-only preview. Context D-08 explicitly replaces deterministic question lists with AI-driven brief + critical paths |
| 3 | User can view all campaigns on a dashboard with status indicators and progress counts | VERIFIED | `campaigns/page.tsx` fetches from `campaigns` + `respondents` tables, builds `respondent_count` / `completed_count` maps, renders `CampaignGrid` with `StatusBadge` and `Progress` components |
| 4 | User can add respondents, generate unique or reusable invite links, and send reminders | VERIFIED | `respondents-tab.tsx` renders table with `Copiar enlace` (copies `/interview/${invite_token}`), reusable link Popover, `sendReminder` action (intentionally stubbed per RESP-04 — toast shown, email deferred) |
| 5 | Respondent sees a consent screen when opening an invite link before any interview begins | VERIFIED | `src/app/interview/[token]/page.tsx` — admin client lookup by `invite_token` or `reusable_invite_token`; `ConsentForm` renders 3 checkboxes; button disabled until all checked; `recordConsent` / `recordConsentForReusableLink` write consent to DB |

**Score: 5/5 truths verified**

---

### Note on CONF-01 / CONF-02 Interpretation

REQUIREMENTS.md defines CONF-01 as "interview scripts with ordered questions and follow-up rules" and CONF-02 as "branching logic." Context decision D-08 (established before planning) explicitly reinterprets these:

> "The CONF-01 and CONF-02 requirements (script builder, branching logic) should be reinterpreted: instead of explicit branching, the brief defines goals and the AI handles the conversational flow. 'Branching' becomes 'critical paths the AI should explore based on responses.'"

The implementation satisfies this reinterpretation. The critical paths form (`useFieldArray` with trigger + exploration fields, max 10, animated, deletable) directly implements CONF-02 as conditional exploration goals. The research brief editor satisfies CONF-01 as a research-goal-driven script approach.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/002_campaigns.sql` | DB schema for campaigns, research_briefs, respondents | VERIFIED | 3 tables, RLS enabled on all, `get_org_id()` policies on all operations |
| `supabase/migrations/003_move_to_entrevista_schema.sql` | Schema migration to entrevista schema | VERIFIED | Added during Plan 04 checkpoint — moves tables out of `public` schema |
| `src/lib/validations/campaign.ts` | Zod schemas for campaign, brief, respondent | VERIFIED | Exports `createCampaignSchema`, `researchBriefSchema`, `addRespondentSchema` and all inferred types |
| `src/lib/constants/campaign.ts` | Status enums, styles, voices, languages, durations | VERIFIED | All 7 exports present: `CAMPAIGN_STATUSES`, `RESPONDENT_STATUSES`, `CAMPAIGN_STATUS_LABELS`, `RESPONDENT_STATUS_LABELS`, `INTERVIEWER_STYLES`, `VOICE_PERSONAS`, `LANGUAGES`, `DURATION_OPTIONS` |
| `src/app/(dashboard)/campaigns/actions.ts` | `createCampaign` server action | VERIFIED | `'use server'`, imports `createCampaignSchema`, inserts to `campaigns` + `research_briefs`, `revalidatePath('/campaigns')` |
| `src/app/(dashboard)/campaigns/page.tsx` | Campaign list page with server-side data fetch | VERIFIED | Fetches `campaigns` + `respondents`, builds count maps, renders `CampaignGrid` with empty state |
| `src/app/(dashboard)/campaigns/[id]/page.tsx` | Campaign detail page with tab layout | VERIFIED | Fetches campaign, brief, respondents; `notFound()` guard; breadcrumb; `CampaignTabs`; `CampaignActionsMenu` |
| `src/app/(dashboard)/campaigns/[id]/actions.ts` | 6 server actions for campaign detail mutations | VERIFIED | `saveBrief`, `addRespondent`, `deleteRespondent`, `sendReminder` (stub per RESP-04), `archiveCampaign`, `updateCampaignConfig` |
| `src/components/campaigns/campaign-card.tsx` | Campaign card with status, progress, metadata | VERIFIED | `respondent_count`, `completed_count`, `hover:border-primary/30`, date-fns Spanish locale |
| `src/components/campaigns/campaign-grid.tsx` | Grid with filter and search | VERIFIED | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `statusFilter` state, search filter, empty message |
| `src/components/campaigns/create-campaign-dialog.tsx` | Campaign creation dialog | VERIFIED | `createCampaign` import, `createCampaignSchema` resolver, `router.push` on success, toast 'Campaña creada' |
| `src/components/campaigns/status-badge.tsx` | Campaign/respondent status badge | VERIFIED | `CAMPAIGN_STATUS_LABELS` + `RESPONDENT_STATUS_LABELS`, inline HSL color style objects per UI-SPEC |
| `src/components/campaigns/campaign-tabs.tsx` | 4-tab layout wired to real content | VERIFIED | `BriefTab`, `RespondentsTab`, `ConfigTab` all imported and rendered; `TabsTrigger` for all 4 tabs |
| `src/components/campaigns/summary-tab.tsx` | Summary tab with progress, activity, quick info | VERIFIED | `Progress`, "Actividad reciente", `VOICE_PERSONAS` for voice name lookup |
| `src/components/campaigns/brief-tab.tsx` | Research brief editor | VERIFIED | All 4 sections, `useFieldArray` for critical paths, `saveBrief` call, `beforeunload` listener, dirty indicator |
| `src/components/campaigns/brief-preview-dialog.tsx` | Read-only brief preview | VERIFIED | "Vista previa de la guía" title, `font-mono` body |
| `src/components/campaigns/respondents-tab.tsx` | Respondent table with actions | VERIFIED | "Participantes", "Copiar enlace", "Enviar recordatorio", "Eliminar participante", `navigator.clipboard.writeText`, "Sin participantes aún" empty state |
| `src/components/campaigns/add-respondent-dialog.tsx` | Add respondent form | VERIFIED | `addRespondent` action, `addRespondentSchema` resolver, "Agregar participante" |
| `src/components/campaigns/config-tab.tsx` | Campaign config form (details, voice, style, link) | VERIFIED | `VoicePersonaList`, `StyleToggle`, `updateCampaignConfig`, "Enlace reutilizable", `navigator.clipboard.writeText` |
| `src/components/campaigns/voice-persona-list.tsx` | Voice persona selection | VERIFIED | `VOICE_PERSONAS`, `border-l-[3px] border-primary`, "Premium" badge |
| `src/components/campaigns/style-toggle.tsx` | Interviewer style toggle group | VERIFIED | `ToggleGroup`, `INTERVIEWER_STYLES` |
| `src/components/campaigns/campaign-actions-menu.tsx` | Archive dropdown on detail page | VERIFIED | `archiveCampaign` import, "Archivar campaña" label, AlertDialog confirmation |
| `src/app/interview/layout.tsx` | Minimal public layout | VERIFIED | `min-h-screen`, no `SidebarProvider` or `AppSidebar` |
| `src/app/interview/[token]/page.tsx` | Public consent screen (server component) | VERIFIED | Admin client lookup by `invite_token` and `reusable_invite_token`, "Enlace no válido" error state, renders `ConsentForm` |
| `src/app/interview/[token]/consent-form.tsx` | 3-checkbox consent form (client component) | VERIFIED | "Bienvenido a tu entrevista", 3 `CONSENT_ITEMS`, button disabled until `allChecked`, "Comenzar entrevista" |
| `src/app/interview/[token]/actions.ts` | Consent server actions | VERIFIED | `'use server'`, `validateToken`, `recordConsent`, `recordConsentForReusableLink`, uses `createAdminClient` (service role) |
| `src/lib/supabase/admin.ts` | Shared admin client helper | VERIFIED | `createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY` — created during Plan 04 to replace all inline admin clients |
| `tests/validations/campaign.test.ts` | 14 validation tests | VERIFIED | All 3 schemas covered; passes in vitest run |
| `tests/components/campaign-grid.test.tsx` | Campaign grid test stub | VERIFIED | 3 stubs, passes |
| `tests/components/brief-preview.test.tsx` | Brief preview test stubs | VERIFIED | 3 stubs, passes |
| `tests/components/consent-screen.test.tsx` | Consent screen test stubs | VERIFIED | 3 stubs, passes |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `campaigns/actions.ts` | `validations/campaign.ts` | `import createCampaignSchema` | WIRED | Line 5: `import { createCampaignSchema } from '@/lib/validations/campaign'` |
| `campaigns/actions.ts` | `campaigns` table | `admin.from('campaigns').insert` | WIRED | Lines 34–45: insert to campaigns table via admin client |
| `campaigns/actions.ts` | `research_briefs` table | `admin.from('research_briefs').insert` | WIRED | Lines 54–60: blank brief inserted after campaign |
| `campaigns/page.tsx` | `campaigns` table | `supabase.from('campaigns').select` | WIRED | Lines 10–13: fetches all campaign columns |
| `create-campaign-dialog.tsx` | `campaigns/actions.ts` | `import createCampaign` | WIRED | Line 8: `import { createCampaign } from '@/app/(dashboard)/campaigns/actions'` |
| `brief-tab.tsx` | `[id]/actions.ts` | `import saveBrief` | WIRED | Line 7: `import { saveBrief } from '@/app/(dashboard)/campaigns/[id]/actions'` |
| `respondents-tab.tsx` | `[id]/actions.ts` | `import deleteRespondent, sendReminder` | WIRED | Line 4: `import { deleteRespondent, sendReminder } from '...'` |
| `add-respondent-dialog.tsx` | `[id]/actions.ts` | `import addRespondent` | WIRED | Line 7: `import { addRespondent } from '...'` |
| `config-tab.tsx` | `[id]/actions.ts` | `import updateCampaignConfig` | WIRED | Line 6: `import { updateCampaignConfig } from '...'` |
| `campaign-actions-menu.tsx` | `[id]/actions.ts` | `import archiveCampaign` | WIRED | Line 5: `import { archiveCampaign } from '@/app/(dashboard)/campaigns/[id]/actions'` |
| `[id]/page.tsx` (detail) | `campaigns` table | `supabase.from('campaigns').select('*').eq('id', id)` | WIRED | Lines 23–27 |
| `interview/[token]/page.tsx` | `respondents` table | `admin.from('respondents').select().eq('invite_token', token)` | WIRED | Lines 13–17 |
| `campaign-tabs.tsx` | `brief-tab.tsx`, `respondents-tab.tsx`, `config-tab.tsx` | imports + renders all 3 | WIRED | Lines 5–7: all 3 imported; Lines 64, 68–75, 77: all rendered |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `campaigns/page.tsx` | `campaignData` | `supabase.from('campaigns').select(...)` + `supabase.from('respondents').select(...)` | Yes — RLS-scoped DB queries | FLOWING |
| `[id]/page.tsx` (detail) | `campaign`, `brief`, `respondents` | `supabase.from('campaigns').select('*').eq('id', id)` etc. | Yes — three separate DB fetches | FLOWING |
| `summary-tab.tsx` | `respondents` array, `campaign` object | Passed as props from server component | Yes — prop chain from real DB data | FLOWING |
| `brief-tab.tsx` | `brief.brief_data` | Passed as prop from `[id]/page.tsx` which fetches from `research_briefs` | Yes — JSONB column from DB | FLOWING |
| `respondents-tab.tsx` | `respondents` array | Passed as prop from `[id]/page.tsx` | Yes — from DB | FLOWING |
| `config-tab.tsx` | `campaign` object | Passed as prop from `[id]/page.tsx` | Yes — `campaign.*` columns | FLOWING |
| `interview/[token]/page.tsx` | `result` (token lookup) | `createAdminClient()` + `admin.from('respondents')` / `admin.from('campaigns')` | Yes — live admin DB queries | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Vitest unit test suite (26 tests) | `npx vitest run` | 26/26 passed | PASS |
| TypeScript compilation | `npx tsc --noEmit` | Clean (no output) | PASS |
| Module: `createCampaignSchema` accepts valid input | `node -e "import('./src/lib/validations/campaign.ts')"` | SKIP — ESM module, tested via vitest | PASS (via unit tests) |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CAMP-01 | 02-01 | Create campaign with name, description, language, duration | SATISFIED | `createCampaignSchema` + `createCampaign` action + `CreateCampaignDialog` |
| CAMP-02 | 02-02, 02-04 | Edit campaign details and archive completed campaigns | SATISFIED | `updateCampaignConfig` in config-tab; `archiveCampaign` in campaign-actions-menu |
| CAMP-03 | 02-02 | Campaign dashboard with status indicators | SATISFIED | `campaigns/page.tsx` + `CampaignGrid` + `StatusBadge` |
| CAMP-04 | 02-02 | Campaign progress (completed / total) | SATISFIED | `campaign-card.tsx` renders `Progress` with `completed_count / respondent_count * 100`; counts computed in page.tsx |
| CAMP-05 | 02-03 | Assign interview script to campaign | SATISFIED | Research brief editor (`brief-tab.tsx`) saved via `saveBrief` to `research_briefs.brief_data` JSONB; satisfies the AI-guided script approach per D-04/D-08 |
| CONF-01 | 02-03 | Interview scripts with ordered questions and follow-up rules | SATISFIED (reinterpreted per D-08) | Research brief with 4 structured sections replaces deterministic question list; AI drives question order dynamically |
| CONF-02 | 02-03 | Branching logic | SATISFIED (reinterpreted per D-08) | Critical paths UI (`useFieldArray`, trigger + exploration inputs) implements conditional exploration goals |
| CONF-03 | 02-04 | Select voice persona per campaign | SATISFIED | `VoicePersonaList` in `config-tab.tsx`; `updateCampaignConfig` persists `voice_provider` + `voice_id` |
| CONF-04 | 02-04 | Select interviewer style per campaign | SATISFIED | `StyleToggle` (`ToggleGroup`) in `config-tab.tsx`; 4 styles from `INTERVIEWER_STYLES` |
| CONF-05 | 02-01 | Set interview duration target (10/15/30 min) | SATISFIED | `duration_target_minutes` field in `createCampaignSchema` (enum '10'/'15'/'30') and `DURATION_OPTIONS` constant |
| CONF-06 | 02-03 | Preview interview script before launch | SATISFIED | `BriefPreviewDialog` renders all 4 sections in monospace; triggered via "Vista previa" button in brief-tab |
| RESP-01 | 02-03 | Generate unique invite links per respondent or reusable campaign link | SATISFIED | `respondents.invite_token` (auto UUID at DB level); `campaigns.reusable_invite_token` + `reusable_invite_enabled` toggle |
| RESP-02 | 02-03 | View respondent list with status | SATISFIED | `respondents-tab.tsx` renders `StatusBadge` (respondent variant) per row |
| RESP-03 | 02-03 | Add respondent details (name, email, notes) | SATISFIED | `AddRespondentDialog` with `addRespondentSchema` validation |
| RESP-04 | 02-03 | Send reminders to respondents | SATISFIED (stub per plan) | `sendReminder` action returns success and logs intent; toast shown to user; email service deferred to future phase per explicit plan decision |
| RESP-05 | 02-04 | Consent screen before interview | SATISFIED | `interview/[token]/page.tsx` + `ConsentForm` with 3 checkboxes, disabled-until-all-checked button |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `[id]/actions.ts` | 119–120 | `sendReminder` logs to console only | Info | Per RESP-04 plan decision — email service stubbed intentionally; user sees toast; action returns success |
| `voice-persona-list.tsx` | 25 | Voice play is no-op with TODO | Info | Per plan — audio files deferred to Phase 3; toast shown to user; not a blocker |

No blockers found. Both stubs are explicitly planned and documented in SUMMARY.md.

---

### Human Verification Required

#### 1. Full end-to-end campaign creation and interview flow

**Test:** Log in at the dev URL. Navigate to Campaigns (empty state). Click "Crear campaña" — fill name "Test Campaign", keep defaults, click "Crear campaña". Verify redirect to `/campaigns/{id}`. In Resumen tab verify progress card (0/0) and quick info. In Guía tab fill all 4 sections, add a critical path, click "Guardar" — verify "Guía guardada" toast. Click "Vista previa" — verify monospace preview with all sections. In Participantes tab click "Agregar participante" — add name + email, verify row appears. Click row actions "Copiar enlace" — verify "Enlace copiado" toast. Open copied URL in incognito — verify consent screen with 3 checkboxes. Check all 3 boxes — verify "Comenzar entrevista" button enables. Click it — verify "Entrevista lista" success state.
**Expected:** Full flow completes without errors; all Spanish copy is correct; consent is recorded (respondent status changes to "in_progress" in Supabase).
**Why human:** Requires authenticated browser session with live Supabase DB; DB writes cannot be verified statically.

#### 2. Voice play preview stub behavior

**Test:** In Configuration tab, click the Play button on any voice persona (Natalia, Diego, Sofia, Marco).
**Expected:** Toast appears: "Vista previa de voz no disponible aún". Button state changes to Pause icon while "playing" animation runs.
**Why human:** Toast rendering requires interactive browser session.

#### 3. Brief unsaved-changes browser warning

**Test:** On the Guía tab, type in the "Objetivos de investigación" textarea without clicking "Guardar". Attempt to navigate away using the browser back button or address bar.
**Expected:** Browser's native beforeunload dialog appears warning about unsaved changes.
**Why human:** `beforeunload` event only fires during real browser navigation; cannot verify via static analysis.

#### 4. Archive campaign flow

**Test:** On a campaign detail page, click the "..." menu (top right), select "Archivar campaña". Verify AlertDialog appears with confirmation text. Click "Archivar". Verify redirect to `/campaigns`. Verify the archived campaign card shows status "Archivada".
**Expected:** Archive completes; user lands on campaigns list; status badge reflects archived state.
**Why human:** Server action + router.push + toast requires live server with authenticated session.

---

### Gaps Summary

No gaps found. All 5 roadmap success criteria are verified. All 16 requirement IDs (CAMP-01 through CAMP-05, CONF-01 through CONF-06, RESP-01 through RESP-05) are satisfied by the implementation. The two known stubs (`sendReminder` and voice play preview) are explicitly planned deferrals, not defects.

---

_Verified: 2026-04-06T22:33:19Z_
_Verifier: Claude (gsd-verifier)_
