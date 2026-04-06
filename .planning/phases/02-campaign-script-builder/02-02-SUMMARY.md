---
phase: 02-campaign-script-builder
plan: 02
subsystem: ui
tags: [campaigns, ui, shadcn, next.js, server-components, date-fns]

# Dependency graph
requires:
  - phase: 02-campaign-script-builder
    plan: 01
    provides: campaigns table, respondents table, research_briefs table, createCampaign server action, Zod schemas, constants
provides:
  - Campaign list page with card grid, status filtering, and search
  - Campaign detail page with breadcrumb navigation and 4-tab layout
  - CampaignCard, CampaignGrid, StatusBadge, CampaignTabs, SummaryTab components
  - CreateCampaignDialog with react-hook-form + zod validation
  - 14 new shadcn UI components installed
affects:
  - src/app/(dashboard)/campaigns/page.tsx (replaced empty state with full implementation)

# Tech stack
added:
  - date-fns (date formatting with Spanish locale)
patterns:
  - Server component data fetching with Supabase RLS
  - Client component with controlled dialog state
  - base-ui Select and Tabs primitives via shadcn
  - StatusBadge with inline style colors per UI-SPEC

# Key files
created:
  - src/components/campaigns/status-badge.tsx
  - src/components/campaigns/campaign-card.tsx
  - src/components/campaigns/campaign-grid.tsx
  - src/components/campaigns/create-campaign-dialog.tsx
  - src/components/campaigns/campaign-tabs.tsx
  - src/components/campaigns/summary-tab.tsx
  - src/app/(dashboard)/campaigns/[id]/page.tsx
  - src/components/ui/table.tsx
  - src/components/ui/tabs.tsx
  - src/components/ui/badge.tsx
  - src/components/ui/select.tsx
  - src/components/ui/progress.tsx
  - src/components/ui/textarea.tsx
  - src/components/ui/switch.tsx
  - src/components/ui/checkbox.tsx
  - src/components/ui/alert-dialog.tsx
  - src/components/ui/breadcrumb.tsx
  - src/components/ui/collapsible.tsx
  - src/components/ui/toggle-group.tsx
  - src/components/ui/toggle.tsx
  - src/components/ui/popover.tsx
  - src/components/ui/command.tsx
  - src/components/ui/input-group.tsx
modified:
  - src/app/(dashboard)/campaigns/page.tsx
  - src/components/ui/button.tsx
  - tests/components/campaign-grid.test.tsx
  - package.json
  - package-lock.json

# Decisions
decisions:
  - Used inline style objects for status badge colors rather than Tailwind classes to match exact UI-SPEC HSL values with opacity
  - DialogTrigger uses base-ui render prop pattern with Button render element
  - Campaign list fetches respondent counts via separate query and groups in-memory (Supabase does not support filtered aggregate counts in single query)

# Metrics
duration: 7m
completed: 2026-04-06
tasks: 2
files: 28
---

# Phase 02 Plan 02: Campaign List & Detail Pages Summary

Campaign list page with responsive card grid and campaign detail shell with 4-tab layout using shadcn tabs and breadcrumb navigation, plus date-fns Spanish locale formatting.

## What Was Built

### Task 1: Campaign List Page
- Installed 14 shadcn components needed for Phase 2 (table, tabs, textarea, badge, select, switch, checkbox, progress, alert-dialog, breadcrumb, collapsible, toggle-group, popover, command)
- `StatusBadge` component with campaign and respondent status color variants matching UI-SPEC exactly
- `CampaignCard` with status badge, progress bar, language tag, and date formatting via date-fns es locale
- `CampaignGrid` with status dropdown filter and text search
- `CreateCampaignDialog` using react-hook-form + zodResolver with createCampaignSchema
- Replaced empty campaigns page with server component that fetches campaigns and respondent counts from Supabase

### Task 2: Campaign Detail Page
- Campaign detail page at `/campaigns/[id]` with server-side data fetching
- `notFound()` guard when campaign ID does not exist (RLS ensures org isolation per T-02-04)
- Breadcrumb navigation: "Campanas" (link) > Campaign Name
- `CampaignTabs` with 4 tabs: Resumen, Guia de investigacion, Participantes, Configuracion
- `SummaryTab` with progress card, activity feed (last 5 respondents), and quick info card (language, duration, voice, style)
- Placeholder content for Guia, Participantes, and Configuracion tabs (to be replaced in Plans 03-04)
- Archive action intentionally NOT included (deferred to Plan 04 per cross-wave dependency rule)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| src/components/campaigns/campaign-tabs.tsx | 67 | "Guia sin completar" placeholder | Will be replaced by research brief editor in Plan 03 |
| src/components/campaigns/campaign-tabs.tsx | 73 | "Sin participantes aun" placeholder | Will be replaced by respondent table in Plan 03 |
| src/components/campaigns/campaign-tabs.tsx | 79 | "Configuracion" heading only | Will be replaced by config form in Plan 04 |

These stubs are intentional per the plan - each tab will be fully implemented in subsequent plans.

## Verification

- `npm run build` passes with 0 TypeScript errors
- `npx vitest run tests/components/campaign-grid.test.tsx` passes (5 tests)
- `/campaigns` route renders dynamically (server component)
- `/campaigns/[id]` route renders dynamically (server component)

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | a8c54c7 | feat(02-02): campaign list page with card grid, status badges, and create dialog |
| 2 | 0593082 | feat(02-02): campaign detail page with tabs and summary tab |

## Self-Check: PASSED

All 8 created files verified on disk. Both commit hashes (a8c54c7, 0593082) found in git log. SUMMARY.md exists.
