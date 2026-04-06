---
phase: 02-campaign-script-builder
plan: 03
subsystem: campaign-ui
tags: [server-actions, research-brief, respondents, react-hook-form, zod, date-fns]

# Dependency graph
requires:
  - phase: 02-campaign-script-builder
    plan: 01
    provides: Zod schemas (researchBriefSchema, addRespondentSchema), campaign constants, createCampaign server action
provides:
  - 6 campaign detail server actions (saveBrief, addRespondent, deleteRespondent, sendReminder, archiveCampaign, updateCampaignConfig)
  - Research brief editor with 4 sections and critical paths
  - Brief preview dialog with monospace rendering
  - Respondent table with status badges and row actions
  - Add respondent dialog with form validation
  - Campaign tabs component wiring brief and respondent content
  - Status badge component for campaign and respondent variants
  - Test stubs for BriefPreviewDialog and ConsentScreen
affects: [02-campaign-script-builder, 03-interview-room]

# Tech tracking
tech-stack:
  added: [date-fns]
  patterns: [useFieldArray for dynamic form rows, beforeunload unsaved warning, Base UI render prop for trigger composition]

key-files:
  created:
    - src/app/(dashboard)/campaigns/[id]/actions.ts
    - src/components/campaigns/brief-tab.tsx
    - src/components/campaigns/brief-preview-dialog.tsx
    - src/components/campaigns/respondents-tab.tsx
    - src/components/campaigns/add-respondent-dialog.tsx
    - src/components/campaigns/campaign-tabs.tsx
    - src/components/campaigns/status-badge.tsx
    - src/components/ui/alert-dialog.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/popover.tsx
    - src/components/ui/table.tsx
    - src/components/ui/tabs.tsx
    - src/components/ui/textarea.tsx
    - tests/components/brief-preview.test.tsx
    - tests/components/consent-screen.test.tsx
  modified:
    - src/lib/validations/campaign.ts
    - src/components/ui/button.tsx
    - package.json

key-decisions:
  - "Used z.output type for form state to avoid zodResolver type mismatch with .default() fields"
  - "Used Base UI render prop pattern instead of Radix asChild for trigger composition (DialogTrigger, PopoverTrigger, DropdownMenuTrigger)"
  - "Created status-badge component in this plan since parallel plan 02-02 creates it separately -- merge will reconcile"

patterns-established:
  - "Server actions with shared getAuthContext() helper for DRY auth/org extraction"
  - "useFieldArray for dynamic critical paths with max 10 entries and animation"
  - "Controlled dialog pattern: parent manages open state, trigger is external React node"
  - "Base UI components use render prop for composition, not asChild"

requirements-completed: [CAMP-05, CONF-01, CONF-02, CONF-06, RESP-01, RESP-02, RESP-03, RESP-04]

# Metrics
duration: 8min
completed: 2026-04-06
---

# Phase 2 Plan 03: Brief Editor & Respondent Management Summary

**Research brief editor with 4-section form, critical paths, preview dialog, respondent table with invite links and stubbed reminders, plus 6 campaign server actions**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-06T14:45:17Z
- **Completed:** 2026-04-06T14:53:36Z
- **Tasks:** 2
- **Files created:** 15
- **Files modified:** 3

## Accomplishments

- 6 server actions covering all campaign detail mutations: saveBrief (upsert), addRespondent, deleteRespondent, sendReminder (stubbed), archiveCampaign, updateCampaignConfig
- Research brief editor with 4 sections (Objetivos, Datos criticos, Contexto, Tono) plus dynamic critical paths using useFieldArray
- Brief preview dialog rendering all sections in monospace as system prompt representation
- Unsaved changes warning via beforeunload when form is dirty, with dot indicator on save button
- Respondent table with status badges, copy invite link, send reminder, delete with AlertDialog confirmation
- Add respondent dialog with react-hook-form + zod validation
- Campaign tabs component wiring BriefTab and RespondentsTab into tab layout
- Status badge component supporting both campaign and respondent status variants with UI-SPEC color mapping
- 6 new test stubs (BriefPreviewDialog: 3, ConsentScreen: 3) -- total suite now 24 passing tests
- Installed 7 new shadcn components (textarea, table, badge, alert-dialog, popover, tabs + button update) and date-fns

## Task Commits

1. **Task 1: Campaign detail server actions and research brief tab** - `95f171f` (feat)
2. **Task 2: Respondents tab, add dialog, campaign tabs wiring, test stubs** - `003f59d` (feat)

## Files Created/Modified

