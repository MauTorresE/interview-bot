---
phase: 03-voice-interview
plan: 01
subsystem: database, api
tags: [livekit, webrtc, supabase, egress, rls, interviews]

# Dependency graph
requires:
  - phase: 02-campaign-script-builder
    provides: campaigns, respondents tables and consent flow
provides:
  - interviews and transcript_entries tables with RLS
  - /api/livekit/token route (4-step atomic interview creation)
  - /api/livekit/webhook route (Egress completion handler)
  - InterviewFlowWrapper with 4-phase state management
  - InterviewSession type with campaignInfo (duration, personaName)
affects: [03-voice-interview, 04-analysis-reports]

# Tech tracking
tech-stack:
  added: ["@livekit/components-react", "livekit-client", "livekit-server-sdk"]
  patterns: [EncodedFileOutput + S3Upload for Egress recording, WebhookReceiver for LiveKit events, 4-phase interview flow state machine]

key-files:
  created:
    - supabase/migrations/004_interviews.sql
    - src/app/api/livekit/token/route.ts
    - src/app/api/livekit/webhook/route.ts
    - src/app/interview/[token]/interview-flow-wrapper.tsx
    - src/components/ui/scroll-area.tsx
  modified:
    - src/lib/constants/campaign.ts
    - src/app/interview/[token]/consent-form.tsx
    - src/app/interview/[token]/page.tsx

key-decisions:
  - "Used duration_target_minutes and voice_id from campaigns table (not duration_target/voice_persona as plan assumed)"
  - "Egress uses S3Upload to Supabase Storage recordings bucket via S3-compatible API"
  - "Consent form records consent first via server action, then creates interview via token route"

patterns-established:
  - "LiveKit room naming: interview-{interview.id} for room-to-interview mapping"
  - "Token route returns campaignInfo (duration, personaName) for downstream components"
  - "InterviewFlowWrapper manages phase transitions: consent -> lobby -> interview -> completion"

requirements-completed: [WEBR-01, WEBR-06]

# Metrics
duration: 8min
completed: 2026-04-07
---

# Phase 3 Plan 01: Interview Schema and Token Route Summary

**Interviews/transcript_entries schema with RLS, LiveKit token route with Egress recording, and consent-to-interview bridge via InterviewFlowWrapper**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-07T04:18:53Z
- **Completed:** 2026-04-07T04:26:54Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Created interviews and transcript_entries tables with org-scoped RLS policies and indexes
- Built /api/livekit/token route implementing D-19 4-step atomic flow (validate token, check consent, prevent duplicates, create interview + room + egress)
- Built /api/livekit/webhook route handling egress_ended events to store recording URLs
- Refactored consent form to call token route and pass InterviewSession (including campaignInfo) to InterviewFlowWrapper
- Pushed migration 004 to Supabase Cloud and repaired migration history

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration and LiveKit npm packages** - `ed8f7f1` (feat)
2. **Task 2: Token route, webhook route, and consent form bridge** - `43a0f45` (feat)
3. **Task 3: Schema push to Supabase** - `d62e405` (chore)

## Files Created/Modified
- `supabase/migrations/004_interviews.sql` - interviews + transcript_entries tables with RLS, indexes, updated_at trigger
- `src/app/api/livekit/token/route.ts` - 4-step atomic token generation with campaignInfo response
- `src/app/api/livekit/webhook/route.ts` - LiveKit Egress webhook handler
- `src/app/interview/[token]/interview-flow-wrapper.tsx` - Client component managing 4-phase interview flow
- `src/app/interview/[token]/consent-form.tsx` - Modified to call token route and use onInterviewReady callback
- `src/app/interview/[token]/page.tsx` - Updated to render InterviewFlowWrapper instead of ConsentForm directly
- `src/lib/constants/campaign.ts` - Added INTERVIEW_STATUSES and INTERVIEW_STATUS_LABELS
- `src/components/ui/scroll-area.tsx` - shadcn scroll-area component for Plan 03
- `package.json` - Added @livekit/components-react, livekit-client, livekit-server-sdk
- `supabase/.temp/project-ref` - Supabase project reference for CLI

## Decisions Made
- Used `duration_target_minutes` and `voice_id` columns from campaigns table (plan referenced non-existent `duration_target` and `voice_persona` columns) -- Rule 1 auto-fix for correct DB column names
- Consent form records consent first via server action, then creates interview via token route in a two-step process (consent validation and interview creation are separate concerns)
- Egress configured as fire-and-forget with S3Upload to Supabase Storage recordings bucket

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected campaign table column references in token route**
- **Found during:** Task 2 (Token route implementation)
- **Issue:** Plan referenced `duration_target` and `voice_persona` columns which don't exist in the campaigns table. Actual columns are `duration_target_minutes` and `voice_id`.
- **Fix:** Updated token route to query `duration_target_minutes` and `voice_id`, then look up persona name from VOICE_PERSONAS constant using voice_id
- **Files modified:** src/app/api/livekit/token/route.ts
- **Verification:** npx tsc --noEmit passes clean
- **Committed in:** 43a0f45 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for correctness -- using wrong column names would have caused runtime errors.

## Issues Encountered
- Supabase migration history had naming mismatches (remote used 00001/00002, local used 001/002). Repaired with `supabase migration repair`. Migration 003 was already applied but not tracked -- marked as applied before pushing 004.

## Known Stubs
- `src/app/interview/[token]/interview-flow-wrapper.tsx` lines 47-58: Lobby, interview, and completion phases render placeholder divs. These are intentional -- Plan 03 implements lobby/interview room, Plan 04 implements completion.

## User Setup Required

**External services require manual configuration.** The plan's `user_setup` section specifies:
- **LiveKit**: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET env vars from LiveKit Cloud Dashboard
- **Supabase S3**: SUPABASE_S3_ACCESS_KEY, SUPABASE_S3_SECRET_KEY, SUPABASE_S3_ENDPOINT, SUPABASE_S3_REGION env vars plus a private 'recordings' storage bucket

## Next Phase Readiness
- interviews and transcript_entries tables ready for Python agent (Plan 02) to write interview data
- Token route ready for frontend interview room (Plan 03) to connect to LiveKit
- InterviewFlowWrapper ready for lobby screen and interview room components (Plan 03)
- campaignInfo (duration, personaName) flows through InterviewSession type for downstream use

## Self-Check: PASSED

All 8 files verified present. All 3 task commits verified in git log.

---
*Phase: 03-voice-interview*
*Completed: 2026-04-07*
