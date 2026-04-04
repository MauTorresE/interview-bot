---
phase: 01-foundation
plan: 01
subsystem: project-scaffold
tags: [nextjs, shadcn, supabase, rls, vitest, dark-theme]
dependency_graph:
  requires: []
  provides: [next-app, shadcn-ui, supabase-clients, auth-middleware, multi-tenant-schema, zod-validations, vitest-framework]
  affects: [01-02, 01-03]
tech_stack:
  added: [next@16, tailwind@4, shadcn/ui, "@supabase/ssr", "@supabase/supabase-js", react-hook-form, zod@4, sonner, lucide-react, vitest]
  patterns: [dark-first-css-variables, supabase-ssr-cookie-auth, rls-jwt-app-metadata, middleware-getUser]
key_files:
  created:
    - src/app/globals.css
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/middleware.ts
    - src/middleware.ts
    - supabase/migrations/001_foundation.sql
    - src/lib/validations/auth.ts
    - vitest.config.ts
    - tests/setup.ts
    - tests/smoke.test.ts
    - src/components/ui/button.tsx
    - src/components/ui/input.tsx
    - src/components/ui/label.tsx
    - src/components/ui/card.tsx
    - src/components/ui/separator.tsx
    - src/components/ui/avatar.tsx
    - src/components/ui/dropdown-menu.tsx
    - src/components/ui/dialog.tsx
    - src/components/ui/tooltip.tsx
    - src/components/ui/sidebar.tsx
    - src/components/ui/skeleton.tsx
    - src/components/ui/sonner.tsx
    - src/components/ui/sheet.tsx
    - src/hooks/use-mobile.ts
  modified:
    - package.json
    - package-lock.json
    - components.json
    - src/lib/utils.ts
decisions:
  - Used hsl() wrapped CSS variables instead of oklch for dark-first theme to match UI-SPEC hex values exactly
  - Kept shadcn base-nova preset defaults for component styling, only overriding color variables
  - Used Toaster from sonner directly (not shadcn/sonner wrapper) in layout for toast notifications
metrics:
  duration: 7 minutes
  completed: "2026-04-04T22:17:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 26
  files_modified: 4
---

# Phase 01 Plan 01: Project Scaffold & Foundation Summary

Next.js 16 app with shadcn/ui base-nova preset, dark-first design system using hsl() CSS variables (#6366F1 blue-violet accent), Supabase SSR auth plumbing with middleware getUser() verification, multi-tenant PostgreSQL schema with 3 tables and 8 RLS policies using JWT app_metadata org_id, Zod v4 validation schemas for all auth forms, and vitest configured with jsdom and smoke test passing.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Scaffold Next.js, install deps, init shadcn/ui, dark-first design system | 643c8b9 | package.json, globals.css, layout.tsx, components.json, 14 UI components |
| 2 | Supabase clients, auth middleware, RLS migration, Zod schemas, vitest | 696dbe9 | supabase/client.ts, server.ts, middleware.ts, 001_foundation.sql, auth.ts, vitest.config.ts |

## Verification Results

- `npm run build`: PASSED (compiled successfully, middleware registered)
- `npx vitest run`: PASSED (1 test, 1 passed)
- shadcn components installed: 14/14 (button, input, label, card, separator, avatar, dropdown-menu, dialog, tooltip, sidebar, skeleton, sonner, form, sheet)
- CSS variables: dark-first with `--primary: hsl(239 84% 67%)` (#6366F1)
- Layout: `lang="es"`, `className="dark"`, Geist fonts, Toaster
- Migration: 3 tables (organizations, org_members, org_invites), RLS enabled on all, 8 policies, get_org_id() helper
- Middleware: getUser() network call, protects dashboard routes, allows public paths
- Zod schemas: loginSchema, signupSchema, resetPasswordSchema, updatePasswordSchema, inviteSchema, createOrgSchema

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CSS variable format: bare HSL to hsl() wrapped**
- **Found during:** Task 1, Step 5
- **Issue:** Plan specified bare HSL values (e.g., `--primary: 239 84% 67%`) but Tailwind v4 with shadcn base-nova requires actual CSS color values since `@theme inline` maps `--color-primary: var(--primary)` directly
- **Fix:** Wrapped all color values in `hsl()` function calls (e.g., `--primary: hsl(239 84% 67%)`)
- **Files modified:** src/app/globals.css
- **Commit:** 643c8b9

**2. [Rule 1 - Bug] shadcn init generated oklch colors, replaced with UI-SPEC hsl values**
- **Found during:** Task 1, Step 5
- **Issue:** `npx shadcn init -d` generated oklch color values in globals.css that didn't match the UI-SPEC hex targets
- **Fix:** Replaced entire `:root` and `.dark` blocks with dark-first `:root` (dark default) and `.light` override using hsl() values matching UI-SPEC hex targets exactly
- **Files modified:** src/app/globals.css
- **Commit:** 643c8b9

## Known Stubs

None -- all files contain production-ready implementations. The `.env.local` has placeholder Supabase credentials but this is intentional and not committed (gitignored).

## Threat Mitigations Applied

| Threat ID | Mitigation | Verified |
|-----------|-----------|----------|
| T-01-01 | All 3 tables have ENABLE ROW LEVEL SECURITY + policies using get_org_id() from JWT app_metadata | Yes |
| T-01-02 | SUPABASE_SERVICE_ROLE_KEY in .env.local (gitignored), no NEXT_PUBLIC_ prefix | Yes |
| T-01-04 | Middleware uses getUser() (network call) not getSession() (local/insecure) | Yes |
| T-01-05 | Invite tokens expire after 48 hours, checked via accepted_at IS NULL + expires_at > now() | Yes |
| T-01-06 | Middleware matcher excludes _next/static, images, fonts | Yes |

## Self-Check: PASSED

All 15 key files verified present. Both task commits (643c8b9, 696dbe9) verified in git log.