### Created
- `src/app/(dashboard)/campaigns/[id]/actions.ts` - 6 server actions with shared getAuthContext helper
- `src/components/campaigns/brief-tab.tsx` - Research brief editor with 4 sections + critical paths
- `src/components/campaigns/brief-preview-dialog.tsx` - Read-only brief preview in monospace
- `src/components/campaigns/respondents-tab.tsx` - Respondent table with status badges and actions
- `src/components/campaigns/add-respondent-dialog.tsx` - Add respondent form dialog
- `src/components/campaigns/campaign-tabs.tsx` - Tab layout wiring brief and respondent tabs
- `src/components/campaigns/status-badge.tsx` - Campaign/respondent status badge with UI-SPEC colors
- `src/components/ui/alert-dialog.tsx` - shadcn alert dialog (Base UI)
- `src/components/ui/badge.tsx` - shadcn badge
- `src/components/ui/popover.tsx` - shadcn popover (Base UI)
- `src/components/ui/table.tsx` - shadcn table
- `src/components/ui/tabs.tsx` - shadcn tabs (Base UI)
- `src/components/ui/textarea.tsx` - shadcn textarea
- `tests/components/brief-preview.test.tsx` - 3 stub tests for brief preview
- `tests/components/consent-screen.test.tsx` - 3 stub tests for consent screen

### Modified
- `src/lib/validations/campaign.ts` - Added ResearchBriefOutput type export
- `src/components/ui/button.tsx` - Updated by shadcn add
- `package.json` - Added date-fns dependency

## Decisions Made

- Used `z.output` type for form state to resolve zodResolver type mismatch with Zod `.default()` fields (Zod input type makes critical_paths optional, output makes it required)
- Used Base UI `render` prop pattern instead of Radix `asChild` for trigger composition -- this project uses base-nova preset which uses Base UI primitives
- Created status-badge component here since parallel plan 02-02 creates it separately; merge will reconcile duplicates

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed zodResolver type mismatch with Zod .default() fields**
- **Found during:** Task 1
- **Issue:** `researchBriefSchema` has `.default([])` on `critical_paths`, making the Zod input type have `critical_paths?: ... | undefined` while the output type has `critical_paths: ...[]`. zodResolver infers the input type, causing type error with `useForm<ResearchBriefOutput>`
- **Fix:** Added `ResearchBriefOutput` type export, cast zodResolver to `any` to bridge the input/output type gap
- **Files modified:** src/lib/validations/campaign.ts, src/components/campaigns/brief-tab.tsx
- **Commit:** 95f171f

**2. [Rule 3 - Blocking] Fixed Base UI asChild incompatibility**
- **Found during:** Task 2
- **Issue:** Plan specified `asChild` prop on DialogTrigger, PopoverTrigger, and DropdownMenuTrigger, but this project uses base-nova preset with Base UI primitives which use `render` prop instead of Radix's `asChild`
- **Fix:** Replaced `asChild` with `render={<Button ... />}` pattern for PopoverTrigger and DropdownMenuTrigger. For AddRespondentDialog, used controlled open state with external trigger via onClick wrapper
- **Files modified:** src/components/campaigns/respondents-tab.tsx, src/components/campaigns/add-respondent-dialog.tsx
- **Commit:** 003f59d

**3. [Rule 3 - Blocking] Created status-badge component not yet available from parallel plan**
- **Found during:** Task 2
- **Issue:** Plan references StatusBadge from Plan 02 which is executing in parallel worktree and not yet merged
- **Fix:** Created status-badge.tsx with campaign and respondent status variants matching UI-SPEC color definitions
- **Files modified:** src/components/campaigns/status-badge.tsx
- **Commit:** 003f59d

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All deviations were necessary for compilation. No scope creep.

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| src/app/(dashboard)/campaigns/[id]/actions.ts | ~115 | sendReminder logs to console | Email service not yet integrated; will be wired in future phase |
| src/components/campaigns/campaign-tabs.tsx | ~52 | Resumen tab placeholder text | Summary tab content created by parallel Plan 02 |
| src/components/campaigns/campaign-tabs.tsx | ~62 | Configuracion tab placeholder text | Configuration tab is Plan 04 scope |

## Issues Encountered
None

## User Setup Required
None

## Next Phase Readiness
- All server actions ready for campaign detail page integration
- Brief editor and respondent table ready to be rendered in campaign detail tabs
- Campaign tabs component ready to receive summary tab from Plan 02 and config tab from Plan 04

## Self-Check: PASSED

- All 9 key created files verified present on disk
- Both task commits verified in git log (95f171f, 003f59d)
- TypeScript compilation: clean
- Test suite: 24/24 passing
- Build: successful
