---
phase: 01-foundation
plan: 02
subsystem: auth-dashboard
tags: [supabase-auth, server-actions, sidebar, navigation, empty-states, dark-theme]
dependency_graph:
  requires: [next-app, shadcn-ui, supabase-clients, auth-middleware, multi-tenant-schema, zod-validations]
  provides: [auth-flow, dashboard-shell, sidebar-navigation, org-switcher, empty-state-pages, use-user-hook]
  affects: [01-03]
tech_stack:
  added: []
  patterns: [server-actions-auth, auto-org-creation, collapsible-sidebar, active-nav-highlighting, centered-card-auth]
key_files:
  created:
    - src/app/(auth)/layout.tsx
    - src/app/(auth)/auth/signup/page.tsx
    - src/app/(auth)/auth/signup/actions.ts
    - src/app/(auth)/auth/login/page.tsx
    - src/app/(auth)/auth/login/actions.ts
    - src/app/(auth)/auth/reset-password/page.tsx
    - src/app/(auth)/auth/reset-password/actions.ts
    - src/app/(auth)/auth/callback/route.ts
    - src/app/(auth)/auth/update-password/page.tsx
    - src/app/(auth)/auth/update-password/actions.ts
    - src/app/(dashboard)/layout.tsx
    - src/app/(dashboard)/campaigns/page.tsx
    - src/app/(dashboard)/reports/page.tsx
    - src/app/(dashboard)/settings/page.tsx
    - src/components/app-sidebar.tsx
    - src/components/nav-main.tsx
    - src/components/org-switcher.tsx
    - src/hooks/use-user.ts
  modified: []
decisions:
  - Used react-hook-form with zodResolver directly instead of shadcn Form wrapper (not available in base-nova preset)
  - Auth error messages use generic copy per T-02-02 to avoid leaking email existence
  - Password reset always shows success regardless of email existence (privacy by design)
  - Settings page fetches org members by user_id only (no email lookup) since profile table not yet created
metrics:
  duration: 4 minutes
  completed: "2026-04-04T22:23:18Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 18
  files_modified: 0
---

# Phase 01 Plan 02: Auth Flow & Dashboard Shell Summary

Complete Supabase auth flow (signup with auto org creation via service_role admin client, login, password reset, PKCE callback, password update) with dark-first centered card UI, plus Linear-style collapsible sidebar dashboard (240px/56px) with NavMain (Campanas, Reportes, Configuracion), OrgSwitcher dropdown, and Spanish-copy empty-state pages.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Build auth pages with server actions | e044f87 | 10 files: auth layout, signup/login/reset-password/update-password pages + actions, callback route |
| 2 | Build dashboard layout with sidebar and empty-state pages | 511fb61 | 8 files: dashboard layout, app-sidebar, nav-main, org-switcher, campaigns/reports/settings pages, use-user hook |

## Verification Results

- `npm run build`: PASSED (compiled successfully, all 12 routes registered)
- Auth routes: /auth/login, /auth/signup, /auth/reset-password, /auth/update-password (static), /auth/callback (dynamic)
- Dashboard routes: /campaigns, /reports, /settings (all dynamic, server-side auth check)
- Signup action contains: `'use server'`, `signUp`, `SUPABASE_SERVICE_ROLE_KEY`, `app_metadata`
- Login action contains: `signInWithPassword`, generic error message
- Nav items: "Campanas" (FolderOpen), "Reportes" (FileBarChart), "Configuracion" (Settings)
- Sidebar: `collapsible="icon"`, `--sidebar-width: 240px`, `--sidebar-width-icon: 56px`
- Empty states: "Sin campanas aun", "Sin reportes aun" with correct copywriting contract text
- Settings: max-width 640px centered layout with org info and members sections

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] shadcn Form component not available in base-nova preset**
- **Found during:** Task 1 setup
- **Issue:** Plan referenced `src/components/ui/form.tsx` but the shadcn base-nova preset doesn't include a Form component. `npx shadcn add form` produced no output.
- **Fix:** Used react-hook-form with zodResolver directly in each page component instead of a shadcn Form wrapper. Same validation behavior, just without the FormField/FormItem abstraction.
- **Files affected:** All auth page components
- **Commit:** e044f87

## Known Stubs

None -- all auth actions contain real Supabase calls, all dashboard pages render real data from server queries. The "Crear campana" button is intentionally disabled (plan specifies "disabled or no-op for Phase 1"). The "Invitar miembro" button is intentionally disabled (plan specifies "wired in Plan 03").

## Threat Mitigations Applied

| Threat ID | Mitigation | Verified |
|-----------|-----------|----------|
| T-02-01 | All auth forms validate server-side with Zod schemas before Supabase calls | Yes |
| T-02-02 | Login error: generic "Credenciales incorrectas" message; reset password always shows success | Yes |
| T-02-03 | service_role admin client only in signup actions.ts with 'use server' directive; never imported in client components | Yes |
| T-02-04 | Auth callback uses exchangeCodeForSession for PKCE code exchange server-side | Yes |
| T-02-06 | Dashboard layout calls getUser() server-side, redirects to /auth/login if null | Yes |

## Self-Check: PASSED

All 18 key files verified present. Both task commits (e044f87, 511fb61) verified in git log.
